/**
 * plugin-registry props JSON Schema：title ≤80（无 autoRefresh——数据来自页面 boot 载荷，静态）。
 */
export const pluginRegistrySchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      maxLength: 80,
      description: '面板标题，≤80 字符，可省略（默认「插件清单」）',
    },
  },
} as const
