/**
 * accordion props JSON Schema。
 * items 1–20；展开状态为组件内本地 state（单开手风琴），defaultOpenIndex 可选。
 */
export const accordionSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 80,
      description: '可选的折叠区标题，≤80 字符',
    },
    defaultOpenIndex: {
      type: 'integer',
      minimum: 0,
      description: '默认展开第几项（0 起）；省略默认展开第一项',
    },
    items: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      description: '折叠项，1–20 个',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: {
            type: 'string',
            minLength: 1,
            maxLength: 80,
            description: '折叠项标题，1–80 字符',
          },
          content: {
            type: 'string',
            maxLength: 2000,
            description: '展开后的内容文本，≤2000 字符，保留换行',
          },
        },
        required: ['label'],
      },
    },
  },
  required: ['items'],
} as const
