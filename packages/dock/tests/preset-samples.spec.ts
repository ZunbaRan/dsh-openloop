/**
 * 内置 APP 示例 props 契约测试（M2）：
 * APP tab 的 pin 以「合法最小示例 props」建面板实例——panels 的 validate 是
 * fail-closed，示例 props 必须全部过检，否则 pin 出来的 tile 渲染降级。
 *
 * 直接 import panels 源码的 presets registry（monorepo 相对路径）：
 * 1. 逐一 validate：presetSamples 每条过检
 * 2. 覆盖完整性：panels registry 新增预设而 dock 未补条目时预警（该 kind 会从
 *    APP 列表消失——清单过滤掉无条目的 kind）
 * 3. buildPanelMetaForComponent 构造的 meta 与 PanelMeta 契约一致
 */
import { describe, expect, it } from 'vitest'
import { allPresetKinds, getPreset, type PresetModule } from '../../panels/src/presets/index.ts'
import { buildPanelMetaForComponent, presetSamples, type AppComponentDescriptor } from '../src/client/app-registry.ts'
import { BUILTIN_KINDS } from '../../app/src/seed.ts'

const comp = (kind: string): AppComponentDescriptor => ({
  id: `openloop:${kind}`,
  title: '测试组件',
  type: 'panel',
  desc: '',
  kind,
  pinnable: true,
})

describe('内置 APP 示例 props 过 panels validate', () => {
  for (const [kind, props] of Object.entries(presetSamples)) {
    it(`${kind} 示例 props 合法`, () => {
      const preset: PresetModule | undefined = getPreset(kind as Parameters<typeof getPreset>[0])
      expect(preset, `kind "${kind}" 不在 panels registry——PRESET_INFO 有死条目`).toBeDefined()
      expect(preset?.validate(props).ok, `kind "${kind}" 的示例 props 未过检（pin 出的 tile 会降级）`).toBe(true)
    })
  }
})

describe('示例表与 panels registry 同步', () => {
  it('presetSamples 覆盖全部已实现 kind（无遗漏）', () => {
    const kinds = allPresetKinds()
    const missing = kinds.filter(k => presetSamples[k] === undefined)
    expect(missing, `panels 新增了预设但 dock PRESET_INFO 未补：${missing.join(', ')}——这些 kind 会从 APP 列表消失`).toEqual([])
  })

  it('presetSamples 无死条目（panels 已移除的 kind）', () => {
    const kinds = new Set(allPresetKinds() as string[])
    const dead = Object.keys(presetSamples).filter(k => !kinds.has(k))
    expect(dead, `PRESET_INFO 条目对应的预设已不存在：${dead.join(', ')}`).toEqual([])
  })

  it('三方一致：panels kinds = dock PRESET_INFO = app BUILTIN_KINDS（人工同步的漂移告警）', () => {
    const panels = [...allPresetKinds()].sort()
    const dockTable = Object.keys(presetSamples).sort()
    const appSeed = [...BUILTIN_KINDS].sort()
    expect(dockTable).toEqual(panels)
    expect(appSeed).toEqual(panels)
  })
})

