/**
 * @openloop/dsh-qoder-canvas client 半（M1）：toolview 卡片注册。
 * 渲染数据来源 = block.meta.snapshot（presentationMeta 内嵌全量快照，零端点依赖）。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { CanvasCard } from './CanvasCard.tsx'
import { CanvasWorkbench } from './CanvasWorkbench.tsx'

export const name = 'openloop-qoder-canvas'
export const inject = ['slots']

export { CanvasCard, canvasMetaFrom } from './CanvasCard.tsx'
export { injectComposerDraft } from './composer-bridge.ts'

export function apply(ctx: ClientContext): void {
  // ① toolview 入口卡片（快照/回放/打开入口）
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
    { name: 'tool.call.toolview', key: 'canvas' },
    CanvasCard,
  ))
  // ② canvas dock：推出面板 + toggle + 工作台（自建 host + createRoot，dock 同款模式）
  ctx.effect(() => {
    const host = document.createElement('div')
    host.setAttribute('data-openloop-canvas-root', '')
    document.body.appendChild(host)
    let root: Root | undefined
    try {
      root = createRoot(host)
      root.render(createElement(CanvasWorkbench))
    } catch { /* 渲染失败静默——不影响宿主页面 */ }
    return () => { void root?.unmount(); host.remove() }
  }, 'openloop-canvas: workbench mount')
}
