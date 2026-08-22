/**
 * OpenLoop base · 服务端公共能力入口。
 * 消费方经 `@openloop/dsh-base/server` 子路径导入。
 * 注意：显式命名 re-export（不用 export *）——rolldown dts 对跨文件 export * 链解析不稳。
 */
export {
  DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS, MAX_RESPONSE_BYTES,
  isForbiddenApiUrl, validateHttpsApiUrl, normalizeTimeoutMs,
  looksLikeJsonContentType, parseJsonResponse, readBodyBytes, safeFetchJson,
} from './net.ts'
export type { SafeFetchOptions } from './net.ts'
export { RUNTIME_ASSETS_ROUTE, RuntimeAssetsRoute } from './runtime-assets.ts'
export type { RuntimeAssetEntry } from './runtime-assets.ts'
// 注册表操作走 cordis service（openloop-base/runtime），此处不导出——
// 模块级单例在消费者打包副本下会分裂（panels 副本注册、base 路由不可见）。
