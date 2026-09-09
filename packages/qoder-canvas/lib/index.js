import { defineTool } from "@deepseek-ai/dsh-tools";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readFile, readdir } from "node:fs/promises";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";
//#region src/dsl.ts
/** v0.1 仪表盘节点集（10 节点） */
const NODE_REGISTRY = {
	panel: {
		type: "panel",
		description: "容器面板（嵌套子节点，v0.1 不支持嵌套，保留类型占位）",
		props: {}
	},
	section: {
		type: "section",
		description: "带标题分组",
		props: { title: {
			kind: "string",
			maxLength: 120,
			required: true
		} }
	},
	"stat-card": {
		type: "stat-card",
		description: "统计卡：标签/值/变化量",
		props: {
			label: {
				kind: "string",
				maxLength: 60,
				required: true
			},
			value: {
				kind: "string",
				maxLength: 40,
				required: true
			},
			delta: {
				kind: "number",
				min: -0xe8d4a51000,
				max: 0xe8d4a51000
			},
			deltaLabel: {
				kind: "string",
				maxLength: 20
			},
			tone: {
				kind: "enum",
				values: [
					"default",
					"success",
					"warn",
					"error",
					"info"
				]
			}
		}
	},
	chart: {
		type: "chart",
		description: "图表（line/bar/pie/area）",
		props: {
			chart: {
				kind: "enum",
				values: [
					"line",
					"bar",
					"pie",
					"area"
				],
				required: true
			},
			title: {
				kind: "string",
				maxLength: 120
			},
			series: {
				kind: "chart-series",
				required: true
			}
		}
	},
	table: {
		type: "table",
		description: "数据表（≤100 行）",
		props: {
			title: {
				kind: "string",
				maxLength: 120
			},
			columns: {
				kind: "string-array",
				maxLength: 12,
				itemMaxLength: 40,
				required: true
			},
			rows: {
				kind: "table-data",
				required: true
			}
		}
	},
	"key-value": {
		type: "key-value",
		description: "键值对列表",
		props: {
			title: {
				kind: "string",
				maxLength: 120
			},
			pairs: {
				kind: "kv-pairs",
				maxPairs: 16,
				keyMaxLength: 60,
				valueMaxLength: 200,
				required: true
			}
		}
	},
	markdown: {
		type: "markdown",
		description: "极简 markdown 文本（标题/列表/加粗/代码，无 HTML）",
		props: { text: {
			kind: "string",
			maxLength: 8e3,
			required: true
		} }
	},
	callout: {
		type: "callout",
		description: "高亮提示框",
		props: {
			tone: {
				kind: "enum",
				values: [
					"info",
					"success",
					"warn",
					"error"
				]
			},
			title: {
				kind: "string",
				maxLength: 120
			},
			text: {
				kind: "string",
				maxLength: 2e3,
				required: true
			}
		}
	},
	action: {
		type: "action",
		description: "行动按钮：点击把 intent+context 编排为草稿注入输入框",
		props: {
			label: {
				kind: "string",
				maxLength: 60,
				required: true
			},
			intent: {
				kind: "string",
				maxLength: 120,
				required: true
			},
			context: {
				kind: "context-object",
				maxBytes: 4096
			}
		}
	},
	link: {
		type: "link",
		description: "外链（仅 http/https）",
		props: {
			label: {
				kind: "string",
				maxLength: 120,
				required: true
			},
			href: {
				kind: "string",
				maxLength: 2048,
				required: true
			}
		}
	},
	html: {
		type: "html",
		description: "自由 HTML 块（画布沙箱内渲染，支持脚本；元素级标注同文档原生生效）。用于富排版/演示/设计稿——baoyu-design 等设计 skill 的产物放这里；结构化内容仍用专用节点",
		props: {
			source: {
				kind: "html-source",
				maxBytes: 102400,
				required: true
			},
			title: {
				kind: "string",
				maxLength: 120
			}
		}
	}
};
const LAYOUTS = [
	"grid",
	"flow",
	"split-h",
	"split-v"
];
const LIMITS = {
	maxNodes: 32,
	maxDocumentBytes: 262144,
	maxNodeBytes: 16384,
	maxSeries: 8,
	maxPointsPerSeries: 200,
	maxTableRows: 100,
	maxTableColumns: 12,
	maxTitleLength: 120,
	maxEdges: 64
};
var CanvasValidationError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "CanvasValidationError";
	}
};
/**
* 错误聚合收集器（0.1.2 真机修复）：一轮校验收集【全部】错误统一报出——
* 真机教训：单错快抛导致模型 32 次重试才收敛（每轮 10s 只买到一个信息点）。
* 同一节点超过 3 个错误即截断（防错误风暴）；校验函数照旧提前 return 不抛。
*/
var ErrorCollector = class {
	items = [];
	fail(path, why, expected) {
		const hint = expected !== void 0 ? ` Expected: ${expected}.` : "";
		this.items.push(`${path}: ${why}.${hint}`);
	}
	get size() {
		return this.items.length;
	}
	throwIfAny(max = 3) {
		if (this.items.length === 0) return;
		const shown = this.items.slice(0, max);
		const more = this.items.length > max ? ` (+${this.items.length - max} more — fix the listed ones and re-run; remaining errors will be reported next round)` : "";
		throw new CanvasValidationError(`canvas document invalid (${this.items.length} error${this.items.length > 1 ? "s" : ""}):\n${shown.map((s) => `  - ${s}`).join("\n")}${more}\nFix ALL listed fields and retry.`);
	}
};
/** 当前校验回合的收集器（validateCanvasDocument 每次调用重建） */
let collector = null;
function fail(path, why, expected) {
	if (collector !== null) collector.fail(path, why, expected);
}
const ID_RE = /^[a-zA-Z0-9_-]{1,32}$/;
const CANVAS_ID_RE = /^cv_[a-z0-9]{8}$/;
function isValidCanvasId(id) {
	return CANVAS_ID_RE.test(id);
}
/** 生成 canvasId：cv_ + 8 位 base32（host 专用） */
function generateCanvasId(rand = Math.random) {
	const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
	let out = "cv_";
	for (let i = 0; i < 8; i += 1) out += alphabet[Math.floor(rand() * 36)];
	return out;
}
function byteSize(value) {
	return JSON.stringify(value)?.length ?? 0;
}
function isPlainObject(v) {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}
function checkString(path, v, maxLength) {
	if (typeof v !== "string") {
		fail(path, "must be a string", "string");
		return "";
	}
	if (v.length > maxLength) fail(path, `length ${v.length} exceeds max ${maxLength}`, `≤ ${maxLength} chars`);
	return v;
}
function checkProp(path, value, rule) {
	switch (rule.kind) {
		case "string":
			if (value === void 0) {
				if (rule.required === true) fail(path, "is required");
				return;
			}
			checkString(path, value, rule.maxLength);
			return;
		case "number":
			if (value === void 0) {
				if (rule.required === true) fail(path, "is required");
				return;
			}
			if (typeof value !== "number" || !Number.isFinite(value)) {
				fail(path, "must be a finite number", "number");
				return;
			}
			if (rule.min !== void 0 && value < rule.min) fail(path, `${value} < min ${rule.min}`);
			if (rule.max !== void 0 && value > rule.max) fail(path, `${value} > max ${rule.max}`);
			return;
		case "enum":
			if (value === void 0) {
				if (rule.required === true) fail(path, "is required");
				return;
			}
			if (typeof value !== "string" || !rule.values.includes(value)) {
				fail(path, `must be one of ${rule.values.join("/")}`, rule.values.join(" | "));
				return;
			}
			return;
		case "boolean":
			if (value === void 0) {
				if (rule.required === true) fail(path, "is required");
				return;
			}
			if (typeof value !== "boolean") {
				fail(path, "must be boolean", "true | false");
				return;
			}
			return;
		case "string-array":
			if (value === void 0) {
				if (rule.required === true) fail(path, "is required");
				return;
			}
			if (!Array.isArray(value)) {
				fail(path, "must be an array", "string[]");
				return;
			}
			if (value.length > rule.maxLength) fail(path, `array length ${value.length} exceeds max ${rule.maxLength}`);
			for (let i = 0; i < value.length; i += 1) checkString(`${path}[${i}]`, value[i], rule.itemMaxLength);
			return;
		case "kv-pairs": {
			if (value === void 0) {
				if (rule.required === true) fail(path, "is required");
				return;
			}
			if (!isPlainObject(value)) {
				fail(path, "must be an object", "{ key: value }");
				return;
			}
			const keys = Object.keys(value);
			if (keys.length > rule.maxPairs) fail(path, `${keys.length} pairs exceeds max ${rule.maxPairs}`);
			for (const k of keys) {
				checkString(`${path}.${k} (key)`, k, rule.keyMaxLength);
				checkString(`${path}.${k}`, value[k], rule.valueMaxLength);
			}
			return;
		}
		case "chart-series":
			if (value === void 0) {
				if (rule.required === true) fail(path, "is required");
				return;
			}
			if (!Array.isArray(value)) {
				fail(path, "must be an array of series", "series[]");
				return;
			}
			if (value.length > LIMITS.maxSeries) fail(path, `${value.length} series exceeds max ${LIMITS.maxSeries}`);
			for (let i = 0; i < value.length; i += 1) {
				const s = value[i];
				if (!isPlainObject(s)) fail(`${path}[${i}]`, "must be an object", "{ name, points }");
				const name = s["name"];
				if (typeof name !== "string" || name.length > 60) fail(`${path}[${i}].name`, "must be string ≤ 60");
				const points = s["points"];
				if (!Array.isArray(points)) fail(`${path}[${i}].points`, "must be an array", "{x, y}[]");
				if (points.length > LIMITS.maxPointsPerSeries) fail(`${path}[${i}].points`, `${points.length} points exceeds max ${LIMITS.maxPointsPerSeries}`);
				for (let j = 0; j < points.length; j += 1) {
					const p = points[j];
					if (!isPlainObject(p)) fail(`${path}[${i}].points[${j}]`, "must be { x, y }");
					const x = p["x"], y = p["y"];
					if (typeof x !== "number" && typeof x !== "string") fail(`${path}[${i}].points[${j}].x`, "must be number or string");
					if (typeof y !== "number" || !Number.isFinite(y)) fail(`${path}[${i}].points[${j}].y`, "must be a finite number");
				}
			}
			return;
		case "table-data":
			if (value === void 0) {
				if (rule.required === true) fail(path, "is required");
				return;
			}
			if (!Array.isArray(value)) {
				fail(path, "must be an array of rows", "row[][]");
				return;
			}
			if (value.length > LIMITS.maxTableRows) fail(path, `${value.length} rows exceeds max ${LIMITS.maxTableRows}; aggregate the data first`);
			for (let i = 0; i < value.length; i += 1) {
				const row = value[i];
				if (!Array.isArray(row)) {
					fail(`${path}[${i}]`, "must be an array (one cell per column)");
					continue;
				}
				if (row.length > LIMITS.maxTableColumns) fail(`${path}[${i}]`, `${row.length} cells exceeds max ${LIMITS.maxTableColumns}`);
				for (let j = 0; j < row.length; j += 1) {
					const cell = row[j];
					if (cell === null || cell === void 0) continue;
					if (typeof cell !== "string" && typeof cell !== "number" && typeof cell !== "boolean") fail(`${path}[${i}][${j}]`, "must be string/number/boolean/null");
					if (typeof cell === "string" && cell.length > 300) fail(`${path}[${i}][${j}]`, "cell text exceeds 300 chars");
				}
			}
			return;
		case "context-object": {
			if (value === void 0) {
				if (rule.required === true) fail(path, "is required");
				return;
			}
			if (!isPlainObject(value)) {
				fail(path, "must be a flat object", "{ string|number|boolean }");
				return;
			}
			const bytes = byteSize(value);
			if (bytes > rule.maxBytes) fail(path, `size ${bytes}B exceeds max ${rule.maxBytes}B`);
			for (const k of Object.keys(value)) {
				const v = value[k];
				if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") fail(`${path}.${k}`, "must be string/number/boolean (flat object only)");
				if (typeof v === "string" && v.length > 2e3) fail(`${path}.${k}`, "value exceeds 2000 chars");
			}
			return;
		}
		case "html-source": {
			if (value === void 0) {
				if (rule.required === true) fail(path, "is required");
				return;
			}
			if (typeof value !== "string") {
				fail(path, "must be a string (complete HTML document or fragment)", "html string");
				return;
			}
			const bytes = byteSize(value);
			if (bytes > rule.maxBytes) fail(path, `size ${bytes}B exceeds max ${rule.maxBytes}B; inline scripts/styles count — move large assets to http(s) URLs`);
			return;
		}
	}
}
function checkHref(path, href) {
	const normalized = href.trim().toLowerCase();
	if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) fail(path, "href scheme must be http or https", "https://…");
}
/** 结构性错误（无法继续校验）——抛哨兵异常中断本轮回合，由 validateCanvasDocument 的 finally 统一报错 */
function unreachable() {
	throw new CanvasValidationError("__structural__");
}
/** 校验画布 document（fail-closed；错误聚合后统一抛 CanvasValidationError，面向 Agent 自修正） */
function validateCanvasDocument(value) {
	collector = new ErrorCollector();
	try {
		return validateInner(value);
	} catch (error) {
		if (error instanceof CanvasValidationError && error.message === "__structural__") {} else throw error;
		return {
			title: "",
			layout: "grid",
			nodes: [],
			edges: []
		};
	} finally {
		try {
			collector.throwIfAny();
		} finally {
			collector = null;
		}
	}
}
function validateInner(value) {
	if (!isPlainObject(value)) {
		fail("document", "must be a JSON object");
		throw unreachable();
	}
	const bytes = byteSize(value);
	if (bytes > LIMITS.maxDocumentBytes) fail("document", `size ${bytes}B exceeds max ${LIMITS.maxDocumentBytes}B; reduce nodes or data volume`);
	const title = value["title"];
	if (typeof title !== "string" || title.length === 0) fail("title", "must be a non-empty string");
	else if (title.length > LIMITS.maxTitleLength) fail("title", `length exceeds max ${LIMITS.maxTitleLength}`);
	const layout = value["layout"];
	if (typeof layout !== "string" || !LAYOUTS.includes(layout)) fail("layout", `must be one of ${LAYOUTS.join("/")}`, LAYOUTS.join(" | "));
	const nodes = value["nodes"];
	if (!Array.isArray(nodes)) {
		fail("nodes", "must be an array");
		throw unreachable();
	}
	if (nodes.length === 0) fail("nodes", "must contain at least 1 node");
	if (nodes.length > LIMITS.maxNodes) fail("nodes", `${nodes.length} nodes exceeds max ${LIMITS.maxNodes}`);
	const seenIds = /* @__PURE__ */ new Set();
	for (let i = 0; i < nodes.length; i += 1) {
		const n = nodes[i];
		const path = `nodes[${i}]`;
		if (!isPlainObject(n)) {
			fail(path, "must be an object");
			continue;
		}
		if (!(n["type"] === "html") && byteSize(n) > LIMITS.maxNodeBytes) fail(path, `size exceeds max ${LIMITS.maxNodeBytes}B`);
		const id = n["id"];
		if (typeof id !== "string" || !ID_RE.test(id)) fail(`${path}.id`, "must match [a-zA-Z0-9_-]{1,32}");
		else if (seenIds.has(id)) fail(`${path}.id`, `duplicate node id "${id}"`);
		else seenIds.add(id);
		const type = n["type"];
		if (typeof type !== "string") {
			fail(`${path}.type`, "must be a string");
			continue;
		}
		const def = NODE_REGISTRY[type];
		if (def === void 0) {
			fail(`${path}.type`, `unknown node type "${type}"`, Object.keys(NODE_REGISTRY).join(" | "));
			continue;
		}
		const props = n["props"];
		if (!isPlainObject(props)) {
			fail(`${path}.props`, "must be an object");
			continue;
		}
		for (const [key, rule] of Object.entries(def.props)) checkProp(`${path}.props.${key}`, props[key], rule);
		if (type === "link" && typeof props["href"] === "string") checkHref(`${path}.props.href`, props["href"]);
		for (const key of Object.keys(props)) if (!(key in def.props)) fail(`${path}.props.${key}`, `unknown prop for ${type}; allowed: ${Object.keys(def.props).join(", ") || "(none)"}`);
	}
	const edges = value["edges"];
	const checkedEdges = [];
	if (edges !== void 0) {
		if (!Array.isArray(edges)) {
			fail("edges", "must be an array");
			throw unreachable();
		}
		if (edges.length > LIMITS.maxEdges) fail("edges", `${edges.length} edges exceeds max ${LIMITS.maxEdges}`);
		for (let i = 0; i < edges.length; i += 1) {
			const e = edges[i];
			if (!isPlainObject(e)) {
				fail(`edges[${i}]`, "must be { from, to }");
				continue;
			}
			const from = e["from"], to = e["to"];
			const fromOk = typeof from === "string" && seenIds.has(from);
			const toOk = typeof to === "string" && seenIds.has(to);
			if (!fromOk) fail(`edges[${i}].from`, `must reference an existing node id`);
			if (!toOk) fail(`edges[${i}].to`, "must reference an existing node id");
			if (fromOk && toOk) checkedEdges.push({
				from,
				to
			});
		}
	}
	for (const key of Object.keys(value)) if (key !== "title" && key !== "layout" && key !== "nodes" && key !== "edges") fail(key, "unknown top-level field", "title | layout | nodes | edges");
	return {
		title,
		layout,
		nodes,
		edges: checkedEdges
	};
}
//#endregion
//#region src/storage.ts
/**
* 存储根（M4 落盘修复，2026-09-06 实证）：绝对路径 $DSH_HOME/data/qoder-canvas。
* 真机教训：相对路径（'qoder-canvas/...'）被 sandbox resolve 到【进程 cwd】
* （非会话工作区），workspace-write 模式直接 file access denied——save 从
* S4 起从未落盘。DSH_HOME 语义与 app 包 resolveDshHome 一致。
*/
function resolveStorageRoot() {
	return join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), "data", "qoder-canvas");
}
/** workspace 路径 → 隔离键（与 dsh 会话编码同风格：路径分隔符转下划线） */
function workspaceKeyOf(cwd) {
	if (cwd === void 0 || cwd.length === 0) return "_no-cwd";
	return cwd.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}
