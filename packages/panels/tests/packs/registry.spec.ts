import { describe, expect, it } from 'vitest'
import {
  getPack,
  hasPack,
  listPacks,
  PackRegistry,
  resetPackRegistry,
  scanPacksDir,
  type PackFs,
} from '../../src/packs/registry.ts'
import type { PackManifest } from '../../src/packs/manifest.ts'

/** overrides 用宽松 Record（可传非法 runtime 等，注册/校验是运行时行为） */
function manifest(overrides: Record<string, unknown> = {}): PackManifest {
  return {
    name: '@acme/dsh-pack-fancy',
    version: '0.1.0',
    runtime: 'react18',
    entry: 'dist/index.esm.js',
    components: { FancyCard: {} },
    ...overrides,
  } as PackManifest
}

/** 内存 PackFs：按 `<dir>/<subdir>/dsh-pack.json` 平铺文件布局 */
function memoryPackFs(files: Record<string, string>): PackFs {
  const map = new Map(Object.entries(files))
  return {
    async readdir(dir) {
      const prefix = `${dir}/`
      const names = [...map.keys()]
        .filter(key => key.startsWith(prefix))
        .map(key => key.slice(prefix.length).split('/')[0] ?? '')
      return [...new Set(names)].filter(name => name.length > 0)
    },
    async readFile(path) {
      const content = map.get(path)
      if (content === undefined) throw new Error(`ENOENT: no such file ${path}`)
      return content
    },
  }
}

const PACK_DIR = '/packs'

describe('PackRegistry / 模块级注册表（§12）', () => {
  it('registerPack 后可 getPack / hasPack / listPacks', () => {
    const registry = new PackRegistry()
    registry.registerPack(manifest(), '/openloop/packs/@acme/dsh-pack-fancy/', '/packs/fancy')
    expect(registry.hasPack('@acme/dsh-pack-fancy')).toBe(true)
    expect(registry.getPack('@acme/dsh-pack-fancy')?.manifest.entry).toBe('dist/index.esm.js')
    expect(registry.getPack('@acme/dsh-pack-fancy')?.fsRoot).toBe('/packs/fancy')
    expect(registry.listPacks()).toHaveLength(1)
    expect(registry.hasPack('no-such')).toBe(false)
  })

  it('重复 name 注册 = 覆盖更新（幂等，scan 重跑安全）', () => {
    const registry = new PackRegistry()
    registry.registerPack(manifest(), '/openloop/packs/x/', '/a')
    registry.registerPack(manifest({ entry: 'v2.js' }), '/openloop/packs/x/', '/b')
    expect(registry.listPacks()).toHaveLength(1)
    expect(registry.getPack('@acme/dsh-pack-fancy')?.manifest.entry).toBe('v2.js')
  })

  it('react19 注册拒绝并报错提示（§12.2 硬约束 1）', () => {
    const registry = new PackRegistry()
    expect(() => registry.registerPack(manifest({ runtime: 'react19' }), '/openloop/packs/x/', '/a'))
      .toThrow(/react19.*sandbox lane/)
  })

  it('非法 manifest（绕过 parse 直接构造坏对象）注册拒绝', () => {
    const registry = new PackRegistry()
    expect(() => registry.registerPack({ ...manifest(), name: 'Bad' }, '/openloop/packs/x/', '/a')).toThrow(/name/)
  })

  it('baseUrl 非绝对前缀拒绝', () => {
    const registry = new PackRegistry()
    expect(() => registry.registerPack(manifest(), 'not-a-url', '/a')).toThrow(/baseUrl/)
    expect(() => registry.registerPack(manifest(), '/openloop/packs/x', '/a')).toThrow(/baseUrl/) // 无尾斜杠
  })

  it('模块级 API 操作全局单例；resetPackRegistry 清空', async () => {
    resetPackRegistry()
    expect(hasPack('@acme/dsh-pack-fancy')).toBe(false)
    // 经由 scanPacksDir 注册后走模块级读取
    const fs = memoryPackFs({
      [`${PACK_DIR}/fancy/dsh-pack.json`]: JSON.stringify(manifest()),
    })
    const result = await scanPacksDir(PACK_DIR, fs)
    expect(result.registered).toEqual(['@acme/dsh-pack-fancy'])
    expect(getPack('@acme/dsh-pack-fancy')?.manifest.runtime).toBe('react18')
    resetPackRegistry()
    expect(hasPack('@acme/dsh-pack-fancy')).toBe(false)
  })
})

describe('scanPacksDir（§12 启用方式 v1，内存 fs）', () => {
  it('扫描 <dir>/*/dsh-pack.json 批量注册，返回注册名单', async () => {
    resetPackRegistry()
    const fs = memoryPackFs({
      [`${PACK_DIR}/fancy/dsh-pack.json`]: JSON.stringify(manifest()),
      [`${PACK_DIR}/other/dsh-pack.json`]: JSON.stringify(manifest({ name: 'plain-pack' })),
    })
    const result = await scanPacksDir(PACK_DIR, fs)
    expect(result.registered.sort()).toEqual(['@acme/dsh-pack-fancy', 'plain-pack'])
    expect(result.errors).toEqual([])
    expect(hasPack('plain-pack')).toBe(true)
    // fsRoot 指向子目录（pack 资产 serve 根）
    expect(getPack('plain-pack')?.fsRoot).toBe(`${PACK_DIR}/other`)
  })

  it('无 dsh-pack.json 的子目录跳过（不中断整体）', async () => {
    resetPackRegistry()
    const fs = memoryPackFs({
      [`${PACK_DIR}/fancy/dsh-pack.json`]: JSON.stringify(manifest()),
      [`${PACK_DIR}/not-a-pack/random.txt`]: 'hi',
    })
    const result = await scanPacksDir(PACK_DIR, fs)
    expect(result.registered).toEqual(['@acme/dsh-pack-fancy'])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('not-a-pack')
  })

  it('损坏 dsh-pack.json（非法 JSON / 校验不过）跳过并记错误', async () => {
    resetPackRegistry()
    const fs = memoryPackFs({
      [`${PACK_DIR}/broken/dsh-pack.json`]: '{ not json',
      [`${PACK_DIR}/bad-runtime/dsh-pack.json`]: JSON.stringify(manifest({ runtime: 'react17' })),
      [`${PACK_DIR}/ok/dsh-pack.json`]: JSON.stringify(manifest({ name: 'ok-pack' })),
    })
    const result = await scanPacksDir(PACK_DIR, fs)
    expect(result.registered).toEqual(['ok-pack'])
    expect(result.errors).toHaveLength(2)
  })

  it('react19 pack 在扫描时被注册层拒绝（记错误，不中断）', async () => {
    resetPackRegistry()
    const fs = memoryPackFs({
      [`${PACK_DIR}/ok/dsh-pack.json`]: JSON.stringify(manifest({ name: 'ok-pack' })),
      [`${PACK_DIR}/r19/dsh-pack.json`]: JSON.stringify(manifest({ name: 'r19-pack', runtime: 'react19' })),
    })
    const result = await scanPacksDir(PACK_DIR, fs)
    expect(result.registered).toEqual(['ok-pack'])
    expect(result.errors.some(message => message.includes('react19'))).toBe(true)
    expect(hasPack('r19-pack')).toBe(false)
  })

  it('目录不存在 → 空结果（v1 启动容错，不抛错）', async () => {
    const fs = memoryPackFs({})
    const result = await scanPacksDir('/no-such-dir', fs)
    expect(result).toEqual({ registered: [], errors: [] })
  })
})
