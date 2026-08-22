/**
 * timeline props JSON Schema。
 * 移植自 declarative document.ts TimelineDocument：items 2–16，id 唯一，
 * status 限 past/current/future 三态（省略时渲染器按首项 current、其余 future 兜底）。
 */
export const timelineSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 120,
      description: '时间线标题，≤120 字符，可省略',
    },
    description: {
      type: 'string',
      maxLength: 360,
      description: '一句话说明该时间线，≤360 字符，可省略',
    },
    items: {
      type: 'array',
      minItems: 2,
      maxItems: 16,
      description: '时间线条目，2–16 个，按顺序渲染，id 必须唯一',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: {
            type: 'string',
            minLength: 1,
            maxLength: 40,
            description: '条目 id，非空且全局唯一',
          },
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 80,
            description: '条目标题，1–80 字符',
          },
          detail: {
            type: 'string',
            maxLength: 240,
            description: '条目补充说明，≤240 字符，可省略',
          },
          status: {
            enum: ['past', 'current', 'future'],
            description: '条目状态；省略时首项视为 current、其余 future',
          },
          time: {
            type: 'string',
            maxLength: 40,
            description: '左侧时间标注（如 09:30 / 周一），≤40 字符，可省略',
          },
        },
        required: ['id', 'title'],
      },
    },
  },
  required: ['items'],
} as const
