/**
 * stack props JSON Schema。
 * direction vertical/horizontal（默认 vertical）；gap 0–48（默认 8）；align 交叉轴对齐；children 0–12。
 */
export const stackSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    direction: {
      enum: ['vertical', 'horizontal'],
      description: '主轴方向，默认 vertical',
    },
    gap: {
      type: 'integer',
      minimum: 0,
      maximum: 48,
      description: '子组件间距（px），0–48，默认 8',
    },
    align: {
      enum: ['start', 'center', 'end', 'stretch'],
      description: '交叉轴对齐，默认 start',
    },
    children: {
      type: 'array',
      maxItems: 12,
      description: '子 widget 列表（0–12）：每项为 WidgetUnit 形状 { id, source: { type: "preset", kind, props } }',
      items: { type: 'object' },
    },
  },
} as const
