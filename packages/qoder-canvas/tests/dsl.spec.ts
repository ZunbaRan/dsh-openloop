import { describe, expect, it } from 'vitest'
import { CanvasValidationError, generateCanvasId, isValidCanvasId, validateCanvasDocument } from '../src/dsl.ts'

const validDoc = {
  title: '部署仪表盘',
  layout: 'grid',
  nodes: [
    { id: 'n1', type: 'stat-card', props: { label: '错误率', value: '0.42%', delta: -12, tone: 'success' } },
    { id: 'n2', type: 'chart', props: { chart: 'line', series: [{ name: 'qps', points: [{ x: 1, y: 100 }, { x: 2, y: 120 }] }] } },
    { id: 'n3', type: 'table', props: { columns: ['服务', '状态'], rows: [['api', 'ok']] } },
    { id: 'n4', type: 'action', props: { label: '修复', intent: 'fix-n1', context: { file: 'src/api.ts' } } },
  ],
}

describe('validateCanvasDocument', () => {
  it('accepts a valid document', () => {
    const doc = validateCanvasDocument(validDoc)
    expect(doc.title).toBe('部署仪表盘')
    expect(doc.nodes.length).toBe(4)
  })

  it('rejects non-object', () => {
    expect(() => validateCanvasDocument('x')).toThrow(CanvasValidationError)
    expect(() => validateCanvasDocument(null)).toThrow(CanvasValidationError)
  })

  it('rejects unknown node type with actionable message', () => {
    const bad = { ...validDoc, nodes: [{ id: 'x', type: 'iframe', props: {} }] }
    try {
      validateCanvasDocument(bad)
      expect.unreachable()
    } catch (e) {
      expect((e as Error).message).toContain('unknown node type "iframe"')
      expect((e as Error).message).toContain('stat-card')
    }
  })

  it('rejects unknown prop (fail-closed, no smuggling)', () => {
    const bad = { ...validDoc, nodes: [{ id: 'n1', type: 'stat-card', props: { label: 'a', value: 'b', onclick: 'alert(1)' } }] }
    expect(() => validateCanvasDocument(bad)).toThrow(/unknown prop/)
  })

  it('rejects unknown top-level field', () => {
    const bad = { ...validDoc, script: '<script/>' }
    expect(() => validateCanvasDocument(bad)).toThrow(/unknown top-level field/)
  })

  it('rejects javascript: href', () => {
    const bad = { ...validDoc, nodes: [{ id: 'l1', type: 'link', props: { label: 'x', href: 'javascript:alert(1)' } }] }
    expect(() => validateCanvasDocument(bad)).toThrow(/scheme must be http/)
  })

  it('accepts https href', () => {
    const ok = { ...validDoc, nodes: [{ id: 'l1', type: 'link', props: { label: 'x', href: 'https://example.com' } }] }
    expect(validateCanvasDocument(ok).nodes.length).toBe(1)
  })

  it('rejects duplicate node ids', () => {
    const bad = { ...validDoc, nodes: [...validDoc.nodes, { id: 'n1', type: 'callout', props: { text: 'x' } }] }
    expect(() => validateCanvasDocument(bad)).toThrow(/duplicate node id/)
  })

  it('rejects invalid node id format', () => {
    const bad = { ...validDoc, nodes: [{ id: 'a b', type: 'callout', props: { text: 'x' } }] }
    expect(() => validateCanvasDocument(bad)).toThrow(/id/)
  })

  it('enforces node count limit', () => {
    const many = { ...validDoc, nodes: Array.from({ length: 33 }, (_, i) => ({ id: `n${i}`, type: 'callout', props: { text: 'x' } })) }
    expect(() => validateCanvasDocument(many)).toThrow(/exceeds max 32/)
  })

  it('enforces table row limit with aggregation hint', () => {
    const rows = Array.from({ length: 101 }, (_, i) => [`r${i}`, i])
    const bad = { ...validDoc, nodes: [{ id: 't1', type: 'table', props: { columns: ['a'], rows } }] }
    expect(() => validateCanvasDocument(bad)).toThrow(/aggregate/)
  })

  it('enforces series limits', () => {
    const series = Array.from({ length: 9 }, (_, i) => ({ name: `s${i}`, points: [{ x: 1, y: 1 }] }))
    const bad = { ...validDoc, nodes: [{ id: 'c1', type: 'chart', props: { chart: 'line', series } }] }
    expect(() => validateCanvasDocument(bad)).toThrow(/series exceeds/)
  })

  it('rejects non-flat action context', () => {
    const bad = { ...validDoc, nodes: [{ id: 'a1', type: 'action', props: { label: 'x', intent: 'y', context: { nested: { deep: true } } } }] }
    expect(() => validateCanvasDocument(bad)).toThrow(/flat object/)
  })

  it('rejects edges referencing missing nodes', () => {
    const bad = { ...validDoc, edges: [{ from: 'n1', to: 'ghost' }] }
    expect(() => validateCanvasDocument(bad)).toThrow(/existing node id/)
  })

  it('rejects bad layout enum', () => {
    expect(() => validateCanvasDocument({ ...validDoc, layout: 'circular' })).toThrow(/layout/)
  })

  it('rejects empty nodes', () => {
    expect(() => validateCanvasDocument({ ...validDoc, nodes: [] })).toThrow(/at least 1/)
  })
})

describe('canvasId', () => {
  it('generateCanvasId matches format', () => {
    for (let i = 0; i < 20; i += 1) {
      const id = generateCanvasId()
      expect(isValidCanvasId(id)).toBe(true)
    }
  })
  it('deterministic with injected rand', () => {
    expect(generateCanvasId(() => 0)).toBe('cv_aaaaaaaa')
  })
  it('isValidCanvasId rejects malformed', () => {
    expect(isValidCanvasId('cv_7f3k')).toBe(false)
    expect(isValidCanvasId('dash-001')).toBe(false)
    expect(isValidCanvasId('cv_ABCDEFGH')).toBe(false)
  })
})
