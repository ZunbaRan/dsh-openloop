import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ReactElement } from 'react'

export interface McpAppsClientOptions {
  readonly toolNames?: readonly string[]
}

export interface McpAppResourceViewProps {
  /** MCP server id（mcp.json 里的键名） */
  readonly serverId: string
  /** resourceUri 绑定的工具名 */
  readonly toolName: string
  /** ui:// 资源地址 */
  readonly resourceUri: string
  /** 展示名（缺省用 resourceUri） */
  readonly title?: string
  /** iframe 定位 id；多实例并存（dock 多 tile）时须各自稳定唯一 */
  readonly frameId?: string
}

export declare const name: string
export declare const inject: string[]
export declare function registerMcpAppToolViews(ctx: ClientContext, toolNames: readonly string[]): void
export declare function McpAppResourceView(props: McpAppResourceViewProps): ReactElement
export declare function apply(ctx: ClientContext, options?: McpAppsClientOptions): void
declare const plugin: { name: string; inject: string[]; apply: (ctx: ClientContext) => void }
export default plugin
