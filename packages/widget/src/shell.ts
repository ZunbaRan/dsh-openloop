import { HEIGHT_MESSAGE, STREAM_MESSAGE } from './contract.ts'

export const WIDGET_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  "connect-src 'none'",
  "font-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

const BASE_CSS = `
:root {
  color-scheme: light dark;
  --background: transparent;
  --foreground: var(--openloop-foreground, light-dark(#17191d, #f3f5f8));
  --muted: var(--openloop-muted, light-dark(rgb(23 25 29 / 58%), rgb(243 245 248 / 58%)));
  --surface: var(--openloop-surface, light-dark(rgb(255 255 255 / 72%), rgb(255 255 255 / 7%)));
  --border: var(--openloop-border, light-dark(rgb(25 30 38 / 10%), rgb(255 255 255 / 12%)));
  --accent: var(--openloop-accent, light-dark(#4d76e8, #85a4ff));
  --radius: 16px;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { background: transparent; color: var(--foreground); font: 400 14px/1.5 system-ui, -apple-system, sans-serif; padding: 2px; }
h1, h2, h3, p { margin-top: 0; }
h1 { font-size: 20px; letter-spacing: -.025em; }
h2 { font-size: 17px; letter-spacing: -.015em; }
.surface { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); padding: 16px; box-shadow: 0 14px 34px rgb(0 0 0 / 7%); backdrop-filter: blur(18px); }
.row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.muted { color: var(--muted); font-size: 12px; }
.value { font-size: 24px; font-weight: 650; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
button, input, select { font: inherit; }
button { border: 1px solid var(--border); border-radius: 999px; padding: 7px 12px; color: var(--foreground); background: transparent; cursor: pointer; }
button:hover, button[aria-pressed="true"] { border-color: var(--accent); background: color-mix(in oklab, var(--accent) 12%, transparent); }
input[type="range"] { accent-color: var(--accent); }
svg text { fill: var(--foreground); font: 12px system-ui, sans-serif; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; } }
`

export interface ThemeBridge {
  tokens?: Record<string, string>
  foreground?: string
  muted?: string
  surface?: string
  border?: string
  accent?: string
  scheme: 'light' | 'dark'
}

export function buildWidgetDocument(fragment: string, title: string, token: string, theme: ThemeBridge): string {
  return documentShell(title, token, theme, `${fragment}\n<script>${heightReporter(token)}</script>`)
}

export function buildStreamingDocument(token: string, theme: ThemeBridge): string {
  const content = `<div id="openloop-widget-stream"></div><script>
  (function () {
    var root = document.getElementById('openloop-widget-stream');
    addEventListener('message', function (event) {
      var data = event.data;
      if (!data || data.type !== ${JSON.stringify(STREAM_MESSAGE)} || data.token !== ${JSON.stringify(token)} || typeof data.fragment !== 'string') return;
      root.innerHTML = data.fragment;
      requestAnimationFrame(function () { parent.postMessage({ type: ${JSON.stringify(HEIGHT_MESSAGE)}, token: ${JSON.stringify(token)}, height: document.documentElement.scrollHeight }, '*'); });
    });
  })();
  ${heightReporter(token)}
  </script>`
  return documentShell('Widget preview', token, theme, content)
}

function documentShell(title: string, _token: string, theme: ThemeBridge, content: string): string {
  const values = [
    ['foreground', theme.foreground], ['muted', theme.muted], ['surface', theme.surface],
    ['border', theme.border], ['accent', theme.accent],
    ...Object.entries(theme.tokens ?? {}),
  ].filter((entry): entry is [string, string] => typeof entry[1] === 'string' && safeCss(entry[1]).length > 0)
    .map(([name, value]) => `--openloop-${name}:${safeCss(value)};`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${WIDGET_CSP}"><title>${escapeHtml(title)}</title><style>${BASE_CSS}:root{${values}color-scheme:${theme.scheme};}</style></head><body>${content}</body></html>`
}

function heightReporter(token: string): string {
  return `(function(){var post=function(){parent.postMessage({type:${JSON.stringify(HEIGHT_MESSAGE)},token:${JSON.stringify(token)},height:document.documentElement.scrollHeight},'*')};new ResizeObserver(post).observe(document.documentElement);addEventListener('load',post);post()})();`
}

function safeCss(value: string): string { return /[;{}<>]/u.test(value) ? '' : value.trim() }
function escapeHtml(value: string): string { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') }
