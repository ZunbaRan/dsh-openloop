import type { Context } from '@deepseek-ai/cordis'
import type { McpRuntimeService } from '@openloop/dsh-mcp-runtime'

export * from './security.ts'

export const name = 'openloop-dsh-mcp-apps'
export const inject = ['mcpRuntime']

export function apply(ctx: Context): void {
  // The browser host consumes the durable presentation envelope. The runtime
  // service is required here so this plugin can never become an independent
  // MCP connection owner when the host is composed without the tool bridge.
  void (ctx.mcpRuntime as McpRuntimeService)
}

export default { name, inject, apply }
