/**
 * comparison props JSON Schema。
 * 移植自 declarative document.ts ComparisonDocument：columns 2–4 + rows 1–12 +
 * 最多 1 个 recommended 列 + 每行 values 长度必须等于列数（validate 中强制）。
 * 列聚焦为组件内本地 state，默认聚焦推荐列（无推荐则第一列）。
 */
export const comparisonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 120,
      description: '对比标题，≤120 字符，可省略',
    },
    description: {
      type: 'string',
      maxLength: 360,
      description: '一句话说明对比对象，≤360 字符，可省略',
    },
    columns: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      description: '对比列，2–4 个，id 唯一；最多 1 列可标 recommended',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: {
            type: 'string',
            minLength: 1,
            maxLength: 40,
            description: '列 id，非空且全局唯一',
          },
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 60,
            description: '列标题（如方案名），1–60 字符',
          },
          subtitle: {
            type: 'string',
            maxLength: 80,
            description: '列副标题（如价格/定位），≤80 字符，可省略',
          },
          recommended: {
            type: 'boolean',
            description: '是否推荐列；全部列中最多 1 个 true',
          },
        },
        required: ['id', 'title'],
      },
    },
    rows: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      description: '对比行，1–12 个；每行 values 长度必须等于列数',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: {
            type: 'string',
            minLength: 1,
            maxLength: 60,
            description: '行维度名（如「价格」），1–60 字符',
          },
          values: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: { type: 'string', maxLength: 120 },
            description: '各列取值，长度必须与 columns 一致，单值 ≤120 字符',
          },
          emphasis: {
            enum: ['normal', 'strong'],
            description: '行强调，默认 normal；strong 加粗',
          },
        },
        required: ['label', 'values'],
      },
    },
  },
  required: ['columns', 'rows'],
} as const
