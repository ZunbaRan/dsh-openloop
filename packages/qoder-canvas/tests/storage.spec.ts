import { describe, expect, it } from 'vitest'
import { CanvasStorage, workspaceKeyOf } from '../src/storage.ts'
import type { CanvasSnapshot } from '../src/dsl.ts'
import { mkdtemp, writeFile as nodeWriteFile, mkdir as nodeMkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** 测试注入根（每个 it 独立临时目录——防测试间污染；read 系列走 node:fs 需真文件） */
async function ensureTestRoot(): Promise<string> {
  return await mkdtemp(join(tmpdir(), 'qoder-canvas-test-'))
}

/** 内存 FsLike 模拟（seam 注入，对齐 0.1.2 真实 API：async resolve + target；
 *  writeText 同时写真文件到临时目录——read/list 的 node:fs 通道能读到 */
function memFs(root: string) {
  const files = new Map<string, string>()
  const written: { path: string; policy: unknown }[] = []
  const fs = {
    // rootDir 已是绝对路径（join(root,'qoder-canvas')）——resolve 直接返回（不再 join，防 root/root 重复拼接）
    resolve: async (path: string) => ({ targetKey: path.startsWith('/') ? path : join(root, path) }),
    readText: async (target: { targetKey?: string }) => {
      const p = target.targetKey ?? ''
      const v = files.get(p)
      if (v === undefined) throw new Error('ENOENT')
      return v
    },
    writeText: async (target: { targetKey?: string }, content: string, _encoding?: unknown, _signal?: unknown, policy?: unknown) => {
      files.set(target.targetKey ?? '', content)
      written.push({ path: target.targetKey ?? '', policy })
      // 同步写真文件（0.12.14 read/list 的 node:fs 通道）
      const real = target.targetKey ?? ''
      await nodeMkdir(join(real, '..'), { recursive: true }).catch(() => {})
      await nodeWriteFile(real, content, 'utf8').catch(() => {})
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
    const root = await ensureTestRoot()
    const { fs, written } = memFs(root)
    const policy = { marker: 'sandbox' }
    const store = new CanvasStorage({ fs, policy, workspaceKey: 'ws1', rootDir: join(root, 'qoder-canvas') })
    await store.save(snap('cv_aaaa1111', 1))
    const back = await store.read('cv_aaaa1111', 1)
    expect(back?.canvas.title).toBe('t-1')
    expect(written[0]?.policy).toBe(policy)
    expect(written[0]?.path).toContain('ws1/cv_aaaa1111/1.json')
  })

  it('snapshots are immutable: same id different revs coexist', async () => {
    const root = await ensureTestRoot()
    const { fs } = memFs(root)
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1', rootDir: join(root, 'qoder-canvas') })
    await store.save(snap('cv_aaaa1111', 1))
    await store.save(snap('cv_aaaa1111', 2))
    expect((await store.read('cv_aaaa1111', 1))?.canvas.title).toBe('t-1')
    expect((await store.read('cv_aaaa1111', 2))?.canvas.title).toBe('t-2')
  })

  it('latest() finds the highest revision', async () => {
    const root = await ensureTestRoot()
    const { fs } = memFs(root)
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1', rootDir: join(root, 'qoder-canvas') })
    await store.save(snap('cv_aaaa1111', 1))
    await store.save(snap('cv_aaaa1111', 3))
    expect((await store.latest('cv_aaaa1111'))?.revision).toBe(3)
  })

  it('list(): listDir scan — entries with accumulated revisions', async () => {
    const root = await ensureTestRoot()
    const { fs } = memFs(root)
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1', rootDir: join(root, 'qoder-canvas') })
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
    const root = await ensureTestRoot()
    const { fs, files } = memFs(root)
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1', rootDir: join(root, 'qoder-canvas') })
    await store.save(snap('cv_aaaa1111', 1))
    await store.save(snap('cv_bbbb2222', 1))
    await nodeWriteFile(join(root, 'qoder-canvas', 'ws1', 'cv_bbbb2222', '1.json'), '{broken json', 'utf8')
    const items = await store.list()
    expect(items.map(i => i.canvasId)).toEqual(['cv_aaaa1111'])
  })

  it('list(): workspace isolation via listDir', async () => {
    const root = await ensureTestRoot()
    const { fs } = memFs(root)
    const storeA = new CanvasStorage({ fs, workspaceKey: 'wsA', rootDir: join(root, 'qoder-canvas') })
    const storeB = new CanvasStorage({ fs, workspaceKey: 'wsB', rootDir: join(root, 'qoder-canvas') })
    await storeA.save(snap('cv_aaaa1111', 1))
    await storeB.save(snap('cv_bbbb2222', 1))
    expect((await storeA.list()).map(i => i.canvasId)).toEqual(['cv_aaaa1111'])
    expect((await storeB.list()).map(i => i.canvasId)).toEqual(['cv_bbbb2222'])
  })

  it('workspace isolation: same id in different workspace invisible', async () => {
    const root = await ensureTestRoot()
    const { fs } = memFs(root)
    const storeA = new CanvasStorage({ fs, workspaceKey: 'wsA', rootDir: join(root, 'qoder-canvas') })
    const storeB = new CanvasStorage({ fs, workspaceKey: 'wsB', rootDir: join(root, 'qoder-canvas') })
    await storeA.save(snap('cv_aaaa1111', 1))
    expect(await storeB.latest('cv_aaaa1111')).toBeNull()
  })

  it('read returns null for corrupted json', async () => {
    const root = await ensureTestRoot()
    const { fs, files } = memFs(root)
    await nodeMkdir(join(root, 'qoder-canvas', 'ws1', 'cv_aaaa1111'), { recursive: true })
    await nodeWriteFile(join(root, 'qoder-canvas', 'ws1', 'cv_aaaa1111', '1.json'), '{broken', 'utf8')
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1', rootDir: join(root, 'qoder-canvas') })
    expect(await store.read('cv_aaaa1111', 1)).toBeNull()
  })

  it('read rejects mismatched canvasId inside snapshot', async () => {
    const root = await ensureTestRoot()
    const { fs } = memFs(root)
    const store = new CanvasStorage({ fs, workspaceKey: 'ws1', rootDir: join(root, 'qoder-canvas') })
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
