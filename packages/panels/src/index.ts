import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import z from '@deepseek-ai/schemastery'
import type { PanelDefinition, PanelMeta } from './contract.ts'
import { definePanelTool, coercePanelArg } from './tool.ts'
import { compilePanelCustomCode } from './compiler.ts'
import { panelsSkillProviders } from './skills/index.ts'
import { createCtxPanelFs, createPanelStore, PANELS_SUBDIR, type DshFsLike } from './store.ts'
import { PanelsAssets } from './assets.ts'
import { PanelsRefreshRoute } from './refresh.ts'
import { PanelsPackAssets } from './packs/serve.ts'
import { packRegistry as packRegistryInstance, scanPacksDir } from './packs/registry.ts'
import { registerPack as registerValidationPack } from './validation.ts'

export * from './contract.ts'
export * from './validation.ts'
export * from './datasource.ts'
export { PANEL_TOOL, PANEL_PARAMETERS, PANEL_OUTPUT_SCHEMA, definePanelTool, coercePanelArg } from './tool.ts'
export type { PanelDefinition, PanelMeta }
export { panelsSkillProviders } from './skills/index.ts'
// §11 store：savePanel/loadPanel/listPanels 供 S4 skill 唤起复用
export { createPanelStore, createMemoryPanelFs, createCtxPanelFs, savePanel, loadPanel, listPanels, PANELS_SUBDIR, PLUGIN_VERSION } from './store.ts'
export type { PanelStore, PanelStoreOptions, StoredPanel, PanelFs } from './store.ts'
// §12 packs：manifest / registry / bridge / loader / serve 全部对外（client 端单独经 ./client 消费）
export {
  parsePackManifest,
  packLaneFor,
  isSafePackRelPath,
  PACKS_ROUTE,
  PACK_ENTRY_VIRTUAL,
  PACK_STYLES_VIRTUAL,
  PACK_RUNTIMES,
  HOST_LANE_RUNTIME,
  PACK_NAME_RE,
} from './packs/manifest.ts'
export type { PackManifest, PackRuntime, PackComponentMeta } from './packs/manifest.ts'
export {
  registerPack,
  getPack,
  hasPack,
  listPacks,
  scanPacksDir,
  resetPackRegistry,
  packRegistry,
  PackRegistry,
  nodePackFs,
} from './packs/registry.ts'
export type { RegisteredPack, PackFs, ScanResult } from './packs/registry.ts'
export { toAntdThemeTokens, toMuiThemeTokens } from './packs/bridge.ts'
export type { AntdThemeTokens, MuiThemeInput } from './packs/bridge.ts'
export { loadPackComponent, packEntryUrl } from './packs/loader.ts'
export type { PackComponent, PackComponentProps, LoadPackComponentOptions } from './packs/loader.ts'
export { PanelsPackAssets } from './packs/serve.ts'

export const name = 'openloop-dsh-panels'
// webServer 不入静态 inject：headless profile 无 HTTP 服务，硬依赖会导致插件无法激活（0.1.7 修复）；
// 路由注册改由 apply 内嵌套 ctx.inject(['webServer'], …) 条件触发
export const inject = ['tools', 'fs', 'skills']

/**
 * 插件配置（cordis 约定：同名 type + Schemastery schema，参照 artifact）。
 * §12 外部 pack 启用配置（v1：packsDir 目录扫描；缺省不扫描）。
 */
export interface Config {
  /** pack 扫描目录：`dir` 下每个子目录的 `dsh-pack.json`（§12 启用方式 v1） */
  packsDir?: string
}
export const Config: z<Config> = z.object({
  packsDir: z.string(),
})

