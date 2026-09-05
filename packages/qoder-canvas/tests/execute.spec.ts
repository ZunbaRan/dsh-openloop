/**
 * execute 端到端逻辑测试（绕过模型/DSH runtime，直接调 apply 注册的工具）。
 * 验证：注册 → 校验 → 快照存储 → presentationMeta 内嵌全量的完整链路。
 */
import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'

// 模拟 ctx（tools.register 捕获 defineTool 产物）
interface CapturedTool {
  name: string
  execute: (args: unknown, exec: unknown) => Promise<unknown>
  output?: { presentationMeta?: (args: unknown, value: unknown) => unknown }
}

function captureTool(): { ctx: Context; tool: () => CapturedTool } {
  let captured: CapturedTool | undefined
  const ctx = {
    tools: {
      register: (tool: CapturedTool) => { captured = tool },
    },
    fs: {
      resolve: (path: string) => `/virtual/${path}`,
      readText: async () => null,
      writeText: async () => undefined,
    },
    get: () => undefined,
    logger: { warn: vi.fn(), info: vi.fn() },
  }
  return { ctx: ctx as unknown as Context, tool: () => { if (captured === undefined) throw new Error('tool not registered'); return captured } }
}

const exec = { agent: { session: { header: { cwd: '/Users/test/project' } } } }

const doc = {
  title: '测试画布',
  layout: 'grid',
  nodes: [
    { id: 'n1', type: 'stat-card', props: { label: 'QPS', value: '1200', delta: 5 } },
    { id: 'n2', type: 'callout', props: { tone: 'info', text: '端到端测试' } },
  ],
}

describe('canvas tool execute (end-to-end logic)', () => {
  it('registers with correct name', async () => {
    const { ctx, tool } = captureTool()
    const { apply } = await import('../src/index.ts')
    apply(ctx)
    expect(tool().name).toBe('canvas')
  })

  it('creates canvas: returns snapshot with generated id, revision 1, embedded canvas', async () => {
    const { ctx, tool } = captureTool()
    const { apply } = await import('../src/index.ts')
    apply(ctx)
    const result = await tool().execute({ document: doc }, exec) as { snapshot: { canvasId: string; revision: number; canvas: typeof doc } }
    expect(result.snapshot.canvasId).toMatch(/^cv_[a-z0-9]{8}$/)
    expect(result.snapshot.revision).toBe(1)
    expect(result.snapshot.canvas.title).toBe('测试画布')
    expect(result.snapshot.canvas.nodes.length).toBe(2)
  })

  it('presentationMeta passes the snapshot through (embedded, no fetch)', async () => {
    const { ctx, tool } = captureTool()
    const { apply } = await import('../src/index.ts')
    apply(ctx)
    const result = await tool().execute({ document: doc }, exec)
    const meta = tool().output?.presentationMeta?.({}, result)
    const m = meta as { kind: string; canvasId: string; canvas: { title: string } }
    expect(m.kind).toBe('qoder-canvas')
    expect(m.canvasId).toMatch(/^cv_/)
    expect(m.canvas.title).toBe('测试画布')
  })

  it('iterates: canvasId + document → revision 2 (with persisted base)', async () => {
    // 第二个 ctx 带「已有 r1 快照」的 fs
    const files = new Map<string, string>()
    const ctx2 = {
      tools: { register: (t: CapturedTool) => { captured2 = t } },
      fs: {
        resolve: (path: string) => `/virtual/${path}`,
        readText: async (path: string) => files.get(path) ?? null,
        writeText: async (path: string, content: string) => { files.set(path, content) },
      },
      get: () => undefined,
      logger: { warn: vi.fn(), info: vi.fn() },
    }
    let captured2: CapturedTool | undefined
    const { apply } = await import('../src/index.ts')
    apply(ctx2 as unknown as Context)
    const t = (captured2 ?? {}) as CapturedTool
    // r1
    const r1 = await t.execute?.({ document: doc }, exec) as { snapshot: { canvasId: string } }
    // r2 续编
    const r2 = await t.execute?.({ document: { ...doc, title: 'v2' }, canvasId: r1.snapshot.canvasId }, exec) as { snapshot: { revision: number; canvas: { title: string } } }
    expect(r2.snapshot.revision).toBe(2)
    expect(r2.snapshot.canvas.title).toBe('v2')
  })

  it('malformed canvasId → agent-correctable error', async () => {
    const { ctx, tool } = captureTool()
    const { apply } = await import('../src/index.ts')
    apply(ctx)
    const result = await tool().execute({ document: doc, canvasId: 'dash-001' }, exec) as { __error: string }
    expect(result.__error).toContain('malformed')
    expect(result.__error).toContain('cv_')
  })

  it('invalid document → fail-closed validation error', async () => {
    const { ctx, tool } = captureTool()
    const { apply } = await import('../src/index.ts')
    apply(ctx)
    const result = await tool().execute({ document: { title: 'x', layout: 'grid', nodes: [{ id: 'a', type: 'iframe', props: {} }] } }, exec) as { __error: string }
    expect(result.__error).toContain('unknown node type')
  })
})
