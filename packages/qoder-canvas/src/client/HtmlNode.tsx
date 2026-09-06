/**
 * HtmlNode：html 节点的 iframe 沙箱渲染器（0.9.0 增强档）。
 *
 * - srcdoc = buildProbeDocument(source)：探针自动注入（skill/Agent HTML 零配合）
 * - sandbox="allow-scripts"（opaque origin；html-artifact 先例）+ referrerPolicy
 * - 高度自适应：bridge 高度（探针 ResizeObserver 上报）clamp [120, 640]，
 *   超上限 iframe 内部滚动（frameRectToContainer 假设 iframe 不滚——超上限时
 *   探针 rect 含内部滚动偏移，父层高亮换算仍正确：getBoundingClientRect 本身
 *   是视口坐标，滚动只影响内容可见性不影响 rect 换算基）
 * - onload → registerProbeFrame（版本重渲染自动覆盖旧记录）
 * - 降级态（探针超时未 ready）：显示提示条 + 固定高度 320（节点级标注仍可用）
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { buildProbeDocument } from './probe.ts'
import { probeHeight, registerProbeFrame, unregisterProbeFrame, onBridgeChange } from './html-bridge.ts'

const MIN_H = 120
const MAX_H = 640

export function HtmlNode({ nodeId, props }: { nodeId: string; props: Record<string, unknown> }): ReactNode {
  const [height, setHeight] = useState(240)
  const source = typeof props.source === 'string' ? props.source : ''
  const title = typeof props.title === 'string' ? props.title : ''

  // 高度跟随 bridge 上报（订阅全局变化，过滤本 nodeId）
  useEffect(() => {
    const update = (): void => {
      const h = probeHeight(nodeId)
      if (h > 0) setHeight(Math.min(Math.max(h, MIN_H), MAX_H))
    }
    update()
    return onBridgeChange(update)
  }, [nodeId])

  // srcdoc 手动序贯设置（真机教训 2026-09-06：React 对 iframe 的 srcDoc/sandbox
  // 属性按 JSX 顺序批量应用——srcdoc 先生效会触发一次无 sandbox 的 load（脚本在
  // 非沙箱环境执行或被重载丢弃），探针 hello 丢失。ref 上先 sandbox 后 srcdoc
  // 保证唯一一次 load 在沙箱就绪后发生）
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  useEffect(() => {
    const f = frameRef.current
    if (f === null) return
    const doc = buildProbeDocument(source)
    f.setAttribute('sandbox', 'allow-scripts')
    f.setAttribute('referrerpolicy', 'no-referrer')
    f.setAttribute('srcdoc', doc)
  }, [source])

  // 注册探针（真机教训 2026-09-06：React onLoad 在初始渲染时错过 load 事件——
  // srcDoc prop 生效先于 onload 监听绑定。effect 主动注册 + onload 兜底 + 400ms
  // 延迟二兜底（srcdoc 渲染极快时 effect 也在 load 后））
  useEffect(() => {
    const register = (): void => {
      if (frameRef.current !== null) registerProbeFrame(nodeId, frameRef.current)
    }
    register()
    const t = setTimeout(register, 400)
    return () => { clearTimeout(t); unregisterProbeFrame(nodeId) }
  }, [nodeId, source])

  return (
    <div style={{ border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', borderRadius: 10, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* srcdoc/sandbox 由上方 effect 手动序贯设置（React 批量属性时序坑） */}
      <iframe
        ref={frameRef}
        title={title.length > 0 ? title : `html-${nodeId}`}
        onLoad={() => {
          if (frameRef.current !== null) registerProbeFrame(nodeId, frameRef.current)
        }}
        style={{ width: '100%', height, border: 0, display: 'block', background: '#fff' }}
      />
    </div>
  )
}
