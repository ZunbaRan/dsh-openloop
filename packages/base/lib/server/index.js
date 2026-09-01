import { readFile } from "node:fs/promises";
import { join } from "node:path";
//#region src/server/net.ts
/**
* OpenLoop base · 服务端公共网络能力（SSRF 防护 + 安全 fetch）。
*
* 抽取自 panels 的 validation.ts / datasource.ts（2026-08-22 base 重构），
* 面向全部 OpenLoop 插件复用：panels 的 api data binding、artifact v2 的
* openloop.fetch 桥等。语义与 panels v0.2.x 完全一致：
*   - 仅 https://（显式白名单可放行本机源，见 options.allowedOrigins）
*   - SSRF 静态判定：环回/私网/link-local/IPv4-mapped 一律拒绝
*   - timeout 缺省 10s、上限 30s；响应体 ≤ 1MB；仅接受 JSON
*/
/** 默认超时（10s） */
const DEFAULT_TIMEOUT_MS = 1e4;
/** 超时上限（30s） */
const MAX_TIMEOUT_MS = 3e4;
/** 响应体大小上限（1MB） */
const MAX_RESPONSE_BYTES = 1048576;
/** 判断 IP 字面量（去掉方括号后的 hostname）是否落在禁连段 */
function isForbiddenIpLiteral(hostname) {
	const isIPv4 = (s) => /^(\d{1,3}\.){3}\d{1,3}$/.test(s);
	const isIPv6 = (s) => s.includes(":");
	if (isIPv4(hostname)) return isForbiddenIPv4(hostname);
	if (isIPv6(hostname)) return isForbiddenIPv6(hostname);
	return false;
}
/** IPv4 段判断：0.0.0.0/8、127.0.0.0/8、10.0.0.0/8、172.16.0.0/12、192.168.0.0/16、169.254.0.0/16 */
function isForbiddenIPv4(hostname) {
	const parts = hostname.split(".").map((part) => Number(part));
	if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
	const [a, b] = parts;
	if (a === 0) return true;
	if (a === 127) return true;
	if (a === 10) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	if (a === 169 && b === 254) return true;
	return false;
}
/** IPv6 段判断：::/::1 环回、fc00::/7 ULA、fe80::/10 link-local、::ffff:a.b.c.d IPv4-mapped */
function isForbiddenIPv6(hostname) {
	const lower = hostname.toLowerCase();
	if (lower === "::" || lower === "::1") return true;
	if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
	if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
	const v4Mapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
	if (v4Mapped?.[1]) return isForbiddenIPv4(v4Mapped[1]);
	return false;
}
/**
* SSRF 静态判定：url 指向环回/内网/不可解析地址时返回 true。
* 普通域名无法在编译期解析，默认放行（fetch 层超时/大小限制兜底）。
*/
function isForbiddenApiUrl(url) {
	let parsed;
	try {
		parsed = new URL(url);
	} catch {
		return true;
	}
	const hostname = parsed.hostname;
	if (hostname === "") return true;
	if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
	if (hostname.startsWith("[") && hostname.endsWith("]")) return isForbiddenIpLiteral(hostname.slice(1, -1));
	return isForbiddenIpLiteral(hostname);
}
/** 校验 api url（fail-closed，错误面向 Agent 可自修正）：https-only + SSRF */
function validateHttpsApiUrl(url, widgetLabel = "widget") {
	let parsed;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error(`${widgetLabel} api source URL "${url}" is not a valid absolute URL`);
	}
	if (parsed.protocol !== "https:") throw new Error(`${widgetLabel} api source URL "${url}" must use https:// (insecure http:// is rejected in v1)`);
	if (isForbiddenApiUrl(url)) throw new Error(`${widgetLabel} api source URL "${url}" points to a loopback/private address, which is forbidden (SSRF guard); use a public https:// endpoint`);
}
/** 归一化 timeoutMs：缺省 10s；超上限 clamp 30s；非法值回退默认 */
function normalizeTimeoutMs(timeoutMs) {
	if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs <= 0) return DEFAULT_TIMEOUT_MS;
	return Math.min(timeoutMs, MAX_TIMEOUT_MS);
}
/** content-type 是否声明为 JSON */
function looksLikeJsonContentType(contentType) {
	return typeof contentType === "string" && contentType.toLowerCase().includes("json");
}
/** 判定并解析 JSON 响应；非 JSON（声明与体解析双失败）抛可自修正错误 */
function parseJsonResponse(contentType, bodyText) {
	const claimed = looksLikeJsonContentType(contentType);
	let parsed;
	try {
		parsed = JSON.parse(bodyText);
	} catch {
		parsed = void 0;
	}
	if (parsed === void 0) {
		if (claimed) throw new Error(`api response content-type is ${JSON.stringify(contentType ?? "")} but the body is not valid JSON`);
		throw new Error(`api response is not JSON (content-type ${JSON.stringify(contentType ?? "")}); only JSON responses are accepted`);
	}
	return parsed;
}
/** 流式读取响应体，超过 maxBytes 立即停止并标记截断（不缓冲超限数据） */
async function readBodyBytes(stream, maxBytes = MAX_RESPONSE_BYTES) {
	const reader = stream.getReader();
	const chunks = [];
	let total = 0;
	let truncated = false;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		if (!value) continue;
		total += value.byteLength;
		if (total > maxBytes) {
			truncated = true;
			break;
		}
		chunks.push(value);
	}
	reader.releaseLock();
	const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return {
		bytes,
		truncated
	};
}
/** 判定 url 源是否命中白名单（origin 精确匹配） */
function matchesAllowedOrigin(url, allowedOrigins) {
	if (!allowedOrigins || allowedOrigins.length === 0) return false;
	try {
		const origin = new URL(url).origin;
		return allowedOrigins.some((allowed) => {
			try {
				return new URL(allowed).origin === origin;
			} catch {
				return false;
			}
		});
	} catch {
		return false;
	}
}
/**
* 安全 fetch + JSON 解析（panels api data binding 与 artifact fetch 桥的共同底座）：
* https-only + SSRF（除非命中 allowedOrigins 白名单）→ timeout abort → ≤1MB 流式限读 → 仅 JSON。
*/
async function safeFetchJson(url, options = {}) {
	if (!matchesAllowedOrigin(url, options.allowedOrigins)) validateHttpsApiUrl(url);
	const timeoutMs = normalizeTimeoutMs(options.timeoutMs);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	const onExternalAbort = () => controller.abort();
	options.signal?.addEventListener("abort", onExternalAbort, { once: true });
	try {
		const response = await (options.fetchFn ?? fetch)(url, {
			signal: controller.signal,
			redirect: "error"
		});
		if (!response.ok) throw new Error(`api request failed with HTTP ${response.status}`);
		if (!response.body) throw new Error("api response has no body");
		const { bytes, truncated } = await readBodyBytes(response.body);
		if (truncated) throw new Error(`api response exceeds the ${MAX_RESPONSE_BYTES}-byte limit`);
		const bodyText = new TextDecoder("utf-8").decode(bytes);
		return parseJsonResponse(response.headers.get("content-type"), bodyText);
	} finally {
		clearTimeout(timer);
		options.signal?.removeEventListener("abort", onExternalAbort);
	}
}
//#endregion
//#region src/server/runtime-assets.ts
/**
* OpenLoop base · runtime 资产共享路由（/openloop/runtime 前缀，注册制）。
*
* 架构（base 重构 2026-08-22）：
* - **路由唯一供应商 = base**（前缀 /openloop/runtime；与其它插件撞前缀时 register 抛错）。
* - **资产文件归属各业务包**：包在自己的 server 模块 import 时调用
*   `registerRuntimeAssets(dir, { 'runtime.react18': 'runtime' })` 完成注册
*   （import 副作用发生在模块加载期，早于任何 cordis apply，无启动顺序问题）。
* - 请求 `<name>.<contentHash>.js|css` → 在注册目录中查 `<fileAlias|name>.<ext>`。
* - `Cache-Control: public, max-age=31536000, immutable`（URL 含 hash，缓存失效靠 URL 变化）。
*
* 迁移自 panels/src/assets.ts（v0.2.x 行为保持：URL 不变、别名映射不变、宽松 hash 匹配不变）。
*/
/** §9 路由前缀：绝对路径、无尾部斜杠 */
const RUNTIME_ASSETS_ROUTE = "/openloop/runtime";
/** 静态资产名：`<name>.<hash>.js|css`；hash 至少 16 位 hex */
const ASSET_PATH_RE = /^([a-zA-Z0-9._-]+)\.([0-9a-f]{16,64})\.(js|css)$/u;
const CONTENT_TYPES = {
	js: "text/javascript; charset=utf-8",
	css: "text/css; charset=utf-8"
};
/** 路由处理器：按注册 service 解析资产文件并回源 */
var RuntimeAssetsRoute = class {
	webServer;
	resolveAsset;
	constructor(webServer, resolveAsset) {
		this.webServer = webServer;
		this.resolveAsset = resolveAsset;
	}
	register(ctx) {
		ctx.effect(() => this.webServer.register({
			kind: "prefix",
			path: RUNTIME_ASSETS_ROUTE,
			handler: (req, res) => this.handle(req, res)
		}), "openloop-base: runtime assets");
	}
	async handle(req, res) {
		res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
		res.setHeader("X-Content-Type-Options", "nosniff");
		res.setHeader("Referrer-Policy", "no-referrer");
		if (req.method !== "GET" && req.method !== "HEAD") {
			res.statusCode = 405;
			res.end();
			return;
		}
		const pathname = new URL(req.url ?? "/", "http://loopback.invalid").pathname;
		const match = (pathname.startsWith(`/openloop/runtime/`) ? pathname.slice(18) : "").match(ASSET_PATH_RE);
		if (!match) {
			res.statusCode = 404;
			res.end();
			return;
		}
		const name = match[1];
		const ext = match[3];
		const entry = this.resolveAsset(name);
		if (!entry) {
			res.statusCode = 404;
			res.end();
			return;
		}
		const file = join(entry.dir, `${entry.aliases?.[name] ?? name}.${ext}`);
		try {
			const body = await readFile(file);
			res.statusCode = 200;
			res.setHeader("Content-Type", CONTENT_TYPES[ext]);
			res.end(req.method === "HEAD" ? void 0 : body);
		} catch {
			res.statusCode = 404;
			res.end();
		}
	}
};
//#endregion
//#region src/server/fetch-route.ts
const BASE_FETCH_ROUTE = "/openloop/base/fetch";
const MAX_BODY_BYTES = 8192;
/**
* 解析同源相对路径：url 以 '/' 开头即相对——只能指向当前所在 server（无法指到
* 内网其他地址，SSRF 面为零），用请求的 Host 头补全成绝对 URL 以便 Node fetch 使用。
* host 缺失/非法时原样返回（后续 safeFetchJson 会以绝对性校验兜底拒绝）。
*/
function resolveFetchTarget(url, host) {
	if (!url.startsWith("/") || typeof host !== "string" || host.length === 0) return url;
	try {
		return new URL(url, `http://${host}`).href;
	} catch {
		return url;
	}
}
/**
* 自身 origin 白名单：把请求的 Host 头对应的 http origin 并入 allowedOrigins，
* 使同源相对路径请求跳过 https-only/SSRF 静态校验（自身 server 的来源天然可信）。
* 外部 https 端点仍走原 SSRF 防护，不受影响。
*/
function ownOriginAllowlist(host, allowedOrigins = []) {
	if (typeof host !== "string" || host.length === 0) return allowedOrigins;
	try {
		const origin = new URL(`http://${host}`).origin;
		return [...allowedOrigins, origin];
	} catch {
		return allowedOrigins;
	}
}
/** 请求体解析（限 8KB；仅 {url, timeoutMs?} 形态） */
function parseFetchRequestBody(raw) {
	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error("request body must be JSON");
	}
	if (typeof parsed !== "object" || parsed === null) throw new Error("request body must be a JSON object");
	const record = parsed;
	if (typeof record.url !== "string" || record.url.length === 0) throw new Error("request body requires a non-empty \"url\" string");
	const timeoutMs = record.timeoutMs === void 0 ? void 0 : normalizeTimeoutMs(Number(record.timeoutMs));
	return {
		url: record.url,
		...timeoutMs !== void 0 ? { timeoutMs } : {}
	};
}
/** 路由注册（ctx.effect 生命周期回收由调用方包裹） */
/** 返回路由 disposer（供 ctx.effect 生命周期回收） */
function registerBaseFetchRoute(_ctx, webServer, options = {}) {
	return webServer.register({
		kind: "exact",
		path: BASE_FETCH_ROUTE,
		handler: (req, res) => {
			handle(req, res, options);
		}
	});
}
async function handle(req, res, options) {
	res.setHeader("Content-Type", "application/json");
	res.setHeader("Cache-Control", "no-store");
	if (req.method !== "POST") {
		res.statusCode = 405;
		res.end(JSON.stringify({
			ok: false,
			error: "POST only"
		}));
		return;
	}
	const chunks = [];
	let total = 0;
	for await (const chunk of req) {
		total += chunk.byteLength;
		if (total > MAX_BODY_BYTES) {
			res.statusCode = 413;
			res.end(JSON.stringify({
				ok: false,
				error: "request body too large"
			}));
			return;
		}
		chunks.push(chunk);
	}
	try {
		const { url, timeoutMs } = parseFetchRequestBody(Buffer.concat(chunks).toString("utf8"));
		const target = resolveFetchTarget(url, req.headers.host);
		const allowedOrigins = ownOriginAllowlist(req.headers.host, options.allowedOrigins);
		const data = await safeFetchJson(target, {
			...timeoutMs !== void 0 ? { timeoutMs } : {},
			...allowedOrigins.length > 0 ? { allowedOrigins } : {}
		});
		res.statusCode = 200;
		res.end(JSON.stringify({
			ok: true,
			status: 200,
			data
		}));
	} catch (error) {
		res.statusCode = 200;
		res.end(JSON.stringify({
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		}));
	}
}
//#endregion
export { BASE_FETCH_ROUTE, DEFAULT_TIMEOUT_MS, MAX_RESPONSE_BYTES, MAX_TIMEOUT_MS, RUNTIME_ASSETS_ROUTE, RuntimeAssetsRoute, isForbiddenApiUrl, looksLikeJsonContentType, normalizeTimeoutMs, parseFetchRequestBody, parseJsonResponse, readBodyBytes, registerBaseFetchRoute, safeFetchJson, validateHttpsApiUrl };
