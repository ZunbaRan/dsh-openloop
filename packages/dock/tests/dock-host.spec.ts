import { describe, expect, it } from 'vitest'
import { clampDockWidth, DOCK_MIN_WIDTH, dockMaxWidth } from '../src/shared/dock-width.ts'

describe('clampDockWidth', () => {
  it('clamps to the shared minimum and the viewport-driven maximum', () => {
    const max = dockMaxWidth()
    expect(max).toBeLessThanOrEqual(1200)
    expect(max).toBeGreaterThan(0)
    expect(clampDockWidth(0)).toBe(DOCK_MIN_WIDTH)
    expect(clampDockWidth(DOCK_MIN_WIDTH)).toBe(DOCK_MIN_WIDTH)
    expect(clampDockWidth(420)).toBe(420)
    expect(clampDockWidth(99999)).toBe(max)
  })
})
