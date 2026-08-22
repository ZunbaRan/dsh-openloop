/**
 * heading props JSON Schema。
 * text 必填 1–200；level 1–4 映射全局字阶（1→type-display / 2→type-title / 3→type-label / 4→type-meta）。
 */
export const headingSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    text: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
      description: '标题文本，1–200 字符',
    },
    level: {
      type: 'integer',
      minimum: 1,
      maximum: 4,
      description: '标题级别 1–4，默认 1；1=display / 2=title / 3=label / 4=meta',
    },
    align: {
      enum: ['left', 'center', 'right'],
      description: '文本对齐，默认 left',
    },
  },
  required: ['text'],
} as const
