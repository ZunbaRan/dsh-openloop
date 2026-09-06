import { describe, expect, it } from 'vitest'
import { CanvasStorage, workspaceKeyOf } from '../src/storage.ts'
import type { CanvasSnapshot } from '../src/dsl.ts'

/** 测试注入相对根（默认是 $DSH_HOME/data 绝对路径——不污染真实 home） */
const TEST_ROOT = 'qoder-canvas'

/** 内存 FsLike 模拟（seam 注入，对齐 0.1.2 真实 API：async resolve + target + listDir） */
function memFs() {
  const files = new Map<string, string>()
  const written: { path: string; policy: unknown }[] = []
  const fs = {
    resolve: async (path: string) => ({ targetKey: path }),
    readText: async (target: { targetKey?: string }) => {
      const p = target.targetKey ?? ''
      const v = files.get(p)
      if (v === undefined) throw new Error('ENOENT')
      return v
    },
    writeText: async (target: { targetKey?: string }, content: string, _encoding?: unknown, _signal?: unknown, policy?: unknown) => {
      files.set(target.targetKey ?? '', content)
      written.push({ path: target.targetKey ?? '', policy })
    },
    listDir: async (target: { targetKey?: string }) => {
      const dir = (target.targetKey ?? '').replace(/\/$/, '')
      const children = new Set<string>()
      for (const key of files.keys()) {
        if (!key.startsWith(`${dir}/`)) continue
        const rest = key.slice(dir.length + 1)
        const first = rest.split('/')[0] ?? ''
        if (first.length > 0) children.add(rest.includes('/') ? first : rest)
      }
      return [...children].map(name => ({ name, type: files.has(`${dir}/${name}`) ? 'file' as const : 'directory' as const }))
    },
  }
  return { fs, files, written }
}

function snap(canvasId: string, revision: number): CanvasSnapshot {
  return {
    kind: 'qoder-canvas', version: 1, canvasId, revision,
    canvas: { title: `t-${revision}`, layout: 'grid', nodes: [{ id: 'n1', type: 'callout', props: { text: 'x' } }], edges: [] },
  }
}

describe('CanvasStorage', () => {
  it('saves and reads back a snapshot (policy passed through)', async () => {
    const { fs, written } = memFs()
    const policy = { marker: 'sandbox' }
    const store = new CanvasStorage({ fs, policy, workspaceKey: 'ws1', rootDir: TEST_ROOT })
    await store.save(snap('cv_aaaa1111', 1))
    const back = await store.read('cv_aaaa1111', 1)
    expect(back?.canvas.title).toBe('t-1')
    expect(written[0]?.policy).toBe(policy)
    expect(written[0]?.path).toContain('ws1/cv_aaaa1111/1.json')
  })

  it('snapshots are immutable: same id different revs coexist', async () => {
    const { fs } = memFs()
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1', rootDir: TEST_ROOT })
    await store.save(snap('cv_aaaa1111', 1))
    await store.save(snap('cv_aaaa1111', 2))
    expect((await store.read('cv_aaaa1111', 1))?.canvas.title).toBe('t-1')
    expect((await store.read('cv_aaaa1111', 2))?.canvas.title).toBe('t-2')
  })

  it('latest() finds the highest revision', async () => {
    const { fs } = memFs()
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1', rootDir: TEST_ROOT })
    await store.save(snap('cv_aaaa1111', 1))
    await store.save(snap('cv_aaaa1111', 3))
    expect((await store.latest('cv_aaaa1111'))?.revision).toBe(3)
  })

  it('list(): listDir scan — entries with accumulated revisions', async () => {
    const { fs } = memFs()
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1', rootDir: TEST_ROOT })
    await store.save(snap('cv_aaaa1111', 1))
    await store.save(snap('cv_aaaa1111', 2))
    await store.save(snap('cv_bbbb2222', 1))
    const items = await store.list()
    expect(items).toHaveLength(2)
    const a = items.find(i => i.canvasId === 'cv_aaaa1111')
    expect(a?.revision).toBe(2)
    expect(a?.revisions).toEqual([1, 2])
    expect(a?.title).toBe('t-2') // 标题跟最新
    const b = items.find(i => i.canvasId === 'cv_bbbb2222')
    expect(b?.revisions).toEqual([1])
  })

  it('list(): corrupt revision file is skipped, others survive', async () => {
    const { fs, files } = memFs()
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1', rootDir: TEST_ROOT })
    await store.save(snap('cv_aaaa1111', 1))
    await store.save(snap('cv_bbbb2222', 1))
    files.set('qoder-canvas/ws1/cv_bbbb2222/1.json', '{broken json')
    const items = await store.list()
    expect(items.map(i => i.canvasId)).toEqual(['cv_aaaa1111'])
  })

  it('list(): workspace isolation via listDir', async () => {
    const { fs } = memFs()
    const storeA = new CanvasStorage({ fs, workspaceKey: 'wsA', rootDir: TEST_ROOT })
    const storeB = new CanvasStorage({ fs, workspaceKey: 'wsB', rootDir: TEST_ROOT })
    await storeA.save(snap('cv_aaaa1111', 1))
    await storeB.save(snap('cv_bbbb2222', 1))
    expect((await storeA.list()).map(i => i.canvasId)).toEqual(['cv_aaaa1111'])
    expect((await storeB.list()).map(i => i.canvasId)).toEqual(['cv_bbbb2222'])
  })

  it('workspace isolation: same id in different workspace invisible', async () => {
    const { fs } = memFs()
    const storeA = new CanvasStorage({ fs, workspaceKey: 'wsA', rootDir: TEST_ROOT })
    const storeB = new CanvasStorage({ fs, workspaceKey: 'wsB', rootDir: TEST_ROOT })
    await storeA.save(snap('cv_aaaa1111', 1))
    expect(await storeB.latest('cv_aaaa1111')).toBeNull()
  })

  it('read returns null for corrupted json', async () => {
    const { fs, files } = memFs()
    files.set('qoder-canvas/ws1/cv_aaaa1111/1.json', '{broken')
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1', rootDir: TEST_ROOT })
    expect(await store.read('cv_aaaa1111', 1)).toBeNull()
  })

  it('read rejects mismatched canvasId inside snapshot', async () => {
    const { fs } = memFs()
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1', rootDir: TEST_ROOT })
    await store.save(snap('cv_aaaa1111', 1))
    // 伪装文件：canvasId 不匹配 → null（防目录名欺骗）
    const wrong = { ...snap('cv_bbbb2222', 1) }
    const fs2 = { ...fs, readText: async () => JSON.stringify(wrong) }
    const store2 = new CanvasStorage({ fs: fs2, workspaceKey: 'ws1' })
    expect(await store2.read('cv_aaaa1111', 1)).toBeNull()
  })
})

describe('workspaceKeyOf', () => {
  it('encodes path separators', () => {
    expect(workspaceKeyOf('/Users/x/project')).toBe('_Users_x_project')
  })
  it('handles undefined cwd', () => {
    expect(workspaceKeyOf(undefined)).toBe('_no-cwd')
  })
})
