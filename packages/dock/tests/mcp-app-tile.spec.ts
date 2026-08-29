/**
 * 方向 1 v2 mcp-app tile 单测（2026-08-29）：
 * - entryMcpAppOf 引用形态识别（合法/畸形）
 * - buildTileSourceForComponent：mcp-app 组件 → 引用 tile（不复制内容）；panel 通道不回归
 * - store 往返：mcp-app tile pin → localStorage 持久化 → 重新载入不丢
 * - sourceIdOf：rid 优先、(serverId, toolName) 兜底推导
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildTileSourceForComponent, entryMcpAppOf, type AppComponentDescriptor } from '../src/client/app-registry.ts'
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
