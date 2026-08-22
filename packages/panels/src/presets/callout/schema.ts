/**
 * callout props JSON Schema。
 * tone（info/success/warning/error）+ title + description；
 * 样式用对应 tone 的 background/border 件套（--openloop-{tone}-background/border）。
 */
export const calloutSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    tone: {
      enum: ['info', 'success', 'warning', 'error'],
      description: '提示语气，默认 info；error 渲染 role="alert"',
    },
    title: {
      type: 'string',
      maxLength: 80,
      description: '提示标题（加粗），≤80 字符，可省略',
    },
    description: {
      type: 'string',
      maxLength: 240,
      description: '提示正文，≤240 字符（必填）',
    },
  },
  required: ['description'],
} as const
