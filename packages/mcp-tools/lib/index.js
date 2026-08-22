import { isRecord } from "@openloop/dsh-mcp-runtime";
//#region src/contract.ts
const MCP_TOOL_PREFIX = "mcp__";
const MCP_PRESENTATION_KIND = "openloop.dsh-mcp";
const MCP_CODE_DISPATCH_PRESENTATION_PREFIX = "⁣openloop.dsh-mcp/code-dispatch:v1:";
/** PTC Code Mode durable-display transport cap; oversized presentations degrade to ordinary fallback, not 8 MiB rendering. */
const MCP_CODE_DISPATCH_PRESENTATION_MAX_BYTES = 262144;
function mcpToolName(serverId, toolName) {
	return `${MCP_TOOL_PREFIX}${serverId}__${toolName}`;
}
function byteLength(value) {
	return new TextEncoder().encode(value).byteLength;
}
function codeDispatchPresentationBlock(callId, presentation) {
	if (!callId || callId.length > 512 || presentation.callName !== mcpToolName(presentation.serverId, presentation.toolName)) return void 0;
	const envelope = {
		kind: "openloop.dsh-mcp/code-dispatch",
		version: 1,
		callId,
		callName: presentation.callName,
		presentation
	};
	let encoded;
	try {
		encoded = JSON.stringify(envelope);
	} catch {
		return;
	}
	const text = `${MCP_CODE_DISPATCH_PRESENTATION_PREFIX}${encoded}`;
	return byteLength(text) <= 262144 ? {
		type: "text",
		text
	} : void 0;
}
function textFallback(content) {
	const lines = [];
	for (const block of content) {
		if (typeof block !== "object" || block === null) {
			lines.push(String(block));
			continue;
		}
		const record = block;
		if (record.type === "text" && typeof record.text === "string") lines.push(record.text);
		else if (typeof record.type === "string") {
			const mimeType = typeof record.mimeType === "string" ? ` ${record.mimeType}` : "";
			lines.push(`[MCP ${record.type}${mimeType} content preserved in the structured result]`);
		} else lines.push("[MCP content block preserved in the structured result]");
	}
	return lines.join("\n") || "[MCP tool returned no text content]";
}
function toPresentation(tool, callName, result) {
	return {
		kind: MCP_PRESENTATION_KIND,
		version: 1,
		callName,
		serverId: tool.serverId,
		toolName: tool.name,
		...tool._meta ? { toolMeta: tool._meta } : {},
		...tool.ui ? { binding: tool.ui } : {},
		result
	};
}
//#endregion
//#region src/index.ts
const name = "openloop-dsh-mcp-tools";
const inject = ["mcpRuntime", "tools"];
function outputSchema() {
	return {
		type: "object",
		additionalProperties: false,
		required: [
			"serverId",
			"toolName",
			"content",
			"isError"
		],
		properties: {
			serverId: { type: "string" },
			toolName: { type: "string" },
			content: { type: "array" },
			structuredContent: {
				type: "object",
				additionalProperties: true
			},
			isError: { type: "boolean" },
			_meta: {
				type: "object",
				additionalProperties: true
			},
			uiResource: {
				type: "object",
				additionalProperties: true
			}
		}
	};
}
function presentationResult(runtime, tool, result) {
	return typeof runtime.preparePresentation === "function" ? runtime.preparePresentation(tool, result) : result;
}
function makeDefinition(runtime, tool) {
	const callName = mcpToolName(tool.serverId, tool.name);
	return {
		name: callName,
		description: tool.description ?? `Call the ${tool.name} MCP tool on ${tool.serverId}.`,
		parameters: tool.inputSchema,
		output: {
			schema: outputSchema(),
			render: (_args, value) => {
				const result = isRecord(value) ? value : {};
				return [{
					type: "text",
					text: textFallback(Array.isArray(result["content"]) ? result["content"] : [])
				}];
			},
			presentationMeta: (_args, value) => {
				const result = isRecord(value) ? value : {};
				return toPresentation(tool, callName, presentationResult(runtime, tool, result));
			}
		},
		async execute(args, exec) {
			return await runtime.callTool(tool.serverId, tool.name, isRecord(args) ? args : {}, { signal: exec.signal });
		},
		presentCall: () => ({
			card: "generic",
			title: `MCP · ${tool.name}`,
			kind: "other"
		}),
		presentResult: (_args, result) => result.isError ? void 0 : {
			card: "generic",
			title: `MCP · ${tool.name}`
		}
	};
}
var CodeDispatchPresentationBridge = class CodeDispatchPresentationBridge {
	runtime;
	static MAX_PENDING = 128;
	pending = /* @__PURE__ */ new Map();
	constructor(runtime) {
		this.runtime = runtime;
	}
	capture(exec, result, tool) {
		const callId = String(exec.callId);
		this.pending.delete(callId);
		if (exec.parent === void 0 || exec.agent === void 0 || result.isError || !("value" in result)) return;
		const value = result.value;
		if (!isRecord(value) || value.serverId !== tool.serverId || value.toolName !== tool.name || value.isError !== false || !Array.isArray(value.content) || !isRecord(value.uiResource)) return;
		const callName = mcpToolName(tool.serverId, tool.name);
		const presented = presentationResult(this.runtime, tool, value);
		const block = codeDispatchPresentationBlock(String(exec.callId), toPresentation(tool, callName, presented));
		if (!block) return;
		while (this.pending.size >= CodeDispatchPresentationBridge.MAX_PENDING) {
			const oldest = this.pending.keys().next().value;
			if (oldest === void 0) break;
			this.pending.delete(oldest);
		}
		this.pending.set(callId, {
			agent: exec.agent,
			callName,
			block
		});
	}
	take(dispatch) {
		const callId = String(dispatch.subCallId);
		const pending = this.pending.get(callId);
		this.pending.delete(callId);
		if (!pending || pending.agent !== dispatch.agent || pending.callName !== dispatch.name) return void 0;
		return pending.block;
	}
	dropTool(callName) {
		for (const [callId, pending] of this.pending) if (pending.callName === callName) this.pending.delete(callId);
	}
	clear() {
		this.pending.clear();
	}
};
async function apply(ctx) {
	const runtime = ctx.mcpRuntime;
	const registered = /* @__PURE__ */ new Map();
	const codePresentations = new CodeDispatchPresentationBridge(runtime);
	let disposed = false;
	const fingerprint = (tool) => JSON.stringify(tool);
	const refreshServer = async (serverId) => {
		const tools = await runtime.listTools(serverId);
		const wanted = /* @__PURE__ */ new Set();
		for (const tool of tools) {
			if (tool.modelVisible === false) continue;
			const callName = mcpToolName(tool.serverId, tool.name);
			wanted.add(callName);
			const nextFingerprint = fingerprint(tool);
			const current = registered.get(callName);
			if (current?.fingerprint === nextFingerprint) continue;
			codePresentations.dropTool(callName);
			current?.dispose();
			registered.set(callName, {
				dispose: ctx.tools.register(makeDefinition(runtime, tool)),
				fingerprint: nextFingerprint,
				tool
			});
		}
		for (const [callName, current] of registered) if (callName.startsWith(`${MCP_TOOL_PREFIX_FOR_SERVER(serverId)}__`) && !wanted.has(callName)) {
			codePresentations.dropTool(callName);
			current.dispose();
			registered.delete(callName);
		}
	};
	const MCP_TOOL_PREFIX_FOR_SERVER = (serverId) => `mcp__${serverId}`;
	const refreshAll = async () => {
		if (disposed) return;
		await Promise.all(runtime.serverIds().map((serverId) => refreshServer(serverId)));
	};
	const disposeResultObserver = ctx.on("tools/result", (exec, result) => {
		const tool = registered.get(exec.name)?.tool;
		if (tool) codePresentations.capture(exec, result, tool);
	});
	const disposeCodeDispatchLog = ctx.on("tools/code-dispatch-log", async (dispatch, next) => {
		const block = codePresentations.take(dispatch);
		const content = await next();
		return block ? [...content, block] : content;
	});
	const subscriptions = runtime.serverIds().map((serverId) => runtime.onToolsChanged(serverId, () => {
		refreshServer(serverId);
	}));
	ctx.effect(() => () => {
		disposed = true;
		disposeResultObserver();
		disposeCodeDispatchLog();
		codePresentations.clear();
		for (const dispose of subscriptions) dispose();
		for (const current of registered.values()) current.dispose();
		registered.clear();
	}, "mcp-tools-registry");
	await refreshAll();
}
var src_default = {
	name,
	inject,
	apply
};
//#endregion
export { MCP_CODE_DISPATCH_PRESENTATION_MAX_BYTES, MCP_CODE_DISPATCH_PRESENTATION_PREFIX, MCP_PRESENTATION_KIND, MCP_TOOL_PREFIX, apply, codeDispatchPresentationBlock, src_default as default, inject, mcpToolName, name, textFallback, toPresentation };
