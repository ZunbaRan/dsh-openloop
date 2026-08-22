/**
 * row props JSON Schema。
 * gap 0–48（默认 8）；align 交叉轴对齐（默认 center）；wrap 默认 true；children 0–12。
 */
export const rowSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    gap: {
      type: 'integer',
      minimum: 0,
      maximum: 48,
      description: '子组件间距（px），0–48，默认 8',
    },
    align: {
      enum: ['start', 'center', 'end', 'stretch'],
      description: '交叉轴对齐，默认 center',
    },
    wrap: {
      type: 'boolean',
      description: '是否允许换行，默认 true',
    },
    children: {
      type: 'array',
      maxItems: 12,
      description: '子 widget 列表（0–12）：每项为 WidgetUnit 形状 { id, source: { type: "preset", kind, props } }',
      items: { type: 'object' },
    },
  },
} as const
