import { describe, expect, it } from 'vitest'
import {
  isSafePackRelPath,
  packLaneFor,
  parsePackManifest,
  PACK_NAME_RE,
} from '../../src/packs/manifest.ts'

/** overrides 用宽松 Record（可传 undefined 值 / 非法 runtime 等，parsePackManifest 是运行时校验） */
function validManifest(overrides: Record<string, unknown> = {}): unknown {
  return {
    name: '@acme/dsh-pack-fancy',
    version: '0.1.0',
    runtime: 'react18',
    entry: 'dist/index.esm.js',
    styles: 'dist/index.css',
    components: { FancyCard: { description: 'a card', propsSchema: { type: 'object' } } },
    ...overrides,
  }
}

describe('parsePackManifest（§12.1 dsh-pack.json 校验）', () => {
  it('合法 manifest 解析成功（scoped 名 + styles + propsSchema）', () => {
    const manifest = parsePackManifest(validManifest())
    expect(manifest.name).toBe('@acme/dsh-pack-fancy')
    expect(manifest.runtime).toBe('react18')
    expect(manifest.entry).toBe('dist/index.esm.js')
    expect(manifest.styles).toBe('dist/index.css')
    expect(manifest.components.FancyCard?.description).toBe('a card')
  })

  it('styles / propsSchema / description 均可省略', () => {
    const manifest = parsePackManifest(validManifest({ styles: undefined, components: { FancyCard: {} } }))
    expect(manifest.styles).toBeUndefined()
    expect(manifest.components.FancyCard).toEqual({})
  })

  it('非对象 / 数组输入拒绝', () => {
    expect(() => parsePackManifest(null)).toThrow(/JSON object/)
    expect(() => parsePackManifest([])).toThrow(/JSON object/)
    expect(() => parsePackManifest('x')).toThrow(/JSON object/)
  })

  it('name 缺失 / 非法（大写、含 ..、含空格）拒绝', () => {
    expect(() => parsePackManifest(validManifest({ name: undefined }))).toThrow(/name/)
    expect(() => parsePackManifest(validManifest({ name: 'BadName' }))).toThrow(/name/)
    expect(() => parsePackManifest(validManifest({ name: 'a/b/c' }))).toThrow(/name/) // 多段 scoped
    expect(() => parsePackManifest(validManifest({ name: '../evil' }))).toThrow(/name/)
    expect(() => parsePackManifest(validManifest({ name: 'bad name' }))).toThrow(/name/)
  })

  it('version 缺失 / 非 semver 拒绝', () => {
    expect(() => parsePackManifest(validManifest({ version: undefined }))).toThrow(/version/)
    expect(() => parsePackManifest(validManifest({ version: '1.0' }))).toThrow(/version/)
    expect(() => parsePackManifest(validManifest({ version: 'latest' }))).toThrow(/version/)
  })

  it('runtime 仅 react18/react19 合法', () => {
    expect(() => parsePackManifest(validManifest({ runtime: 'react17' }))).toThrow(/runtime/)
    expect(() => parsePackManifest(validManifest({ runtime: undefined }))).toThrow(/runtime/)
  })

  it('react19 是合法值：解析成功（车道判定在注册层拒绝，§12.2）', () => {
    const manifest = parsePackManifest(validManifest({ runtime: 'react19' }))
    expect(manifest.runtime).toBe('react19')
  })

  it('entry 缺失 / 绝对路径 / 含 .. 拒绝', () => {
    expect(() => parsePackManifest(validManifest({ entry: undefined }))).toThrow(/entry/)
    expect(() => parsePackManifest(validManifest({ entry: '/abs/index.js' }))).toThrow(/entry/)
    expect(() => parsePackManifest(validManifest({ entry: 'dist/../index.js' }))).toThrow(/entry/)
  })

  it('styles 非法（绝对路径 / 含 ..）拒绝，合法省略通过', () => {
    expect(() => parsePackManifest(validManifest({ styles: '/x.css' }))).toThrow(/styles/)
    expect(() => parsePackManifest(validManifest({ styles: '../x.css' }))).toThrow(/styles/)
  })

  it('components 缺失 / 空 / 非对象拒绝', () => {
    expect(() => parsePackManifest(validManifest({ components: undefined }))).toThrow(/components/)
    expect(() => parsePackManifest(validManifest({ components: {} }))).toThrow(/at least one/)
    expect(() => parsePackManifest(validManifest({ components: 'x' }))).toThrow(/components/)
  })

  it('component 名非法 / meta 非法 / description 非字符串 / propsSchema 非对象拒绝', () => {
    expect(() => parsePackManifest(validManifest({ components: { 'bad-name': {} } }))).toThrow(/component name/)
    expect(() => parsePackManifest(validManifest({ components: { X: 'nope' } }))).toThrow(/metadata/)
    expect(() => parsePackManifest(validManifest({ components: { X: { description: 1 } } }))).toThrow(/description/)
    expect(() => parsePackManifest(validManifest({ components: { X: { propsSchema: [] } } }))).toThrow(/propsSchema/)
  })
})

describe('packLaneFor / PACK_NAME_RE / isSafePackRelPath', () => {
  it('lane 判定：react18 → host；react19 → sandbox（批 4）', () => {
    expect(packLaneFor('react18')).toBe('host')
    expect(packLaneFor('react19')).toBe('sandbox')
  })

  it('PACK_NAME_RE：裸名与 scoped 名合法，穿越形态拒绝', () => {
    expect(PACK_NAME_RE.test('dsh-pack-fancy')).toBe(true)
    expect(PACK_NAME_RE.test('@acme/dsh-pack-fancy')).toBe(true)
    expect(PACK_NAME_RE.test('@a/b')).toBe(true)
    expect(PACK_NAME_RE.test('../evil')).toBe(false)
    expect(PACK_NAME_RE.test('@a/b/c')).toBe(false)
    expect(PACK_NAME_RE.test('a b')).toBe(false)
  })

  it('isSafePackRelPath：相对路径合法，绝对/.. /反斜杠拒绝', () => {
    expect(isSafePackRelPath('dist/index.esm.js')).toBe(true)
    expect(isSafePackRelPath('index.js')).toBe(true)
    expect(isSafePackRelPath('/dist/index.js')).toBe(false)
    expect(isSafePackRelPath('dist/../index.js')).toBe(false)
    expect(isSafePackRelPath('..\\index.js')).toBe(false)
    expect(isSafePackRelPath('')).toBe(false)
  })
})
