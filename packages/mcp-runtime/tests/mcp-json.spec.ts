import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { interpolateEnv, parseServerEntry, readMcpJsonFile, loadScopedMcpServers, mergeServerConfigs } from '../src/mcp-json.ts'

describe('mcp.json 多作用域加载（对齐 dsh-plugin-mcp，2026-08-23）', () => {
  it('interpolateEnv：${VAR} 替换与未定义告警为空串', () => {
    process.env.__MCP_TEST_VAR = 'hello'
    expect(interpolateEnv('https://${__MCP_TEST_VAR}.example.com')).toBe('https://hello.example.com')
    expect(interpolateEnv('${__MCP_UNDEFINED_VAR_XYZ}')).toBe('')
    delete process.env.__MCP_TEST_VAR
  })

  it('parseServerEntry：stdio 形态（command/args/env + protocol 透传）', () => {
    const cfg = parseServerEntry('github', { type: 'stdio', command: 'npx', args: ['-y', 'x'], env: { T: '1' }, protocol: 'legacy' })
    expect(cfg).toMatchObject({ id: 'github', protocol: 'legacy', transport: { kind: 'stdio', command: 'npx', args: ['-y', 'x'], env: { T: '1' } } })
  })

  it('parseServerEntry：http/sse → streamable-http；ws 拒绝；缺 command/url 拒绝', () => {
    expect(parseServerEntry('tldraw', { type: 'http', url: 'http://127.0.0.1:39513/mcp' })).toMatchObject({ transport: { kind: 'streamable-http', url: 'http://127.0.0.1:39513/mcp' } })
    expect(parseServerEntry('old', { type: 'sse', url: 'https://x.example.com/sse' })).toMatchObject({ transport: { kind: 'streamable-http' } })
    expect(parseServerEntry('bad', { type: 'ws', url: 'wss://x' })).toBeUndefined()
    expect(parseServerEntry('bad2', { type: 'stdio' })).toBeUndefined()
    expect(parseServerEntry('bad3', { type: 'http' })).toBeUndefined()
  })

  it('readMcpJsonFile：合法/缺失/坏 JSON/坏形态', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mcp-json-'))
    try {
      const good = join(dir, 'good.json')
      writeFileSync(good, JSON.stringify({ servers: { a: { type: 'http', url: 'https://a.example.com' } } }))
      expect(readMcpJsonFile(good)).toHaveLength(1)
      expect(readMcpJsonFile(join(dir, 'missing.json'))).toEqual([])
      const bad = join(dir, 'bad.json')
      writeFileSync(bad, '{broken')
      expect(readMcpJsonFile(bad)).toEqual([])
      const badShape = join(dir, 'shape.json')
      writeFileSync(badShape, JSON.stringify({ servers: ['array-not-map'] }))
      expect(readMcpJsonFile(badShape)).toEqual([])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('loadScopedMcpServers：user ← project 按 id 覆盖；mergeServerConfigs 以 cordis config 为底', () => {
    const dshHome = mkdtempSync(join(tmpdir(), 'mcp-home-'))
    const project = mkdtempSync(join(tmpdir(), 'mcp-proj-'))
    try {
      writeFileSync(join(dshHome, 'mcp.json'), JSON.stringify({
        servers: {
          tldraw: { type: 'http', url: 'http://old:39513/mcp' },
          github: { type: 'stdio', command: 'npx', args: ['-y', 'gh'] },
        },
      }))
      mkdirSync(join(project, '.dsh'))
      writeFileSync(join(project, '.dsh', 'mcp.json'), JSON.stringify({
        servers: { tldraw: { type: 'http', url: 'http://127.0.0.1:39513/mcp' } },
      }))
      const scoped = loadScopedMcpServers({ dshHome, projectDir: project })
      expect(scoped).toHaveLength(2)
      const tldraw = scoped.find(s => s.id === 'tldraw')
      expect(tldraw?.transport).toMatchObject({ url: 'http://127.0.0.1:39513/mcp' }) // project 覆盖 user
      const merged = mergeServerConfigs([{ id: 'builtin', transport: { kind: 'streamable-http', url: 'https://b.example.com' } }], scoped)
      expect(merged).toHaveLength(3) // builtin + tldraw + github
    } finally {
      rmSync(dshHome, { recursive: true, force: true })
      rmSync(project, { recursive: true, force: true })
    }
  })
})
