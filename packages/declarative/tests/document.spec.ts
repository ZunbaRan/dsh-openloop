import { describe, expect, it } from 'vitest'
import { validateArgs } from '@deepseek-ai/dsh-tools'
import { declarativeMetaFrom, validateDocument, VISUALIZE_PARAMETERS, type ComparisonDocument, type FlowDocument } from '../src/document.ts'
import { parseDocumentInput } from '../src/validation.ts'

describe('declarative contract', () => {
  it('accepts a valid flow and replay metadata', () => {
    const document: FlowDocument = {
      kind: 'flow', title: 'Request path', nodes: [{ id: 'a', label: 'Client' }, { id: 'b', label: 'Server' }],
      edges: [{ from: 'a', to: 'b', label: 'HTTPS' }],
    }
    expect(() => validateDocument(document)).not.toThrow()
    expect(declarativeMetaFrom({ kind: 'openloop.declarative', version: 1, mode: 'inline', document })?.document).toEqual(document)
  })

  it('rejects flow edges that reference missing nodes', () => {
    const document: FlowDocument = {
      kind: 'flow', title: 'Broken', nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ from: 'a', to: 'missing' }],
    }
    expect(() => validateDocument(document)).toThrow(/unknown node/)
  })

  it('requires one comparison value per column', () => {
    const document: ComparisonDocument = {
      kind: 'comparison', title: 'Options', columns: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }],
      rows: [{ label: 'Cost', values: ['Low'] }],
    }
    expect(() => validateDocument(document)).toThrow(/1 values for 2 columns/)
  })

  it('declines malformed replay metadata instead of throwing', () => {
    expect(declarativeMetaFrom({ kind: 'openloop.declarative', version: 1, mode: 'wide', document: { kind: 'timeline', title: '', items: [] } })).toBeUndefined()
  })

  it('accepts the document encoding produced by a real DSH model call', () => {
    const document = JSON.stringify({
      kind: 'flow', title: 'Test Flow',
      nodes: [{ id: 'a', label: 'Node A' }, { id: 'b', label: 'Node B' }],
      edges: [{ from: 'a', to: 'b' }],
    })
    expect(validateArgs(VISUALIZE_PARAMETERS, { document, mode: 'inline' })).toEqual([])
    expect(parseDocumentInput(document).kind).toBe('flow')
  })

  it('accepts a native object and reports malformed JSON strings clearly', () => {
    const document = { kind: 'timeline' as const, title: 'Release', items: [{ id: 'a', title: 'Build' }, { id: 'b', title: 'Ship' }] }
    expect(validateArgs(VISUALIZE_PARAMETERS, { document })).toEqual([])
    expect(parseDocumentInput(document)).toEqual(document)
    expect(() => parseDocumentInput('{not json')).toThrow(/not valid JSON/)
  })
})
