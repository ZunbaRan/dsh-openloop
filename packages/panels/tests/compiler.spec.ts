/**
 * custom code 编译器产物包装单测（§8.3）。
 * 覆盖：经典 JSX 函数组件包装、sucrase helper（可选链）在 IIFE 内合法、
 * 契约命名不符降级、sha256 缓存幂等。
 */
import { describe, expect, it } from 'vitest'
import { compileCustomCode } from '../src/compiler.ts'

/** 在 node 环境求值编译产物：模拟 window + 全局 React（产物引用全局 React.createElement） */
function evaluateWidget(js: string): unknown {
  const g: Record<string, unknown> = {}
  const React = { createElement: (type: unknown, props: unknown) => ({ type, props }) }
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function('window', 'React', `${js}; return window.__OPENLOOP_WIDGET__`)
  return fn(g, React)
}

describe('compileCustomCode（§8.3 产物包装）', () => {
  it('经典 JSX 组件包装为 window.__OPENLOOP_WIDGET__ 函数组件', () => {
    const { js } = compileCustomCode('function Widget({ props, data, tokens }) { return <div>{data?.title}</div> }')
    expect(js.startsWith('window.__OPENLOOP_WIDGET__ = (function(){')).toBe(true)
    const Widget = evaluateWidget(js)
    expect(typeof Widget).toBe('function')
    const el = (Widget as (props: { props: unknown; data: { title: string }; tokens: Record<string, string> }) => { type: unknown })({
      props: {},
      data: { title: 'x' },
      tokens: {},
    })
    expect(el.type).toBe('div')
  })

  it('sucrase 注入的可选链 helper（函数声明序列）在 IIFE 内合法', () => {
    // 可选链 ?. 触发 sucrase 注入 _optionalChain 等 helper（函数声明），必须放进函数体而非括号
    const { js } = compileCustomCode('function Widget({ data }) { return <span>{data?.a?.b}</span> }')
    expect(() => evaluateWidget(js)).not.toThrow()
  })

  it('契约命名不符（无 Widget 函数）→ 产物为 undefined → runtime 容错路径', () => {
    const { js } = compileCustomCode('function NotWidget() { return <p>hi</p> }')
    expect(evaluateWidget(js)).toBeUndefined()
  })

  it('按 sha256(code) 缓存；已包装产物幂等复用（缓存键不变）', () => {
    const code = 'function Widget() { return <b>hi</b> }'
    const first = compileCustomCode(code)
    const second = compileCustomCode(code)
    expect(second.hash).toBe(first.hash)
    expect(second.js).toBe(first.js)
    // 幂等：已包装产物直接复用，不二次包装
    expect(compileCustomCode(first.js).js).toBe(first.js)
  })
})
