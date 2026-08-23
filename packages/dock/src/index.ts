/**
 * OpenLoop Dock host half：v1 无服务端能力（Board 全客户端 localStorage）。
 * client 半（DockHost/网格画板/pin service）见 src/client/index.tsx——由 DSH
 * client runtime 加载；此处仅需合法的 cordis 插件形态（apply 导出）。
 */
import type { Context } from '@deepseek-ai/cordis'

export * from './contract.ts'

export function apply(_ctx: Context): void {
  // 空实现：dock 无 host 侧能力
}
