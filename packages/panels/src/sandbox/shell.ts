/**
 * 沙箱 srcDoc 合成（DSH_PANELS_DESIGN §8.1/§8.4，参照 artifact/src/shell.ts）。
 *
 * 安全约束（§15）：
 * - S5：**禁止 regex 注入**——永远用合成文档包装（消化 mcp-apps F2 教训），
 *   App 内容只进 `<body>`，真实 `<head>` 由本函数独占并带标记属性，
 *   App HTML 里的 `<!-- <head> -->` 之类伪 head 无法骗过解析器。
 * - S2：CSP 恒为 `connect-src 'none'`，widget 代码不直连网络（§5.2 数据流铁律）。
 * - S6：runtime URL 仅入 `script-src` 来源白名单，iframe 保持 opaque origin，
 *   从宿主源加载 runtime ≠ 获得宿主身份（消化 mcp-apps F1 教训）。
 *
 * 纯函数，无 DOM/node 依赖，便于测试。
 *
 * 与 runtime-entry.tsx 的分工：
 * - 高度上报（openloop:size-change）由本文件的内联 heightReporter 独占（runtime 资产
 *   加载失败也能上报）；runtime-entry 只上报 ready/error 并处理 token-sync/data（二选一）。
 * - widget 级 token 经 `window.__OPENLOOP_BRIDGE_TOKEN__` 注入文档，runtime-entry 据此校验
 *   宿主 → iframe 消息（§8.4 方向 B）；heightReporter 的内联 token 用于 iframe → 宿主 方向（S7）。
 */

/** §8.1 CSP：default-src 'none'；script-src 只放行本地 runtime origin + 内联产物 */
export function sandboxContentSecurityPolicy(runtimeOrigin: string): string {
  return [
    "default-src 'none'",
    `script-src ${runtimeOrigin} 'unsafe-inline'`,
    "style-src 'unsafe-inline'",
    "connect-src 'none'",
    'img-src data:',
    "font-src 'none'",
  ].join('; ')
}

/** iframe → 宿主 桥消息 type（§8.4） */
export const SANDBOX_SIZE_CHANGE_MESSAGE = 'openloop:size-change'

export interface SandboxDocumentOptions {
  /** runtime 资产完整 URL（本地源）；其 origin 决定 CSP script-src 白名单 */
  runtimeUrl: string
  /** sucrase 编译后的 custom code JS（内联注入，经典 JSX 模式依赖全局 React） */
  compiledJs: string
  /** App 内容（body 内，可选；custom 组件用 #openloop-root 由 runtime 挂载） */
  appHtml?: string
  /** 预设 id（§5.1 / §6） */
  preset: string
  appearance: 'light' | 'dark'
  /** widget 级随机 token（每渲染生成，§8.4）；宿主侧据此校验桥消息 */
  token: string
  widgetId: string
  /** 预设系 50 个 token（随预设切换） */
  presetTokens: Record<string, string>
  /** 全局系 12 个 token（不随预设变） */
  globalTokens: Record<string, string>
}

/** 基础文档样式：token 全部来自 var(--openloop-*)，注入时缺省则用 fallback */
const BASE_CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body { background: var(--openloop-background, transparent); color: var(--openloop-foreground, inherit); font: 400 14px/1.55 var(--openloop-font-sans, system-ui, -apple-system, sans-serif); }
`

/** 合成文档 + CSP + token + runtime/编译产物/高度上报脚本；App 内容只进 body */
export function buildSandboxDocument(options: SandboxDocumentOptions): string {
  // runtimeUrl 是我们自控的本地源，new URL 天然净化出 origin（含端口），杜绝任意字符串进 CSP
  const runtimeOrigin = new URL(options.runtimeUrl).origin
  const variables = [
    ...Object.entries(options.globalTokens),
    ...Object.entries(options.presetTokens),
  ]
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([name, value]) => ({ name, value: sanitizeCssValue(value) }))
    .filter(entry => entry.value.length > 0 && isValidCssVariableName(entry.name))
    .map(entry => `--openloop-${entry.name}:${entry.value};`)
    .join('')
  // 编译产物是 JS，`</script`（大小写不敏感）会提前结束内联块 → 一律转义为 <\/script
  const safeCompiledJs = options.compiledJs.replace(/<\/(script)/giu, '<\\/$1')
  const head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="referrer" content="no-referrer">',
    `<meta http-equiv="Content-Security-Policy" content="${sandboxContentSecurityPolicy(runtimeOrigin)}">`,
    `<meta name="openloop-sandbox" content="preset=${escapeAttr(options.preset)},appearance=${options.appearance}">`,
    `<title>${escapeHtml(options.widgetId)}</title>`,
    `<style>:root{${variables}color-scheme:${options.appearance};}${BASE_CSS}</style>`,
    // 运行时校验宿主消息所需的 widget 级 token（§8.4 方向 B）；token 是普通随机串，JSON.stringify 足够安全
    `<script>window.__OPENLOOP_BRIDGE_TOKEN__=${JSON.stringify(options.token)};</script>`,
  ].join('')
  return [
    '<!doctype html>',
    '<html>',
    `<head data-openloop-sandbox="1">${head}</head>`,
    '<body>',
    '<div id="openloop-root"></div>',
    options.appHtml ?? '',
    `<script src="${escapeAttr(options.runtimeUrl)}"></script>`,
    `<script>${safeCompiledJs}</script>`,
    `<script>${heightReporter(options.token)}</script>`,
    '</body>',
    '</html>',
  ].join('')
}

/** 内联高度上报（参照 artifact heightReporter 模式）：ResizeObserver + load + 首帧，带 token */
export function heightReporter(token: string): string {
  const jsonToken = JSON.stringify(token)
  return [
    '(function(){',
    'var post=function(){parent.postMessage({type:' + JSON.stringify(SANDBOX_SIZE_CHANGE_MESSAGE) + ',token:' + jsonToken + ',height:document.documentElement.scrollHeight},\'*\')};',
    'if(typeof ResizeObserver!=="undefined"){new ResizeObserver(post).observe(document.documentElement);}',
    "addEventListener('load',post);post();",
    '})();',
  ].join('')
}

/** token 值净化：含 ;{}<> 的整条丢弃（防 CSS 注入）；trim 后取余 */
export function sanitizeCssValue(value: string): string {
  return /[;{}<>]/u.test(value) ? '' : value.trim()
}

/** CSS 变量名白名单：仅小写字母/数字/连字符（与 :root 注入同规则） */
export function isValidCssVariableName(name: string): boolean {
  return /^[a-zA-Z0-9-]+$/u.test(name)
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}
