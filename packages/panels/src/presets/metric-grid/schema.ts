/**
 * metric-grid props JSON Schema（§6.4 示例实现）。
 * 约束：items 1–6；label ≤ 40；emphasis hero 至多 1 个（validate.ts 强制）；
 * deltaTone 映射 --openloop-delta-*（不复用 success/error）；format 含 text 兜底。
 */
export const metricGridSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 80,
      description: '可选的网格标题，≤80 字符',
    },
    items: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      description: '指标项，1–6 个',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: {
            type: 'string',
            maxLength: 40,
            description: '指标 id（kebab-case 建议，用于稳定 key）',
          },
          label: {
            type: 'string',
            minLength: 1,
            maxLength: 40,
            description: '指标标签，≤40 字符',
          },
          value: {
            type: ['number', 'string'],
            description: '指标值；format 为 number/percent/currency-cny（currency 为其别名）时数字生效，否则按 text 展示',
          },
          format: {
            enum: ['currency-cny', 'currency', 'number', 'percent', 'text'],
            description: '值格式化；percent 为小数（0.124 → 12.4%）；未知/省略按 text 兜底',
          },
          delta: {
            type: 'string',
            maxLength: 24,
            description: '环比等涨跌文案（如 +12.4%），与 deltaTone 搭配',
          },
          deltaTone: {
            enum: ['up', 'down', 'flat'],
            description: '涨跌方向，映射 --openloop-delta-up/down/flat，不复用 success/error',
          },
          emphasis: {
            enum: ['hero', 'standard'],
            description: 'hero 为整组视觉焦点（大数字+阴影），整组至多 1 个',
          },
        },
      },
    },
    columns: {
      enum: [1, 2, 3, 4],
      description: '可选的显式列数（1–4）；省略时按容器宽度自适应',
    },
  },
  required: ['items'],
} as const
