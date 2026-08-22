import { describe, expect, it } from 'vitest'
import { buildSandboxDocument, heightReporter, sandboxContentSecurityPolicy, type SandboxDocumentOptions } from '../src/sandbox/shell.ts'
import {
  BRIDGE_MESSAGE,
  isTrustedBridgeMessage,
  sendData,
  sendTokenSync,
  TRUSTED_BRIDGE_ORIGIN,
  type BridgeFrameWindow,
} from '../src/client/bridge.ts'

const RUNTIME_URL = 'http://127.0.0.1:3080/openloop/runtime/runtime.a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3.js'

const baseOptions: SandboxDocumentOptions = {
  runtimeUrl: RUNTIME_URL,
  compiledJs: 'function Widget(){return React.createElement("div",null)}',
  preset: 'default',
  appearance: 'light',
  token: 'tok-123',
  widgetId: 'metric-card',
  presetTokens: { background: '#fff', foreground: '#111' },
  globalTokens: { 'font-sans': 'system-ui' },
}

describe('buildSandboxDocument（§8.1 / §15 S2/S5/S6）', () => {
  it('CSP 含 connect-src \'none\'（S2：widget 不直连网络）', () => {
    const doc = buildSandboxDocument(baseOptions)
    expect(doc).toContain("connect-src 'none'")
    expect(doc).toContain("default-src 'none'")
    expect(doc).toContain("font-src 'none'")
  })

  it('生成的文档不含 allow-same-origin（S1：iframe 恒 opaque origin 的文档侧约束）', () => {
    const doc = buildSandboxDocument(baseOptions)
    expect(doc).not.toContain('allow-same-origin')
  })

  it('head 永远在 App 内容前，注释伪 head 不能骗过（S5：合成文档包装，禁 regex 注入）', () => {
    const appHtml = '<!-- <head> --><div id="app">hello</div>'
    const doc = buildSandboxDocument({ ...baseOptions, appHtml })
    // 真实 head 带标记属性且位于 body/App 内容之前
    const realHead = doc.indexOf('<head data-openloop-sandbox="1">')
    const fakeHead = doc.indexOf('<!-- <head> -->')
    expect(realHead).toBeGreaterThanOrEqual(0)
    expect(fakeHead).toBeGreaterThanOrEqual(0)
    expect(realHead).toBeLessThan(fakeHead)
    // 伪 head 在 body 内（App 内容区），无法影响合成文档的 head/body 结构
    expect(doc.indexOf('<body>')).toBeLessThan(fakeHead)
    expect(doc.indexOf('</head>')).toBeLessThan(doc.indexOf('<body>'))
  })

  it('CSP script-src 仅放行本地 runtime origin + unsafe-inline（S6）', () => {
    const doc = buildSandboxDocument(baseOptions)
    expect(doc).toContain("script-src http://127.0.0.1:3080 'unsafe-inline'")
    expect(doc).toContain(`<script src="${RUNTIME_URL}"></script>`)
  })

  it(':root 注入预设系 + 全局系 token 变量与 color-scheme', () => {
    const doc = buildSandboxDocument(baseOptions)
    expect(doc).toContain('--openloop-background:#fff')
    expect(doc).toContain('--openloop-foreground:#111')
    expect(doc).toContain('--openloop-font-sans:system-ui')
    expect(doc).toContain('color-scheme:light')
  })

  it('token 值含 ;{}<> 的变量被丢弃（防 CSS 注入）', () => {
    const doc = buildSandboxDocument({
      ...baseOptions,
      presetTokens: { safe: 'rgb(0 0 0 / 50%)', evil: 'red;}body{display:none' },
    })
    expect(doc).toContain('--openloop-safe:rgb(0 0 0 / 50%)')
    expect(doc).not.toContain('body{display:none')
  })

  it('内联编译产物含 </script> 时被转义（S5 纵深防御）', () => {
    const doc = buildSandboxDocument({ ...baseOptions, compiledJs: 'const s = "</script><script>evil()" ' })
    expect(doc).toContain('const s = "<\\/script><script>evil()"')
  })

  it('heightReporter 携带 widget 级 token（S7）', () => {
    const doc = buildSandboxDocument(baseOptions)
    expect(doc).toContain('token:"tok-123"')
    const reporter = heightReporter('tok-456')
    expect(reporter).toContain('openloop:size-change')
    expect(reporter).toContain('"tok-456"')
  })
})

