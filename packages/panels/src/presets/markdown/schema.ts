/**
 * markdown props JSON Schema。
 * content 必填 1–10000 字符；渲染用自研轻量解析（md.ts，无 marked 依赖）。
 */
export const markdownSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    content: {
      type: 'string',
      minLength: 1,
      maxLength: 10000,
      description: 'Markdown 文本，1–10000 字符。支持：标题 #–####、无序/有序列表、**加粗**、`行内代码`',
    },
  },
  required: ['content'],
} as const