describe('buildPanelMetaForComponent', () => {
  it('构造的 meta 符合 PanelMeta 契约（panel.id = kind → 来源 ID 命名即寻址）', () => {
    const built = buildPanelMetaForComponent(comp('metric-grid'))
    expect(built).not.toBeNull()
    const { kind, meta } = built as { kind: 'panel'; meta: unknown }
    expect(kind).toBe('panel')
    const m = meta as {
      kind: string; version: number
      panel: { $schema: string; id: string; title: string; widgets: Array<{ id: string; source: { type: string; kind: string; props: unknown } }> }
      resolved: Record<string, unknown>; resolvedAt: string
    }
    expect(m.kind).toBe('openloop.panel')
    expect(m.version).toBe(1)
    expect(m.panel.$schema).toBe('openloop.panel/v1')
    expect(m.panel.id).toBe('metric-grid')
    expect(m.panel.title).toBe('测试组件')
    expect(m.panel.widgets).toHaveLength(1)
    expect(m.panel.widgets[0]?.source.type).toBe('preset')
    expect(m.panel.widgets[0]?.source.kind).toBe('metric-grid')
    // 示例 props 原样进 widget
    expect(m.panel.widgets[0]?.source.props).toEqual(presetSamples['metric-grid'])
    expect(m.resolved).toEqual({})
    expect(m.resolvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('无渲染数据的组件（门面组件）返回 null', () => {
    const foreign: AppComponentDescriptor = { id: 'my-sales:weekly', title: '周度业绩', type: 'panel', desc: '', kind: '', pinnable: false, entry: 'openloop-panels/my-sales-weekly.json' }
    expect(buildPanelMetaForComponent(foreign)).toBeNull()
  })
})

describe('entry 渲染闭环（v1 契约：entry.panel 内联 PanelDefinition）', () => {
  const panelDef = {
    $schema: 'openloop.panel/v1',
    id: 'my-sales-weekly',
    title: '周度业绩',
    widgets: [{ id: 'w1', source: { type: 'preset', kind: 'metric-grid', props: { items: [{ id: 'a', label: '订单', value: 42 }] } } }],
  }

  it('entry.panel 合法 → 构造 PanelMeta（resolved 空，onLoad 刷新兜底）', () => {
    const comp: AppComponentDescriptor = { id: 'my-sales:my-sales-weekly', title: '周度业绩', type: 'panel', desc: '', kind: '', pinnable: true, entry: { panel: panelDef } }
    const built = buildPanelMetaForComponent(comp)
    expect(built).not.toBeNull()
    const meta = built!.meta as { kind: string; version: number; panel: typeof panelDef; resolved: Record<string, unknown>; resolvedAt: string }
    expect(meta.kind).toBe('openloop.panel')
    expect(meta.version).toBe(1)
    expect(meta.panel).toEqual(panelDef)
    expect(meta.resolved).toEqual({})
  })

  it('entry 为文件路径字符串 / 畸形 panel / 无 widgets → null（待生成）', () => {
    const mk = (entry: unknown): AppComponentDescriptor => ({ id: 'x:y', title: 't', type: 'panel', desc: '', kind: '', pinnable: false, entry })
    expect(buildPanelMetaForComponent(mk('openloop-panels/foo.json'))).toBeNull()
    expect(buildPanelMetaForComponent(mk({ panel: 'not-an-object' }))).toBeNull()
    expect(buildPanelMetaForComponent(mk({ panel: { id: 'p', title: 't', widgets: [] } }))).toBeNull()
    expect(buildPanelMetaForComponent(mk({ panel: { id: '', title: 't', widgets: [{ id: 'w' }] } }))).toBeNull()
    expect(buildPanelMetaForComponent(mk(undefined))).toBeNull()
    expect(buildPanelMetaForComponent(mk({}))).toBeNull()
  })

  it('内置组件优先于 entry（kind 命中 PRESET_INFO 时走示例 props）', () => {
    const comp: AppComponentDescriptor = { id: 'openloop:metric-grid', title: '指标', type: 'panel', desc: '', kind: 'metric-grid', pinnable: true, entry: { panel: panelDef } }
    const meta = buildPanelMetaForComponent(comp)!.meta as { panel: { id: string } }
    expect(meta.panel.id).toBe('metric-grid') // 走 PRESET_INFO，不是 entry
  })

  it('宽松形态：裸 PanelDefinition（agent 平铺写法）也接受', () => {
    const flat: AppComponentDescriptor = { id: 'x:flat', title: 't', type: 'panel', desc: '', kind: '', pinnable: true, entry: { id: 'flat', title: 'f', widgets: [{ id: 'w' }] } }
    expect(buildPanelMetaForComponent(flat)).not.toBeNull()
  })

  it('裸形态与 { panel } 形态在 meta 构造上均非空', () => {
    const flat: AppComponentDescriptor = { id: 'a', title: 't', type: 'panel', desc: '', kind: '', pinnable: true, entry: { id: 'a', title: 't', widgets: [{ id: 'w' }] } }
    const wrapped: AppComponentDescriptor = { ...flat, entry: { panel: { id: 'a', title: 't', widgets: [{ id: 'w' }] } } }
    expect(buildPanelMetaForComponent(flat)).not.toBeNull()
    expect(buildPanelMetaForComponent(wrapped)).not.toBeNull()
  })
})
