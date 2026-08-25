import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { PanelCard } from './PanelCard.tsx'

export const name = 'openloop-dsh-panels'
export const inject = ['slots']

export { PanelCard, PanelSurface, panelMetaFrom } from './PanelCard.tsx'
// 已实现预设 kind 清单（Dock 2.0 APP 注册表消费——与渲染器同源，清单永不漂移；
// registry 已被 PanelCard 打进 client bundle，此 re-export 零增量）
export { allPresetKinds } from '../presets/index.ts'

// ---- OpenLoop Dock pin 接线（可选依赖）----
import type { DockServiceLike } from './dock-pin.ts'
export { getDockService } from './dock-pin.ts' 

export function apply(ctx: ClientContext): void {
  // OpenLoop Dock pin 接线（可选注入：dock 未装时按钮自动隐藏）——
  // 2026-08-24 修复：dock-pin 模块重构时此调用被误删，pin 按钮消失
  // key = 服务端 tool 名 'panel'（tool.ts），逐字一致
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
    { name: 'tool.call.toolview', key: 'panel' },
    PanelCard,
  ))
}
