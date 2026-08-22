import { describe, expect, it } from 'vitest'
import {
  buildSandboxDocument,
  ensurePresentationMatchesTool,
  isTrustedAppMessage,
  MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX,
  MCP_APP_DEFAULT_IFRAME_HEIGHT,
  MCP_APP_MAX_IFRAME_HEIGHT,
  parseMcpAppCodeDispatchPresentation,
  parseMcpAppPresentation,
  resolveAppDocumentUrl,
  unsupportedAppToolCallResult,
} from '../src/security.ts'

describe('MCP Apps host policy', () => {
  it('gives full editor Apps a useful initial inline viewport', () => {
    expect(MCP_APP_DEFAULT_IFRAME_HEIGHT).toBeGreaterThanOrEqual(480)
    expect(MCP_APP_DEFAULT_IFRAME_HEIGHT).toBeLessThanOrEqual(MCP_APP_MAX_IFRAME_HEIGHT)
  })

  it('requires the exact iframe source and opaque origin without mutating JSON-RPC messages', () => {
    const source = {}
    const valid = { source, origin: 'null', data: { jsonrpc: '2.0', method: 'ping' } }
    expect(isTrustedAppMessage(valid, source, 'null')).toBe(true)
    expect(isTrustedAppMessage({ ...valid, source: {} }, source, 'null')).toBe(false)
    expect(isTrustedAppMessage({ ...valid, origin: 'https://evil.test' }, source, 'null')).toBe(false)
  })

  it('accepts the exact wire name supplied by a non-fixture composition', () => {
    const callName = 'mcp__example_server__render_tool'
    const binding = { serverId: 'example_server', toolName: 'render_tool', resourceUri: 'ui://example_server/render.html' }
    const valid = {
      kind: 'openloop.dsh-mcp', version: 1, callName, serverId: 'example_server', toolName: 'render_tool',
      binding,
      result: {
        serverId: 'example_server', toolName: 'render_tool', content: [{ type: 'text', text: 'fallback' }], isError: false,
        uiResource: { serverId: 'example_server', resourceUri: binding.resourceUri, mimeType: 'text/html;profile=mcp-app', html: '<div>ok</div>' },
      },
    }
    const parsed = parseMcpAppPresentation(valid, callName)
    expect(parsed).toBeTruthy()
    expect(ensurePresentationMatchesTool(parsed!, { serverId: 'example_server', name: 'render_tool', ui: binding })).toBe(true)
    expect(parseMcpAppPresentation({ ...valid, binding: { ...valid.binding, resourceUri: 'ui://other_server/other.html' } }, callName)).toBeUndefined()
    expect(parseMcpAppPresentation({ ...valid, serverId: 'other_server', result: { ...valid.result, serverId: 'other_server', uiResource: { ...valid.result.uiResource, serverId: 'other_server' } } }, callName)).toBeUndefined()
  })

  it('returns a clear fail-closed result for unsupported AppBridge tool calls', () => {
    expect(unsupportedAppToolCallResult()).toEqual({
      content: [{ type: 'text', text: 'MCP App tool calls are disabled in this DSH host; invoke the ordinary bound MCP tool instead.' }],
      isError: true,
    })
  })

  it('parses only a bounded, call-bound Code Mode durable envelope', () => {
    const callName = 'mcp__example_server__render_tool'
    const binding = { serverId: 'example_server', toolName: 'render_tool', resourceUri: 'ui://example_server/render.html' }
    const valid = {
      kind: 'openloop.dsh-mcp', version: 1, callName, serverId: 'example_server', toolName: 'render_tool', binding,
      result: {
        serverId: 'example_server', toolName: 'render_tool', content: [{ type: 'text', text: 'fallback' }], isError: false,
        uiResource: { serverId: 'example_server', resourceUri: binding.resourceUri, mimeType: 'text/html;profile=mcp-app', html: '<div>ok</div>' },
      },
    }
    const callId = 'root:code:1'
    const envelope = `${MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX}${JSON.stringify({
      kind: 'openloop.dsh-mcp/code-dispatch',
      version: 1,
      callId,
      callName,
      presentation: valid,
    })}`
    const parsed = parseMcpAppCodeDispatchPresentation([...valid.result.content, { type: 'text', text: envelope }], callName, callId)
    expect(parsed?.presentation.result.uiResource?.resourceUri).toBe(binding.resourceUri)
    const parsedResource = parsed!.presentation.result.uiResource!
    expect('html' in parsedResource && buildSandboxDocument(parsedResource.html)).toContain('<!doctype html>')
    expect(parseMcpAppCodeDispatchPresentation([...valid.result.content, { type: 'text', text: envelope }], callName, 'root:code:2')).toBeUndefined()

    const userMimic = `${MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX}${JSON.stringify({
      kind: 'openloop.dsh-mcp/code-dispatch', version: 1, callId: 'user-text', callName, presentation: valid,
    })}`
    expect(parseMcpAppCodeDispatchPresentation([{ type: 'text', text: 'ordinary fallback' }, { type: 'text', text: userMimic }], callName, callId)).toBeUndefined()
    expect(parseMcpAppCodeDispatchPresentation([{ type: 'text', text: userMimic }], callName, callId)).toBeUndefined()
  })

  it('wraps every App document in a host-owned head so the CSP cannot be displaced', () => {
    const document = buildSandboxDocument('<div>safe</div>')
    expect(document).toContain('<!doctype html>')
    expect(document).toContain("connect-src 'none'")
    expect(document).not.toContain('allow-same-origin')
    const complete = buildSandboxDocument('<!doctype html><html><head><script>window.ready=true</script></head><body></body></html>')
    expect(complete.indexOf('Content-Security-Policy')).toBeLessThan(complete.indexOf('window.ready'))
  })

  it('keeps the CSP active against a decoy <head> inside an App HTML comment', () => {
    const decoy = '<!-- <head> --><html><head><script>window.ready=true</script></head><body></body></html>'
    const document = buildSandboxDocument(decoy)
    expect(document).toContain('<!doctype html>')
    expect(document.indexOf('Content-Security-Policy')).toBeLessThan(document.indexOf(decoy))
    expect(document).toContain(decoy)
    expect(document.indexOf('Content-Security-Policy')).toBeLessThan(document.indexOf('window.ready'))
  })

  it('separates the App document origin on loopback hosts', () => {
    expect(resolveAppDocumentUrl('/api/openloop/mcp-app/document/abc', 'http://127.0.0.1:3080/chat'))
      .toBe('http://localhost:3080/api/openloop/mcp-app/document/abc')
    expect(resolveAppDocumentUrl('/api/openloop/mcp-app/document/abc', 'http://localhost:3080/chat'))
      .toBe('http://127.0.0.1:3080/api/openloop/mcp-app/document/abc')
  })

  it('keeps an already distinct App document origin unchanged', () => {
    expect(resolveAppDocumentUrl('http://localhost:3080/api/openloop/mcp-app/document/abc', 'http://127.0.0.1:3080/chat'))
      .toBe('http://localhost:3080/api/openloop/mcp-app/document/abc')
  })

  it('fails closed when the App document would share the host origin', () => {
    expect(resolveAppDocumentUrl('/api/openloop/mcp-app/document/abc', 'http://192.168.1.5:3080/chat')).toBeUndefined()
    expect(resolveAppDocumentUrl('/api/openloop/mcp-app/document/abc', 'http://[::1]:3080/chat')).toBeUndefined()
    expect(resolveAppDocumentUrl('/api/openloop/mcp-app/document/abc', 'https://dsh.example.com/chat')).toBeUndefined()
  })
})
