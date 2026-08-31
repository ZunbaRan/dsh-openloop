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
import { createEventRecorder, createPbEventWriter, createPbEventReader } from './event-log.ts'
import { createPbUsageWriter, readApiUsageFromPb } from './api-usage.ts'

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

  // 方向 1 v2：connect_server 的热激活通道（web profile 装 mcp bundle 时存在；
  // headless 无 mcpRuntime → connect 降级为「写盘 + 重启后生效」）
  // 注意（2026-08-30 真机事故）：服务属性必须在 inject 回调的参数 ctx 上读取——
  // 外层 ctx 未声明 inject，直接读 ctx.mcpRuntime 会 throw "cannot get property
  // without inject"，错误被 fiber 吞掉后 connect 永远走降级路径（webServer 同款
  // 回调参数模式才正确）。
  let mcpRuntime: import('@openloop/dsh-mcp-runtime').McpRuntimeService | undefined
  ctx.inject(['mcpRuntime'], (runtimeCtx) => {
    mcpRuntime = runtimeCtx.mcpRuntime
    logger.info('mcpRuntime available — connect_server will hot-activate third-party packs')
  })

  // 启动为 void 异步（apply 同步纪律）；失败只记日志——tool/route 的 ready() 会给
  // 消费方面向 Agent 的错误与重试语义
  void backend.start().then(() => {
    logger.info(`app backend ready (PocketBase ${PB_VERSION})`)
  }).catch(error => {
    logger.error(`app backend failed to start: ${error instanceof Error ? error.message : String(error)}`)
  })

  ctx.tools.register(createAppBackendTool(backend, { getMcpRuntime: () => mcpRuntime }))
  ctx.skills.registerProvider(() => appBackendSkillProvider)
  // P3 自愈 skill：门面故障诊断决策树（backend_health / backend_restart 的用法载体）
  ctx.skills.registerProvider(() => appDoctorSkillProvider)

  // webServer 条件注入（panels 同款模式）：web 环境注册 UI 路由；headless 跳过。
  // mcpRuntime 同款条件捕获（2026-08-30 事故教训：必须经回调参数 ctx 读服务）。
  // 0.5.0：事件/usage 持久化通道（PB 权威 + ring 降级）一并装配进 routes。
  ctx.inject(['webServer'], (routeCtx) => {
    let routeMcpRuntime: import('@openloop/dsh-mcp-runtime').McpRuntimeService | undefined
    routeCtx.inject(['mcpRuntime'], (rc) => {
      routeMcpRuntime = rc.mcpRuntime
    })
    const eventWriter = createPbEventWriter(() => backend.pbClient())
    const recordEvent = createEventRecorder(() => eventWriter)
    const eventReader = createPbEventReader(() => backend.pbClient())
    const usageWriter = createPbUsageWriter(() => backend.pbClient())
    registerAppRoutes(routeCtx, routeCtx.webServer, backend, {
      getMcpRuntime: () => routeMcpRuntime,
      recordEvent,
      listEvents: limit => eventReader.list(limit),
      recordUsage: (source, kind, ok, ms) => { void usageWriter.append(source, kind, ok, ms) },
      readUsage: () => readApiUsageFromPb(backend.pbClient() as never).catch(() => ({ windowMs: 24 * 60 * 60 * 1000, sources: [] })),
    })
    // app 内部钩子共享同一 recorder（connect/disconnect 等经此引用写事件）
    ;(globalThis as unknown as Record<string, unknown>).__openloopRecordEvent = recordEvent
  })

  ctx.effect(() => () => {
    void backend.stop()
  }, 'openloop-dsh-app: backend lifecycle')
}
