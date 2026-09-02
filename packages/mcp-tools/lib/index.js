import { McpRuntimeError, isRecord } from "@openloop/dsh-mcp-runtime";
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
/**
* Server 不可用（连不上 / listTools 探测失败）。可用性对齐 runtime.start() 的既有语义
* （2026-08-23）：连接失败停在 server 粒度——跳过该 server 的工具注册，不阻断其它
* server，也不让 apply 失败。runtime 保持 error/disconnected 状态，onToolsChanged
* 惰性重连后自愈。MCP server 是可选外设，不是宿主的硬依赖。
*/
function isServerUnavailable(error) {
	if (error instanceof McpRuntimeError) return error.code === "CONNECTION";
	return true;
}
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
function presentationResult(runtime, tool, result, args) {
	return typeof runtime.preparePresentation === "function" ? runtime.preparePresentation(tool, result, args) : result;
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
			presentationMeta: (args, value) => {
				const result = isRecord(value) ? value : {};
				return toPresentation(tool, callName, presentationResult(runtime, tool, result, isRecord(args) ? args : void 0));
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
		const presented = presentationResult(this.runtime, tool, value, isRecord(exec.arguments) ? exec.arguments : void 0);
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
		let tools;
		try {
			tools = await runtime.listTools(serverId);
		} catch (error) {
			if (isServerUnavailable(error)) return;
			throw error;
		}
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
		const results = await Promise.allSettled(runtime.serverIds().map((serverId) => refreshServer(serverId)));
		for (const result of results) if (result.status === "rejected") throw result.reason;
	};
	/**
	* server 集合动态同步（方向1 connect 热激活，2026-08-28）：新 server 补订
	* onToolsChanged 并（热添加时）立即 best-effort 注册工具；被移除的 server
	* 退订并清掉其已注册工具。与启动容错同语义——连接失败停在 server 粒度。
	* 启动期 refreshNew=false 只建订阅，工具注册由随后的 refreshAll 统一负责。
	*/
	const toolSubscriptions = /* @__PURE__ */ new Map();
	const dropServerTools = (serverId) => {
		const prefix = `${MCP_TOOL_PREFIX_FOR_SERVER(serverId)}__`;
		for (const [callName, current] of registered) {
			if (!callName.startsWith(prefix)) continue;
			codePresentations.dropTool(callName);
			current.dispose();
			registered.delete(callName);
		}
	};
	const syncServerSubscriptions = (refreshNew) => {
		if (disposed) return;
		const live = new Set(runtime.serverIds());
		for (const serverId of live) {
			if (toolSubscriptions.has(serverId)) continue;
			toolSubscriptions.set(serverId, runtime.onToolsChanged(serverId, () => {
				refreshServer(serverId).catch((error) => {
					console.warn(`[openloop-dsh-mcp-tools] tool refresh failed for ${serverId}: ${error instanceof Error ? error.message : String(error)}`);
				});
			}));
			if (refreshNew) refreshServer(serverId).catch((error) => {
				console.warn(`[openloop-dsh-mcp-tools] initial tool refresh failed for ${serverId}: ${error instanceof Error ? error.message : String(error)}`);
			});
		}
		for (const [serverId, dispose] of toolSubscriptions) {
			if (live.has(serverId)) continue;
			dispose();
			toolSubscriptions.delete(serverId);
			dropServerTools(serverId);
		}
	};
	const disposeServersChanged = runtime.onServersChanged(() => {
		syncServerSubscriptions(true);
	});
	syncServerSubscriptions(false);
	const disposeResultObserver = ctx.on("tools/result", (exec, result) => {
		const tool = registered.get(exec.name)?.tool;
		if (tool) codePresentations.capture(exec, result, tool);
	});
	const disposeCodeDispatchLog = ctx.on("tools/code-dispatch-log", async (dispatch, next) => {
		const block = codePresentations.take(dispatch);
		const content = await next();
		return block ? [...content, block] : content;
	});
	ctx.effect(() => () => {
		disposed = true;
		disposeResultObserver();
		disposeCodeDispatchLog();
		codePresentations.clear();
		disposeServersChanged();
		for (const dispose of toolSubscriptions.values()) dispose();
		toolSubscriptions.clear();
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
