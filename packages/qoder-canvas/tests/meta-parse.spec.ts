/**
 * canvasMetaFrom 解析契约测试（0.1.1 真机 bug 的回归锁）。
 * 用例形态 = host 侧 presentationMeta 的真实输出（扁平 snapshot，无包装层）——
 * 两端在同一测试文件里对齐，形态漂移即刻红。
 */
import { describe, expect, it } from 'vitest'
import { canvasMetaFrom } from '../src/client/CanvasCard.tsx'
import type { CanvasSnapshot } from '../src/dsl.ts'

const flatSnapshot: CanvasSnapshot = {
  kind: 'qoder-canvas', version: 1,
  canvasId: 'cv_abcd1234', revision: 1,
  canvas: { title: '部署看板', layout: 'grid', nodes: [{ id: 'n1', type: 'callout', props: { text: 'x' } }], edges: [] },
}

describe('canvasMetaFrom（presentationMeta 真实输出形态）', () => {
  it('解析扁平 snapshot（presentationMeta 直出，无 .snapshot 包装层）', () => {
    expect(canvasMetaFrom(flatSnapshot)?.canvasId).toBe('cv_abcd1234')
  })

  it('拒绝旧实现的错误假设：带 snapshot 包装层的形态不被接受（防形态回退）', () => {
    const wrapped = { kind: 'qoder-canvas', version: 1, snapshot: flatSnapshot }
    expect(canvasMetaFrom(wrapped)).toBeUndefined()
  })

  it('拒绝非 canvas kind', () => {
    expect(canvasMetaFrom({ kind: 'openloop.panel', version: 1 })).toBeUndefined()
  })
  it('拒绝缺 canvasId/revision', () => {
    expect(canvasMetaFrom({ kind: 'qoder-canvas', version: 1, canvas: flatSnapshot.canvas })).toBeUndefined()
  })
  it('拒绝坏 canvas（无 title/nodes）', () => {
    expect(canvasMetaFrom({ kind: 'qoder-canvas', version: 1, canvasId: 'cv_abcd1234', revision: 1, canvas: {} })).toBeUndefined()
  })
  it('拒绝 null/非对象', () => {
    expect(canvasMetaFrom(null)).toBeUndefined()
    expect(canvasMetaFrom('x')).toBeUndefined()
  })
})
