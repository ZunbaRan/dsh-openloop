// 最小外部组件包示例（§12）：一个 React 18 组件，默认导出即对外契约（loader.ts）。
// 构建产物入口为 dist/index.js（与 dsh-pack.json 的 entry 一致），构建见 README.md。
import { useState } from 'react'

/**
 * FancyCard：消费 --openloop-* token（档 2，§13.1）——颜色/圆角/阴影全部来自 CSS 变量，
 * 这样跟随面板换肤；不写死任何颜色值。
 * 入参：props（widget.source.props，§5.1）+ data（§5.2 服务端解析结果，v1 可选）。
 */
export default function FancyCard({ props, data }) {
  const [expanded, setExpanded] = useState(false) // 交互仅组件内本地态（§6.1 边界）
  const value = data !== undefined && data !== null
    ? (typeof data === 'object' ? (data.value ?? data) : data)
    : props.value

  return (
    <div
      style={{
        padding: 'var(--openloop-space-4, 16px)',
        borderRadius: 'var(--openloop-radius-lg)',
        border: '1px solid var(--openloop-border)',
        background: 'var(--openloop-surface)',
        color: 'var(--openloop-foreground)',
        boxShadow: 'var(--openloop-shadow-2)',
        fontFamily: 'var(--openloop-font-sans, system-ui, sans-serif)',
      }}
    >
      <div style={{ fontWeight: 650, fontSize: 'var(--openloop-type-title, 18px)' }}>{props.title ?? 'FancyCard'}</div>
      <div style={{ marginTop: 8, fontSize: 'var(--openloop-type-label, 13px)', color: 'var(--openloop-muted-foreground)' }}>
        {value !== undefined && value !== null ? String(value) : '—'}
      </div>
      <button
        type="button"
        onClick={() => setExpanded(expanded => !expanded)}
        style={{
          marginTop: 10,
          padding: '6px 12px',
          border: 'none',
          borderRadius: 'var(--openloop-radius-md)',
          background: 'var(--openloop-primary)',
          color: 'var(--openloop-primary-foreground)',
          cursor: 'pointer',
        }}
      >
        {expanded ? '收起' : '展开'}
      </button>
    </div>
  )
}
