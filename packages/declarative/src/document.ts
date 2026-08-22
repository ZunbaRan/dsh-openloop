export const VISUALIZE_UI_TOOL = 'visualize_ui'

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'
export type SurfaceMode = 'inline' | 'wide'

export interface FlowNode {
  id: string
  label: string
  detail?: string
  tone?: Tone
}

export interface FlowEdge {
  from: string
  to: string
  label?: string
}

export interface FlowDocument {
  kind: 'flow'
  title: string
  description?: string
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export interface TimelineItem {
  id: string
  title: string
  detail?: string
  status?: 'past' | 'current' | 'future'
  time?: string
}

export interface TimelineDocument {
  kind: 'timeline'
  title: string
  description?: string
  items: TimelineItem[]
}

export interface ComparisonColumn {
  id: string
  title: string
  subtitle?: string
  recommended?: boolean
}

export interface ComparisonRow {
  label: string
  values: string[]
  emphasis?: 'normal' | 'strong'
}

export interface ComparisonDocument {
  kind: 'comparison'
  title: string
  description?: string
  columns: ComparisonColumn[]
  rows: ComparisonRow[]
}

export type DeclarativeDocument = FlowDocument | TimelineDocument | ComparisonDocument

export interface DeclarativeMeta {
  kind: 'openloop.declarative'
  version: 1
  mode: SurfaceMode
  document: DeclarativeDocument
}

const TONES = ['neutral', 'info', 'success', 'warning', 'danger'] as const

const headerProperties = {
  title: { type: 'string', required: true, description: 'Short user-facing title.' },
  description: { type: 'string', description: 'One concise sentence explaining what to inspect.' },
} as const

export const DOCUMENT_SCHEMA = {
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'flow', required: true },
        ...headerProperties,
        nodes: {
          type: 'array', required: true,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              id: { type: 'string', required: true },
              label: { type: 'string', required: true },
              detail: { type: 'string' },
              tone: { type: 'string', enum: [...TONES] },
            },
          },
        },
        edges: {
          type: 'array', required: true,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              from: { type: 'string', required: true },
              to: { type: 'string', required: true },
              label: { type: 'string' },
            },
          },
        },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'timeline', required: true },
        ...headerProperties,
        items: {
          type: 'array', required: true,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              id: { type: 'string', required: true },
              title: { type: 'string', required: true },
              detail: { type: 'string' },
              status: { type: 'string', enum: ['past', 'current', 'future'] },
              time: { type: 'string' },
            },
          },
        },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'comparison', required: true },
        ...headerProperties,
        columns: {
          type: 'array', required: true,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              id: { type: 'string', required: true },
              title: { type: 'string', required: true },
              subtitle: { type: 'string' },
              recommended: { type: 'boolean' },
            },
          },
        },
        rows: {
          type: 'array', required: true,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              label: { type: 'string', required: true },
              values: { type: 'array', required: true, items: { type: 'string' } },
              emphasis: { type: 'string', enum: ['normal', 'strong'] },
            },
          },
        },
      },
    },
  ],
  description: 'A bounded native visualization document. Pick exactly one kind.',
} as const

export const VISUALIZE_PARAMETERS = {
  document: {
    type: 'json',
    required: true,
    description: 'A Flow, Timeline, or Comparison document. Pass a JSON object. A JSON-encoded string is also accepted for DSH provider compatibility.',
  },
  mode: { type: 'string', enum: ['inline', 'wide'], description: 'Use wide only when side-by-side comparison needs it.' },
} as const

export const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    version: { type: 'integer', const: 1, required: true },
    mode: { type: 'string', enum: ['inline', 'wide'], required: true },
    document: { ...DOCUMENT_SCHEMA, required: true },
  },
} as const

export function validateDocument(document: DeclarativeDocument): void {
  nonEmpty(document.title, 'title')
  if (document.title.length > 120) throw new Error('visualize_ui title must be at most 120 characters')
  if (document.description !== undefined && document.description.length > 360) {
    throw new Error('visualize_ui description must be at most 360 characters')
  }
  if (document.kind === 'flow') validateFlow(document)
  if (document.kind === 'timeline') validateTimeline(document)
  if (document.kind === 'comparison') validateComparison(document)
}

function validateFlow(document: FlowDocument): void {
  if (document.nodes.length < 2 || document.nodes.length > 12) throw new Error('flow requires 2–12 nodes')
  if (document.edges.length < 1 || document.edges.length > 20) throw new Error('flow requires 1–20 edges')
  const ids = uniqueIds(document.nodes.map(node => node.id), 'flow node')
  for (const node of document.nodes) {
    nonEmpty(node.label, `flow node ${node.id} label`)
    if (node.label.length > 80) throw new Error(`flow node ${node.id} label is too long`)
  }
  for (const edge of document.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) throw new Error(`flow edge ${edge.from} → ${edge.to} references an unknown node`)
    if (edge.from === edge.to) throw new Error(`flow edge ${edge.from} cannot point to itself`)
  }
}

function validateTimeline(document: TimelineDocument): void {
  if (document.items.length < 2 || document.items.length > 16) throw new Error('timeline requires 2–16 items')
  uniqueIds(document.items.map(item => item.id), 'timeline item')
  for (const item of document.items) nonEmpty(item.title, `timeline item ${item.id} title`)
}

function validateComparison(document: ComparisonDocument): void {
  if (document.columns.length < 2 || document.columns.length > 4) throw new Error('comparison requires 2–4 columns')
  if (document.rows.length < 1 || document.rows.length > 12) throw new Error('comparison requires 1–12 rows')
  uniqueIds(document.columns.map(column => column.id), 'comparison column')
  if (document.columns.filter(column => column.recommended === true).length > 1) throw new Error('comparison allows at most one recommended column')
  for (const row of document.rows) {
    nonEmpty(row.label, 'comparison row label')
    if (row.values.length !== document.columns.length) {
      throw new Error(`comparison row "${row.label}" has ${row.values.length} values for ${document.columns.length} columns`)
    }
  }
}

function uniqueIds(ids: string[], label: string): Set<string> {
  const seen = new Set<string>()
  for (const id of ids) {
    nonEmpty(id, `${label} id`)
    if (seen.has(id)) throw new Error(`${label} id "${id}" is duplicated`)
    seen.add(id)
  }
  return seen
}

function nonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty`)
}

export function declarativeMetaFrom(value: unknown): DeclarativeMeta | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  if (record.kind !== 'openloop.declarative' || record.version !== 1) return undefined
  if (record.mode !== 'inline' && record.mode !== 'wide') return undefined
  const document = record.document
  if (typeof document !== 'object' || document === null) return undefined
  const kind = (document as Record<string, unknown>).kind
  if (kind !== 'flow' && kind !== 'timeline' && kind !== 'comparison') return undefined
  try {
    validateDocument(document as DeclarativeDocument)
  } catch {
    return undefined
  }
  return { kind: 'openloop.declarative', version: 1, mode: record.mode, document: document as DeclarativeDocument }
}
