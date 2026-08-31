/**
 * PocketBase collections 定义与幂等初始化（APP_PLATFORM_DESIGN §4.3 数据模型）。
 *
 * - 所有 collection 的 API rules 全 null（锁死——只有持有 superuser token 的门面可访问；
 *   Agent / 前端不直连 PB，数据面按 APP 隔离由门面的 appName 归属校验承担）
 * - 唯一性走 indexes（v0.23+ 形态）：apps.name / components.rid / apis.rid /
 *   boards.bid / tiles(boardBid, tileId)
 * - 内容校验在门面层（fail-closed + 面向 Agent 的错误消息）；PB 只负责存储与唯一约束
 * - MVP 无 schema migration：已存在的 collection 不动（字段演进等真实需求出现再做）
 */
import type { PbClient } from './pb-client.ts'

export interface PbFieldDef {
  name: string
  type: 'text' | 'json' | 'bool' | 'number'
}

export interface PbCollectionDef {
  name: string
  fields: PbFieldDef[]
  indexes: string[]
}

/** 全部 API rules 置 null（锁死为 superuser-only） */
function collectionBody(def: PbCollectionDef): Record<string, unknown> {
  return {
    name: def.name,
    type: 'base',
    fields: def.fields.map(f => ({ name: f.name, type: f.type })),
    indexes: def.indexes,
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  }
}

export const COLLECTIONS: readonly PbCollectionDef[] = [
  {
    name: 'apps',
    fields: [
      { name: 'name', type: 'text' },        // 包名（全局唯一命名空间，kebab-case）
      { name: 'displayName', type: 'text' },
      { name: 'kind', type: 'text' },        // builtin | local | thirdparty
      { name: 'version', type: 'text' },
      { name: 'description', type: 'text' },
      { name: 'skill', type: 'text' },       // 唤起规则（skill 即 API 文档）
    ],
    indexes: ['CREATE UNIQUE INDEX idx_apps_name ON apps (name)'],
  },
  {
    name: 'components',
    fields: [
      { name: 'rid', type: 'text' },         // 包名:组件名（全局唯一 ID）
      { name: 'appName', type: 'text' },     // 归属 APP（数据面隔离键）
      { name: 'kind', type: 'text' },        // panel | artifact
      { name: 'title', type: 'text' },
      { name: 'entry', type: 'json' },       // 资源定位/内容（panel JSON / artifact 路径等）
      { name: 'description', type: 'text' },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_components_rid ON components (rid)'],
  },
  {
    name: 'apis',
    fields: [
      { name: 'rid', type: 'text' },
      { name: 'appName', type: 'text' },
      { name: 'domain', type: 'text' },
      { name: 'path', type: 'text' },
      { name: 'authType', type: 'text' },    // none | key
      { name: 'keySecret', type: 'text' },   // 凭据只写不读（门面永不回显）
      { name: 'summary', type: 'text' },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_apis_rid ON apis (rid)'],
  },
  {
    name: 'boards',
    fields: [
      { name: 'bid', type: 'text' },         // 看板 id（沿用 dock v2 的 b-* 形态）
      { name: 'title', type: 'text' },
      { name: 'position', type: 'number' },  // 排序
    ],
    indexes: ['CREATE UNIQUE INDEX idx_boards_bid ON boards (bid)'],
  },
  {
    name: 'tiles',
    fields: [
      { name: 'boardBid', type: 'text' },
      { name: 'tileId', type: 'text' },
      { name: 'sourceId', type: 'text' },    // 包名:组件名（溯源）
      { name: 'title', type: 'text' },
      { name: 'alias', type: 'text' },
      { name: 'position', type: 'number' },
      { name: 'layout', type: 'json' },      // { column, row, columns, rows }
      { name: 'snapshot', type: 'json' },    // tile 渲染快照（panel/artifact meta）
    ],
    indexes: ['CREATE UNIQUE INDEX idx_tiles_board_tile ON tiles (boardBid, tileId)'],
  },
  {
    name: 'meta',
    fields: [
      { name: 'key', type: 'text' },
      { name: 'value', type: 'json' },       // 门面级杂项（如 dock.activeBoardId）
    ],
    indexes: ['CREATE UNIQUE INDEX idx_meta_key ON meta (key)'],
  },
  // 自管理四件套持久化（0.5.0，2026-08-31）：事件史与调用记录此前是内存态，
  // 重启即失——「系统行为历史」落库后跨重启保留。
  {
    name: 'app_events',
    fields: [
      { name: 'at', type: 'number' },        // 时间戳 ms
      { name: 'kind', type: 'text' },        // registry | backend | mcp | dock
      { name: 'level', type: 'text' },       // info | warn | error
      { name: 'text', type: 'text' },
    ],
    indexes: ['CREATE INDEX idx_app_events_at ON app_events (at DESC)'],
  },
  {
    name: 'api_usage',
    fields: [
      { name: 'source', type: 'text' },      // 面板绑定 URL / serverId:toolName
      { name: 'kind', type: 'text' },        // panel-binding | mcp-call
      { name: 'at', type: 'number' },        // 时间戳 ms
      { name: 'ms', type: 'number' },        // 耗时
      { name: 'ok', type: 'bool' },
    ],
    indexes: ['CREATE INDEX idx_api_usage_at ON api_usage (at DESC)', 'CREATE INDEX idx_api_usage_source ON api_usage (source)'],
  },
]

/**
 * 幂等初始化：逐个 GET /api/collections/<name>，404 则创建，200 跳过。
 * 返回已就绪的 collection 名单（供诊断/日志）。
 */
export async function initCollections(pb: PbClient): Promise<string[]> {
  const ready: string[] = []
  for (const def of COLLECTIONS) {
    try {
      await pb.request('GET', `/api/collections/${def.name}`)
      ready.push(def.name)
    } catch (error) {
      const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : undefined
      if (status !== 404) throw error
      await pb.request('POST', '/api/collections', collectionBody(def))
      ready.push(def.name)
    }
  }
  return ready
}
