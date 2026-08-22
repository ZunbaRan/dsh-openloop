import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { createOpenLoopSettingsScope } from '@openloop/dsh-visual-theme/client'
import { ArtifactCard } from './ArtifactCard.tsx'
export const name = 'openloop-html-artifact'
export const inject = ['slots']
export function apply(ctx: ClientContext): void {
  const scope = createOpenLoopSettingsScope()
  const ThemedArtifactCard = (props: ToolCallViewProps) => <ArtifactCard {...props} scope={scope} />
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({ name: 'tool.call.toolview', key: 'html_artifact' }, ThemedArtifactCard))
}
