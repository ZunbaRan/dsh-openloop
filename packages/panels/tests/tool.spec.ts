import { describe, expect, it } from 'vitest'
import type { PanelDefinition } from '../src/contract.ts'
import { definePanelTool } from '../src/tool.ts'
import {
  isForbiddenApiUrl,
  registerPack,
  validatePanel,
} from '../src/validation.ts'

const tool = definePanelTool()

// §5.3 合法 hello 面板（S0 端到端基线）
function validPanel(overrides: Partial<PanelDefinition> = {}): PanelDefinition {
  return {
    $schema: 'openloop.panel/v1',
    id: 'hello-panel',
    title: 'Hello Panel',
    widgets: [
      { id: 'hero-metric', source: { type: 'preset', kind: 'metric', props: { label: '月营收', value: 48210 } } },
    ],
    ...overrides,
  }
}

async function runExecute(panel: unknown): Promise<unknown> {
  return tool.execute({ panel }, { signal: new AbortController().signal } as never)
}

describe('panel 工具端到端（S0）', () => {
  it('合法面板通过：execute 返回 §5.3 PanelMeta 形状', async () => {
    const result = await runExecute(validPanel())
    const value = result as { version: number; panel: PanelDefinition; resolved: Record<string, unknown>; resolvedAt: string }
    expect(value.version).toBe(1)
    expect(value.panel.title).toBe('Hello Panel')
    expect(value.resolved).toEqual({})
    expect(typeof value.resolvedAt).toBe('string')
    expect(new Date(value.resolvedAt).getTime()).not.toBeNaN()
  })

  it('presentationMeta 产出 openloop.panel meta（client 渲染入口）', () => {
    // 直接复现 execute 后的 output.presentationMeta 投影，验证 kind/version/panel 对齐 §5.3
    const panel = validPanel()
    const meta = { kind: 'openloop.panel', version: 1, panel, resolved: {} as Record<string, unknown>, resolvedAt: new Date().toISOString() }
    expect(meta.kind).toBe('openloop.panel')
    expect(meta.version).toBe(1)
    expect(meta.panel).toBe(panel)
  })

  it('title 超长（>120）拒绝', async () => {
    await expect(runExecute(validPanel({ title: 'x'.repeat(121) }))).rejects.toThrow(/title.*120/)
  })

  it('重复 widget id 拒绝', async () => {
    const panel = validPanel({
      widgets: [
        { id: 'dup', source: { type: 'preset', kind: 'metric', props: {} } },
        { id: 'dup', source: { type: 'preset', kind: 'badge', props: {} } },
      ],
    })
    await expect(runExecute(panel)).rejects.toThrow(/duplicated/)
  })

  it('widget id 非 kebab-case 拒绝', async () => {
    const panel = validPanel({
      widgets: [{ id: 'Bad_ID', source: { type: 'preset', kind: 'metric', props: {} } }],
    })
    await expect(runExecute(panel)).rejects.toThrow(/kebab-case/)
  })

  it('widgets 数量超出 1-24 上限拒绝', async () => {
    const widgets = Array.from({ length: 25 }, (_, i) => ({
      id: `w-${i}`, source: { type: 'preset' as const, kind: 'badge' as const, props: {} },
    }))
    await expect(runExecute(validPanel({ widgets }))).rejects.toThrow(/1-24/)
  })

  it('preset kind 不在白名单拒绝', async () => {
    // 运行时任意 kind 都应被白名单拦下（编译期类型不能表达非法 kind，直接构造任意对象）
    const panel = {
      $schema: 'openloop.panel/v1',
      id: 'bad-kind-panel',
      title: 'Bad Kind',
      widgets: [{ id: 'bad', source: { type: 'preset', kind: 'no-such-widget', props: {} } }],
    }
    await expect(runExecute(panel)).rejects.toThrow(/preset kind/)
  })

  it('custom code 含禁词拒绝（fetch）', async () => {
    const panel = validPanel({
      widgets: [{ id: 'custom-fetch', source: { type: 'custom', code: 'function Widget(){ return <div onClick={() => fetch("/x")}/> }' } }],
    })
    await expect(runExecute(panel)).rejects.toThrow(/forbidden term "fetch"/)
  })

  it('custom code 含禁词拒绝（window.parent 顶层逃逸）', async () => {
    const panel = validPanel({
      widgets: [{ id: 'custom-top', source: { type: 'custom', code: 'function Widget(){ return <div onClick={() => window.parent.postMessage("x")}/> }' } }],
    })
    await expect(runExecute(panel)).rejects.toThrow(/forbidden term "window.parent"/)
  })

  it('custom code 超 32KB 拒绝', async () => {
    const panel = validPanel({
      widgets: [{ id: 'custom-big', source: { type: 'custom', code: '// ' + 'a'.repeat(33 * 1024) } }],
    })
    await expect(runExecute(panel)).rejects.toThrow(/byte limit/)
  })

  it('未注册 pack widget 拒绝（S0 无 packs 安装）', async () => {
    const panel = validPanel({
      widgets: [{ id: 'ext', source: { type: 'pack', pack: '@acme/dsh-pack-fancy', component: 'FancyCard', props: {} } }],
    })
    await expect(runExecute(panel)).rejects.toThrow(/not registered/)
  })

  it('registerPack 注册后 pack widget 校验通过', async () => {
    registerPack('@acme/dsh-pack-fancy', ['FancyCard'])
    const panel = validPanel({
      widgets: [{ id: 'ext', source: { type: 'pack', pack: '@acme/dsh-pack-fancy', component: 'FancyCard', props: {} } }],
    })
    await expect(runExecute(panel)).resolves.toBeDefined()
  })

  it('api url 非 https 拒绝', async () => {
    const panel = validPanel({
      widgets: [{
        id: 'data', source: { type: 'preset', kind: 'metric', props: {} },
        data: { source: { type: 'api', url: 'http://api.example.com/stats' } },
      }],
    })
    await expect(runExecute(panel)).rejects.toThrow(/must use https/)
  })

  it('api url 指向 127.0.0.1 拒绝', async () => {
    const panel = validPanel({
      widgets: [{
        id: 'data', source: { type: 'preset', kind: 'metric', props: {} },
        data: { source: { type: 'api', url: 'https://127.0.0.1/internal' } },
      }],
    })
    await expect(runExecute(panel)).rejects.toThrow(/loopback|private/)
  })

  it('api url 指向 192.168.x.x 拒绝', async () => {
    const panel = validPanel({
      widgets: [{
        id: 'data', source: { type: 'preset', kind: 'metric', props: {} },
        data: { source: { type: 'api', url: 'https://192.168.1.10/internal' } },
      }],
    })
    await expect(runExecute(panel)).rejects.toThrow(/loopback|private/)
  })

  it('api url 指向 localhost 拒绝', async () => {
    const panel = validPanel({
      widgets: [{
        id: 'data', source: { type: 'preset', kind: 'metric', props: {} },
        data: { source: { type: 'api', url: 'https://localhost:8080/stats' } },
      }],
    })
    await expect(runExecute(panel)).rejects.toThrow(/loopback|private/)
  })
})

