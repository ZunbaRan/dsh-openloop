/**
 * canvas-app-bridge：宿主 ↔ canvas iframe 的应用级通信桥（0.12 架构核心）。
 *
 * 通信原则（多轮架构讨论用户拍板）：
 * - 只有【低频业务事件】：init（主题，一次）/ snapshot（Agent 新数据）进；
 *   ready / height / annotation（标注结果）/ action 出——零交互级跨界
 * - 安全：魔数前缀 __openloopCanvasApp + 随机 token（host init 下发，
 *   app 后续消息校验；host 侧校验 e.source === iframe.contentWindow）
 * - opaque origin：app 用 window.parent.postMessage(msg, '*')（拿不到宿主 origin）
 *
 * 与 0.9.x 探针桥的本质区别：那是「事件级高频转发 + 坐标换算」；
 * 这是「数据进出」——标注交互全部在 iframe 内闭环。
 */

export const CANVAS_APP_MAGIC = '__openloopCanvasApp'

/** 宿主 → app */
export type HostToAppMessage =
  | { t: 'init'; token: string; theme?: Readonly<Record<string, string>> }
  | { t: 'snapshot'; snapshot: unknown }

/** app → 宿主 */
export interface AppAnnotationPayload {
  readonly canvasId: string
  readonly revision: number
  readonly targets: readonly unknown[]
  readonly note: string
}

export type AppToHostMessage =
  | { t: 'ready' }
  | { t: 'height'; height: number }
  | { t: 'annotation'; payload: AppAnnotationPayload }
  | { t: 'action'; node: { id: string; type: string; props: Record<string, unknown> } }

/** 底层消息信封 */
export interface BridgeEnvelope {
  readonly [k: string]: unknown
  readonly __openloopCanvasApp?: boolean
  readonly token?: string
  readonly t?: string
}

/** 信封解析（魔数 + token 校验；失败返回 null——静默丢弃，防伪造/无关消息） */
export function parseEnvelope(data: unknown, expectToken: string | null): { t: string; get: <T>(k: string) => T | undefined } | null {
  if (typeof data !== 'object' || data === null) return null
  const env = data as BridgeEnvelope
  if (env.__openloopCanvasApp !== true) return null
  if (expectToken !== null && env.token !== expectToken) return null
  if (typeof env.t !== 'string' || env.t.length === 0) return null
  return { t: env.t, get: <T>(k: string): T | undefined => env[k] as T | undefined }
}

