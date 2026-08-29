import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Inline the Apps client into the installable meta bundle. The profile loads
// one DSH client module, so it must not require a second package module at
// runtime; host-side composition still uses the Apps package normally.
import { apply as applyAppsClient } from '../../../mcp-apps/src/client/index.tsx'
import { McpSettingsSection } from './McpSettingsSection.tsx'

// 方向 1 v2（2026-08-29）：dock 的 mcp-app tile 经本模块懒桥消费
// McpAppResourceView（引用形态渲染入口）——profile 单 client 模块原则不变。
export { McpAppResourceView } from '../../../mcp-apps/src/client/index.tsx'
export type { McpAppResourceViewProps } from '../../../mcp-apps/src/client/index.tsx'

const MCP_APP_TOOL_NAMES = [
  'mcp__fixture__mcp_app_tool',
  'mcp__tldraw__tldraw_create_view',
  'mcp__tldraw__tldraw_patch_shapes',
  'mcp__tldraw__tldraw_open_canvas',
  'mcp__tldraw__tldraw_patch_diagram',
  'mcp__excalidraw__create_view',
] as const

export const name = 'openloop-dsh-mcp'
export const inject = ['slots']
export function apply(ctx: ClientContext): void {
  // The shipped DSH toolview seat is exact-keyed. This fixture binding is
  // intentionally owned by the fixture/meta composition, not mcp-apps core.
  applyAppsClient(ctx, { toolNames: MCP_APP_TOOL_NAMES })
  // MCP server 管理 settings section（可视化配置 + 试连）。
  // 'settings.section' 由宿主 dsh-settings 运行时声明（better-sidebar 同款模式），
  // 官方类型清单未收录——类型断言放行，运行时 slots.inject 等待其声明。
  const slots = ctx.slots as unknown as {
    inject: (slot: string, register: () => () => void) => void
    register: (options: { name: string; label: () => string }, component: React.ComponentType) => () => void
  }
  // 官方注册形态（dsh-client-ui-settings-general 样例）：id（nav key/only 过滤）
  // + order（nav 位置）必填——缺 id 的条目会被壳过滤不显示（21:58 真机事故）。
  const slotsTyped = ctx.slots as unknown as {
    inject: (slot: string, register: () => () => void) => void
    register: (options: { name: string; id: string; order: number; label: () => string }, component: React.ComponentType) => () => void
  }
  slotsTyped.inject('settings.section', () => slotsTyped.register(
    { name: 'settings.section', id: 'openloop-mcp', order: 60, label: () => 'MCP servers' },
    McpSettingsSection,
  ))
}