var CanvasStorage = class {
	fs;
	policy;
	workspaceKey;
	rootDir;
	constructor(options) {
		this.fs = options.fs;
		this.policy = options.policy;
		this.workspaceKey = options.workspaceKey;
		this.rootDir = options.rootDir ?? resolveStorageRoot();
	}
	async targetFor(canvasId, rev) {
		try {
			return await this.fs.resolve(`${this.rootDir}/${this.workspaceKey}/${canvasId}/${rev}.json`);
		} catch {
			return null;
		}
	}
	async save(snapshot, signal) {
		const target = await this.targetFor(snapshot.canvasId, snapshot.revision);
		if (target === null) throw new Error("qoder-canvas storage: fs.resolve failed");
		await this.fs.writeText(target, JSON.stringify(snapshot), void 0, signal, this.policy);
	}
	/** 目录列举（listDir 可用时；canvasId 目录内的 rev 文件名） */
	async revisionsOfDir(canvasId) {
		if (typeof this.fs.listDir !== "function") return null;
		try {
			const dir = await this.fs.resolve(`${this.rootDir}/${this.workspaceKey}/${canvasId}`);
			const entries = await this.fs.listDir(dir);
			const revs = [];
			for (const e of entries) {
				const m = /^(\d+)\.json$/.exec(e.name);
				if (e.type === "file" && m !== null) revs.push(Number(m[1]));
			}
			return revs;
		} catch {
			return null;
		}
	}
	/** 读最新快照（listDir 优先；降级线性扫描——listDir 不可用的桩环境） */
	async latest(canvasId) {
		const revs = await this.revisionsOfDir(canvasId);
		if (revs !== null && revs.length > 0) {
			const max = Math.max(...revs);
			return await this.read(canvasId, max);
		}
		for (let rev = 999; rev >= 1; rev -= 1) {
			const snap = await this.read(canvasId, rev);
			if (snap !== null) return snap;
		}
		return null;
	}
	async read(canvasId, revision) {
		if (!Number.isInteger(revision) || revision < 1 || revision > 999) return null;
		const target = await this.targetFor(canvasId, revision);
		if (target === null) return null;
		let raw;
		try {
			raw = await this.fs.readText(target);
		} catch {
			return null;
		}
		try {
			const parsed = JSON.parse(raw);
			if (parsed?.kind !== "qoder-canvas" || parsed.canvasId !== canvasId || parsed.revision !== revision) return null;
			return parsed;
		} catch {
			return null;
		}
	}
	/**
	* 画布清单（工作区目录/工具 list 参数）：listDir 扫 workspace 根，
	* 每个 cv_* 目录列 rev 文件，读最新 rev 拿标题。listDir 不可用（旧桩）返回空。
	*/
	async list() {
		if (typeof this.fs.listDir !== "function") return [];
		let entries;
		try {
			const wsDir = await this.fs.resolve(`${this.rootDir}/${this.workspaceKey}`);
			entries = await this.fs.listDir(wsDir);
		} catch {
			return [];
		}
		const out = [];
		for (const e of entries) {
			if (e.type !== "directory" || !/^cv_[a-z0-9]{8}$/.test(e.name)) continue;
			const revs = await this.revisionsOfDir(e.name) ?? [];
			if (revs.length === 0) continue;
			const latestSnap = await this.read(e.name, Math.max(...revs));
			if (latestSnap === null) continue;
			out.push({
				canvasId: e.name,
				title: latestSnap.canvas.title,
				revision: latestSnap.revision,
				revisions: [...revs].sort((a, b) => a - b),
				updatedAt: ""
			});
		}
		return out;
	}
};
//#endregion
//#region src/annotate.ts
const RATE_LIMIT_PER_MINUTE = 60;
async function readBody(req, maxBytes = 65536) {
	const chunks = [];
	let total = 0;
	for await (const chunk of req) {
		total += chunk.byteLength;
		if (total > maxBytes) throw new Error("request body too large");
		chunks.push(chunk);
	}
	return Buffer.concat(chunks).toString("utf8");
}
function json$2(res, status, body) {
	res.setHeader("Content-Type", "application/json");
	res.setHeader("Cache-Control", "no-store");
	res.statusCode = status;
	res.end(JSON.stringify(body));
}
function setupAnnotateAudit(ctx, opts) {
	const injectFn = ctx.inject;
	if (typeof injectFn !== "function") return;
	ctx.effect(() => {
		let disposed = false;
		injectFn.call(ctx, ["webServer"], (routeCtx) => {
			const ws = routeCtx?.webServer;
			if (disposed || ws === void 0 || typeof ws.register !== "function") return;
			const hits = /* @__PURE__ */ new Map();
			const rateLimited = (key) => {
				const now = Date.now();
				const window = (hits.get(key) ?? []).filter((t) => now - t < 6e4);
				if (window.length >= RATE_LIMIT_PER_MINUTE) return true;
				window.push(now);
				hits.set(key, window);
				return false;
			};
			ws.register({
				kind: "exact",
				path: "/qoder-canvas/annotate",
				handler: async (req, res) => {
					const h = (k) => {
						const v = req.headers[k];
						return typeof v === "string" ? v : Array.isArray(v) ? v[0] ?? "" : "";
					};
					const origin = h("origin");
					const host = h("host");
					let allowed = false;
					if (origin.length > 0) try {
						allowed = new URL(origin).host === host;
					} catch {
						allowed = false;
					}
					if (!allowed) {
						json$2(res, 403, { error: "forbidden origin" });
						return;
					}
					let body = null;
					try {
						body = JSON.parse(await readBody(req));
					} catch {
						json$2(res, 400, { error: "invalid json body" });
						return;
					}
					if (typeof body?.canvasId !== "string" || !/^cv_[a-z0-9]{8}$/.test(body.canvasId) || typeof body?.note !== "string" || body.note.length === 0 || body.note.length > 2e3 || !Array.isArray(body?.targets) || body.targets.length > 32 || !body.targets.every((t) => typeof t === "string" && t.length <= 32)) {
						json$2(res, 400, { error: "invalid annotation payload" });
						return;
					}
					if (rateLimited(body.canvasId)) {
						json$2(res, 429, { error: "rate limited" });
						return;
					}
					const line = JSON.stringify({
						at: (/* @__PURE__ */ new Date()).toISOString(),
						canvasId: body.canvasId,
						revision: typeof body.revision === "number" ? body.revision : null,
						targets: body.targets,
						note: body.note
					});
					try {
						opts.writeLog(line);
					} catch {}
					json$2(res, 200, { ok: true });
				}
			});
		});
		return () => {
			disposed = true;
		};
	});
}
//#endregion
//#region src/read.ts
function json$1(res, status, body) {
	res.setHeader("Content-Type", "application/json");
	res.setHeader("Cache-Control", "no-store");
	res.statusCode = status;
	res.end(JSON.stringify(body));
}
function setupCanvasReadEndpoint(ctx, opts) {
	const injectFn = ctx.inject;
	if (typeof injectFn !== "function") return;
	ctx.effect(() => {
		let disposed = false;
		injectFn.call(ctx, ["webServer"], (routeCtx) => {
			const ws = routeCtx?.webServer;
			if (disposed || ws === void 0 || typeof ws.register !== "function") return;
			const allowed = (req) => {
				const h = (k) => {
					const v = req.headers[k];
					return typeof v === "string" ? v : Array.isArray(v) ? v[0] ?? "" : "";
				};
				const origin = h("origin");
				if (origin.length === 0) return true;
				const host = h("host");
				try {
					return new URL(origin).host === host;
				} catch {
					return false;
				}
			};
			ws.register({
				kind: "prefix",
				path: "/qoder-canvas/canvas",
				handler: async (req, res) => {
					if (!allowed(req)) {
						json$1(res, 403, { error: "forbidden origin" });
						return;
					}
					const url = new URL(req.url ?? "/", "http://loopback.invalid");
					const id = url.pathname.replace(/^\/qoder-canvas\/canvas\/?/, "");
					if (!/^cv_[a-z0-9]{8}$/.test(id)) {
						json$1(res, 400, { error: "malformed canvas id" });
						return;
					}
					const wsKey = url.searchParams.get("workspaceKey");
					const storage = opts.storageFor(wsKey !== null && wsKey.length > 0 ? wsKey : "_no-cwd");
					const revRaw = url.searchParams.get("rev");
					const snapshot = revRaw !== null && /^\d+$/.test(revRaw) ? await storage.read(id, Number(revRaw)) : await storage.latest(id);
					if (snapshot === null) {
						json$1(res, 404, { error: "canvas not found" });
						return;
					}
					json$1(res, 200, snapshot);
				}
			});
			ws.register({
				kind: "exact",
				path: "/qoder-canvas/diag",
				handler: async (req, res) => {
					try {
						if (!allowed(req)) {
							json$1(res, 403, { error: "forbidden origin" });
							return;
						}
						json$1(res, 200, opts.diag !== void 0 ? opts.diag() : { diag: "unavailable" });
					} catch (error) {
						json$1(res, 500, { error: error instanceof Error ? error.message : String(error) });
					}
				}
			});
			ws.register({
				kind: "exact",
				path: "/qoder-canvas/list",
				handler: async (req, res) => {
					try {
						if (!allowed(req)) {
							json$1(res, 403, { error: "forbidden origin" });
							return;
						}
						const wsKey = new URL(req.url ?? "/", "http://loopback.invalid").searchParams.get("workspaceKey");
						json$1(res, 200, { items: await opts.storageFor(wsKey !== null && wsKey.length > 0 ? wsKey : "_no-cwd").list() });
					} catch (error) {
						json$1(res, 500, { error: error instanceof Error ? error.message : String(error) });
					}
				}
			});
		});
		return () => {
			disposed = true;
		};
	});
}
//#endregion
//#region src/app-serve.ts
/**
* app-serve：canvas iframe 的壳端点 + app.js 静态资源端点（0.12）。
*
* - GET /qoder-canvas/app      → 壳 HTML（挂载点 div + ESM script 引 app.js）
* - GET /qoder-canvas/app.js   → lib/app.js（tsdown 第三 entry 产物，node 侧读盘）
*
* 端点纪律（read.ts 同款）：ctx.effect 包裹 disposer + 运行时注入（headless
* 静默降级）+ Origin 动态 host 校验。app.js 定位：import.meta.url 同目录
* （node 侧 lib/app-serve.js 与 lib/app.js 同级）。
*/
const SHELL_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  #openloop-canvas-app-root { min-height: 100vh; }
</style>
</head>
<body>
<div id="openloop-canvas-app-root"></div>
<script>
// 诊断信（0.12 排查期）：模块加载成败/运行时错误回传宿主 console
window.addEventListener('error', function (e) {
  try { parent.postMessage({ __openloopCanvasAppDiag: true, kind: 'error', message: String(e.message || e.error), src: String(e.filename || '') + ':' + e.lineno }, '*') } catch (_) {}
}, true);
window.addEventListener('unhandledrejection', function (e) {
  try { parent.postMessage({ __openloopCanvasAppDiag: true, kind: 'rejection', message: String(e.reason) }, '*') } catch (_) {}
});
try { parent.postMessage({ __openloopCanvasAppDiag: true, kind: 'shell-loaded' }, '*') } catch (_) {}
<\/script>
<script type="module" src="/qoder-canvas/app.js" onerror="try{parent.postMessage({__openloopCanvasAppDiag:true,kind:'module-error',message:'app.js failed to load (network/CORS)'},'*')}catch(_){}"><\/script>
</body>
</html>`;
/** 定位 lib/app.js（与本文件产物同级；读失败缓存 null 只报一次） */
function locateAppBundle() {
	try {
		const here = dirname(fileURLToPath(import.meta.url));
		const p = join(here, "app.js");
		readFileSync(p);
		return p;
	} catch {
		return null;
	}
}
function json(res, status, body) {
	res.setHeader("Content-Type", "application/json");
	res.statusCode = status;
	res.end(typeof body === "string" ? body : JSON.stringify(body));
}
function setupCanvasAppEndpoint(ctx, opts) {
	const injectFn = ctx.inject;
	if (typeof injectFn !== "function") return;
	ctx.effect(() => {
		let disposed = false;
		injectFn.call(ctx, ["webServer"], (routeCtx) => {
			const ws = routeCtx?.webServer;
			if (disposed || ws === void 0 || typeof ws.register !== "function") return;
			const allowed = (req) => {
				const h = (k) => {
					const v = req.headers[k];
					return typeof v === "string" ? v : Array.isArray(v) ? v[0] ?? "" : "";
				};
				const origin = h("origin");
				if (origin === "null" || origin.length === 0) return true;
				const host = h("host");
				try {
					return new URL(origin).host === host;
				} catch {
					return false;
				}
			};
			ws.register({
				kind: "exact",
				path: "/qoder-canvas/app",
				handler: (req, res) => {
					if (!allowed(req)) {
						json(res, 403, { error: "forbidden origin" });
						return;
					}
					res.setHeader("Content-Type", "text/html; charset=utf-8");
					res.setHeader("Cache-Control", "no-store");
					res.statusCode = 200;
					res.end(SHELL_HTML);
				}
			});
			let appJsCache = null;
			let appJsMissing = false;
			ws.register({
				kind: "exact",
				path: "/qoder-canvas/app.js",
				handler: (req, res) => {
					if (!allowed(req)) {
						json(res, 403, { error: "forbidden origin" });
						return;
					}
					if (appJsCache === null && !appJsMissing) {
						const p = locateAppBundle();
						if (p === null) {
							appJsMissing = true;
							ctx.logger?.warn?.("qoder-canvas: lib/app.js not found — canvas iframe app unavailable (rebuild the plugin)");
						} else try {
							appJsCache = readFileSync(p);
						} catch {
							appJsMissing = true;
						}
					}
					if (appJsCache === null) {
						json(res, 500, { error: "app bundle missing" });
						return;
					}
					res.setHeader("Content-Type", "text/javascript; charset=utf-8");
					res.setHeader("Cache-Control", "no-store");
					res.setHeader("Access-Control-Allow-Origin", "*");
					res.statusCode = 200;
					res.end(appJsCache);
				}
			});
		});
		return () => {
			disposed = true;
		};
	});
}
//#endregion
//#region src/skill.ts
/**
* canvas 插件的 skill 通道（0.9.3）：
*
* 1. canvasSkillProvider —— 插件内含 skill（canvas 使用哲学 + companion 清单），
*    artifact 包同款 15 行模板（registerProvider 不依赖 skill-filesystem——
*    AGENTS.md #22 沉淀：那是 preset 级磁盘扫描器，默认禁用；registry/catalog/skill
*    工具链路在当前配置下是活的）
* 2. localSkillsProvider —— 轻量目录扫描（替代被禁的 skill-filesystem）：
*    扫 $DSH_HOME/skills/<name>/SKILL.md，用户自行 clone 的社区 skill 自动入册。
*    简化语义：list 每次实扫（无缓存）；frontmatter 只解析单行 name/description/
*    whenToUse（多行折叠语法不支持——解析失败的 skill 跳过并告警，不炸 provider）
*/
const bundledBody = new URL("../assets/canvas-skill.md", import.meta.url);
const canvasCandidate = {
	name: "canvas-design",
	description: "Author canvas panels (dashboards, designs, prototypes, PPT, diagrams) via the canvas tool: mixed DSL nodes + sandboxed html nodes with element-level annotation feedback. Read before authoring rich layouts or iterating user-annotated canvases.",
	whenToUse: "canvas 工具建布/续编/处理画布标注时；html 节点风格选择时（含 companion skill 路由表）",
	invocation: {
		modelInvocable: true,
		userInvocable: true
	},
	provider: "openloop-qoder-canvas-bundled",
	source: "bundled",
	resourceBase: {
		kind: "directory",
		path: fileURLToPath(new URL("../assets/", import.meta.url))
	},
	rank: BUNDLED_SKILL_RANK,
	locator: bundledBody
};
const canvasSkillProvider = {
	name: canvasCandidate.provider,
	list: () => Promise.resolve([canvasCandidate]),
	async get() {
		return {
			...canvasCandidate,
			content: await readFile(bundledBody, "utf8")
		};
	}
};
const LOCAL_RANK = 100;
function localSkillsRoot() {
	return join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), "skills");
}
/** 简化 frontmatter 解析：只认单行 `key: value`（多行折叠语法跳过该 skill） */
function parseFrontmatter(raw) {
	const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
	if (m === null) return null;
	let name;
	let description;
	let whenToUse;
	for (const line of (m[1] ?? "").split(/\r?\n/)) {
		const kv = /^([a-zA-Z-]+):\s*(.+)$/.exec(line.trim());
		if (kv === null) continue;
		const val = (kv[2] ?? "").trim().replace(/^['"]|['"]$/g, "");
		if (val.length === 0) continue;
		const key = (kv[1] ?? "").toLowerCase();
		if (key === "name" && name === void 0) name = val;
		else if (key === "description" && description === void 0) description = val;
		else if (key === "whentouse" && whenToUse === void 0) whenToUse = val;
	}
	if (name === void 0 || description === void 0) return null;
	return whenToUse !== void 0 ? {
		name,
		description,
		whenToUse
	} : {
		name,
		description
	};
}
/** 提取 frontmatter 之后的正文（skill body 不含 frontmatter） */
function stripFrontmatter(raw) {
	const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(raw);
	return m === null ? raw : raw.slice(m[0].length);
}
const localSkillsProvider = {
	name: "openloop-qoder-canvas-local",
	list: async (options) => {
		const root = localSkillsRoot();
		if (!existsSync(root)) return [];
		const signal = options.signal;
		const out = [];
		let dirs;
		try {
			dirs = (await readdir(root, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
		} catch {
			return [];
		}
		for (const dir of dirs) {
			if (signal?.aborted) break;
			const skillPath = join(root, dir, "SKILL.md");
			try {
				const fm = parseFrontmatter(await readFile(skillPath, "utf8"));
				if (fm === null) continue;
				out.push({
					name: fm.name,
					description: fm.description.slice(0, 300),
					...fm.whenToUse !== void 0 ? { whenToUse: fm.whenToUse.slice(0, 200) } : {},
					invocation: {
						modelInvocable: true,
						userInvocable: true
					},
					provider: localSkillsProvider.name,
					source: "bundled",
					path: skillPath,
					rank: LOCAL_RANK,
					locator: { path: skillPath }
				});
			} catch {}
		}
		return out;
	},
	async get(candidate) {
		const loc = candidate.locator;
		if (loc === void 0 || typeof loc.path !== "string") return void 0;
		try {
			const raw = await readFile(loc.path, "utf8");
			return {
				...candidate,
				content: stripFrontmatter(raw)
			};
		} catch {
			return;
		}
	}
};
//#endregion
//#region src/index.ts
const name = "openloop-qoder-canvas";
const inject = [
	"tools",
	"fs",
	"skills"
];
function argsOf(args) {
	const canvasId = typeof args.canvasId === "string" && args.canvasId.length > 0 ? args.canvasId : void 0;
	const load = typeof args.load === "string" && args.load.length > 0 ? args.load : void 0;
	const list = args.list === true;
	return {
		document: args.document,
		canvasId,
		load,
		list
	};
}
/** 模块级：最近一次写入的 workspaceKey（S4 端点默认 workspace 判定——
*  工作台与写画布的会话同 cwd，读端点缺省用它定位隔离键） */
let lastWorkspaceKey = "_no-cwd";
/** 诊断：最近一次 save 失败原因（M4 排查用；成功则清空） */
let lastSaveError = null;
/**
* 已知设计类 skill（0.9.1 路由 → 0.12 方向修正）：命中即提示 Agent
* 「富 HTML 设计写进 canvas 的 html 节点（沙箱内可标注）并用该 skill 风格」。
*/
const DESIGN_SKILLS = [
	{
		name: "baoyu-design",
		use: "polished UI mockups, interactive prototypes, visual explorations"
	},
	{
		name: "huashu-design",
		use: "high-fidelity prototypes, slides/PPT, animations, expert-review designs"
	},
	{
		name: "kami",
		use: "typeset documents, white papers, one-pagers, slide decks, landing pages"
	},
	{
		name: "archify",
		use: "architecture/workflow/sequence/data-flow diagrams (standalone HTML + inline SVG)"
	},
	{
		name: "lieflat-charts",
		use: "template-driven data-visualization charts and full-page HTML reports"
	}
];
/** 查 skill catalog，返回路由提示文本（无 skill / ctx.skills 缺失 → null） */
async function designSkillHint(ctx, canvasId) {
	let skills;
	try {
		skills = ctx.skills;
	} catch {
		return null;
	}
	if (skills === void 0 || typeof skills.list !== "function") return null;
	let installed = [];
	try {
		installed = (await skills.list()).map((s) => s.name);
	} catch {
		return null;
	}
	const hits = DESIGN_SKILLS.filter((d) => installed.includes(d.name));
	if (hits.length === 0) return null;
	return `Canvas ${canvasId} created. TIP — design skills detected: ${hits.map((h) => `${h.name} (${h.use})`).join("; ")}. For rich HTML designs, author them in the canvas html node in that skill's style — element-level annotation works inside it; DSL nodes stay for structured data content.`;
}
/** execute 内构造 storage（对齐 panels/artifact 模式：ctx 断言取 fs + ctx.get('sandboxPolicy')） */
function storageOf(ctx, exec) {
	const cwdRaw = (exec.agent?.session)?.header?.cwd;
	const cwd = typeof cwdRaw === "string" ? cwdRaw : void 0;
	const policy = {
		mode: "workspace-write",
		workspaceRoot: resolveStorageRoot()
	};
	const fs = ctx.fs;
	const wsKey = workspaceKeyOf(cwd);
	lastWorkspaceKey = wsKey;
	return new CanvasStorage({
		fs,
		policy,
		workspaceKey: wsKey
	});
}
function apply(ctx) {
	try {
		ctx.skills.registerProvider(() => canvasSkillProvider);
		ctx.skills.registerProvider(() => localSkillsProvider);
	} catch (error) {
		ctx.logger?.warn?.(`qoder-canvas skill providers failed to register: ${String(error)}`);
	}
	const originOf = () => {
		const origin = globalThis.location?.origin;
		return typeof origin === "string" && origin.length > 0 ? origin : "http://127.0.0.1:3080";
	};
	setupAnnotateAudit(ctx, {
		origin: originOf,
		writeLog: (line) => {
			try {
				ctx.logger?.info?.(`[annotate] ${line}`);
			} catch {}
		}
	});
	setupCanvasAppEndpoint(ctx, { origin: originOf });
	setupCanvasReadEndpoint(ctx, {
		origin: originOf,
		storageFor: (workspaceKey) => new CanvasStorage({
			fs: ctx.fs,
			workspaceKey: workspaceKey === "_no-cwd" ? lastWorkspaceKey : workspaceKey,
			policy: {
				mode: "workspace-write",
				workspaceRoot: resolveStorageRoot()
			}
		}),
		diag: async () => {
			let skillsDiag = "unavailable";
			try {
				const skillsCtx = ctx.skills;
				if (skillsCtx !== void 0) skillsDiag = (await skillsCtx.list()).map((s) => s.name);
			} catch (error) {
				skillsDiag = `error: ${String(error)}`;
			}
			return {
				lastSaveError,
				lastWorkspaceKey,
				skills: skillsDiag
			};
		}
	});
	ctx.tools.register(defineTool({
		name: "canvas",
		description: "Render a visual canvas — your PRIMARY first-draft output medium (prototypes, plans, structured findings, designs). POSITIONING: canvas is an ideal agent-to-user bridge — it carries dense info AND the user annotates it (click/marquee/text-select elements + comments) that flows back to you as structured <target> context (nodes[i] path + full DSL); it does NOT replace artifacts (interactive HTML/apps), but it excels at first drafts and iteration: engineering plans, product/UX prototypes, small design prototypes, flow diagrams, PPT-style decks, dashboards, comparison matrices. When the user message contains a 画布标注 block, they are pointing at specific nodes — edit exactly those (match path/nodes[i] or the snippet) and re-emit the full document with the same canvasId; each call creates a NEW immutable revision (users may revert to older ones). The user's current open canvas is referenced in messages as 当前画布 when the canvas dock is open. Prefer this over raw HTML for structured/visual content; prefer show_widget for tiny single-metric cards. COMPANION SKILLS (optional, install separately — canvas works fully without them): baoyu-design (polished UI mockups/prototypes), huashu-design (high-fidelity prototypes/slides/PPT), kami (typeset docs/white papers/landing pages), archify (architecture/workflow/sequence diagrams), lieflat-charts (template-driven data-viz charts and reports). DESIGN CONTENT: the html node renders free-form HTML (design-skill output or plain HTML) INSIDE the canvas sandbox WITH full element-level annotation — users can click/marquee/text-select inside it; annotated elements come back with their source snippet. Use DSL nodes for structured data, the html node for rich layouts — but keep each canvas PURE (one form per canvas: DSL-node canvas OR html-node canvas; avoid mixing unless the user explicitly asks). Install location: $DSH_HOME/skills/<name>/ with a SKILL.md.",
		parameters: {
			document: {
				type: "json",
				description: "REQUIRED (unless list=true). Canvas document — ALL fields verified strictly, extra props are REJECTED. Shape: { \"title\": string (REQUIRED, non-empty, ≤120 chars — the canvas heading; never omit it), \"layout\": \"grid\"|\"flow\"|\"split-h\"|\"split-v\" (REQUIRED), \"nodes\": array (REQUIRED, 1-32 items, each { \"id\": [a-zA-Z0-9_-]{1,32} unique, \"type\": one of the 11 below, \"props\": EXACTLY the listed fields — no others }), \"edges\": optional array of { from, to } referencing node ids }. NODE TYPES with exact allowed props — stat-card: { label*: string≤60, value*: string≤40, delta?: number, deltaLabel?: string≤20, tone?: \"default\"|\"success\"|\"warn\"|\"error\"|\"info\" }; chart: { chart*: \"line\"|\"bar\"|\"pie\"|\"area\", series*: array≤8 of { name: string≤60, points: array≤200 of { x: number|string, y: number } }, title?: string≤120 }; table: { columns*: string[]≤12 (each ≤40 chars), rows*: array≤100 of arrays (cells: string≤300/number/boolean/null), title?: string≤120 }; key-value: { pairs*: object ≤16 of key(≤60)→string value(≤200), title?: string≤120 }; markdown: { text*: string≤8000 — supports # headings, - lists, **bold**, `code` only, no HTML }; callout: { text*: string≤2000, tone?: \"info\"|\"success\"|\"warn\"|\"error\", title?: string≤120 }; section: { title*: string≤120 }; action: { label*: string≤60, intent*: string≤120, context?: flat object ≤4KB of string/number/boolean values }; link: { label*: string≤120, href*: \"http(s)://…\" only }; panel: {} (placeholder); html: { source*: string — complete HTML document or fragment ≤100KB, rendered in a canvas-sandboxed shadow DOM WITH element-level annotation (use for rich layouts/design decks; inline JS allowed; reference external assets by http(s) URL), title?: string≤120 }. (* = required). Limits: whole document ≤256KB. Example: { \"title\": \"Deploys\", \"layout\": \"grid\", \"nodes\": [{ \"id\": \"n1\", \"type\": \"stat-card\", \"props\": { \"label\": \"Deploys 24h\", \"value\": \"142\", \"delta\": 12, \"tone\": \"success\" } }, { \"id\": \"n2\", \"type\": \"chart\", \"props\": { \"chart\": \"line\", \"series\": [{ \"name\": \"ok\", \"points\": [{ \"x\": 1, \"y\": 8 }] }] } }] }"
			},
			canvasId: {
				type: "string",
				description: "Existing canvas id (cv_xxxxxxxx) to iterate; omit to create new."
			},
			load: {
				type: "string",
				description: "Load an existing canvas by id as the base, then apply document on top (iterate continuation)."
			},
			list: {
				type: "boolean",
				description: "List existing canvases in this workspace (id/title/revision)."
			}
		},
		output: {
			schema: { type: "json" },
			render: (_args, value) => [{
				type: "text",
				text: typeof value === "string" ? value : JSON.stringify(value)
			}],
			presentationMeta: (_args, value) => {
				const snap = value?.snapshot;
				if (snap === void 0) return {};
				return snap;
			}
		},
		async execute(args, exec) {
			const { document, canvasId, load, list } = argsOf(args);
			const storage = storageOf(ctx, exec);
			if (list) {
				const items = await storage.list();
				if (items.length === 0) return { text: "No canvases in this workspace yet. Create one by calling canvas with a document." };
				return { text: items.map((i) => {
					const revs = i.revisions !== void 0 && i.revisions.length > 1 ? ` [versions: ${i.revisions.join(",")}]` : "";
					return `${i.canvasId} (r${i.revision}) — ${i.title}${revs}`;
				}).join("\n") };
			}
			const targetId = canvasId ?? load;
			if (targetId !== void 0 && !isValidCanvasId(targetId)) return { __error: `canvasId "${targetId}" is malformed; expected cv_ + 8 chars (e.g. cv_7f3k2a9q). Use the exact id from the previous canvas result.` };
			let baseRevision = 0;
			if (targetId !== void 0) {
				const existing = await storage.latest(targetId);
				if (existing === null) return { __error: `Canvas ${targetId} does not exist in this workspace. Call canvas with only a document to create a new one, or use list to see existing ids.` };
				baseRevision = existing.revision;
			}
			if (document === void 0) return { __error: "document is required unless using list. Provide { title, layout, nodes }." };
			let validated;
			try {
				validated = validateCanvasDocument(document);
			} catch (error) {
				if (error instanceof CanvasValidationError) return { __error: error.message };
				return { __error: `canvas document validation failed: ${String(error)}` };
			}
			const finalId = targetId ?? generateCanvasId();
			const snapshot = {
				kind: "qoder-canvas",
				version: 1,
				canvasId: finalId,
				revision: baseRevision + 1,
				canvas: validated
			};
			try {
				await storage.save(snapshot, exec.signal);
				lastSaveError = null;
			} catch (error) {
				lastSaveError = error instanceof Error ? `${error.message} :: ${String(error.stack ?? "").slice(0, 400)}` : String(error);
				ctx.logger?.warn?.(`qoder-canvas storage save failed: ${String(error)}`);
			}
			const skillHint = await designSkillHint(ctx, finalId);
			return JSON.parse(JSON.stringify({
				snapshot,
				...skillHint !== null ? { hint: skillHint } : {}
			}));
		},
		presentCall: () => ({
			card: "generic",
			title: "Canvas · rendering",
			kind: "other"
		}),
		presentResult(_args, result) {
			if (result.isError) return void 0;
			const title = result.meta?.snapshot?.canvas?.title;
			return {
				card: "generic",
				title: typeof title === "string" && title.length > 0 ? title : "Canvas"
			};
		}
	}));
}
//#endregion
export { CanvasStorage, CanvasValidationError, LAYOUTS, LIMITS, NODE_REGISTRY, apply, generateCanvasId, inject, isValidCanvasId, name, resolveStorageRoot, validateCanvasDocument, workspaceKeyOf };
