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

export interface BackendStatus {
  state: 'starting' | 'running' | 'failed' | 'stopped'
  version: string
  baseUrl?: string
  error?: string
}

export interface AppBackend {
  start(): Promise<void>
  ready(): Promise<AppFacade>
  status(): BackendStatus
  stop(): Promise<void>
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

  const doStart = async (): Promise<AppFacade> => {
    status = { state: 'starting', version: PB_VERSION }
    const process = await startPocketBase(options)
    running = process
    const pb: PbClient = createPbClient(process.baseUrl, process.credentials)
    await initCollections(pb)
    facade = createAppFacade(pb)
    status = { state: 'running', version: PB_VERSION, baseUrl: process.baseUrl }
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
      return { ...status }
    },

    async stop(): Promise<void> {
      readyPromise = undefined
      facade = undefined
      if (running !== undefined) {
        await running.stop()
        running = undefined
      }
      status = { state: 'stopped', version: PB_VERSION }
    },
  }
}

export { resolveDshHome, PB_VERSION }
