/**
 * @openloop/dsh-app —— OpenLoop 本地应用后端插件（APP_PLATFORM_DESIGN §4，MVP 验证车）。
 *
 * 职责：
 * - PocketBase 子进程生命周期（pin v0.39.10，下载缓存于 DSH_HOME，数据落 DSH_HOME/data/openloop-app）
 * - 受控门面（facade）：APP/组件/API 注册表 + 看板存储 + dock state 迁移
 * - Agent 通道：tool `app_backend`（execute 前 await backend.ready，启动失败错误面向 Agent）
 * - UI 通道：webServer 路由 /openloop/app/*（headless 无 webServer 时跳过——tools 照常）
 * - skill：openloop-app-backend（skill 即 API 文档）
 *
 * 纪律：cordis apply 保持同步（AGENTS.md 沉淀 #6）——启动为 void 异步；
 *      跨插件通信走受控通道，PocketBase 不对 Agent/前端暴露（沉淀 #1/LDR 结论）。
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { createAppBackend, resolveDshHome, PB_VERSION, type AppBackendOptions } from './backend.ts'
import { createAppBackendTool } from './tool.ts'
import { appBackendSkillProvider } from './skill.ts'
import { appDoctorSkillProvider } from './skill-doctor.ts'
import { registerAppRoutes } from './routes.ts'

export * from './facade.ts'
export * from './schema.ts'
export { createPbClient, PbRequestError } from './pb-client.ts'
export { createAppBackend, resolveDshHome, PB_VERSION } from './backend.ts'
export type { AppBackend, AppBackendOptions, BackendStatus } from './backend.ts'
export { PbWatchdog, WATCHDOG_DEFAULTS } from './watchdog.ts'
export type { WatchdogState, WatchdogOptions } from './watchdog.ts'
export { startPocketBase, findFreePort, ensureBinary, pbAssetName, pbDownloadUrl } from './pb-process.ts'
export type { PbProcessOptions, RunningPb, SuperuserCredentials, PbLogger } from './pb-process.ts'
export { createAppBackendTool, APP_BACKEND_TOOL, APP_BACKEND_PARAMETERS } from './tool.ts'
export { registerAppRoutes, APP_ROUTE } from './routes.ts'
export { seedBuiltinApp, BUILTIN_KINDS } from './seed.ts'

export const name = 'openloop-dsh-app'
// webServer 条件注入（headless 无 HTTP——tools/skills 通道独立于 web）
export const inject = ['tools', 'skills']

export interface Config {
  /** 覆盖 DSH_HOME（默认 $DSH_HOME 或 ~/.dsh；测试用） */
  dshHome?: string
  /** 覆盖 PocketBase 二进制路径（默认 $OPENLOOP_PB_BIN 或 DSH_HOME 缓存下载） */
  binPath?: string
}

export const Config: z<Config> = z.object({
  dshHome: z.string(),
  binPath: z.string(),
})

export function apply(ctx: Context, config: Config = {}): void {
  const logger = ctx.logger('openloop-dsh-app')

  const backendOptions: AppBackendOptions = {
    logger: {
      info: msg => logger.info(msg),
      warn: msg => logger.warn(msg),
      error: msg => logger.error(msg),
    },
  }
  if (typeof config.dshHome === 'string' && config.dshHome.length > 0) backendOptions.dshHome = config.dshHome
  const binPath = typeof config.binPath === 'string' && config.binPath.length > 0 ? config.binPath : process.env.OPENLOOP_PB_BIN
  if (typeof binPath === 'string' && binPath.length > 0) backendOptions.binPath = binPath
  const backend = createAppBackend(backendOptions)

  // 启动为 void 异步（apply 同步纪律）；失败只记日志——tool/route 的 ready() 会给
  // 消费方面向 Agent 的错误与重试语义
  void backend.start().then(() => {
    logger.info(`app backend ready (PocketBase ${PB_VERSION})`)
  }).catch(error => {
    logger.error(`app backend failed to start: ${error instanceof Error ? error.message : String(error)}`)
  })

  ctx.tools.register(createAppBackendTool(backend))
  ctx.skills.registerProvider(() => appBackendSkillProvider)
  // P3 自愈 skill：门面故障诊断决策树（backend_health / backend_restart 的用法载体）
  ctx.skills.registerProvider(() => appDoctorSkillProvider)

  // webServer 条件注入（panels 同款模式）：web 环境注册 UI 路由；headless 跳过
  ctx.inject(['webServer'], routeCtx => {
    registerAppRoutes(routeCtx, routeCtx.webServer, backend)
  })

  ctx.effect(() => () => {
    void backend.stop()
  }, 'openloop-dsh-app: backend lifecycle')
}
