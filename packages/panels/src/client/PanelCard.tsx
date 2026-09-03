/**
 * PanelCard：面板容器（§7 宿主车道编排）。
 * - 读 PanelMeta（§5.3），按 layout.mode（stack / grid+columns）布局 widgets
 * - 宿主车道（source.type === 'preset'）经 presets registry 渲染
 * - 外部组件包（source.type === 'pack'）经 pack 加载器动态 import 渲染（§12，S6 接入）
 * - 沙箱车道（source.type === 'custom'）经 SandboxLane（opaque-origin iframe + §8.4 桥协议）渲染
 * - 每个 widget 格独立 ErrorBoundary：单格崩溃渲染降级占位，不拖垮面板
 * - 面板根节点挂 data-openloop-preset / data-openloop-appearance（§7 与三插件一致）
 * - §10 数据失败语义与刷新编排（RefreshableWidgetCell）：
 *   `{ __error }` 失败快照 → 错误占位 + 重试按钮（宿主/沙箱车道同判定，见 client/refresh.ts）；
 *   manual（默认 true）→ 格内刷新按钮，成功更新该格数据（沙箱格经 bridge 重推，不重建 iframe），
 *   失败保留旧快照 + stale 角标；intervalMs（≥10s）→ setInterval 定时刷新，
 *   IntersectionObserver 在面板不可见时暂停；同一 widget 上一次未返回不重复发（防重入）。
 */
import { getDockService } from './dock-pin.ts'
import { Component, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type { JsonObject, PanelMeta, WidgetUnit } from '../contract.ts'
import { getPreset } from '../presets/index.ts'
import { asRecord } from '../presets/common.ts'
import { loadPackComponent, type PackComponent } from '../packs/loader.ts'
import { SandboxLane } from './SandboxLane.tsx'
import type { TokenSyncPayload } from './bridge.ts'
import { isErrorData, normalizeRefreshPolicy, requestWidgetRefresh } from './refresh.ts'
import { runtimeUrl } from './runtime-url.gen.ts'
import { usePanelVisualTheme, type PanelVisualTheme } from './theme.ts'
import { dispatchRelEvent, evalPayloadTemplate } from './rel-bus.ts'
import { RelLinkedSlot, panelDefinitionFromEntry } from './RelLinked.tsx'

const caption: CSSProperties = { color: 'var(--dsw-alias-label-caption, #666)', fontSize: 12 }

/** 容错解析 presentationMeta 的 PanelMeta（§5.3）；无法解析返回 undefined（不抛错） */
export function panelMetaFrom(value: unknown): PanelMeta | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  if (record.kind !== 'openloop.panel' || record.version !== 1) return undefined
  const panel = record.panel
  if (typeof panel !== 'object' || panel === null) return undefined
  const resolved = record.resolved
  return {
    kind: 'openloop.panel',
    version: 1,
    panel: panel as PanelMeta['panel'],
    resolved: typeof resolved === 'object' && resolved !== null ? (resolved as Record<string, unknown>) : {},
    resolvedAt: typeof record.resolvedAt === 'string' ? record.resolvedAt : '',
  }
}

// ---- 三态卡片入口（IMPL_NOTES §4.2） ----

function PinToDock({ meta, title }: { meta: PanelMeta; title: string }): ReactNode {
  const dock = getDockService()
  if (!dock) return null
  return (
    <button
      type="button"
      title="固定到 OpenLoop Dock"
      onClick={() => dock.pinPanel(meta, title)}
      style={{ position: 'absolute', top: 6, right: 6, zIndex: 5, width: 24, height: 24, borderRadius: 7, border: '1px solid var(--openloop-border)', background: 'var(--openloop-elevated)', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}
    >📌</button>
  )
}

export function PanelCard({ block }: ToolCallViewProps) {
  if (!('kind' in block)) return <div style={caption}>OpenLoop Panel · rendering…</div>
  if (block.isError) return <div style={caption}>OpenLoop Panel · failed</div>
  const meta = panelMetaFrom(block.meta)
  if (!meta) return <div style={caption}>OpenLoop Panel · metadata unavailable</div>
  // 联动 v1（M2）：面板声明了 relations.emits → 卡片下方挂联动渲染槽
  // （行点击事件 → consumes 注册表映射 → 目标面板带参渲染，未经 Agent）。
  const relations = meta.panel.relations
  return (
    <div style={{ position: 'relative' }}>
      <PinToDock meta={meta} title={meta.panel?.title as unknown as string ?? 'Panel'} />
      <PanelSurface meta={meta} />
      {relations?.emits && relations.emits.length > 0 ? <RelLinkedSlot relations={relations} /> : null}
    </div>
  )
}

// ---- 面板外壳：标题 + 布局区 ----

const shellStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--openloop-border)',
  borderRadius: 'var(--openloop-radius-lg)',
  background: 'var(--openloop-surface)',
  color: 'var(--openloop-foreground)',
  overflow: 'hidden',
  boxShadow: 'var(--openloop-shadow-2)',
  fontFamily: 'var(--openloop-font-sans, system-ui, -apple-system, sans-serif)',
}

