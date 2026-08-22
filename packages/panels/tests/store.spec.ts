import { describe, expect, it } from 'vitest'
import type { PanelDefinition } from '../src/contract.ts'
import { createMemoryPanelFs, createPanelStore, loadPanel, listPanels, PLUGIN_VERSION, savePanel } from '../src/store.ts'

function validPanel(overrides: Partial<PanelDefinition> = {}): PanelDefinition {
  return {
    $schema: 'openloop.panel/v1',
    id: 'ops-dashboard',
    title: '运维大盘',
    widgets: [
      { id: 'title', source: { type: 'preset', kind: 'heading', props: { text: '概览', level: 1 } } },
      { id: 'stat', source: { type: 'preset', kind: 'metric', props: { label: '在线', value: 42 } } },
    ],
    persist: true,
    ...overrides,
  }
}

function setup(dir = 'openloop-panels') {
  const fs = createMemoryPanelFs()
  const store = createPanelStore({ dir, fs })
  return { fs, store }
}

describe('store.save（§11 写盘）', () => {
  it('写入 <dir>/<id>.json，内容为 PanelDefinition 全量 + savedAt + pluginVersion', async () => {
    const { fs, store } = setup()
    const { path } = await store.save(validPanel())
    expect(path).toBe('openloop-panels/ops-dashboard.json')
    const raw = fs.snapshot().get(path)
    expect(raw).toBeDefined()
    const record = JSON.parse(raw!) as Record<string, unknown>
    expect(record.pluginVersion).toBe(PLUGIN_VERSION)
    expect(typeof record.savedAt).toBe('string')
    expect(new Date(record.savedAt as string).getTime()).not.toBeNaN()
    const savedPanel = record.panel as PanelDefinition
    expect(savedPanel.$schema).toBe('openloop.panel/v1')
    expect(savedPanel.id).toBe('ops-dashboard')
    expect(savedPanel.title).toBe('运维大盘')
    expect(savedPanel.widgets).toHaveLength(2)
  })

  it('同 id 再次保存 = 覆盖更新', async () => {
    const { fs, store } = setup()
    await store.save(validPanel())
    await store.save(validPanel({ title: '运维大盘 v2' }))
    const record = JSON.parse(fs.snapshot().get('openloop-panels/ops-dashboard.json')!) as { panel: PanelDefinition }
    expect(record.panel.title).toBe('运维大盘 v2')
  })

  it('非法面板拒绝写盘（fail-closed）', async () => {
    const { fs, store } = setup()
    await expect(store.save(validPanel({ title: 'x'.repeat(121) }))).rejects.toThrow(/120/)
    expect(fs.snapshot().size).toBe(0)
  })

  it('自定义目录注入生效（测试不落真 DSH home）', async () => {
    const { fs, store } = setup('test-tmp/openloop-panels')
    const { path } = await store.save(validPanel())
    expect(path).toBe('test-tmp/openloop-panels/ops-dashboard.json')
    expect(fs.snapshot().has(path)).toBe(true)
  })
})

describe('store.load（§11 读盘容错）', () => {
  it('读回完整 StoredPanel', async () => {
    const { store } = setup()
    await store.save(validPanel())
    const stored = await store.load('ops-dashboard')
    expect(stored?.panel.title).toBe('运维大盘')
    expect(stored?.pluginVersion).toBe(PLUGIN_VERSION)
  })

  it('损坏 JSON 容错返回 undefined', async () => {
    const { fs, store } = setup()
    fs.snapshot().set('openloop-panels/corrupt.json', '{not valid json')
    await expect(store.load('corrupt')).resolves.toBeUndefined()
  })

  it('形状不符（panel 缺 $schema / id 不匹配）返回 undefined', async () => {
    const { fs, store } = setup()
    fs.snapshot().set('openloop-panels/bad.json', JSON.stringify({ panel: { title: 'x' }, savedAt: new Date().toISOString(), pluginVersion: '0.1.0' }))
    await expect(store.load('bad')).resolves.toBeUndefined()
    fs.snapshot().set('openloop-panels/wrong-id.json', JSON.stringify({ panel: { $schema: 'openloop.panel/v1', id: 'other' }, savedAt: '', pluginVersion: '' }))
    await expect(store.load('wrong-id')).resolves.toBeUndefined()
  })

  it('不存在 / 非法 id 返回 undefined', async () => {
    const { store } = setup()
    await expect(store.load('missing')).resolves.toBeUndefined()
    await expect(store.load('../evil')).resolves.toBeUndefined()
    await expect(store.load('UPPER')).resolves.toBeUndefined()
  })
})

describe('store.list（按 savedAt 新→旧）', () => {
  it('列出全部可读面板，损坏文件被跳过', async () => {
    const { fs, store } = setup()
    await store.save(validPanel({ id: 'panel-a', title: 'A' }))
    await store.save(validPanel({ id: 'panel-b', title: 'B' }))
    fs.snapshot().set('openloop-panels/corrupt.json', 'oops')
    const panels = await store.list()
    expect(panels.map(p => p.panel.id).sort()).toEqual(['panel-a', 'panel-b'])
  })

  it('目录为空 / 不存在返回空数组', async () => {
    const { store } = setup()
    await expect(store.list()).resolves.toEqual([])
  })
})

describe('命名 API（S4 skill 唤起用）', () => {
  it('savePanel/loadPanel/listPanels 与 store 方法等价', async () => {
    const { store } = setup()
    await savePanel(validPanel(), store)
    expect((await loadPanel('ops-dashboard', store))?.panel.title).toBe('运维大盘')
    expect(await listPanels(store)).toHaveLength(1)
  })
})