describe('isForbiddenApiUrl（§15 S3 SSRF 检测，独立可测）', () => {
  it('合法 https 公网 URL 返回 false', () => {
    expect(isForbiddenApiUrl('https://api.example.com/v1/stats')).toBe(false)
    expect(isForbiddenApiUrl('https://openloop.ai/data?q=1')).toBe(false)
  })

  it('环回 / 私网 / link-local 网段返回 true', () => {
    expect(isForbiddenApiUrl('https://127.0.0.1/x')).toBe(true)
    expect(isForbiddenApiUrl('https://127.8.9.10/x')).toBe(true) // 127.0.0.0/8 整段
    expect(isForbiddenApiUrl('https://10.0.0.1/x')).toBe(true)
    expect(isForbiddenApiUrl('https://172.16.0.1/x')).toBe(true)
    expect(isForbiddenApiUrl('https://172.31.255.254/x')).toBe(true)
    expect(isForbiddenApiUrl('https://192.168.1.1/x')).toBe(true)
    expect(isForbiddenApiUrl('https://169.254.169.254/latest/meta-data')).toBe(true) // cloud metadata
  })

  it('localhost 主机名返回 true', () => {
    expect(isForbiddenApiUrl('https://localhost/x')).toBe(true)
    expect(isForbiddenApiUrl('https://api.localhost/x')).toBe(true)
  })

  it('IPv6 环回 / ULA / link-local 返回 true', () => {
    expect(isForbiddenApiUrl('https://[::1]/x')).toBe(true)
    expect(isForbiddenApiUrl('https://[fc00::1]/x')).toBe(true)
    expect(isForbiddenApiUrl('https://[fe80::1]/x')).toBe(true)
  })

  it('无法解析的 URL fail-closed 返回 true', () => {
    expect(isForbiddenApiUrl('not a url')).toBe(true)
    expect(isForbiddenApiUrl('')).toBe(true)
  })
})

