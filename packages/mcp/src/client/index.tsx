import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Inline the Apps client into the installable meta bundle. The profile loads
// one DSH client module, so it must not require a second package module at
// runtime; host-side composition still uses the Apps package normally.
import { apply as applyAppsClient } from '../../../mcp-apps/src/client/index.tsx'

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
}
