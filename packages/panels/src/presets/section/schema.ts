/**
 * section props JSON Schema。
 * title ≤120 可选；bordered 默认 true（可关边框做分区留白）；children 0–12 子 widget。
 */
export const sectionSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 120,
      description: '分区标题，≤120 字符，可省略',
    },
    bordered: {
      type: 'boolean',
      description: '是否带边框/背景，默认 true；false 渲染为纯分区',
    },
    children: {
      type: 'array',
      maxItems: 12,
      description: '子 widget 列表（0–12）：每项为 WidgetUnit 形状 { id, source: { type: "preset", kind, props } }',
      items: { type: 'object' },
    },
  },
} as const
