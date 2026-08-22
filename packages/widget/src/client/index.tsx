import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { createOpenLoopSettingsScope } from '@openloop/dsh-base/client'
import { WidgetCard } from './WidgetCard.tsx'
import { StreamingPreview } from './StreamingPreview.tsx'

export const name = 'openloop-show-widget'
export const inject = ['slots']
export function apply(ctx: ClientContext): void {
  const scope = createOpenLoopSettingsScope()
  const ThemedWidgetCard = (props: ToolCallViewProps) => <WidgetCard {...props} scope={scope} />
  const ThemedStreamingPreview = (props: PropsRuntime<'conversation.input.dock'>) => <StreamingPreview {...props} scope={scope} />
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({ name: 'tool.call.toolview', key: 'show_widget' }, ThemedWidgetCard))
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({ name: 'conversation.input.dock', id: 'openloop-widget-preview', order: 32 }, ThemedStreamingPreview))
}
