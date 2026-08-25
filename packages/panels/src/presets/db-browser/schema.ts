/**
 * db-browser props JSON Schema。
 * collection 初始表（可省略 = 第一个表）；perPage 5–100 默认 20；title ≤80。
 */
export const dbBrowserSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 80,
      description: '面板标题，≤80 字符，可省略（默认「数据库浏览」）',
    },
    collection: {
      type: 'string',
      maxLength: 40,
      description: '初始打开的集合名（apps / components / apis / boards / tiles / meta），可省略',
    },
    perPage: {
      type: 'integer',
      minimum: 5,
      maximum: 100,
      description: '每页行数 5–100，默认 20',
    },
  },
} as const
