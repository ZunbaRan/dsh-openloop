/**
 * PB 进程守护（P2）：服务接管语义——门面挂掉是「要修的故障」，不是降级路径。
 *
 * 两层检测：
 * 1. 退出监听：RunningPb 增加 onExit 回调（spawn exit 事件直通——最及时）
 * 2. 健康轮询：/api/health GET（间隔 15s；进程活着但卡死（不响应）也能发现）
 *
 * 重启策略：指数退避 2s → 4s → 8s → … 封顶 60s；连续 MAX_CONSECUTIVE_FAILURES
 * （3）次重启失败 → failed 状态上报（status.restarts / lastError / lastRestartAt
 * 可观测），等待人工/Agent 干预（P3 doctor 接手）。
 * 正常 stop()（插件卸载/重启宿主）不触发守护——手动停止是意图，不是故障。
 */
import type { RunningPb } from './pb-process.ts'

export interface WatchdogState {
  restarts: number
  lastError: string | null
  lastRestartAt: number | null
  /** 连续重启失败计数（成功运行 >60s 清零——「稳定运行」判定） */
  consecutiveFailures: number
}

export interface WatchdogOptions {
  /** 健康轮询间隔（默认 15s） */
  healthIntervalMs?: number
  /** 退避基数（默认 2s；第 n 次失败后等 base * 2^n，封顶 60s） */
  backoffBaseMs?: number
  /** 连续失败熔断阈值（默认 3；达到后不再自动重启） */
  maxConsecutiveFailures?: number
  /** 稳定运行判定窗口（默认 60s；超过则清零连续失败计数） */
  stableAfterMs?: number
  /** 重启动作（注入：backend 提供；测试注入 mock） */
  restart: () => Promise<void>
  /** 状态上报（注入：backend 同步 status 用） */
  onStateChange: (state: WatchdogState) => void
  /** 日志（注入） */
  log?: (level: 'info' | 'warn' | 'error', message: string) => void
}

export const WATCHDOG_DEFAULTS = {
  healthIntervalMs: 15_000,
  backoffBaseMs: 2_000,
  maxConsecutiveFailures: 3,
  stableAfterMs: 60_000,
} as const

export class PbWatchdog {
  private readonly opts: Required<Omit<WatchdogOptions, 'restart' | 'onStateChange' | 'log'>>
  private readonly restart: () => Promise<void>
  private readonly onStateChange: (state: WatchdogState) => void
  private readonly log: (level: 'info' | 'warn' | 'error', message: string) => void

  private state: WatchdogState = { restarts: 0, lastError: null, lastRestartAt: null, consecutiveFailures: 0 }
  private stopped = false
  private intentionalStop = false
  private restarting = false
  private healthTimer: ReturnType<typeof setInterval> | undefined
  private backoffTimer: ReturnType<typeof setTimeout> | undefined
  private startedAt = 0

  constructor(options: WatchdogOptions) {
    this.opts = {
      healthIntervalMs: options.healthIntervalMs ?? WATCHDOG_DEFAULTS.healthIntervalMs,
      backoffBaseMs: options.backoffBaseMs ?? WATCHDOG_DEFAULTS.backoffBaseMs,
      maxConsecutiveFailures: options.maxConsecutiveFailures ?? WATCHDOG_DEFAULTS.maxConsecutiveFailures,
      stableAfterMs: options.stableAfterMs ?? WATCHDOG_DEFAULTS.stableAfterMs,
    }
    this.restart = options.restart
    this.onStateChange = options.onStateChange
    this.log = options.log ?? (() => {})
  }

  getState(): WatchdogState {
    return { ...this.state }
  }

  /** 手动停止（意图性）：停轮询、不触发重启。可在 stop 后 destroy。 */
  stop(): void {
    this.intentionalStop = true
    this.stopped = true
    this.clearTimers()
  }

  /** 恢复守护（重启成功后调用） */
  resume(): void {
    this.intentionalStop = false
    this.stopped = false
    this.startHealthPolling()
  }

  /** 进程退出通知（RunningPb.onExit 接线） */
  onProcessExit(code: number | null): void {
    if (this.intentionalStop || this.stopped) return
    this.log('warn', `pocketbase exited unexpectedly (code ${code ?? 'null'}) — scheduling restart`)
    void this.scheduleRestart(`pocketbase exited (code ${code ?? 'null'})`)
  }

  private startHealthPolling(): void {
    this.clearTimers()
    this.healthTimer = setInterval(() => { void this.checkHealth() }, this.opts.healthIntervalMs)
  }

  private async checkHealth(): Promise<void> {
    if (this.stopped || this.restarting) return
    // 稳定运行清零连续失败（从最近一次成功运行起算，须超 stableAfterMs；
    // 崩溃循环中由 doRestart 成功路径刷新 startedAt——轮询本身不清零时序错乱）
    if (this.state.consecutiveFailures > 0 && this.startedAt > 0 && Date.now() - this.startedAt > this.opts.stableAfterMs) {
      this.state = { ...this.state, consecutiveFailures: 0 }
      this.onStateChange(this.getState())
    }
  }

  private backoffMs(): number {
    const n = this.state.consecutiveFailures
    return Math.min(60_000, this.opts.backoffBaseMs * 2 ** n)
  }

  private async scheduleRestart(reason: string): Promise<void> {
    if (this.restarting || this.stopped) return
    if (this.state.consecutiveFailures >= this.opts.maxConsecutiveFailures) {
      const giveUp = `${reason}; giving up after ${this.state.consecutiveFailures} consecutive restart failures (agent can diagnose via app_backend backend_health / backend_restart)`
      this.state = { ...this.state, lastError: giveUp }
      this.onStateChange(this.getState())
      this.log('error', giveUp)
      return
    }
    this.restarting = true
    const delay = this.backoffMs()
    this.log('warn', `restarting pocketbase in ${delay}ms (attempt ${this.state.consecutiveFailures + 1}/${this.opts.maxConsecutiveFailures})`)
    this.backoffTimer = setTimeout(() => {
      void this.doRestart(reason)
    }, delay)
  }

  private async doRestart(reason: string): Promise<void> {
    try {
      await this.restart()
      // 成功：稳定窗口起点刷新（从此刻起 stableAfterMs 后才清零 cf）
      this.startedAt = Date.now()
      this.state = { ...this.state, restarts: this.state.restarts + 1, lastRestartAt: Date.now() }
      this.onStateChange(this.getState())
      this.log('info', 'pocketbase restarted successfully')
      this.resume()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.state = {
        ...this.state,
        consecutiveFailures: this.state.consecutiveFailures + 1,
        lastError: `${reason}; restart failed: ${message}`,
      }
      this.onStateChange(this.getState())
      this.log('error', `restart failed (${this.state.consecutiveFailures}/${this.opts.maxConsecutiveFailures}): ${message}`)
      // 继续退避重试（直到熔断）——先清 restarting 标志再调度（否则被入口卫语句吞掉）
      this.restarting = false
      void this.scheduleRestart(reason)
    } finally {
      this.restarting = false
    }
  }

  private clearTimers(): void {
    if (this.healthTimer !== undefined) { clearInterval(this.healthTimer); this.healthTimer = undefined }
    if (this.backoffTimer !== undefined) { clearTimeout(this.backoffTimer); this.backoffTimer = undefined }
  }
}
