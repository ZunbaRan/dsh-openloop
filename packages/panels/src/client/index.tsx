import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { PanelCard } from './PanelCard.tsx'

export const name = 'openloop-dsh-panels'
export const inject = ['slots']

export { PanelCard, PanelSurface, panelMetaFrom } from './PanelCard.tsx'

// ---- OpenLoop Dock pin 接线（可选依赖）----
import { setDockService, type DockServiceLike } from './dock-pin.ts'
export { getDockService } from './dock-pin.ts' 

export function apply(ctx: ClientContext): void {
  // key = 服务端 tool 名 'panel'（tool.ts），逐字一致
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
    { name: 'tool.call.toolview', key: 'panel' },
    PanelCard,
  ))
}
