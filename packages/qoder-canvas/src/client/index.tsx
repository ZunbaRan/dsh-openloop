/**
 * @openloop/dsh-qoder-canvas client 半（M1）：toolview 卡片注册。
 * 渲染数据来源 = block.meta.snapshot（presentationMeta 内嵌全量快照，零端点依赖）。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { CanvasCard } from './CanvasCard.tsx'

export const name = 'openloop-qoder-canvas'
export const inject = ['slots']

export { CanvasCard, canvasMetaFrom } from './CanvasCard.tsx'
// M2 预留：标注回流桥（M0 选型已定，见 composer-bridge.ts 文件头）
export { injectComposerDraft } from './composer-bridge.ts'

export function apply(ctx: ClientContext): void {
  // key = 服务端 tool 名 'canvas'（index.ts），逐字一致
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
    { name: 'tool.call.toolview', key: 'canvas' },
    CanvasCard,
  ))
}