const headerStyle: CSSProperties = {
  padding: '14px 16px 10px',
  borderBottom: '1px solid var(--openloop-border)',
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 'var(--openloop-type-title, 18px)',
  lineHeight: 1.3,
  fontWeight: 650,
  letterSpacing: '-0.02em',
  color: 'var(--openloop-foreground)',
  wordBreak: 'break-word',
}

const descStyle: CSSProperties = {
  margin: '5px 0 0',
  fontSize: 'var(--openloop-type-meta, 12px)',
  lineHeight: 1.5,
  color: 'var(--openloop-muted-foreground)',
}

export function PanelSurface({ meta, relParams }: { meta: PanelMeta; relParams?: JsonObject }) {
  const theme = usePanelVisualTheme()
  // 主题变量注入宿主 DOM（真机事故：此前 tokens 只经桥发给沙箱格，宿主车道从未注入，
  // 所有 var(--openloop-*) 落空 → 面板无样式、换肤无效）
  const themeVars = useMemo(() => {
    const vars: Record<string, string> = {}
    for (const [key, value] of Object.entries(theme.tokens)) vars[`--openloop-${key}`] = value
    for (const [key, value] of Object.entries(theme.global)) vars[`--openloop-${key}`] = value
    return vars as CSSProperties
  }, [theme])
  const { panel } = meta
  const layout = panel.layout ?? { mode: 'stack' as const }
  const columns = layout.columns ?? 2
  const isGrid = layout.mode === 'grid'

  // §10：resolved 快照进 state——刷新成功仅更新该格数据（宿主格重渲染；沙箱格经 bridge 重推，不重建 iframe）
  const [resolved, setResolved] = useState<Record<string, unknown>>(meta.resolved)
  const updateWidgetData = useCallback((widgetId: string, data: unknown) => {
    setResolved(prev => ({ ...prev, [widgetId]: data }))
  }, [])

  // 联动 v1（M2）：emits 声明存在时启用行点击事件委托——点击 data-table 行
  // → 取行数据 → payload 模板求值（$row.x / $panel.x）→ relBus 发事件。
  // preset 零改动；行数据来源：该面板内含 api 数据的 widget 快照 rows。
  const emits = panel.relations?.emits
  const onRowClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!emits || emits.length === 0) return
    const rowEl = (event.target as HTMLElement).closest('tr[data-openloop-row-index]')
    if (!rowEl) return
    const index = Number((rowEl as HTMLElement).dataset['openloopRowIndex'])
    // 行数据：api 路径从 resolved 快照取；static 路径从 preset props.rows 取
    const rowsFromData = Object.values(resolved).find(v => Array.isArray(v))
    const rowsFromProps = panel.widgets
      .map(w => w.source.type === 'preset' ? (w.source.props as Record<string, unknown> | undefined)?.rows : undefined)
      .find(v => Array.isArray(v))
    const rowsSource = rowsFromData ?? rowsFromProps
    const row = Array.isArray(rowsSource) ? rowsSource[index] : undefined
    if (row === undefined || typeof row !== 'object') return
    for (const decl of emits) {
      const payload = evalPayloadTemplate(decl.payload, row, { resolved })
      dispatchRelEvent(decl.event, payload)
    }
  }, [emits, resolved, panel.widgets])

  const containerStyle: CSSProperties = isGrid
    ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 12, padding: 12, alignItems: 'start' }
    : { display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }

  return (
    <section
      data-openloop-panel={panel.id}
      data-openloop-preset={theme.preset}
      data-openloop-appearance={theme.appearance}
      style={{ ...shellStyle, ...themeVars }}
      onClick={emits && emits.length > 0 ? onRowClick : undefined}
    >
      <header style={headerStyle}>
        <h3 style={titleStyle}>{panel.title}</h3>
        {panel.description !== undefined && panel.description.length > 0 ? <p style={descStyle}>{panel.description}</p> : null}
      </header>
      <div style={containerStyle} data-openloop-layout={layout.mode}>
        {panel.widgets.map(widget => (
          <WidgetErrorBoundary key={widget.id} widget={widget}>
            <RefreshableWidgetCell widget={widget} theme={theme} data={resolved[widget.id]} onData={updateWidgetData} relParams={relParams} />
          </WidgetErrorBoundary>
        ))}
      </div>
    </section>
  )
}

