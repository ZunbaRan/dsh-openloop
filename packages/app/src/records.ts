/**
 * 受控记录查询（db-browser 预设的数据通道）：
 * - collection 白名单 = 门面管理的 6 张业务表（系统表/_authers 一律拒）
 * - q 关键词：取 collection 的 text 字段构建 PB 过滤器（field ~ "q" 的 OR 串）
 * - 分页参数钳制（page ≥1；perPage 5–100 默认 20）
 * 返回行**原样透传**（门面 collections 的字段均无敏感信息——keySecret 仅 apis 表有，
 * 该表经此通道返回行时显式剥离 keySecret）。
 */
import type { PbClient } from './pb-client.ts'
import { COLLECTIONS } from './schema.ts'

export const RECORDS_MIN_PER_PAGE = 5
export const RECORDS_MAX_PER_PAGE = 100
export const RECORDS_DEFAULT_PER_PAGE = 20

/** 敏感字段剥离（apis.keySecret）——受控查询通道绝不回显凭据 */
const STRIP_FIELDS = new Set(['keySecret'])

export function isManagedCollection(name: string): boolean {
  return COLLECTIONS.some(c => c.name === name)
}

export interface RecordsPage {
  collection: string
  items: Array<Record<string, unknown>>
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

interface PbField {
  name?: unknown
  type?: unknown
}

interface PbCollectionSchema {
  fields?: PbField[]
}

interface PbListResult {
  items?: Array<Record<string, unknown>>
  totalItems?: number
  totalPages?: number
  page?: number
  perPage?: number
}

/** 钳制分页参数（非法输入回落默认值，不抛错——查询参数宽松语义） */
export function clampPaging(page: unknown, perPage: unknown): { page: number; perPage: number } {
  const p = typeof page === 'string' && /^\d+$/.test(page) ? Number(page) : 1
  const pp = typeof perPage === 'string' && /^\d+$/.test(perPage) ? Number(perPage) : RECORDS_DEFAULT_PER_PAGE
  return {
    page: Math.max(1, Math.floor(p)),
    perPage: Math.min(RECORDS_MAX_PER_PAGE, Math.max(RECORDS_MIN_PER_PAGE, Math.floor(pp))),
  }
}

/** 关键词 → PB 过滤器（text 字段的 OR like 串；空白/无 text 字段返回 null = 不过滤） */
export function buildKeywordFilter(fields: PbField[], q: string): string | null {
  const textFields = fields
    .map(f => typeof f.name === 'string' ? f.name : '')
    .filter(name => name.length > 0)
  if (textFields.length === 0) return null
  const escaped = q.trim().replaceAll('"', '')
  if (escaped.length === 0) return null
  return textFields.map(f => `${f} ~ "${escaped}"`).join(' || ')
}

export async function listRecordsPaged(pb: PbClient, collection: string, page: number, perPage: number, q: string | undefined): Promise<RecordsPage> {
  const schema = await pb.request<PbCollectionSchema>('GET', `/api/collections/${collection}`)
  const fields = Array.isArray(schema?.fields) ? schema.fields : []
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage) })
  const keyword = typeof q === 'string' ? q.trim() : ''
  if (keyword.length > 0) {
    const filter = buildKeywordFilter(fields, keyword)
    if (filter !== null) params.set('filter', filter)
  }
  const res = await pb.request<PbListResult>('GET', `/api/collections/${collection}/records?${params.toString()}`)
  const items = (Array.isArray(res?.items) ? res.items : []).map(row => {
    const clean: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      if (!STRIP_FIELDS.has(key)) clean[key] = value
    }
    return clean
  })
  return {
    collection,
    items,
    page: typeof res?.page === 'number' ? res.page : page,
    perPage: typeof res?.perPage === 'number' ? res.perPage : perPage,
    totalItems: typeof res?.totalItems === 'number' ? res.totalItems : items.length,
    totalPages: typeof res?.totalPages === 'number' ? res.totalPages : 1,
  }
}

/** 全部管理表的记录数（pb-stats / collections 下拉用） */
export async function collectionCounts(pb: PbClient): Promise<Array<{ name: string; count: number }>> {
  const counts: Array<{ name: string; count: number }> = []
  for (const def of COLLECTIONS) {
    const params = new URLSearchParams({ page: '1', perPage: '1' })
    const res = await pb.request<PbListResult>('GET', `/api/collections/${def.name}/records?${params.toString()}`)
    counts.push({ name: def.name, count: typeof res?.totalItems === 'number' ? res.totalItems : 0 })
  }
  return counts.sort((a, b) => a.name.localeCompare(b.name))
}
