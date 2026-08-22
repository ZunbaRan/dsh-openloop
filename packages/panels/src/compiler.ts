/**
 * custom code 服务端编译器（DSH_PANELS_DESIGN §8.3，服务端模块）。
 *
 * - sucrase `transforms: ['jsx']` + `jsxRuntime: 'classic'`：编译产物调用全局
 *   `React.createElement`，React 由沙箱 runtime 资产注入（§8.2）。
 * - 按 sha256(code) 内存缓存编译产物（§4「自定义编译器 按 codeHash 缓存」）。
 * - 失败抛带行号信息的 Error，消息面向 Agent 可自修正。
 *
 * 注意：禁词扫描（§5.4 / S8）在 validation.ts 完成，本模块只负责编译；
 * 依赖链为 validation → compiler，禁词命中不会走到这里。
 *
 * §8.3 契约：编译产物经 runtime-entry 读取，故 sucrase 产物外包一层
 * `window.__OPENLOOP_WIDGET__ = (function(){ <编译产物> return Widget })()`。
 * 用 IIFE 而非 `(产物)` 括号包装：sucrase 会在产物前注入可选链等 helper（函数声明），
 * 括号内出现多个连续函数声明是语法错误；放进函数体后声明序列合法，末尾返回契约命名的
 * `Widget` 组件函数（无 Widget 时返回 undefined → runtime-entry 走容错路径）。
 * 幂等：已包装的产物直接复用（面板持久化重放 §11 时 code 已是编译产物，避免二次包装）。
 */
import { createHash } from 'node:crypto'
import { transform } from 'sucrase'
import type { PanelDefinition } from './contract.ts'

/** 编译产物包装前缀：runtime-entry 读取 window.__OPENLOOP_WIDGET__（§8.3） */
const WIDGET_WRAPPER_START = 'window.__OPENLOOP_WIDGET__ = (function(){'
/** IIFE 收尾：返回契约命名的 Widget 函数组件（§8.3），无则 undefined → runtime 容错 */
const WIDGET_WRAPPER_END = '\nreturn typeof Widget === "function" ? Widget : undefined;\n})()'

export interface CompiledCustomCode {
  /** 编译后的 ES2020 JS（经典 JSX 模式 + 外层 window.__OPENLOOP_WIDGET__ 包装） */
  js: string
  /** sha256(code) hex（编译产物 URL / 缓存键） */
  hash: string
}

/** 编译产物内存缓存：codeHash → js（编译层体积策略 D10 的代码侧） */
const cache = new Map<string, string>()

/** 编译 custom code（一个 JSX 函数组件源码）→ { js, hash }；失败抛带行号错误 */
export function compileCustomCode(code: string): CompiledCustomCode {
  const hash = createHash('sha256').update(code, 'utf8').digest('hex')
  const cached = cache.get(hash)
  if (cached !== undefined) return { js: cached, hash }
  let js: string
  if (code.trimStart().startsWith(WIDGET_WRAPPER_START)) {
    // 幂等：code 已是包装后的编译产物（§11 持久化重放），sucrase 无 JSX 可转，直接复用
    js = code
  } else {
    try {
      const result = transform(code, {
        transforms: ['jsx'],
        jsxRuntime: 'classic',
        production: true,
      })
      js = `${WIDGET_WRAPPER_START}${result.code}${WIDGET_WRAPPER_END}`
    } catch (error) {
      throw new Error(`custom code compilation failed: ${describeCompileError(error)}`)
    }
  }
  cache.set(hash, js)
  return { js, hash }
}

/**
 * 编译 PanelDefinition 中所有 custom widget 的 code（§8.3 服务端编译）。
 * 返回新面板对象，不改输入；编译失败抛错（带行号，Agent 可自修正）。
 */
export function compilePanelCustomCode(panel: PanelDefinition): PanelDefinition {
  // 总闸：编译先于校验，widgets 非数组直接原样返回（校验层会报「must contain 1-24 widgets」）
  if (!Array.isArray(panel.widgets)) return panel
  let changed = false
  const widgets = panel.widgets.map(widget => {
    // 防御：编译先于校验执行（包装层顺序），畸形 widget（非对象/缺 source）原样放过，
    // 交由 validatePanel 给出面向 Agent 的可自修正错误，而非在此裸崩 TypeError
    if (typeof widget !== 'object' || widget === null) return widget
    const source = (widget as { source?: unknown }).source
    if (typeof source !== 'object' || source === null) return widget
    if ((source as { type?: unknown }).type !== 'custom') return widget
    const compiled = compileCustomCode((source as { code: string }).code)
    if (compiled.js !== (source as { code: string }).code) changed = true
    return { ...widget, source: { ...(source as object), code: compiled.js } as typeof widget.source }
  })
  return changed ? { ...panel, widgets } : panel
}

/** 从 sucrase 错误提取 (line:col)，取不到就带上原始 message（都含可定位信息） */
function describeCompileError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const match = message.match(/\((\d+):(\d+)\)/u)
  return match ? `line ${match[1]}, column ${match[2]}` : message
}
