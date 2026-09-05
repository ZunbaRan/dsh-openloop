import { describe, expect, it } from 'vitest'
import { CanvasStorage, workspaceKeyOf } from '../src/storage.ts'
import type { CanvasSnapshot } from '../src/dsl.ts'

/** 内存 FsLike 模拟（seam 注入，对齐 openloop 测试形态） */
function memFs() {
  const files = new Map<string, string>()
  const written: { path: string; policy: unknown }[] = []
  const fs = {
    resolve: (path: string) => path,
    readText: async (path: string) => files.get(path) ?? null,
    writeText: async (path: string, content: string, _encoding?: unknown, _signal?: unknown, policy?: unknown) => {
      files.set(path, content)
      written.push({ path, policy })
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
    const store = new CanvasStorage({ fs, policy, workspaceKey: 'ws1' })
    await store.save(snap('cv_aaaa1111', 1))
    const back = await store.read('cv_aaaa1111', 1)
    expect(back?.canvas.title).toBe('t-1')
    expect(written[0]?.policy).toBe(policy)
    expect(written[0]?.path).toContain('ws1/cv_aaaa1111/1.json')
  })

  it('snapshots are immutable: same id different revs coexist', async () => {
    const { fs } = memFs()
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1' })
    await store.save(snap('cv_aaaa1111', 1))
    await store.save(snap('cv_aaaa1111', 2))
    expect((await store.read('cv_aaaa1111', 1))?.canvas.title).toBe('t-1')
    expect((await store.read('cv_aaaa1111', 2))?.canvas.title).toBe('t-2')
  })

  it('latest() finds the highest revision', async () => {
    const { fs } = memFs()
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1' })
    await store.save(snap('cv_aaaa1111', 1))
    await store.save(snap('cv_aaaa1111', 3))
    expect((await store.latest('cv_aaaa1111'))?.revision).toBe(3)
  })

  it('workspace isolation: same id in different workspace invisible', async () => {
    const { fs } = memFs()
    const storeA = new CanvasStorage({ fs, workspaceKey: 'wsA' })
    const storeB = new CanvasStorage({ fs, workspaceKey: 'wsB' })
    await storeA.save(snap('cv_aaaa1111', 1))
    expect(await storeB.latest('cv_aaaa1111')).toBeNull()
  })

  it('read returns null for corrupted json', async () => {
    const { fs, files } = memFs()
    files.set('qoder-canvas/ws1/cv_aaaa1111/1.json', '{broken')
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1' })
    expect(await store.read('cv_aaaa1111', 1)).toBeNull()
  })

  it('read rejects mismatched canvasId inside snapshot', async () => {
    const { fs } = memFs()
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1' })
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