describe('sandboxContentSecurityPolicy（§8.1）', () => {
  it('以 runtime origin 生成 script-src 白名单', () => {
    const csp = sandboxContentSecurityPolicy('http://127.0.0.1:3080')
    expect(csp).toContain("script-src http://127.0.0.1:3080 'unsafe-inline'")
  })
})

describe('isTrustedBridgeMessage（§8.4 / §15 S7）', () => {
  it('opaque origin + type 白名单 + token 匹配 → 可信', () => {
    expect(isTrustedBridgeMessage({ origin: TRUSTED_BRIDGE_ORIGIN, data: { type: 'openloop:ready', token: 't1' } }, 't1')).toBe(true)
    expect(isTrustedBridgeMessage({ origin: 'null', data: { type: 'openloop:size-change', token: 't1', height: 500 } }, 't1')).toBe(true)
    expect(isTrustedBridgeMessage({ origin: 'null', data: { type: 'openloop:error', token: 't1', message: 'boom' } }, 't1')).toBe(true)
  })

  it('非可信来源拒绝（source 校验）', () => {
    for (const origin of ['https://evil.example', 'https://localhost:8443', '', 'http://127.0.0.1:3080']) {
      expect(isTrustedBridgeMessage({ origin, data: { type: 'openloop:ready', token: 't1' } }, 't1')).toBe(false)
    }
  })

  it('token 不匹配拒绝（token 校验）', () => {
    expect(isTrustedBridgeMessage({ origin: 'null', data: { type: 'openloop:ready', token: 't1' } }, 't2')).toBe(false)
    expect(isTrustedBridgeMessage({ origin: 'null', data: { type: 'openloop:size-change', token: undefined, height: 500 } }, 't1')).toBe(false)
  })

  it('type 不在 iframe→宿主 白名单内拒绝', () => {
    expect(isTrustedBridgeMessage({ origin: 'null', data: { type: BRIDGE_MESSAGE.tokenSync, token: 't1' } }, 't1')).toBe(false)
    expect(isTrustedBridgeMessage({ origin: 'null', data: { type: 'openloop:data', token: 't1' } }, 't1')).toBe(false)
    expect(isTrustedBridgeMessage({ origin: 'null', data: { type: 'anything-else', token: 't1' } }, 't1')).toBe(false)
  })

  it('非对象 data 拒绝（fail-closed）', () => {
    expect(isTrustedBridgeMessage({ origin: 'null', data: 'openloop:ready' }, 't1')).toBe(false)
    expect(isTrustedBridgeMessage({ origin: 'null', data: null }, 't1')).toBe(false)
    expect(isTrustedBridgeMessage({ origin: 'null', data: undefined }, 't1')).toBe(false)
  })

  it('自定义可信来源列表生效', () => {
    expect(isTrustedBridgeMessage({ origin: 'http://127.0.0.1:3080', data: { type: 'openloop:ready', token: 't1' } }, 't1', ['http://127.0.0.1:3080'])).toBe(true)
  })
})

describe('sendTokenSync / sendData（§8.4 宿主 → iframe 消息构造）', () => {
  const captured: unknown[] = []
  const frame: BridgeFrameWindow = { postMessage(message) { captured.push(message) } }

  it('sendTokenSync 构造 token-sync 消息（tokenSchema 2 + 62 token 载荷）', () => {
    sendTokenSync(frame, {
      token: 'tok-1',
      preset: 'ocean',
      appearance: 'dark',
      global: { 'font-sans': 'system-ui' },
      tokens: { background: '#000' },
    })
    expect(captured.pop()).toEqual({
      type: 'openloop:token-sync',
      token: 'tok-1',
      tokenSchema: 2,
      preset: 'ocean',
      appearance: 'dark',
      global: { 'font-sans': 'system-ui' },
      tokens: { background: '#000' },
    })
  })

  it('sendData 构造 data 消息', () => {
    sendData(frame, { token: 'tok-1', widgetId: 'metric-card', data: { value: 42 }, resolvedAt: '2026-08-21T00:00:00.000Z' })
    expect(captured.pop()).toEqual({
      type: 'openloop:data',
      token: 'tok-1',
      widgetId: 'metric-card',
      data: { value: 42 },
      resolvedAt: '2026-08-21T00:00:00.000Z',
    })
  })

  it('frame 为 null 时不抛错（iframe 未就绪）', () => {
    expect(() => sendTokenSync(null, basePayload())).not.toThrow()
    expect(() => sendData(null, { token: 't', widgetId: 'w', data: null, resolvedAt: '' })).not.toThrow()
  })
})

function basePayload() {
  return { token: 't', preset: 'default', appearance: 'light' as const, global: {}, tokens: {} }
}
