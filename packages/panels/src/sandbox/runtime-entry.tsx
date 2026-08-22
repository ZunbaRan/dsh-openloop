/// <reference lib="dom" />
/**
 * 沙箱内运行时代码（DSH_PANELS_DESIGN §8.2/§8.4；构建产物 assets/runtime.js）。
 *
 * 由 scripts/build-runtime.mjs 用 esbuild 打包 [react, react-dom, 本文件] 成
 * assets/runtime.js，经 §9 路由 serve 进 iframe。运行在 iframe 内、独立于宿主：
 * widget 的 classic JSX 编译产物（src/compiler.ts，引用全局 React）依赖本模块
 * 在 bundle 启动时注入的全局 React。
 *
 * 职责（与 shell.ts 分工）：
 * 1. 注入全局 React / ReactDOM（§8.3：经典 JSX 模式）；
 * 2. 读取 `window.__OPENLOOP_WIDGET__`（编译产物挂载），createRoot 挂到 #openloop-root；
 * 3. 监听宿主消息 openloop:token-sync / openloop:data，校验 event.source + type + token：
 *    - token-sync：把 global/tokens 应用到 documentElement.style + 重渲染（预设/明暗切换不重建 iframe）
 *    - data：更新数据重渲染（数据刷新不重建 iframe）
 * 4. 上报 openloop:ready / openloop:error；
 * 5. 容错：Widget 缺失/抛错 → 渲染错误文案并上报 openloop:error。
 *
 * 高度上报（openloop:size-change）由 shell.ts 内联 heightReporter 独占（二选一），
 * 本模块不重复挂 ResizeObserver——即使 runtime 资产加载失败，高度仍能上报。
 *
 * 可测部分（消息校验 / token 合并 / 样式对）抽成纯函数导出，vitest 直接 import 本文件。
 */
import { createRoot, type Root } from 'react-dom/client'
import * as React from 'react'
import { BRIDGE_MESSAGE, type DataMessagePayload, type TokenSyncPayload } from '../client/bridge.ts'
import { isValidCssVariableName, sanitizeCssValue } from './shell.ts'

declare global {
  interface Window {
    /** 编译产物挂载点：`window.__OPENLOOP_WIDGET__ = function Widget({ props, data, tokens }) {...}` */
    __OPENLOOP_WIDGET__?: unknown
    /** shell.ts 注入的 widget 级 token（§8.4；runtime 据此校验宿主消息） */
    __OPENLOOP_BRIDGE_TOKEN__?: unknown
    /** §8.3 经典 JSX 产物依赖的全局 React / ReactDOM */
    React?: unknown
    ReactDOM?: unknown
  }
}

// ---- 纯函数（供单测） ----

/** 宿主 → iframe 可信消息 type 白名单（§8.4 方向 B：token-sync / data） */
const HOST_TO_IFRAME_TYPES: readonly string[] = [BRIDGE_MESSAGE.tokenSync, BRIDGE_MESSAGE.data]

/**
 * 校验宿主消息：① data 为对象且 type 在方向 B 白名单；② token 为 string 且与期望值一致。
 * expectedToken 为 null（文档未注入 token 的降级路径）时仅校验形状，由调用方决定是否接管 token。
 * 纯函数，不依赖 DOM。
 */
export function isTrustedHostMessage(data: unknown, expectedToken: string | null): boolean {
  if (typeof data !== 'object' || data === null) return false
  const record = data as Record<string, unknown>
  if (typeof record.type !== 'string' || !HOST_TO_IFRAME_TYPES.includes(record.type)) return false
  if (typeof record.token !== 'string') return false
  return expectedToken === null || record.token === expectedToken
}

/** 判断是否为合法形状的 token-sync 消息（token 接管用；纯函数） */
export function isTokenSyncMessage(data: unknown): data is TokenSyncPayload {
  if (typeof data !== 'object' || data === null) return false
  const record = data as Record<string, unknown>
  return record.type === BRIDGE_MESSAGE.tokenSync && typeof record.token === 'string'
}

/** §8.3 runtime 调用组件时传入的 props 形状（createRoot 挂载） */
export interface WidgetRuntimeProps {
  props: Record<string, unknown>
  data: unknown
  tokens: Record<string, string>
}

/** 可被 createRoot 挂载的组件函数（经典 JSX 产物经 compiler.ts 包装后落在全局上） */
export type WidgetComponent = (props: WidgetRuntimeProps) => React.ReactNode

/** 收窄 window.__OPENLOOP_WIDGET__ 为组件函数；非函数 → false（容错路径） */
export function isWidgetComponent(value: unknown): value is WidgetComponent {
  return typeof value === 'function'
}

/** 宿主 → iframe 可信消息的判别式形状：type 白名单在 isTrustedHostMessage 已验证 */
type HostMessage =
  | (TokenSyncPayload & { type: typeof BRIDGE_MESSAGE.tokenSync })
  | (DataMessagePayload & { type: typeof BRIDGE_MESSAGE.data })

/** 合并全局系 + 预设系 token 为 widget 收到的 tokens 快照（§8.3，纯函数） */
export function mergeTokenSnapshot(global: Record<string, string>, tokens: Record<string, string>): Record<string, string> {
  return { ...global, ...tokens }
}

