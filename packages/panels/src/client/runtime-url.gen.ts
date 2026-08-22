/**
 * 生成文件（scripts/build-runtime.mjs 构建时回写）——请勿手改。
 * RUNTIME_ASSET_HASH 与 assets/runtime.js 的内容哈希一致；§9 路由以
 * runtime.<hash>.js 分发（hash 只作 URL 标识，immutable 缓存靠 URL 变化失效）。
 */
export const RUNTIME_ASSET_HASH = '5d9e19a08da736df'

/** 最新 runtime 资产相对 URL（§9；build:runtime 后更新） */
export const RUNTIME_ASSET_PATH = '/openloop/runtime/runtime.react18.5d9e19a08da736df.js'

/** 沙箱 iframe 的 runtime 资产 URL（默认宿主 origin；非宿主环境可传 baseOrigin） */
export function runtimeUrl(baseOrigin = globalThis.location?.origin ?? ''): string {
  return baseOrigin === '' ? RUNTIME_ASSET_PATH : `${baseOrigin}${RUNTIME_ASSET_PATH}`
}