// ---- 车道格子 ----

/** 降级占位格（组件不可用 / 渲染崩溃 / 沙箱待集成共用视觉） */
const placeholderStyle: CSSProperties = {
  padding: '12px 14px',
  border: '1px dashed var(--openloop-border)',
  borderRadius: 'var(--openloop-radius-md)',
  background: 'var(--openloop-surface-subtle)',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--openloop-muted-foreground)',
  minWidth: 0,
}

function CellPlaceholder({ kind, message }: { kind?: string; message?: string }): ReactNode {
  return (
    <div style={placeholderStyle} data-openloop-widget="unavailable">
      <div style={{ fontWeight: 600 }}>组件不可用{kind !== undefined ? ` · ${kind}` : ''}</div>
      {message !== undefined ? <div style={{ marginTop: 2 }}>{message}</div> : null}
    </div>
  )
}

/** §8.4：widget 级随机 token（每 widget 每生命周期生成；主题/数据切换不换 token，iframe 不重建） */
function makeBridgeToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `t-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

/** 沙箱车道：custom code 经编译产物在 opaque-origin iframe 内渲染（§8） */
function SandboxCell({ widget, theme, data }: { widget: WidgetUnit; theme: PanelVisualTheme; data: unknown }) {
  const token = useMemo(() => makeBridgeToken(), [])
  const tokenPayload = useMemo<TokenSyncPayload>(
    () => ({ token, preset: theme.preset, appearance: theme.appearance, global: theme.global, tokens: theme.tokens }),
    [token, theme],
  )
  return <SandboxLane widget={widget} runtimeUrl={runtimeUrl()} tokenPayload={tokenPayload} data={data} />
}

/** 外部组件包格子（§12 宿主车道）：pack source → 动态 import 渲染；加载中占位、失败降级占位 */
type PackLoadState =
  | { status: 'loading' }
  | { status: 'ready'; Component: PackComponent }
  | { status: 'error'; message: string }

function PackCell({ widget, data }: { widget: WidgetUnit; data: unknown }) {
  // WidgetCell 保证 source.type === 'pack'（下方分支），此处只收窄类型不做运行时检查
  const source = widget.source as Extract<WidgetUnit['source'], { type: 'pack' }>
  const props = asRecord(source.props) ?? {}
  const propsKey = JSON.stringify(source.props)
  const [state, setState] = useState<PackLoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    loadPackComponent(source.pack, source.component, props)
      .then(Component => {
        if (!cancelled) setState({ status: 'ready', Component })
      })
      .catch(error => {
        // §11 降级语义：pack 加载失败只降级该格，不拖垮面板（错误边界外再兜一层）
        if (!cancelled) setState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      })
    return () => {
      cancelled = true
    }
    // props 引用稳定性由 propsKey 保障（meta 内 props 是对象字面量，JSON 序列化后变化才重载）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.pack, source.component, propsKey])

  if (state.status === 'loading') {
    return (
      <div style={placeholderStyle} data-openloop-widget="pack-loading">
        <div style={{ fontWeight: 600 }}>加载外部组件 · {source.component}</div>
        <div style={{ marginTop: 2 }}>从 pack "{source.pack}" 动态加载中…</div>
      </div>
    )
  }
  if (state.status === 'error') {
    return <CellPlaceholder kind={source.component} message={state.message} />
  }
  const Component = state.Component
  // 对外契约（§12.2 / loader.ts）：pack 组件接收 { props, data }，data 为 §5.2 服务端解析结果
  return <Component props={props} data={data} />
}

// ---- §10 数据错误态 / stale / 刷新编排 ----

/** §10 错误占位：error 色系 token + 错误首行 + 重试按钮（manual=true 时） */
const dataErrorStyle: CSSProperties = {
  padding: '12px 14px',
  border: '1px solid var(--openloop-error-border, rgba(192,57,43,.4))',
  borderRadius: 'var(--openloop-radius-md)',
  background: 'var(--openloop-error-background, rgba(192,57,43,.08))',
  color: 'var(--openloop-error, #c0392b)',
  fontSize: 12,
  lineHeight: 1.5,
  minWidth: 0,
}

const retryButtonStyle: CSSProperties = {
  marginTop: 8,
  padding: '3px 10px',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--openloop-error, #c0392b)',
  background: 'transparent',
  border: '1px solid var(--openloop-error-border, rgba(192,57,43,.4))',
  borderRadius: 'var(--openloop-radius-sm, 6px)',
  cursor: 'pointer',
}

/** 格角控件容器（刷新按钮 + stale 角标），绝对定位于格子右上角 */
const cornerControlsStyle: CSSProperties = {
  position: 'absolute',
  top: 4,
  right: 4,
  display: 'flex',
  gap: 6,
  alignItems: 'center',
}

const refreshButtonStyle: CSSProperties = {
  padding: '1px 7px',
  fontSize: 11,
  lineHeight: 1.5,
  color: 'var(--openloop-muted-foreground)',
  background: 'var(--openloop-surface)',
  border: '1px solid var(--openloop-border)',
  borderRadius: 'var(--openloop-radius-sm, 6px)',
  cursor: 'pointer',
}

/** §10 stale 角标：warning 色系小圆点（刷新失败但保留旧快照时） */
const staleDotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: 'var(--openloop-warning, #d48806)',
  border: '1px solid var(--openloop-warning-border, transparent)',
}

function DataErrorPlaceholder({ widgetId, error, busy, onRetry }: { widgetId: string; error: string; busy: boolean; onRetry?: (() => void) | undefined }): ReactNode {
  return (
    <div style={dataErrorStyle} data-openloop-widget="data-error" data-widget-id={widgetId}>
      <div style={{ fontWeight: 600 }}>数据加载失败</div>
      <div style={{ marginTop: 2 }}>{error.split('\n')[0] ?? error}</div>
      {onRetry !== undefined ? (
        <button type="button" style={retryButtonStyle} disabled={busy} onClick={onRetry}>
          {busy ? '重试中…' : '重试'}
        </button>
      ) : null}
    </div>
  )
}

/**
 * §10 刷新编排格（PanelCard 唯一消费方）：对有 api 数据源的 widget 应用 RefreshPolicy。
 * - manual（默认 true）：格角渲染刷新按钮；成功 → onData 更新该格数据（宿主格重渲染；
 *   沙箱格经 bridge sendData 重推，不重建 iframe）；失败 → 有旧快照则保留 + stale 角标，
 *   无旧数据则写入 `{ __error }` 走错误占位。
 * - intervalMs（≥10s）：setInterval 定时刷新；IntersectionObserver 在格不可见时暂停定时器。
 * - onLoad（默认 true）：面板打开时重新拉取一次。
 * - 防重入：同一 widget 上一次请求未返回不重复发。
 */
function RefreshableWidgetCell({
  widget,
  theme,
  data,
  onData,
  relParams,
}: {
  widget: WidgetUnit
  theme: PanelVisualTheme
  data: unknown
  onData: (widgetId: string, data: unknown) => void
  /** 联动参数（v1）：关联事件映射来的参数值，随刷新请求下发（server 替换 {{param}}） */
  relParams?: JsonObject | undefined
}) {
  const binding = widget.data
  const hasApiData = binding?.source.type === 'api'
  const policy = normalizeRefreshPolicy(widget.refresh, hasApiData)
  const [stale, setStale] = useState(false)
  const [busy, setBusy] = useState(false)
  const inFlightRef = useRef(false)
  const cellRef = useRef<HTMLDivElement>(null)
  // 失败判定时读取最新快照（避免闭包捕获过期 data）
  const dataRef = useRef(data)
  dataRef.current = data
  // relParams 变化（点选了不同行）→ 视为新取数请求，重新拉取（联动 v1）
  const relParamsKey = JSON.stringify(relParams ?? null)
  // 联动 v1：声明了参数模板但没有参数值（如 pin 的详情 tile 未经过联动）→
  // 不发请求（模板原样发出必 404），渲染「等待联动」占位
  const awaitingParams = binding?.params !== undefined
    && Object.keys(binding.params).length > 0
    && (relParams === undefined || Object.keys(relParams).length === 0)

  const refresh = useCallback(async (): Promise<void> => {
    if (binding?.source.type !== 'api' || inFlightRef.current) return
    if (binding.params !== undefined && Object.keys(binding.params).length > 0
      && (relParams === undefined || Object.keys(relParams).length === 0)) return
    inFlightRef.current = true
    setBusy(true)
    try {
      const outcome = await requestWidgetRefresh(widget.id, binding, undefined, relParams)
      if (outcome.ok) {
        onData(widget.id, outcome.data)
        setStale(false)
      } else {
        // §10 失败语义：有旧成功快照 → 保留旧渲染 + stale；无旧数据 → 错误占位
        const current = dataRef.current
        if (current !== undefined && !isErrorData(current)) setStale(true)
        else onData(widget.id, { __error: outcome.error })
      }
    } finally {
      inFlightRef.current = false
      setBusy(false)
    }
  }, [binding, widget.id, onData, relParams])

  // onLoad（§10，默认 true）：面板打开时重新拉取；联动参数变化同样触发（M2）
  useEffect(() => {
    if (policy.onLoad) void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy.onLoad, refresh, relParamsKey])

  // intervalMs（§10，≥10s）：IntersectionObserver 不可见时暂停定时器
  const intervalMs = policy.intervalMs
  useEffect(() => {
    if (intervalMs === undefined) return
    const node = cellRef.current
    let timer: ReturnType<typeof setInterval> | undefined
    const start = (): void => {
      if (timer === undefined) timer = setInterval(() => void refresh(), intervalMs)
    }
    const stop = (): void => {
      if (timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
    }
    if (node === null || typeof IntersectionObserver === 'undefined') {
      start()
      return stop
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) start()
        else stop()
      }
    })
    observer.observe(node)
    return () => {
      observer.disconnect()
      stop()
    }
  }, [intervalMs, refresh])

  const errorData = isErrorData(data)
  const showManual = policy.manual && !errorData
  return (
    <div ref={cellRef} style={{ position: 'relative', minWidth: 0 }} data-openloop-cell={widget.id}>
      {errorData ? (
        <DataErrorPlaceholder widgetId={widget.id} error={data.__error} busy={busy} onRetry={policy.manual ? () => void refresh() : undefined} />
      ) : awaitingParams ? (
        <div style={placeholderStyle} data-openloop-widget="awaiting-params">
          <div style={{ fontWeight: 600 }}>⏳ 等待联动参数 · awaiting linkage</div>
          <div style={{ marginTop: 2 }}>此页数据需要从关联列表点选后带参获取——到来源页面点一行，这里会显示对应数据。</div>
        </div>
      ) : (
        <WidgetCell widget={widget} theme={theme} data={data} />
      )}
      {stale || showManual ? (
        <div style={cornerControlsStyle}>
          {stale && !errorData ? <span style={staleDotStyle} title="数据已过期（stale）：上次刷新失败，展示的是上一份成功快照" /> : null}
          {showManual ? (
            <button type="button" style={refreshButtonStyle} title="刷新数据" aria-label="刷新数据" disabled={busy} onClick={() => void refresh()}>
              {busy ? '…' : '↻'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** 单格渲染：preset → registry；pack → 动态加载；custom → 沙箱格 */
function WidgetCell({ widget, theme, data }: { widget: WidgetUnit; theme: PanelVisualTheme; data: unknown }) {
  const source = widget.source
  if (source.type === 'custom' || widget.lane === 'sandbox') {
    return <SandboxCell widget={widget} theme={theme} data={data} />
  }
  if (source.type === 'pack') {
    // react19 pack（沙箱车道）v1 未实现：注册层已拒绝（§12.2），此处仅宿主车道渲染
    return <PackCell widget={widget} data={data} />
  }
  // 类型上 source 已收敛为 preset（custom/pack 已在上面分支返回）；断言后保留运行时 fail-closed 防御
  const sourceRecord = source as { type: string; kind?: unknown }
  if (sourceRecord.type !== 'preset') {
    return <CellPlaceholder kind={sourceRecord.type} message="无法识别的 widget source" />
  }
  const preset = getPreset(source.kind)
  if (!preset) {
    return <CellPlaceholder kind={source.kind} message="该预设组件尚未实现（后续批次交付）" />
  }
  const props = asRecord(source.props) ?? {}
  // §5.2 数据注入：api/static 解析结果为 plain object 时浅合并覆盖 props（数据优先），
  // 合并后重新过该组件 validate（fail-closed：数据形态越界同样降级占位而非硬渲染）。
  const dataRecord = asRecord(data)
  const effectiveProps = dataRecord ? { ...props, ...dataRecord } : props
  const result = preset.validate(effectiveProps)
  if (!result.ok) {
    const first = result.errors[0]
    return <CellPlaceholder kind={source.kind} message={first !== undefined ? first.message : 'props 校验失败'} />
  }
  const Render = preset.Render
  return <Render props={effectiveProps} />
}

/** 单格 ErrorBoundary：子组件渲染崩溃 → 降级占位，不拖垮整面板 */
class WidgetErrorBoundary extends Component<{ widget: WidgetUnit; children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error): { error: Error | null } {
    return { error }
  }

  render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <CellPlaceholder kind={this.props.widget.id} message={`渲染崩溃：${this.state.error.message.split('\n')[0] ?? '未知错误'}`} />
      )
    }
    return this.props.children
  }
}
