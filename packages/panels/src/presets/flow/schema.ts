/**
 * flow props JSON Schema。
 * 移植自 declarative document.ts FlowDocument：nodes 2–12 + edges 1–20 +
 * 禁自环 + 边必须引用已知节点（后两条在 validate 中强制）。
 * tone 枚举对齐 panels token 三件套（declarative 的 danger 归一为 error）。
 */
export const flowSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 120,
      description: '流程标题，≤120 字符，可省略',
    },
    description: {
      type: 'string',
      maxLength: 360,
      description: '一句话说明该流程，≤360 字符，可省略',
    },
    nodes: {
      type: 'array',
      minItems: 2,
      maxItems: 12,
      description: '流程节点，2–12 个，按顺序自上而下渲染，id 必须唯一',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: {
            type: 'string',
            minLength: 1,
            maxLength: 40,
            description: '节点 id，非空且全局唯一，edges 通过它引用',
          },
          label: {
            type: 'string',
            minLength: 1,
            maxLength: 80,
            description: '节点标题，1–80 字符',
          },
          detail: {
            type: 'string',
            maxLength: 240,
            description: '节点补充说明，≤240 字符，可省略',
          },
          tone: {
            enum: ['neutral', 'info', 'success', 'warning', 'error', 'danger'],
            description: '节点语气色，默认首节点 info、其余 neutral（danger 为 declarative 兼容别名，等同 error）',
          },
        },
        required: ['id', 'label'],
      },
    },
    edges: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      description: '有向边，1–20 条；from/to 必须引用已知节点 id，禁止自环',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          from: {
            type: 'string',
            minLength: 1,
            description: '起始节点 id',
          },
          to: {
            type: 'string',
            minLength: 1,
            description: '目标节点 id，不得与 from 相同',
          },
          label: {
            type: 'string',
            maxLength: 60,
            description: '边上文字（如条件），≤60 字符，可省略',
          },
        },
        required: ['from', 'to'],
      },
    },
  },
  required: ['nodes', 'edges'],
} as const
