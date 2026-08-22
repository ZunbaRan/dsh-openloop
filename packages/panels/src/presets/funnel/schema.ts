/**
 * funnel props JSON Schema。
 * stages 必填 2–8 段，每段 {label ≤40, value 有限数字, detail ≤40}；
 * 段宽按 value / 最大值比例；chart-seq 渐层着色。
 */
export const funnelSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 80,
      description: '可选的漏斗标题，≤80 字符',
    },
    stages: {
      type: 'array',
      minItems: 2,
      maxItems: 8,
      description: '漏斗阶段，2–8 段',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: {
            type: 'string',
            minLength: 1,
            maxLength: 40,
            description: '阶段名，≤40 字符',
          },
          value: {
            type: 'number',
            description: '阶段数值（参与段宽比例计算）',
          },
          detail: {
            type: 'string',
            maxLength: 40,
            description: '阶段附加说明，≤40 字符',
          },
        },
        required: ['label', 'value'],
      },
    },
  },
  required: ['stages'],
} as const