describe('load 唤起（§11）', () => {
  it('panel 与 load 都缺省：fail-closed 指明两条路', async () => {
    await expect(
      tool.execute({}, { signal: new AbortController().signal } as never),
    ).rejects.toThrow(/panel is required.*load/)
  })

  it('仅 load 且无注入方（单测环境）：fail-closed 且消息含面板 id', async () => {
    await expect(
      tool.execute({ load: 'missing-panel' }, { signal: new AbortController().signal } as never),
    ).rejects.toThrow(/"missing-panel" could not be loaded/)
  })
})

describe('panel 参数字符串容错（真机事故回归）', () => {
  it('合法 JSON 字符串被解析为对象并正常执行', async () => {
    const result = await tool.execute(
      { panel: JSON.stringify(validPanel()) },
      { signal: new AbortController().signal } as never,
    ) as { panel: { id: string } }
    expect(result.panel.id).toBe('hello-panel')
  })

  it('不可解析的字符串：报错带 parse 细节并指向对象直传', async () => {
    await expect(
      tool.execute({ panel: '{not json' }, { signal: new AbortController().signal } as never),
    ).rejects.toThrow(/malformed JSON.*object directly/is)
  })

  it('字符串化的是非对象 JSON（数组）：同样拒绝', async () => {
    await expect(
      tool.execute({ panel: '[1,2,3]' }, { signal: new AbortController().signal } as never),
    ).rejects.toThrow(/do not stringify/i)
  })
})

describe('执行包装层：冻结 args 契约（真机事故回归）', () => {
  // dsh-tools 会深冻结 args；包装层必须浅拷贝后再加工，且把拷贝传给原 execute
  it('深冻结的 args：字符串 panel 经容错解析后正常执行，不抛只读错误', async () => {
    const { createPanelExecute } = await import('../src/index.ts')
    const frozen = Object.freeze({ panel: Object.freeze(JSON.stringify(validPanel())) })
    const fakeCtx = {
      get: () => undefined,
      logger: () => ({ info() {}, warn() {} }),
    } as never
    const wrapped = createPanelExecute(tool, fakeCtx)
    const result = await wrapped(frozen, { signal: new AbortController().signal } as never) as { panel: { id: string } }
    expect(result.panel.id).toBe('hello-panel')
  })

  it('深冻结的 args：对象 panel 经编译注入后正常执行', async () => {
    const { createPanelExecute } = await import('../src/index.ts')
    const frozen = Object.freeze({ panel: Object.freeze(validPanel()) })
    const fakeCtx = {
      get: () => undefined,
      logger: () => ({ info() {}, warn() {} }),
    } as never
    const wrapped = createPanelExecute(tool, fakeCtx)
    const result = await wrapped(frozen, { signal: new AbortController().signal } as never) as { panel: { id: string } }
    expect(result.panel.id).toBe('hello-panel')
  })
})

