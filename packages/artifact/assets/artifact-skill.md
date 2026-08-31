# OpenLoop HTML Artifact

Use `html_artifact` for a **completely free HTML page** — like a real web page: any layout, any CSS, canvas/SVG, local computation, interactive demos. Use `panel` for structured dashboards (preset widgets + data binding + refresh). Use `show_widget` for one small temporary card.

## Runtime choice (three tiers)

- `static`: default. HTML, CSS, SVG, tables; scripts rejected. Fully replayable.
- `scripts`: local computation freedom — canvas, simulation, animation (eval/wasm allowed). The iframe stays offline; fully replayable.
- `network`: **needs API data**. Same freedoms as `scripts`, plus the `openloop.fetch` bridge. Data is re-fetched on every replay.

## API access (network tier only)

```js
// window.openloop.fetch(url) → Promise<{ ok, status, json() }>
const res = await openloop.fetch('https://api.github.com/repos/deepseek-ai/deepseek-harness')
const data = await res.json()
```

- All network goes through the host proxy (server-side, SSRF-guarded, https-only, JSON-only, 10s/1MB). Native `fetch` inside the page is blocked by CSP — always use `openloop.fetch`.
- Loopback/local APIs require a deployment-level whitelist; otherwise rejected. Do not retry local URLs when they fail.
- Choose `network` only when the page needs live data; otherwise prefer `static`/`scripts` for replayability.

## Preset libraries (network/scripts pages)

Reference them by the host runtime routes (offline, version-pinned, immutable cache):

```html
<link rel="stylesheet" href="/openloop/runtime/pico.dd5fd5591afd81ee.css">
<script src="/openloop/runtime/chartjs.bce154080959c574.js"></script>
```

- `pico.*.css` — classless semantic styling base (tables/forms/cards look good for free).
- `chartjs.*.js` — Chart.js UMD; `new Chart(...)` after the script tag.
- `react18.*.js` — React 18.3.1 + ReactDOM UMD (globals `React` / `ReactDOM`). **Recommended React version.** No JSX build step: use `React.createElement` (or a tiny `h` helper). `ReactDOM.createRoot(document.getElementById('root')).render(...)`.
- External CDNs are blocked. If a library you need is not preset, inline it or ask the user to preset it.
- **React version rule (critical)**: one page = one React. Use the preset react18, OR inline your own react19 UMD — never both (two React instances = "Invalid hook call" and the page dies). React 18 libraries run on the preset; older libraries that need `ReactDOM.render`/`findDOMNode` will not work on 19.

## Preset examples (narrative + few-shot library)

Four ready-made pages live in this skill's `assets/` directory. Each
demonstrates one runtime capability against **our own local backend
APIs** — read them as few-shot examples of both artifact authoring and
the `/openloop/app/*` API surface:

| File | Runtime | Demonstrates |
|---|---|---|
| `system-map-example.html` | static | Interactive topology of the whole ecosystem; draggable nodes, dashed edges for unreachable servers; theme variables only |
| `agent-dashboard-example.html` | scripts | Live Agent activity pulse — polls `/openloop/app/agent-activity` every 10s and renders an animated feed + tool heat |
| `usage-report-example.html` | network | 24h API usage report — `openloop.fetch('/openloop/app/api-usage')` + the preset Chart.js library (stacked success/failure bars) |
| `backend-console-example.html` | scripts | Minimal ops console — status polling, POST `/openloop/app/invalidate`, GET `/openloop/app/events`; the "system operates itself" one-liner |

Pass a file's content as the `html` parameter with the matching
`runtime` tier and adjust labels freely.

## Theming (two modes)

- **Follow the OpenLoop theme (recommended when no brand colors)**: use the injected CSS variables (`--background`, `--foreground`, `--muted`, `--surface`, `--elevated`, `--border`, `--accent`, `--radius`) plus helper classes (`.artifact-grid`, `.artifact-panel`, `.artifact-toolbar`, `.artifact-muted`, `.artifact-value`). The page follows the user's preset and light/dark switch.
- **Fully custom**: ignore the variables and write your own colors/styles — the page stays unchanged when the theme switches. Preferred when the user specifies brand colors.

## Contract

- Pass body content only; no doctype/html/head/body tags.
- Self-contained: remote src/href resources are blocked; inline or use the preset routes above.
- Responsive grid/flex layouts; fullscreen is provided by the host.
- Use the user's language for visible labels; make the initial state useful.
- In scripts/network mode, honor reduced motion and ensure every control visibly changes the output.
- Never represent sample or inferred values as live enterprise data.
