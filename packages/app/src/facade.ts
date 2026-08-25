/**
 * 受控 API 门面（APP_PLATFORM_DESIGN §4.2 架构中枢）：
 * Agent（tool）/ UI（webServer 路由）/ dock M3 只跟这里说话，PocketBase 细节被完全隐藏。
 *
 * 设计纪律（继承旧轨道 LDR 结论）：
 * 1. 错误消息面向 Agent——校验失败给出「期望形态 + 实际值」，可自修正闭环
 * 2. 数据面按 APP 隔离——components/apis 注册时校验 appName 归属，删 APP 级联清资源
 * 3. 凭据不回显——keySecret 只写不读，对外只有 configured: true/false
 *
 * facade 纯逻辑、PbClient 注入（单测用 fake；真机走 pb-process + pb-client）。
 */
import type { PbClient } from './pb-client.ts'

// ---- 公共行类型（对外形态；不含任何存储内部字段） ----

export type AppKind = 'builtin' | 'local' | 'thirdparty'
export type ComponentKind = 'panel' | 'artifact'
export type ApiAuthType = 'none' | 'key'

export interface AppRow {
  name: string
  displayName: string
  kind: AppKind
  version: string
  description: string
  skill: string
}

export interface ComponentRow {
  rid: string
  appName: string
  kind: ComponentKind
  title: string
  entry: unknown
  description: string
}

export interface ApiRow {
  rid: string
  appName: string
  domain: string
  path: string
  authType: ApiAuthType
  summary: string
}

/** API 状态形态（含配置状态点；永不包含 key 本身） */
export interface ApiStatusRow extends ApiRow {
  configured: boolean
}

export interface BoardRow {
  bid: string
  title: string
  position: number
}

export interface TileRow {
  tileId: string
  sourceId: string
  title: string
  alias: string
  position: number
  layout: unknown
  snapshot: unknown
}

// ---- dock v2 同构形态（迁移 / M3 持久化切换的数据契约） ----

export interface DockTileV2 {
  tileId: string
  title: string
  source: { kind: 'panel' | 'artifact'; meta: unknown }
  layout: { column: number; row: number; columns: number; rows: number }
  origin: unknown
  createdAt: number
  alias?: string
}

export interface DockStateV2 {
  version: 2
  boards: Array<{ id: string; name: string; tiles: DockTileV2[] }>
  activeBoardId: string
}

// ---- 校验（fail-closed，消息面向 Agent） ----

const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const RID_RE = /^[a-z0-9-]+:[a-z0-9-]+$/
const APP_KINDS: readonly AppKind[] = ['builtin', 'local', 'thirdparty']
const COMPONENT_KINDS: readonly ComponentKind[] = ['panel', 'artifact']
const AUTH_TYPES: readonly ApiAuthType[] = ['none', 'key']

function bad(field: string, expected: string, actual: unknown): never {
  throw new Error(`invalid ${field}: expected ${expected}, got ${JSON.stringify(actual).slice(0, 120)}`)
}

function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || value.length === 0) bad(field, `a non-empty string (≤${maxLength} chars)`, value)
  if (value.length > maxLength) bad(field, `a string ≤${maxLength} chars (got ${value.length})`, `${value.slice(0, 40)}…`)
  return value
}

function requireKebab(value: unknown, field: string): string {
  const s = requireString(value, field, 80)
  if (!KEBAB_RE.test(s)) bad(field, 'a kebab-case name like "acme-crm" (lowercase letters/digits/hyphens)', s)
  return s
}

function requireRid(value: unknown, field: string): string {
  const s = requireString(value, field, 160)
  if (!RID_RE.test(s)) bad(field, 'a `包名:组件名` resource id like "acme-crm:dashboard" (kebab-case on both sides)', s)
  return s
}

function requireEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    bad(field, `one of ${allowed.map(a => `"${a}"`).join(' | ')}`, value)
  }
  return value as T
}

// ---- PB records 薄助手（filter/list/upsert-by-unique-key/delete-by-filter） ----

