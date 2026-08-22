/**
 * tag props JSON Schema。
 * label 必填 1–80；tone 六档（默认 neutral）；tag 为描边型（背景透明 + tone 色边框）。
 */
export const tagSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    label: {
      type: 'string',
      minLength: 1,
      maxLength: 80,
      description: '标签文本，1–80 字符',
    },
    tone: {
      enum: ['neutral', 'primary', 'info', 'success', 'warning', 'error'],
      description: '标签语气，默认 neutral；描边型胶囊，边框+文字用 tone 色',
    },
  },
  required: ['label'],
} as const