describe('畸形 widget 的校验错误质量（真机事故回归）', () => {
  it('widget 缺 source（模型自造 {type:"metric"} 形状）：报可自修正错误而非 TypeError', async () => {
    const bad = validPanel()
    ;(bad.widgets as unknown[])[0] = { id: 'hero-metric', type: 'metric', title: '测试指标' }
    await expect(
      tool.execute({ panel: bad }, { signal: new AbortController().signal } as never),
    ).rejects.toThrow(/requires a source object/)
  })

  it('widget 非对象：可自修正错误而非 TypeError', async () => {
    const bad = validPanel()
    ;(bad.widgets as unknown[])[0] = 'not-an-object'
    await expect(
      tool.execute({ panel: bad }, { signal: new AbortController().signal } as never),
    ).rejects.toThrow(/requires a string id|must be an object/)
  })
})

describe('持久化双通道（真机事故回归）', () => {
  function fakeCtxWithRecordingFs(writes: string[]) {
    const fakeFs = {
      resolve: async (path: string) => ({ targetKey: path, displayPath: path }),
      stat: async () => undefined,
      readText: async () => { throw new Error('ENOENT') },
      writeText: async (target: { displayPath: string }, content: string) => {
        writes.push(target.displayPath)
        return { operation: 'create', version: 'v1', before: null, after: content }
      },
      listDir: async () => [],
    }
    return {
      get: () => undefined,
      logger: () => ({ info() {}, warn() {} }),
      fs: fakeFs,
    }
  }
  const fakeExec = { signal: new AbortController().signal, agent: { session: { header: { cwd: '/tmp/x' } } } } as never

  it('工具级 persist 参数触发写盘（不只认 panel.persist 字段）', async () => {
    const { createPanelExecute } = await import('../src/index.ts')
    const writes: string[] = []
    const wrapped = createPanelExecute(tool, fakeCtxWithRecordingFs(writes) as never)
    await wrapped({ panel: validPanel(), persist: true }, fakeExec)
    expect(writes.some(p => p.includes('hello-panel'))).toBe(true)
  })

  it('不带 persist：不写盘', async () => {
    const { createPanelExecute } = await import('../src/index.ts')
    const writes: string[] = []
    const wrapped = createPanelExecute(tool, fakeCtxWithRecordingFs(writes) as never)
    await wrapped({ panel: validPanel() }, fakeExec)
    expect(writes.length).toBe(0)
  })
})

describe('持久化双通道（真机事故回归）', () => {
  function fakeCtxWithRecordingFs(writes: string[]) {
    const fakeFs = {
      resolve: async (path: string) => ({ targetKey: path, displayPath: path }),
      stat: async () => undefined,
      readText: async () => { throw new Error('ENOENT') },
      writeText: async (target: { displayPath: string }, content: string) => {
        writes.push(target.displayPath)
        return { operation: 'create', version: 'v1', before: null, after: content }
      },
      listDir: async () => [],
    }
    return {
      get: () => undefined,
      logger: () => ({ info() {}, warn() {} }),
      fs: fakeFs,
    }
  }
  const fakeExec = { signal: new AbortController().signal, agent: { session: { header: { cwd: '/tmp/x' } } } } as never

  it('工具级 persist 参数触发写盘（不只认 panel.persist 字段）', async () => {
    const { createPanelExecute } = await import('../src/index.ts')
    const writes: string[] = []
    const wrapped = createPanelExecute(tool, fakeCtxWithRecordingFs(writes) as never)
    await wrapped({ panel: validPanel(), persist: true }, fakeExec)
    expect(writes.some(p => p.includes('hello-panel'))).toBe(true)
  })

  it('不带 persist：不写盘', async () => {
    const { createPanelExecute } = await import('../src/index.ts')
    const writes: string[] = []
    const wrapped = createPanelExecute(tool, fakeCtxWithRecordingFs(writes) as never)
    await wrapped({ panel: validPanel() }, fakeExec)
    expect(writes.length).toBe(0)
  })
})

