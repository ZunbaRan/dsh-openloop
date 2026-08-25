/**
 * 内存 PocketBase fake（facade / records 单测共用）。
 * 支持的 filter 语法（覆盖门面与受控查询用到的全部形态）：
 * `a = "v"`（等值）· `a ~ "v"`（子串）· `expr || expr`（OR）· `id != ""`（全量）
 */
import type { PbClient } from '../src/pb-client.ts'

type Row = Record<string, unknown>

export class FakePb implements PbClient {
  private records = new Map<string, Row[]>()
  private seq = 0

  private matchOne(record: Row, clause: string): boolean {
    const eq = /^(\w+) = "(.*)"$/.exec(clause)
    if (eq !== null) {
      const field = eq[1] as string
      return String(record[field]) === eq[2]
    }
    const like = /^(\w+) ~ "(.*)"$/.exec(clause)
    if (like !== null) {
      const field = like[1] as string
      return String(record[field] ?? '').includes(like[2] as string)
    }
    if (clause === 'id != ""') return true
    throw new Error(`FakePb: unsupported filter clause "${clause}"`)
  }

  private parseFilter(filter: string): (record: Row) => boolean {
    return record => filter.split(' || ').some(clause => this.matchOne(record, clause))
  }

  async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const url = new URL(path, 'http://fake.pb')
    const segments = url.pathname.split('/').filter(Boolean)
    if (segments[0] !== 'api' || segments[1] !== 'collections') {
      throw new Error(`FakePb: unsupported path ${path}`)
    }
    const collection = segments[2]

    if (segments.length === 2 && method === 'POST') {
      this.records.set(String((body as { name: string }).name), [])
      return body as T
    }
    if (segments.length === 3 && method === 'GET' && collection !== undefined) {
      if (!this.records.has(collection)) throw Object.assign(new Error('not found'), { status: 404 })
      return { name: collection, fields: this.fieldsOf(collection) } as T
    }
    if (segments[3] !== 'records' || collection === undefined) throw new Error(`FakePb: unsupported path ${path}`)
    const rows = this.records.get(collection)
    if (rows === undefined) throw new Error(`FakePb: unknown collection ${collection}`)
    const recordId = segments[4]

    if (recordId === undefined) {
      if (method === 'GET') {
        const filter = url.searchParams.get('filter') ?? 'id != ""'
        const items = rows.filter(this.parseFilter(filter))
        const perPage = Number(url.searchParams.get('perPage') ?? '30')
        const page = Number(url.searchParams.get('page') ?? '1')
        const start = (page - 1) * perPage
        const paged = items.slice(start, start + perPage)
        return { items: paged, totalItems: items.length, totalPages: Math.max(1, Math.ceil(items.length / perPage)), page, perPage } as T
      }
      if (method === 'POST') {
        const record = { id: `rec${++this.seq}`, ...(body as Row) }
        rows.push(record)
        return record as T
      }
      throw new Error(`FakePb: unsupported ${method} on records`)
    }
    const index = rows.findIndex(r => r.id === recordId)
    if (index === -1) throw Object.assign(new Error('not found'), { status: 404 })
    if (method === 'PATCH') {
      rows[index] = { ...rows[index]!, ...(body as Row) }
      return rows[index] as T
    }
    if (method === 'DELETE') {
      rows.splice(index, 1)
      return undefined as T
    }
    if (method === 'GET') return rows[index] as T
    throw new Error(`FakePb: unsupported ${method} on records/${recordId}`)
  }

  /** 按值类型推断 text 字段（GET /api/collections/:name 的 fields 响应） */
  private fieldsOf(collection: string): Array<{ name: string; type: string }> {
    const rows = this.records.get(collection) ?? []
    const first = rows.find(r => Object.keys(r).length > 0)
    if (first === undefined) return []
    return Object.entries(first)
      .filter(([key]) => key !== 'id')
      .map(([name, value]) => ({ name, type: typeof value === 'number' ? 'number' : 'text' }))
  }

  /** 测试助手：直接放底层数据 */
  seed(collection: string, rows: Row[]): void {
    this.records.set(collection, rows.map((r, i) => ({ id: `rec${i + 1}`, ...r })))
  }
}