interface PbRecord {
  id: string
  [key: string]: unknown
}

interface PbListResult {
  items: PbRecord[]
  totalItems: number
}

async function listRecords(pb: PbClient, collection: string, filter: string): Promise<PbRecord[]> {
  const params = new URLSearchParams({ filter, perPage: '200', page: '1' })
  const res = await pb.request<PbListResult>('GET', `/api/collections/${collection}/records?${params.toString()}`)
  return res.items
}

async function findOne(pb: PbClient, collection: string, filter: string): Promise<PbRecord | undefined> {
  const items = await listRecords(pb, collection, filter)
  return items[0]
}

async function deleteByFilter(pb: PbClient, collection: string, filter: string): Promise<number> {
  const items = await listRecords(pb, collection, filter)
  for (const item of items) {
    await pb.request('DELETE', `/api/collections/${collection}/records/${item.id}`)
  }
  return items.length
}

/** upsert 语义：按 filter 找到则 PATCH，否则 POST；返回 { record, created } */
async function upsertRecord(pb: PbClient, collection: string, filter: string, body: Record<string, unknown>): Promise<{ record: PbRecord; created: boolean }> {
  const existing = await findOne(pb, collection, filter)
  if (existing !== undefined) {
    const record = await pb.request<PbRecord>('PATCH', `/api/collections/${collection}/records/${existing.id}`, body)
    return { record, created: false }
  }
  const record = await pb.request<PbRecord>('POST', `/api/collections/${collection}/records`, body)
  return { record, created: true }
}

// ---- 门面实现 ----

export interface AppFacade {
  // 注册表
  listApps(): Promise<AppRow[]>
  upsertApp(input: unknown): Promise<AppRow & { created: boolean }>
  deleteApp(name: string): Promise<{ removedComponents: number; removedApis: number }>
  getAppDetail(name: string): Promise<{ app: AppRow; components: ComponentRow[]; apis: ApiStatusRow[] } | undefined>
  registerComponent(appName: string, input: unknown): Promise<ComponentRow & { created: boolean }>
  removeComponent(rid: string): Promise<void>
  registerApi(appName: string, input: unknown): Promise<ApiRow & { created: boolean }>
  removeApi(rid: string): Promise<void>
  setApiKey(rid: string, key: string): Promise<void>
  // 看板（dock v2 同构）
  saveDockState(state: unknown): Promise<{ boards: number; tiles: number }>
  loadDockState(): Promise<DockStateV2 | null>
}

function toAppRow(record: PbRecord): AppRow {
  return {
    name: String(record.name ?? ''),
    displayName: String(record.displayName ?? ''),
    kind: (APP_KINDS as readonly string[]).includes(String(record.kind)) ? record.kind as AppKind : 'local',
    version: String(record.version ?? ''),
    description: String(record.description ?? ''),
    skill: String(record.skill ?? ''),
  }
}

function toComponentRow(record: PbRecord): ComponentRow {
  return {
    rid: String(record.rid ?? ''),
    appName: String(record.appName ?? ''),
    kind: (COMPONENT_KINDS as readonly string[]).includes(String(record.kind)) ? record.kind as ComponentKind : 'panel',
    title: String(record.title ?? ''),
    entry: record.entry,
    description: String(record.description ?? ''),
  }
}

function toApiRow(record: PbRecord): ApiRow {
  return {
    rid: String(record.rid ?? ''),
    appName: String(record.appName ?? ''),
    domain: String(record.domain ?? ''),
    path: String(record.path ?? ''),
    authType: (AUTH_TYPES as readonly string[]).includes(String(record.authType)) ? record.authType as ApiAuthType : 'none',
    summary: String(record.summary ?? ''),
  }
}

/** tile 溯源 ID：panel → `openloop:<panel.id>`；artifact → path 文件名（dock sourceIdOf 同款语义） */
function sourceIdOfTile(source: DockTileV2['source']): string {
  if (source.kind === 'panel') {
    const panelId = (source.meta as { panel?: { id?: unknown } } | null)?.panel?.id
    return typeof panelId === 'string' && panelId.length > 0 ? `openloop:${panelId}` : ''
  }
  const path = (source.meta as { path?: unknown } | null)?.path
  if (typeof path !== 'string' || path.length === 0) return ''
  const base = path.split('/').pop() ?? path
  return `openloop:${base}`
}

