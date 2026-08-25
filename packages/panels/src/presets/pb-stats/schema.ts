/**
 * pb-stats props JSON Schema。
 * title 可选（≤80）；autoRefreshMs 可选（≥10s，上限 1h，缺省不自动刷新）。
 */
export const pbStatsSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 80,
      description: '面板标题，≤80 字符，可省略（默认「后端运行状态」）',
    },
    autoRefreshMs: {
      type: 'integer',
      minimum: 10000,
      maximum: 3600000,
      description: '自动刷新间隔（毫秒），≥10000，缺省不自动刷新',
    },
  },
} as const
