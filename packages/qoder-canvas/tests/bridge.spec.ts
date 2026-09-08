/**
 * canvas-app-bridge 协议纯函数测试（0.12）：
 * 信封解析（魔数/token/畸形数据）+ token 生成。
 * HostBridge/ClientBridge 是浏览器 DOM 类（window/iframe），端到端在真机验证。
 */
import { describe, expect, it } from 'vitest'
import { parseEnvelope, generateBridgeToken, CANVAS_APP_MAGIC } from '../src/canvas-app-bridge.ts'

describe('parseEnvelope', () => {
  it('accepts valid envelope with matching token', () => {
    const msg = parseEnvelope({ __openloopCanvasApp: true, token: 'tok1', t: 'snapshot', snapshot: { a: 1 } }, 'tok1')
    expect(msg?.t).toBe('snapshot')
    expect(msg?.get<{ a: number }>('snapshot')).toEqual({ a: 1 })
  })

  it('rejects missing magic', () => {
    expect(parseEnvelope({ token: 'tok1', t: 'init' }, 'tok1')).toBeNull()
  })

  it('rejects wrong token (anti-forgery)', () => {
    expect(parseEnvelope({ __openloopCanvasApp: true, token: 'evil', t: 'annotation' }, 'tok1')).toBeNull()
  })

  it('rejects non-object / null / array data', () => {
    expect(parseEnvelope(null, null)).toBeNull()
    expect(parseEnvelope('str', null)).toBeNull()
    expect(parseEnvelope([1, 2], null)).toBeNull()
  })

  it('rejects missing or empty t', () => {
    expect(parseEnvelope({ __openloopCanvasApp: true, token: 't' }, 't')).toBeNull()
    expect(parseEnvelope({ __openloopCanvasApp: true, token: 't', t: '' }, 't')).toBeNull()
  })

  it('null expectToken skips token check (app pre-init phase)', () => {
    expect(parseEnvelope({ __openloopCanvasApp: true, token: 'anything', t: 'init' }, null)?.t).toBe('init')
  })
})

describe('generateBridgeToken', () => {
  it('generates ca_ prefixed unique tokens', () => {
    const a = generateBridgeToken()
    const b = generateBridgeToken()
    expect(a.startsWith('ca_')).toBe(true)
    expect(a).not.toBe(b)
  })
})

describe('CANVAS_APP_MAGIC', () => {
  it('is the agreed envelope marker', () => {
    expect(CANVAS_APP_MAGIC).toBe('__openloopCanvasApp')
  })
})