/** 生成随机 token（host init 用） */
export function generateBridgeToken(): string {
  return `ca_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

export interface HostBridgeHandlers {
  onReady?: () => void
  onHeight?: (height: number) => void
  onAnnotation?: (payload: AppAnnotationPayload) => void
  onAction?: (node: { id: string; type: string; props: Record<string, unknown> }) => void
}

// ---------------------------------------------------------------------------
// host 侧：持 iframe 引用，发 init/snapshot，收 app 消息
// ---------------------------------------------------------------------------

export class CanvasAppHostBridge {
  private readonly token: string
  private readonly iframe: HTMLIFrameElement
  private readonly handlers: HostBridgeHandlers
  private readonly onMessage: (ev: MessageEvent) => void
  private disposed = false
  private pendingTheme: Readonly<Record<string, string>> | undefined

  constructor(iframe: HTMLIFrameElement, handlers: HostBridgeHandlers = {}) {
    this.token = generateBridgeToken()
    this.iframe = iframe
    this.handlers = handlers
    this.onMessage = (ev: MessageEvent): void => {
      if (this.disposed) return
      if (ev.source !== this.iframe.contentWindow) return // 只信自己的 iframe
      // hello 拉模式（0.12 真机教训）：host 的 init 在 iframe load（壳完成）时发——
      // app.js module 尚未执行，init 丢失。app 启动时主动 hello → host 重发 init
      const hello = parseEnvelope(ev.data, null)
      if (hello !== null && hello.t === 'hello') {
        console.info('[canvas-bridge] hello received — resending init')
        this.sendInit(this.pendingTheme)
        return
      }
      const msg = parseEnvelope(ev.data, this.token)
      if (msg === null) return
      switch (msg.t) {
        case 'ready': console.info('[canvas-bridge] app ready'); this.handlers.onReady?.(); break
        case 'height': {
          const h = msg.get<number>('height')
          if (typeof h === 'number' && h > 0) this.handlers.onHeight?.(h)
          break
        }
        case 'annotation': {
          const p = msg.get<AppAnnotationPayload>('payload')
          if (p !== undefined && typeof p === 'object') this.handlers.onAnnotation?.(p)
          break
        }
        case 'action': {
          const n = msg.get<{ id: string; type: string; props: Record<string, unknown> }>('node')
          if (n !== undefined && typeof n === 'object') this.handlers.onAction?.(n)
          break
        }
      }
    }
    window.addEventListener('message', this.onMessage)
  }

  /** iframe onload 后调用：下发 init（token + 可选主题变量）；theme 暂存供 hello 重发 */
  sendInit(theme?: Readonly<Record<string, string>>): void {
    this.pendingTheme = theme
    this.iframe.contentWindow?.postMessage({ __openloopCanvasApp: true, token: this.token, t: 'init', theme }, '*')
  }

  /** 0.12.9：宿主点击「评论 N」→ 通知 iframe 弹出评注面板（交互反馈） */
  sendOpenPanel(): void {
    this.iframe.contentWindow?.postMessage({ __openloopCanvasApp: true, token: this.token, t: 'open-panel' }, '*')
  }

  sendSnapshot(snapshot: unknown, annotations?: readonly unknown[]): void {
    console.info('[canvas-bridge] snapshot pushed')
    this.iframe.contentWindow?.postMessage({ __openloopCanvasApp: true, token: this.token, t: 'snapshot', snapshot, annotations }, '*')
  }

  dispose(): void {
    this.disposed = true
    window.removeEventListener('message', this.onMessage)
  }
}

// ---------------------------------------------------------------------------
// app 侧（iframe 内运行）：收 init/snapshot，发 app 消息
// ---------------------------------------------------------------------------

export interface AppBridgeHandlers {
  onInit: (theme: Readonly<Record<string, string>> | undefined) => void
  onSnapshot: (snapshot: unknown, annotations: unknown) => void
  onOpenPanel?: (() => void) | undefined
}

export class CanvasAppClientBridge {
  private token: string | null = null
  private readonly handlers: AppBridgeHandlers
  private readonly onMessage: (ev: MessageEvent) => void
  private readySent = false

  constructor(handlers: AppBridgeHandlers) {
    this.handlers = handlers
    this.onMessage = (ev: MessageEvent): void => {
      const msg = parseEnvelope(ev.data, null) // token 在 init 前未知——先只验魔数
      if (msg === null) return
      if (msg.t === 'init') {
        const token = msg.get<string>('token')
        if (typeof token === 'string' && token.length > 0) this.token = token
        this.handlers.onInit(msg.get<Readonly<Record<string, string>>>('theme'))
        if (!this.readySent) {
          this.readySent = true
          this.send({ t: 'ready' })
        }
        return
      }
      // 后续消息要求 token 匹配（init 已锁定）
      const verified = parseEnvelope(ev.data, this.token)
      if (verified === null) return
      if (verified.t === 'open-panel') {
        this.handlers.onOpenPanel?.()
        return
      }
      if (verified.t === 'snapshot') {
        // 诊断信（0.12 T5 排查）：app 端 console 不冒泡主 frame——postMessage 回传
        try { window.parent.postMessage({ __openloopCanvasAppDiag: true, kind: 'app-snapshot', hasToken: this.token !== null }, '*') } catch { /* ignore */ }
        this.handlers.onSnapshot(verified.get<unknown>('snapshot'), verified.get<unknown>('annotations'))
      }
    }
    window.addEventListener('message', this.onMessage)
    // hello 拉模式：立即通知宿主「我启动了」（host 收到即重发 init——
    // host 的首次 init 在壳 load 时发，早于本模块执行，必然丢失）
    try { window.parent.postMessage({ __openloopCanvasApp: true, t: 'hello' }, '*') } catch { /* 宿主已销毁——静默 */ }
  }

  send(msg: AppToHostMessage): void {
    if (this.token === null) return // init 前不发送（host 还没准备好收）
    try {
      window.parent.postMessage({ __openloopCanvasApp: true, token: this.token, ...msg }, '*')
    } catch { /* 宿主已销毁等——静默 */ }
  }

  dispose(): void {
    window.removeEventListener('message', this.onMessage)
  }
}
