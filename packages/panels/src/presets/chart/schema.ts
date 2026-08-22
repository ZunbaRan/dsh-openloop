/**
 * chart props JSON Schema（多 variant 单 kind）。
 * 约束：series ≤6；data 行数 1–100；xKey 及系列 label ≤40 字符。
 * - bar：分组柱，chart-1..N 着色，数值轴 0 基
 * - line：折线+点（area=true 时填充面积），chart-1..N
 * - donut：单/多系列（≤4 环），中心总数值标注
 * referenceLine 仅 bar/line 生效（number）；legend 显隐系列色块。
 */
export const chartSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 80,
      description: '可选的图表标题，≤80 字符',
    },
    variant: {
      enum: ['bar', 'line', 'donut'],
      description: '图表形态：bar 分组柱 / line 折线 / donut 环形',
    },
    data: {
      type: 'array',
      minItems: 1,
      maxItems: 100,
      description: '行数据，1–100 个对象；数值取自各 series.key',
      items: { type: 'object' },
    },
    xKey: {
      type: 'string',
      minLength: 1,
      maxLength: 40,
      description: '横轴/扇区标签取值字段，默认 label',
    },
    series: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      description: '系列定义，1–6 项（donut 限 ≤4）',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          key: {
            type: 'string',
            minLength: 1,
            maxLength: 40,
            description: 'data 行中数值字段名',
          },
          label: {
            type: 'string',
            maxLength: 40,
            description: '图例/系列文案，缺省用 key',
          },
        },
        required: ['key'],
      },
    },
    legend: {
      type: 'boolean',
      description: '显示系列图例，默认 true',
    },
    referenceLine: {
      type: 'number',
      description: '可选的参考线数值（仅 bar/line 生效）',
    },
    area: {
      type: 'boolean',
      description: 'line 是否填充折线下方面积（仅 line 生效）',
    },
  },
  required: ['variant', 'data', 'series'],
} as const
