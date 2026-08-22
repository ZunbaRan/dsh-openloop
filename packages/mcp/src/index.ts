import type { Context } from '@deepseek-ai/cordis'
import runtimePlugin, { type McpRuntimeOptions } from '@openloop/dsh-mcp-runtime'
import toolsPlugin from '@openloop/dsh-mcp-tools'
import appsPlugin from '@openloop/dsh-mcp-apps'

export * from '@openloop/dsh-mcp-runtime'
export * from '@openloop/dsh-mcp-tools'
export * from '@openloop/dsh-mcp-apps'

export const name = 'openloop-dsh-mcp'
export const inject = ['webServer']

export interface McpBundleConfig extends McpRuntimeOptions {}

export async function apply(ctx: Context, config: McpBundleConfig = { servers: [] }): Promise<void> {
  await ctx.plugin(runtimePlugin, config)
  await ctx.plugin(appsPlugin)
  await ctx.plugin(toolsPlugin)
}
