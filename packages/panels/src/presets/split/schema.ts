/**
 * split props JSON Schema（两栏）。
 * children 必填 1–2 个子 widget：第 1 个渲染左栏、第 2 个渲染右栏（2 个时 50/50 等宽）。
 * gutter 栏间距 0–48（默认 12）。
 */
export const splitSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    gutter: {
      type: 'integer',
      minimum: 0,
      maximum: 48,
      description: '两栏间距（px），0–48，默认 12',
    },
    children: {
      type: 'array',
      minItems: 1,
      maxItems: 2,
      description: '两栏子 widget（1–2 个）：每项为 WidgetUnit 形状 { id, source: { type: "preset", kind, props } }',
      items: { type: 'object' },
    },
  },
  required: ['children'],
} as const
