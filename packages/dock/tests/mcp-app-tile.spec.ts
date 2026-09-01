/**
 * 方向 1 v2 mcp-app tile 单测（2026-08-29）：
 * - entryMcpAppOf 引用形态识别（合法/畸形）
 * - buildTileSourceForComponent：mcp-app 组件 → 引用 tile（不复制内容）；panel 通道不回归
 * - store 往返：mcp-app tile pin → localStorage 持久化 → 重新载入不丢
 * - sourceIdOf：rid 优先、(serverId, toolName) 兜底推导
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildTileSourceForComponent, entryMcpAppOf, entryArtifactOf, mergeApps, type AppComponentDescriptor, type AppDescriptor } from '../src/client/app-registry.ts'
import { sourceIdOf } from '../src/client/DockBoardView.tsx'
import { DockStore, type DockTileSource } from '../src/client/store.ts'

const KEY = 'openloop.dock.board.v1'

class MemoryStorage {
  private map = new Map<string, string>()
  getItem(k: string): string | null { return this.map.has(k) ? this.map.get(k)! : null }
  setItem(k: string, v: string): void { this.map.set(k, String(v)) }
}

let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
  globalThis.localStorage = storage as unknown as Storage
})

afterEach(() => {
  delete (globalThis as { localStorage?: Storage }).localStorage
})

function mcpComponent(entry: unknown): AppComponentDescriptor {
  return { id: 'tldraw:tldraw-create-view', title: 'tldraw canvas', type: 'mcp-app', desc: '', kind: '', pinnable: true, entry }
}

describe('entryMcpAppOf', () => {
  it('accepts a well-formed reference', () => {
    expect(entryMcpAppOf({ serverId: 'tldraw', toolName: 'tldraw_create_view', resourceUri: 'ui://openchamber/x' }))
      .toEqual({ serverId: 'tldraw', toolName: 'tldraw_create_view', resourceUri: 'ui://openchamber/x' })
  })

  it('rejects malformed entries (missing fields / non-objects)', () => {
    expect(entryMcpAppOf({ serverId: 'tldraw', toolName: '', resourceUri: 'ui://x' })).toBeNull()
    expect(entryMcpAppOf({ serverId: 'tldraw', resourceUri: 'ui://x' })).toBeNull()
    expect(entryMcpAppOf('ui://x')).toBeNull()
    expect(entryMcpAppOf(null)).toBeNull()
    expect(entryMcpAppOf([1, 2])).toBeNull()
  })
})

describe('buildTileSourceForComponent', () => {
  it('builds a reference tile for mcp-app components (rid preserved)', () => {
    const source = buildTileSourceForComponent(mcpComponent({ serverId: 'tldraw', toolName: 'tldraw_create_view', resourceUri: 'ui://openchamber/x' }))
    expect(source).toEqual({
      kind: 'mcp-app',
      meta: { serverId: 'tldraw', toolName: 'tldraw_create_view', resourceUri: 'ui://openchamber/x', rid: 'tldraw:tldraw-create-view' },
    })
  })

  it('rejects an mcp-app component with a malformed entry', () => {
    expect(buildTileSourceForComponent(mcpComponent({ serverId: 'tldraw' }))).toBeNull()
    expect(buildTileSourceForComponent(mcpComponent(undefined))).toBeNull()
  })

  it('keeps the panel channel intact for non-mcp-app components', () => {
    const panelComponent: AppComponentDescriptor = {
      id: 'openloop:metric-grid', title: '指标网格', type: 'panel', desc: '', kind: 'metric-grid', pinnable: true,
    }
    const source = buildTileSourceForComponent(panelComponent)
    expect(source?.kind).toBe('panel')
  })
})

describe('store round-trip for mcp-app tiles', () => {
  it('persists and reloads an mcp-app tile without losing the reference', () => {
    const store = new DockStore()
    const source: DockTileSource = {
      kind: 'mcp-app',
      meta: { serverId: 'tldraw', toolName: 'tldraw_create_view', resourceUri: 'ui://openchamber/interop', rid: 'tldraw:tldraw-create-view' },
    }
    store.pin(source, 'tldraw canvas')

    const persisted = JSON.parse(storage.getItem(KEY) ?? 'null') as { boards?: Array<{ tiles?: Array<{ source?: { kind?: string; meta?: unknown } }> }> }
    const persistedTile = persisted.boards?.[0]?.tiles?.find(t => t.source?.kind === 'mcp-app')
    expect(persistedTile?.source?.meta).toEqual(source.meta)

    // 新 store 实例从 localStorage 载入（sanitizeTiles 宽容 mcp-app kind）
    const reloaded = new DockStore()
    const tiles = reloaded.getSnapshot().boards[0]?.tiles ?? []
    expect(tiles).toHaveLength(1)
    expect(tiles[0]?.source).toEqual(source)
  })
})

describe('sourceIdOf for mcp-app tiles', () => {
  it('prefers the explicit rid and falls back to (serverId, toolName) derivation', () => {
    expect(sourceIdOf({ kind: 'mcp-app', meta: { serverId: 'tldraw', toolName: 'tldraw_create_view', resourceUri: 'ui://x', rid: 'tldraw:tldraw-create-view' } }))
      .toBe('tldraw:tldraw-create-view')
    expect(sourceIdOf({ kind: 'mcp-app', meta: { serverId: 'tldraw', toolName: 'tldraw_create_view', resourceUri: 'ui://x' } }))
      .toBe('tldraw:tldraw-create-view')
  })
})

describe('mergeApps component-level merge（0.5.3 真机事故回归）', () => {
  const mkApp = (id: string, components: AppComponentDescriptor[]): AppDescriptor => ({
    id, name: id, kind: 'builtin', version: '1.0.0', desc: '', components, apis: [],
  })
  const mkComp = (rid: string, type: AppComponentDescriptor['type']): AppComponentDescriptor => ({
    id: rid, title: rid, type, desc: '', kind: '', pinnable: true,
  })

  it('merges same-id apps at the COMPONENT level: builtin panels + remote artifacts both visible', () => {
    const builtin = [mkApp('openloop', [mkComp('openloop:metric-grid', 'panel'), mkComp('openloop:chart', 'panel')])]
    const remote = [mkApp('openloop', [mkComp('openloop:system-map', 'artifact'), mkComp('openloop:metric-grid', 'panel')])]
    const merged = mergeApps(builtin, remote)
    expect(merged).toHaveLength(1)
    const rids = merged[0]!.components.map(c => c.id).sort()
    // 内置 artifact 组件不被 builtin 吞掉（旧实现整个 remote openloop 被丢弃）
    expect(rids).toEqual(['openloop:chart', 'openloop:metric-grid', 'openloop:system-map'])
    // 同 rid：remote 条目覆盖（registry 权威）
    expect(merged[0]!.components.find(c => c.id === 'openloop:metric-grid')).toEqual(remote[0]!.components[1])
  })

  it('disjoint ids pass through unchanged', () => {
    const builtin = [mkApp('openloop', [mkComp('openloop:a', 'panel')])]
    const remote = [mkApp('excalidraw', [mkComp('excalidraw:b', 'mcp-app')])]
    const merged = mergeApps(builtin, remote)
    expect(merged.map(a => a.id).sort()).toEqual(['excalidraw', 'openloop'])
  })

  it('entryArtifactOf accepts wrapped and flat ArtifactMeta shapes', () => {
    const meta = { kind: 'openloop.html-artifact', version: 1, title: 't', runtime: 'static', html: '<div>x</div>', path: 'p.html' }
    expect(entryArtifactOf({ artifact: meta })).not.toBeNull()
    expect(entryArtifactOf(meta)).not.toBeNull()
    expect(entryArtifactOf({ artifact: { kind: 'openloop.html-artifact' } })).toBeNull() // 缺 html
  })
})
