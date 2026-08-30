/**
 * Dock 宽度钳制（0.8.2 用户拍板去预设化：2026-08-30）。
 * 独立于 client 目录：包级 typecheck 排除 src/client（无 DOM lib），
 * 单测从这里取值，避免把 client 文件拖进检查程序。
 */
export const DOCK_MIN_WIDTH = 560

/** 拖宽上限：视口全宽（2026-08-30 用户要求「想拖多宽就多宽」——满屏是用户的合法选择，不再预设 1200/70vw 封顶） */
export const dockMaxWidth = (): number => {
  const viewport = (globalThis as { innerWidth?: unknown }).innerWidth
  return typeof viewport === 'number' && Number.isFinite(viewport) ? viewport : 4096
}

export const clampDockWidth = (value: number): number => Math.max(DOCK_MIN_WIDTH, Math.min(dockMaxWidth(), value))