export function apply(ctx: Context, config: Config): void {
  const logger = ctx.logger('openloop-dsh-panels')

  // webServer 为可选能力（headless profile 没有 HTTP 服务）：
  // 从静态 inject 移除，改为嵌套 ctx.inject——web 环境服务就绪即注册路由；
  // headless 环境内嵌 fiber 保持 pending 无害，插件本体正常激活。
  // §9 runtime 资产：base 重构后路由由 @openloop/dsh-base 统一供应，
  // panels 在 apply 顶层注册自己的资产目录（react18 沙箱运行时）
  new PanelsAssets().register(ctx)
  ctx.inject(['webServer'], (routeCtx) => {
    // §9 pack 资产路由（panels 私有前缀 /openloop/packs）
    new PanelsPackAssets(routeCtx.webServer).register(routeCtx)
    // §10 刷新通道：client 手动/定时刷新经 POST /openloop/panels/refresh 复用 datasource 解析
    new PanelsRefreshRoute(routeCtx.webServer).register(routeCtx)
  })

  // §12 启用方式 v1：服务端启动时从配置 packsDir 扫描注册 pack（dir 下每个子目录的 dsh-pack.json）
  if (typeof config.packsDir === 'string' && config.packsDir.length > 0) {
    void scanPacksDir(config.packsDir)
      .then(({ registered, errors }) => {
        // 同步 tool 校验白名单（validation.ts）：pack widget（§5.4）的注册校验与注册表一致
        for (const name of registered) {
          const pack = packRegistryInstance.getPack(name)
          if (pack !== undefined) {
            registerValidationPack(pack.manifest.name, Object.keys(pack.manifest.components))
          }
        }
        if (errors.length > 0) logger.warn(`pack scan skipped ${errors.length} entry(s): ${errors.join('; ')}`)
        if (registered.length > 0) logger.info(`registered ${registered.length} external pack(s): ${registered.join(', ')}`)
      })
      .catch(error => logger.warn(`pack scan failed: ${error instanceof Error ? error.message : String(error)}`))
  }
  // S2：panel 工具注册（§5.4 fail-closed 校验 + §5.3 PanelMeta 返回）
  const tool = definePanelTool()
  tool.execute = createPanelExecute(tool, ctx)

  ctx.tools.register(tool)

  // §13 三个 skill 注册（D12 三件套）：预设风格指引 / Agent widget 编写指引 / 外部包接入指引
  for (const provider of panelsSkillProviders) {
    ctx.skills.registerProvider(() => provider)
  }
}

/**
 * panel 工具的执行包装层（导出以便单测）：字符串容错 → load 唤起 → 编译注入 → 持久化。
 *
 * ⚠️ 冻结契约（真机事故 2026-08-22）：dsh-tools 会把 args 深冻结（Object.freeze），
 * 包装层绝不能在原对象上赋值——先浅拷贝 `{ ...args }` 再改，且下游调用必须传拷贝。
 */
