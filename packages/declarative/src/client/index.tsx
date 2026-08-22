import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { createOpenLoopSettingsScope } from '@openloop/dsh-base/client'
import { DeclarativeCard } from './DeclarativeCard.tsx'

export const name = 'openloop-visual-declarative'
export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  const scope = createOpenLoopSettingsScope()
  const ThemedDeclarativeCard = (props: ToolCallViewProps) => <DeclarativeCard {...props} scope={scope} />
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
    { name: 'tool.call.toolview', key: 'visualize_ui' },
    ThemedDeclarativeCard,
  ))
  // settings.section 注册已迁至 theme 包自身（0.3.0 起 theme 是独立 bundle），
  // 此处不再重复注册（否则设置页出现两个 OpenLoop Visuals）。
}