describe('pick 位置防御（真机教训回归）', () => {
  it('pick 错放在 source 内：报可自修正错误而非静默忽略', async () => {
    const bad = validPanel()
    bad.widgets[0]!.data = { source: { type: 'api', url: 'https://api.example.com/x', pick: 'a.b' } as never }
    await expect(
      tool.execute({ panel: bad }, { signal: new AbortController().signal } as never),
    ).rejects.toThrow(/pick belongs on the binding/)
  })
})

describe('children 错位防御 + currency 别名（真机事故回归）', () => {
  it('children 放在 source 层：报可自修正错误而非静默忽略', async () => {
    const bad = validPanel()
    bad.widgets[0] = {
      id: 'main-stack',
      source: {
        type: 'preset',
        kind: 'stack',
        props: { direction: 'vertical' },
        children: [{ id: 'c1', source: { type: 'preset', kind: 'heading', props: { text: 'x' } } }],
      } as never,
    }
    await expect(
      tool.execute({ panel: bad }, { signal: new AbortController().signal } as never),
    ).rejects.toThrow(/move it into source\.props\.children/)
  })

  it('metric-grid format: "currency" 别名被接受（映射 currency-cny）', async () => {
    const panel = validPanel()
    panel.widgets[0] = {
      id: 'kpi',
      source: {
        type: 'preset',
        kind: 'metric-grid',
        props: { items: [{ id: 'm1', label: '月营收', value: 48210, format: 'currency' }] },
      },
    }
    const result = await tool.execute({ panel }, { signal: new AbortController().signal } as never) as { panel: { id: string } }
    expect(result.panel.id).toBe('hello-panel')
  })
})

describe('容器两层组合 + 服务端组件校验（真机事故回归）', () => {
  function gridWithCard() {
    const leafGauge = { id: 'donut', source: { type: 'preset', kind: 'gauge', props: { label: '完成率', value: 72 } } }
    const leafMetric = {
      id: 'm1',
      source: {
        type: 'preset', kind: 'metric-grid',
        props: { items: [{ id: 'i1', label: '营收', value: 100, format: 'number' }] },
      },
    }
    const cardA = { id: 'card-donut', source: { type: 'preset', kind: 'card', props: { title: '环图', children: [leafGauge] } } }
    const cardB = { id: 'card-metric', source: { type: 'preset', kind: 'card', props: { title: '指标', children: [leafMetric] } } }
    return {
      $schema: 'openloop.panel/v1',
      id: 'data-insights',
      title: '数据洞察',
      widgets: [{
        id: 'insights-grid',
        source: {
          type: 'preset', kind: 'grid',
          props: { columns: 2, children: [cardA, cardB] },
        },
      }],
    }
  }

  it('grid → card → 叶子：两层组合被接受（模型自然构图）', async () => {
    const result = await tool.execute(
      { panel: gridWithCard() },
      { signal: new AbortController().signal } as never,
    ) as { panel: { id: string } }
    expect(result.panel.id).toBe('data-insights')
  })

  it('grid → grid：布局嵌套在服务端被拒（不再等客户端占位）', async () => {
    const bad = gridWithCard()
    const props = bad.widgets[0]!.source.props as Record<string, unknown>
    ;(props.children as unknown[])[0] = {
      id: 'inner-grid', source: { type: 'preset', kind: 'grid', props: { columns: 1, children: [] } },
    }
    await expect(
      tool.execute({ panel: bad }, { signal: new AbortController().signal } as never),
    ).rejects.toThrow(/布局容器 "grid"|props validation failed/)
  })

  it('card → card：分组嵌套在服务端被拒', async () => {
    const bad = gridWithCard()
    const outer = bad.widgets[0]!.source.props as Record<string, unknown>
    const firstCard = (outer.children as { source: { props: Record<string, unknown> } }[])[0]!
    firstCard.source.props.children = [{
      id: 'inner-card', source: { type: 'preset', kind: 'card', props: { title: '内层卡' } },
    }]
    await expect(
      tool.execute({ panel: bad }, { signal: new AbortController().signal } as never),
    ).rejects.toThrow(/分组容器 "card"|props validation failed/)
  })

  it('深层叶子 props 非法在服务端被拒（此前只有客户端占位可见）', async () => {
    const bad = gridWithCard()
    const outer = bad.widgets[0]!.source.props as Record<string, unknown>
    const firstCard = (outer.children as { source: { props: { children: { source: { props: Record<string, unknown> } }[] } } }[])[0]!
    // card 内叶子 gauge 的 value 非法（负数超界）
    firstCard.source.props.children[0]!.source.props = { label: 'x', value: -999 }
    await expect(
      tool.execute({ panel: bad }, { signal: new AbortController().signal } as never),
    ).rejects.toThrow(/props validation failed/)
  })
})

