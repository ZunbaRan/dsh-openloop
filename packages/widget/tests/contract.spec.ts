import { describe, expect, it } from 'vitest'
import { extractStreamingFragment, previewFragment, validateWidget, widgetMetaFrom } from '../src/contract.ts'

describe('widget contract', () => {
  it('accepts a self-contained fragment and replay meta', () => {
    const fragment = '<div class="surface">Hello</div>'
    expect(validateWidget(fragment, 1000)).toBe(fragment.length)
    expect(widgetMetaFrom({ kind: 'openloop.widget', version: 1, title: 'Hello', fragment })?.fragment).toBe(fragment)
  })
  it('rejects document skeletons and remote assets', () => {
    expect(() => validateWidget('<html><body>x</body></html>', 1000)).toThrow(/fragment/)
    expect(() => validateWidget('<img src="https://example.com/x.png">', 1000)).toThrow(/remote/)
  })
  it('extracts an incomplete streamed JSON string', () => {
    expect(extractStreamingFragment('{"title":"x","fragment":"<div>你\\n好')).toBe('<div>你\n好')
  })
  it('drops a trailing incomplete script from preview', () => {
    expect(previewFragment('<div>x</div><script>const x =')).toBe('<div>x</div>')
  })
})