/** dock v2 state 校验（容错：非法 tile 剔除——与 dock store sanitize 同哲学，坏数据不进门面） */
function coerceDockState(state: unknown): DockStateV2 {
  if (typeof state !== 'object' || state === null) bad('dockState', 'a dock v2 state object { version: 2, boards: [...], activeBoardId }', state)
  const raw = state as Record<string, unknown>
  if (raw.version !== 2) bad('dockState.version', '2 (dock v1 states must be migrated by the dock client first)', raw.version)
  if (!Array.isArray(raw.boards) || raw.boards.length === 0) bad('dockState.boards', 'a non-empty array of { id, name, tiles }', raw.boards)
  const boards = raw.boards.map(b => {
    const board = b as Record<string, unknown>
    const id = requireString(board.id, 'board.id', 80)
    const name = requireString(board.name, 'board.name', 80)
    const tiles = Array.isArray(board.tiles) ? board.tiles : []
    const validTiles: DockTileV2[] = []
    for (const t of tiles) {
      const tile = t as Record<string, unknown>
      const source = tile.source as Record<string, unknown> | undefined
      if (
        typeof tile.tileId !== 'string' || typeof tile.title !== 'string'
        || source === null || typeof source !== 'object' || (source.kind !== 'panel' && source.kind !== 'artifact')
      ) continue
      const valid: DockTileV2 = {
        tileId: tile.tileId,
        title: tile.title,
        source: { kind: source.kind, meta: source.meta },
        layout: (typeof tile.layout === 'object' && tile.layout !== null ? tile.layout : { column: 0, row: 0, columns: 6, rows: 4 }) as DockTileV2['layout'],
        origin: (tile.origin ?? null) as unknown,
        createdAt: typeof tile.createdAt === 'number' ? tile.createdAt : Date.now(),
      }
      if (typeof tile.alias === 'string' && tile.alias.length > 0) valid.alias = tile.alias
      validTiles.push(valid)
    }
    return { id, name, tiles: validTiles }
  })
  const activeBoardId = requireString(raw.activeBoardId, 'dockState.activeBoardId', 80)
  if (!boards.some(b => b.id === activeBoardId)) bad('dockState.activeBoardId', `the id of one of the boards (${boards.map(b => b.id).join(', ')})`, activeBoardId)
  return { version: 2, boards, activeBoardId }
}

