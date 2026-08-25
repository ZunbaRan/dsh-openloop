/**
 * api-credentials props JSON Schema：title ≤80 / autoRefreshMs（共享规则）。
 */
export const apiCredentialsSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 80,
      description: '面板标题，≤80 字符，可省略（默认「API 凭据总览」）',
    },
    autoRefreshMs: {
      type: 'integer',
      minimum: 10000,
      maximum: 3600000,
      description: '自动刷新间隔（毫秒），≥10000，缺省不自动刷新',
    },
  },
} as const
