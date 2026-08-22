/**
 * gauge props JSON Schema。
 * value 必填 0–100；chart-1 弧；可选 tone（success/warning/error/info）阈值色；
 * label ≤40 / detail ≤80 / unit ≤8 / title ≤80。
 */
export const gaugeSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 80,
      description: '可选的仪表标题，≤80 字符',
    },
    value: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      description: '仪表读数，0–100（必填）',
    },
    label: {
      type: 'string',
      maxLength: 40,
      description: '仪表下方主文案，≤40 字符',
    },
    detail: {
      type: 'string',
      maxLength: 80,
      description: '补充说明，≤80 字符',
    },
    unit: {
      type: 'string',
      maxLength: 8,
      description: '数值单位（如 %、°C），≤8 字符',
    },
    tone: {
      enum: ['success', 'warning', 'error', 'info'],
      description: '可选阈值色；缺省 chart-1',
    },
  },
  required: ['value'],
} as const
