/**
 * 真二进制 e2e（PocketBase 子进程全链路）：ensureBinary（下载/缓存）→ startPocketBase
 * （superuser upsert → serve → health）→ initCollections → facade CRUD → stop。
 *
 * 环境：需要网络（首启下载 ~12MB 到 DSH_HOME 缓存）或 OPENLOOP_PB_BIN；
 * 用临时目录做 DSH_HOME（绝不落真 home）。二进制缓存目录也指向临时目录 + 复用
 * 真缓存二进制（若存在）以省流量——直接探测真缓存路径，存在则 binPath 覆盖。
 */
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startPocketBase, PB_VERSION, type RunningPb, type PbProcessOptions } from '../src/pb-process.ts'
import { createPbClient } from '../src/pb-client.ts'
import { initCollections } from '../src/schema.ts'
import { createAppFacade, type AppFacade } from '../src/facade.ts'

// 真缓存里已有二进制则复用（避免 CI/重复跑都下载）；否则由 e2e 首跑下载
function cachedBin(): string | undefined {
  const candidates = [
    process.env.OPENLOOP_PB_BIN,
    join(process.env.DSH_HOME ?? '', 'cache', 'pocketbase', PB_VERSION, 'pocketbase'),
    join(process.env.HOME ?? '', '.dsh', 'cache', 'pocketbase', PB_VERSION, 'pocketbase'),
  ]
  return candidates.find(p => typeof p === 'string' && p.length > 0 && existsSync(p))
}

const bin = cachedBin()
const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms))
const describeReal = bin === undefined && process.env.APP_E2E_SKIP_DOWNLOAD === '1'
  ? describe.skip
  : describe

describeReal('app backend e2e（真 PocketBase 子进程）', () => {
  let home: string
  let pb: RunningPb
  let facade: AppFacade

  const quietLogger = { info: () => {}, warn: () => {}, error: () => {} }

  const startOpts = (): PbProcessOptions => {
    const opts: PbProcessOptions = { dshHome: home, logger: quietLogger }
    if (bin !== undefined) opts.binPath = bin
    return opts
  }

  beforeAll(async () => {
    home = mkdtempSync(join(tmpdir(), 'openloop-app-e2e-'))
    pb = await startPocketBase(startOpts())
    const client = createPbClient(pb.baseUrl, pb.credentials)
    const ready = await initCollections(client)
    expect(ready.sort()).toEqual(['api_usage', 'apis', 'app_events', 'apps', 'boards', 'components', 'meta', 'tiles'])
    facade = createAppFacade(client)
  }, 120_000)

  afterAll(async () => {
    await pb?.stop()
    if (home !== undefined) rmSync(home, { recursive: true, force: true })
  })

  it('启动就绪：health 可达 + 端口为 127.0.0.1 动态端口', async () => {
    const res = await fetch(`${pb.baseUrl}/api/health`)
    expect(res.ok).toBe(true)
    expect(pb.baseUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
  })

  it('collections 全部创建（幂等重跑不炸）', async () => {
    const client = createPbClient(pb.baseUrl, pb.credentials)
    const again = await initCollections(client)
    expect(again).toHaveLength(8)
  })

  it('Agent 全流程：注册 APP → 登记 API → 配凭据 → 状态只报 configured', async () => {
    await facade.upsertApp({ name: 'my-sales', displayName: '我的销售看板', kind: 'local', version: '0.1.0', description: 'e2e' })
    await facade.registerApi('my-sales', { rid: 'my-sales:orders', domain: 'api.example.com', path: '/v1/orders', authType: 'key', summary: '订单' })
    await facade.setApiKey('my-sales:orders', 'sk-e2e-secret')
    const detail = await facade.getAppDetail('my-sales')
    expect(detail?.apis[0]?.configured).toBe(true)
    expect(JSON.stringify(detail)).not.toContain('sk-e2e-secret')
    // 数据落盘：另一个 client 实例读同一 PB（验证不是内存态）
    const detail2 = await createAppFacade(createPbClient(pb.baseUrl, pb.credentials)).getAppDetail('my-sales')
    expect(detail2?.apis[0]?.configured).toBe(true)
  })

  it('dock state 保存→加载回环（真 SQLite 落盘）', async () => {
    const state = {
      version: 2 as const,
      boards: [{
        id: 'b-default', name: '默认看板',
        tiles: [{
          tileId: 't1', title: '指标卡',
          source: { kind: 'panel' as const, meta: { panel: { id: 'metric-grid' } } },
          layout: { column: 0, row: 0, columns: 6, rows: 4 },
          origin: null, createdAt: 1, alias: '我的指标',
        }],
      }],
      activeBoardId: 'b-default',
    }
    const saved = await facade.saveDockState(state)
    expect(saved).toEqual({ boards: 1, tiles: 1 })
    expect(await facade.loadDockState()).toEqual(state)
  })

  it('停进程后数据仍在（重启同一数据目录）', async () => {
    await pb.stop()
    const restarted = await startPocketBase(startOpts())
    try {
      const client = createPbClient(restarted.baseUrl, restarted.credentials)
      await initCollections(client)
      const state = await createAppFacade(client).loadDockState()
      expect(state?.boards[0]?.tiles[0]?.alias).toBe('我的指标')
    } finally {
      await restarted.stop()
    }
  })

  it('P2 守护：SIGKILL 杀掉 PB → watchdog 自动重启 → 数据仍在（backend 级）', async () => {
    const { createAppBackend } = await import('../src/backend.ts')
    const backend = createAppBackend({
      dshHome: home,
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      ...(bin !== undefined ? { binPath: bin } : {}),
    })
    await backend.start()
    const before = backend.status()
    expect(before.state).toBe('running')
    expect(before.restarts).toBe(0)

    // 写入数据 → SIGKILL 模拟崩溃（不走 stop()——那是意图性停止）
    const facade = await backend.ready()
    await facade.upsertApp({ name: 'crash-test', displayName: '崩溃测试', kind: 'local', version: '0.1.0' })
    const port = before.baseUrl ? Number(new URL(before.baseUrl).port) : 0
    expect(port).toBeGreaterThan(0)
    const { execSync } = await import('node:child_process')
    let pbPid = ''
    try {
      pbPid = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' }).trim().split('\n')[0] ?? ''
    } catch { /* lsof 不可用则跳过 */ }
    if (pbPid.length > 0) {
      process.kill(Number(pbPid), 'SIGKILL')
      // watchdog 退避 2s 起步——等自动重启完成
      const deadline = Date.now() + 15_000
      while (Date.now() < deadline) {
        await sleep(300)
        if (backend.status().state === 'running' && backend.status().restarts === 1) break
      }
      const after = backend.status()
      expect(after.state).toBe('running')
      expect(after.restarts).toBe(1)
      // 数据在（同一 dataDir）
      const healed = await backend.ready()
      const apps = await healed.listApps()
      expect(apps.some(a => a.name === 'crash-test')).toBe(true)
    }
    await backend.stop()
  }, 30_000)
})