/**
 * token-sync → documentElement.style 的 (属性, 值) 对：`--openloop-<name>` + `color-scheme`。
 * 与 shell.ts buildSandboxDocument 的 :root 注入同一套净化规则（防 CSS 注入，§15 S2 纵深防御）。
 * 纯函数。
 */
export function tokenStyleEntries(
  global: Record<string, string>,
  tokens: Record<string, string>,
  appearance: 'light' | 'dark',
): Array<[string, string]> {
  const entries: Array<[string, string]> = []
  for (const [name, value] of Object.entries(mergeTokenSnapshot(global, tokens))) {
    if (!isValidCssVariableName(name)) continue
    const safe = sanitizeCssValue(value)
    if (safe.length === 0) continue
    entries.push([`--openloop-${name}`, safe])
  }
  entries.push(['color-scheme', appearance])
  return entries
}

// ---- 运行时启动（构建进 assets/runtime.js 后运行在 iframe 内） ----

function startRuntime(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const g = window as Window

  // §8.3：classic JSX 编译产物调用全局 React.createElement；ReactDOM 一并暴露（设计契约，当前产物用不到）
  g.React = React
  g.ReactDOM = { createRoot }

  let expectedToken: string | null = typeof g.__OPENLOOP_BRIDGE_TOKEN__ === 'string' ? g.__OPENLOOP_BRIDGE_TOKEN__ : null
  let currentData: unknown
  let snapshot: TokenSyncPayload | null = null
  let root: Root | null = null

  const post = (message: Record<string, unknown>): void => {
    try {
      window.parent.postMessage(message, '*')
    } catch {
      // 宿主已卸载时静默（§8.5 生命周期）
    }
  }
  const reportReady = (): void => post({ type: BRIDGE_MESSAGE.ready, token: expectedToken ?? '' })
  const reportError = (message: string): void => post({ type: BRIDGE_MESSAGE.error, token: expectedToken ?? '', message })

  /** 应用 token 快照：更新期望 token + documentElement 变量热更新（§8.5 预设切换） */
  function applySnapshot(payload: TokenSyncPayload): void {
    expectedToken = payload.token
    snapshot = payload
    const style = document.documentElement.style
    for (const [name, value] of tokenStyleEntries(payload.global, payload.tokens, payload.appearance)) {
      style.setProperty(name, value)
    }
  }

  /** 容错渲染：Widget 缺失/抛错 → 错误文案 + 上报，不拖垮宿主 */
  function renderFailure(host: HTMLElement, message: string): void {
    if (root === null) root = createRoot(host)
    root.render(
      React.createElement(
        'div',
        { 'data-openloop-error': '', style: { padding: '12px 14px', fontSize: 12, lineHeight: 1.5, color: '#c0392b', border: '1px solid rgba(128,128,128,.35)', borderRadius: 8 } },
        message,
      ),
    )
  }

  function renderWidget(): void {
    const host = document.getElementById('openloop-root')
    const Widget = g.__OPENLOOP_WIDGET__
    if (!host) {
      reportError('sandbox runtime: missing #openloop-root')
      return
    }
    if (!isWidgetComponent(Widget)) {
      const message = 'sandbox widget error: window.__OPENLOOP_WIDGET__ is not a component function (custom code must define "function Widget({ props, data, tokens }) { ... }")'
      reportError(message)
      renderFailure(host, message)
      return
    }
    try {
      if (root === null) root = createRoot(host)
      const tokens = snapshot !== null ? mergeTokenSnapshot(snapshot.global, snapshot.tokens) : {}
      root.render(React.createElement(Widget, { props: {}, data: currentData, tokens }))
    } catch (error) {
      const message = `sandbox widget error: ${error instanceof Error ? error.message : String(error)}`
      reportError(message)
      renderFailure(host, message)
    }
  }

  function onMessage(event: MessageEvent): void {
    // §8.4 S7：仅接受直接宿主（iframe 的 parent）的消息；opaque origin 下无同源信任
    if (event.source !== window.parent) return
    const data = event.data as unknown
    if (!isTrustedHostMessage(data, expectedToken)) {
      // 文档未注入 token 的降级路径：首个合法 token-sync 携带的 token 成为期望值
      if (expectedToken === null && isTokenSyncMessage(data)) {
        expectedToken = data.token
      } else {
        return
      }
    }
    // isTrustedHostMessage 已把 type 收进方向 B 白名单（tokenSync | data），按判别式断言为 HostMessage
    const payload = data as HostMessage
    if (payload.type === BRIDGE_MESSAGE.tokenSync) {
      applySnapshot(payload)
      renderWidget()
    } else {
      currentData = payload.data
      renderWidget()
    }
  }
  addEventListener('message', onMessage)

  // 编译产物在 runtime 脚本之后的内联 <script> 里设置 __OPENLOOP_WIDGET__，故挂载延迟到 DOM 就绪
  const mount = (): void => {
    reportReady()
    renderWidget()
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount)
  } else {
    mount()
  }
}

startRuntime()
