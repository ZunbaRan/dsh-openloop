/**
 * data-table props JSON Schema。
 * 约束：columns 1–12（key 必填）；rows 0–200；density comfortable/compact；
 * 数字列（align: right 或 format 数值类）右对齐 + tabular-nums；行 tone 整行淡底。
 */
export const dataTableSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 80,
      description: '可选的表格标题，≤80 字符',
    },
    columns: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      description: '列定义，1–12 列',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          key: {
            type: 'string',
            minLength: 1,
            maxLength: 40,
            description: '行数据中取值字段名',
          },
          label: {
            type: 'string',
            maxLength: 80,
            description: '列头文案，缺省用 key',
          },
          align: {
            enum: ['left', 'right'],
            description: '列对齐；right 视为数字列（右对齐 + 等宽数字）',
          },
          format: {
            enum: ['currency-cny', 'number', 'percent', 'text'],
            description: '数字格式化；number/percent/currency-cny 视为数字列',
          },
        },
        required: ['key'],
      },
    },
    rows: {
      type: 'array',
      maxItems: 200,
      description: '行数据，每行一个对象；行内 tone 字段（success/error/warning）令整行淡底',
      items: { type: 'object' },
    },
    density: {
      enum: ['comfortable', 'compact'],
      description: '行密度，默认 comfortable',
    },
  },
  required: ['columns'],
} as const
