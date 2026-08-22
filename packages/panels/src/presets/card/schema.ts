/**
 * card props JSON Schema。
 * title ≤120 / description ≤360 可选；children 为 0–12 个子 widget（仅一层、不含容器）。
 */
export const cardSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 120,
      description: '卡片标题，≤120 字符，可省略',
    },
    description: {
      type: 'string',
      maxLength: 360,
      description: '卡片说明，≤360 字符，可省略',
    },
    children: {
      type: 'array',
      maxItems: 12,
      description: '子 widget 列表（0–12）：每项为 WidgetUnit 形状 { id, source: { type: "preset", kind, props } }，仅一层叶子组件',
      items: { type: 'object' },
    },
  },
} as const
