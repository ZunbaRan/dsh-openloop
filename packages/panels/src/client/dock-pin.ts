/**
 * OpenLoop Dock pin 接线（可选依赖：dock 未安装时按钮自动隐藏）。
 * 独立模块避免与 client/index.tsx 循环依赖。
 */
export interface DockServiceLike {
  pinPanel(meta: unknown, title: string, origin?: unknown): void
  pinArtifact(meta: unknown, title: string, origin?: unknown): void
  /** 投影为快照悬浮窗（冻结 source，会话级；dock 0.9.6+，旧版 dock 无此方法——调用方需 ?. 兜底） */
  openSnapshot?(source: unknown, title: string): void
}

// 2026-08-24：cordis client 侧动态 inject 回调真机未触发——改读 dock 挂在
// window 上的 service 直通（渲染时读取，天然支持加载时序；dock 未装时 undefined）
export function getDockService(): DockServiceLike | undefined {
  return (globalThis as unknown as { __openloopDockService?: DockServiceLike }).__openloopDockService
}
