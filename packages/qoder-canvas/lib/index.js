import { defineTool } from "@deepseek-ai/dsh-tools";
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
		if (byteSize(n) > LIMITS.maxNodeBytes) fail(path, `size exceeds max ${LIMITS.maxNodeBytes}B`);
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
const DEFAULT_ROOT = "qoder-canvas";
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
		this.rootDir = options.rootDir ?? DEFAULT_ROOT;
	}
	pathFor(canvasId, rev) {
		return this.fs.resolve(`${this.rootDir}/${this.workspaceKey}/${canvasId}/${rev}.json`);
	}
	async save(snapshot, signal) {
		const path = this.pathFor(snapshot.canvasId, snapshot.revision);
		if (path === null) throw new Error("qoder-canvas storage: fs.resolve returned null");
		await this.fs.writeText(path, JSON.stringify(snapshot), void 0, signal, this.policy);
	}
	/** 读最新快照（扫描 rev 递减；v0.1 不存索引文件，快照数 ≤ 轮数，线性可接受） */
	async latest(canvasId) {
		for (let rev = 999; rev >= 1; rev -= 1) {
			const snap = await this.read(canvasId, rev);
			if (snap !== null) return snap;
		}
		return null;
	}
	async read(canvasId, revision) {
		if (!Number.isInteger(revision) || revision < 1 || revision > 999) return null;
		const path = this.pathFor(canvasId, revision);
		if (path === null) return null;
		const raw = await this.fs.readText(path);
		if (raw === null) return null;
		try {
			const parsed = JSON.parse(raw);
			if (parsed?.kind !== "qoder-canvas" || parsed.canvasId !== canvasId || parsed.revision !== revision) return null;
			return parsed;
		} catch {
			return null;
		}
	}
	/** 画布清单（list 参数）：扫 workspace 目录下全部 canvasId 取各自最新 rev */
	async list() {
		return [];
	}
};
//#endregion
//#region src/annotate.ts
const RATE_LIMIT_PER_MINUTE = 60;
function setupAnnotateAudit(ctx, opts) {
	const injectFn = ctx.inject;
	if (typeof injectFn !== "function") return;
	ctx.effect(() => {
		let disposed = false;
		injectFn.call(ctx, ["webServer"], (ws) => {
			if (disposed || ws === void 0 || typeof ws.post !== "function") return;
			const hits = /* @__PURE__ */ new Map();
			const rateLimited = (key) => {
				const now = Date.now();
				const window = (hits.get(key) ?? []).filter((t) => now - t < 6e4);
				if (window.length >= RATE_LIMIT_PER_MINUTE) return true;
				window.push(now);
				hits.set(key, window);
				return false;
			};
			ws.post("/qoder-canvas/annotate", async (req) => {
				const origin = req.request.origin ?? "";
				const referer = req.request.referer ?? "";
				if (!(origin === opts.origin() || origin.length === 0 && (referer.startsWith(opts.origin()) || referer.length === 0))) return {
					status: 403,
					body: { error: "forbidden origin" }
				};
				const body = req.body;
				if (typeof body?.canvasId !== "string" || !/^cv_[a-z0-9]{8}$/.test(body.canvasId) || typeof body?.note !== "string" || body.note.length === 0 || body.note.length > 2e3 || !Array.isArray(body?.targets) || body.targets.length > 32 || !body.targets.every((t) => typeof t === "string" && t.length <= 32)) return {
					status: 400,
					body: { error: "invalid annotation payload" }
				};
				if (rateLimited(body.canvasId)) return {
					status: 429,
					body: { error: "rate limited" }
				};
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
				return {
					status: 200,
					body: { ok: true }
				};
			});
		});
		return () => {
			disposed = true;
		};
	});
}
//#endregion
//#region src/read.ts
function setupCanvasReadEndpoint(ctx, opts) {
	const injectFn = ctx.inject;
	if (typeof injectFn !== "function") return;
	ctx.effect(() => {
		let disposed = false;
		injectFn.call(ctx, ["webServer"], (ws) => {
			if (disposed || ws === void 0 || typeof ws.get !== "function") return;
			ws.get("/qoder-canvas/canvas/:id", async (req) => {
				const origin = req.request.origin ?? "";
				const referer = req.request.referer ?? "";
				if (!(origin === opts.origin() || origin.length === 0 && (referer.startsWith(opts.origin()) || referer.length === 0))) return {
					status: 403,
					body: { error: "forbidden origin" }
				};
				const id = req.params.id;
				if (typeof id !== "string" || !/^cv_[a-z0-9]{8}$/.test(id)) return {
					status: 400,
					body: { error: "malformed canvas id" }
				};
				const wsKey = req.params.workspaceKey;
				const snapshot = await opts.storageFor(typeof wsKey === "string" && wsKey.length > 0 ? wsKey : "_no-cwd").latest(id);
				if (snapshot === null) return {
					status: 404,
					body: { error: "canvas not found" }
				};
				return {
					status: 200,
					body: snapshot
				};
			});
		});
		return () => {
			disposed = true;
		};
	});
}
//#endregion
//#region src/index.ts
const name = "openloop-qoder-canvas";
const inject = ["tools", "fs"];
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
/** execute 内构造 storage（对齐 panels/artifact 模式：ctx 断言取 fs + ctx.get('sandboxPolicy')） */
function storageOf(ctx, exec) {
	const agent = exec.agent;
	const cwdRaw = (agent?.session)?.header?.cwd;
	const cwd = typeof cwdRaw === "string" ? cwdRaw : void 0;
	const policy = ctx.get?.("sandboxPolicy")?.resolve({ ...agent ? { session: agent.session } : {} });
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
	setupCanvasReadEndpoint(ctx, {
		origin: originOf,
		storageFor: (workspaceKey) => new CanvasStorage({
			fs: ctx.fs,
			workspaceKey: workspaceKey === "_no-cwd" ? lastWorkspaceKey : workspaceKey
		})
	});
	ctx.tools.register(defineTool({
		name: "canvas",
		description: "Render a visual canvas panel (dashboard-style layout of stat cards, charts, tables, callouts, action buttons) in the conversation. Use for: analysis reports, deployment/QA dashboards, structured findings. Iterate the same canvas by passing canvasId from the previous result. Prefer this over raw HTML for structured data views; prefer show_widget for tiny single-metric cards.",
		parameters: {
			document: {
				type: "json",
				description: "REQUIRED (unless list=true). Canvas document — ALL fields verified strictly, extra props are REJECTED. Shape: { \"title\": string (REQUIRED, non-empty, ≤120 chars — the canvas heading; never omit it), \"layout\": \"grid\"|\"flow\"|\"split-h\"|\"split-v\" (REQUIRED), \"nodes\": array (REQUIRED, 1-32 items, each { \"id\": [a-zA-Z0-9_-]{1,32} unique, \"type\": one of the 10 below, \"props\": EXACTLY the listed fields — no others }), \"edges\": optional array of { from, to } referencing node ids }. NODE TYPES with exact allowed props — stat-card: { label*: string≤60, value*: string≤40, delta?: number, deltaLabel?: string≤20, tone?: \"default\"|\"success\"|\"warn\"|\"error\"|\"info\" }; chart: { chart*: \"line\"|\"bar\"|\"pie\"|\"area\", series*: array≤8 of { name: string≤60, points: array≤200 of { x: number|string, y: number } }, title?: string≤120 }; table: { columns*: string[]≤12 (each ≤40 chars), rows*: array≤100 of arrays (cells: string≤300/number/boolean/null), title?: string≤120 }; key-value: { pairs*: object ≤16 of key(≤60)→string value(≤200), title?: string≤120 }; markdown: { text*: string≤8000 — supports # headings, - lists, **bold**, `code` only, no HTML }; callout: { text*: string≤2000, tone?: \"info\"|\"success\"|\"warn\"|\"error\", title?: string≤120 }; section: { title*: string≤120 }; action: { label*: string≤60, intent*: string≤120, context?: flat object ≤4KB of string/number/boolean values }; link: { label*: string≤120, href*: \"http(s)://…\" only }; panel: {} (placeholder). (* = required). Limits: whole document ≤256KB. Example: { \"title\": \"Deploys\", \"layout\": \"grid\", \"nodes\": [{ \"id\": \"n1\", \"type\": \"stat-card\", \"props\": { \"label\": \"Deploys 24h\", \"value\": \"142\", \"delta\": 12, \"tone\": \"success\" } }, { \"id\": \"n2\", \"type\": \"chart\", \"props\": { \"chart\": \"line\", \"series\": [{ \"name\": \"ok\", \"points\": [{ \"x\": 1, \"y\": 8 }] }] } }] }"
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
				return { text: items.map((i) => `${i.canvasId} (r${i.revision}) — ${i.title}`).join("\n") };
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
			const snapshot = {
				kind: "qoder-canvas",
				version: 1,
				canvasId: targetId ?? generateCanvasId(),
				revision: baseRevision + 1,
				canvas: validated
			};
			try {
				await storage.save(snapshot, exec.signal);
			} catch (error) {
				ctx.logger?.warn?.(`qoder-canvas storage save failed: ${String(error)}`);
			}
			return JSON.parse(JSON.stringify({ snapshot }));
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
export { CanvasStorage, CanvasValidationError, LAYOUTS, LIMITS, NODE_REGISTRY, apply, generateCanvasId, inject, isValidCanvasId, name, validateCanvasDocument, workspaceKeyOf };
