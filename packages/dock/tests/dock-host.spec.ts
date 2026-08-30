import { describe, expect, it } from 'vitest'
import { clampDockWidth, DOCK_MIN_WIDTH, dockMaxWidth } from '../src/shared/dock-width.ts'

describe('clampDockWidth', () => {
  it('clamps to the shared minimum (560, 三列布局下限) and the full-viewport maximum (0.8.2 去预设上限)', () => {
    const max = dockMaxWidth()
    expect(max).toBeGreaterThanOrEqual(560)
    expect(clampDockWidth(0)).toBe(DOCK_MIN_WIDTH)
    expect(DOCK_MIN_WIDTH).toBe(560)
    expect(clampDockWidth(DOCK_MIN_WIDTH)).toBe(DOCK_MIN_WIDTH)
    expect(clampDockWidth(720)).toBe(720)
    // 超过视口的值被钳到视口全宽（不再预设 1200px 封顶）
    expect(clampDockWidth(99999)).toBe(max)
  })
})
