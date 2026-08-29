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
export { connectServer };
