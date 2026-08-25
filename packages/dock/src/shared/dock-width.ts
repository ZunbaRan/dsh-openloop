/**
 * Dock 宽度钳制（2026-08-24 放宽拖宽上限后统一收口）。
 * 独立于 client 目录：包级 typecheck 排除 src/client（无 DOM lib），
 * 单测从这里取值，避免把 client 文件拖进检查程序。
 */
export const DOCK_MIN_WIDTH = 320

/** 拖宽上限：跟随视口，封顶 1200px（对齐 bsb 的可拉宽体验） */
export const dockMaxWidth = (): number => {
  const viewport = (globalThis as { innerWidth?: unknown }).innerWidth
  const width = typeof viewport === 'number' && Number.isFinite(viewport) ? viewport : undefined
  return width === undefined ? 1200 : Math.min(1200, Math.round(width * 0.7))
}

export const clampDockWidth = (value: number): number => Math.max(DOCK_MIN_WIDTH, Math.min(dockMaxWidth(), value))
