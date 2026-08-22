/**
 * pack 宿主车道加载器（§12，client 侧）。
 *
 * - `loadPackComponent(name, component, props)`：动态 `await import(entryUrl)`，
 *   entryUrl 由 pack 路由 serve（§9 `/openloop/packs/<name>/<path>`）。
 * - **入口 URL 契约（v1）**：client 固定请求虚拟入口 `entry.js`，pack 路由（serve.ts）
 *   从注册表把 `entry.js` 解析为 manifest.entry 实际文件。这样 client 无需知道
 *   manifest.entry 值，服务端调整入口路径不影响加载器。
 * - 对外契约：pack 组件默认导出 React 组件函数（§12.2）；loader 返回该组件；
 *   import 失败 / 默认导出缺失 / props 非法一律抛**可读错误**（面向开发者可自修正）。
 * - 本模块**不依赖注册表**（registry.ts）：pack/component 的注册校验已在服务端
 *   tool.execute 完成（validation.isPackComponent，§5.4）；这里只负责加载与契约校验。
 *   同时避免把 node 依赖（registry → validation → node:net）带进 client bundle。
 * - 测试注入：`opts.entryUrl` / `opts.importModule`（loader mock 成功/失败用例）。
 */
import type { ComponentType } from 'react'
import type { JsonObject } from '../contract.ts'
import { PACKS_ROUTE, PACK_ENTRY_VIRTUAL } from './manifest.ts'

/** pack 组件入参：`props` = widget.source.props（§5.1）；`data` = §5.2 解析结果（resolved[widgetId]） */
export interface PackComponentProps {
  props: JsonObject
  data?: unknown
}

/** 对外契约：pack 组件 = 默认导出的 React 组件函数 */
export type PackComponent = ComponentType<PackComponentProps>

export interface LoadPackComponentOptions {
  /** 测试注入：entry 模块 URL；缺省 `packEntryUrl(name)` */
  entryUrl?: string
  /** 测试注入：模块加载函数；缺省运行时动态 `import(url)` */
  importModule?: (url: string) => Promise<unknown>
}

/** pack 入口 URL（虚拟名 entry.js，pack 路由从注册表解析 manifest.entry） */
export function packEntryUrl(name: string): string {
  return `${PACKS_ROUTE}/${name}/${PACK_ENTRY_VIRTUAL}`
}

/**
 * 加载 pack 组件（宿主车道）。成功返回组件函数；任何失败抛可读 Error。
 * props 必须为 JSON 对象（非数组）；component 名仅用于错误消息（注册校验已在服务端完成）。
 */
export async function loadPackComponent(
  name: string,
  component: string,
  props: unknown,
  opts: LoadPackComponentOptions = {},
): Promise<PackComponent> {
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error('loadPackComponent requires a non-empty pack name')
  }
  if (typeof component !== 'string' || component.length === 0) {
    throw new Error(`loadPackComponent for pack "${name}" requires a non-empty component name`)
  }
  if (typeof props !== 'object' || props === null || Array.isArray(props)) {
    throw new Error(`pack "${name}" component "${component}" props must be a JSON object`)
  }

  const entryUrl = opts.entryUrl ?? packEntryUrl(name)
  const importModule = opts.importModule ?? ((url: string) => import(url))

  let module: unknown
  try {
    module = await importModule(entryUrl)
  } catch (error) {
    throw new Error(
      `failed to load pack "${name}" component "${component}": ${describe(error)} (entry: ${entryUrl})`,
    )
  }
  const candidate = (module as Record<string, unknown> | null | undefined)?.default
  if (typeof candidate !== 'function') {
    throw new Error(
      `pack "${name}" component "${component}" does not default-export a React component function ` +
      `(pack contract §12.2: default export must be the component); got ${candidate === undefined ? 'no default export' : typeof candidate}`,
    )
  }
  return candidate as PackComponent
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
