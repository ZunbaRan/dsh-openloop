/**
 * 设计原语节点（0.11 DSL 复刻 baoyu-design）的校验用例：
 * 嵌套通过 / 深度超限 / 总数超限 / id 重复 / 非 box 嵌套拒绝 /
 * style 白名单外属性拒绝 / 非法颜色值拒绝 / 动画枚举校验。
 */
import { describe, expect, it } from 'vitest'
import { validateCanvasDocument, CanvasValidationError } from '../src/dsl.ts'

const doc = (nodes: unknown[]): unknown => ({ title: '设计验证', layout: 'grid', nodes })

const box = (id: string, style: unknown = {}, children?: unknown[]): unknown =>
  children === undefined ? { id, type: 'box', props: { style } } : { id, type: 'box', props: { style }, children }

describe('design primitives: nesting', () => {
  it('accepts valid nested box tree (3 levels, mixed design + data nodes)', () => {
    const d = validateCanvasDocument(doc([
      box('hero', { padding: 40, gradient: 'ocean', display: 'flex', flexDirection: 'column', alignItems: 'center' }, [
        box('hero-inner', { maxWidth: 800 }, [
          { id: 't1', type: 'text', props: { content: '让代码快十倍', style: { fontSize: 48, fontWeight: '800', color: '#ffffff' }, animation: { name: 'slide-up' } } },
          { id: 't2', type: 'text', props: { content: 'AI 结对程序员', style: { color: 'rgba(255,255,255,.8)', fontSize: 18 } } },
        ]),
        { id: 'ic1', type: 'icon', props: { name: 'rocket', size: 48, style: { color: '#fff' } } },
      ]),
      { id: 'kpi', type: 'stat-card', props: { label: 'DAU', value: '12.8w', delta: 8.2 } },
    ]))
    expect(d.nodes[0]?.id).toBe('hero')
    expect(d.nodes[0]?.children?.length).toBe(2)
  })

  it('rejects nesting depth > 6', () => {
    // 7 层嵌套
    let leaf = box('d7', {})
    for (let i = 6; i >= 1; i -= 1) leaf = box(`d${i}`, {}, [leaf])
    expect(() => validateCanvasDocument(doc([leaf]))).toThrow(CanvasValidationError)
    expect(() => validateCanvasDocument(doc([leaf]))).toThrow(/depth/)
  })

  it('rejects total nodes > 128 (including nested)', () => {
    const children = Array.from({ length: 120 }, (_, i) => ({ id: `c${i}`, type: 'text', props: { content: 'x' } }))
    const dataNodes = Array.from({ length: 15 }, (_, i) => ({ id: `n${i}`, type: 'stat-card', props: { label: 'a', value: '1' } }))
    expect(() => validateCanvasDocument(doc([box('big', {}, children), ...dataNodes]))).toThrow(/total node count/)
  })

  it('rejects duplicate ids across nesting levels', () => {
    expect(() => validateCanvasDocument(doc([
      box('dup', {}, [box('dup', {})]),
    ]))).toThrow(/duplicate node id "dup"/)
  })

  it('rejects children on non-box nodes (fail-closed)', () => {
    expect(() => validateCanvasDocument(doc([
      { id: 's1', type: 'stat-card', props: { label: 'a', value: '1' }, children: [box('c1')] },
    ]))).toThrow(/do not support children/)
  })
})

describe('design primitives: style whitelist', () => {
  it('rejects non-whitelisted style property', () => {
    expect(() => validateCanvasDocument(doc([
      box('b1', { position: 'fixed' }),
    ]))).toThrow(/unknown style property "position"/)
  })

  it('rejects invalid color value', () => {
    expect(() => validateCanvasDocument(doc([
      box('b1', { backgroundColor: 'javascript:alert(1)' }),
    ]))).toThrow(/not a valid color/)
  })

  it('rejects length beyond max (fontSize > 96)', () => {
    expect(() => validateCanvasDocument(doc([
      { id: 't1', type: 'text', props: { content: 'x', style: { fontSize: 200 } } },
    ]))).toThrow(/length/)
  })

  it('accepts semantic presets (shadow/gradient/tone enums)', () => {
    const d = validateCanvasDocument(doc([box('b1', { shadow: 'lg', gradient: 'sunset', tone: 'info' })]))
    expect(d.nodes.length).toBe(1)
  })

  it('rejects semantic preset outside enum', () => {
    expect(() => validateCanvasDocument(doc([
      box('b1', { shadow: 'mega' }),
    ]))).toThrow(/must be one of/)
  })

  it('rejects style props exceeding per-node max (box > 16)', () => {
    const style: Record<string, unknown> = {}
    for (let i = 0; i < 18; i += 1) style[`opacity${i}`] = 1 // 未知属性也计错误——用合法属性超量
    const legal: Record<string, unknown> = { color: '#111', backgroundColor: '#222', borderColor: '#333', shadow: 'sm', gradient: 'cool', tone: 'default', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 8, margin: 4, borderRadius: 8, borderWidth: 1, opacity: 1 }
    expect(() => validateCanvasDocument(doc([box('b1', { ...legal, flex: 'grow', flexWrap: 'wrap' })]))).toThrow(/exceeds max/)
  })
})

describe('design primitives: animation', () => {
  it('accepts valid animation config', () => {
    const d = validateCanvasDocument(doc([
      { id: 't1', type: 'text', props: { content: 'x', animation: { name: 'fade-in', duration: 600, delay: 200 } } },
    ]))
    expect(d.nodes.length).toBe(1)
  })

  it('rejects unknown animation name', () => {
    expect(() => validateCanvasDocument(doc([
      { id: 't1', type: 'text', props: { content: 'x', animation: { name: 'spin-fast' } } },
    ]))).toThrow(/must be one of/)
  })

  it('rejects unknown animation field', () => {
    expect(() => validateCanvasDocument(doc([
      { id: 't1', type: 'text', props: { content: 'x', animation: { name: 'pulse', easing: 'linear' } } },
    ]))).toThrow(/unknown animation field/)
  })
})

describe('design primitives: icon whitelist', () => {
  it('accepts whitelisted icon, rejects unknown', () => {
    const d = validateCanvasDocument(doc([{ id: 'i1', type: 'icon', props: { name: 'rocket', size: 32 } }]))
    expect(d.nodes.length).toBe(1)
    expect(() => validateCanvasDocument(doc([{ id: 'i2', type: 'icon', props: { name: 'sparkles' } }]))).toThrow(/must be one of/)
  })
})
