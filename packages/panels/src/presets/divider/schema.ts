/**
 * divider props JSON Schema。
 * label 可选 ≤80 字符；带 label 时渲染为左右横线 + 居中标签的「分隔标题」。
 */
export const dividerSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    label: {
      type: 'string',
      minLength: 1,
      maxLength: 80,
      description: '可选的居中分隔标签（≤80 字符）；省略渲染为纯横线',
    },
  },
} as const
