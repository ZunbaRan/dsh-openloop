import { randomUUID } from "node:crypto";
import { Service } from "@deepseek-ai/cordis";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
//#region src/validation.ts
const MCP_APP_MIME = "text/html;profile=mcp-app";
const MCP_APP_MAX_BYTES = 8388608;
var McpRuntimeError = class extends Error {
	code;
	constructor(code, message, options) {
		super(message, options);
		this.name = "McpRuntimeError";
		this.code = code;
	}
};
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asJsonObject(value) {
	return isRecord(value) ? value : void 0;
}
function isUiResourceUri(uri) {
	return uri.startsWith("ui://") && uri.length > 5;
}
function validateUiBinding(binding, expectedServerId, expectedToolName) {
	if (!isUiResourceUri(binding.resourceUri)) throw new McpRuntimeError("INVALID_BINDING", `MCP App binding must use a ui:// resource: ${binding.resourceUri}`);
	if (expectedServerId !== void 0 && binding.serverId !== expectedServerId) throw new McpRuntimeError("INVALID_BINDING", "MCP App binding server does not match the tool server");
	if (expectedToolName !== void 0 && binding.toolName !== expectedToolName) throw new McpRuntimeError("INVALID_BINDING", "MCP App binding tool does not match the tool");
	if (binding.visibility !== void 0 && binding.visibility !== "inline" && binding.visibility !== "fullscreen") throw new McpRuntimeError("INVALID_BINDING", "MCP App binding visibility is not supported");
	return binding;
}
function getUiMeta(meta) {
	if (!meta) return void 0;
	const ui = meta.ui ?? meta["io.modelcontextprotocol/ui"];
	if (ui === void 0) return void 0;
	if (!isRecord(ui)) throw new McpRuntimeError("RESOURCE_POLICY", "MCP App UI metadata must be an object");
	return ui;
}
function hasOnlySafePolicyValues(value) {
	if (value === void 0) return true;
	if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") return true;
	if (Array.isArray(value)) return value.every(hasOnlySafePolicyValues);
	if (!isRecord(value)) return false;
	return Object.values(value).every(hasOnlySafePolicyValues);
}
function validateAppMetadata(meta) {
	const ui = getUiMeta(meta);
	if (!ui) return;
	if (!hasOnlySafePolicyValues(ui)) throw new McpRuntimeError("RESOURCE_POLICY", "MCP App metadata contains a non-serializable policy value");
	for (const key of [
		"csp",
		"permissions",
		"domain",
		"domains",
		"frameAncestors"
	]) {
		const value = ui[key];
		if (value === void 0) continue;
		if (key === "permissions") {
			if (!isRecord(value)) throw new McpRuntimeError("RESOURCE_POLICY", "MCP App permissions must be an object");
			continue;
		}
		if (key === "domain" || key === "domains" || key === "frameAncestors") {
			if (value !== void 0 && (!Array.isArray(value) || value.length > 0)) throw new McpRuntimeError("RESOURCE_POLICY", `MCP App ${key} policy cannot request an external origin`);
			continue;
		}
		if (!isRecord(value)) throw new McpRuntimeError("RESOURCE_POLICY", "MCP App CSP metadata must be an object");
		for (const [directive, sources] of Object.entries(value)) if (!Array.isArray(sources) || sources.some((source) => typeof source !== "string" || !isSafeCspSource(source))) throw new McpRuntimeError("RESOURCE_POLICY", `MCP App CSP directive ${directive} contains an invalid source`);
	}
}
function appContentSecurityPolicy(meta) {
	validateAppMetadata(meta);
	const ui = getUiMeta(meta);
	const csp = isRecord(ui?.csp) ? ui.csp : void 0;
	const sources = (key) => Array.isArray(csp?.[key]) ? csp[key].filter((value) => typeof value === "string") : [];
	const resource = sources("resourceDomains");
	const connect = sources("connectDomains");
	const frames = sources("frameDomains");
	const directive = (name, values) => `${name} ${values.length > 0 ? values.join(" ") : "'none'"}`;
	return [
		"default-src 'none'",
		directive("script-src", ["'unsafe-inline'", ...resource]),
		directive("style-src", ["'unsafe-inline'", ...resource]),
		directive("img-src", [
			"data:",
			"blob:",
			...resource
		]),
		directive("media-src", [
			"data:",
			"blob:",
			...resource
		]),
		directive("font-src", ["data:", ...resource]),
		directive("worker-src", ["blob:", ...resource]),
		directive("connect-src", connect),
		directive("frame-src", frames),
		"object-src 'none'",
		"base-uri 'none'",
		"form-action 'none'"
	].join("; ");
}
function isSafeCspSource(source) {
	if (source === "'none'" || source === "'self'" || source === "data:" || source === "blob:" || source === "about:") return true;
	try {
		const url = new URL(source);
		return url.protocol === "https:" && url.username === "" && url.password === "" && url.pathname === "/" && url.search === "" && url.hash === "";
	} catch {
		return false;
	}
}
function decodeBase64(value) {
	if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) throw new McpRuntimeError("RESOURCE_ENCODING", "MCP App resource blob is not valid base64");
	const bytes = Uint8Array.from(Buffer.from(value, "base64"));
	if (Buffer.from(bytes).toString("base64") !== value) throw new McpRuntimeError("RESOURCE_ENCODING", "MCP App resource blob has non-canonical base64 encoding");
	return bytes;
}
function utf8(bytes) {
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch (error) {
		throw new McpRuntimeError("RESOURCE_ENCODING", "MCP App resource is not valid UTF-8", { cause: error });
	}
}
function byteLength(value) {
	return new TextEncoder().encode(value).byteLength;
}
function validateAppHtml(html, maxBytes = MCP_APP_MAX_BYTES) {
	if (byteLength(html) > maxBytes) throw new McpRuntimeError("RESOURCE_TOO_LARGE", `MCP App resource exceeds the ${maxBytes}-byte limit`);
}
function validateAppResource(serverId, requestedUri, contents, options = {}) {
	if (!isUiResourceUri(requestedUri)) throw new McpRuntimeError("RESOURCE_URI", `MCP App resources must use ui://: ${requestedUri}`);
	const matching = contents.filter((content) => content.uri === requestedUri);
	if (matching.length !== 1) throw new McpRuntimeError("INVALID_RESOURCE", `MCP App resource response must contain exactly one ${requestedUri}`);
	const content = matching[0];
	if (!content || content.mimeType !== "text/html;profile=mcp-app") throw new McpRuntimeError("RESOURCE_MIME", `MCP App resource MIME must be ${MCP_APP_MIME}`);
	const maxBytes = options.maxBytes ?? 8388608;
	let html;
	if (typeof content.text === "string" && content.blob === void 0) html = content.text;
	else if (typeof content.blob === "string" && content.text === void 0) {
		if (Math.floor(content.blob.length / 4) * 3 > maxBytes) throw new McpRuntimeError("RESOURCE_TOO_LARGE", `MCP App resource exceeds the ${maxBytes}-byte limit`);
		html = utf8(decodeBase64(content.blob));
	} else throw new McpRuntimeError("INVALID_RESOURCE", "MCP App resource must contain exactly one text or blob payload");
	validateAppHtml(html, maxBytes);
	const meta = asJsonObject(content._meta);
	validateAppMetadata(meta);
	return {
		serverId,
		resourceUri: requestedUri,
		mimeType: content.mimeType,
		html,
		...meta ? { _meta: meta } : {}
	};
}
//#endregion
//#region src/mcp-json.ts
/**
* 多作用域 mcp.json 加载（对齐参考实现 dsh-plugin-mcp 的配置体系，2026-08-23）。
*
* 作用域（低 → 高，按 server id 覆盖）：
*   1. cordis config.servers（bundle 默认 / 编程传入——现默认为空）
*   2. 用户全局：$DSH_HOME/mcp.json（缺省 ~/.dsh/mcp.json）
*   3. 项目本地：<process.cwd()>/.dsh/mcp.json
*
* 格式（map 形态，与 dsh-plugin-mcp 兼容）：
* {
*   "servers": {
*     "tldraw": { "type": "http", "url": "http://127.0.0.1:39513/mcp" },
*     "github": { "type": "stdio", "command": "npx", "args": ["-y",
*                "@modelcontextprotocol/server-github"], "env": { "TOKEN": "${GH_TOKEN}" } }
*   }
* }
*
* - type: stdio（command/args/env/cwd）| http | sse（→ streamable-http url）；ws 不支持
* - 字符串值支持 ${ENV_VAR} 插值（url/command/args/env 值/headers 值）
* - 可选 "protocol": "legacy" | "auto" | "2026-07-28"（缺省 auto 探测）
* - 坏条目跳过并 warning（fail-open 至合法子集，与 boot 容错一致）
*/
const DEFAULT_DSH_HOME = () => process.env.DSH_HOME ?? join(homedir(), ".dsh");
/** ${VAR} 环境变量插值（未定义变量替换为空串并 warning） */
function interpolateEnv(value) {
	return value.replaceAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name) => {
		const resolved = process.env[name];
		if (resolved === void 0) {
			console.warn(`[openloop-dsh-mcp-runtime] mcp.json: env var ${match} is undefined (substituted empty)`);
			return "";
		}
		return resolved;
	});
}
/** 单条 mcp.json server 条目 → McpServerConfig；非法返回 undefined（warning 已打） */
function parseServerEntry(id, raw) {
	if (typeof raw !== "object" || raw === null) {
		console.warn(`[openloop-dsh-mcp-runtime] mcp.json: server "${id}" must be an object, skipped`);
		return;
	}
	const entry = raw;
	const type = typeof entry.type === "string" ? entry.type : "stdio";
	const protocol = entry.protocol === "legacy" || entry.protocol === "auto" || entry.protocol === "2026-07-28" ? entry.protocol : void 0;
	if (type === "stdio") {
		if (typeof entry.command !== "string" || entry.command.length === 0) {
			console.warn(`[openloop-dsh-mcp-runtime] mcp.json: stdio server "${id}" requires "command", skipped`);
			return;
		}
		const args = Array.isArray(entry.args) ? entry.args.map((a) => interpolateEnv(String(a))) : void 0;
		const env = entry.env !== void 0 && typeof entry.env === "object" && entry.env !== null ? Object.fromEntries(Object.entries(entry.env).map(([k, v]) => [k, interpolateEnv(String(v))])) : void 0;
		const cwd = typeof entry.cwd === "string" ? entry.cwd : void 0;
		return {
			id,
			...protocol !== void 0 ? { protocol } : {},
			transport: {
				kind: "stdio",
				command: interpolateEnv(entry.command),
				...args !== void 0 ? { args } : {},
				...env !== void 0 ? { env } : {},
				...cwd !== void 0 ? { cwd } : {}
			}
		};
	}
	if (type === "http" || type === "sse") {
		if (typeof entry.url !== "string" || entry.url.length === 0) {
			console.warn(`[openloop-dsh-mcp-runtime] mcp.json: ${type} server "${id}" requires "url", skipped`);
			return;
		}
		const headers = entry.headers !== void 0 && typeof entry.headers === "object" && entry.headers !== null ? Object.fromEntries(Object.entries(entry.headers).map(([k, v]) => [k, interpolateEnv(String(v))])) : void 0;
		return {
			id,
			...protocol !== void 0 ? { protocol } : {},
			transport: {
				kind: "streamable-http",
				url: interpolateEnv(entry.url),
				...headers !== void 0 ? { headers } : {}
			}
		};
	}
	console.warn(`[openloop-dsh-mcp-runtime] mcp.json: server "${id}" has unsupported type "${type}" (stdio/http/sse), skipped`);
}
/** 读单个 mcp.json 文件 → 合法 server 列表（文件缺失/坏 JSON → 空列表 + warning） */
function readMcpJsonFile(path) {
	if (!existsSync(path)) return [];
	let parsed;
	try {
		parsed = JSON.parse(readFileSync(path, "utf8"));
	} catch (error) {
		console.warn(`[openloop-dsh-mcp-runtime] mcp.json: failed to parse ${path} (${error instanceof Error ? error.message : String(error)}), ignored`);
		return [];
	}
	if (typeof parsed !== "object" || parsed === null) {
		console.warn(`[openloop-dsh-mcp-runtime] mcp.json: ${path} must be a JSON object, ignored`);
		return [];
	}
	const servers = parsed.servers;
	if (servers === void 0) return [];
	if (typeof servers !== "object" || servers === null || Array.isArray(servers)) {
		console.warn(`[openloop-dsh-mcp-runtime] mcp.json: ${path} "servers" must be an object map, ignored`);
		return [];
	}
	const result = [];
	for (const [id, raw] of Object.entries(servers)) {
		const parsed_entry = parseServerEntry(id, raw);
		if (parsed_entry !== void 0) result.push(parsed_entry);
	}
	return result;
}
/**
* 多作用域加载与合并（user → project，按 id 后者覆盖前者）。
* cordis config.servers 的合并在调用方完成（bundle 层最低优先级）。
*/
function loadScopedMcpServers(options = {}) {
	const dshHome = options.dshHome ?? DEFAULT_DSH_HOME();
	const projectDir = options.projectDir ?? process.cwd();
	const userServers = readMcpJsonFile(join(dshHome, "mcp.json"));
	const projectServers = readMcpJsonFile(join(projectDir, ".dsh", "mcp.json"));
	const merged = /* @__PURE__ */ new Map();
	for (const server of userServers) merged.set(server.id, server);
	for (const server of projectServers) merged.set(server.id, server);
	return [...merged.values()];
}
/** 合并：cordis config（bundle/编程，最低）← mcp.json 作用域（高） */
function mergeServerConfigs(base, scoped) {
	const merged = /* @__PURE__ */ new Map();
	for (const server of base) merged.set(server.id, server);
	for (const server of scoped) merged.set(server.id, server);
	return [...merged.values()];
}
//#endregion
//#region src/index.ts
const DEFAULT_CLIENT_NAME = "OpenLoop DSH MCP Host";
const DEFAULT_CLIENT_VERSION = "0.1.0";
const DEFAULT_REQUEST_TIMEOUT = 6e4;
function requestOptions(signal, timeout) {
	return signal ? {
		signal,
		timeout
	} : { timeout };
}
var SdkMcpConnection = class {
	client;
	timeout;
	constructor(client, timeout) {
		this.client = client;
		this.timeout = timeout;
	}
	async listTools(signal) {
		return { tools: (await this.client.listTools({}, requestOptions(signal, this.timeout))).tools };
	}
	async callTool(name, args, signal) {
		const result = await this.client.callTool({
			name,
			arguments: args
		}, requestOptions(signal, this.timeout));
		if (!Array.isArray(result.content)) throw new McpRuntimeError("CONNECTION", "Task-based MCP tool results are not supported by this runtime adapter");
		return result;
	}
	async readResource(uri, signal) {
		return await this.client.readResource({ uri }, requestOptions(signal, this.timeout));
	}
	async close() {
		await this.client.close();
	}
};
function sdkCapabilities() {
	return { extensions: { "io.modelcontextprotocol/ui": {} } };
}
function makeTransport(config) {
	if (config.transport.kind === "stdio") {
		const params = {
			command: config.transport.command,
			...config.transport.args ? { args: [...config.transport.args] } : {},
			...config.transport.env ? { env: { ...config.transport.env } } : {},
			...config.transport.cwd ? { cwd: config.transport.cwd } : {},
			stderr: "pipe"
		};
		return new StdioClientTransport(params);
	}
	return new StreamableHTTPClientTransport(new URL(config.transport.url), { ...config.transport.headers ? { requestInit: { headers: { ...config.transport.headers } } } : {} });
}
const defaultMcpConnectionFactory = { async connect(config, options) {
	const transport = makeTransport(config);
	const client = new Client({
		name: options.clientName,
		version: options.clientVersion
	}, {
		capabilities: sdkCapabilities(),
		versionNegotiation: { mode: config.protocol === "2026-07-28" ? { pin: "2026-07-28" } : config.protocol ?? "auto" },
		listChanged: { tools: { onChanged: () => options.onToolsChanged() } },
		enforceStrictCapabilities: false
	});
	try {
		await client.connect(transport, { timeout: options.requestTimeoutMs });
		return new SdkMcpConnection(client, options.requestTimeoutMs);
	} catch (error) {
		await transport.close().catch(() => void 0);
		throw error;
	}
} };
var McpRuntime = class {
	config;
	factory;
	servers = /* @__PURE__ */ new Map();
	constructor(options) {
		this.config = {
			clientName: options.clientName ?? DEFAULT_CLIENT_NAME,
			clientVersion: options.clientVersion ?? DEFAULT_CLIENT_VERSION,
			maxResourceBytes: options.maxResourceBytes ?? 8388608,
			requestTimeoutMs: options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT
		};
		this.factory = options.connectionFactory ?? defaultMcpConnectionFactory;
		for (const server of options.servers) {
			if (!server.id || this.servers.has(server.id)) throw new Error(`MCP server ids must be unique: ${server.id}`);
			this.servers.set(server.id, {
				config: server,
				connection: void 0,
				connecting: void 0,
				state: "disconnected",
				connectionCount: 0,
				error: void 0,
				tools: void 0,
				listeners: /* @__PURE__ */ new Set(),
				closing: false,
				closePromise: void 0,
				closedConnections: /* @__PURE__ */ new WeakSet()
			});
		}
	}
	serverIds() {
		return [...this.servers.keys()];
	}
	status(serverId) {
		const state = this.getServer(serverId);
		return {
			serverId,
			state: state.state,
			connectionCount: state.connectionCount,
			...state.error ? { error: state.error } : {}
		};
	}
	connectionCount(serverId) {
		return this.getServer(serverId).connectionCount;
	}
	onToolsChanged(serverId, listener) {
		const state = this.getServer(serverId);
		state.listeners.add(listener);
		return () => state.listeners.delete(listener);
	}
	async start() {
		const failed = (await Promise.allSettled(this.serverIds().map((serverId) => this.ensureConnection(serverId).then(() => void 0)))).filter((r) => r.status === "rejected");
		if (failed.length > 0) console.warn(`[openloop-dsh-mcp-runtime] ${failed.length} MCP server(s) unreachable at boot (lazy retry on use): ${failed.map((r) => String(r.reason?.message ?? r.reason)).join("; ").slice(0, 300)}`);
	}
	async close() {
		await Promise.all([...this.servers.values()].map((state) => this.closeServer(state)));
	}
	async listTools(serverId, signal) {
		const state = this.getServer(serverId);
		const tools = (await (await this.ensureConnection(serverId)).listTools(signal)).tools.map((tool) => this.normalizeTool(serverId, tool));
		state.tools = tools;
		return tools;
	}
	async callTool(serverId, toolName, args, options = {}) {
		const state = this.getServer(serverId);
		const connection = await this.ensureConnection(serverId);
		const tool = await this.findTool(state, serverId, toolName, options.signal);
		if (options.binding) this.assertBinding(tool, options.binding);
		const result = await connection.callTool(toolName, args, options.signal);
		const structuredContent = asJsonObject(result.structuredContent);
		const resultMeta = asJsonObject(result._meta);
		const canonical = {
			serverId,
			toolName,
			content: result.content,
			isError: result.isError === true,
			...structuredContent ? { structuredContent } : {},
			...resultMeta ? { _meta: resultMeta } : {}
		};
		if (tool.ui && !canonical.isError && options.hydrateApp !== false) try {
			const uiResource = await this.readAppResource(serverId, tool.ui.resourceUri, tool.ui, options.signal);
			return {
				...canonical,
				uiResource
			};
		} catch {}
		return canonical;
	}
	async readAppResource(serverId, resourceUri, binding, signal) {
		const state = this.getServer(serverId);
		const connection = await this.ensureConnection(serverId);
		if (binding) {
			const tool = await this.findTool(state, serverId, binding.toolName, signal);
			this.assertBinding(tool, binding);
		} else {
			const matches = (state.tools ?? await this.listTools(serverId, signal)).filter((tool) => tool.ui?.resourceUri === resourceUri);
			if (matches.length !== 1 || !matches[0]?.ui) throw new McpRuntimeError("INVALID_BINDING", "MCP App resource is not uniquely bound to a tool");
		}
		if (!resourceUri.startsWith("ui://")) throw new McpRuntimeError("RESOURCE_URI", `MCP App resources must use ui://: ${resourceUri}`);
		return validateAppResource(serverId, resourceUri, (await connection.readResource(resourceUri, signal)).contents, { maxBytes: this.config.maxResourceBytes });
	}
	async ensureConnection(serverId) {
		const state = this.getServer(serverId);
		if (state.closing) throw new McpRuntimeError("CONNECTION", `MCP server ${serverId} is closed`);
		if (state.connection) return state.connection;
		if (state.connecting) try {
			const connection = await state.connecting;
			if (state.closing) throw new McpRuntimeError("CONNECTION", `MCP server ${serverId} closed while connecting`);
			return connection;
		} catch (error) {
			if (error instanceof McpRuntimeError) throw error;
			throw new McpRuntimeError("CONNECTION", `MCP server ${serverId} connection failed`, { cause: error });
		}
		state.state = "connecting";
		const connecting = this.factory.connect(state.config, {
			clientName: this.config.clientName,
			clientVersion: this.config.clientVersion,
			requestTimeoutMs: this.config.requestTimeoutMs,
			onToolsChanged: () => {
				state.tools = void 0;
				for (const listener of state.listeners) listener();
			}
		});
		state.connecting = connecting;
		try {
			const connection = await connecting;
			state.connection = connection;
			state.connecting = void 0;
			if (state.closing) {
				await this.closeConnection(state, connection);
				state.connection = void 0;
				state.state = "closed";
				throw new McpRuntimeError("CONNECTION", `MCP server ${serverId} closed while connecting`);
			}
			state.connectionCount += 1;
			state.state = "connected";
			return connection;
		} catch (error) {
			state.connecting = void 0;
			if (state.closing) {
				state.state = "closed";
				throw error instanceof McpRuntimeError ? error : new McpRuntimeError("CONNECTION", `MCP server ${serverId} closed while connecting`, { cause: error });
			}
			state.state = "error";
			state.error = error instanceof Error ? error.message : String(error);
			throw new McpRuntimeError("CONNECTION", `MCP server ${serverId} connection failed: ${state.error}`, { cause: error });
		}
	}
	async closeServer(state) {
		if (state.closePromise) return state.closePromise;
		state.closing = true;
		state.closePromise = (async () => {
			const pending = state.connecting;
			let connection = state.connection;
			if (!connection && pending) connection = await pending.catch(() => void 0);
			state.connection = void 0;
			state.connecting = void 0;
			state.tools = void 0;
			if (connection) await this.closeConnection(state, connection);
			state.state = "closed";
		})();
		await state.closePromise;
	}
	async closeConnection(state, connection) {
		if (state.closedConnections.has(connection)) return;
		state.closedConnections.add(connection);
		await connection.close().catch(() => void 0);
	}
	getServer(serverId) {
		const state = this.servers.get(serverId);
		if (!state) throw new McpRuntimeError("UNKNOWN_SERVER", `Unknown MCP server: ${serverId}`);
		return state;
	}
	async findTool(state, serverId, toolName, signal) {
		const tool = (state.tools ?? await this.listTools(serverId, signal)).find((candidate) => candidate.name === toolName);
		if (!tool) throw new McpRuntimeError("UNKNOWN_TOOL", `Unknown MCP tool: ${serverId}/${toolName}`);
		return tool;
	}
	normalizeTool(serverId, tool) {
		const meta = asJsonObject(tool._meta);
		let ui;
		try {
			validateAppMetadata(meta);
			ui = extractUiBinding(serverId, tool.name, meta);
		} catch {
			ui = void 0;
		}
		return {
			serverId,
			name: tool.name,
			modelVisible: isModelVisible(meta),
			appVisible: isAppVisible(meta),
			...tool.description ? { description: tool.description } : {},
			inputSchema: tool.inputSchema,
			...tool.outputSchema ? { outputSchema: tool.outputSchema } : {},
			...meta ? { _meta: meta } : {},
			...ui ? { ui } : {}
		};
	}
	assertBinding(tool, binding) {
		validateUiBinding(binding, tool.serverId, tool.name);
		if (!tool.ui || tool.ui.resourceUri !== binding.resourceUri) throw new McpRuntimeError("INVALID_BINDING", "MCP App binding is not the binding advertised by the tool");
	}
};
const MCP_APP_ROUTE = "/api/openloop/mcp-app";
const MCP_APP_AUTHORITY_TTL_MS = 36e5;
const MCP_APP_AUTHORITY_LIMIT = 64;
const MCP_APP_CALL_BODY_LIMIT = 1048576;
function readRequestBody(req, maxBytes) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let bytes = 0;
		req.on("data", (chunk) => {
			const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			bytes += value.byteLength;
			if (bytes > maxBytes) {
				reject(new McpRuntimeError("RESOURCE_TOO_LARGE", "MCP App gateway request body is too large"));
				req.destroy();
				return;
			}
			chunks.push(value);
		});
		req.once("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		req.once("error", reject);
	});
}
var McpAppGateway = class {
	runtime;
	webServer;
	authorities = /* @__PURE__ */ new Map();
	constructor(runtime, webServer) {
		this.runtime = runtime;
		this.webServer = webServer;
	}
	register(ctx) {
		ctx.effect(() => this.webServer.register({
			kind: "prefix",
			path: MCP_APP_ROUTE,
			handler: (req, res) => this.handle(req, res)
		}), "mcp-runtime: App resource and call gateway");
		ctx.effect(() => () => this.authorities.clear(), "mcp-runtime: App authority store");
	}
	reference(tool, result) {
		const resource = result.uiResource;
		if (!resource || !("html" in resource) || !tool.ui || resource.resourceUri !== tool.ui.resourceUri) return result;
		this.prune();
		const token = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
		this.authorities.set(token, {
			serverId: tool.serverId,
			resourceUri: resource.resourceUri,
			resource,
			expiresAt: Date.now() + MCP_APP_AUTHORITY_TTL_MS
		});
		const reference = {
			serverId: resource.serverId,
			resourceUri: resource.resourceUri,
			mimeType: resource.mimeType,
			resourceUrl: `${MCP_APP_ROUTE}/resource/${token}`,
			documentUrl: `${MCP_APP_ROUTE}/document/${token}`,
			callToolUrl: `${MCP_APP_ROUTE}/call/${token}`,
			...resource._meta ? { _meta: resource._meta } : {}
		};
		return {
			...result,
			uiResource: reference
		};
	}
	prune() {
		const now = Date.now();
		for (const [token, authority] of this.authorities) if (authority.expiresAt <= now) this.authorities.delete(token);
		while (this.authorities.size >= MCP_APP_AUTHORITY_LIMIT) {
			const oldest = this.authorities.keys().next().value;
			if (oldest === void 0) break;
			this.authorities.delete(oldest);
		}
	}
	authority(token) {
		const authority = this.authorities.get(token);
		if (!authority || authority.expiresAt <= Date.now()) {
			this.authorities.delete(token);
			return;
		}
		return authority;
	}
	async handle(req, res) {
		res.setHeader("Cache-Control", "no-store");
		res.setHeader("X-Content-Type-Options", "nosniff");
		res.setHeader("Referrer-Policy", "no-referrer");
		const pathname = new URL(req.url ?? "/", "http://loopback.invalid").pathname;
		if (pathname === `${MCP_APP_ROUTE}/refresh`) return this.refresh(req, res);
		const match = pathname.match(/^\/api\/openloop\/mcp-app\/(resource|document|call)\/([a-f0-9]{64})$/);
		if (!match) return this.respond(res, 404, { error: "not_found" });
		const kind = match[1];
		const token = match[2];
		const authority = token ? this.authority(token) : void 0;
		if (!authority) return this.respond(res, 404, { error: "expired_or_unknown_authority" });
		if (kind === "resource") {
			if (req.method !== "GET") return this.respond(res, 405, { error: "method_not_allowed" });
			return this.respond(res, 200, { html: authority.resource.html });
		}
		if (kind === "document") {
			if (req.method !== "GET") return this.respond(res, 405, { error: "method_not_allowed" });
			res.statusCode = 200;
			res.setHeader("Content-Type", "text/html; charset=utf-8");
			res.setHeader("Content-Security-Policy", appContentSecurityPolicy(authority.resource._meta));
			res.end(authority.resource.html);
			return;
		}
		if (req.method !== "POST") return this.respond(res, 405, { error: "method_not_allowed" });
		let request;
		try {
			request = asJsonObject(JSON.parse(await readRequestBody(req, MCP_APP_CALL_BODY_LIMIT))) ?? {};
		} catch {
			return this.respond(res, 400, { error: "invalid_request" });
		}
		const name = request.name;
		const args = asJsonObject(request.arguments) ?? {};
		if (typeof name !== "string") return this.respond(res, 400, { error: "invalid_tool_name" });
		if (!(await this.runtime.listTools(authority.serverId)).find((candidate) => candidate.name === name)?.appVisible) return this.respond(res, 403, { error: "tool_not_visible_to_app" });
		const result = await this.runtime.callTool(authority.serverId, name, args, { hydrateApp: false });
		return this.respond(res, 200, result);
	}
	async refresh(req, res) {
		if (req.method !== "POST") return this.respond(res, 405, { error: "method_not_allowed" });
		let request;
		try {
			request = asJsonObject(JSON.parse(await readRequestBody(req, MCP_APP_CALL_BODY_LIMIT))) ?? {};
		} catch {
			return this.respond(res, 400, { error: "invalid_request" });
		}
		const { serverId, toolName, resourceUri } = request;
		if (typeof serverId !== "string" || typeof toolName !== "string" || typeof resourceUri !== "string") return this.respond(res, 400, { error: "invalid_binding" });
		try {
			const tool = (await this.runtime.listTools(serverId)).find((candidate) => candidate.name === toolName);
			if (!tool?.ui || tool.ui.resourceUri !== resourceUri) return this.respond(res, 403, { error: "invalid_binding" });
			const resource = await this.runtime.readAppResource(serverId, resourceUri, tool.ui);
			const referenced = this.reference(tool, {
				serverId,
				toolName,
				content: [],
				isError: false,
				uiResource: resource
			});
			return this.respond(res, 200, referenced.uiResource);
		} catch {
			return this.respond(res, 404, { error: "resource_unavailable" });
		}
	}
	respond(res, status, value) {
		res.statusCode = status;
		res.setHeader("Content-Type", "application/json; charset=utf-8");
		res.end(JSON.stringify(value));
	}
};
function extractUiBinding(serverId, toolName, meta) {
	if (!meta) return void 0;
	const ui = asJsonObject(meta.ui ?? meta["io.modelcontextprotocol/ui"]);
	if (!ui || typeof ui.resourceUri !== "string") return void 0;
	if (ui.visibility !== void 0 && ui.visibility !== "inline" && ui.visibility !== "fullscreen" && !(Array.isArray(ui.visibility) && ui.visibility.every((value) => value === "model" || value === "app"))) throw new McpRuntimeError("INVALID_BINDING", "MCP App binding visibility is not supported");
	return validateUiBinding({
		serverId,
		toolName,
		resourceUri: ui.resourceUri,
		...ui.visibility === "fullscreen" ? { visibility: "fullscreen" } : {},
		_meta: ui
	}, serverId, toolName);
}
function isModelVisible(meta) {
	if (!meta) return true;
	const ui = asJsonObject(meta.ui ?? meta["io.modelcontextprotocol/ui"]);
	if (!ui || !Array.isArray(ui.visibility)) return true;
	return ui.visibility.includes("model");
}
function isAppVisible(meta) {
	if (!meta) return false;
	const ui = asJsonObject(meta.ui ?? meta["io.modelcontextprotocol/ui"]);
	return Boolean(ui && Array.isArray(ui.visibility) && ui.visibility.includes("app"));
}
var McpRuntimeService = class extends Service {
	static inject = ["webServer"];
	runtime;
	appGateway;
	constructor(ctx, config) {
		super(ctx, "mcpRuntime");
		this.runtime = new McpRuntime(config);
		this.appGateway = new McpAppGateway(this.runtime, ctx.webServer);
		this.appGateway.register(ctx);
		ctx.effect(() => () => this.runtime.close(), "mcp-runtime-connection");
	}
	get config() {
		return this.runtime.config;
	}
	serverIds() {
		return this.runtime.serverIds();
	}
	status(serverId) {
		return this.runtime.status(serverId);
	}
	connectionCount(serverId) {
		return this.runtime.connectionCount(serverId);
	}
	onToolsChanged(serverId, listener) {
		return this.runtime.onToolsChanged(serverId, listener);
	}
	start() {
		return this.runtime.start();
	}
	close() {
		return this.runtime.close();
	}
	listTools(serverId, signal) {
		return this.runtime.listTools(serverId, signal);
	}
	callTool(serverId, toolName, args, options = {}) {
		return this.runtime.callTool(serverId, toolName, args, options);
	}
	preparePresentation(tool, result) {
		return this.appGateway?.reference(tool, result) ?? result;
	}
	readAppResource(serverId, resourceUri, binding, signal) {
		return this.runtime.readAppResource(serverId, resourceUri, binding, signal);
	}
};
const name = "openloop-dsh-mcp-runtime";
const inject = ["webServer"];
async function apply(ctx, config) {
	const servers = mergeServerConfigs(config.servers ?? [], loadScopedMcpServers());
	await new McpRuntimeService(ctx, {
		...config,
		servers
	}).start();
}
var src_default = {
	name,
	inject,
	apply
};
//#endregion
export { MCP_APP_MAX_BYTES, MCP_APP_MIME, McpRuntime, McpRuntimeError, McpRuntimeService, appContentSecurityPolicy, apply, asJsonObject, src_default as default, defaultMcpConnectionFactory, inject, interpolateEnv, isRecord, isUiResourceUri, loadScopedMcpServers, mergeServerConfigs, name, parseServerEntry, readMcpJsonFile, validateAppHtml, validateAppMetadata, validateAppResource, validateUiBinding };
