import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { createOpenLoopSettingsScope } from '@openloop/dsh-base/client'
import { ArtifactCard, ArtifactFrame } from './ArtifactCard.tsx'

// ---- OpenLoop Dock pin 接线（可选依赖）----
import { setDockService, type DockServiceLike } from './dock-pin.ts'
export { getDockService } from './dock-pin.ts' 

export { ArtifactFrame }
export const name = 'openloop-html-artifact'
export const inject = ['slots']
export function apply(ctx: ClientContext): void {
  ctx.inject(['openloop-dock/client'], (dockCtx: ClientContext) => {
    setDockService((dockCtx as ClientContext & { 'openloop-dock/client'?: DockServiceLike })['openloop-dock/client'])
  })
  const scope = createOpenLoopSettingsScope()
  const ThemedArtifactCard = (props: ToolCallViewProps) => <ArtifactCard {...props} scope={scope} />
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({ name: 'tool.call.toolview', key: 'html_artifact' }, ThemedArtifactCard))
}
