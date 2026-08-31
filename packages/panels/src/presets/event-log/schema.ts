/**
 * event-log props JSON Schema：title ≤80 / autoRefreshMs（共享规则） / limit
 */
export const eventLogSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 80,
      description: '面板标题，≤80 字符，可省略（默认「系统事件流」）',
    },
    autoRefreshMs: {
      type: 'integer',
      minimum: 10000,
      maximum: 3600000,
      description: '自动刷新间隔（毫秒），≥10000，缺省不自动刷新',
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 200,
      description: '最多显示的事件条数，1-200，缺省 50',
    },
  },
} as const
