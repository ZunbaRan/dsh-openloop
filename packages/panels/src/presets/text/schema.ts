/**
 * text props JSON Schema（plain 文本）。
 * text 必填 1–5000 字符；size 映射全局字阶（xs→micro…xl→display）；tone 映射前景档。
 */
export const textSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    text: {
      type: 'string',
      minLength: 1,
      maxLength: 5000,
      description: '正文文本，1–5000 字符，保留换行',
    },
    size: {
      enum: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: '字阶：xs=micro / sm=meta / md=label（默认）/ lg=title / xl=display',
    },
    tone: {
      enum: ['default', 'muted', 'subtle', 'strong'],
      description: '前景档：default=foreground / muted=muted-foreground / subtle=foreground-subtle / strong=foreground-strong',
    },
    align: {
      enum: ['left', 'center', 'right'],
      description: '文本对齐，默认 left',
    },
  },
  required: ['text'],
} as const
