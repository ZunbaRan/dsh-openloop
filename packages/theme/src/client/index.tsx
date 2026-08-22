/**
 * theme 包的 client 入口（0.3.0 起）：OpenLoop 视觉设置页的宿主。
 * 该注册此前寄生在 declarative 的 client 里（禁用 declarative 设置页即消失），
 * 0.3.0 迁回 theme 本体——theme 是视觉插件族的公共依赖，设置页应随它独立存活。
 *
 * 本模块同时是 external 共享模块：消费者经 dsh.client.external 声明后
 * require('@openloop/dsh-visual-theme/client') 拿到的就是本模块的 exports，
 * 因此全部公共 API（scope/hook/页面/静态 token 数据）必须从此入口再导出。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { OpenLoopVisualSettingsPage, createOpenLoopSettingsScope } from '../client.tsx'

// 共享模块公共面（external 消费者经模块图拿到本入口的 exports）
export * from '../client.tsx'

export const name = 'openloop-dsh-visual-theme'
export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  const scope = createOpenLoopSettingsScope()
  const VisualSettings = () => <OpenLoopVisualSettingsPage scope={scope} />
  ctx.slots.inject('settings.section', () => ctx.slots.register(
    { name: 'settings.section', id: 'openloop-visuals', order: 12, label: () => 'OpenLoop Visuals' },
    VisualSettings,
  ))
}
