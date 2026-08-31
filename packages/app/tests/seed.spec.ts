/**
 * 内置 APP 种子测试（FakePb）：
 * - 空库 seed → openloop APP + 38 组件 + 3 API；registryRev 不受 seed 影响（seed 在 backend 启动链里，rev 由 tool 层管理）
 * - 幂等：再次 seed 跳过（不覆盖用户修改）
 * - 删除后可重新 seed
 * - 与 dock PRESET_INFO 数量一致性（38——人工同步的漂移告警）
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { seedBuiltinApp, BUILTIN_KINDS } from '../src/seed.ts'
import { createAppFacade, type AppFacade } from '../src/facade.ts'
import { initCollections } from '../src/schema.ts'
import { FakePb } from './fake-pb.ts'

let facade: AppFacade

beforeEach(async () => {
  const pb = new FakePb()
  await initCollections(pb)
  facade = createAppFacade(pb)
})

describe('seedBuiltinApp', () => {
  it('空库 seed：openloop + 42 组件（38 预设 + 4 artifact 范例，全部可 pin 的合法 entry）+ 3 API', async () => {
    const result = await seedBuiltinApp(facade)
    expect(result).toEqual({ seeded: true, components: 42, apis: 3 })

    const detail = await facade.getAppDetail('openloop')
    expect(detail).toBeDefined()
    expect(detail!.components).toHaveLength(42)
    expect(detail!.apis).toHaveLength(3)
    // 全部 entry 形状合法：panel = 平铺 PanelDefinition（id/title/widgets）；
    // artifact = { artifact: ArtifactMeta }（few-shot 范例，0.5.2 起）
    for (const c of detail!.components) {
      if (c.kind === 'artifact') {
        const meta = (c.entry as { artifact?: { kind?: unknown; html?: unknown; runtime?: unknown } }).artifact
        expect(meta?.kind).toBe('openloop.html-artifact')
        expect(typeof meta?.html).toBe('string')
        expect(['static', 'scripts', 'network']).toContain(meta?.runtime)
        continue
      }
      const entry = c.entry as { id?: unknown; title?: unknown; widgets?: unknown }
      expect(typeof entry.id).toBe('string')
      expect(typeof entry.title).toBe('string')
      expect(Array.isArray(entry.widgets)).toBe(true)
      expect((entry.widgets as unknown[]).length).toBeGreaterThan(0)
    }
    // few-shot 范例四件齐
    const exampleRids = detail!.components.filter(c => c.kind === 'artifact').map(c => c.rid).sort()
    expect(exampleRids).toEqual([
      'openloop:example-agent-dashboard', 'openloop:example-backend-console',
      'openloop:example-system-map', 'openloop:example-usage-report',
    ])
    // API 形态
    expect(detail!.apis.map(a => a.rid).sort()).toEqual(['openloop:apis', 'openloop:boards', 'openloop:components'])
  })

  it('幂等：再次 seed 跳过（用户改过的 openloop 不被覆盖）', async () => {
    await seedBuiltinApp(facade)
    // 用户/agent 修改：加一个自定义组件
    await facade.registerComponent('openloop', { rid: 'openloop:my-custom', kind: 'panel', title: '用户加的' })
    // 再次 seed
    const again = await seedBuiltinApp(facade)
    expect(again.seeded).toBe(false)
    const detail = await facade.getAppDetail('openloop')
    // 用户加的还在，仍是 43 个组件
    expect(detail!.components).toHaveLength(43)
    expect(detail!.components.some(c => c.rid === 'openloop:my-custom')).toBe(true)
  })

  it('删除后可重新 seed', async () => {
    await seedBuiltinApp(facade)
    await facade.deleteApp('openloop')
    expect(await facade.getAppDetail('openloop')).toBeUndefined()
    const reseed = await seedBuiltinApp(facade)
    expect(reseed.seeded).toBe(true)
    expect((await facade.getAppDetail('openloop'))!.components).toHaveLength(42)
  })
})

describe('BUILTIN_KINDS 与 dock PRESET_INFO 数量一致性（漂移告警）', () => {
  it('38 个 kind（与 dock PRESET_INFO 同步——新增预设时两边都要更新）', () => {
    expect(BUILTIN_KINDS).toHaveLength(38)
    expect(new Set(BUILTIN_KINDS).size).toBe(38) // 无重复
    // 与 dock 侧 presetSamples 的 key 集合完全一致（防人工同步漂移）
    // dock 的表是 Record<string, ...>，这里只断言数量 + 抽样
    expect(BUILTIN_KINDS).toContain('metric-grid')
    expect(BUILTIN_KINDS).toContain('db-browser')
    expect(BUILTIN_KINDS).toContain('plugin-registry')
  })
})
