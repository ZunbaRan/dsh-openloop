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
    // 内置 artifact 四件齐（0.5.4 去掉 example 前缀）
    const exampleRids = detail!.components.filter(c => c.kind === 'artifact').map(c => c.rid).sort()
    expect(exampleRids).toEqual([
      'openloop:agent-dashboard', 'openloop:backend-console',
      'openloop:system-map', 'openloop:usage-report',
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

  it('0.5.4 命名迁移：旧 example-* rid 被删除，新 rid 注册且 entry.artifact 带 rid', async () => {
    // 模拟老部署：openloop 已存在，components 里只有旧 example-* rid
    const pb = new FakePb()
    await initCollections(pb)
    pb.seed('apps', [
      { name: 'openloop', displayName: 'OpenLoop', kind: 'builtin', version: '0.4.0', description: 'system app' },
    ])
    pb.seed('components', [
      { rid: 'openloop:example-system-map', appName: 'openloop', kind: 'artifact', title: '旧名', entry: { artifact: { kind: 'openloop.html-artifact', version: 1, title: '旧名', runtime: 'static', html: '<h1>old</h1>', path: 'openloop-examples/system-map-example.html' } }, description: '' },
      { rid: 'openloop:user-kept', appName: 'openloop', kind: 'panel', title: '用户组件', entry: null, description: '' },
    ])
    const f = createAppFacade(pb)
    const result = await seedBuiltinApp(f)
    // PATCH 升级路径（非全量 seed）
    expect(result.seeded).toBe(false)
    const detail = await f.getAppDetail('openloop')
    const rids = detail!.components.map(c => c.rid)
    // 旧 rid 已迁移删除，新 rid 已注册，用户组件保留
    expect(rids).not.toContain('openloop:example-system-map')
    expect(rids).toContain('openloop:system-map')
    expect(rids).toContain('openloop:user-kept')
    // 新 rid 的 entry.artifact 必须带 rid（sourceIdOf 依赖它显示已固定）
    const sysmap = detail!.components.find(c => c.rid === 'openloop:system-map')!
    expect((sysmap.entry as { artifact?: { rid?: unknown } }).artifact?.rid).toBe('openloop:system-map')
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
