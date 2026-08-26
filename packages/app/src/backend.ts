/**
 * AppBackend 组装层：PocketBase 进程 + admin client + collections 初始化 + 门面。
 *
 * 生命周期（cordis apply 必须同步——AGENTS.md 沉淀 #6）：
 * - createAppBackend() 构造即惰性（不启动）
 * - start() 显式启动（index.ts 里 void start().catch(...)——fiber 不炸）
 * - ready() 给 tool/route 消费：等启动完成返回门面；失败/超时抛面向 Agent 的错误
 */
import { createPbClient, type PbClient } from './pb-client.ts'
import { startPocketBase, resolveDshHome, PB_VERSION, type PbProcessOptions, type RunningPb } from './pb-process.ts'
import { initCollections } from './schema.ts'
import { createAppFacade, type AppFacade } from './facade.ts'
import { PbWatchdog, type WatchdogState } from './watchdog.ts'
import { seedBuiltinApp } from './seed.ts'

export interface BackendStatus {
  state: 'starting' | 'running' | 'failed' | 'stopped'
  version: string
  baseUrl?: string
  error?: string
  /** registry 变更代次（invalidate 端点递增；消费方对比检测「有更新要拉」） */
  registryRev?: number
  /** P2 守护可观测：累计重启次数 */
  restarts?: number
  /** P2 守护可观测：最近一次故障/重启错误 */
  lastError?: string | null
  /** P2 守护可观测：最近一次成功重启时刻 */
  lastRestartAt?: number | null
}

export interface AppBackend {
  start(): Promise<void>
  ready(): Promise<AppFacade>
  status(): BackendStatus
  stop(): Promise<void>
  /** admin PB client（运行中才可用；stats/records 路由用） */
  pbClient(): PbClient | undefined
  /** PB 数据目录（运行中才可用） */
  pbDataDir(): string | undefined
  /** DSH_HOME 解析结果（路由 stats 用） */
  dshHome(): string
  /** 本次运行启动时刻（uptime 计算）；未启动为 undefined */
  startedAt(): number | undefined
  /** registry 变更通知（invalidate 端点调用；返回新代次） */
  invalidateRegistry(): number
  /** P2 手动重启（doctor 工具用；正常 stop+start 语义） */
  restart(): Promise<void>
}

export interface AppBackendOptions extends PbProcessOptions {
  /** 就绪等待上限（tool/route 调用侧；默认 45s 覆盖首启下载） */
  readyTimeoutMs?: number
}

export function createAppBackend(options: AppBackendOptions = {}): AppBackend {
  const readyTimeoutMs = options.readyTimeoutMs ?? 45_000
  let status: BackendStatus = { state: 'stopped', version: PB_VERSION }
  let running: RunningPb | undefined
  let facade: AppFacade | undefined
  let readyPromise: Promise<AppFacade> | undefined
  let startedAt: number | undefined
  /** registry 变更代次（0 起步；invalidate 递增——dock 轻探对比用） */
  let registryRev = 0
  /** P2 守护状态（status 扩展字段的数据源） */
  let watchdogState: WatchdogState = { restarts: 0, lastError: null, lastRestartAt: null, consecutiveFailures: 0 }
  const dshHome = resolveDshHome(options.dshHome)

  /** watchdog（惰性构造——doStart 成功后才有 restart 动作可注入） */
  let watchdog: PbWatchdog | undefined

  const syncStatus = (): void => {
    status = {
      ...status,
      restarts: watchdogState.restarts,
      lastError: watchdogState.lastError,
      lastRestartAt: watchdogState.lastRestartAt,
    }
  }

  const doStart = async (): Promise<AppFacade> => {
    status = { state: 'starting', version: PB_VERSION }
    const process = await startPocketBase({
      ...options,
      // P2：意外退出 → watchdog 调度重启（意图性 stop 不触发——pb-process 内部摘回调）
      onExit: code => { watchdog?.onProcessExit(code) },
    })
    running = process
    const pb: PbClient = createPbClient(process.baseUrl, process.credentials)
    await initCollections(pb)
    facade = createAppFacade(pb)
    // 内置 APP 种子（幂等：openloop 已存在即跳过——不覆盖用户/agent 修改）
    await seedBuiltinApp(facade)
    startedAt = Date.now()
    status = { state: 'running', version: PB_VERSION, baseUrl: process.baseUrl }
    syncStatus()
    // 首次启动装配 watchdog（restart 动作 = 停旧进程 + 全新 start 链）
    if (watchdog === undefined) {
      watchdog = new PbWatchdog({
        restart: async () => {
          if (running !== undefined) { await running.stop().catch(() => {}) }
          running = undefined
          facade = undefined
          readyPromise = undefined
          await doStart()
        },
        onStateChange: state => { watchdogState = state; syncStatus() },
      })
    }
    watchdog.resume()
    return facade
  }

  return {
    async start(): Promise<void> {
      if (readyPromise === undefined) {
        readyPromise = doStart().catch(error => {
          status = { state: 'failed', version: PB_VERSION, error: error instanceof Error ? error.message : String(error) }
          // 失败后允许重试（下次 start 重新走启动链）
          readyPromise = undefined
          throw error
        })
      }
      await readyPromise
    },

    async ready(): Promise<AppFacade> {
      if (facade !== undefined && status.state === 'running') return facade
      if (readyPromise === undefined) {
        // 首次消费触发启动（apply 里 void start 已先行；此处兜底竞态）
        void this.start().catch(() => {})
      }
      if (readyPromise === undefined) {
        throw new Error(`openloop app backend is ${status.state}${status.error !== undefined ? `: ${status.error}` : ''}. Retry in a moment.`)
      }
      return Promise.race([
        readyPromise,
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`openloop app backend did not become ready within ${readyTimeoutMs}ms (state: ${status.state}${status.error !== undefined ? `, ${status.error}` : ''}). First start downloads PocketBase ${PB_VERSION} (~12MB) — check network or set OPENLOOP_PB_BIN to a local binary.`))
          }, readyTimeoutMs).unref?.()
        }),
      ])
    },

    status(): BackendStatus {
      return { ...status, registryRev, restarts: watchdogState.restarts, lastError: watchdogState.lastError, lastRestartAt: watchdogState.lastRestartAt }
    },

    invalidateRegistry(): number {
      registryRev += 1
      return registryRev
    },

    async restart(): Promise<void> {
      // 手动重启（doctor 用）：熔断后的恢复通道 + 常规重启
      if (watchdog !== undefined) {
        // 重置连续失败计数（人工干预视为新起点）
        watchdog.resume()
      }
      if (running !== undefined) { await running.stop().catch(() => {}) }
      running = undefined
      facade = undefined
      readyPromise = undefined
      await this.start()
    },

    pbClient(): PbClient | undefined {
      if (status.state !== 'running' || running === undefined) return undefined
      return createPbClient(running.baseUrl, running.credentials)
    },

    pbDataDir(): string | undefined {
      return status.state === 'running' && running !== undefined ? running.dataDir : undefined
    },

    dshHome(): string {
      return dshHome
    },

    startedAt(): number | undefined {
      return startedAt
    },

    async stop(): Promise<void> {
      watchdog?.stop()
      readyPromise = undefined
      facade = undefined
      startedAt = undefined
      if (running !== undefined) {
        await running.stop()
        running = undefined
      }
      status = { state: 'stopped', version: PB_VERSION }
    },
  }
}

export { resolveDshHome, PB_VERSION }
