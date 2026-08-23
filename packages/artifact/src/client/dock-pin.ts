/**
 * OpenLoop Dock pin 接线（可选依赖：dock 未安装时按钮自动隐藏）。
 * 独立模块避免与 client/index.tsx 循环依赖。
 */
export interface DockServiceLike {
  pinPanel(meta: unknown, title: string, origin?: unknown): void
  pinArtifact(meta: unknown, title: string, origin?: unknown): void
}

let dockService: DockServiceLike | undefined

export function setDockService(service: DockServiceLike | undefined): void {
  dockService = service
}

export function getDockService(): DockServiceLike | undefined {
  return dockService
}
