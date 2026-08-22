/**
 * progress props JSON Schema。
 * value 必填（≥0），max 默认 100（>0）；value 超出 max 时渲染截断为 100%。
 * tone 映射 primary/success/warning/error/info 基色。
 */
export const progressSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    label: {
      type: 'string',
      maxLength: 80,
      description: '进度条文案标签，≤80 字符',
    },
    value: {
      type: 'number',
      minimum: 0,
      description: '当前进度值（必填，≥0；与 max 同量纲，超 max 按满格渲染）',
    },
    max: {
      type: 'number',
      exclusiveMinimum: 0,
      description: '进度满值，默认 100',
    },
    tone: {
      enum: ['primary', 'success', 'warning', 'error', 'info'],
      description: '进度条基色，默认 primary',
    },
  },
  required: ['value'],
} as const
