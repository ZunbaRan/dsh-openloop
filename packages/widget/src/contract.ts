export const SHOW_WIDGET_TOOL = 'show_widget'
export const HEIGHT_MESSAGE = 'openloop-widget:height'
export const STREAM_MESSAGE = 'openloop-widget:stream'

export interface WidgetMeta {
  kind: 'openloop.widget'
  version: 1
  title: string
  fragment: string
}

const SKELETON = /<!doctype\b|<\s*(?:html|head|body)\b/iu
const REMOTE_URL = /(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\//iu

export function validateWidget(fragment: string, maxBytes: number): number {
  if (fragment.trim().length === 0) throw new Error('show_widget fragment must not be empty')
  const size = new TextEncoder().encode(fragment).length
  if (size > maxBytes) throw new Error(`show_widget fragment is ${size} bytes, over the ${maxBytes}-byte limit`)
  if (SKELETON.test(fragment)) throw new Error('show_widget accepts an HTML fragment, not a document skeleton')
  if (REMOTE_URL.test(fragment)) throw new Error('show_widget does not allow remote src or href assets; keep the widget self-contained')
  return size
}

export function widgetMetaFrom(value: unknown): WidgetMeta | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  if (record.kind !== 'openloop.widget' || record.version !== 1) return undefined
  if (typeof record.title !== 'string' || typeof record.fragment !== 'string') return undefined
  return { kind: 'openloop.widget', version: 1, title: record.title, fragment: record.fragment }
}

const ESCAPES: Record<string, string> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' }

export function extractStreamingFragment(argsRaw: string): string | undefined {
  const opener = /"fragment"\s*:\s*"/u.exec(argsRaw)
  if (!opener) return undefined
  let output = ''
  for (let index = opener.index + opener[0].length; index < argsRaw.length; index += 1) {
    const character = argsRaw[index]!
    if (character === '"') return output
    if (character !== '\\') {
      output += character
      continue
    }
    const escaped = argsRaw[index + 1]
    if (escaped === undefined) return output
    if (escaped === 'u') {
      const hex = argsRaw.slice(index + 2, index + 6)
      if (hex.length < 4 || !/^[0-9a-f]{4}$/iu.test(hex)) return output
      output += String.fromCharCode(Number.parseInt(hex, 16))
      index += 5
      continue
    }
    if (ESCAPES[escaped] === undefined) return output
    output += ESCAPES[escaped]
    index += 1
  }
  return output
}

export function previewFragment(fragment: string): string {
  const lastOpen = fragment.toLowerCase().lastIndexOf('<script')
  if (lastOpen === -1) return fragment
  const close = fragment.toLowerCase().indexOf('</script>', lastOpen)
  return close === -1 ? fragment.slice(0, lastOpen) : fragment
}
