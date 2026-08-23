import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { createRuntimeAssetsService, RuntimeAssetsRoute } from './server/runtime-assets.ts'
import { registerBaseFetchRoute } from './server/fetch-route.ts'
import z from '@deepseek-ai/schemastery'

export interface Config {
  /** 部署级本机源白名单（openloop.fetch 桥经此放行本机 API；默认空=全部拒绝环回/内网） */
  allowLoopbackOrigins: string[]
}

export const Config: z<Config> = z.object({
  allowLoopbackOrigins: z.array(z.string()).default([]),
})
import { OPENLOOP_PRESETS, OPENLOOP_PRESET_IDS } from './presets.generated.ts'

export { OPENLOOP_PRESETS, OPENLOOP_PRESET_IDS }
export type OpenLoopPreset = typeof OPENLOOP_PRESET_IDS[number]
export type OpenLoopAppearance = 'system' | 'light' | 'dark'
export type OpenLoopResolvedAppearance = Exclude<OpenLoopAppearance, 'system'>
export interface OpenLoopVisualSettings { preset: OpenLoopPreset; appearance: OpenLoopAppearance }
export const OPENLOOP_SETTINGS_NAMESPACE = 'openloop-visuals'
export const DEFAULT_OPENLOOP_SETTINGS: OpenLoopVisualSettings = { preset: 'linear', appearance: 'system' }

// 全局系 token：全局唯一、不随预设/明暗变化。单一来源：docs/token-v2-values.md §一。
// 键为 font-sans + type-display/title/label/meta/micro + space-1..5 共 11 个（文档 §5.2 所称「12」系笔误，以数值表 11 行为准）。
// type-* 为紧凑格式 `font-size / line-height / font-weight / letter-spacing`（type-display 追加 font-variant-numeric）。
export const OPENLOOP_GLOBAL_TOKENS: Record<string, string> = {
  'font-sans': 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  'type-display': '24px / 32px / 600 / -0.02em / tabular-nums',
  'type-title': '18px / 1.3 / 650 / -0.02em',
  'type-label': '13px / 1.4 / 600 / 0',
  'type-meta': '12px / 1.5 / 500 / 0',
  'type-micro': '11px / 1.45 / 500 / 0.01em',
  'space-1': '4px',
  'space-2': '8px',
  'space-3': '12px',
  'space-4': '16px',
  'space-5': '24px',
}

export const PRESET_META: ReadonlyArray<{ id: OpenLoopPreset; name: string; character: string }> = [
  { id: 'linear', name: 'Linear', character: '冷静、产品化' },
  { id: 'vercel', name: 'Vercel', character: '极简、高对比' },
  { id: 'notion', name: 'Notion', character: '柔和、文档感' },
  { id: 'claude', name: 'Claude', character: '温暖、自然' },
  { id: 'apple', name: 'Apple', character: '清澈、精致' },
  { id: 'figma', name: 'Figma', character: '鲜明、创作感' },
  { id: 'binance', name: 'Binance', character: '数据、交易感' },
  { id: 'slack', name: 'Slack', character: '协作、活力' },
]

export function decodeOpenLoopSettings(value: unknown): OpenLoopVisualSettings | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const preset = OPENLOOP_PRESET_IDS.includes(record.preset as OpenLoopPreset) ? record.preset as OpenLoopPreset : 'linear'
  const appearance = record.appearance === 'light' || record.appearance === 'dark' || record.appearance === 'system' ? record.appearance : 'system'
  return { preset, appearance }
}

export function resolvePalette(settings: OpenLoopVisualSettings, systemDark: boolean) {
  const appearance: OpenLoopResolvedAppearance = settings.appearance === 'system' ? (systemDark ? 'dark' : 'light') : settings.appearance
  return { appearance, values: OPENLOOP_PRESETS[settings.preset][appearance] }
}

export function paletteVariables(settings: OpenLoopVisualSettings, systemDark: boolean): Record<string, string> {
  const { values } = resolvePalette(settings, systemDark)
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [`--openloop-${key}`, value]))
}

// ---- DSH 插件形态（0.3.0 起：theme 升级为正式 bundle，作为视觉插件族的设置页宿主与共享 client 模块）----
// 服务端不注册任何能力：工具/路由在 panels 等消费者包里；本包的价值在 client 半（设置页 + 共享 token 模块）。
export const name = 'openloop-dsh-base'

export function apply(ctx: Context, config: Config): void {
  // 服务端公共能力接线（base 重构 2026-08-22）：
  // 1) runtime 资产注册 service（单例注册表；消费者经 ctx.inject 使用——
  //    不能走模块导入，消费者会把 base/server 打成无状态副本导致注册表分裂）
  const runtimeAssets = createRuntimeAssetsService()
  ctx.provide('openloop-base/runtime', runtimeAssets)
  // 预置公共库（v2 首批：pico.css / chart.js UMD；react19 完整 runtime 后续批次）
  // URL 带 content hash（manifest.json 构建期生成），磁盘文件在 assets/preset/。
  // 同步读取（readFileSync）——async apply 会在 cordis fiber 上留下
  // 「cannot create effect on inactive context」隐患（0.4.2→0.4.3 修复，
  // disable→enable 循环后复现）。
  const presetDir = fileURLToPath(new URL('../assets/preset/', import.meta.url))
  const presetManifest = JSON.parse(readFileSync(join(presetDir, 'manifest.json'), 'utf8')) as Record<string, { hash: string }>
  for (const name of Object.keys(presetManifest)) {
    runtimeAssets.registerRuntimeAssets([name], { dir: presetDir })
  }
  // 2) /openloop/runtime 资产路由的唯一供应商。webServer 为可选依赖——
  //    headless 等无 webServer 环境下静默跳过（注册 service 仍然可用）。
  ctx.inject(['webServer'], (webCtx: Context) => {
    new RuntimeAssetsRoute(webCtx.webServer, runtimeAssets.resolve.bind(runtimeAssets)).register(webCtx)
    // 3) 公共 fetch 代理（artifact v2 openloop.fetch 桥的服务端；本机源白名单经部署配置）
    webCtx.effect(
      () => registerBaseFetchRoute(webCtx, webCtx.webServer, { allowedOrigins: config.allowLoopbackOrigins }),
      'openloop-base: fetch proxy route',
    )
  })
}
