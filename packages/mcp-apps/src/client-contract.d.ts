import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'

export interface McpAppsClientOptions {
  readonly toolNames?: readonly string[]
}

export declare const name: string
export declare const inject: string[]
export declare function registerMcpAppToolViews(ctx: ClientContext, toolNames: readonly string[]): void
export declare function apply(ctx: ClientContext, options?: McpAppsClientOptions): void
declare const plugin: { name: string; inject: string[]; apply: (ctx: ClientContext) => void }
export default plugin
