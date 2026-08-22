import { McpRuntimeOptions } from "@openloop/dsh-mcp-runtime";
import { Context } from "@deepseek-ai/cordis";
export * from "@openloop/dsh-mcp-runtime";
export * from "@openloop/dsh-mcp-tools";
export * from "@openloop/dsh-mcp-apps";
//#region src/index.d.ts
declare const name = "openloop-dsh-mcp";
declare const inject: string[];
interface McpBundleConfig extends McpRuntimeOptions {}
declare function apply(ctx: Context, config?: McpBundleConfig): Promise<void>;
//#endregion
export { McpBundleConfig, apply, inject, name };