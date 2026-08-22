/**
 * 容器 children 子 widget 渲染（§6 组件间组合）。
 * 经预设 registry 渲染；非法/未知/未实现/沙箱 source 一律降级占位（不抛错、不拖垮面板）。
 * children 契约（0.2.4）：布局容器可含分组容器（card/section），分组容器仅含叶子——
 * WidgetView 对分组容器递归渲染（其自身 validate 会拒绝内嵌容器，深度有界）。
 */
import type { CSSProperties, ReactNode } from 'react'
import type { JsonObject, PresetKind } from '../contract.ts'
import { asRecord } from './common.ts'
import { getPreset } from './index.ts'
import { isLayoutKind } from './children.ts'

const placeholderStyle: CSSProperties = {
  padding: '10px 12px',
  border: '1px dashed var(--openloop-border)',
  borderRadius: 'var(--openloop-radius-sm)',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--openloop-muted-foreground)',
}

/** 单格降级占位：kind + 面向 Agent 的可修正提示 */
export function WidgetPlaceholder({ kind, message }: { kind?: string; message?: string }): ReactNode {
  return (
    <div data-openloop-widget="invalid" style={placeholderStyle}>
      <div style={{ fontWeight: 600 }}>子组件不可用{kind ? ` · ${kind}` : ''}</div>
      {message ? <div style={{ marginTop: 2 }}>{message}</div> : null}
    </div>
  )
}

/** 渲染一个子 widget（WidgetUnit 形状）；非法/不可渲染返回占位 */
export function WidgetView({ widget }: { widget: JsonObject }): ReactNode {
  const source = asRecord(widget.source)
  if (!source) return <WidgetPlaceholder message="缺少 source，无法渲染" />
  if (source.type !== 'preset') {
    return <WidgetPlaceholder kind={String(source.type)} message="pack/custom 需走沙箱车道，容器 children 仅支持 preset 组件" />
  }
  const kind = source.kind
  if (typeof kind !== 'string') return <WidgetPlaceholder message="preset source 缺少 kind" />
  const preset = getPreset(kind as PresetKind)
  if (!preset) return <WidgetPlaceholder kind={kind} message="未知或未实现的 preset kind" />
  if (isLayoutKind(preset.kind)) {
    return <WidgetPlaceholder kind={String(kind)} message="布局容器（stack/grid/row/split）不可作为子组件；如需分组请用 card/section" />
  }
  const props = source.props === undefined ? {} : asRecord(source.props)
  if (props === null) return <WidgetPlaceholder kind={String(kind)} message="props 必须是 JSON 对象" />
  const result = preset.validate(props)
  if (!result.ok) {
    const first = result.errors[0]
    return <WidgetPlaceholder kind={String(kind)} message={first ? first.message : 'props 校验失败'} />
  }
  return <preset.Render props={props} />
}

/** 批量渲染容器 children（key 用 widget.id，缺省回退 index） */
export function renderChildren(children: unknown[]): ReactNode[] {
  return children.map((child, index) => {
    const id = (child as { id?: unknown } | null)?.id
    return <WidgetView key={typeof id === 'string' ? id : `child-${index}`} widget={child as JsonObject} />
  })
}

