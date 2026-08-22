/**
 * heatmap props JSON Schema。
 * matrix 必填 rows×cols 数值矩阵（≤10×10，各行等长，值须有限数字）；
 * rowLabels / colLabels 可选，长度分别与行列数一致（≤40 字符）。
 * 值域映射 chart-seq-1..5 深浅。
 */
export const heatmapSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 80,
      description: '可选的图表标题，≤80 字符',
    },
    matrix: {
      type: 'array',
      minItems: 1,
      maxItems: 10,
      description: '数值矩阵，≤10 行；每行 ≤10 列且各行等长',
      items: {
        type: 'array',
        minItems: 1,
        maxItems: 10,
        description: '一行数据，1–10 个有限数字',
        items: { type: 'number' },
      },
    },
    rowLabels: {
      type: 'array',
      minItems: 1,
      maxItems: 10,
      description: '可选的行标签，长度须与 matrix 行数一致',
      items: { type: 'string', maxLength: 40 },
    },
    colLabels: {
      type: 'array',
      minItems: 1,
      maxItems: 10,
      description: '可选的列标签，长度须与 matrix 列数一致',
      items: { type: 'string', maxLength: 40 },
    },
  },
  required: ['matrix'],
} as const