export function createAppFacade(pb: PbClient): AppFacade {
  const requireApp = async (name: string): Promise<void> => {
    const found = await findOne(pb, 'apps', `name = "${name}"`)
    if (found === undefined) {
      throw new Error(`app "${name}" is not registered. Register it first (action: upsert_app), or pick from: ${(await listApps()).map(a => a.name).join(', ') || '(none)'}`)
    }
  }

  const listApps = async (): Promise<AppRow[]> => {
    const items = await listRecords(pb, 'apps', 'id != ""')
    return items.map(toAppRow).sort((a, b) => a.name.localeCompare(b.name))
  }

  return {
    async listApps() {
      return listApps()
    },

    async upsertApp(input: unknown) {
      if (typeof input !== 'object' || input === null) bad('app', 'an app manifest object { name, displayName, kind, version, description?, skill? }', input)
      const raw = input as Record<string, unknown>
      const name = requireKebab(raw.name, 'app.name')
      const body = {
        name,
        displayName: requireString(raw.displayName ?? name, 'app.displayName', 80),
        kind: requireEnum(raw.kind ?? 'local', 'app.kind', APP_KINDS),
        version: requireString(raw.version ?? '0.1.0', 'app.version', 40),
        description: typeof raw.description === 'string' ? raw.description.slice(0, 360) : '',
        skill: typeof raw.skill === 'string' ? raw.skill.slice(0, 8000) : '',
      }
      const { record, created } = await upsertRecord(pb, 'apps', `name = "${name}"`, body)
      return { ...toAppRow(record), created }
    },

    async deleteApp(name: string) {
      const app = await findOne(pb, 'apps', `name = "${name}"`)
      if (app === undefined) {
        throw new Error(`app "${name}" is not registered (nothing to delete). Registered apps: ${(await listApps()).map(a => a.name).join(', ') || '(none)'}`)
      }
      // 级联清理资源（数据面隔离：不留孤儿）
      const removedComponents = await deleteByFilter(pb, 'components', `appName = "${name}"`)
      const removedApis = await deleteByFilter(pb, 'apis', `appName = "${name}"`)
      await pb.request('DELETE', `/api/collections/apps/records/${app.id}`)
      return { removedComponents, removedApis }
    },

    async getAppDetail(name: string) {
      const app = await findOne(pb, 'apps', `name = "${name}"`)
      if (app === undefined) return undefined
      const components = (await listRecords(pb, 'components', `appName = "${name}"`))
        .map(toComponentRow).sort((a, b) => a.rid.localeCompare(b.rid))
      const apis = (await listRecords(pb, 'apis', `appName = "${name}"`))
        .map(record => {
          const row = toApiRow(record)
          const secret = record.keySecret
          const status: ApiStatusRow = { ...row, configured: typeof secret === 'string' && secret.length > 0 }
          return status
        })
        .sort((a, b) => a.rid.localeCompare(b.rid))
      return { app: toAppRow(app), components, apis }
    },

    async registerComponent(appName: string, input: unknown) {
      await requireApp(appName)
      if (typeof input !== 'object' || input === null) bad('component', 'a component object { rid, kind, title, entry?, description? }', input)
      const raw = input as Record<string, unknown>
      const rid = requireRid(raw.rid, 'component.rid')
      if (!rid.startsWith(`${appName}:`)) {
        bad('component.rid', `to start with the owning app's namespace "${appName}:" (got "${rid}") — naming is addressing, an app cannot register resources under another app's namespace`, rid)
      }
      const body = {
        rid,
        appName,
        kind: requireEnum(raw.kind ?? 'panel', 'component.kind', COMPONENT_KINDS),
        title: requireString(raw.title, 'component.title', 120),
        entry: raw.entry ?? null,
        description: typeof raw.description === 'string' ? raw.description.slice(0, 360) : '',
      }
      const { record, created } = await upsertRecord(pb, 'components', `rid = "${rid}"`, body)
      return { ...toComponentRow(record), created }
    },

    async removeComponent(rid: string) {
      const found = await findOne(pb, 'components', `rid = "${rid}"`)
      if (found === undefined) throw new Error(`component "${rid}" is not registered (nothing to remove)`)
      await pb.request('DELETE', `/api/collections/components/records/${found.id}`)
    },

    async registerApi(appName: string, input: unknown) {
      await requireApp(appName)
      if (typeof input !== 'object' || input === null) bad('api', 'an api object { rid, domain, path, authType, summary? }', input)
      const raw = input as Record<string, unknown>
      const rid = requireRid(raw.rid, 'api.rid')
      if (!rid.startsWith(`${appName}:`)) {
        bad('api.rid', `to start with the owning app's namespace "${appName}:" (got "${rid}")`, rid)
      }
      const body = {
        rid,
        appName,
        domain: requireString(raw.domain, 'api.domain', 200),
        path: requireString(raw.path, 'api.path', 300),
        authType: requireEnum(raw.authType ?? 'none', 'api.authType', AUTH_TYPES),
        summary: typeof raw.summary === 'string' ? raw.summary.slice(0, 360) : '',
        // 注意：不含 keySecret——upsert 保留已有凭据（重复注册不清凭据）
      }
      const { record, created } = await upsertRecord(pb, 'apis', `rid = "${rid}"`, body)
      return { ...toApiRow(record), created }
    },

    async removeApi(rid: string) {
      const found = await findOne(pb, 'apis', `rid = "${rid}"`)
      if (found === undefined) throw new Error(`api "${rid}" is not registered (nothing to remove)`)
      await pb.request('DELETE', `/api/collections/apis/records/${found.id}`)
    },

    async setApiKey(rid: string, key: string) {
      if (typeof key !== 'string' || key.length === 0) bad('apiKey', 'a non-empty API key string', key)
      const found = await findOne(pb, 'apis', `rid = "${rid}"`)
      if (found === undefined) throw new Error(`api "${rid}" is not registered. Register it first (action: register_api)`)
      await pb.request('PATCH', `/api/collections/apis/records/${found.id}`, { keySecret: key })
    },

    async saveDockState(state: unknown) {
      const dock = coerceDockState(state)
      // 全量替换（dock store 是单 state 语义；数据量 = 几板几十 tile，可承受）
      await deleteByFilter(pb, 'tiles', 'id != ""')
      await deleteByFilter(pb, 'boards', 'id != ""')
      let tileCount = 0
      for (const [boardIndex, board] of dock.boards.entries()) {
        await pb.request('POST', '/api/collections/boards/records', {
          bid: board.id,
          title: board.name,
          position: boardIndex,
        })
        for (const [tileIndex, tile] of board.tiles.entries()) {
          await pb.request('POST', '/api/collections/tiles/records', {
            boardBid: board.id,
            tileId: tile.tileId,
            sourceId: sourceIdOfTile(tile.source),
            title: tile.title,
            alias: tile.alias ?? '',
            position: tileIndex,
            layout: tile.layout,
            snapshot: { source: tile.source, origin: tile.origin, createdAt: tile.createdAt },
          })
          tileCount++
        }
      }
      // activeBoardId 是 dock state 的一部分（非纯 UI 态）——存 meta，loadDockState 恢复
      await upsertRecord(pb, 'meta', `key = "dock.activeBoardId"`, { key: 'dock.activeBoardId', value: dock.activeBoardId })
      return { boards: dock.boards.length, tiles: tileCount }
    },

    async loadDockState() {
      const boardRecords = await listRecords(pb, 'boards', 'id != ""')
      if (boardRecords.length === 0) return null
      const boards: DockStateV2['boards'] = []
      const orderedBoards = [...boardRecords].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
      for (const boardRecord of orderedBoards) {
        const bid = String(boardRecord.bid ?? '')
        if (bid.length === 0) continue
        const tileRecords = await listRecords(pb, 'tiles', `boardBid = "${bid}"`)
        const tiles = [...tileRecords]
          .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
          .map(record => {
            const snapshot = record.snapshot as { source?: { kind?: unknown; meta?: unknown }; origin?: unknown; createdAt?: unknown } | null
            const source = snapshot?.source
            if (source === null || typeof source !== 'object' || (source.kind !== 'panel' && source.kind !== 'artifact')) return undefined
            const tile: DockTileV2 = {
              tileId: String(record.tileId ?? ''),
              title: String(record.title ?? ''),
              source: { kind: source.kind, meta: source.meta },
              layout: (record.layout && typeof record.layout === 'object' ? record.layout : { column: 0, row: 0, columns: 6, rows: 4 }) as DockTileV2['layout'],
              origin: snapshot?.origin ?? null,
              createdAt: typeof snapshot?.createdAt === 'number' ? snapshot.createdAt : Date.now(),
            }
            const alias = String(record.alias ?? '')
            if (alias.length > 0) tile.alias = alias
            return tile
          })
          .filter((t): t is DockTileV2 => t !== undefined && t.tileId.length > 0 && t.title.length > 0)
        boards.push({ id: bid, name: String(boardRecord.title ?? bid), tiles })
      }
      if (boards.length === 0) return null
      const activeRecord = await findOne(pb, 'meta', `key = "dock.activeBoardId"`)
      const activeBoardId = typeof activeRecord?.value === 'string' && boards.some(b => b.id === activeRecord.value)
        ? activeRecord.value
        : boards[0]?.id ?? ''
      return { version: 2, boards, activeBoardId }
    },
  }
}
