/**
 * 徽章与 APP 图标（原型 components.jsx 直搬 + TS 化，样式见 v2-styles.ts）。
 * AppIconData 是 AppDescriptor（M2 app-registry）的最小结构子集——
 * RailNav/AppListPanel 只依赖 name+kind，注册表实现可自由扩展。
 */
import type { ReactNode } from 'react'

export type AppKind = 'builtin' | 'thirdparty' | 'local'

export interface AppIconData {
  name: string
  kind: AppKind
}

const KIND_LABEL: Record<AppKind, string> = {
  builtin: '内置',
  thirdparty: '第三方',
  local: '自研',
}

export function KindBadge({ kind, label }: { kind: AppKind; label?: string }): ReactNode {
  return <span className={`d2-badge ${kind}`}>{label ?? KIND_LABEL[kind]}</span>
}

export function TypeBadge({ type }: { type: string }): ReactNode {
  return <span className="d2-badge kind">{type}</span>
}

export function AppIcon({ app, size = 28 }: { app: AppIconData; size?: number }): ReactNode {
  return (
    <span
      className={`d2-app-icon ${app.kind}`}
      style={size !== 28 ? { width: size, height: size, fontSize: Math.round(size * 0.46) } : undefined}
    >
      {app.name.slice(0, 1)}
    </span>
  )
}
