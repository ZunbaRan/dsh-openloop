/**
 * 桥协议客户端（DSH_PANELS_DESIGN §8.4，宿主侧）。
 *
 * - `isTrustedBridgeMessage`：宿主侧 message 监听入口，校验
 *   ① `event.origin` 在可信来源内——沙箱 iframe 无 `allow-same-origin`，恒为 opaque
 *   origin，其 `event.origin` 是字符串 `"null"`（§15 S7 source 校验）；
 *   ② `data.type` 在 iframe → 宿主白名单内；
 *   ③ `data.token` 与 widget 级随机 token 一致（参照 artifact ArtifactCard token 校验模式）。
 *   任一不满足即拒绝（fail-closed）。
 * - `sendTokenSync` / `sendData`：宿主 → iframe 消息构造（§8.4）。
 *
 * 类型刻意不依赖 DOM（用结构类型），保证该文件可被纯 Node 单测直接 import。
 */

/** §8.4 桥消息 type 全集 */
export const BRIDGE_MESSAGE = {
  tokenSync: 'openloop:token-sync',
  data: 'openloop:data',
  sizeChange: 'openloop:size-change',
  ready: 'openloop:ready',
  error: 'openloop:error',
} as const

/** iframe → 宿主 方向的可信 type 白名单 */
const FROM_IFRAME_TYPES: readonly string[] = [
  BRIDGE_MESSAGE.sizeChange,
  BRIDGE_MESSAGE.ready,
  BRIDGE_MESSAGE.error,
] as const

/** opaque origin iframe 的 `event.origin` 恒为字符串 "null"（S7 默认可信来源） */
export const TRUSTED_BRIDGE_ORIGIN = 'null'

/** token-sync 载荷（§8.4 宿主 → iframe） */
export interface TokenSyncPayload {
  token: string
  /** tokenSchema 固定 2（§14 token v2 扩充后的 62 token） */
  preset: string
  appearance: 'light' | 'dark'
  /** 全局系 12 个 token */
  global: Record<string, string>
  /** 预设系 50 个 token */
  tokens: Record<string, string>
}

/** data 消息载荷（§8.4 宿主 → iframe） */
export interface DataMessagePayload {
  token: string
  widgetId: string
  data: unknown
  resolvedAt: string
}

/** 仅要求 postMessage 能力（避免依赖 DOM Window 类型） */
export interface BridgeFrameWindow {
  postMessage(message: unknown, targetOrigin: string): void
}

export interface BridgeEventLike {
  origin: string
  data: unknown
}

/** 校验桥消息可信性：来源 + type 白名单 + widget token 三关，任一不满足即拒绝（S7） */
export function isTrustedBridgeMessage(
  event: BridgeEventLike,
  token: string,
  trustedOrigins: readonly string[] = [TRUSTED_BRIDGE_ORIGIN],
): boolean {
  if (!trustedOrigins.includes(event.origin)) return false
  if (typeof event.data !== 'object' || event.data === null) return false
  const data = event.data as Record<string, unknown>
  if (typeof data.type !== 'string' || !FROM_IFRAME_TYPES.includes(data.type)) return false
  return data.token === token
}

/** 发送 token-sync（§8.4）：预设/明暗切换或首帧必发；tokenSchema 恒为 2 */
export function sendTokenSync(frame: BridgeFrameWindow | null, payload: TokenSyncPayload): void {
  frame?.postMessage({
    type: BRIDGE_MESSAGE.tokenSync,
    token: payload.token,
    tokenSchema: 2,
    preset: payload.preset,
    appearance: payload.appearance,
    global: payload.global,
    tokens: payload.tokens,
  }, '*')
}

/** 发送数据消息（§8.4）：数据刷新时宿主重新解析后重推，不重建 iframe */
export function sendData(frame: BridgeFrameWindow | null, payload: DataMessagePayload): void {
  frame?.postMessage({
    type: BRIDGE_MESSAGE.data,
    token: payload.token,
    widgetId: payload.widgetId,
    data: payload.data,
    resolvedAt: payload.resolvedAt,
  }, '*')
}
