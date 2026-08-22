import runtimePlugin from "@openloop/dsh-mcp-runtime";
import toolsPlugin from "@openloop/dsh-mcp-tools";
import appsPlugin from "@openloop/dsh-mcp-apps";
export * from "@openloop/dsh-mcp-runtime";
export * from "@openloop/dsh-mcp-tools";
export * from "@openloop/dsh-mcp-apps";
//#region src/index.ts
const name = "openloop-dsh-mcp";
const inject = ["webServer"];
async function apply(ctx, config = { servers: [] }) {
	await ctx.plugin(runtimePlugin, config);
	await ctx.plugin(appsPlugin);
	await ctx.plugin(toolsPlugin);
}
//#endregion
export { apply, inject, name };
