/**
 * badge props JSON Schema。
 * label 必填 1–80；tone 六档（neutral/primary/info/success/warning/error，默认 neutral）。
 */
export const badgeSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    label: {
      type: 'string',
      minLength: 1,
      maxLength: 80,
      description: '徽标文本，1–80 字符',
    },
    tone: {
      enum: ['neutral', 'primary', 'info', 'success', 'warning', 'error'],
      description: '徽标语气，默认 neutral；primary 用主色填充，其余用 tone 背景+前景件套',
    },
  },
  required: ['label'],
} as const
