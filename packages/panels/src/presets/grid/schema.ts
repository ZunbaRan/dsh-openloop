/**
 * grid props JSON Schema。
 * columns 1–6（默认 2）；gap 0–48（默认 8）；children 0–12 等宽格子。
 */
export const gridSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    columns: {
      type: 'integer',
      minimum: 1,
      maximum: 6,
      description: '网格列数 1–6，默认 2',
    },
    gap: {
      type: 'integer',
      minimum: 0,
      maximum: 48,
      description: '格子间距（px），0–48，默认 8',
    },
    children: {
      type: 'array',
      maxItems: 12,
      description: '子 widget 列表（0–12）：每项为 WidgetUnit 形状 { id, source: { type: "preset", kind, props } }',
      items: { type: 'object' },
    },
  },
} as const
