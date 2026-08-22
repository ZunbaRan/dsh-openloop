import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { PanelCard } from './PanelCard.tsx'

export const name = 'openloop-dsh-panels'
export const inject = ['slots']

export { PanelCard, panelMetaFrom } from './PanelCard.tsx'

export function apply(ctx: ClientContext): void {
  // key = 服务端 tool 名 'panel'（tool.ts），逐字一致
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
    { name: 'tool.call.toolview', key: 'panel' },
    PanelCard,
  ))
}