export function createPanelExecute(tool: ToolDefinition, ctx: Context): ToolDefinition['execute'] {
  const originalExecute = tool.execute
  return async (args, exec) => {
    const argsLike = { ...(args as Record<string, unknown>) } as { panel?: unknown; load?: unknown; persist?: unknown }
    // 字符串容错必须在 load/panelFile/compile 之前（真机事故：模型把 panel 字符串化），
    // 保证后续编译注入作用于解析后的对象
    if (typeof argsLike.panel === 'string') {
      argsLike.panel = coercePanelArg(argsLike.panel)
    }
    // panelFile 接线（真机事故 2026-08-22：qwen 对 2000+ 字符的面板字符串化时 JSON 语法崩坏率 100%，
    // 但用 write 工具写 JSON 文件（单层编码）完全正确——模型自己发明了这条路径）。
    // 优先级：显式 panel > panelFile > load。
    if ((argsLike.panel === undefined || argsLike.panel === null) && typeof (argsLike as { panelFile?: unknown }).panelFile === 'string' && (argsLike as { panelFile: string }).panelFile.length > 0) {
      const panelFile = (argsLike as { panelFile: string }).panelFile
      const sandboxPolicy = ctx.get('sandboxPolicy') as { resolve?: (req?: { session?: unknown }) => { workspaceRoot?: string } } | undefined
      const resolved = sandboxPolicy?.resolve?.(exec.agent ? { session: exec.agent.session } : undefined)
      const cwd = resolved?.workspaceRoot ?? exec.agent?.session.header.cwd
      const fs = createCtxPanelFs({ fs: (ctx as unknown as { fs: DshFsLike }).fs, cwd, signal: exec.signal, sandboxPolicy: resolved })
      let content: string | undefined
      try {
        content = await fs.readText(panelFile)
      } catch (error) {
        throw new Error(`panelFile "${panelFile}" could not be read: ${error instanceof Error ? error.message : String(error)}`)
      }
      if (content === undefined) {
        throw new Error(`panelFile "${panelFile}" does not exist in the workspace. Write the PanelDefinition JSON to a file first (write tool), then pass its path via panelFile.`)
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(content)
      } catch (error) {
        throw new Error(`panelFile "${panelFile}" contains malformed JSON (${error instanceof SyntaxError ? error.message : String(error)}). Fix the file syntax and retry.`)
      }
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error(`panelFile "${panelFile}" must contain a single PanelDefinition JSON object.`)
      }
      argsLike.panel = parsed
    }
    // §11 唤起接线：panel 缺省且给出 load 时，从存档读取 PanelDefinition 注入（再走正常校验/编译/数据解析）。
    // 存档缺失或读盘失败 → fail-closed 抛出可自修正错误（不静默渲染空面板）。
    if ((argsLike.panel === undefined || argsLike.panel === null) && typeof argsLike.load === 'string' && argsLike.load.length > 0) {
      const sandboxPolicy = ctx.get('sandboxPolicy') as { resolve?: (req?: { session?: unknown }) => { workspaceRoot?: string } } | undefined
      const resolved = sandboxPolicy?.resolve?.(exec.agent ? { session: exec.agent.session } : undefined)
      const cwd = resolved?.workspaceRoot ?? exec.agent?.session.header.cwd
      const fs = createCtxPanelFs({ fs: (ctx as unknown as { fs: DshFsLike }).fs, cwd, signal: exec.signal, sandboxPolicy: resolved })
      const store = createPanelStore({ dir: PANELS_SUBDIR, fs })
      const stored = await store.load(argsLike.load)
      if (stored === undefined) {
        throw new Error(`panel "${argsLike.load}" is not persisted in this workspace. Persist it first with persist: true, or pass a full PanelDefinition.`)
      }
      argsLike.panel = stored.panel
    }
    // §8.3 S3：custom code 服务端编译（sucrase）——编译产物经 PanelMeta 下发给 client 沙箱格；
    // compilePanelCustomCode 幂等（已包装产物直接复用），无 custom widget 时返回原对象。
    const rawPanel = argsLike.panel
    if (typeof rawPanel === 'object' && rawPanel !== null) {
      argsLike.panel = compilePanelCustomCode(rawPanel as PanelDefinition)
    }
    // 注意：必须传拷贝后的 argsLike（解析/唤起/编译的产物），不是冻结的原始 args
    const result = await originalExecute.call(tool, argsLike, exec)
    // §11 持久化接线：panel.persist === true 时经 ctx.fs + sandboxPolicy seams 写盘（存编译后产物，幂等重放）；
    // 写盘失败仅记 warning，绝不阻断渲染（面板展示优先级高于持久化）。
    const panel = argsLike.panel
    // 双通道：工具级 persist 参数 或 面板定义内 persist 字段，任一 true 即写盘
    // （真机事故：模型用了工具级参数，包装层却只读面板字段 → 声称已存实际未写）
    const persist = argsLike.persist === true
      || (typeof panel === 'object' && panel !== null && (panel as Record<string, unknown>).persist === true)
    if (persist) {
      const logger = ctx.logger('openloop-dsh-panels')
      try {
        // IMPL_NOTES §3.2：sandboxPolicy 每次执行解析（session 生效）；cwd 回退链 workspaceRoot → session cwd
        const sandboxPolicy = ctx.get('sandboxPolicy') as { resolve?: (req?: { session?: unknown }) => { workspaceRoot?: string } } | undefined
        const resolved = sandboxPolicy?.resolve?.(exec.agent ? { session: exec.agent.session } : undefined)
        const cwd = resolved?.workspaceRoot ?? exec.agent?.session.header.cwd
        // ctx.fs 为运行时注入服务（无 dsh-fs 类型依赖，结构化对齐 store.DshFsLike）
        const fs = createCtxPanelFs({ fs: (ctx as unknown as { fs: DshFsLike }).fs, cwd, signal: exec.signal, sandboxPolicy: resolved })
        const store = createPanelStore({ dir: PANELS_SUBDIR, fs })
        const { path } = await store.save(panel as PanelDefinition)
        logger.info(`panel "${(panel as PanelDefinition).id}" persisted to ${path}`)
      } catch (error) {
        const id = typeof panel === 'object' && panel !== null ? String((panel as Record<string, unknown>).id ?? '?') : '?'
        logger.warn(`savePanel failed for "${id}": ${error instanceof Error ? error.message : String(error)} (rendering continues)`)
      }
    }
    return result
  }
}
