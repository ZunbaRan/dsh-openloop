/**
 * avatar props JSON Schema。
 * name 必填 1–80；size sm/md/lg（默认 md）；tone 可选，缺省按 name 哈希从预设色圆中确定性取色。
 */
export const avatarSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 80,
      description: '用户/实体名，取首字符渲染为圆形头像',
    },
    size: {
      enum: ['sm', 'md', 'lg'],
      description: '头像尺寸：sm=24 / md=32 / lg=40',
    },
    tone: {
      enum: ['primary', 'info', 'success', 'warning', 'error'],
      description: '头像底色；省略时按 name 哈希稳定取色',
    },
  },
  required: ['name'],
} as const
