import { describe, expect, it, vi } from 'vitest'
import { loadPackComponent, packEntryUrl } from '../../src/packs/loader.ts'

const PACK = '@acme/dsh-pack-fancy'
const COMPONENT = 'FancyCard'

describe('loadPackComponent（§12 宿主车道加载器）', () => {
  it('mock import 成功：返回默认导出的组件函数', async () => {
    const Component = () => null
    const importModule = vi.fn(async () => ({ default: Component }))
    const loaded = await loadPackComponent(PACK, COMPONENT, { title: 'x' }, { importModule })
    expect(importModule).toHaveBeenCalledWith(`/openloop/packs/${PACK}/entry.js`)
    expect(loaded).toBe(Component)
  })

  it('mock import 失败：抛可读错误（含 pack 名与 entry URL）', async () => {
    const importModule = vi.fn(async () => { throw new Error('Failed to fetch') })
    await expect(loadPackComponent(PACK, COMPONENT, {}, { importModule }))
      .rejects.toThrow(/failed to load pack "@acme\/dsh-pack-fancy" component "FancyCard".*Failed to fetch.*entry\.js/)
  })

  it('模块无 default 导出 → 抛可读错误', async () => {
    const importModule = vi.fn(async () => ({ Widget: () => null }))
    await expect(loadPackComponent(PACK, COMPONENT, {}, { importModule }))
      .rejects.toThrow(/default-export a React component function.*no default export/)
  })

  it('default 导出非函数 → 抛可读错误', async () => {
    const importModule = vi.fn(async () => ({ default: { not: 'a component' } }))
    await expect(loadPackComponent(PACK, COMPONENT, {}, { importModule }))
      .rejects.toThrow(/does not default-export a React component function.*object/)
  })

  it('props 非 JSON 对象（数组 / null / 字符串）拒绝', async () => {
    const importModule = vi.fn()
    await expect(loadPackComponent(PACK, COMPONENT, [], { importModule })).rejects.toThrow(/props must be a JSON object/)
    await expect(loadPackComponent(PACK, COMPONENT, null, { importModule })).rejects.toThrow(/props must be a JSON object/)
    await expect(loadPackComponent(PACK, COMPONENT, 'x', { importModule })).rejects.toThrow(/props must be a JSON object/)
    expect(importModule).not.toHaveBeenCalled()
  })

  it('空 name / 空 component 拒绝', async () => {
    await expect(loadPackComponent('', COMPONENT, {})).rejects.toThrow(/non-empty pack name/)
    await expect(loadPackComponent(PACK, '', {})).rejects.toThrow(/non-empty component name/)
  })

  it('opts.entryUrl 可注入（测试/自定义 URL）', async () => {
    const Component = () => null
    const importModule = vi.fn(async () => ({ default: Component }))
    await loadPackComponent(PACK, COMPONENT, {}, { entryUrl: 'http://cdn.example/x.js', importModule })
    expect(importModule).toHaveBeenCalledWith('http://cdn.example/x.js')
  })
})

describe('packEntryUrl（§12 虚拟入口 URL 契约）', () => {
  it('scoped 名与裸名都拼进 pack 路由', () => {
    expect(packEntryUrl('@acme/dsh-pack-fancy')).toBe('/openloop/packs/@acme/dsh-pack-fancy/entry.js')
    expect(packEntryUrl('plain-pack')).toBe('/openloop/packs/plain-pack/entry.js')
  })
})
