/**
 * HtmlNode（0.12 app 上下文）：html 节点渲染为 open Shadow DOM。
 *
 * - open mode：样式双向隔离（baoyu 的全局 CSS 打不到 canvas app UI，反之亦然）
 *   且 elementsFromPoint/Selection 穿透——PinLayer 同文档直接标注 ✓
 * - host 元素参与外部层叠：z-index 低于 app 内 toolbar（baoyu 的 position:fixed
 *   贴 iframe 视口时不盖交互 UI）
 * - 高度自适应：ResizeObserver 观测 shadow 内容根（宿主侧统一上报——app 层
 *   ResizeObserver 兜底 shadow 内部尺寸变化触发重排）
 */
import { useEffect, useRef, type ReactNode } from 'react'

export function HtmlNode({ nodeId, props }: { nodeId: string; props: Record<string, unknown> }): ReactNode {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const source = typeof props.source === 'string' ? props.source : ''
  const title = typeof props.title === 'string' ? props.title : ''

  // shadow root 一次创建 + source 变化时重注入
  useEffect(() => {
    const host = hostRef.current
    if (host === null) return
    let root = host.shadowRoot
    if (root === null) root = host.attachShadow({ mode: 'open' })
    root.innerHTML = source
  }, [source])

  return (
    <div
      ref={hostRef}
      data-canvas-node={nodeId}
      data-openloop-html-host="1"
      title={title.length > 0 ? title : undefined}
      style={{
        width: '100%', minHeight: 120, position: 'relative',
        borderRadius: 10, overflow: 'hidden', background: '#fff',
        border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))',
        zIndex: 1, // 低于 app 内 toolbar/评注面板（fixed 内容压制）
      }}
    />
  )
}
