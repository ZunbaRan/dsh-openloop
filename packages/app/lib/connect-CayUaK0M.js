import { recordSystemEvent } from "./event-log-B7kLpBeW.js";
import { readFileSync } from "node:fs";
import { parseServerEntry, scopedFilePath, upsertServerToFile } from "@openloop/dsh-mcp-runtime";
//#region src/connect.ts
/** MCP 工具名（可含下划线/大写）→ rid 段（kebab 词法，RID_RE 兼容） */
function ridSegment(name) {
	return name.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}
function toolTitle(serverId, tool) {
	const firstLine = tool.description?.split("\n", 1)[0]?.trim();
	return (firstLine && firstLine.length > 0 ? firstLine : `${serverId} · ${tool.name}`).slice(0, 120);
}
function toolSummary(tool) {
	return {
		name: tool.name,
		...tool.description ? { description: tool.description.slice(0, 160) } : {},
		modelVisible: tool.modelVisible,
		appVisible: tool.appVisible,
		hasUi: Boolean(tool.ui),
		...tool.ui ? { resourceUri: tool.ui.resourceUri } : {}
	};
}
/**
* disconnect_server / reconnect_server —— app-manager 的受控管理动作（2026-08-31）。
*
* 断开 = 热移除 runtime server（工具随之清掉）+ 保留 mcp.json 条目（下次重连即用）
*   + 删除 registry 壳与组件（APP 页/看板 pin 目录不再显示）。
* 重连 = 等价于 connect_server 的 mcp.json 已有条目（热激活 + 探活 + 引用组件落库）。
* 纪律同 connect：错误消息面向 Agent；凭据零接触（条目只是 transport 描述）。
*/
async function disconnectServer(options) {
	const { serverId, dshHome, backend, mcpRuntime } = options;
	const facade = await backend.ready();
	const detail = await facade.getAppDetail(serverId);
	if (detail === void 0) throw new Error(`app "${serverId}" is not registered. Call list_apps to see what exists.`);
	let removed = false;
	if (mcpRuntime !== void 0 && mcpRuntime.serverIds().includes(serverId)) removed = await mcpRuntime.removeServer(serverId);
	const mcpJsonPath = scopedFilePath("user", { dshHome });
	await facade.deleteApp(serverId);
	backend.invalidateRegistry();
	recordSystemEvent("registry", "info", `断开第三方包 ${serverId}（保留配置，可重连）`);
	return {
		ok: true,
		serverId,
		runtimeRemoved: removed,
		mcpJsonEntry: "kept (reconnect to re-activate)",
		mcpJsonPath,
		removedComponents: detail.components.length,
		removedApis: detail.apis.length
	};
}
async function reconnectServer(options) {
	const { serverId, dshHome, backend, mcpRuntime } = options;
	const mcpJsonPath = scopedFilePath("user", { dshHome });
	let entry;
	try {
		entry = JSON.parse(readFileSync(mcpJsonPath, "utf8")).servers?.[serverId];
	} catch {
		entry = void 0;
	}
	if (entry === void 0) throw new Error(`no mcp.json entry for "${serverId}" — disconnected apps keep their entry; if it is gone, use connect_server with a fresh entry`);
	return connectServer({
		...options,
		entry
	});
}
async function connectServer(options) {
	const { serverId, entry, dshHome, backend, mcpRuntime } = options;
	const config = parseServerEntry(serverId, entry);
	if (config === void 0) throw new Error(`invalid MCP server entry for "${serverId}": expected an mcp.json entry object like { "type": "http", "url": "https://…" } or { "type": "stdio", "command": "npx", "args": […] } (optional: headers / env / cwd / protocol "legacy"|"auto"|"2026-07-28"), got ${JSON.stringify(entry).slice(0, 200)}`);
	const mcpJsonPath = scopedFilePath("user", { dshHome });
	upsertServerToFile(mcpJsonPath, serverId, entry);
	let activated = false;
	let state = "saved";
	let tools = [];
	let connectionNote;
	if (mcpRuntime !== void 0) {
		if (mcpRuntime.serverIds().includes(serverId)) await mcpRuntime.removeServer(serverId);
		mcpRuntime.addServer(config);
		activated = true;
		state = "activated";
		try {
			tools = await mcpRuntime.listTools(serverId);
			state = "connected";
		} catch (error) {
			state = "disconnected";
			connectionNote = `server unreachable right now (${error instanceof Error ? error.message : String(error)}) — saved and hot-registered; lazy reconnect will pick it up when the server comes online`;
		}
	}
	const facade = await backend.ready();
	await facade.upsertApp({
		name: serverId,
		displayName: serverId,
		kind: "thirdparty",
		version: "1.0.0",
		description: `MCP Apps 2.0 third-party pack (connected via app_backend connect_server)`
	});
	const components = [];
	for (const tool of tools) {
		if (!tool.ui) continue;
		const row = await facade.registerComponent(serverId, {
			rid: `${serverId}:${ridSegment(tool.name)}`,
			kind: "mcp-app",
			title: toolTitle(serverId, tool),
			entry: {
				serverId,
				toolName: tool.name,
				resourceUri: tool.ui.resourceUri
			},
			description: `MCP App resource (render-time fetch): ${tool.ui.resourceUri}`
		});
		components.push(row);
	}
	recordSystemEvent("registry", state === "disconnected" ? "warn" : "info", `接入第三方包 ${serverId}${activated ? `（${state}，${tools.length} 工具）` : "（已保存，重启后激活）"}`);
	return {
		ok: true,
		serverId,
		scope: "user",
		mcpJsonPath,
		activated,
		state,
		toolCount: tools.length,
		tools: tools.map(toolSummary),
		uiResourceCount: components.length,
		components: components.map((row) => ({
			rid: row.rid,
			title: row.title,
			resourceUri: row.entry?.resourceUri ?? null
		})),
		...connectionNote !== void 0 ? { note: connectionNote } : {},
		...activated ? {} : { note: "saved to user-scope mcp.json; restart DSH to activate (MCP runtime is not loaded in this profile)" }
	};
}
//#endregion
export { connectServer, disconnectServer, reconnectServer };