describe('panelFile 通道（长面板双重编码问题的一等公民解法）', () => {
  function fakeCtxWithFile(file: { [path: string]: string | undefined }) {
    const fakeFs = {
      resolve: async (path: string) => ({ targetKey: path, displayPath: path }),
      stat: async (target: { targetKey: string }) => (target.targetKey in file ? { kind: 'file' } : undefined),
      readText: async (target: { targetKey: string }) => file[target.targetKey],
      writeText: async (target: { displayPath: string }, content: string) => {
        file[target.displayPath] = content
        return { operation: 'create', version: 'v1', before: null, after: content }
      },
      listDir: async () => [],
    }
    return {
      get: () => undefined,
      logger: () => ({ info() {}, warn() {} }),
      fs: fakeFs,
    }
  }
  const fakeExec = { signal: new AbortController().signal, agent: { session: { header: { cwd: '/tmp/x' } } } } as never

  it('panelFile 指向合法 JSON 文件：注入并正常渲染', async () => {
    const { createPanelExecute } = await import('../src/index.ts')
    const file: Record<string, string | undefined> = { 'panels/hello.json': JSON.stringify(validPanel()) }
    const wrapped = createPanelExecute(tool, fakeCtxWithFile(file) as never)
    const result = await wrapped({ panelFile: 'panels/hello.json' }, fakeExec) as { panel: { id: string } }
    expect(result.panel.id).toBe('hello-panel')
  })

  it('panelFile 文件不存在：fail-closed 提示先 write', async () => {
    const { createPanelExecute } = await import('../src/index.ts')
    const wrapped = createPanelExecute(tool, fakeCtxWithFile({}) as never)
    await expect(
      wrapped({ panelFile: 'panels/missing.json' }, fakeExec),
    ).rejects.toThrow(/does not exist.*write tool/is)
  })

  it('panelFile 内容为坏 JSON：报错带 parse 细节与文件路径', async () => {
    const { createPanelExecute } = await import('../src/index.ts')
    const wrapped = createPanelExecute(tool, fakeCtxWithFile({ 'panels/bad.json': '{"broken": ' }) as never)
    await expect(
      wrapped({ panelFile: 'panels/bad.json' }, fakeExec),
    ).rejects.toThrow(/panels\/bad\.json.*malformed JSON/is)
  })

  it('panelFile 内容为数组：拒绝（须单一对象）', async () => {
    const { createPanelExecute } = await import('../src/index.ts')
    const wrapped = createPanelExecute(tool, fakeCtxWithFile({ 'panels/arr.json': '[1,2]' }) as never)
    await expect(
      wrapped({ panelFile: 'panels/arr.json' }, fakeExec),
    ).rejects.toThrow(/single PanelDefinition JSON object/)
  })

  it('优先级：显式 panel 覆盖 panelFile（不读文件）', async () => {
    const { createPanelExecute } = await import('../src/index.ts')
    const file: Record<string, string | undefined> = { 'panels/other.json': '{"$schema":"openloop.panel/v1"}' }
    const wrapped = createPanelExecute(tool, fakeCtxWithFile(file) as never)
    const result = await wrapped({ panel: validPanel(), panelFile: 'panels/other.json' }, fakeExec) as { panel: { id: string } }
    expect(result.panel.id).toBe('hello-panel')
  })
})
