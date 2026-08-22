import { ARTIFACT_HEIGHT_MESSAGE, type ArtifactRuntime } from './contract.ts'

export const ARTIFACT_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'media-src data: blob:',
  'worker-src blob:',
  "connect-src 'none'",
  "font-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

export interface ArtifactTheme {
  tokens?: Record<string, string>
  foreground?: string
  muted?: string
  surface?: string
  elevated?: string
  border?: string
  accent?: string
  scheme: 'light' | 'dark'
}

const CSS = `
:root {
  color-scheme: light dark;
  --background: var(--openloop-background, light-dark(#f7f8fa, #111318));
  --foreground: var(--openloop-foreground, light-dark(#17191d, #f2f4f7));
  --muted: var(--openloop-muted, light-dark(rgb(23 25 29 / 58%), rgb(242 244 247 / 58%)));
  --surface: var(--openloop-surface, light-dark(rgb(255 255 255 / 82%), rgb(255 255 255 / 6%)));
  --elevated: var(--openloop-elevated, light-dark(#fff, #1b1e25));
  --border: var(--openloop-border, light-dark(rgb(20 25 34 / 11%), rgb(255 255 255 / 12%)));
  --accent: var(--openloop-accent, light-dark(#4d76e8, #84a4ff));
  --radius: 18px;
}
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body { background: var(--background); color: var(--foreground); font: 400 14px/1.55 system-ui, -apple-system, sans-serif; padding: 18px; }
h1, h2, h3 { letter-spacing: -.025em; line-height: 1.25; }
h1 { font-size: clamp(24px, 4vw, 42px); }
h2 { font-size: clamp(18px, 2.4vw, 26px); }
.artifact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.artifact-panel { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); padding: 18px; box-shadow: 0 16px 40px rgb(0 0 0 / 7%); }
.artifact-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; margin-bottom: 14px; }
.artifact-muted { color: var(--muted); }
.artifact-value { font-size: 30px; font-weight: 680; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
button, input, select, textarea { font: inherit; }
button { border: 1px solid var(--border); border-radius: 999px; background: var(--elevated); color: var(--foreground); padding: 7px 13px; cursor: pointer; }
button:hover, button[aria-pressed="true"] { border-color: var(--accent); background: color-mix(in oklab, var(--accent) 12%, var(--elevated)); }
input, select, textarea { border: 1px solid var(--border); border-radius: 10px; background: var(--elevated); color: var(--foreground); padding: 7px 10px; }
input[type="range"] { accent-color: var(--accent); }
table { border-collapse: collapse; width: 100%; }
th, td { padding: 8px 10px; border-bottom: 1px solid var(--border); text-align: left; }
th { color: var(--muted); font-size: 12px; font-weight: 600; }
svg text { fill: var(--foreground); font: 12px system-ui, sans-serif; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; } }
`

export function buildArtifactDocument(html: string, title: string, runtime: ArtifactRuntime, token: string, theme: ArtifactTheme): string {
  const variables = [
    ['foreground', theme.foreground], ['muted', theme.muted], ['surface', theme.surface],
    ['elevated', theme.elevated], ['border', theme.border], ['accent', theme.accent],
    ...Object.entries(theme.tokens ?? {}),
  ].filter((entry): entry is [string, string] => typeof entry[1] === 'string' && sanitize(entry[1]).length > 0)
    .map(([name, value]) => `--openloop-${name}:${sanitize(value)};`).join('')
  const marker = runtime === 'static' ? '<meta name="openloop-artifact-runtime" content="static">' : '<meta name="openloop-artifact-runtime" content="scripts">'
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">${marker}<meta http-equiv="Content-Security-Policy" content="${ARTIFACT_CSP}"><title>${escapeHtml(title)}</title><style>${CSS}:root{${variables}color-scheme:${theme.scheme};}</style></head><body>${html}<script>${heightReporter(token)}</script></body></html>`
}

function heightReporter(token: string): string {
  return `(function(){var post=function(){parent.postMessage({type:${JSON.stringify(ARTIFACT_HEIGHT_MESSAGE)},token:${JSON.stringify(token)},height:document.documentElement.scrollHeight},'*')};new ResizeObserver(post).observe(document.documentElement);addEventListener('load',post);post()})();`
}
function sanitize(value: string): string { return /[;{}<>]/u.test(value) ? '' : value.trim() }
function escapeHtml(value: string): string { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') }
