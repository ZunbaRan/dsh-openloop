/**
 * sparkline props JSON Schema。
 * series 必填数值数组（2–120）；chart-1 着色；手绘 SVG polyline（零图表库）。
 * extremes 为可选的最小/最大值标注。
 */
export const sparklineSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    label: {
      type: 'string',
      maxLength: 80,
      description: '左侧标签文案，≤80 字符',
    },
    value: {
      type: ['number', 'string'],
      description: '可选的当前值展示（大数字），不参与折线计算',
    },
    series: {
      type: 'array',
      minItems: 2,
      maxItems: 120,
      description: '折线数据点，2–120 个有限数字',
      items: { type: 'number' },
    },
    extremes: {
      type: 'boolean',
      description: '为 true 时在 SVG 内标注最小/最大值（可省）',
    },
  },
  required: ['series'],
} as const
