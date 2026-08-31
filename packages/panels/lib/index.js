import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { useEffect, useId, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";
//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
//#endregion
//#region src/api-usage-bridge.ts
/**
* api-usage 埋点桥（panels 侧，0.5.0 持久化版）：
* 写经 POST /openloop/app/api-usage（app 包落 PB——重启保留），
* 不再共享 globalThis 单例（服务端权威，跨包耦合消失）。
* fire-and-forget + 失败静默：埋点永不影响数据解析主流程。
* 同 URL 短窗口内只发一条（防自动刷新面板高频重复上报同一 source）。
*/
const DEDUP_WINDOW_MS = 3e4;
const lastSent = /* @__PURE__ */ new Map();
function shouldSend(source) {
	const now = Date.now();
	if (now - (lastSent.get(source) ?? 0) < DEDUP_WINDOW_MS) return false;
	lastSent.set(source, now);
	if (lastSent.size > 500) lastSent.clear();
	return true;
}
/** 记一次面板数据绑定调用（同 source 30s 内只上报一次成败汇总性质的记录）。 */
function recordApiUsage(source, kind, ok, ms) {
	try {
		if (!shouldSend(source)) return;
		fetch("/openloop/app/api-usage", {
			method: "POST",
			credentials: "same-origin",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json"
			},
			body: JSON.stringify({
				source: source.slice(0, 500),
				kind,
				ok,
				ms: Math.round(ms)
			}),
			keepalive: true
		}).catch(() => void 0);
	} catch {}
}
//#endregion
//#region src/presets/agent-activity/schema.ts
/**
* agent-activity props JSON Schema：title ≤80 / autoRefreshMs（共享规则）
*/
const agentActivitySchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "面板标题，≤80 字符，可省略（默认「Agent 行为流水」）"
		},
		autoRefreshMs: {
			type: "integer",
			minimum: 1e4,
			maximum: 36e5,
			description: "自动刷新间隔（毫秒），≥10000，缺省不自动刷新"
		}
	}
};
//#endregion
//#region src/presets/common.ts
function validationOk() {
	return { ok: true };
}
function validationFail(errors) {
	return {
		ok: false,
		errors
	};
}
function error(path, message) {
	return {
		path,
		message
	};
}
/** 判定合法 JSON 对象（非数组、非 null），与 contract.ts JsonObject 对齐 */
function asRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
/** 本地后端预设族共享 props 校验：title（≤80）+ autoRefreshMs（10000–3600000 整数） */
function validateLocalPresetProps(kind, props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", `${kind} props 必须是 JSON 对象`)]);
	const errors = [];
	if (root.title !== void 0 && (typeof root.title !== "string" || root.title.length > 80)) errors.push(error("title", "title 必须是 ≤80 字符的字符串"));
	if (root.autoRefreshMs !== void 0) {
		const v = root.autoRefreshMs;
		if (typeof v !== "number" || !Number.isInteger(v) || v < 1e4 || v > 36e5) errors.push(error("autoRefreshMs", "autoRefreshMs 必须是 10000–3600000 的整数（毫秒）"));
	}
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
function isFiniteNumber(value) {
	return typeof value === "number" && Number.isFinite(value);
}
function isNonEmptyString(value) {
	return typeof value === "string" && value.trim().length > 0;
}
const METRIC_FORMATS = [
	"currency-cny",
	"currency",
	"number",
	"percent",
	"text"
];
function isMetricFormat(value) {
	return typeof value === "string" && METRIC_FORMATS.includes(value);
}
/**
* 数值格式化：number/percent/currency-cny 走 Intl；非数字值或未知格式一律 text 兜底。
* percent 语义为小数（0.124 → 12.4%）。
*/
function formatValue(value, format) {
	const key = isMetricFormat(format) ? format : "text";
	if (key === "text" || !isFiniteNumber(value)) return String(value ?? "");
	switch (key) {
		case "currency-cny":
		case "currency": return new Intl.NumberFormat("zh-CN", {
			style: "currency",
			currency: "CNY",
			maximumFractionDigits: 2
		}).format(value);
		case "percent": return new Intl.NumberFormat("zh-CN", {
			style: "percent",
			maximumFractionDigits: 1
		}).format(value);
		default: return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value);
	}
}
//#endregion
//#region src/presets/agent-activity/validate.ts
/**
* agent-activity 校验（fail-closed）：共享规则（title ≤80 / autoRefreshMs）。
*/
function validateAgentActivity(props) {
	return validateLocalPresetProps("agent-activity", props);
}
//#endregion
//#region src/presets/style.ts
/** 面板外壳：预设组件自持卡片（border + surface + radius-md） */
const panel = {
	display: "block",
	width: "100%",
	boxSizing: "border-box",
	border: "1px solid var(--openloop-border)",
	borderRadius: "var(--openloop-radius-md)",
	background: "var(--openloop-surface)",
	color: "var(--openloop-foreground)"
};
/** hero 提升层：阴影 + 更强调的边框（预设换肤时 shadow/border-strong 随预设变化） */
const panelHero = {
	...panel,
	borderColor: "var(--openloop-border-strong)",
	boxShadow: "var(--openloop-shadow-1)"
};
/** 区块标题（13px label 档） */
const title = {
	margin: 0,
	fontSize: 13,
	lineHeight: 1.4,
	fontWeight: 600,
	color: "var(--openloop-foreground)"
};
/** 次要文本（12px meta 档） */
const meta = {
	fontSize: 12,
	lineHeight: 1.5,
	color: "var(--openloop-muted-foreground)"
};
/** 辅助微文本（11px micro 档） */
const micro = {
	fontSize: 11,
	lineHeight: 1.45,
	color: "var(--openloop-muted-foreground)"
};
/** 数值/金额专用：等宽数字 */
const numeric = { fontVariantNumeric: "tabular-nums" };
/** 数值大值（hero / 大数字），参照 .ocix-type-display */
const displayValue = {
	...numeric,
	fontSize: 24,
	lineHeight: 1.25,
	fontWeight: 650,
	letterSpacing: "-0.02em",
	color: "var(--openloop-foreground)"
};
/** 常规数值（18px title 档 + 等宽数字） */
const standardValue = {
	...numeric,
	fontSize: 18,
	lineHeight: 1.3,
	fontWeight: 650,
	color: "var(--openloop-foreground)"
};
/**
* 全局字阶映射（§14：type-display/title/label/meta/micro，theme 包并行加入）。
* level 1–4 → display / title / label / meta；新 token 用 var() 兜底旧值。
*/
function headingLevelStyle(level) {
	switch (level) {
		case 1: return {
			fontSize: "var(--openloop-type-display, 24px)",
			lineHeight: 1.25,
			fontWeight: 600,
			letterSpacing: "-0.02em"
		};
		case 2: return {
			fontSize: "var(--openloop-type-title, 18px)",
			lineHeight: 1.3,
			fontWeight: 650,
			letterSpacing: "-0.02em"
		};
		case 3: return {
			fontSize: "var(--openloop-type-label, 13px)",
			lineHeight: 1.4,
			fontWeight: 600
		};
		default: return {
			fontSize: "var(--openloop-type-meta, 12px)",
			lineHeight: 1.5,
			fontWeight: 500
		};
	}
}
/** 文本 size → 全局字阶（§14 同一张表） */
function textSizeStyle(size) {
	switch (size) {
		case "xs": return {
			fontSize: "var(--openloop-type-micro, 11px)",
			lineHeight: 1.45
		};
		case "sm": return {
			fontSize: "var(--openloop-type-meta, 12px)",
			lineHeight: 1.5
		};
		case "lg": return {
			fontSize: "var(--openloop-type-title, 18px)",
			lineHeight: 1.3
		};
		case "xl": return {
			fontSize: "var(--openloop-type-display, 24px)",
			lineHeight: 1.25
		};
		default: return {
			fontSize: "var(--openloop-type-label, 13px)",
			lineHeight: 1.55
		};
	}
}
const BADGE_TONES = [
	"neutral",
	"primary",
	"info",
	"success",
	"warning",
	"error"
];
function isBadgeTone(value) {
	return typeof value === "string" && BADGE_TONES.includes(value);
}
function toneColors(tone) {
	switch (tone) {
		case "neutral": return {
			background: "var(--openloop-surface-muted)",
			foreground: "var(--openloop-muted-foreground)",
			border: "var(--openloop-border)"
		};
		case "primary": return {
			background: "var(--openloop-primary)",
			foreground: "var(--openloop-primary-foreground)",
			border: "var(--openloop-primary)"
		};
		default: return {
			background: `var(--openloop-${tone}-background)`,
			foreground: `var(--openloop-${tone})`,
			border: `var(--openloop-${tone}-border)`
		};
	}
}
//#endregion
//#region src/presets/local-backend.ts
/**
* 本地后端预设族共享基建：
* - useAppEndpoint：同源 fetch /openloop/app/*（或既有 MCP admin 路由），带
*   content-type 守卫（DSH webServer 对未知路径回落 SPA 200+HTML——非 JSON 应答
*   判 unavailable 而非报错）+ 可选自动刷新（≥10s）
* - formatBytes / formatDuration / relativeTime：展示格式化纯函数
* 颜色纪律：本文件不产出色值（token 由消费方 Render 内联）。
*/
const MIN_REFRESH_MS = 1e4;
function useAppEndpoint(path, autoRefreshMs) {
	const [state, setState] = useState({
		loading: path !== null,
		unavailable: false
	});
	useEffect(() => {
		if (path === null) {
			setState({
				loading: false,
				unavailable: true
			});
			return;
		}
		let cancelled = false;
		let timer;
		const load = async () => {
			try {
				const controller = new AbortController();
				const to = setTimeout(() => controller.abort(), 5e3);
				try {
					const res = await fetch(path, { signal: controller.signal });
					if (!(res.headers.get("content-type") ?? "").includes("application/json")) {
						if (!cancelled) setState({
							loading: false,
							unavailable: true
						});
						return;
					}
					const body = await res.json();
					if (!cancelled) {
						if (!res.ok) setState({
							loading: false,
							unavailable: false,
							error: typeof body?.error === "string" ? body.error : `HTTP ${res.status}`
						});
						else setState({
							loading: false,
							unavailable: false,
							data: body
						});
					}
				} finally {
					clearTimeout(to);
				}
			} catch (error) {
				if (!cancelled) setState({
					loading: false,
					unavailable: false,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		};
		load();
		if (typeof autoRefreshMs === "number" && autoRefreshMs >= MIN_REFRESH_MS) timer = setInterval(() => {
			load();
		}, autoRefreshMs);
		return () => {
			cancelled = true;
			if (timer !== void 0) clearInterval(timer);
		};
	}, [path, autoRefreshMs]);
	return state;
}
function formatBytes(bytes) {
	if (!Number.isFinite(bytes) || bytes < 0) return "—";
	if (bytes < 1024) return `${Math.round(bytes)} B`;
	const one = (n) => String(n >= 100 ? Math.round(n) : Math.round(n * 10) / 10);
	const kb = bytes / 1024;
	if (kb < 1024) return `${one(kb)} KB`;
	const mb = kb / 1024;
	if (mb < 1024) return `${one(mb)} MB`;
	return `${(Math.round(mb / 1024 * 100) / 100).toString()} GB`;
}
function formatDuration(ms) {
	if (!Number.isFinite(ms) || ms < 0) return "—";
	const s = Math.floor(ms / 1e3);
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ${s % 60}s`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ${m % 60}m`;
	return `${Math.floor(h / 24)}d ${h % 24}h`;
}
/** 相对时间（"3 分钟前"）；空/非法返回 '—' */
function relativeTime(iso) {
	if (typeof iso !== "string" || iso.length === 0) return "—";
	const t = Date.parse(iso);
	if (!Number.isFinite(t)) return "—";
	const diff = Date.now() - t;
	if (diff < 0) return new Date(t).toLocaleString();
	const m = Math.floor(diff / 6e4);
	if (m < 1) return "刚刚";
	if (m < 60) return `${m} 分钟前`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h} 小时前`;
	return `${Math.floor(h / 24)} 天前`;
}
/** 长字符串截断（表格单元格用） */
function truncate(text, max = 60) {
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
//#endregion
//#region src/presets/agent-activity/Render.tsx
const headerStyle$14 = {
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 8,
	padding: "10px 14px",
	borderBottom: "1px solid var(--openloop-border)"
};
const colsStyle = {
	display: "grid",
	gridTemplateColumns: "1.6fr 1fr",
	minHeight: 0
};
const sectionLabelStyle = {
	fontSize: 10.5,
	fontWeight: 600,
	letterSpacing: ".05em",
	color: "var(--openloop-muted-foreground)",
	padding: "9px 14px 5px"
};
const listStyle$2 = {
	maxHeight: 340,
	overflowY: "auto"
};
const actionRowStyle = {
	display: "flex",
	alignItems: "baseline",
	gap: 9,
	padding: "6px 14px",
	fontSize: 12,
	color: "var(--openloop-foreground)",
	borderBottom: "1px solid var(--openloop-border)"
};
const monoStyle$6 = {
	fontFamily: "var(--openloop-font-mono, ui-monospace, \"SF Mono\", Menlo, monospace)",
	fontSize: 11.5
};
const heatRowStyle = {
	display: "flex",
	alignItems: "center",
	gap: 8,
	padding: "5px 14px",
	fontSize: 11.5,
	borderBottom: "1px solid var(--openloop-border)"
};
const placeholderStyle$12 = {
	padding: "22px 14px",
	textAlign: "center",
	color: "var(--openloop-muted-foreground)",
	fontSize: 12,
	lineHeight: 1.7
};
function AgentActivityRender({ props }) {
	const record = asRecord(props) ?? {};
	const state = useAppEndpoint("/openloop/app/agent-activity", typeof record.autoRefreshMs === "number" ? record.autoRefreshMs : void 0);
	const headerTitle = typeof record.title === "string" && record.title.length > 0 ? record.title : "Agent 行为流水";
	const actions = (state.data?.actions ?? []).filter((a) => typeof a.tool === "string");
	const heat = (state.data?.toolHeat ?? []).filter((h) => typeof h.tool === "string");
	const scanned = typeof state.data?.sessionsScanned === "number" ? state.data.sessionsScanned : 0;
	const maxHeat = Math.max(1, ...heat.map((h) => typeof h.count === "number" ? h.count : 0));
	return /* @__PURE__ */ jsxs("div", {
		style: panel,
		"data-openloop-preset": "agent-activity",
		children: [/* @__PURE__ */ jsxs("div", {
			style: headerStyle$14,
			children: [/* @__PURE__ */ jsx("span", {
				style: title,
				children: headerTitle
			}), /* @__PURE__ */ jsx("span", {
				style: meta,
				children: scanned > 0 ? `扫描 ${scanned} 个会话 · ${actions.length} 动作` : ""
			})]
		}), state.unavailable ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$12,
			children: [
				"应用后端未启用",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "安装并激活 @openloop/dsh-app 后可查看 Agent 行为"
				})
			]
		}) : actions.length === 0 ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$12,
			children: [
				"尚无 Agent 活动记录",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "Agent 调用工具的动作会实时出现在此（基于会话日志聚合）"
				})
			]
		}) : /* @__PURE__ */ jsxs("div", {
			style: colsStyle,
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
				style: sectionLabelStyle,
				children: "最近动作"
			}), /* @__PURE__ */ jsx("div", {
				style: listStyle$2,
				children: actions.map((a, i) => {
					const at = typeof a.at === "number" ? a.at : null;
					const ws = typeof a.workspace === "string" ? a.workspace : "";
					return /* @__PURE__ */ jsxs("div", {
						style: actionRowStyle,
						children: [
							/* @__PURE__ */ jsx("span", {
								style: {
									...monoStyle$6,
									color: "var(--openloop-primary)",
									flexShrink: 0
								},
								children: String(a.tool)
							}),
							/* @__PURE__ */ jsx("span", {
								style: {
									...meta,
									minWidth: 0,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								title: ws,
								children: truncate(ws, 34)
							}),
							/* @__PURE__ */ jsx("span", {
								style: {
									...meta,
									marginLeft: "auto",
									flexShrink: 0
								},
								children: at !== null ? relativeTime(new Date(at).toISOString()) : "—"
							})
						]
					}, i);
				})
			})] }), /* @__PURE__ */ jsxs("div", {
				style: {
					borderLeft: "1px solid var(--openloop-border)",
					minWidth: 0
				},
				children: [/* @__PURE__ */ jsx("div", {
					style: sectionLabelStyle,
					children: "工具热度"
				}), /* @__PURE__ */ jsx("div", {
					style: listStyle$2,
					children: heat.map((h, i) => {
						const count = typeof h.count === "number" ? h.count : 0;
						return /* @__PURE__ */ jsxs("div", {
							style: heatRowStyle,
							children: [
								/* @__PURE__ */ jsx("span", {
									style: {
										...monoStyle$6,
										color: "var(--openloop-foreground)",
										minWidth: 0,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
										flex: 1
									},
									children: String(h.tool)
								}),
								/* @__PURE__ */ jsx("div", {
									style: {
										width: 64,
										height: 6,
										borderRadius: 3,
										background: "var(--openloop-surface-muted)",
										overflow: "hidden",
										flexShrink: 0
									},
									children: /* @__PURE__ */ jsx("div", { style: {
										width: `${Math.max(4, count / maxHeat * 100)}%`,
										height: "100%",
										background: "var(--openloop-primary)"
									} })
								}),
								/* @__PURE__ */ jsx("span", {
									style: {
										...meta,
										flexShrink: 0,
										fontVariantNumeric: "tabular-nums",
										width: 28,
										textAlign: "right"
									},
									children: count
								})
							]
						}, i);
					})
				})]
			})]
		})]
	});
}
//#endregion
//#region src/presets/agent-activity/index.ts
const agentActivityPreset = {
	kind: "agent-activity",
	schema: agentActivitySchema,
	validate: validateAgentActivity,
	Render: AgentActivityRender
};
//#endregion
//#region src/presets/api-usage-monitor/schema.ts
/**
* api-usage-monitor props JSON Schema：title ≤80 / autoRefreshMs（共享规则）
*/
const apiUsageMonitorSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "面板标题，≤80 字符，可省略（默认「API 资源调用监控」）"
		},
		autoRefreshMs: {
			type: "integer",
			minimum: 1e4,
			maximum: 36e5,
			description: "自动刷新间隔（毫秒），≥10000，缺省不自动刷新"
		}
	}
};
//#endregion
//#region src/presets/api-usage-monitor/validate.ts
/**
* api-usage-monitor 校验（fail-closed）：共享规则（title ≤80 / autoRefreshMs）。
*/
function validateApiUsageMonitor(props) {
	return validateLocalPresetProps("api-usage-monitor", props);
}
//#endregion
//#region src/presets/api-usage-monitor/Render.tsx
const headerStyle$13 = {
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 8,
	padding: "10px 14px",
	borderBottom: "1px solid var(--openloop-border)"
};
const scrollStyle$6 = { overflowX: "auto" };
const tableStyle$9 = {
	width: "100%",
	borderCollapse: "collapse",
	fontSize: 12
};
const thStyle$4 = {
	padding: "7px 12px",
	color: "var(--openloop-muted-foreground)",
	fontWeight: 600,
	textAlign: "left",
	whiteSpace: "nowrap",
	borderBottom: "1px solid var(--openloop-border)",
	background: "var(--openloop-surface-muted)"
};
const tdStyle$6 = {
	padding: "7px 12px",
	color: "var(--openloop-foreground)",
	borderBottom: "1px solid var(--openloop-border)",
	verticalAlign: "top"
};
const monoStyle$5 = {
	fontFamily: "var(--openloop-font-mono, ui-monospace, \"SF Mono\", Menlo, monospace)",
	fontSize: 11.5
};
const placeholderStyle$11 = {
	padding: "22px 14px",
	textAlign: "center",
	color: "var(--openloop-muted-foreground)",
	fontSize: 12,
	lineHeight: 1.7
};
const KIND_LABEL$1 = {
	"panel-binding": "面板绑定",
	"mcp-call": "MCP 调用"
};
function ApiUsageMonitorRender({ props }) {
	const record = asRecord(props) ?? {};
	const state = useAppEndpoint("/openloop/app/api-usage", typeof record.autoRefreshMs === "number" ? record.autoRefreshMs : void 0);
	const headerTitle = typeof record.title === "string" && record.title.length > 0 ? record.title : "API 资源调用监控";
	const sources = (state.data?.sources ?? []).filter((s) => typeof s.source === "string");
	const totalCalls = sources.reduce((n, s) => n + (typeof s.total === "number" ? s.total : 0), 0);
	const totalFailures = sources.reduce((n, s) => n + (typeof s.failures === "number" ? s.failures : 0), 0);
	const maxTotal = Math.max(1, ...sources.map((s) => typeof s.total === "number" ? s.total : 0));
	return /* @__PURE__ */ jsxs("div", {
		style: panel,
		"data-openloop-preset": "api-usage-monitor",
		children: [/* @__PURE__ */ jsxs("div", {
			style: headerStyle$13,
			children: [/* @__PURE__ */ jsx("span", {
				style: title,
				children: headerTitle
			}), /* @__PURE__ */ jsx("span", {
				style: meta,
				children: sources.length > 0 ? `${totalCalls} 次调用 · ${totalFailures} 失败 · 近 24h` : ""
			})]
		}), state.unavailable ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$11,
			children: [
				"应用后端未启用",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "安装并激活 @openloop/dsh-app 后可查看调用统计"
				})
			]
		}) : sources.length === 0 ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$11,
			children: [
				"尚无调用记录",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "面板数据绑定与 MCP 工具调用会在此累计（重启后清零）"
				})
			]
		}) : /* @__PURE__ */ jsx("div", {
			style: scrollStyle$6,
			children: /* @__PURE__ */ jsxs("table", {
				style: tableStyle$9,
				children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsx("th", {
						style: thStyle$4,
						children: "来源"
					}),
					/* @__PURE__ */ jsx("th", {
						style: thStyle$4,
						children: "类型"
					}),
					/* @__PURE__ */ jsx("th", {
						style: thStyle$4,
						children: "调用"
					}),
					/* @__PURE__ */ jsx("th", {
						style: thStyle$4,
						children: "失败"
					}),
					/* @__PURE__ */ jsx("th", {
						style: thStyle$4,
						children: "均耗"
					}),
					/* @__PURE__ */ jsx("th", {
						style: {
							...thStyle$4,
							width: "30%"
						},
						children: "频度"
					})
				] }) }), /* @__PURE__ */ jsx("tbody", { children: sources.map((s) => {
					const total = typeof s.total === "number" ? s.total : 0;
					const failures = typeof s.failures === "number" ? s.failures : 0;
					const kind = typeof s.kind === "string" ? s.kind : "";
					return /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("td", {
							style: {
								...tdStyle$6,
								...monoStyle$5
							},
							children: truncate(String(s.source), 44)
						}),
						/* @__PURE__ */ jsx("td", {
							style: tdStyle$6,
							children: KIND_LABEL$1[kind] ?? kind
						}),
						/* @__PURE__ */ jsx("td", {
							style: {
								...tdStyle$6,
								fontVariantNumeric: "tabular-nums"
							},
							children: total
						}),
						/* @__PURE__ */ jsx("td", {
							style: {
								...tdStyle$6,
								fontVariantNumeric: "tabular-nums",
								color: failures > 0 ? "var(--openloop-error)" : "var(--openloop-muted-foreground)"
							},
							children: failures
						}),
						/* @__PURE__ */ jsx("td", {
							style: {
								...tdStyle$6,
								fontVariantNumeric: "tabular-nums"
							},
							children: typeof s.avgMs === "number" ? `${s.avgMs}ms` : "—"
						}),
						/* @__PURE__ */ jsx("td", {
							style: tdStyle$6,
							children: /* @__PURE__ */ jsx("div", {
								style: {
									height: 6,
									borderRadius: 3,
									background: "var(--openloop-surface-muted)",
									overflow: "hidden"
								},
								children: /* @__PURE__ */ jsx("div", { style: {
									width: `${Math.max(3, total / maxTotal * 100)}%`,
									height: "100%",
									background: failures > 0 ? "var(--openloop-warning)" : "var(--openloop-primary)"
								} })
							})
						})
					] }, String(s.source));
				}) })]
			})
		})]
	});
}
//#endregion
//#region src/presets/api-usage-monitor/index.ts
const apiUsageMonitorPreset = {
	kind: "api-usage-monitor",
	schema: apiUsageMonitorSchema,
	validate: validateApiUsageMonitor,
	Render: ApiUsageMonitorRender
};
//#endregion
//#region src/presets/app-manager/schema.ts
/**
* app-manager props JSON Schema：title ≤80 / autoRefreshMs（共享规则）
*/
const appManagerSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "面板标题，≤80 字符，可省略（默认「APP 管理」）"
		},
		autoRefreshMs: {
			type: "integer",
			minimum: 1e4,
			maximum: 36e5,
			description: "自动刷新间隔（毫秒），≥10000，缺省不自动刷新"
		}
	}
};
//#endregion
//#region src/presets/app-manager/validate.ts
/**
* app-manager 校验（fail-closed）：共享规则（title ≤80 / autoRefreshMs）。
*/
function validateAppManager(props) {
	return validateLocalPresetProps("app-manager", props);
}
//#endregion
//#region src/presets/app-manager/Render.tsx
/**
* app-manager 渲染器（自管理四件套之一）：全部 APP 的管理面板——
* 「系统能管理自己」的具象。行 = APP（来源徽标/资源计数/连接态），行尾动作：
* 第三方 → 断开（mcp.json 条目保留，重连即恢复）/ 重连；任意 → 删除（级联清资源）。
* 写通道 = app 包受控路由（POST /openloop/app/manage/*，门面化，不直连 PB）。
* 二次确认同 dock 清空的既有模式（3s 超时复位）。
* 样式 100% var(--openloop-*)。
*/
const headerStyle$12 = {
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 8,
	padding: "10px 14px",
	borderBottom: "1px solid var(--openloop-border)"
};
const scrollStyle$5 = { overflowX: "auto" };
const tableStyle$8 = {
	width: "100%",
	borderCollapse: "collapse",
	fontSize: 12
};
const thStyle$3 = {
	padding: "7px 12px",
	color: "var(--openloop-muted-foreground)",
	fontWeight: 600,
	textAlign: "left",
	whiteSpace: "nowrap",
	borderBottom: "1px solid var(--openloop-border)",
	background: "var(--openloop-surface-muted)"
};
const tdStyle$5 = {
	padding: "7px 12px",
	color: "var(--openloop-foreground)",
	borderBottom: "1px solid var(--openloop-border)",
	verticalAlign: "top"
};
const monoStyle$4 = {
	fontFamily: "var(--openloop-font-mono, ui-monospace, \"SF Mono\", Menlo, monospace)",
	fontSize: 11.5
};
const placeholderStyle$10 = {
	padding: "22px 14px",
	textAlign: "center",
	color: "var(--openloop-muted-foreground)",
	fontSize: 12,
	lineHeight: 1.7
};
const KIND_LABEL = {
	builtin: "内置",
	thirdparty: "第三方",
	local: "自研"
};
const btnStyle = {
	padding: "2px 9px",
	borderRadius: 7,
	border: "1px solid var(--openloop-border)",
	background: "transparent",
	color: "var(--openloop-muted-foreground)",
	fontSize: 11,
	cursor: "pointer",
	fontFamily: "inherit"
};
const dangerBtnStyle = {
	...btnStyle,
	color: "var(--openloop-error)",
	borderColor: "var(--openloop-error-border)"
};
const confirmBtnStyle = {
	...dangerBtnStyle,
	background: "var(--openloop-error-background)",
	color: "var(--openloop-error)",
	fontWeight: 600
};
/** 写动作（受控路由）；返回错误文本（无错 undefined）。3s 后清提示。 */
function useManageAction(onDone) {
	const [busy, setBusy] = useState(null);
	const [message, setMessage] = useState(null);
	useEffect(() => {
		if (message === null) return;
		const timer = setTimeout(() => setMessage(null), 3e3);
		return () => clearTimeout(timer);
	}, [message]);
	const run = (path, body, label) => {
		if (busy !== null) return;
		setBusy(label);
		fetch(`/openloop/app/${path}`, {
			method: "POST",
			credentials: "same-origin",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json"
			},
			body: JSON.stringify(body)
		}).then(async (res) => {
			if (!(res.headers.get("content-type") ?? "").includes("application/json")) throw new Error(`HTTP ${res.status}`);
			const payload = await res.json();
			if (!res.ok || payload.ok !== true) throw new Error(typeof payload.error === "string" ? payload.error : `HTTP ${res.status}`);
			setMessage(`${label}完成`);
			onDone();
		}).catch((error) => {
			setMessage(`${label}失败：${error instanceof Error ? error.message : String(error)}`);
		}).finally(() => setBusy(null));
	};
	return {
		run,
		busy,
		message
	};
}
function AppManagerRender({ props }) {
	const record = asRecord(props) ?? {};
	const autoRefreshMs = typeof record.autoRefreshMs === "number" ? record.autoRefreshMs : void 0;
	const [reloadNonce, setReloadNonce] = useState(0);
	const registry = useAppEndpoint("/openloop/app/registry", autoRefreshMs);
	const mcp = useAppEndpoint("/openloop/mcp/servers", autoRefreshMs);
	const { run, busy, message } = useManageAction(() => setReloadNonce((n) => n + 1));
	useEffect(() => {}, [reloadNonce]);
	const headerTitle = typeof record.title === "string" && record.title.length > 0 ? record.title : "APP 管理";
	const confirmKey = typeof record.confirm === "string" ? record.confirm : null;
	const [confirming, setConfirming] = useState(null);
	useEffect(() => {
		if (confirming === null) return;
		const timer = setTimeout(() => setConfirming(null), 3e3);
		return () => clearTimeout(timer);
	}, [confirming]);
	const mcpStateOf = (name) => {
		const hit = (mcp.data?.servers ?? []).find((s) => s.id === name);
		return typeof hit?.state === "string" ? hit.state : void 0;
	};
	const apps = (registry.data?.apps ?? []).filter((a) => typeof a.app?.name === "string");
	const onAction = (action, name) => {
		if (action === "delete") {
			if (confirmKey !== name) {
				setConfirming(name);
				return;
			}
			setConfirming(null);
		}
		if (action === "disconnect") {
			run("manage/disconnect", { serverId: name }, `断开 ${name}`);
			return;
		}
		if (action === "reconnect") {
			run("manage/reconnect", { serverId: name }, `重连 ${name}`);
			return;
		}
		run("manage/delete", { appName: name }, `删除 ${name}`);
	};
	return /* @__PURE__ */ jsxs("div", {
		style: panel,
		"data-openloop-preset": "app-manager",
		children: [
			/* @__PURE__ */ jsxs("div", {
				style: headerStyle$12,
				children: [/* @__PURE__ */ jsx("span", {
					style: title,
					children: headerTitle
				}), /* @__PURE__ */ jsxs("span", {
					style: meta,
					children: [apps.length > 0 ? `${apps.length} 个应用` : "", busy !== null ? " · 处理中…" : ""]
				})]
			}),
			message !== null ? /* @__PURE__ */ jsx("div", {
				style: {
					padding: "6px 14px",
					fontSize: 11.5,
					color: "var(--openloop-muted-foreground)",
					borderBottom: "1px solid var(--openloop-border)"
				},
				children: message
			}) : null,
			registry.unavailable ? /* @__PURE__ */ jsxs("div", {
				style: placeholderStyle$10,
				children: [
					"应用后端未启用",
					/* @__PURE__ */ jsx("br", {}),
					/* @__PURE__ */ jsx("span", {
						style: meta,
						children: "安装并激活 @openloop/dsh-app 后可管理 APP"
					})
				]
			}) : apps.length === 0 ? /* @__PURE__ */ jsx("div", {
				style: placeholderStyle$10,
				children: "暂无注册 APP"
			}) : /* @__PURE__ */ jsx("div", {
				style: scrollStyle$5,
				children: /* @__PURE__ */ jsxs("table", {
					style: tableStyle$8,
					children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("th", {
							style: thStyle$3,
							children: "应用"
						}),
						/* @__PURE__ */ jsx("th", {
							style: thStyle$3,
							children: "资源"
						}),
						/* @__PURE__ */ jsx("th", {
							style: thStyle$3,
							children: "连接"
						}),
						/* @__PURE__ */ jsx("th", {
							style: thStyle$3,
							children: "操作"
						})
					] }) }), /* @__PURE__ */ jsx("tbody", { children: apps.map((a) => {
						const name = String(a.app?.name);
						const kind = typeof a.app?.kind === "string" ? a.app.kind : "local";
						const state = mcpStateOf(name);
						const displayName = typeof a.app?.displayName === "string" && a.app.displayName.length > 0 ? a.app.displayName : name;
						const isThirdparty = kind === "thirdparty";
						const isBuiltin = kind === "builtin";
						return /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsxs("td", {
								style: tdStyle$5,
								children: [
									/* @__PURE__ */ jsx("span", {
										style: { fontWeight: 600 },
										children: truncate(displayName, 24)
									}),
									/* @__PURE__ */ jsx("span", {
										style: {
											...meta,
											marginLeft: 7
										},
										children: KIND_LABEL[kind] ?? kind
									}),
									/* @__PURE__ */ jsx("div", {
										style: {
											...monoStyle$4,
											...meta,
											marginTop: 2
										},
										children: name
									})
								]
							}),
							/* @__PURE__ */ jsxs("td", {
								style: {
									...tdStyle$5,
									whiteSpace: "nowrap"
								},
								children: [
									(a.components ?? []).length,
									" 组件 · ",
									(a.apis ?? []).length,
									" API"
								]
							}),
							/* @__PURE__ */ jsxs("td", {
								style: tdStyle$5,
								children: [state === void 0 ? /* @__PURE__ */ jsx("span", {
									style: meta,
									children: "—"
								}) : /* @__PURE__ */ jsx("span", { style: {
									display: "inline-block",
									width: 8,
									height: 8,
									borderRadius: "50%",
									marginRight: 6,
									background: state === "running" ? "var(--openloop-success)" : state === "error" ? "var(--openloop-error)" : "var(--openloop-muted-foreground)"
								} }), state ?? "本地"]
							}),
							/* @__PURE__ */ jsx("td", {
								style: {
									...tdStyle$5,
									whiteSpace: "nowrap"
								},
								children: isBuiltin ? /* @__PURE__ */ jsx("span", {
									style: meta,
									children: "系统保留"
								}) : /* @__PURE__ */ jsxs(Fragment, { children: [isThirdparty ? state === "running" || state === "connecting" ? /* @__PURE__ */ jsx("button", {
									type: "button",
									style: btnStyle,
									disabled: busy !== null,
									onClick: () => onAction("disconnect", name),
									children: "断开"
								}) : /* @__PURE__ */ jsx("button", {
									type: "button",
									style: btnStyle,
									disabled: busy !== null,
									onClick: () => onAction("reconnect", name),
									children: "重连"
								}) : null, confirming === name ? /* @__PURE__ */ jsx("button", {
									type: "button",
									style: confirmBtnStyle,
									disabled: busy !== null,
									onClick: () => onAction("delete", name),
									children: "确认删除？"
								}) : /* @__PURE__ */ jsx("button", {
									type: "button",
									style: dangerBtnStyle,
									disabled: busy !== null,
									onClick: () => onAction("delete", name),
									children: "删除"
								})] })
							})
						] }, name);
					}) })]
				})
			})
		]
	});
}
//#endregion
//#region src/presets/app-manager/index.ts
const appManagerPreset = {
	kind: "app-manager",
	schema: appManagerSchema,
	validate: validateAppManager,
	Render: AppManagerRender
};
//#endregion
//#region src/presets/event-log/schema.ts
/**
* event-log props JSON Schema：title ≤80 / autoRefreshMs（共享规则） / limit
*/
const eventLogSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "面板标题，≤80 字符，可省略（默认「系统事件流」）"
		},
		autoRefreshMs: {
			type: "integer",
			minimum: 1e4,
			maximum: 36e5,
			description: "自动刷新间隔（毫秒），≥10000，缺省不自动刷新"
		},
		limit: {
			type: "integer",
			minimum: 1,
			maximum: 200,
			description: "最多显示的事件条数，1-200，缺省 50"
		}
	}
};
//#endregion
//#region src/presets/event-log/validate.ts
/**
* event-log 校验（fail-closed）：共享规则（title ≤80 / autoRefreshMs / limit）。
*/
function validateEventLog(props) {
	return validateLocalPresetProps("event-log", props);
}
//#endregion
//#region src/presets/event-log/Render.tsx
const headerStyle$11 = {
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 8,
	padding: "10px 14px",
	borderBottom: "1px solid var(--openloop-border)"
};
const listStyle$1 = {
	maxHeight: 320,
	overflowY: "auto"
};
const rowStyle$2 = {
	display: "flex",
	alignItems: "baseline",
	gap: 9,
	padding: "7px 14px",
	fontSize: 12,
	color: "var(--openloop-foreground)",
	borderBottom: "1px solid var(--openloop-border)"
};
const timeStyle$1 = {
	fontSize: 11,
	color: "var(--openloop-muted-foreground)",
	flexShrink: 0,
	minWidth: 64,
	fontVariantNumeric: "tabular-nums"
};
const kindBadgeStyle = {
	fontSize: 10,
	padding: "1px 7px",
	borderRadius: 999,
	border: "1px solid var(--openloop-border)",
	color: "var(--openloop-muted-foreground)",
	flexShrink: 0
};
const placeholderStyle$9 = {
	padding: "22px 14px",
	textAlign: "center",
	color: "var(--openloop-muted-foreground)",
	fontSize: 12,
	lineHeight: 1.7
};
const dotStyle$3 = (level) => ({
	width: 7,
	height: 7,
	borderRadius: "50%",
	flexShrink: 0,
	alignSelf: "center",
	background: level === "error" ? "var(--openloop-error)" : level === "warn" ? "var(--openloop-warning)" : "var(--openloop-success)"
});
function EventLogRender({ props }) {
	const record = asRecord(props) ?? {};
	const autoRefreshMs = typeof record.autoRefreshMs === "number" ? record.autoRefreshMs : void 0;
	const state = useAppEndpoint(`/openloop/app/events?limit=${typeof record.limit === "number" ? Math.max(1, Math.min(200, Math.round(record.limit))) : 50}`, autoRefreshMs);
	const headerTitle = typeof record.title === "string" && record.title.length > 0 ? record.title : "系统事件流";
	const events = (state.data?.events ?? []).filter((e) => typeof e.text === "string");
	return /* @__PURE__ */ jsxs("div", {
		style: panel,
		"data-openloop-preset": "event-log",
		children: [/* @__PURE__ */ jsxs("div", {
			style: headerStyle$11,
			children: [/* @__PURE__ */ jsx("span", {
				style: title,
				children: headerTitle
			}), /* @__PURE__ */ jsx("span", {
				style: meta,
				children: events.length > 0 ? `${events.length} 条 · 新→旧` : ""
			})]
		}), state.unavailable ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$9,
			children: [
				"应用后端未启用",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "安装并激活 @openloop/dsh-app 后可查看系统事件"
				})
			]
		}) : events.length === 0 ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$9,
			children: [
				"暂无事件",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "接入/断开第三方包、删除 APP、后端重启等动作会记录在此"
				})
			]
		}) : /* @__PURE__ */ jsx("div", {
			style: listStyle$1,
			children: events.map((e, i) => {
				const kind = typeof e.kind === "string" ? e.kind : "";
				const level = typeof e.level === "string" ? e.level : "info";
				const at = typeof e.at === "number" ? e.at : null;
				return /* @__PURE__ */ jsxs("div", {
					style: rowStyle$2,
					children: [
						/* @__PURE__ */ jsx("span", {
							style: timeStyle$1,
							children: at !== null ? relativeTime(new Date(at).toISOString()) : "—"
						}),
						/* @__PURE__ */ jsx("span", { style: dotStyle$3(level) }),
						/* @__PURE__ */ jsx("span", {
							style: kindBadgeStyle,
							children: kind
						}),
						/* @__PURE__ */ jsx("span", {
							style: { minWidth: 0 },
							children: String(e.text)
						})
					]
				}, i);
			})
		})]
	});
}
//#endregion
//#region src/presets/event-log/index.ts
const eventLogPreset = {
	kind: "event-log",
	schema: eventLogSchema,
	validate: validateEventLog,
	Render: EventLogRender
};
//#endregion
//#region src/presets/system-overview/schema.ts
/**
* system-overview props JSON Schema：title ≤80 / autoRefreshMs（共享规则）
*/
const systemOverviewSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "面板标题，≤80 字符，可省略（默认「系统总览」）"
		},
		autoRefreshMs: {
			type: "integer",
			minimum: 1e4,
			maximum: 36e5,
			description: "自动刷新间隔（毫秒），≥10000，缺省不自动刷新"
		}
	}
};
//#endregion
//#region src/presets/system-overview/validate.ts
/**
* system-overview 校验（fail-closed）：共享规则（title ≤80 / autoRefreshMs）。
*/
function validateSystemOverview(props) {
	return validateLocalPresetProps("system-overview", props);
}
//#endregion
//#region src/presets/system-overview/Render.tsx
const headerStyle$10 = {
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 8,
	padding: "10px 14px",
	borderBottom: "1px solid var(--openloop-border)"
};
const gridStyle$1 = {
	display: "grid",
	gridTemplateColumns: "repeat(4, 1fr)",
	gap: 1,
	background: "var(--openloop-border)"
};
const cellStyle$3 = {
	padding: "12px 14px",
	background: "var(--openloop-surface)"
};
const cellLabelStyle = {
	fontSize: 11,
	color: "var(--openloop-muted-foreground)"
};
const cellValueStyle = {
	fontSize: 17,
	fontWeight: 700,
	marginTop: 3,
	fontVariantNumeric: "tabular-nums"
};
const placeholderStyle$8 = {
	padding: "22px 14px",
	textAlign: "center",
	color: "var(--openloop-muted-foreground)",
	fontSize: 12,
	lineHeight: 1.7
};
const warnRowStyle = {
	display: "flex",
	alignItems: "center",
	gap: 8,
	padding: "7px 14px",
	fontSize: 12,
	color: "var(--openloop-foreground)",
	borderBottom: "1px solid var(--openloop-border)"
};
const dotStyle$2 = (tone) => ({
	width: 8,
	height: 8,
	borderRadius: "50%",
	flexShrink: 0,
	background: tone === "ok" ? "var(--openloop-success)" : tone === "warn" ? "var(--openloop-warning)" : "var(--openloop-error)"
});
function SystemOverviewRender({ props }) {
	const record = asRecord(props) ?? {};
	const autoRefreshMs = typeof record.autoRefreshMs === "number" ? record.autoRefreshMs : void 0;
	const status = useAppEndpoint("/openloop/app/status", autoRefreshMs);
	const mcp = useAppEndpoint("/openloop/mcp/servers", autoRefreshMs);
	const storage = useAppEndpoint("/openloop/app/storage-usage", autoRefreshMs);
	const sessions = useAppEndpoint("/openloop/app/sessions-stats", autoRefreshMs);
	const headerTitle = typeof record.title === "string" && record.title.length > 0 ? record.title : "系统总览";
	const backendState = typeof status.data?.state === "string" ? status.data.state : "unknown";
	const servers = (mcp.data?.servers ?? []).filter((s) => typeof s.id === "string");
	const mcpRunning = servers.filter((s) => s.state === "running").length;
	const mcpDead = servers.filter((s) => s.state === "error" || s.state === "disconnected");
	const totalBytes = typeof storage.data?.totalBytes === "number" ? storage.data.totalBytes : null;
	const sessionsTotal = typeof sessions.data?.total === "number" ? sessions.data.total : null;
	const restarts = typeof status.data?.restarts === "number" ? status.data.restarts : 0;
	const warnings = [];
	if (backendState !== "running") warnings.push({
		tone: "error",
		text: `应用后端 ${backendState}——面板看板已降级本地存储`
	});
	if (restarts > 0) warnings.push({
		tone: "warn",
		text: `后端自上次启动已自动重启 ${restarts} 次（watchdog 守护）`
	});
	for (const s of mcpDead) warnings.push({
		tone: "warn",
		text: `MCP server「${String(s.id)}」不可达（惰性重连中）`
	});
	return /* @__PURE__ */ jsxs("div", {
		style: panel,
		"data-openloop-preset": "system-overview",
		children: [/* @__PURE__ */ jsxs("div", {
			style: headerStyle$10,
			children: [/* @__PURE__ */ jsx("span", {
				style: title,
				children: headerTitle
			}), /* @__PURE__ */ jsx("span", {
				style: meta,
				children: backendState === "running" && servers.length > 0 ? `运行中 · ${typeof status.data?.version === "string" ? status.data.version : ""} · ${mcpRunning}/${servers.length} MCP` : ""
			})]
		}), status.unavailable ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$8,
			children: [
				"应用后端未启用",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "安装并激活 @openloop/dsh-app 后可查看系统总览"
				})
			]
		}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
			style: gridStyle$1,
			children: [
				/* @__PURE__ */ jsxs("div", {
					style: cellStyle$3,
					children: [/* @__PURE__ */ jsx("div", {
						style: cellLabelStyle,
						children: "应用后端"
					}), /* @__PURE__ */ jsx("div", {
						style: {
							...cellValueStyle,
							color: backendState === "running" ? "var(--openloop-success)" : "var(--openloop-error)"
						},
						children: backendState === "running" ? "正常" : backendState === "starting" ? "启动中" : "异常"
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					style: cellStyle$3,
					children: [/* @__PURE__ */ jsx("div", {
						style: cellLabelStyle,
						children: "MCP 服务"
					}), /* @__PURE__ */ jsxs("div", {
						style: cellValueStyle,
						children: [mcpRunning, /* @__PURE__ */ jsxs("span", {
							style: meta,
							children: [" / ", servers.length]
						})]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					style: cellStyle$3,
					children: [/* @__PURE__ */ jsx("div", {
						style: cellLabelStyle,
						children: "磁盘占用"
					}), /* @__PURE__ */ jsx("div", {
						style: cellValueStyle,
						children: totalBytes !== null ? formatBytes(totalBytes) : "—"
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					style: cellStyle$3,
					children: [/* @__PURE__ */ jsx("div", {
						style: cellLabelStyle,
						children: "会话总数"
					}), /* @__PURE__ */ jsx("div", {
						style: cellValueStyle,
						children: sessionsTotal !== null ? sessionsTotal : "—"
					})]
				})
			]
		}), warnings.length > 0 ? /* @__PURE__ */ jsx("div", { children: warnings.map((w, i) => /* @__PURE__ */ jsxs("div", {
			style: {
				...warnRowStyle,
				borderTop: i === 0 ? "1px solid var(--openloop-border)" : void 0
			},
			children: [/* @__PURE__ */ jsx("span", { style: dotStyle$2(w.tone) }), w.text]
		}, i)) }) : /* @__PURE__ */ jsxs("div", {
			style: {
				...warnRowStyle,
				color: "var(--openloop-muted-foreground)",
				borderBottom: 0
			},
			children: [/* @__PURE__ */ jsx("span", { style: dotStyle$2("ok") }), " 全部子系统正常"]
		})] })]
	});
}
//#endregion
//#region src/presets/system-overview/index.ts
const systemOverviewPreset = {
	kind: "system-overview",
	schema: systemOverviewSchema,
	validate: validateSystemOverview,
	Render: SystemOverviewRender
};
//#endregion
//#region src/presets/accordion/schema.ts
/**
* accordion props JSON Schema。
* items 1–20；展开状态为组件内本地 state（单开手风琴），defaultOpenIndex 可选。
*/
const accordionSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "可选的折叠区标题，≤80 字符"
		},
		defaultOpenIndex: {
			type: "integer",
			minimum: 0,
			description: "默认展开第几项（0 起）；省略默认展开第一项"
		},
		items: {
			type: "array",
			minItems: 1,
			maxItems: 20,
			description: "折叠项，1–20 个",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					label: {
						type: "string",
						minLength: 1,
						maxLength: 80,
						description: "折叠项标题，1–80 字符"
					},
					content: {
						type: "string",
						maxLength: 2e3,
						description: "展开后的内容文本，≤2000 字符，保留换行"
					}
				},
				required: ["label"]
			}
		}
	},
	required: ["items"]
};
//#endregion
//#region src/presets/accordion/validate.ts
/**
* accordion 校验（fail-closed）。
* - items 必填数组 1–20，每项 label 必填 1–80 字符，content ≤2000 字符
* - defaultOpenIndex 非负整数（越界时渲染器自动收敛）
*/
function validateAccordion(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "accordion props 必须是 JSON 对象")]);
	const errors = [];
	if (root.title !== void 0 && (typeof root.title !== "string" || root.title.length > 80)) errors.push(error("title", "title 必须是 ≤80 字符的字符串"));
	if (root.defaultOpenIndex !== void 0) {
		if (typeof root.defaultOpenIndex !== "number" || !Number.isInteger(root.defaultOpenIndex)) errors.push(error("defaultOpenIndex", "defaultOpenIndex 必须是非负整数"));
		else if (root.defaultOpenIndex < 0) errors.push(error("defaultOpenIndex", `defaultOpenIndex 不得为负，当前 ${root.defaultOpenIndex}`));
	}
	if (!Array.isArray(root.items)) {
		errors.push(error("items", "items 必填，必须是 1–20 项的数组"));
		return validationFail(errors);
	}
	if (root.items.length < 1 || root.items.length > 20) errors.push(error("items", `items 数量必须为 1–20，当前 ${root.items.length}`));
	root.items.forEach((raw, index) => {
		const path = `items[${index}]`;
		const item = asRecord(raw);
		if (!item) {
			errors.push(error(path, "每一项必须是 JSON 对象"));
			return;
		}
		if (!isNonEmptyString(item.label)) errors.push(error(`${path}.label`, "label 必填，必须是非空字符串（1–80 字符）"));
		else if (item.label.length > 80) errors.push(error(`${path}.label`, `label 长度不得超过 80 字符，当前 ${item.label.length}`));
		if (item.content !== void 0) {
			if (typeof item.content !== "string") errors.push(error(`${path}.content`, "content 必须是字符串"));
			else if (item.content.length > 2e3) errors.push(error(`${path}.content`, `content 长度不得超过 2000 字符，当前 ${item.content.length}`));
		}
	});
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/accordion/Render.tsx
/**
* accordion 渲染器。
* 参照 DeclarativeAdvancedPrimitives.AccordionPrimitive：单开手风琴 + 组件内本地
* useState 展开态；chevron 用内联 SVG，箭头随展开旋转。样式 100% 来自 var(--openloop-*)。
*/
const triggerStyle = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 8,
	width: "100%",
	padding: "10px 12px",
	background: "transparent",
	border: "none",
	color: "var(--openloop-foreground)",
	fontSize: 13,
	fontWeight: 600,
	lineHeight: 1.4,
	cursor: "pointer",
	textAlign: "left"
};
const triggerLabelStyle = {
	minWidth: 0,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap"
};
const chevronStyle = {
	display: "inline-flex",
	flexShrink: 0,
	transition: "transform 150ms ease"
};
const panelRegionStyle = {
	padding: "2px 12px 12px",
	fontSize: 12,
	lineHeight: 1.55,
	color: "var(--openloop-muted-foreground)",
	whiteSpace: "pre-wrap",
	wordBreak: "break-word"
};
function AccordionRender({ props }) {
	const root = asRecord(props) ?? {};
	const panelTitle = typeof root.title === "string" ? root.title : void 0;
	const items = (Array.isArray(root.items) ? root.items : []).slice(0, 20).map((raw, index) => {
		const item = asRecord(raw) ?? {};
		return {
			label: typeof item.label === "string" ? item.label : `条目 ${index + 1}`,
			content: typeof item.content === "string" ? item.content : ""
		};
	});
	const baseId = useId();
	const requestedDefault = isFiniteNumber(root.defaultOpenIndex) ? Math.trunc(root.defaultOpenIndex) : 0;
	const [openIndex, setOpenIndex] = useState(requestedDefault >= 0 && requestedDefault < items.length ? requestedDefault : items.length > 0 ? 0 : null);
	if (items.length === 0) return /* @__PURE__ */ jsx("div", {
		"data-openloop-preset": "accordion",
		"data-openloop-count": "0",
		style: {
			...panel,
			padding: "12px 14px"
		},
		children: /* @__PURE__ */ jsx("div", {
			style: meta,
			children: "暂无内容"
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "accordion",
		"data-openloop-count": String(items.length),
		style: {
			...panel,
			overflow: "hidden",
			padding: 0
		},
		children: [panelTitle !== void 0 ? /* @__PURE__ */ jsx("div", {
			style: {
				...title,
				padding: "10px 12px",
				borderBottom: "1px solid var(--openloop-border)"
			},
			children: panelTitle
		}) : null, items.map((item, index) => {
			const expanded = openIndex === index;
			const triggerId = `${baseId}-trigger-${index}`;
			const panelId = `${baseId}-panel-${index}`;
			return /* @__PURE__ */ jsxs("div", {
				style: index > 0 ? { borderTop: "1px solid var(--openloop-border)" } : void 0,
				children: [/* @__PURE__ */ jsxs("button", {
					type: "button",
					id: triggerId,
					"aria-expanded": expanded,
					"aria-controls": panelId,
					onClick: () => setOpenIndex(expanded ? null : index),
					style: triggerStyle,
					children: [/* @__PURE__ */ jsx("span", {
						style: triggerLabelStyle,
						children: item.label
					}), /* @__PURE__ */ jsx("span", {
						"aria-hidden": "true",
						style: expanded ? {
							...chevronStyle,
							transform: "rotate(180deg)"
						} : chevronStyle,
						children: /* @__PURE__ */ jsx("svg", {
							width: "14",
							height: "14",
							viewBox: "0 0 16 16",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "1.5",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							children: /* @__PURE__ */ jsx("path", { d: "M4 6l4 4 4-4" })
						})
					})]
				}), /* @__PURE__ */ jsx("div", {
					id: panelId,
					role: "region",
					"aria-labelledby": triggerId,
					hidden: !expanded,
					style: panelRegionStyle,
					children: item.content
				})]
			}, triggerId);
		})]
	});
}
//#endregion
//#region src/presets/accordion/index.ts
const accordionPreset = {
	kind: "accordion",
	schema: accordionSchema,
	validate: validateAccordion,
	Render: AccordionRender
};
//#endregion
//#region src/presets/api-credentials/schema.ts
/**
* api-credentials props JSON Schema：title ≤80 / autoRefreshMs（共享规则）。
*/
const apiCredentialsSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "面板标题，≤80 字符，可省略（默认「API 凭据总览」）"
		},
		autoRefreshMs: {
			type: "integer",
			minimum: 1e4,
			maximum: 36e5,
			description: "自动刷新间隔（毫秒），≥10000，缺省不自动刷新"
		}
	}
};
//#endregion
//#region src/presets/api-credentials/validate.ts
/**
* api-credentials 校验（fail-closed）：共享规则（title ≤80 / autoRefreshMs）。
*/
function validateApiCredentials(props) {
	return validateLocalPresetProps("api-credentials", props);
}
//#endregion
//#region src/presets/api-credentials/Render.tsx
const headerStyle$9 = {
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 8,
	padding: "10px 14px",
	borderBottom: "1px solid var(--openloop-border)"
};
const scrollStyle$4 = { overflowX: "auto" };
const tableStyle$7 = {
	width: "100%",
	borderCollapse: "collapse",
	fontSize: 12
};
const thStyle$2 = {
	padding: "7px 12px",
	color: "var(--openloop-muted-foreground)",
	fontWeight: 600,
	textAlign: "left",
	whiteSpace: "nowrap",
	borderBottom: "1px solid var(--openloop-border)",
	background: "var(--openloop-surface-muted)"
};
const tdStyle$4 = {
	padding: "7px 12px",
	color: "var(--openloop-foreground)",
	borderBottom: "1px solid var(--openloop-border)",
	verticalAlign: "top",
	wordBreak: "break-word"
};
const monoStyle$3 = {
	fontFamily: "var(--openloop-font-mono, ui-monospace, \"SF Mono\", Menlo, monospace)",
	fontSize: 11.5
};
const dotStyle$1 = {
	display: "inline-block",
	width: 8,
	height: 8,
	borderRadius: "50%",
	marginRight: 6,
	verticalAlign: "baseline"
};
const placeholderStyle$7 = {
	padding: "22px 14px",
	textAlign: "center",
	color: "var(--openloop-muted-foreground)",
	fontSize: 12,
	lineHeight: 1.7
};
function ApiCredentialsRender({ props }) {
	const record = asRecord(props) ?? {};
	const state = useAppEndpoint("/openloop/app/credentials", typeof record.autoRefreshMs === "number" ? record.autoRefreshMs : void 0);
	const headerTitle = typeof record.title === "string" && record.title.length > 0 ? record.title : "API 凭据总览";
	const apis = (state.data?.apis ?? []).filter((a) => typeof a.rid === "string");
	const configuredCount = apis.filter((a) => a.configured === true).length;
	return /* @__PURE__ */ jsxs("div", {
		style: panel,
		"data-openloop-preset": "api-credentials",
		children: [/* @__PURE__ */ jsxs("div", {
			style: headerStyle$9,
			children: [/* @__PURE__ */ jsx("span", {
				style: title,
				children: headerTitle
			}), /* @__PURE__ */ jsx("span", {
				style: meta,
				children: apis.length > 0 ? `${configuredCount} / ${apis.length} 已配置` : ""
			})]
		}), state.unavailable ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$7,
			children: [
				"本地应用后端未启用",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "安装并激活 @openloop/dsh-app 插件后可查看凭据配置"
				})
			]
		}) : state.error !== void 0 ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$7,
			children: ["凭据信息读取失败：", state.error]
		}) : apis.length === 0 ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$7,
			children: [
				"暂无登记的 API 资源",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "让 Agent 经 app_backend 工具 register_api + set_api_key 登记"
				})
			]
		}) : /* @__PURE__ */ jsx("div", {
			style: scrollStyle$4,
			children: /* @__PURE__ */ jsxs("table", {
				style: tableStyle$7,
				children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsx("th", {
						style: thStyle$2,
						children: "资源 ID"
					}),
					/* @__PURE__ */ jsx("th", {
						style: thStyle$2,
						children: "端点"
					}),
					/* @__PURE__ */ jsx("th", {
						style: thStyle$2,
						children: "鉴权"
					}),
					/* @__PURE__ */ jsx("th", {
						style: thStyle$2,
						children: "状态"
					})
				] }) }), /* @__PURE__ */ jsx("tbody", { children: apis.map((api) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsx("td", {
						style: {
							...tdStyle$4,
							...monoStyle$3
						},
						children: truncate(String(api.rid), 48)
					}),
					/* @__PURE__ */ jsxs("td", {
						style: tdStyle$4,
						children: [/* @__PURE__ */ jsx("span", {
							style: monoStyle$3,
							children: truncate(String(api.domain ?? ""), 30)
						}), /* @__PURE__ */ jsx("span", {
							style: meta,
							children: String(api.path ?? "")
						})]
					}),
					/* @__PURE__ */ jsx("td", {
						style: tdStyle$4,
						children: /* @__PURE__ */ jsx("span", {
							style: {
								display: "inline-block",
								padding: "1px 8px",
								borderRadius: 999,
								border: "1px solid var(--openloop-border)",
								color: "var(--openloop-muted-foreground)",
								fontSize: 11
							},
							children: api.authType === "key" ? "key + 域名" : "无鉴权"
						})
					}),
					/* @__PURE__ */ jsxs("td", {
						style: tdStyle$4,
						children: [/* @__PURE__ */ jsx("span", {
							style: dotStyle$1,
							"data-openloop-tone": api.configured === true ? "success" : "warning"
						}), api.configured === true ? "已配置" : "未配置"]
					})
				] }, String(api.rid))) })]
			})
		})]
	});
}
//#endregion
//#region src/presets/api-credentials/index.ts
const apiCredentialsPreset = {
	kind: "api-credentials",
	schema: apiCredentialsSchema,
	validate: validateApiCredentials,
	Render: ApiCredentialsRender
};
//#endregion
//#region src/presets/avatar/schema.ts
/**
* avatar props JSON Schema。
* name 必填 1–80；size sm/md/lg（默认 md）；tone 可选，缺省按 name 哈希从预设色圆中确定性取色。
*/
const avatarSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		name: {
			type: "string",
			minLength: 1,
			maxLength: 80,
			description: "用户/实体名，取首字符渲染为圆形头像"
		},
		size: {
			enum: [
				"sm",
				"md",
				"lg"
			],
			description: "头像尺寸：sm=24 / md=32 / lg=40"
		},
		tone: {
			enum: [
				"primary",
				"info",
				"success",
				"warning",
				"error"
			],
			description: "头像底色；省略时按 name 哈希稳定取色"
		}
	},
	required: ["name"]
};
//#endregion
//#region src/presets/avatar/validate.ts
/**
* avatar 校验（fail-closed）：name 必填 1–80；size/tone 枚举。
*/
const SIZES$2 = [
	"sm",
	"md",
	"lg"
];
const TONES$5 = [
	"primary",
	"info",
	"success",
	"warning",
	"error"
];
function validateAvatar(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "avatar props 必须是 JSON 对象")]);
	const errors = [];
	if (!isNonEmptyString(root.name)) errors.push(error("name", "name 必填，必须是非空字符串（1–80 字符）"));
	else if (root.name.length > 80) errors.push(error("name", `name 长度不得超过 80 字符，当前 ${root.name.length}`));
	if (root.size !== void 0 && !SIZES$2.includes(String(root.size))) errors.push(error("size", "size 必须是 sm / md / lg 之一"));
	if (root.tone !== void 0 && !TONES$5.includes(String(root.tone))) errors.push(error("tone", "tone 必须是 primary / info / success / warning / error 之一"));
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/avatar/Render.tsx
const AVATAR_TONES = [
	"primary",
	"info",
	"success",
	"warning",
	"error"
];
const SIZES$1 = {
	sm: 24,
	md: 32,
	lg: 40
};
/** 确定性哈希取色：同名同色，切预设/明暗自动跟随 token */
function avatarColor(name, tone) {
	const explicit = AVATAR_TONES.includes(String(tone)) ? String(tone) : void 0;
	if (explicit) return `var(--openloop-${explicit})`;
	let hash = 0;
	for (const ch of name) hash = hash * 31 + (ch.codePointAt(0) ?? 0) >>> 0;
	return `var(--openloop-${AVATAR_TONES[hash % AVATAR_TONES.length] ?? "primary"})`;
}
function AvatarRender({ props }) {
	const root = asRecord(props) ?? {};
	const name = typeof root.name === "string" ? root.name : "";
	const size = SIZES$1[String(root.size)] ?? SIZES$1.md ?? 32;
	const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
	const circle = {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		width: size,
		height: size,
		borderRadius: "9999px",
		background: avatarColor(name, root.tone),
		color: "var(--openloop-primary-foreground, #ffffff)",
		fontSize: size >= 40 ? 18 : size >= 32 ? 15 : 12,
		fontWeight: 650,
		lineHeight: 1,
		flexShrink: 0,
		userSelect: "none"
	};
	return /* @__PURE__ */ jsx("span", {
		"data-openloop-preset": "avatar",
		"data-openloop-size": String(root.size ?? "md"),
		style: circle,
		"aria-label": name,
		role: "img",
		children: initial
	});
}
//#endregion
//#region src/presets/avatar/index.ts
const avatarPreset = {
	kind: "avatar",
	schema: avatarSchema,
	validate: validateAvatar,
	Render: AvatarRender
};
//#endregion
//#region src/presets/badge/schema.ts
/**
* badge props JSON Schema。
* label 必填 1–80；tone 六档（neutral/primary/info/success/warning/error，默认 neutral）。
*/
const badgeSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		label: {
			type: "string",
			minLength: 1,
			maxLength: 80,
			description: "徽标文本，1–80 字符"
		},
		tone: {
			enum: [
				"neutral",
				"primary",
				"info",
				"success",
				"warning",
				"error"
			],
			description: "徽标语气，默认 neutral；primary 用主色填充，其余用 tone 背景+前景件套"
		}
	},
	required: ["label"]
};
//#endregion
//#region src/presets/badge/validate.ts
/**
* badge 校验（fail-closed）：label 必填 1–80；tone 六档枚举。
*/
function validateBadge(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "badge props 必须是 JSON 对象")]);
	const errors = [];
	if (!isNonEmptyString(root.label)) errors.push(error("label", "label 必填，必须是非空字符串（1–80 字符）"));
	else if (root.label.length > 80) errors.push(error("label", `label 长度不得超过 80 字符，当前 ${root.label.length}`));
	if (root.tone !== void 0 && !isBadgeTone(root.tone)) errors.push(error("tone", "tone 必须是 neutral / primary / info / success / warning / error 之一"));
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/badge/Render.tsx
const pill$1 = {
	display: "inline-flex",
	alignItems: "center",
	gap: 4,
	padding: "2px 9px",
	borderRadius: "var(--openloop-radius-md)",
	fontSize: "var(--openloop-type-micro, 11px)",
	fontWeight: 600,
	lineHeight: 1.6,
	whiteSpace: "nowrap"
};
function BadgeRender({ props }) {
	const root = asRecord(props) ?? {};
	const label = typeof root.label === "string" ? root.label : "";
	const tone = isBadgeTone(root.tone) ? root.tone : "neutral";
	const colors = toneColors(tone);
	return /* @__PURE__ */ jsx("span", {
		"data-openloop-preset": "badge",
		"data-openloop-tone": tone,
		style: {
			...pill$1,
			background: colors.background,
			color: colors.foreground
		},
		children: label
	});
}
//#endregion
//#region src/presets/badge/index.ts
const badgePreset = {
	kind: "badge",
	schema: badgeSchema,
	validate: validateBadge,
	Render: BadgeRender
};
//#endregion
//#region src/presets/callout/schema.ts
/**
* callout props JSON Schema。
* tone（info/success/warning/error）+ title + description；
* 样式用对应 tone 的 background/border 件套（--openloop-{tone}-background/border）。
*/
const calloutSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		tone: {
			enum: [
				"info",
				"success",
				"warning",
				"error"
			],
			description: "提示语气，默认 info；error 渲染 role=\"alert\""
		},
		title: {
			type: "string",
			maxLength: 80,
			description: "提示标题（加粗），≤80 字符，可省略"
		},
		description: {
			type: "string",
			maxLength: 240,
			description: "提示正文，≤240 字符（必填）"
		}
	},
	required: ["description"]
};
//#endregion
//#region src/presets/callout/validate.ts
/**
* callout 校验（fail-closed）。
* - description 必填 ≤240 字符
* - title ≤80 字符
* - tone 限 info/success/warning/error
*/
const TONES$4 = [
	"info",
	"success",
	"warning",
	"error"
];
function validateCallout(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "callout props 必须是 JSON 对象")]);
	const errors = [];
	if (root.tone !== void 0 && !TONES$4.includes(String(root.tone))) errors.push(error("tone", "tone 必须是 info / success / warning / error 之一"));
	if (root.title !== void 0 && (typeof root.title !== "string" || root.title.length > 80)) errors.push(error("title", "title 必须是 ≤80 字符的字符串"));
	if (typeof root.description !== "string" || root.description.length < 1) errors.push(error("description", "description 必填，必须是字符串"));
	else if (root.description.length > 240) errors.push(error("description", `description 长度不得超过 240 字符，当前 ${root.description.length}`));
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/callout/Render.tsx
const TONE_STYLES = {
	info: {
		background: "var(--openloop-info-background)",
		border: "var(--openloop-info-border)",
		text: "var(--openloop-info)"
	},
	success: {
		background: "var(--openloop-success-background)",
		border: "var(--openloop-success-border)",
		text: "var(--openloop-success)"
	},
	warning: {
		background: "var(--openloop-warning-background)",
		border: "var(--openloop-warning-border)",
		text: "var(--openloop-warning)"
	},
	error: {
		background: "var(--openloop-error-background)",
		border: "var(--openloop-error-border)",
		text: "var(--openloop-error)"
	}
};
const TONE_GLYPH = {
	info: "ℹ",
	success: "✓",
	warning: "⚠",
	error: "✕"
};
const shellStyle = {
	display: "flex",
	alignItems: "flex-start",
	gap: 10,
	padding: "10px 12px",
	borderRadius: "var(--openloop-radius-lg)"
};
const glyphStyle = {
	fontSize: 13,
	lineHeight: 1.4,
	fontWeight: 600,
	flexShrink: 0
};
const bodyStyle$2 = { minWidth: 0 };
const titleStyle$4 = {
	fontSize: 13,
	lineHeight: 1.4,
	fontWeight: 650
};
const descriptionStyle = {
	fontSize: 12,
	lineHeight: 1.55,
	color: "var(--openloop-foreground)",
	wordBreak: "break-word"
};
function CalloutRender({ props }) {
	const root = asRecord(props) ?? {};
	const tone = root.tone === "success" || root.tone === "warning" || root.tone === "error" ? root.tone : "info";
	const title = typeof root.title === "string" && root.title.length > 0 ? root.title : void 0;
	const description = typeof root.description === "string" ? root.description : "";
	const palette = TONE_STYLES[tone];
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "callout",
		"data-openloop-tone": tone,
		role: tone === "error" ? "alert" : "status",
		style: {
			...shellStyle,
			border: `1px solid ${palette.border}`,
			background: palette.background,
			color: palette.text
		},
		children: [/* @__PURE__ */ jsx("span", {
			"aria-hidden": "true",
			style: glyphStyle,
			children: TONE_GLYPH[tone]
		}), /* @__PURE__ */ jsxs("div", {
			style: bodyStyle$2,
			children: [title !== void 0 ? /* @__PURE__ */ jsx("div", {
				style: {
					...titleStyle$4,
					color: palette.text
				},
				children: title
			}) : null, /* @__PURE__ */ jsx("div", {
				style: descriptionStyle,
				children: description
			})]
		})]
	});
}
//#endregion
//#region src/presets/callout/index.ts
const calloutPreset = {
	kind: "callout",
	schema: calloutSchema,
	validate: validateCallout,
	Render: CalloutRender
};
//#endregion
//#region src/presets/card/schema.ts
/**
* card props JSON Schema。
* title ≤120 / description ≤360 可选；children 为 0–12 个子 widget（仅一层、不含容器）。
*/
const cardSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 120,
			description: "卡片标题，≤120 字符，可省略"
		},
		description: {
			type: "string",
			maxLength: 360,
			description: "卡片说明，≤360 字符，可省略"
		},
		children: {
			type: "array",
			maxItems: 12,
			description: "子 widget 列表（0–12）：每项为 WidgetUnit 形状 { id, source: { type: \"preset\", kind, props } }，仅一层叶子组件",
			items: { type: "object" }
		}
	}
};
//#endregion
//#region src/presets/children.ts
/** 全部容器 kind（布局 + 分组） */
const CONTAINER_KINDS = [
	"card",
	"section",
	"stack",
	"grid",
	"row",
	"split"
];
/** 布局容器：children 可含分组容器（card/section）与叶子 */
const LAYOUT_KINDS = [
	"stack",
	"grid",
	"row",
	"split"
];
/** 分组容器：children 仅叶子（防递归的执行依据——分组内不可再出现任何容器） */
const GROUP_KINDS = ["card", "section"];
function isLayoutKind(kind) {
	return LAYOUT_KINDS.includes(kind);
}
function isGroupKind(kind) {
	return GROUP_KINDS.includes(kind);
}
/** 运行时预设 kind 白名单（与 contract.ts PresetKind 逐字一致；不引 validation.ts 以免服务端依赖进 client） */
const PRESET_KINDS$1 = [
	"text",
	"markdown",
	"heading",
	"badge",
	"tag",
	"divider",
	"avatar",
	"card",
	"section",
	"stack",
	"grid",
	"row",
	"split",
	"scroll-area",
	"metric",
	"metric-grid",
	"data-table",
	"list",
	"key-value",
	"stat",
	"rating",
	"empty-state",
	"timeline",
	"chart",
	"sparkline",
	"gauge",
	"funnel",
	"heatmap",
	"flow",
	"comparison",
	"steps",
	"tree",
	"callout",
	"status",
	"progress",
	"skeleton",
	"tabs",
	"accordion",
	"pagination",
	"tooltip"
];
function isContainerKind(kind) {
	return CONTAINER_KINDS.includes(kind);
}
/**
* 校验容器 children（widget 子树）。
* @param parentKind 发起调用的容器 kind：布局容器（stack/grid/row/split）允许子项为
*   叶子 + 分组容器；分组容器（card/section）允许子项仅叶子。
*/
function validateChildren(value, path, parentKind) {
	if (value === void 0) return [];
	if (!Array.isArray(value)) return [error(path, `${path} 必须是 widget 对象数组（0–12 个）`)];
	if (value.length > 12) return [error(path, `${path} 数量上限为 12，当前 ${value.length}`)];
	const errors = [];
	const seenIds = /* @__PURE__ */ new Set();
	value.forEach((raw, index) => {
		const childPath = `${path}[${index}]`;
		const widget = asRecord(raw);
		if (!widget) {
			errors.push(error(childPath, "子 widget 必须是 JSON 对象"));
			return;
		}
		const id = widget.id;
		if (typeof id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
			if (seenIds.has(id)) errors.push(error(`${childPath}.id`, `子 widget id "${id}" 在 children 内重复，需唯一`));
			seenIds.add(id);
		} else errors.push(error(`${childPath}.id`, "子 widget id 必须为非空 kebab-case 字符串（小写字母、数字、单连字符）"));
		const source = asRecord(widget.source);
		if (!source) {
			errors.push(error(`${childPath}.source`, "子 widget 缺少 source"));
			return;
		}
		if (source.type !== "preset") {
			errors.push(error(`${childPath}.source.type`, `子 widget 仅支持 preset source；pack/custom 需走沙箱车道，当前 "${String(source.type)}"`));
			return;
		}
		const kind = source.kind;
		if (typeof kind !== "string" || !PRESET_KINDS$1.includes(kind)) {
			errors.push(error(`${childPath}.source.kind`, `子 widget kind "${String(kind)}" 不在预设白名单（§6.1 全 40 个）`));
			return;
		}
		const presetKind = kind;
		if (isContainerKind(presetKind)) {
			if (!(isLayoutKind(parentKind) && isGroupKind(presetKind))) {
				errors.push(error(`${childPath}.source.kind`, isGroupKind(parentKind) ? `分组容器 "${parentKind}" 的 children 仅支持叶子组件（"${kind}" 是容器，禁止嵌套）` : `布局容器 "${parentKind}" 的 children 不支持布局容器 "${kind}"（布局不可嵌套；可用分组容器 card/section 包一层）`));
				return;
			}
		}
		if ((source.props === void 0 ? {} : asRecord(source.props)) === null) {
			errors.push(error(`${childPath}.source.props`, "子 widget props 必须是 JSON 对象"));
			return;
		}
	});
	return errors;
}
//#endregion
//#region src/presets/card/validate.ts
/**
* card 校验（fail-closed）：title/description 长度上限；children 经 validateChildren 深校验。
*/
function validateCard(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "card props 必须是 JSON 对象")]);
	const errors = [];
	if (root.title !== void 0) {
		if (typeof root.title !== "string") errors.push(error("title", "title 必须是字符串（≤120 字符）"));
		else if (root.title.length > 120) errors.push(error("title", `title 长度不得超过 120 字符，当前 ${root.title.length}`));
	}
	if (root.description !== void 0) {
		if (typeof root.description !== "string") errors.push(error("description", "description 必须是字符串（≤360 字符）"));
		else if (root.description.length > 360) errors.push(error("description", `description 长度不得超过 360 字符，当前 ${root.description.length}`));
	}
	errors.push(...validateChildren(root.children, "children", "card"));
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/container.tsx
const containerTitleStyle = {
	margin: 0,
	fontSize: "var(--openloop-type-label, 13px)",
	fontWeight: 600,
	lineHeight: 1.4,
	color: "var(--openloop-foreground)"
};
const containerDescStyle = {
	margin: "4px 0 0",
	fontSize: "var(--openloop-type-meta, 12px)",
	lineHeight: 1.5,
	color: "var(--openloop-muted-foreground)"
};
function ContainerHeader({ title, description }) {
	if (!title && !description) return null;
	return /* @__PURE__ */ jsxs("div", {
		style: { marginBottom: 10 },
		children: [title ? /* @__PURE__ */ jsx("div", {
			style: containerTitleStyle,
			children: title
		}) : null, description ? /* @__PURE__ */ jsx("div", {
			style: containerDescStyle,
			children: description
		}) : null]
	});
}
//#endregion
//#region src/presets/widget-view.tsx
const placeholderStyle$6 = {
	padding: "10px 12px",
	border: "1px dashed var(--openloop-border)",
	borderRadius: "var(--openloop-radius-sm)",
	fontSize: 12,
	lineHeight: 1.5,
	color: "var(--openloop-muted-foreground)"
};
/** 单格降级占位：kind + 面向 Agent 的可修正提示 */
function WidgetPlaceholder({ kind, message }) {
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-widget": "invalid",
		style: placeholderStyle$6,
		children: [/* @__PURE__ */ jsxs("div", {
			style: { fontWeight: 600 },
			children: ["子组件不可用", kind ? ` · ${kind}` : ""]
		}), message ? /* @__PURE__ */ jsx("div", {
			style: { marginTop: 2 },
			children: message
		}) : null]
	});
}
/** 渲染一个子 widget（WidgetUnit 形状）；非法/不可渲染返回占位 */
function WidgetView({ widget }) {
	const source = asRecord(widget.source);
	if (!source) return /* @__PURE__ */ jsx(WidgetPlaceholder, { message: "缺少 source，无法渲染" });
	if (source.type !== "preset") return /* @__PURE__ */ jsx(WidgetPlaceholder, {
		kind: String(source.type),
		message: "pack/custom 需走沙箱车道，容器 children 仅支持 preset 组件"
	});
	const kind = source.kind;
	if (typeof kind !== "string") return /* @__PURE__ */ jsx(WidgetPlaceholder, { message: "preset source 缺少 kind" });
	const preset = getPreset(kind);
	if (!preset) return /* @__PURE__ */ jsx(WidgetPlaceholder, {
		kind,
		message: "未知或未实现的 preset kind"
	});
	if (isLayoutKind(preset.kind)) return /* @__PURE__ */ jsx(WidgetPlaceholder, {
		kind: String(kind),
		message: "布局容器（stack/grid/row/split）不可作为子组件；如需分组请用 card/section"
	});
	const props = source.props === void 0 ? {} : asRecord(source.props);
	if (props === null) return /* @__PURE__ */ jsx(WidgetPlaceholder, {
		kind: String(kind),
		message: "props 必须是 JSON 对象"
	});
	const result = preset.validate(props);
	if (!result.ok) {
		const first = result.errors[0];
		return /* @__PURE__ */ jsx(WidgetPlaceholder, {
			kind: String(kind),
			message: first ? first.message : "props 校验失败"
		});
	}
	return /* @__PURE__ */ jsx(preset.Render, { props });
}
/** 批量渲染容器 children（key 用 widget.id，缺省回退 index） */
function renderChildren(children) {
	return children.map((child, index) => {
		const id = child?.id;
		return /* @__PURE__ */ jsx(WidgetView, { widget: child }, typeof id === "string" ? id : `child-${index}`);
	});
}
//#endregion
//#region src/presets/card/Render.tsx
const shell$1 = {
	...panel,
	padding: "14px 16px"
};
const body$1 = {
	display: "flex",
	flexDirection: "column",
	gap: 10
};
function CardRender({ props }) {
	const root = asRecord(props) ?? {};
	const title = typeof root.title === "string" ? root.title : void 0;
	const description = typeof root.description === "string" ? root.description : void 0;
	const children = Array.isArray(root.children) ? root.children : [];
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "card",
		style: shell$1,
		children: [/* @__PURE__ */ jsx(ContainerHeader, {
			title,
			description
		}), /* @__PURE__ */ jsx("div", {
			style: body$1,
			children: renderChildren(children)
		})]
	});
}
//#endregion
//#region src/presets/card/index.ts
const cardPreset = {
	kind: "card",
	schema: cardSchema,
	validate: validateCard,
	Render: CardRender
};
//#endregion
//#region src/presets/chart/schema.ts
/**
* chart props JSON Schema（多 variant 单 kind）。
* 约束：series ≤6；data 行数 1–100；xKey 及系列 label ≤40 字符。
* - bar：分组柱，chart-1..N 着色，数值轴 0 基
* - line：折线+点（area=true 时填充面积），chart-1..N
* - donut：单/多系列（≤4 环），中心总数值标注
* referenceLine 仅 bar/line 生效（number）；legend 显隐系列色块。
*/
const chartSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "可选的图表标题，≤80 字符"
		},
		variant: {
			enum: [
				"bar",
				"line",
				"donut"
			],
			description: "图表形态：bar 分组柱 / line 折线 / donut 环形"
		},
		data: {
			type: "array",
			minItems: 1,
			maxItems: 100,
			description: "行数据，1–100 个对象；数值取自各 series.key",
			items: { type: "object" }
		},
		xKey: {
			type: "string",
			minLength: 1,
			maxLength: 40,
			description: "横轴/扇区标签取值字段，默认 label"
		},
		series: {
			type: "array",
			minItems: 1,
			maxItems: 6,
			description: "系列定义，1–6 项（donut 限 ≤4）",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					key: {
						type: "string",
						minLength: 1,
						maxLength: 40,
						description: "data 行中数值字段名"
					},
					label: {
						type: "string",
						maxLength: 40,
						description: "图例/系列文案，缺省用 key"
					}
				},
				required: ["key"]
			}
		},
		legend: {
			type: "boolean",
			description: "显示系列图例，默认 true"
		},
		referenceLine: {
			type: "number",
			description: "可选的参考线数值（仅 bar/line 生效）"
		},
		area: {
			type: "boolean",
			description: "line 是否填充折线下方面积（仅 line 生效）"
		}
	},
	required: [
		"variant",
		"data",
		"series"
	]
};
//#endregion
//#region src/presets/chart/validate.ts
/**
* chart 校验（fail-closed，错误消息面向 Agent 可自修正）。
* - variant 必填枚举；data 必填 1–100 项对象；series 必填 1–6 项（donut ≤4）
* - 每系列 key 为非空字符串 ≤40；label ≤40；xKey ≤40
* - referenceLine 仅 bar/line 可带；area 仅 line 可带；其余字段类型约束
*/
const VARIANTS = [
	"bar",
	"line",
	"donut"
];
const MAX_ROWS$1 = 100;
const MAX_SERIES = 6;
const MAX_DONUT_SERIES = 4;
const MAX_LABEL$2 = 40;
function validateChart(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "chart props 必须是 JSON 对象")]);
	const errors = [];
	if (root.title !== void 0 && (typeof root.title !== "string" || root.title.length > 80)) errors.push(error("title", "title 必须是 ≤80 字符的字符串"));
	if (!VARIANTS.includes(String(root.variant))) errors.push(error("variant", "variant 必填，必须是 bar / line / donut 之一"));
	if (root.legend !== void 0 && typeof root.legend !== "boolean") errors.push(error("legend", "legend 必须是布尔值"));
	if (root.referenceLine !== void 0 && !isFiniteNumber(root.referenceLine)) errors.push(error("referenceLine", "referenceLine 必须是有限数字"));
	else if (root.referenceLine !== void 0 && root.variant === "donut") errors.push(error("referenceLine", "referenceLine 仅 bar / line 支持，donut 不接受参考线"));
	if (root.area !== void 0 && typeof root.area !== "boolean") errors.push(error("area", "area 必须是布尔值"));
	else if (root.area === true && root.variant !== "line") errors.push(error("area", "area 仅 line variant 支持"));
	if (root.xKey !== void 0) {
		if (!isNonEmptyString(root.xKey)) errors.push(error("xKey", "xKey 必须是非空字符串"));
		else if (root.xKey.length > MAX_LABEL$2) errors.push(error("xKey", `xKey 长度不得超过 ${MAX_LABEL$2} 字符，当前 ${root.xKey.length}`));
	}
	if (!Array.isArray(root.data)) {
		errors.push(error("data", "data 必填，必须是 1–100 项的对象数组"));
		return validationFail(errors);
	}
	if (root.data.length < 1 || root.data.length > MAX_ROWS$1) errors.push(error("data", `data 行数必须为 1–${MAX_ROWS$1}，当前 ${root.data.length}`));
	const rows = root.data;
	rows.forEach((raw, index) => {
		if (!asRecord(raw)) errors.push(error(`data[${index}]`, "data 每一项必须是 JSON 对象"));
	});
	if (!Array.isArray(root.series)) {
		errors.push(error("series", "series 必填，必须是 1–6 项的数组"));
		return validationFail(errors);
	}
	const seriesMax = root.variant === "donut" ? MAX_DONUT_SERIES : MAX_SERIES;
	if (root.series.length < 1 || root.series.length > seriesMax) errors.push(error("series", `series 数量必须为 1–${seriesMax}（donut ≤4），当前 ${root.series.length}`));
	root.series.forEach((raw, index) => {
		const path = `series[${index}]`;
		const item = asRecord(raw);
		if (!item) {
			errors.push(error(path, "series 每一项必须是 JSON 对象"));
			return;
		}
		if (!isNonEmptyString(item.key)) errors.push(error(`${path}.key`, "key 必填，必须是非空字符串（1–40 字符）"));
		else if (item.key.length > MAX_LABEL$2) errors.push(error(`${path}.key`, `series.key 长度不得超过 ${MAX_LABEL$2} 字符，当前 ${item.key.length}`));
		if (item.label !== void 0) {
			if (typeof item.label !== "string") errors.push(error(`${path}.label`, "series.label 必须是字符串"));
			else if (item.label.length > MAX_LABEL$2) errors.push(error(`${path}.label`, `series.label 长度不得超过 ${MAX_LABEL$2} 字符，当前 ${item.label.length}`));
		}
	});
	const xKey = isNonEmptyString(root.xKey) ? root.xKey : "label";
	rows.forEach((raw, rowIndex) => {
		const row = asRecord(raw);
		if (!row) return;
		const label = row[xKey];
		if (typeof label === "string" && label.length > MAX_LABEL$2) errors.push(error(`data[${rowIndex}].${xKey}`, `xKey 标签长度不得超过 ${MAX_LABEL$2} 字符，当前 ${label.length}`));
	});
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/chart/Render.tsx
/**
* chart 渲染器（多 variant 单 kind）。
* 参照 DeclarativeInteractiveView.DeclarativeChart：手绘 SVG 零图表库，
* chart-1..8 分类色；bar 分组柱 0 基、line 折线+点（area 可填充）、
* donut 多环（≤4）+ 比例标注 + hover tooltip（组件内 state）。
* 样式 100% 来自 var(--openloop-*)。
*/
const CHART_COLORS = [
	"var(--openloop-chart-1)",
	"var(--openloop-chart-2)",
	"var(--openloop-chart-3)",
	"var(--openloop-chart-4)",
	"var(--openloop-chart-5)",
	"var(--openloop-chart-6)",
	"var(--openloop-chart-7)",
	"var(--openloop-chart-8)"
];
const WIDTH = 680;
const HEIGHT = 260;
const MARGIN = {
	top: 16,
	right: 18,
	bottom: 42,
	left: 48
};
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const containerStyle$5 = {
	...panel,
	padding: "12px 14px",
	minWidth: 0
};
const titleStyle$3 = {
	...title,
	marginBottom: 10
};
const legendStyle = {
	marginTop: 10,
	display: "flex",
	flexWrap: "wrap",
	gap: "4px 16px"
};
const legendButtonStyle = {
	display: "inline-flex",
	alignItems: "center",
	gap: 6,
	border: "none",
	background: "transparent",
	padding: 0,
	cursor: "pointer",
	fontFamily: "inherit",
	fontSize: 12,
	lineHeight: 1.5,
	color: "var(--openloop-muted-foreground)"
};
const tooltipStyle = {
	position: "absolute",
	zIndex: 10,
	minWidth: 112,
	transform: "translate(-50%, -100%)",
	borderRadius: "var(--openloop-radius-md)",
	border: "1px solid var(--openloop-border)",
	background: "var(--openloop-surface)",
	padding: "6px 10px",
	boxShadow: "var(--openloop-shadow-1)",
	pointerEvents: "none"
};
function compactTick$2(value) {
	return new Intl.NumberFormat(void 0, {
		notation: "compact",
		maximumFractionDigits: 1
	}).format(value);
}
function displayLabel(value) {
	return String(value ?? "");
}
function parseSeries(raw) {
	return (Array.isArray(raw) ? raw : []).map(asRecord).filter((entry) => entry !== null).map((entry) => ({
		key: typeof entry.key === "string" ? entry.key : "",
		label: typeof entry.label === "string" ? entry.label : void 0
	})).filter((entry) => entry.key.length > 0);
}
function ChartRender({ props }) {
	const root = asRecord(props) ?? {};
	const panelTitle = typeof root.title === "string" ? root.title : void 0;
	const variant = root.variant === "line" || root.variant === "donut" ? root.variant : "bar";
	const xKey = typeof root.xKey === "string" && root.xKey.length > 0 ? root.xKey : "label";
	const legendVisible = root.legend !== false;
	const referenceLine = typeof root.referenceLine === "number" && Number.isFinite(root.referenceLine) ? root.referenceLine : void 0;
	const withArea = root.area === true;
	const rows = (Array.isArray(root.data) ? root.data : []).map(asRecord).filter((entry) => entry !== null);
	const allSeries = parseSeries(root.series);
	const [hiddenKeys, setHiddenKeys] = useState([]);
	const hidden = new Set(hiddenKeys);
	const series = allSeries.filter((entry) => !hidden.has(entry.key));
	const toggleSeries = (key) => {
		setHiddenKeys((current) => current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
	};
	const [tooltip, setTooltip] = useState(null);
	const legend = allSeries.length > 1 && legendVisible ? /* @__PURE__ */ jsx("div", {
		style: legendStyle,
		children: allSeries.map((item, index) => {
			const isHidden = hidden.has(item.key);
			return /* @__PURE__ */ jsxs("button", {
				type: "button",
				onClick: () => toggleSeries(item.key),
				"aria-pressed": !isHidden,
				style: {
					...legendButtonStyle,
					...isHidden ? {
						opacity: .4,
						textDecoration: "line-through"
					} : null
				},
				children: [/* @__PURE__ */ jsx("span", {
					"aria-hidden": "true",
					style: {
						width: 10,
						height: 10,
						borderRadius: 3,
						background: CHART_COLORS[index % CHART_COLORS.length],
						flexShrink: 0
					}
				}), item.label ?? item.key]
			}, item.key);
		})
	}) : null;
	const empty = /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "chart",
		"data-openloop-variant": variant,
		"data-openloop-count": "0",
		style: containerStyle$5,
		children: [panelTitle !== void 0 ? /* @__PURE__ */ jsx("div", {
			style: titleStyle$3,
			children: panelTitle
		}) : null, /* @__PURE__ */ jsx("div", {
			style: meta,
			children: "暂无数据"
		})]
	});
	if (rows.length === 0 || series.length === 0) return empty;
	if (variant === "donut") {
		const donutSeries = series.slice(0, 4);
		const ringWidth = 16;
		const outerRadius = 76;
		const totalOf = (seriesItem) => rows.reduce((sum, row) => sum + Math.max(0, Number(row[seriesItem.key]) || 0), 0);
		const firstSeries = donutSeries[0];
		if (!firstSeries) return empty;
		const firstTotal = totalOf(firstSeries);
		const singleRing = donutSeries.length === 1;
		return /* @__PURE__ */ jsxs("div", {
			"data-openloop-preset": "chart",
			"data-openloop-variant": "donut",
			"data-openloop-count": String(rows.length),
			style: containerStyle$5,
			children: [
				panelTitle !== void 0 ? /* @__PURE__ */ jsx("div", {
					style: titleStyle$3,
					children: panelTitle
				}) : null,
				/* @__PURE__ */ jsxs("div", {
					style: {
						position: "relative",
						maxWidth: 240,
						margin: "0 auto"
					},
					onPointerLeave: () => setTooltip(null),
					children: [/* @__PURE__ */ jsxs("svg", {
						viewBox: "0 0 220 220",
						style: {
							display: "block",
							width: "100%",
							height: "auto"
						},
						role: "group",
						"aria-label": panelTitle ?? "donut chart",
						children: [
							donutSeries.map((item, ringIndex) => {
								const radius = outerRadius - ringIndex * 20;
								const parts = rows.map((row) => ({
									label: displayLabel(row[xKey]),
									value: Math.max(0, Number(row[item.key]) || 0)
								})).filter((part) => part.value > 0);
								const total = parts.reduce((sum, part) => sum + part.value, 0);
								let offset = 0;
								return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("circle", {
									cx: "110",
									cy: "110",
									r: radius,
									fill: "none",
									stroke: "var(--openloop-surface-muted)",
									strokeWidth: ringWidth,
									"aria-hidden": "true"
								}), parts.map((part) => {
									const fraction = total > 0 ? part.value / total : 0;
									const start = offset;
									offset += fraction;
									const angle = (start + fraction / 2) * Math.PI * 2 - Math.PI / 2;
									const showProportion = singleRing && fraction >= .05;
									const tooltipState = {
										x: 110 + Math.cos(angle) * radius,
										y: 110 + Math.sin(angle) * radius,
										label: part.label,
										series: item.label ?? item.key,
										value: `${compactTick$2(part.value)} · ${new Intl.NumberFormat(void 0, {
											style: "percent",
											maximumFractionDigits: 1
										}).format(fraction)}`
									};
									return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("circle", {
										cx: "110",
										cy: "110",
										r: radius,
										fill: "none",
										pathLength: "100",
										stroke: CHART_COLORS[ringIndex % CHART_COLORS.length],
										strokeWidth: ringWidth,
										strokeDasharray: `${fraction * 100} ${100 - fraction * 100}`,
										strokeDashoffset: -start * 100,
										transform: "rotate(-90 110 110)",
										role: "graphics-symbol",
										"aria-label": `${part.label} · ${item.label ?? item.key}: ${tooltipState.value}`,
										onPointerEnter: () => setTooltip(tooltipState),
										onFocus: () => setTooltip(tooltipState),
										onBlur: () => setTooltip(null)
									}), showProportion ? /* @__PURE__ */ jsx("text", {
										x: 110 + Math.cos(angle) * radius * .62,
										y: 110 + Math.sin(angle) * radius * .62,
										textAnchor: "middle",
										fontSize: "10",
										fill: "var(--openloop-foreground)",
										children: new Intl.NumberFormat(void 0, {
											style: "percent",
											maximumFractionDigits: 0
										}).format(fraction)
									}) : null] }, `${item.key}:${part.label}`);
								})] }, item.key);
							}),
							/* @__PURE__ */ jsx("text", {
								x: "110",
								y: "104",
								textAnchor: "middle",
								fontSize: "11",
								fill: "var(--openloop-muted-foreground)",
								children: firstSeries.label ?? firstSeries.key
							}),
							/* @__PURE__ */ jsx("text", {
								x: "110",
								y: "130",
								textAnchor: "middle",
								fontSize: "18",
								fontWeight: 650,
								fill: "var(--openloop-foreground)",
								style: { fontVariantNumeric: "tabular-nums" },
								children: compactTick$2(firstTotal)
							})
						]
					}), tooltip ? /* @__PURE__ */ jsxs("div", {
						role: "tooltip",
						style: {
							...tooltipStyle,
							left: `${tooltip.x / 220 * 100}%`,
							top: `${tooltip.y / 220 * 100}%`
						},
						children: [/* @__PURE__ */ jsx("div", {
							style: meta,
							children: tooltip.label
						}), /* @__PURE__ */ jsxs("div", {
							style: {
								marginTop: 2,
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: 12,
								fontSize: 12,
								lineHeight: 1.5,
								color: "var(--openloop-foreground)"
							},
							children: [/* @__PURE__ */ jsx("span", { children: tooltip.series }), /* @__PURE__ */ jsx("span", {
								style: {
									fontWeight: 600,
									fontVariantNumeric: "tabular-nums"
								},
								children: tooltip.value
							})]
						})]
					}) : null]
				}),
				legend
			]
		});
	}
	const values = rows.flatMap((row) => series.map((item) => Number(row[item.key])).filter(Number.isFinite));
	if (values.length === 0) return empty;
	const minValue = Math.min(0, ...values);
	const maxValue = Math.max(0, ...values);
	const extent = maxValue - minValue || 1;
	const xAt = (index) => MARGIN.left + (index + .5) / rows.length * PLOT_WIDTH;
	const yAt = (value) => MARGIN.top + (maxValue - value) / extent * PLOT_HEIGHT;
	const baseline = yAt(0);
	const labelEvery = Math.max(1, Math.ceil(rows.length / 8));
	const bars = [];
	if (variant === "bar") rows.forEach((row, rowIndex) => {
		const groupWidth = PLOT_WIDTH / rows.length * .72;
		const barWidth = Math.max(1, groupWidth / series.length - 2);
		series.forEach((item, seriesIndex) => {
			const value = Number(row[item.key]);
			if (!Number.isFinite(value)) return;
			const y = yAt(value);
			bars.push(/* @__PURE__ */ jsx("rect", {
				x: xAt(rowIndex) - groupWidth / 2 + seriesIndex * (barWidth + 2),
				y: Math.min(y, baseline),
				width: barWidth,
				height: Math.max(1, Math.abs(baseline - y)),
				rx: "3",
				fill: CHART_COLORS[seriesIndex % CHART_COLORS.length],
				role: "graphics-symbol",
				"aria-label": `${displayLabel(row[xKey])} · ${item.label ?? item.key}: ${compactTick$2(value)}`
			}, `${rowIndex}:${item.key}`));
		});
	});
	const lines = [];
	if (variant === "line") series.forEach((item) => {
		const points = rows.flatMap((row, rowIndex) => {
			const value = Number(row[item.key]);
			return Number.isFinite(value) ? [{
				x: xAt(rowIndex),
				y: yAt(value),
				label: displayLabel(row[xKey]),
				value
			}] : [];
		});
		if (points.length === 0) return;
		const lastPoint = points[points.length - 1];
		const firstPoint = points[0];
		if (!lastPoint || !firstPoint) return;
		const linePath = points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
		const color = CHART_COLORS[series.indexOf(item) % CHART_COLORS.length];
		const elements = [];
		if (withArea) elements.push(/* @__PURE__ */ jsx("path", {
			d: `${linePath} L ${lastPoint.x.toFixed(2)} ${baseline.toFixed(2)} L ${firstPoint.x.toFixed(2)} ${baseline.toFixed(2)} Z`,
			fill: color,
			opacity: "0.14"
		}, "area"));
		elements.push(/* @__PURE__ */ jsx("path", {
			d: linePath,
			fill: "none",
			stroke: color,
			strokeWidth: "3",
			strokeLinecap: "round",
			strokeLinejoin: "round"
		}, "line"));
		points.forEach(({ x, y, label, value }, pointIndex) => {
			elements.push(/* @__PURE__ */ jsx("circle", {
				cx: x,
				cy: y,
				r: points.length <= 16 ? 3.5 : 2.5,
				fill: points.length <= 16 ? "var(--openloop-surface)" : "transparent",
				stroke: color,
				strokeWidth: points.length <= 16 ? 2 : 0,
				role: "graphics-symbol",
				"aria-label": `${label} · ${item.label ?? item.key}: ${compactTick$2(value)}`
			}, `dot:${pointIndex}`));
		});
		lines.push(/* @__PURE__ */ jsx("g", { children: elements }, item.key));
	});
	const referenceY = referenceLine !== void 0 ? yAt(referenceLine) : void 0;
	const showReference = referenceY !== void 0 && Number.isFinite(referenceY) && referenceY >= MARGIN.top && referenceY <= MARGIN.top + PLOT_HEIGHT;
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "chart",
		"data-openloop-variant": variant,
		"data-openloop-count": String(rows.length),
		style: containerStyle$5,
		children: [
			panelTitle !== void 0 ? /* @__PURE__ */ jsx("div", {
				style: titleStyle$3,
				children: panelTitle
			}) : null,
			/* @__PURE__ */ jsxs("svg", {
				viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
				style: {
					display: "block",
					width: "100%",
					height: "auto"
				},
				role: "group",
				"aria-label": panelTitle ?? `${variant} chart`,
				children: [
					Array.from({ length: 5 }, (_, index) => {
						const ratio = index / 4;
						const y = MARGIN.top + ratio * PLOT_HEIGHT;
						const value = maxValue - ratio * extent;
						return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("line", {
							x1: MARGIN.left,
							x2: WIDTH - MARGIN.right,
							y1: y,
							y2: y,
							stroke: "var(--openloop-border)",
							strokeOpacity: "0.35",
							strokeDasharray: "3 4"
						}), /* @__PURE__ */ jsx("text", {
							x: MARGIN.left - 8,
							y: y + 4,
							textAnchor: "end",
							fontSize: "10",
							fill: "var(--openloop-muted-foreground)",
							children: compactTick$2(value)
						})] }, `grid:${index}`);
					}),
					showReference && referenceY !== void 0 ? /* @__PURE__ */ jsx("line", {
						x1: MARGIN.left,
						x2: WIDTH - MARGIN.right,
						y1: referenceY,
						y2: referenceY,
						stroke: "var(--openloop-primary-tint)",
						strokeWidth: "1.5",
						strokeDasharray: "6 4",
						"aria-hidden": "true"
					}) : null,
					variant === "bar" ? bars : lines,
					rows.map((row, index) => index === 0 || index === rows.length - 1 || index % labelEvery === 0 ? /* @__PURE__ */ jsx("text", {
						x: xAt(index),
						y: 246,
						textAnchor: "middle",
						fontSize: "10",
						fill: "var(--openloop-muted-foreground)",
						children: displayLabel(row[xKey]).slice(0, 14)
					}, `label:${index}`) : null)
				]
			}),
			legend
		]
	});
}
//#endregion
//#region src/presets/chart/index.ts
const chartPreset = {
	kind: "chart",
	schema: chartSchema,
	validate: validateChart,
	Render: ChartRender
};
//#endregion
//#region src/presets/comparison/schema.ts
/**
* comparison props JSON Schema。
* 移植自 declarative document.ts ComparisonDocument：columns 2–4 + rows 1–12 +
* 最多 1 个 recommended 列 + 每行 values 长度必须等于列数（validate 中强制）。
* 列聚焦为组件内本地 state，默认聚焦推荐列（无推荐则第一列）。
*/
const comparisonSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 120,
			description: "对比标题，≤120 字符，可省略"
		},
		description: {
			type: "string",
			maxLength: 360,
			description: "一句话说明对比对象，≤360 字符，可省略"
		},
		columns: {
			type: "array",
			minItems: 2,
			maxItems: 4,
			description: "对比列，2–4 个，id 唯一；最多 1 列可标 recommended",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						type: "string",
						minLength: 1,
						maxLength: 40,
						description: "列 id，非空且全局唯一"
					},
					title: {
						type: "string",
						minLength: 1,
						maxLength: 60,
						description: "列标题（如方案名），1–60 字符"
					},
					subtitle: {
						type: "string",
						maxLength: 80,
						description: "列副标题（如价格/定位），≤80 字符，可省略"
					},
					recommended: {
						type: "boolean",
						description: "是否推荐列；全部列中最多 1 个 true"
					}
				},
				required: ["id", "title"]
			}
		},
		rows: {
			type: "array",
			minItems: 1,
			maxItems: 12,
			description: "对比行，1–12 个；每行 values 长度必须等于列数",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					label: {
						type: "string",
						minLength: 1,
						maxLength: 60,
						description: "行维度名（如「价格」），1–60 字符"
					},
					values: {
						type: "array",
						minItems: 2,
						maxItems: 4,
						items: {
							type: "string",
							maxLength: 120
						},
						description: "各列取值，长度必须与 columns 一致，单值 ≤120 字符"
					},
					emphasis: {
						enum: ["normal", "strong"],
						description: "行强调，默认 normal；strong 加粗"
					}
				},
				required: ["label", "values"]
			}
		}
	},
	required: ["columns", "rows"]
};
//#endregion
//#region src/presets/comparison/validate.ts
/**
* comparison 校验（fail-closed）。
* 移植自 declarative document.ts validateComparison：
* - columns 2–4，id 唯一，最多 1 个 recommended
* - rows 1–12，label 必填非空，values 长度必须等于列数
*/
function validateComparison(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "comparison props 必须是 JSON 对象")]);
	const errors = [];
	if (root.title !== void 0 && (typeof root.title !== "string" || root.title.length > 120)) errors.push(error("title", "title 必须是 ≤120 字符的字符串"));
	if (root.description !== void 0 && (typeof root.description !== "string" || root.description.length > 360)) errors.push(error("description", "description 必须是 ≤360 字符的字符串"));
	if (!Array.isArray(root.columns)) {
		errors.push(error("columns", "columns 必填，必须是 2–4 个列的数组"));
		return validationFail(errors);
	}
	if (root.columns.length < 2 || root.columns.length > 4) errors.push(error("columns", `columns 数量必须为 2–4，当前 ${root.columns.length}`));
	const columnIds = /* @__PURE__ */ new Set();
	let recommendedCount = 0;
	const columns = root.columns;
	columns.forEach((raw, index) => {
		const path = `columns[${index}]`;
		const column = asRecord(raw);
		if (!column) {
			errors.push(error(path, "每一列必须是 JSON 对象"));
			return;
		}
		if (!isNonEmptyString(column.id)) errors.push(error(`${path}.id`, "id 必填，必须是非空字符串"));
		else if (columnIds.has(column.id)) errors.push(error(`${path}.id`, `列 id "${column.id}" 重复，columns 内 id 必须唯一`));
		else columnIds.add(column.id);
		if (!isNonEmptyString(column.title)) errors.push(error(`${path}.title`, "title 必填，必须是非空字符串（1–60 字符）"));
		else if (column.title.length > 60) errors.push(error(`${path}.title`, `title 长度不得超过 60 字符，当前 ${column.title.length}`));
		if (column.subtitle !== void 0 && (typeof column.subtitle !== "string" || column.subtitle.length > 80)) errors.push(error(`${path}.subtitle`, "subtitle 必须是 ≤80 字符的字符串"));
		if (column.recommended !== void 0 && typeof column.recommended !== "boolean") errors.push(error(`${path}.recommended`, "recommended 必须是布尔值"));
		else if (column.recommended === true) recommendedCount += 1;
	});
	if (recommendedCount > 1) errors.push(error("columns", `最多 1 个 recommended 列，当前 ${recommendedCount} 个；请只保留一个 true`));
	if (!Array.isArray(root.rows)) {
		errors.push(error("rows", "rows 必填，必须是 1–12 个行的数组"));
		return validationFail(errors);
	}
	if (root.rows.length < 1 || root.rows.length > 12) errors.push(error("rows", `rows 数量必须为 1–12，当前 ${root.rows.length}`));
	const columnCount = columns.length;
	root.rows.forEach((raw, index) => {
		const path = `rows[${index}]`;
		const row = asRecord(raw);
		if (!row) {
			errors.push(error(path, "每一行必须是 JSON 对象"));
			return;
		}
		if (!isNonEmptyString(row.label)) errors.push(error(`${path}.label`, "label 必填，必须是非空字符串（1–60 字符）"));
		else if (row.label.length > 60) errors.push(error(`${path}.label`, `label 长度不得超过 60 字符，当前 ${row.label.length}`));
		if (!Array.isArray(row.values)) errors.push(error(`${path}.values`, `values 必填，必须是长度等于列数（${columnCount}）的字符串数组`));
		else {
			if (row.values.length !== columnCount) errors.push(error(`${path}.values`, `values 长度 ${row.values.length} 与列数 ${columnCount} 不一致，需提供 ${columnCount} 个值`));
			row.values.forEach((value, valueIndex) => {
				if (typeof value !== "string") errors.push(error(`${path}.values[${valueIndex}]`, "values 每一项必须是字符串"));
				else if (value.length > 120) errors.push(error(`${path}.values[${valueIndex}]`, `取值长度不得超过 120 字符，当前 ${value.length}`));
			});
		}
		if (row.emphasis !== void 0 && row.emphasis !== "normal" && row.emphasis !== "strong") errors.push(error(`${path}.emphasis`, "emphasis 必须是 normal / strong 之一"));
	});
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/comparison/Render.tsx
/**
* comparison 渲染器。
* 移植自 DeclarativeCard.tsx ComparisonView：列聚焦 pill + 网格表格。
* 改写点：
* - 外部 Pill 组件 → 组件内 button（交互限本地 state，默认聚焦推荐列）
* - 聚焦列用 selection/selection-foreground 对比对（8 预设明暗齐备；曾误用
*   primary-tint 填充——它是「更亮的 primary」非背景色，暗色下对比崩坏）
*/
const headerStyle$8 = {
	padding: "10px 12px",
	borderBottom: "1px solid var(--openloop-border)"
};
const bodyStyle$1 = {
	padding: 14,
	overflowX: "auto"
};
const pillRowStyle = {
	display: "flex",
	flexWrap: "wrap",
	gap: 6,
	marginBottom: 10
};
const pillStyle = {
	padding: "4px 10px",
	borderRadius: "var(--openloop-radius-lg)",
	border: "1px solid var(--openloop-border)",
	background: "var(--openloop-surface)",
	color: "var(--openloop-foreground)",
	fontSize: 12,
	lineHeight: 1.5,
	fontWeight: 500,
	cursor: "pointer"
};
const pillActiveStyle = {
	...pillStyle,
	border: "1px solid var(--openloop-primary)",
	background: "var(--openloop-primary)",
	color: "var(--openloop-primary-foreground)",
	fontWeight: 600
};
const cellBaseStyle = {
	padding: "10px 12px",
	borderTop: "1px solid var(--openloop-border)",
	minWidth: 0,
	wordBreak: "break-word"
};
function ComparisonRender({ props }) {
	const root = asRecord(props) ?? {};
	const panelTitle = typeof root.title === "string" ? root.title : void 0;
	const description = typeof root.description === "string" ? root.description : void 0;
	const columns = (Array.isArray(root.columns) ? root.columns : []).slice(0, 4).map((raw, index) => {
		const column = asRecord(raw) ?? {};
		return {
			id: isNonEmptyString(column.id) ? column.id : `column-${index}`,
			title: typeof column.title === "string" ? column.title : `列 ${index + 1}`,
			subtitle: typeof column.subtitle === "string" ? column.subtitle : void 0,
			recommended: column.recommended === true
		};
	});
	const rows = (Array.isArray(root.rows) ? root.rows : []).slice(0, 12).map((raw, index) => {
		const row = asRecord(raw) ?? {};
		const values = Array.isArray(row.values) ? row.values : [];
		return {
			label: typeof row.label === "string" ? row.label : `维度 ${index + 1}`,
			values: Array.from({ length: columns.length }, (_, valueIndex) => {
				const value = values[valueIndex];
				return typeof value === "string" ? value : "";
			}),
			emphasis: row.emphasis === "strong" ? "strong" : "normal"
		};
	});
	const recommendedIndex = columns.findIndex((column) => column.recommended);
	const [focus, setFocus] = useState(recommendedIndex >= 0 ? recommendedIndex : 0);
	const focused = focus >= 0 && focus < columns.length ? focus : 0;
	if (columns.length === 0 || rows.length === 0) return /* @__PURE__ */ jsx("div", {
		"data-openloop-preset": "comparison",
		"data-openloop-count": "0",
		style: {
			...panel,
			padding: "12px 14px"
		},
		children: /* @__PURE__ */ jsx("div", {
			style: meta,
			children: "暂无对比数据"
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "comparison",
		"data-openloop-count": String(rows.length),
		style: {
			...panel,
			overflow: "hidden",
			padding: 0
		},
		children: [panelTitle !== void 0 || description !== void 0 ? /* @__PURE__ */ jsxs("div", {
			style: headerStyle$8,
			children: [panelTitle !== void 0 ? /* @__PURE__ */ jsx("div", {
				style: title,
				children: panelTitle
			}) : null, description !== void 0 ? /* @__PURE__ */ jsx("div", {
				style: {
					...meta,
					marginTop: 3
				},
				children: description
			}) : null]
		}) : null, /* @__PURE__ */ jsxs("div", {
			style: bodyStyle$1,
			children: [/* @__PURE__ */ jsx("div", {
				style: pillRowStyle,
				role: "tablist",
				"aria-label": "聚焦对比列",
				children: columns.map((column, index) => /* @__PURE__ */ jsxs("button", {
					type: "button",
					role: "tab",
					"aria-selected": focused === index,
					onClick: () => setFocus(index),
					style: focused === index ? pillActiveStyle : pillStyle,
					children: [column.title, column.recommended ? " · 推荐" : ""]
				}, column.id))
			}), /* @__PURE__ */ jsxs("div", {
				style: {
					minWidth: 420,
					display: "grid",
					gridTemplateColumns: `minmax(110px, .8fr) repeat(${columns.length}, minmax(110px, 1fr))`,
					border: "1px solid var(--openloop-border)",
					borderRadius: "var(--openloop-radius-md)",
					overflow: "hidden"
				},
				children: [
					/* @__PURE__ */ jsx("div", { style: {
						padding: 10,
						background: "var(--openloop-surface-muted)"
					} }),
					columns.map((column, index) => {
						const isFocused = focused === index;
						return /* @__PURE__ */ jsxs("div", {
							style: {
								padding: "10px 12px",
								background: isFocused ? "var(--openloop-selection)" : "var(--openloop-surface-muted)",
								borderLeft: "1px solid var(--openloop-border)"
							},
							children: [/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: 13,
									lineHeight: 1.4,
									fontWeight: 650,
									color: isFocused ? "var(--openloop-selection-foreground)" : "var(--openloop-foreground)"
								},
								children: column.title
							}), column.subtitle !== void 0 ? /* @__PURE__ */ jsx("div", {
								style: {
									...micro,
									marginTop: 2
								},
								children: column.subtitle
							}) : null]
						}, column.id);
					}),
					rows.flatMap((row, rowIndex) => [/* @__PURE__ */ jsx("div", {
						style: {
							...cellBaseStyle,
							fontSize: 12,
							lineHeight: 1.5,
							color: "var(--openloop-muted-foreground)",
							fontWeight: row.emphasis === "strong" ? 650 : 500
						},
						children: row.label
					}, `label-${rowIndex}`), ...row.values.map((value, columnIndex) => /* @__PURE__ */ jsx("div", {
						style: {
							...cellBaseStyle,
							borderLeft: "1px solid var(--openloop-border)",
							background: focused === columnIndex ? "var(--openloop-selection)" : void 0,
							fontSize: 13,
							lineHeight: 1.5,
							fontWeight: row.emphasis === "strong" ? 650 : 450,
							color: focused === columnIndex ? "var(--openloop-selection-foreground)" : "var(--openloop-foreground)"
						},
						children: value
					}, `${rowIndex}-${columnIndex}`))])
				]
			})]
		})]
	});
}
//#endregion
//#region src/presets/comparison/index.ts
const comparisonPreset = {
	kind: "comparison",
	schema: comparisonSchema,
	validate: validateComparison,
	Render: ComparisonRender
};
//#endregion
//#region src/presets/data-table/schema.ts
/**
* data-table props JSON Schema。
* 约束：columns 1–12（key 必填）；rows 0–200；density comfortable/compact；
* 数字列（align: right 或 format 数值类）右对齐 + tabular-nums；行 tone 整行淡底。
*/
const dataTableSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: true,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "可选的表格标题，≤80 字符"
		},
		columns: {
			type: "array",
			minItems: 1,
			maxItems: 12,
			description: "列定义，1–12 列",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					key: {
						type: "string",
						minLength: 1,
						maxLength: 40,
						description: "行数据中取值字段名"
					},
					label: {
						type: "string",
						maxLength: 80,
						description: "列头文案，缺省用 key"
					},
					align: {
						enum: ["left", "right"],
						description: "列对齐；right 视为数字列（右对齐 + 等宽数字）"
					},
					format: {
						enum: [
							"currency-cny",
							"number",
							"percent",
							"text"
						],
						description: "数字格式化；number/percent/currency-cny 视为数字列"
					}
				},
				required: ["key"]
			}
		},
		rows: {
			type: "array",
			maxItems: 200,
			description: "行数据，每行一个对象；行内 tone 字段（success/error/warning）令整行淡底",
			items: { type: "object" }
		},
		density: {
			enum: ["comfortable", "compact"],
			description: "行密度，默认 comfortable"
		}
	}
};
//#endregion
//#region src/presets/data-table/validate.ts
/**
* data-table 校验（fail-closed）。
* - columns 必填数组 1–12，每列 key 为 1–40 字符非空字符串
* - rows 数组 0–200，每行必须是对象；行内 tone 限 success/error/warning
* - density / align / format 均为枚举
*/
const ALIGNS$3 = ["left", "right"];
const DENSITIES = ["comfortable", "compact"];
const ROW_TONES = [
	"success",
	"error",
	"warning"
];
const MAX_ROWS = 200;
const MAX_COLUMNS = 12;
function validateDataTable(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "data-table props 必须是 JSON 对象")]);
	const errors = [];
	if (root.title !== void 0 && (typeof root.title !== "string" || root.title.length > 80)) errors.push(error("title", "title 必须是 ≤80 字符的字符串"));
	if (root.density !== void 0 && !DENSITIES.includes(String(root.density))) errors.push(error("density", "density 必须是 comfortable / compact 之一"));
	if (root.columns !== void 0) {
		if (!Array.isArray(root.columns)) {
			errors.push(error("columns", "columns 必须是 1–12 项的数组"));
			return validationFail(errors);
		}
		if (root.columns.length < 1 || root.columns.length > MAX_COLUMNS) errors.push(error("columns", `columns 数量必须为 1–${MAX_COLUMNS}，当前 ${root.columns.length}`));
		root.columns.forEach((raw, index) => {
			const path = `columns[${index}]`;
			const column = asRecord(raw);
			if (!column) {
				errors.push(error(path, "每一项必须是 JSON 对象"));
				return;
			}
			if (!isNonEmptyString(column.key)) errors.push(error(`${path}.key`, "key 必填，必须是非空字符串（1–40 字符）"));
			else if (column.key.length > 40) errors.push(error(`${path}.key`, `key 长度不得超过 40 字符，当前 ${column.key.length}`));
			if (column.label !== void 0 && typeof column.label !== "string") errors.push(error(`${path}.label`, "label 必须是字符串"));
			if (column.align !== void 0 && !ALIGNS$3.includes(String(column.align))) errors.push(error(`${path}.align`, "align 必须是 left / right 之一"));
			if (column.format !== void 0 && !isMetricFormat(column.format)) errors.push(error(`${path}.format`, "format 必须是 currency-cny / number / percent / text 之一"));
		});
	}
	if (root.rows !== void 0 && !Array.isArray(root.rows)) errors.push(error("rows", "rows 必须是数组"));
	else if (Array.isArray(root.rows) && root.rows.length > MAX_ROWS) errors.push(error("rows", `rows 数量上限 ${MAX_ROWS}，当前 ${root.rows.length}`));
	if (Array.isArray(root.rows)) root.rows.forEach((raw, index) => {
		const path = `rows[${index}]`;
		const row = asRecord(raw);
		if (!row) {
			errors.push(error(path, "每一行必须是 JSON 对象"));
			return;
		}
		if (row.tone !== void 0 && !ROW_TONES.includes(String(row.tone))) errors.push(error(`${path}.tone`, "行 tone 必须是 success / error / warning 之一"));
	});
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/data-table/Render.tsx
const ROW_TONE_BG = {
	success: "var(--openloop-success-background)",
	error: "var(--openloop-error-background)",
	warning: "var(--openloop-warning-background)"
};
const containerStyle$4 = {
	...panel,
	overflow: "hidden",
	minWidth: 0
};
const scrollStyle$3 = { overflowX: "auto" };
const tableStyle$6 = {
	width: "100%",
	minWidth: 480,
	borderCollapse: "collapse"
};
const headerCellStyle = {
	padding: "9px 12px",
	fontSize: 12,
	fontWeight: 600,
	lineHeight: 1.4,
	color: "var(--openloop-muted-foreground)",
	background: "var(--openloop-surface-muted)",
	textAlign: "left",
	whiteSpace: "nowrap"
};
const headerCellNumericStyle = {
	...headerCellStyle,
	...numeric,
	textAlign: "right"
};
const cellStyle$2 = {
	padding: "9px 12px",
	fontSize: 12,
	lineHeight: 1.5,
	color: "var(--openloop-foreground)",
	textAlign: "left",
	wordBreak: "break-word",
	verticalAlign: "top"
};
const cellNumericStyle = {
	...cellStyle$2,
	...numeric,
	textAlign: "right",
	whiteSpace: "nowrap"
};
function isNumericFormat(format) {
	return typeof format === "string" && (format === "number" || format === "percent" || format === "currency-cny");
}
/** 单元格展示文本：数字列按 format 走 Intl；原始值按基础类型 text 化；对象 JSON 序列化 */
function cellText$1(value, format) {
	if (value === null || value === void 0) return "";
	if (isFiniteNumber(value) && isNumericFormat(format)) return formatValue(value, format);
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}
/** 契约自有键（孤儿字段判定用：数据浅合并塞进来的 API 字段不算契约键） */
const OWN_KEYS = /* @__PURE__ */ new Set([
	"title",
	"columns",
	"rows",
	"density"
]);
/**
* 数据驱动模式（reshape，2026-08-23）：columns 缺省时，把数据绑定浅合并进 props 的
* 孤儿扁平字段（如 GitHub repo API 的 stargazers_count/forks_count…）自适应为
* Field/Value 两列表。嵌套值取 JSON 摘要（≤60 字符）；字段上限 24 + 溢出行数提示。
*/
function autoFieldRows(root) {
	const entries = Object.entries(root).filter(([key]) => !OWN_KEYS.has(key));
	if (entries.length === 0) return void 0;
	const rows = entries.slice(0, 24).map(([key, value]) => {
		return {
			field: key,
			value: typeof value === "object" && value !== null ? JSON.stringify(value).slice(0, 60) : String(value)
		};
	});
	return {
		columns: [{
			key: "field",
			label: "字段",
			align: "left",
			format: void 0,
			numeric: false
		}, {
			key: "value",
			label: "值",
			align: "left",
			format: void 0,
			numeric: false
		}],
		...entries.length > 24 ? { rows: [...rows, {
			field: "…",
			value: `(+${entries.length - 24} more fields)`
		}] } : { rows }
	};
}
function DataTableRender({ props }) {
	const root = asRecord(props) ?? {};
	const panelTitle = typeof root.title === "string" ? root.title : void 0;
	const density = root.density === "compact" ? "compact" : "comfortable";
	const padY = density === "compact" ? 6 : 9;
	const columns = (Array.isArray(root.columns) ? root.columns : []).slice(0, 12).map((raw, index) => {
		const column = asRecord(raw) ?? {};
		const key = typeof column.key === "string" ? column.key : `column-${index}`;
		const align = column.align === "right" ? "right" : "left";
		const format = column.format;
		return {
			key,
			label: typeof column.label === "string" ? column.label : void 0,
			align,
			format,
			numeric: align === "right" || isNumericFormat(format)
		};
	});
	const auto = columns.length === 0 ? autoFieldRows(root) : void 0;
	const effectiveColumns = auto ? auto.columns : columns;
	const rows = auto ? auto.rows : (Array.isArray(root.rows) ? root.rows : []).slice(0, 200).map((raw) => asRecord(raw) ?? {});
	const headerPadding = {
		paddingTop: padY,
		paddingBottom: padY
	};
	const bodyPadding = {
		paddingTop: padY,
		paddingBottom: padY
	};
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "data-table",
		"data-openloop-density": density,
		style: containerStyle$4,
		children: [panelTitle !== void 0 ? /* @__PURE__ */ jsx("div", {
			style: {
				...title,
				...headerPadding,
				paddingLeft: 12,
				paddingRight: 12,
				borderBottom: "1px solid var(--openloop-border)"
			},
			children: panelTitle
		}) : null, /* @__PURE__ */ jsx("div", {
			style: scrollStyle$3,
			children: /* @__PURE__ */ jsxs("table", {
				style: tableStyle$6,
				children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { children: effectiveColumns.map((column) => /* @__PURE__ */ jsx("th", {
					scope: "col",
					"data-openloop-column": column.key,
					style: {
						...column.numeric ? headerCellNumericStyle : headerCellStyle,
						...headerPadding
					},
					children: column.label ?? column.key
				}, column.key)) }) }), /* @__PURE__ */ jsxs("tbody", { children: [rows.map((row, rowIndex) => {
					const tone = row.tone === "success" || row.tone === "error" || row.tone === "warning" ? row.tone : void 0;
					return /* @__PURE__ */ jsx("tr", {
						style: {
							borderTop: "1px solid var(--openloop-border)",
							...tone ? { background: ROW_TONE_BG[tone] } : {}
						},
						"data-openloop-row-tone": tone ?? "none",
						children: effectiveColumns.map((column) => /* @__PURE__ */ jsx("td", {
							style: {
								...column.numeric ? cellNumericStyle : cellStyle$2,
								...bodyPadding
							},
							children: cellText$1(row[column.key], column.format)
						}, column.key))
					}, String(row.id ?? rowIndex));
				}), rows.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
					colSpan: Math.max(1, columns.length),
					style: {
						...meta,
						padding: "24px 12px",
						textAlign: "center"
					},
					children: "暂无数据"
				}) }) : null] })]
			})
		})]
	});
}
//#endregion
//#region src/presets/data-table/index.ts
const dataTablePreset = {
	kind: "data-table",
	schema: dataTableSchema,
	validate: validateDataTable,
	Render: DataTableRender
};
//#endregion
//#region src/presets/db-browser/schema.ts
/**
* db-browser props JSON Schema。
* collection 初始表（可省略 = 第一个表）；perPage 5–100 默认 20；title ≤80；
* browserId 浏览态持久化键（0.5.1：多张浏览卡各自记住位置——UI 态 localStorage）。
*/
const dbBrowserSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "面板标题，≤80 字符，可省略（默认「数据库浏览」）"
		},
		collection: {
			type: "string",
			maxLength: 40,
			description: "初始打开的集合名（apps / components / apis / boards / tiles / meta），可省略"
		},
		perPage: {
			type: "integer",
			minimum: 5,
			maximum: 100,
			description: "每页行数 5–100，默认 20"
		},
		browserId: {
			type: "string",
			maxLength: 40,
			description: "浏览态持久化标识（多张浏览卡各自记住「表 + 搜索词」，刷新/重启不丢；缺省共享 default 槽位）"
		}
	}
};
//#endregion
//#region src/presets/db-browser/validate.ts
/**
* db-browser 校验（fail-closed）：共享 title 规则 + collection ≤40 + perPage 5–100。
*/
function validateDbBrowser(props) {
	const base = validateLocalPresetProps("db-browser", props);
	if (!base.ok) return base;
	const root = asRecord(props);
	if (root === null) return validationFail([error("$", "db-browser props 必须是 JSON 对象")]);
	const errors = [];
	if (root.collection !== void 0 && (typeof root.collection !== "string" || root.collection.length > 40)) errors.push(error("collection", "collection 必须是 ≤40 字符的字符串"));
	if (root.browserId !== void 0 && (typeof root.browserId !== "string" || root.browserId.length > 40)) errors.push(error("browserId", "browserId 必须是 ≤40 字符的字符串"));
	if (root.perPage !== void 0) {
		const v = root.perPage;
		if (typeof v !== "number" || !Number.isInteger(v) || v < 5 || v > 100) errors.push(error("perPage", "perPage 必须是 5–100 的整数"));
	}
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/db-browser/Render.tsx
/**
* db-browser 渲染器：本地后端数据库浏览（筛选 + 选库 + 分页）。
* - 数据通道：GET /openloop/app/collections（下拉）/ GET /openloop/app/collections/:name/records
* - 交互态：集合下拉（含记录数）、关键词输入（Enter 提交）、上一页/下一页
* - 列 = 首行键序（≤8 列，id 恒显；超长单元格截断，对象/数组 JSON 摘要）
* 样式 100% var(--openloop-*)。
*/
const headerStyle$7 = {
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 8,
	padding: "10px 14px",
	borderBottom: "1px solid var(--openloop-border)"
};
const controlsStyle = {
	display: "flex",
	alignItems: "center",
	gap: 8,
	flexWrap: "wrap",
	padding: "10px 14px"
};
const selectStyle = {
	padding: "4px 8px",
	fontSize: 12,
	borderRadius: "var(--openloop-radius-md)",
	border: "1px solid var(--openloop-border)",
	background: "var(--openloop-surface)",
	color: "var(--openloop-foreground)",
	fontFamily: "inherit"
};
const inputStyle = {
	...selectStyle,
	flex: 1,
	minWidth: 120
};
const buttonStyle = {
	padding: "4px 10px",
	fontSize: 12,
	borderRadius: "var(--openloop-radius-md)",
	border: "1px solid var(--openloop-border)",
	background: "var(--openloop-surface-muted)",
	color: "var(--openloop-foreground)",
	cursor: "pointer",
	fontFamily: "inherit"
};
const scrollStyle$2 = { overflowX: "auto" };
const tableStyle$5 = {
	width: "100%",
	borderCollapse: "collapse",
	fontSize: 11.5
};
const thStyle$1 = {
	padding: "7px 10px",
	color: "var(--openloop-muted-foreground)",
	fontWeight: 600,
	textAlign: "left",
	whiteSpace: "nowrap",
	borderBottom: "1px solid var(--openloop-border)",
	background: "var(--openloop-surface-muted)"
};
const tdStyle$3 = {
	padding: "6px 10px",
	color: "var(--openloop-foreground)",
	borderBottom: "1px solid var(--openloop-border)",
	verticalAlign: "top",
	wordBreak: "break-word",
	maxWidth: 260,
	fontFamily: "var(--openloop-font-mono, ui-monospace, \"SF Mono\", Menlo, monospace)"
};
const footerStyle = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 8,
	padding: "8px 14px"
};
const placeholderStyle$5 = {
	padding: "22px 14px",
	textAlign: "center",
	color: "var(--openloop-muted-foreground)",
	fontSize: 12,
	lineHeight: 1.7
};
function cellText(value) {
	if (value === null || value === void 0) return "—";
	if (typeof value === "string") return truncate(value, 80);
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return truncate(JSON.stringify(value), 80);
}
function DbBrowserRender({ props }) {
	const record = asRecord(props) ?? {};
	const perPageProp = typeof record.perPage === "number" ? Math.min(100, Math.max(5, Math.round(record.perPage))) : 20;
	const collectionProp = typeof record.collection === "string" && record.collection.length > 0 ? record.collection : null;
	const headerTitle = typeof record.title === "string" && record.title.length > 0 ? record.title : "数据库浏览";
	const collectionsState = useAppEndpoint("/openloop/app/collections");
	const collections = (collectionsState.data?.collections ?? []).filter((c) => typeof c.name === "string" && typeof c.count === "number");
	const browserKey = `openloop.dock.db-browser.${typeof record.browserId === "string" && record.browserId.length > 0 ? record.browserId : "default"}`;
	const readBrowserState = () => {
		try {
			const raw = localStorage.getItem(browserKey);
			if (raw === null) return {
				collection: collectionProp,
				query: ""
			};
			const p = JSON.parse(raw);
			return {
				collection: typeof p.collection === "string" ? p.collection : collectionProp,
				query: typeof p.query === "string" ? p.query : ""
			};
		} catch {
			return {
				collection: collectionProp,
				query: ""
			};
		}
	};
	const [browserState, setBrowserState] = useState(readBrowserState);
	const collection = browserState.collection;
	const query = browserState.query;
	const [queryInput, setQueryInput] = useState(query);
	const [page, setPage] = useState(1);
	const persistBrowserState = (next) => {
		setBrowserState(next);
		try {
			localStorage.setItem(browserKey, JSON.stringify(next));
		} catch {}
	};
	useEffect(() => {
		if (collection === null && collections.length > 0) persistBrowserState({
			collection: collections[0]?.name ?? null,
			query
		});
	}, [collection, collections]);
	useEffect(() => {
		setPage(1);
	}, [collection, query]);
	const recordsState = useAppEndpoint(collection !== null ? `/openloop/app/collections/${encodeURIComponent(collection)}/records?page=${page}&perPage=${perPageProp}${query !== "" ? `&q=${encodeURIComponent(query)}` : ""}` : null);
	const items = Array.isArray(recordsState.data?.items) ? recordsState.data.items : [];
	const columnKeys = items.length > 0 ? Object.keys(items[0] ?? {}).filter((k) => k !== "id").slice(0, 7) : [];
	const totalItems = typeof recordsState.data?.totalItems === "number" ? recordsState.data.totalItems : 0;
	const totalPages = typeof recordsState.data?.totalPages === "number" ? recordsState.data.totalPages : 1;
	const currentPage = typeof recordsState.data?.page === "number" ? recordsState.data.page : page;
	const onSearchKeyDown = (e) => {
		if (e.key === "Enter") persistBrowserState({
			collection,
			query: e.currentTarget.value.trim()
		});
	};
	const unavailable = collectionsState.unavailable;
	const error = collectionsState.error ?? recordsState.error;
	return /* @__PURE__ */ jsxs("div", {
		style: panel,
		"data-openloop-preset": "db-browser",
		children: [/* @__PURE__ */ jsxs("div", {
			style: headerStyle$7,
			children: [/* @__PURE__ */ jsx("span", {
				style: title,
				children: headerTitle
			}), /* @__PURE__ */ jsx("span", {
				style: meta,
				children: totalItems > 0 ? `${totalItems.toLocaleString()} 条记录` : ""
			})]
		}), unavailable ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$5,
			children: [
				"本地应用后端未启用",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "安装并激活 @openloop/dsh-app 插件后可浏览数据库"
				})
			]
		}) : error !== void 0 ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$5,
			children: ["数据读取失败：", error]
		}) : /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsxs("div", {
				style: controlsStyle,
				children: [
					/* @__PURE__ */ jsx("select", {
						style: selectStyle,
						value: collection ?? "",
						"aria-label": "选择集合",
						onChange: (e) => persistBrowserState({
							collection: e.target.value,
							query
						}),
						children: collections.map((c) => /* @__PURE__ */ jsxs("option", {
							value: c.name,
							children: [
								c.name,
								"（",
								c.count,
								"）"
							]
						}, c.name))
					}),
					/* @__PURE__ */ jsx("input", {
						style: inputStyle,
						placeholder: "关键词筛选（Enter 应用）",
						"aria-label": "关键词筛选",
						value: queryInput,
						onChange: (e) => setQueryInput(e.target.value),
						onKeyDown: onSearchKeyDown
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						style: buttonStyle,
						onClick: () => persistBrowserState({
							collection,
							query: queryInput.trim()
						}),
						children: "查询"
					}),
					query !== "" ? /* @__PURE__ */ jsx("button", {
						type: "button",
						style: buttonStyle,
						title: "清除关键词",
						onClick: () => {
							setQueryInput("");
							persistBrowserState({
								collection,
								query: ""
							});
						},
						children: "✕"
					}) : null
				]
			}),
			/* @__PURE__ */ jsx("div", {
				style: scrollStyle$2,
				children: items.length === 0 ? /* @__PURE__ */ jsx("div", {
					style: placeholderStyle$5,
					children: recordsState.loading ? "读取中…" : "无匹配记录"
				}) : /* @__PURE__ */ jsxs("table", {
					style: tableStyle$5,
					children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("th", {
						style: thStyle$1,
						children: "id"
					}), columnKeys.map((key) => /* @__PURE__ */ jsx("th", {
						style: thStyle$1,
						children: key
					}, key))] }) }), /* @__PURE__ */ jsx("tbody", { children: items.map((row, index) => /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("td", {
						style: {
							...tdStyle$3,
							color: "var(--openloop-muted-foreground)"
						},
						children: truncate(String(row.id ?? ""), 14)
					}), columnKeys.map((key) => /* @__PURE__ */ jsx("td", {
						style: tdStyle$3,
						children: cellText(row[key])
					}, key))] }, String(row.id ?? index))) })]
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				style: footerStyle,
				children: [/* @__PURE__ */ jsxs("span", {
					style: meta,
					children: [
						"第 ",
						currentPage,
						" / ",
						Math.max(1, totalPages),
						" 页"
					]
				}), /* @__PURE__ */ jsxs("span", {
					style: {
						display: "flex",
						gap: 6
					},
					children: [/* @__PURE__ */ jsx("button", {
						type: "button",
						style: buttonStyle,
						disabled: currentPage <= 1,
						onClick: () => setPage(currentPage - 1),
						children: "上一页"
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						style: buttonStyle,
						disabled: currentPage >= totalPages,
						onClick: () => setPage(currentPage + 1),
						children: "下一页"
					})]
				})]
			})
		] })]
	});
}
//#endregion
//#region src/presets/db-browser/index.ts
const dbBrowserPreset = {
	kind: "db-browser",
	schema: dbBrowserSchema,
	validate: validateDbBrowser,
	Render: DbBrowserRender
};
//#endregion
//#region src/presets/divider/schema.ts
/**
* divider props JSON Schema。
* label 可选 ≤80 字符；带 label 时渲染为左右横线 + 居中标签的「分隔标题」。
*/
const dividerSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: { label: {
		type: "string",
		minLength: 1,
		maxLength: 80,
		description: "可选的居中分隔标签（≤80 字符）；省略渲染为纯横线"
	} }
};
//#endregion
//#region src/presets/divider/validate.ts
/**
* divider 校验（fail-closed）：label 可选 1–80 字符。
*/
function validateDivider(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "divider props 必须是 JSON 对象")]);
	if (root.label !== void 0) {
		if (typeof root.label !== "string" || root.label.length < 1) return validationFail([error("label", "label 必须是非空字符串（1–80 字符）")]);
		if (root.label.length > 80) return validationFail([error("label", `label 长度不得超过 80 字符，当前 ${root.label.length}`)]);
	}
	return validationOk();
}
//#endregion
//#region src/presets/divider/Render.tsx
const lineStyle = {
	display: "flex",
	alignItems: "center",
	gap: 10,
	margin: "6px 0"
};
const rule = {
	flex: 1,
	height: 1,
	background: "var(--openloop-border)"
};
const labelStyle$4 = {
	fontSize: "var(--openloop-type-micro, 11px)",
	fontWeight: 600,
	color: "var(--openloop-muted-foreground)",
	whiteSpace: "nowrap"
};
function DividerRender({ props }) {
	const root = asRecord(props) ?? {};
	const label = typeof root.label === "string" && root.label.length > 0 ? root.label : void 0;
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "divider",
		"data-openloop-has-label": label ? "true" : "false",
		style: lineStyle,
		role: "separator",
		"aria-orientation": "horizontal",
		children: [
			/* @__PURE__ */ jsx("span", { style: rule }),
			label !== void 0 ? /* @__PURE__ */ jsx("span", {
				style: labelStyle$4,
				children: label
			}) : null,
			label !== void 0 ? /* @__PURE__ */ jsx("span", { style: rule }) : null
		]
	});
}
//#endregion
//#region src/presets/divider/index.ts
const dividerPreset = {
	kind: "divider",
	schema: dividerSchema,
	validate: validateDivider,
	Render: DividerRender
};
//#endregion
//#region src/presets/flow/schema.ts
/**
* flow props JSON Schema。
* 移植自 declarative document.ts FlowDocument：nodes 2–12 + edges 1–20 +
* 禁自环 + 边必须引用已知节点（后两条在 validate 中强制）。
* tone 枚举对齐 panels token 三件套（declarative 的 danger 归一为 error）。
*/
const flowSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 120,
			description: "流程标题，≤120 字符，可省略"
		},
		description: {
			type: "string",
			maxLength: 360,
			description: "一句话说明该流程，≤360 字符，可省略"
		},
		nodes: {
			type: "array",
			minItems: 2,
			maxItems: 12,
			description: "流程节点，2–12 个，按顺序自上而下渲染，id 必须唯一",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						type: "string",
						minLength: 1,
						maxLength: 40,
						description: "节点 id，非空且全局唯一，edges 通过它引用"
					},
					label: {
						type: "string",
						minLength: 1,
						maxLength: 80,
						description: "节点标题，1–80 字符"
					},
					detail: {
						type: "string",
						maxLength: 240,
						description: "节点补充说明，≤240 字符，可省略"
					},
					tone: {
						enum: [
							"neutral",
							"info",
							"success",
							"warning",
							"error",
							"danger"
						],
						description: "节点语气色，默认首节点 info、其余 neutral（danger 为 declarative 兼容别名，等同 error）"
					}
				},
				required: ["id", "label"]
			}
		},
		edges: {
			type: "array",
			minItems: 1,
			maxItems: 20,
			description: "有向边，1–20 条；from/to 必须引用已知节点 id，禁止自环",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					from: {
						type: "string",
						minLength: 1,
						description: "起始节点 id"
					},
					to: {
						type: "string",
						minLength: 1,
						description: "目标节点 id，不得与 from 相同"
					},
					label: {
						type: "string",
						maxLength: 60,
						description: "边上文字（如条件），≤60 字符，可省略"
					}
				},
				required: ["from", "to"]
			}
		}
	},
	required: ["nodes", "edges"]
};
//#endregion
//#region src/presets/flow/validate.ts
/**
* flow 校验（fail-closed）。
* 移植自 declarative document.ts validateFlow：
* - nodes 2–12，id 唯一非空，label 必填 1–80 字符
* - edges 1–20，from/to 必须引用已知节点，禁止自环
* 错误消息面向 Agent 可自修正（指明路径与取值范围）。
*/
const TONES$3 = [
	"neutral",
	"info",
	"success",
	"warning",
	"error",
	"danger"
];
function validateFlow(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "flow props 必须是 JSON 对象")]);
	const errors = [];
	if (root.title !== void 0 && (typeof root.title !== "string" || root.title.length > 120)) errors.push(error("title", "title 必须是 ≤120 字符的字符串"));
	if (root.description !== void 0 && (typeof root.description !== "string" || root.description.length > 360)) errors.push(error("description", "description 必须是 ≤360 字符的字符串"));
	if (!Array.isArray(root.nodes)) {
		errors.push(error("nodes", "nodes 必填，必须是 2–12 个节点的数组"));
		return validationFail(errors);
	}
	if (root.nodes.length < 2 || root.nodes.length > 12) errors.push(error("nodes", `nodes 数量必须为 2–12，当前 ${root.nodes.length}`));
	const nodeIds = /* @__PURE__ */ new Set();
	root.nodes.forEach((raw, index) => {
		const path = `nodes[${index}]`;
		const node = asRecord(raw);
		if (!node) {
			errors.push(error(path, "每个节点必须是 JSON 对象"));
			return;
		}
		if (!isNonEmptyString(node.id)) errors.push(error(`${path}.id`, "id 必填，必须是非空字符串"));
		else if (nodeIds.has(node.id)) errors.push(error(`${path}.id`, `节点 id "${node.id}" 重复，nodes 内 id 必须唯一`));
		else nodeIds.add(node.id);
		if (!isNonEmptyString(node.label)) errors.push(error(`${path}.label`, "label 必填，必须是非空字符串（1–80 字符）"));
		else if (node.label.length > 80) errors.push(error(`${path}.label`, `label 长度不得超过 80 字符，当前 ${node.label.length}`));
		if (node.detail !== void 0 && (typeof node.detail !== "string" || node.detail.length > 240)) errors.push(error(`${path}.detail`, "detail 必须是 ≤240 字符的字符串"));
		if (node.tone !== void 0 && !TONES$3.includes(String(node.tone))) errors.push(error(`${path}.tone`, "tone 必须是 neutral / info / success / warning / error / danger 之一（danger 等同 error）"));
	});
	if (!Array.isArray(root.edges)) {
		errors.push(error("edges", "edges 必填，必须是 1–20 条边的数组"));
		return validationFail(errors);
	}
	if (root.edges.length < 1 || root.edges.length > 20) errors.push(error("edges", `edges 数量必须为 1–20，当前 ${root.edges.length}`));
	root.edges.forEach((raw, index) => {
		const path = `edges[${index}]`;
		const edge = asRecord(raw);
		if (!edge) {
			errors.push(error(path, "每条边必须是 JSON 对象"));
			return;
		}
		const fromOk = isNonEmptyString(edge.from);
		const toOk = isNonEmptyString(edge.to);
		if (!fromOk) errors.push(error(`${path}.from`, "from 必填，必须是已知节点 id"));
		if (!toOk) errors.push(error(`${path}.to`, "to 必填，必须是已知节点 id"));
		if (fromOk && toOk) {
			if (!nodeIds.has(edge.from)) errors.push(error(`${path}.from`, `from 引用了未知节点 "${edge.from}"，必须是 nodes 中的 id`));
			if (!nodeIds.has(edge.to)) errors.push(error(`${path}.to`, `to 引用了未知节点 "${edge.to}"，必须是 nodes 中的 id`));
			if (edge.from === edge.to) errors.push(error(path, `禁止自环：边 "${edge.from}" 不能指向自身`));
		}
		if (edge.label !== void 0 && (typeof edge.label !== "string" || edge.label.length > 60)) errors.push(error(`${path}.label`, "label 必须是 ≤60 字符的字符串"));
	});
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/flow/Render.tsx
const headerStyle$6 = {
	padding: "10px 12px",
	borderBottom: "1px solid var(--openloop-border)"
};
const bodyStyle = {
	padding: 14,
	display: "grid",
	gap: 8
};
const connectorStyle = {
	minHeight: 22,
	marginLeft: 20,
	borderLeft: "1px solid var(--openloop-border)",
	paddingLeft: 15,
	color: "var(--openloop-muted-foreground)",
	display: "flex",
	alignItems: "center"
};
const nodeCardStyle = {
	display: "grid",
	gridTemplateColumns: "30px minmax(0, 1fr)",
	gap: 10,
	alignItems: "start",
	border: "1px solid var(--openloop-border)",
	borderRadius: "var(--openloop-radius-md)",
	padding: "10px 12px"
};
const badgeStyle = {
	width: 26,
	height: 26,
	borderRadius: 999,
	display: "grid",
	placeItems: "center",
	fontSize: 12,
	fontWeight: 700,
	fontVariantNumeric: "tabular-nums",
	flexShrink: 0
};
const nodeLabelStyle = {
	fontSize: 13,
	fontWeight: 620,
	lineHeight: 1.35,
	color: "var(--openloop-foreground)",
	wordBreak: "break-word"
};
function FlowRender({ props }) {
	const root = asRecord(props) ?? {};
	const panelTitle = typeof root.title === "string" ? root.title : void 0;
	const description = typeof root.description === "string" ? root.description : void 0;
	const nodes = (Array.isArray(root.nodes) ? root.nodes : []).slice(0, 12).map((raw, index) => {
		const node = asRecord(raw) ?? {};
		return {
			id: isNonEmptyString(node.id) ? node.id : `node-${index}`,
			label: typeof node.label === "string" ? node.label : `节点 ${index + 1}`,
			detail: typeof node.detail === "string" ? node.detail : void 0,
			tone: node.tone === "danger" ? "error" : node.tone === "neutral" || node.tone === "info" || node.tone === "success" || node.tone === "warning" || node.tone === "error" ? node.tone : void 0
		};
	});
	const edges = (Array.isArray(root.edges) ? root.edges : []).slice(0, 20).map((raw) => {
		const edge = asRecord(raw) ?? {};
		return {
			from: typeof edge.from === "string" ? edge.from : "",
			to: typeof edge.to === "string" ? edge.to : "",
			label: typeof edge.label === "string" ? edge.label : void 0
		};
	}).filter((edge) => edge.from.length > 0 && edge.to.length > 0);
	const incoming = /* @__PURE__ */ new Map();
	for (const node of nodes) incoming.set(node.id, edges.filter((edge) => edge.to === node.id));
	if (nodes.length === 0) return /* @__PURE__ */ jsx("div", {
		"data-openloop-preset": "flow",
		"data-openloop-count": "0",
		style: {
			...panel,
			padding: "12px 14px"
		},
		children: /* @__PURE__ */ jsx("div", {
			style: meta,
			children: "暂无流程数据"
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "flow",
		"data-openloop-count": String(nodes.length),
		style: {
			...panel,
			overflow: "hidden",
			padding: 0
		},
		children: [panelTitle !== void 0 || description !== void 0 ? /* @__PURE__ */ jsxs("div", {
			style: headerStyle$6,
			children: [panelTitle !== void 0 ? /* @__PURE__ */ jsx("div", {
				style: title,
				children: panelTitle
			}) : null, description !== void 0 ? /* @__PURE__ */ jsx("div", {
				style: {
					...meta,
					marginTop: 3
				},
				children: description
			}) : null]
		}) : null, /* @__PURE__ */ jsx("div", {
			style: bodyStyle,
			children: nodes.map((node, index) => {
				const tone = toneColors(node.tone ?? (index === 0 ? "info" : "neutral"));
				const incomingEdges = incoming.get(node.id) ?? [];
				const connectorText = incomingEdges.map((edge) => edge.label).filter((label) => typeof label === "string" && label.length > 0).join(" · ");
				return /* @__PURE__ */ jsxs("div", { children: [incomingEdges.length > 0 ? /* @__PURE__ */ jsx("div", {
					style: {
						...connectorStyle,
						...micro
					},
					children: connectorText || "↓"
				}) : null, /* @__PURE__ */ jsxs("div", {
					style: {
						...nodeCardStyle,
						background: tone.background,
						borderColor: tone.border
					},
					children: [/* @__PURE__ */ jsx("div", {
						style: {
							...badgeStyle,
							background: tone.background,
							color: tone.foreground,
							border: `1px solid ${tone.border}`
						},
						"aria-hidden": "true",
						children: index + 1
					}), /* @__PURE__ */ jsxs("div", {
						style: { minWidth: 0 },
						children: [/* @__PURE__ */ jsx("div", {
							style: nodeLabelStyle,
							children: node.label
						}), node.detail !== void 0 ? /* @__PURE__ */ jsx("div", {
							style: {
								...meta,
								marginTop: 4
							},
							children: node.detail
						}) : null]
					})]
				})] }, node.id);
			})
		})]
	});
}
//#endregion
//#region src/presets/flow/index.ts
const flowPreset = {
	kind: "flow",
	schema: flowSchema,
	validate: validateFlow,
	Render: FlowRender
};
//#endregion
//#region src/presets/funnel/schema.ts
/**
* funnel props JSON Schema。
* stages 必填 2–8 段，每段 {label ≤40, value 有限数字, detail ≤40}；
* 段宽按 value / 最大值比例；chart-seq 渐层着色。
*/
const funnelSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "可选的漏斗标题，≤80 字符"
		},
		stages: {
			type: "array",
			minItems: 2,
			maxItems: 8,
			description: "漏斗阶段，2–8 段",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					label: {
						type: "string",
						minLength: 1,
						maxLength: 40,
						description: "阶段名，≤40 字符"
					},
					value: {
						type: "number",
						description: "阶段数值（参与段宽比例计算）"
					},
					detail: {
						type: "string",
						maxLength: 40,
						description: "阶段附加说明，≤40 字符"
					}
				},
				required: ["label", "value"]
			}
		}
	},
	required: ["stages"]
};
//#endregion
//#region src/presets/funnel/validate.ts
/**
* funnel 校验（fail-closed）。
* - stages 必填数组 2–8 项；每项 label 非空 ≤40、value 有限数字、detail ≤40
*/
const MAX_STAGES = 8;
const MIN_STAGES = 2;
const MAX_LABEL$1 = 40;
function validateFunnel(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "funnel props 必须是 JSON 对象")]);
	const errors = [];
	if (root.title !== void 0 && (typeof root.title !== "string" || root.title.length > 80)) errors.push(error("title", "title 必须是 ≤80 字符的字符串"));
	if (!Array.isArray(root.stages)) {
		errors.push(error("stages", "stages 必填，必须是 2–8 项的数组"));
		return validationFail(errors);
	}
	if (root.stages.length < MIN_STAGES || root.stages.length > MAX_STAGES) errors.push(error("stages", `stages 数量必须为 ${MIN_STAGES}–${MAX_STAGES}，当前 ${root.stages.length}`));
	root.stages.forEach((raw, index) => {
		const path = `stages[${index}]`;
		const stage = asRecord(raw);
		if (!stage) {
			errors.push(error(path, "stages 每一项必须是 JSON 对象"));
			return;
		}
		if (!isNonEmptyString(stage.label)) errors.push(error(`${path}.label`, "label 必填，必须是非空字符串（1–40 字符）"));
		else if (stage.label.length > MAX_LABEL$1) errors.push(error(`${path}.label`, `label 长度不得超过 ${MAX_LABEL$1} 字符，当前 ${stage.label.length}`));
		if (!isFiniteNumber(stage.value)) errors.push(error(`${path}.value`, `value 必填，必须是有限数字，当前 ${JSON.stringify(stage.value)}`));
		if (stage.detail !== void 0 && typeof stage.detail !== "string") errors.push(error(`${path}.detail`, "detail 必须是字符串"));
		else if (typeof stage.detail === "string" && stage.detail.length > MAX_LABEL$1) errors.push(error(`${path}.detail`, `detail 长度不得超过 ${MAX_LABEL$1} 字符，当前 ${stage.detail.length}`));
	});
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/funnel/Render.tsx
const containerStyle$3 = {
	...panel,
	padding: "12px 14px",
	minWidth: 0
};
const titleStyle$2 = {
	...title,
	marginBottom: 10
};
const rowStyle$1 = {
	display: "flex",
	alignItems: "center",
	gap: 8,
	minWidth: 0
};
const labelStyle$3 = {
	...meta,
	flexShrink: 0,
	width: 120,
	fontWeight: 500,
	color: "var(--openloop-foreground)",
	wordBreak: "break-word"
};
const trackStyle$1 = {
	flex: 1,
	minWidth: 0,
	height: 28,
	overflow: "hidden",
	borderRadius: "var(--openloop-radius-md)",
	background: "var(--openloop-surface-muted)"
};
const valueStyle$1 = {
	...meta,
	flexShrink: 0,
	color: "var(--openloop-foreground)",
	fontVariantNumeric: "tabular-nums"
};
/** value 比例 → chart-seq-1..5（0 最浅，1 最深） */
function seqStep$1(ratio) {
	return Math.max(1, Math.min(5, Math.ceil(Math.max(0, Math.min(1, ratio)) * 5)));
}
function FunnelRender({ props }) {
	const root = asRecord(props) ?? {};
	const panelTitle = typeof root.title === "string" ? root.title : void 0;
	const stages = (Array.isArray(root.stages) ? root.stages : []).map(asRecord).filter((entry) => entry !== null).flatMap((entry) => {
		const label = typeof entry.label === "string" && entry.label.length > 0 ? entry.label : void 0;
		const value = isFiniteNumber(entry.value) ? entry.value : void 0;
		if (!label || value === void 0) return [];
		return [{
			label,
			value,
			detail: typeof entry.detail === "string" ? entry.detail : void 0
		}];
	}).slice(0, 8);
	if (stages.length === 0) return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "funnel",
		"data-openloop-count": "0",
		style: containerStyle$3,
		children: [panelTitle !== void 0 ? /* @__PURE__ */ jsx("div", {
			style: titleStyle$2,
			children: panelTitle
		}) : null, /* @__PURE__ */ jsx("div", {
			style: meta,
			children: "暂无数据"
		})]
	});
	const maximum = Math.max(...stages.map((stage) => Math.max(0, stage.value)), 1);
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "funnel",
		"data-openloop-count": String(stages.length),
		style: containerStyle$3,
		children: [panelTitle !== void 0 ? /* @__PURE__ */ jsx("div", {
			style: titleStyle$2,
			children: panelTitle
		}) : null, /* @__PURE__ */ jsx("div", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: 8
			},
			children: stages.map((stage) => {
				const ratio = Math.max(0, stage.value) / maximum;
				const width = Math.max(10, ratio * 100);
				const fill = `var(--openloop-chart-seq-${seqStep$1(ratio)})`;
				return /* @__PURE__ */ jsxs("div", {
					style: rowStyle$1,
					children: [
						/* @__PURE__ */ jsx("span", {
							style: labelStyle$3,
							children: stage.label
						}),
						/* @__PURE__ */ jsx("div", {
							style: trackStyle$1,
							"aria-hidden": "true",
							children: /* @__PURE__ */ jsx("div", { style: {
								height: "100%",
								width: `${width}%`,
								borderRadius: "var(--openloop-radius-md)",
								background: fill
							} })
						}),
						/* @__PURE__ */ jsxs("span", {
							style: valueStyle$1,
							children: [stage.value, stage.detail !== void 0 ? ` · ${stage.detail}` : ""]
						})
					]
				}, stage.label);
			})
		})]
	});
}
//#endregion
//#region src/presets/funnel/index.ts
const funnelPreset = {
	kind: "funnel",
	schema: funnelSchema,
	validate: validateFunnel,
	Render: FunnelRender
};
//#endregion
//#region src/presets/gauge/schema.ts
/**
* gauge props JSON Schema。
* value 必填 0–100；chart-1 弧；可选 tone（success/warning/error/info）阈值色；
* label ≤40 / detail ≤80 / unit ≤8 / title ≤80。
*/
const gaugeSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "可选的仪表标题，≤80 字符"
		},
		value: {
			type: "number",
			minimum: 0,
			maximum: 100,
			description: "仪表读数，0–100（必填）"
		},
		label: {
			type: "string",
			maxLength: 40,
			description: "仪表下方主文案，≤40 字符"
		},
		detail: {
			type: "string",
			maxLength: 80,
			description: "补充说明，≤80 字符"
		},
		unit: {
			type: "string",
			maxLength: 8,
			description: "数值单位（如 %、°C），≤8 字符"
		},
		tone: {
			enum: [
				"success",
				"warning",
				"error",
				"info"
			],
			description: "可选阈值色；缺省 chart-1"
		}
	},
	required: ["value"]
};
//#endregion
//#region src/presets/gauge/validate.ts
/**
* gauge 校验（fail-closed）。
* - value 必填有限数字且 0–100
* - tone 枚举 success/warning/error/info
* - title/label/detail/unit 长度约束
*/
const TONES$2 = [
	"success",
	"warning",
	"error",
	"info"
];
function checkLength(path, value, max, name, errors) {
	if (typeof value !== "string") errors.push(error(path, `${name} 必须是字符串`));
	else if (value.length > max) errors.push(error(path, `${name} 长度不得超过 ${max} 字符，当前 ${value.length}`));
}
function validateGauge(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "gauge props 必须是 JSON 对象")]);
	const errors = [];
	if (root.title !== void 0) checkLength("title", root.title, 80, "title", errors);
	if (root.label !== void 0) checkLength("label", root.label, 40, "label", errors);
	if (root.detail !== void 0) checkLength("detail", root.detail, 80, "detail", errors);
	if (root.unit !== void 0) checkLength("unit", root.unit, 8, "unit", errors);
	if (root.tone !== void 0 && !TONES$2.includes(String(root.tone))) errors.push(error("tone", "tone 必须是 success / warning / error / info 之一"));
	if (!isFiniteNumber(root.value)) errors.push(error("value", "value 必填，必须是 0–100 的有限数字"));
	else if (root.value < 0 || root.value > 100) errors.push(error("value", `value 必须在 0–100 之间，当前 ${root.value}`));
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/gauge/Render.tsx
const containerStyle$2 = {
	...panel,
	padding: "12px 14px",
	minWidth: 0
};
const titleStyle$1 = {
	...title,
	marginBottom: 10
};
const labelStyle$2 = {
	...title,
	fontSize: 13,
	marginTop: 10,
	wordBreak: "break-word"
};
const detailStyle = {
	...meta,
	marginTop: 4,
	wordBreak: "break-word"
};
const rangeStyle = {
	...meta,
	marginTop: 8
};
function gaugeColor(tone) {
	if (tone === "success") return "var(--openloop-success)";
	if (tone === "warning") return "var(--openloop-warning)";
	if (tone === "error") return "var(--openloop-error)";
	if (tone === "info") return "var(--openloop-info)";
	return "var(--openloop-chart-1)";
}
function GaugeRender({ props }) {
	const root = asRecord(props) ?? {};
	const panelTitle = typeof root.title === "string" ? root.title : void 0;
	const rawValue = typeof root.value === "number" && Number.isFinite(root.value) ? root.value : 0;
	const value = Math.max(0, Math.min(100, rawValue));
	const progress = value / 100;
	const circumference = 2 * Math.PI * 52;
	const unit = typeof root.unit === "string" ? root.unit : void 0;
	const label = typeof root.label === "string" ? root.label : void 0;
	const detail = typeof root.detail === "string" ? root.detail : void 0;
	const displayValue = `${Math.round(value)}${unit ? ` ${unit}` : ""}`;
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "gauge",
		"data-openloop-value": String(Math.round(value)),
		style: containerStyle$2,
		children: [panelTitle !== void 0 ? /* @__PURE__ */ jsx("div", {
			style: titleStyle$1,
			children: panelTitle
		}) : null, /* @__PURE__ */ jsxs("div", {
			style: {
				display: "flex",
				alignItems: "center",
				gap: 14,
				flexWrap: "wrap"
			},
			children: [/* @__PURE__ */ jsxs("svg", {
				viewBox: "0 0 132 132",
				style: {
					width: 128,
					height: 128,
					flexShrink: 0
				},
				role: "meter",
				"aria-label": label ?? panelTitle ?? "gauge",
				"aria-valuemin": 0,
				"aria-valuemax": 100,
				"aria-valuenow": Math.round(value),
				children: [
					/* @__PURE__ */ jsx("circle", {
						cx: "66",
						cy: "66",
						r: "52",
						fill: "none",
						stroke: "var(--openloop-surface-muted)",
						strokeWidth: "12"
					}),
					/* @__PURE__ */ jsx("circle", {
						cx: "66",
						cy: "66",
						r: "52",
						fill: "none",
						stroke: gaugeColor(root.tone),
						strokeWidth: "12",
						strokeLinecap: "round",
						strokeDasharray: circumference,
						strokeDashoffset: circumference * (1 - progress),
						transform: "rotate(-90 66 66)"
					}),
					/* @__PURE__ */ jsx("text", {
						x: "66",
						y: "62",
						textAnchor: "middle",
						fontSize: "18",
						fontWeight: 650,
						fill: "var(--openloop-foreground)",
						style: { fontVariantNumeric: "tabular-nums" },
						children: displayValue
					}),
					/* @__PURE__ */ jsxs("text", {
						x: "66",
						y: "82",
						textAnchor: "middle",
						fontSize: "10",
						fill: "var(--openloop-muted-foreground)",
						children: [Math.round(progress * 100), "%"]
					})
				]
			}), /* @__PURE__ */ jsxs("div", {
				style: {
					minWidth: 0,
					flex: 1
				},
				children: [
					label !== void 0 ? /* @__PURE__ */ jsx("div", {
						style: labelStyle$2,
						children: label
					}) : null,
					detail !== void 0 ? /* @__PURE__ */ jsx("div", {
						style: detailStyle,
						children: detail
					}) : null,
					/* @__PURE__ */ jsx("div", {
						style: rangeStyle,
						children: "0 – 100"
					})
				]
			})]
		})]
	});
}
//#endregion
//#region src/presets/gauge/index.ts
const gaugePreset = {
	kind: "gauge",
	schema: gaugeSchema,
	validate: validateGauge,
	Render: GaugeRender
};
//#endregion
//#region src/presets/grid/schema.ts
/**
* grid props JSON Schema。
* columns 1–6（默认 2）；gap 0–48（默认 8）；children 0–12 等宽格子。
*/
const gridSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		columns: {
			type: "integer",
			minimum: 1,
			maximum: 6,
			description: "网格列数 1–6，默认 2"
		},
		gap: {
			type: "integer",
			minimum: 0,
			maximum: 48,
			description: "格子间距（px），0–48，默认 8"
		},
		children: {
			type: "array",
			maxItems: 12,
			description: "子 widget 列表（0–12）：每项为 WidgetUnit 形状 { id, source: { type: \"preset\", kind, props } }",
			items: { type: "object" }
		}
	}
};
//#endregion
//#region src/presets/grid/validate.ts
/**
* grid 校验（fail-closed）：columns 整数 1–6；gap 整数 0–48；children 深校验。
*/
function validateGrid(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "grid props 必须是 JSON 对象")]);
	const errors = [];
	if (root.columns !== void 0) {
		if (!isFiniteNumber(root.columns) || !Number.isInteger(root.columns) || root.columns < 1 || root.columns > 6) errors.push(error("columns", "columns 必须是 1–6 的整数"));
	}
	if (root.gap !== void 0 && (!isFiniteNumber(root.gap) || !Number.isInteger(root.gap) || root.gap < 0 || root.gap > 48)) errors.push(error("gap", "gap 必须是 0–48 的整数（px）"));
	errors.push(...validateChildren(root.children, "children", "grid"));
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/grid/Render.tsx
function GridRender({ props }) {
	const root = asRecord(props) ?? {};
	const columns = isFiniteNumber(root.columns) ? Math.max(1, Math.min(6, Math.trunc(root.columns))) : 2;
	const gap = isFiniteNumber(root.gap) ? Math.max(0, Math.min(48, Math.trunc(root.gap))) : 8;
	const children = Array.isArray(root.children) ? root.children : [];
	const style = {
		display: "grid",
		gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
		gap
	};
	return /* @__PURE__ */ jsx("div", {
		"data-openloop-preset": "grid",
		"data-openloop-columns": String(columns),
		"data-openloop-gap": String(gap),
		style,
		children: renderChildren(children)
	});
}
//#endregion
//#region src/presets/grid/index.ts
const gridPreset = {
	kind: "grid",
	schema: gridSchema,
	validate: validateGrid,
	Render: GridRender
};
//#endregion
//#region src/presets/heading/schema.ts
/**
* heading props JSON Schema。
* text 必填 1–200；level 1–4 映射全局字阶（1→type-display / 2→type-title / 3→type-label / 4→type-meta）。
*/
const headingSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		text: {
			type: "string",
			minLength: 1,
			maxLength: 200,
			description: "标题文本，1–200 字符"
		},
		level: {
			type: "integer",
			minimum: 1,
			maximum: 4,
			description: "标题级别 1–4，默认 1；1=display / 2=title / 3=label / 4=meta"
		},
		align: {
			enum: [
				"left",
				"center",
				"right"
			],
			description: "文本对齐，默认 left"
		}
	},
	required: ["text"]
};
//#endregion
//#region src/presets/heading/validate.ts
/**
* heading 校验（fail-closed）：text 必填 1–200；level 整数 1–4；align 枚举。
*/
function validateHeading(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "heading props 必须是 JSON 对象")]);
	const errors = [];
	if (!isNonEmptyString(root.text)) errors.push(error("text", "text 必填，必须是非空字符串（1–200 字符）"));
	else if (root.text.length > 200) errors.push(error("text", `text 长度不得超过 200 字符，当前 ${root.text.length}`));
	if (root.level !== void 0) {
		if (typeof root.level !== "number" || !Number.isInteger(root.level)) errors.push(error("level", "level 必须是 1–4 的整数"));
		else if (root.level < 1 || root.level > 4) errors.push(error("level", `level 必须在 1–4 之间，当前 ${root.level}`));
	}
	if (root.align !== void 0 && root.align !== "left" && root.align !== "center" && root.align !== "right") errors.push(error("align", "align 必须是 left / center / right 之一"));
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/heading/Render.tsx
function HeadingRender({ props }) {
	const root = asRecord(props) ?? {};
	const text = typeof root.text === "string" ? root.text : "";
	const level = typeof root.level === "number" ? Math.max(1, Math.min(4, Math.trunc(root.level))) : 1;
	const align = typeof root.align === "string" ? root.align : "left";
	const style = {
		...headingLevelStyle(level),
		margin: 0,
		color: "var(--openloop-foreground)",
		textAlign: align,
		wordBreak: "break-word"
	};
	const Tag = [
		"h1",
		"h2",
		"h3",
		"h4"
	][level - 1] ?? "h1";
	return /* @__PURE__ */ jsx(Tag, {
		"data-openloop-preset": "heading",
		"data-openloop-level": String(level),
		style,
		children: text
	});
}
//#endregion
//#region src/presets/heading/index.ts
const headingPreset = {
	kind: "heading",
	schema: headingSchema,
	validate: validateHeading,
	Render: HeadingRender
};
//#endregion
//#region src/presets/heatmap/schema.ts
/**
* heatmap props JSON Schema。
* matrix 必填 rows×cols 数值矩阵（≤10×10，各行等长，值须有限数字）；
* rowLabels / colLabels 可选，长度分别与行列数一致（≤40 字符）。
* 值域映射 chart-seq-1..5 深浅。
*/
const heatmapSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "可选的图表标题，≤80 字符"
		},
		matrix: {
			type: "array",
			minItems: 1,
			maxItems: 10,
			description: "数值矩阵，≤10 行；每行 ≤10 列且各行等长",
			items: {
				type: "array",
				minItems: 1,
				maxItems: 10,
				description: "一行数据，1–10 个有限数字",
				items: { type: "number" }
			}
		},
		rowLabels: {
			type: "array",
			minItems: 1,
			maxItems: 10,
			description: "可选的行标签，长度须与 matrix 行数一致",
			items: {
				type: "string",
				maxLength: 40
			}
		},
		colLabels: {
			type: "array",
			minItems: 1,
			maxItems: 10,
			description: "可选的列标签，长度须与 matrix 列数一致",
			items: {
				type: "string",
				maxLength: 40
			}
		}
	},
	required: ["matrix"]
};
//#endregion
//#region src/presets/heatmap/validate.ts
/**
* heatmap 校验（fail-closed）。
* - matrix 必填 1–10 行 × 1–10 列，各行等长，元素全部为有限数字
* - rowLabels / colLabels 长度与行列一致，元素为 ≤40 字符字符串
*/
const MAX_DIMENSION = 10;
const MAX_LABEL = 40;
function validateHeatmap(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "heatmap props 必须是 JSON 对象")]);
	const errors = [];
	if (root.title !== void 0 && (typeof root.title !== "string" || root.title.length > 80)) errors.push(error("title", "title 必须是 ≤80 字符的字符串"));
	if (!Array.isArray(root.matrix)) {
		errors.push(error("matrix", "matrix 必填，必须是 1–10 行的数值矩阵"));
		return validationFail(errors);
	}
	const matrix = root.matrix;
	if (matrix.length < 1 || matrix.length > MAX_DIMENSION) errors.push(error("matrix", `matrix 行数必须为 1–${MAX_DIMENSION}，当前 ${matrix.length}`));
	let columnCount;
	matrix.forEach((rawRow, rowIndex) => {
		const path = `matrix[${rowIndex}]`;
		if (!Array.isArray(rawRow)) {
			errors.push(error(path, "matrix 每一项必须是数组（一行数据）"));
			return;
		}
		if (rawRow.length < 1 || rawRow.length > MAX_DIMENSION) errors.push(error(path, `每行列数必须为 1–${MAX_DIMENSION}，当前 ${rawRow.length}`));
		if (columnCount === void 0) columnCount = rawRow.length;
		else if (rawRow.length !== columnCount) errors.push(error(path, `各行必须等长，首行列数为 ${columnCount}，当前 ${rawRow.length}`));
		rawRow.forEach((cell, colIndex) => {
			if (!isFiniteNumber(cell)) errors.push(error(`${path}[${colIndex}]`, `单元格必须是有限数字，当前 ${JSON.stringify(cell)}`));
		});
	});
	const checkLabels = (path, raw, expected) => {
		if (!Array.isArray(raw)) {
			errors.push(error(path, `${path} 必须是字符串数组`));
			return;
		}
		if (raw.length !== expected) errors.push(error(path, `${path} 长度必须为 ${expected}（与矩阵行/列数一致），当前 ${raw.length}`));
		raw.forEach((entry, index) => {
			if (typeof entry !== "string") errors.push(error(`${path}[${index}]`, "标签必须是字符串"));
			else if (entry.length > MAX_LABEL) errors.push(error(`${path}[${index}]`, `标签长度不得超过 ${MAX_LABEL} 字符，当前 ${entry.length}`));
		});
	};
	if (root.rowLabels !== void 0) checkLabels("rowLabels", root.rowLabels, matrix.length);
	if (root.colLabels !== void 0 && columnCount !== void 0) checkLabels("colLabels", root.colLabels, columnCount);
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/heatmap/Render.tsx
const containerStyle$1 = {
	...panel,
	padding: "12px 14px",
	minWidth: 0,
	overflow: "hidden"
};
const titleStyle = {
	...title,
	marginBottom: 10
};
const scrollStyle$1 = { overflowX: "auto" };
const tableStyle$4 = {
	width: "100%",
	minWidth: 320,
	borderCollapse: "separate",
	borderSpacing: "3px"
};
const cornerStyle = { width: 88 };
const labelCellStyle = {
	...meta,
	padding: "0 8px 2px 0",
	textAlign: "center",
	fontWeight: 500,
	color: "var(--openloop-muted-foreground)"
};
const rowLabelStyle = {
	...labelCellStyle,
	textAlign: "right",
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
	maxWidth: 88
};
const cellStyle$1 = {
	minWidth: 40,
	height: 30,
	padding: "4px 6px",
	textAlign: "center",
	borderRadius: "var(--openloop-radius-sm)",
	fontSize: 11,
	lineHeight: 1.4,
	fontVariantNumeric: "tabular-nums",
	color: "var(--openloop-foreground)"
};
function compactTick$1(value) {
	return new Intl.NumberFormat(void 0, {
		notation: "compact",
		maximumFractionDigits: 1
	}).format(value);
}
/** 值域比例 → chart-seq-1..5（低值浅、高值深） */
function seqStep(intensity) {
	return Math.max(1, Math.min(5, Math.ceil(Math.max(0, Math.min(1, intensity)) * 5)));
}
function HeatmapRender({ props }) {
	const root = asRecord(props) ?? {};
	const panelTitle = typeof root.title === "string" ? root.title : void 0;
	const matrix = (Array.isArray(root.matrix) ? root.matrix : []).map((rawRow) => Array.isArray(rawRow) ? rawRow.map(Number).filter(Number.isFinite) : []).filter((row) => row.length > 0).slice(0, 10).map((row) => row.slice(0, 10));
	const rowLabels = Array.isArray(root.rowLabels) ? root.rowLabels.filter((entry) => typeof entry === "string").slice(0, 10) : [];
	const colLabels = Array.isArray(root.colLabels) ? root.colLabels.filter((entry) => typeof entry === "string").slice(0, 10) : [];
	if (matrix.length === 0) return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "heatmap",
		"data-openloop-count": "0",
		style: containerStyle$1,
		children: [panelTitle !== void 0 ? /* @__PURE__ */ jsx("div", {
			style: titleStyle,
			children: panelTitle
		}) : null, /* @__PURE__ */ jsx("div", {
			style: meta,
			children: "暂无数据"
		})]
	});
	const allValues = matrix.flat();
	const minimum = Math.min(...allValues);
	const extent = Math.max(...allValues) - minimum;
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "heatmap",
		"data-openloop-count": String(allValues.length),
		style: containerStyle$1,
		children: [panelTitle !== void 0 ? /* @__PURE__ */ jsx("div", {
			style: titleStyle,
			children: panelTitle
		}) : null, /* @__PURE__ */ jsx("div", {
			style: scrollStyle$1,
			children: /* @__PURE__ */ jsxs("table", {
				style: tableStyle$4,
				children: [colLabels.length > 0 ? /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("th", {
					style: cornerStyle,
					"aria-hidden": "true"
				}), colLabels.map((label, colIndex) => /* @__PURE__ */ jsx("th", {
					style: labelCellStyle,
					scope: "col",
					children: label
				}, `col:${colIndex}`))] }) }) : null, /* @__PURE__ */ jsx("tbody", { children: matrix.map((row, rowIndex) => /* @__PURE__ */ jsxs("tr", { children: [rowLabels.length > 0 ? /* @__PURE__ */ jsx("th", {
					style: rowLabelStyle,
					scope: "row",
					children: rowLabels[rowIndex] ?? `R${rowIndex + 1}`
				}) : null, row.map((value, colIndex) => {
					const step = seqStep(extent > 0 ? (value - minimum) / extent : .5);
					const background = `var(--openloop-chart-seq-${step})`;
					const color = step >= 4 ? "var(--openloop-surface)" : "var(--openloop-foreground)";
					const rowLabel = rowLabels.length > 0 ? rowLabels[rowIndex] ?? "" : `R${rowIndex + 1}`;
					const colLabel = colLabels.length > 0 ? colLabels[colIndex] ?? "" : `C${colIndex + 1}`;
					return /* @__PURE__ */ jsx("td", {
						style: {
							...cellStyle$1,
							background,
							color
						},
						title: `${rowLabel} · ${colLabel}: ${value}`,
						children: compactTick$1(value)
					}, `cell:${colIndex}`);
				})] }, `row:${rowIndex}`)) })]
			})
		})]
	});
}
//#endregion
//#region src/presets/heatmap/index.ts
const heatmapPreset = {
	kind: "heatmap",
	schema: heatmapSchema,
	validate: validateHeatmap,
	Render: HeatmapRender
};
//#endregion
//#region src/presets/markdown/schema.ts
/**
* markdown props JSON Schema。
* content 必填 1–10000 字符；渲染用自研轻量解析（md.ts，无 marked 依赖）。
*/
const markdownSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: { content: {
		type: "string",
		minLength: 1,
		maxLength: 1e4,
		description: "Markdown 文本，1–10000 字符。支持：标题 #–####、无序/有序列表、**加粗**、`行内代码`"
	} },
	required: ["content"]
};
//#endregion
//#region src/presets/markdown/validate.ts
/**
* markdown 校验（fail-closed）：content 必填 1–10000 字符。
*/
function validateMarkdown(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "markdown props 必须是 JSON 对象")]);
	if (!isNonEmptyString(root.content)) return validationFail([error("content", "content 必填，必须是非空字符串（1–10000 字符）")]);
	if (root.content.length > 1e4) return validationFail([error("content", `content 长度不得超过 10000 字符，当前 ${root.content.length}`)]);
	return validationOk();
}
//#endregion
//#region src/presets/markdown/md.tsx
const codeStyle = {
	padding: "1px 5px",
	borderRadius: "var(--openloop-radius-sm)",
	background: "var(--openloop-surface-muted)",
	border: "1px solid var(--openloop-border)",
	fontFamily: "var(--openloop-font-sans, ui-monospace, SFMono-Regular, Menlo, monospace)",
	fontSize: "0.92em"
};
/** 行内解析：**加粗** 与 `代码`，其余原样 */
function renderInline(text, prefix) {
	const nodes = [];
	const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
	let last = 0;
	let index = 0;
	let match;
	while ((match = pattern.exec(text)) !== null) {
		if (match.index > last) nodes.push(text.slice(last, match.index));
		const token = match[0];
		if (token.startsWith("**")) nodes.push(/* @__PURE__ */ jsx("strong", { children: token.slice(2, -2) }, `${prefix}-b${index}`));
		else nodes.push(/* @__PURE__ */ jsx("code", {
			style: codeStyle,
			children: token.slice(1, -1)
		}, `${prefix}-c${index}`));
		last = match.index + token.length;
		index += 1;
	}
	if (last < text.length) nodes.push(text.slice(last));
	return nodes;
}
/** 块级解析：返回 React 元素数组（标题/列表/段落） */
function renderMarkdown(content) {
	const blocks = [];
	const lines = content.split(/\r?\n/);
	let listType = null;
	let listItems = [];
	const flushList = (key) => {
		if (listType === null) return key;
		const items = listItems;
		blocks.push(listType === "ol" ? /* @__PURE__ */ jsx("ol", {
			style: {
				margin: "4px 0",
				paddingLeft: 20
			},
			children: items.map((text, i) => /* @__PURE__ */ jsx("li", { children: renderInline(text, `ol${key}-${i}`) }, i))
		}, `ol${key}`) : /* @__PURE__ */ jsx("ul", {
			style: {
				margin: "4px 0",
				paddingLeft: 20
			},
			children: items.map((text, i) => /* @__PURE__ */ jsx("li", { children: renderInline(text, `ul${key}-${i}`) }, i))
		}, `ul${key}`));
		listType = null;
		listItems = [];
		return key + 1;
	};
	const pStyle = {
		margin: "4px 0",
		lineHeight: 1.55
	};
	let key = 0;
	for (const rawLine of lines) {
		const line = rawLine.trimEnd();
		const heading = /^(#{1,4})\s+(.*)$/.exec(line);
		if (heading) {
			key = flushList(key);
			const Tag = [
				"h1",
				"h2",
				"h3",
				"h4"
			][heading[1].length - 1];
			blocks.push(/* @__PURE__ */ jsx(Tag, {
				style: { margin: "8px 0 4px" },
				children: renderInline(heading[2] ?? "", `h${key}`)
			}, `h${key}`));
			key += 1;
			continue;
		}
		const ul = /^[-*]\s+(.*)$/.exec(line);
		if (ul) {
			if (listType !== "ul") {
				key = flushList(key);
				listType = "ul";
			}
			listItems.push(ul[1] ?? "");
			continue;
		}
		const ol = /^\d+\.\s+(.*)$/.exec(line);
		if (ol) {
			if (listType !== "ol") {
				key = flushList(key);
				listType = "ol";
			}
			listItems.push(ol[1] ?? "");
			continue;
		}
		key = flushList(key);
		if (line.trim() === "") continue;
		blocks.push(/* @__PURE__ */ jsx("p", {
			style: pStyle,
			children: renderInline(line, `p${key}`)
		}, `p${key}`));
		key += 1;
	}
	flushList(key);
	return blocks;
}
//#endregion
//#region src/presets/markdown/Render.tsx
const shell = {
	color: "var(--openloop-foreground)",
	fontSize: "var(--openloop-type-label, 13px)",
	wordBreak: "break-word"
};
function MarkdownRender({ props }) {
	const root = asRecord(props) ?? {};
	const content = typeof root.content === "string" ? root.content : "";
	return /* @__PURE__ */ jsx("div", {
		"data-openloop-preset": "markdown",
		style: shell,
		children: renderMarkdown(content)
	});
}
//#endregion
//#region src/presets/markdown/index.ts
const markdownPreset = {
	kind: "markdown",
	schema: markdownSchema,
	validate: validateMarkdown,
	Render: MarkdownRender
};
//#endregion
//#region src/presets/mcp-status/schema.ts
/**
* mcp-status props JSON Schema：title ≤80 / autoRefreshMs（共享规则）。
*/
const mcpStatusSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "面板标题，≤80 字符，可省略（默认「MCP 服务状态」）"
		},
		autoRefreshMs: {
			type: "integer",
			minimum: 1e4,
			maximum: 36e5,
			description: "自动刷新间隔（毫秒），≥10000，缺省不自动刷新"
		}
	}
};
//#endregion
//#region src/presets/mcp-status/validate.ts
/**
* mcp-status 校验（fail-closed）：共享规则（title ≤80 / autoRefreshMs）。
*/
function validateMcpStatus(props) {
	return validateLocalPresetProps("mcp-status", props);
}
//#endregion
//#region src/presets/mcp-status/Render.tsx
const headerStyle$5 = {
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 8,
	padding: "10px 14px",
	borderBottom: "1px solid var(--openloop-border)"
};
const scrollStyle = { overflowX: "auto" };
const tableStyle$3 = {
	width: "100%",
	borderCollapse: "collapse",
	fontSize: 12
};
const thStyle = {
	padding: "7px 12px",
	color: "var(--openloop-muted-foreground)",
	fontWeight: 600,
	textAlign: "left",
	whiteSpace: "nowrap",
	borderBottom: "1px solid var(--openloop-border)",
	background: "var(--openloop-surface-muted)"
};
const tdStyle$2 = {
	padding: "7px 12px",
	color: "var(--openloop-foreground)",
	borderBottom: "1px solid var(--openloop-border)",
	verticalAlign: "top",
	wordBreak: "break-all"
};
const monoStyle$2 = {
	fontFamily: "var(--openloop-font-mono, ui-monospace, \"SF Mono\", Menlo, monospace)",
	fontSize: 11.5
};
const placeholderStyle$4 = {
	padding: "22px 14px",
	textAlign: "center",
	color: "var(--openloop-muted-foreground)",
	fontSize: 12,
	lineHeight: 1.7
};
const STATE_TONE = {
	running: "var(--openloop-success)",
	connecting: "var(--openloop-warning)",
	error: "var(--openloop-error)"
};
function McpStatusRender({ props }) {
	const record = asRecord(props) ?? {};
	const state = useAppEndpoint("/openloop/mcp/servers", typeof record.autoRefreshMs === "number" ? record.autoRefreshMs : void 0);
	const headerTitle = typeof record.title === "string" && record.title.length > 0 ? record.title : "MCP 服务状态";
	const servers = (state.data?.servers ?? []).filter((s) => typeof s.id === "string");
	const runningCount = servers.filter((s) => s.state === "running").length;
	return /* @__PURE__ */ jsxs("div", {
		style: panel,
		"data-openloop-preset": "mcp-status",
		children: [/* @__PURE__ */ jsxs("div", {
			style: headerStyle$5,
			children: [/* @__PURE__ */ jsx("span", {
				style: title,
				children: headerTitle
			}), /* @__PURE__ */ jsx("span", {
				style: meta,
				children: servers.length > 0 ? `${runningCount} / ${servers.length} 运行中` : ""
			})]
		}), state.unavailable ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$4,
			children: [
				"MCP 插件未启用",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "安装并激活 @openloop/dsh-mcp 后可查看服务清单"
				})
			]
		}) : state.error !== void 0 ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$4,
			children: ["服务清单读取失败：", state.error]
		}) : servers.length === 0 ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$4,
			children: [
				"mcp.json 中没有配置服务",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "在 DSH_HOME/mcp.json 或项目 .dsh/mcp.json 登记 MCP server"
				})
			]
		}) : /* @__PURE__ */ jsx("div", {
			style: scrollStyle,
			children: /* @__PURE__ */ jsxs("table", {
				style: tableStyle$3,
				children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsx("th", {
						style: thStyle,
						children: "服务"
					}),
					/* @__PURE__ */ jsx("th", {
						style: thStyle,
						children: "来源"
					}),
					/* @__PURE__ */ jsx("th", {
						style: thStyle,
						children: "端点"
					}),
					/* @__PURE__ */ jsx("th", {
						style: thStyle,
						children: "状态"
					})
				] }) }), /* @__PURE__ */ jsx("tbody", { children: servers.map((s) => {
					const stateStr = typeof s.state === "string" ? s.state : "unknown";
					return /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("td", {
							style: {
								...tdStyle$2,
								...monoStyle$2
							},
							children: truncate(String(s.id), 36)
						}),
						/* @__PURE__ */ jsx("td", {
							style: tdStyle$2,
							children: String(s.source ?? "")
						}),
						/* @__PURE__ */ jsxs("td", {
							style: {
								...tdStyle$2,
								...monoStyle$2
							},
							title: String(s.endpoint ?? ""),
							children: [truncate(String(s.endpoint ?? ""), 40), /* @__PURE__ */ jsxs("span", {
								style: meta,
								children: [" · ", String(s.kind ?? "")]
							})]
						}),
						/* @__PURE__ */ jsxs("td", {
							style: tdStyle$2,
							children: [/* @__PURE__ */ jsx("span", { style: {
								display: "inline-block",
								width: 8,
								height: 8,
								borderRadius: "50%",
								marginRight: 6,
								background: STATE_TONE[stateStr] ?? "var(--openloop-muted-foreground)"
							} }), stateStr]
						})
					] }, String(s.id));
				}) })]
			})
		})]
	});
}
//#endregion
//#region src/presets/mcp-status/index.ts
const mcpStatusPreset = {
	kind: "mcp-status",
	schema: mcpStatusSchema,
	validate: validateMcpStatus,
	Render: McpStatusRender
};
//#endregion
//#region src/presets/metric-grid/schema.ts
/**
* metric-grid props JSON Schema（§6.4 示例实现）。
* 约束：items 1–6；label ≤ 40；emphasis hero 至多 1 个（validate.ts 强制）；
* deltaTone 映射 --openloop-delta-*（不复用 success/error）；format 含 text 兜底。
*/
const metricGridSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "可选的网格标题，≤80 字符"
		},
		items: {
			type: "array",
			minItems: 1,
			maxItems: 6,
			description: "指标项，1–6 个",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						type: "string",
						maxLength: 40,
						description: "指标 id（kebab-case 建议，用于稳定 key）"
					},
					label: {
						type: "string",
						minLength: 1,
						maxLength: 40,
						description: "指标标签，≤40 字符"
					},
					value: {
						type: ["number", "string"],
						description: "指标值；format 为 number/percent/currency-cny（currency 为其别名）时数字生效，否则按 text 展示"
					},
					format: {
						enum: [
							"currency-cny",
							"currency",
							"number",
							"percent",
							"text"
						],
						description: "值格式化；percent 为小数（0.124 → 12.4%）；未知/省略按 text 兜底"
					},
					delta: {
						type: "string",
						maxLength: 24,
						description: "环比等涨跌文案（如 +12.4%），与 deltaTone 搭配"
					},
					deltaTone: {
						enum: [
							"up",
							"down",
							"flat"
						],
						description: "涨跌方向，映射 --openloop-delta-up/down/flat，不复用 success/error"
					},
					emphasis: {
						enum: ["hero", "standard"],
						description: "hero 为整组视觉焦点（大数字+阴影），整组至多 1 个"
					}
				}
			}
		},
		columns: {
			enum: [
				1,
				2,
				3,
				4
			],
			description: "可选的显式列数（1–4）；省略时按容器宽度自适应"
		}
	},
	required: ["items"]
};
//#endregion
//#region src/presets/metric-grid/validate.ts
/**
* metric-grid 校验（fail-closed，§6.4 约束）。
* - items 必填数组 1–6
* - label 1–40 字符
* - value 为数字或字符串
* - format / deltaTone / emphasis 均为枚举
* - emphasis hero 至多 1 个
*/
const DELTA_TONES = [
	"up",
	"down",
	"flat"
];
const EMPHASES = ["hero", "standard"];
const COLUMNS = [
	1,
	2,
	3,
	4
];
function validateMetricGrid(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "metric-grid props 必须是 JSON 对象（见 §6.4 schema 示例）")]);
	const errors = [];
	if (root.title !== void 0 && (typeof root.title !== "string" || root.title.length > 80)) errors.push(error("title", "title 必须是 ≤80 字符的字符串"));
	if (root.columns !== void 0 && !COLUMNS.includes(root.columns)) errors.push(error("columns", "columns 必须是 1、2、3、4 之一"));
	if (!Array.isArray(root.items)) {
		errors.push(error("items", "items 必填，必须是 1–6 项的数组"));
		return validationFail(errors);
	}
	if (root.items.length < 1 || root.items.length > 6) errors.push(error("items", `items 数量必须为 1–6，当前 ${root.items.length}`));
	const list = root.items;
	let heroCount = 0;
	list.forEach((raw, index) => {
		const path = `items[${index}]`;
		const item = asRecord(raw);
		if (!item) {
			errors.push(error(path, "每一项必须是 JSON 对象"));
			return;
		}
		if (item.id !== void 0 && !isNonEmptyString(item.id)) errors.push(error(`${path}.id`, "id 必须是非空字符串（≤40 字符，kebab-case 建议）"));
		else if (typeof item.id === "string" && item.id.length > 40) errors.push(error(`${path}.id`, `id 长度不得超过 40 字符，当前 ${item.id.length}`));
		if (item.label !== void 0 && (typeof item.label !== "string" || item.label.length < 1 || item.label.length > 40)) errors.push(error(`${path}.label`, "label 必须为 1–40 字符的字符串"));
		if (item.value !== void 0 && !isFiniteNumber(item.value) && typeof item.value !== "string") errors.push(error(`${path}.value`, "value 必须是数字或字符串"));
		if (item.format !== void 0 && !isMetricFormat(item.format)) errors.push(error(`${path}.format`, "format 必须是 currency-cny（或别名 currency）/ number / percent / text 之一"));
		if (item.delta !== void 0 && (typeof item.delta !== "string" || item.delta.length > 24)) errors.push(error(`${path}.delta`, "delta 必须是 ≤24 字符的字符串（如 +12.4%）"));
		if (item.deltaTone !== void 0 && !DELTA_TONES.includes(String(item.deltaTone))) errors.push(error(`${path}.deltaTone`, "deltaTone 必须是 up / down / flat 之一"));
		if (item.emphasis !== void 0 && !EMPHASES.includes(String(item.emphasis))) errors.push(error(`${path}.emphasis`, "emphasis 必须是 hero / standard 之一"));
		if (item.emphasis === "hero") heroCount += 1;
	});
	if (heroCount > 1) errors.push(error("items", `emphasis: hero 至多 1 个（整组焦点唯一），当前 ${heroCount} 个`));
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/metric-grid/Render.tsx
const DELTA_COLOR = {
	up: "var(--openloop-delta-up)",
	down: "var(--openloop-delta-down)",
	flat: "var(--openloop-delta-flat)"
};
const DELTA_GLYPH = {
	up: "↑",
	down: "↓",
	flat: "—"
};
const cardStyle = {
	...panel,
	padding: "12px 14px",
	minWidth: 0
};
const cardHeroStyle = {
	...panelHero,
	padding: "14px 16px",
	minWidth: 0
};
const gridStyle = {
	display: "grid",
	gap: 8,
	gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))"
};
const labelStyle$1 = {
	...meta,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap"
};
const deltaStyle = {
	...micro,
	display: "flex",
	alignItems: "center",
	gap: 4,
	marginTop: 4,
	fontWeight: 500
};
function MetricGridRender({ props }) {
	const root = asRecord(props) ?? {};
	const title = typeof root.title === "string" ? root.title : void 0;
	const columns = isFiniteNumber(root.columns) ? Math.max(1, Math.min(4, Math.trunc(root.columns))) : void 0;
	const items = (Array.isArray(root.items) ? root.items : []).slice(0, 6).map((raw) => {
		const item = asRecord(raw) ?? {};
		const deltaTone = item.deltaTone === "up" || item.deltaTone === "down" || item.deltaTone === "flat" ? item.deltaTone : "flat";
		return {
			id: typeof item.id === "string" ? item.id : void 0,
			label: typeof item.label === "string" ? item.label : void 0,
			value: isFiniteNumber(item.value) ? item.value : typeof item.value === "string" ? item.value : "",
			format: item.format,
			delta: typeof item.delta === "string" ? item.delta : void 0,
			deltaTone,
			emphasis: item.emphasis === "hero" ? "hero" : "standard"
		};
	});
	const explicitHero = items.findIndex((item) => item.emphasis === "hero");
	const heroAt = explicitHero >= 0 ? explicitHero : items.length > 0 && items.length <= 4 ? 0 : -1;
	if (items.length === 0) return /* @__PURE__ */ jsx("div", {
		"data-openloop-preset": "metric-grid",
		"data-openloop-count": "0",
		style: {
			...panel,
			padding: "14px 16px"
		},
		children: /* @__PURE__ */ jsx("div", {
			style: meta,
			children: "暂无指标数据"
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "metric-grid",
		"data-openloop-count": String(items.length),
		children: [title !== void 0 ? /* @__PURE__ */ jsx("div", {
			style: {
				...meta,
				marginBottom: 8,
				fontWeight: 600
			},
			children: title
		}) : null, /* @__PURE__ */ jsx("div", {
			style: columns ? {
				...gridStyle,
				gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
			} : gridStyle,
			children: items.map((item, index) => {
				const isHero = index === heroAt;
				const toneColor = DELTA_COLOR[item.deltaTone];
				return /* @__PURE__ */ jsxs("div", {
					style: isHero ? cardHeroStyle : cardStyle,
					"data-openloop-emphasis": isHero ? "hero" : "standard",
					children: [
						item.label !== void 0 ? /* @__PURE__ */ jsx("div", {
							style: labelStyle$1,
							children: item.label
						}) : null,
						/* @__PURE__ */ jsx("div", {
							style: {
								...isHero ? displayValue : standardValue,
								wordBreak: "break-word"
							},
							children: formatValue(item.value, item.format)
						}),
						item.delta !== void 0 ? /* @__PURE__ */ jsxs("div", {
							style: {
								...deltaStyle,
								color: toneColor
							},
							"data-openloop-delta-tone": item.deltaTone,
							children: [/* @__PURE__ */ jsx("span", {
								"aria-hidden": "true",
								children: DELTA_GLYPH[item.deltaTone]
							}), item.delta]
						}) : null
					]
				}, item.id ?? `metric-${index}`);
			})
		})]
	});
}
//#endregion
//#region src/presets/metric-grid/index.ts
const metricGridPreset = {
	kind: "metric-grid",
	schema: metricGridSchema,
	validate: validateMetricGrid,
	Render: MetricGridRender
};
//#endregion
//#region src/presets/pb-stats/schema.ts
/**
* pb-stats props JSON Schema。
* title 可选（≤80）；autoRefreshMs 可选（≥10s，上限 1h，缺省不自动刷新）。
*/
const pbStatsSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "面板标题，≤80 字符，可省略（默认「后端运行状态」）"
		},
		autoRefreshMs: {
			type: "integer",
			minimum: 1e4,
			maximum: 36e5,
			description: "自动刷新间隔（毫秒），≥10000，缺省不自动刷新"
		}
	}
};
//#endregion
//#region src/presets/pb-stats/validate.ts
/**
* pb-stats 校验（fail-closed）：共享规则（title ≤80 / autoRefreshMs 10000–3600000）。
*/
function validatePbStats(props) {
	return validateLocalPresetProps("pb-stats", props);
}
//#endregion
//#region src/presets/pb-stats/Render.tsx
const headerStyle$4 = {
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 8,
	padding: "10px 14px",
	borderBottom: "1px solid var(--openloop-border)"
};
const metricsStyle$1 = {
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
	gap: 8,
	padding: "12px 14px"
};
const metricStyle$1 = {
	padding: "8px 10px",
	borderRadius: "var(--openloop-radius-md)",
	border: "1px solid var(--openloop-border)",
	background: "var(--openloop-surface-muted)"
};
const metricValueStyle$1 = {
	fontSize: 15,
	fontWeight: 650,
	lineHeight: 1.3,
	color: "var(--openloop-foreground)",
	fontVariantNumeric: "tabular-nums"
};
const tableStyle$2 = {
	width: "100%",
	borderCollapse: "collapse",
	fontSize: 12
};
const cellStyle = {
	padding: "7px 14px",
	color: "var(--openloop-foreground)",
	borderBottom: "1px solid var(--openloop-border)"
};
const placeholderStyle$3 = {
	padding: "22px 14px",
	textAlign: "center",
	color: "var(--openloop-muted-foreground)",
	fontSize: 12,
	lineHeight: 1.7
};
function PbStatsRender({ props }) {
	const record = asRecord(props) ?? {};
	const state = useAppEndpoint("/openloop/app/pb-stats", typeof record.autoRefreshMs === "number" ? record.autoRefreshMs : void 0);
	const headerTitle = typeof record.title === "string" && record.title.length > 0 ? record.title : "后端运行状态";
	const collections = Array.isArray(state.data?.collections) ? state.data.collections.filter((c) => typeof c?.name === "string" && typeof c?.count === "number") : [];
	const totalRecords = collections.reduce((n, c) => n + c.count, 0);
	const version = typeof state.data?.version === "string" ? state.data.version : "";
	return /* @__PURE__ */ jsxs("div", {
		style: panel,
		"data-openloop-preset": "pb-stats",
		children: [/* @__PURE__ */ jsxs("div", {
			style: headerStyle$4,
			children: [/* @__PURE__ */ jsx("span", {
				style: title,
				children: headerTitle
			}), /* @__PURE__ */ jsx("span", {
				style: meta,
				children: version !== "" ? `PocketBase ${version}` : ""
			})]
		}), state.unavailable ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$3,
			children: [
				"本地应用后端未启用",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "安装并激活 @openloop/dsh-app 插件后可查看运行状态"
				})
			]
		}) : state.error !== void 0 ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$3,
			children: ["后端状态读取失败：", state.error]
		}) : state.loading || state.data === void 0 ? /* @__PURE__ */ jsx("div", {
			style: placeholderStyle$3,
			children: "读取中…"
		}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
			style: metricsStyle$1,
			children: [
				/* @__PURE__ */ jsxs("div", {
					style: metricStyle$1,
					children: [/* @__PURE__ */ jsx("div", {
						style: meta,
						children: "运行时长"
					}), /* @__PURE__ */ jsx("div", {
						style: metricValueStyle$1,
						children: formatDuration(typeof state.data.uptimeMs === "number" ? state.data.uptimeMs : 0)
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					style: metricStyle$1,
					children: [/* @__PURE__ */ jsx("div", {
						style: meta,
						children: "管理表"
					}), /* @__PURE__ */ jsx("div", {
						style: metricValueStyle$1,
						children: collections.length
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					style: metricStyle$1,
					children: [/* @__PURE__ */ jsx("div", {
						style: meta,
						children: "总记录数"
					}), /* @__PURE__ */ jsx("div", {
						style: metricValueStyle$1,
						children: totalRecords.toLocaleString()
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					style: metricStyle$1,
					children: [/* @__PURE__ */ jsx("div", {
						style: meta,
						children: "数据占用"
					}), /* @__PURE__ */ jsx("div", {
						style: metricValueStyle$1,
						children: formatBytes(typeof state.data.dataDirBytes === "number" ? state.data.dataDirBytes : 0)
					})]
				})
			]
		}), /* @__PURE__ */ jsxs("table", {
			style: tableStyle$2,
			children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("th", {
				style: {
					...cellStyle,
					color: "var(--openloop-muted-foreground)",
					fontWeight: 600,
					textAlign: "left"
				},
				children: "集合"
			}), /* @__PURE__ */ jsx("th", {
				style: {
					...cellStyle,
					color: "var(--openloop-muted-foreground)",
					fontWeight: 600,
					textAlign: "right"
				},
				children: "记录数"
			})] }) }), /* @__PURE__ */ jsx("tbody", { children: collections.map((c) => /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("td", {
				style: {
					...cellStyle,
					fontFamily: "var(--openloop-font-mono, ui-monospace, \"SF Mono\", Menlo, monospace)",
					fontSize: 11.5
				},
				children: c.name
			}), /* @__PURE__ */ jsx("td", {
				style: {
					...cellStyle,
					textAlign: "right",
					fontVariantNumeric: "tabular-nums"
				},
				children: c.count.toLocaleString()
			})] }, c.name)) })]
		})] })]
	});
}
//#endregion
//#region src/presets/pb-stats/index.ts
const pbStatsPreset = {
	kind: "pb-stats",
	schema: pbStatsSchema,
	validate: validatePbStats,
	Render: PbStatsRender
};
//#endregion
//#region src/presets/plugin-registry/schema.ts
/**
* plugin-registry props JSON Schema：title ≤80（无 autoRefresh——数据来自页面 boot 载荷，静态）。
*/
const pluginRegistrySchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: { title: {
		type: "string",
		maxLength: 80,
		description: "面板标题，≤80 字符，可省略（默认「插件清单」）"
	} }
};
//#endregion
//#region src/presets/plugin-registry/validate.ts
/**
* plugin-registry 校验（fail-closed）：title ≤80。
*/
function validatePluginRegistry(props) {
	return validateLocalPresetProps("plugin-registry", props);
}
//#endregion
//#region src/presets/plugin-registry/Render.tsx
const headerStyle$3 = {
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 8,
	padding: "10px 14px",
	borderBottom: "1px solid var(--openloop-border)"
};
const groupLabelStyle = {
	padding: "8px 14px 2px",
	fontSize: 11,
	fontWeight: 600,
	letterSpacing: "0.04em",
	color: "var(--openloop-muted-foreground)"
};
const tableStyle$1 = {
	width: "100%",
	borderCollapse: "collapse",
	fontSize: 11.5
};
const tdStyle$1 = {
	padding: "5px 14px",
	color: "var(--openloop-foreground)",
	verticalAlign: "top",
	wordBreak: "break-all"
};
const monoStyle$1 = { fontFamily: "var(--openloop-font-mono, ui-monospace, \"SF Mono\", Menlo, monospace)" };
const placeholderStyle$2 = {
	padding: "22px 14px",
	textAlign: "center",
	color: "var(--openloop-muted-foreground)",
	fontSize: 12,
	lineHeight: 1.7
};
function readBootEntries() {
	const boot = globalThis.__DSH_BOOT__;
	if (typeof boot !== "object" || boot === null || !Array.isArray(boot.entries)) return [];
	return boot.entries;
}
function groupOf(id) {
	if (id.startsWith("@openloop/")) return "openloop";
	if (id.startsWith("@deepseek-ai/")) return "deepseek";
	return "other";
}
const GROUP_LABELS = {
	openloop: "OpenLoop 插件",
	deepseek: "DeepSeek 官方",
	other: "其他"
};
function PluginRegistryRender({ props }) {
	const record = asRecord(props) ?? {};
	const headerTitle = typeof record.title === "string" && record.title.length > 0 ? record.title : "插件清单";
	const entries = readBootEntries().filter((e) => typeof e.id === "string").map((e) => ({
		id: String(e.id),
		inject: Array.isArray(e.inject) ? e.inject.length : 0
	})).sort((a, b) => a.id.localeCompare(b.id));
	return /* @__PURE__ */ jsxs("div", {
		style: panel,
		"data-openloop-preset": "plugin-registry",
		children: [/* @__PURE__ */ jsxs("div", {
			style: headerStyle$3,
			children: [/* @__PURE__ */ jsx("span", {
				style: title,
				children: headerTitle
			}), /* @__PURE__ */ jsx("span", {
				style: meta,
				children: entries.length > 0 ? `${entries.length} 个已加载` : ""
			})]
		}), entries.length === 0 ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$2,
			children: [
				"页面启动载荷不可读",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "__DSH_BOOT__.entries 在当前环境不可用"
				})
			]
		}) : [
			"openloop",
			"deepseek",
			"other"
		].map((group) => {
			const rows = entries.filter((e) => groupOf(e.id) === group);
			if (rows.length === 0) return null;
			return /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
				style: groupLabelStyle,
				children: [
					GROUP_LABELS[group],
					"（",
					rows.length,
					"）"
				]
			}), /* @__PURE__ */ jsx("table", {
				style: tableStyle$1,
				children: /* @__PURE__ */ jsx("tbody", { children: rows.map((e) => /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("td", {
					style: {
						...tdStyle$1,
						...monoStyle$1
					},
					children: truncate(e.id, 52)
				}), /* @__PURE__ */ jsx("td", {
					style: {
						...tdStyle$1,
						width: 56,
						textAlign: "right",
						color: "var(--openloop-muted-foreground)",
						fontVariantNumeric: "tabular-nums"
					},
					children: e.inject > 0 ? `${e.inject} 注入` : "—"
				})] }, e.id)) })
			})] }, group);
		})]
	});
}
//#endregion
//#region src/presets/plugin-registry/index.ts
const pluginRegistryPreset = {
	kind: "plugin-registry",
	schema: pluginRegistrySchema,
	validate: validatePluginRegistry,
	Render: PluginRegistryRender
};
//#endregion
//#region src/presets/progress/schema.ts
/**
* progress props JSON Schema。
* value 必填（≥0），max 默认 100（>0）；value 超出 max 时渲染截断为 100%。
* tone 映射 primary/success/warning/error/info 基色。
*/
const progressSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		label: {
			type: "string",
			maxLength: 80,
			description: "进度条文案标签，≤80 字符"
		},
		value: {
			type: "number",
			minimum: 0,
			description: "当前进度值（必填，≥0；与 max 同量纲，超 max 按满格渲染）"
		},
		max: {
			type: "number",
			exclusiveMinimum: 0,
			description: "进度满值，默认 100"
		},
		tone: {
			enum: [
				"primary",
				"success",
				"warning",
				"error",
				"info"
			],
			description: "进度条基色，默认 primary"
		}
	},
	required: ["value"]
};
//#endregion
//#region src/presets/progress/validate.ts
/**
* progress 校验（fail-closed）。
* - value 必填有限数字 ≥ 0
* - max 若提供必须为有限数字 > 0
* - tone 限 primary/success/warning/error/info
*/
const TONES$1 = [
	"primary",
	"success",
	"warning",
	"error",
	"info"
];
function validateProgress(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "progress props 必须是 JSON 对象")]);
	const errors = [];
	if (root.label !== void 0 && (typeof root.label !== "string" || root.label.length > 80)) errors.push(error("label", "label 必须是 ≤80 字符的字符串"));
	if (!isFiniteNumber(root.value)) errors.push(error("value", "value 必填，必须是有限数字（≥0）"));
	else if (root.value < 0) errors.push(error("value", `value 不得为负，当前 ${root.value}`));
	if (root.max !== void 0) {
		if (!isFiniteNumber(root.max)) errors.push(error("max", "max 必须是有限数字"));
		else if (root.max <= 0) errors.push(error("max", `max 必须大于 0，当前 ${root.max}`));
	}
	if (root.tone !== void 0 && !TONES$1.includes(String(root.tone))) errors.push(error("tone", "tone 必须是 primary / success / warning / error / info 之一"));
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/progress/Render.tsx
const TONE_COLOR$1 = {
	primary: "var(--openloop-primary)",
	success: "var(--openloop-success)",
	warning: "var(--openloop-warning)",
	error: "var(--openloop-error)",
	info: "var(--openloop-info)"
};
const trackStyle = {
	height: 8,
	borderRadius: 999,
	background: "var(--openloop-surface-muted)",
	overflow: "hidden"
};
function ProgressRender({ props }) {
	const root = asRecord(props) ?? {};
	const label = typeof root.label === "string" ? root.label : void 0;
	const rawValue = isFiniteNumber(root.value) ? root.value : 0;
	const max = isFiniteNumber(root.max) && root.max > 0 ? root.max : 100;
	const tone = root.tone === "success" || root.tone === "warning" || root.tone === "error" || root.tone === "info" ? root.tone : "primary";
	const value = Math.max(0, Math.min(max, rawValue));
	const percent = max > 0 ? value / max : 0;
	const roundedPercent = Math.round(percent * 100);
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "progress",
		"data-openloop-value": String(Math.round(value)),
		"data-openloop-tone": tone,
		children: [label !== void 0 ? /* @__PURE__ */ jsxs("div", {
			style: {
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 8,
				marginBottom: 4
			},
			children: [/* @__PURE__ */ jsx("span", {
				style: meta,
				children: label
			}), /* @__PURE__ */ jsxs("span", {
				style: micro,
				"data-openloop-percent": String(roundedPercent),
				children: [roundedPercent, "%"]
			})]
		}) : null, /* @__PURE__ */ jsx("div", {
			role: "progressbar",
			"aria-valuemin": 0,
			"aria-valuemax": Math.round(max),
			"aria-valuenow": Math.round(value),
			style: trackStyle,
			children: /* @__PURE__ */ jsx("div", { style: {
				height: "100%",
				borderRadius: 999,
				background: TONE_COLOR$1[tone],
				width: `${percent * 100}%`,
				transition: "width 200ms ease"
			} })
		})]
	});
}
//#endregion
//#region src/presets/progress/index.ts
const progressPreset = {
	kind: "progress",
	schema: progressSchema,
	validate: validateProgress,
	Render: ProgressRender
};
//#endregion
//#region src/presets/row/schema.ts
/**
* row props JSON Schema。
* gap 0–48（默认 8）；align 交叉轴对齐（默认 center）；wrap 默认 true；children 0–12。
*/
const rowSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		gap: {
			type: "integer",
			minimum: 0,
			maximum: 48,
			description: "子组件间距（px），0–48，默认 8"
		},
		align: {
			enum: [
				"start",
				"center",
				"end",
				"stretch"
			],
			description: "交叉轴对齐，默认 center"
		},
		wrap: {
			type: "boolean",
			description: "是否允许换行，默认 true"
		},
		children: {
			type: "array",
			maxItems: 12,
			description: "子 widget 列表（0–12）：每项为 WidgetUnit 形状 { id, source: { type: \"preset\", kind, props } }",
			items: { type: "object" }
		}
	}
};
//#endregion
//#region src/presets/row/validate.ts
/**
* row 校验（fail-closed）：gap/align/wrap 枚举与范围；children 深校验。
*/
const ALIGNS$2 = [
	"start",
	"center",
	"end",
	"stretch"
];
function validateRow(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "row props 必须是 JSON 对象")]);
	const errors = [];
	if (root.gap !== void 0 && (!isFiniteNumber(root.gap) || !Number.isInteger(root.gap) || root.gap < 0 || root.gap > 48)) errors.push(error("gap", "gap 必须是 0–48 的整数（px）"));
	if (root.align !== void 0 && !ALIGNS$2.includes(String(root.align))) errors.push(error("align", "align 必须是 start / center / end / stretch 之一"));
	if (root.wrap !== void 0 && typeof root.wrap !== "boolean") errors.push(error("wrap", "wrap 必须是布尔值"));
	errors.push(...validateChildren(root.children, "children", "row"));
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/row/Render.tsx
const ALIGN_MAP$1 = {
	start: "flex-start",
	center: "center",
	end: "flex-end",
	stretch: "stretch"
};
function RowRender({ props }) {
	const root = asRecord(props) ?? {};
	const gap = isFiniteNumber(root.gap) ? Math.max(0, Math.min(48, Math.trunc(root.gap))) : 8;
	const align = ALIGN_MAP$1[String(root.align)] ?? "center";
	const wrap = root.wrap !== false;
	const children = Array.isArray(root.children) ? root.children : [];
	return /* @__PURE__ */ jsx("div", {
		"data-openloop-preset": "row",
		"data-openloop-gap": String(gap),
		style: {
			display: "flex",
			flexDirection: "row",
			flexWrap: wrap ? "wrap" : "nowrap",
			alignItems: align,
			gap,
			minWidth: 0
		},
		children: renderChildren(children)
	});
}
//#endregion
//#region src/presets/row/index.ts
const rowPreset = {
	kind: "row",
	schema: rowSchema,
	validate: validateRow,
	Render: RowRender
};
//#endregion
//#region src/presets/section/schema.ts
/**
* section props JSON Schema。
* title ≤120 可选；bordered 默认 true（可关边框做分区留白）；children 0–12 子 widget。
*/
const sectionSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 120,
			description: "分区标题，≤120 字符，可省略"
		},
		bordered: {
			type: "boolean",
			description: "是否带边框/背景，默认 true；false 渲染为纯分区"
		},
		children: {
			type: "array",
			maxItems: 12,
			description: "子 widget 列表（0–12）：每项为 WidgetUnit 形状 { id, source: { type: \"preset\", kind, props } }",
			items: { type: "object" }
		}
	}
};
//#endregion
//#region src/presets/section/validate.ts
/**
* section 校验（fail-closed）：title 长度上限；bordered 布尔；children 深校验。
*/
function validateSection(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "section props 必须是 JSON 对象")]);
	const errors = [];
	if (root.title !== void 0) {
		if (typeof root.title !== "string") errors.push(error("title", "title 必须是字符串（≤120 字符）"));
		else if (root.title.length > 120) errors.push(error("title", `title 长度不得超过 120 字符，当前 ${root.title.length}`));
	}
	if (root.bordered !== void 0 && typeof root.bordered !== "boolean") errors.push(error("bordered", "bordered 必须是布尔值"));
	errors.push(...validateChildren(root.children, "children", "section"));
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/section/Render.tsx
const borderedShell = {
	border: "1px solid var(--openloop-border)",
	borderRadius: "var(--openloop-radius-md)",
	background: "var(--openloop-surface-subtle)",
	padding: "12px 14px"
};
const plainShell = { padding: "4px 0" };
const body = {
	display: "flex",
	flexDirection: "column",
	gap: 10
};
function SectionRender({ props }) {
	const root = asRecord(props) ?? {};
	const title = typeof root.title === "string" ? root.title : void 0;
	const bordered = root.bordered !== false;
	const children = Array.isArray(root.children) ? root.children : [];
	return /* @__PURE__ */ jsxs("section", {
		"data-openloop-preset": "section",
		"data-openloop-bordered": bordered ? "true" : "false",
		style: bordered ? borderedShell : plainShell,
		children: [/* @__PURE__ */ jsx(ContainerHeader, { title }), /* @__PURE__ */ jsx("div", {
			style: body,
			children: renderChildren(children)
		})]
	});
}
//#endregion
//#region src/presets/section/index.ts
const sectionPreset = {
	kind: "section",
	schema: sectionSchema,
	validate: validateSection,
	Render: SectionRender
};
//#endregion
//#region src/presets/sessions-stats/schema.ts
/**
* sessions-stats props JSON Schema：title ≤80 / autoRefreshMs（共享规则）。
*/
const sessionsStatsSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "面板标题，≤80 字符，可省略（默认「会话统计」）"
		},
		autoRefreshMs: {
			type: "integer",
			minimum: 1e4,
			maximum: 36e5,
			description: "自动刷新间隔（毫秒），≥10000，缺省不自动刷新"
		}
	}
};
//#endregion
//#region src/presets/sessions-stats/validate.ts
/**
* sessions-stats 校验（fail-closed）：共享规则（title ≤80 / autoRefreshMs）。
*/
function validateSessionsStats(props) {
	return validateLocalPresetProps("sessions-stats", props);
}
//#endregion
//#region src/presets/sessions-stats/Render.tsx
const headerStyle$2 = {
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 8,
	padding: "10px 14px",
	borderBottom: "1px solid var(--openloop-border)"
};
const metricsStyle = {
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
	gap: 8,
	padding: "12px 14px 8px"
};
const metricStyle = {
	padding: "8px 10px",
	borderRadius: "var(--openloop-radius-md)",
	border: "1px solid var(--openloop-border)",
	background: "var(--openloop-surface-muted)"
};
const metricValueStyle = {
	fontSize: 15,
	fontWeight: 650,
	lineHeight: 1.3,
	color: "var(--openloop-foreground)",
	fontVariantNumeric: "tabular-nums"
};
const chartStyle = {
	display: "flex",
	alignItems: "flex-end",
	gap: 4,
	height: 48,
	padding: "6px 14px 10px"
};
const barStyle = {
	flex: 1,
	minWidth: 6,
	borderRadius: "3px 3px 0 0",
	background: "var(--openloop-chart-2)",
	minHeight: 2
};
const tableStyle = {
	width: "100%",
	borderCollapse: "collapse",
	fontSize: 11.5
};
const tdStyle = {
	padding: "6px 14px",
	color: "var(--openloop-foreground)",
	borderBottom: "1px solid var(--openloop-border)",
	verticalAlign: "top",
	wordBreak: "break-all"
};
const monoStyle = { fontFamily: "var(--openloop-font-mono, ui-monospace, \"SF Mono\", Menlo, monospace)" };
const placeholderStyle$1 = {
	padding: "22px 14px",
	textAlign: "center",
	color: "var(--openloop-muted-foreground)",
	fontSize: 12,
	lineHeight: 1.7
};
function SessionsStatsRender({ props }) {
	const record = asRecord(props) ?? {};
	const state = useAppEndpoint("/openloop/app/sessions-stats", typeof record.autoRefreshMs === "number" ? record.autoRefreshMs : void 0);
	const headerTitle = typeof record.title === "string" && record.title.length > 0 ? record.title : "会话统计";
	const byDay = (state.data?.byDay ?? []).filter((d) => typeof d.count === "number");
	const maxCount = byDay.reduce((m, d) => Math.max(m, Number(d.count ?? 0)), 0);
	const largest = (state.data?.largest ?? []).filter((l) => typeof l.bytes === "number");
	return /* @__PURE__ */ jsxs("div", {
		style: panel,
		"data-openloop-preset": "sessions-stats",
		children: [/* @__PURE__ */ jsxs("div", {
			style: headerStyle$2,
			children: [/* @__PURE__ */ jsx("span", {
				style: title,
				children: headerTitle
			}), /* @__PURE__ */ jsx("span", {
				style: meta,
				children: byDay.length > 0 ? `近 ${byDay.length} 天` : ""
			})]
		}), state.unavailable ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$1,
			children: [
				"本地应用后端未启用",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "安装并激活 @openloop/dsh-app 插件后可查看会话统计"
				})
			]
		}) : state.error !== void 0 ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle$1,
			children: ["会话统计读取失败：", state.error]
		}) : state.loading || state.data === void 0 ? /* @__PURE__ */ jsx("div", {
			style: placeholderStyle$1,
			children: "统计中…"
		}) : /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsxs("div", {
				style: metricsStyle,
				children: [
					/* @__PURE__ */ jsxs("div", {
						style: metricStyle,
						children: [/* @__PURE__ */ jsx("div", {
							style: meta,
							children: "会话总数"
						}), /* @__PURE__ */ jsx("div", {
							style: metricValueStyle,
							children: (typeof state.data.totalSessions === "number" ? state.data.totalSessions : 0).toLocaleString()
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: metricStyle,
						children: [/* @__PURE__ */ jsx("div", {
							style: meta,
							children: "总占用"
						}), /* @__PURE__ */ jsx("div", {
							style: metricValueStyle,
							children: formatBytes(typeof state.data.totalBytes === "number" ? state.data.totalBytes : 0)
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: metricStyle,
						children: [/* @__PURE__ */ jsx("div", {
							style: meta,
							children: "最近活跃"
						}), /* @__PURE__ */ jsx("div", {
							style: {
								...metricValueStyle,
								fontSize: 13
							},
							children: relativeTime(typeof state.data.lastActiveAt === "string" ? state.data.lastActiveAt : null)
						})]
					})
				]
			}),
			byDay.length > 0 ? /* @__PURE__ */ jsx("div", {
				style: chartStyle,
				role: "img",
				"aria-label": "近 14 天每日会话数",
				children: byDay.map((d) => {
					const count = Number(d.count ?? 0);
					const h = maxCount > 0 ? Math.max(4, count / maxCount * 100) : 0;
					return /* @__PURE__ */ jsx("span", {
						style: {
							...barStyle,
							height: `${h}%`
						},
						title: `${String(d.date)}：${count} 会话 · ${formatBytes(Number(d.bytes ?? 0))}`
					}, String(d.date));
				})
			}) : null,
			largest.length > 0 ? /* @__PURE__ */ jsxs("table", {
				style: tableStyle,
				children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("th", {
					style: {
						...tdStyle,
						color: "var(--openloop-muted-foreground)",
						fontWeight: 600,
						background: "var(--openloop-surface-muted)"
					},
					children: "最大占用"
				}), /* @__PURE__ */ jsx("th", {
					style: {
						...tdStyle,
						color: "var(--openloop-muted-foreground)",
						fontWeight: 600,
						textAlign: "right",
						background: "var(--openloop-surface-muted)"
					},
					children: "大小"
				})] }) }), /* @__PURE__ */ jsx("tbody", { children: largest.map((l) => /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("td", {
					style: {
						...tdStyle,
						...monoStyle
					},
					children: truncate(String(l.name ?? ""), 56)
				}), /* @__PURE__ */ jsx("td", {
					style: {
						...tdStyle,
						textAlign: "right",
						fontVariantNumeric: "tabular-nums"
					},
					children: formatBytes(Number(l.bytes ?? 0))
				})] }, String(l.name))) })]
			}) : null
		] })]
	});
}
//#endregion
//#region src/presets/sessions-stats/index.ts
const sessionsStatsPreset = {
	kind: "sessions-stats",
	schema: sessionsStatsSchema,
	validate: validateSessionsStats,
	Render: SessionsStatsRender
};
//#endregion
//#region src/presets/sparkline/schema.ts
/**
* sparkline props JSON Schema。
* series 必填数值数组（2–120）；chart-1 着色；手绘 SVG polyline（零图表库）。
* extremes 为可选的最小/最大值标注。
*/
const sparklineSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		label: {
			type: "string",
			maxLength: 80,
			description: "左侧标签文案，≤80 字符"
		},
		value: {
			type: ["number", "string"],
			description: "可选的当前值展示（大数字），不参与折线计算"
		},
		series: {
			type: "array",
			minItems: 2,
			maxItems: 120,
			description: "折线数据点，2–120 个有限数字",
			items: { type: "number" }
		},
		extremes: {
			type: "boolean",
			description: "为 true 时在 SVG 内标注最小/最大值（可省）"
		}
	},
	required: ["series"]
};
//#endregion
//#region src/presets/sparkline/validate.ts
/**
* sparkline 校验（fail-closed）。
* - series 必填数组 2–120，元素必须为有限数字
* - label ≤80 字符；value 为数字或字符串；extremes 为布尔
*/
function validateSparkline(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "sparkline props 必须是 JSON 对象")]);
	const errors = [];
	if (root.label !== void 0 && (typeof root.label !== "string" || root.label.length > 80)) errors.push(error("label", "label 必须是 ≤80 字符的字符串"));
	if (root.value !== void 0 && !isFiniteNumber(root.value) && typeof root.value !== "string") errors.push(error("value", "value 必须是数字或字符串"));
	if (root.extremes !== void 0 && typeof root.extremes !== "boolean") errors.push(error("extremes", "extremes 必须是布尔值"));
	if (!Array.isArray(root.series)) {
		errors.push(error("series", "series 必填，必须是 2–120 项的数值数组"));
		return validationFail(errors);
	}
	if (root.series.length < 2 || root.series.length > 120) errors.push(error("series", `series 长度必须为 2–120，当前 ${root.series.length}`));
	root.series.forEach((entry, index) => {
		if (!isFiniteNumber(entry)) errors.push(error(`series[${index}]`, `series[${index}] 必须是有限数字，当前 ${JSON.stringify(entry)}`));
	});
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/sparkline/Render.tsx
const VIEW_W = 160;
const VIEW_H = 40;
const containerStyle = {
	...panel,
	padding: "10px 12px",
	display: "flex",
	alignItems: "center",
	gap: 12,
	minWidth: 0
};
const textBlockStyle = {
	minWidth: 0,
	flex: 1
};
const valueStyle = {
	...numeric,
	fontSize: 18,
	lineHeight: 1.3,
	fontWeight: 650,
	color: "var(--openloop-foreground)",
	wordBreak: "break-word"
};
function compactTick(value) {
	return new Intl.NumberFormat(void 0, {
		notation: "compact",
		maximumFractionDigits: 1
	}).format(value);
}
function SparklineRender({ props }) {
	const root = asRecord(props) ?? {};
	const label = typeof root.label === "string" ? root.label : void 0;
	const displayValue = root.value;
	const showExtremes = root.extremes === true;
	const values = (Array.isArray(root.series) ? root.series : []).map(Number).filter(Number.isFinite).slice(0, 120);
	if (values.length === 0) return /* @__PURE__ */ jsx("div", {
		"data-openloop-preset": "sparkline",
		"data-openloop-count": "0",
		style: {
			...panel,
			padding: "12px 14px"
		},
		children: /* @__PURE__ */ jsx("div", {
			style: meta,
			children: "暂无数据"
		})
	});
	const min = Math.min(...values);
	const max = Math.max(...values);
	const extent = max - min || 1;
	const points = values.map((value, index) => {
		const x = 4 + index / (values.length - 1) * 152;
		const y = 35 - (value - min) / extent * 30;
		return `${x.toFixed(2)},${y.toFixed(2)}`;
	}).join(" ");
	const hasText = label !== void 0 || displayValue !== void 0;
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "sparkline",
		"data-openloop-count": String(values.length),
		style: containerStyle,
		children: [hasText ? /* @__PURE__ */ jsxs("div", {
			style: textBlockStyle,
			children: [label !== void 0 ? /* @__PURE__ */ jsx("div", {
				style: meta,
				children: label
			}) : null, displayValue !== void 0 ? /* @__PURE__ */ jsx("div", {
				style: valueStyle,
				children: String(displayValue)
			}) : null]
		}) : null, /* @__PURE__ */ jsxs("svg", {
			viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
			style: {
				width: 140,
				height: 40,
				flexShrink: 0
			},
			role: "img",
			"aria-label": label ?? "sparkline",
			children: [/* @__PURE__ */ jsx("polyline", {
				points,
				fill: "none",
				stroke: "var(--openloop-chart-1)",
				strokeWidth: "3",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}), showExtremes ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("text", {
				x: "6",
				y: "14",
				fontSize: "9",
				fill: "var(--openloop-muted-foreground)",
				children: compactTick(max)
			}), /* @__PURE__ */ jsx("text", {
				x: "6",
				y: 31,
				fontSize: "9",
				fill: "var(--openloop-muted-foreground)",
				children: compactTick(min)
			})] }) : null]
		})]
	});
}
//#endregion
//#region src/presets/sparkline/index.ts
const sparklinePreset = {
	kind: "sparkline",
	schema: sparklineSchema,
	validate: validateSparkline,
	Render: SparklineRender
};
//#endregion
//#region src/presets/split/schema.ts
/**
* split props JSON Schema（两栏）。
* children 必填 1–2 个子 widget：第 1 个渲染左栏、第 2 个渲染右栏（2 个时 50/50 等宽）。
* gutter 栏间距 0–48（默认 12）。
*/
const splitSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		gutter: {
			type: "integer",
			minimum: 0,
			maximum: 48,
			description: "两栏间距（px），0–48，默认 12"
		},
		children: {
			type: "array",
			minItems: 1,
			maxItems: 2,
			description: "两栏子 widget（1–2 个）：每项为 WidgetUnit 形状 { id, source: { type: \"preset\", kind, props } }",
			items: { type: "object" }
		}
	},
	required: ["children"]
};
//#endregion
//#region src/presets/split/validate.ts
/**
* split 校验（fail-closed）：children 必填 1–2 项；gutter 整数 0–48；children 深校验。
*/
function validateSplit(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "split props 必须是 JSON 对象")]);
	const errors = [];
	if (!Array.isArray(root.children)) return validationFail([error("children", "children 必填，必须是 1–2 个子 widget 的数组（两栏）")]);
	if (root.children.length < 1 || root.children.length > 2) errors.push(error("children", `children 数量必须为 1–2（两栏），当前 ${root.children.length}`));
	if (root.gutter !== void 0 && (!isFiniteNumber(root.gutter) || !Number.isInteger(root.gutter) || root.gutter < 0 || root.gutter > 48)) errors.push(error("gutter", "gutter 必须是 0–48 的整数（px）"));
	errors.push(...validateChildren(root.children, "children", "split"));
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/split/Render.tsx
const pane = { minWidth: 0 };
function SplitRender({ props }) {
	const root = asRecord(props) ?? {};
	const gutter = isFiniteNumber(root.gutter) ? Math.max(0, Math.min(48, Math.trunc(root.gutter))) : 12;
	const children = Array.isArray(root.children) ? root.children : [];
	const left = children[0];
	const right = children[1];
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "split",
		"data-openloop-panes": right ? "2" : "1",
		style: {
			display: "grid",
			gridTemplateColumns: right ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
			gap: gutter
		},
		children: [left ? /* @__PURE__ */ jsx("div", {
			style: pane,
			children: /* @__PURE__ */ jsx(WidgetView, { widget: left })
		}) : null, right ? /* @__PURE__ */ jsx("div", {
			style: pane,
			children: /* @__PURE__ */ jsx(WidgetView, { widget: right })
		}) : null]
	});
}
//#endregion
//#region src/presets/split/index.ts
const splitPreset = {
	kind: "split",
	schema: splitSchema,
	validate: validateSplit,
	Render: SplitRender
};
//#endregion
//#region src/presets/stack/schema.ts
/**
* stack props JSON Schema。
* direction vertical/horizontal（默认 vertical）；gap 0–48（默认 8）；align 交叉轴对齐；children 0–12。
*/
const stackSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		direction: {
			enum: ["vertical", "horizontal"],
			description: "主轴方向，默认 vertical"
		},
		gap: {
			type: "integer",
			minimum: 0,
			maximum: 48,
			description: "子组件间距（px），0–48，默认 8"
		},
		align: {
			enum: [
				"start",
				"center",
				"end",
				"stretch"
			],
			description: "交叉轴对齐，默认 start"
		},
		children: {
			type: "array",
			maxItems: 12,
			description: "子 widget 列表（0–12）：每项为 WidgetUnit 形状 { id, source: { type: \"preset\", kind, props } }",
			items: { type: "object" }
		}
	}
};
//#endregion
//#region src/presets/stack/validate.ts
/**
* stack 校验（fail-closed）：direction/gap/align 枚举与范围；children 深校验。
*/
const DIRECTIONS = ["vertical", "horizontal"];
const ALIGNS$1 = [
	"start",
	"center",
	"end",
	"stretch"
];
function validateStack(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "stack props 必须是 JSON 对象")]);
	const errors = [];
	if (root.direction !== void 0 && !DIRECTIONS.includes(String(root.direction))) errors.push(error("direction", "direction 必须是 vertical / horizontal 之一"));
	if (root.gap !== void 0 && (!isFiniteNumber(root.gap) || !Number.isInteger(root.gap) || root.gap < 0 || root.gap > 48)) errors.push(error("gap", "gap 必须是 0–48 的整数（px）"));
	if (root.align !== void 0 && !ALIGNS$1.includes(String(root.align))) errors.push(error("align", "align 必须是 start / center / end / stretch 之一"));
	errors.push(...validateChildren(root.children, "children", "stack"));
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/stack/Render.tsx
const ALIGN_MAP = {
	start: "flex-start",
	center: "center",
	end: "flex-end",
	stretch: "stretch"
};
function StackRender({ props }) {
	const root = asRecord(props) ?? {};
	const direction = root.direction === "horizontal" ? "horizontal" : "vertical";
	const gap = isFiniteNumber(root.gap) ? Math.max(0, Math.min(48, Math.trunc(root.gap))) : 8;
	const align = ALIGN_MAP[String(root.align)] ?? "flex-start";
	const children = Array.isArray(root.children) ? root.children : [];
	return /* @__PURE__ */ jsx("div", {
		"data-openloop-preset": "stack",
		"data-openloop-direction": direction,
		"data-openloop-gap": String(gap),
		style: {
			display: "flex",
			flexDirection: direction === "horizontal" ? "row" : "column",
			gap,
			alignItems: align,
			minWidth: 0
		},
		children: renderChildren(children)
	});
}
//#endregion
//#region src/presets/stack/index.ts
const stackPreset = {
	kind: "stack",
	schema: stackSchema,
	validate: validateStack,
	Render: StackRender
};
//#endregion
//#region src/presets/storage-usage/schema.ts
/**
* storage-usage props JSON Schema：title ≤80 / autoRefreshMs ≥10s（共享规则）。
*/
const storageUsageSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 80,
			description: "面板标题，≤80 字符，可省略（默认「DSH 存储占用」）"
		},
		autoRefreshMs: {
			type: "integer",
			minimum: 1e4,
			maximum: 36e5,
			description: "自动刷新间隔（毫秒），≥10000，缺省不自动刷新"
		}
	}
};
//#endregion
//#region src/presets/storage-usage/validate.ts
/**
* storage-usage 校验（fail-closed）：共享规则（title ≤80 / autoRefreshMs）。
*/
function validateStorageUsage(props) {
	return validateLocalPresetProps("storage-usage", props);
}
//#endregion
//#region src/presets/storage-usage/Render.tsx
const headerStyle$1 = {
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 8,
	padding: "10px 14px",
	borderBottom: "1px solid var(--openloop-border)",
	flexWrap: "wrap"
};
const rowsStyle = {
	display: "flex",
	flexDirection: "column",
	gap: 8,
	padding: "12px 14px"
};
const rowStyle = {
	display: "grid",
	gridTemplateColumns: "minmax(70px, auto) 1fr minmax(64px, auto)",
	alignItems: "center",
	gap: 10,
	fontSize: 12
};
const barTrackStyle = {
	height: 6,
	borderRadius: 3,
	background: "var(--openloop-surface-muted)",
	overflow: "hidden"
};
const labelStyle = {
	color: "var(--openloop-foreground)",
	fontFamily: "var(--openloop-font-mono, ui-monospace, \"SF Mono\", Menlo, monospace)",
	fontSize: 11.5,
	whiteSpace: "nowrap"
};
const bytesStyle = {
	color: "var(--openloop-muted-foreground)",
	textAlign: "right",
	fontVariantNumeric: "tabular-nums"
};
const placeholderStyle = {
	padding: "22px 14px",
	textAlign: "center",
	color: "var(--openloop-muted-foreground)",
	fontSize: 12,
	lineHeight: 1.7
};
const ENTRIES_MAX = 12;
function StorageUsageRender({ props }) {
	const record = asRecord(props) ?? {};
	const state = useAppEndpoint("/openloop/app/storage-usage", typeof record.autoRefreshMs === "number" ? record.autoRefreshMs : void 0);
	const headerTitle = typeof record.title === "string" && record.title.length > 0 ? record.title : "DSH 存储占用";
	const entries = (state.data?.entries ?? []).filter((e) => typeof e.bytes === "number").slice(0, ENTRIES_MAX);
	const maxBytes = entries.reduce((m, e) => Math.max(m, Number(e.bytes ?? 0)), 0);
	const totalBytes = typeof state.data?.totalBytes === "number" ? state.data.totalBytes : 0;
	const home = typeof state.data?.home === "string" ? state.data.home : "";
	return /* @__PURE__ */ jsxs("div", {
		style: panel,
		"data-openloop-preset": "storage-usage",
		children: [/* @__PURE__ */ jsxs("div", {
			style: headerStyle$1,
			children: [/* @__PURE__ */ jsx("span", {
				style: title,
				children: headerTitle
			}), /* @__PURE__ */ jsx("span", {
				style: meta,
				title: home,
				children: totalBytes > 0 ? `${formatBytes(totalBytes)} · ${truncate(home, 48)}` : ""
			})]
		}), state.unavailable ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle,
			children: [
				"本地应用后端未启用",
				/* @__PURE__ */ jsx("br", {}),
				/* @__PURE__ */ jsx("span", {
					style: meta,
					children: "安装并激活 @openloop/dsh-app 插件后可查看存储占用"
				})
			]
		}) : state.error !== void 0 ? /* @__PURE__ */ jsxs("div", {
			style: placeholderStyle,
			children: ["存储统计读取失败：", state.error]
		}) : state.loading || state.data === void 0 ? /* @__PURE__ */ jsx("div", {
			style: placeholderStyle,
			children: "统计中…"
		}) : /* @__PURE__ */ jsx("div", {
			style: rowsStyle,
			children: entries.map((e) => {
				const bytes = Number(e.bytes ?? 0);
				const pct = maxBytes > 0 ? Math.max(1.5, bytes / maxBytes * 100) : 0;
				return /* @__PURE__ */ jsxs("div", {
					style: rowStyle,
					title: String(e.path ?? ""),
					children: [
						/* @__PURE__ */ jsx("span", {
							style: labelStyle,
							children: truncate(String(e.label ?? ""), 18)
						}),
						/* @__PURE__ */ jsx("span", {
							style: barTrackStyle,
							children: /* @__PURE__ */ jsx("span", { style: {
								display: "block",
								width: `${pct}%`,
								height: "100%",
								background: "var(--openloop-chart-1)",
								borderRadius: 3
							} })
						}),
						/* @__PURE__ */ jsx("span", {
							style: bytesStyle,
							children: formatBytes(bytes)
						})
					]
				}, `${String(e.label)}`);
			})
		})]
	});
}
//#endregion
//#region src/presets/storage-usage/index.ts
const storageUsagePreset = {
	kind: "storage-usage",
	schema: storageUsageSchema,
	validate: validateStorageUsage,
	Render: StorageUsageRender
};
//#endregion
//#region src/presets/tag/schema.ts
/**
* tag props JSON Schema。
* label 必填 1–80；tone 六档（默认 neutral）；tag 为描边型（背景透明 + tone 色边框）。
*/
const tagSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		label: {
			type: "string",
			minLength: 1,
			maxLength: 80,
			description: "标签文本，1–80 字符"
		},
		tone: {
			enum: [
				"neutral",
				"primary",
				"info",
				"success",
				"warning",
				"error"
			],
			description: "标签语气，默认 neutral；描边型胶囊，边框+文字用 tone 色"
		}
	},
	required: ["label"]
};
//#endregion
//#region src/presets/tag/validate.ts
/**
* tag 校验（fail-closed）：label 必填 1–80；tone 六档枚举。
*/
function validateTag(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "tag props 必须是 JSON 对象")]);
	const errors = [];
	if (!isNonEmptyString(root.label)) errors.push(error("label", "label 必填，必须是非空字符串（1–80 字符）"));
	else if (root.label.length > 80) errors.push(error("label", `label 长度不得超过 80 字符，当前 ${root.label.length}`));
	if (root.tone !== void 0 && !isBadgeTone(root.tone)) errors.push(error("tone", "tone 必须是 neutral / primary / info / success / warning / error 之一"));
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/tag/Render.tsx
const pill = {
	display: "inline-flex",
	alignItems: "center",
	gap: 4,
	padding: "1px 9px",
	borderRadius: "var(--openloop-radius-md)",
	fontSize: "var(--openloop-type-micro, 11px)",
	fontWeight: 500,
	lineHeight: 1.6,
	whiteSpace: "nowrap",
	background: "transparent"
};
function TagRender({ props }) {
	const root = asRecord(props) ?? {};
	const label = typeof root.label === "string" ? root.label : "";
	const tone = isBadgeTone(root.tone) ? root.tone : "neutral";
	const colors = toneColors(tone);
	return /* @__PURE__ */ jsx("span", {
		"data-openloop-preset": "tag",
		"data-openloop-tone": tone,
		style: {
			...pill,
			border: `1px solid ${colors.border}`,
			color: colors.foreground
		},
		children: label
	});
}
//#endregion
//#region src/presets/tag/index.ts
const tagPreset = {
	kind: "tag",
	schema: tagSchema,
	validate: validateTag,
	Render: TagRender
};
//#endregion
//#region src/presets/text/schema.ts
/**
* text props JSON Schema（plain 文本）。
* text 必填 1–5000 字符；size 映射全局字阶（xs→micro…xl→display）；tone 映射前景档。
*/
const textSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		text: {
			type: "string",
			minLength: 1,
			maxLength: 5e3,
			description: "正文文本，1–5000 字符，保留换行"
		},
		size: {
			enum: [
				"xs",
				"sm",
				"md",
				"lg",
				"xl"
			],
			description: "字阶：xs=micro / sm=meta / md=label（默认）/ lg=title / xl=display"
		},
		tone: {
			enum: [
				"default",
				"muted",
				"subtle",
				"strong"
			],
			description: "前景档：default=foreground / muted=muted-foreground / subtle=foreground-subtle / strong=foreground-strong"
		},
		align: {
			enum: [
				"left",
				"center",
				"right"
			],
			description: "文本对齐，默认 left"
		}
	},
	required: ["text"]
};
//#endregion
//#region src/presets/text/validate.ts
/**
* text 校验（fail-closed）：text 必填 1–5000；size/tone/align 枚举。
*/
const SIZES = [
	"xs",
	"sm",
	"md",
	"lg",
	"xl"
];
const TONES = [
	"default",
	"muted",
	"subtle",
	"strong"
];
const ALIGNS = [
	"left",
	"center",
	"right"
];
function validateText(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "text props 必须是 JSON 对象")]);
	const errors = [];
	if (!isNonEmptyString(root.text)) errors.push(error("text", "text 必填，必须是非空字符串（1–5000 字符）"));
	else if (root.text.length > 5e3) errors.push(error("text", `text 长度不得超过 5000 字符，当前 ${root.text.length}`));
	if (root.size !== void 0 && !SIZES.includes(String(root.size))) errors.push(error("size", "size 必须是 xs / sm / md / lg / xl 之一"));
	if (root.tone !== void 0 && !TONES.includes(String(root.tone))) errors.push(error("tone", "tone 必须是 default / muted / subtle / strong 之一"));
	if (root.align !== void 0 && !ALIGNS.includes(String(root.align))) errors.push(error("align", "align 必须是 left / center / right 之一"));
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/text/Render.tsx
const TONE_COLOR = {
	default: "var(--openloop-foreground)",
	muted: "var(--openloop-muted-foreground)",
	subtle: "var(--openloop-foreground-subtle, var(--openloop-muted-foreground))",
	strong: "var(--openloop-foreground-strong, var(--openloop-foreground))"
};
const base = {
	whiteSpace: "pre-wrap",
	wordBreak: "break-word"
};
function TextRender({ props }) {
	const root = asRecord(props) ?? {};
	const text = typeof root.text === "string" ? root.text : "";
	const size = typeof root.size === "string" ? root.size : "md";
	const tone = typeof root.tone === "string" ? root.tone : "default";
	const align = typeof root.align === "string" ? root.align : "left";
	const style = {
		...base,
		...textSizeStyle(size),
		color: TONE_COLOR[tone] ?? TONE_COLOR.default,
		textAlign: align
	};
	return /* @__PURE__ */ jsx("div", {
		"data-openloop-preset": "text",
		"data-openloop-size": size,
		"data-openloop-tone": tone,
		style,
		children: text
	});
}
//#endregion
//#region src/presets/text/index.ts
const textPreset = {
	kind: "text",
	schema: textSchema,
	validate: validateText,
	Render: TextRender
};
//#endregion
//#region src/presets/timeline/schema.ts
/**
* timeline props JSON Schema。
* 移植自 declarative document.ts TimelineDocument：items 2–16，id 唯一，
* status 限 past/current/future 三态（省略时渲染器按首项 current、其余 future 兜底）。
*/
const timelineSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	additionalProperties: false,
	properties: {
		title: {
			type: "string",
			maxLength: 120,
			description: "时间线标题，≤120 字符，可省略"
		},
		description: {
			type: "string",
			maxLength: 360,
			description: "一句话说明该时间线，≤360 字符，可省略"
		},
		items: {
			type: "array",
			minItems: 2,
			maxItems: 16,
			description: "时间线条目，2–16 个，按顺序渲染，id 必须唯一",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						type: "string",
						minLength: 1,
						maxLength: 40,
						description: "条目 id，非空且全局唯一"
					},
					title: {
						type: "string",
						minLength: 1,
						maxLength: 80,
						description: "条目标题，1–80 字符"
					},
					detail: {
						type: "string",
						maxLength: 240,
						description: "条目补充说明，≤240 字符，可省略"
					},
					status: {
						enum: [
							"past",
							"current",
							"future"
						],
						description: "条目状态；省略时首项视为 current、其余 future"
					},
					time: {
						type: "string",
						maxLength: 40,
						description: "左侧时间标注（如 09:30 / 周一），≤40 字符，可省略"
					}
				},
				required: ["id", "title"]
			}
		}
	},
	required: ["items"]
};
//#endregion
//#region src/presets/timeline/validate.ts
/**
* timeline 校验（fail-closed）。
* 移植自 declarative document.ts validateTimeline：
* - items 2–16，id 唯一非空，title 必填非空
* - status 限 past / current / future
*/
const STATUSES = [
	"past",
	"current",
	"future"
];
function validateTimeline(props) {
	const root = asRecord(props);
	if (!root) return validationFail([error("$", "timeline props 必须是 JSON 对象")]);
	const errors = [];
	if (root.title !== void 0 && (typeof root.title !== "string" || root.title.length > 120)) errors.push(error("title", "title 必须是 ≤120 字符的字符串"));
	if (root.description !== void 0 && (typeof root.description !== "string" || root.description.length > 360)) errors.push(error("description", "description 必须是 ≤360 字符的字符串"));
	if (!Array.isArray(root.items)) {
		errors.push(error("items", "items 必填，必须是 2–16 个条目的数组"));
		return validationFail(errors);
	}
	if (root.items.length < 2 || root.items.length > 16) errors.push(error("items", `items 数量必须为 2–16，当前 ${root.items.length}`));
	const seen = /* @__PURE__ */ new Set();
	root.items.forEach((raw, index) => {
		const path = `items[${index}]`;
		const item = asRecord(raw);
		if (!item) {
			errors.push(error(path, "每个条目必须是 JSON 对象"));
			return;
		}
		if (!isNonEmptyString(item.id)) errors.push(error(`${path}.id`, "id 必填，必须是非空字符串"));
		else if (seen.has(item.id)) errors.push(error(`${path}.id`, `条目 id "${item.id}" 重复，items 内 id 必须唯一`));
		else seen.add(item.id);
		if (!isNonEmptyString(item.title)) errors.push(error(`${path}.title`, "title 必填，必须是非空字符串（1–80 字符）"));
		else if (item.title.length > 80) errors.push(error(`${path}.title`, `title 长度不得超过 80 字符，当前 ${item.title.length}`));
		if (item.detail !== void 0 && (typeof item.detail !== "string" || item.detail.length > 240)) errors.push(error(`${path}.detail`, "detail 必须是 ≤240 字符的字符串"));
		if (item.status !== void 0 && !STATUSES.includes(String(item.status))) errors.push(error(`${path}.status`, "status 必须是 past / current / future 之一"));
		if (item.time !== void 0 && (typeof item.time !== "string" || item.time.length > 40)) errors.push(error(`${path}.time`, "time 必须是 ≤40 字符的字符串"));
	});
	return errors.length > 0 ? validationFail(errors) : validationOk();
}
//#endregion
//#region src/presets/timeline/Render.tsx
const headerStyle = {
	padding: "10px 12px",
	borderBottom: "1px solid var(--openloop-border)"
};
const listStyle = {
	listStyle: "none",
	margin: 0,
	padding: "14px 14px 16px"
};
const itemStyle = {
	display: "grid",
	gridTemplateColumns: "72px 18px minmax(0, 1fr)",
	columnGap: 10,
	minHeight: 60
};
const timeStyle = {
	...micro,
	textAlign: "right",
	paddingTop: 2
};
const railStyle = {
	position: "relative",
	display: "flex",
	justifyContent: "center"
};
const railLineStyle = {
	position: "absolute",
	top: 14,
	bottom: -2,
	width: 1,
	background: "var(--openloop-border)"
};
const contentStyle = {
	paddingBottom: 16,
	minWidth: 0
};
function dotStyle(status) {
	const active = status === "current";
	return {
		position: "relative",
		width: active ? 13 : 9,
		height: active ? 13 : 9,
		marginTop: active ? 1 : 3,
		borderRadius: 999,
		background: status === "current" ? "var(--openloop-primary)" : status === "past" ? "var(--openloop-success)" : "var(--openloop-border)",
		boxShadow: active ? "0 0 0 4px var(--openloop-primary-tint)" : void 0
	};
}
function TimelineRender({ props }) {
	const root = asRecord(props) ?? {};
	const panelTitle = typeof root.title === "string" ? root.title : void 0;
	const description = typeof root.description === "string" ? root.description : void 0;
	const items = (Array.isArray(root.items) ? root.items : []).slice(0, 16).map((raw, index) => {
		const item = asRecord(raw) ?? {};
		return {
			id: isNonEmptyString(item.id) ? item.id : `item-${index}`,
			title: typeof item.title === "string" ? item.title : `条目 ${index + 1}`,
			detail: typeof item.detail === "string" ? item.detail : void 0,
			status: item.status === "past" || item.status === "current" || item.status === "future" ? item.status : void 0,
			time: typeof item.time === "string" ? item.time : void 0
		};
	});
	if (items.length === 0) return /* @__PURE__ */ jsx("div", {
		"data-openloop-preset": "timeline",
		"data-openloop-count": "0",
		style: {
			...panel,
			padding: "12px 14px"
		},
		children: /* @__PURE__ */ jsx("div", {
			style: meta,
			children: "暂无时间线数据"
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		"data-openloop-preset": "timeline",
		"data-openloop-count": String(items.length),
		style: {
			...panel,
			overflow: "hidden",
			padding: 0
		},
		children: [panelTitle !== void 0 || description !== void 0 ? /* @__PURE__ */ jsxs("div", {
			style: headerStyle,
			children: [panelTitle !== void 0 ? /* @__PURE__ */ jsx("div", {
				style: title,
				children: panelTitle
			}) : null, description !== void 0 ? /* @__PURE__ */ jsx("div", {
				style: {
					...meta,
					marginTop: 3
				},
				children: description
			}) : null]
		}) : null, /* @__PURE__ */ jsx("ol", {
			style: listStyle,
			children: items.map((item, index) => {
				const status = item.status ?? (index === 0 ? "current" : "future");
				const active = status === "current";
				return /* @__PURE__ */ jsxs("li", {
					style: itemStyle,
					"data-openloop-status": status,
					children: [
						/* @__PURE__ */ jsx("div", {
							style: timeStyle,
							children: item.time
						}),
						/* @__PURE__ */ jsxs("div", {
							style: railStyle,
							children: [index < items.length - 1 ? /* @__PURE__ */ jsx("div", { style: railLineStyle }) : null, /* @__PURE__ */ jsx("div", {
								style: dotStyle(status),
								"aria-hidden": "true"
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							style: contentStyle,
							children: [/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: 13,
									lineHeight: 1.4,
									fontWeight: active ? 650 : 560,
									color: "var(--openloop-foreground)",
									wordBreak: "break-word"
								},
								children: item.title
							}), item.detail !== void 0 ? /* @__PURE__ */ jsx("div", {
								style: {
									...meta,
									marginTop: 3
								},
								children: item.detail
							}) : null]
						})
					]
				}, item.id);
			})
		})]
	});
}
//#endregion
//#region src/presets/index.ts
const registry = {
	"metric-grid": metricGridPreset,
	"data-table": dataTablePreset,
	progress: progressPreset,
	sparkline: sparklinePreset,
	callout: calloutPreset,
	accordion: accordionPreset,
	chart: chartPreset,
	gauge: gaugePreset,
	funnel: funnelPreset,
	heatmap: heatmapPreset,
	text: textPreset,
	markdown: markdownPreset,
	heading: headingPreset,
	badge: badgePreset,
	tag: tagPreset,
	divider: dividerPreset,
	avatar: avatarPreset,
	card: cardPreset,
	section: sectionPreset,
	stack: stackPreset,
	grid: gridPreset,
	row: rowPreset,
	split: splitPreset,
	flow: flowPreset,
	timeline: {
		kind: "timeline",
		schema: timelineSchema,
		validate: validateTimeline,
		Render: TimelineRender
	},
	comparison: comparisonPreset,
	"pb-stats": pbStatsPreset,
	"db-browser": dbBrowserPreset,
	"storage-usage": storageUsagePreset,
	"api-credentials": apiCredentialsPreset,
	"sessions-stats": sessionsStatsPreset,
	"mcp-status": mcpStatusPreset,
	"plugin-registry": pluginRegistryPreset,
	"app-manager": appManagerPreset,
	"api-usage-monitor": apiUsageMonitorPreset,
	"system-overview": systemOverviewPreset,
	"event-log": eventLogPreset,
	"agent-activity": agentActivityPreset
};
/** 取预设模块；未实现/未知 kind 返回 undefined */
function getPreset(kind) {
	return registry[kind];
}
//#endregion
//#region ../base/lib/server/index.js
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
const DEFAULT_TIMEOUT_MS$1 = 1e4;
/** 超时上限（30s） */
const MAX_TIMEOUT_MS$1 = 3e4;
/** 响应体大小上限（1MB） */
const MAX_RESPONSE_BYTES$1 = 1048576;
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
/** 归一化 timeoutMs：缺省 10s；超上限 clamp 30s；非法值回退默认 */
function normalizeTimeoutMs(timeoutMs) {
	if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs <= 0) return DEFAULT_TIMEOUT_MS$1;
	return Math.min(timeoutMs, MAX_TIMEOUT_MS$1);
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
async function readBodyBytes(stream, maxBytes = MAX_RESPONSE_BYTES$1) {
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
//#endregion
//#region src/validation.ts
/** §6.1 预设组件 kind 全清单（运行时白名单，与 contract.ts 的 PresetKind 类型逐字对齐） */
const PRESET_KINDS = [
	"text",
	"markdown",
	"heading",
	"badge",
	"tag",
	"divider",
	"avatar",
	"card",
	"section",
	"stack",
	"grid",
	"row",
	"split",
	"scroll-area",
	"metric",
	"metric-grid",
	"data-table",
	"list",
	"key-value",
	"stat",
	"rating",
	"empty-state",
	"timeline",
	"chart",
	"sparkline",
	"gauge",
	"funnel",
	"heatmap",
	"flow",
	"comparison",
	"steps",
	"tree",
	"callout",
	"status",
	"progress",
	"skeleton",
	"tabs",
	"accordion",
	"pagination",
	"tooltip"
];
/** §12 外部组件包注册表（S0 尚未接入 packs，默认全空；接入时经 registerPack 填充） */
const packRegistry$1 = /* @__PURE__ */ new Map();
/** 注册一个外部组件包及其可用 component 名（§12.1 manifest.components 的键） */
function registerPack$1(pack, components) {
	if (!pack || !components.length) throw new Error("registerPack requires a non-empty pack name and at least one component");
	packRegistry$1.set(pack, new Set(components));
}
/** 查询 pack 是否已注册且含指定 component（未注册返回 false，fail-closed） */
function isPackComponent(pack, component) {
	return packRegistry$1.get(pack)?.has(component) ?? false;
}
/** custom code 禁词表（§5.4 / §8.3）：静态扫描命中即拒，CSP 是主防线、这里是纵深防御 */
const FORBIDDEN_CUSTOM_CODE_TERMS = [
	"import",
	"require",
	"fetch",
	"XMLHttpRequest",
	"WebSocket",
	"eval",
	"document.cookie",
	"localStorage",
	"sessionStorage",
	"window.parent",
	"top."
];
/** custom code 大小上限（§5.4） */
const CUSTOM_CODE_MAX_BYTES = 32768;
/** 扫描 custom code 是否命中禁词；命中返回命中的词，否则返回 undefined */
function forbiddenCustomCodeTerm(code) {
	const lowered = code.toLowerCase();
	for (const term of FORBIDDEN_CUSTOM_CODE_TERMS) if (lowered.includes(term)) return term;
}
/** 校验 api source（§5.2 / §5.4）：必须 https://，且不指向环回/内网（§15 S3） */
function validateApiSource(url, widgetId) {
	let parsed;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error(`panel widget "${widgetId}" api source URL "${url}" is not a valid URL; pass an absolute https:// URL`);
	}
	if (parsed.protocol !== "https:") throw new Error(`panel widget "${widgetId}" api source URL "${url}" must use https:// (insecure http:// is rejected in v1)`);
	if (isForbiddenApiUrl(url)) throw new Error(`panel widget "${widgetId}" api source URL "${url}" points to a loopback/private address, which is forbidden (SSRF guard); use a public https:// endpoint`);
}
/** 校验单个 widget 的数据绑定（§5.2 / §5.4） */
function validateDataBinding(widgetId, data) {
	if (typeof data !== "object" || data === null) throw new Error(`panel widget "${widgetId}" data binding must be an object`);
	const binding = data;
	const source = binding.source;
	if (typeof source !== "object" || source === null) throw new Error(`panel widget "${widgetId}" data binding requires a source object`);
	const sourceRecord = source;
	if (sourceRecord.pick !== void 0) throw new Error(`panel widget "${widgetId}" data binding: pick belongs on the binding (sibling of source), not inside source — move it to data.pick`);
	if (binding.pick !== void 0 && typeof binding.pick !== "string") throw new Error(`panel widget "${widgetId}" data binding pick must be a string like "items[0].total"`);
	if (sourceRecord.type === "api") {
		const api = sourceRecord;
		if (typeof api.url !== "string" || api.url.length === 0) throw new Error(`panel widget "${widgetId}" api source requires a non-empty url string`);
		if (typeof api.timeoutMs === "number" && api.timeoutMs > 3e4) throw new Error(`panel widget "${widgetId}" api source timeoutMs must be at most 30_000`);
		if (api.headers !== void 0 && typeof api.headers === "object" && api.headers !== null) {
			for (const key of Object.keys(api.headers)) if (key.toLowerCase() === "authorization") throw new Error(`panel widget "${widgetId}" api source must not pass an Authorization header in plain text; panel datasources are public https-only and must not send credentials through DSH`);
		}
		validateApiSource(api.url, widgetId);
	} else if (sourceRecord.type !== "static") throw new Error(`panel widget "${widgetId}" data binding source.type must be "static" or "api"`);
}
/** 校验单个 widget（§5.4 widget 级规则） */
function validateWidget(widget, widgetId, panelId, depth = 0) {
	if (typeof widget !== "object" || widget === null) throw new Error(`panel "${panelId}" widget "${widgetId}" must be an object`);
	if (depth > 2) throw new Error(`panel widget "${widgetId}" is nested too deep (max 2 levels of children)`);
	const record = widget;
	if (record.id !== widgetId) throw new Error(`panel "${panelId}" widget "${widgetId}" internal id mismatch`);
	if (record.data !== void 0) validateDataBinding(widgetId, record.data);
	if (record.refresh !== void 0) {
		if (typeof record.refresh !== "object" || record.refresh === null) throw new Error(`panel widget "${widgetId}" refresh policy must be an object`);
		const refresh = record.refresh;
		if (typeof refresh.intervalMs === "number" && refresh.intervalMs < 1e4) throw new Error(`panel widget "${widgetId}" refresh.intervalMs must be at least 10_000`);
	}
	const source = record.source;
	if (typeof source !== "object" || source === null) throw new Error(`panel widget "${widgetId}" requires a source object`);
	const sourceRecord = source;
	if (sourceRecord.type === "preset") {
		const kind = sourceRecord.kind;
		if (typeof kind !== "string" || !PRESET_KINDS.includes(kind)) throw new Error(`panel widget "${widgetId}" preset kind "${String(kind)}" is not in the preset whitelist; see §6.1 for the 40 supported kinds`);
		if (sourceRecord.props !== void 0 && (typeof sourceRecord.props !== "object" || sourceRecord.props === null)) throw new Error(`panel widget "${widgetId}" preset props must be an object`);
		if (sourceRecord.children !== void 0) throw new Error(`panel widget "${widgetId}" preset source must not carry children directly — children is a prop: move it into source.props.children`);
		const preset = getPreset(kind);
		if (preset) {
			const props = sourceRecord.props ?? {};
			const result = preset.validate(props);
			if (!result.ok) {
				const first = result.errors[0];
				throw new Error(`panel widget "${widgetId}" (${kind}) props validation failed: ${first ? `${first.path}: ${first.message}` : "unknown error"}`);
			}
			const children = props.children;
			if (Array.isArray(children)) children.forEach((child, index) => {
				validateWidget(child, typeof child?.id === "string" ? child.id : `${widgetId}.children[${index}]`, panelId, depth + 1);
			});
		}
	} else if (sourceRecord.type === "pack") {
		const pack = sourceRecord.pack;
		const component = sourceRecord.component;
		if (typeof pack !== "string" || pack.length === 0) throw new Error(`panel widget "${widgetId}" pack source requires a non-empty pack name`);
		if (typeof component !== "string" || component.length === 0) throw new Error(`panel widget "${widgetId}" pack source requires a non-empty component name`);
		if (!isPackComponent(pack, component)) throw new Error(`panel widget "${widgetId}" pack "${pack}" component "${component}" is not registered (S0 has no packs installed; use a preset or custom widget instead)`);
	} else if (sourceRecord.type === "custom") {
		const code = sourceRecord.code;
		if (typeof code !== "string") throw new Error(`panel widget "${widgetId}" custom source requires a string code field`);
		if (Buffer.byteLength(code, "utf8") > 32768) throw new Error(`panel widget "${widgetId}" custom code exceeds the ${CUSTOM_CODE_MAX_BYTES} byte limit`);
		const term = forbiddenCustomCodeTerm(code);
		if (term !== void 0) throw new Error(`panel widget "${widgetId}" custom code contains the forbidden term "${term}"; network/module/storage/DOM-escape access is not allowed in v1 (CSP enforces this too)`);
	} else throw new Error(`panel widget "${widgetId}" source.type must be "preset", "pack", or "custom"`);
}
/**
* §5.4 面板全量校验（fail-closed）。
* 校验通过后输入收敛为 PanelDefinition；任何非法形状/规则都以 Error 拒绝。
*/
function validatePanel(input) {
	if (typeof input !== "object" || input === null) throw new Error("panel must be a JSON object conforming to the openloop.panel/v1 contract");
	const panel = input;
	if (panel.$schema !== "openloop.panel/v1") throw new Error("panel $schema must be \"openloop.panel/v1\"");
	if (typeof panel.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(panel.id)) throw new Error("panel id must be a non-empty kebab-case string (lowercase letters, digits, and single hyphens)");
	if (typeof panel.title !== "string" || panel.title.trim().length === 0) throw new Error("panel title must be a non-empty string");
	if (panel.title.length > 120) throw new Error(`panel title is ${panel.title.length} characters; the maximum is 120`);
	if (panel.description !== void 0) {
		if (typeof panel.description !== "string") throw new Error("panel description must be a string");
		if (panel.description.length > 360) throw new Error(`panel description is ${panel.description.length} characters; the maximum is 360`);
	}
	if (!Array.isArray(panel.widgets)) throw new Error("panel widgets must be an array of widget units");
	if (panel.widgets.length < 1 || panel.widgets.length > 24) throw new Error(`panel widgets must contain 1-24 widgets; got ${panel.widgets.length}`);
	const seenIds = /* @__PURE__ */ new Set();
	for (const widget of panel.widgets) {
		if (typeof widget !== "object" || widget === null || typeof widget.id !== "string") throw new Error("every panel widget requires a string id");
		const widgetId = widget.id;
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(widgetId)) throw new Error(`panel widget id "${widgetId}" must be kebab-case (lowercase letters, digits, and single hyphens)`);
		if (seenIds.has(widgetId)) throw new Error(`panel widget id "${widgetId}" is duplicated; widget ids must be unique within a panel`);
		seenIds.add(widgetId);
	}
	if (panel.layout !== void 0) {
		if (typeof panel.layout !== "object" || panel.layout === null) throw new Error("panel layout must be an object");
		const layout = panel.layout;
		if (layout.mode !== void 0 && layout.mode !== "stack" && layout.mode !== "grid") throw new Error("panel layout.mode must be \"stack\" or \"grid\"");
		if (layout.columns !== void 0 && layout.columns !== 1 && layout.columns !== 2 && layout.columns !== 3) throw new Error("panel layout.columns must be 1, 2, or 3");
	}
	for (const widget of panel.widgets) validateWidget(widget, widget.id, panel.id);
}
//#endregion
//#region src/datasource.ts
/** 响应体大小上限（§15 S9：1MB） */
const MAX_RESPONSE_BYTES = 1048576;
/** 超时默认值 / 上限（§5.2：默认 10_000，上限 30_000） */
const DEFAULT_TIMEOUT_MS = 1e4;
const MAX_TIMEOUT_MS = 3e4;
/**
* 解析 pick 路径（v1：仅 a.b[0].c 形态）：`a.b[0].c` → ['a', 'b', 0, 'c']。
* 裸数字段转 number（数组索引），其余为字符串键。
*/
function parsePickPath(pick) {
	const segments = [];
	const pattern = /[^.\[\]]+/g;
	let match;
	while ((match = pattern.exec(pick)) !== null) {
		const raw = match[0];
		segments.push(/^\d+$/.test(raw) ? Number(raw) : raw);
	}
	return segments;
}
/**
* 按 pick 路径取值；缺路径/路径不存在返回 undefined（不抛错）。
* 段访问用 hasOwnProperty 防护，避免命中原型链（JSON.parse 产物亦安全）。
*/
function pickValue(data, pick) {
	if (!pick || pick.trim() === "") return data;
	let cursor = data;
	for (const segment of parsePickPath(pick)) {
		if (typeof cursor !== "object" || cursor === null) return void 0;
		if (typeof segment === "number") {
			if (!Array.isArray(cursor)) return void 0;
			cursor = cursor[segment];
		} else {
			const record = cursor;
			if (!Object.prototype.hasOwnProperty.call(record, segment)) return void 0;
			cursor = record[segment];
		}
	}
	return cursor;
}
/** 拼接 query 参数到 api url（原 url 已有 query 时合并） */
function buildApiUrl(url, query) {
	if (!query) return url;
	const parsed = new URL(url);
	for (const [key, value] of Object.entries(query)) parsed.searchParams.append(key, value);
	return parsed.toString();
}
/**
* api source URL 校验（§5.4 / §15 S3，fail-closed）：
* 必须 https://，且不指向环回/内网。复用 validation.ts 的 isForbiddenApiUrl。
*/
function validateApiUrl(url) {
	let parsed;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error(`api source URL "${url}" is not a valid URL; pass an absolute https:// URL`);
	}
	if (parsed.protocol !== "https:") throw new Error(`api source URL "${url}" must use https:// (insecure http:// is rejected in v1)`);
	if (isForbiddenApiUrl(url)) throw new Error(`api source URL "${url}" points to a loopback/private address, which is forbidden (SSRF guard); use a public https:// endpoint`);
}
function errorMessage$1(error) {
	return error instanceof Error ? error.message : String(error);
}
/** 超时/外部中止合并 signal；dispose 清理定时器与监听（防长驻进程泄漏） */
function createAbortHandle(timeoutMs, external) {
	const controller = new AbortController();
	if (external?.aborted) controller.abort();
	const onExternalAbort = () => controller.abort();
	if (external && !external.aborted) external.addEventListener("abort", onExternalAbort, { once: true });
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	let disposed = false;
	return {
		signal: controller.signal,
		dispose() {
			if (disposed) return;
			disposed = true;
			clearTimeout(timer);
			if (external) external.removeEventListener("abort", onExternalAbort);
		}
	};
}
/**
* 解析单个 widget 的数据绑定（§5.2 / §10）。
* static → 直接返回 value；api → 校验 URL → Node fetch（超时/1MB/仅 JSON）→ pick 取值。
* 校验失败抛错（消息面向 Agent 可自修正）；网络/解析失败同样抛错，由 resolvePanelData 统一隔离。
*/
async function resolveWidgetData(binding, ctx = {}) {
	const source = binding.source;
	if (source.type === "static") return source.value;
	if (source.type !== "api") {
		const actual = source.type;
		throw new Error(`data binding source.type must be "static" or "api"; got ${JSON.stringify(actual)}`);
	}
	validateApiUrl(source.url);
	if (source.headers) {
		for (const key of Object.keys(source.headers)) if (key.toLowerCase() === "authorization") throw new Error("api source must not pass an Authorization header in plain text; panel datasources are public https-only and must not send credentials through DSH");
	}
	const timeoutMs = normalizeTimeoutMs(source.timeoutMs);
	const url = buildApiUrl(source.url, source.query);
	const doFetch = ctx.fetchFn ?? fetch;
	const abort = createAbortHandle(timeoutMs, ctx.signal);
	const startedAt = Date.now();
	const record = (ok) => recordApiUsage(source.url, "panel-binding", ok, Date.now() - startedAt);
	try {
		const init = {
			method: source.method ?? "GET",
			headers: {},
			signal: abort.signal
		};
		if (source.headers) init.headers = { ...source.headers };
		if (source.method === "POST" && source.body !== void 0) {
			init.body = JSON.stringify(source.body);
			init.headers = {
				"content-type": "application/json",
				...source.headers ?? {}
			};
		}
		let response;
		try {
			response = await doFetch(url, init);
		} catch (error) {
			record(false);
			if (abort.signal.aborted) throw new Error(`api source timed out after ${timeoutMs}ms: ${url}`);
			throw new Error(`api source fetch failed: ${errorMessage$1(error)} (${url})`);
		}
		if (!response.ok) {
			record(false);
			const statusText = response.statusText ? ` ${response.statusText}` : "";
			throw new Error(`api source returned HTTP ${response.status}${statusText} for ${url}`);
		}
		const contentType = response.headers.get("content-type");
		const { bytes, truncated } = await readBodyBytes(response.body ?? new ReadableStream(), MAX_RESPONSE_BYTES);
		if (truncated) {
			record(false);
			throw new Error(`api source response exceeds the ${MAX_RESPONSE_BYTES} byte limit: ${url}`);
		}
		const parsed = parseJsonResponse(contentType, new TextDecoder().decode(bytes));
		record(true);
		return binding.pick !== void 0 ? pickValue(parsed, binding.pick) : parsed;
	} finally {
		abort.dispose();
	}
}
/**
* 解析面板全部 api widget 数据（§10）：并行 fetch（Promise.allSettled），
* 单格失败不拖垮整体——成功写入 resolved[widgetId]，失败写入 { __error: message }
* （约定见文件头注释；渲染端据此渲染错误占位）。
* 面板无 api widget 时返回空对象（与 §5.3 resolved 缺省语义一致）。
* ctx 透传给 resolveWidgetData（测试注入 fetchFn / 调用方取消 signal）。
*/
async function resolvePanelData(panel, ctx = {}) {
	const apiWidgets = panel.widgets.filter((widget) => widget.data?.source.type === "api");
	if (apiWidgets.length === 0) return {};
	const settled = await Promise.allSettled(apiWidgets.map((widget) => resolveWidgetData(widget.data, ctx)));
	const resolved = {};
	apiWidgets.forEach((widget, index) => {
		const result = settled[index];
		if (result?.status === "fulfilled") resolved[widget.id] = result.value;
		else {
			const reason = result?.status === "rejected" ? result.reason : void 0;
			resolved[widget.id] = { __error: `panel widget "${widget.id}" data resolve failed: ${errorMessage$1(reason)}` };
		}
	});
	return resolved;
}
//#endregion
//#region src/tool.ts
/**
* panel 工具定义（IMPL_NOTES §2 模式）。
* execute 先做 §5.4 全量校验（fail-closed），再组装 PanelMeta（§5.3）
* 经 output.presentationMeta 返回；client 端以 tool 名 'panel' 挂载渲染。
*/
function toJsonValue(value) {
	return value;
}
/** 工具名常量；与 client 注入 key（src/client/index.tsx）逐字一致 */
const PANEL_TOOL = "panel";
/** 工具参数 schema（PanelDefinition 形状；persist 为 §11 持久化开关；load 为按 id 唤起已存档面板） */
const PANEL_PARAMETERS = {
	panel: {
		oneOf: [{
			type: "object",
			additionalProperties: false,
			properties: {
				$schema: {
					type: "string",
					const: "openloop.panel/v1"
				},
				id: {
					type: "string",
					required: true,
					description: "kebab-case，面板内唯一；同 id 再调用 = 更新"
				},
				title: {
					type: "string",
					required: true
				},
				description: { type: "string" },
				layout: {
					type: "object",
					additionalProperties: true
				},
				widgets: {
					type: "array",
					required: true,
					description: "1–24 个 WidgetUnit"
				},
				persist: { type: "boolean" }
			}
		}, { type: "string" }],
		description: "A PanelDefinition (openloop.panel/v1). Strongly prefer passing the JSON object itself; a stringified JSON text is also accepted and will be parsed. Omit when using load or panelFile."
	},
	panelFile: {
		type: "string",
		description: "Read the PanelDefinition from a JSON file in the workspace (recommended for large panels: write the JSON to e.g. \"panels/<id>.json\" with the write tool first — single-layer encoding avoids string-escape corruption — then pass its path here). Priority: panel > panelFile > load. To modify, read the file, edit, write back, and call again."
	},
	load: {
		type: "string",
		description: "Recall a previously persisted panel by its id (saved earlier with persist: true). When given without panel, the stored PanelDefinition is loaded, re-validated and re-rendered with fresh data."
	},
	persist: {
		type: "boolean",
		description: "Write the panel to disk when true (persisted panels can be recalled later via the load parameter)."
	}
};
/**
* panel 参数的字符串容错（真机教训：模型可能把对象序列化成 JSON 文本）。
* 可解析 → 返回对象；不可解析/非对象 → 抛出面向 Agent 的可自修正错误。
*/
function coercePanelArg(value) {
	if (typeof value !== "string") return value;
	try {
		const parsed = JSON.parse(value);
		if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed;
		throw new Error("panel string parsed to a non-object JSON value. Pass the PanelDefinition as a JSON object directly — do not stringify it.");
	} catch (error) {
		if (error instanceof SyntaxError) throw new Error(`panel was received as a string with malformed JSON (${error.message}). Fix the JSON syntax, or better: pass the PanelDefinition as an object directly.`);
		throw error;
	}
}
/** 输出 schema：与 §5.3 PanelMeta 逐字段对齐（resolved 为 server 解析的数据快照，无 api widget 时为空对象） */
const PANEL_OUTPUT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		version: {
			type: "integer",
			const: 1,
			required: true
		},
		panel: {
			type: "json",
			required: true
		},
		resolved: {
			type: "json",
			required: true
		},
		resolvedAt: {
			type: "string",
			required: true
		}
	}
};
/** 构建 panel 工具定义；由 src/index.ts 注册进 ctx.tools */
function definePanelTool() {
	return defineTool({
		name: PANEL_TOOL,
		description: "Render a reusable dashboard panel from preset widgets, custom sandbox code, or external packs. Presets cover metrics, charts (bar/line/donut/gauge/funnel/heatmap), tables, flow/timeline/comparison diagrams, callouts, and layout containers. Widgets can bind live API data (https JSON, server-side fetch, auto refresh) and the panel can persist for later recall. Each widget is { id, source } where source is one of { type: \"preset\", kind, props } | { type: \"custom\", code } | { type: \"pack\", pack, component, props }; the full contract is validated and fails closed. Routing: choose panel for dashboards, monitoring, multi-widget summaries, or a single flow/timeline/comparison diagram (preset kinds exist); choose show_widget for one small temporary card; choose html_artifact for a free-form full HTML page. Load the openloop-panels-widget-authoring skill before the first call.",
		parameters: PANEL_PARAMETERS,
		output: {
			schema: PANEL_OUTPUT_SCHEMA,
			render: (_args, value) => {
				const panel = value.panel;
				return [{
					type: "text",
					text: `Rendered panel: ${panel.title} (${panel.widgets.length} widgets).`
				}];
			},
			presentationMeta: (_args, value) => {
				const panel = value.panel;
				return {
					kind: "openloop.panel",
					version: 1,
					panel: toJsonValue(panel),
					resolved: toJsonValue(value.resolved),
					resolvedAt: value.resolvedAt
				};
			}
		},
		async execute(args, exec) {
			const panelArg = coercePanelArg(args.panel);
			if (panelArg === void 0 || panelArg === null) {
				const panelFile = args.panelFile;
				const load = args.load;
				throw new Error(typeof panelFile === "string" && panelFile.length > 0 ? `panelFile "${panelFile}" could not be read (file missing, persistence unavailable, or invalid JSON). Write the PanelDefinition JSON to a workspace file with the write tool, then pass its path via panelFile.` : typeof load === "string" && load.length > 0 ? `panel "${load}" could not be loaded from the store (not found or persistence unavailable). Pass a full PanelDefinition, or persist it first with persist: true.` : "panel is required: pass a full PanelDefinition object (or panelFile: \"<path>\" for a JSON file written via the write tool, or load: \"<id>\" to recall a persisted panel).");
			}
			validatePanel(panelArg);
			const panel = panelArg;
			const meta = {
				kind: "openloop.panel",
				version: 1,
				panel,
				resolved: await resolvePanelData(panel, { signal: exec.signal }),
				resolvedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			return {
				version: 1,
				panel: toJsonValue(meta.panel),
				resolved: toJsonValue(meta.resolved),
				resolvedAt: meta.resolvedAt
			};
		},
		presentCall: () => ({
			card: "generic",
			title: "OpenLoop Panel · building",
			kind: "other"
		}),
		presentResult(_args, result) {
			if (result.isError) return void 0;
			const meta = result.meta;
			return {
				card: "generic",
				title: typeof meta?.panel?.title === "string" ? meta.panel.title : "OpenLoop Panel"
			};
		}
	});
}
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/tokenizer/keywords.js
var require_keywords = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var ContextualKeyword;
	(function(ContextualKeyword) {
		const NONE = 0;
		ContextualKeyword[ContextualKeyword["NONE"] = NONE] = "NONE";
		const _abstract = 1;
		ContextualKeyword[ContextualKeyword["_abstract"] = _abstract] = "_abstract";
		const _accessor = 2;
		ContextualKeyword[ContextualKeyword["_accessor"] = _accessor] = "_accessor";
		const _as = 3;
		ContextualKeyword[ContextualKeyword["_as"] = _as] = "_as";
		const _assert = 4;
		ContextualKeyword[ContextualKeyword["_assert"] = _assert] = "_assert";
		const _asserts = 5;
		ContextualKeyword[ContextualKeyword["_asserts"] = _asserts] = "_asserts";
		const _async = 6;
		ContextualKeyword[ContextualKeyword["_async"] = _async] = "_async";
		const _await = 7;
		ContextualKeyword[ContextualKeyword["_await"] = _await] = "_await";
		const _checks = 8;
		ContextualKeyword[ContextualKeyword["_checks"] = _checks] = "_checks";
		const _constructor = 9;
		ContextualKeyword[ContextualKeyword["_constructor"] = _constructor] = "_constructor";
		const _declare = 10;
		ContextualKeyword[ContextualKeyword["_declare"] = _declare] = "_declare";
		const _enum = 11;
		ContextualKeyword[ContextualKeyword["_enum"] = _enum] = "_enum";
		const _exports = 12;
		ContextualKeyword[ContextualKeyword["_exports"] = _exports] = "_exports";
		const _from = 13;
		ContextualKeyword[ContextualKeyword["_from"] = _from] = "_from";
		const _get = 14;
		ContextualKeyword[ContextualKeyword["_get"] = _get] = "_get";
		const _global = 15;
		ContextualKeyword[ContextualKeyword["_global"] = _global] = "_global";
		const _implements = 16;
		ContextualKeyword[ContextualKeyword["_implements"] = _implements] = "_implements";
		const _infer = 17;
		ContextualKeyword[ContextualKeyword["_infer"] = _infer] = "_infer";
		const _interface = 18;
		ContextualKeyword[ContextualKeyword["_interface"] = _interface] = "_interface";
		const _is = 19;
		ContextualKeyword[ContextualKeyword["_is"] = _is] = "_is";
		const _keyof = 20;
		ContextualKeyword[ContextualKeyword["_keyof"] = _keyof] = "_keyof";
		const _mixins = 21;
		ContextualKeyword[ContextualKeyword["_mixins"] = _mixins] = "_mixins";
		const _module = 22;
		ContextualKeyword[ContextualKeyword["_module"] = _module] = "_module";
		const _namespace = 23;
		ContextualKeyword[ContextualKeyword["_namespace"] = _namespace] = "_namespace";
		const _of = 24;
		ContextualKeyword[ContextualKeyword["_of"] = _of] = "_of";
		const _opaque = 25;
		ContextualKeyword[ContextualKeyword["_opaque"] = _opaque] = "_opaque";
		const _out = 26;
		ContextualKeyword[ContextualKeyword["_out"] = _out] = "_out";
		const _override = 27;
		ContextualKeyword[ContextualKeyword["_override"] = _override] = "_override";
		const _private = 28;
		ContextualKeyword[ContextualKeyword["_private"] = _private] = "_private";
		const _protected = 29;
		ContextualKeyword[ContextualKeyword["_protected"] = _protected] = "_protected";
		const _proto = 30;
		ContextualKeyword[ContextualKeyword["_proto"] = _proto] = "_proto";
		const _public = 31;
		ContextualKeyword[ContextualKeyword["_public"] = _public] = "_public";
		const _readonly = 32;
		ContextualKeyword[ContextualKeyword["_readonly"] = _readonly] = "_readonly";
		const _require = 33;
		ContextualKeyword[ContextualKeyword["_require"] = _require] = "_require";
		const _satisfies = 34;
		ContextualKeyword[ContextualKeyword["_satisfies"] = _satisfies] = "_satisfies";
		const _set = 35;
		ContextualKeyword[ContextualKeyword["_set"] = _set] = "_set";
		const _static = 36;
		ContextualKeyword[ContextualKeyword["_static"] = _static] = "_static";
		const _symbol = 37;
		ContextualKeyword[ContextualKeyword["_symbol"] = _symbol] = "_symbol";
		const _type = 38;
		ContextualKeyword[ContextualKeyword["_type"] = _type] = "_type";
		const _unique = 39;
		ContextualKeyword[ContextualKeyword["_unique"] = _unique] = "_unique";
		const _using = 40;
		ContextualKeyword[ContextualKeyword["_using"] = _using] = "_using";
	})(ContextualKeyword || (exports.ContextualKeyword = ContextualKeyword = {}));
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/tokenizer/types.js
var require_types$2 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	/* istanbul ignore file */
	/**
	* Enum of all token types, with bit fields to signify meaningful properties.
	*/
	var TokenType;
	(function(TokenType) {
		const PRECEDENCE_MASK = 15;
		TokenType[TokenType["PRECEDENCE_MASK"] = PRECEDENCE_MASK] = "PRECEDENCE_MASK";
		const IS_KEYWORD = 16;
		TokenType[TokenType["IS_KEYWORD"] = IS_KEYWORD] = "IS_KEYWORD";
		const IS_ASSIGN = 32;
		TokenType[TokenType["IS_ASSIGN"] = IS_ASSIGN] = "IS_ASSIGN";
		const IS_RIGHT_ASSOCIATIVE = 64;
		TokenType[TokenType["IS_RIGHT_ASSOCIATIVE"] = IS_RIGHT_ASSOCIATIVE] = "IS_RIGHT_ASSOCIATIVE";
		const IS_PREFIX = 128;
		TokenType[TokenType["IS_PREFIX"] = IS_PREFIX] = "IS_PREFIX";
		const IS_POSTFIX = 256;
		TokenType[TokenType["IS_POSTFIX"] = IS_POSTFIX] = "IS_POSTFIX";
		const IS_EXPRESSION_START = 512;
		TokenType[TokenType["IS_EXPRESSION_START"] = IS_EXPRESSION_START] = "IS_EXPRESSION_START";
		const num = 512;
		TokenType[TokenType["num"] = num] = "num";
		const bigint = 1536;
		TokenType[TokenType["bigint"] = bigint] = "bigint";
		const decimal = 2560;
		TokenType[TokenType["decimal"] = decimal] = "decimal";
		const regexp = 3584;
		TokenType[TokenType["regexp"] = regexp] = "regexp";
		const string = 4608;
		TokenType[TokenType["string"] = string] = "string";
		const name = 5632;
		TokenType[TokenType["name"] = name] = "name";
		const eof = 6144;
		TokenType[TokenType["eof"] = eof] = "eof";
		const bracketL = 7680;
		TokenType[TokenType["bracketL"] = bracketL] = "bracketL";
		const bracketR = 8192;
		TokenType[TokenType["bracketR"] = bracketR] = "bracketR";
		const braceL = 9728;
		TokenType[TokenType["braceL"] = braceL] = "braceL";
		const braceBarL = 10752;
		TokenType[TokenType["braceBarL"] = braceBarL] = "braceBarL";
		const braceR = 11264;
		TokenType[TokenType["braceR"] = braceR] = "braceR";
		const braceBarR = 12288;
		TokenType[TokenType["braceBarR"] = braceBarR] = "braceBarR";
		const parenL = 13824;
		TokenType[TokenType["parenL"] = parenL] = "parenL";
		const parenR = 14336;
		TokenType[TokenType["parenR"] = parenR] = "parenR";
		const comma = 15360;
		TokenType[TokenType["comma"] = comma] = "comma";
		const semi = 16384;
		TokenType[TokenType["semi"] = semi] = "semi";
		const colon = 17408;
		TokenType[TokenType["colon"] = colon] = "colon";
		const doubleColon = 18432;
		TokenType[TokenType["doubleColon"] = doubleColon] = "doubleColon";
		const dot = 19456;
		TokenType[TokenType["dot"] = dot] = "dot";
		const question = 20480;
		TokenType[TokenType["question"] = question] = "question";
		const questionDot = 21504;
		TokenType[TokenType["questionDot"] = questionDot] = "questionDot";
		const arrow = 22528;
		TokenType[TokenType["arrow"] = arrow] = "arrow";
		const template = 23552;
		TokenType[TokenType["template"] = template] = "template";
		const ellipsis = 24576;
		TokenType[TokenType["ellipsis"] = ellipsis] = "ellipsis";
		const backQuote = 25600;
		TokenType[TokenType["backQuote"] = backQuote] = "backQuote";
		const dollarBraceL = 27136;
		TokenType[TokenType["dollarBraceL"] = dollarBraceL] = "dollarBraceL";
		const at = 27648;
		TokenType[TokenType["at"] = at] = "at";
		const hash = 29184;
		TokenType[TokenType["hash"] = hash] = "hash";
		const eq = 29728;
		TokenType[TokenType["eq"] = eq] = "eq";
		const assign = 30752;
		TokenType[TokenType["assign"] = assign] = "assign";
		const preIncDec = 32640;
		TokenType[TokenType["preIncDec"] = preIncDec] = "preIncDec";
		const postIncDec = 33664;
		TokenType[TokenType["postIncDec"] = postIncDec] = "postIncDec";
		const bang = 34432;
		TokenType[TokenType["bang"] = bang] = "bang";
		const tilde = 35456;
		TokenType[TokenType["tilde"] = tilde] = "tilde";
		const pipeline = 35841;
		TokenType[TokenType["pipeline"] = pipeline] = "pipeline";
		const nullishCoalescing = 36866;
		TokenType[TokenType["nullishCoalescing"] = nullishCoalescing] = "nullishCoalescing";
		const logicalOR = 37890;
		TokenType[TokenType["logicalOR"] = logicalOR] = "logicalOR";
		const logicalAND = 38915;
		TokenType[TokenType["logicalAND"] = logicalAND] = "logicalAND";
		const bitwiseOR = 39940;
		TokenType[TokenType["bitwiseOR"] = bitwiseOR] = "bitwiseOR";
		const bitwiseXOR = 40965;
		TokenType[TokenType["bitwiseXOR"] = bitwiseXOR] = "bitwiseXOR";
		const bitwiseAND = 41990;
		TokenType[TokenType["bitwiseAND"] = bitwiseAND] = "bitwiseAND";
		const equality = 43015;
		TokenType[TokenType["equality"] = equality] = "equality";
		const lessThan = 44040;
		TokenType[TokenType["lessThan"] = lessThan] = "lessThan";
		const greaterThan = 45064;
		TokenType[TokenType["greaterThan"] = greaterThan] = "greaterThan";
		const relationalOrEqual = 46088;
		TokenType[TokenType["relationalOrEqual"] = relationalOrEqual] = "relationalOrEqual";
		const bitShiftL = 47113;
		TokenType[TokenType["bitShiftL"] = bitShiftL] = "bitShiftL";
		const bitShiftR = 48137;
		TokenType[TokenType["bitShiftR"] = bitShiftR] = "bitShiftR";
		const plus = 49802;
		TokenType[TokenType["plus"] = plus] = "plus";
		const minus = 50826;
		TokenType[TokenType["minus"] = minus] = "minus";
		const modulo = 51723;
		TokenType[TokenType["modulo"] = modulo] = "modulo";
		const star = 52235;
		TokenType[TokenType["star"] = star] = "star";
		const slash = 53259;
		TokenType[TokenType["slash"] = slash] = "slash";
		const exponent = 54348;
		TokenType[TokenType["exponent"] = exponent] = "exponent";
		const jsxName = 55296;
		TokenType[TokenType["jsxName"] = jsxName] = "jsxName";
		const jsxText = 56320;
		TokenType[TokenType["jsxText"] = jsxText] = "jsxText";
		const jsxEmptyText = 57344;
		TokenType[TokenType["jsxEmptyText"] = jsxEmptyText] = "jsxEmptyText";
		const jsxTagStart = 58880;
		TokenType[TokenType["jsxTagStart"] = jsxTagStart] = "jsxTagStart";
		const jsxTagEnd = 59392;
		TokenType[TokenType["jsxTagEnd"] = jsxTagEnd] = "jsxTagEnd";
		const typeParameterStart = 60928;
		TokenType[TokenType["typeParameterStart"] = typeParameterStart] = "typeParameterStart";
		const nonNullAssertion = 61440;
		TokenType[TokenType["nonNullAssertion"] = nonNullAssertion] = "nonNullAssertion";
		const _break = 62480;
		TokenType[TokenType["_break"] = _break] = "_break";
		const _case = 63504;
		TokenType[TokenType["_case"] = _case] = "_case";
		const _catch = 64528;
		TokenType[TokenType["_catch"] = _catch] = "_catch";
		const _continue = 65552;
		TokenType[TokenType["_continue"] = _continue] = "_continue";
		const _debugger = 66576;
		TokenType[TokenType["_debugger"] = _debugger] = "_debugger";
		const _default = 67600;
		TokenType[TokenType["_default"] = _default] = "_default";
		const _do = 68624;
		TokenType[TokenType["_do"] = _do] = "_do";
		const _else = 69648;
		TokenType[TokenType["_else"] = _else] = "_else";
		const _finally = 70672;
		TokenType[TokenType["_finally"] = _finally] = "_finally";
		const _for = 71696;
		TokenType[TokenType["_for"] = _for] = "_for";
		const _function = 73232;
		TokenType[TokenType["_function"] = _function] = "_function";
		const _if = 73744;
		TokenType[TokenType["_if"] = _if] = "_if";
		const _return = 74768;
		TokenType[TokenType["_return"] = _return] = "_return";
		const _switch = 75792;
		TokenType[TokenType["_switch"] = _switch] = "_switch";
		const _throw = 77456;
		TokenType[TokenType["_throw"] = _throw] = "_throw";
		const _try = 77840;
		TokenType[TokenType["_try"] = _try] = "_try";
		const _var = 78864;
		TokenType[TokenType["_var"] = _var] = "_var";
		const _let = 79888;
		TokenType[TokenType["_let"] = _let] = "_let";
		const _const = 80912;
		TokenType[TokenType["_const"] = _const] = "_const";
		const _while = 81936;
		TokenType[TokenType["_while"] = _while] = "_while";
		const _with = 82960;
		TokenType[TokenType["_with"] = _with] = "_with";
		const _new = 84496;
		TokenType[TokenType["_new"] = _new] = "_new";
		const _this = 85520;
		TokenType[TokenType["_this"] = _this] = "_this";
		const _super = 86544;
		TokenType[TokenType["_super"] = _super] = "_super";
		const _class = 87568;
		TokenType[TokenType["_class"] = _class] = "_class";
		const _extends = 88080;
		TokenType[TokenType["_extends"] = _extends] = "_extends";
		const _export = 89104;
		TokenType[TokenType["_export"] = _export] = "_export";
		const _import = 90640;
		TokenType[TokenType["_import"] = _import] = "_import";
		const _yield = 91664;
		TokenType[TokenType["_yield"] = _yield] = "_yield";
		const _null = 92688;
		TokenType[TokenType["_null"] = _null] = "_null";
		const _true = 93712;
		TokenType[TokenType["_true"] = _true] = "_true";
		const _false = 94736;
		TokenType[TokenType["_false"] = _false] = "_false";
		const _in = 95256;
		TokenType[TokenType["_in"] = _in] = "_in";
		const _instanceof = 96280;
		TokenType[TokenType["_instanceof"] = _instanceof] = "_instanceof";
		const _typeof = 97936;
		TokenType[TokenType["_typeof"] = _typeof] = "_typeof";
		const _void = 98960;
		TokenType[TokenType["_void"] = _void] = "_void";
		const _delete = 99984;
		TokenType[TokenType["_delete"] = _delete] = "_delete";
		const _async = 100880;
		TokenType[TokenType["_async"] = _async] = "_async";
		const _get = 101904;
		TokenType[TokenType["_get"] = _get] = "_get";
		const _set = 102928;
		TokenType[TokenType["_set"] = _set] = "_set";
		const _declare = 103952;
		TokenType[TokenType["_declare"] = _declare] = "_declare";
		const _readonly = 104976;
		TokenType[TokenType["_readonly"] = _readonly] = "_readonly";
		const _abstract = 106e3;
		TokenType[TokenType["_abstract"] = _abstract] = "_abstract";
		const _static = 107024;
		TokenType[TokenType["_static"] = _static] = "_static";
		const _public = 107536;
		TokenType[TokenType["_public"] = _public] = "_public";
		const _private = 108560;
		TokenType[TokenType["_private"] = _private] = "_private";
		const _protected = 109584;
		TokenType[TokenType["_protected"] = _protected] = "_protected";
		const _override = 110608;
		TokenType[TokenType["_override"] = _override] = "_override";
		const _as = 112144;
		TokenType[TokenType["_as"] = _as] = "_as";
		const _enum = 113168;
		TokenType[TokenType["_enum"] = _enum] = "_enum";
		const _type = 114192;
		TokenType[TokenType["_type"] = _type] = "_type";
		const _implements = 115216;
		TokenType[TokenType["_implements"] = _implements] = "_implements";
	})(TokenType || (exports.TokenType = TokenType = {}));
	function formatTokenType(tokenType) {
		switch (tokenType) {
			case TokenType.num: return "num";
			case TokenType.bigint: return "bigint";
			case TokenType.decimal: return "decimal";
			case TokenType.regexp: return "regexp";
			case TokenType.string: return "string";
			case TokenType.name: return "name";
			case TokenType.eof: return "eof";
			case TokenType.bracketL: return "[";
			case TokenType.bracketR: return "]";
			case TokenType.braceL: return "{";
			case TokenType.braceBarL: return "{|";
			case TokenType.braceR: return "}";
			case TokenType.braceBarR: return "|}";
			case TokenType.parenL: return "(";
			case TokenType.parenR: return ")";
			case TokenType.comma: return ",";
			case TokenType.semi: return ";";
			case TokenType.colon: return ":";
			case TokenType.doubleColon: return "::";
			case TokenType.dot: return ".";
			case TokenType.question: return "?";
			case TokenType.questionDot: return "?.";
			case TokenType.arrow: return "=>";
			case TokenType.template: return "template";
			case TokenType.ellipsis: return "...";
			case TokenType.backQuote: return "`";
			case TokenType.dollarBraceL: return "${";
			case TokenType.at: return "@";
			case TokenType.hash: return "#";
			case TokenType.eq: return "=";
			case TokenType.assign: return "_=";
			case TokenType.preIncDec: return "++/--";
			case TokenType.postIncDec: return "++/--";
			case TokenType.bang: return "!";
			case TokenType.tilde: return "~";
			case TokenType.pipeline: return "|>";
			case TokenType.nullishCoalescing: return "??";
			case TokenType.logicalOR: return "||";
			case TokenType.logicalAND: return "&&";
			case TokenType.bitwiseOR: return "|";
			case TokenType.bitwiseXOR: return "^";
			case TokenType.bitwiseAND: return "&";
			case TokenType.equality: return "==/!=";
			case TokenType.lessThan: return "<";
			case TokenType.greaterThan: return ">";
			case TokenType.relationalOrEqual: return "<=/>=";
			case TokenType.bitShiftL: return "<<";
			case TokenType.bitShiftR: return ">>/>>>";
			case TokenType.plus: return "+";
			case TokenType.minus: return "-";
			case TokenType.modulo: return "%";
			case TokenType.star: return "*";
			case TokenType.slash: return "/";
			case TokenType.exponent: return "**";
			case TokenType.jsxName: return "jsxName";
			case TokenType.jsxText: return "jsxText";
			case TokenType.jsxEmptyText: return "jsxEmptyText";
			case TokenType.jsxTagStart: return "jsxTagStart";
			case TokenType.jsxTagEnd: return "jsxTagEnd";
			case TokenType.typeParameterStart: return "typeParameterStart";
			case TokenType.nonNullAssertion: return "nonNullAssertion";
			case TokenType._break: return "break";
			case TokenType._case: return "case";
			case TokenType._catch: return "catch";
			case TokenType._continue: return "continue";
			case TokenType._debugger: return "debugger";
			case TokenType._default: return "default";
			case TokenType._do: return "do";
			case TokenType._else: return "else";
			case TokenType._finally: return "finally";
			case TokenType._for: return "for";
			case TokenType._function: return "function";
			case TokenType._if: return "if";
			case TokenType._return: return "return";
			case TokenType._switch: return "switch";
			case TokenType._throw: return "throw";
			case TokenType._try: return "try";
			case TokenType._var: return "var";
			case TokenType._let: return "let";
			case TokenType._const: return "const";
			case TokenType._while: return "while";
			case TokenType._with: return "with";
			case TokenType._new: return "new";
			case TokenType._this: return "this";
			case TokenType._super: return "super";
			case TokenType._class: return "class";
			case TokenType._extends: return "extends";
			case TokenType._export: return "export";
			case TokenType._import: return "import";
			case TokenType._yield: return "yield";
			case TokenType._null: return "null";
			case TokenType._true: return "true";
			case TokenType._false: return "false";
			case TokenType._in: return "in";
			case TokenType._instanceof: return "instanceof";
			case TokenType._typeof: return "typeof";
			case TokenType._void: return "void";
			case TokenType._delete: return "delete";
			case TokenType._async: return "async";
			case TokenType._get: return "get";
			case TokenType._set: return "set";
			case TokenType._declare: return "declare";
			case TokenType._readonly: return "readonly";
			case TokenType._abstract: return "abstract";
			case TokenType._static: return "static";
			case TokenType._public: return "public";
			case TokenType._private: return "private";
			case TokenType._protected: return "protected";
			case TokenType._override: return "override";
			case TokenType._as: return "as";
			case TokenType._enum: return "enum";
			case TokenType._type: return "type";
			case TokenType._implements: return "implements";
			default: return "";
		}
	}
	exports.formatTokenType = formatTokenType;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/tokenizer/state.js
var require_state = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _keywords = require_keywords();
	var _types = require_types$2();
	var Scope = class {
		constructor(startTokenIndex, endTokenIndex, isFunctionScope) {
			this.startTokenIndex = startTokenIndex;
			this.endTokenIndex = endTokenIndex;
			this.isFunctionScope = isFunctionScope;
		}
	};
	exports.Scope = Scope;
	var StateSnapshot = class {
		constructor(potentialArrowAt, noAnonFunctionType, inDisallowConditionalTypesContext, tokensLength, scopesLength, pos, type, contextualKeyword, start, end, isType, scopeDepth, error) {
			this.potentialArrowAt = potentialArrowAt;
			this.noAnonFunctionType = noAnonFunctionType;
			this.inDisallowConditionalTypesContext = inDisallowConditionalTypesContext;
			this.tokensLength = tokensLength;
			this.scopesLength = scopesLength;
			this.pos = pos;
			this.type = type;
			this.contextualKeyword = contextualKeyword;
			this.start = start;
			this.end = end;
			this.isType = isType;
			this.scopeDepth = scopeDepth;
			this.error = error;
		}
	};
	exports.StateSnapshot = StateSnapshot;
	exports.default = class State {
		constructor() {
			State.prototype.__init.call(this);
			State.prototype.__init2.call(this);
			State.prototype.__init3.call(this);
			State.prototype.__init4.call(this);
			State.prototype.__init5.call(this);
			State.prototype.__init6.call(this);
			State.prototype.__init7.call(this);
			State.prototype.__init8.call(this);
			State.prototype.__init9.call(this);
			State.prototype.__init10.call(this);
			State.prototype.__init11.call(this);
			State.prototype.__init12.call(this);
			State.prototype.__init13.call(this);
		}
		__init() {
			this.potentialArrowAt = -1;
		}
		__init2() {
			this.noAnonFunctionType = false;
		}
		__init3() {
			this.inDisallowConditionalTypesContext = false;
		}
		__init4() {
			this.tokens = [];
		}
		__init5() {
			this.scopes = [];
		}
		__init6() {
			this.pos = 0;
		}
		__init7() {
			this.type = _types.TokenType.eof;
		}
		__init8() {
			this.contextualKeyword = _keywords.ContextualKeyword.NONE;
		}
		__init9() {
			this.start = 0;
		}
		__init10() {
			this.end = 0;
		}
		__init11() {
			this.isType = false;
		}
		__init12() {
			this.scopeDepth = 0;
		}
		/**
		* If the parser is in an error state, then the token is always tt.eof and all functions can
		* keep executing but should be written so they don't get into an infinite loop in this situation.
		*
		* This approach, combined with the ability to snapshot and restore state, allows us to implement
		* backtracking without exceptions and without needing to explicitly propagate error states
		* everywhere.
		*/
		__init13() {
			this.error = null;
		}
		snapshot() {
			return new StateSnapshot(this.potentialArrowAt, this.noAnonFunctionType, this.inDisallowConditionalTypesContext, this.tokens.length, this.scopes.length, this.pos, this.type, this.contextualKeyword, this.start, this.end, this.isType, this.scopeDepth, this.error);
		}
		restoreFromSnapshot(snapshot) {
			this.potentialArrowAt = snapshot.potentialArrowAt;
			this.noAnonFunctionType = snapshot.noAnonFunctionType;
			this.inDisallowConditionalTypesContext = snapshot.inDisallowConditionalTypesContext;
			this.tokens.length = snapshot.tokensLength;
			this.scopes.length = snapshot.scopesLength;
			this.pos = snapshot.pos;
			this.type = snapshot.type;
			this.contextualKeyword = snapshot.contextualKeyword;
			this.start = snapshot.start;
			this.end = snapshot.end;
			this.isType = snapshot.isType;
			this.scopeDepth = snapshot.scopeDepth;
			this.error = snapshot.error;
		}
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/util/charcodes.js
var require_charcodes = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var charCodes;
	(function(charCodes) {
		const backSpace = 8;
		charCodes[charCodes["backSpace"] = backSpace] = "backSpace";
		const lineFeed = 10;
		charCodes[charCodes["lineFeed"] = lineFeed] = "lineFeed";
		const tab = 9;
		charCodes[charCodes["tab"] = tab] = "tab";
		const carriageReturn = 13;
		charCodes[charCodes["carriageReturn"] = carriageReturn] = "carriageReturn";
		const shiftOut = 14;
		charCodes[charCodes["shiftOut"] = shiftOut] = "shiftOut";
		const space = 32;
		charCodes[charCodes["space"] = space] = "space";
		const exclamationMark = 33;
		charCodes[charCodes["exclamationMark"] = exclamationMark] = "exclamationMark";
		const quotationMark = 34;
		charCodes[charCodes["quotationMark"] = quotationMark] = "quotationMark";
		const numberSign = 35;
		charCodes[charCodes["numberSign"] = numberSign] = "numberSign";
		const dollarSign = 36;
		charCodes[charCodes["dollarSign"] = dollarSign] = "dollarSign";
		const percentSign = 37;
		charCodes[charCodes["percentSign"] = percentSign] = "percentSign";
		const ampersand = 38;
		charCodes[charCodes["ampersand"] = ampersand] = "ampersand";
		const apostrophe = 39;
		charCodes[charCodes["apostrophe"] = apostrophe] = "apostrophe";
		const leftParenthesis = 40;
		charCodes[charCodes["leftParenthesis"] = leftParenthesis] = "leftParenthesis";
		const rightParenthesis = 41;
		charCodes[charCodes["rightParenthesis"] = rightParenthesis] = "rightParenthesis";
		const asterisk = 42;
		charCodes[charCodes["asterisk"] = asterisk] = "asterisk";
		const plusSign = 43;
		charCodes[charCodes["plusSign"] = plusSign] = "plusSign";
		const comma = 44;
		charCodes[charCodes["comma"] = comma] = "comma";
		const dash = 45;
		charCodes[charCodes["dash"] = dash] = "dash";
		const dot = 46;
		charCodes[charCodes["dot"] = dot] = "dot";
		const slash = 47;
		charCodes[charCodes["slash"] = slash] = "slash";
		const digit0 = 48;
		charCodes[charCodes["digit0"] = digit0] = "digit0";
		const digit1 = 49;
		charCodes[charCodes["digit1"] = digit1] = "digit1";
		const digit2 = 50;
		charCodes[charCodes["digit2"] = digit2] = "digit2";
		const digit3 = 51;
		charCodes[charCodes["digit3"] = digit3] = "digit3";
		const digit4 = 52;
		charCodes[charCodes["digit4"] = digit4] = "digit4";
		const digit5 = 53;
		charCodes[charCodes["digit5"] = digit5] = "digit5";
		const digit6 = 54;
		charCodes[charCodes["digit6"] = digit6] = "digit6";
		const digit7 = 55;
		charCodes[charCodes["digit7"] = digit7] = "digit7";
		const digit8 = 56;
		charCodes[charCodes["digit8"] = digit8] = "digit8";
		const digit9 = 57;
		charCodes[charCodes["digit9"] = digit9] = "digit9";
		const colon = 58;
		charCodes[charCodes["colon"] = colon] = "colon";
		const semicolon = 59;
		charCodes[charCodes["semicolon"] = semicolon] = "semicolon";
		const lessThan = 60;
		charCodes[charCodes["lessThan"] = lessThan] = "lessThan";
		const equalsTo = 61;
		charCodes[charCodes["equalsTo"] = equalsTo] = "equalsTo";
		const greaterThan = 62;
		charCodes[charCodes["greaterThan"] = greaterThan] = "greaterThan";
		const questionMark = 63;
		charCodes[charCodes["questionMark"] = questionMark] = "questionMark";
		const atSign = 64;
		charCodes[charCodes["atSign"] = atSign] = "atSign";
		const uppercaseA = 65;
		charCodes[charCodes["uppercaseA"] = uppercaseA] = "uppercaseA";
		const uppercaseB = 66;
		charCodes[charCodes["uppercaseB"] = uppercaseB] = "uppercaseB";
		const uppercaseC = 67;
		charCodes[charCodes["uppercaseC"] = uppercaseC] = "uppercaseC";
		const uppercaseD = 68;
		charCodes[charCodes["uppercaseD"] = uppercaseD] = "uppercaseD";
		const uppercaseE = 69;
		charCodes[charCodes["uppercaseE"] = uppercaseE] = "uppercaseE";
		const uppercaseF = 70;
		charCodes[charCodes["uppercaseF"] = uppercaseF] = "uppercaseF";
		const uppercaseG = 71;
		charCodes[charCodes["uppercaseG"] = uppercaseG] = "uppercaseG";
		const uppercaseH = 72;
		charCodes[charCodes["uppercaseH"] = uppercaseH] = "uppercaseH";
		const uppercaseI = 73;
		charCodes[charCodes["uppercaseI"] = uppercaseI] = "uppercaseI";
		const uppercaseJ = 74;
		charCodes[charCodes["uppercaseJ"] = uppercaseJ] = "uppercaseJ";
		const uppercaseK = 75;
		charCodes[charCodes["uppercaseK"] = uppercaseK] = "uppercaseK";
		const uppercaseL = 76;
		charCodes[charCodes["uppercaseL"] = uppercaseL] = "uppercaseL";
		const uppercaseM = 77;
		charCodes[charCodes["uppercaseM"] = uppercaseM] = "uppercaseM";
		const uppercaseN = 78;
		charCodes[charCodes["uppercaseN"] = uppercaseN] = "uppercaseN";
		const uppercaseO = 79;
		charCodes[charCodes["uppercaseO"] = uppercaseO] = "uppercaseO";
		const uppercaseP = 80;
		charCodes[charCodes["uppercaseP"] = uppercaseP] = "uppercaseP";
		const uppercaseQ = 81;
		charCodes[charCodes["uppercaseQ"] = uppercaseQ] = "uppercaseQ";
		const uppercaseR = 82;
		charCodes[charCodes["uppercaseR"] = uppercaseR] = "uppercaseR";
		const uppercaseS = 83;
		charCodes[charCodes["uppercaseS"] = uppercaseS] = "uppercaseS";
		const uppercaseT = 84;
		charCodes[charCodes["uppercaseT"] = uppercaseT] = "uppercaseT";
		const uppercaseU = 85;
		charCodes[charCodes["uppercaseU"] = uppercaseU] = "uppercaseU";
		const uppercaseV = 86;
		charCodes[charCodes["uppercaseV"] = uppercaseV] = "uppercaseV";
		const uppercaseW = 87;
		charCodes[charCodes["uppercaseW"] = uppercaseW] = "uppercaseW";
		const uppercaseX = 88;
		charCodes[charCodes["uppercaseX"] = uppercaseX] = "uppercaseX";
		const uppercaseY = 89;
		charCodes[charCodes["uppercaseY"] = uppercaseY] = "uppercaseY";
		const uppercaseZ = 90;
		charCodes[charCodes["uppercaseZ"] = uppercaseZ] = "uppercaseZ";
		const leftSquareBracket = 91;
		charCodes[charCodes["leftSquareBracket"] = leftSquareBracket] = "leftSquareBracket";
		const backslash = 92;
		charCodes[charCodes["backslash"] = backslash] = "backslash";
		const rightSquareBracket = 93;
		charCodes[charCodes["rightSquareBracket"] = rightSquareBracket] = "rightSquareBracket";
		const caret = 94;
		charCodes[charCodes["caret"] = caret] = "caret";
		const underscore = 95;
		charCodes[charCodes["underscore"] = underscore] = "underscore";
		const graveAccent = 96;
		charCodes[charCodes["graveAccent"] = graveAccent] = "graveAccent";
		const lowercaseA = 97;
		charCodes[charCodes["lowercaseA"] = lowercaseA] = "lowercaseA";
		const lowercaseB = 98;
		charCodes[charCodes["lowercaseB"] = lowercaseB] = "lowercaseB";
		const lowercaseC = 99;
		charCodes[charCodes["lowercaseC"] = lowercaseC] = "lowercaseC";
		const lowercaseD = 100;
		charCodes[charCodes["lowercaseD"] = lowercaseD] = "lowercaseD";
		const lowercaseE = 101;
		charCodes[charCodes["lowercaseE"] = lowercaseE] = "lowercaseE";
		const lowercaseF = 102;
		charCodes[charCodes["lowercaseF"] = lowercaseF] = "lowercaseF";
		const lowercaseG = 103;
		charCodes[charCodes["lowercaseG"] = lowercaseG] = "lowercaseG";
		const lowercaseH = 104;
		charCodes[charCodes["lowercaseH"] = lowercaseH] = "lowercaseH";
		const lowercaseI = 105;
		charCodes[charCodes["lowercaseI"] = lowercaseI] = "lowercaseI";
		const lowercaseJ = 106;
		charCodes[charCodes["lowercaseJ"] = lowercaseJ] = "lowercaseJ";
		const lowercaseK = 107;
		charCodes[charCodes["lowercaseK"] = lowercaseK] = "lowercaseK";
		const lowercaseL = 108;
		charCodes[charCodes["lowercaseL"] = lowercaseL] = "lowercaseL";
		const lowercaseM = 109;
		charCodes[charCodes["lowercaseM"] = lowercaseM] = "lowercaseM";
		const lowercaseN = 110;
		charCodes[charCodes["lowercaseN"] = lowercaseN] = "lowercaseN";
		const lowercaseO = 111;
		charCodes[charCodes["lowercaseO"] = lowercaseO] = "lowercaseO";
		const lowercaseP = 112;
		charCodes[charCodes["lowercaseP"] = lowercaseP] = "lowercaseP";
		const lowercaseQ = 113;
		charCodes[charCodes["lowercaseQ"] = lowercaseQ] = "lowercaseQ";
		const lowercaseR = 114;
		charCodes[charCodes["lowercaseR"] = lowercaseR] = "lowercaseR";
		const lowercaseS = 115;
		charCodes[charCodes["lowercaseS"] = lowercaseS] = "lowercaseS";
		const lowercaseT = 116;
		charCodes[charCodes["lowercaseT"] = lowercaseT] = "lowercaseT";
		const lowercaseU = 117;
		charCodes[charCodes["lowercaseU"] = lowercaseU] = "lowercaseU";
		const lowercaseV = 118;
		charCodes[charCodes["lowercaseV"] = lowercaseV] = "lowercaseV";
		const lowercaseW = 119;
		charCodes[charCodes["lowercaseW"] = lowercaseW] = "lowercaseW";
		const lowercaseX = 120;
		charCodes[charCodes["lowercaseX"] = lowercaseX] = "lowercaseX";
		const lowercaseY = 121;
		charCodes[charCodes["lowercaseY"] = lowercaseY] = "lowercaseY";
		const lowercaseZ = 122;
		charCodes[charCodes["lowercaseZ"] = lowercaseZ] = "lowercaseZ";
		const leftCurlyBrace = 123;
		charCodes[charCodes["leftCurlyBrace"] = leftCurlyBrace] = "leftCurlyBrace";
		const verticalBar = 124;
		charCodes[charCodes["verticalBar"] = verticalBar] = "verticalBar";
		const rightCurlyBrace = 125;
		charCodes[charCodes["rightCurlyBrace"] = rightCurlyBrace] = "rightCurlyBrace";
		const tilde = 126;
		charCodes[charCodes["tilde"] = tilde] = "tilde";
		const nonBreakingSpace = 160;
		charCodes[charCodes["nonBreakingSpace"] = nonBreakingSpace] = "nonBreakingSpace";
		const oghamSpaceMark = 5760;
		charCodes[charCodes["oghamSpaceMark"] = oghamSpaceMark] = "oghamSpaceMark";
		const lineSeparator = 8232;
		charCodes[charCodes["lineSeparator"] = lineSeparator] = "lineSeparator";
		const paragraphSeparator = 8233;
		charCodes[charCodes["paragraphSeparator"] = paragraphSeparator] = "paragraphSeparator";
	})(charCodes || (exports.charCodes = charCodes = {}));
	function isDigit(code) {
		return code >= charCodes.digit0 && code <= charCodes.digit9 || code >= charCodes.lowercaseA && code <= charCodes.lowercaseF || code >= charCodes.uppercaseA && code <= charCodes.uppercaseF;
	}
	exports.isDigit = isDigit;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/traverser/base.js
var require_base = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _state2 = _interopRequireDefault(require_state());
	var _charcodes = require_charcodes();
	exports.isJSXEnabled;
	exports.isTypeScriptEnabled;
	exports.isFlowEnabled;
	exports.state;
	exports.input;
	exports.nextContextId;
	function getNextContextId() {
		return exports.nextContextId++;
	}
	exports.getNextContextId = getNextContextId;
	function augmentError(error) {
		if ("pos" in error) {
			const loc = locationForIndex(error.pos);
			error.message += ` (${loc.line}:${loc.column})`;
			error.loc = loc;
		}
		return error;
	}
	exports.augmentError = augmentError;
	var Loc = class {
		constructor(line, column) {
			this.line = line;
			this.column = column;
		}
	};
	exports.Loc = Loc;
	function locationForIndex(pos) {
		let line = 1;
		let column = 1;
		for (let i = 0; i < pos; i++) if (exports.input.charCodeAt(i) === _charcodes.charCodes.lineFeed) {
			line++;
			column = 1;
		} else column++;
		return new Loc(line, column);
	}
	exports.locationForIndex = locationForIndex;
	function initParser(inputCode, isJSXEnabledArg, isTypeScriptEnabledArg, isFlowEnabledArg) {
		exports.input = inputCode;
		exports.state = new _state2.default();
		exports.nextContextId = 1;
		exports.isJSXEnabled = isJSXEnabledArg;
		exports.isTypeScriptEnabled = isTypeScriptEnabledArg;
		exports.isFlowEnabled = isFlowEnabledArg;
	}
	exports.initParser = initParser;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/traverser/util.js
var require_util$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _index = require_tokenizer();
	var _types = require_types$2();
	var _charcodes = require_charcodes();
	var _base = require_base();
	function isContextual(contextualKeyword) {
		return _base.state.contextualKeyword === contextualKeyword;
	}
	exports.isContextual = isContextual;
	function isLookaheadContextual(contextualKeyword) {
		const l = _index.lookaheadTypeAndKeyword.call(void 0);
		return l.type === _types.TokenType.name && l.contextualKeyword === contextualKeyword;
	}
	exports.isLookaheadContextual = isLookaheadContextual;
	function eatContextual(contextualKeyword) {
		return _base.state.contextualKeyword === contextualKeyword && _index.eat.call(void 0, _types.TokenType.name);
	}
	exports.eatContextual = eatContextual;
	function expectContextual(contextualKeyword) {
		if (!eatContextual(contextualKeyword)) unexpected();
	}
	exports.expectContextual = expectContextual;
	function canInsertSemicolon() {
		return _index.match.call(void 0, _types.TokenType.eof) || _index.match.call(void 0, _types.TokenType.braceR) || hasPrecedingLineBreak();
	}
	exports.canInsertSemicolon = canInsertSemicolon;
	function hasPrecedingLineBreak() {
		const prevToken = _base.state.tokens[_base.state.tokens.length - 1];
		const lastTokEnd = prevToken ? prevToken.end : 0;
		for (let i = lastTokEnd; i < _base.state.start; i++) {
			const code = _base.input.charCodeAt(i);
			if (code === _charcodes.charCodes.lineFeed || code === _charcodes.charCodes.carriageReturn || code === 8232 || code === 8233) return true;
		}
		return false;
	}
	exports.hasPrecedingLineBreak = hasPrecedingLineBreak;
	function hasFollowingLineBreak() {
		const nextStart = _index.nextTokenStart.call(void 0);
		for (let i = _base.state.end; i < nextStart; i++) {
			const code = _base.input.charCodeAt(i);
			if (code === _charcodes.charCodes.lineFeed || code === _charcodes.charCodes.carriageReturn || code === 8232 || code === 8233) return true;
		}
		return false;
	}
	exports.hasFollowingLineBreak = hasFollowingLineBreak;
	function isLineTerminator() {
		return _index.eat.call(void 0, _types.TokenType.semi) || canInsertSemicolon();
	}
	exports.isLineTerminator = isLineTerminator;
	function semicolon() {
		if (!isLineTerminator()) unexpected("Unexpected token, expected \";\"");
	}
	exports.semicolon = semicolon;
	function expect(type) {
		if (!_index.eat.call(void 0, type)) unexpected(`Unexpected token, expected "${_types.formatTokenType.call(void 0, type)}"`);
	}
	exports.expect = expect;
	/**
	* Transition the parser to an error state. All code needs to be written to naturally unwind in this
	* state, which allows us to backtrack without exceptions and without error plumbing everywhere.
	*/
	function unexpected(message = "Unexpected token", pos = _base.state.start) {
		if (_base.state.error) return;
		const err = new SyntaxError(message);
		err.pos = pos;
		_base.state.error = err;
		_base.state.pos = _base.input.length;
		_index.finishToken.call(void 0, _types.TokenType.eof);
	}
	exports.unexpected = unexpected;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/util/whitespace.js
var require_whitespace = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _charcodes = require_charcodes();
	exports.WHITESPACE_CHARS = [
		9,
		11,
		12,
		_charcodes.charCodes.space,
		_charcodes.charCodes.nonBreakingSpace,
		_charcodes.charCodes.oghamSpaceMark,
		8192,
		8193,
		8194,
		8195,
		8196,
		8197,
		8198,
		8199,
		8200,
		8201,
		8202,
		8239,
		8287,
		12288,
		65279
	];
	exports.skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;
	exports.IS_WHITESPACE = /* @__PURE__ */ new Uint8Array(65536);
	for (const char of exports.WHITESPACE_CHARS) exports.IS_WHITESPACE[char] = 1;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/util/identifier.js
var require_identifier = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _charcodes = require_charcodes();
	var _whitespace = require_whitespace();
	function computeIsIdentifierChar(code) {
		if (code < 48) return code === 36;
		if (code < 58) return true;
		if (code < 65) return false;
		if (code < 91) return true;
		if (code < 97) return code === 95;
		if (code < 123) return true;
		if (code < 128) return false;
		throw new Error("Should not be called with non-ASCII char code.");
	}
	exports.IS_IDENTIFIER_CHAR = /* @__PURE__ */ new Uint8Array(65536);
	for (let i = 0; i < 128; i++) exports.IS_IDENTIFIER_CHAR[i] = computeIsIdentifierChar(i) ? 1 : 0;
	for (let i = 128; i < 65536; i++) exports.IS_IDENTIFIER_CHAR[i] = 1;
	for (const whitespaceChar of _whitespace.WHITESPACE_CHARS) exports.IS_IDENTIFIER_CHAR[whitespaceChar] = 0;
	exports.IS_IDENTIFIER_CHAR[8232] = 0;
	exports.IS_IDENTIFIER_CHAR[8233] = 0;
	exports.IS_IDENTIFIER_START = exports.IS_IDENTIFIER_CHAR.slice();
	for (let numChar = _charcodes.charCodes.digit0; numChar <= _charcodes.charCodes.digit9; numChar++) exports.IS_IDENTIFIER_START[numChar] = 0;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/tokenizer/readWordTree.js
var require_readWordTree = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _keywords = require_keywords();
	var _types = require_types$2();
	exports.READ_WORD_TREE = new Int32Array([
		-1,
		27,
		783,
		918,
		1755,
		2376,
		2862,
		3483,
		-1,
		3699,
		-1,
		4617,
		4752,
		4833,
		5130,
		5508,
		5940,
		-1,
		6480,
		6939,
		7749,
		8181,
		8451,
		8613,
		-1,
		8829,
		-1,
		-1,
		-1,
		54,
		243,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		432,
		-1,
		-1,
		-1,
		675,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		81,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		108,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		135,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		162,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		189,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		216,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._abstract << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		270,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		297,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		324,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		351,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		378,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		405,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._accessor << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._as << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		459,
		-1,
		-1,
		-1,
		-1,
		-1,
		594,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		486,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		513,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		540,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._assert << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		567,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._asserts << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		621,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		648,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._async << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		702,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		729,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		756,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._await << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		810,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		837,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		864,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		891,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._break << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		945,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1107,
		-1,
		-1,
		-1,
		1242,
		-1,
		-1,
		1350,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		972,
		1026,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		999,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._case << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1053,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1080,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._catch << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1134,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1161,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1188,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1215,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._checks << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1269,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1296,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1323,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._class << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1377,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1404,
		1620,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1431,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._const << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1458,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1485,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1512,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1539,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1566,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1593,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._constructor << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1647,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1674,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1701,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1728,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._continue << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1782,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2349,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1809,
		1971,
		-1,
		-1,
		2106,
		-1,
		-1,
		-1,
		-1,
		-1,
		2241,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1836,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1863,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1890,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1917,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1944,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._debugger << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		1998,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2025,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2052,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2079,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._declare << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2133,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2160,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2187,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2214,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._default << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2268,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2295,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2322,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._delete << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._do << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2403,
		-1,
		2484,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2565,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2430,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2457,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._else << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2511,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2538,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._enum << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2592,
		-1,
		-1,
		-1,
		2727,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2619,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2646,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2673,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._export << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2700,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._exports << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2754,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2781,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2808,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2835,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._extends << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2889,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2997,
		-1,
		-1,
		-1,
		-1,
		-1,
		3159,
		-1,
		-1,
		3213,
		-1,
		-1,
		3294,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2916,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2943,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		2970,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._false << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3024,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3051,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3078,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3105,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3132,
		-1,
		(_types.TokenType._finally << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3186,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._for << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3240,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3267,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._from << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3321,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3348,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3375,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3402,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3429,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3456,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._function << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3510,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3564,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3537,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._get << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3591,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3618,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3645,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3672,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._global << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3726,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3753,
		4077,
		-1,
		-1,
		-1,
		-1,
		4590,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._if << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3780,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3807,
		-1,
		-1,
		3996,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3834,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3861,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3888,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3915,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3942,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		3969,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._implements << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4023,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4050,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._import << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._in << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4104,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4185,
		4401,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4131,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4158,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._infer << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4212,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4239,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4266,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4293,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4320,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4347,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4374,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._instanceof << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4428,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4455,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4482,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4509,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4536,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4563,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._interface << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._is << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4644,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4671,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4698,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4725,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._keyof << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4779,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4806,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._let << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4860,
		-1,
		-1,
		-1,
		-1,
		-1,
		4995,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4887,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4914,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4941,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		4968,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._mixins << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5022,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5049,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5076,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5103,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._module << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5157,
		-1,
		-1,
		-1,
		5373,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5427,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5184,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5211,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5238,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5265,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5292,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5319,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5346,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._namespace << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5400,
		-1,
		-1,
		-1,
		(_types.TokenType._new << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5454,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5481,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._null << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5535,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5562,
		-1,
		-1,
		-1,
		-1,
		5697,
		5751,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._of << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5589,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5616,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5643,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5670,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._opaque << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5724,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._out << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5778,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5805,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5832,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5859,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5886,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5913,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._override << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5967,
		-1,
		-1,
		6345,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		5994,
		-1,
		-1,
		-1,
		-1,
		-1,
		6129,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6021,
		-1,
		-1,
		-1,
		-1,
		-1,
		6048,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6075,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6102,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._private << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6156,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6183,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6318,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6210,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6237,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6264,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6291,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._protected << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._proto << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6372,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6399,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6426,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6453,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._public << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6507,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6534,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6696,
		-1,
		-1,
		6831,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6561,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6588,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6615,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6642,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6669,
		-1,
		_keywords.ContextualKeyword._readonly << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6723,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6750,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6777,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6804,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._require << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6858,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6885,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6912,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._return << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6966,
		-1,
		-1,
		-1,
		7182,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7236,
		7371,
		-1,
		7479,
		-1,
		7614,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		6993,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7020,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7047,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7074,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7101,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7128,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7155,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._satisfies << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7209,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._set << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7263,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7290,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7317,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7344,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._static << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7398,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7425,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7452,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._super << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7506,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7533,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7560,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7587,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._switch << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7641,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7668,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7695,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7722,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._symbol << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7776,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7938,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8046,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7803,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7857,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7830,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._this << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7884,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7911,
		-1,
		-1,
		-1,
		(_types.TokenType._throw << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7965,
		-1,
		-1,
		-1,
		8019,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		7992,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._true << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._try << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8073,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8100,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._type << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8127,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8154,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._typeof << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8208,
		-1,
		-1,
		-1,
		-1,
		8343,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8235,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8262,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8289,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8316,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._unique << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8370,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8397,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8424,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		_keywords.ContextualKeyword._using << 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8478,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8532,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8505,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._var << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8559,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8586,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._void << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8640,
		8748,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8667,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8694,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8721,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._while << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8775,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8802,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._with << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8856,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8883,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8910,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		8937,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		(_types.TokenType._yield << 1) + 1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1,
		-1
	]);
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/tokenizer/readWord.js
var require_readWord = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _base = require_base();
	var _charcodes = require_charcodes();
	var _identifier = require_identifier();
	var _index = require_tokenizer();
	var _readWordTree = require_readWordTree();
	var _types = require_types$2();
	/**
	* Read an identifier, producing either a name token or matching on one of the existing keywords.
	* For performance, we pre-generate big decision tree that we traverse. Each node represents a
	* prefix and has 27 values, where the first value is the token or contextual token, if any (-1 if
	* not), and the other 26 values are the transitions to other nodes, or -1 to stop.
	*/
	function readWord() {
		let treePos = 0;
		let code = 0;
		let pos = _base.state.pos;
		while (pos < _base.input.length) {
			code = _base.input.charCodeAt(pos);
			if (code < _charcodes.charCodes.lowercaseA || code > _charcodes.charCodes.lowercaseZ) break;
			const next = _readWordTree.READ_WORD_TREE[treePos + (code - _charcodes.charCodes.lowercaseA) + 1];
			if (next === -1) break;
			else {
				treePos = next;
				pos++;
			}
		}
		const keywordValue = _readWordTree.READ_WORD_TREE[treePos];
		if (keywordValue > -1 && !_identifier.IS_IDENTIFIER_CHAR[code]) {
			_base.state.pos = pos;
			if (keywordValue & 1) _index.finishToken.call(void 0, keywordValue >>> 1);
			else _index.finishToken.call(void 0, _types.TokenType.name, keywordValue >>> 1);
			return;
		}
		while (pos < _base.input.length) {
			const ch = _base.input.charCodeAt(pos);
			if (_identifier.IS_IDENTIFIER_CHAR[ch]) pos++;
			else if (ch === _charcodes.charCodes.backslash) {
				pos += 2;
				if (_base.input.charCodeAt(pos) === _charcodes.charCodes.leftCurlyBrace) {
					while (pos < _base.input.length && _base.input.charCodeAt(pos) !== _charcodes.charCodes.rightCurlyBrace) pos++;
					pos++;
				}
			} else if (ch === _charcodes.charCodes.atSign && _base.input.charCodeAt(pos + 1) === _charcodes.charCodes.atSign) pos += 2;
			else break;
		}
		_base.state.pos = pos;
		_index.finishToken.call(void 0, _types.TokenType.name);
	}
	exports.default = readWord;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/tokenizer/index.js
var require_tokenizer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _base = require_base();
	var _util = require_util$1();
	var _charcodes = require_charcodes();
	var _identifier = require_identifier();
	var _whitespace = require_whitespace();
	var _keywords = require_keywords();
	var _readWord2 = _interopRequireDefault(require_readWord());
	var _types = require_types$2();
	var IdentifierRole;
	(function(IdentifierRole) {
		const Access = 0;
		IdentifierRole[IdentifierRole["Access"] = Access] = "Access";
		const ExportAccess = 1;
		IdentifierRole[IdentifierRole["ExportAccess"] = ExportAccess] = "ExportAccess";
		const TopLevelDeclaration = 2;
		IdentifierRole[IdentifierRole["TopLevelDeclaration"] = TopLevelDeclaration] = "TopLevelDeclaration";
		const FunctionScopedDeclaration = 3;
		IdentifierRole[IdentifierRole["FunctionScopedDeclaration"] = FunctionScopedDeclaration] = "FunctionScopedDeclaration";
		const BlockScopedDeclaration = 4;
		IdentifierRole[IdentifierRole["BlockScopedDeclaration"] = BlockScopedDeclaration] = "BlockScopedDeclaration";
		const ObjectShorthandTopLevelDeclaration = 5;
		IdentifierRole[IdentifierRole["ObjectShorthandTopLevelDeclaration"] = ObjectShorthandTopLevelDeclaration] = "ObjectShorthandTopLevelDeclaration";
		const ObjectShorthandFunctionScopedDeclaration = 6;
		IdentifierRole[IdentifierRole["ObjectShorthandFunctionScopedDeclaration"] = ObjectShorthandFunctionScopedDeclaration] = "ObjectShorthandFunctionScopedDeclaration";
		const ObjectShorthandBlockScopedDeclaration = 7;
		IdentifierRole[IdentifierRole["ObjectShorthandBlockScopedDeclaration"] = ObjectShorthandBlockScopedDeclaration] = "ObjectShorthandBlockScopedDeclaration";
		const ObjectShorthand = 8;
		IdentifierRole[IdentifierRole["ObjectShorthand"] = ObjectShorthand] = "ObjectShorthand";
		const ImportDeclaration = 9;
		IdentifierRole[IdentifierRole["ImportDeclaration"] = ImportDeclaration] = "ImportDeclaration";
		const ObjectKey = 10;
		IdentifierRole[IdentifierRole["ObjectKey"] = ObjectKey] = "ObjectKey";
		const ImportAccess = 11;
		IdentifierRole[IdentifierRole["ImportAccess"] = ImportAccess] = "ImportAccess";
	})(IdentifierRole || (exports.IdentifierRole = IdentifierRole = {}));
	/**
	* Extra information on jsxTagStart tokens, used to determine which of the three
	* jsx functions are called in the automatic transform.
	*/
	var JSXRole;
	(function(JSXRole) {
		const NoChildren = 0;
		JSXRole[JSXRole["NoChildren"] = NoChildren] = "NoChildren";
		const OneChild = 1;
		JSXRole[JSXRole["OneChild"] = OneChild] = "OneChild";
		const StaticChildren = 2;
		JSXRole[JSXRole["StaticChildren"] = StaticChildren] = "StaticChildren";
		const KeyAfterPropSpread = 3;
		JSXRole[JSXRole["KeyAfterPropSpread"] = KeyAfterPropSpread] = "KeyAfterPropSpread";
	})(JSXRole || (exports.JSXRole = JSXRole = {}));
	function isDeclaration(token) {
		const role = token.identifierRole;
		return role === IdentifierRole.TopLevelDeclaration || role === IdentifierRole.FunctionScopedDeclaration || role === IdentifierRole.BlockScopedDeclaration || role === IdentifierRole.ObjectShorthandTopLevelDeclaration || role === IdentifierRole.ObjectShorthandFunctionScopedDeclaration || role === IdentifierRole.ObjectShorthandBlockScopedDeclaration;
	}
	exports.isDeclaration = isDeclaration;
	function isNonTopLevelDeclaration(token) {
		const role = token.identifierRole;
		return role === IdentifierRole.FunctionScopedDeclaration || role === IdentifierRole.BlockScopedDeclaration || role === IdentifierRole.ObjectShorthandFunctionScopedDeclaration || role === IdentifierRole.ObjectShorthandBlockScopedDeclaration;
	}
	exports.isNonTopLevelDeclaration = isNonTopLevelDeclaration;
	function isTopLevelDeclaration(token) {
		const role = token.identifierRole;
		return role === IdentifierRole.TopLevelDeclaration || role === IdentifierRole.ObjectShorthandTopLevelDeclaration || role === IdentifierRole.ImportDeclaration;
	}
	exports.isTopLevelDeclaration = isTopLevelDeclaration;
	function isBlockScopedDeclaration(token) {
		const role = token.identifierRole;
		return role === IdentifierRole.TopLevelDeclaration || role === IdentifierRole.BlockScopedDeclaration || role === IdentifierRole.ObjectShorthandTopLevelDeclaration || role === IdentifierRole.ObjectShorthandBlockScopedDeclaration;
	}
	exports.isBlockScopedDeclaration = isBlockScopedDeclaration;
	function isFunctionScopedDeclaration(token) {
		const role = token.identifierRole;
		return role === IdentifierRole.FunctionScopedDeclaration || role === IdentifierRole.ObjectShorthandFunctionScopedDeclaration;
	}
	exports.isFunctionScopedDeclaration = isFunctionScopedDeclaration;
	function isObjectShorthandDeclaration(token) {
		return token.identifierRole === IdentifierRole.ObjectShorthandTopLevelDeclaration || token.identifierRole === IdentifierRole.ObjectShorthandBlockScopedDeclaration || token.identifierRole === IdentifierRole.ObjectShorthandFunctionScopedDeclaration;
	}
	exports.isObjectShorthandDeclaration = isObjectShorthandDeclaration;
	var Token = class {
		constructor() {
			this.type = _base.state.type;
			this.contextualKeyword = _base.state.contextualKeyword;
			this.start = _base.state.start;
			this.end = _base.state.end;
			this.scopeDepth = _base.state.scopeDepth;
			this.isType = _base.state.isType;
			this.identifierRole = null;
			this.jsxRole = null;
			this.shadowsGlobal = false;
			this.isAsyncOperation = false;
			this.contextId = null;
			this.rhsEndIndex = null;
			this.isExpression = false;
			this.numNullishCoalesceStarts = 0;
			this.numNullishCoalesceEnds = 0;
			this.isOptionalChainStart = false;
			this.isOptionalChainEnd = false;
			this.subscriptStartIndex = null;
			this.nullishStartIndex = null;
		}
	};
	exports.Token = Token;
	function next() {
		_base.state.tokens.push(new Token());
		nextToken();
	}
	exports.next = next;
	function nextTemplateToken() {
		_base.state.tokens.push(new Token());
		_base.state.start = _base.state.pos;
		readTmplToken();
	}
	exports.nextTemplateToken = nextTemplateToken;
	function retokenizeSlashAsRegex() {
		if (_base.state.type === _types.TokenType.assign) --_base.state.pos;
		readRegexp();
	}
	exports.retokenizeSlashAsRegex = retokenizeSlashAsRegex;
	function pushTypeContext(existingTokensInType) {
		for (let i = _base.state.tokens.length - existingTokensInType; i < _base.state.tokens.length; i++) _base.state.tokens[i].isType = true;
		const oldIsType = _base.state.isType;
		_base.state.isType = true;
		return oldIsType;
	}
	exports.pushTypeContext = pushTypeContext;
	function popTypeContext(oldIsType) {
		_base.state.isType = oldIsType;
	}
	exports.popTypeContext = popTypeContext;
	function eat(type) {
		if (match(type)) {
			next();
			return true;
		} else return false;
	}
	exports.eat = eat;
	function eatTypeToken(tokenType) {
		const oldIsType = _base.state.isType;
		_base.state.isType = true;
		eat(tokenType);
		_base.state.isType = oldIsType;
	}
	exports.eatTypeToken = eatTypeToken;
	function match(type) {
		return _base.state.type === type;
	}
	exports.match = match;
	function lookaheadType() {
		const snapshot = _base.state.snapshot();
		next();
		const type = _base.state.type;
		_base.state.restoreFromSnapshot(snapshot);
		return type;
	}
	exports.lookaheadType = lookaheadType;
	var TypeAndKeyword = class {
		constructor(type, contextualKeyword) {
			this.type = type;
			this.contextualKeyword = contextualKeyword;
		}
	};
	exports.TypeAndKeyword = TypeAndKeyword;
	function lookaheadTypeAndKeyword() {
		const snapshot = _base.state.snapshot();
		next();
		const type = _base.state.type;
		const contextualKeyword = _base.state.contextualKeyword;
		_base.state.restoreFromSnapshot(snapshot);
		return new TypeAndKeyword(type, contextualKeyword);
	}
	exports.lookaheadTypeAndKeyword = lookaheadTypeAndKeyword;
	function nextTokenStart() {
		return nextTokenStartSince(_base.state.pos);
	}
	exports.nextTokenStart = nextTokenStart;
	function nextTokenStartSince(pos) {
		_whitespace.skipWhiteSpace.lastIndex = pos;
		return pos + _whitespace.skipWhiteSpace.exec(_base.input)[0].length;
	}
	exports.nextTokenStartSince = nextTokenStartSince;
	function lookaheadCharCode() {
		return _base.input.charCodeAt(nextTokenStart());
	}
	exports.lookaheadCharCode = lookaheadCharCode;
	function nextToken() {
		skipSpace();
		_base.state.start = _base.state.pos;
		if (_base.state.pos >= _base.input.length) {
			const tokens = _base.state.tokens;
			if (tokens.length >= 2 && tokens[tokens.length - 1].start >= _base.input.length && tokens[tokens.length - 2].start >= _base.input.length) _util.unexpected.call(void 0, "Unexpectedly reached the end of input.");
			finishToken(_types.TokenType.eof);
			return;
		}
		readToken(_base.input.charCodeAt(_base.state.pos));
	}
	exports.nextToken = nextToken;
	function readToken(code) {
		if (_identifier.IS_IDENTIFIER_START[code] || code === _charcodes.charCodes.backslash || code === _charcodes.charCodes.atSign && _base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.atSign) _readWord2.default.call(void 0);
		else getTokenFromCode(code);
	}
	function skipBlockComment() {
		while (_base.input.charCodeAt(_base.state.pos) !== _charcodes.charCodes.asterisk || _base.input.charCodeAt(_base.state.pos + 1) !== _charcodes.charCodes.slash) {
			_base.state.pos++;
			if (_base.state.pos > _base.input.length) {
				_util.unexpected.call(void 0, "Unterminated comment", _base.state.pos - 2);
				return;
			}
		}
		_base.state.pos += 2;
	}
	function skipLineComment(startSkip) {
		let ch = _base.input.charCodeAt(_base.state.pos += startSkip);
		if (_base.state.pos < _base.input.length) while (ch !== _charcodes.charCodes.lineFeed && ch !== _charcodes.charCodes.carriageReturn && ch !== _charcodes.charCodes.lineSeparator && ch !== _charcodes.charCodes.paragraphSeparator && ++_base.state.pos < _base.input.length) ch = _base.input.charCodeAt(_base.state.pos);
	}
	exports.skipLineComment = skipLineComment;
	function skipSpace() {
		while (_base.state.pos < _base.input.length) {
			const ch = _base.input.charCodeAt(_base.state.pos);
			switch (ch) {
				case _charcodes.charCodes.carriageReturn: if (_base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.lineFeed) ++_base.state.pos;
				case _charcodes.charCodes.lineFeed:
				case _charcodes.charCodes.lineSeparator:
				case _charcodes.charCodes.paragraphSeparator:
					++_base.state.pos;
					break;
				case _charcodes.charCodes.slash:
					switch (_base.input.charCodeAt(_base.state.pos + 1)) {
						case _charcodes.charCodes.asterisk:
							_base.state.pos += 2;
							skipBlockComment();
							break;
						case _charcodes.charCodes.slash:
							skipLineComment(2);
							break;
						default: return;
					}
					break;
				default: if (_whitespace.IS_WHITESPACE[ch]) ++_base.state.pos;
				else return;
			}
		}
	}
	exports.skipSpace = skipSpace;
	function finishToken(type, contextualKeyword = _keywords.ContextualKeyword.NONE) {
		_base.state.end = _base.state.pos;
		_base.state.type = type;
		_base.state.contextualKeyword = contextualKeyword;
	}
	exports.finishToken = finishToken;
	function readToken_dot() {
		const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
		if (nextChar >= _charcodes.charCodes.digit0 && nextChar <= _charcodes.charCodes.digit9) {
			readNumber(true);
			return;
		}
		if (nextChar === _charcodes.charCodes.dot && _base.input.charCodeAt(_base.state.pos + 2) === _charcodes.charCodes.dot) {
			_base.state.pos += 3;
			finishToken(_types.TokenType.ellipsis);
		} else {
			++_base.state.pos;
			finishToken(_types.TokenType.dot);
		}
	}
	function readToken_slash() {
		if (_base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.equalsTo) finishOp(_types.TokenType.assign, 2);
		else finishOp(_types.TokenType.slash, 1);
	}
	function readToken_mult_modulo(code) {
		let tokenType = code === _charcodes.charCodes.asterisk ? _types.TokenType.star : _types.TokenType.modulo;
		let width = 1;
		let nextChar = _base.input.charCodeAt(_base.state.pos + 1);
		if (code === _charcodes.charCodes.asterisk && nextChar === _charcodes.charCodes.asterisk) {
			width++;
			nextChar = _base.input.charCodeAt(_base.state.pos + 2);
			tokenType = _types.TokenType.exponent;
		}
		if (nextChar === _charcodes.charCodes.equalsTo && _base.input.charCodeAt(_base.state.pos + 2) !== _charcodes.charCodes.greaterThan) {
			width++;
			tokenType = _types.TokenType.assign;
		}
		finishOp(tokenType, width);
	}
	function readToken_pipe_amp(code) {
		const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
		if (nextChar === code) {
			if (_base.input.charCodeAt(_base.state.pos + 2) === _charcodes.charCodes.equalsTo) finishOp(_types.TokenType.assign, 3);
			else finishOp(code === _charcodes.charCodes.verticalBar ? _types.TokenType.logicalOR : _types.TokenType.logicalAND, 2);
			return;
		}
		if (code === _charcodes.charCodes.verticalBar) {
			if (nextChar === _charcodes.charCodes.greaterThan) {
				finishOp(_types.TokenType.pipeline, 2);
				return;
			} else if (nextChar === _charcodes.charCodes.rightCurlyBrace && _base.isFlowEnabled) {
				finishOp(_types.TokenType.braceBarR, 2);
				return;
			}
		}
		if (nextChar === _charcodes.charCodes.equalsTo) {
			finishOp(_types.TokenType.assign, 2);
			return;
		}
		finishOp(code === _charcodes.charCodes.verticalBar ? _types.TokenType.bitwiseOR : _types.TokenType.bitwiseAND, 1);
	}
	function readToken_caret() {
		if (_base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.equalsTo) finishOp(_types.TokenType.assign, 2);
		else finishOp(_types.TokenType.bitwiseXOR, 1);
	}
	function readToken_plus_min(code) {
		const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
		if (nextChar === code) {
			finishOp(_types.TokenType.preIncDec, 2);
			return;
		}
		if (nextChar === _charcodes.charCodes.equalsTo) finishOp(_types.TokenType.assign, 2);
		else if (code === _charcodes.charCodes.plusSign) finishOp(_types.TokenType.plus, 1);
		else finishOp(_types.TokenType.minus, 1);
	}
	function readToken_lt() {
		const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
		if (nextChar === _charcodes.charCodes.lessThan) {
			if (_base.input.charCodeAt(_base.state.pos + 2) === _charcodes.charCodes.equalsTo) {
				finishOp(_types.TokenType.assign, 3);
				return;
			}
			if (_base.state.isType) finishOp(_types.TokenType.lessThan, 1);
			else finishOp(_types.TokenType.bitShiftL, 2);
			return;
		}
		if (nextChar === _charcodes.charCodes.equalsTo) finishOp(_types.TokenType.relationalOrEqual, 2);
		else finishOp(_types.TokenType.lessThan, 1);
	}
	function readToken_gt() {
		if (_base.state.isType) {
			finishOp(_types.TokenType.greaterThan, 1);
			return;
		}
		const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
		if (nextChar === _charcodes.charCodes.greaterThan) {
			const size = _base.input.charCodeAt(_base.state.pos + 2) === _charcodes.charCodes.greaterThan ? 3 : 2;
			if (_base.input.charCodeAt(_base.state.pos + size) === _charcodes.charCodes.equalsTo) {
				finishOp(_types.TokenType.assign, size + 1);
				return;
			}
			finishOp(_types.TokenType.bitShiftR, size);
			return;
		}
		if (nextChar === _charcodes.charCodes.equalsTo) finishOp(_types.TokenType.relationalOrEqual, 2);
		else finishOp(_types.TokenType.greaterThan, 1);
	}
	/**
	* Reinterpret a possible > token when transitioning from a type to a non-type
	* context.
	*
	* This comes up in two situations where >= needs to be treated as one token:
	* - After an `as` expression, like in the code `a as T >= 1`.
	* - In a type argument in an expression context, e.g. `f(a < b, c >= d)`, we
	*   need to see the token as >= so that we get an error and backtrack to
	*   normal expression parsing.
	*
	* Other situations require >= to be seen as two tokens, e.g.
	* `const x: Array<T>=[];`, so it's important to treat > as its own token in
	* typical type parsing situations.
	*/
	function rescan_gt() {
		if (_base.state.type === _types.TokenType.greaterThan) {
			_base.state.pos -= 1;
			readToken_gt();
		}
	}
	exports.rescan_gt = rescan_gt;
	function readToken_eq_excl(code) {
		const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
		if (nextChar === _charcodes.charCodes.equalsTo) {
			finishOp(_types.TokenType.equality, _base.input.charCodeAt(_base.state.pos + 2) === _charcodes.charCodes.equalsTo ? 3 : 2);
			return;
		}
		if (code === _charcodes.charCodes.equalsTo && nextChar === _charcodes.charCodes.greaterThan) {
			_base.state.pos += 2;
			finishToken(_types.TokenType.arrow);
			return;
		}
		finishOp(code === _charcodes.charCodes.equalsTo ? _types.TokenType.eq : _types.TokenType.bang, 1);
	}
	function readToken_question() {
		const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
		const nextChar2 = _base.input.charCodeAt(_base.state.pos + 2);
		if (nextChar === _charcodes.charCodes.questionMark && !(_base.isFlowEnabled && _base.state.isType)) {
			if (nextChar2 === _charcodes.charCodes.equalsTo) finishOp(_types.TokenType.assign, 3);
			else finishOp(_types.TokenType.nullishCoalescing, 2);
		} else if (nextChar === _charcodes.charCodes.dot && !(nextChar2 >= _charcodes.charCodes.digit0 && nextChar2 <= _charcodes.charCodes.digit9)) {
			_base.state.pos += 2;
			finishToken(_types.TokenType.questionDot);
		} else {
			++_base.state.pos;
			finishToken(_types.TokenType.question);
		}
	}
	function getTokenFromCode(code) {
		switch (code) {
			case _charcodes.charCodes.numberSign:
				++_base.state.pos;
				finishToken(_types.TokenType.hash);
				return;
			case _charcodes.charCodes.dot:
				readToken_dot();
				return;
			case _charcodes.charCodes.leftParenthesis:
				++_base.state.pos;
				finishToken(_types.TokenType.parenL);
				return;
			case _charcodes.charCodes.rightParenthesis:
				++_base.state.pos;
				finishToken(_types.TokenType.parenR);
				return;
			case _charcodes.charCodes.semicolon:
				++_base.state.pos;
				finishToken(_types.TokenType.semi);
				return;
			case _charcodes.charCodes.comma:
				++_base.state.pos;
				finishToken(_types.TokenType.comma);
				return;
			case _charcodes.charCodes.leftSquareBracket:
				++_base.state.pos;
				finishToken(_types.TokenType.bracketL);
				return;
			case _charcodes.charCodes.rightSquareBracket:
				++_base.state.pos;
				finishToken(_types.TokenType.bracketR);
				return;
			case _charcodes.charCodes.leftCurlyBrace:
				if (_base.isFlowEnabled && _base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.verticalBar) finishOp(_types.TokenType.braceBarL, 2);
				else {
					++_base.state.pos;
					finishToken(_types.TokenType.braceL);
				}
				return;
			case _charcodes.charCodes.rightCurlyBrace:
				++_base.state.pos;
				finishToken(_types.TokenType.braceR);
				return;
			case _charcodes.charCodes.colon:
				if (_base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.colon) finishOp(_types.TokenType.doubleColon, 2);
				else {
					++_base.state.pos;
					finishToken(_types.TokenType.colon);
				}
				return;
			case _charcodes.charCodes.questionMark:
				readToken_question();
				return;
			case _charcodes.charCodes.atSign:
				++_base.state.pos;
				finishToken(_types.TokenType.at);
				return;
			case _charcodes.charCodes.graveAccent:
				++_base.state.pos;
				finishToken(_types.TokenType.backQuote);
				return;
			case _charcodes.charCodes.digit0: {
				const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
				if (nextChar === _charcodes.charCodes.lowercaseX || nextChar === _charcodes.charCodes.uppercaseX || nextChar === _charcodes.charCodes.lowercaseO || nextChar === _charcodes.charCodes.uppercaseO || nextChar === _charcodes.charCodes.lowercaseB || nextChar === _charcodes.charCodes.uppercaseB) {
					readRadixNumber();
					return;
				}
			}
			case _charcodes.charCodes.digit1:
			case _charcodes.charCodes.digit2:
			case _charcodes.charCodes.digit3:
			case _charcodes.charCodes.digit4:
			case _charcodes.charCodes.digit5:
			case _charcodes.charCodes.digit6:
			case _charcodes.charCodes.digit7:
			case _charcodes.charCodes.digit8:
			case _charcodes.charCodes.digit9:
				readNumber(false);
				return;
			case _charcodes.charCodes.quotationMark:
			case _charcodes.charCodes.apostrophe:
				readString(code);
				return;
			case _charcodes.charCodes.slash:
				readToken_slash();
				return;
			case _charcodes.charCodes.percentSign:
			case _charcodes.charCodes.asterisk:
				readToken_mult_modulo(code);
				return;
			case _charcodes.charCodes.verticalBar:
			case _charcodes.charCodes.ampersand:
				readToken_pipe_amp(code);
				return;
			case _charcodes.charCodes.caret:
				readToken_caret();
				return;
			case _charcodes.charCodes.plusSign:
			case _charcodes.charCodes.dash:
				readToken_plus_min(code);
				return;
			case _charcodes.charCodes.lessThan:
				readToken_lt();
				return;
			case _charcodes.charCodes.greaterThan:
				readToken_gt();
				return;
			case _charcodes.charCodes.equalsTo:
			case _charcodes.charCodes.exclamationMark:
				readToken_eq_excl(code);
				return;
			case _charcodes.charCodes.tilde:
				finishOp(_types.TokenType.tilde, 1);
				return;
		}
		_util.unexpected.call(void 0, `Unexpected character '${String.fromCharCode(code)}'`, _base.state.pos);
	}
	exports.getTokenFromCode = getTokenFromCode;
	function finishOp(type, size) {
		_base.state.pos += size;
		finishToken(type);
	}
	function readRegexp() {
		const start = _base.state.pos;
		let escaped = false;
		let inClass = false;
		for (;;) {
			if (_base.state.pos >= _base.input.length) {
				_util.unexpected.call(void 0, "Unterminated regular expression", start);
				return;
			}
			const code = _base.input.charCodeAt(_base.state.pos);
			if (escaped) escaped = false;
			else {
				if (code === _charcodes.charCodes.leftSquareBracket) inClass = true;
				else if (code === _charcodes.charCodes.rightSquareBracket && inClass) inClass = false;
				else if (code === _charcodes.charCodes.slash && !inClass) break;
				escaped = code === _charcodes.charCodes.backslash;
			}
			++_base.state.pos;
		}
		++_base.state.pos;
		skipWord();
		finishToken(_types.TokenType.regexp);
	}
	/**
	* Read a decimal integer. Note that this can't be unified with the similar code
	* in readRadixNumber (which also handles hex digits) because "e" needs to be
	* the end of the integer so that we can properly handle scientific notation.
	*/
	function readInt() {
		while (true) {
			const code = _base.input.charCodeAt(_base.state.pos);
			if (code >= _charcodes.charCodes.digit0 && code <= _charcodes.charCodes.digit9 || code === _charcodes.charCodes.underscore) _base.state.pos++;
			else break;
		}
	}
	function readRadixNumber() {
		_base.state.pos += 2;
		while (true) {
			const code = _base.input.charCodeAt(_base.state.pos);
			if (code >= _charcodes.charCodes.digit0 && code <= _charcodes.charCodes.digit9 || code >= _charcodes.charCodes.lowercaseA && code <= _charcodes.charCodes.lowercaseF || code >= _charcodes.charCodes.uppercaseA && code <= _charcodes.charCodes.uppercaseF || code === _charcodes.charCodes.underscore) _base.state.pos++;
			else break;
		}
		if (_base.input.charCodeAt(_base.state.pos) === _charcodes.charCodes.lowercaseN) {
			++_base.state.pos;
			finishToken(_types.TokenType.bigint);
		} else finishToken(_types.TokenType.num);
	}
	function readNumber(startsWithDot) {
		let isBigInt = false;
		let isDecimal = false;
		if (!startsWithDot) readInt();
		let nextChar = _base.input.charCodeAt(_base.state.pos);
		if (nextChar === _charcodes.charCodes.dot) {
			++_base.state.pos;
			readInt();
			nextChar = _base.input.charCodeAt(_base.state.pos);
		}
		if (nextChar === _charcodes.charCodes.uppercaseE || nextChar === _charcodes.charCodes.lowercaseE) {
			nextChar = _base.input.charCodeAt(++_base.state.pos);
			if (nextChar === _charcodes.charCodes.plusSign || nextChar === _charcodes.charCodes.dash) ++_base.state.pos;
			readInt();
			nextChar = _base.input.charCodeAt(_base.state.pos);
		}
		if (nextChar === _charcodes.charCodes.lowercaseN) {
			++_base.state.pos;
			isBigInt = true;
		} else if (nextChar === _charcodes.charCodes.lowercaseM) {
			++_base.state.pos;
			isDecimal = true;
		}
		if (isBigInt) {
			finishToken(_types.TokenType.bigint);
			return;
		}
		if (isDecimal) {
			finishToken(_types.TokenType.decimal);
			return;
		}
		finishToken(_types.TokenType.num);
	}
	function readString(quote) {
		_base.state.pos++;
		for (;;) {
			if (_base.state.pos >= _base.input.length) {
				_util.unexpected.call(void 0, "Unterminated string constant");
				return;
			}
			const ch = _base.input.charCodeAt(_base.state.pos);
			if (ch === _charcodes.charCodes.backslash) _base.state.pos++;
			else if (ch === quote) break;
			_base.state.pos++;
		}
		_base.state.pos++;
		finishToken(_types.TokenType.string);
	}
	function readTmplToken() {
		for (;;) {
			if (_base.state.pos >= _base.input.length) {
				_util.unexpected.call(void 0, "Unterminated template");
				return;
			}
			const ch = _base.input.charCodeAt(_base.state.pos);
			if (ch === _charcodes.charCodes.graveAccent || ch === _charcodes.charCodes.dollarSign && _base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.leftCurlyBrace) {
				if (_base.state.pos === _base.state.start && match(_types.TokenType.template)) {
					if (ch === _charcodes.charCodes.dollarSign) {
						_base.state.pos += 2;
						finishToken(_types.TokenType.dollarBraceL);
						return;
					} else {
						++_base.state.pos;
						finishToken(_types.TokenType.backQuote);
						return;
					}
				}
				finishToken(_types.TokenType.template);
				return;
			}
			if (ch === _charcodes.charCodes.backslash) _base.state.pos++;
			_base.state.pos++;
		}
	}
	function skipWord() {
		while (_base.state.pos < _base.input.length) {
			const ch = _base.input.charCodeAt(_base.state.pos);
			if (_identifier.IS_IDENTIFIER_CHAR[ch]) _base.state.pos++;
			else if (ch === _charcodes.charCodes.backslash) {
				_base.state.pos += 2;
				if (_base.input.charCodeAt(_base.state.pos) === _charcodes.charCodes.leftCurlyBrace) {
					while (_base.state.pos < _base.input.length && _base.input.charCodeAt(_base.state.pos) !== _charcodes.charCodes.rightCurlyBrace) _base.state.pos++;
					_base.state.pos++;
				}
			} else break;
		}
	}
	exports.skipWord = skipWord;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/util/getImportExportSpecifierInfo.js
var require_getImportExportSpecifierInfo = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _types = require_types$2();
	/**
	* Determine information about this named import or named export specifier.
	*
	* This syntax is the `a` from statements like these:
	* import {A} from "./foo";
	* export {A};
	* export {A} from "./foo";
	*
	* As it turns out, we can exactly characterize the syntax meaning by simply
	* counting the number of tokens, which can be from 1 to 4:
	* {A}
	* {type A}
	* {A as B}
	* {type A as B}
	*
	* In the type case, we never actually need the names in practice, so don't get
	* them.
	*
	* TODO: There's some redundancy with the type detection here and the isType
	* flag that's already present on tokens in TS mode. This function could
	* potentially be simplified and/or pushed to the call sites to avoid the object
	* allocation.
	*/
	function getImportExportSpecifierInfo(tokens, index = tokens.currentIndex()) {
		let endIndex = index + 1;
		if (isSpecifierEnd(tokens, endIndex)) {
			const name = tokens.identifierNameAtIndex(index);
			return {
				isType: false,
				leftName: name,
				rightName: name,
				endIndex
			};
		}
		endIndex++;
		if (isSpecifierEnd(tokens, endIndex)) return {
			isType: true,
			leftName: null,
			rightName: null,
			endIndex
		};
		endIndex++;
		if (isSpecifierEnd(tokens, endIndex)) return {
			isType: false,
			leftName: tokens.identifierNameAtIndex(index),
			rightName: tokens.identifierNameAtIndex(index + 2),
			endIndex
		};
		endIndex++;
		if (isSpecifierEnd(tokens, endIndex)) return {
			isType: true,
			leftName: null,
			rightName: null,
			endIndex
		};
		throw new Error(`Unexpected import/export specifier at ${index}`);
	}
	exports.default = getImportExportSpecifierInfo;
	function isSpecifierEnd(tokens, index) {
		const token = tokens.tokens[index];
		return token.type === _types.TokenType.braceR || token.type === _types.TokenType.comma;
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/plugins/jsx/xhtml.js
var require_xhtml = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = /* @__PURE__ */ new Map([
		["quot", "\""],
		["amp", "&"],
		["apos", "'"],
		["lt", "<"],
		["gt", ">"],
		["nbsp", "\xA0"],
		["iexcl", "¡"],
		["cent", "¢"],
		["pound", "£"],
		["curren", "¤"],
		["yen", "¥"],
		["brvbar", "¦"],
		["sect", "§"],
		["uml", "¨"],
		["copy", "©"],
		["ordf", "ª"],
		["laquo", "«"],
		["not", "¬"],
		["shy", "­"],
		["reg", "®"],
		["macr", "¯"],
		["deg", "°"],
		["plusmn", "±"],
		["sup2", "²"],
		["sup3", "³"],
		["acute", "´"],
		["micro", "µ"],
		["para", "¶"],
		["middot", "·"],
		["cedil", "¸"],
		["sup1", "¹"],
		["ordm", "º"],
		["raquo", "»"],
		["frac14", "¼"],
		["frac12", "½"],
		["frac34", "¾"],
		["iquest", "¿"],
		["Agrave", "À"],
		["Aacute", "Á"],
		["Acirc", "Â"],
		["Atilde", "Ã"],
		["Auml", "Ä"],
		["Aring", "Å"],
		["AElig", "Æ"],
		["Ccedil", "Ç"],
		["Egrave", "È"],
		["Eacute", "É"],
		["Ecirc", "Ê"],
		["Euml", "Ë"],
		["Igrave", "Ì"],
		["Iacute", "Í"],
		["Icirc", "Î"],
		["Iuml", "Ï"],
		["ETH", "Ð"],
		["Ntilde", "Ñ"],
		["Ograve", "Ò"],
		["Oacute", "Ó"],
		["Ocirc", "Ô"],
		["Otilde", "Õ"],
		["Ouml", "Ö"],
		["times", "×"],
		["Oslash", "Ø"],
		["Ugrave", "Ù"],
		["Uacute", "Ú"],
		["Ucirc", "Û"],
		["Uuml", "Ü"],
		["Yacute", "Ý"],
		["THORN", "Þ"],
		["szlig", "ß"],
		["agrave", "à"],
		["aacute", "á"],
		["acirc", "â"],
		["atilde", "ã"],
		["auml", "ä"],
		["aring", "å"],
		["aelig", "æ"],
		["ccedil", "ç"],
		["egrave", "è"],
		["eacute", "é"],
		["ecirc", "ê"],
		["euml", "ë"],
		["igrave", "ì"],
		["iacute", "í"],
		["icirc", "î"],
		["iuml", "ï"],
		["eth", "ð"],
		["ntilde", "ñ"],
		["ograve", "ò"],
		["oacute", "ó"],
		["ocirc", "ô"],
		["otilde", "õ"],
		["ouml", "ö"],
		["divide", "÷"],
		["oslash", "ø"],
		["ugrave", "ù"],
		["uacute", "ú"],
		["ucirc", "û"],
		["uuml", "ü"],
		["yacute", "ý"],
		["thorn", "þ"],
		["yuml", "ÿ"],
		["OElig", "Œ"],
		["oelig", "œ"],
		["Scaron", "Š"],
		["scaron", "š"],
		["Yuml", "Ÿ"],
		["fnof", "ƒ"],
		["circ", "ˆ"],
		["tilde", "˜"],
		["Alpha", "Α"],
		["Beta", "Β"],
		["Gamma", "Γ"],
		["Delta", "Δ"],
		["Epsilon", "Ε"],
		["Zeta", "Ζ"],
		["Eta", "Η"],
		["Theta", "Θ"],
		["Iota", "Ι"],
		["Kappa", "Κ"],
		["Lambda", "Λ"],
		["Mu", "Μ"],
		["Nu", "Ν"],
		["Xi", "Ξ"],
		["Omicron", "Ο"],
		["Pi", "Π"],
		["Rho", "Ρ"],
		["Sigma", "Σ"],
		["Tau", "Τ"],
		["Upsilon", "Υ"],
		["Phi", "Φ"],
		["Chi", "Χ"],
		["Psi", "Ψ"],
		["Omega", "Ω"],
		["alpha", "α"],
		["beta", "β"],
		["gamma", "γ"],
		["delta", "δ"],
		["epsilon", "ε"],
		["zeta", "ζ"],
		["eta", "η"],
		["theta", "θ"],
		["iota", "ι"],
		["kappa", "κ"],
		["lambda", "λ"],
		["mu", "μ"],
		["nu", "ν"],
		["xi", "ξ"],
		["omicron", "ο"],
		["pi", "π"],
		["rho", "ρ"],
		["sigmaf", "ς"],
		["sigma", "σ"],
		["tau", "τ"],
		["upsilon", "υ"],
		["phi", "φ"],
		["chi", "χ"],
		["psi", "ψ"],
		["omega", "ω"],
		["thetasym", "ϑ"],
		["upsih", "ϒ"],
		["piv", "ϖ"],
		["ensp", " "],
		["emsp", " "],
		["thinsp", " "],
		["zwnj", "‌"],
		["zwj", "‍"],
		["lrm", "‎"],
		["rlm", "‏"],
		["ndash", "–"],
		["mdash", "—"],
		["lsquo", "‘"],
		["rsquo", "’"],
		["sbquo", "‚"],
		["ldquo", "“"],
		["rdquo", "”"],
		["bdquo", "„"],
		["dagger", "†"],
		["Dagger", "‡"],
		["bull", "•"],
		["hellip", "…"],
		["permil", "‰"],
		["prime", "′"],
		["Prime", "″"],
		["lsaquo", "‹"],
		["rsaquo", "›"],
		["oline", "‾"],
		["frasl", "⁄"],
		["euro", "€"],
		["image", "ℑ"],
		["weierp", "℘"],
		["real", "ℜ"],
		["trade", "™"],
		["alefsym", "ℵ"],
		["larr", "←"],
		["uarr", "↑"],
		["rarr", "→"],
		["darr", "↓"],
		["harr", "↔"],
		["crarr", "↵"],
		["lArr", "⇐"],
		["uArr", "⇑"],
		["rArr", "⇒"],
		["dArr", "⇓"],
		["hArr", "⇔"],
		["forall", "∀"],
		["part", "∂"],
		["exist", "∃"],
		["empty", "∅"],
		["nabla", "∇"],
		["isin", "∈"],
		["notin", "∉"],
		["ni", "∋"],
		["prod", "∏"],
		["sum", "∑"],
		["minus", "−"],
		["lowast", "∗"],
		["radic", "√"],
		["prop", "∝"],
		["infin", "∞"],
		["ang", "∠"],
		["and", "∧"],
		["or", "∨"],
		["cap", "∩"],
		["cup", "∪"],
		["int", "∫"],
		["there4", "∴"],
		["sim", "∼"],
		["cong", "≅"],
		["asymp", "≈"],
		["ne", "≠"],
		["equiv", "≡"],
		["le", "≤"],
		["ge", "≥"],
		["sub", "⊂"],
		["sup", "⊃"],
		["nsub", "⊄"],
		["sube", "⊆"],
		["supe", "⊇"],
		["oplus", "⊕"],
		["otimes", "⊗"],
		["perp", "⊥"],
		["sdot", "⋅"],
		["lceil", "⌈"],
		["rceil", "⌉"],
		["lfloor", "⌊"],
		["rfloor", "⌋"],
		["lang", "〈"],
		["rang", "〉"],
		["loz", "◊"],
		["spades", "♠"],
		["clubs", "♣"],
		["hearts", "♥"],
		["diams", "♦"]
	]);
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/util/getJSXPragmaInfo.js
var require_getJSXPragmaInfo = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function getJSXPragmaInfo(options) {
		const [base, suffix] = splitPragma(options.jsxPragma || "React.createElement");
		const [fragmentBase, fragmentSuffix] = splitPragma(options.jsxFragmentPragma || "React.Fragment");
		return {
			base,
			suffix,
			fragmentBase,
			fragmentSuffix
		};
	}
	exports.default = getJSXPragmaInfo;
	function splitPragma(pragma) {
		let dotIndex = pragma.indexOf(".");
		if (dotIndex === -1) dotIndex = pragma.length;
		return [pragma.slice(0, dotIndex), pragma.slice(dotIndex)];
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/transformers/Transformer.js
var require_Transformer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var Transformer = class {
		getPrefixCode() {
			return "";
		}
		getHoistedCode() {
			return "";
		}
		getSuffixCode() {
			return "";
		}
	};
	exports.default = Transformer;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/transformers/JSXTransformer.js
var require_JSXTransformer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _xhtml2 = _interopRequireDefault(require_xhtml());
	var _tokenizer = require_tokenizer();
	var _types = require_types$2();
	var _charcodes = require_charcodes();
	var _getJSXPragmaInfo2 = _interopRequireDefault(require_getJSXPragmaInfo());
	var _Transformer2 = _interopRequireDefault(require_Transformer());
	exports.default = class JSXTransformer extends _Transformer2.default {
		__init() {
			this.lastLineNumber = 1;
		}
		__init2() {
			this.lastIndex = 0;
		}
		__init3() {
			this.filenameVarName = null;
		}
		__init4() {
			this.esmAutomaticImportNameResolutions = {};
		}
		__init5() {
			this.cjsAutomaticModuleNameResolutions = {};
		}
		constructor(rootTransformer, tokens, importProcessor, nameManager, options) {
			super();
			this.rootTransformer = rootTransformer;
			this.tokens = tokens;
			this.importProcessor = importProcessor;
			this.nameManager = nameManager;
			this.options = options;
			JSXTransformer.prototype.__init.call(this);
			JSXTransformer.prototype.__init2.call(this);
			JSXTransformer.prototype.__init3.call(this);
			JSXTransformer.prototype.__init4.call(this);
			JSXTransformer.prototype.__init5.call(this);
			this.jsxPragmaInfo = _getJSXPragmaInfo2.default.call(void 0, options);
			this.isAutomaticRuntime = options.jsxRuntime === "automatic";
			this.jsxImportSource = options.jsxImportSource || "react";
		}
		process() {
			if (this.tokens.matches1(_types.TokenType.jsxTagStart)) {
				this.processJSXTag();
				return true;
			}
			return false;
		}
		getPrefixCode() {
			let prefix = "";
			if (this.filenameVarName) prefix += `const ${this.filenameVarName} = ${JSON.stringify(this.options.filePath || "")};`;
			if (this.isAutomaticRuntime) {
				if (this.importProcessor) for (const [path, resolvedName] of Object.entries(this.cjsAutomaticModuleNameResolutions)) prefix += `var ${resolvedName} = require("${path}");`;
				else {
					const { createElement: createElementResolution, ...otherResolutions } = this.esmAutomaticImportNameResolutions;
					if (createElementResolution) prefix += `import {createElement as ${createElementResolution}} from "${this.jsxImportSource}";`;
					const importSpecifiers = Object.entries(otherResolutions).map(([name, resolvedName]) => `${name} as ${resolvedName}`).join(", ");
					if (importSpecifiers) {
						const importPath = this.jsxImportSource + (this.options.production ? "/jsx-runtime" : "/jsx-dev-runtime");
						prefix += `import {${importSpecifiers}} from "${importPath}";`;
					}
				}
			}
			return prefix;
		}
		processJSXTag() {
			const { jsxRole, start } = this.tokens.currentToken();
			const elementLocationCode = this.options.production ? null : this.getElementLocationCode(start);
			if (this.isAutomaticRuntime && jsxRole !== _tokenizer.JSXRole.KeyAfterPropSpread) this.transformTagToJSXFunc(elementLocationCode, jsxRole);
			else this.transformTagToCreateElement(elementLocationCode);
		}
		getElementLocationCode(firstTokenStart) {
			return `lineNumber: ${this.getLineNumberForIndex(firstTokenStart)}`;
		}
		/**
		* Get the line number for this source position. This is calculated lazily and
		* must be called in increasing order by index.
		*/
		getLineNumberForIndex(index) {
			const code = this.tokens.code;
			while (this.lastIndex < index && this.lastIndex < code.length) {
				if (code[this.lastIndex] === "\n") this.lastLineNumber++;
				this.lastIndex++;
			}
			return this.lastLineNumber;
		}
		/**
		* Convert the current JSX element to a call to jsx, jsxs, or jsxDEV. This is
		* the primary transformation for the automatic transform.
		*
		* Example:
		* <div a={1} key={2}>Hello{x}</div>
		* becomes
		* jsxs('div', {a: 1, children: ["Hello", x]}, 2)
		*/
		transformTagToJSXFunc(elementLocationCode, jsxRole) {
			const isStatic = jsxRole === _tokenizer.JSXRole.StaticChildren;
			this.tokens.replaceToken(this.getJSXFuncInvocationCode(isStatic));
			let keyCode = null;
			if (this.tokens.matches1(_types.TokenType.jsxTagEnd)) {
				this.tokens.replaceToken(`${this.getFragmentCode()}, {`);
				this.processAutomaticChildrenAndEndProps(jsxRole);
			} else {
				this.processTagIntro();
				this.tokens.appendCode(", {");
				keyCode = this.processProps(true);
				if (this.tokens.matches2(_types.TokenType.slash, _types.TokenType.jsxTagEnd)) this.tokens.appendCode("}");
				else if (this.tokens.matches1(_types.TokenType.jsxTagEnd)) {
					this.tokens.removeToken();
					this.processAutomaticChildrenAndEndProps(jsxRole);
				} else throw new Error("Expected either /> or > at the end of the tag.");
				if (keyCode) this.tokens.appendCode(`, ${keyCode}`);
			}
			if (!this.options.production) {
				if (keyCode === null) this.tokens.appendCode(", void 0");
				this.tokens.appendCode(`, ${isStatic}, ${this.getDevSource(elementLocationCode)}, this`);
			}
			this.tokens.removeInitialToken();
			while (!this.tokens.matches1(_types.TokenType.jsxTagEnd)) this.tokens.removeToken();
			this.tokens.replaceToken(")");
		}
		/**
		* Convert the current JSX element to a createElement call. In the classic
		* runtime, this is the only case. In the automatic runtime, this is called
		* as a fallback in some situations.
		*
		* Example:
		* <div a={1} key={2}>Hello{x}</div>
		* becomes
		* React.createElement('div', {a: 1, key: 2}, "Hello", x)
		*/
		transformTagToCreateElement(elementLocationCode) {
			this.tokens.replaceToken(this.getCreateElementInvocationCode());
			if (this.tokens.matches1(_types.TokenType.jsxTagEnd)) {
				this.tokens.replaceToken(`${this.getFragmentCode()}, null`);
				this.processChildren(true);
			} else {
				this.processTagIntro();
				this.processPropsObjectWithDevInfo(elementLocationCode);
				if (this.tokens.matches2(_types.TokenType.slash, _types.TokenType.jsxTagEnd)) {} else if (this.tokens.matches1(_types.TokenType.jsxTagEnd)) {
					this.tokens.removeToken();
					this.processChildren(true);
				} else throw new Error("Expected either /> or > at the end of the tag.");
			}
			this.tokens.removeInitialToken();
			while (!this.tokens.matches1(_types.TokenType.jsxTagEnd)) this.tokens.removeToken();
			this.tokens.replaceToken(")");
		}
		/**
		* Get the code for the relevant function for this context: jsx, jsxs,
		* or jsxDEV. The following open-paren is included as well.
		*
		* These functions are only used for the automatic runtime, so they are always
		* auto-imported, but the auto-import will be either CJS or ESM based on the
		* target module format.
		*/
		getJSXFuncInvocationCode(isStatic) {
			if (this.options.production) {
				if (isStatic) return this.claimAutoImportedFuncInvocation("jsxs", "/jsx-runtime");
				else return this.claimAutoImportedFuncInvocation("jsx", "/jsx-runtime");
			} else return this.claimAutoImportedFuncInvocation("jsxDEV", "/jsx-dev-runtime");
		}
		/**
		* Return the code to use for the createElement function, e.g.
		* `React.createElement`, including the following open-paren.
		*
		* This is the main function to use for the classic runtime. For the
		* automatic runtime, this function is used as a fallback function to
		* preserve behavior when there is a prop spread followed by an explicit
		* key. In that automatic runtime case, the function should be automatically
		* imported.
		*/
		getCreateElementInvocationCode() {
			if (this.isAutomaticRuntime) return this.claimAutoImportedFuncInvocation("createElement", "");
			else {
				const { jsxPragmaInfo } = this;
				return `${this.importProcessor ? this.importProcessor.getIdentifierReplacement(jsxPragmaInfo.base) || jsxPragmaInfo.base : jsxPragmaInfo.base}${jsxPragmaInfo.suffix}(`;
			}
		}
		/**
		* Return the code to use as the component when compiling a shorthand
		* fragment, e.g. `React.Fragment`.
		*
		* This may be called from either the classic or automatic runtime, and
		* the value should be auto-imported for the automatic runtime.
		*/
		getFragmentCode() {
			if (this.isAutomaticRuntime) return this.claimAutoImportedName("Fragment", this.options.production ? "/jsx-runtime" : "/jsx-dev-runtime");
			else {
				const { jsxPragmaInfo } = this;
				return (this.importProcessor ? this.importProcessor.getIdentifierReplacement(jsxPragmaInfo.fragmentBase) || jsxPragmaInfo.fragmentBase : jsxPragmaInfo.fragmentBase) + jsxPragmaInfo.fragmentSuffix;
			}
		}
		/**
		* Return code that invokes the given function.
		*
		* When the imports transform is enabled, use the CJSImportTransformer
		* strategy of using `.call(void 0, ...` to avoid passing a `this` value in a
		* situation that would otherwise look like a method call.
		*/
		claimAutoImportedFuncInvocation(funcName, importPathSuffix) {
			const funcCode = this.claimAutoImportedName(funcName, importPathSuffix);
			if (this.importProcessor) return `${funcCode}.call(void 0, `;
			else return `${funcCode}(`;
		}
		claimAutoImportedName(funcName, importPathSuffix) {
			if (this.importProcessor) {
				const path = this.jsxImportSource + importPathSuffix;
				if (!this.cjsAutomaticModuleNameResolutions[path]) this.cjsAutomaticModuleNameResolutions[path] = this.importProcessor.getFreeIdentifierForPath(path);
				return `${this.cjsAutomaticModuleNameResolutions[path]}.${funcName}`;
			} else {
				if (!this.esmAutomaticImportNameResolutions[funcName]) this.esmAutomaticImportNameResolutions[funcName] = this.nameManager.claimFreeName(`_${funcName}`);
				return this.esmAutomaticImportNameResolutions[funcName];
			}
		}
		/**
		* Process the first part of a tag, before any props.
		*/
		processTagIntro() {
			let introEnd = this.tokens.currentIndex() + 1;
			while (this.tokens.tokens[introEnd].isType || !this.tokens.matches2AtIndex(introEnd - 1, _types.TokenType.jsxName, _types.TokenType.jsxName) && !this.tokens.matches2AtIndex(introEnd - 1, _types.TokenType.greaterThan, _types.TokenType.jsxName) && !this.tokens.matches1AtIndex(introEnd, _types.TokenType.braceL) && !this.tokens.matches1AtIndex(introEnd, _types.TokenType.jsxTagEnd) && !this.tokens.matches2AtIndex(introEnd, _types.TokenType.slash, _types.TokenType.jsxTagEnd)) introEnd++;
			if (introEnd === this.tokens.currentIndex() + 1) {
				const tagName = this.tokens.identifierName();
				if (startsWithLowerCase(tagName)) this.tokens.replaceToken(`'${tagName}'`);
			}
			while (this.tokens.currentIndex() < introEnd) this.rootTransformer.processToken();
		}
		/**
		* Starting at the beginning of the props, add the props argument to
		* React.createElement, including the comma before it.
		*/
		processPropsObjectWithDevInfo(elementLocationCode) {
			const devProps = this.options.production ? "" : `__self: this, __source: ${this.getDevSource(elementLocationCode)}`;
			if (!this.tokens.matches1(_types.TokenType.jsxName) && !this.tokens.matches1(_types.TokenType.braceL)) {
				if (devProps) this.tokens.appendCode(`, {${devProps}}`);
				else this.tokens.appendCode(`, null`);
				return;
			}
			this.tokens.appendCode(`, {`);
			this.processProps(false);
			if (devProps) this.tokens.appendCode(` ${devProps}}`);
			else this.tokens.appendCode("}");
		}
		/**
		* Transform the core part of the props, assuming that a { has already been
		* inserted before us and that a } will be inserted after us.
		*
		* If extractKeyCode is true (i.e. when using any jsx... function), any prop
		* named "key" has its code captured and returned rather than being emitted to
		* the output code. This shifts line numbers, and emitting the code later will
		* correct line numbers again. If no key is found or if extractKeyCode is
		* false, this function returns null.
		*/
		processProps(extractKeyCode) {
			let keyCode = null;
			while (true) {
				if (this.tokens.matches2(_types.TokenType.jsxName, _types.TokenType.eq)) {
					const propName = this.tokens.identifierName();
					if (extractKeyCode && propName === "key") {
						if (keyCode !== null) this.tokens.appendCode(keyCode.replace(/[^\n]/g, ""));
						this.tokens.removeToken();
						this.tokens.removeToken();
						const snapshot = this.tokens.snapshot();
						this.processPropValue();
						keyCode = this.tokens.dangerouslyGetAndRemoveCodeSinceSnapshot(snapshot);
						continue;
					} else {
						this.processPropName(propName);
						this.tokens.replaceToken(": ");
						this.processPropValue();
					}
				} else if (this.tokens.matches1(_types.TokenType.jsxName)) {
					const propName = this.tokens.identifierName();
					this.processPropName(propName);
					this.tokens.appendCode(": true");
				} else if (this.tokens.matches1(_types.TokenType.braceL)) {
					this.tokens.replaceToken("");
					this.rootTransformer.processBalancedCode();
					this.tokens.replaceToken("");
				} else break;
				this.tokens.appendCode(",");
			}
			return keyCode;
		}
		processPropName(propName) {
			if (propName.includes("-")) this.tokens.replaceToken(`'${propName}'`);
			else this.tokens.copyToken();
		}
		processPropValue() {
			if (this.tokens.matches1(_types.TokenType.braceL)) {
				this.tokens.replaceToken("");
				this.rootTransformer.processBalancedCode();
				this.tokens.replaceToken("");
			} else if (this.tokens.matches1(_types.TokenType.jsxTagStart)) this.processJSXTag();
			else this.processStringPropValue();
		}
		processStringPropValue() {
			const token = this.tokens.currentToken();
			const valueCode = this.tokens.code.slice(token.start + 1, token.end - 1);
			const replacementCode = formatJSXTextReplacement(valueCode);
			const literalCode = formatJSXStringValueLiteral(valueCode);
			this.tokens.replaceToken(literalCode + replacementCode);
		}
		/**
		* Starting in the middle of the props object literal, produce an additional
		* prop for the children and close the object literal.
		*/
		processAutomaticChildrenAndEndProps(jsxRole) {
			if (jsxRole === _tokenizer.JSXRole.StaticChildren) {
				this.tokens.appendCode(" children: [");
				this.processChildren(false);
				this.tokens.appendCode("]}");
			} else {
				if (jsxRole === _tokenizer.JSXRole.OneChild) this.tokens.appendCode(" children: ");
				this.processChildren(false);
				this.tokens.appendCode("}");
			}
		}
		/**
		* Transform children into a comma-separated list, which will be either
		* arguments to createElement or array elements of a children prop.
		*/
		processChildren(needsInitialComma) {
			let needsComma = needsInitialComma;
			while (true) {
				if (this.tokens.matches2(_types.TokenType.jsxTagStart, _types.TokenType.slash)) return;
				let didEmitElement = false;
				if (this.tokens.matches1(_types.TokenType.braceL)) {
					if (this.tokens.matches2(_types.TokenType.braceL, _types.TokenType.braceR)) {
						this.tokens.replaceToken("");
						this.tokens.replaceToken("");
					} else {
						this.tokens.replaceToken(needsComma ? ", " : "");
						this.rootTransformer.processBalancedCode();
						this.tokens.replaceToken("");
						didEmitElement = true;
					}
				} else if (this.tokens.matches1(_types.TokenType.jsxTagStart)) {
					this.tokens.appendCode(needsComma ? ", " : "");
					this.processJSXTag();
					didEmitElement = true;
				} else if (this.tokens.matches1(_types.TokenType.jsxText) || this.tokens.matches1(_types.TokenType.jsxEmptyText)) didEmitElement = this.processChildTextElement(needsComma);
				else throw new Error("Unexpected token when processing JSX children.");
				if (didEmitElement) needsComma = true;
			}
		}
		/**
		* Turn a JSX text element into a string literal, or nothing at all if the JSX
		* text resolves to the empty string.
		*
		* Returns true if a string literal is emitted, false otherwise.
		*/
		processChildTextElement(needsComma) {
			const token = this.tokens.currentToken();
			const valueCode = this.tokens.code.slice(token.start, token.end);
			const replacementCode = formatJSXTextReplacement(valueCode);
			const literalCode = formatJSXTextLiteral(valueCode);
			if (literalCode === "\"\"") {
				this.tokens.replaceToken(replacementCode);
				return false;
			} else {
				this.tokens.replaceToken(`${needsComma ? ", " : ""}${literalCode}${replacementCode}`);
				return true;
			}
		}
		getDevSource(elementLocationCode) {
			return `{fileName: ${this.getFilenameVarName()}, ${elementLocationCode}}`;
		}
		getFilenameVarName() {
			if (!this.filenameVarName) this.filenameVarName = this.nameManager.claimFreeName("_jsxFileName");
			return this.filenameVarName;
		}
	};
	/**
	* Spec for identifiers: https://tc39.github.io/ecma262/#prod-IdentifierStart.
	*
	* Really only treat anything starting with a-z as tag names.  `_`, `$`, `é`
	* should be treated as component names
	*/
	function startsWithLowerCase(s) {
		const firstChar = s.charCodeAt(0);
		return firstChar >= _charcodes.charCodes.lowercaseA && firstChar <= _charcodes.charCodes.lowercaseZ;
	}
	exports.startsWithLowerCase = startsWithLowerCase;
	/**
	* Turn the given jsxText string into a JS string literal. Leading and trailing
	* whitespace on lines is removed, except immediately after the open-tag and
	* before the close-tag. Empty lines are completely removed, and spaces are
	* added between lines after that.
	*
	* We use JSON.stringify to introduce escape characters as necessary, and trim
	* the start and end of each line and remove blank lines.
	*/
	function formatJSXTextLiteral(text) {
		let result = "";
		let whitespace = "";
		let isInInitialLineWhitespace = false;
		let seenNonWhitespace = false;
		for (let i = 0; i < text.length; i++) {
			const c = text[i];
			if (c === " " || c === "	" || c === "\r") {
				if (!isInInitialLineWhitespace) whitespace += c;
			} else if (c === "\n") {
				whitespace = "";
				isInInitialLineWhitespace = true;
			} else {
				if (seenNonWhitespace && isInInitialLineWhitespace) result += " ";
				result += whitespace;
				whitespace = "";
				if (c === "&") {
					const { entity, newI } = processEntity(text, i + 1);
					i = newI - 1;
					result += entity;
				} else result += c;
				seenNonWhitespace = true;
				isInInitialLineWhitespace = false;
			}
		}
		if (!isInInitialLineWhitespace) result += whitespace;
		return JSON.stringify(result);
	}
	/**
	* Produce the code that should be printed after the JSX text string literal,
	* with most content removed, but all newlines preserved and all spacing at the
	* end preserved.
	*/
	function formatJSXTextReplacement(text) {
		let numNewlines = 0;
		let numSpaces = 0;
		for (const c of text) if (c === "\n") {
			numNewlines++;
			numSpaces = 0;
		} else if (c === " ") numSpaces++;
		return "\n".repeat(numNewlines) + " ".repeat(numSpaces);
	}
	/**
	* Format a string in the value position of a JSX prop.
	*
	* Use the same implementation as convertAttribute from
	* babel-helper-builder-react-jsx.
	*/
	function formatJSXStringValueLiteral(text) {
		let result = "";
		for (let i = 0; i < text.length; i++) {
			const c = text[i];
			if (c === "\n") {
				if (/\s/.test(text[i + 1])) {
					result += " ";
					while (i < text.length && /\s/.test(text[i + 1])) i++;
				} else result += "\n";
			} else if (c === "&") {
				const { entity, newI } = processEntity(text, i + 1);
				result += entity;
				i = newI - 1;
			} else result += c;
		}
		return JSON.stringify(result);
	}
	/**
	* Starting at a &, see if there's an HTML entity (specified by name, decimal
	* char code, or hex char code) and return it if so.
	*
	* Modified from jsxReadString in babel-parser.
	*/
	function processEntity(text, indexAfterAmpersand) {
		let str = "";
		let count = 0;
		let entity;
		let i = indexAfterAmpersand;
		if (text[i] === "#") {
			let radix = 10;
			i++;
			let numStart;
			if (text[i] === "x") {
				radix = 16;
				i++;
				numStart = i;
				while (i < text.length && isHexDigit(text.charCodeAt(i))) i++;
			} else {
				numStart = i;
				while (i < text.length && isDecimalDigit(text.charCodeAt(i))) i++;
			}
			if (text[i] === ";") {
				const numStr = text.slice(numStart, i);
				if (numStr) {
					i++;
					entity = String.fromCodePoint(parseInt(numStr, radix));
				}
			}
		} else while (i < text.length && count++ < 10) {
			const ch = text[i];
			i++;
			if (ch === ";") {
				entity = _xhtml2.default.get(str);
				break;
			}
			str += ch;
		}
		if (!entity) return {
			entity: "&",
			newI: indexAfterAmpersand
		};
		return {
			entity,
			newI: i
		};
	}
	function isDecimalDigit(code) {
		return code >= _charcodes.charCodes.digit0 && code <= _charcodes.charCodes.digit9;
	}
	function isHexDigit(code) {
		return code >= _charcodes.charCodes.digit0 && code <= _charcodes.charCodes.digit9 || code >= _charcodes.charCodes.lowercaseA && code <= _charcodes.charCodes.lowercaseF || code >= _charcodes.charCodes.uppercaseA && code <= _charcodes.charCodes.uppercaseF;
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/util/getNonTypeIdentifiers.js
var require_getNonTypeIdentifiers = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _tokenizer = require_tokenizer();
	var _types = require_types$2();
	var _JSXTransformer = require_JSXTransformer();
	var _getJSXPragmaInfo2 = _interopRequireDefault(require_getJSXPragmaInfo());
	function getNonTypeIdentifiers(tokens, options) {
		const jsxPragmaInfo = _getJSXPragmaInfo2.default.call(void 0, options);
		const nonTypeIdentifiers = /* @__PURE__ */ new Set();
		for (let i = 0; i < tokens.tokens.length; i++) {
			const token = tokens.tokens[i];
			if (token.type === _types.TokenType.name && !token.isType && (token.identifierRole === _tokenizer.IdentifierRole.Access || token.identifierRole === _tokenizer.IdentifierRole.ObjectShorthand || token.identifierRole === _tokenizer.IdentifierRole.ExportAccess) && !token.shadowsGlobal) nonTypeIdentifiers.add(tokens.identifierNameForToken(token));
			if (token.type === _types.TokenType.jsxTagStart) nonTypeIdentifiers.add(jsxPragmaInfo.base);
			if (token.type === _types.TokenType.jsxTagStart && i + 1 < tokens.tokens.length && tokens.tokens[i + 1].type === _types.TokenType.jsxTagEnd) {
				nonTypeIdentifiers.add(jsxPragmaInfo.base);
				nonTypeIdentifiers.add(jsxPragmaInfo.fragmentBase);
			}
			if (token.type === _types.TokenType.jsxName && token.identifierRole === _tokenizer.IdentifierRole.Access) {
				const identifierName = tokens.identifierNameForToken(token);
				if (!_JSXTransformer.startsWithLowerCase.call(void 0, identifierName) || tokens.tokens[i + 1].type === _types.TokenType.dot) nonTypeIdentifiers.add(tokens.identifierNameForToken(token));
			}
		}
		return nonTypeIdentifiers;
	}
	exports.getNonTypeIdentifiers = getNonTypeIdentifiers;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/CJSImportProcessor.js
var require_CJSImportProcessor = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _tokenizer = require_tokenizer();
	var _keywords = require_keywords();
	var _types = require_types$2();
	var _getImportExportSpecifierInfo2 = _interopRequireDefault(require_getImportExportSpecifierInfo());
	var _getNonTypeIdentifiers = require_getNonTypeIdentifiers();
	exports.default = class CJSImportProcessor {
		__init() {
			this.nonTypeIdentifiers = /* @__PURE__ */ new Set();
		}
		__init2() {
			this.importInfoByPath = /* @__PURE__ */ new Map();
		}
		__init3() {
			this.importsToReplace = /* @__PURE__ */ new Map();
		}
		__init4() {
			this.identifierReplacements = /* @__PURE__ */ new Map();
		}
		__init5() {
			this.exportBindingsByLocalName = /* @__PURE__ */ new Map();
		}
		constructor(nameManager, tokens, enableLegacyTypeScriptModuleInterop, options, isTypeScriptTransformEnabled, keepUnusedImports, helperManager) {
			this.nameManager = nameManager;
			this.tokens = tokens;
			this.enableLegacyTypeScriptModuleInterop = enableLegacyTypeScriptModuleInterop;
			this.options = options;
			this.isTypeScriptTransformEnabled = isTypeScriptTransformEnabled;
			this.keepUnusedImports = keepUnusedImports;
			this.helperManager = helperManager;
			CJSImportProcessor.prototype.__init.call(this);
			CJSImportProcessor.prototype.__init2.call(this);
			CJSImportProcessor.prototype.__init3.call(this);
			CJSImportProcessor.prototype.__init4.call(this);
			CJSImportProcessor.prototype.__init5.call(this);
		}
		preprocessTokens() {
			for (let i = 0; i < this.tokens.tokens.length; i++) {
				if (this.tokens.matches1AtIndex(i, _types.TokenType._import) && !this.tokens.matches3AtIndex(i, _types.TokenType._import, _types.TokenType.name, _types.TokenType.eq)) this.preprocessImportAtIndex(i);
				if (this.tokens.matches1AtIndex(i, _types.TokenType._export) && !this.tokens.matches2AtIndex(i, _types.TokenType._export, _types.TokenType.eq)) this.preprocessExportAtIndex(i);
			}
			this.generateImportReplacements();
		}
		/**
		* In TypeScript, import statements that only import types should be removed.
		* This includes `import {} from 'foo';`, but not `import 'foo';`.
		*/
		pruneTypeOnlyImports() {
			this.nonTypeIdentifiers = _getNonTypeIdentifiers.getNonTypeIdentifiers.call(void 0, this.tokens, this.options);
			for (const [path, importInfo] of this.importInfoByPath.entries()) {
				if (importInfo.hasBareImport || importInfo.hasStarExport || importInfo.exportStarNames.length > 0 || importInfo.namedExports.length > 0) continue;
				if ([
					...importInfo.defaultNames,
					...importInfo.wildcardNames,
					...importInfo.namedImports.map(({ localName }) => localName)
				].every((name) => this.shouldAutomaticallyElideImportedName(name))) this.importsToReplace.set(path, "");
			}
		}
		shouldAutomaticallyElideImportedName(name) {
			return this.isTypeScriptTransformEnabled && !this.keepUnusedImports && !this.nonTypeIdentifiers.has(name);
		}
		generateImportReplacements() {
			for (const [path, importInfo] of this.importInfoByPath.entries()) {
				const { defaultNames, wildcardNames, namedImports, namedExports, exportStarNames, hasStarExport } = importInfo;
				if (defaultNames.length === 0 && wildcardNames.length === 0 && namedImports.length === 0 && namedExports.length === 0 && exportStarNames.length === 0 && !hasStarExport) {
					this.importsToReplace.set(path, `require('${path}');`);
					continue;
				}
				const primaryImportName = this.getFreeIdentifierForPath(path);
				let secondaryImportName;
				if (this.enableLegacyTypeScriptModuleInterop) secondaryImportName = primaryImportName;
				else secondaryImportName = wildcardNames.length > 0 ? wildcardNames[0] : this.getFreeIdentifierForPath(path);
				let requireCode = `var ${primaryImportName} = require('${path}');`;
				if (wildcardNames.length > 0) for (const wildcardName of wildcardNames) {
					const moduleExpr = this.enableLegacyTypeScriptModuleInterop ? primaryImportName : `${this.helperManager.getHelperName("interopRequireWildcard")}(${primaryImportName})`;
					requireCode += ` var ${wildcardName} = ${moduleExpr};`;
				}
				else if (exportStarNames.length > 0 && secondaryImportName !== primaryImportName) requireCode += ` var ${secondaryImportName} = ${this.helperManager.getHelperName("interopRequireWildcard")}(${primaryImportName});`;
				else if (defaultNames.length > 0 && secondaryImportName !== primaryImportName) requireCode += ` var ${secondaryImportName} = ${this.helperManager.getHelperName("interopRequireDefault")}(${primaryImportName});`;
				for (const { importedName, localName } of namedExports) requireCode += ` ${this.helperManager.getHelperName("createNamedExportFrom")}(${primaryImportName}, '${localName}', '${importedName}');`;
				for (const exportStarName of exportStarNames) requireCode += ` exports.${exportStarName} = ${secondaryImportName};`;
				if (hasStarExport) requireCode += ` ${this.helperManager.getHelperName("createStarExport")}(${primaryImportName});`;
				this.importsToReplace.set(path, requireCode);
				for (const defaultName of defaultNames) this.identifierReplacements.set(defaultName, `${secondaryImportName}.default`);
				for (const { importedName, localName } of namedImports) this.identifierReplacements.set(localName, `${primaryImportName}.${importedName}`);
			}
		}
		getFreeIdentifierForPath(path) {
			const components = path.split("/");
			const baseName = components[components.length - 1].replace(/\W/g, "");
			return this.nameManager.claimFreeName(`_${baseName}`);
		}
		preprocessImportAtIndex(index) {
			const defaultNames = [];
			const wildcardNames = [];
			const namedImports = [];
			index++;
			if ((this.tokens.matchesContextualAtIndex(index, _keywords.ContextualKeyword._type) || this.tokens.matches1AtIndex(index, _types.TokenType._typeof)) && !this.tokens.matches1AtIndex(index + 1, _types.TokenType.comma) && !this.tokens.matchesContextualAtIndex(index + 1, _keywords.ContextualKeyword._from)) return;
			if (this.tokens.matches1AtIndex(index, _types.TokenType.parenL)) return;
			if (this.tokens.matches1AtIndex(index, _types.TokenType.name)) {
				defaultNames.push(this.tokens.identifierNameAtIndex(index));
				index++;
				if (this.tokens.matches1AtIndex(index, _types.TokenType.comma)) index++;
			}
			if (this.tokens.matches1AtIndex(index, _types.TokenType.star)) {
				index += 2;
				wildcardNames.push(this.tokens.identifierNameAtIndex(index));
				index++;
			}
			if (this.tokens.matches1AtIndex(index, _types.TokenType.braceL)) {
				const result = this.getNamedImports(index + 1);
				index = result.newIndex;
				for (const namedImport of result.namedImports) if (namedImport.importedName === "default") defaultNames.push(namedImport.localName);
				else namedImports.push(namedImport);
			}
			if (this.tokens.matchesContextualAtIndex(index, _keywords.ContextualKeyword._from)) index++;
			if (!this.tokens.matches1AtIndex(index, _types.TokenType.string)) throw new Error("Expected string token at the end of import statement.");
			const path = this.tokens.stringValueAtIndex(index);
			const importInfo = this.getImportInfo(path);
			importInfo.defaultNames.push(...defaultNames);
			importInfo.wildcardNames.push(...wildcardNames);
			importInfo.namedImports.push(...namedImports);
			if (defaultNames.length === 0 && wildcardNames.length === 0 && namedImports.length === 0) importInfo.hasBareImport = true;
		}
		preprocessExportAtIndex(index) {
			if (this.tokens.matches2AtIndex(index, _types.TokenType._export, _types.TokenType._var) || this.tokens.matches2AtIndex(index, _types.TokenType._export, _types.TokenType._let) || this.tokens.matches2AtIndex(index, _types.TokenType._export, _types.TokenType._const)) this.preprocessVarExportAtIndex(index);
			else if (this.tokens.matches2AtIndex(index, _types.TokenType._export, _types.TokenType._function) || this.tokens.matches2AtIndex(index, _types.TokenType._export, _types.TokenType._class)) {
				const exportName = this.tokens.identifierNameAtIndex(index + 2);
				this.addExportBinding(exportName, exportName);
			} else if (this.tokens.matches3AtIndex(index, _types.TokenType._export, _types.TokenType.name, _types.TokenType._function)) {
				const exportName = this.tokens.identifierNameAtIndex(index + 3);
				this.addExportBinding(exportName, exportName);
			} else if (this.tokens.matches2AtIndex(index, _types.TokenType._export, _types.TokenType.braceL)) this.preprocessNamedExportAtIndex(index);
			else if (this.tokens.matches2AtIndex(index, _types.TokenType._export, _types.TokenType.star)) this.preprocessExportStarAtIndex(index);
		}
		preprocessVarExportAtIndex(index) {
			let depth = 0;
			for (let i = index + 2;; i++) if (this.tokens.matches1AtIndex(i, _types.TokenType.braceL) || this.tokens.matches1AtIndex(i, _types.TokenType.dollarBraceL) || this.tokens.matches1AtIndex(i, _types.TokenType.bracketL)) depth++;
			else if (this.tokens.matches1AtIndex(i, _types.TokenType.braceR) || this.tokens.matches1AtIndex(i, _types.TokenType.bracketR)) depth--;
			else if (depth === 0 && !this.tokens.matches1AtIndex(i, _types.TokenType.name)) break;
			else if (this.tokens.matches1AtIndex(1, _types.TokenType.eq)) {
				const endIndex = this.tokens.currentToken().rhsEndIndex;
				if (endIndex == null) throw new Error("Expected = token with an end index.");
				i = endIndex - 1;
			} else {
				const token = this.tokens.tokens[i];
				if (_tokenizer.isDeclaration.call(void 0, token)) {
					const exportName = this.tokens.identifierNameAtIndex(i);
					this.identifierReplacements.set(exportName, `exports.${exportName}`);
				}
			}
		}
		/**
		* Walk this export statement just in case it's an export...from statement.
		* If it is, combine it into the import info for that path. Otherwise, just
		* bail out; it'll be handled later.
		*/
		preprocessNamedExportAtIndex(index) {
			index += 2;
			const { newIndex, namedImports } = this.getNamedImports(index);
			index = newIndex;
			if (this.tokens.matchesContextualAtIndex(index, _keywords.ContextualKeyword._from)) index++;
			else {
				for (const { importedName: localName, localName: exportedName } of namedImports) this.addExportBinding(localName, exportedName);
				return;
			}
			if (!this.tokens.matches1AtIndex(index, _types.TokenType.string)) throw new Error("Expected string token at the end of import statement.");
			const path = this.tokens.stringValueAtIndex(index);
			this.getImportInfo(path).namedExports.push(...namedImports);
		}
		preprocessExportStarAtIndex(index) {
			let exportedName = null;
			if (this.tokens.matches3AtIndex(index, _types.TokenType._export, _types.TokenType.star, _types.TokenType._as)) {
				index += 3;
				exportedName = this.tokens.identifierNameAtIndex(index);
				index += 2;
			} else index += 3;
			if (!this.tokens.matches1AtIndex(index, _types.TokenType.string)) throw new Error("Expected string token at the end of star export statement.");
			const path = this.tokens.stringValueAtIndex(index);
			const importInfo = this.getImportInfo(path);
			if (exportedName !== null) importInfo.exportStarNames.push(exportedName);
			else importInfo.hasStarExport = true;
		}
		getNamedImports(index) {
			const namedImports = [];
			while (true) {
				if (this.tokens.matches1AtIndex(index, _types.TokenType.braceR)) {
					index++;
					break;
				}
				const specifierInfo = _getImportExportSpecifierInfo2.default.call(void 0, this.tokens, index);
				index = specifierInfo.endIndex;
				if (!specifierInfo.isType) namedImports.push({
					importedName: specifierInfo.leftName,
					localName: specifierInfo.rightName
				});
				if (this.tokens.matches2AtIndex(index, _types.TokenType.comma, _types.TokenType.braceR)) {
					index += 2;
					break;
				} else if (this.tokens.matches1AtIndex(index, _types.TokenType.braceR)) {
					index++;
					break;
				} else if (this.tokens.matches1AtIndex(index, _types.TokenType.comma)) index++;
				else throw new Error(`Unexpected token: ${JSON.stringify(this.tokens.tokens[index])}`);
			}
			return {
				newIndex: index,
				namedImports
			};
		}
		/**
		* Get a mutable import info object for this path, creating one if it doesn't
		* exist yet.
		*/
		getImportInfo(path) {
			const existingInfo = this.importInfoByPath.get(path);
			if (existingInfo) return existingInfo;
			const newInfo = {
				defaultNames: [],
				wildcardNames: [],
				namedImports: [],
				namedExports: [],
				hasBareImport: false,
				exportStarNames: [],
				hasStarExport: false
			};
			this.importInfoByPath.set(path, newInfo);
			return newInfo;
		}
		addExportBinding(localName, exportedName) {
			if (!this.exportBindingsByLocalName.has(localName)) this.exportBindingsByLocalName.set(localName, []);
			this.exportBindingsByLocalName.get(localName).push(exportedName);
		}
		/**
		* Return the code to use for the import for this path, or the empty string if
		* the code has already been "claimed" by a previous import.
		*/
		claimImportCode(importPath) {
			const result = this.importsToReplace.get(importPath);
			this.importsToReplace.set(importPath, "");
			return result || "";
		}
		getIdentifierReplacement(identifierName) {
			return this.identifierReplacements.get(identifierName) || null;
		}
		/**
		* Return a string like `exports.foo = exports.bar`.
		*/
		resolveExportBinding(assignedName) {
			const exportedNames = this.exportBindingsByLocalName.get(assignedName);
			if (!exportedNames || exportedNames.length === 0) return null;
			return exportedNames.map((exportedName) => `exports.${exportedName}`).join(" = ");
		}
		/**
		* Return all imported/exported names where we might be interested in whether usages of those
		* names are shadowed.
		*/
		getGlobalNames() {
			return /* @__PURE__ */ new Set([...this.identifierReplacements.keys(), ...this.exportBindingsByLocalName.keys()]);
		}
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/@jridgewell+sourcemap-codec@1.5.5/node_modules/@jridgewell/sourcemap-codec/dist/sourcemap-codec.umd.js
var require_sourcemap_codec_umd = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	(function(global, factory) {
		if (typeof exports === "object" && typeof module !== "undefined") {
			factory(module);
			module.exports = def(module);
		} else if (typeof define === "function" && define.amd) define(["module"], function(mod) {
			factory.apply(this, arguments);
			mod.exports = def(mod);
		});
		else {
			const mod = { exports: {} };
			factory(mod);
			global = typeof globalThis !== "undefined" ? globalThis : global || self;
			global.sourcemapCodec = def(mod);
		}
		function def(m) {
			return "default" in m.exports ? m.exports.default : m.exports;
		}
	})(exports, (function(module$3) {
		"use strict";
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __export = (target, all) => {
			for (var name in all) __defProp(target, name, {
				get: all[name],
				enumerable: true
			});
		};
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") {
				for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: () => from[key],
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
		var sourcemap_codec_exports = {};
		__export(sourcemap_codec_exports, {
			decode: () => decode,
			decodeGeneratedRanges: () => decodeGeneratedRanges,
			decodeOriginalScopes: () => decodeOriginalScopes,
			encode: () => encode,
			encodeGeneratedRanges: () => encodeGeneratedRanges,
			encodeOriginalScopes: () => encodeOriginalScopes
		});
		module$3.exports = __toCommonJS(sourcemap_codec_exports);
		var comma = ",".charCodeAt(0);
		var semicolon = ";".charCodeAt(0);
		var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		var intToChar = /* @__PURE__ */ new Uint8Array(64);
		var charToInt = /* @__PURE__ */ new Uint8Array(128);
		for (let i = 0; i < chars.length; i++) {
			const c = chars.charCodeAt(i);
			intToChar[i] = c;
			charToInt[c] = i;
		}
		function decodeInteger(reader, relative) {
			let value = 0;
			let shift = 0;
			let integer = 0;
			do {
				integer = charToInt[reader.next()];
				value |= (integer & 31) << shift;
				shift += 5;
			} while (integer & 32);
			const shouldNegate = value & 1;
			value >>>= 1;
			if (shouldNegate) value = -2147483648 | -value;
			return relative + value;
		}
		function encodeInteger(builder, num, relative) {
			let delta = num - relative;
			delta = delta < 0 ? -delta << 1 | 1 : delta << 1;
			do {
				let clamped = delta & 31;
				delta >>>= 5;
				if (delta > 0) clamped |= 32;
				builder.write(intToChar[clamped]);
			} while (delta > 0);
			return num;
		}
		function hasMoreVlq(reader, max) {
			if (reader.pos >= max) return false;
			return reader.peek() !== comma;
		}
		var bufLength = 16384;
		var td = typeof TextDecoder !== "undefined" ? /* @__PURE__ */ new TextDecoder() : typeof Buffer !== "undefined" ? { decode(buf) {
			return Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength).toString();
		} } : { decode(buf) {
			let out = "";
			for (let i = 0; i < buf.length; i++) out += String.fromCharCode(buf[i]);
			return out;
		} };
		var StringWriter = class {
			constructor() {
				this.pos = 0;
				this.out = "";
				this.buffer = new Uint8Array(bufLength);
			}
			write(v) {
				const { buffer } = this;
				buffer[this.pos++] = v;
				if (this.pos === bufLength) {
					this.out += td.decode(buffer);
					this.pos = 0;
				}
			}
			flush() {
				const { buffer, out, pos } = this;
				return pos > 0 ? out + td.decode(buffer.subarray(0, pos)) : out;
			}
		};
		var StringReader = class {
			constructor(buffer) {
				this.pos = 0;
				this.buffer = buffer;
			}
			next() {
				return this.buffer.charCodeAt(this.pos++);
			}
			peek() {
				return this.buffer.charCodeAt(this.pos);
			}
			indexOf(char) {
				const { buffer, pos } = this;
				const idx = buffer.indexOf(char, pos);
				return idx === -1 ? buffer.length : idx;
			}
		};
		var EMPTY = [];
		function decodeOriginalScopes(input) {
			const { length } = input;
			const reader = new StringReader(input);
			const scopes = [];
			const stack = [];
			let line = 0;
			for (; reader.pos < length; reader.pos++) {
				line = decodeInteger(reader, line);
				const column = decodeInteger(reader, 0);
				if (!hasMoreVlq(reader, length)) {
					const last = stack.pop();
					last[2] = line;
					last[3] = column;
					continue;
				}
				const kind = decodeInteger(reader, 0);
				const scope = decodeInteger(reader, 0) & 1 ? [
					line,
					column,
					0,
					0,
					kind,
					decodeInteger(reader, 0)
				] : [
					line,
					column,
					0,
					0,
					kind
				];
				let vars = EMPTY;
				if (hasMoreVlq(reader, length)) {
					vars = [];
					do {
						const varsIndex = decodeInteger(reader, 0);
						vars.push(varsIndex);
					} while (hasMoreVlq(reader, length));
				}
				scope.vars = vars;
				scopes.push(scope);
				stack.push(scope);
			}
			return scopes;
		}
		function encodeOriginalScopes(scopes) {
			const writer = new StringWriter();
			for (let i = 0; i < scopes.length;) i = _encodeOriginalScopes(scopes, i, writer, [0]);
			return writer.flush();
		}
		function _encodeOriginalScopes(scopes, index, writer, state) {
			const scope = scopes[index];
			const { 0: startLine, 1: startColumn, 2: endLine, 3: endColumn, 4: kind, vars } = scope;
			if (index > 0) writer.write(comma);
			state[0] = encodeInteger(writer, startLine, state[0]);
			encodeInteger(writer, startColumn, 0);
			encodeInteger(writer, kind, 0);
			encodeInteger(writer, scope.length === 6 ? 1 : 0, 0);
			if (scope.length === 6) encodeInteger(writer, scope[5], 0);
			for (const v of vars) encodeInteger(writer, v, 0);
			for (index++; index < scopes.length;) {
				const { 0: l, 1: c } = scopes[index];
				if (l > endLine || l === endLine && c >= endColumn) break;
				index = _encodeOriginalScopes(scopes, index, writer, state);
			}
			writer.write(comma);
			state[0] = encodeInteger(writer, endLine, state[0]);
			encodeInteger(writer, endColumn, 0);
			return index;
		}
		function decodeGeneratedRanges(input) {
			const { length } = input;
			const reader = new StringReader(input);
			const ranges = [];
			const stack = [];
			let genLine = 0;
			let definitionSourcesIndex = 0;
			let definitionScopeIndex = 0;
			let callsiteSourcesIndex = 0;
			let callsiteLine = 0;
			let callsiteColumn = 0;
			let bindingLine = 0;
			let bindingColumn = 0;
			do {
				const semi = reader.indexOf(";");
				let genColumn = 0;
				for (; reader.pos < semi; reader.pos++) {
					genColumn = decodeInteger(reader, genColumn);
					if (!hasMoreVlq(reader, semi)) {
						const last = stack.pop();
						last[2] = genLine;
						last[3] = genColumn;
						continue;
					}
					const fields = decodeInteger(reader, 0);
					const hasDefinition = fields & 1;
					const hasCallsite = fields & 2;
					const hasScope = fields & 4;
					let callsite = null;
					let bindings = EMPTY;
					let range;
					if (hasDefinition) {
						const defSourcesIndex = decodeInteger(reader, definitionSourcesIndex);
						definitionScopeIndex = decodeInteger(reader, definitionSourcesIndex === defSourcesIndex ? definitionScopeIndex : 0);
						definitionSourcesIndex = defSourcesIndex;
						range = [
							genLine,
							genColumn,
							0,
							0,
							defSourcesIndex,
							definitionScopeIndex
						];
					} else range = [
						genLine,
						genColumn,
						0,
						0
					];
					range.isScope = !!hasScope;
					if (hasCallsite) {
						const prevCsi = callsiteSourcesIndex;
						const prevLine = callsiteLine;
						callsiteSourcesIndex = decodeInteger(reader, callsiteSourcesIndex);
						const sameSource = prevCsi === callsiteSourcesIndex;
						callsiteLine = decodeInteger(reader, sameSource ? callsiteLine : 0);
						callsiteColumn = decodeInteger(reader, sameSource && prevLine === callsiteLine ? callsiteColumn : 0);
						callsite = [
							callsiteSourcesIndex,
							callsiteLine,
							callsiteColumn
						];
					}
					range.callsite = callsite;
					if (hasMoreVlq(reader, semi)) {
						bindings = [];
						do {
							bindingLine = genLine;
							bindingColumn = genColumn;
							const expressionsCount = decodeInteger(reader, 0);
							let expressionRanges;
							if (expressionsCount < -1) {
								expressionRanges = [[decodeInteger(reader, 0)]];
								for (let i = -1; i > expressionsCount; i--) {
									const prevBl = bindingLine;
									bindingLine = decodeInteger(reader, bindingLine);
									bindingColumn = decodeInteger(reader, bindingLine === prevBl ? bindingColumn : 0);
									const expression = decodeInteger(reader, 0);
									expressionRanges.push([
										expression,
										bindingLine,
										bindingColumn
									]);
								}
							} else expressionRanges = [[expressionsCount]];
							bindings.push(expressionRanges);
						} while (hasMoreVlq(reader, semi));
					}
					range.bindings = bindings;
					ranges.push(range);
					stack.push(range);
				}
				genLine++;
				reader.pos = semi + 1;
			} while (reader.pos < length);
			return ranges;
		}
		function encodeGeneratedRanges(ranges) {
			if (ranges.length === 0) return "";
			const writer = new StringWriter();
			for (let i = 0; i < ranges.length;) i = _encodeGeneratedRanges(ranges, i, writer, [
				0,
				0,
				0,
				0,
				0,
				0,
				0
			]);
			return writer.flush();
		}
		function _encodeGeneratedRanges(ranges, index, writer, state) {
			const range = ranges[index];
			const { 0: startLine, 1: startColumn, 2: endLine, 3: endColumn, isScope, callsite, bindings } = range;
			if (state[0] < startLine) {
				catchupLine(writer, state[0], startLine);
				state[0] = startLine;
				state[1] = 0;
			} else if (index > 0) writer.write(comma);
			state[1] = encodeInteger(writer, range[1], state[1]);
			encodeInteger(writer, (range.length === 6 ? 1 : 0) | (callsite ? 2 : 0) | (isScope ? 4 : 0), 0);
			if (range.length === 6) {
				const { 4: sourcesIndex, 5: scopesIndex } = range;
				if (sourcesIndex !== state[2]) state[3] = 0;
				state[2] = encodeInteger(writer, sourcesIndex, state[2]);
				state[3] = encodeInteger(writer, scopesIndex, state[3]);
			}
			if (callsite) {
				const { 0: sourcesIndex, 1: callLine, 2: callColumn } = range.callsite;
				if (sourcesIndex !== state[4]) {
					state[5] = 0;
					state[6] = 0;
				} else if (callLine !== state[5]) state[6] = 0;
				state[4] = encodeInteger(writer, sourcesIndex, state[4]);
				state[5] = encodeInteger(writer, callLine, state[5]);
				state[6] = encodeInteger(writer, callColumn, state[6]);
			}
			if (bindings) for (const binding of bindings) {
				if (binding.length > 1) encodeInteger(writer, -binding.length, 0);
				const expression = binding[0][0];
				encodeInteger(writer, expression, 0);
				let bindingStartLine = startLine;
				let bindingStartColumn = startColumn;
				for (let i = 1; i < binding.length; i++) {
					const expRange = binding[i];
					bindingStartLine = encodeInteger(writer, expRange[1], bindingStartLine);
					bindingStartColumn = encodeInteger(writer, expRange[2], bindingStartColumn);
					encodeInteger(writer, expRange[0], 0);
				}
			}
			for (index++; index < ranges.length;) {
				const { 0: l, 1: c } = ranges[index];
				if (l > endLine || l === endLine && c >= endColumn) break;
				index = _encodeGeneratedRanges(ranges, index, writer, state);
			}
			if (state[0] < endLine) {
				catchupLine(writer, state[0], endLine);
				state[0] = endLine;
				state[1] = 0;
			} else writer.write(comma);
			state[1] = encodeInteger(writer, endColumn, state[1]);
			return index;
		}
		function catchupLine(writer, lastLine, line) {
			do
				writer.write(semicolon);
			while (++lastLine < line);
		}
		function decode(mappings) {
			const { length } = mappings;
			const reader = new StringReader(mappings);
			const decoded = [];
			let genColumn = 0;
			let sourcesIndex = 0;
			let sourceLine = 0;
			let sourceColumn = 0;
			let namesIndex = 0;
			do {
				const semi = reader.indexOf(";");
				const line = [];
				let sorted = true;
				let lastCol = 0;
				genColumn = 0;
				while (reader.pos < semi) {
					let seg;
					genColumn = decodeInteger(reader, genColumn);
					if (genColumn < lastCol) sorted = false;
					lastCol = genColumn;
					if (hasMoreVlq(reader, semi)) {
						sourcesIndex = decodeInteger(reader, sourcesIndex);
						sourceLine = decodeInteger(reader, sourceLine);
						sourceColumn = decodeInteger(reader, sourceColumn);
						if (hasMoreVlq(reader, semi)) {
							namesIndex = decodeInteger(reader, namesIndex);
							seg = [
								genColumn,
								sourcesIndex,
								sourceLine,
								sourceColumn,
								namesIndex
							];
						} else seg = [
							genColumn,
							sourcesIndex,
							sourceLine,
							sourceColumn
						];
					} else seg = [genColumn];
					line.push(seg);
					reader.pos++;
				}
				if (!sorted) sort(line);
				decoded.push(line);
				reader.pos = semi + 1;
			} while (reader.pos <= length);
			return decoded;
		}
		function sort(line) {
			line.sort(sortComparator);
		}
		function sortComparator(a, b) {
			return a[0] - b[0];
		}
		function encode(decoded) {
			const writer = new StringWriter();
			let sourcesIndex = 0;
			let sourceLine = 0;
			let sourceColumn = 0;
			let namesIndex = 0;
			for (let i = 0; i < decoded.length; i++) {
				const line = decoded[i];
				if (i > 0) writer.write(semicolon);
				if (line.length === 0) continue;
				let genColumn = 0;
				for (let j = 0; j < line.length; j++) {
					const segment = line[j];
					if (j > 0) writer.write(comma);
					genColumn = encodeInteger(writer, segment[0], genColumn);
					if (segment.length === 1) continue;
					sourcesIndex = encodeInteger(writer, segment[1], sourcesIndex);
					sourceLine = encodeInteger(writer, segment[2], sourceLine);
					sourceColumn = encodeInteger(writer, segment[3], sourceColumn);
					if (segment.length === 4) continue;
					namesIndex = encodeInteger(writer, segment[4], namesIndex);
				}
			}
			return writer.flush();
		}
	}));
}));
//#endregion
//#region ../../node_modules/.pnpm/@jridgewell+resolve-uri@3.1.2/node_modules/@jridgewell/resolve-uri/dist/resolve-uri.umd.js
var require_resolve_uri_umd = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	(function(global, factory) {
		typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, global.resolveURI = factory());
	})(exports, (function() {
		"use strict";
		const schemeRegex = /^[\w+.-]+:\/\//;
		/**
		* Matches the parts of a URL:
		* 1. Scheme, including ":", guaranteed.
		* 2. User/password, including "@", optional.
		* 3. Host, guaranteed.
		* 4. Port, including ":", optional.
		* 5. Path, including "/", optional.
		* 6. Query, including "?", optional.
		* 7. Hash, including "#", optional.
		*/
		const urlRegex = /^([\w+.-]+:)\/\/([^@/#?]*@)?([^:/#?]*)(:\d+)?(\/[^#?]*)?(\?[^#]*)?(#.*)?/;
		/**
		* File URLs are weird. They dont' need the regular `//` in the scheme, they may or may not start
		* with a leading `/`, they can have a domain (but only if they don't start with a Windows drive).
		*
		* 1. Host, optional.
		* 2. Path, which may include "/", guaranteed.
		* 3. Query, including "?", optional.
		* 4. Hash, including "#", optional.
		*/
		const fileRegex = /^file:(?:\/\/((?![a-z]:)[^/#?]*)?)?(\/?[^#?]*)(\?[^#]*)?(#.*)?/i;
		function isAbsoluteUrl(input) {
			return schemeRegex.test(input);
		}
		function isSchemeRelativeUrl(input) {
			return input.startsWith("//");
		}
		function isAbsolutePath(input) {
			return input.startsWith("/");
		}
		function isFileUrl(input) {
			return input.startsWith("file:");
		}
		function isRelative(input) {
			return /^[.?#]/.test(input);
		}
		function parseAbsoluteUrl(input) {
			const match = urlRegex.exec(input);
			return makeUrl(match[1], match[2] || "", match[3], match[4] || "", match[5] || "/", match[6] || "", match[7] || "");
		}
		function parseFileUrl(input) {
			const match = fileRegex.exec(input);
			const path = match[2];
			return makeUrl("file:", "", match[1] || "", "", isAbsolutePath(path) ? path : "/" + path, match[3] || "", match[4] || "");
		}
		function makeUrl(scheme, user, host, port, path, query, hash) {
			return {
				scheme,
				user,
				host,
				port,
				path,
				query,
				hash,
				type: 7
			};
		}
		function parseUrl(input) {
			if (isSchemeRelativeUrl(input)) {
				const url = parseAbsoluteUrl("http:" + input);
				url.scheme = "";
				url.type = 6;
				return url;
			}
			if (isAbsolutePath(input)) {
				const url = parseAbsoluteUrl("http://foo.com" + input);
				url.scheme = "";
				url.host = "";
				url.type = 5;
				return url;
			}
			if (isFileUrl(input)) return parseFileUrl(input);
			if (isAbsoluteUrl(input)) return parseAbsoluteUrl(input);
			const url = parseAbsoluteUrl("http://foo.com/" + input);
			url.scheme = "";
			url.host = "";
			url.type = input ? input.startsWith("?") ? 3 : input.startsWith("#") ? 2 : 4 : 1;
			return url;
		}
		function stripPathFilename(path) {
			if (path.endsWith("/..")) return path;
			const index = path.lastIndexOf("/");
			return path.slice(0, index + 1);
		}
		function mergePaths(url, base) {
			normalizePath(base, base.type);
			if (url.path === "/") url.path = base.path;
			else url.path = stripPathFilename(base.path) + url.path;
		}
		/**
		* The path can have empty directories "//", unneeded parents "foo/..", or current directory
		* "foo/.". We need to normalize to a standard representation.
		*/
		function normalizePath(url, type) {
			const rel = type <= 4;
			const pieces = url.path.split("/");
			let pointer = 1;
			let positive = 0;
			let addTrailingSlash = false;
			for (let i = 1; i < pieces.length; i++) {
				const piece = pieces[i];
				if (!piece) {
					addTrailingSlash = true;
					continue;
				}
				addTrailingSlash = false;
				if (piece === ".") continue;
				if (piece === "..") {
					if (positive) {
						addTrailingSlash = true;
						positive--;
						pointer--;
					} else if (rel) pieces[pointer++] = piece;
					continue;
				}
				pieces[pointer++] = piece;
				positive++;
			}
			let path = "";
			for (let i = 1; i < pointer; i++) path += "/" + pieces[i];
			if (!path || addTrailingSlash && !path.endsWith("/..")) path += "/";
			url.path = path;
		}
		/**
		* Attempts to resolve `input` URL/path relative to `base`.
		*/
		function resolve(input, base) {
			if (!input && !base) return "";
			const url = parseUrl(input);
			let inputType = url.type;
			if (base && inputType !== 7) {
				const baseUrl = parseUrl(base);
				const baseType = baseUrl.type;
				switch (inputType) {
					case 1: url.hash = baseUrl.hash;
					case 2: url.query = baseUrl.query;
					case 3:
					case 4: mergePaths(url, baseUrl);
					case 5:
						url.user = baseUrl.user;
						url.host = baseUrl.host;
						url.port = baseUrl.port;
					case 6: url.scheme = baseUrl.scheme;
				}
				if (baseType > inputType) inputType = baseType;
			}
			normalizePath(url, inputType);
			const queryHash = url.query + url.hash;
			switch (inputType) {
				case 2:
				case 3: return queryHash;
				case 4: {
					const path = url.path.slice(1);
					if (!path) return queryHash || ".";
					if (isRelative(base || input) && !isRelative(path)) return "./" + path + queryHash;
					return path + queryHash;
				}
				case 5: return url.path + queryHash;
				default: return url.scheme + "//" + url.user + url.host + url.port + url.path + queryHash;
			}
		}
		return resolve;
	}));
}));
//#endregion
//#region ../../node_modules/.pnpm/@jridgewell+trace-mapping@0.3.31/node_modules/@jridgewell/trace-mapping/dist/trace-mapping.umd.js
var require_trace_mapping_umd = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	(function(global, factory) {
		if (typeof exports === "object" && typeof module !== "undefined") {
			factory(module, require_resolve_uri_umd(), require_sourcemap_codec_umd());
			module.exports = def(module);
		} else if (typeof define === "function" && define.amd) define([
			"module",
			"@jridgewell/resolve-uri",
			"@jridgewell/sourcemap-codec"
		], function(mod) {
			factory.apply(this, arguments);
			mod.exports = def(mod);
		});
		else {
			const mod = { exports: {} };
			factory(mod, global.resolveURI, global.sourcemapCodec);
			global = typeof globalThis !== "undefined" ? globalThis : global || self;
			global.traceMapping = def(mod);
		}
		function def(m) {
			return "default" in m.exports ? m.exports.default : m.exports;
		}
	})(exports, (function(module$2, require_resolveURI, require_sourcemapCodec) {
		"use strict";
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __commonJS = (cb, mod) => function __require() {
			return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
		};
		var __export = (target, all) => {
			for (var name in all) __defProp(target, name, {
				get: all[name],
				enumerable: true
			});
		};
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") {
				for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: () => from[key],
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
		var require_sourcemap_codec = __commonJS({ "umd:@jridgewell/sourcemap-codec"(exports$3, module2) {
			module2.exports = require_sourcemapCodec;
		} });
		var require_resolve_uri = __commonJS({ "umd:@jridgewell/resolve-uri"(exports$4, module2) {
			module2.exports = require_resolveURI;
		} });
		var trace_mapping_exports = {};
		__export(trace_mapping_exports, {
			AnyMap: () => FlattenMap,
			FlattenMap: () => FlattenMap,
			GREATEST_LOWER_BOUND: () => GREATEST_LOWER_BOUND,
			LEAST_UPPER_BOUND: () => LEAST_UPPER_BOUND,
			TraceMap: () => TraceMap,
			allGeneratedPositionsFor: () => allGeneratedPositionsFor,
			decodedMap: () => decodedMap,
			decodedMappings: () => decodedMappings,
			eachMapping: () => eachMapping,
			encodedMap: () => encodedMap,
			encodedMappings: () => encodedMappings,
			generatedPositionFor: () => generatedPositionFor,
			isIgnored: () => isIgnored,
			originalPositionFor: () => originalPositionFor,
			presortedDecodedMap: () => presortedDecodedMap,
			sourceContentFor: () => sourceContentFor,
			traceSegment: () => traceSegment
		});
		module$2.exports = __toCommonJS(trace_mapping_exports);
		var import_sourcemap_codec = __toESM(require_sourcemap_codec());
		var import_resolve_uri = __toESM(require_resolve_uri());
		function stripFilename(path) {
			if (!path) return "";
			const index = path.lastIndexOf("/");
			return path.slice(0, index + 1);
		}
		function resolver(mapUrl, sourceRoot) {
			const from = stripFilename(mapUrl);
			const prefix = sourceRoot ? sourceRoot + "/" : "";
			return (source) => (0, import_resolve_uri.default)(prefix + (source || ""), from);
		}
		var COLUMN = 0;
		var SOURCES_INDEX = 1;
		var SOURCE_LINE = 2;
		var SOURCE_COLUMN = 3;
		var NAMES_INDEX = 4;
		var REV_GENERATED_LINE = 1;
		var REV_GENERATED_COLUMN = 2;
		function maybeSort(mappings, owned) {
			const unsortedIndex = nextUnsortedSegmentLine(mappings, 0);
			if (unsortedIndex === mappings.length) return mappings;
			if (!owned) mappings = mappings.slice();
			for (let i = unsortedIndex; i < mappings.length; i = nextUnsortedSegmentLine(mappings, i + 1)) mappings[i] = sortSegments(mappings[i], owned);
			return mappings;
		}
		function nextUnsortedSegmentLine(mappings, start) {
			for (let i = start; i < mappings.length; i++) if (!isSorted(mappings[i])) return i;
			return mappings.length;
		}
		function isSorted(line) {
			for (let j = 1; j < line.length; j++) if (line[j][COLUMN] < line[j - 1][COLUMN]) return false;
			return true;
		}
		function sortSegments(line, owned) {
			if (!owned) line = line.slice();
			return line.sort(sortComparator);
		}
		function sortComparator(a, b) {
			return a[COLUMN] - b[COLUMN];
		}
		function buildBySources(decoded, memos) {
			const sources = memos.map(() => []);
			for (let i = 0; i < decoded.length; i++) {
				const line = decoded[i];
				for (let j = 0; j < line.length; j++) {
					const seg = line[j];
					if (seg.length === 1) continue;
					const sourceIndex2 = seg[SOURCES_INDEX];
					const sourceLine = seg[SOURCE_LINE];
					const sourceColumn = seg[SOURCE_COLUMN];
					const source = sources[sourceIndex2];
					(source[sourceLine] || (source[sourceLine] = [])).push([
						sourceColumn,
						i,
						seg[COLUMN]
					]);
				}
			}
			for (let i = 0; i < sources.length; i++) {
				const source = sources[i];
				for (let j = 0; j < source.length; j++) {
					const line = source[j];
					if (line) line.sort(sortComparator);
				}
			}
			return sources;
		}
		var found = false;
		function binarySearch(haystack, needle, low, high) {
			while (low <= high) {
				const mid = low + (high - low >> 1);
				const cmp = haystack[mid][COLUMN] - needle;
				if (cmp === 0) {
					found = true;
					return mid;
				}
				if (cmp < 0) low = mid + 1;
				else high = mid - 1;
			}
			found = false;
			return low - 1;
		}
		function upperBound(haystack, needle, index) {
			for (let i = index + 1; i < haystack.length; index = i++) if (haystack[i][COLUMN] !== needle) break;
			return index;
		}
		function lowerBound(haystack, needle, index) {
			for (let i = index - 1; i >= 0; index = i--) if (haystack[i][COLUMN] !== needle) break;
			return index;
		}
		function memoizedState() {
			return {
				lastKey: -1,
				lastNeedle: -1,
				lastIndex: -1
			};
		}
		function memoizedBinarySearch(haystack, needle, state, key) {
			const { lastKey, lastNeedle, lastIndex } = state;
			let low = 0;
			let high = haystack.length - 1;
			if (key === lastKey) {
				if (needle === lastNeedle) {
					found = lastIndex !== -1 && haystack[lastIndex][COLUMN] === needle;
					return lastIndex;
				}
				if (needle >= lastNeedle) low = lastIndex === -1 ? 0 : lastIndex;
				else high = lastIndex;
			}
			state.lastKey = key;
			state.lastNeedle = needle;
			return state.lastIndex = binarySearch(haystack, needle, low, high);
		}
		function parse(map) {
			return typeof map === "string" ? JSON.parse(map) : map;
		}
		var FlattenMap = function(map, mapUrl) {
			const parsed = parse(map);
			if (!("sections" in parsed)) return new TraceMap(parsed, mapUrl);
			const mappings = [];
			const sources = [];
			const sourcesContent = [];
			const names = [];
			const ignoreList = [];
			recurse(parsed, mapUrl, mappings, sources, sourcesContent, names, ignoreList, 0, 0, Infinity, Infinity);
			return presortedDecodedMap({
				version: 3,
				file: parsed.file,
				names,
				sources,
				sourcesContent,
				mappings,
				ignoreList
			});
		};
		function recurse(input, mapUrl, mappings, sources, sourcesContent, names, ignoreList, lineOffset, columnOffset, stopLine, stopColumn) {
			const { sections } = input;
			for (let i = 0; i < sections.length; i++) {
				const { map, offset } = sections[i];
				let sl = stopLine;
				let sc = stopColumn;
				if (i + 1 < sections.length) {
					const nextOffset = sections[i + 1].offset;
					sl = Math.min(stopLine, lineOffset + nextOffset.line);
					if (sl === stopLine) sc = Math.min(stopColumn, columnOffset + nextOffset.column);
					else if (sl < stopLine) sc = columnOffset + nextOffset.column;
				}
				addSection(map, mapUrl, mappings, sources, sourcesContent, names, ignoreList, lineOffset + offset.line, columnOffset + offset.column, sl, sc);
			}
		}
		function addSection(input, mapUrl, mappings, sources, sourcesContent, names, ignoreList, lineOffset, columnOffset, stopLine, stopColumn) {
			const parsed = parse(input);
			if ("sections" in parsed) return recurse(...arguments);
			const map = new TraceMap(parsed, mapUrl);
			const sourcesOffset = sources.length;
			const namesOffset = names.length;
			const decoded = decodedMappings(map);
			const { resolvedSources, sourcesContent: contents, ignoreList: ignores } = map;
			append(sources, resolvedSources);
			append(names, map.names);
			if (contents) append(sourcesContent, contents);
			else for (let i = 0; i < resolvedSources.length; i++) sourcesContent.push(null);
			if (ignores) for (let i = 0; i < ignores.length; i++) ignoreList.push(ignores[i] + sourcesOffset);
			for (let i = 0; i < decoded.length; i++) {
				const lineI = lineOffset + i;
				if (lineI > stopLine) return;
				const out = getLine(mappings, lineI);
				const cOffset = i === 0 ? columnOffset : 0;
				const line = decoded[i];
				for (let j = 0; j < line.length; j++) {
					const seg = line[j];
					const column = cOffset + seg[COLUMN];
					if (lineI === stopLine && column >= stopColumn) return;
					if (seg.length === 1) {
						out.push([column]);
						continue;
					}
					const sourcesIndex = sourcesOffset + seg[SOURCES_INDEX];
					const sourceLine = seg[SOURCE_LINE];
					const sourceColumn = seg[SOURCE_COLUMN];
					out.push(seg.length === 4 ? [
						column,
						sourcesIndex,
						sourceLine,
						sourceColumn
					] : [
						column,
						sourcesIndex,
						sourceLine,
						sourceColumn,
						namesOffset + seg[NAMES_INDEX]
					]);
				}
			}
		}
		function append(arr, other) {
			for (let i = 0; i < other.length; i++) arr.push(other[i]);
		}
		function getLine(arr, index) {
			for (let i = arr.length; i <= index; i++) arr[i] = [];
			return arr[index];
		}
		var LINE_GTR_ZERO = "`line` must be greater than 0 (lines start at line 1)";
		var COL_GTR_EQ_ZERO = "`column` must be greater than or equal to 0 (columns start at column 0)";
		var LEAST_UPPER_BOUND = -1;
		var GREATEST_LOWER_BOUND = 1;
		var TraceMap = class {
			constructor(map, mapUrl) {
				const isString = typeof map === "string";
				if (!isString && map._decodedMemo) return map;
				const parsed = parse(map);
				const { version, file, names, sourceRoot, sources, sourcesContent } = parsed;
				this.version = version;
				this.file = file;
				this.names = names || [];
				this.sourceRoot = sourceRoot;
				this.sources = sources;
				this.sourcesContent = sourcesContent;
				this.ignoreList = parsed.ignoreList || parsed.x_google_ignoreList || void 0;
				const resolve = resolver(mapUrl, sourceRoot);
				this.resolvedSources = sources.map(resolve);
				const { mappings } = parsed;
				if (typeof mappings === "string") {
					this._encoded = mappings;
					this._decoded = void 0;
				} else if (Array.isArray(mappings)) {
					this._encoded = void 0;
					this._decoded = maybeSort(mappings, isString);
				} else if (parsed.sections) throw new Error(`TraceMap passed sectioned source map, please use FlattenMap export instead`);
				else throw new Error(`invalid source map: ${JSON.stringify(parsed)}`);
				this._decodedMemo = memoizedState();
				this._bySources = void 0;
				this._bySourceMemos = void 0;
			}
		};
		function cast(map) {
			return map;
		}
		function encodedMappings(map) {
			var _a, _b;
			return (_b = (_a = cast(map))._encoded) != null ? _b : _a._encoded = (0, import_sourcemap_codec.encode)(cast(map)._decoded);
		}
		function decodedMappings(map) {
			var _a;
			return (_a = cast(map))._decoded || (_a._decoded = (0, import_sourcemap_codec.decode)(cast(map)._encoded));
		}
		function traceSegment(map, line, column) {
			const decoded = decodedMappings(map);
			if (line >= decoded.length) return null;
			const segments = decoded[line];
			const index = traceSegmentInternal(segments, cast(map)._decodedMemo, line, column, GREATEST_LOWER_BOUND);
			return index === -1 ? null : segments[index];
		}
		function originalPositionFor(map, needle) {
			let { line, column, bias } = needle;
			line--;
			if (line < 0) throw new Error(LINE_GTR_ZERO);
			if (column < 0) throw new Error(COL_GTR_EQ_ZERO);
			const decoded = decodedMappings(map);
			if (line >= decoded.length) return OMapping(null, null, null, null);
			const segments = decoded[line];
			const index = traceSegmentInternal(segments, cast(map)._decodedMemo, line, column, bias || GREATEST_LOWER_BOUND);
			if (index === -1) return OMapping(null, null, null, null);
			const segment = segments[index];
			if (segment.length === 1) return OMapping(null, null, null, null);
			const { names, resolvedSources } = map;
			return OMapping(resolvedSources[segment[SOURCES_INDEX]], segment[SOURCE_LINE] + 1, segment[SOURCE_COLUMN], segment.length === 5 ? names[segment[NAMES_INDEX]] : null);
		}
		function generatedPositionFor(map, needle) {
			const { source, line, column, bias } = needle;
			return generatedPosition(map, source, line, column, bias || GREATEST_LOWER_BOUND, false);
		}
		function allGeneratedPositionsFor(map, needle) {
			const { source, line, column, bias } = needle;
			return generatedPosition(map, source, line, column, bias || LEAST_UPPER_BOUND, true);
		}
		function eachMapping(map, cb) {
			const decoded = decodedMappings(map);
			const { names, resolvedSources } = map;
			for (let i = 0; i < decoded.length; i++) {
				const line = decoded[i];
				for (let j = 0; j < line.length; j++) {
					const seg = line[j];
					const generatedLine = i + 1;
					const generatedColumn = seg[0];
					let source = null;
					let originalLine = null;
					let originalColumn = null;
					let name = null;
					if (seg.length !== 1) {
						source = resolvedSources[seg[1]];
						originalLine = seg[2] + 1;
						originalColumn = seg[3];
					}
					if (seg.length === 5) name = names[seg[4]];
					cb({
						generatedLine,
						generatedColumn,
						source,
						originalLine,
						originalColumn,
						name
					});
				}
			}
		}
		function sourceIndex(map, source) {
			const { sources, resolvedSources } = map;
			let index = sources.indexOf(source);
			if (index === -1) index = resolvedSources.indexOf(source);
			return index;
		}
		function sourceContentFor(map, source) {
			const { sourcesContent } = map;
			if (sourcesContent == null) return null;
			const index = sourceIndex(map, source);
			return index === -1 ? null : sourcesContent[index];
		}
		function isIgnored(map, source) {
			const { ignoreList } = map;
			if (ignoreList == null) return false;
			const index = sourceIndex(map, source);
			return index === -1 ? false : ignoreList.includes(index);
		}
		function presortedDecodedMap(map, mapUrl) {
			const tracer = new TraceMap(clone(map, []), mapUrl);
			cast(tracer)._decoded = map.mappings;
			return tracer;
		}
		function decodedMap(map) {
			return clone(map, decodedMappings(map));
		}
		function encodedMap(map) {
			return clone(map, encodedMappings(map));
		}
		function clone(map, mappings) {
			return {
				version: map.version,
				file: map.file,
				names: map.names,
				sourceRoot: map.sourceRoot,
				sources: map.sources,
				sourcesContent: map.sourcesContent,
				mappings,
				ignoreList: map.ignoreList || map.x_google_ignoreList
			};
		}
		function OMapping(source, line, column, name) {
			return {
				source,
				line,
				column,
				name
			};
		}
		function GMapping(line, column) {
			return {
				line,
				column
			};
		}
		function traceSegmentInternal(segments, memo, line, column, bias) {
			let index = memoizedBinarySearch(segments, column, memo, line);
			if (found) index = (bias === LEAST_UPPER_BOUND ? upperBound : lowerBound)(segments, column, index);
			else if (bias === LEAST_UPPER_BOUND) index++;
			if (index === -1 || index === segments.length) return -1;
			return index;
		}
		function sliceGeneratedPositions(segments, memo, line, column, bias) {
			let min = traceSegmentInternal(segments, memo, line, column, GREATEST_LOWER_BOUND);
			if (!found && bias === LEAST_UPPER_BOUND) min++;
			if (min === -1 || min === segments.length) return [];
			const matchedColumn = found ? column : segments[min][COLUMN];
			if (!found) min = lowerBound(segments, matchedColumn, min);
			const max = upperBound(segments, matchedColumn, min);
			const result = [];
			for (; min <= max; min++) {
				const segment = segments[min];
				result.push(GMapping(segment[REV_GENERATED_LINE] + 1, segment[REV_GENERATED_COLUMN]));
			}
			return result;
		}
		function generatedPosition(map, source, line, column, bias, all) {
			var _a, _b;
			line--;
			if (line < 0) throw new Error(LINE_GTR_ZERO);
			if (column < 0) throw new Error(COL_GTR_EQ_ZERO);
			const { sources, resolvedSources } = map;
			let sourceIndex2 = sources.indexOf(source);
			if (sourceIndex2 === -1) sourceIndex2 = resolvedSources.indexOf(source);
			if (sourceIndex2 === -1) return all ? [] : GMapping(null, null);
			const bySourceMemos = (_a = cast(map))._bySourceMemos || (_a._bySourceMemos = sources.map(memoizedState));
			const segments = ((_b = cast(map))._bySources || (_b._bySources = buildBySources(decodedMappings(map), bySourceMemos)))[sourceIndex2][line];
			if (segments == null) return all ? [] : GMapping(null, null);
			const memo = bySourceMemos[sourceIndex2];
			if (all) return sliceGeneratedPositions(segments, memo, line, column, bias);
			const index = traceSegmentInternal(segments, memo, line, column, bias);
			if (index === -1) return GMapping(null, null);
			const segment = segments[index];
			return GMapping(segment[REV_GENERATED_LINE] + 1, segment[REV_GENERATED_COLUMN]);
		}
	}));
}));
//#endregion
//#region ../../node_modules/.pnpm/@jridgewell+gen-mapping@0.3.13/node_modules/@jridgewell/gen-mapping/dist/gen-mapping.umd.js
var require_gen_mapping_umd = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	(function(global, factory) {
		if (typeof exports === "object" && typeof module !== "undefined") {
			factory(module, require_sourcemap_codec_umd(), require_trace_mapping_umd());
			module.exports = def(module);
		} else if (typeof define === "function" && define.amd) define([
			"module",
			"@jridgewell/sourcemap-codec",
			"@jridgewell/trace-mapping"
		], function(mod) {
			factory.apply(this, arguments);
			mod.exports = def(mod);
		});
		else {
			const mod = { exports: {} };
			factory(mod, global.sourcemapCodec, global.traceMapping);
			global = typeof globalThis !== "undefined" ? globalThis : global || self;
			global.genMapping = def(mod);
		}
		function def(m) {
			return "default" in m.exports ? m.exports.default : m.exports;
		}
	})(exports, (function(module$1, require_sourcemapCodec, require_traceMapping) {
		"use strict";
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __commonJS = (cb, mod) => function __require() {
			return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
		};
		var __export = (target, all) => {
			for (var name in all) __defProp(target, name, {
				get: all[name],
				enumerable: true
			});
		};
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") {
				for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: () => from[key],
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
		var require_sourcemap_codec = __commonJS({ "umd:@jridgewell/sourcemap-codec"(exports$1, module2) {
			module2.exports = require_sourcemapCodec;
		} });
		var require_trace_mapping = __commonJS({ "umd:@jridgewell/trace-mapping"(exports$2, module2) {
			module2.exports = require_traceMapping;
		} });
		var gen_mapping_exports = {};
		__export(gen_mapping_exports, {
			GenMapping: () => GenMapping,
			addMapping: () => addMapping,
			addSegment: () => addSegment,
			allMappings: () => allMappings,
			fromMap: () => fromMap,
			maybeAddMapping: () => maybeAddMapping,
			maybeAddSegment: () => maybeAddSegment,
			setIgnore: () => setIgnore,
			setSourceContent: () => setSourceContent,
			toDecodedMap: () => toDecodedMap,
			toEncodedMap: () => toEncodedMap
		});
		module$1.exports = __toCommonJS(gen_mapping_exports);
		var SetArray = class {
			constructor() {
				this._indexes = { __proto__: null };
				this.array = [];
			}
		};
		function cast(set) {
			return set;
		}
		function get(setarr, key) {
			return cast(setarr)._indexes[key];
		}
		function put(setarr, key) {
			const index = get(setarr, key);
			if (index !== void 0) return index;
			const { array, _indexes: indexes } = cast(setarr);
			return indexes[key] = array.push(key) - 1;
		}
		function remove(setarr, key) {
			const index = get(setarr, key);
			if (index === void 0) return;
			const { array, _indexes: indexes } = cast(setarr);
			for (let i = index + 1; i < array.length; i++) {
				const k = array[i];
				array[i - 1] = k;
				indexes[k]--;
			}
			indexes[key] = void 0;
			array.pop();
		}
		var import_sourcemap_codec = __toESM(require_sourcemap_codec());
		var import_trace_mapping = __toESM(require_trace_mapping());
		var COLUMN = 0;
		var SOURCES_INDEX = 1;
		var SOURCE_LINE = 2;
		var SOURCE_COLUMN = 3;
		var NAMES_INDEX = 4;
		var NO_NAME = -1;
		var GenMapping = class {
			constructor({ file, sourceRoot } = {}) {
				this._names = new SetArray();
				this._sources = new SetArray();
				this._sourcesContent = [];
				this._mappings = [];
				this.file = file;
				this.sourceRoot = sourceRoot;
				this._ignoreList = new SetArray();
			}
		};
		function cast2(map) {
			return map;
		}
		function addSegment(map, genLine, genColumn, source, sourceLine, sourceColumn, name, content) {
			return addSegmentInternal(false, map, genLine, genColumn, source, sourceLine, sourceColumn, name, content);
		}
		function addMapping(map, mapping) {
			return addMappingInternal(false, map, mapping);
		}
		var maybeAddSegment = (map, genLine, genColumn, source, sourceLine, sourceColumn, name, content) => {
			return addSegmentInternal(true, map, genLine, genColumn, source, sourceLine, sourceColumn, name, content);
		};
		var maybeAddMapping = (map, mapping) => {
			return addMappingInternal(true, map, mapping);
		};
		function setSourceContent(map, source, content) {
			const { _sources: sources, _sourcesContent: sourcesContent } = cast2(map);
			const index = put(sources, source);
			sourcesContent[index] = content;
		}
		function setIgnore(map, source, ignore = true) {
			const { _sources: sources, _sourcesContent: sourcesContent, _ignoreList: ignoreList } = cast2(map);
			const index = put(sources, source);
			if (index === sourcesContent.length) sourcesContent[index] = null;
			if (ignore) put(ignoreList, index);
			else remove(ignoreList, index);
		}
		function toDecodedMap(map) {
			const { _mappings: mappings, _sources: sources, _sourcesContent: sourcesContent, _names: names, _ignoreList: ignoreList } = cast2(map);
			removeEmptyFinalLines(mappings);
			return {
				version: 3,
				file: map.file || void 0,
				names: names.array,
				sourceRoot: map.sourceRoot || void 0,
				sources: sources.array,
				sourcesContent,
				mappings,
				ignoreList: ignoreList.array
			};
		}
		function toEncodedMap(map) {
			const decoded = toDecodedMap(map);
			return Object.assign({}, decoded, { mappings: (0, import_sourcemap_codec.encode)(decoded.mappings) });
		}
		function fromMap(input) {
			const map = new import_trace_mapping.TraceMap(input);
			const gen = new GenMapping({
				file: map.file,
				sourceRoot: map.sourceRoot
			});
			putAll(cast2(gen)._names, map.names);
			putAll(cast2(gen)._sources, map.sources);
			cast2(gen)._sourcesContent = map.sourcesContent || map.sources.map(() => null);
			cast2(gen)._mappings = (0, import_trace_mapping.decodedMappings)(map);
			if (map.ignoreList) putAll(cast2(gen)._ignoreList, map.ignoreList);
			return gen;
		}
		function allMappings(map) {
			const out = [];
			const { _mappings: mappings, _sources: sources, _names: names } = cast2(map);
			for (let i = 0; i < mappings.length; i++) {
				const line = mappings[i];
				for (let j = 0; j < line.length; j++) {
					const seg = line[j];
					const generated = {
						line: i + 1,
						column: seg[COLUMN]
					};
					let source = void 0;
					let original = void 0;
					let name = void 0;
					if (seg.length !== 1) {
						source = sources.array[seg[SOURCES_INDEX]];
						original = {
							line: seg[SOURCE_LINE] + 1,
							column: seg[SOURCE_COLUMN]
						};
						if (seg.length === 5) name = names.array[seg[NAMES_INDEX]];
					}
					out.push({
						generated,
						source,
						original,
						name
					});
				}
			}
			return out;
		}
		function addSegmentInternal(skipable, map, genLine, genColumn, source, sourceLine, sourceColumn, name, content) {
			const { _mappings: mappings, _sources: sources, _sourcesContent: sourcesContent, _names: names } = cast2(map);
			const line = getIndex(mappings, genLine);
			const index = getColumnIndex(line, genColumn);
			if (!source) {
				if (skipable && skipSourceless(line, index)) return;
				return insert(line, index, [genColumn]);
			}
			const sourcesIndex = put(sources, source);
			const namesIndex = name ? put(names, name) : NO_NAME;
			if (sourcesIndex === sourcesContent.length) sourcesContent[sourcesIndex] = content != null ? content : null;
			if (skipable && skipSource(line, index, sourcesIndex, sourceLine, sourceColumn, namesIndex)) return;
			return insert(line, index, name ? [
				genColumn,
				sourcesIndex,
				sourceLine,
				sourceColumn,
				namesIndex
			] : [
				genColumn,
				sourcesIndex,
				sourceLine,
				sourceColumn
			]);
		}
		function getIndex(arr, index) {
			for (let i = arr.length; i <= index; i++) arr[i] = [];
			return arr[index];
		}
		function getColumnIndex(line, genColumn) {
			let index = line.length;
			for (let i = index - 1; i >= 0; index = i--) if (genColumn >= line[i][COLUMN]) break;
			return index;
		}
		function insert(array, index, value) {
			for (let i = array.length; i > index; i--) array[i] = array[i - 1];
			array[index] = value;
		}
		function removeEmptyFinalLines(mappings) {
			const { length } = mappings;
			let len = length;
			for (let i = len - 1; i >= 0; len = i, i--) if (mappings[i].length > 0) break;
			if (len < length) mappings.length = len;
		}
		function putAll(setarr, array) {
			for (let i = 0; i < array.length; i++) put(setarr, array[i]);
		}
		function skipSourceless(line, index) {
			if (index === 0) return true;
			return line[index - 1].length === 1;
		}
		function skipSource(line, index, sourcesIndex, sourceLine, sourceColumn, namesIndex) {
			if (index === 0) return false;
			const prev = line[index - 1];
			if (prev.length === 1) return false;
			return sourcesIndex === prev[SOURCES_INDEX] && sourceLine === prev[SOURCE_LINE] && sourceColumn === prev[SOURCE_COLUMN] && namesIndex === (prev.length === 5 ? prev[NAMES_INDEX] : NO_NAME);
		}
		function addMappingInternal(skipable, map, mapping) {
			const { generated, source, original, name, content } = mapping;
			if (!source) return addSegmentInternal(skipable, map, generated.line - 1, generated.column, null, null, null, null, null);
			return addSegmentInternal(skipable, map, generated.line - 1, generated.column, source, original.line - 1, original.column, name, content);
		}
	}));
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/computeSourceMap.js
var require_computeSourceMap = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _genmapping = require_gen_mapping_umd();
	var _charcodes = require_charcodes();
	/**
	* Generate a source map indicating that each line maps directly to the original line,
	* with the tokens in their new positions.
	*/
	function computeSourceMap({ code: generatedCode, mappings: rawMappings }, filePath, options, source, tokens) {
		const sourceColumns = computeSourceColumns(source, tokens);
		const map = new _genmapping.GenMapping({ file: options.compiledFilename });
		let tokenIndex = 0;
		let currentMapping = rawMappings[0];
		while (currentMapping === void 0 && tokenIndex < rawMappings.length - 1) {
			tokenIndex++;
			currentMapping = rawMappings[tokenIndex];
		}
		let line = 0;
		let lineStart = 0;
		if (currentMapping !== lineStart) _genmapping.maybeAddSegment.call(void 0, map, line, 0, filePath, line, 0);
		for (let i = 0; i < generatedCode.length; i++) {
			if (i === currentMapping) {
				const genColumn = currentMapping - lineStart;
				const sourceColumn = sourceColumns[tokenIndex];
				_genmapping.maybeAddSegment.call(void 0, map, line, genColumn, filePath, line, sourceColumn);
				while ((currentMapping === i || currentMapping === void 0) && tokenIndex < rawMappings.length - 1) {
					tokenIndex++;
					currentMapping = rawMappings[tokenIndex];
				}
			}
			if (generatedCode.charCodeAt(i) === _charcodes.charCodes.lineFeed) {
				line++;
				lineStart = i + 1;
				if (currentMapping !== lineStart) _genmapping.maybeAddSegment.call(void 0, map, line, 0, filePath, line, 0);
			}
		}
		const { sourceRoot, sourcesContent, ...sourceMap } = _genmapping.toEncodedMap.call(void 0, map);
		return sourceMap;
	}
	exports.default = computeSourceMap;
	/**
	* Create an array mapping each token index to the 0-based column of the start
	* position of the token.
	*/
	function computeSourceColumns(code, tokens) {
		const sourceColumns = new Array(tokens.length);
		let tokenIndex = 0;
		let currentMapping = tokens[tokenIndex].start;
		let lineStart = 0;
		for (let i = 0; i < code.length; i++) {
			if (i === currentMapping) {
				sourceColumns[tokenIndex] = currentMapping - lineStart;
				tokenIndex++;
				currentMapping = tokens[tokenIndex].start;
			}
			if (code.charCodeAt(i) === _charcodes.charCodes.lineFeed) lineStart = i + 1;
		}
		return sourceColumns;
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/HelperManager.js
var require_HelperManager = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	const HELPERS = {
		require: `
    import {createRequire as CREATE_REQUIRE_NAME} from "module";
    const require = CREATE_REQUIRE_NAME(import.meta.url);
  `,
		interopRequireWildcard: `
    function interopRequireWildcard(obj) {
      if (obj && obj.__esModule) {
        return obj;
      } else {
        var newObj = {};
        if (obj != null) {
          for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              newObj[key] = obj[key];
            }
          }
        }
        newObj.default = obj;
        return newObj;
      }
    }
  `,
		interopRequireDefault: `
    function interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
  `,
		createNamedExportFrom: `
    function createNamedExportFrom(obj, localName, importedName) {
      Object.defineProperty(exports, localName, {enumerable: true, configurable: true, get: () => obj[importedName]});
    }
  `,
		createStarExport: `
    function createStarExport(obj) {
      Object.keys(obj)
        .filter((key) => key !== "default" && key !== "__esModule")
        .forEach((key) => {
          if (exports.hasOwnProperty(key)) {
            return;
          }
          Object.defineProperty(exports, key, {enumerable: true, configurable: true, get: () => obj[key]});
        });
    }
  `,
		nullishCoalesce: `
    function nullishCoalesce(lhs, rhsFn) {
      if (lhs != null) {
        return lhs;
      } else {
        return rhsFn();
      }
    }
  `,
		asyncNullishCoalesce: `
    async function asyncNullishCoalesce(lhs, rhsFn) {
      if (lhs != null) {
        return lhs;
      } else {
        return await rhsFn();
      }
    }
  `,
		optionalChain: `
    function optionalChain(ops) {
      let lastAccessLHS = undefined;
      let value = ops[0];
      let i = 1;
      while (i < ops.length) {
        const op = ops[i];
        const fn = ops[i + 1];
        i += 2;
        if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
          return undefined;
        }
        if (op === 'access' || op === 'optionalAccess') {
          lastAccessLHS = value;
          value = fn(value);
        } else if (op === 'call' || op === 'optionalCall') {
          value = fn((...args) => value.call(lastAccessLHS, ...args));
          lastAccessLHS = undefined;
        }
      }
      return value;
    }
  `,
		asyncOptionalChain: `
    async function asyncOptionalChain(ops) {
      let lastAccessLHS = undefined;
      let value = ops[0];
      let i = 1;
      while (i < ops.length) {
        const op = ops[i];
        const fn = ops[i + 1];
        i += 2;
        if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
          return undefined;
        }
        if (op === 'access' || op === 'optionalAccess') {
          lastAccessLHS = value;
          value = await fn(value);
        } else if (op === 'call' || op === 'optionalCall') {
          value = await fn((...args) => value.call(lastAccessLHS, ...args));
          lastAccessLHS = undefined;
        }
      }
      return value;
    }
  `,
		optionalChainDelete: `
    function optionalChainDelete(ops) {
      const result = OPTIONAL_CHAIN_NAME(ops);
      return result == null ? true : result;
    }
  `,
		asyncOptionalChainDelete: `
    async function asyncOptionalChainDelete(ops) {
      const result = await ASYNC_OPTIONAL_CHAIN_NAME(ops);
      return result == null ? true : result;
    }
  `
	};
	exports.HelperManager = class HelperManager {
		__init() {
			this.helperNames = {};
		}
		__init2() {
			this.createRequireName = null;
		}
		constructor(nameManager) {
			this.nameManager = nameManager;
			HelperManager.prototype.__init.call(this);
			HelperManager.prototype.__init2.call(this);
		}
		getHelperName(baseName) {
			let helperName = this.helperNames[baseName];
			if (helperName) return helperName;
			helperName = this.nameManager.claimFreeName(`_${baseName}`);
			this.helperNames[baseName] = helperName;
			return helperName;
		}
		emitHelpers() {
			let resultCode = "";
			if (this.helperNames.optionalChainDelete) this.getHelperName("optionalChain");
			if (this.helperNames.asyncOptionalChainDelete) this.getHelperName("asyncOptionalChain");
			for (const [baseName, helperCodeTemplate] of Object.entries(HELPERS)) {
				const helperName = this.helperNames[baseName];
				let helperCode = helperCodeTemplate;
				if (baseName === "optionalChainDelete") helperCode = helperCode.replace("OPTIONAL_CHAIN_NAME", this.helperNames.optionalChain);
				else if (baseName === "asyncOptionalChainDelete") helperCode = helperCode.replace("ASYNC_OPTIONAL_CHAIN_NAME", this.helperNames.asyncOptionalChain);
				else if (baseName === "require") {
					if (this.createRequireName === null) this.createRequireName = this.nameManager.claimFreeName("_createRequire");
					helperCode = helperCode.replace(/CREATE_REQUIRE_NAME/g, this.createRequireName);
				}
				if (helperName) {
					resultCode += " ";
					resultCode += helperCode.replace(baseName, helperName).replace(/\s+/g, " ").trim();
				}
			}
			return resultCode;
		}
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/identifyShadowedGlobals.js
var require_identifyShadowedGlobals = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _tokenizer = require_tokenizer();
	var _types = require_types$2();
	/**
	* Traverse the given tokens and modify them if necessary to indicate that some names shadow global
	* variables.
	*/
	function identifyShadowedGlobals(tokens, scopes, globalNames) {
		if (!hasShadowedGlobals(tokens, globalNames)) return;
		markShadowedGlobals(tokens, scopes, globalNames);
	}
	exports.default = identifyShadowedGlobals;
	/**
	* We can do a fast up-front check to see if there are any declarations to global names. If not,
	* then there's no point in computing scope assignments.
	*/
	function hasShadowedGlobals(tokens, globalNames) {
		for (const token of tokens.tokens) if (token.type === _types.TokenType.name && !token.isType && _tokenizer.isNonTopLevelDeclaration.call(void 0, token) && globalNames.has(tokens.identifierNameForToken(token))) return true;
		return false;
	}
	exports.hasShadowedGlobals = hasShadowedGlobals;
	function markShadowedGlobals(tokens, scopes, globalNames) {
		const scopeStack = [];
		let scopeIndex = scopes.length - 1;
		for (let i = tokens.tokens.length - 1;; i--) {
			while (scopeStack.length > 0 && scopeStack[scopeStack.length - 1].startTokenIndex === i + 1) scopeStack.pop();
			while (scopeIndex >= 0 && scopes[scopeIndex].endTokenIndex === i + 1) {
				scopeStack.push(scopes[scopeIndex]);
				scopeIndex--;
			}
			if (i < 0) break;
			const token = tokens.tokens[i];
			const name = tokens.identifierNameForToken(token);
			if (scopeStack.length > 1 && !token.isType && token.type === _types.TokenType.name && globalNames.has(name)) {
				if (_tokenizer.isBlockScopedDeclaration.call(void 0, token)) markShadowedForScope(scopeStack[scopeStack.length - 1], tokens, name);
				else if (_tokenizer.isFunctionScopedDeclaration.call(void 0, token)) {
					let stackIndex = scopeStack.length - 1;
					while (stackIndex > 0 && !scopeStack[stackIndex].isFunctionScope) stackIndex--;
					if (stackIndex < 0) throw new Error("Did not find parent function scope.");
					markShadowedForScope(scopeStack[stackIndex], tokens, name);
				}
			}
		}
		if (scopeStack.length > 0) throw new Error("Expected empty scope stack after processing file.");
	}
	function markShadowedForScope(scope, tokens, name) {
		for (let i = scope.startTokenIndex; i < scope.endTokenIndex; i++) {
			const token = tokens.tokens[i];
			if ((token.type === _types.TokenType.name || token.type === _types.TokenType.jsxName) && tokens.identifierNameForToken(token) === name) token.shadowsGlobal = true;
		}
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/util/getIdentifierNames.js
var require_getIdentifierNames = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _types = require_types$2();
	/**
	* Get all identifier names in the code, in order, including duplicates.
	*/
	function getIdentifierNames(code, tokens) {
		const names = [];
		for (const token of tokens) if (token.type === _types.TokenType.name) names.push(code.slice(token.start, token.end));
		return names;
	}
	exports.default = getIdentifierNames;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/NameManager.js
var require_NameManager = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _getIdentifierNames2 = _interopRequireDefault(require_getIdentifierNames());
	exports.default = class NameManager {
		__init() {
			this.usedNames = /* @__PURE__ */ new Set();
		}
		constructor(code, tokens) {
			NameManager.prototype.__init.call(this);
			this.usedNames = new Set(_getIdentifierNames2.default.call(void 0, code, tokens));
		}
		claimFreeName(name) {
			const newName = this.findFreeName(name);
			this.usedNames.add(newName);
			return newName;
		}
		findFreeName(name) {
			if (!this.usedNames.has(name)) return name;
			let suffixNum = 2;
			while (this.usedNames.has(name + String(suffixNum))) suffixNum++;
			return name + String(suffixNum);
		}
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/ts-interface-checker@0.1.13/node_modules/ts-interface-checker/dist/util.js
var require_util = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __extends = exports && exports.__extends || (function() {
		var extendStatics = function(d, b) {
			extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d, b) {
				d.__proto__ = b;
			} || function(d, b) {
				for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
			};
			return extendStatics(d, b);
		};
		return function(d, b) {
			extendStatics(d, b);
			function __() {
				this.constructor = d;
			}
			d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
		};
	})();
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.DetailContext = exports.NoopContext = exports.VError = void 0;
	/**
	* Error thrown by validation. Besides an informative message, it includes the path to the
	* property which triggered the failure.
	*/
	var VError = function(_super) {
		__extends(VError, _super);
		function VError(path, message) {
			var _this = _super.call(this, message) || this;
			_this.path = path;
			Object.setPrototypeOf(_this, VError.prototype);
			return _this;
		}
		return VError;
	}(Error);
	exports.VError = VError;
	exports.NoopContext = function() {
		function NoopContext() {}
		NoopContext.prototype.fail = function(relPath, message, score) {
			return false;
		};
		NoopContext.prototype.unionResolver = function() {
			return this;
		};
		NoopContext.prototype.createContext = function() {
			return this;
		};
		NoopContext.prototype.resolveUnion = function(ur) {};
		return NoopContext;
	}();
	/**
	* Complete implementation of IContext that collects meaningfull errors.
	*/
	var DetailContext = function() {
		function DetailContext() {
			this._propNames = [""];
			this._messages = [null];
			this._score = 0;
		}
		DetailContext.prototype.fail = function(relPath, message, score) {
			this._propNames.push(relPath);
			this._messages.push(message);
			this._score += score;
			return false;
		};
		DetailContext.prototype.unionResolver = function() {
			return new DetailUnionResolver();
		};
		DetailContext.prototype.resolveUnion = function(unionResolver) {
			var _a, _b;
			var u = unionResolver;
			var best = null;
			for (var _i = 0, _c = u.contexts; _i < _c.length; _i++) {
				var ctx = _c[_i];
				if (!best || ctx._score >= best._score) best = ctx;
			}
			if (best && best._score > 0) {
				(_a = this._propNames).push.apply(_a, best._propNames);
				(_b = this._messages).push.apply(_b, best._messages);
			}
		};
		DetailContext.prototype.getError = function(path) {
			var msgParts = [];
			for (var i = this._propNames.length - 1; i >= 0; i--) {
				var p = this._propNames[i];
				path += typeof p === "number" ? "[" + p + "]" : p ? "." + p : "";
				var m = this._messages[i];
				if (m) msgParts.push(path + " " + m);
			}
			return new VError(path, msgParts.join("; "));
		};
		DetailContext.prototype.getErrorDetail = function(path) {
			var details = [];
			for (var i = this._propNames.length - 1; i >= 0; i--) {
				var p = this._propNames[i];
				path += typeof p === "number" ? "[" + p + "]" : p ? "." + p : "";
				var message = this._messages[i];
				if (message) details.push({
					path,
					message
				});
			}
			var detail = null;
			for (var i = details.length - 1; i >= 0; i--) {
				if (detail) details[i].nested = [detail];
				detail = details[i];
			}
			return detail;
		};
		return DetailContext;
	}();
	exports.DetailContext = DetailContext;
	var DetailUnionResolver = function() {
		function DetailUnionResolver() {
			this.contexts = [];
		}
		DetailUnionResolver.prototype.createContext = function() {
			var ctx = new DetailContext();
			this.contexts.push(ctx);
			return ctx;
		};
		return DetailUnionResolver;
	}();
}));
//#endregion
//#region ../../node_modules/.pnpm/ts-interface-checker@0.1.13/node_modules/ts-interface-checker/dist/types.js
var require_types$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	/**
	* This module defines nodes used to define types and validations for objects and interfaces.
	*/
	var __extends = exports && exports.__extends || (function() {
		var extendStatics = function(d, b) {
			extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d, b) {
				d.__proto__ = b;
			} || function(d, b) {
				for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
			};
			return extendStatics(d, b);
		};
		return function(d, b) {
			extendStatics(d, b);
			function __() {
				this.constructor = d;
			}
			d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
		};
	})();
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.basicTypes = exports.BasicType = exports.TParamList = exports.TParam = exports.param = exports.TFunc = exports.func = exports.TProp = exports.TOptional = exports.opt = exports.TIface = exports.iface = exports.TEnumLiteral = exports.enumlit = exports.TEnumType = exports.enumtype = exports.TIntersection = exports.intersection = exports.TUnion = exports.union = exports.TTuple = exports.tuple = exports.TArray = exports.array = exports.TLiteral = exports.lit = exports.TName = exports.name = exports.TType = void 0;
	var util_1 = require_util();
	/** Node that represents a type. */
	var TType = function() {
		function TType() {}
		return TType;
	}();
	exports.TType = TType;
	/** Parses a type spec into a TType node. */
	function parseSpec(typeSpec) {
		return typeof typeSpec === "string" ? name(typeSpec) : typeSpec;
	}
	function getNamedType(suite, name) {
		var ttype = suite[name];
		if (!ttype) throw new Error("Unknown type " + name);
		return ttype;
	}
	/**
	* Defines a type name, either built-in, or defined in this suite. It can typically be included in
	* the specs as just a plain string.
	*/
	function name(value) {
		return new TName(value);
	}
	exports.name = name;
	var TName = function(_super) {
		__extends(TName, _super);
		function TName(name) {
			var _this = _super.call(this) || this;
			_this.name = name;
			_this._failMsg = "is not a " + name;
			return _this;
		}
		TName.prototype.getChecker = function(suite, strict, allowedProps) {
			var _this = this;
			var ttype = getNamedType(suite, this.name);
			var checker = ttype.getChecker(suite, strict, allowedProps);
			if (ttype instanceof BasicType || ttype instanceof TName) return checker;
			return function(value, ctx) {
				return checker(value, ctx) ? true : ctx.fail(null, _this._failMsg, 0);
			};
		};
		return TName;
	}(TType);
	exports.TName = TName;
	/**
	* Defines a literal value, e.g. lit('hello') or lit(123).
	*/
	function lit(value) {
		return new TLiteral(value);
	}
	exports.lit = lit;
	var TLiteral = function(_super) {
		__extends(TLiteral, _super);
		function TLiteral(value) {
			var _this = _super.call(this) || this;
			_this.value = value;
			_this.name = JSON.stringify(value);
			_this._failMsg = "is not " + _this.name;
			return _this;
		}
		TLiteral.prototype.getChecker = function(suite, strict) {
			var _this = this;
			return function(value, ctx) {
				return value === _this.value ? true : ctx.fail(null, _this._failMsg, -1);
			};
		};
		return TLiteral;
	}(TType);
	exports.TLiteral = TLiteral;
	/**
	* Defines an array type, e.g. array('number').
	*/
	function array(typeSpec) {
		return new TArray(parseSpec(typeSpec));
	}
	exports.array = array;
	var TArray = function(_super) {
		__extends(TArray, _super);
		function TArray(ttype) {
			var _this = _super.call(this) || this;
			_this.ttype = ttype;
			return _this;
		}
		TArray.prototype.getChecker = function(suite, strict) {
			var itemChecker = this.ttype.getChecker(suite, strict);
			return function(value, ctx) {
				if (!Array.isArray(value)) return ctx.fail(null, "is not an array", 0);
				for (var i = 0; i < value.length; i++) if (!itemChecker(value[i], ctx)) return ctx.fail(i, null, 1);
				return true;
			};
		};
		return TArray;
	}(TType);
	exports.TArray = TArray;
	/**
	* Defines a tuple type, e.g. tuple('string', 'number').
	*/
	function tuple() {
		var typeSpec = [];
		for (var _i = 0; _i < arguments.length; _i++) typeSpec[_i] = arguments[_i];
		return new TTuple(typeSpec.map(function(t) {
			return parseSpec(t);
		}));
	}
	exports.tuple = tuple;
	var TTuple = function(_super) {
		__extends(TTuple, _super);
		function TTuple(ttypes) {
			var _this = _super.call(this) || this;
			_this.ttypes = ttypes;
			return _this;
		}
		TTuple.prototype.getChecker = function(suite, strict) {
			var itemCheckers = this.ttypes.map(function(t) {
				return t.getChecker(suite, strict);
			});
			var checker = function(value, ctx) {
				if (!Array.isArray(value)) return ctx.fail(null, "is not an array", 0);
				for (var i = 0; i < itemCheckers.length; i++) if (!itemCheckers[i](value[i], ctx)) return ctx.fail(i, null, 1);
				return true;
			};
			if (!strict) return checker;
			return function(value, ctx) {
				if (!checker(value, ctx)) return false;
				return value.length <= itemCheckers.length ? true : ctx.fail(itemCheckers.length, "is extraneous", 2);
			};
		};
		return TTuple;
	}(TType);
	exports.TTuple = TTuple;
	/**
	* Defines a union type, e.g. union('number', 'null').
	*/
	function union() {
		var typeSpec = [];
		for (var _i = 0; _i < arguments.length; _i++) typeSpec[_i] = arguments[_i];
		return new TUnion(typeSpec.map(function(t) {
			return parseSpec(t);
		}));
	}
	exports.union = union;
	var TUnion = function(_super) {
		__extends(TUnion, _super);
		function TUnion(ttypes) {
			var _this = _super.call(this) || this;
			_this.ttypes = ttypes;
			var names = ttypes.map(function(t) {
				return t instanceof TName || t instanceof TLiteral ? t.name : null;
			}).filter(function(n) {
				return n;
			});
			var otherTypes = ttypes.length - names.length;
			if (names.length) {
				if (otherTypes > 0) names.push(otherTypes + " more");
				_this._failMsg = "is none of " + names.join(", ");
			} else _this._failMsg = "is none of " + otherTypes + " types";
			return _this;
		}
		TUnion.prototype.getChecker = function(suite, strict) {
			var _this = this;
			var itemCheckers = this.ttypes.map(function(t) {
				return t.getChecker(suite, strict);
			});
			return function(value, ctx) {
				var ur = ctx.unionResolver();
				for (var i = 0; i < itemCheckers.length; i++) if (itemCheckers[i](value, ur.createContext())) return true;
				ctx.resolveUnion(ur);
				return ctx.fail(null, _this._failMsg, 0);
			};
		};
		return TUnion;
	}(TType);
	exports.TUnion = TUnion;
	/**
	* Defines an intersection type, e.g. intersection('number', 'null').
	*/
	function intersection() {
		var typeSpec = [];
		for (var _i = 0; _i < arguments.length; _i++) typeSpec[_i] = arguments[_i];
		return new TIntersection(typeSpec.map(function(t) {
			return parseSpec(t);
		}));
	}
	exports.intersection = intersection;
	var TIntersection = function(_super) {
		__extends(TIntersection, _super);
		function TIntersection(ttypes) {
			var _this = _super.call(this) || this;
			_this.ttypes = ttypes;
			return _this;
		}
		TIntersection.prototype.getChecker = function(suite, strict) {
			var allowedProps = /* @__PURE__ */ new Set();
			var itemCheckers = this.ttypes.map(function(t) {
				return t.getChecker(suite, strict, allowedProps);
			});
			return function(value, ctx) {
				if (itemCheckers.every(function(checker) {
					return checker(value, ctx);
				})) return true;
				return ctx.fail(null, null, 0);
			};
		};
		return TIntersection;
	}(TType);
	exports.TIntersection = TIntersection;
	/**
	* Defines an enum type, e.g. enum({'A': 1, 'B': 2}).
	*/
	function enumtype(values) {
		return new TEnumType(values);
	}
	exports.enumtype = enumtype;
	var TEnumType = function(_super) {
		__extends(TEnumType, _super);
		function TEnumType(members) {
			var _this = _super.call(this) || this;
			_this.members = members;
			_this.validValues = /* @__PURE__ */ new Set();
			_this._failMsg = "is not a valid enum value";
			_this.validValues = new Set(Object.keys(members).map(function(name) {
				return members[name];
			}));
			return _this;
		}
		TEnumType.prototype.getChecker = function(suite, strict) {
			var _this = this;
			return function(value, ctx) {
				return _this.validValues.has(value) ? true : ctx.fail(null, _this._failMsg, 0);
			};
		};
		return TEnumType;
	}(TType);
	exports.TEnumType = TEnumType;
	/**
	* Defines a literal enum value, such as Direction.Up, specified as enumlit("Direction", "Up").
	*/
	function enumlit(name, prop) {
		return new TEnumLiteral(name, prop);
	}
	exports.enumlit = enumlit;
	var TEnumLiteral = function(_super) {
		__extends(TEnumLiteral, _super);
		function TEnumLiteral(enumName, prop) {
			var _this = _super.call(this) || this;
			_this.enumName = enumName;
			_this.prop = prop;
			_this._failMsg = "is not " + enumName + "." + prop;
			return _this;
		}
		TEnumLiteral.prototype.getChecker = function(suite, strict) {
			var _this = this;
			var ttype = getNamedType(suite, this.enumName);
			if (!(ttype instanceof TEnumType)) throw new Error("Type " + this.enumName + " used in enumlit is not an enum type");
			var val = ttype.members[this.prop];
			if (!ttype.members.hasOwnProperty(this.prop)) throw new Error("Unknown value " + this.enumName + "." + this.prop + " used in enumlit");
			return function(value, ctx) {
				return value === val ? true : ctx.fail(null, _this._failMsg, -1);
			};
		};
		return TEnumLiteral;
	}(TType);
	exports.TEnumLiteral = TEnumLiteral;
	function makeIfaceProps(props) {
		return Object.keys(props).map(function(name) {
			return makeIfaceProp(name, props[name]);
		});
	}
	function makeIfaceProp(name, prop) {
		return prop instanceof TOptional ? new TProp(name, prop.ttype, true) : new TProp(name, parseSpec(prop), false);
	}
	/**
	* Defines an interface. The first argument is an array of interfaces that it extends, and the
	* second is an array of properties.
	*/
	function iface(bases, props) {
		return new TIface(bases, makeIfaceProps(props));
	}
	exports.iface = iface;
	var TIface = function(_super) {
		__extends(TIface, _super);
		function TIface(bases, props) {
			var _this = _super.call(this) || this;
			_this.bases = bases;
			_this.props = props;
			_this.propSet = new Set(props.map(function(p) {
				return p.name;
			}));
			return _this;
		}
		TIface.prototype.getChecker = function(suite, strict, allowedProps) {
			var _this = this;
			var baseCheckers = this.bases.map(function(b) {
				return getNamedType(suite, b).getChecker(suite, strict);
			});
			var propCheckers = this.props.map(function(prop) {
				return prop.ttype.getChecker(suite, strict);
			});
			var testCtx = new util_1.NoopContext();
			var isPropRequired = this.props.map(function(prop, i) {
				return !prop.isOpt && !propCheckers[i](void 0, testCtx);
			});
			var checker = function(value, ctx) {
				if (typeof value !== "object" || value === null) return ctx.fail(null, "is not an object", 0);
				for (var i = 0; i < baseCheckers.length; i++) if (!baseCheckers[i](value, ctx)) return false;
				for (var i = 0; i < propCheckers.length; i++) {
					var name_1 = _this.props[i].name;
					var v = value[name_1];
					if (v === void 0) {
						if (isPropRequired[i]) return ctx.fail(name_1, "is missing", 1);
					} else if (!propCheckers[i](v, ctx)) return ctx.fail(name_1, null, 1);
				}
				return true;
			};
			if (!strict) return checker;
			var propSet = this.propSet;
			if (allowedProps) {
				this.propSet.forEach(function(prop) {
					return allowedProps.add(prop);
				});
				propSet = allowedProps;
			}
			return function(value, ctx) {
				if (!checker(value, ctx)) return false;
				for (var prop in value) if (!propSet.has(prop)) return ctx.fail(prop, "is extraneous", 2);
				return true;
			};
		};
		return TIface;
	}(TType);
	exports.TIface = TIface;
	/**
	* Defines an optional property on an interface.
	*/
	function opt(typeSpec) {
		return new TOptional(parseSpec(typeSpec));
	}
	exports.opt = opt;
	var TOptional = function(_super) {
		__extends(TOptional, _super);
		function TOptional(ttype) {
			var _this = _super.call(this) || this;
			_this.ttype = ttype;
			return _this;
		}
		TOptional.prototype.getChecker = function(suite, strict) {
			var itemChecker = this.ttype.getChecker(suite, strict);
			return function(value, ctx) {
				return value === void 0 || itemChecker(value, ctx);
			};
		};
		return TOptional;
	}(TType);
	exports.TOptional = TOptional;
	/**
	* Defines a property in an interface.
	*/
	var TProp = function() {
		function TProp(name, ttype, isOpt) {
			this.name = name;
			this.ttype = ttype;
			this.isOpt = isOpt;
		}
		return TProp;
	}();
	exports.TProp = TProp;
	/**
	* Defines a function. The first argument declares the function's return type, the rest declare
	* its parameters.
	*/
	function func(resultSpec) {
		var params = [];
		for (var _i = 1; _i < arguments.length; _i++) params[_i - 1] = arguments[_i];
		return new TFunc(new TParamList(params), parseSpec(resultSpec));
	}
	exports.func = func;
	var TFunc = function(_super) {
		__extends(TFunc, _super);
		function TFunc(paramList, result) {
			var _this = _super.call(this) || this;
			_this.paramList = paramList;
			_this.result = result;
			return _this;
		}
		TFunc.prototype.getChecker = function(suite, strict) {
			return function(value, ctx) {
				return typeof value === "function" ? true : ctx.fail(null, "is not a function", 0);
			};
		};
		return TFunc;
	}(TType);
	exports.TFunc = TFunc;
	/**
	* Defines a function parameter.
	*/
	function param(name, typeSpec, isOpt) {
		return new TParam(name, parseSpec(typeSpec), Boolean(isOpt));
	}
	exports.param = param;
	var TParam = function() {
		function TParam(name, ttype, isOpt) {
			this.name = name;
			this.ttype = ttype;
			this.isOpt = isOpt;
		}
		return TParam;
	}();
	exports.TParam = TParam;
	/**
	* Defines a function parameter list.
	*/
	var TParamList = function(_super) {
		__extends(TParamList, _super);
		function TParamList(params) {
			var _this = _super.call(this) || this;
			_this.params = params;
			return _this;
		}
		TParamList.prototype.getChecker = function(suite, strict) {
			var _this = this;
			var itemCheckers = this.params.map(function(t) {
				return t.ttype.getChecker(suite, strict);
			});
			var testCtx = new util_1.NoopContext();
			var isParamRequired = this.params.map(function(param, i) {
				return !param.isOpt && !itemCheckers[i](void 0, testCtx);
			});
			var checker = function(value, ctx) {
				if (!Array.isArray(value)) return ctx.fail(null, "is not an array", 0);
				for (var i = 0; i < itemCheckers.length; i++) {
					var p = _this.params[i];
					if (value[i] === void 0) {
						if (isParamRequired[i]) return ctx.fail(p.name, "is missing", 1);
					} else if (!itemCheckers[i](value[i], ctx)) return ctx.fail(p.name, null, 1);
				}
				return true;
			};
			if (!strict) return checker;
			return function(value, ctx) {
				if (!checker(value, ctx)) return false;
				return value.length <= itemCheckers.length ? true : ctx.fail(itemCheckers.length, "is extraneous", 2);
			};
		};
		return TParamList;
	}(TType);
	exports.TParamList = TParamList;
	/**
	* Single TType implementation for all basic built-in types.
	*/
	var BasicType = function(_super) {
		__extends(BasicType, _super);
		function BasicType(validator, message) {
			var _this = _super.call(this) || this;
			_this.validator = validator;
			_this.message = message;
			return _this;
		}
		BasicType.prototype.getChecker = function(suite, strict) {
			var _this = this;
			return function(value, ctx) {
				return _this.validator(value) ? true : ctx.fail(null, _this.message, 0);
			};
		};
		return BasicType;
	}(TType);
	exports.BasicType = BasicType;
	/**
	* Defines the suite of basic types.
	*/
	exports.basicTypes = {
		any: new BasicType(function(v) {
			return true;
		}, "is invalid"),
		number: new BasicType(function(v) {
			return typeof v === "number";
		}, "is not a number"),
		object: new BasicType(function(v) {
			return typeof v === "object" && v;
		}, "is not an object"),
		boolean: new BasicType(function(v) {
			return typeof v === "boolean";
		}, "is not a boolean"),
		string: new BasicType(function(v) {
			return typeof v === "string";
		}, "is not a string"),
		symbol: new BasicType(function(v) {
			return typeof v === "symbol";
		}, "is not a symbol"),
		void: new BasicType(function(v) {
			return v == null;
		}, "is not void"),
		undefined: new BasicType(function(v) {
			return v === void 0;
		}, "is not undefined"),
		null: new BasicType(function(v) {
			return v === null;
		}, "is not null"),
		never: new BasicType(function(v) {
			return false;
		}, "is unexpected"),
		Date: new BasicType(getIsNativeChecker("[object Date]"), "is not a Date"),
		RegExp: new BasicType(getIsNativeChecker("[object RegExp]"), "is not a RegExp")
	};
	var nativeToString = Object.prototype.toString;
	function getIsNativeChecker(tag) {
		return function(v) {
			return typeof v === "object" && v && nativeToString.call(v) === tag;
		};
	}
	if (typeof Buffer !== "undefined") exports.basicTypes.Buffer = new BasicType(function(v) {
		return Buffer.isBuffer(v);
	}, "is not a Buffer");
	var _loop_1 = function(array_1) {
		exports.basicTypes[array_1.name] = new BasicType(function(v) {
			return v instanceof array_1;
		}, "is not a " + array_1.name);
	};
	for (var _i = 0, _a = [
		Int8Array,
		Uint8Array,
		Uint8ClampedArray,
		Int16Array,
		Uint16Array,
		Int32Array,
		Uint32Array,
		Float32Array,
		Float64Array,
		ArrayBuffer
	]; _i < _a.length; _i++) {
		var array_1 = _a[_i];
		_loop_1(array_1);
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/ts-interface-checker@0.1.13/node_modules/ts-interface-checker/dist/index.js
var require_dist$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __spreadArrays = exports && exports.__spreadArrays || function() {
		for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
		for (var r = Array(s), k = 0, i = 0; i < il; i++) for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++) r[k] = a[j];
		return r;
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Checker = exports.createCheckers = void 0;
	var types_1 = require_types$1();
	var util_1 = require_util();
	/**
	* Export functions used to define interfaces.
	*/
	var types_2 = require_types$1();
	Object.defineProperty(exports, "TArray", {
		enumerable: true,
		get: function() {
			return types_2.TArray;
		}
	});
	Object.defineProperty(exports, "TEnumType", {
		enumerable: true,
		get: function() {
			return types_2.TEnumType;
		}
	});
	Object.defineProperty(exports, "TEnumLiteral", {
		enumerable: true,
		get: function() {
			return types_2.TEnumLiteral;
		}
	});
	Object.defineProperty(exports, "TFunc", {
		enumerable: true,
		get: function() {
			return types_2.TFunc;
		}
	});
	Object.defineProperty(exports, "TIface", {
		enumerable: true,
		get: function() {
			return types_2.TIface;
		}
	});
	Object.defineProperty(exports, "TLiteral", {
		enumerable: true,
		get: function() {
			return types_2.TLiteral;
		}
	});
	Object.defineProperty(exports, "TName", {
		enumerable: true,
		get: function() {
			return types_2.TName;
		}
	});
	Object.defineProperty(exports, "TOptional", {
		enumerable: true,
		get: function() {
			return types_2.TOptional;
		}
	});
	Object.defineProperty(exports, "TParam", {
		enumerable: true,
		get: function() {
			return types_2.TParam;
		}
	});
	Object.defineProperty(exports, "TParamList", {
		enumerable: true,
		get: function() {
			return types_2.TParamList;
		}
	});
	Object.defineProperty(exports, "TProp", {
		enumerable: true,
		get: function() {
			return types_2.TProp;
		}
	});
	Object.defineProperty(exports, "TTuple", {
		enumerable: true,
		get: function() {
			return types_2.TTuple;
		}
	});
	Object.defineProperty(exports, "TType", {
		enumerable: true,
		get: function() {
			return types_2.TType;
		}
	});
	Object.defineProperty(exports, "TUnion", {
		enumerable: true,
		get: function() {
			return types_2.TUnion;
		}
	});
	Object.defineProperty(exports, "TIntersection", {
		enumerable: true,
		get: function() {
			return types_2.TIntersection;
		}
	});
	Object.defineProperty(exports, "array", {
		enumerable: true,
		get: function() {
			return types_2.array;
		}
	});
	Object.defineProperty(exports, "enumlit", {
		enumerable: true,
		get: function() {
			return types_2.enumlit;
		}
	});
	Object.defineProperty(exports, "enumtype", {
		enumerable: true,
		get: function() {
			return types_2.enumtype;
		}
	});
	Object.defineProperty(exports, "func", {
		enumerable: true,
		get: function() {
			return types_2.func;
		}
	});
	Object.defineProperty(exports, "iface", {
		enumerable: true,
		get: function() {
			return types_2.iface;
		}
	});
	Object.defineProperty(exports, "lit", {
		enumerable: true,
		get: function() {
			return types_2.lit;
		}
	});
	Object.defineProperty(exports, "name", {
		enumerable: true,
		get: function() {
			return types_2.name;
		}
	});
	Object.defineProperty(exports, "opt", {
		enumerable: true,
		get: function() {
			return types_2.opt;
		}
	});
	Object.defineProperty(exports, "param", {
		enumerable: true,
		get: function() {
			return types_2.param;
		}
	});
	Object.defineProperty(exports, "tuple", {
		enumerable: true,
		get: function() {
			return types_2.tuple;
		}
	});
	Object.defineProperty(exports, "union", {
		enumerable: true,
		get: function() {
			return types_2.union;
		}
	});
	Object.defineProperty(exports, "intersection", {
		enumerable: true,
		get: function() {
			return types_2.intersection;
		}
	});
	Object.defineProperty(exports, "BasicType", {
		enumerable: true,
		get: function() {
			return types_2.BasicType;
		}
	});
	var util_2 = require_util();
	Object.defineProperty(exports, "VError", {
		enumerable: true,
		get: function() {
			return util_2.VError;
		}
	});
	/**
	* Takes one of more type suites (e.g. a module generated by `ts-interface-builder`), and combines
	* them into a suite of interface checkers. If a type is used by name, that name should be present
	* among the passed-in type suites.
	*
	* The returned object maps type names to Checker objects.
	*/
	function createCheckers() {
		var typeSuite = [];
		for (var _i = 0; _i < arguments.length; _i++) typeSuite[_i] = arguments[_i];
		var fullSuite = Object.assign.apply(Object, __spreadArrays([{}, types_1.basicTypes], typeSuite));
		var checkers = {};
		for (var _a = 0, typeSuite_1 = typeSuite; _a < typeSuite_1.length; _a++) {
			var suite_1 = typeSuite_1[_a];
			for (var _b = 0, _c = Object.keys(suite_1); _b < _c.length; _b++) {
				var name = _c[_b];
				checkers[name] = new Checker(fullSuite, suite_1[name]);
			}
		}
		return checkers;
	}
	exports.createCheckers = createCheckers;
	/**
	* Checker implements validation of objects, and also includes accessors to validate method calls.
	* Checkers should be created using `createCheckers()`.
	*/
	var Checker = function() {
		function Checker(suite, ttype, _path) {
			if (_path === void 0) _path = "value";
			this.suite = suite;
			this.ttype = ttype;
			this._path = _path;
			this.props = /* @__PURE__ */ new Map();
			if (ttype instanceof types_1.TIface) for (var _i = 0, _a = ttype.props; _i < _a.length; _i++) {
				var p = _a[_i];
				this.props.set(p.name, p.ttype);
			}
			this.checkerPlain = this.ttype.getChecker(suite, false);
			this.checkerStrict = this.ttype.getChecker(suite, true);
		}
		/**
		* Set the path to report in errors, instead of the default "value". (E.g. if the Checker is for
		* a "person" interface, set path to "person" to report e.g. "person.name is not a string".)
		*/
		Checker.prototype.setReportedPath = function(path) {
			this._path = path;
		};
		/**
		* Check that the given value satisfies this checker's type, or throw Error.
		*/
		Checker.prototype.check = function(value) {
			return this._doCheck(this.checkerPlain, value);
		};
		/**
		* A fast check for whether or not the given value satisfies this Checker's type. This returns
		* true or false, does not produce an error message, and is fast both on success and on failure.
		*/
		Checker.prototype.test = function(value) {
			return this.checkerPlain(value, new util_1.NoopContext());
		};
		/**
		* Returns an error object describing the errors if the given value does not satisfy this
		* Checker's type, or null if it does.
		*/
		Checker.prototype.validate = function(value) {
			return this._doValidate(this.checkerPlain, value);
		};
		/**
		* Check that the given value satisfies this checker's type strictly. This checks that objects
		* and tuples have no extra members. Note that this prevents backward compatibility, so usually
		* a plain check() is more appropriate.
		*/
		Checker.prototype.strictCheck = function(value) {
			return this._doCheck(this.checkerStrict, value);
		};
		/**
		* A fast strict check for whether or not the given value satisfies this Checker's type. Returns
		* true or false, does not produce an error message, and is fast both on success and on failure.
		*/
		Checker.prototype.strictTest = function(value) {
			return this.checkerStrict(value, new util_1.NoopContext());
		};
		/**
		* Returns an error object describing the errors if the given value does not satisfy this
		* Checker's type strictly, or null if it does.
		*/
		Checker.prototype.strictValidate = function(value) {
			return this._doValidate(this.checkerStrict, value);
		};
		/**
		* If this checker is for an interface, returns a Checker for the type required for the given
		* property of this interface.
		*/
		Checker.prototype.getProp = function(prop) {
			var ttype = this.props.get(prop);
			if (!ttype) throw new Error("Type has no property " + prop);
			return new Checker(this.suite, ttype, this._path + "." + prop);
		};
		/**
		* If this checker is for an interface, returns a Checker for the argument-list required to call
		* the given method of this interface. E.g. if this Checker is for the interface:
		*    interface Foo {
		*      find(s: string, pos?: number): number;
		*    }
		* Then methodArgs("find").check(...) will succeed for ["foo"] and ["foo", 3], but not for [17].
		*/
		Checker.prototype.methodArgs = function(methodName) {
			var tfunc = this._getMethod(methodName);
			return new Checker(this.suite, tfunc.paramList);
		};
		/**
		* If this checker is for an interface, returns a Checker for the return value of the given
		* method of this interface.
		*/
		Checker.prototype.methodResult = function(methodName) {
			var tfunc = this._getMethod(methodName);
			return new Checker(this.suite, tfunc.result);
		};
		/**
		* If this checker is for a function, returns a Checker for its argument-list.
		*/
		Checker.prototype.getArgs = function() {
			if (!(this.ttype instanceof types_1.TFunc)) throw new Error("getArgs() applied to non-function");
			return new Checker(this.suite, this.ttype.paramList);
		};
		/**
		* If this checker is for a function, returns a Checker for its result.
		*/
		Checker.prototype.getResult = function() {
			if (!(this.ttype instanceof types_1.TFunc)) throw new Error("getResult() applied to non-function");
			return new Checker(this.suite, this.ttype.result);
		};
		/**
		* Return the type for which this is a checker.
		*/
		Checker.prototype.getType = function() {
			return this.ttype;
		};
		/**
		* Actual implementation of check() and strictCheck().
		*/
		Checker.prototype._doCheck = function(checkerFunc, value) {
			if (!checkerFunc(value, new util_1.NoopContext())) {
				var detailCtx = new util_1.DetailContext();
				checkerFunc(value, detailCtx);
				throw detailCtx.getError(this._path);
			}
		};
		Checker.prototype._doValidate = function(checkerFunc, value) {
			if (checkerFunc(value, new util_1.NoopContext())) return null;
			var detailCtx = new util_1.DetailContext();
			checkerFunc(value, detailCtx);
			return detailCtx.getErrorDetail(this._path);
		};
		Checker.prototype._getMethod = function(methodName) {
			var ttype = this.props.get(methodName);
			if (!ttype) throw new Error("Type has no property " + methodName);
			if (!(ttype instanceof types_1.TFunc)) throw new Error("Property " + methodName + " is not a method");
			return ttype;
		};
		return Checker;
	}();
	exports.Checker = Checker;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/Options-gen-types.js
var require_Options_gen_types = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireWildcard(obj) {
		if (obj && obj.__esModule) return obj;
		else {
			var newObj = {};
			if (obj != null) {
				for (var key in obj) if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
			}
			newObj.default = obj;
			return newObj;
		}
	}
	var t = _interopRequireWildcard(require_dist$1());
	exports.Transform = t.union(t.lit("jsx"), t.lit("typescript"), t.lit("flow"), t.lit("imports"), t.lit("react-hot-loader"), t.lit("jest"));
	exports.SourceMapOptions = t.iface([], { compiledFilename: "string" });
	exports.Options = t.iface([], {
		transforms: t.array("Transform"),
		disableESTransforms: t.opt("boolean"),
		jsxRuntime: t.opt(t.union(t.lit("classic"), t.lit("automatic"), t.lit("preserve"))),
		production: t.opt("boolean"),
		jsxImportSource: t.opt("string"),
		jsxPragma: t.opt("string"),
		jsxFragmentPragma: t.opt("string"),
		keepUnusedImports: t.opt("boolean"),
		preserveDynamicImport: t.opt("boolean"),
		injectCreateRequireForImportRequire: t.opt("boolean"),
		enableLegacyTypeScriptModuleInterop: t.opt("boolean"),
		enableLegacyBabel5ModuleInterop: t.opt("boolean"),
		sourceMapOptions: t.opt("SourceMapOptions"),
		filePath: t.opt("string")
	});
	exports.default = {
		Transform: exports.Transform,
		SourceMapOptions: exports.SourceMapOptions,
		Options: exports.Options
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/Options.js
var require_Options = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _tsinterfacechecker = require_dist$1();
	var _Optionsgentypes2 = _interopRequireDefault(require_Options_gen_types());
	const { Options: OptionsChecker } = _tsinterfacechecker.createCheckers.call(void 0, _Optionsgentypes2.default);
	function validateOptions(options) {
		OptionsChecker.strictCheck(options);
	}
	exports.validateOptions = validateOptions;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/traverser/lval.js
var require_lval = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _flow = require_flow();
	var _typescript = require_typescript();
	var _index = require_tokenizer();
	var _keywords = require_keywords();
	var _types = require_types$2();
	var _base = require_base();
	var _expression = require_expression();
	var _util = require_util$1();
	function parseSpread() {
		_index.next.call(void 0);
		_expression.parseMaybeAssign.call(void 0, false);
	}
	exports.parseSpread = parseSpread;
	function parseRest(isBlockScope) {
		_index.next.call(void 0);
		parseBindingAtom(isBlockScope);
	}
	exports.parseRest = parseRest;
	function parseBindingIdentifier(isBlockScope) {
		_expression.parseIdentifier.call(void 0);
		markPriorBindingIdentifier(isBlockScope);
	}
	exports.parseBindingIdentifier = parseBindingIdentifier;
	function parseImportedIdentifier() {
		_expression.parseIdentifier.call(void 0);
		_base.state.tokens[_base.state.tokens.length - 1].identifierRole = _index.IdentifierRole.ImportDeclaration;
	}
	exports.parseImportedIdentifier = parseImportedIdentifier;
	function markPriorBindingIdentifier(isBlockScope) {
		let identifierRole;
		if (_base.state.scopeDepth === 0) identifierRole = _index.IdentifierRole.TopLevelDeclaration;
		else if (isBlockScope) identifierRole = _index.IdentifierRole.BlockScopedDeclaration;
		else identifierRole = _index.IdentifierRole.FunctionScopedDeclaration;
		_base.state.tokens[_base.state.tokens.length - 1].identifierRole = identifierRole;
	}
	exports.markPriorBindingIdentifier = markPriorBindingIdentifier;
	function parseBindingAtom(isBlockScope) {
		switch (_base.state.type) {
			case _types.TokenType._this: {
				const oldIsType = _index.pushTypeContext.call(void 0, 0);
				_index.next.call(void 0);
				_index.popTypeContext.call(void 0, oldIsType);
				return;
			}
			case _types.TokenType._yield:
			case _types.TokenType.name:
				_base.state.type = _types.TokenType.name;
				parseBindingIdentifier(isBlockScope);
				return;
			case _types.TokenType.bracketL:
				_index.next.call(void 0);
				parseBindingList(_types.TokenType.bracketR, isBlockScope, true);
				return;
			case _types.TokenType.braceL:
				_expression.parseObj.call(void 0, true, isBlockScope);
				return;
			default: _util.unexpected.call(void 0);
		}
	}
	exports.parseBindingAtom = parseBindingAtom;
	function parseBindingList(close, isBlockScope, allowEmpty = false, allowModifiers = false, contextId = 0) {
		let first = true;
		let hasRemovedComma = false;
		const firstItemTokenIndex = _base.state.tokens.length;
		while (!_index.eat.call(void 0, close) && !_base.state.error) {
			if (first) first = false;
			else {
				_util.expect.call(void 0, _types.TokenType.comma);
				_base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
				if (!hasRemovedComma && _base.state.tokens[firstItemTokenIndex].isType) {
					_base.state.tokens[_base.state.tokens.length - 1].isType = true;
					hasRemovedComma = true;
				}
			}
			if (allowEmpty && _index.match.call(void 0, _types.TokenType.comma)) {} else if (_index.eat.call(void 0, close)) break;
			else if (_index.match.call(void 0, _types.TokenType.ellipsis)) {
				parseRest(isBlockScope);
				parseAssignableListItemTypes();
				_index.eat.call(void 0, _types.TokenType.comma);
				_util.expect.call(void 0, close);
				break;
			} else parseAssignableListItem(allowModifiers, isBlockScope);
		}
	}
	exports.parseBindingList = parseBindingList;
	function parseAssignableListItem(allowModifiers, isBlockScope) {
		if (allowModifiers) _typescript.tsParseModifiers.call(void 0, [
			_keywords.ContextualKeyword._public,
			_keywords.ContextualKeyword._protected,
			_keywords.ContextualKeyword._private,
			_keywords.ContextualKeyword._readonly,
			_keywords.ContextualKeyword._override
		]);
		parseMaybeDefault(isBlockScope);
		parseAssignableListItemTypes();
		parseMaybeDefault(isBlockScope, true);
	}
	function parseAssignableListItemTypes() {
		if (_base.isFlowEnabled) _flow.flowParseAssignableListItemTypes.call(void 0);
		else if (_base.isTypeScriptEnabled) _typescript.tsParseAssignableListItemTypes.call(void 0);
	}
	function parseMaybeDefault(isBlockScope, leftAlreadyParsed = false) {
		if (!leftAlreadyParsed) parseBindingAtom(isBlockScope);
		if (!_index.eat.call(void 0, _types.TokenType.eq)) return;
		const eqIndex = _base.state.tokens.length - 1;
		_expression.parseMaybeAssign.call(void 0);
		_base.state.tokens[eqIndex].rhsEndIndex = _base.state.tokens.length;
	}
	exports.parseMaybeDefault = parseMaybeDefault;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/plugins/typescript.js
var require_typescript = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _index = require_tokenizer();
	var _keywords = require_keywords();
	var _types = require_types$2();
	var _base = require_base();
	var _expression = require_expression();
	var _lval = require_lval();
	var _statement = require_statement();
	var _util = require_util$1();
	var _jsx = require_jsx();
	function tsIsIdentifier() {
		return _index.match.call(void 0, _types.TokenType.name);
	}
	function isLiteralPropertyName() {
		return _index.match.call(void 0, _types.TokenType.name) || Boolean(_base.state.type & _types.TokenType.IS_KEYWORD) || _index.match.call(void 0, _types.TokenType.string) || _index.match.call(void 0, _types.TokenType.num) || _index.match.call(void 0, _types.TokenType.bigint) || _index.match.call(void 0, _types.TokenType.decimal);
	}
	function tsNextTokenCanFollowModifier() {
		const snapshot = _base.state.snapshot();
		_index.next.call(void 0);
		if ((_index.match.call(void 0, _types.TokenType.bracketL) || _index.match.call(void 0, _types.TokenType.braceL) || _index.match.call(void 0, _types.TokenType.star) || _index.match.call(void 0, _types.TokenType.ellipsis) || _index.match.call(void 0, _types.TokenType.hash) || isLiteralPropertyName()) && !_util.hasPrecedingLineBreak.call(void 0)) return true;
		else {
			_base.state.restoreFromSnapshot(snapshot);
			return false;
		}
	}
	function tsParseModifiers(allowedModifiers) {
		while (true) if (tsParseModifier(allowedModifiers) === null) break;
	}
	exports.tsParseModifiers = tsParseModifiers;
	/** Parses a modifier matching one the given modifier names. */
	function tsParseModifier(allowedModifiers) {
		if (!_index.match.call(void 0, _types.TokenType.name)) return null;
		const modifier = _base.state.contextualKeyword;
		if (allowedModifiers.indexOf(modifier) !== -1 && tsNextTokenCanFollowModifier()) {
			switch (modifier) {
				case _keywords.ContextualKeyword._readonly:
					_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._readonly;
					break;
				case _keywords.ContextualKeyword._abstract:
					_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._abstract;
					break;
				case _keywords.ContextualKeyword._static:
					_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._static;
					break;
				case _keywords.ContextualKeyword._public:
					_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._public;
					break;
				case _keywords.ContextualKeyword._private:
					_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._private;
					break;
				case _keywords.ContextualKeyword._protected:
					_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._protected;
					break;
				case _keywords.ContextualKeyword._override:
					_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._override;
					break;
				case _keywords.ContextualKeyword._declare: _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._declare;
			}
			return modifier;
		}
		return null;
	}
	exports.tsParseModifier = tsParseModifier;
	function tsParseEntityName() {
		_expression.parseIdentifier.call(void 0);
		while (_index.eat.call(void 0, _types.TokenType.dot)) _expression.parseIdentifier.call(void 0);
	}
	function tsParseTypeReference() {
		tsParseEntityName();
		if (!_util.hasPrecedingLineBreak.call(void 0) && _index.match.call(void 0, _types.TokenType.lessThan)) tsParseTypeArguments();
	}
	function tsParseThisTypePredicate() {
		_index.next.call(void 0);
		tsParseTypeAnnotation();
	}
	function tsParseThisTypeNode() {
		_index.next.call(void 0);
	}
	function tsParseTypeQuery() {
		_util.expect.call(void 0, _types.TokenType._typeof);
		if (_index.match.call(void 0, _types.TokenType._import)) tsParseImportType();
		else tsParseEntityName();
		if (!_util.hasPrecedingLineBreak.call(void 0) && _index.match.call(void 0, _types.TokenType.lessThan)) tsParseTypeArguments();
	}
	function tsParseImportType() {
		_util.expect.call(void 0, _types.TokenType._import);
		_util.expect.call(void 0, _types.TokenType.parenL);
		_util.expect.call(void 0, _types.TokenType.string);
		_util.expect.call(void 0, _types.TokenType.parenR);
		if (_index.eat.call(void 0, _types.TokenType.dot)) tsParseEntityName();
		if (_index.match.call(void 0, _types.TokenType.lessThan)) tsParseTypeArguments();
	}
	function tsParseTypeParameter() {
		_index.eat.call(void 0, _types.TokenType._const);
		const hadIn = _index.eat.call(void 0, _types.TokenType._in);
		const hadOut = _util.eatContextual.call(void 0, _keywords.ContextualKeyword._out);
		_index.eat.call(void 0, _types.TokenType._const);
		if ((hadIn || hadOut) && !_index.match.call(void 0, _types.TokenType.name)) _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType.name;
		else _expression.parseIdentifier.call(void 0);
		if (_index.eat.call(void 0, _types.TokenType._extends)) tsParseType();
		if (_index.eat.call(void 0, _types.TokenType.eq)) tsParseType();
	}
	function tsTryParseTypeParameters() {
		if (_index.match.call(void 0, _types.TokenType.lessThan)) tsParseTypeParameters();
	}
	exports.tsTryParseTypeParameters = tsTryParseTypeParameters;
	function tsParseTypeParameters() {
		const oldIsType = _index.pushTypeContext.call(void 0, 0);
		if (_index.match.call(void 0, _types.TokenType.lessThan) || _index.match.call(void 0, _types.TokenType.typeParameterStart)) _index.next.call(void 0);
		else _util.unexpected.call(void 0);
		while (!_index.eat.call(void 0, _types.TokenType.greaterThan) && !_base.state.error) {
			tsParseTypeParameter();
			_index.eat.call(void 0, _types.TokenType.comma);
		}
		_index.popTypeContext.call(void 0, oldIsType);
	}
	function tsFillSignature(returnToken) {
		const returnTokenRequired = returnToken === _types.TokenType.arrow;
		tsTryParseTypeParameters();
		_util.expect.call(void 0, _types.TokenType.parenL);
		_base.state.scopeDepth++;
		tsParseBindingListForSignature(false);
		_base.state.scopeDepth--;
		if (returnTokenRequired) tsParseTypeOrTypePredicateAnnotation(returnToken);
		else if (_index.match.call(void 0, returnToken)) tsParseTypeOrTypePredicateAnnotation(returnToken);
	}
	function tsParseBindingListForSignature(isBlockScope) {
		_lval.parseBindingList.call(void 0, _types.TokenType.parenR, isBlockScope);
	}
	function tsParseTypeMemberSemicolon() {
		if (!_index.eat.call(void 0, _types.TokenType.comma)) _util.semicolon.call(void 0);
	}
	function tsParseSignatureMember() {
		tsFillSignature(_types.TokenType.colon);
		tsParseTypeMemberSemicolon();
	}
	function tsIsUnambiguouslyIndexSignature() {
		const snapshot = _base.state.snapshot();
		_index.next.call(void 0);
		const isIndexSignature = _index.eat.call(void 0, _types.TokenType.name) && _index.match.call(void 0, _types.TokenType.colon);
		_base.state.restoreFromSnapshot(snapshot);
		return isIndexSignature;
	}
	function tsTryParseIndexSignature() {
		if (!(_index.match.call(void 0, _types.TokenType.bracketL) && tsIsUnambiguouslyIndexSignature())) return false;
		const oldIsType = _index.pushTypeContext.call(void 0, 0);
		_util.expect.call(void 0, _types.TokenType.bracketL);
		_expression.parseIdentifier.call(void 0);
		tsParseTypeAnnotation();
		_util.expect.call(void 0, _types.TokenType.bracketR);
		tsTryParseTypeAnnotation();
		tsParseTypeMemberSemicolon();
		_index.popTypeContext.call(void 0, oldIsType);
		return true;
	}
	function tsParsePropertyOrMethodSignature(isReadonly) {
		_index.eat.call(void 0, _types.TokenType.question);
		if (!isReadonly && (_index.match.call(void 0, _types.TokenType.parenL) || _index.match.call(void 0, _types.TokenType.lessThan))) {
			tsFillSignature(_types.TokenType.colon);
			tsParseTypeMemberSemicolon();
		} else {
			tsTryParseTypeAnnotation();
			tsParseTypeMemberSemicolon();
		}
	}
	function tsParseTypeMember() {
		if (_index.match.call(void 0, _types.TokenType.parenL) || _index.match.call(void 0, _types.TokenType.lessThan)) {
			tsParseSignatureMember();
			return;
		}
		if (_index.match.call(void 0, _types.TokenType._new)) {
			_index.next.call(void 0);
			if (_index.match.call(void 0, _types.TokenType.parenL) || _index.match.call(void 0, _types.TokenType.lessThan)) tsParseSignatureMember();
			else tsParsePropertyOrMethodSignature(false);
			return;
		}
		const readonly = !!tsParseModifier([_keywords.ContextualKeyword._readonly]);
		if (tsTryParseIndexSignature()) return;
		if ((_util.isContextual.call(void 0, _keywords.ContextualKeyword._get) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._set)) && tsNextTokenCanFollowModifier()) {}
		_expression.parsePropertyName.call(void 0, -1);
		tsParsePropertyOrMethodSignature(readonly);
	}
	function tsParseTypeLiteral() {
		tsParseObjectTypeMembers();
	}
	function tsParseObjectTypeMembers() {
		_util.expect.call(void 0, _types.TokenType.braceL);
		while (!_index.eat.call(void 0, _types.TokenType.braceR) && !_base.state.error) tsParseTypeMember();
	}
	function tsLookaheadIsStartOfMappedType() {
		const snapshot = _base.state.snapshot();
		const isStartOfMappedType = tsIsStartOfMappedType();
		_base.state.restoreFromSnapshot(snapshot);
		return isStartOfMappedType;
	}
	function tsIsStartOfMappedType() {
		_index.next.call(void 0);
		if (_index.eat.call(void 0, _types.TokenType.plus) || _index.eat.call(void 0, _types.TokenType.minus)) return _util.isContextual.call(void 0, _keywords.ContextualKeyword._readonly);
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._readonly)) _index.next.call(void 0);
		if (!_index.match.call(void 0, _types.TokenType.bracketL)) return false;
		_index.next.call(void 0);
		if (!tsIsIdentifier()) return false;
		_index.next.call(void 0);
		return _index.match.call(void 0, _types.TokenType._in);
	}
	function tsParseMappedTypeParameter() {
		_expression.parseIdentifier.call(void 0);
		_util.expect.call(void 0, _types.TokenType._in);
		tsParseType();
	}
	function tsParseMappedType() {
		_util.expect.call(void 0, _types.TokenType.braceL);
		if (_index.match.call(void 0, _types.TokenType.plus) || _index.match.call(void 0, _types.TokenType.minus)) {
			_index.next.call(void 0);
			_util.expectContextual.call(void 0, _keywords.ContextualKeyword._readonly);
		} else _util.eatContextual.call(void 0, _keywords.ContextualKeyword._readonly);
		_util.expect.call(void 0, _types.TokenType.bracketL);
		tsParseMappedTypeParameter();
		if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._as)) tsParseType();
		_util.expect.call(void 0, _types.TokenType.bracketR);
		if (_index.match.call(void 0, _types.TokenType.plus) || _index.match.call(void 0, _types.TokenType.minus)) {
			_index.next.call(void 0);
			_util.expect.call(void 0, _types.TokenType.question);
		} else _index.eat.call(void 0, _types.TokenType.question);
		tsTryParseType();
		_util.semicolon.call(void 0);
		_util.expect.call(void 0, _types.TokenType.braceR);
	}
	function tsParseTupleType() {
		_util.expect.call(void 0, _types.TokenType.bracketL);
		while (!_index.eat.call(void 0, _types.TokenType.bracketR) && !_base.state.error) {
			tsParseTupleElementType();
			_index.eat.call(void 0, _types.TokenType.comma);
		}
	}
	function tsParseTupleElementType() {
		if (_index.eat.call(void 0, _types.TokenType.ellipsis)) tsParseType();
		else {
			tsParseType();
			_index.eat.call(void 0, _types.TokenType.question);
		}
		if (_index.eat.call(void 0, _types.TokenType.colon)) tsParseType();
	}
	function tsParseParenthesizedType() {
		_util.expect.call(void 0, _types.TokenType.parenL);
		tsParseType();
		_util.expect.call(void 0, _types.TokenType.parenR);
	}
	function tsParseTemplateLiteralType() {
		_index.nextTemplateToken.call(void 0);
		_index.nextTemplateToken.call(void 0);
		while (!_index.match.call(void 0, _types.TokenType.backQuote) && !_base.state.error) {
			_util.expect.call(void 0, _types.TokenType.dollarBraceL);
			tsParseType();
			_index.nextTemplateToken.call(void 0);
			_index.nextTemplateToken.call(void 0);
		}
		_index.next.call(void 0);
	}
	var FunctionType;
	(function(FunctionType) {
		const TSFunctionType = 0;
		FunctionType[FunctionType["TSFunctionType"] = TSFunctionType] = "TSFunctionType";
		const TSConstructorType = 1;
		FunctionType[FunctionType["TSConstructorType"] = TSConstructorType] = "TSConstructorType";
		const TSAbstractConstructorType = 2;
		FunctionType[FunctionType["TSAbstractConstructorType"] = TSAbstractConstructorType] = "TSAbstractConstructorType";
	})(FunctionType || (FunctionType = {}));
	function tsParseFunctionOrConstructorType(type) {
		if (type === FunctionType.TSAbstractConstructorType) _util.expectContextual.call(void 0, _keywords.ContextualKeyword._abstract);
		if (type === FunctionType.TSConstructorType || type === FunctionType.TSAbstractConstructorType) _util.expect.call(void 0, _types.TokenType._new);
		const oldInDisallowConditionalTypesContext = _base.state.inDisallowConditionalTypesContext;
		_base.state.inDisallowConditionalTypesContext = false;
		tsFillSignature(_types.TokenType.arrow);
		_base.state.inDisallowConditionalTypesContext = oldInDisallowConditionalTypesContext;
	}
	function tsParseNonArrayType() {
		switch (_base.state.type) {
			case _types.TokenType.name:
				tsParseTypeReference();
				return;
			case _types.TokenType._void:
			case _types.TokenType._null:
				_index.next.call(void 0);
				return;
			case _types.TokenType.string:
			case _types.TokenType.num:
			case _types.TokenType.bigint:
			case _types.TokenType.decimal:
			case _types.TokenType._true:
			case _types.TokenType._false:
				_expression.parseLiteral.call(void 0);
				return;
			case _types.TokenType.minus:
				_index.next.call(void 0);
				_expression.parseLiteral.call(void 0);
				return;
			case _types.TokenType._this:
				tsParseThisTypeNode();
				if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._is) && !_util.hasPrecedingLineBreak.call(void 0)) tsParseThisTypePredicate();
				return;
			case _types.TokenType._typeof:
				tsParseTypeQuery();
				return;
			case _types.TokenType._import:
				tsParseImportType();
				return;
			case _types.TokenType.braceL:
				if (tsLookaheadIsStartOfMappedType()) tsParseMappedType();
				else tsParseTypeLiteral();
				return;
			case _types.TokenType.bracketL:
				tsParseTupleType();
				return;
			case _types.TokenType.parenL:
				tsParseParenthesizedType();
				return;
			case _types.TokenType.backQuote:
				tsParseTemplateLiteralType();
				return;
			default: if (_base.state.type & _types.TokenType.IS_KEYWORD) {
				_index.next.call(void 0);
				_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType.name;
				return;
			}
		}
		_util.unexpected.call(void 0);
	}
	function tsParseArrayTypeOrHigher() {
		tsParseNonArrayType();
		while (!_util.hasPrecedingLineBreak.call(void 0) && _index.eat.call(void 0, _types.TokenType.bracketL)) if (!_index.eat.call(void 0, _types.TokenType.bracketR)) {
			tsParseType();
			_util.expect.call(void 0, _types.TokenType.bracketR);
		}
	}
	function tsParseInferType() {
		_util.expectContextual.call(void 0, _keywords.ContextualKeyword._infer);
		_expression.parseIdentifier.call(void 0);
		if (_index.match.call(void 0, _types.TokenType._extends)) {
			const snapshot = _base.state.snapshot();
			_util.expect.call(void 0, _types.TokenType._extends);
			const oldInDisallowConditionalTypesContext = _base.state.inDisallowConditionalTypesContext;
			_base.state.inDisallowConditionalTypesContext = true;
			tsParseType();
			_base.state.inDisallowConditionalTypesContext = oldInDisallowConditionalTypesContext;
			if (_base.state.error || !_base.state.inDisallowConditionalTypesContext && _index.match.call(void 0, _types.TokenType.question)) _base.state.restoreFromSnapshot(snapshot);
		}
	}
	function tsParseTypeOperatorOrHigher() {
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._keyof) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._unique) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._readonly)) {
			_index.next.call(void 0);
			tsParseTypeOperatorOrHigher();
		} else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._infer)) tsParseInferType();
		else {
			const oldInDisallowConditionalTypesContext = _base.state.inDisallowConditionalTypesContext;
			_base.state.inDisallowConditionalTypesContext = false;
			tsParseArrayTypeOrHigher();
			_base.state.inDisallowConditionalTypesContext = oldInDisallowConditionalTypesContext;
		}
	}
	function tsParseIntersectionTypeOrHigher() {
		_index.eat.call(void 0, _types.TokenType.bitwiseAND);
		tsParseTypeOperatorOrHigher();
		if (_index.match.call(void 0, _types.TokenType.bitwiseAND)) while (_index.eat.call(void 0, _types.TokenType.bitwiseAND)) tsParseTypeOperatorOrHigher();
	}
	function tsParseUnionTypeOrHigher() {
		_index.eat.call(void 0, _types.TokenType.bitwiseOR);
		tsParseIntersectionTypeOrHigher();
		if (_index.match.call(void 0, _types.TokenType.bitwiseOR)) while (_index.eat.call(void 0, _types.TokenType.bitwiseOR)) tsParseIntersectionTypeOrHigher();
	}
	function tsIsStartOfFunctionType() {
		if (_index.match.call(void 0, _types.TokenType.lessThan)) return true;
		return _index.match.call(void 0, _types.TokenType.parenL) && tsLookaheadIsUnambiguouslyStartOfFunctionType();
	}
	function tsSkipParameterStart() {
		if (_index.match.call(void 0, _types.TokenType.name) || _index.match.call(void 0, _types.TokenType._this)) {
			_index.next.call(void 0);
			return true;
		}
		if (_index.match.call(void 0, _types.TokenType.braceL) || _index.match.call(void 0, _types.TokenType.bracketL)) {
			let depth = 1;
			_index.next.call(void 0);
			while (depth > 0 && !_base.state.error) {
				if (_index.match.call(void 0, _types.TokenType.braceL) || _index.match.call(void 0, _types.TokenType.bracketL)) depth++;
				else if (_index.match.call(void 0, _types.TokenType.braceR) || _index.match.call(void 0, _types.TokenType.bracketR)) depth--;
				_index.next.call(void 0);
			}
			return true;
		}
		return false;
	}
	function tsLookaheadIsUnambiguouslyStartOfFunctionType() {
		const snapshot = _base.state.snapshot();
		const isUnambiguouslyStartOfFunctionType = tsIsUnambiguouslyStartOfFunctionType();
		_base.state.restoreFromSnapshot(snapshot);
		return isUnambiguouslyStartOfFunctionType;
	}
	function tsIsUnambiguouslyStartOfFunctionType() {
		_index.next.call(void 0);
		if (_index.match.call(void 0, _types.TokenType.parenR) || _index.match.call(void 0, _types.TokenType.ellipsis)) return true;
		if (tsSkipParameterStart()) {
			if (_index.match.call(void 0, _types.TokenType.colon) || _index.match.call(void 0, _types.TokenType.comma) || _index.match.call(void 0, _types.TokenType.question) || _index.match.call(void 0, _types.TokenType.eq)) return true;
			if (_index.match.call(void 0, _types.TokenType.parenR)) {
				_index.next.call(void 0);
				if (_index.match.call(void 0, _types.TokenType.arrow)) return true;
			}
		}
		return false;
	}
	function tsParseTypeOrTypePredicateAnnotation(returnToken) {
		const oldIsType = _index.pushTypeContext.call(void 0, 0);
		_util.expect.call(void 0, returnToken);
		if (!tsParseTypePredicateOrAssertsPrefix()) tsParseType();
		_index.popTypeContext.call(void 0, oldIsType);
	}
	function tsTryParseTypeOrTypePredicateAnnotation() {
		if (_index.match.call(void 0, _types.TokenType.colon)) tsParseTypeOrTypePredicateAnnotation(_types.TokenType.colon);
	}
	function tsTryParseTypeAnnotation() {
		if (_index.match.call(void 0, _types.TokenType.colon)) tsParseTypeAnnotation();
	}
	exports.tsTryParseTypeAnnotation = tsTryParseTypeAnnotation;
	function tsTryParseType() {
		if (_index.eat.call(void 0, _types.TokenType.colon)) tsParseType();
	}
	/**
	* Detect a few special return syntax cases: `x is T`, `asserts x`, `asserts x is T`,
	* `asserts this is T`.
	*
	* Returns true if we parsed the return type, false if there's still a type to be parsed.
	*/
	function tsParseTypePredicateOrAssertsPrefix() {
		const snapshot = _base.state.snapshot();
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._asserts)) {
			_index.next.call(void 0);
			if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._is)) {
				tsParseType();
				return true;
			} else if (tsIsIdentifier() || _index.match.call(void 0, _types.TokenType._this)) {
				_index.next.call(void 0);
				if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._is)) tsParseType();
				return true;
			} else {
				_base.state.restoreFromSnapshot(snapshot);
				return false;
			}
		} else if (tsIsIdentifier() || _index.match.call(void 0, _types.TokenType._this)) {
			_index.next.call(void 0);
			if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._is) && !_util.hasPrecedingLineBreak.call(void 0)) {
				_index.next.call(void 0);
				tsParseType();
				return true;
			} else {
				_base.state.restoreFromSnapshot(snapshot);
				return false;
			}
		}
		return false;
	}
	function tsParseTypeAnnotation() {
		const oldIsType = _index.pushTypeContext.call(void 0, 0);
		_util.expect.call(void 0, _types.TokenType.colon);
		tsParseType();
		_index.popTypeContext.call(void 0, oldIsType);
	}
	exports.tsParseTypeAnnotation = tsParseTypeAnnotation;
	function tsParseType() {
		tsParseNonConditionalType();
		if (_base.state.inDisallowConditionalTypesContext || _util.hasPrecedingLineBreak.call(void 0) || !_index.eat.call(void 0, _types.TokenType._extends)) return;
		const oldInDisallowConditionalTypesContext = _base.state.inDisallowConditionalTypesContext;
		_base.state.inDisallowConditionalTypesContext = true;
		tsParseNonConditionalType();
		_base.state.inDisallowConditionalTypesContext = oldInDisallowConditionalTypesContext;
		_util.expect.call(void 0, _types.TokenType.question);
		tsParseType();
		_util.expect.call(void 0, _types.TokenType.colon);
		tsParseType();
	}
	exports.tsParseType = tsParseType;
	function isAbstractConstructorSignature() {
		return _util.isContextual.call(void 0, _keywords.ContextualKeyword._abstract) && _index.lookaheadType.call(void 0) === _types.TokenType._new;
	}
	function tsParseNonConditionalType() {
		if (tsIsStartOfFunctionType()) {
			tsParseFunctionOrConstructorType(FunctionType.TSFunctionType);
			return;
		}
		if (_index.match.call(void 0, _types.TokenType._new)) {
			tsParseFunctionOrConstructorType(FunctionType.TSConstructorType);
			return;
		} else if (isAbstractConstructorSignature()) {
			tsParseFunctionOrConstructorType(FunctionType.TSAbstractConstructorType);
			return;
		}
		tsParseUnionTypeOrHigher();
	}
	exports.tsParseNonConditionalType = tsParseNonConditionalType;
	function tsParseTypeAssertion() {
		const oldIsType = _index.pushTypeContext.call(void 0, 1);
		tsParseType();
		_util.expect.call(void 0, _types.TokenType.greaterThan);
		_index.popTypeContext.call(void 0, oldIsType);
		_expression.parseMaybeUnary.call(void 0);
	}
	exports.tsParseTypeAssertion = tsParseTypeAssertion;
	function tsTryParseJSXTypeArgument() {
		if (_index.eat.call(void 0, _types.TokenType.jsxTagStart)) {
			_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType.typeParameterStart;
			const oldIsType = _index.pushTypeContext.call(void 0, 1);
			while (!_index.match.call(void 0, _types.TokenType.greaterThan) && !_base.state.error) {
				tsParseType();
				_index.eat.call(void 0, _types.TokenType.comma);
			}
			_jsx.nextJSXTagToken.call(void 0);
			_index.popTypeContext.call(void 0, oldIsType);
		}
	}
	exports.tsTryParseJSXTypeArgument = tsTryParseJSXTypeArgument;
	function tsParseHeritageClause() {
		while (!_index.match.call(void 0, _types.TokenType.braceL) && !_base.state.error) {
			tsParseExpressionWithTypeArguments();
			_index.eat.call(void 0, _types.TokenType.comma);
		}
	}
	function tsParseExpressionWithTypeArguments() {
		tsParseEntityName();
		if (_index.match.call(void 0, _types.TokenType.lessThan)) tsParseTypeArguments();
	}
	function tsParseInterfaceDeclaration() {
		_lval.parseBindingIdentifier.call(void 0, false);
		tsTryParseTypeParameters();
		if (_index.eat.call(void 0, _types.TokenType._extends)) tsParseHeritageClause();
		tsParseObjectTypeMembers();
	}
	function tsParseTypeAliasDeclaration() {
		_lval.parseBindingIdentifier.call(void 0, false);
		tsTryParseTypeParameters();
		_util.expect.call(void 0, _types.TokenType.eq);
		tsParseType();
		_util.semicolon.call(void 0);
	}
	function tsParseEnumMember() {
		if (_index.match.call(void 0, _types.TokenType.string)) _expression.parseLiteral.call(void 0);
		else _expression.parseIdentifier.call(void 0);
		if (_index.eat.call(void 0, _types.TokenType.eq)) {
			const eqIndex = _base.state.tokens.length - 1;
			_expression.parseMaybeAssign.call(void 0);
			_base.state.tokens[eqIndex].rhsEndIndex = _base.state.tokens.length;
		}
	}
	function tsParseEnumDeclaration() {
		_lval.parseBindingIdentifier.call(void 0, false);
		_util.expect.call(void 0, _types.TokenType.braceL);
		while (!_index.eat.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
			tsParseEnumMember();
			_index.eat.call(void 0, _types.TokenType.comma);
		}
	}
	function tsParseModuleBlock() {
		_util.expect.call(void 0, _types.TokenType.braceL);
		_statement.parseBlockBody.call(void 0, _types.TokenType.braceR);
	}
	function tsParseModuleOrNamespaceDeclaration() {
		_lval.parseBindingIdentifier.call(void 0, false);
		if (_index.eat.call(void 0, _types.TokenType.dot)) tsParseModuleOrNamespaceDeclaration();
		else tsParseModuleBlock();
	}
	function tsParseAmbientExternalModuleDeclaration() {
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._global)) _expression.parseIdentifier.call(void 0);
		else if (_index.match.call(void 0, _types.TokenType.string)) _expression.parseExprAtom.call(void 0);
		else _util.unexpected.call(void 0);
		if (_index.match.call(void 0, _types.TokenType.braceL)) tsParseModuleBlock();
		else _util.semicolon.call(void 0);
	}
	function tsParseImportEqualsDeclaration() {
		_lval.parseImportedIdentifier.call(void 0);
		_util.expect.call(void 0, _types.TokenType.eq);
		tsParseModuleReference();
		_util.semicolon.call(void 0);
	}
	exports.tsParseImportEqualsDeclaration = tsParseImportEqualsDeclaration;
	function tsIsExternalModuleReference() {
		return _util.isContextual.call(void 0, _keywords.ContextualKeyword._require) && _index.lookaheadType.call(void 0) === _types.TokenType.parenL;
	}
	function tsParseModuleReference() {
		if (tsIsExternalModuleReference()) tsParseExternalModuleReference();
		else tsParseEntityName();
	}
	function tsParseExternalModuleReference() {
		_util.expectContextual.call(void 0, _keywords.ContextualKeyword._require);
		_util.expect.call(void 0, _types.TokenType.parenL);
		if (!_index.match.call(void 0, _types.TokenType.string)) _util.unexpected.call(void 0);
		_expression.parseLiteral.call(void 0);
		_util.expect.call(void 0, _types.TokenType.parenR);
	}
	function tsTryParseDeclare() {
		if (_util.isLineTerminator.call(void 0)) return false;
		switch (_base.state.type) {
			case _types.TokenType._function: {
				const oldIsType = _index.pushTypeContext.call(void 0, 1);
				_index.next.call(void 0);
				const functionStart = _base.state.start;
				_statement.parseFunction.call(void 0, functionStart, true);
				_index.popTypeContext.call(void 0, oldIsType);
				return true;
			}
			case _types.TokenType._class: {
				const oldIsType = _index.pushTypeContext.call(void 0, 1);
				_statement.parseClass.call(void 0, true, false);
				_index.popTypeContext.call(void 0, oldIsType);
				return true;
			}
			case _types.TokenType._const: if (_index.match.call(void 0, _types.TokenType._const) && _util.isLookaheadContextual.call(void 0, _keywords.ContextualKeyword._enum)) {
				const oldIsType = _index.pushTypeContext.call(void 0, 1);
				_util.expect.call(void 0, _types.TokenType._const);
				_util.expectContextual.call(void 0, _keywords.ContextualKeyword._enum);
				_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._enum;
				tsParseEnumDeclaration();
				_index.popTypeContext.call(void 0, oldIsType);
				return true;
			}
			case _types.TokenType._var:
			case _types.TokenType._let: {
				const oldIsType = _index.pushTypeContext.call(void 0, 1);
				_statement.parseVarStatement.call(void 0, _base.state.type !== _types.TokenType._var);
				_index.popTypeContext.call(void 0, oldIsType);
				return true;
			}
			case _types.TokenType.name: {
				const oldIsType = _index.pushTypeContext.call(void 0, 1);
				const contextualKeyword = _base.state.contextualKeyword;
				let matched = false;
				if (contextualKeyword === _keywords.ContextualKeyword._global) {
					tsParseAmbientExternalModuleDeclaration();
					matched = true;
				} else matched = tsParseDeclaration(contextualKeyword, true);
				_index.popTypeContext.call(void 0, oldIsType);
				return matched;
			}
			default: return false;
		}
	}
	function tsTryParseExportDeclaration() {
		return tsParseDeclaration(_base.state.contextualKeyword, true);
	}
	function tsParseExpressionStatement(contextualKeyword) {
		switch (contextualKeyword) {
			case _keywords.ContextualKeyword._declare: {
				const declareTokenIndex = _base.state.tokens.length - 1;
				if (tsTryParseDeclare()) {
					_base.state.tokens[declareTokenIndex].type = _types.TokenType._declare;
					return true;
				}
				break;
			}
			case _keywords.ContextualKeyword._global:
				if (_index.match.call(void 0, _types.TokenType.braceL)) {
					tsParseModuleBlock();
					return true;
				}
				break;
			default: return tsParseDeclaration(contextualKeyword, false);
		}
		return false;
	}
	/**
	* Common code for parsing a declaration.
	*
	* isBeforeToken indicates that the current parser state is at the contextual
	* keyword (and that it is not yet emitted) rather than reading the token after
	* it. When isBeforeToken is true, we may be preceded by an `export` token and
	* should include that token in a type context we create, e.g. to handle
	* `export interface` or `export type`. (This is a bit of a hack and should be
	* cleaned up at some point.)
	*
	* Returns true if it matched a declaration.
	*/
	function tsParseDeclaration(contextualKeyword, isBeforeToken) {
		switch (contextualKeyword) {
			case _keywords.ContextualKeyword._abstract:
				if (tsCheckLineTerminator(isBeforeToken) && _index.match.call(void 0, _types.TokenType._class)) {
					_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._abstract;
					_statement.parseClass.call(void 0, true, false);
					return true;
				}
				break;
			case _keywords.ContextualKeyword._enum:
				if (tsCheckLineTerminator(isBeforeToken) && _index.match.call(void 0, _types.TokenType.name)) {
					_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._enum;
					tsParseEnumDeclaration();
					return true;
				}
				break;
			case _keywords.ContextualKeyword._interface:
				if (tsCheckLineTerminator(isBeforeToken) && _index.match.call(void 0, _types.TokenType.name)) {
					const oldIsType = _index.pushTypeContext.call(void 0, isBeforeToken ? 2 : 1);
					tsParseInterfaceDeclaration();
					_index.popTypeContext.call(void 0, oldIsType);
					return true;
				}
				break;
			case _keywords.ContextualKeyword._module:
				if (tsCheckLineTerminator(isBeforeToken)) {
					if (_index.match.call(void 0, _types.TokenType.string)) {
						const oldIsType = _index.pushTypeContext.call(void 0, isBeforeToken ? 2 : 1);
						tsParseAmbientExternalModuleDeclaration();
						_index.popTypeContext.call(void 0, oldIsType);
						return true;
					} else if (_index.match.call(void 0, _types.TokenType.name)) {
						const oldIsType = _index.pushTypeContext.call(void 0, isBeforeToken ? 2 : 1);
						tsParseModuleOrNamespaceDeclaration();
						_index.popTypeContext.call(void 0, oldIsType);
						return true;
					}
				}
				break;
			case _keywords.ContextualKeyword._namespace:
				if (tsCheckLineTerminator(isBeforeToken) && _index.match.call(void 0, _types.TokenType.name)) {
					const oldIsType = _index.pushTypeContext.call(void 0, isBeforeToken ? 2 : 1);
					tsParseModuleOrNamespaceDeclaration();
					_index.popTypeContext.call(void 0, oldIsType);
					return true;
				}
				break;
			case _keywords.ContextualKeyword._type: if (tsCheckLineTerminator(isBeforeToken) && _index.match.call(void 0, _types.TokenType.name)) {
				const oldIsType = _index.pushTypeContext.call(void 0, isBeforeToken ? 2 : 1);
				tsParseTypeAliasDeclaration();
				_index.popTypeContext.call(void 0, oldIsType);
				return true;
			}
		}
		return false;
	}
	function tsCheckLineTerminator(isBeforeToken) {
		if (isBeforeToken) {
			_index.next.call(void 0);
			return true;
		} else return !_util.isLineTerminator.call(void 0);
	}
	function tsTryParseGenericAsyncArrowFunction() {
		const snapshot = _base.state.snapshot();
		tsParseTypeParameters();
		_statement.parseFunctionParams.call(void 0);
		tsTryParseTypeOrTypePredicateAnnotation();
		_util.expect.call(void 0, _types.TokenType.arrow);
		if (_base.state.error) {
			_base.state.restoreFromSnapshot(snapshot);
			return false;
		}
		_expression.parseFunctionBody.call(void 0, true);
		return true;
	}
	/**
	* If necessary, hack the tokenizer state so that this bitshift was actually a
	* less-than token, then keep parsing. This should only be used in situations
	* where we restore from snapshot on error (which reverts this change) or
	* where bitshift would be illegal anyway (e.g. in a class "extends" clause).
	*
	* This hack is useful to handle situations like foo<<T>() => void>() where
	* there can legitimately be two open-angle-brackets in a row in TS.
	*/
	function tsParseTypeArgumentsWithPossibleBitshift() {
		if (_base.state.type === _types.TokenType.bitShiftL) {
			_base.state.pos -= 1;
			_index.finishToken.call(void 0, _types.TokenType.lessThan);
		}
		tsParseTypeArguments();
	}
	function tsParseTypeArguments() {
		const oldIsType = _index.pushTypeContext.call(void 0, 0);
		_util.expect.call(void 0, _types.TokenType.lessThan);
		while (!_index.match.call(void 0, _types.TokenType.greaterThan) && !_base.state.error) {
			tsParseType();
			_index.eat.call(void 0, _types.TokenType.comma);
		}
		if (!oldIsType) {
			_index.popTypeContext.call(void 0, oldIsType);
			_index.rescan_gt.call(void 0);
			_util.expect.call(void 0, _types.TokenType.greaterThan);
			_base.state.tokens[_base.state.tokens.length - 1].isType = true;
		} else {
			_util.expect.call(void 0, _types.TokenType.greaterThan);
			_index.popTypeContext.call(void 0, oldIsType);
		}
	}
	function tsIsDeclarationStart() {
		if (_index.match.call(void 0, _types.TokenType.name)) switch (_base.state.contextualKeyword) {
			case _keywords.ContextualKeyword._abstract:
			case _keywords.ContextualKeyword._declare:
			case _keywords.ContextualKeyword._enum:
			case _keywords.ContextualKeyword._interface:
			case _keywords.ContextualKeyword._module:
			case _keywords.ContextualKeyword._namespace:
			case _keywords.ContextualKeyword._type: return true;
		}
		return false;
	}
	exports.tsIsDeclarationStart = tsIsDeclarationStart;
	function tsParseFunctionBodyAndFinish(functionStart, funcContextId) {
		if (_index.match.call(void 0, _types.TokenType.colon)) tsParseTypeOrTypePredicateAnnotation(_types.TokenType.colon);
		if (!_index.match.call(void 0, _types.TokenType.braceL) && _util.isLineTerminator.call(void 0)) {
			let i = _base.state.tokens.length - 1;
			while (i >= 0 && (_base.state.tokens[i].start >= functionStart || _base.state.tokens[i].type === _types.TokenType._default || _base.state.tokens[i].type === _types.TokenType._export)) {
				_base.state.tokens[i].isType = true;
				i--;
			}
			return;
		}
		_expression.parseFunctionBody.call(void 0, false, funcContextId);
	}
	exports.tsParseFunctionBodyAndFinish = tsParseFunctionBodyAndFinish;
	function tsParseSubscript(startTokenIndex, noCalls, stopState) {
		if (!_util.hasPrecedingLineBreak.call(void 0) && _index.eat.call(void 0, _types.TokenType.bang)) {
			_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType.nonNullAssertion;
			return;
		}
		if (_index.match.call(void 0, _types.TokenType.lessThan) || _index.match.call(void 0, _types.TokenType.bitShiftL)) {
			const snapshot = _base.state.snapshot();
			if (!noCalls && _expression.atPossibleAsync.call(void 0)) {
				if (tsTryParseGenericAsyncArrowFunction()) return;
			}
			tsParseTypeArgumentsWithPossibleBitshift();
			if (!noCalls && _index.eat.call(void 0, _types.TokenType.parenL)) {
				_base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
				_expression.parseCallExpressionArguments.call(void 0);
			} else if (_index.match.call(void 0, _types.TokenType.backQuote)) _expression.parseTemplate.call(void 0);
			else if (_base.state.type === _types.TokenType.greaterThan || _base.state.type !== _types.TokenType.parenL && Boolean(_base.state.type & _types.TokenType.IS_EXPRESSION_START) && !_util.hasPrecedingLineBreak.call(void 0)) _util.unexpected.call(void 0);
			if (_base.state.error) _base.state.restoreFromSnapshot(snapshot);
			else return;
		} else if (!noCalls && _index.match.call(void 0, _types.TokenType.questionDot) && _index.lookaheadType.call(void 0) === _types.TokenType.lessThan) {
			_index.next.call(void 0);
			_base.state.tokens[startTokenIndex].isOptionalChainStart = true;
			_base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
			tsParseTypeArguments();
			_util.expect.call(void 0, _types.TokenType.parenL);
			_expression.parseCallExpressionArguments.call(void 0);
		}
		_expression.baseParseSubscript.call(void 0, startTokenIndex, noCalls, stopState);
	}
	exports.tsParseSubscript = tsParseSubscript;
	function tsTryParseExport() {
		if (_index.eat.call(void 0, _types.TokenType._import)) {
			if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._type) && _index.lookaheadType.call(void 0) !== _types.TokenType.eq) _util.expectContextual.call(void 0, _keywords.ContextualKeyword._type);
			tsParseImportEqualsDeclaration();
			return true;
		} else if (_index.eat.call(void 0, _types.TokenType.eq)) {
			_expression.parseExpression.call(void 0);
			_util.semicolon.call(void 0);
			return true;
		} else if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._as)) {
			_util.expectContextual.call(void 0, _keywords.ContextualKeyword._namespace);
			_expression.parseIdentifier.call(void 0);
			_util.semicolon.call(void 0);
			return true;
		} else {
			if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._type)) {
				const nextType = _index.lookaheadType.call(void 0);
				if (nextType === _types.TokenType.braceL || nextType === _types.TokenType.star) _index.next.call(void 0);
			}
			return false;
		}
	}
	exports.tsTryParseExport = tsTryParseExport;
	/**
	* Parse a TS import specifier, which may be prefixed with "type" and may be of
	* the form `foo as bar`.
	*
	* The number of identifier-like tokens we see happens to be enough to uniquely
	* identify the form, so simply count the number of identifiers rather than
	* matching the words `type` or `as`. This is particularly important because
	* `type` and `as` could each actually be plain identifiers rather than
	* keywords.
	*/
	function tsParseImportSpecifier() {
		_expression.parseIdentifier.call(void 0);
		if (_index.match.call(void 0, _types.TokenType.comma) || _index.match.call(void 0, _types.TokenType.braceR)) {
			_base.state.tokens[_base.state.tokens.length - 1].identifierRole = _index.IdentifierRole.ImportDeclaration;
			return;
		}
		_expression.parseIdentifier.call(void 0);
		if (_index.match.call(void 0, _types.TokenType.comma) || _index.match.call(void 0, _types.TokenType.braceR)) {
			_base.state.tokens[_base.state.tokens.length - 1].identifierRole = _index.IdentifierRole.ImportDeclaration;
			_base.state.tokens[_base.state.tokens.length - 2].isType = true;
			_base.state.tokens[_base.state.tokens.length - 1].isType = true;
			return;
		}
		_expression.parseIdentifier.call(void 0);
		if (_index.match.call(void 0, _types.TokenType.comma) || _index.match.call(void 0, _types.TokenType.braceR)) {
			_base.state.tokens[_base.state.tokens.length - 3].identifierRole = _index.IdentifierRole.ImportAccess;
			_base.state.tokens[_base.state.tokens.length - 1].identifierRole = _index.IdentifierRole.ImportDeclaration;
			return;
		}
		_expression.parseIdentifier.call(void 0);
		_base.state.tokens[_base.state.tokens.length - 3].identifierRole = _index.IdentifierRole.ImportAccess;
		_base.state.tokens[_base.state.tokens.length - 1].identifierRole = _index.IdentifierRole.ImportDeclaration;
		_base.state.tokens[_base.state.tokens.length - 4].isType = true;
		_base.state.tokens[_base.state.tokens.length - 3].isType = true;
		_base.state.tokens[_base.state.tokens.length - 2].isType = true;
		_base.state.tokens[_base.state.tokens.length - 1].isType = true;
	}
	exports.tsParseImportSpecifier = tsParseImportSpecifier;
	/**
	* Just like named import specifiers, export specifiers can have from 1 to 4
	* tokens, inclusive, and the number of tokens determines the role of each token.
	*/
	function tsParseExportSpecifier() {
		_expression.parseIdentifier.call(void 0);
		if (_index.match.call(void 0, _types.TokenType.comma) || _index.match.call(void 0, _types.TokenType.braceR)) {
			_base.state.tokens[_base.state.tokens.length - 1].identifierRole = _index.IdentifierRole.ExportAccess;
			return;
		}
		_expression.parseIdentifier.call(void 0);
		if (_index.match.call(void 0, _types.TokenType.comma) || _index.match.call(void 0, _types.TokenType.braceR)) {
			_base.state.tokens[_base.state.tokens.length - 1].identifierRole = _index.IdentifierRole.ExportAccess;
			_base.state.tokens[_base.state.tokens.length - 2].isType = true;
			_base.state.tokens[_base.state.tokens.length - 1].isType = true;
			return;
		}
		_expression.parseIdentifier.call(void 0);
		if (_index.match.call(void 0, _types.TokenType.comma) || _index.match.call(void 0, _types.TokenType.braceR)) {
			_base.state.tokens[_base.state.tokens.length - 3].identifierRole = _index.IdentifierRole.ExportAccess;
			return;
		}
		_expression.parseIdentifier.call(void 0);
		_base.state.tokens[_base.state.tokens.length - 3].identifierRole = _index.IdentifierRole.ExportAccess;
		_base.state.tokens[_base.state.tokens.length - 4].isType = true;
		_base.state.tokens[_base.state.tokens.length - 3].isType = true;
		_base.state.tokens[_base.state.tokens.length - 2].isType = true;
		_base.state.tokens[_base.state.tokens.length - 1].isType = true;
	}
	exports.tsParseExportSpecifier = tsParseExportSpecifier;
	function tsTryParseExportDefaultExpression() {
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._abstract) && _index.lookaheadType.call(void 0) === _types.TokenType._class) {
			_base.state.type = _types.TokenType._abstract;
			_index.next.call(void 0);
			_statement.parseClass.call(void 0, true, true);
			return true;
		}
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._interface)) {
			const oldIsType = _index.pushTypeContext.call(void 0, 2);
			tsParseDeclaration(_keywords.ContextualKeyword._interface, true);
			_index.popTypeContext.call(void 0, oldIsType);
			return true;
		}
		return false;
	}
	exports.tsTryParseExportDefaultExpression = tsTryParseExportDefaultExpression;
	function tsTryParseStatementContent() {
		if (_base.state.type === _types.TokenType._const) {
			const ahead = _index.lookaheadTypeAndKeyword.call(void 0);
			if (ahead.type === _types.TokenType.name && ahead.contextualKeyword === _keywords.ContextualKeyword._enum) {
				_util.expect.call(void 0, _types.TokenType._const);
				_util.expectContextual.call(void 0, _keywords.ContextualKeyword._enum);
				_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._enum;
				tsParseEnumDeclaration();
				return true;
			}
		}
		return false;
	}
	exports.tsTryParseStatementContent = tsTryParseStatementContent;
	function tsTryParseClassMemberWithIsStatic(isStatic) {
		const memberStartIndexAfterStatic = _base.state.tokens.length;
		tsParseModifiers([
			_keywords.ContextualKeyword._abstract,
			_keywords.ContextualKeyword._readonly,
			_keywords.ContextualKeyword._declare,
			_keywords.ContextualKeyword._static,
			_keywords.ContextualKeyword._override
		]);
		const modifiersEndIndex = _base.state.tokens.length;
		if (tsTryParseIndexSignature()) {
			const memberStartIndex = isStatic ? memberStartIndexAfterStatic - 1 : memberStartIndexAfterStatic;
			for (let i = memberStartIndex; i < modifiersEndIndex; i++) _base.state.tokens[i].isType = true;
			return true;
		}
		return false;
	}
	exports.tsTryParseClassMemberWithIsStatic = tsTryParseClassMemberWithIsStatic;
	function tsParseIdentifierStatement(contextualKeyword) {
		if (!tsParseExpressionStatement(contextualKeyword)) _util.semicolon.call(void 0);
	}
	exports.tsParseIdentifierStatement = tsParseIdentifierStatement;
	function tsParseExportDeclaration() {
		const isDeclare = _util.eatContextual.call(void 0, _keywords.ContextualKeyword._declare);
		if (isDeclare) _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._declare;
		let matchedDeclaration = false;
		if (_index.match.call(void 0, _types.TokenType.name)) {
			if (isDeclare) {
				const oldIsType = _index.pushTypeContext.call(void 0, 2);
				matchedDeclaration = tsTryParseExportDeclaration();
				_index.popTypeContext.call(void 0, oldIsType);
			} else matchedDeclaration = tsTryParseExportDeclaration();
		}
		if (!matchedDeclaration) {
			if (isDeclare) {
				const oldIsType = _index.pushTypeContext.call(void 0, 2);
				_statement.parseStatement.call(void 0, true);
				_index.popTypeContext.call(void 0, oldIsType);
			} else _statement.parseStatement.call(void 0, true);
		}
	}
	exports.tsParseExportDeclaration = tsParseExportDeclaration;
	function tsAfterParseClassSuper(hasSuper) {
		if (hasSuper && (_index.match.call(void 0, _types.TokenType.lessThan) || _index.match.call(void 0, _types.TokenType.bitShiftL))) tsParseTypeArgumentsWithPossibleBitshift();
		if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._implements)) {
			_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._implements;
			const oldIsType = _index.pushTypeContext.call(void 0, 1);
			tsParseHeritageClause();
			_index.popTypeContext.call(void 0, oldIsType);
		}
	}
	exports.tsAfterParseClassSuper = tsAfterParseClassSuper;
	function tsStartParseObjPropValue() {
		tsTryParseTypeParameters();
	}
	exports.tsStartParseObjPropValue = tsStartParseObjPropValue;
	function tsStartParseFunctionParams() {
		tsTryParseTypeParameters();
	}
	exports.tsStartParseFunctionParams = tsStartParseFunctionParams;
	function tsAfterParseVarHead() {
		const oldIsType = _index.pushTypeContext.call(void 0, 0);
		if (!_util.hasPrecedingLineBreak.call(void 0)) _index.eat.call(void 0, _types.TokenType.bang);
		tsTryParseTypeAnnotation();
		_index.popTypeContext.call(void 0, oldIsType);
	}
	exports.tsAfterParseVarHead = tsAfterParseVarHead;
	function tsStartParseAsyncArrowFromCallExpression() {
		if (_index.match.call(void 0, _types.TokenType.colon)) tsParseTypeAnnotation();
	}
	exports.tsStartParseAsyncArrowFromCallExpression = tsStartParseAsyncArrowFromCallExpression;
	function tsParseMaybeAssign(noIn, isWithinParens) {
		if (_base.isJSXEnabled) return tsParseMaybeAssignWithJSX(noIn, isWithinParens);
		else return tsParseMaybeAssignWithoutJSX(noIn, isWithinParens);
	}
	exports.tsParseMaybeAssign = tsParseMaybeAssign;
	function tsParseMaybeAssignWithJSX(noIn, isWithinParens) {
		if (!_index.match.call(void 0, _types.TokenType.lessThan)) return _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
		const snapshot = _base.state.snapshot();
		let wasArrow = _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
		if (_base.state.error) _base.state.restoreFromSnapshot(snapshot);
		else return wasArrow;
		_base.state.type = _types.TokenType.typeParameterStart;
		tsParseTypeParameters();
		wasArrow = _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
		if (!wasArrow) _util.unexpected.call(void 0);
		return wasArrow;
	}
	exports.tsParseMaybeAssignWithJSX = tsParseMaybeAssignWithJSX;
	function tsParseMaybeAssignWithoutJSX(noIn, isWithinParens) {
		if (!_index.match.call(void 0, _types.TokenType.lessThan)) return _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
		const snapshot = _base.state.snapshot();
		tsParseTypeParameters();
		const wasArrow = _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
		if (!wasArrow) _util.unexpected.call(void 0);
		if (_base.state.error) _base.state.restoreFromSnapshot(snapshot);
		else return wasArrow;
		return _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
	}
	exports.tsParseMaybeAssignWithoutJSX = tsParseMaybeAssignWithoutJSX;
	function tsParseArrow() {
		if (_index.match.call(void 0, _types.TokenType.colon)) {
			const snapshot = _base.state.snapshot();
			tsParseTypeOrTypePredicateAnnotation(_types.TokenType.colon);
			if (_util.canInsertSemicolon.call(void 0)) _util.unexpected.call(void 0);
			if (!_index.match.call(void 0, _types.TokenType.arrow)) _util.unexpected.call(void 0);
			if (_base.state.error) _base.state.restoreFromSnapshot(snapshot);
		}
		return _index.eat.call(void 0, _types.TokenType.arrow);
	}
	exports.tsParseArrow = tsParseArrow;
	function tsParseAssignableListItemTypes() {
		const oldIsType = _index.pushTypeContext.call(void 0, 0);
		_index.eat.call(void 0, _types.TokenType.question);
		tsTryParseTypeAnnotation();
		_index.popTypeContext.call(void 0, oldIsType);
	}
	exports.tsParseAssignableListItemTypes = tsParseAssignableListItemTypes;
	function tsParseMaybeDecoratorArguments() {
		if (_index.match.call(void 0, _types.TokenType.lessThan) || _index.match.call(void 0, _types.TokenType.bitShiftL)) tsParseTypeArgumentsWithPossibleBitshift();
		_statement.baseParseMaybeDecoratorArguments.call(void 0);
	}
	exports.tsParseMaybeDecoratorArguments = tsParseMaybeDecoratorArguments;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/plugins/jsx/index.js
var require_jsx = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _index = require_tokenizer();
	var _types = require_types$2();
	var _base = require_base();
	var _expression = require_expression();
	var _util = require_util$1();
	var _charcodes = require_charcodes();
	var _identifier = require_identifier();
	var _typescript = require_typescript();
	/**
	* Read token with JSX contents.
	*
	* In addition to detecting jsxTagStart and also regular tokens that might be
	* part of an expression, this code detects the start and end of text ranges
	* within JSX children. In order to properly count the number of children, we
	* distinguish jsxText from jsxEmptyText, which is a text range that simplifies
	* to the empty string after JSX whitespace trimming.
	*
	* It turns out that a JSX text range will simplify to the empty string if and
	* only if both of these conditions hold:
	* - The range consists entirely of whitespace characters (only counting space,
	*   tab, \r, and \n).
	* - The range has at least one newline.
	* This can be proven by analyzing any implementation of whitespace trimming,
	* e.g. formatJSXTextLiteral in Sucrase or cleanJSXElementLiteralChild in Babel.
	*/
	function jsxReadToken() {
		let sawNewline = false;
		let sawNonWhitespace = false;
		while (true) {
			if (_base.state.pos >= _base.input.length) {
				_util.unexpected.call(void 0, "Unterminated JSX contents");
				return;
			}
			const ch = _base.input.charCodeAt(_base.state.pos);
			if (ch === _charcodes.charCodes.lessThan || ch === _charcodes.charCodes.leftCurlyBrace) {
				if (_base.state.pos === _base.state.start) {
					if (ch === _charcodes.charCodes.lessThan) {
						_base.state.pos++;
						_index.finishToken.call(void 0, _types.TokenType.jsxTagStart);
						return;
					}
					_index.getTokenFromCode.call(void 0, ch);
					return;
				}
				if (sawNewline && !sawNonWhitespace) _index.finishToken.call(void 0, _types.TokenType.jsxEmptyText);
				else _index.finishToken.call(void 0, _types.TokenType.jsxText);
				return;
			}
			if (ch === _charcodes.charCodes.lineFeed) sawNewline = true;
			else if (ch !== _charcodes.charCodes.space && ch !== _charcodes.charCodes.carriageReturn && ch !== _charcodes.charCodes.tab) sawNonWhitespace = true;
			_base.state.pos++;
		}
	}
	function jsxReadString(quote) {
		_base.state.pos++;
		for (;;) {
			if (_base.state.pos >= _base.input.length) {
				_util.unexpected.call(void 0, "Unterminated string constant");
				return;
			}
			if (_base.input.charCodeAt(_base.state.pos) === quote) {
				_base.state.pos++;
				break;
			}
			_base.state.pos++;
		}
		_index.finishToken.call(void 0, _types.TokenType.string);
	}
	function jsxReadWord() {
		let ch;
		do {
			if (_base.state.pos > _base.input.length) {
				_util.unexpected.call(void 0, "Unexpectedly reached the end of input.");
				return;
			}
			ch = _base.input.charCodeAt(++_base.state.pos);
		} while (_identifier.IS_IDENTIFIER_CHAR[ch] || ch === _charcodes.charCodes.dash);
		_index.finishToken.call(void 0, _types.TokenType.jsxName);
	}
	function jsxParseIdentifier() {
		nextJSXTagToken();
	}
	function jsxParseNamespacedName(identifierRole) {
		jsxParseIdentifier();
		if (!_index.eat.call(void 0, _types.TokenType.colon)) {
			_base.state.tokens[_base.state.tokens.length - 1].identifierRole = identifierRole;
			return;
		}
		jsxParseIdentifier();
	}
	function jsxParseElementName() {
		const firstTokenIndex = _base.state.tokens.length;
		jsxParseNamespacedName(_index.IdentifierRole.Access);
		let hadDot = false;
		while (_index.match.call(void 0, _types.TokenType.dot)) {
			hadDot = true;
			nextJSXTagToken();
			jsxParseIdentifier();
		}
		if (!hadDot) {
			const firstToken = _base.state.tokens[firstTokenIndex];
			const firstChar = _base.input.charCodeAt(firstToken.start);
			if (firstChar >= _charcodes.charCodes.lowercaseA && firstChar <= _charcodes.charCodes.lowercaseZ) firstToken.identifierRole = null;
		}
	}
	function jsxParseAttributeValue() {
		switch (_base.state.type) {
			case _types.TokenType.braceL:
				_index.next.call(void 0);
				_expression.parseExpression.call(void 0);
				nextJSXTagToken();
				return;
			case _types.TokenType.jsxTagStart:
				jsxParseElement();
				nextJSXTagToken();
				return;
			case _types.TokenType.string:
				nextJSXTagToken();
				return;
			default: _util.unexpected.call(void 0, "JSX value should be either an expression or a quoted JSX text");
		}
	}
	function jsxParseSpreadChild() {
		_util.expect.call(void 0, _types.TokenType.ellipsis);
		_expression.parseExpression.call(void 0);
	}
	function jsxParseOpeningElement(initialTokenIndex) {
		if (_index.match.call(void 0, _types.TokenType.jsxTagEnd)) return false;
		jsxParseElementName();
		if (_base.isTypeScriptEnabled) _typescript.tsTryParseJSXTypeArgument.call(void 0);
		let hasSeenPropSpread = false;
		while (!_index.match.call(void 0, _types.TokenType.slash) && !_index.match.call(void 0, _types.TokenType.jsxTagEnd) && !_base.state.error) {
			if (_index.eat.call(void 0, _types.TokenType.braceL)) {
				hasSeenPropSpread = true;
				_util.expect.call(void 0, _types.TokenType.ellipsis);
				_expression.parseMaybeAssign.call(void 0);
				nextJSXTagToken();
				continue;
			}
			if (hasSeenPropSpread && _base.state.end - _base.state.start === 3 && _base.input.charCodeAt(_base.state.start) === _charcodes.charCodes.lowercaseK && _base.input.charCodeAt(_base.state.start + 1) === _charcodes.charCodes.lowercaseE && _base.input.charCodeAt(_base.state.start + 2) === _charcodes.charCodes.lowercaseY) _base.state.tokens[initialTokenIndex].jsxRole = _index.JSXRole.KeyAfterPropSpread;
			jsxParseNamespacedName(_index.IdentifierRole.ObjectKey);
			if (_index.match.call(void 0, _types.TokenType.eq)) {
				nextJSXTagToken();
				jsxParseAttributeValue();
			}
		}
		const isSelfClosing = _index.match.call(void 0, _types.TokenType.slash);
		if (isSelfClosing) nextJSXTagToken();
		return isSelfClosing;
	}
	function jsxParseClosingElement() {
		if (_index.match.call(void 0, _types.TokenType.jsxTagEnd)) return;
		jsxParseElementName();
	}
	function jsxParseElementAt() {
		const initialTokenIndex = _base.state.tokens.length - 1;
		_base.state.tokens[initialTokenIndex].jsxRole = _index.JSXRole.NoChildren;
		let numExplicitChildren = 0;
		if (!jsxParseOpeningElement(initialTokenIndex)) {
			nextJSXExprToken();
			while (true) switch (_base.state.type) {
				case _types.TokenType.jsxTagStart:
					nextJSXTagToken();
					if (_index.match.call(void 0, _types.TokenType.slash)) {
						nextJSXTagToken();
						jsxParseClosingElement();
						if (_base.state.tokens[initialTokenIndex].jsxRole !== _index.JSXRole.KeyAfterPropSpread) {
							if (numExplicitChildren === 1) _base.state.tokens[initialTokenIndex].jsxRole = _index.JSXRole.OneChild;
							else if (numExplicitChildren > 1) _base.state.tokens[initialTokenIndex].jsxRole = _index.JSXRole.StaticChildren;
						}
						return;
					}
					numExplicitChildren++;
					jsxParseElementAt();
					nextJSXExprToken();
					break;
				case _types.TokenType.jsxText:
					numExplicitChildren++;
					nextJSXExprToken();
					break;
				case _types.TokenType.jsxEmptyText:
					nextJSXExprToken();
					break;
				case _types.TokenType.braceL:
					_index.next.call(void 0);
					if (_index.match.call(void 0, _types.TokenType.ellipsis)) {
						jsxParseSpreadChild();
						nextJSXExprToken();
						numExplicitChildren += 2;
					} else {
						if (!_index.match.call(void 0, _types.TokenType.braceR)) {
							numExplicitChildren++;
							_expression.parseExpression.call(void 0);
						}
						nextJSXExprToken();
					}
					break;
				// istanbul ignore next - should never happen
				default:
					_util.unexpected.call(void 0);
					return;
			}
		}
	}
	function jsxParseElement() {
		nextJSXTagToken();
		jsxParseElementAt();
	}
	exports.jsxParseElement = jsxParseElement;
	function nextJSXTagToken() {
		_base.state.tokens.push(new _index.Token());
		_index.skipSpace.call(void 0);
		_base.state.start = _base.state.pos;
		const code = _base.input.charCodeAt(_base.state.pos);
		if (_identifier.IS_IDENTIFIER_START[code]) jsxReadWord();
		else if (code === _charcodes.charCodes.quotationMark || code === _charcodes.charCodes.apostrophe) jsxReadString(code);
		else {
			++_base.state.pos;
			switch (code) {
				case _charcodes.charCodes.greaterThan:
					_index.finishToken.call(void 0, _types.TokenType.jsxTagEnd);
					break;
				case _charcodes.charCodes.lessThan:
					_index.finishToken.call(void 0, _types.TokenType.jsxTagStart);
					break;
				case _charcodes.charCodes.slash:
					_index.finishToken.call(void 0, _types.TokenType.slash);
					break;
				case _charcodes.charCodes.equalsTo:
					_index.finishToken.call(void 0, _types.TokenType.eq);
					break;
				case _charcodes.charCodes.leftCurlyBrace:
					_index.finishToken.call(void 0, _types.TokenType.braceL);
					break;
				case _charcodes.charCodes.dot:
					_index.finishToken.call(void 0, _types.TokenType.dot);
					break;
				case _charcodes.charCodes.colon:
					_index.finishToken.call(void 0, _types.TokenType.colon);
					break;
				default: _util.unexpected.call(void 0);
			}
		}
	}
	exports.nextJSXTagToken = nextJSXTagToken;
	function nextJSXExprToken() {
		_base.state.tokens.push(new _index.Token());
		_base.state.start = _base.state.pos;
		jsxReadToken();
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/plugins/types.js
var require_types = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _index = require_tokenizer();
	var _types = require_types$2();
	var _base = require_base();
	var _expression = require_expression();
	var _flow = require_flow();
	var _typescript = require_typescript();
	/**
	* Common parser code for TypeScript and Flow.
	*/
	function typedParseConditional(noIn) {
		if (_index.match.call(void 0, _types.TokenType.question)) {
			const nextType = _index.lookaheadType.call(void 0);
			if (nextType === _types.TokenType.colon || nextType === _types.TokenType.comma || nextType === _types.TokenType.parenR) return;
		}
		_expression.baseParseConditional.call(void 0, noIn);
	}
	exports.typedParseConditional = typedParseConditional;
	function typedParseParenItem() {
		_index.eatTypeToken.call(void 0, _types.TokenType.question);
		if (_index.match.call(void 0, _types.TokenType.colon)) {
			if (_base.isTypeScriptEnabled) _typescript.tsParseTypeAnnotation.call(void 0);
			else if (_base.isFlowEnabled) _flow.flowParseTypeAnnotation.call(void 0);
		}
	}
	exports.typedParseParenItem = typedParseParenItem;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/traverser/expression.js
var require_expression = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _flow = require_flow();
	var _index = require_jsx();
	var _types = require_types();
	var _typescript = require_typescript();
	var _index3 = require_tokenizer();
	var _keywords = require_keywords();
	var _state = require_state();
	var _types3 = require_types$2();
	var _charcodes = require_charcodes();
	var _identifier = require_identifier();
	var _base = require_base();
	var _lval = require_lval();
	var _statement = require_statement();
	var _util = require_util$1();
	var StopState = class {
		constructor(stop) {
			this.stop = stop;
		}
	};
	exports.StopState = StopState;
	function parseExpression(noIn = false) {
		parseMaybeAssign(noIn);
		if (_index3.match.call(void 0, _types3.TokenType.comma)) while (_index3.eat.call(void 0, _types3.TokenType.comma)) parseMaybeAssign(noIn);
	}
	exports.parseExpression = parseExpression;
	/**
	* noIn is used when parsing a for loop so that we don't interpret a following "in" as the binary
	* operatior.
	* isWithinParens is used to indicate that we're parsing something that might be a comma expression
	* or might be an arrow function or might be a Flow type assertion (which requires explicit parens).
	* In these cases, we should allow : and ?: after the initial "left" part.
	*/
	function parseMaybeAssign(noIn = false, isWithinParens = false) {
		if (_base.isTypeScriptEnabled) return _typescript.tsParseMaybeAssign.call(void 0, noIn, isWithinParens);
		else if (_base.isFlowEnabled) return _flow.flowParseMaybeAssign.call(void 0, noIn, isWithinParens);
		else return baseParseMaybeAssign(noIn, isWithinParens);
	}
	exports.parseMaybeAssign = parseMaybeAssign;
	function baseParseMaybeAssign(noIn, isWithinParens) {
		if (_index3.match.call(void 0, _types3.TokenType._yield)) {
			parseYield();
			return false;
		}
		if (_index3.match.call(void 0, _types3.TokenType.parenL) || _index3.match.call(void 0, _types3.TokenType.name) || _index3.match.call(void 0, _types3.TokenType._yield)) _base.state.potentialArrowAt = _base.state.start;
		const wasArrow = parseMaybeConditional(noIn);
		if (isWithinParens) parseParenItem();
		if (_base.state.type & _types3.TokenType.IS_ASSIGN) {
			_index3.next.call(void 0);
			parseMaybeAssign(noIn);
			return false;
		}
		return wasArrow;
	}
	exports.baseParseMaybeAssign = baseParseMaybeAssign;
	function parseMaybeConditional(noIn) {
		if (parseExprOps(noIn)) return true;
		parseConditional(noIn);
		return false;
	}
	function parseConditional(noIn) {
		if (_base.isTypeScriptEnabled || _base.isFlowEnabled) _types.typedParseConditional.call(void 0, noIn);
		else baseParseConditional(noIn);
	}
	function baseParseConditional(noIn) {
		if (_index3.eat.call(void 0, _types3.TokenType.question)) {
			parseMaybeAssign();
			_util.expect.call(void 0, _types3.TokenType.colon);
			parseMaybeAssign(noIn);
		}
	}
	exports.baseParseConditional = baseParseConditional;
	function parseExprOps(noIn) {
		const startTokenIndex = _base.state.tokens.length;
		if (parseMaybeUnary()) return true;
		parseExprOp(startTokenIndex, -1, noIn);
		return false;
	}
	function parseExprOp(startTokenIndex, minPrec, noIn) {
		if (_base.isTypeScriptEnabled && (_types3.TokenType._in & _types3.TokenType.PRECEDENCE_MASK) > minPrec && !_util.hasPrecedingLineBreak.call(void 0) && (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._as) || _util.eatContextual.call(void 0, _keywords.ContextualKeyword._satisfies))) {
			const oldIsType = _index3.pushTypeContext.call(void 0, 1);
			_typescript.tsParseType.call(void 0);
			_index3.popTypeContext.call(void 0, oldIsType);
			_index3.rescan_gt.call(void 0);
			parseExprOp(startTokenIndex, minPrec, noIn);
			return;
		}
		const prec = _base.state.type & _types3.TokenType.PRECEDENCE_MASK;
		if (prec > 0 && (!noIn || !_index3.match.call(void 0, _types3.TokenType._in))) {
			if (prec > minPrec) {
				const op = _base.state.type;
				_index3.next.call(void 0);
				if (op === _types3.TokenType.nullishCoalescing) _base.state.tokens[_base.state.tokens.length - 1].nullishStartIndex = startTokenIndex;
				const rhsStartTokenIndex = _base.state.tokens.length;
				parseMaybeUnary();
				parseExprOp(rhsStartTokenIndex, op & _types3.TokenType.IS_RIGHT_ASSOCIATIVE ? prec - 1 : prec, noIn);
				if (op === _types3.TokenType.nullishCoalescing) {
					_base.state.tokens[startTokenIndex].numNullishCoalesceStarts++;
					_base.state.tokens[_base.state.tokens.length - 1].numNullishCoalesceEnds++;
				}
				parseExprOp(startTokenIndex, minPrec, noIn);
			}
		}
	}
	function parseMaybeUnary() {
		if (_base.isTypeScriptEnabled && !_base.isJSXEnabled && _index3.eat.call(void 0, _types3.TokenType.lessThan)) {
			_typescript.tsParseTypeAssertion.call(void 0);
			return false;
		}
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._module) && _index3.lookaheadCharCode.call(void 0) === _charcodes.charCodes.leftCurlyBrace && !_util.hasFollowingLineBreak.call(void 0)) {
			parseModuleExpression();
			return false;
		}
		if (_base.state.type & _types3.TokenType.IS_PREFIX) {
			_index3.next.call(void 0);
			parseMaybeUnary();
			return false;
		}
		if (parseExprSubscripts()) return true;
		while (_base.state.type & _types3.TokenType.IS_POSTFIX && !_util.canInsertSemicolon.call(void 0)) {
			if (_base.state.type === _types3.TokenType.preIncDec) _base.state.type = _types3.TokenType.postIncDec;
			_index3.next.call(void 0);
		}
		return false;
	}
	exports.parseMaybeUnary = parseMaybeUnary;
	function parseExprSubscripts() {
		const startTokenIndex = _base.state.tokens.length;
		if (parseExprAtom()) return true;
		parseSubscripts(startTokenIndex);
		if (_base.state.tokens.length > startTokenIndex && _base.state.tokens[startTokenIndex].isOptionalChainStart) _base.state.tokens[_base.state.tokens.length - 1].isOptionalChainEnd = true;
		return false;
	}
	exports.parseExprSubscripts = parseExprSubscripts;
	function parseSubscripts(startTokenIndex, noCalls = false) {
		if (_base.isFlowEnabled) _flow.flowParseSubscripts.call(void 0, startTokenIndex, noCalls);
		else baseParseSubscripts(startTokenIndex, noCalls);
	}
	function baseParseSubscripts(startTokenIndex, noCalls = false) {
		const stopState = new StopState(false);
		do
			parseSubscript(startTokenIndex, noCalls, stopState);
		while (!stopState.stop && !_base.state.error);
	}
	exports.baseParseSubscripts = baseParseSubscripts;
	function parseSubscript(startTokenIndex, noCalls, stopState) {
		if (_base.isTypeScriptEnabled) _typescript.tsParseSubscript.call(void 0, startTokenIndex, noCalls, stopState);
		else if (_base.isFlowEnabled) _flow.flowParseSubscript.call(void 0, startTokenIndex, noCalls, stopState);
		else baseParseSubscript(startTokenIndex, noCalls, stopState);
	}
	/** Set 'state.stop = true' to indicate that we should stop parsing subscripts. */
	function baseParseSubscript(startTokenIndex, noCalls, stopState) {
		if (!noCalls && _index3.eat.call(void 0, _types3.TokenType.doubleColon)) {
			parseNoCallExpr();
			stopState.stop = true;
			parseSubscripts(startTokenIndex, noCalls);
		} else if (_index3.match.call(void 0, _types3.TokenType.questionDot)) {
			_base.state.tokens[startTokenIndex].isOptionalChainStart = true;
			if (noCalls && _index3.lookaheadType.call(void 0) === _types3.TokenType.parenL) {
				stopState.stop = true;
				return;
			}
			_index3.next.call(void 0);
			_base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
			if (_index3.eat.call(void 0, _types3.TokenType.bracketL)) {
				parseExpression();
				_util.expect.call(void 0, _types3.TokenType.bracketR);
			} else if (_index3.eat.call(void 0, _types3.TokenType.parenL)) parseCallExpressionArguments();
			else parseMaybePrivateName();
		} else if (_index3.eat.call(void 0, _types3.TokenType.dot)) {
			_base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
			parseMaybePrivateName();
		} else if (_index3.eat.call(void 0, _types3.TokenType.bracketL)) {
			_base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
			parseExpression();
			_util.expect.call(void 0, _types3.TokenType.bracketR);
		} else if (!noCalls && _index3.match.call(void 0, _types3.TokenType.parenL)) {
			if (atPossibleAsync()) {
				const snapshot = _base.state.snapshot();
				const asyncStartTokenIndex = _base.state.tokens.length;
				_index3.next.call(void 0);
				_base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
				const callContextId = _base.getNextContextId.call(void 0);
				_base.state.tokens[_base.state.tokens.length - 1].contextId = callContextId;
				parseCallExpressionArguments();
				_base.state.tokens[_base.state.tokens.length - 1].contextId = callContextId;
				if (shouldParseAsyncArrow()) {
					_base.state.restoreFromSnapshot(snapshot);
					stopState.stop = true;
					_base.state.scopeDepth++;
					_statement.parseFunctionParams.call(void 0);
					parseAsyncArrowFromCallExpression(asyncStartTokenIndex);
				}
			} else {
				_index3.next.call(void 0);
				_base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
				const callContextId = _base.getNextContextId.call(void 0);
				_base.state.tokens[_base.state.tokens.length - 1].contextId = callContextId;
				parseCallExpressionArguments();
				_base.state.tokens[_base.state.tokens.length - 1].contextId = callContextId;
			}
		} else if (_index3.match.call(void 0, _types3.TokenType.backQuote)) parseTemplate();
		else stopState.stop = true;
	}
	exports.baseParseSubscript = baseParseSubscript;
	function atPossibleAsync() {
		return _base.state.tokens[_base.state.tokens.length - 1].contextualKeyword === _keywords.ContextualKeyword._async && !_util.canInsertSemicolon.call(void 0);
	}
	exports.atPossibleAsync = atPossibleAsync;
	function parseCallExpressionArguments() {
		let first = true;
		while (!_index3.eat.call(void 0, _types3.TokenType.parenR) && !_base.state.error) {
			if (first) first = false;
			else {
				_util.expect.call(void 0, _types3.TokenType.comma);
				if (_index3.eat.call(void 0, _types3.TokenType.parenR)) break;
			}
			parseExprListItem(false);
		}
	}
	exports.parseCallExpressionArguments = parseCallExpressionArguments;
	function shouldParseAsyncArrow() {
		return _index3.match.call(void 0, _types3.TokenType.colon) || _index3.match.call(void 0, _types3.TokenType.arrow);
	}
	function parseAsyncArrowFromCallExpression(startTokenIndex) {
		if (_base.isTypeScriptEnabled) _typescript.tsStartParseAsyncArrowFromCallExpression.call(void 0);
		else if (_base.isFlowEnabled) _flow.flowStartParseAsyncArrowFromCallExpression.call(void 0);
		_util.expect.call(void 0, _types3.TokenType.arrow);
		parseArrowExpression(startTokenIndex);
	}
	function parseNoCallExpr() {
		const startTokenIndex = _base.state.tokens.length;
		parseExprAtom();
		parseSubscripts(startTokenIndex, true);
	}
	function parseExprAtom() {
		if (_index3.eat.call(void 0, _types3.TokenType.modulo)) {
			parseIdentifier();
			return false;
		}
		if (_index3.match.call(void 0, _types3.TokenType.jsxText) || _index3.match.call(void 0, _types3.TokenType.jsxEmptyText)) {
			parseLiteral();
			return false;
		} else if (_index3.match.call(void 0, _types3.TokenType.lessThan) && _base.isJSXEnabled) {
			_base.state.type = _types3.TokenType.jsxTagStart;
			_index.jsxParseElement.call(void 0);
			_index3.next.call(void 0);
			return false;
		}
		const canBeArrow = _base.state.potentialArrowAt === _base.state.start;
		switch (_base.state.type) {
			case _types3.TokenType.slash:
			case _types3.TokenType.assign: _index3.retokenizeSlashAsRegex.call(void 0);
			case _types3.TokenType._super:
			case _types3.TokenType._this:
			case _types3.TokenType.regexp:
			case _types3.TokenType.num:
			case _types3.TokenType.bigint:
			case _types3.TokenType.decimal:
			case _types3.TokenType.string:
			case _types3.TokenType._null:
			case _types3.TokenType._true:
			case _types3.TokenType._false:
				_index3.next.call(void 0);
				return false;
			case _types3.TokenType._import:
				_index3.next.call(void 0);
				if (_index3.match.call(void 0, _types3.TokenType.dot)) {
					_base.state.tokens[_base.state.tokens.length - 1].type = _types3.TokenType.name;
					_index3.next.call(void 0);
					parseIdentifier();
				}
				return false;
			case _types3.TokenType.name: {
				const startTokenIndex = _base.state.tokens.length;
				const functionStart = _base.state.start;
				const contextualKeyword = _base.state.contextualKeyword;
				parseIdentifier();
				if (contextualKeyword === _keywords.ContextualKeyword._await) {
					parseAwait();
					return false;
				} else if (contextualKeyword === _keywords.ContextualKeyword._async && _index3.match.call(void 0, _types3.TokenType._function) && !_util.canInsertSemicolon.call(void 0)) {
					_index3.next.call(void 0);
					_statement.parseFunction.call(void 0, functionStart, false);
					return false;
				} else if (canBeArrow && contextualKeyword === _keywords.ContextualKeyword._async && !_util.canInsertSemicolon.call(void 0) && _index3.match.call(void 0, _types3.TokenType.name)) {
					_base.state.scopeDepth++;
					_lval.parseBindingIdentifier.call(void 0, false);
					_util.expect.call(void 0, _types3.TokenType.arrow);
					parseArrowExpression(startTokenIndex);
					return true;
				} else if (_index3.match.call(void 0, _types3.TokenType._do) && !_util.canInsertSemicolon.call(void 0)) {
					_index3.next.call(void 0);
					_statement.parseBlock.call(void 0);
					return false;
				}
				if (canBeArrow && !_util.canInsertSemicolon.call(void 0) && _index3.match.call(void 0, _types3.TokenType.arrow)) {
					_base.state.scopeDepth++;
					_lval.markPriorBindingIdentifier.call(void 0, false);
					_util.expect.call(void 0, _types3.TokenType.arrow);
					parseArrowExpression(startTokenIndex);
					return true;
				}
				_base.state.tokens[_base.state.tokens.length - 1].identifierRole = _index3.IdentifierRole.Access;
				return false;
			}
			case _types3.TokenType._do:
				_index3.next.call(void 0);
				_statement.parseBlock.call(void 0);
				return false;
			case _types3.TokenType.parenL: return parseParenAndDistinguishExpression(canBeArrow);
			case _types3.TokenType.bracketL:
				_index3.next.call(void 0);
				parseExprList(_types3.TokenType.bracketR, true);
				return false;
			case _types3.TokenType.braceL:
				parseObj(false, false);
				return false;
			case _types3.TokenType._function:
				parseFunctionExpression();
				return false;
			case _types3.TokenType.at: _statement.parseDecorators.call(void 0);
			case _types3.TokenType._class:
				_statement.parseClass.call(void 0, false);
				return false;
			case _types3.TokenType._new:
				parseNew();
				return false;
			case _types3.TokenType.backQuote:
				parseTemplate();
				return false;
			case _types3.TokenType.doubleColon:
				_index3.next.call(void 0);
				parseNoCallExpr();
				return false;
			case _types3.TokenType.hash: {
				const code = _index3.lookaheadCharCode.call(void 0);
				if (_identifier.IS_IDENTIFIER_START[code] || code === _charcodes.charCodes.backslash) parseMaybePrivateName();
				else _index3.next.call(void 0);
				return false;
			}
			default:
				_util.unexpected.call(void 0);
				return false;
		}
	}
	exports.parseExprAtom = parseExprAtom;
	function parseMaybePrivateName() {
		_index3.eat.call(void 0, _types3.TokenType.hash);
		parseIdentifier();
	}
	function parseFunctionExpression() {
		const functionStart = _base.state.start;
		parseIdentifier();
		if (_index3.eat.call(void 0, _types3.TokenType.dot)) parseIdentifier();
		_statement.parseFunction.call(void 0, functionStart, false);
	}
	function parseLiteral() {
		_index3.next.call(void 0);
	}
	exports.parseLiteral = parseLiteral;
	function parseParenExpression() {
		_util.expect.call(void 0, _types3.TokenType.parenL);
		parseExpression();
		_util.expect.call(void 0, _types3.TokenType.parenR);
	}
	exports.parseParenExpression = parseParenExpression;
	function parseParenAndDistinguishExpression(canBeArrow) {
		const snapshot = _base.state.snapshot();
		const startTokenIndex = _base.state.tokens.length;
		_util.expect.call(void 0, _types3.TokenType.parenL);
		let first = true;
		while (!_index3.match.call(void 0, _types3.TokenType.parenR) && !_base.state.error) {
			if (first) first = false;
			else {
				_util.expect.call(void 0, _types3.TokenType.comma);
				if (_index3.match.call(void 0, _types3.TokenType.parenR)) break;
			}
			if (_index3.match.call(void 0, _types3.TokenType.ellipsis)) {
				_lval.parseRest.call(void 0, false);
				parseParenItem();
				break;
			} else parseMaybeAssign(false, true);
		}
		_util.expect.call(void 0, _types3.TokenType.parenR);
		if (canBeArrow && shouldParseArrow()) {
			if (parseArrow()) {
				_base.state.restoreFromSnapshot(snapshot);
				_base.state.scopeDepth++;
				_statement.parseFunctionParams.call(void 0);
				parseArrow();
				parseArrowExpression(startTokenIndex);
				if (_base.state.error) {
					_base.state.restoreFromSnapshot(snapshot);
					parseParenAndDistinguishExpression(false);
					return false;
				}
				return true;
			}
		}
		return false;
	}
	function shouldParseArrow() {
		return _index3.match.call(void 0, _types3.TokenType.colon) || !_util.canInsertSemicolon.call(void 0);
	}
	function parseArrow() {
		if (_base.isTypeScriptEnabled) return _typescript.tsParseArrow.call(void 0);
		else if (_base.isFlowEnabled) return _flow.flowParseArrow.call(void 0);
		else return _index3.eat.call(void 0, _types3.TokenType.arrow);
	}
	exports.parseArrow = parseArrow;
	function parseParenItem() {
		if (_base.isTypeScriptEnabled || _base.isFlowEnabled) _types.typedParseParenItem.call(void 0);
	}
	function parseNew() {
		_util.expect.call(void 0, _types3.TokenType._new);
		if (_index3.eat.call(void 0, _types3.TokenType.dot)) {
			parseIdentifier();
			return;
		}
		parseNewCallee();
		if (_base.isFlowEnabled) _flow.flowStartParseNewArguments.call(void 0);
		if (_index3.eat.call(void 0, _types3.TokenType.parenL)) parseExprList(_types3.TokenType.parenR);
	}
	function parseNewCallee() {
		parseNoCallExpr();
		_index3.eat.call(void 0, _types3.TokenType.questionDot);
	}
	function parseTemplate() {
		_index3.nextTemplateToken.call(void 0);
		_index3.nextTemplateToken.call(void 0);
		while (!_index3.match.call(void 0, _types3.TokenType.backQuote) && !_base.state.error) {
			_util.expect.call(void 0, _types3.TokenType.dollarBraceL);
			parseExpression();
			_index3.nextTemplateToken.call(void 0);
			_index3.nextTemplateToken.call(void 0);
		}
		_index3.next.call(void 0);
	}
	exports.parseTemplate = parseTemplate;
	function parseObj(isPattern, isBlockScope) {
		const contextId = _base.getNextContextId.call(void 0);
		let first = true;
		_index3.next.call(void 0);
		_base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
		while (!_index3.eat.call(void 0, _types3.TokenType.braceR) && !_base.state.error) {
			if (first) first = false;
			else {
				_util.expect.call(void 0, _types3.TokenType.comma);
				if (_index3.eat.call(void 0, _types3.TokenType.braceR)) break;
			}
			let isGenerator = false;
			if (_index3.match.call(void 0, _types3.TokenType.ellipsis)) {
				const previousIndex = _base.state.tokens.length;
				_lval.parseSpread.call(void 0);
				if (isPattern) {
					if (_base.state.tokens.length === previousIndex + 2) _lval.markPriorBindingIdentifier.call(void 0, isBlockScope);
					if (_index3.eat.call(void 0, _types3.TokenType.braceR)) break;
				}
				continue;
			}
			if (!isPattern) isGenerator = _index3.eat.call(void 0, _types3.TokenType.star);
			if (!isPattern && _util.isContextual.call(void 0, _keywords.ContextualKeyword._async)) {
				if (isGenerator) _util.unexpected.call(void 0);
				parseIdentifier();
				if (_index3.match.call(void 0, _types3.TokenType.colon) || _index3.match.call(void 0, _types3.TokenType.parenL) || _index3.match.call(void 0, _types3.TokenType.braceR) || _index3.match.call(void 0, _types3.TokenType.eq) || _index3.match.call(void 0, _types3.TokenType.comma)) {} else {
					if (_index3.match.call(void 0, _types3.TokenType.star)) {
						_index3.next.call(void 0);
						isGenerator = true;
					}
					parsePropertyName(contextId);
				}
			} else parsePropertyName(contextId);
			parseObjPropValue(isPattern, isBlockScope, contextId);
		}
		_base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
	}
	exports.parseObj = parseObj;
	function isGetterOrSetterMethod(isPattern) {
		return !isPattern && (_index3.match.call(void 0, _types3.TokenType.string) || _index3.match.call(void 0, _types3.TokenType.num) || _index3.match.call(void 0, _types3.TokenType.bracketL) || _index3.match.call(void 0, _types3.TokenType.name) || !!(_base.state.type & _types3.TokenType.IS_KEYWORD));
	}
	function parseObjectMethod(isPattern, objectContextId) {
		const functionStart = _base.state.start;
		if (_index3.match.call(void 0, _types3.TokenType.parenL)) {
			if (isPattern) _util.unexpected.call(void 0);
			parseMethod(functionStart, false);
			return true;
		}
		if (isGetterOrSetterMethod(isPattern)) {
			parsePropertyName(objectContextId);
			parseMethod(functionStart, false);
			return true;
		}
		return false;
	}
	function parseObjectProperty(isPattern, isBlockScope) {
		if (_index3.eat.call(void 0, _types3.TokenType.colon)) {
			if (isPattern) _lval.parseMaybeDefault.call(void 0, isBlockScope);
			else parseMaybeAssign(false);
			return;
		}
		let identifierRole;
		if (isPattern) {
			if (_base.state.scopeDepth === 0) identifierRole = _index3.IdentifierRole.ObjectShorthandTopLevelDeclaration;
			else if (isBlockScope) identifierRole = _index3.IdentifierRole.ObjectShorthandBlockScopedDeclaration;
			else identifierRole = _index3.IdentifierRole.ObjectShorthandFunctionScopedDeclaration;
		} else identifierRole = _index3.IdentifierRole.ObjectShorthand;
		_base.state.tokens[_base.state.tokens.length - 1].identifierRole = identifierRole;
		_lval.parseMaybeDefault.call(void 0, isBlockScope, true);
	}
	function parseObjPropValue(isPattern, isBlockScope, objectContextId) {
		if (_base.isTypeScriptEnabled) _typescript.tsStartParseObjPropValue.call(void 0);
		else if (_base.isFlowEnabled) _flow.flowStartParseObjPropValue.call(void 0);
		if (!parseObjectMethod(isPattern, objectContextId)) parseObjectProperty(isPattern, isBlockScope);
	}
	function parsePropertyName(objectContextId) {
		if (_base.isFlowEnabled) _flow.flowParseVariance.call(void 0);
		if (_index3.eat.call(void 0, _types3.TokenType.bracketL)) {
			_base.state.tokens[_base.state.tokens.length - 1].contextId = objectContextId;
			parseMaybeAssign();
			_util.expect.call(void 0, _types3.TokenType.bracketR);
			_base.state.tokens[_base.state.tokens.length - 1].contextId = objectContextId;
		} else {
			if (_index3.match.call(void 0, _types3.TokenType.num) || _index3.match.call(void 0, _types3.TokenType.string) || _index3.match.call(void 0, _types3.TokenType.bigint) || _index3.match.call(void 0, _types3.TokenType.decimal)) parseExprAtom();
			else parseMaybePrivateName();
			_base.state.tokens[_base.state.tokens.length - 1].identifierRole = _index3.IdentifierRole.ObjectKey;
			_base.state.tokens[_base.state.tokens.length - 1].contextId = objectContextId;
		}
	}
	exports.parsePropertyName = parsePropertyName;
	function parseMethod(functionStart, isConstructor) {
		const funcContextId = _base.getNextContextId.call(void 0);
		_base.state.scopeDepth++;
		const startTokenIndex = _base.state.tokens.length;
		const allowModifiers = isConstructor;
		_statement.parseFunctionParams.call(void 0, allowModifiers, funcContextId);
		parseFunctionBodyAndFinish(functionStart, funcContextId);
		const endTokenIndex = _base.state.tokens.length;
		_base.state.scopes.push(new _state.Scope(startTokenIndex, endTokenIndex, true));
		_base.state.scopeDepth--;
	}
	exports.parseMethod = parseMethod;
	function parseArrowExpression(startTokenIndex) {
		parseFunctionBody(true);
		const endTokenIndex = _base.state.tokens.length;
		_base.state.scopes.push(new _state.Scope(startTokenIndex, endTokenIndex, true));
		_base.state.scopeDepth--;
	}
	exports.parseArrowExpression = parseArrowExpression;
	function parseFunctionBodyAndFinish(functionStart, funcContextId = 0) {
		if (_base.isTypeScriptEnabled) _typescript.tsParseFunctionBodyAndFinish.call(void 0, functionStart, funcContextId);
		else if (_base.isFlowEnabled) _flow.flowParseFunctionBodyAndFinish.call(void 0, funcContextId);
		else parseFunctionBody(false, funcContextId);
	}
	exports.parseFunctionBodyAndFinish = parseFunctionBodyAndFinish;
	function parseFunctionBody(allowExpression, funcContextId = 0) {
		if (allowExpression && !_index3.match.call(void 0, _types3.TokenType.braceL)) parseMaybeAssign();
		else _statement.parseBlock.call(void 0, true, funcContextId);
	}
	exports.parseFunctionBody = parseFunctionBody;
	function parseExprList(close, allowEmpty = false) {
		let first = true;
		while (!_index3.eat.call(void 0, close) && !_base.state.error) {
			if (first) first = false;
			else {
				_util.expect.call(void 0, _types3.TokenType.comma);
				if (_index3.eat.call(void 0, close)) break;
			}
			parseExprListItem(allowEmpty);
		}
	}
	function parseExprListItem(allowEmpty) {
		if (allowEmpty && _index3.match.call(void 0, _types3.TokenType.comma)) {} else if (_index3.match.call(void 0, _types3.TokenType.ellipsis)) {
			_lval.parseSpread.call(void 0);
			parseParenItem();
		} else if (_index3.match.call(void 0, _types3.TokenType.question)) _index3.next.call(void 0);
		else parseMaybeAssign(false, true);
	}
	function parseIdentifier() {
		_index3.next.call(void 0);
		_base.state.tokens[_base.state.tokens.length - 1].type = _types3.TokenType.name;
	}
	exports.parseIdentifier = parseIdentifier;
	function parseAwait() {
		parseMaybeUnary();
	}
	function parseYield() {
		_index3.next.call(void 0);
		if (!_index3.match.call(void 0, _types3.TokenType.semi) && !_util.canInsertSemicolon.call(void 0)) {
			_index3.eat.call(void 0, _types3.TokenType.star);
			parseMaybeAssign();
		}
	}
	function parseModuleExpression() {
		_util.expectContextual.call(void 0, _keywords.ContextualKeyword._module);
		_util.expect.call(void 0, _types3.TokenType.braceL);
		_statement.parseBlockBody.call(void 0, _types3.TokenType.braceR);
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/plugins/flow.js
var require_flow = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _index = require_tokenizer();
	var _keywords = require_keywords();
	var _types = require_types$2();
	var _base = require_base();
	var _expression = require_expression();
	var _statement = require_statement();
	var _util = require_util$1();
	function isMaybeDefaultImport(lookahead) {
		return (lookahead.type === _types.TokenType.name || !!(lookahead.type & _types.TokenType.IS_KEYWORD)) && lookahead.contextualKeyword !== _keywords.ContextualKeyword._from;
	}
	function flowParseTypeInitialiser(tok) {
		const oldIsType = _index.pushTypeContext.call(void 0, 0);
		_util.expect.call(void 0, tok || _types.TokenType.colon);
		flowParseType();
		_index.popTypeContext.call(void 0, oldIsType);
	}
	function flowParsePredicate() {
		_util.expect.call(void 0, _types.TokenType.modulo);
		_util.expectContextual.call(void 0, _keywords.ContextualKeyword._checks);
		if (_index.eat.call(void 0, _types.TokenType.parenL)) {
			_expression.parseExpression.call(void 0);
			_util.expect.call(void 0, _types.TokenType.parenR);
		}
	}
	function flowParseTypeAndPredicateInitialiser() {
		const oldIsType = _index.pushTypeContext.call(void 0, 0);
		_util.expect.call(void 0, _types.TokenType.colon);
		if (_index.match.call(void 0, _types.TokenType.modulo)) flowParsePredicate();
		else {
			flowParseType();
			if (_index.match.call(void 0, _types.TokenType.modulo)) flowParsePredicate();
		}
		_index.popTypeContext.call(void 0, oldIsType);
	}
	function flowParseDeclareClass() {
		_index.next.call(void 0);
		flowParseInterfaceish(true);
	}
	function flowParseDeclareFunction() {
		_index.next.call(void 0);
		_expression.parseIdentifier.call(void 0);
		if (_index.match.call(void 0, _types.TokenType.lessThan)) flowParseTypeParameterDeclaration();
		_util.expect.call(void 0, _types.TokenType.parenL);
		flowParseFunctionTypeParams();
		_util.expect.call(void 0, _types.TokenType.parenR);
		flowParseTypeAndPredicateInitialiser();
		_util.semicolon.call(void 0);
	}
	function flowParseDeclare() {
		if (_index.match.call(void 0, _types.TokenType._class)) flowParseDeclareClass();
		else if (_index.match.call(void 0, _types.TokenType._function)) flowParseDeclareFunction();
		else if (_index.match.call(void 0, _types.TokenType._var)) flowParseDeclareVariable();
		else if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._module)) {
			if (_index.eat.call(void 0, _types.TokenType.dot)) flowParseDeclareModuleExports();
			else flowParseDeclareModule();
		} else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._type)) flowParseDeclareTypeAlias();
		else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._opaque)) flowParseDeclareOpaqueType();
		else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._interface)) flowParseDeclareInterface();
		else if (_index.match.call(void 0, _types.TokenType._export)) flowParseDeclareExportDeclaration();
		else _util.unexpected.call(void 0);
	}
	function flowParseDeclareVariable() {
		_index.next.call(void 0);
		flowParseTypeAnnotatableIdentifier();
		_util.semicolon.call(void 0);
	}
	function flowParseDeclareModule() {
		if (_index.match.call(void 0, _types.TokenType.string)) _expression.parseExprAtom.call(void 0);
		else _expression.parseIdentifier.call(void 0);
		_util.expect.call(void 0, _types.TokenType.braceL);
		while (!_index.match.call(void 0, _types.TokenType.braceR) && !_base.state.error) if (_index.match.call(void 0, _types.TokenType._import)) {
			_index.next.call(void 0);
			_statement.parseImport.call(void 0);
		} else _util.unexpected.call(void 0);
		_util.expect.call(void 0, _types.TokenType.braceR);
	}
	function flowParseDeclareExportDeclaration() {
		_util.expect.call(void 0, _types.TokenType._export);
		if (_index.eat.call(void 0, _types.TokenType._default)) {
			if (_index.match.call(void 0, _types.TokenType._function) || _index.match.call(void 0, _types.TokenType._class)) flowParseDeclare();
			else {
				flowParseType();
				_util.semicolon.call(void 0);
			}
		} else if (_index.match.call(void 0, _types.TokenType._var) || _index.match.call(void 0, _types.TokenType._function) || _index.match.call(void 0, _types.TokenType._class) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._opaque)) flowParseDeclare();
		else if (_index.match.call(void 0, _types.TokenType.star) || _index.match.call(void 0, _types.TokenType.braceL) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._interface) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._type) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._opaque)) _statement.parseExport.call(void 0);
		else _util.unexpected.call(void 0);
	}
	function flowParseDeclareModuleExports() {
		_util.expectContextual.call(void 0, _keywords.ContextualKeyword._exports);
		flowParseTypeAnnotation();
		_util.semicolon.call(void 0);
	}
	function flowParseDeclareTypeAlias() {
		_index.next.call(void 0);
		flowParseTypeAlias();
	}
	function flowParseDeclareOpaqueType() {
		_index.next.call(void 0);
		flowParseOpaqueType(true);
	}
	function flowParseDeclareInterface() {
		_index.next.call(void 0);
		flowParseInterfaceish();
	}
	function flowParseInterfaceish(isClass = false) {
		flowParseRestrictedIdentifier();
		if (_index.match.call(void 0, _types.TokenType.lessThan)) flowParseTypeParameterDeclaration();
		if (_index.eat.call(void 0, _types.TokenType._extends)) do
			flowParseInterfaceExtends();
		while (!isClass && _index.eat.call(void 0, _types.TokenType.comma));
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._mixins)) {
			_index.next.call(void 0);
			do
				flowParseInterfaceExtends();
			while (_index.eat.call(void 0, _types.TokenType.comma));
		}
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._implements)) {
			_index.next.call(void 0);
			do
				flowParseInterfaceExtends();
			while (_index.eat.call(void 0, _types.TokenType.comma));
		}
		flowParseObjectType(isClass, false, isClass);
	}
	function flowParseInterfaceExtends() {
		flowParseQualifiedTypeIdentifier(false);
		if (_index.match.call(void 0, _types.TokenType.lessThan)) flowParseTypeParameterInstantiation();
	}
	function flowParseInterface() {
		flowParseInterfaceish();
	}
	function flowParseRestrictedIdentifier() {
		_expression.parseIdentifier.call(void 0);
	}
	function flowParseTypeAlias() {
		flowParseRestrictedIdentifier();
		if (_index.match.call(void 0, _types.TokenType.lessThan)) flowParseTypeParameterDeclaration();
		flowParseTypeInitialiser(_types.TokenType.eq);
		_util.semicolon.call(void 0);
	}
	function flowParseOpaqueType(declare) {
		_util.expectContextual.call(void 0, _keywords.ContextualKeyword._type);
		flowParseRestrictedIdentifier();
		if (_index.match.call(void 0, _types.TokenType.lessThan)) flowParseTypeParameterDeclaration();
		if (_index.match.call(void 0, _types.TokenType.colon)) flowParseTypeInitialiser(_types.TokenType.colon);
		if (!declare) flowParseTypeInitialiser(_types.TokenType.eq);
		_util.semicolon.call(void 0);
	}
	function flowParseTypeParameter() {
		flowParseVariance();
		flowParseTypeAnnotatableIdentifier();
		if (_index.eat.call(void 0, _types.TokenType.eq)) flowParseType();
	}
	function flowParseTypeParameterDeclaration() {
		const oldIsType = _index.pushTypeContext.call(void 0, 0);
		// istanbul ignore else: this condition is already checked at all call sites
		if (_index.match.call(void 0, _types.TokenType.lessThan) || _index.match.call(void 0, _types.TokenType.typeParameterStart)) _index.next.call(void 0);
		else _util.unexpected.call(void 0);
		do {
			flowParseTypeParameter();
			if (!_index.match.call(void 0, _types.TokenType.greaterThan)) _util.expect.call(void 0, _types.TokenType.comma);
		} while (!_index.match.call(void 0, _types.TokenType.greaterThan) && !_base.state.error);
		_util.expect.call(void 0, _types.TokenType.greaterThan);
		_index.popTypeContext.call(void 0, oldIsType);
	}
	exports.flowParseTypeParameterDeclaration = flowParseTypeParameterDeclaration;
	function flowParseTypeParameterInstantiation() {
		const oldIsType = _index.pushTypeContext.call(void 0, 0);
		_util.expect.call(void 0, _types.TokenType.lessThan);
		while (!_index.match.call(void 0, _types.TokenType.greaterThan) && !_base.state.error) {
			flowParseType();
			if (!_index.match.call(void 0, _types.TokenType.greaterThan)) _util.expect.call(void 0, _types.TokenType.comma);
		}
		_util.expect.call(void 0, _types.TokenType.greaterThan);
		_index.popTypeContext.call(void 0, oldIsType);
	}
	function flowParseInterfaceType() {
		_util.expectContextual.call(void 0, _keywords.ContextualKeyword._interface);
		if (_index.eat.call(void 0, _types.TokenType._extends)) do
			flowParseInterfaceExtends();
		while (_index.eat.call(void 0, _types.TokenType.comma));
		flowParseObjectType(false, false, false);
	}
	function flowParseObjectPropertyKey() {
		if (_index.match.call(void 0, _types.TokenType.num) || _index.match.call(void 0, _types.TokenType.string)) _expression.parseExprAtom.call(void 0);
		else _expression.parseIdentifier.call(void 0);
	}
	function flowParseObjectTypeIndexer() {
		if (_index.lookaheadType.call(void 0) === _types.TokenType.colon) {
			flowParseObjectPropertyKey();
			flowParseTypeInitialiser();
		} else flowParseType();
		_util.expect.call(void 0, _types.TokenType.bracketR);
		flowParseTypeInitialiser();
	}
	function flowParseObjectTypeInternalSlot() {
		flowParseObjectPropertyKey();
		_util.expect.call(void 0, _types.TokenType.bracketR);
		_util.expect.call(void 0, _types.TokenType.bracketR);
		if (_index.match.call(void 0, _types.TokenType.lessThan) || _index.match.call(void 0, _types.TokenType.parenL)) flowParseObjectTypeMethodish();
		else {
			_index.eat.call(void 0, _types.TokenType.question);
			flowParseTypeInitialiser();
		}
	}
	function flowParseObjectTypeMethodish() {
		if (_index.match.call(void 0, _types.TokenType.lessThan)) flowParseTypeParameterDeclaration();
		_util.expect.call(void 0, _types.TokenType.parenL);
		while (!_index.match.call(void 0, _types.TokenType.parenR) && !_index.match.call(void 0, _types.TokenType.ellipsis) && !_base.state.error) {
			flowParseFunctionTypeParam();
			if (!_index.match.call(void 0, _types.TokenType.parenR)) _util.expect.call(void 0, _types.TokenType.comma);
		}
		if (_index.eat.call(void 0, _types.TokenType.ellipsis)) flowParseFunctionTypeParam();
		_util.expect.call(void 0, _types.TokenType.parenR);
		flowParseTypeInitialiser();
	}
	function flowParseObjectTypeCallProperty() {
		flowParseObjectTypeMethodish();
	}
	function flowParseObjectType(allowStatic, allowExact, allowProto) {
		let endDelim;
		if (allowExact && _index.match.call(void 0, _types.TokenType.braceBarL)) {
			_util.expect.call(void 0, _types.TokenType.braceBarL);
			endDelim = _types.TokenType.braceBarR;
		} else {
			_util.expect.call(void 0, _types.TokenType.braceL);
			endDelim = _types.TokenType.braceR;
		}
		while (!_index.match.call(void 0, endDelim) && !_base.state.error) {
			if (allowProto && _util.isContextual.call(void 0, _keywords.ContextualKeyword._proto)) {
				const lookahead = _index.lookaheadType.call(void 0);
				if (lookahead !== _types.TokenType.colon && lookahead !== _types.TokenType.question) {
					_index.next.call(void 0);
					allowStatic = false;
				}
			}
			if (allowStatic && _util.isContextual.call(void 0, _keywords.ContextualKeyword._static)) {
				const lookahead = _index.lookaheadType.call(void 0);
				if (lookahead !== _types.TokenType.colon && lookahead !== _types.TokenType.question) _index.next.call(void 0);
			}
			flowParseVariance();
			if (_index.eat.call(void 0, _types.TokenType.bracketL)) {
				if (_index.eat.call(void 0, _types.TokenType.bracketL)) flowParseObjectTypeInternalSlot();
				else flowParseObjectTypeIndexer();
			} else if (_index.match.call(void 0, _types.TokenType.parenL) || _index.match.call(void 0, _types.TokenType.lessThan)) flowParseObjectTypeCallProperty();
			else {
				if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._get) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._set)) {
					const lookahead = _index.lookaheadType.call(void 0);
					if (lookahead === _types.TokenType.name || lookahead === _types.TokenType.string || lookahead === _types.TokenType.num) _index.next.call(void 0);
				}
				flowParseObjectTypeProperty();
			}
			flowObjectTypeSemicolon();
		}
		_util.expect.call(void 0, endDelim);
	}
	function flowParseObjectTypeProperty() {
		if (_index.match.call(void 0, _types.TokenType.ellipsis)) {
			_util.expect.call(void 0, _types.TokenType.ellipsis);
			if (!_index.eat.call(void 0, _types.TokenType.comma)) _index.eat.call(void 0, _types.TokenType.semi);
			if (_index.match.call(void 0, _types.TokenType.braceR)) return;
			flowParseType();
		} else {
			flowParseObjectPropertyKey();
			if (_index.match.call(void 0, _types.TokenType.lessThan) || _index.match.call(void 0, _types.TokenType.parenL)) flowParseObjectTypeMethodish();
			else {
				_index.eat.call(void 0, _types.TokenType.question);
				flowParseTypeInitialiser();
			}
		}
	}
	function flowObjectTypeSemicolon() {
		if (!_index.eat.call(void 0, _types.TokenType.semi) && !_index.eat.call(void 0, _types.TokenType.comma) && !_index.match.call(void 0, _types.TokenType.braceR) && !_index.match.call(void 0, _types.TokenType.braceBarR)) _util.unexpected.call(void 0);
	}
	function flowParseQualifiedTypeIdentifier(initialIdAlreadyParsed) {
		if (!initialIdAlreadyParsed) _expression.parseIdentifier.call(void 0);
		while (_index.eat.call(void 0, _types.TokenType.dot)) _expression.parseIdentifier.call(void 0);
	}
	function flowParseGenericType() {
		flowParseQualifiedTypeIdentifier(true);
		if (_index.match.call(void 0, _types.TokenType.lessThan)) flowParseTypeParameterInstantiation();
	}
	function flowParseTypeofType() {
		_util.expect.call(void 0, _types.TokenType._typeof);
		flowParsePrimaryType();
	}
	function flowParseTupleType() {
		_util.expect.call(void 0, _types.TokenType.bracketL);
		while (_base.state.pos < _base.input.length && !_index.match.call(void 0, _types.TokenType.bracketR)) {
			flowParseType();
			if (_index.match.call(void 0, _types.TokenType.bracketR)) break;
			_util.expect.call(void 0, _types.TokenType.comma);
		}
		_util.expect.call(void 0, _types.TokenType.bracketR);
	}
	function flowParseFunctionTypeParam() {
		const lookahead = _index.lookaheadType.call(void 0);
		if (lookahead === _types.TokenType.colon || lookahead === _types.TokenType.question) {
			_expression.parseIdentifier.call(void 0);
			_index.eat.call(void 0, _types.TokenType.question);
			flowParseTypeInitialiser();
		} else flowParseType();
	}
	function flowParseFunctionTypeParams() {
		while (!_index.match.call(void 0, _types.TokenType.parenR) && !_index.match.call(void 0, _types.TokenType.ellipsis) && !_base.state.error) {
			flowParseFunctionTypeParam();
			if (!_index.match.call(void 0, _types.TokenType.parenR)) _util.expect.call(void 0, _types.TokenType.comma);
		}
		if (_index.eat.call(void 0, _types.TokenType.ellipsis)) flowParseFunctionTypeParam();
	}
	function flowParsePrimaryType() {
		let isGroupedType = false;
		const oldNoAnonFunctionType = _base.state.noAnonFunctionType;
		switch (_base.state.type) {
			case _types.TokenType.name:
				if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._interface)) {
					flowParseInterfaceType();
					return;
				}
				_expression.parseIdentifier.call(void 0);
				flowParseGenericType();
				return;
			case _types.TokenType.braceL:
				flowParseObjectType(false, false, false);
				return;
			case _types.TokenType.braceBarL:
				flowParseObjectType(false, true, false);
				return;
			case _types.TokenType.bracketL:
				flowParseTupleType();
				return;
			case _types.TokenType.lessThan:
				flowParseTypeParameterDeclaration();
				_util.expect.call(void 0, _types.TokenType.parenL);
				flowParseFunctionTypeParams();
				_util.expect.call(void 0, _types.TokenType.parenR);
				_util.expect.call(void 0, _types.TokenType.arrow);
				flowParseType();
				return;
			case _types.TokenType.parenL:
				_index.next.call(void 0);
				if (!_index.match.call(void 0, _types.TokenType.parenR) && !_index.match.call(void 0, _types.TokenType.ellipsis)) {
					if (_index.match.call(void 0, _types.TokenType.name)) {
						const token = _index.lookaheadType.call(void 0);
						isGroupedType = token !== _types.TokenType.question && token !== _types.TokenType.colon;
					} else isGroupedType = true;
				}
				if (isGroupedType) {
					_base.state.noAnonFunctionType = false;
					flowParseType();
					_base.state.noAnonFunctionType = oldNoAnonFunctionType;
					if (_base.state.noAnonFunctionType || !(_index.match.call(void 0, _types.TokenType.comma) || _index.match.call(void 0, _types.TokenType.parenR) && _index.lookaheadType.call(void 0) === _types.TokenType.arrow)) {
						_util.expect.call(void 0, _types.TokenType.parenR);
						return;
					} else _index.eat.call(void 0, _types.TokenType.comma);
				}
				flowParseFunctionTypeParams();
				_util.expect.call(void 0, _types.TokenType.parenR);
				_util.expect.call(void 0, _types.TokenType.arrow);
				flowParseType();
				return;
			case _types.TokenType.minus:
				_index.next.call(void 0);
				_expression.parseLiteral.call(void 0);
				return;
			case _types.TokenType.string:
			case _types.TokenType.num:
			case _types.TokenType._true:
			case _types.TokenType._false:
			case _types.TokenType._null:
			case _types.TokenType._this:
			case _types.TokenType._void:
			case _types.TokenType.star:
				_index.next.call(void 0);
				return;
			default: if (_base.state.type === _types.TokenType._typeof) {
				flowParseTypeofType();
				return;
			} else if (_base.state.type & _types.TokenType.IS_KEYWORD) {
				_index.next.call(void 0);
				_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType.name;
				return;
			}
		}
		_util.unexpected.call(void 0);
	}
	function flowParsePostfixType() {
		flowParsePrimaryType();
		while (!_util.canInsertSemicolon.call(void 0) && (_index.match.call(void 0, _types.TokenType.bracketL) || _index.match.call(void 0, _types.TokenType.questionDot))) {
			_index.eat.call(void 0, _types.TokenType.questionDot);
			_util.expect.call(void 0, _types.TokenType.bracketL);
			if (_index.eat.call(void 0, _types.TokenType.bracketR)) {} else {
				flowParseType();
				_util.expect.call(void 0, _types.TokenType.bracketR);
			}
		}
	}
	function flowParsePrefixType() {
		if (_index.eat.call(void 0, _types.TokenType.question)) flowParsePrefixType();
		else flowParsePostfixType();
	}
	function flowParseAnonFunctionWithoutParens() {
		flowParsePrefixType();
		if (!_base.state.noAnonFunctionType && _index.eat.call(void 0, _types.TokenType.arrow)) flowParseType();
	}
	function flowParseIntersectionType() {
		_index.eat.call(void 0, _types.TokenType.bitwiseAND);
		flowParseAnonFunctionWithoutParens();
		while (_index.eat.call(void 0, _types.TokenType.bitwiseAND)) flowParseAnonFunctionWithoutParens();
	}
	function flowParseUnionType() {
		_index.eat.call(void 0, _types.TokenType.bitwiseOR);
		flowParseIntersectionType();
		while (_index.eat.call(void 0, _types.TokenType.bitwiseOR)) flowParseIntersectionType();
	}
	function flowParseType() {
		flowParseUnionType();
	}
	function flowParseTypeAnnotation() {
		flowParseTypeInitialiser();
	}
	exports.flowParseTypeAnnotation = flowParseTypeAnnotation;
	function flowParseTypeAnnotatableIdentifier() {
		_expression.parseIdentifier.call(void 0);
		if (_index.match.call(void 0, _types.TokenType.colon)) flowParseTypeAnnotation();
	}
	function flowParseVariance() {
		if (_index.match.call(void 0, _types.TokenType.plus) || _index.match.call(void 0, _types.TokenType.minus)) {
			_index.next.call(void 0);
			_base.state.tokens[_base.state.tokens.length - 1].isType = true;
		}
	}
	exports.flowParseVariance = flowParseVariance;
	function flowParseFunctionBodyAndFinish(funcContextId) {
		if (_index.match.call(void 0, _types.TokenType.colon)) flowParseTypeAndPredicateInitialiser();
		_expression.parseFunctionBody.call(void 0, false, funcContextId);
	}
	exports.flowParseFunctionBodyAndFinish = flowParseFunctionBodyAndFinish;
	function flowParseSubscript(startTokenIndex, noCalls, stopState) {
		if (_index.match.call(void 0, _types.TokenType.questionDot) && _index.lookaheadType.call(void 0) === _types.TokenType.lessThan) {
			if (noCalls) {
				stopState.stop = true;
				return;
			}
			_index.next.call(void 0);
			flowParseTypeParameterInstantiation();
			_util.expect.call(void 0, _types.TokenType.parenL);
			_expression.parseCallExpressionArguments.call(void 0);
			return;
		} else if (!noCalls && _index.match.call(void 0, _types.TokenType.lessThan)) {
			const snapshot = _base.state.snapshot();
			flowParseTypeParameterInstantiation();
			_util.expect.call(void 0, _types.TokenType.parenL);
			_expression.parseCallExpressionArguments.call(void 0);
			if (_base.state.error) _base.state.restoreFromSnapshot(snapshot);
			else return;
		}
		_expression.baseParseSubscript.call(void 0, startTokenIndex, noCalls, stopState);
	}
	exports.flowParseSubscript = flowParseSubscript;
	function flowStartParseNewArguments() {
		if (_index.match.call(void 0, _types.TokenType.lessThan)) {
			const snapshot = _base.state.snapshot();
			flowParseTypeParameterInstantiation();
			if (_base.state.error) _base.state.restoreFromSnapshot(snapshot);
		}
	}
	exports.flowStartParseNewArguments = flowStartParseNewArguments;
	function flowTryParseStatement() {
		if (_index.match.call(void 0, _types.TokenType.name) && _base.state.contextualKeyword === _keywords.ContextualKeyword._interface) {
			const oldIsType = _index.pushTypeContext.call(void 0, 0);
			_index.next.call(void 0);
			flowParseInterface();
			_index.popTypeContext.call(void 0, oldIsType);
			return true;
		} else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._enum)) {
			flowParseEnumDeclaration();
			return true;
		}
		return false;
	}
	exports.flowTryParseStatement = flowTryParseStatement;
	function flowTryParseExportDefaultExpression() {
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._enum)) {
			flowParseEnumDeclaration();
			return true;
		}
		return false;
	}
	exports.flowTryParseExportDefaultExpression = flowTryParseExportDefaultExpression;
	function flowParseIdentifierStatement(contextualKeyword) {
		if (contextualKeyword === _keywords.ContextualKeyword._declare) {
			if (_index.match.call(void 0, _types.TokenType._class) || _index.match.call(void 0, _types.TokenType.name) || _index.match.call(void 0, _types.TokenType._function) || _index.match.call(void 0, _types.TokenType._var) || _index.match.call(void 0, _types.TokenType._export)) {
				const oldIsType = _index.pushTypeContext.call(void 0, 1);
				flowParseDeclare();
				_index.popTypeContext.call(void 0, oldIsType);
			}
		} else if (_index.match.call(void 0, _types.TokenType.name)) {
			if (contextualKeyword === _keywords.ContextualKeyword._interface) {
				const oldIsType = _index.pushTypeContext.call(void 0, 1);
				flowParseInterface();
				_index.popTypeContext.call(void 0, oldIsType);
			} else if (contextualKeyword === _keywords.ContextualKeyword._type) {
				const oldIsType = _index.pushTypeContext.call(void 0, 1);
				flowParseTypeAlias();
				_index.popTypeContext.call(void 0, oldIsType);
			} else if (contextualKeyword === _keywords.ContextualKeyword._opaque) {
				const oldIsType = _index.pushTypeContext.call(void 0, 1);
				flowParseOpaqueType(false);
				_index.popTypeContext.call(void 0, oldIsType);
			}
		}
		_util.semicolon.call(void 0);
	}
	exports.flowParseIdentifierStatement = flowParseIdentifierStatement;
	function flowShouldParseExportDeclaration() {
		return _util.isContextual.call(void 0, _keywords.ContextualKeyword._type) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._interface) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._opaque) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._enum);
	}
	exports.flowShouldParseExportDeclaration = flowShouldParseExportDeclaration;
	function flowShouldDisallowExportDefaultSpecifier() {
		return _index.match.call(void 0, _types.TokenType.name) && (_base.state.contextualKeyword === _keywords.ContextualKeyword._type || _base.state.contextualKeyword === _keywords.ContextualKeyword._interface || _base.state.contextualKeyword === _keywords.ContextualKeyword._opaque || _base.state.contextualKeyword === _keywords.ContextualKeyword._enum);
	}
	exports.flowShouldDisallowExportDefaultSpecifier = flowShouldDisallowExportDefaultSpecifier;
	function flowParseExportDeclaration() {
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._type)) {
			const oldIsType = _index.pushTypeContext.call(void 0, 1);
			_index.next.call(void 0);
			if (_index.match.call(void 0, _types.TokenType.braceL)) {
				_statement.parseExportSpecifiers.call(void 0);
				_statement.parseExportFrom.call(void 0);
			} else flowParseTypeAlias();
			_index.popTypeContext.call(void 0, oldIsType);
		} else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._opaque)) {
			const oldIsType = _index.pushTypeContext.call(void 0, 1);
			_index.next.call(void 0);
			flowParseOpaqueType(false);
			_index.popTypeContext.call(void 0, oldIsType);
		} else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._interface)) {
			const oldIsType = _index.pushTypeContext.call(void 0, 1);
			_index.next.call(void 0);
			flowParseInterface();
			_index.popTypeContext.call(void 0, oldIsType);
		} else _statement.parseStatement.call(void 0, true);
	}
	exports.flowParseExportDeclaration = flowParseExportDeclaration;
	function flowShouldParseExportStar() {
		return _index.match.call(void 0, _types.TokenType.star) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._type) && _index.lookaheadType.call(void 0) === _types.TokenType.star;
	}
	exports.flowShouldParseExportStar = flowShouldParseExportStar;
	function flowParseExportStar() {
		if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._type)) {
			const oldIsType = _index.pushTypeContext.call(void 0, 2);
			_statement.baseParseExportStar.call(void 0);
			_index.popTypeContext.call(void 0, oldIsType);
		} else _statement.baseParseExportStar.call(void 0);
	}
	exports.flowParseExportStar = flowParseExportStar;
	function flowAfterParseClassSuper(hasSuper) {
		if (hasSuper && _index.match.call(void 0, _types.TokenType.lessThan)) flowParseTypeParameterInstantiation();
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._implements)) {
			const oldIsType = _index.pushTypeContext.call(void 0, 0);
			_index.next.call(void 0);
			_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._implements;
			do {
				flowParseRestrictedIdentifier();
				if (_index.match.call(void 0, _types.TokenType.lessThan)) flowParseTypeParameterInstantiation();
			} while (_index.eat.call(void 0, _types.TokenType.comma));
			_index.popTypeContext.call(void 0, oldIsType);
		}
	}
	exports.flowAfterParseClassSuper = flowAfterParseClassSuper;
	function flowStartParseObjPropValue() {
		if (_index.match.call(void 0, _types.TokenType.lessThan)) {
			flowParseTypeParameterDeclaration();
			if (!_index.match.call(void 0, _types.TokenType.parenL)) _util.unexpected.call(void 0);
		}
	}
	exports.flowStartParseObjPropValue = flowStartParseObjPropValue;
	function flowParseAssignableListItemTypes() {
		const oldIsType = _index.pushTypeContext.call(void 0, 0);
		_index.eat.call(void 0, _types.TokenType.question);
		if (_index.match.call(void 0, _types.TokenType.colon)) flowParseTypeAnnotation();
		_index.popTypeContext.call(void 0, oldIsType);
	}
	exports.flowParseAssignableListItemTypes = flowParseAssignableListItemTypes;
	function flowStartParseImportSpecifiers() {
		if (_index.match.call(void 0, _types.TokenType._typeof) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._type)) {
			const lh = _index.lookaheadTypeAndKeyword.call(void 0);
			if (isMaybeDefaultImport(lh) || lh.type === _types.TokenType.braceL || lh.type === _types.TokenType.star) _index.next.call(void 0);
		}
	}
	exports.flowStartParseImportSpecifiers = flowStartParseImportSpecifiers;
	function flowParseImportSpecifier() {
		const isTypeKeyword = _base.state.contextualKeyword === _keywords.ContextualKeyword._type || _base.state.type === _types.TokenType._typeof;
		if (isTypeKeyword) _index.next.call(void 0);
		else _expression.parseIdentifier.call(void 0);
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._as) && !_util.isLookaheadContextual.call(void 0, _keywords.ContextualKeyword._as)) {
			_expression.parseIdentifier.call(void 0);
			if (isTypeKeyword && !_index.match.call(void 0, _types.TokenType.name) && !(_base.state.type & _types.TokenType.IS_KEYWORD)) {} else _expression.parseIdentifier.call(void 0);
		} else {
			if (isTypeKeyword && (_index.match.call(void 0, _types.TokenType.name) || !!(_base.state.type & _types.TokenType.IS_KEYWORD))) _expression.parseIdentifier.call(void 0);
			if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._as)) _expression.parseIdentifier.call(void 0);
		}
	}
	exports.flowParseImportSpecifier = flowParseImportSpecifier;
	function flowStartParseFunctionParams() {
		if (_index.match.call(void 0, _types.TokenType.lessThan)) {
			const oldIsType = _index.pushTypeContext.call(void 0, 0);
			flowParseTypeParameterDeclaration();
			_index.popTypeContext.call(void 0, oldIsType);
		}
	}
	exports.flowStartParseFunctionParams = flowStartParseFunctionParams;
	function flowAfterParseVarHead() {
		if (_index.match.call(void 0, _types.TokenType.colon)) flowParseTypeAnnotation();
	}
	exports.flowAfterParseVarHead = flowAfterParseVarHead;
	function flowStartParseAsyncArrowFromCallExpression() {
		if (_index.match.call(void 0, _types.TokenType.colon)) {
			const oldNoAnonFunctionType = _base.state.noAnonFunctionType;
			_base.state.noAnonFunctionType = true;
			flowParseTypeAnnotation();
			_base.state.noAnonFunctionType = oldNoAnonFunctionType;
		}
	}
	exports.flowStartParseAsyncArrowFromCallExpression = flowStartParseAsyncArrowFromCallExpression;
	function flowParseMaybeAssign(noIn, isWithinParens) {
		if (_index.match.call(void 0, _types.TokenType.lessThan)) {
			const snapshot = _base.state.snapshot();
			let wasArrow = _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
			if (_base.state.error) {
				_base.state.restoreFromSnapshot(snapshot);
				_base.state.type = _types.TokenType.typeParameterStart;
			} else return wasArrow;
			const oldIsType = _index.pushTypeContext.call(void 0, 0);
			flowParseTypeParameterDeclaration();
			_index.popTypeContext.call(void 0, oldIsType);
			wasArrow = _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
			if (wasArrow) return true;
			_util.unexpected.call(void 0);
		}
		return _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
	}
	exports.flowParseMaybeAssign = flowParseMaybeAssign;
	function flowParseArrow() {
		if (_index.match.call(void 0, _types.TokenType.colon)) {
			const oldIsType = _index.pushTypeContext.call(void 0, 0);
			const snapshot = _base.state.snapshot();
			const oldNoAnonFunctionType = _base.state.noAnonFunctionType;
			_base.state.noAnonFunctionType = true;
			flowParseTypeAndPredicateInitialiser();
			_base.state.noAnonFunctionType = oldNoAnonFunctionType;
			if (_util.canInsertSemicolon.call(void 0)) _util.unexpected.call(void 0);
			if (!_index.match.call(void 0, _types.TokenType.arrow)) _util.unexpected.call(void 0);
			if (_base.state.error) _base.state.restoreFromSnapshot(snapshot);
			_index.popTypeContext.call(void 0, oldIsType);
		}
		return _index.eat.call(void 0, _types.TokenType.arrow);
	}
	exports.flowParseArrow = flowParseArrow;
	function flowParseSubscripts(startTokenIndex, noCalls = false) {
		if (_base.state.tokens[_base.state.tokens.length - 1].contextualKeyword === _keywords.ContextualKeyword._async && _index.match.call(void 0, _types.TokenType.lessThan)) {
			const snapshot = _base.state.snapshot();
			if (parseAsyncArrowWithTypeParameters() && !_base.state.error) return;
			_base.state.restoreFromSnapshot(snapshot);
		}
		_expression.baseParseSubscripts.call(void 0, startTokenIndex, noCalls);
	}
	exports.flowParseSubscripts = flowParseSubscripts;
	function parseAsyncArrowWithTypeParameters() {
		_base.state.scopeDepth++;
		const startTokenIndex = _base.state.tokens.length;
		_statement.parseFunctionParams.call(void 0);
		if (!_expression.parseArrow.call(void 0)) return false;
		_expression.parseArrowExpression.call(void 0, startTokenIndex);
		return true;
	}
	function flowParseEnumDeclaration() {
		_util.expectContextual.call(void 0, _keywords.ContextualKeyword._enum);
		_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._enum;
		_expression.parseIdentifier.call(void 0);
		flowParseEnumBody();
	}
	function flowParseEnumBody() {
		if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._of)) _index.next.call(void 0);
		_util.expect.call(void 0, _types.TokenType.braceL);
		flowParseEnumMembers();
		_util.expect.call(void 0, _types.TokenType.braceR);
	}
	function flowParseEnumMembers() {
		while (!_index.match.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
			if (_index.eat.call(void 0, _types.TokenType.ellipsis)) break;
			flowParseEnumMember();
			if (!_index.match.call(void 0, _types.TokenType.braceR)) _util.expect.call(void 0, _types.TokenType.comma);
		}
	}
	function flowParseEnumMember() {
		_expression.parseIdentifier.call(void 0);
		if (_index.eat.call(void 0, _types.TokenType.eq)) _index.next.call(void 0);
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/traverser/statement.js
var require_statement = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _index = require_parser();
	var _flow = require_flow();
	var _typescript = require_typescript();
	var _tokenizer = require_tokenizer();
	var _keywords = require_keywords();
	var _state = require_state();
	var _types = require_types$2();
	var _charcodes = require_charcodes();
	var _base = require_base();
	var _expression = require_expression();
	var _lval = require_lval();
	var _util = require_util$1();
	function parseTopLevel() {
		parseBlockBody(_types.TokenType.eof);
		_base.state.scopes.push(new _state.Scope(0, _base.state.tokens.length, true));
		if (_base.state.scopeDepth !== 0) throw new Error(`Invalid scope depth at end of file: ${_base.state.scopeDepth}`);
		return new _index.File(_base.state.tokens, _base.state.scopes);
	}
	exports.parseTopLevel = parseTopLevel;
	function parseStatement(declaration) {
		if (_base.isFlowEnabled) {
			if (_flow.flowTryParseStatement.call(void 0)) return;
		}
		if (_tokenizer.match.call(void 0, _types.TokenType.at)) parseDecorators();
		parseStatementContent(declaration);
	}
	exports.parseStatement = parseStatement;
	function parseStatementContent(declaration) {
		if (_base.isTypeScriptEnabled) {
			if (_typescript.tsTryParseStatementContent.call(void 0)) return;
		}
		const starttype = _base.state.type;
		switch (starttype) {
			case _types.TokenType._break:
			case _types.TokenType._continue:
				parseBreakContinueStatement();
				return;
			case _types.TokenType._debugger:
				parseDebuggerStatement();
				return;
			case _types.TokenType._do:
				parseDoStatement();
				return;
			case _types.TokenType._for:
				parseForStatement();
				return;
			case _types.TokenType._function:
				if (_tokenizer.lookaheadType.call(void 0) === _types.TokenType.dot) break;
				if (!declaration) _util.unexpected.call(void 0);
				parseFunctionStatement();
				return;
			case _types.TokenType._class:
				if (!declaration) _util.unexpected.call(void 0);
				parseClass(true);
				return;
			case _types.TokenType._if:
				parseIfStatement();
				return;
			case _types.TokenType._return:
				parseReturnStatement();
				return;
			case _types.TokenType._switch:
				parseSwitchStatement();
				return;
			case _types.TokenType._throw:
				parseThrowStatement();
				return;
			case _types.TokenType._try:
				parseTryStatement();
				return;
			case _types.TokenType._let:
			case _types.TokenType._const: if (!declaration) _util.unexpected.call(void 0);
			case _types.TokenType._var:
				parseVarStatement(starttype !== _types.TokenType._var);
				return;
			case _types.TokenType._while:
				parseWhileStatement();
				return;
			case _types.TokenType.braceL:
				parseBlock();
				return;
			case _types.TokenType.semi:
				parseEmptyStatement();
				return;
			case _types.TokenType._export:
			case _types.TokenType._import: {
				const nextType = _tokenizer.lookaheadType.call(void 0);
				if (nextType === _types.TokenType.parenL || nextType === _types.TokenType.dot) break;
				_tokenizer.next.call(void 0);
				if (starttype === _types.TokenType._import) parseImport();
				else parseExport();
				return;
			}
			case _types.TokenType.name: if (_base.state.contextualKeyword === _keywords.ContextualKeyword._async) {
				const functionStart = _base.state.start;
				const snapshot = _base.state.snapshot();
				_tokenizer.next.call(void 0);
				if (_tokenizer.match.call(void 0, _types.TokenType._function) && !_util.canInsertSemicolon.call(void 0)) {
					_util.expect.call(void 0, _types.TokenType._function);
					parseFunction(functionStart, true);
					return;
				} else _base.state.restoreFromSnapshot(snapshot);
			} else if (_base.state.contextualKeyword === _keywords.ContextualKeyword._using && !_util.hasFollowingLineBreak.call(void 0) && _tokenizer.lookaheadType.call(void 0) === _types.TokenType.name) {
				parseVarStatement(true);
				return;
			} else if (startsAwaitUsing()) {
				_util.expectContextual.call(void 0, _keywords.ContextualKeyword._await);
				parseVarStatement(true);
				return;
			}
		}
		const initialTokensLength = _base.state.tokens.length;
		_expression.parseExpression.call(void 0);
		let simpleName = null;
		if (_base.state.tokens.length === initialTokensLength + 1) {
			const token = _base.state.tokens[_base.state.tokens.length - 1];
			if (token.type === _types.TokenType.name) simpleName = token.contextualKeyword;
		}
		if (simpleName == null) {
			_util.semicolon.call(void 0);
			return;
		}
		if (_tokenizer.eat.call(void 0, _types.TokenType.colon)) parseLabeledStatement();
		else parseIdentifierStatement(simpleName);
	}
	/**
	* Determine if we're positioned at an `await using` declaration.
	*
	* Note that this can happen either in place of a regular variable declaration
	* or in a loop body, and in both places, there are similar-looking cases where
	* we need to return false.
	*
	* Examples returning true:
	* await using foo = bar();
	* for (await using a of b) {}
	*
	* Examples returning false:
	* await using
	* await using + 1
	* await using instanceof T
	* for (await using;;) {}
	*
	* For now, we early return if we don't see `await`, then do a simple
	* backtracking-based lookahead for the `using` and identifier tokens. In the
	* future, this could be optimized with a character-based approach.
	*/
	function startsAwaitUsing() {
		if (!_util.isContextual.call(void 0, _keywords.ContextualKeyword._await)) return false;
		const snapshot = _base.state.snapshot();
		_tokenizer.next.call(void 0);
		if (!_util.isContextual.call(void 0, _keywords.ContextualKeyword._using) || _util.hasPrecedingLineBreak.call(void 0)) {
			_base.state.restoreFromSnapshot(snapshot);
			return false;
		}
		_tokenizer.next.call(void 0);
		if (!_tokenizer.match.call(void 0, _types.TokenType.name) || _util.hasPrecedingLineBreak.call(void 0)) {
			_base.state.restoreFromSnapshot(snapshot);
			return false;
		}
		_base.state.restoreFromSnapshot(snapshot);
		return true;
	}
	function parseDecorators() {
		while (_tokenizer.match.call(void 0, _types.TokenType.at)) parseDecorator();
	}
	exports.parseDecorators = parseDecorators;
	function parseDecorator() {
		_tokenizer.next.call(void 0);
		if (_tokenizer.eat.call(void 0, _types.TokenType.parenL)) {
			_expression.parseExpression.call(void 0);
			_util.expect.call(void 0, _types.TokenType.parenR);
		} else {
			_expression.parseIdentifier.call(void 0);
			while (_tokenizer.eat.call(void 0, _types.TokenType.dot)) _expression.parseIdentifier.call(void 0);
			parseMaybeDecoratorArguments();
		}
	}
	function parseMaybeDecoratorArguments() {
		if (_base.isTypeScriptEnabled) _typescript.tsParseMaybeDecoratorArguments.call(void 0);
		else baseParseMaybeDecoratorArguments();
	}
	function baseParseMaybeDecoratorArguments() {
		if (_tokenizer.eat.call(void 0, _types.TokenType.parenL)) _expression.parseCallExpressionArguments.call(void 0);
	}
	exports.baseParseMaybeDecoratorArguments = baseParseMaybeDecoratorArguments;
	function parseBreakContinueStatement() {
		_tokenizer.next.call(void 0);
		if (!_util.isLineTerminator.call(void 0)) {
			_expression.parseIdentifier.call(void 0);
			_util.semicolon.call(void 0);
		}
	}
	function parseDebuggerStatement() {
		_tokenizer.next.call(void 0);
		_util.semicolon.call(void 0);
	}
	function parseDoStatement() {
		_tokenizer.next.call(void 0);
		parseStatement(false);
		_util.expect.call(void 0, _types.TokenType._while);
		_expression.parseParenExpression.call(void 0);
		_tokenizer.eat.call(void 0, _types.TokenType.semi);
	}
	function parseForStatement() {
		_base.state.scopeDepth++;
		const startTokenIndex = _base.state.tokens.length;
		parseAmbiguousForStatement();
		const endTokenIndex = _base.state.tokens.length;
		_base.state.scopes.push(new _state.Scope(startTokenIndex, endTokenIndex, false));
		_base.state.scopeDepth--;
	}
	/**
	* Determine if this token is a `using` declaration (explicit resource
	* management) as part of a loop.
	* https://github.com/tc39/proposal-explicit-resource-management
	*/
	function isUsingInLoop() {
		if (!_util.isContextual.call(void 0, _keywords.ContextualKeyword._using)) return false;
		if (_util.isLookaheadContextual.call(void 0, _keywords.ContextualKeyword._of)) return false;
		return true;
	}
	function parseAmbiguousForStatement() {
		_tokenizer.next.call(void 0);
		let forAwait = false;
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._await)) {
			forAwait = true;
			_tokenizer.next.call(void 0);
		}
		_util.expect.call(void 0, _types.TokenType.parenL);
		if (_tokenizer.match.call(void 0, _types.TokenType.semi)) {
			if (forAwait) _util.unexpected.call(void 0);
			parseFor();
			return;
		}
		const isAwaitUsing = startsAwaitUsing();
		if (isAwaitUsing || _tokenizer.match.call(void 0, _types.TokenType._var) || _tokenizer.match.call(void 0, _types.TokenType._let) || _tokenizer.match.call(void 0, _types.TokenType._const) || isUsingInLoop()) {
			if (isAwaitUsing) _util.expectContextual.call(void 0, _keywords.ContextualKeyword._await);
			_tokenizer.next.call(void 0);
			parseVar(true, _base.state.type !== _types.TokenType._var);
			if (_tokenizer.match.call(void 0, _types.TokenType._in) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._of)) {
				parseForIn(forAwait);
				return;
			}
			parseFor();
			return;
		}
		_expression.parseExpression.call(void 0, true);
		if (_tokenizer.match.call(void 0, _types.TokenType._in) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._of)) {
			parseForIn(forAwait);
			return;
		}
		if (forAwait) _util.unexpected.call(void 0);
		parseFor();
	}
	function parseFunctionStatement() {
		const functionStart = _base.state.start;
		_tokenizer.next.call(void 0);
		parseFunction(functionStart, true);
	}
	function parseIfStatement() {
		_tokenizer.next.call(void 0);
		_expression.parseParenExpression.call(void 0);
		parseStatement(false);
		if (_tokenizer.eat.call(void 0, _types.TokenType._else)) parseStatement(false);
	}
	function parseReturnStatement() {
		_tokenizer.next.call(void 0);
		if (!_util.isLineTerminator.call(void 0)) {
			_expression.parseExpression.call(void 0);
			_util.semicolon.call(void 0);
		}
	}
	function parseSwitchStatement() {
		_tokenizer.next.call(void 0);
		_expression.parseParenExpression.call(void 0);
		_base.state.scopeDepth++;
		const startTokenIndex = _base.state.tokens.length;
		_util.expect.call(void 0, _types.TokenType.braceL);
		while (!_tokenizer.match.call(void 0, _types.TokenType.braceR) && !_base.state.error) if (_tokenizer.match.call(void 0, _types.TokenType._case) || _tokenizer.match.call(void 0, _types.TokenType._default)) {
			const isCase = _tokenizer.match.call(void 0, _types.TokenType._case);
			_tokenizer.next.call(void 0);
			if (isCase) _expression.parseExpression.call(void 0);
			_util.expect.call(void 0, _types.TokenType.colon);
		} else parseStatement(true);
		_tokenizer.next.call(void 0);
		const endTokenIndex = _base.state.tokens.length;
		_base.state.scopes.push(new _state.Scope(startTokenIndex, endTokenIndex, false));
		_base.state.scopeDepth--;
	}
	function parseThrowStatement() {
		_tokenizer.next.call(void 0);
		_expression.parseExpression.call(void 0);
		_util.semicolon.call(void 0);
	}
	function parseCatchClauseParam() {
		_lval.parseBindingAtom.call(void 0, true);
		if (_base.isTypeScriptEnabled) _typescript.tsTryParseTypeAnnotation.call(void 0);
	}
	function parseTryStatement() {
		_tokenizer.next.call(void 0);
		parseBlock();
		if (_tokenizer.match.call(void 0, _types.TokenType._catch)) {
			_tokenizer.next.call(void 0);
			let catchBindingStartTokenIndex = null;
			if (_tokenizer.match.call(void 0, _types.TokenType.parenL)) {
				_base.state.scopeDepth++;
				catchBindingStartTokenIndex = _base.state.tokens.length;
				_util.expect.call(void 0, _types.TokenType.parenL);
				parseCatchClauseParam();
				_util.expect.call(void 0, _types.TokenType.parenR);
			}
			parseBlock();
			if (catchBindingStartTokenIndex != null) {
				const endTokenIndex = _base.state.tokens.length;
				_base.state.scopes.push(new _state.Scope(catchBindingStartTokenIndex, endTokenIndex, false));
				_base.state.scopeDepth--;
			}
		}
		if (_tokenizer.eat.call(void 0, _types.TokenType._finally)) parseBlock();
	}
	function parseVarStatement(isBlockScope) {
		_tokenizer.next.call(void 0);
		parseVar(false, isBlockScope);
		_util.semicolon.call(void 0);
	}
	exports.parseVarStatement = parseVarStatement;
	function parseWhileStatement() {
		_tokenizer.next.call(void 0);
		_expression.parseParenExpression.call(void 0);
		parseStatement(false);
	}
	function parseEmptyStatement() {
		_tokenizer.next.call(void 0);
	}
	function parseLabeledStatement() {
		parseStatement(true);
	}
	/**
	* Parse a statement starting with an identifier of the given name. Subclasses match on the name
	* to handle statements like "declare".
	*/
	function parseIdentifierStatement(contextualKeyword) {
		if (_base.isTypeScriptEnabled) _typescript.tsParseIdentifierStatement.call(void 0, contextualKeyword);
		else if (_base.isFlowEnabled) _flow.flowParseIdentifierStatement.call(void 0, contextualKeyword);
		else _util.semicolon.call(void 0);
	}
	function parseBlock(isFunctionScope = false, contextId = 0) {
		const startTokenIndex = _base.state.tokens.length;
		_base.state.scopeDepth++;
		_util.expect.call(void 0, _types.TokenType.braceL);
		if (contextId) _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
		parseBlockBody(_types.TokenType.braceR);
		if (contextId) _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
		const endTokenIndex = _base.state.tokens.length;
		_base.state.scopes.push(new _state.Scope(startTokenIndex, endTokenIndex, isFunctionScope));
		_base.state.scopeDepth--;
	}
	exports.parseBlock = parseBlock;
	function parseBlockBody(end) {
		while (!_tokenizer.eat.call(void 0, end) && !_base.state.error) parseStatement(true);
	}
	exports.parseBlockBody = parseBlockBody;
	function parseFor() {
		_util.expect.call(void 0, _types.TokenType.semi);
		if (!_tokenizer.match.call(void 0, _types.TokenType.semi)) _expression.parseExpression.call(void 0);
		_util.expect.call(void 0, _types.TokenType.semi);
		if (!_tokenizer.match.call(void 0, _types.TokenType.parenR)) _expression.parseExpression.call(void 0);
		_util.expect.call(void 0, _types.TokenType.parenR);
		parseStatement(false);
	}
	function parseForIn(forAwait) {
		if (forAwait) _util.eatContextual.call(void 0, _keywords.ContextualKeyword._of);
		else _tokenizer.next.call(void 0);
		_expression.parseExpression.call(void 0);
		_util.expect.call(void 0, _types.TokenType.parenR);
		parseStatement(false);
	}
	function parseVar(isFor, isBlockScope) {
		while (true) {
			parseVarHead(isBlockScope);
			if (_tokenizer.eat.call(void 0, _types.TokenType.eq)) {
				const eqIndex = _base.state.tokens.length - 1;
				_expression.parseMaybeAssign.call(void 0, isFor);
				_base.state.tokens[eqIndex].rhsEndIndex = _base.state.tokens.length;
			}
			if (!_tokenizer.eat.call(void 0, _types.TokenType.comma)) break;
		}
	}
	function parseVarHead(isBlockScope) {
		_lval.parseBindingAtom.call(void 0, isBlockScope);
		if (_base.isTypeScriptEnabled) _typescript.tsAfterParseVarHead.call(void 0);
		else if (_base.isFlowEnabled) _flow.flowAfterParseVarHead.call(void 0);
	}
	function parseFunction(functionStart, isStatement, optionalId = false) {
		if (_tokenizer.match.call(void 0, _types.TokenType.star)) _tokenizer.next.call(void 0);
		if (isStatement && !optionalId && !_tokenizer.match.call(void 0, _types.TokenType.name) && !_tokenizer.match.call(void 0, _types.TokenType._yield)) _util.unexpected.call(void 0);
		let nameScopeStartTokenIndex = null;
		if (_tokenizer.match.call(void 0, _types.TokenType.name)) {
			if (!isStatement) {
				nameScopeStartTokenIndex = _base.state.tokens.length;
				_base.state.scopeDepth++;
			}
			_lval.parseBindingIdentifier.call(void 0, false);
		}
		const startTokenIndex = _base.state.tokens.length;
		_base.state.scopeDepth++;
		parseFunctionParams();
		_expression.parseFunctionBodyAndFinish.call(void 0, functionStart);
		const endTokenIndex = _base.state.tokens.length;
		_base.state.scopes.push(new _state.Scope(startTokenIndex, endTokenIndex, true));
		_base.state.scopeDepth--;
		if (nameScopeStartTokenIndex !== null) {
			_base.state.scopes.push(new _state.Scope(nameScopeStartTokenIndex, endTokenIndex, true));
			_base.state.scopeDepth--;
		}
	}
	exports.parseFunction = parseFunction;
	function parseFunctionParams(allowModifiers = false, funcContextId = 0) {
		if (_base.isTypeScriptEnabled) _typescript.tsStartParseFunctionParams.call(void 0);
		else if (_base.isFlowEnabled) _flow.flowStartParseFunctionParams.call(void 0);
		_util.expect.call(void 0, _types.TokenType.parenL);
		if (funcContextId) _base.state.tokens[_base.state.tokens.length - 1].contextId = funcContextId;
		_lval.parseBindingList.call(void 0, _types.TokenType.parenR, false, false, allowModifiers, funcContextId);
		if (funcContextId) _base.state.tokens[_base.state.tokens.length - 1].contextId = funcContextId;
	}
	exports.parseFunctionParams = parseFunctionParams;
	function parseClass(isStatement, optionalId = false) {
		const contextId = _base.getNextContextId.call(void 0);
		_tokenizer.next.call(void 0);
		_base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
		_base.state.tokens[_base.state.tokens.length - 1].isExpression = !isStatement;
		let nameScopeStartTokenIndex = null;
		if (!isStatement) {
			nameScopeStartTokenIndex = _base.state.tokens.length;
			_base.state.scopeDepth++;
		}
		parseClassId(isStatement, optionalId);
		parseClassSuper();
		const openBraceIndex = _base.state.tokens.length;
		parseClassBody(contextId);
		if (_base.state.error) return;
		_base.state.tokens[openBraceIndex].contextId = contextId;
		_base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
		if (nameScopeStartTokenIndex !== null) {
			const endTokenIndex = _base.state.tokens.length;
			_base.state.scopes.push(new _state.Scope(nameScopeStartTokenIndex, endTokenIndex, false));
			_base.state.scopeDepth--;
		}
	}
	exports.parseClass = parseClass;
	function isClassProperty() {
		return _tokenizer.match.call(void 0, _types.TokenType.eq) || _tokenizer.match.call(void 0, _types.TokenType.semi) || _tokenizer.match.call(void 0, _types.TokenType.braceR) || _tokenizer.match.call(void 0, _types.TokenType.bang) || _tokenizer.match.call(void 0, _types.TokenType.colon);
	}
	function isClassMethod() {
		return _tokenizer.match.call(void 0, _types.TokenType.parenL) || _tokenizer.match.call(void 0, _types.TokenType.lessThan);
	}
	function parseClassBody(classContextId) {
		_util.expect.call(void 0, _types.TokenType.braceL);
		while (!_tokenizer.eat.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
			if (_tokenizer.eat.call(void 0, _types.TokenType.semi)) continue;
			if (_tokenizer.match.call(void 0, _types.TokenType.at)) {
				parseDecorator();
				continue;
			}
			const memberStart = _base.state.start;
			parseClassMember(memberStart, classContextId);
		}
	}
	function parseClassMember(memberStart, classContextId) {
		if (_base.isTypeScriptEnabled) _typescript.tsParseModifiers.call(void 0, [
			_keywords.ContextualKeyword._declare,
			_keywords.ContextualKeyword._public,
			_keywords.ContextualKeyword._protected,
			_keywords.ContextualKeyword._private,
			_keywords.ContextualKeyword._override
		]);
		let isStatic = false;
		if (_tokenizer.match.call(void 0, _types.TokenType.name) && _base.state.contextualKeyword === _keywords.ContextualKeyword._static) {
			_expression.parseIdentifier.call(void 0);
			if (isClassMethod()) {
				parseClassMethod(memberStart, false);
				return;
			} else if (isClassProperty()) {
				parseClassProperty();
				return;
			}
			_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._static;
			isStatic = true;
			if (_tokenizer.match.call(void 0, _types.TokenType.braceL)) {
				_base.state.tokens[_base.state.tokens.length - 1].contextId = classContextId;
				parseBlock();
				return;
			}
		}
		parseClassMemberWithIsStatic(memberStart, isStatic, classContextId);
	}
	function parseClassMemberWithIsStatic(memberStart, isStatic, classContextId) {
		if (_base.isTypeScriptEnabled) {
			if (_typescript.tsTryParseClassMemberWithIsStatic.call(void 0, isStatic)) return;
		}
		if (_tokenizer.eat.call(void 0, _types.TokenType.star)) {
			parseClassPropertyName(classContextId);
			parseClassMethod(memberStart, false);
			return;
		}
		parseClassPropertyName(classContextId);
		let isConstructor = false;
		const token = _base.state.tokens[_base.state.tokens.length - 1];
		if (token.contextualKeyword === _keywords.ContextualKeyword._constructor) isConstructor = true;
		parsePostMemberNameModifiers();
		if (isClassMethod()) parseClassMethod(memberStart, isConstructor);
		else if (isClassProperty()) parseClassProperty();
		else if (token.contextualKeyword === _keywords.ContextualKeyword._async && !_util.isLineTerminator.call(void 0)) {
			_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._async;
			if (_tokenizer.match.call(void 0, _types.TokenType.star)) _tokenizer.next.call(void 0);
			parseClassPropertyName(classContextId);
			parsePostMemberNameModifiers();
			parseClassMethod(memberStart, false);
		} else if ((token.contextualKeyword === _keywords.ContextualKeyword._get || token.contextualKeyword === _keywords.ContextualKeyword._set) && !(_util.isLineTerminator.call(void 0) && _tokenizer.match.call(void 0, _types.TokenType.star))) {
			if (token.contextualKeyword === _keywords.ContextualKeyword._get) _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._get;
			else _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._set;
			parseClassPropertyName(classContextId);
			parseClassMethod(memberStart, false);
		} else if (token.contextualKeyword === _keywords.ContextualKeyword._accessor && !_util.isLineTerminator.call(void 0)) {
			parseClassPropertyName(classContextId);
			parseClassProperty();
		} else if (_util.isLineTerminator.call(void 0)) parseClassProperty();
		else _util.unexpected.call(void 0);
	}
	function parseClassMethod(functionStart, isConstructor) {
		if (_base.isTypeScriptEnabled) _typescript.tsTryParseTypeParameters.call(void 0);
		else if (_base.isFlowEnabled) {
			if (_tokenizer.match.call(void 0, _types.TokenType.lessThan)) _flow.flowParseTypeParameterDeclaration.call(void 0);
		}
		_expression.parseMethod.call(void 0, functionStart, isConstructor);
	}
	function parseClassPropertyName(classContextId) {
		_expression.parsePropertyName.call(void 0, classContextId);
	}
	exports.parseClassPropertyName = parseClassPropertyName;
	function parsePostMemberNameModifiers() {
		if (_base.isTypeScriptEnabled) {
			const oldIsType = _tokenizer.pushTypeContext.call(void 0, 0);
			_tokenizer.eat.call(void 0, _types.TokenType.question);
			_tokenizer.popTypeContext.call(void 0, oldIsType);
		}
	}
	exports.parsePostMemberNameModifiers = parsePostMemberNameModifiers;
	function parseClassProperty() {
		if (_base.isTypeScriptEnabled) {
			_tokenizer.eatTypeToken.call(void 0, _types.TokenType.bang);
			_typescript.tsTryParseTypeAnnotation.call(void 0);
		} else if (_base.isFlowEnabled) {
			if (_tokenizer.match.call(void 0, _types.TokenType.colon)) _flow.flowParseTypeAnnotation.call(void 0);
		}
		if (_tokenizer.match.call(void 0, _types.TokenType.eq)) {
			const equalsTokenIndex = _base.state.tokens.length;
			_tokenizer.next.call(void 0);
			_expression.parseMaybeAssign.call(void 0);
			_base.state.tokens[equalsTokenIndex].rhsEndIndex = _base.state.tokens.length;
		}
		_util.semicolon.call(void 0);
	}
	exports.parseClassProperty = parseClassProperty;
	function parseClassId(isStatement, optionalId = false) {
		if (_base.isTypeScriptEnabled && (!isStatement || optionalId) && _util.isContextual.call(void 0, _keywords.ContextualKeyword._implements)) return;
		if (_tokenizer.match.call(void 0, _types.TokenType.name)) _lval.parseBindingIdentifier.call(void 0, true);
		if (_base.isTypeScriptEnabled) _typescript.tsTryParseTypeParameters.call(void 0);
		else if (_base.isFlowEnabled) {
			if (_tokenizer.match.call(void 0, _types.TokenType.lessThan)) _flow.flowParseTypeParameterDeclaration.call(void 0);
		}
	}
	function parseClassSuper() {
		let hasSuper = false;
		if (_tokenizer.eat.call(void 0, _types.TokenType._extends)) {
			_expression.parseExprSubscripts.call(void 0);
			hasSuper = true;
		} else hasSuper = false;
		if (_base.isTypeScriptEnabled) _typescript.tsAfterParseClassSuper.call(void 0, hasSuper);
		else if (_base.isFlowEnabled) _flow.flowAfterParseClassSuper.call(void 0, hasSuper);
	}
	function parseExport() {
		const exportIndex = _base.state.tokens.length - 1;
		if (_base.isTypeScriptEnabled) {
			if (_typescript.tsTryParseExport.call(void 0)) return;
		}
		if (shouldParseExportStar()) parseExportStar();
		else if (isExportDefaultSpecifier()) {
			_expression.parseIdentifier.call(void 0);
			if (_tokenizer.match.call(void 0, _types.TokenType.comma) && _tokenizer.lookaheadType.call(void 0) === _types.TokenType.star) {
				_util.expect.call(void 0, _types.TokenType.comma);
				_util.expect.call(void 0, _types.TokenType.star);
				_util.expectContextual.call(void 0, _keywords.ContextualKeyword._as);
				_expression.parseIdentifier.call(void 0);
			} else parseExportSpecifiersMaybe();
			parseExportFrom();
		} else if (_tokenizer.eat.call(void 0, _types.TokenType._default)) parseExportDefaultExpression();
		else if (shouldParseExportDeclaration()) parseExportDeclaration();
		else {
			parseExportSpecifiers();
			parseExportFrom();
		}
		_base.state.tokens[exportIndex].rhsEndIndex = _base.state.tokens.length;
	}
	exports.parseExport = parseExport;
	function parseExportDefaultExpression() {
		if (_base.isTypeScriptEnabled) {
			if (_typescript.tsTryParseExportDefaultExpression.call(void 0)) return;
		}
		if (_base.isFlowEnabled) {
			if (_flow.flowTryParseExportDefaultExpression.call(void 0)) return;
		}
		const functionStart = _base.state.start;
		if (_tokenizer.eat.call(void 0, _types.TokenType._function)) parseFunction(functionStart, true, true);
		else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._async) && _tokenizer.lookaheadType.call(void 0) === _types.TokenType._function) {
			_util.eatContextual.call(void 0, _keywords.ContextualKeyword._async);
			_tokenizer.eat.call(void 0, _types.TokenType._function);
			parseFunction(functionStart, true, true);
		} else if (_tokenizer.match.call(void 0, _types.TokenType._class)) parseClass(true, true);
		else if (_tokenizer.match.call(void 0, _types.TokenType.at)) {
			parseDecorators();
			parseClass(true, true);
		} else {
			_expression.parseMaybeAssign.call(void 0);
			_util.semicolon.call(void 0);
		}
	}
	function parseExportDeclaration() {
		if (_base.isTypeScriptEnabled) _typescript.tsParseExportDeclaration.call(void 0);
		else if (_base.isFlowEnabled) _flow.flowParseExportDeclaration.call(void 0);
		else parseStatement(true);
	}
	function isExportDefaultSpecifier() {
		if (_base.isTypeScriptEnabled && _typescript.tsIsDeclarationStart.call(void 0)) return false;
		else if (_base.isFlowEnabled && _flow.flowShouldDisallowExportDefaultSpecifier.call(void 0)) return false;
		if (_tokenizer.match.call(void 0, _types.TokenType.name)) return _base.state.contextualKeyword !== _keywords.ContextualKeyword._async;
		if (!_tokenizer.match.call(void 0, _types.TokenType._default)) return false;
		const _next = _tokenizer.nextTokenStart.call(void 0);
		const lookahead = _tokenizer.lookaheadTypeAndKeyword.call(void 0);
		const hasFrom = lookahead.type === _types.TokenType.name && lookahead.contextualKeyword === _keywords.ContextualKeyword._from;
		if (lookahead.type === _types.TokenType.comma) return true;
		if (hasFrom) {
			const nextAfterFrom = _base.input.charCodeAt(_tokenizer.nextTokenStartSince.call(void 0, _next + 4));
			return nextAfterFrom === _charcodes.charCodes.quotationMark || nextAfterFrom === _charcodes.charCodes.apostrophe;
		}
		return false;
	}
	function parseExportSpecifiersMaybe() {
		if (_tokenizer.eat.call(void 0, _types.TokenType.comma)) parseExportSpecifiers();
	}
	function parseExportFrom() {
		if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._from)) {
			_expression.parseExprAtom.call(void 0);
			maybeParseImportAttributes();
		}
		_util.semicolon.call(void 0);
	}
	exports.parseExportFrom = parseExportFrom;
	function shouldParseExportStar() {
		if (_base.isFlowEnabled) return _flow.flowShouldParseExportStar.call(void 0);
		else return _tokenizer.match.call(void 0, _types.TokenType.star);
	}
	function parseExportStar() {
		if (_base.isFlowEnabled) _flow.flowParseExportStar.call(void 0);
		else baseParseExportStar();
	}
	function baseParseExportStar() {
		_util.expect.call(void 0, _types.TokenType.star);
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._as)) parseExportNamespace();
		else parseExportFrom();
	}
	exports.baseParseExportStar = baseParseExportStar;
	function parseExportNamespace() {
		_tokenizer.next.call(void 0);
		_base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._as;
		_expression.parseIdentifier.call(void 0);
		parseExportSpecifiersMaybe();
		parseExportFrom();
	}
	function shouldParseExportDeclaration() {
		return _base.isTypeScriptEnabled && _typescript.tsIsDeclarationStart.call(void 0) || _base.isFlowEnabled && _flow.flowShouldParseExportDeclaration.call(void 0) || _base.state.type === _types.TokenType._var || _base.state.type === _types.TokenType._const || _base.state.type === _types.TokenType._let || _base.state.type === _types.TokenType._function || _base.state.type === _types.TokenType._class || _util.isContextual.call(void 0, _keywords.ContextualKeyword._async) || _tokenizer.match.call(void 0, _types.TokenType.at);
	}
	function parseExportSpecifiers() {
		let first = true;
		_util.expect.call(void 0, _types.TokenType.braceL);
		while (!_tokenizer.eat.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
			if (first) first = false;
			else {
				_util.expect.call(void 0, _types.TokenType.comma);
				if (_tokenizer.eat.call(void 0, _types.TokenType.braceR)) break;
			}
			parseExportSpecifier();
		}
	}
	exports.parseExportSpecifiers = parseExportSpecifiers;
	function parseExportSpecifier() {
		if (_base.isTypeScriptEnabled) {
			_typescript.tsParseExportSpecifier.call(void 0);
			return;
		}
		_expression.parseIdentifier.call(void 0);
		_base.state.tokens[_base.state.tokens.length - 1].identifierRole = _tokenizer.IdentifierRole.ExportAccess;
		if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._as)) _expression.parseIdentifier.call(void 0);
	}
	/**
	* Starting at the `module` token in an import, determine if it was truly an
	* import reflection token or just looks like one.
	*
	* Returns true for:
	* import module foo from "foo";
	* import module from from "foo";
	*
	* Returns false for:
	* import module from "foo";
	* import module, {bar} from "foo";
	*/
	function isImportReflection() {
		const snapshot = _base.state.snapshot();
		_util.expectContextual.call(void 0, _keywords.ContextualKeyword._module);
		if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._from)) {
			if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._from)) {
				_base.state.restoreFromSnapshot(snapshot);
				return true;
			} else {
				_base.state.restoreFromSnapshot(snapshot);
				return false;
			}
		} else if (_tokenizer.match.call(void 0, _types.TokenType.comma)) {
			_base.state.restoreFromSnapshot(snapshot);
			return false;
		} else {
			_base.state.restoreFromSnapshot(snapshot);
			return true;
		}
	}
	/**
	* Eat the "module" token from the import reflection proposal.
	* https://github.com/tc39/proposal-import-reflection
	*/
	function parseMaybeImportReflection() {
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._module) && isImportReflection()) _tokenizer.next.call(void 0);
	}
	function parseImport() {
		if (_base.isTypeScriptEnabled && _tokenizer.match.call(void 0, _types.TokenType.name) && _tokenizer.lookaheadType.call(void 0) === _types.TokenType.eq) {
			_typescript.tsParseImportEqualsDeclaration.call(void 0);
			return;
		}
		if (_base.isTypeScriptEnabled && _util.isContextual.call(void 0, _keywords.ContextualKeyword._type)) {
			const lookahead = _tokenizer.lookaheadTypeAndKeyword.call(void 0);
			if (lookahead.type === _types.TokenType.name && lookahead.contextualKeyword !== _keywords.ContextualKeyword._from) {
				_util.expectContextual.call(void 0, _keywords.ContextualKeyword._type);
				if (_tokenizer.lookaheadType.call(void 0) === _types.TokenType.eq) {
					_typescript.tsParseImportEqualsDeclaration.call(void 0);
					return;
				}
			} else if (lookahead.type === _types.TokenType.star || lookahead.type === _types.TokenType.braceL) _util.expectContextual.call(void 0, _keywords.ContextualKeyword._type);
		}
		if (_tokenizer.match.call(void 0, _types.TokenType.string)) _expression.parseExprAtom.call(void 0);
		else {
			parseMaybeImportReflection();
			parseImportSpecifiers();
			_util.expectContextual.call(void 0, _keywords.ContextualKeyword._from);
			_expression.parseExprAtom.call(void 0);
		}
		maybeParseImportAttributes();
		_util.semicolon.call(void 0);
	}
	exports.parseImport = parseImport;
	function shouldParseDefaultImport() {
		return _tokenizer.match.call(void 0, _types.TokenType.name);
	}
	function parseImportSpecifierLocal() {
		_lval.parseImportedIdentifier.call(void 0);
	}
	function parseImportSpecifiers() {
		if (_base.isFlowEnabled) _flow.flowStartParseImportSpecifiers.call(void 0);
		let first = true;
		if (shouldParseDefaultImport()) {
			parseImportSpecifierLocal();
			if (!_tokenizer.eat.call(void 0, _types.TokenType.comma)) return;
		}
		if (_tokenizer.match.call(void 0, _types.TokenType.star)) {
			_tokenizer.next.call(void 0);
			_util.expectContextual.call(void 0, _keywords.ContextualKeyword._as);
			parseImportSpecifierLocal();
			return;
		}
		_util.expect.call(void 0, _types.TokenType.braceL);
		while (!_tokenizer.eat.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
			if (first) first = false;
			else {
				if (_tokenizer.eat.call(void 0, _types.TokenType.colon)) _util.unexpected.call(void 0, "ES2015 named imports do not destructure. Use another statement for destructuring after the import.");
				_util.expect.call(void 0, _types.TokenType.comma);
				if (_tokenizer.eat.call(void 0, _types.TokenType.braceR)) break;
			}
			parseImportSpecifier();
		}
	}
	function parseImportSpecifier() {
		if (_base.isTypeScriptEnabled) {
			_typescript.tsParseImportSpecifier.call(void 0);
			return;
		}
		if (_base.isFlowEnabled) {
			_flow.flowParseImportSpecifier.call(void 0);
			return;
		}
		_lval.parseImportedIdentifier.call(void 0);
		if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._as)) {
			_base.state.tokens[_base.state.tokens.length - 1].identifierRole = _tokenizer.IdentifierRole.ImportAccess;
			_tokenizer.next.call(void 0);
			_lval.parseImportedIdentifier.call(void 0);
		}
	}
	/**
	* Parse import attributes like `with {type: "json"}`, or the legacy form
	* `assert {type: "json"}`.
	*
	* Import attributes technically have their own syntax, but are always parseable
	* as a plain JS object, so just do that for simplicity.
	*/
	function maybeParseImportAttributes() {
		if (_tokenizer.match.call(void 0, _types.TokenType._with) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._assert) && !_util.hasPrecedingLineBreak.call(void 0)) {
			_tokenizer.next.call(void 0);
			_expression.parseObj.call(void 0, false, false);
		}
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/traverser/index.js
var require_traverser = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _index = require_tokenizer();
	var _charcodes = require_charcodes();
	var _base = require_base();
	var _statement = require_statement();
	function parseFile() {
		if (_base.state.pos === 0 && _base.input.charCodeAt(0) === _charcodes.charCodes.numberSign && _base.input.charCodeAt(1) === _charcodes.charCodes.exclamationMark) _index.skipLineComment.call(void 0, 2);
		_index.nextToken.call(void 0);
		return _statement.parseTopLevel.call(void 0);
	}
	exports.parseFile = parseFile;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/parser/index.js
var require_parser = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _base = require_base();
	var _index = require_traverser();
	var File = class {
		constructor(tokens, scopes) {
			this.tokens = tokens;
			this.scopes = scopes;
		}
	};
	exports.File = File;
	function parse(input, isJSXEnabled, isTypeScriptEnabled, isFlowEnabled) {
		if (isFlowEnabled && isTypeScriptEnabled) throw new Error("Cannot combine flow and typescript plugins.");
		_base.initParser.call(void 0, input, isJSXEnabled, isTypeScriptEnabled, isFlowEnabled);
		const result = _index.parseFile.call(void 0);
		if (_base.state.error) throw _base.augmentError.call(void 0, _base.state.error);
		return result;
	}
	exports.parse = parse;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/util/isAsyncOperation.js
var require_isAsyncOperation = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _keywords = require_keywords();
	/**
	* Determine whether this optional chain or nullish coalescing operation has any await statements in
	* it. If so, we'll need to transpile to an async operation.
	*
	* We compute this by walking the length of the operation and returning true if we see an await
	* keyword used as a real await (rather than an object key or property access). Nested optional
	* chain/nullish operations need to be tracked but don't silence await, but a nested async function
	* (or any other nested scope) will make the await not count.
	*/
	function isAsyncOperation(tokens) {
		let index = tokens.currentIndex();
		let depth = 0;
		const startToken = tokens.currentToken();
		do {
			const token = tokens.tokens[index];
			if (token.isOptionalChainStart) depth++;
			if (token.isOptionalChainEnd) depth--;
			depth += token.numNullishCoalesceStarts;
			depth -= token.numNullishCoalesceEnds;
			if (token.contextualKeyword === _keywords.ContextualKeyword._await && token.identifierRole == null && token.scopeDepth === startToken.scopeDepth) return true;
			index += 1;
		} while (depth > 0 && index < tokens.tokens.length);
		return false;
	}
	exports.default = isAsyncOperation;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/TokenProcessor.js
var require_TokenProcessor = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _types = require_types$2();
	var _isAsyncOperation2 = _interopRequireDefault(require_isAsyncOperation());
	exports.default = class TokenProcessor {
		__init() {
			this.resultCode = "";
		}
		__init2() {
			this.resultMappings = new Array(this.tokens.length);
		}
		__init3() {
			this.tokenIndex = 0;
		}
		constructor(code, tokens, isFlowEnabled, disableESTransforms, helperManager) {
			this.code = code;
			this.tokens = tokens;
			this.isFlowEnabled = isFlowEnabled;
			this.disableESTransforms = disableESTransforms;
			this.helperManager = helperManager;
			TokenProcessor.prototype.__init.call(this);
			TokenProcessor.prototype.__init2.call(this);
			TokenProcessor.prototype.__init3.call(this);
		}
		/**
		* Snapshot the token state in a way that can be restored later, useful for
		* things like lookahead.
		*
		* resultMappings do not need to be copied since in all use cases, they will
		* be overwritten anyway after restore.
		*/
		snapshot() {
			return {
				resultCode: this.resultCode,
				tokenIndex: this.tokenIndex
			};
		}
		restoreToSnapshot(snapshot) {
			this.resultCode = snapshot.resultCode;
			this.tokenIndex = snapshot.tokenIndex;
		}
		/**
		* Remove and return the code generated since the snapshot, leaving the
		* current token position in-place. Unlike most TokenProcessor operations,
		* this operation can result in input/output line number mismatches because
		* the removed code may contain newlines, so this operation should be used
		* sparingly.
		*/
		dangerouslyGetAndRemoveCodeSinceSnapshot(snapshot) {
			const result = this.resultCode.slice(snapshot.resultCode.length);
			this.resultCode = snapshot.resultCode;
			return result;
		}
		reset() {
			this.resultCode = "";
			this.resultMappings = new Array(this.tokens.length);
			this.tokenIndex = 0;
		}
		matchesContextualAtIndex(index, contextualKeyword) {
			return this.matches1AtIndex(index, _types.TokenType.name) && this.tokens[index].contextualKeyword === contextualKeyword;
		}
		identifierNameAtIndex(index) {
			return this.identifierNameForToken(this.tokens[index]);
		}
		identifierNameAtRelativeIndex(relativeIndex) {
			return this.identifierNameForToken(this.tokenAtRelativeIndex(relativeIndex));
		}
		identifierName() {
			return this.identifierNameForToken(this.currentToken());
		}
		identifierNameForToken(token) {
			return this.code.slice(token.start, token.end);
		}
		rawCodeForToken(token) {
			return this.code.slice(token.start, token.end);
		}
		stringValueAtIndex(index) {
			return this.stringValueForToken(this.tokens[index]);
		}
		stringValue() {
			return this.stringValueForToken(this.currentToken());
		}
		stringValueForToken(token) {
			return this.code.slice(token.start + 1, token.end - 1);
		}
		matches1AtIndex(index, t1) {
			return this.tokens[index].type === t1;
		}
		matches2AtIndex(index, t1, t2) {
			return this.tokens[index].type === t1 && this.tokens[index + 1].type === t2;
		}
		matches3AtIndex(index, t1, t2, t3) {
			return this.tokens[index].type === t1 && this.tokens[index + 1].type === t2 && this.tokens[index + 2].type === t3;
		}
		matches1(t1) {
			return this.tokens[this.tokenIndex].type === t1;
		}
		matches2(t1, t2) {
			return this.tokens[this.tokenIndex].type === t1 && this.tokens[this.tokenIndex + 1].type === t2;
		}
		matches3(t1, t2, t3) {
			return this.tokens[this.tokenIndex].type === t1 && this.tokens[this.tokenIndex + 1].type === t2 && this.tokens[this.tokenIndex + 2].type === t3;
		}
		matches4(t1, t2, t3, t4) {
			return this.tokens[this.tokenIndex].type === t1 && this.tokens[this.tokenIndex + 1].type === t2 && this.tokens[this.tokenIndex + 2].type === t3 && this.tokens[this.tokenIndex + 3].type === t4;
		}
		matches5(t1, t2, t3, t4, t5) {
			return this.tokens[this.tokenIndex].type === t1 && this.tokens[this.tokenIndex + 1].type === t2 && this.tokens[this.tokenIndex + 2].type === t3 && this.tokens[this.tokenIndex + 3].type === t4 && this.tokens[this.tokenIndex + 4].type === t5;
		}
		matchesContextual(contextualKeyword) {
			return this.matchesContextualAtIndex(this.tokenIndex, contextualKeyword);
		}
		matchesContextIdAndLabel(type, contextId) {
			return this.matches1(type) && this.currentToken().contextId === contextId;
		}
		previousWhitespaceAndComments() {
			let whitespaceAndComments = this.code.slice(this.tokenIndex > 0 ? this.tokens[this.tokenIndex - 1].end : 0, this.tokenIndex < this.tokens.length ? this.tokens[this.tokenIndex].start : this.code.length);
			if (this.isFlowEnabled) whitespaceAndComments = whitespaceAndComments.replace(/@flow/g, "");
			return whitespaceAndComments;
		}
		replaceToken(newCode) {
			this.resultCode += this.previousWhitespaceAndComments();
			this.appendTokenPrefix();
			this.resultMappings[this.tokenIndex] = this.resultCode.length;
			this.resultCode += newCode;
			this.appendTokenSuffix();
			this.tokenIndex++;
		}
		replaceTokenTrimmingLeftWhitespace(newCode) {
			this.resultCode += this.previousWhitespaceAndComments().replace(/[^\r\n]/g, "");
			this.appendTokenPrefix();
			this.resultMappings[this.tokenIndex] = this.resultCode.length;
			this.resultCode += newCode;
			this.appendTokenSuffix();
			this.tokenIndex++;
		}
		removeInitialToken() {
			this.replaceToken("");
		}
		removeToken() {
			this.replaceTokenTrimmingLeftWhitespace("");
		}
		/**
		* Remove all code until the next }, accounting for balanced braces.
		*/
		removeBalancedCode() {
			let braceDepth = 0;
			while (!this.isAtEnd()) {
				if (this.matches1(_types.TokenType.braceL)) braceDepth++;
				else if (this.matches1(_types.TokenType.braceR)) {
					if (braceDepth === 0) return;
					braceDepth--;
				}
				this.removeToken();
			}
		}
		copyExpectedToken(tokenType) {
			if (this.tokens[this.tokenIndex].type !== tokenType) throw new Error(`Expected token ${tokenType}`);
			this.copyToken();
		}
		copyToken() {
			this.resultCode += this.previousWhitespaceAndComments();
			this.appendTokenPrefix();
			this.resultMappings[this.tokenIndex] = this.resultCode.length;
			this.resultCode += this.code.slice(this.tokens[this.tokenIndex].start, this.tokens[this.tokenIndex].end);
			this.appendTokenSuffix();
			this.tokenIndex++;
		}
		copyTokenWithPrefix(prefix) {
			this.resultCode += this.previousWhitespaceAndComments();
			this.appendTokenPrefix();
			this.resultCode += prefix;
			this.resultMappings[this.tokenIndex] = this.resultCode.length;
			this.resultCode += this.code.slice(this.tokens[this.tokenIndex].start, this.tokens[this.tokenIndex].end);
			this.appendTokenSuffix();
			this.tokenIndex++;
		}
		appendTokenPrefix() {
			const token = this.currentToken();
			if (token.numNullishCoalesceStarts || token.isOptionalChainStart) token.isAsyncOperation = _isAsyncOperation2.default.call(void 0, this);
			if (this.disableESTransforms) return;
			if (token.numNullishCoalesceStarts) for (let i = 0; i < token.numNullishCoalesceStarts; i++) {
				if (token.isAsyncOperation) {
					this.resultCode += "await ";
					this.resultCode += this.helperManager.getHelperName("asyncNullishCoalesce");
				} else this.resultCode += this.helperManager.getHelperName("nullishCoalesce");
				this.resultCode += "(";
			}
			if (token.isOptionalChainStart) {
				if (token.isAsyncOperation) this.resultCode += "await ";
				if (this.tokenIndex > 0 && this.tokenAtRelativeIndex(-1).type === _types.TokenType._delete) {
					if (token.isAsyncOperation) this.resultCode += this.helperManager.getHelperName("asyncOptionalChainDelete");
					else this.resultCode += this.helperManager.getHelperName("optionalChainDelete");
				} else if (token.isAsyncOperation) this.resultCode += this.helperManager.getHelperName("asyncOptionalChain");
				else this.resultCode += this.helperManager.getHelperName("optionalChain");
				this.resultCode += "([";
			}
		}
		appendTokenSuffix() {
			const token = this.currentToken();
			if (token.isOptionalChainEnd && !this.disableESTransforms) this.resultCode += "])";
			if (token.numNullishCoalesceEnds && !this.disableESTransforms) for (let i = 0; i < token.numNullishCoalesceEnds; i++) this.resultCode += "))";
		}
		appendCode(code) {
			this.resultCode += code;
		}
		currentToken() {
			return this.tokens[this.tokenIndex];
		}
		currentTokenCode() {
			const token = this.currentToken();
			return this.code.slice(token.start, token.end);
		}
		tokenAtRelativeIndex(relativeIndex) {
			return this.tokens[this.tokenIndex + relativeIndex];
		}
		currentIndex() {
			return this.tokenIndex;
		}
		/**
		* Move to the next token. Only suitable in preprocessing steps. When
		* generating new code, you should use copyToken or removeToken.
		*/
		nextToken() {
			if (this.tokenIndex === this.tokens.length) throw new Error("Unexpectedly reached end of input.");
			this.tokenIndex++;
		}
		previousToken() {
			this.tokenIndex--;
		}
		finish() {
			if (this.tokenIndex !== this.tokens.length) throw new Error("Tried to finish processing tokens before reaching the end.");
			this.resultCode += this.previousWhitespaceAndComments();
			return {
				code: this.resultCode,
				mappings: this.resultMappings
			};
		}
		isAtEnd() {
			return this.tokenIndex === this.tokens.length;
		}
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/util/getClassInfo.js
var require_getClassInfo = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _keywords = require_keywords();
	var _types = require_types$2();
	/**
	* Get information about the class fields for this class, given a token processor pointing to the
	* open-brace at the start of the class.
	*/
	function getClassInfo(rootTransformer, tokens, nameManager, disableESTransforms) {
		const snapshot = tokens.snapshot();
		const headerInfo = processClassHeader(tokens);
		let constructorInitializerStatements = [];
		const instanceInitializerNames = [];
		const staticInitializerNames = [];
		let constructorInsertPos = null;
		const fields = [];
		const rangesToRemove = [];
		const classContextId = tokens.currentToken().contextId;
		if (classContextId == null) throw new Error("Expected non-null class context ID on class open-brace.");
		tokens.nextToken();
		while (!tokens.matchesContextIdAndLabel(_types.TokenType.braceR, classContextId)) if (tokens.matchesContextual(_keywords.ContextualKeyword._constructor) && !tokens.currentToken().isType) ({constructorInitializerStatements, constructorInsertPos} = processConstructor(tokens));
		else if (tokens.matches1(_types.TokenType.semi)) {
			if (!disableESTransforms) rangesToRemove.push({
				start: tokens.currentIndex(),
				end: tokens.currentIndex() + 1
			});
			tokens.nextToken();
		} else if (tokens.currentToken().isType) tokens.nextToken();
		else {
			const statementStartIndex = tokens.currentIndex();
			let isStatic = false;
			let isESPrivate = false;
			let isDeclareOrAbstract = false;
			while (isAccessModifier(tokens.currentToken())) {
				if (tokens.matches1(_types.TokenType._static)) isStatic = true;
				if (tokens.matches1(_types.TokenType.hash)) isESPrivate = true;
				if (tokens.matches1(_types.TokenType._declare) || tokens.matches1(_types.TokenType._abstract)) isDeclareOrAbstract = true;
				tokens.nextToken();
			}
			if (isStatic && tokens.matches1(_types.TokenType.braceL)) {
				skipToNextClassElement(tokens, classContextId);
				continue;
			}
			if (isESPrivate) {
				skipToNextClassElement(tokens, classContextId);
				continue;
			}
			if (tokens.matchesContextual(_keywords.ContextualKeyword._constructor) && !tokens.currentToken().isType) {
				({constructorInitializerStatements, constructorInsertPos} = processConstructor(tokens));
				continue;
			}
			const nameStartIndex = tokens.currentIndex();
			skipFieldName(tokens);
			if (tokens.matches1(_types.TokenType.lessThan) || tokens.matches1(_types.TokenType.parenL)) {
				skipToNextClassElement(tokens, classContextId);
				continue;
			}
			while (tokens.currentToken().isType) tokens.nextToken();
			if (tokens.matches1(_types.TokenType.eq)) {
				const equalsIndex = tokens.currentIndex();
				const valueEnd = tokens.currentToken().rhsEndIndex;
				if (valueEnd == null) throw new Error("Expected rhsEndIndex on class field assignment.");
				tokens.nextToken();
				while (tokens.currentIndex() < valueEnd) rootTransformer.processToken();
				let initializerName;
				if (isStatic) {
					initializerName = nameManager.claimFreeName("__initStatic");
					staticInitializerNames.push(initializerName);
				} else {
					initializerName = nameManager.claimFreeName("__init");
					instanceInitializerNames.push(initializerName);
				}
				fields.push({
					initializerName,
					equalsIndex,
					start: nameStartIndex,
					end: tokens.currentIndex()
				});
			} else if (!disableESTransforms || isDeclareOrAbstract) rangesToRemove.push({
				start: statementStartIndex,
				end: tokens.currentIndex()
			});
		}
		tokens.restoreToSnapshot(snapshot);
		if (disableESTransforms) return {
			headerInfo,
			constructorInitializerStatements,
			instanceInitializerNames: [],
			staticInitializerNames: [],
			constructorInsertPos,
			fields: [],
			rangesToRemove
		};
		else return {
			headerInfo,
			constructorInitializerStatements,
			instanceInitializerNames,
			staticInitializerNames,
			constructorInsertPos,
			fields,
			rangesToRemove
		};
	}
	exports.default = getClassInfo;
	/**
	* Move the token processor to the next method/field in the class.
	*
	* To do that, we seek forward to the next start of a class name (either an open
	* bracket or an identifier, or the closing curly brace), then seek backward to
	* include any access modifiers.
	*/
	function skipToNextClassElement(tokens, classContextId) {
		tokens.nextToken();
		while (tokens.currentToken().contextId !== classContextId) tokens.nextToken();
		while (isAccessModifier(tokens.tokenAtRelativeIndex(-1))) tokens.previousToken();
	}
	function processClassHeader(tokens) {
		const classToken = tokens.currentToken();
		const contextId = classToken.contextId;
		if (contextId == null) throw new Error("Expected context ID on class token.");
		const isExpression = classToken.isExpression;
		if (isExpression == null) throw new Error("Expected isExpression on class token.");
		let className = null;
		let hasSuperclass = false;
		tokens.nextToken();
		if (tokens.matches1(_types.TokenType.name)) className = tokens.identifierName();
		while (!tokens.matchesContextIdAndLabel(_types.TokenType.braceL, contextId)) {
			if (tokens.matches1(_types.TokenType._extends) && !tokens.currentToken().isType) hasSuperclass = true;
			tokens.nextToken();
		}
		return {
			isExpression,
			className,
			hasSuperclass
		};
	}
	/**
	* Extract useful information out of a constructor, starting at the "constructor" name.
	*/
	function processConstructor(tokens) {
		const constructorInitializerStatements = [];
		tokens.nextToken();
		const constructorContextId = tokens.currentToken().contextId;
		if (constructorContextId == null) throw new Error("Expected context ID on open-paren starting constructor params.");
		while (!tokens.matchesContextIdAndLabel(_types.TokenType.parenR, constructorContextId)) if (tokens.currentToken().contextId === constructorContextId) {
			tokens.nextToken();
			if (isAccessModifier(tokens.currentToken())) {
				tokens.nextToken();
				while (isAccessModifier(tokens.currentToken())) tokens.nextToken();
				const token = tokens.currentToken();
				if (token.type !== _types.TokenType.name) throw new Error("Expected identifier after access modifiers in constructor arg.");
				const name = tokens.identifierNameForToken(token);
				constructorInitializerStatements.push(`this.${name} = ${name}`);
			}
		} else tokens.nextToken();
		tokens.nextToken();
		while (tokens.currentToken().isType) tokens.nextToken();
		let constructorInsertPos = tokens.currentIndex();
		let foundSuperCall = false;
		while (!tokens.matchesContextIdAndLabel(_types.TokenType.braceR, constructorContextId)) {
			if (!foundSuperCall && tokens.matches2(_types.TokenType._super, _types.TokenType.parenL)) {
				tokens.nextToken();
				const superCallContextId = tokens.currentToken().contextId;
				if (superCallContextId == null) throw new Error("Expected a context ID on the super call");
				while (!tokens.matchesContextIdAndLabel(_types.TokenType.parenR, superCallContextId)) tokens.nextToken();
				constructorInsertPos = tokens.currentIndex();
				foundSuperCall = true;
			}
			tokens.nextToken();
		}
		tokens.nextToken();
		return {
			constructorInitializerStatements,
			constructorInsertPos
		};
	}
	/**
	* Determine if this is any token that can go before the name in a method/field.
	*/
	function isAccessModifier(token) {
		return [
			_types.TokenType._async,
			_types.TokenType._get,
			_types.TokenType._set,
			_types.TokenType.plus,
			_types.TokenType.minus,
			_types.TokenType._readonly,
			_types.TokenType._static,
			_types.TokenType._public,
			_types.TokenType._private,
			_types.TokenType._protected,
			_types.TokenType._override,
			_types.TokenType._abstract,
			_types.TokenType.star,
			_types.TokenType._declare,
			_types.TokenType.hash
		].includes(token.type);
	}
	/**
	* The next token or set of tokens is either an identifier or an expression in square brackets, for
	* a method or field name.
	*/
	function skipFieldName(tokens) {
		if (tokens.matches1(_types.TokenType.bracketL)) {
			const classContextId = tokens.currentToken().contextId;
			if (classContextId == null) throw new Error("Expected class context ID on computed name open bracket.");
			while (!tokens.matchesContextIdAndLabel(_types.TokenType.bracketR, classContextId)) tokens.nextToken();
			tokens.nextToken();
		} else tokens.nextToken();
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/util/elideImportEquals.js
var require_elideImportEquals = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _types = require_types$2();
	function elideImportEquals(tokens) {
		tokens.removeInitialToken();
		tokens.removeToken();
		tokens.removeToken();
		tokens.removeToken();
		if (tokens.matches1(_types.TokenType.parenL)) {
			tokens.removeToken();
			tokens.removeToken();
			tokens.removeToken();
		} else while (tokens.matches1(_types.TokenType.dot)) {
			tokens.removeToken();
			tokens.removeToken();
		}
	}
	exports.default = elideImportEquals;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/util/getDeclarationInfo.js
var require_getDeclarationInfo = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _tokenizer = require_tokenizer();
	var _types = require_types$2();
	exports.EMPTY_DECLARATION_INFO = {
		typeDeclarations: /* @__PURE__ */ new Set(),
		valueDeclarations: /* @__PURE__ */ new Set()
	};
	/**
	* Get all top-level identifiers that should be preserved when exported in TypeScript.
	*
	* Examples:
	* - If an identifier is declared as `const x`, then `export {x}` should be preserved.
	* - If it's declared as `type x`, then `export {x}` should be removed.
	* - If it's declared as both `const x` and `type x`, then the export should be preserved.
	* - Classes and enums should be preserved (even though they also introduce types).
	* - Imported identifiers should be preserved since we don't have enough information to
	*   rule them out. --isolatedModules disallows re-exports, which catches errors here.
	*/
	function getDeclarationInfo(tokens) {
		const typeDeclarations = /* @__PURE__ */ new Set();
		const valueDeclarations = /* @__PURE__ */ new Set();
		for (let i = 0; i < tokens.tokens.length; i++) {
			const token = tokens.tokens[i];
			if (token.type === _types.TokenType.name && _tokenizer.isTopLevelDeclaration.call(void 0, token)) {
				if (token.isType) typeDeclarations.add(tokens.identifierNameForToken(token));
				else valueDeclarations.add(tokens.identifierNameForToken(token));
			}
		}
		return {
			typeDeclarations,
			valueDeclarations
		};
	}
	exports.default = getDeclarationInfo;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/util/isExportFrom.js
var require_isExportFrom = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _keywords = require_keywords();
	var _types = require_types$2();
	/**
	* Starting at `export {`, look ahead and return `true` if this is an
	* `export {...} from` statement and `false` if this is a plain multi-export.
	*/
	function isExportFrom(tokens) {
		let closeBraceIndex = tokens.currentIndex();
		while (!tokens.matches1AtIndex(closeBraceIndex, _types.TokenType.braceR)) closeBraceIndex++;
		return tokens.matchesContextualAtIndex(closeBraceIndex + 1, _keywords.ContextualKeyword._from) && tokens.matches1AtIndex(closeBraceIndex + 2, _types.TokenType.string);
	}
	exports.default = isExportFrom;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/util/removeMaybeImportAttributes.js
var require_removeMaybeImportAttributes = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _keywords = require_keywords();
	var _types = require_types$2();
	/**
	* Starting at a potential `with` or (legacy) `assert` token, remove the import
	* attributes if they exist.
	*/
	function removeMaybeImportAttributes(tokens) {
		if (tokens.matches2(_types.TokenType._with, _types.TokenType.braceL) || tokens.matches2(_types.TokenType.name, _types.TokenType.braceL) && tokens.matchesContextual(_keywords.ContextualKeyword._assert)) {
			tokens.removeToken();
			tokens.removeToken();
			tokens.removeBalancedCode();
			tokens.removeToken();
		}
	}
	exports.removeMaybeImportAttributes = removeMaybeImportAttributes;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/util/shouldElideDefaultExport.js
var require_shouldElideDefaultExport = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _types = require_types$2();
	/**
	* Common method sharing code between CJS and ESM cases, since they're the same here.
	*/
	function shouldElideDefaultExport(isTypeScriptTransformEnabled, keepUnusedImports, tokens, declarationInfo) {
		if (!isTypeScriptTransformEnabled || keepUnusedImports) return false;
		const exportToken = tokens.currentToken();
		if (exportToken.rhsEndIndex == null) throw new Error("Expected non-null rhsEndIndex on export token.");
		const numTokens = exportToken.rhsEndIndex - tokens.currentIndex();
		if (numTokens !== 3 && !(numTokens === 4 && tokens.matches1AtIndex(exportToken.rhsEndIndex - 1, _types.TokenType.semi))) return false;
		const identifierToken = tokens.tokenAtRelativeIndex(2);
		if (identifierToken.type !== _types.TokenType.name) return false;
		const exportedName = tokens.identifierNameForToken(identifierToken);
		return declarationInfo.typeDeclarations.has(exportedName) && !declarationInfo.valueDeclarations.has(exportedName);
	}
	exports.default = shouldElideDefaultExport;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/transformers/CJSImportTransformer.js
var require_CJSImportTransformer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _tokenizer = require_tokenizer();
	var _keywords = require_keywords();
	var _types = require_types$2();
	var _elideImportEquals2 = _interopRequireDefault(require_elideImportEquals());
	var _getDeclarationInfo = require_getDeclarationInfo();
	var _getDeclarationInfo2 = _interopRequireDefault(_getDeclarationInfo);
	var _getImportExportSpecifierInfo2 = _interopRequireDefault(require_getImportExportSpecifierInfo());
	var _isExportFrom2 = _interopRequireDefault(require_isExportFrom());
	var _removeMaybeImportAttributes = require_removeMaybeImportAttributes();
	var _shouldElideDefaultExport2 = _interopRequireDefault(require_shouldElideDefaultExport());
	var _Transformer2 = _interopRequireDefault(require_Transformer());
	exports.default = class CJSImportTransformer extends _Transformer2.default {
		__init() {
			this.hadExport = false;
		}
		__init2() {
			this.hadNamedExport = false;
		}
		__init3() {
			this.hadDefaultExport = false;
		}
		constructor(rootTransformer, tokens, importProcessor, nameManager, helperManager, reactHotLoaderTransformer, enableLegacyBabel5ModuleInterop, enableLegacyTypeScriptModuleInterop, isTypeScriptTransformEnabled, isFlowTransformEnabled, preserveDynamicImport, keepUnusedImports) {
			super();
			this.rootTransformer = rootTransformer;
			this.tokens = tokens;
			this.importProcessor = importProcessor;
			this.nameManager = nameManager;
			this.helperManager = helperManager;
			this.reactHotLoaderTransformer = reactHotLoaderTransformer;
			this.enableLegacyBabel5ModuleInterop = enableLegacyBabel5ModuleInterop;
			this.enableLegacyTypeScriptModuleInterop = enableLegacyTypeScriptModuleInterop;
			this.isTypeScriptTransformEnabled = isTypeScriptTransformEnabled;
			this.isFlowTransformEnabled = isFlowTransformEnabled;
			this.preserveDynamicImport = preserveDynamicImport;
			this.keepUnusedImports = keepUnusedImports;
			CJSImportTransformer.prototype.__init.call(this);
			CJSImportTransformer.prototype.__init2.call(this);
			CJSImportTransformer.prototype.__init3.call(this);
			this.declarationInfo = isTypeScriptTransformEnabled ? _getDeclarationInfo2.default.call(void 0, tokens) : _getDeclarationInfo.EMPTY_DECLARATION_INFO;
		}
		getPrefixCode() {
			let prefix = "";
			if (this.hadExport) prefix += "Object.defineProperty(exports, \"__esModule\", {value: true});";
			return prefix;
		}
		getSuffixCode() {
			if (this.enableLegacyBabel5ModuleInterop && this.hadDefaultExport && !this.hadNamedExport) return "\nmodule.exports = exports.default;\n";
			return "";
		}
		process() {
			if (this.tokens.matches3(_types.TokenType._import, _types.TokenType.name, _types.TokenType.eq)) return this.processImportEquals();
			if (this.tokens.matches1(_types.TokenType._import)) {
				this.processImport();
				return true;
			}
			if (this.tokens.matches2(_types.TokenType._export, _types.TokenType.eq)) {
				this.tokens.replaceToken("module.exports");
				return true;
			}
			if (this.tokens.matches1(_types.TokenType._export) && !this.tokens.currentToken().isType) {
				this.hadExport = true;
				return this.processExport();
			}
			if (this.tokens.matches2(_types.TokenType.name, _types.TokenType.postIncDec)) {
				if (this.processPostIncDec()) return true;
			}
			if (this.tokens.matches1(_types.TokenType.name) || this.tokens.matches1(_types.TokenType.jsxName)) return this.processIdentifier();
			if (this.tokens.matches1(_types.TokenType.eq)) return this.processAssignment();
			if (this.tokens.matches1(_types.TokenType.assign)) return this.processComplexAssignment();
			if (this.tokens.matches1(_types.TokenType.preIncDec)) return this.processPreIncDec();
			return false;
		}
		processImportEquals() {
			const importName = this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 1);
			if (this.importProcessor.shouldAutomaticallyElideImportedName(importName)) _elideImportEquals2.default.call(void 0, this.tokens);
			else this.tokens.replaceToken("const");
			return true;
		}
		/**
		* Transform this:
		* import foo, {bar} from 'baz';
		* into
		* var _baz = require('baz'); var _baz2 = _interopRequireDefault(_baz);
		*
		* The import code was already generated in the import preprocessing step, so
		* we just need to look it up.
		*/
		processImport() {
			if (this.tokens.matches2(_types.TokenType._import, _types.TokenType.parenL)) {
				if (this.preserveDynamicImport) {
					this.tokens.copyToken();
					return;
				}
				const requireWrapper = this.enableLegacyTypeScriptModuleInterop ? "" : `${this.helperManager.getHelperName("interopRequireWildcard")}(`;
				this.tokens.replaceToken(`Promise.resolve().then(() => ${requireWrapper}require`);
				const contextId = this.tokens.currentToken().contextId;
				if (contextId == null) throw new Error("Expected context ID on dynamic import invocation.");
				this.tokens.copyToken();
				while (!this.tokens.matchesContextIdAndLabel(_types.TokenType.parenR, contextId)) this.rootTransformer.processToken();
				this.tokens.replaceToken(requireWrapper ? ")))" : "))");
				return;
			}
			if (this.removeImportAndDetectIfShouldElide()) this.tokens.removeToken();
			else {
				const path = this.tokens.stringValue();
				this.tokens.replaceTokenTrimmingLeftWhitespace(this.importProcessor.claimImportCode(path));
				this.tokens.appendCode(this.importProcessor.claimImportCode(path));
			}
			_removeMaybeImportAttributes.removeMaybeImportAttributes.call(void 0, this.tokens);
			if (this.tokens.matches1(_types.TokenType.semi)) this.tokens.removeToken();
		}
		/**
		* Erase this import (since any CJS output would be completely different), and
		* return true if this import is should be elided due to being a type-only
		* import. Such imports will not be emitted at all to avoid side effects.
		*
		* Import elision only happens with the TypeScript or Flow transforms enabled.
		*
		* TODO: This function has some awkward overlap with
		*  CJSImportProcessor.pruneTypeOnlyImports , and the two should be unified.
		*  That function handles TypeScript implicit import name elision, and removes
		*  an import if all typical imported names (without `type`) are removed due
		*  to being type-only imports. This function handles Flow import removal and
		*  properly distinguishes `import 'foo'` from `import {} from 'foo'` for TS
		*  purposes.
		*
		* The position should end at the import string.
		*/
		removeImportAndDetectIfShouldElide() {
			this.tokens.removeInitialToken();
			if (this.tokens.matchesContextual(_keywords.ContextualKeyword._type) && !this.tokens.matches1AtIndex(this.tokens.currentIndex() + 1, _types.TokenType.comma) && !this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 1, _keywords.ContextualKeyword._from)) {
				this.removeRemainingImport();
				return true;
			}
			if (this.tokens.matches1(_types.TokenType.name) || this.tokens.matches1(_types.TokenType.star)) {
				this.removeRemainingImport();
				return false;
			}
			if (this.tokens.matches1(_types.TokenType.string)) return false;
			let foundNonTypeImport = false;
			let foundAnyNamedImport = false;
			while (!this.tokens.matches1(_types.TokenType.string)) {
				if (!foundNonTypeImport && this.tokens.matches1(_types.TokenType.braceL) || this.tokens.matches1(_types.TokenType.comma)) {
					this.tokens.removeToken();
					if (!this.tokens.matches1(_types.TokenType.braceR)) foundAnyNamedImport = true;
					if (this.tokens.matches2(_types.TokenType.name, _types.TokenType.comma) || this.tokens.matches2(_types.TokenType.name, _types.TokenType.braceR) || this.tokens.matches4(_types.TokenType.name, _types.TokenType.name, _types.TokenType.name, _types.TokenType.comma) || this.tokens.matches4(_types.TokenType.name, _types.TokenType.name, _types.TokenType.name, _types.TokenType.braceR)) foundNonTypeImport = true;
				}
				this.tokens.removeToken();
			}
			if (this.keepUnusedImports) return false;
			if (this.isTypeScriptTransformEnabled) return !foundNonTypeImport;
			else if (this.isFlowTransformEnabled) return foundAnyNamedImport && !foundNonTypeImport;
			else return false;
		}
		removeRemainingImport() {
			while (!this.tokens.matches1(_types.TokenType.string)) this.tokens.removeToken();
		}
		processIdentifier() {
			const token = this.tokens.currentToken();
			if (token.shadowsGlobal) return false;
			if (token.identifierRole === _tokenizer.IdentifierRole.ObjectShorthand) return this.processObjectShorthand();
			if (token.identifierRole !== _tokenizer.IdentifierRole.Access) return false;
			const replacement = this.importProcessor.getIdentifierReplacement(this.tokens.identifierNameForToken(token));
			if (!replacement) return false;
			let possibleOpenParenIndex = this.tokens.currentIndex() + 1;
			while (possibleOpenParenIndex < this.tokens.tokens.length && this.tokens.tokens[possibleOpenParenIndex].type === _types.TokenType.parenR) possibleOpenParenIndex++;
			if (this.tokens.tokens[possibleOpenParenIndex].type === _types.TokenType.parenL) {
				if (this.tokens.tokenAtRelativeIndex(1).type === _types.TokenType.parenL && this.tokens.tokenAtRelativeIndex(-1).type !== _types.TokenType._new) {
					this.tokens.replaceToken(`${replacement}.call(void 0, `);
					this.tokens.removeToken();
					this.rootTransformer.processBalancedCode();
					this.tokens.copyExpectedToken(_types.TokenType.parenR);
				} else this.tokens.replaceToken(`(0, ${replacement})`);
			} else this.tokens.replaceToken(replacement);
			return true;
		}
		processObjectShorthand() {
			const identifier = this.tokens.identifierName();
			const replacement = this.importProcessor.getIdentifierReplacement(identifier);
			if (!replacement) return false;
			this.tokens.replaceToken(`${identifier}: ${replacement}`);
			return true;
		}
		processExport() {
			if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._enum) || this.tokens.matches3(_types.TokenType._export, _types.TokenType._const, _types.TokenType._enum)) {
				this.hadNamedExport = true;
				return false;
			}
			if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._default)) {
				if (this.tokens.matches3(_types.TokenType._export, _types.TokenType._default, _types.TokenType._enum)) {
					this.hadDefaultExport = true;
					return false;
				}
				this.processExportDefault();
				return true;
			} else if (this.tokens.matches2(_types.TokenType._export, _types.TokenType.braceL)) {
				this.processExportBindings();
				return true;
			} else if (this.tokens.matches2(_types.TokenType._export, _types.TokenType.name) && this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 1, _keywords.ContextualKeyword._type)) {
				this.tokens.removeInitialToken();
				this.tokens.removeToken();
				if (this.tokens.matches1(_types.TokenType.braceL)) {
					while (!this.tokens.matches1(_types.TokenType.braceR)) this.tokens.removeToken();
					this.tokens.removeToken();
				} else {
					this.tokens.removeToken();
					if (this.tokens.matches1(_types.TokenType._as)) {
						this.tokens.removeToken();
						this.tokens.removeToken();
					}
				}
				if (this.tokens.matchesContextual(_keywords.ContextualKeyword._from) && this.tokens.matches1AtIndex(this.tokens.currentIndex() + 1, _types.TokenType.string)) {
					this.tokens.removeToken();
					this.tokens.removeToken();
					_removeMaybeImportAttributes.removeMaybeImportAttributes.call(void 0, this.tokens);
				}
				return true;
			}
			this.hadNamedExport = true;
			if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._var) || this.tokens.matches2(_types.TokenType._export, _types.TokenType._let) || this.tokens.matches2(_types.TokenType._export, _types.TokenType._const)) {
				this.processExportVar();
				return true;
			} else if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._function) || this.tokens.matches3(_types.TokenType._export, _types.TokenType.name, _types.TokenType._function)) {
				this.processExportFunction();
				return true;
			} else if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._class) || this.tokens.matches3(_types.TokenType._export, _types.TokenType._abstract, _types.TokenType._class) || this.tokens.matches2(_types.TokenType._export, _types.TokenType.at)) {
				this.processExportClass();
				return true;
			} else if (this.tokens.matches2(_types.TokenType._export, _types.TokenType.star)) {
				this.processExportStar();
				return true;
			} else throw new Error("Unrecognized export syntax.");
		}
		processAssignment() {
			const index = this.tokens.currentIndex();
			const identifierToken = this.tokens.tokens[index - 1];
			if (identifierToken.isType || identifierToken.type !== _types.TokenType.name) return false;
			if (identifierToken.shadowsGlobal) return false;
			if (index >= 2 && this.tokens.matches1AtIndex(index - 2, _types.TokenType.dot)) return false;
			if (index >= 2 && [
				_types.TokenType._var,
				_types.TokenType._let,
				_types.TokenType._const
			].includes(this.tokens.tokens[index - 2].type)) return false;
			const assignmentSnippet = this.importProcessor.resolveExportBinding(this.tokens.identifierNameForToken(identifierToken));
			if (!assignmentSnippet) return false;
			this.tokens.copyToken();
			this.tokens.appendCode(` ${assignmentSnippet} =`);
			return true;
		}
		/**
		* Process something like `a += 3`, where `a` might be an exported value.
		*/
		processComplexAssignment() {
			const index = this.tokens.currentIndex();
			const identifierToken = this.tokens.tokens[index - 1];
			if (identifierToken.type !== _types.TokenType.name) return false;
			if (identifierToken.shadowsGlobal) return false;
			if (index >= 2 && this.tokens.matches1AtIndex(index - 2, _types.TokenType.dot)) return false;
			const assignmentSnippet = this.importProcessor.resolveExportBinding(this.tokens.identifierNameForToken(identifierToken));
			if (!assignmentSnippet) return false;
			this.tokens.appendCode(` = ${assignmentSnippet}`);
			this.tokens.copyToken();
			return true;
		}
		/**
		* Process something like `++a`, where `a` might be an exported value.
		*/
		processPreIncDec() {
			const index = this.tokens.currentIndex();
			const identifierToken = this.tokens.tokens[index + 1];
			if (identifierToken.type !== _types.TokenType.name) return false;
			if (identifierToken.shadowsGlobal) return false;
			if (index + 2 < this.tokens.tokens.length && (this.tokens.matches1AtIndex(index + 2, _types.TokenType.dot) || this.tokens.matches1AtIndex(index + 2, _types.TokenType.bracketL) || this.tokens.matches1AtIndex(index + 2, _types.TokenType.parenL))) return false;
			const identifierName = this.tokens.identifierNameForToken(identifierToken);
			const assignmentSnippet = this.importProcessor.resolveExportBinding(identifierName);
			if (!assignmentSnippet) return false;
			this.tokens.appendCode(`${assignmentSnippet} = `);
			this.tokens.copyToken();
			return true;
		}
		/**
		* Process something like `a++`, where `a` might be an exported value.
		* This starts at the `a`, not at the `++`.
		*/
		processPostIncDec() {
			const index = this.tokens.currentIndex();
			const identifierToken = this.tokens.tokens[index];
			const operatorToken = this.tokens.tokens[index + 1];
			if (identifierToken.type !== _types.TokenType.name) return false;
			if (identifierToken.shadowsGlobal) return false;
			if (index >= 1 && this.tokens.matches1AtIndex(index - 1, _types.TokenType.dot)) return false;
			const identifierName = this.tokens.identifierNameForToken(identifierToken);
			const assignmentSnippet = this.importProcessor.resolveExportBinding(identifierName);
			if (!assignmentSnippet) return false;
			const operatorCode = this.tokens.rawCodeForToken(operatorToken);
			const base = this.importProcessor.getIdentifierReplacement(identifierName) || identifierName;
			if (operatorCode === "++") this.tokens.replaceToken(`(${base} = ${assignmentSnippet} = ${base} + 1, ${base} - 1)`);
			else if (operatorCode === "--") this.tokens.replaceToken(`(${base} = ${assignmentSnippet} = ${base} - 1, ${base} + 1)`);
			else throw new Error(`Unexpected operator: ${operatorCode}`);
			this.tokens.removeToken();
			return true;
		}
		processExportDefault() {
			let exportedRuntimeValue = true;
			if (this.tokens.matches4(_types.TokenType._export, _types.TokenType._default, _types.TokenType._function, _types.TokenType.name) || this.tokens.matches5(_types.TokenType._export, _types.TokenType._default, _types.TokenType.name, _types.TokenType._function, _types.TokenType.name) && this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 2, _keywords.ContextualKeyword._async)) {
				this.tokens.removeInitialToken();
				this.tokens.removeToken();
				const name = this.processNamedFunction();
				this.tokens.appendCode(` exports.default = ${name};`);
			} else if (this.tokens.matches4(_types.TokenType._export, _types.TokenType._default, _types.TokenType._class, _types.TokenType.name) || this.tokens.matches5(_types.TokenType._export, _types.TokenType._default, _types.TokenType._abstract, _types.TokenType._class, _types.TokenType.name) || this.tokens.matches3(_types.TokenType._export, _types.TokenType._default, _types.TokenType.at)) {
				this.tokens.removeInitialToken();
				this.tokens.removeToken();
				this.copyDecorators();
				if (this.tokens.matches1(_types.TokenType._abstract)) this.tokens.removeToken();
				const name = this.rootTransformer.processNamedClass();
				this.tokens.appendCode(` exports.default = ${name};`);
			} else if (_shouldElideDefaultExport2.default.call(void 0, this.isTypeScriptTransformEnabled, this.keepUnusedImports, this.tokens, this.declarationInfo)) {
				exportedRuntimeValue = false;
				this.tokens.removeInitialToken();
				this.tokens.removeToken();
				this.tokens.removeToken();
			} else if (this.reactHotLoaderTransformer) {
				const defaultVarName = this.nameManager.claimFreeName("_default");
				this.tokens.replaceToken(`let ${defaultVarName}; exports.`);
				this.tokens.copyToken();
				this.tokens.appendCode(` = ${defaultVarName} =`);
				this.reactHotLoaderTransformer.setExtractedDefaultExportName(defaultVarName);
			} else {
				this.tokens.replaceToken("exports.");
				this.tokens.copyToken();
				this.tokens.appendCode(" =");
			}
			if (exportedRuntimeValue) this.hadDefaultExport = true;
		}
		copyDecorators() {
			while (this.tokens.matches1(_types.TokenType.at)) {
				this.tokens.copyToken();
				if (this.tokens.matches1(_types.TokenType.parenL)) {
					this.tokens.copyExpectedToken(_types.TokenType.parenL);
					this.rootTransformer.processBalancedCode();
					this.tokens.copyExpectedToken(_types.TokenType.parenR);
				} else {
					this.tokens.copyExpectedToken(_types.TokenType.name);
					while (this.tokens.matches1(_types.TokenType.dot)) {
						this.tokens.copyExpectedToken(_types.TokenType.dot);
						this.tokens.copyExpectedToken(_types.TokenType.name);
					}
					if (this.tokens.matches1(_types.TokenType.parenL)) {
						this.tokens.copyExpectedToken(_types.TokenType.parenL);
						this.rootTransformer.processBalancedCode();
						this.tokens.copyExpectedToken(_types.TokenType.parenR);
					}
				}
			}
		}
		/**
		* Transform a declaration like `export var`, `export let`, or `export const`.
		*/
		processExportVar() {
			if (this.isSimpleExportVar()) this.processSimpleExportVar();
			else this.processComplexExportVar();
		}
		/**
		* Determine if the export is of the form:
		* export var/let/const [varName] = [expr];
		* In other words, determine if function name inference might apply.
		*/
		isSimpleExportVar() {
			let tokenIndex = this.tokens.currentIndex();
			tokenIndex++;
			tokenIndex++;
			if (!this.tokens.matches1AtIndex(tokenIndex, _types.TokenType.name)) return false;
			tokenIndex++;
			while (tokenIndex < this.tokens.tokens.length && this.tokens.tokens[tokenIndex].isType) tokenIndex++;
			if (!this.tokens.matches1AtIndex(tokenIndex, _types.TokenType.eq)) return false;
			return true;
		}
		/**
		* Transform an `export var` declaration initializing a single variable.
		*
		* For example, this:
		* export const f = () => {};
		* becomes this:
		* const f = () => {}; exports.f = f;
		*
		* The variable is unused (e.g. exports.f has the true value of the export).
		* We need to produce an assignment of this form so that the function will
		* have an inferred name of "f", which wouldn't happen in the more general
		* case below.
		*/
		processSimpleExportVar() {
			this.tokens.removeInitialToken();
			this.tokens.copyToken();
			const varName = this.tokens.identifierName();
			while (!this.tokens.matches1(_types.TokenType.eq)) this.rootTransformer.processToken();
			const endIndex = this.tokens.currentToken().rhsEndIndex;
			if (endIndex == null) throw new Error("Expected = token with an end index.");
			while (this.tokens.currentIndex() < endIndex) this.rootTransformer.processToken();
			this.tokens.appendCode(`; exports.${varName} = ${varName}`);
		}
		/**
		* Transform normal declaration exports, including handling destructuring.
		* For example, this:
		* export const {x: [a = 2, b], c} = d;
		* becomes this:
		* ({x: [exports.a = 2, exports.b], c: exports.c} = d;)
		*/
		processComplexExportVar() {
			this.tokens.removeInitialToken();
			this.tokens.removeToken();
			const needsParens = this.tokens.matches1(_types.TokenType.braceL);
			if (needsParens) this.tokens.appendCode("(");
			let depth = 0;
			while (true) if (this.tokens.matches1(_types.TokenType.braceL) || this.tokens.matches1(_types.TokenType.dollarBraceL) || this.tokens.matches1(_types.TokenType.bracketL)) {
				depth++;
				this.tokens.copyToken();
			} else if (this.tokens.matches1(_types.TokenType.braceR) || this.tokens.matches1(_types.TokenType.bracketR)) {
				depth--;
				this.tokens.copyToken();
			} else if (depth === 0 && !this.tokens.matches1(_types.TokenType.name) && !this.tokens.currentToken().isType) break;
			else if (this.tokens.matches1(_types.TokenType.eq)) {
				const endIndex = this.tokens.currentToken().rhsEndIndex;
				if (endIndex == null) throw new Error("Expected = token with an end index.");
				while (this.tokens.currentIndex() < endIndex) this.rootTransformer.processToken();
			} else {
				const token = this.tokens.currentToken();
				if (_tokenizer.isDeclaration.call(void 0, token)) {
					const name = this.tokens.identifierName();
					let replacement = this.importProcessor.getIdentifierReplacement(name);
					if (replacement === null) throw new Error(`Expected a replacement for ${name} in \`export var\` syntax.`);
					if (_tokenizer.isObjectShorthandDeclaration.call(void 0, token)) replacement = `${name}: ${replacement}`;
					this.tokens.replaceToken(replacement);
				} else this.rootTransformer.processToken();
			}
			if (needsParens) {
				const endIndex = this.tokens.currentToken().rhsEndIndex;
				if (endIndex == null) throw new Error("Expected = token with an end index.");
				while (this.tokens.currentIndex() < endIndex) this.rootTransformer.processToken();
				this.tokens.appendCode(")");
			}
		}
		/**
		* Transform this:
		* export function foo() {}
		* into this:
		* function foo() {} exports.foo = foo;
		*/
		processExportFunction() {
			this.tokens.replaceToken("");
			const name = this.processNamedFunction();
			this.tokens.appendCode(` exports.${name} = ${name};`);
		}
		/**
		* Skip past a function with a name and return that name.
		*/
		processNamedFunction() {
			if (this.tokens.matches1(_types.TokenType._function)) this.tokens.copyToken();
			else if (this.tokens.matches2(_types.TokenType.name, _types.TokenType._function)) {
				if (!this.tokens.matchesContextual(_keywords.ContextualKeyword._async)) throw new Error("Expected async keyword in function export.");
				this.tokens.copyToken();
				this.tokens.copyToken();
			}
			if (this.tokens.matches1(_types.TokenType.star)) this.tokens.copyToken();
			if (!this.tokens.matches1(_types.TokenType.name)) throw new Error("Expected identifier for exported function name.");
			const name = this.tokens.identifierName();
			this.tokens.copyToken();
			if (this.tokens.currentToken().isType) {
				this.tokens.removeInitialToken();
				while (this.tokens.currentToken().isType) this.tokens.removeToken();
			}
			this.tokens.copyExpectedToken(_types.TokenType.parenL);
			this.rootTransformer.processBalancedCode();
			this.tokens.copyExpectedToken(_types.TokenType.parenR);
			this.rootTransformer.processPossibleTypeRange();
			this.tokens.copyExpectedToken(_types.TokenType.braceL);
			this.rootTransformer.processBalancedCode();
			this.tokens.copyExpectedToken(_types.TokenType.braceR);
			return name;
		}
		/**
		* Transform this:
		* export class A {}
		* into this:
		* class A {} exports.A = A;
		*/
		processExportClass() {
			this.tokens.removeInitialToken();
			this.copyDecorators();
			if (this.tokens.matches1(_types.TokenType._abstract)) this.tokens.removeToken();
			const name = this.rootTransformer.processNamedClass();
			this.tokens.appendCode(` exports.${name} = ${name};`);
		}
		/**
		* Transform this:
		* export {a, b as c};
		* into this:
		* exports.a = a; exports.c = b;
		*
		* OR
		*
		* Transform this:
		* export {a, b as c} from './foo';
		* into the pre-generated Object.defineProperty code from the ImportProcessor.
		*
		* For the first case, if the TypeScript transform is enabled, we need to skip
		* exports that are only defined as types.
		*/
		processExportBindings() {
			this.tokens.removeInitialToken();
			this.tokens.removeToken();
			const isReExport = _isExportFrom2.default.call(void 0, this.tokens);
			const exportStatements = [];
			while (true) {
				if (this.tokens.matches1(_types.TokenType.braceR)) {
					this.tokens.removeToken();
					break;
				}
				const specifierInfo = _getImportExportSpecifierInfo2.default.call(void 0, this.tokens);
				while (this.tokens.currentIndex() < specifierInfo.endIndex) this.tokens.removeToken();
				if (!(specifierInfo.isType || !isReExport && this.shouldElideExportedIdentifier(specifierInfo.leftName))) {
					const exportedName = specifierInfo.rightName;
					if (exportedName === "default") this.hadDefaultExport = true;
					else this.hadNamedExport = true;
					const localName = specifierInfo.leftName;
					const newLocalName = this.importProcessor.getIdentifierReplacement(localName);
					exportStatements.push(`exports.${exportedName} = ${newLocalName || localName};`);
				}
				if (this.tokens.matches1(_types.TokenType.braceR)) {
					this.tokens.removeToken();
					break;
				}
				if (this.tokens.matches2(_types.TokenType.comma, _types.TokenType.braceR)) {
					this.tokens.removeToken();
					this.tokens.removeToken();
					break;
				} else if (this.tokens.matches1(_types.TokenType.comma)) this.tokens.removeToken();
				else throw new Error(`Unexpected token: ${JSON.stringify(this.tokens.currentToken())}`);
			}
			if (this.tokens.matchesContextual(_keywords.ContextualKeyword._from)) {
				this.tokens.removeToken();
				const path = this.tokens.stringValue();
				this.tokens.replaceTokenTrimmingLeftWhitespace(this.importProcessor.claimImportCode(path));
				_removeMaybeImportAttributes.removeMaybeImportAttributes.call(void 0, this.tokens);
			} else this.tokens.appendCode(exportStatements.join(" "));
			if (this.tokens.matches1(_types.TokenType.semi)) this.tokens.removeToken();
		}
		processExportStar() {
			this.tokens.removeInitialToken();
			while (!this.tokens.matches1(_types.TokenType.string)) this.tokens.removeToken();
			const path = this.tokens.stringValue();
			this.tokens.replaceTokenTrimmingLeftWhitespace(this.importProcessor.claimImportCode(path));
			_removeMaybeImportAttributes.removeMaybeImportAttributes.call(void 0, this.tokens);
			if (this.tokens.matches1(_types.TokenType.semi)) this.tokens.removeToken();
		}
		shouldElideExportedIdentifier(name) {
			return this.isTypeScriptTransformEnabled && !this.keepUnusedImports && !this.declarationInfo.valueDeclarations.has(name);
		}
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/transformers/ESMImportTransformer.js
var require_ESMImportTransformer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _keywords = require_keywords();
	var _types = require_types$2();
	var _elideImportEquals2 = _interopRequireDefault(require_elideImportEquals());
	var _getDeclarationInfo = require_getDeclarationInfo();
	var _getDeclarationInfo2 = _interopRequireDefault(_getDeclarationInfo);
	var _getImportExportSpecifierInfo2 = _interopRequireDefault(require_getImportExportSpecifierInfo());
	var _getNonTypeIdentifiers = require_getNonTypeIdentifiers();
	var _isExportFrom2 = _interopRequireDefault(require_isExportFrom());
	var _removeMaybeImportAttributes = require_removeMaybeImportAttributes();
	var _shouldElideDefaultExport2 = _interopRequireDefault(require_shouldElideDefaultExport());
	var _Transformer2 = _interopRequireDefault(require_Transformer());
	/**
	* Class for editing import statements when we are keeping the code as ESM. We still need to remove
	* type-only imports in TypeScript and Flow.
	*/
	var ESMImportTransformer = class extends _Transformer2.default {
		constructor(tokens, nameManager, helperManager, reactHotLoaderTransformer, isTypeScriptTransformEnabled, isFlowTransformEnabled, keepUnusedImports, options) {
			super();
			this.tokens = tokens;
			this.nameManager = nameManager;
			this.helperManager = helperManager;
			this.reactHotLoaderTransformer = reactHotLoaderTransformer;
			this.isTypeScriptTransformEnabled = isTypeScriptTransformEnabled;
			this.isFlowTransformEnabled = isFlowTransformEnabled;
			this.keepUnusedImports = keepUnusedImports;
			this.nonTypeIdentifiers = isTypeScriptTransformEnabled && !keepUnusedImports ? _getNonTypeIdentifiers.getNonTypeIdentifiers.call(void 0, tokens, options) : /* @__PURE__ */ new Set();
			this.declarationInfo = isTypeScriptTransformEnabled && !keepUnusedImports ? _getDeclarationInfo2.default.call(void 0, tokens) : _getDeclarationInfo.EMPTY_DECLARATION_INFO;
			this.injectCreateRequireForImportRequire = Boolean(options.injectCreateRequireForImportRequire);
		}
		process() {
			if (this.tokens.matches3(_types.TokenType._import, _types.TokenType.name, _types.TokenType.eq)) return this.processImportEquals();
			if (this.tokens.matches4(_types.TokenType._import, _types.TokenType.name, _types.TokenType.name, _types.TokenType.eq) && this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 1, _keywords.ContextualKeyword._type)) {
				this.tokens.removeInitialToken();
				for (let i = 0; i < 7; i++) this.tokens.removeToken();
				return true;
			}
			if (this.tokens.matches2(_types.TokenType._export, _types.TokenType.eq)) {
				this.tokens.replaceToken("module.exports");
				return true;
			}
			if (this.tokens.matches5(_types.TokenType._export, _types.TokenType._import, _types.TokenType.name, _types.TokenType.name, _types.TokenType.eq) && this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 2, _keywords.ContextualKeyword._type)) {
				this.tokens.removeInitialToken();
				for (let i = 0; i < 8; i++) this.tokens.removeToken();
				return true;
			}
			if (this.tokens.matches1(_types.TokenType._import)) return this.processImport();
			if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._default)) return this.processExportDefault();
			if (this.tokens.matches2(_types.TokenType._export, _types.TokenType.braceL)) return this.processNamedExports();
			if (this.tokens.matches2(_types.TokenType._export, _types.TokenType.name) && this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 1, _keywords.ContextualKeyword._type)) {
				this.tokens.removeInitialToken();
				this.tokens.removeToken();
				if (this.tokens.matches1(_types.TokenType.braceL)) {
					while (!this.tokens.matches1(_types.TokenType.braceR)) this.tokens.removeToken();
					this.tokens.removeToken();
				} else {
					this.tokens.removeToken();
					if (this.tokens.matches1(_types.TokenType._as)) {
						this.tokens.removeToken();
						this.tokens.removeToken();
					}
				}
				if (this.tokens.matchesContextual(_keywords.ContextualKeyword._from) && this.tokens.matches1AtIndex(this.tokens.currentIndex() + 1, _types.TokenType.string)) {
					this.tokens.removeToken();
					this.tokens.removeToken();
					_removeMaybeImportAttributes.removeMaybeImportAttributes.call(void 0, this.tokens);
				}
				return true;
			}
			return false;
		}
		processImportEquals() {
			const importName = this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 1);
			if (this.shouldAutomaticallyElideImportedName(importName)) _elideImportEquals2.default.call(void 0, this.tokens);
			else if (this.injectCreateRequireForImportRequire) {
				this.tokens.replaceToken("const");
				this.tokens.copyToken();
				this.tokens.copyToken();
				this.tokens.replaceToken(this.helperManager.getHelperName("require"));
			} else this.tokens.replaceToken("const");
			return true;
		}
		processImport() {
			if (this.tokens.matches2(_types.TokenType._import, _types.TokenType.parenL)) return false;
			const snapshot = this.tokens.snapshot();
			if (this.removeImportTypeBindings()) {
				this.tokens.restoreToSnapshot(snapshot);
				while (!this.tokens.matches1(_types.TokenType.string)) this.tokens.removeToken();
				this.tokens.removeToken();
				_removeMaybeImportAttributes.removeMaybeImportAttributes.call(void 0, this.tokens);
				if (this.tokens.matches1(_types.TokenType.semi)) this.tokens.removeToken();
			}
			return true;
		}
		/**
		* Remove type bindings from this import, leaving the rest of the import intact.
		*
		* Return true if this import was ONLY types, and thus is eligible for removal. This will bail out
		* of the replacement operation, so we can return early here.
		*/
		removeImportTypeBindings() {
			this.tokens.copyExpectedToken(_types.TokenType._import);
			if (this.tokens.matchesContextual(_keywords.ContextualKeyword._type) && !this.tokens.matches1AtIndex(this.tokens.currentIndex() + 1, _types.TokenType.comma) && !this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 1, _keywords.ContextualKeyword._from)) return true;
			if (this.tokens.matches1(_types.TokenType.string)) {
				this.tokens.copyToken();
				return false;
			}
			if (this.tokens.matchesContextual(_keywords.ContextualKeyword._module) && this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 2, _keywords.ContextualKeyword._from)) this.tokens.copyToken();
			let foundNonTypeImport = false;
			let foundAnyNamedImport = false;
			let needsComma = false;
			if (this.tokens.matches1(_types.TokenType.name)) {
				if (this.shouldAutomaticallyElideImportedName(this.tokens.identifierName())) {
					this.tokens.removeToken();
					if (this.tokens.matches1(_types.TokenType.comma)) this.tokens.removeToken();
				} else {
					foundNonTypeImport = true;
					this.tokens.copyToken();
					if (this.tokens.matches1(_types.TokenType.comma)) {
						needsComma = true;
						this.tokens.removeToken();
					}
				}
			}
			if (this.tokens.matches1(_types.TokenType.star)) {
				if (this.shouldAutomaticallyElideImportedName(this.tokens.identifierNameAtRelativeIndex(2))) {
					this.tokens.removeToken();
					this.tokens.removeToken();
					this.tokens.removeToken();
				} else {
					if (needsComma) this.tokens.appendCode(",");
					foundNonTypeImport = true;
					this.tokens.copyExpectedToken(_types.TokenType.star);
					this.tokens.copyExpectedToken(_types.TokenType.name);
					this.tokens.copyExpectedToken(_types.TokenType.name);
				}
			} else if (this.tokens.matches1(_types.TokenType.braceL)) {
				if (needsComma) this.tokens.appendCode(",");
				this.tokens.copyToken();
				while (!this.tokens.matches1(_types.TokenType.braceR)) {
					foundAnyNamedImport = true;
					const specifierInfo = _getImportExportSpecifierInfo2.default.call(void 0, this.tokens);
					if (specifierInfo.isType || this.shouldAutomaticallyElideImportedName(specifierInfo.rightName)) {
						while (this.tokens.currentIndex() < specifierInfo.endIndex) this.tokens.removeToken();
						if (this.tokens.matches1(_types.TokenType.comma)) this.tokens.removeToken();
					} else {
						foundNonTypeImport = true;
						while (this.tokens.currentIndex() < specifierInfo.endIndex) this.tokens.copyToken();
						if (this.tokens.matches1(_types.TokenType.comma)) this.tokens.copyToken();
					}
				}
				this.tokens.copyExpectedToken(_types.TokenType.braceR);
			}
			if (this.keepUnusedImports) return false;
			if (this.isTypeScriptTransformEnabled) return !foundNonTypeImport;
			else if (this.isFlowTransformEnabled) return foundAnyNamedImport && !foundNonTypeImport;
			else return false;
		}
		shouldAutomaticallyElideImportedName(name) {
			return this.isTypeScriptTransformEnabled && !this.keepUnusedImports && !this.nonTypeIdentifiers.has(name);
		}
		processExportDefault() {
			if (_shouldElideDefaultExport2.default.call(void 0, this.isTypeScriptTransformEnabled, this.keepUnusedImports, this.tokens, this.declarationInfo)) {
				this.tokens.removeInitialToken();
				this.tokens.removeToken();
				this.tokens.removeToken();
				return true;
			}
			if (!(this.tokens.matches4(_types.TokenType._export, _types.TokenType._default, _types.TokenType._function, _types.TokenType.name) || this.tokens.matches5(_types.TokenType._export, _types.TokenType._default, _types.TokenType.name, _types.TokenType._function, _types.TokenType.name) && this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 2, _keywords.ContextualKeyword._async) || this.tokens.matches4(_types.TokenType._export, _types.TokenType._default, _types.TokenType._class, _types.TokenType.name) || this.tokens.matches5(_types.TokenType._export, _types.TokenType._default, _types.TokenType._abstract, _types.TokenType._class, _types.TokenType.name)) && this.reactHotLoaderTransformer) {
				const defaultVarName = this.nameManager.claimFreeName("_default");
				this.tokens.replaceToken(`let ${defaultVarName}; export`);
				this.tokens.copyToken();
				this.tokens.appendCode(` ${defaultVarName} =`);
				this.reactHotLoaderTransformer.setExtractedDefaultExportName(defaultVarName);
				return true;
			}
			return false;
		}
		/**
		* Handle a statement with one of these forms:
		* export {a, type b};
		* export {c, type d} from 'foo';
		*
		* In both cases, any explicit type exports should be removed. In the first
		* case, we also need to handle implicit export elision for names declared as
		* types. In the second case, we must NOT do implicit named export elision,
		* but we must remove the runtime import if all exports are type exports.
		*/
		processNamedExports() {
			if (!this.isTypeScriptTransformEnabled) return false;
			this.tokens.copyExpectedToken(_types.TokenType._export);
			this.tokens.copyExpectedToken(_types.TokenType.braceL);
			const isReExport = _isExportFrom2.default.call(void 0, this.tokens);
			let foundNonTypeExport = false;
			while (!this.tokens.matches1(_types.TokenType.braceR)) {
				const specifierInfo = _getImportExportSpecifierInfo2.default.call(void 0, this.tokens);
				if (specifierInfo.isType || !isReExport && this.shouldElideExportedName(specifierInfo.leftName)) {
					while (this.tokens.currentIndex() < specifierInfo.endIndex) this.tokens.removeToken();
					if (this.tokens.matches1(_types.TokenType.comma)) this.tokens.removeToken();
				} else {
					foundNonTypeExport = true;
					while (this.tokens.currentIndex() < specifierInfo.endIndex) this.tokens.copyToken();
					if (this.tokens.matches1(_types.TokenType.comma)) this.tokens.copyToken();
				}
			}
			this.tokens.copyExpectedToken(_types.TokenType.braceR);
			if (!this.keepUnusedImports && isReExport && !foundNonTypeExport) {
				this.tokens.removeToken();
				this.tokens.removeToken();
				_removeMaybeImportAttributes.removeMaybeImportAttributes.call(void 0, this.tokens);
			}
			return true;
		}
		/**
		* ESM elides all imports with the rule that we only elide if we see that it's
		* a type and never see it as a value. This is in contrast to CJS, which
		* elides imports that are completely unknown.
		*/
		shouldElideExportedName(name) {
			return this.isTypeScriptTransformEnabled && !this.keepUnusedImports && this.declarationInfo.typeDeclarations.has(name) && !this.declarationInfo.valueDeclarations.has(name);
		}
	};
	exports.default = ESMImportTransformer;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/transformers/FlowTransformer.js
var require_FlowTransformer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _keywords = require_keywords();
	var _types = require_types$2();
	var _Transformer2 = _interopRequireDefault(require_Transformer());
	var FlowTransformer = class extends _Transformer2.default {
		constructor(rootTransformer, tokens, isImportsTransformEnabled) {
			super();
			this.rootTransformer = rootTransformer;
			this.tokens = tokens;
			this.isImportsTransformEnabled = isImportsTransformEnabled;
		}
		process() {
			if (this.rootTransformer.processPossibleArrowParamEnd() || this.rootTransformer.processPossibleAsyncArrowWithTypeParams() || this.rootTransformer.processPossibleTypeRange()) return true;
			if (this.tokens.matches1(_types.TokenType._enum)) {
				this.processEnum();
				return true;
			}
			if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._enum)) {
				this.processNamedExportEnum();
				return true;
			}
			if (this.tokens.matches3(_types.TokenType._export, _types.TokenType._default, _types.TokenType._enum)) {
				this.processDefaultExportEnum();
				return true;
			}
			return false;
		}
		/**
		* Handle a declaration like:
		* export enum E ...
		*
		* With this imports transform, this becomes:
		* const E = [[enum]]; exports.E = E;
		*
		* otherwise, it becomes:
		* export const E = [[enum]];
		*/
		processNamedExportEnum() {
			if (this.isImportsTransformEnabled) {
				this.tokens.removeInitialToken();
				const enumName = this.tokens.identifierNameAtRelativeIndex(1);
				this.processEnum();
				this.tokens.appendCode(` exports.${enumName} = ${enumName};`);
			} else {
				this.tokens.copyToken();
				this.processEnum();
			}
		}
		/**
		* Handle a declaration like:
		* export default enum E
		*
		* With the imports transform, this becomes:
		* const E = [[enum]]; exports.default = E;
		*
		* otherwise, it becomes:
		* const E = [[enum]]; export default E;
		*/
		processDefaultExportEnum() {
			this.tokens.removeInitialToken();
			this.tokens.removeToken();
			const enumName = this.tokens.identifierNameAtRelativeIndex(1);
			this.processEnum();
			if (this.isImportsTransformEnabled) this.tokens.appendCode(` exports.default = ${enumName};`);
			else this.tokens.appendCode(` export default ${enumName};`);
		}
		/**
		* Transpile flow enums to invoke the "flow-enums-runtime" library.
		*
		* Currently, the transpiled code always uses `require("flow-enums-runtime")`,
		* but if future flexibility is needed, we could expose a config option for
		* this string (similar to configurable JSX). Even when targeting ESM, the
		* default behavior of babel-plugin-transform-flow-enums is to use require
		* rather than injecting an import.
		*
		* Flow enums are quite a bit simpler than TS enums and have some convenient
		* constraints:
		* - Element initializers must be either always present or always absent. That
		*   means that we can use fixed lookahead on the first element (if any) and
		*   assume that all elements are like that.
		* - The right-hand side of an element initializer must be a literal value,
		*   not a complex expression and not referencing other elements. That means
		*   we can simply copy a single token.
		*
		* Enums can be broken up into three basic cases:
		*
		* Mirrored enums:
		* enum E {A, B}
		*   ->
		* const E = require("flow-enums-runtime").Mirrored(["A", "B"]);
		*
		* Initializer enums:
		* enum E {A = 1, B = 2}
		*   ->
		* const E = require("flow-enums-runtime")({A: 1, B: 2});
		*
		* Symbol enums:
		* enum E of symbol {A, B}
		*   ->
		* const E = require("flow-enums-runtime")({A: Symbol("A"), B: Symbol("B")});
		*
		* We can statically detect which of the three cases this is by looking at the
		* "of" declaration (if any) and seeing if the first element has an initializer.
		* Since the other transform details are so similar between the three cases, we
		* use a single implementation and vary the transform within processEnumElement
		* based on case.
		*/
		processEnum() {
			this.tokens.replaceToken("const");
			this.tokens.copyExpectedToken(_types.TokenType.name);
			let isSymbolEnum = false;
			if (this.tokens.matchesContextual(_keywords.ContextualKeyword._of)) {
				this.tokens.removeToken();
				isSymbolEnum = this.tokens.matchesContextual(_keywords.ContextualKeyword._symbol);
				this.tokens.removeToken();
			}
			const hasInitializers = this.tokens.matches3(_types.TokenType.braceL, _types.TokenType.name, _types.TokenType.eq);
			this.tokens.appendCode(" = require(\"flow-enums-runtime\")");
			const isMirrored = !isSymbolEnum && !hasInitializers;
			this.tokens.replaceTokenTrimmingLeftWhitespace(isMirrored ? ".Mirrored([" : "({");
			while (!this.tokens.matches1(_types.TokenType.braceR)) {
				if (this.tokens.matches1(_types.TokenType.ellipsis)) {
					this.tokens.removeToken();
					break;
				}
				this.processEnumElement(isSymbolEnum, hasInitializers);
				if (this.tokens.matches1(_types.TokenType.comma)) this.tokens.copyToken();
			}
			this.tokens.replaceToken(isMirrored ? "]);" : "});");
		}
		/**
		* Process an individual enum element, producing either an array element or an
		* object element based on what type of enum this is.
		*/
		processEnumElement(isSymbolEnum, hasInitializers) {
			if (isSymbolEnum) {
				const elementName = this.tokens.identifierName();
				this.tokens.copyToken();
				this.tokens.appendCode(`: Symbol("${elementName}")`);
			} else if (hasInitializers) {
				this.tokens.copyToken();
				this.tokens.replaceTokenTrimmingLeftWhitespace(":");
				this.tokens.copyToken();
			} else this.tokens.replaceToken(`"${this.tokens.identifierName()}"`);
		}
	};
	exports.default = FlowTransformer;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/transformers/JestHoistTransformer.js
var require_JestHoistTransformer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	function _optionalChain(ops) {
		let lastAccessLHS = void 0;
		let value = ops[0];
		let i = 1;
		while (i < ops.length) {
			const op = ops[i];
			const fn = ops[i + 1];
			i += 2;
			if ((op === "optionalAccess" || op === "optionalCall") && value == null) return;
			if (op === "access" || op === "optionalAccess") {
				lastAccessLHS = value;
				value = fn(value);
			} else if (op === "call" || op === "optionalCall") {
				value = fn((...args) => value.call(lastAccessLHS, ...args));
				lastAccessLHS = void 0;
			}
		}
		return value;
	}
	var _types = require_types$2();
	var _Transformer2 = _interopRequireDefault(require_Transformer());
	const JEST_GLOBAL_NAME = "jest";
	const HOISTED_METHODS = [
		"mock",
		"unmock",
		"enableAutomock",
		"disableAutomock"
	];
	exports.default = class JestHoistTransformer extends _Transformer2.default {
		__init() {
			this.hoistedFunctionNames = [];
		}
		constructor(rootTransformer, tokens, nameManager, importProcessor) {
			super();
			this.rootTransformer = rootTransformer;
			this.tokens = tokens;
			this.nameManager = nameManager;
			this.importProcessor = importProcessor;
			JestHoistTransformer.prototype.__init.call(this);
		}
		process() {
			if (this.tokens.currentToken().scopeDepth === 0 && this.tokens.matches4(_types.TokenType.name, _types.TokenType.dot, _types.TokenType.name, _types.TokenType.parenL) && this.tokens.identifierName() === JEST_GLOBAL_NAME) {
				if (_optionalChain([
					this,
					"access",
					(_) => _.importProcessor,
					"optionalAccess",
					(_2) => _2.getGlobalNames,
					"call",
					(_3) => _3(),
					"optionalAccess",
					(_4) => _4.has,
					"call",
					(_5) => _5(JEST_GLOBAL_NAME)
				])) return false;
				return this.extractHoistedCalls();
			}
			return false;
		}
		getHoistedCode() {
			if (this.hoistedFunctionNames.length > 0) return this.hoistedFunctionNames.map((name) => `${name}();`).join("");
			return "";
		}
		/**
		* Extracts any methods calls on the jest-object that should be hoisted.
		*
		* According to the jest docs, https://jestjs.io/docs/en/jest-object#jestmockmodulename-factory-options,
		* mock, unmock, enableAutomock, disableAutomock, are the methods that should be hoisted.
		*
		* We do not apply the same checks of the arguments as babel-plugin-jest-hoist does.
		*/
		extractHoistedCalls() {
			this.tokens.removeToken();
			let followsNonHoistedJestCall = false;
			while (this.tokens.matches3(_types.TokenType.dot, _types.TokenType.name, _types.TokenType.parenL)) {
				const methodName = this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 1);
				if (HOISTED_METHODS.includes(methodName)) {
					const hoistedFunctionName = this.nameManager.claimFreeName("__jestHoist");
					this.hoistedFunctionNames.push(hoistedFunctionName);
					this.tokens.replaceToken(`function ${hoistedFunctionName}(){${JEST_GLOBAL_NAME}.`);
					this.tokens.copyToken();
					this.tokens.copyToken();
					this.rootTransformer.processBalancedCode();
					this.tokens.copyExpectedToken(_types.TokenType.parenR);
					this.tokens.appendCode(";}");
					followsNonHoistedJestCall = false;
				} else {
					if (followsNonHoistedJestCall) this.tokens.copyToken();
					else this.tokens.replaceToken(`${JEST_GLOBAL_NAME}.`);
					this.tokens.copyToken();
					this.tokens.copyToken();
					this.rootTransformer.processBalancedCode();
					this.tokens.copyExpectedToken(_types.TokenType.parenR);
					followsNonHoistedJestCall = true;
				}
			}
			return true;
		}
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/transformers/NumericSeparatorTransformer.js
var require_NumericSeparatorTransformer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _types = require_types$2();
	var _Transformer2 = _interopRequireDefault(require_Transformer());
	var NumericSeparatorTransformer = class extends _Transformer2.default {
		constructor(tokens) {
			super();
			this.tokens = tokens;
		}
		process() {
			if (this.tokens.matches1(_types.TokenType.num)) {
				const code = this.tokens.currentTokenCode();
				if (code.includes("_")) {
					this.tokens.replaceToken(code.replace(/_/g, ""));
					return true;
				}
			}
			return false;
		}
	};
	exports.default = NumericSeparatorTransformer;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/transformers/OptionalCatchBindingTransformer.js
var require_OptionalCatchBindingTransformer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _types = require_types$2();
	var _Transformer2 = _interopRequireDefault(require_Transformer());
	var OptionalCatchBindingTransformer = class extends _Transformer2.default {
		constructor(tokens, nameManager) {
			super();
			this.tokens = tokens;
			this.nameManager = nameManager;
		}
		process() {
			if (this.tokens.matches2(_types.TokenType._catch, _types.TokenType.braceL)) {
				this.tokens.copyToken();
				this.tokens.appendCode(` (${this.nameManager.claimFreeName("e")})`);
				return true;
			}
			return false;
		}
	};
	exports.default = OptionalCatchBindingTransformer;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/transformers/OptionalChainingNullishTransformer.js
var require_OptionalChainingNullishTransformer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _types = require_types$2();
	var _Transformer2 = _interopRequireDefault(require_Transformer());
	/**
	* Transformer supporting the optional chaining and nullish coalescing operators.
	*
	* Tech plan here:
	* https://github.com/alangpierce/sucrase/wiki/Sucrase-Optional-Chaining-and-Nullish-Coalescing-Technical-Plan
	*
	* The prefix and suffix code snippets are handled by TokenProcessor, and this transformer handles
	* the operators themselves.
	*/
	var OptionalChainingNullishTransformer = class extends _Transformer2.default {
		constructor(tokens, nameManager) {
			super();
			this.tokens = tokens;
			this.nameManager = nameManager;
		}
		process() {
			if (this.tokens.matches1(_types.TokenType.nullishCoalescing)) {
				const token = this.tokens.currentToken();
				if (this.tokens.tokens[token.nullishStartIndex].isAsyncOperation) this.tokens.replaceTokenTrimmingLeftWhitespace(", async () => (");
				else this.tokens.replaceTokenTrimmingLeftWhitespace(", () => (");
				return true;
			}
			if (this.tokens.matches1(_types.TokenType._delete)) {
				if (this.tokens.tokenAtRelativeIndex(1).isOptionalChainStart) {
					this.tokens.removeInitialToken();
					return true;
				}
			}
			const chainStart = this.tokens.currentToken().subscriptStartIndex;
			if (chainStart != null && this.tokens.tokens[chainStart].isOptionalChainStart && this.tokens.tokenAtRelativeIndex(-1).type !== _types.TokenType._super) {
				const param = this.nameManager.claimFreeName("_");
				let arrowStartSnippet;
				if (chainStart > 0 && this.tokens.matches1AtIndex(chainStart - 1, _types.TokenType._delete) && this.isLastSubscriptInChain()) arrowStartSnippet = `${param} => delete ${param}`;
				else arrowStartSnippet = `${param} => ${param}`;
				if (this.tokens.tokens[chainStart].isAsyncOperation) arrowStartSnippet = `async ${arrowStartSnippet}`;
				if (this.tokens.matches2(_types.TokenType.questionDot, _types.TokenType.parenL) || this.tokens.matches2(_types.TokenType.questionDot, _types.TokenType.lessThan)) {
					if (this.justSkippedSuper()) this.tokens.appendCode(".bind(this)");
					this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'optionalCall', ${arrowStartSnippet}`);
				} else if (this.tokens.matches2(_types.TokenType.questionDot, _types.TokenType.bracketL)) this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'optionalAccess', ${arrowStartSnippet}`);
				else if (this.tokens.matches1(_types.TokenType.questionDot)) this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'optionalAccess', ${arrowStartSnippet}.`);
				else if (this.tokens.matches1(_types.TokenType.dot)) this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'access', ${arrowStartSnippet}.`);
				else if (this.tokens.matches1(_types.TokenType.bracketL)) this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'access', ${arrowStartSnippet}[`);
				else if (this.tokens.matches1(_types.TokenType.parenL)) {
					if (this.justSkippedSuper()) this.tokens.appendCode(".bind(this)");
					this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'call', ${arrowStartSnippet}(`);
				} else throw new Error("Unexpected subscript operator in optional chain.");
				return true;
			}
			return false;
		}
		/**
		* Determine if the current token is the last of its chain, so that we know whether it's eligible
		* to have a delete op inserted.
		*
		* We can do this by walking forward until we determine one way or another. Each
		* isOptionalChainStart token must be paired with exactly one isOptionalChainEnd token after it in
		* a nesting way, so we can track depth and walk to the end of the chain (the point where the
		* depth goes negative) and see if any other subscript token is after us in the chain.
		*/
		isLastSubscriptInChain() {
			let depth = 0;
			for (let i = this.tokens.currentIndex() + 1;; i++) {
				if (i >= this.tokens.tokens.length) throw new Error("Reached the end of the code while finding the end of the access chain.");
				if (this.tokens.tokens[i].isOptionalChainStart) depth++;
				else if (this.tokens.tokens[i].isOptionalChainEnd) depth--;
				if (depth < 0) return true;
				if (depth === 0 && this.tokens.tokens[i].subscriptStartIndex != null) return false;
			}
		}
		/**
		* Determine if we are the open-paren in an expression like super.a()?.b.
		*
		* We can do this by walking backward to find the previous subscript. If that subscript was
		* preceded by a super, then we must be the subscript after it, so if this is a call expression,
		* we'll need to attach the right context.
		*/
		justSkippedSuper() {
			let depth = 0;
			let index = this.tokens.currentIndex() - 1;
			while (true) {
				if (index < 0) throw new Error("Reached the start of the code while finding the start of the access chain.");
				if (this.tokens.tokens[index].isOptionalChainStart) depth--;
				else if (this.tokens.tokens[index].isOptionalChainEnd) depth++;
				if (depth < 0) return false;
				if (depth === 0 && this.tokens.tokens[index].subscriptStartIndex != null) return this.tokens.tokens[index - 1].type === _types.TokenType._super;
				index--;
			}
		}
	};
	exports.default = OptionalChainingNullishTransformer;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/transformers/ReactDisplayNameTransformer.js
var require_ReactDisplayNameTransformer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _tokenizer = require_tokenizer();
	var _types = require_types$2();
	var _Transformer2 = _interopRequireDefault(require_Transformer());
	/**
	* Implementation of babel-plugin-transform-react-display-name, which adds a
	* display name to usages of React.createClass and createReactClass.
	*/
	var ReactDisplayNameTransformer = class extends _Transformer2.default {
		constructor(rootTransformer, tokens, importProcessor, options) {
			super();
			this.rootTransformer = rootTransformer;
			this.tokens = tokens;
			this.importProcessor = importProcessor;
			this.options = options;
		}
		process() {
			const startIndex = this.tokens.currentIndex();
			if (this.tokens.identifierName() === "createReactClass") {
				const newName = this.importProcessor && this.importProcessor.getIdentifierReplacement("createReactClass");
				if (newName) this.tokens.replaceToken(`(0, ${newName})`);
				else this.tokens.copyToken();
				this.tryProcessCreateClassCall(startIndex);
				return true;
			}
			if (this.tokens.matches3(_types.TokenType.name, _types.TokenType.dot, _types.TokenType.name) && this.tokens.identifierName() === "React" && this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 2) === "createClass") {
				const newName = this.importProcessor ? this.importProcessor.getIdentifierReplacement("React") || "React" : "React";
				if (newName) {
					this.tokens.replaceToken(newName);
					this.tokens.copyToken();
					this.tokens.copyToken();
				} else {
					this.tokens.copyToken();
					this.tokens.copyToken();
					this.tokens.copyToken();
				}
				this.tryProcessCreateClassCall(startIndex);
				return true;
			}
			return false;
		}
		/**
		* This is called with the token position at the open-paren.
		*/
		tryProcessCreateClassCall(startIndex) {
			const displayName = this.findDisplayName(startIndex);
			if (!displayName) return;
			if (this.classNeedsDisplayName()) {
				this.tokens.copyExpectedToken(_types.TokenType.parenL);
				this.tokens.copyExpectedToken(_types.TokenType.braceL);
				this.tokens.appendCode(`displayName: '${displayName}',`);
				this.rootTransformer.processBalancedCode();
				this.tokens.copyExpectedToken(_types.TokenType.braceR);
				this.tokens.copyExpectedToken(_types.TokenType.parenR);
			}
		}
		findDisplayName(startIndex) {
			if (startIndex < 2) return null;
			if (this.tokens.matches2AtIndex(startIndex - 2, _types.TokenType.name, _types.TokenType.eq)) return this.tokens.identifierNameAtIndex(startIndex - 2);
			if (startIndex >= 2 && this.tokens.tokens[startIndex - 2].identifierRole === _tokenizer.IdentifierRole.ObjectKey) return this.tokens.identifierNameAtIndex(startIndex - 2);
			if (this.tokens.matches2AtIndex(startIndex - 2, _types.TokenType._export, _types.TokenType._default)) return this.getDisplayNameFromFilename();
			return null;
		}
		getDisplayNameFromFilename() {
			const pathSegments = (this.options.filePath || "unknown").split("/");
			const filename = pathSegments[pathSegments.length - 1];
			const dotIndex = filename.lastIndexOf(".");
			const baseFilename = dotIndex === -1 ? filename : filename.slice(0, dotIndex);
			if (baseFilename === "index" && pathSegments[pathSegments.length - 2]) return pathSegments[pathSegments.length - 2];
			else return baseFilename;
		}
		/**
		* We only want to add a display name when this is a function call containing
		* one argument, which is an object literal without `displayName` as an
		* existing key.
		*/
		classNeedsDisplayName() {
			let index = this.tokens.currentIndex();
			if (!this.tokens.matches2(_types.TokenType.parenL, _types.TokenType.braceL)) return false;
			const objectStartIndex = index + 1;
			const objectContextId = this.tokens.tokens[objectStartIndex].contextId;
			if (objectContextId == null) throw new Error("Expected non-null context ID on object open-brace.");
			for (; index < this.tokens.tokens.length; index++) {
				const token = this.tokens.tokens[index];
				if (token.type === _types.TokenType.braceR && token.contextId === objectContextId) {
					index++;
					break;
				}
				if (this.tokens.identifierNameAtIndex(index) === "displayName" && this.tokens.tokens[index].identifierRole === _tokenizer.IdentifierRole.ObjectKey && token.contextId === objectContextId) return false;
			}
			if (index === this.tokens.tokens.length) throw new Error("Unexpected end of input when processing React class.");
			return this.tokens.matches1AtIndex(index, _types.TokenType.parenR) || this.tokens.matches2AtIndex(index, _types.TokenType.comma, _types.TokenType.parenR);
		}
	};
	exports.default = ReactDisplayNameTransformer;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/transformers/ReactHotLoaderTransformer.js
var require_ReactHotLoaderTransformer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _tokenizer = require_tokenizer();
	var _Transformer2 = _interopRequireDefault(require_Transformer());
	exports.default = class ReactHotLoaderTransformer extends _Transformer2.default {
		__init() {
			this.extractedDefaultExportName = null;
		}
		constructor(tokens, filePath) {
			super();
			this.tokens = tokens;
			this.filePath = filePath;
			ReactHotLoaderTransformer.prototype.__init.call(this);
		}
		setExtractedDefaultExportName(extractedDefaultExportName) {
			this.extractedDefaultExportName = extractedDefaultExportName;
		}
		getPrefixCode() {
			return `
      (function () {
        var enterModule = require('react-hot-loader').enterModule;
        enterModule && enterModule(module);
      })();`.replace(/\s+/g, " ").trim();
		}
		getSuffixCode() {
			const topLevelNames = /* @__PURE__ */ new Set();
			for (const token of this.tokens.tokens) if (!token.isType && _tokenizer.isTopLevelDeclaration.call(void 0, token) && token.identifierRole !== _tokenizer.IdentifierRole.ImportDeclaration) topLevelNames.add(this.tokens.identifierNameForToken(token));
			const namesToRegister = Array.from(topLevelNames).map((name) => ({
				variableName: name,
				uniqueLocalName: name
			}));
			if (this.extractedDefaultExportName) namesToRegister.push({
				variableName: this.extractedDefaultExportName,
				uniqueLocalName: "default"
			});
			return `
;(function () {
  var reactHotLoader = require('react-hot-loader').default;
  var leaveModule = require('react-hot-loader').leaveModule;
  if (!reactHotLoader) {
    return;
  }
${namesToRegister.map(({ variableName, uniqueLocalName }) => `  reactHotLoader.register(${variableName}, "${uniqueLocalName}", ${JSON.stringify(this.filePath || "")});`).join("\n")}
  leaveModule(module);
})();`;
		}
		process() {
			return false;
		}
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/util/isIdentifier.js
var require_isIdentifier = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var _identifier = require_identifier();
	const RESERVED_WORDS = /* @__PURE__ */ new Set([
		"break",
		"case",
		"catch",
		"class",
		"const",
		"continue",
		"debugger",
		"default",
		"delete",
		"do",
		"else",
		"export",
		"extends",
		"finally",
		"for",
		"function",
		"if",
		"import",
		"in",
		"instanceof",
		"new",
		"return",
		"super",
		"switch",
		"this",
		"throw",
		"try",
		"typeof",
		"var",
		"void",
		"while",
		"with",
		"yield",
		"enum",
		"implements",
		"interface",
		"let",
		"package",
		"private",
		"protected",
		"public",
		"static",
		"await",
		"false",
		"null",
		"true"
	]);
	/**
	* Determine if the given name is a legal variable name.
	*
	* This is needed when transforming TypeScript enums; if an enum key is a valid
	* variable name, it might be referenced later in the enum, so we need to
	* declare a variable.
	*/
	function isIdentifier(name) {
		if (name.length === 0) return false;
		if (!_identifier.IS_IDENTIFIER_START[name.charCodeAt(0)]) return false;
		for (let i = 1; i < name.length; i++) if (!_identifier.IS_IDENTIFIER_CHAR[name.charCodeAt(i)]) return false;
		return !RESERVED_WORDS.has(name);
	}
	exports.default = isIdentifier;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/transformers/TypeScriptTransformer.js
var require_TypeScriptTransformer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _types = require_types$2();
	var _isIdentifier2 = _interopRequireDefault(require_isIdentifier());
	var _Transformer2 = _interopRequireDefault(require_Transformer());
	var TypeScriptTransformer = class extends _Transformer2.default {
		constructor(rootTransformer, tokens, isImportsTransformEnabled) {
			super();
			this.rootTransformer = rootTransformer;
			this.tokens = tokens;
			this.isImportsTransformEnabled = isImportsTransformEnabled;
		}
		process() {
			if (this.rootTransformer.processPossibleArrowParamEnd() || this.rootTransformer.processPossibleAsyncArrowWithTypeParams() || this.rootTransformer.processPossibleTypeRange()) return true;
			if (this.tokens.matches1(_types.TokenType._public) || this.tokens.matches1(_types.TokenType._protected) || this.tokens.matches1(_types.TokenType._private) || this.tokens.matches1(_types.TokenType._abstract) || this.tokens.matches1(_types.TokenType._readonly) || this.tokens.matches1(_types.TokenType._override) || this.tokens.matches1(_types.TokenType.nonNullAssertion)) {
				this.tokens.removeInitialToken();
				return true;
			}
			if (this.tokens.matches1(_types.TokenType._enum) || this.tokens.matches2(_types.TokenType._const, _types.TokenType._enum)) {
				this.processEnum();
				return true;
			}
			if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._enum) || this.tokens.matches3(_types.TokenType._export, _types.TokenType._const, _types.TokenType._enum)) {
				this.processEnum(true);
				return true;
			}
			return false;
		}
		processEnum(isExport = false) {
			this.tokens.removeInitialToken();
			while (this.tokens.matches1(_types.TokenType._const) || this.tokens.matches1(_types.TokenType._enum)) this.tokens.removeToken();
			const enumName = this.tokens.identifierName();
			this.tokens.removeToken();
			if (isExport && !this.isImportsTransformEnabled) this.tokens.appendCode("export ");
			this.tokens.appendCode(`var ${enumName}; (function (${enumName})`);
			this.tokens.copyExpectedToken(_types.TokenType.braceL);
			this.processEnumBody(enumName);
			this.tokens.copyExpectedToken(_types.TokenType.braceR);
			if (isExport && this.isImportsTransformEnabled) this.tokens.appendCode(`)(${enumName} || (exports.${enumName} = ${enumName} = {}));`);
			else this.tokens.appendCode(`)(${enumName} || (${enumName} = {}));`);
		}
		/**
		* Transform an enum into equivalent JS. This has complexity in a few places:
		* - TS allows string enums, numeric enums, and a mix of the two styles within an enum.
		* - Enum keys are allowed to be referenced in later enum values.
		* - Enum keys are allowed to be strings.
		* - When enum values are omitted, they should follow an auto-increment behavior.
		*/
		processEnumBody(enumName) {
			let previousValueCode = null;
			while (true) {
				if (this.tokens.matches1(_types.TokenType.braceR)) break;
				const { nameStringCode, variableName } = this.extractEnumKeyInfo(this.tokens.currentToken());
				this.tokens.removeInitialToken();
				if (this.tokens.matches3(_types.TokenType.eq, _types.TokenType.string, _types.TokenType.comma) || this.tokens.matches3(_types.TokenType.eq, _types.TokenType.string, _types.TokenType.braceR)) this.processStringLiteralEnumMember(enumName, nameStringCode, variableName);
				else if (this.tokens.matches1(_types.TokenType.eq)) this.processExplicitValueEnumMember(enumName, nameStringCode, variableName);
				else this.processImplicitValueEnumMember(enumName, nameStringCode, variableName, previousValueCode);
				if (this.tokens.matches1(_types.TokenType.comma)) this.tokens.removeToken();
				if (variableName != null) previousValueCode = variableName;
				else previousValueCode = `${enumName}[${nameStringCode}]`;
			}
		}
		/**
		* Detect name information about this enum key, which will be used to determine which code to emit
		* and whether we should declare a variable as part of this declaration.
		*
		* Some cases to keep in mind:
		* - Enum keys can be implicitly referenced later, e.g. `X = 1, Y = X`. In Sucrase, we implement
		*   this by declaring a variable `X` so that later expressions can use it.
		* - In addition to the usual identifier key syntax, enum keys are allowed to be string literals,
		*   e.g. `"hello world" = 3,`. Template literal syntax is NOT allowed.
		* - Even if the enum key is defined as a string literal, it may still be referenced by identifier
		*   later, e.g. `"X" = 1, Y = X`. That means that we need to detect whether or not a string
		*   literal is identifier-like and emit a variable if so, even if the declaration did not use an
		*   identifier.
		* - Reserved keywords like `break` are valid enum keys, but are not valid to be referenced later
		*   and would be a syntax error if we emitted a variable, so we need to skip the variable
		*   declaration in those cases.
		*
		* The variableName return value captures these nuances: if non-null, we can and must emit a
		* variable declaration, and if null, we can't and shouldn't.
		*/
		extractEnumKeyInfo(nameToken) {
			if (nameToken.type === _types.TokenType.name) {
				const name = this.tokens.identifierNameForToken(nameToken);
				return {
					nameStringCode: `"${name}"`,
					variableName: _isIdentifier2.default.call(void 0, name) ? name : null
				};
			} else if (nameToken.type === _types.TokenType.string) {
				const name = this.tokens.stringValueForToken(nameToken);
				return {
					nameStringCode: this.tokens.code.slice(nameToken.start, nameToken.end),
					variableName: _isIdentifier2.default.call(void 0, name) ? name : null
				};
			} else throw new Error("Expected name or string at beginning of enum element.");
		}
		/**
		* Handle an enum member where the RHS is just a string literal (not omitted, not a number, and
		* not a complex expression). This is the typical form for TS string enums, and in this case, we
		* do *not* create a reverse mapping.
		*
		* This is called after deleting the key token, when the token processor is at the equals sign.
		*
		* Example 1:
		* someKey = "some value"
		* ->
		* const someKey = "some value"; MyEnum["someKey"] = someKey;
		*
		* Example 2:
		* "some key" = "some value"
		* ->
		* MyEnum["some key"] = "some value";
		*/
		processStringLiteralEnumMember(enumName, nameStringCode, variableName) {
			if (variableName != null) {
				this.tokens.appendCode(`const ${variableName}`);
				this.tokens.copyToken();
				this.tokens.copyToken();
				this.tokens.appendCode(`; ${enumName}[${nameStringCode}] = ${variableName};`);
			} else {
				this.tokens.appendCode(`${enumName}[${nameStringCode}]`);
				this.tokens.copyToken();
				this.tokens.copyToken();
				this.tokens.appendCode(";");
			}
		}
		/**
		* Handle an enum member initialized with an expression on the right-hand side (other than a
		* string literal). In these cases, we should transform the expression and emit code that sets up
		* a reverse mapping.
		*
		* The TypeScript implementation of this operation distinguishes between expressions that can be
		* "constant folded" at compile time (i.e. consist of number literals and simple math operations
		* on those numbers) and ones that are dynamic. For constant expressions, it emits the resolved
		* numeric value, and auto-incrementing is only allowed in that case. Evaluating expressions at
		* compile time would add significant complexity to Sucrase, so Sucrase instead leaves the
		* expression as-is, and will later emit something like `MyEnum["previousKey"] + 1` to implement
		* auto-incrementing.
		*
		* This is called after deleting the key token, when the token processor is at the equals sign.
		*
		* Example 1:
		* someKey = 1 + 1
		* ->
		* const someKey = 1 + 1; MyEnum[MyEnum["someKey"] = someKey] = "someKey";
		*
		* Example 2:
		* "some key" = 1 + 1
		* ->
		* MyEnum[MyEnum["some key"] = 1 + 1] = "some key";
		*/
		processExplicitValueEnumMember(enumName, nameStringCode, variableName) {
			const rhsEndIndex = this.tokens.currentToken().rhsEndIndex;
			if (rhsEndIndex == null) throw new Error("Expected rhsEndIndex on enum assign.");
			if (variableName != null) {
				this.tokens.appendCode(`const ${variableName}`);
				this.tokens.copyToken();
				while (this.tokens.currentIndex() < rhsEndIndex) this.rootTransformer.processToken();
				this.tokens.appendCode(`; ${enumName}[${enumName}[${nameStringCode}] = ${variableName}] = ${nameStringCode};`);
			} else {
				this.tokens.appendCode(`${enumName}[${enumName}[${nameStringCode}]`);
				this.tokens.copyToken();
				while (this.tokens.currentIndex() < rhsEndIndex) this.rootTransformer.processToken();
				this.tokens.appendCode(`] = ${nameStringCode};`);
			}
		}
		/**
		* Handle an enum member with no right-hand side expression. In this case, the value is the
		* previous value plus 1, or 0 if there was no previous value. We should also always emit a
		* reverse mapping.
		*
		* Example 1:
		* someKey2
		* ->
		* const someKey2 = someKey1 + 1; MyEnum[MyEnum["someKey2"] = someKey2] = "someKey2";
		*
		* Example 2:
		* "some key 2"
		* ->
		* MyEnum[MyEnum["some key 2"] = someKey1 + 1] = "some key 2";
		*/
		processImplicitValueEnumMember(enumName, nameStringCode, variableName, previousValueCode) {
			let valueCode = previousValueCode != null ? `${previousValueCode} + 1` : "0";
			if (variableName != null) {
				this.tokens.appendCode(`const ${variableName} = ${valueCode}; `);
				valueCode = variableName;
			}
			this.tokens.appendCode(`${enumName}[${enumName}[${nameStringCode}] = ${valueCode}] = ${nameStringCode};`);
		}
	};
	exports.default = TypeScriptTransformer;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/transformers/RootTransformer.js
var require_RootTransformer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _keywords = require_keywords();
	var _types = require_types$2();
	var _getClassInfo2 = _interopRequireDefault(require_getClassInfo());
	var _CJSImportTransformer2 = _interopRequireDefault(require_CJSImportTransformer());
	var _ESMImportTransformer2 = _interopRequireDefault(require_ESMImportTransformer());
	var _FlowTransformer2 = _interopRequireDefault(require_FlowTransformer());
	var _JestHoistTransformer2 = _interopRequireDefault(require_JestHoistTransformer());
	var _JSXTransformer2 = _interopRequireDefault(require_JSXTransformer());
	var _NumericSeparatorTransformer2 = _interopRequireDefault(require_NumericSeparatorTransformer());
	var _OptionalCatchBindingTransformer2 = _interopRequireDefault(require_OptionalCatchBindingTransformer());
	var _OptionalChainingNullishTransformer2 = _interopRequireDefault(require_OptionalChainingNullishTransformer());
	var _ReactDisplayNameTransformer2 = _interopRequireDefault(require_ReactDisplayNameTransformer());
	var _ReactHotLoaderTransformer2 = _interopRequireDefault(require_ReactHotLoaderTransformer());
	var _TypeScriptTransformer2 = _interopRequireDefault(require_TypeScriptTransformer());
	exports.default = class RootTransformer {
		__init() {
			this.transformers = [];
		}
		__init2() {
			this.generatedVariables = [];
		}
		constructor(sucraseContext, transforms, enableLegacyBabel5ModuleInterop, options) {
			RootTransformer.prototype.__init.call(this);
			RootTransformer.prototype.__init2.call(this);
			this.nameManager = sucraseContext.nameManager;
			this.helperManager = sucraseContext.helperManager;
			const { tokenProcessor, importProcessor } = sucraseContext;
			this.tokens = tokenProcessor;
			this.isImportsTransformEnabled = transforms.includes("imports");
			this.isReactHotLoaderTransformEnabled = transforms.includes("react-hot-loader");
			this.disableESTransforms = Boolean(options.disableESTransforms);
			if (!options.disableESTransforms) {
				this.transformers.push(new _OptionalChainingNullishTransformer2.default(tokenProcessor, this.nameManager));
				this.transformers.push(new _NumericSeparatorTransformer2.default(tokenProcessor));
				this.transformers.push(new _OptionalCatchBindingTransformer2.default(tokenProcessor, this.nameManager));
			}
			if (transforms.includes("jsx")) {
				if (options.jsxRuntime !== "preserve") this.transformers.push(new _JSXTransformer2.default(this, tokenProcessor, importProcessor, this.nameManager, options));
				this.transformers.push(new _ReactDisplayNameTransformer2.default(this, tokenProcessor, importProcessor, options));
			}
			let reactHotLoaderTransformer = null;
			if (transforms.includes("react-hot-loader")) {
				if (!options.filePath) throw new Error("filePath is required when using the react-hot-loader transform.");
				reactHotLoaderTransformer = new _ReactHotLoaderTransformer2.default(tokenProcessor, options.filePath);
				this.transformers.push(reactHotLoaderTransformer);
			}
			if (transforms.includes("imports")) {
				if (importProcessor === null) throw new Error("Expected non-null importProcessor with imports transform enabled.");
				this.transformers.push(new _CJSImportTransformer2.default(this, tokenProcessor, importProcessor, this.nameManager, this.helperManager, reactHotLoaderTransformer, enableLegacyBabel5ModuleInterop, Boolean(options.enableLegacyTypeScriptModuleInterop), transforms.includes("typescript"), transforms.includes("flow"), Boolean(options.preserveDynamicImport), Boolean(options.keepUnusedImports)));
			} else this.transformers.push(new _ESMImportTransformer2.default(tokenProcessor, this.nameManager, this.helperManager, reactHotLoaderTransformer, transforms.includes("typescript"), transforms.includes("flow"), Boolean(options.keepUnusedImports), options));
			if (transforms.includes("flow")) this.transformers.push(new _FlowTransformer2.default(this, tokenProcessor, transforms.includes("imports")));
			if (transforms.includes("typescript")) this.transformers.push(new _TypeScriptTransformer2.default(this, tokenProcessor, transforms.includes("imports")));
			if (transforms.includes("jest")) this.transformers.push(new _JestHoistTransformer2.default(this, tokenProcessor, this.nameManager, importProcessor));
		}
		transform() {
			this.tokens.reset();
			this.processBalancedCode();
			let prefix = this.isImportsTransformEnabled ? "\"use strict\";" : "";
			for (const transformer of this.transformers) prefix += transformer.getPrefixCode();
			prefix += this.helperManager.emitHelpers();
			prefix += this.generatedVariables.map((v) => ` var ${v};`).join("");
			for (const transformer of this.transformers) prefix += transformer.getHoistedCode();
			let suffix = "";
			for (const transformer of this.transformers) suffix += transformer.getSuffixCode();
			const result = this.tokens.finish();
			let { code } = result;
			if (code.startsWith("#!")) {
				let newlineIndex = code.indexOf("\n");
				if (newlineIndex === -1) {
					newlineIndex = code.length;
					code += "\n";
				}
				return {
					code: code.slice(0, newlineIndex + 1) + prefix + code.slice(newlineIndex + 1) + suffix,
					mappings: this.shiftMappings(result.mappings, prefix.length)
				};
			} else return {
				code: prefix + code + suffix,
				mappings: this.shiftMappings(result.mappings, prefix.length)
			};
		}
		processBalancedCode() {
			let braceDepth = 0;
			let parenDepth = 0;
			while (!this.tokens.isAtEnd()) {
				if (this.tokens.matches1(_types.TokenType.braceL) || this.tokens.matches1(_types.TokenType.dollarBraceL)) braceDepth++;
				else if (this.tokens.matches1(_types.TokenType.braceR)) {
					if (braceDepth === 0) return;
					braceDepth--;
				}
				if (this.tokens.matches1(_types.TokenType.parenL)) parenDepth++;
				else if (this.tokens.matches1(_types.TokenType.parenR)) {
					if (parenDepth === 0) return;
					parenDepth--;
				}
				this.processToken();
			}
		}
		processToken() {
			if (this.tokens.matches1(_types.TokenType._class)) {
				this.processClass();
				return;
			}
			for (const transformer of this.transformers) if (transformer.process()) return;
			this.tokens.copyToken();
		}
		/**
		* Skip past a class with a name and return that name.
		*/
		processNamedClass() {
			if (!this.tokens.matches2(_types.TokenType._class, _types.TokenType.name)) throw new Error("Expected identifier for exported class name.");
			const name = this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 1);
			this.processClass();
			return name;
		}
		processClass() {
			const classInfo = _getClassInfo2.default.call(void 0, this, this.tokens, this.nameManager, this.disableESTransforms);
			const needsCommaExpression = (classInfo.headerInfo.isExpression || !classInfo.headerInfo.className) && classInfo.staticInitializerNames.length + classInfo.instanceInitializerNames.length > 0;
			let className = classInfo.headerInfo.className;
			if (needsCommaExpression) {
				className = this.nameManager.claimFreeName("_class");
				this.generatedVariables.push(className);
				this.tokens.appendCode(` (${className} =`);
			}
			const contextId = this.tokens.currentToken().contextId;
			if (contextId == null) throw new Error("Expected class to have a context ID.");
			this.tokens.copyExpectedToken(_types.TokenType._class);
			while (!this.tokens.matchesContextIdAndLabel(_types.TokenType.braceL, contextId)) this.processToken();
			this.processClassBody(classInfo, className);
			const staticInitializerStatements = classInfo.staticInitializerNames.map((name) => `${className}.${name}()`);
			if (needsCommaExpression) this.tokens.appendCode(`, ${staticInitializerStatements.map((s) => `${s}, `).join("")}${className})`);
			else if (classInfo.staticInitializerNames.length > 0) this.tokens.appendCode(` ${staticInitializerStatements.map((s) => `${s};`).join(" ")}`);
		}
		/**
		* We want to just handle class fields in all contexts, since TypeScript supports them. Later,
		* when some JS implementations support class fields, this should be made optional.
		*/
		processClassBody(classInfo, className) {
			const { headerInfo, constructorInsertPos, constructorInitializerStatements, fields, instanceInitializerNames, rangesToRemove } = classInfo;
			let fieldIndex = 0;
			let rangeToRemoveIndex = 0;
			const classContextId = this.tokens.currentToken().contextId;
			if (classContextId == null) throw new Error("Expected non-null context ID on class.");
			this.tokens.copyExpectedToken(_types.TokenType.braceL);
			if (this.isReactHotLoaderTransformEnabled) this.tokens.appendCode("__reactstandin__regenerateByEval(key, code) {this[key] = eval(code);}");
			const needsConstructorInit = constructorInitializerStatements.length + instanceInitializerNames.length > 0;
			if (constructorInsertPos === null && needsConstructorInit) {
				const constructorInitializersCode = this.makeConstructorInitCode(constructorInitializerStatements, instanceInitializerNames, className);
				if (headerInfo.hasSuperclass) {
					const argsName = this.nameManager.claimFreeName("args");
					this.tokens.appendCode(`constructor(...${argsName}) { super(...${argsName}); ${constructorInitializersCode}; }`);
				} else this.tokens.appendCode(`constructor() { ${constructorInitializersCode}; }`);
			}
			while (!this.tokens.matchesContextIdAndLabel(_types.TokenType.braceR, classContextId)) if (fieldIndex < fields.length && this.tokens.currentIndex() === fields[fieldIndex].start) {
				let needsCloseBrace = false;
				if (this.tokens.matches1(_types.TokenType.bracketL)) this.tokens.copyTokenWithPrefix(`${fields[fieldIndex].initializerName}() {this`);
				else if (this.tokens.matches1(_types.TokenType.string) || this.tokens.matches1(_types.TokenType.num)) {
					this.tokens.copyTokenWithPrefix(`${fields[fieldIndex].initializerName}() {this[`);
					needsCloseBrace = true;
				} else this.tokens.copyTokenWithPrefix(`${fields[fieldIndex].initializerName}() {this.`);
				while (this.tokens.currentIndex() < fields[fieldIndex].end) {
					if (needsCloseBrace && this.tokens.currentIndex() === fields[fieldIndex].equalsIndex) this.tokens.appendCode("]");
					this.processToken();
				}
				this.tokens.appendCode("}");
				fieldIndex++;
			} else if (rangeToRemoveIndex < rangesToRemove.length && this.tokens.currentIndex() >= rangesToRemove[rangeToRemoveIndex].start) {
				if (this.tokens.currentIndex() < rangesToRemove[rangeToRemoveIndex].end) this.tokens.removeInitialToken();
				while (this.tokens.currentIndex() < rangesToRemove[rangeToRemoveIndex].end) this.tokens.removeToken();
				rangeToRemoveIndex++;
			} else if (this.tokens.currentIndex() === constructorInsertPos) {
				this.tokens.copyToken();
				if (needsConstructorInit) this.tokens.appendCode(`;${this.makeConstructorInitCode(constructorInitializerStatements, instanceInitializerNames, className)};`);
				this.processToken();
			} else this.processToken();
			this.tokens.copyExpectedToken(_types.TokenType.braceR);
		}
		makeConstructorInitCode(constructorInitializerStatements, instanceInitializerNames, className) {
			return [...constructorInitializerStatements, ...instanceInitializerNames.map((name) => `${className}.prototype.${name}.call(this)`)].join(";");
		}
		/**
		* Normally it's ok to simply remove type tokens, but we need to be more careful when dealing with
		* arrow function return types since they can confuse the parser. In that case, we want to move
		* the close-paren to the same line as the arrow.
		*
		* See https://github.com/alangpierce/sucrase/issues/391 for more details.
		*/
		processPossibleArrowParamEnd() {
			if (this.tokens.matches2(_types.TokenType.parenR, _types.TokenType.colon) && this.tokens.tokenAtRelativeIndex(1).isType) {
				let nextNonTypeIndex = this.tokens.currentIndex() + 1;
				while (this.tokens.tokens[nextNonTypeIndex].isType) nextNonTypeIndex++;
				if (this.tokens.matches1AtIndex(nextNonTypeIndex, _types.TokenType.arrow)) {
					this.tokens.removeInitialToken();
					while (this.tokens.currentIndex() < nextNonTypeIndex) this.tokens.removeToken();
					this.tokens.replaceTokenTrimmingLeftWhitespace(") =>");
					return true;
				}
			}
			return false;
		}
		/**
		* An async arrow function might be of the form:
		*
		* async <
		*   T
		* >() => {}
		*
		* in which case, removing the type parameters will cause a syntax error. Detect this case and
		* move the open-paren earlier.
		*/
		processPossibleAsyncArrowWithTypeParams() {
			if (!this.tokens.matchesContextual(_keywords.ContextualKeyword._async) && !this.tokens.matches1(_types.TokenType._async)) return false;
			const nextToken = this.tokens.tokenAtRelativeIndex(1);
			if (nextToken.type !== _types.TokenType.lessThan || !nextToken.isType) return false;
			let nextNonTypeIndex = this.tokens.currentIndex() + 1;
			while (this.tokens.tokens[nextNonTypeIndex].isType) nextNonTypeIndex++;
			if (this.tokens.matches1AtIndex(nextNonTypeIndex, _types.TokenType.parenL)) {
				this.tokens.replaceToken("async (");
				this.tokens.removeInitialToken();
				while (this.tokens.currentIndex() < nextNonTypeIndex) this.tokens.removeToken();
				this.tokens.removeToken();
				this.processBalancedCode();
				this.processToken();
				return true;
			}
			return false;
		}
		processPossibleTypeRange() {
			if (this.tokens.currentToken().isType) {
				this.tokens.removeInitialToken();
				while (this.tokens.currentToken().isType) this.tokens.removeToken();
				return true;
			}
			return false;
		}
		shiftMappings(mappings, prefixLength) {
			for (let i = 0; i < mappings.length; i++) {
				const mapping = mappings[i];
				if (mapping !== void 0) mappings[i] = mapping + prefixLength;
			}
			return mappings;
		}
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/lines-and-columns@1.2.4/node_modules/lines-and-columns/build/index.js
var require_build = /* @__PURE__ */ __commonJSMin(((exports) => {
	exports.__esModule = true;
	exports.LinesAndColumns = void 0;
	var LF = "\n";
	var CR = "\r";
	var LinesAndColumns = function() {
		function LinesAndColumns(string) {
			this.string = string;
			var offsets = [0];
			for (var offset = 0; offset < string.length;) switch (string[offset]) {
				case LF:
					offset += LF.length;
					offsets.push(offset);
					break;
				case CR:
					offset += CR.length;
					if (string[offset] === LF) offset += LF.length;
					offsets.push(offset);
					break;
				default: offset++;
			}
			this.offsets = offsets;
		}
		LinesAndColumns.prototype.locationForIndex = function(index) {
			if (index < 0 || index > this.string.length) return null;
			var line = 0;
			var offsets = this.offsets;
			while (offsets[line + 1] <= index) line++;
			var column = index - offsets[line];
			return {
				line,
				column
			};
		};
		LinesAndColumns.prototype.indexForLocation = function(location) {
			var line = location.line, column = location.column;
			if (line < 0 || line >= this.offsets.length) return null;
			if (column < 0 || column > this.lengthOfLine(line)) return null;
			return this.offsets[line] + column;
		};
		LinesAndColumns.prototype.lengthOfLine = function(line) {
			var offset = this.offsets[line];
			return (line === this.offsets.length - 1 ? this.string.length : this.offsets[line + 1]) - offset;
		};
		return LinesAndColumns;
	}();
	exports.LinesAndColumns = LinesAndColumns;
	exports["default"] = LinesAndColumns;
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/util/formatTokens.js
var require_formatTokens = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _linesandcolumns2 = _interopRequireDefault(require_build());
	var _types = require_types$2();
	function formatTokens(code, tokens) {
		if (tokens.length === 0) return "";
		const tokenKeys = Object.keys(tokens[0]).filter((k) => k !== "type" && k !== "value" && k !== "start" && k !== "end" && k !== "loc");
		const typeKeys = Object.keys(tokens[0].type).filter((k) => k !== "label" && k !== "keyword");
		const headings = [
			"Location",
			"Label",
			"Raw",
			...tokenKeys,
			...typeKeys
		];
		const lines = new _linesandcolumns2.default(code);
		const rows = [headings, ...tokens.map(getTokenComponents)];
		const padding = headings.map(() => 0);
		for (const components of rows) for (let i = 0; i < components.length; i++) padding[i] = Math.max(padding[i], components[i].length);
		return rows.map((components) => components.map((component, i) => component.padEnd(padding[i])).join(" ")).join("\n");
		function getTokenComponents(token) {
			const raw = code.slice(token.start, token.end);
			return [
				formatRange(token.start, token.end),
				_types.formatTokenType.call(void 0, token.type),
				truncate(String(raw), 14),
				...tokenKeys.map((key) => formatValue(token[key], key)),
				...typeKeys.map((key) => formatValue(token.type[key], key))
			];
		}
		function formatValue(value, key) {
			if (value === true) return key;
			else if (value === false || value === null) return "";
			else return String(value);
		}
		function formatRange(start, end) {
			return `${formatPos(start)}-${formatPos(end)}`;
		}
		function formatPos(pos) {
			const location = lines.locationForIndex(pos);
			if (!location) return "Unknown";
			else return `${location.line + 1}:${location.column + 1}`;
		}
	}
	exports.default = formatTokens;
	function truncate(s, length) {
		if (s.length > length) return `${s.slice(0, length - 3)}...`;
		else return s;
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/sucrase@3.35.1/node_modules/sucrase/dist/util/getTSImportedNames.js
var require_getTSImportedNames = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _types = require_types$2();
	var _getImportExportSpecifierInfo2 = _interopRequireDefault(require_getImportExportSpecifierInfo());
	/**
	* Special case code to scan for imported names in ESM TypeScript. We need to do this so we can
	* properly get globals so we can compute shadowed globals.
	*
	* This is similar to logic in CJSImportProcessor, but trimmed down to avoid logic with CJS
	* replacement and flow type imports.
	*/
	function getTSImportedNames(tokens) {
		const importedNames = /* @__PURE__ */ new Set();
		for (let i = 0; i < tokens.tokens.length; i++) if (tokens.matches1AtIndex(i, _types.TokenType._import) && !tokens.matches3AtIndex(i, _types.TokenType._import, _types.TokenType.name, _types.TokenType.eq)) collectNamesForImport(tokens, i, importedNames);
		return importedNames;
	}
	exports.default = getTSImportedNames;
	function collectNamesForImport(tokens, index, importedNames) {
		index++;
		if (tokens.matches1AtIndex(index, _types.TokenType.parenL)) return;
		if (tokens.matches1AtIndex(index, _types.TokenType.name)) {
			importedNames.add(tokens.identifierNameAtIndex(index));
			index++;
			if (tokens.matches1AtIndex(index, _types.TokenType.comma)) index++;
		}
		if (tokens.matches1AtIndex(index, _types.TokenType.star)) {
			index += 2;
			importedNames.add(tokens.identifierNameAtIndex(index));
			index++;
		}
		if (tokens.matches1AtIndex(index, _types.TokenType.braceL)) {
			index++;
			collectNamesForNamedImport(tokens, index, importedNames);
		}
	}
	function collectNamesForNamedImport(tokens, index, importedNames) {
		while (true) {
			if (tokens.matches1AtIndex(index, _types.TokenType.braceR)) return;
			const specifierInfo = _getImportExportSpecifierInfo2.default.call(void 0, tokens, index);
			index = specifierInfo.endIndex;
			if (!specifierInfo.isType) importedNames.add(specifierInfo.rightName);
			if (tokens.matches2AtIndex(index, _types.TokenType.comma, _types.TokenType.braceR)) return;
			else if (tokens.matches1AtIndex(index, _types.TokenType.braceR)) return;
			else if (tokens.matches1AtIndex(index, _types.TokenType.comma)) index++;
			else throw new Error(`Unexpected token: ${JSON.stringify(tokens.tokens[index])}`);
		}
	}
}));
//#endregion
//#region src/compiler.ts
/**
* custom code 服务端编译器（DSH_PANELS_DESIGN §8.3，服务端模块）。
*
* - sucrase `transforms: ['jsx']` + `jsxRuntime: 'classic'`：编译产物调用全局
*   `React.createElement`，React 由沙箱 runtime 资产注入（§8.2）。
* - 按 sha256(code) 内存缓存编译产物（§4「自定义编译器 按 codeHash 缓存」）。
* - 失败抛带行号信息的 Error，消息面向 Agent 可自修正。
*
* 注意：禁词扫描（§5.4 / S8）在 validation.ts 完成，本模块只负责编译；
* 依赖链为 validation → compiler，禁词命中不会走到这里。
*
* §8.3 契约：编译产物经 runtime-entry 读取，故 sucrase 产物外包一层
* `window.__OPENLOOP_WIDGET__ = (function(){ <编译产物> return Widget })()`。
* 用 IIFE 而非 `(产物)` 括号包装：sucrase 会在产物前注入可选链等 helper（函数声明），
* 括号内出现多个连续函数声明是语法错误；放进函数体后声明序列合法，末尾返回契约命名的
* `Widget` 组件函数（无 Widget 时返回 undefined → runtime-entry 走容错路径）。
* 幂等：已包装的产物直接复用（面板持久化重放 §11 时 code 已是编译产物，避免二次包装）。
*/
var import_dist = (/* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : { default: obj };
	}
	var _CJSImportProcessor2 = _interopRequireDefault(require_CJSImportProcessor());
	var _computeSourceMap2 = _interopRequireDefault(require_computeSourceMap());
	var _HelperManager = require_HelperManager();
	var _identifyShadowedGlobals2 = _interopRequireDefault(require_identifyShadowedGlobals());
	var _NameManager2 = _interopRequireDefault(require_NameManager());
	var _Options = require_Options();
	var _parser = require_parser();
	var _TokenProcessor2 = _interopRequireDefault(require_TokenProcessor());
	var _RootTransformer2 = _interopRequireDefault(require_RootTransformer());
	_interopRequireDefault(require_formatTokens());
	var _getTSImportedNames2 = _interopRequireDefault(require_getTSImportedNames());
	function transform(code, options) {
		_Options.validateOptions.call(void 0, options);
		try {
			const sucraseContext = getSucraseContext(code, options);
			const transformerResult = new _RootTransformer2.default(sucraseContext, options.transforms, Boolean(options.enableLegacyBabel5ModuleInterop), options).transform();
			let result = { code: transformerResult.code };
			if (options.sourceMapOptions) {
				if (!options.filePath) throw new Error("filePath must be specified when generating a source map.");
				result = {
					...result,
					sourceMap: _computeSourceMap2.default.call(void 0, transformerResult, options.filePath, options.sourceMapOptions, code, sucraseContext.tokenProcessor.tokens)
				};
			}
			return result;
		} catch (e) {
			if (options.filePath) e.message = `Error transforming ${options.filePath}: ${e.message}`;
			throw e;
		}
	}
	exports.transform = transform;
	/**
	* Call into the parser/tokenizer and do some further preprocessing:
	* - Come up with a set of used names so that we can assign new names.
	* - Preprocess all import/export statements so we know which globals we are interested in.
	* - Compute situations where any of those globals are shadowed.
	*
	* In the future, some of these preprocessing steps can be skipped based on what actual work is
	* being done.
	*/
	function getSucraseContext(code, options) {
		const isJSXEnabled = options.transforms.includes("jsx");
		const isTypeScriptEnabled = options.transforms.includes("typescript");
		const isFlowEnabled = options.transforms.includes("flow");
		const disableESTransforms = options.disableESTransforms === true;
		const file = _parser.parse.call(void 0, code, isJSXEnabled, isTypeScriptEnabled, isFlowEnabled);
		const tokens = file.tokens;
		const scopes = file.scopes;
		const nameManager = new _NameManager2.default(code, tokens);
		const helperManager = new _HelperManager.HelperManager(nameManager);
		const tokenProcessor = new _TokenProcessor2.default(code, tokens, isFlowEnabled, disableESTransforms, helperManager);
		const enableLegacyTypeScriptModuleInterop = Boolean(options.enableLegacyTypeScriptModuleInterop);
		let importProcessor = null;
		if (options.transforms.includes("imports")) {
			importProcessor = new _CJSImportProcessor2.default(nameManager, tokenProcessor, enableLegacyTypeScriptModuleInterop, options, options.transforms.includes("typescript"), Boolean(options.keepUnusedImports), helperManager);
			importProcessor.preprocessTokens();
			_identifyShadowedGlobals2.default.call(void 0, tokenProcessor, scopes, importProcessor.getGlobalNames());
			if (options.transforms.includes("typescript") && !options.keepUnusedImports) importProcessor.pruneTypeOnlyImports();
		} else if (options.transforms.includes("typescript") && !options.keepUnusedImports) _identifyShadowedGlobals2.default.call(void 0, tokenProcessor, scopes, _getTSImportedNames2.default.call(void 0, tokenProcessor));
		return {
			tokenProcessor,
			scopes,
			nameManager,
			importProcessor,
			helperManager
		};
	}
})))();
/** 编译产物包装前缀：runtime-entry 读取 window.__OPENLOOP_WIDGET__（§8.3） */
const WIDGET_WRAPPER_START = "window.__OPENLOOP_WIDGET__ = (function(){";
/** IIFE 收尾：返回契约命名的 Widget 函数组件（§8.3），无则 undefined → runtime 容错 */
const WIDGET_WRAPPER_END = "\nreturn typeof Widget === \"function\" ? Widget : undefined;\n})()";
/** 编译产物内存缓存：codeHash → js（编译层体积策略 D10 的代码侧） */
const cache = /* @__PURE__ */ new Map();
/** 编译 custom code（一个 JSX 函数组件源码）→ { js, hash }；失败抛带行号错误 */
function compileCustomCode(code) {
	const hash = createHash("sha256").update(code, "utf8").digest("hex");
	const cached = cache.get(hash);
	if (cached !== void 0) return {
		js: cached,
		hash
	};
	let js;
	if (code.trimStart().startsWith(WIDGET_WRAPPER_START)) js = code;
	else try {
		const result = (0, import_dist.transform)(code, {
			transforms: ["jsx"],
			jsxRuntime: "classic",
			production: true
		});
		js = `${WIDGET_WRAPPER_START}${result.code}${WIDGET_WRAPPER_END}`;
	} catch (error) {
		throw new Error(`custom code compilation failed: ${describeCompileError(error)}`);
	}
	cache.set(hash, js);
	return {
		js,
		hash
	};
}
/**
* 编译 PanelDefinition 中所有 custom widget 的 code（§8.3 服务端编译）。
* 返回新面板对象，不改输入；编译失败抛错（带行号，Agent 可自修正）。
*/
function compilePanelCustomCode(panel) {
	if (!Array.isArray(panel.widgets)) return panel;
	let changed = false;
	const widgets = panel.widgets.map((widget) => {
		if (typeof widget !== "object" || widget === null) return widget;
		const source = widget.source;
		if (typeof source !== "object" || source === null) return widget;
		if (source.type !== "custom") return widget;
		const compiled = compileCustomCode(source.code);
		if (compiled.js !== source.code) changed = true;
		return {
			...widget,
			source: {
				...source,
				code: compiled.js
			}
		};
	});
	return changed ? {
		...panel,
		widgets
	} : panel;
}
/** 从 sucrase 错误提取 (line:col)，取不到就带上原始 message（都含可定位信息） */
function describeCompileError(error) {
	const message = error instanceof Error ? error.message : String(error);
	const match = message.match(/\((\d+):(\d+)\)/u);
	return match ? `line ${match[1]}, column ${match[2]}` : message;
}
//#endregion
//#region src/skills/index.ts
/**
* 三个 skill 注册（D12 skill 三件套，§13）。
* 参照 declarative/src/skill.ts 的 provider 模式：每个 skill 一个 provider，
* content 为 src/skills/<name>/SKILL.md（bundled asset，经 ctx.skills.registerProvider 注入）。
*
* 注册顺序：预设风格指引（公共基础）→ Agent widget 编写指引（运行时注入）→ 外部组件包接入指引。
*/
const SKILL_SPECS = [
	{
		name: "openloop-panels-style-guide",
		description: "OpenLoop panels 预设风格开发指引：token 词汇表、三档 token 规则、半 token 化禁令与 Appica 审美参照。写预设组件/自定义 widget 样式前先读。",
		file: "openloop-panels-style-guide/SKILL.md"
	},
	{
		name: "openloop-panels-widget-authoring",
		description: "OpenLoop panels Agent widget 编写指引：资源选择阶梯、全部预设组件 kind+props 速查、custom code 契约、数据绑定与面板构图硬规则。用户要仪表盘/监控看板/多指标汇总/流程图/对比图，或要保存复用面板时，调用 panel 工具前先读本 skill。",
		file: "openloop-panels-widget-authoring/SKILL.md"
	},
	{
		name: "openloop-panels-pack-guide",
		description: "OpenLoop panels 外部组件包接入指引：pack manifest 契约、硬性约束、打包注册启用流程、主题桥接器与验收清单。接入外部组件包前先读。（面向开发者）",
		file: "openloop-panels-pack-guide/SKILL.md",
		modelInvocable: false
	}
];
const resourceBase = {
	kind: "directory",
	path: fileURLToPath(new URL("../assets/skills/", import.meta.url))
};
function createProvider(spec) {
	const body = new URL(`../assets/skills/${spec.file}`, import.meta.url);
	const candidate = {
		name: spec.name,
		description: spec.description,
		invocation: {
			modelInvocable: spec.modelInvocable !== false,
			userInvocable: true
		},
		provider: spec.name,
		source: "bundled",
		resourceBase,
		rank: BUNDLED_SKILL_RANK,
		locator: body
	};
	return {
		name: candidate.provider,
		list: () => Promise.resolve([candidate]),
		async get() {
			return {
				...candidate,
				content: await readFile(body, "utf8")
			};
		}
	};
}
const panelsSkillProviders = SKILL_SPECS.map(createProvider);
//#endregion
//#region src/store.ts
const PANELS_SUBDIR = "openloop-panels";
/** 插件版本，写盘记录用（与 package.json 保持同步） */
const PLUGIN_VERSION = "0.1.0";
/** 面板 id 文件名校验：与 §5.4 kebab-case 规则一致，杜绝路径穿越 */
const PANEL_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function safeId(id) {
	return PANEL_ID_RE.test(id);
}
/** 解析落盘记录；形状不符/损坏返回 undefined（容错，§11 降级） */
function decodeStoredPanel(value, expectedId) {
	if (typeof value !== "object" || value === null) return void 0;
	const record = value;
	const panel = record.panel;
	if (typeof panel !== "object" || panel === null) return void 0;
	const panelRecord = panel;
	if (panelRecord.$schema !== "openloop.panel/v1") return void 0;
	if (panelRecord.id !== expectedId) return void 0;
	if (typeof record.savedAt !== "string" || typeof record.pluginVersion !== "string") return void 0;
	return {
		panel,
		savedAt: record.savedAt,
		pluginVersion: record.pluginVersion
	};
}
function createPanelStore(options) {
	const filePath = (id) => `${options.dir}/${id}.json`;
	return {
		async save(panel) {
			validatePanel(panel);
			const record = {
				panel,
				savedAt: (/* @__PURE__ */ new Date()).toISOString(),
				pluginVersion: PLUGIN_VERSION
			};
			const relPath = filePath(panel.id);
			await options.fs.writeText(relPath, JSON.stringify(record, null, 2));
			return { path: relPath };
		},
		async load(id) {
			if (!safeId(id)) return void 0;
			const content = await options.fs.readText(filePath(id));
			if (content === void 0) return void 0;
			try {
				return decodeStoredPanel(JSON.parse(content), id);
			} catch {
				return;
			}
		},
		async list() {
			let names;
			try {
				names = await options.fs.listDir(options.dir);
			} catch {
				return [];
			}
			const ids = names.filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5));
			const panels = [];
			for (const id of ids) {
				const stored = await this.load(id);
				if (stored) panels.push(stored);
			}
			panels.sort((a, b) => a.savedAt < b.savedAt ? 1 : -1);
			return panels;
		}
	};
}
function savePanel(panel, store) {
	return store.save(panel);
}
function loadPanel(id, store) {
	return store.load(id);
}
function listPanels(store) {
	return store.list();
}
/** 用 ctx.fs + sandboxPolicy 实现 PanelFs（resolve 相对路径 + cwd，S10 seams） */
function createCtxPanelFs(opts) {
	const resolve = (path) => opts.fs.resolve(path, {
		...opts.cwd ? { cwd: opts.cwd } : {},
		...opts.signal ? { signal: opts.signal } : {}
	});
	return {
		async writeText(relPath, content) {
			const target = await resolve(relPath);
			await opts.fs.writeText(target, content, void 0, opts.signal, opts.sandboxPolicy);
		},
		async readText(relPath) {
			const target = await resolve(relPath);
			if (!await opts.fs.stat(target, opts.signal)) return void 0;
			return opts.fs.readText(target, opts.signal);
		},
		async listDir(relDir) {
			const target = await resolve(relDir);
			return (await opts.fs.listDir(target, opts.signal)).map((entry) => entry.name);
		}
	};
}
function createMemoryPanelFs() {
	const files = /* @__PURE__ */ new Map();
	return {
		async writeText(relPath, content) {
			files.set(relPath, content);
		},
		async readText(relPath) {
			return files.get(relPath);
		},
		async listDir(relDir) {
			const prefix = `${relDir}/`;
			return [...files.keys()].filter((key) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/")).map((key) => key.slice(prefix.length));
		},
		snapshot() {
			return files;
		}
	};
}
/** 静态资产名：`<name>.<64hex>.js|css`；hash 至少 16 位 hex，防止与占位文件误匹配 */
const ASSET_PATH_RE = /^([a-zA-Z0-9._-]+)\.([0-9a-f]{16,64})\.(js|css)$/u;
/**
* URL name → 磁盘文件名别名（§8.2）：runtime 资产 URL 带 React 主版本前缀
* `runtime.react18.<hash>.js`（react19 梯队预留 `runtime.react19.*`），
* 磁盘文件恒为 assets/runtime.js（由 build:runtime 生成）；缺省一一对应。
*/
const ASSET_FILE_ALIASES = { "runtime.react18": "runtime" };
const CONTENT_TYPES$1 = {
	js: "text/javascript; charset=utf-8",
	css: "text/css; charset=utf-8"
};
function defaultAssetsDir() {
	return fileURLToPath(new URL("../assets/", import.meta.url));
}
var PanelsAssets = class {
	assetsDir;
	constructor(assetsDir = defaultAssetsDir()) {
		this.assetsDir = assetsDir;
	}
	register(ctx) {
		ctx.inject(["openloop-base/runtime"], (runtimeCtx) => {
			runtimeCtx["openloop-base/runtime"]?.registerRuntimeAssets(["runtime.react18"], {
				dir: this.assetsDir,
				aliases: { "runtime.react18": "runtime" }
			});
		});
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
		const file = join(this.assetsDir, `${ASSET_FILE_ALIASES[name] ?? name}.${ext}`);
		try {
			const body = await readFile(file);
			res.statusCode = 200;
			res.setHeader("Content-Type", CONTENT_TYPES$1[ext]);
			res.setHeader("Content-Length", String(body.byteLength));
			res.end(req.method === "HEAD" ? void 0 : body);
		} catch {
			res.statusCode = 404;
			res.end();
		}
	}
};
//#endregion
//#region src/refresh.ts
/** §10 刷新路由：绝对路径、无尾部斜杠（IMPL_NOTES §1.1 path 契约） */
const PANELS_REFRESH_ROUTE = "/openloop/panels/refresh";
/** 请求体大小上限：绑定描述本就很小，64KB 足够且阻断滥用 */
const MAX_REFRESH_BODY_BYTES = 65536;
/** 请求非法（4xx）专用错误；status 默认 400，413 用于超限 */
var RefreshRequestError = class extends Error {
	status;
	constructor(message, status = 400) {
		super(message);
		this.status = status;
		this.name = "RefreshRequestError";
	}
};
function errorMessage(error) {
	return error instanceof Error ? error.message : String(error);
}
/**
* 解析并校验刷新请求体（fail-closed）：
* `{ widgetId: kebab-case, data: WidgetDataBinding }` 且 data.source.type 必须为 'api'
* （static 数据随 props 下发，没有刷新通道的意义；非 api 一律 400）。
*/
function parseRefreshBody(text) {
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new RefreshRequestError("refresh request body must be valid JSON: {\"widgetId\": string, \"data\": WidgetDataBinding}");
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new RefreshRequestError("refresh request body must be a JSON object: {\"widgetId\": string, \"data\": WidgetDataBinding}");
	const record = parsed;
	const widgetId = record.widgetId;
	if (typeof widgetId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(widgetId)) throw new RefreshRequestError("refresh request widgetId must be a kebab-case string matching the target widget id");
	const data = record.data;
	if (typeof data !== "object" || data === null || Array.isArray(data)) throw new RefreshRequestError(`refresh request data binding for widget "${widgetId}" must be an object`);
	const source = data.source;
	if (typeof source !== "object" || source === null || Array.isArray(source)) throw new RefreshRequestError(`refresh request data binding for widget "${widgetId}" requires a source object`);
	const sourceType = source.type;
	if (sourceType !== "api") throw new RefreshRequestError(`refresh request for widget "${widgetId}" only supports api data sources; got ${JSON.stringify(sourceType)}`);
	return {
		widgetId,
		data
	};
}
/** 流式读取请求体，超过 maxBytes 立即中止并抛 413（不缓冲超限数据） */
async function readRequestBody(req, maxBytes = MAX_REFRESH_BODY_BYTES) {
	const chunks = [];
	let total = 0;
	for await (const chunk of req) {
		const buffer = chunk;
		total += buffer.byteLength;
		if (total > maxBytes) {
			req.destroy();
			throw new RefreshRequestError(`refresh request body exceeds the ${maxBytes} byte limit`, 413);
		}
		chunks.push(buffer);
	}
	return Buffer.concat(chunks).toString("utf8");
}
/**
* 刷新请求纯逻辑（可独立测试）：
* parseRefreshBody（形状/非 api → 400）→ URL/凭据校验（§5.4 fail-closed → 400）
* → resolveWidgetData（成功 200 ok:true；业务失败 200 ok:false）。
* ctx 透传 fetchFn/signal 注入 seam（测试不真联网）。
*/
async function handleRefreshRequest(bodyText, ctx = {}) {
	const { widgetId, data } = parseRefreshBody(bodyText);
	const source = data.source;
	if (source.credentialRef !== void 0) throw new RefreshRequestError("api source credentialRef is a v2 feature and is not supported in v1");
	try {
		validateApiUrl(source.url);
	} catch (error) {
		throw new RefreshRequestError(errorMessage(error));
	}
	if (source.headers) {
		for (const key of Object.keys(source.headers)) if (key.toLowerCase() === "authorization") throw new RefreshRequestError("api source must not pass an Authorization header in plain text; v2 credentialRef will cover this");
	}
	try {
		return {
			status: 200,
			payload: {
				ok: true,
				data: await resolveWidgetData(data, ctx)
			}
		};
	} catch (error) {
		return {
			status: 200,
			payload: {
				ok: false,
				error: `panel widget "${widgetId}" refresh failed: ${errorMessage(error)}`
			}
		};
	}
}
/** §10 刷新路由注册（写法参照 assets.ts 的 PanelsAssets） */
var PanelsRefreshRoute = class {
	webServer;
	resolveContext;
	constructor(webServer, resolveContext = {}) {
		this.webServer = webServer;
		this.resolveContext = resolveContext;
	}
	register(ctx) {
		ctx.effect(() => this.webServer.register({
			kind: "exact",
			path: PANELS_REFRESH_ROUTE,
			handler: (req, res) => this.handle(req, res)
		}), "openloop-panels: refresh route");
	}
	send(res, status, payload) {
		const body = JSON.stringify(payload);
		res.statusCode = status;
		res.setHeader("Content-Type", "application/json; charset=utf-8");
		res.setHeader("Content-Length", String(Buffer.byteLength(body)));
		res.end(body);
	}
	async handle(req, res) {
		res.setHeader("Cache-Control", "no-store");
		res.setHeader("X-Content-Type-Options", "nosniff");
		if (req.method !== "POST") {
			res.setHeader("Allow", "POST");
			this.send(res, 405, {
				ok: false,
				error: "method not allowed; use POST with a JSON body"
			});
			return;
		}
		try {
			const result = await handleRefreshRequest(await readRequestBody(req), this.resolveContext);
			this.send(res, result.status, result.payload);
		} catch (error) {
			if (error instanceof RefreshRequestError) {
				this.send(res, error.status, {
					ok: false,
					error: error.message
				});
				return;
			}
			this.send(res, 500, {
				ok: false,
				error: `refresh route internal error: ${errorMessage(error)}`
			});
		}
	}
};
//#endregion
//#region src/packs/manifest.ts
const PACK_RUNTIMES = ["react18", "react19"];
/** v1 宿主车道允许的 runtime（§12.2 硬约束 1）；react19 留待批 4 沙箱车道 */
const HOST_LANE_RUNTIME = "react18";
/** pack 资产路由前缀（§9）：绝对路径、无尾部斜杠；panels 独占，撞前缀即 register 抛错（IMPL_NOTES §1.4） */
const PACKS_ROUTE = "/openloop/packs";
/**
* pack 路由虚拟入口名（§12 加载契约）：
* client 加载器固定请求 `<packBaseUrl>/entry.js`，pack 路由（serve.ts）从注册表解析 manifest.entry 实际文件。
* 这样 client 无需知道 manifest.entry 值，服务端可随时改入口文件路径。
*/
const PACK_ENTRY_VIRTUAL = "entry.js";
/** pack 路由虚拟样式名：`<packBaseUrl>/styles.css` → manifest.styles（可选，缺失时 404） */
const PACK_STYLES_VIRTUAL = "styles.css";
/**
* pack 名校验（§12.1 + 路径安全）：裸名或 scoped 名，仅小写字母/数字/`. _ -`；
* 含 `/` 的 scoped 名至多一个 `/`（`@scope/name`）。
* 禁止 `..`、反斜杠、空白——保证 pack 名可安全拼进 URL 与文件系统路径（防穿越）。
*/
const PACK_NAME_RE = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u;
/** 包内文件路径校验：相对、无绝对前缀、无 `..` 段、无反斜杠（防路径穿越） */
function isSafePackRelPath(path) {
	if (path.length === 0 || path.length > 512) return false;
	if (path.startsWith("/") || path.startsWith("\\")) return false;
	if (/\\/u.test(path)) return false;
	for (const segment of path.split("/")) if (segment === "" || segment === "." || segment === "..") return false;
	return true;
}
/** 车道判定（§5.1：pack → 按 manifest.runtime）：react18→host；react19→sandbox（批 4） */
function packLaneFor(runtime) {
	return runtime === "react18" ? "host" : "sandbox";
}
/**
* 解析并校验一个未知输入为 PackManifest（fail-closed）。
* 任何缺字段/类型错误/非法值都抛 Error；react19 是合法值（解析不拒，注册层按车道策略拒绝）。
*/
function parsePackManifest(input) {
	if (typeof input !== "object" || input === null || Array.isArray(input)) throw new Error("dsh-pack.json must be a JSON object conforming to the §12.1 pack manifest contract");
	const record = input;
	const name = record.name;
	if (typeof name !== "string" || !PACK_NAME_RE.test(name)) throw new Error(`pack manifest name must be a kebab-case (or @scope/name) string; got ${describe$2(name)}`);
	const version = record.version;
	if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(version)) throw new Error(`pack manifest "${name}" version must be a semver string like "0.1.0"; got ${describe$2(version)}`);
	const runtime = record.runtime;
	if (runtime !== "react18" && runtime !== "react19") throw new Error(`pack manifest "${name}" runtime must be "react18" or "react19"; got ${describe$2(runtime)}`);
	const entry = record.entry;
	if (typeof entry !== "string" || !isSafePackRelPath(entry)) throw new Error(`pack manifest "${name}" entry must be a relative pack file path (no leading "/" or ".."); got ${describe$2(entry)}`);
	const stylesRaw = record.styles;
	if (stylesRaw !== void 0 && (typeof stylesRaw !== "string" || !isSafePackRelPath(stylesRaw))) throw new Error(`pack manifest "${name}" styles must be a relative pack file path or omitted; got ${describe$2(stylesRaw)}`);
	const componentsRaw = record.components;
	if (typeof componentsRaw !== "object" || componentsRaw === null || Array.isArray(componentsRaw)) throw new Error(`pack manifest "${name}" components must be a non-empty object mapping component names to metadata`);
	const componentsEntries = Object.entries(componentsRaw);
	if (componentsEntries.length === 0) throw new Error(`pack manifest "${name}" components must declare at least one component`);
	const components = {};
	for (const [componentName, metaRaw] of componentsEntries) {
		if (!/^[a-zA-Z][a-zA-Z0-9_]*$/u.test(componentName)) throw new Error(`pack manifest "${name}" component name "${componentName}" must be a valid identifier (letters/digits/underscore)`);
		if (typeof metaRaw !== "object" || metaRaw === null || Array.isArray(metaRaw)) throw new Error(`pack manifest "${name}" component "${componentName}" metadata must be an object`);
		const meta = metaRaw;
		if (meta.description !== void 0 && typeof meta.description !== "string") throw new Error(`pack manifest "${name}" component "${componentName}" description must be a string`);
		if (meta.propsSchema !== void 0 && (typeof meta.propsSchema !== "object" || meta.propsSchema === null || Array.isArray(meta.propsSchema))) throw new Error(`pack manifest "${name}" component "${componentName}" propsSchema must be a JSON Schema object`);
		const componentMeta = {};
		if (typeof meta.description === "string") componentMeta.description = meta.description;
		if (typeof meta.propsSchema === "object" && meta.propsSchema !== null) componentMeta.propsSchema = meta.propsSchema;
		components[componentName] = componentMeta;
	}
	return {
		name,
		version,
		runtime,
		entry,
		...stylesRaw !== void 0 ? { styles: stylesRaw } : {},
		components
	};
}
function describe$2(value) {
	if (typeof value === "string") return JSON.stringify(value);
	if (value === null) return "null";
	if (Array.isArray(value)) return "an array";
	return typeof value;
}
//#endregion
//#region src/packs/registry.ts
/**
* 外部组件包注册表（§12）。
*
* - 模块级全局单例 + `PackRegistry` 类（测试可注入独立实例，避免污染全局）。
* - `registerPack(manifest, baseUrl)`：parsePackManifest 校验（fail-closed）后登记；
*   `runtime: "react19"` 在注册层拒绝（§12.2 硬约束 1：react19 走沙箱车道，批 4 未实现，报错提示）。
* - 注册同时同步 `validation.ts` 的 pack 白名单（tool 校验 §5.4 用同一份注册信息）。
* - `scanPacksDir(dir, fs)`：读 `dir` 下每个子目录的 `dsh-pack.json` 批量注册（§12 启用方式 v1）；
*   `fs` 可注入（测试用内存 fs），目录不存在容错返回空结果。
*
* 注意：本模块仅服务端/测试引用；client（loader/PanelCard）**不**引用它（见 loader.ts）。
*/
/** node:fs/promises 适配（scanPacksDir 默认实现） */
const nodePackFs = {
	readdir: (dir) => readdir(dir),
	readFile: (path) => readFile(path, "utf8")
};
var PackRegistry = class {
	packs = /* @__PURE__ */ new Map();
	/**
	* 校验并注册一个 pack（重复 name = 覆盖更新，幂等，scan 重跑安全）。
	* react19 runtime 抛错（v1 宿主车道仅 react18）；baseUrl 必须为绝对 URL 前缀（`/` 开头、`/` 结尾）。
	*/
	registerPack(manifest, baseUrl, fsRoot = "") {
		const parsed = parsePackManifest(manifest);
		if (parsed.runtime !== "react18") throw new Error(`pack "${parsed.name}" runtime "${parsed.runtime}" targets the sandbox lane (react19 runtime ships in batch 4); v1 registers only "${HOST_LANE_RUNTIME}" on the host lane — rebuild the pack with "runtime": "${HOST_LANE_RUNTIME}"`);
		if (typeof baseUrl !== "string" || !baseUrl.startsWith("/") || !baseUrl.endsWith("/")) throw new Error(`pack "${parsed.name}" baseUrl must be an absolute URL prefix (e.g. "${PACKS_ROUTE}/${parsed.name}/"); got ${JSON.stringify(baseUrl)}`);
		this.packs.set(parsed.name, {
			manifest: parsed,
			baseUrl,
			fsRoot
		});
		registerPack$1(parsed.name, Object.keys(parsed.components));
	}
	getPack(name) {
		return this.packs.get(name);
	}
	hasPack(name) {
		return this.packs.has(name);
	}
	listPacks() {
		return [...this.packs.values()];
	}
	/** 清空注册表（测试用；不影响 validation.ts 的白名单） */
	clear() {
		this.packs.clear();
	}
};
/** 全局单例（服务端 index.ts 接线用） */
const packRegistry = new PackRegistry();
function registerPack(manifest, baseUrl, fsRoot = "", registry = packRegistry) {
	registry.registerPack(manifest, baseUrl, fsRoot);
}
function getPack(name, registry = packRegistry) {
	return registry.getPack(name);
}
function hasPack(name, registry = packRegistry) {
	return registry.hasPack(name);
}
function listPacks(registry = packRegistry) {
	return registry.listPacks();
}
/** 清空全局注册表（测试隔离用） */
function resetPackRegistry(registry = packRegistry) {
	registry.clear();
}
/**
* 扫描 `dir` 下每个子目录的 `dsh-pack.json` 批量注册（§12 启用方式 v1）。
* - 每个子目录若无 `dsh-pack.json` / 解析失败 / 注册被拒（如 react19）→ 记录 errors 并跳过，不中断整体。
* - 目录本身不存在/不可读 → 返回空结果（v1 启动容错：pack 目录未建时不打扰）。
* - fsRoot 恒为该子目录（pack 资产路由从 fsRoot 相对读文件）。
*/
async function scanPacksDir(dir, fs = nodePackFs, registry = packRegistry) {
	const result = {
		registered: [],
		errors: []
	};
	let entries;
	try {
		entries = await fs.readdir(dir);
	} catch {
		return result;
	}
	for (const entry of entries) {
		const packDir = join(dir, entry);
		const manifestPath = join(packDir, "dsh-pack.json");
		let manifest;
		try {
			const raw = await fs.readFile(manifestPath);
			manifest = parsePackManifest(JSON.parse(raw));
		} catch (error) {
			result.errors.push(`${entry}: ${describe$1(error)}`);
			continue;
		}
		try {
			registry.registerPack(manifest, `${PACKS_ROUTE}/${manifest.name}/`, packDir);
			result.registered.push(manifest.name);
		} catch (error) {
			result.errors.push(`${manifest.name}: ${describe$1(error)}`);
		}
	}
	return result;
}
function describe$1(error) {
	return error instanceof Error ? error.message : String(error);
}
//#endregion
//#region src/packs/serve.ts
/**
* pack 资产路由（DSH_PANELS_DESIGN §9 / §12，服务端模块；写法参照 IMPL_NOTES §1）。
*
* - 经 `ctx.webServer.register` 注册 `kind: 'prefix'` 路由 `PACKS_ROUTE`（`/openloop/packs`，panels 独占前缀）。
* - 路径 `/openloop/packs/<pack>/<path>`：
*   - `<pack>` 从注册表解析（`registry.getPack`）；scoped 名（`@scope/name`）允许 `/` 作为第二段。
*   - 虚拟名 `entry.js` / `styles.css` 从注册表映射到 manifest.entry / manifest.styles（§12 加载契约）；
*     其余路径直接相对 pack.fsRoot 静态 serve。
*   - 只 serve `.js` / `.mjs` / `.css`（v1 资产类型；CSP `script-src`/`style-src` 白名单同源）。
* - 安全：包名走 `PACK_NAME_RE`（禁 `..`/反斜杠/空白）；文件相对路径经 `isSafePackRelPath`
*   校验 + `resolve` 越界检查（纵深防御，防路径穿越）。
* - `Cache-Control: public, max-age=31536000, immutable`（D10 传输层策略，pack 资产按内容 hash 命名）。
* - 注册必须包在 `ctx.effect` 里做生命周期回收（IMPL_NOTES §1.4）。
*/
const CONTENT_TYPES = {
	js: "text/javascript; charset=utf-8",
	mjs: "text/javascript; charset=utf-8",
	css: "text/css; charset=utf-8"
};
/** 允许 serve 的资产扩展名（§9 pack 资产 = JS/CSS；其他扩展一律 404，fail-closed） */
const ALLOWED_EXTENSIONS = /* @__PURE__ */ new Set([
	"js",
	"mjs",
	"css"
]);
/** 解析 `/openloop/packs/<pack>/<path>`；无法解析返回 null（404） */
function parsePackRef(rel) {
	const segments = rel.split("/").filter(Boolean);
	if (segments.length === 0) return null;
	const [first, second, ...rest] = segments;
	if (first === void 0) return null;
	let name;
	let pathParts;
	if (first.startsWith("@")) {
		if (second === void 0) return null;
		name = `${first}/${second}`;
		pathParts = rest;
	} else {
		name = first;
		pathParts = [second, ...rest].filter((part) => part !== void 0);
	}
	let decoded;
	try {
		decoded = decodeURIComponent(name);
	} catch {
		return null;
	}
	if (!PACK_NAME_RE.test(decoded)) return null;
	return {
		name: decoded,
		path: pathParts.join("/")
	};
}
var PanelsPackAssets = class {
	webServer;
	registry;
	constructor(webServer, registry = packRegistry) {
		this.webServer = webServer;
		this.registry = registry;
	}
	register(ctx) {
		ctx.effect(() => this.webServer.register({
			kind: "prefix",
			path: PACKS_ROUTE,
			handler: (req, res) => this.handle(req, res)
		}), "openloop-panels: pack assets");
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
		const ref = parsePackRef(pathname.startsWith(`/openloop/packs/`) ? pathname.slice(16) : "");
		if (ref === null) {
			res.statusCode = 404;
			res.end();
			return;
		}
		const pack = this.registry.getPack(ref.name);
		if (pack === void 0) {
			res.statusCode = 404;
			res.end();
			return;
		}
		let relPath = ref.path;
		if (relPath === "entry.js") relPath = pack.manifest.entry;
		else if (relPath === "styles.css") {
			if (pack.manifest.styles === void 0) {
				res.statusCode = 404;
				res.end();
				return;
			}
			relPath = pack.manifest.styles;
		}
		if (!isSafePackRelPath(relPath) || pack.fsRoot === "") {
			res.statusCode = 404;
			res.end();
			return;
		}
		const ext = extname(relPath).slice(1);
		const contentType = CONTENT_TYPES[ext];
		if (contentType === void 0 || !ALLOWED_EXTENSIONS.has(ext)) {
			res.statusCode = 404;
			res.end();
			return;
		}
		const target = join(pack.fsRoot, ...relPath.split("/"));
		const root = resolve(pack.fsRoot);
		const resolvedTarget = resolve(target);
		if (resolvedTarget !== root && !resolvedTarget.startsWith(`${root}${sep}`)) {
			res.statusCode = 404;
			res.end();
			return;
		}
		try {
			const body = await readFile(resolvedTarget);
			res.statusCode = 200;
			res.setHeader("Content-Type", contentType);
			res.setHeader("Content-Length", String(body.byteLength));
			res.end(req.method === "HEAD" ? void 0 : body);
		} catch {
			res.statusCode = 404;
			res.end();
		}
	}
};
//#endregion
//#region src/packs/bridge.ts
/** 取值辅助：缺失返回 undefined */
function get(tokens, key) {
	return tokens[key];
}
/** 圆角解析：`"12px"` → 12；非数值/缺失 → 0（有损，v1 兜底） */
function radiusToNumber(tokens, key) {
	const value = get(tokens, key);
	if (value === void 0) return 0;
	const match = /^([\d.]+)/u.exec(value.trim());
	const n = match === null ? NaN : Number(match[1]);
	return Number.isFinite(n) ? n : 0;
}
/**
* openloop 预设系 token → antd `ConfigProvider theme.token` 输入对象（§12.3）。
* 有损点：colorText* 灰阶 4 级归并 antd 10 级；无 focus 系列 token（antd 的 controlOutline 等）→ 不输出。
*/
function toAntdThemeTokens(openloopTokens) {
	const out = {};
	const set = (key, value) => {
		if (value !== void 0) out[key] = value;
	};
	set("colorPrimary", get(openloopTokens, "primary"));
	set("colorPrimaryHover", get(openloopTokens, "primary-tint"));
	set("colorPrimaryActive", get(openloopTokens, "primary-shade"));
	set("colorSuccess", get(openloopTokens, "success"));
	set("colorWarning", get(openloopTokens, "warning"));
	set("colorError", get(openloopTokens, "error"));
	set("colorInfo", get(openloopTokens, "info"));
	set("colorLink", get(openloopTokens, "primary"));
	set("colorBgContainer", get(openloopTokens, "surface"));
	set("colorBgLayout", get(openloopTokens, "surface-muted"));
	set("colorBgElevated", get(openloopTokens, "surface-subtle"));
	set("colorText", get(openloopTokens, "foreground"));
	set("colorTextHeading", get(openloopTokens, "foreground-strong") ?? get(openloopTokens, "foreground"));
	set("colorTextSecondary", get(openloopTokens, "muted-foreground"));
	set("colorTextTertiary", get(openloopTokens, "foreground-subtle") ?? get(openloopTokens, "muted-foreground"));
	set("colorTextQuaternary", get(openloopTokens, "foreground-subtle"));
	set("colorBorder", get(openloopTokens, "border"));
	set("colorBorderSecondary", get(openloopTokens, "border-muted") ?? get(openloopTokens, "border"));
	const radiusMd = radiusToNumber(openloopTokens, "radius-md");
	const radiusSm = radiusToNumber(openloopTokens, "radius-sm");
	const radiusLg = radiusToNumber(openloopTokens, "radius-lg");
	if (radiusMd > 0) out.borderRadius = radiusMd;
	if (radiusSm > 0) out.borderRadiusSM = radiusSm;
	if (radiusLg > 0) out.borderRadiusLG = radiusLg;
	return out;
}
/**
* openloop 预设系 token → MUI `createTheme()` 输入对象（§12.3）。
* 有损点：`secondary` 无对应 token → chart-1 近似；MUI 默认 8px 圆角 → radius-md；阴影/motion 不映射。
*/
function toMuiThemeTokens(openloopTokens) {
	const out = {};
	const primary = get(openloopTokens, "primary");
	const secondary = get(openloopTokens, "chart-1");
	const error = get(openloopTokens, "error");
	const warning = get(openloopTokens, "warning");
	const info = get(openloopTokens, "info");
	const success = get(openloopTokens, "success");
	if (primary !== void 0 || secondary !== void 0 || error !== void 0 || warning !== void 0 || info !== void 0 || success !== void 0) {
		const palette = {};
		if (primary !== void 0) {
			const primaryLight = get(openloopTokens, "primary-tint");
			const primaryDark = get(openloopTokens, "primary-shade");
			const primaryContrast = get(openloopTokens, "primary-foreground");
			palette.primary = { main: primary };
			if (primaryLight !== void 0) palette.primary.light = primaryLight;
			if (primaryDark !== void 0) palette.primary.dark = primaryDark;
			if (primaryContrast !== void 0) palette.primary.contrastText = primaryContrast;
		}
		if (secondary !== void 0) palette.secondary = { main: secondary };
		if (error !== void 0) palette.error = { main: error };
		if (warning !== void 0) palette.warning = { main: warning };
		if (info !== void 0) palette.info = { main: info };
		if (success !== void 0) palette.success = { main: success };
		out.palette = palette;
	}
	const textPrimary = get(openloopTokens, "foreground");
	const textSecondary = get(openloopTokens, "muted-foreground");
	const textDisabled = get(openloopTokens, "foreground-subtle");
	const bgDefault = get(openloopTokens, "surface");
	const bgPaper = get(openloopTokens, "surface-subtle");
	const divider = get(openloopTokens, "border");
	if (textPrimary !== void 0 || textSecondary !== void 0 || textDisabled !== void 0) {
		const text = {};
		if (textPrimary !== void 0) text.primary = textPrimary;
		if (textSecondary !== void 0) text.secondary = textSecondary;
		if (textDisabled !== void 0) text.disabled = textDisabled;
		out.palette = {
			...out.palette,
			text
		};
	}
	if (bgDefault !== void 0 || bgPaper !== void 0) {
		const background = {};
		if (bgDefault !== void 0) background.default = bgDefault;
		if (bgPaper !== void 0) background.paper = bgPaper;
		out.palette = {
			...out.palette,
			background
		};
	}
	if (divider !== void 0) out.palette = {
		...out.palette,
		divider
	};
	const radiusMd = radiusToNumber(openloopTokens, "radius-md");
	if (radiusMd > 0) out.shape = { borderRadius: radiusMd };
	const fontFamily = get(openloopTokens, "font-sans");
	if (fontFamily !== void 0) out.typography = { fontFamily };
	return out;
}
//#endregion
//#region src/packs/loader.ts
/** pack 入口 URL（虚拟名 entry.js，pack 路由从注册表解析 manifest.entry） */
function packEntryUrl(name) {
	return `${PACKS_ROUTE}/${name}/${PACK_ENTRY_VIRTUAL}`;
}
/**
* 加载 pack 组件（宿主车道）。成功返回组件函数；任何失败抛可读 Error。
* props 必须为 JSON 对象（非数组）；component 名仅用于错误消息（注册校验已在服务端完成）。
*/
async function loadPackComponent(name, component, props, opts = {}) {
	if (typeof name !== "string" || name.length === 0) throw new Error("loadPackComponent requires a non-empty pack name");
	if (typeof component !== "string" || component.length === 0) throw new Error(`loadPackComponent for pack "${name}" requires a non-empty component name`);
	if (typeof props !== "object" || props === null || Array.isArray(props)) throw new Error(`pack "${name}" component "${component}" props must be a JSON object`);
	const entryUrl = opts.entryUrl ?? packEntryUrl(name);
	const importModule = opts.importModule ?? ((url) => import(url));
	let module;
	try {
		module = await importModule(entryUrl);
	} catch (error) {
		throw new Error(`failed to load pack "${name}" component "${component}": ${describe(error)} (entry: ${entryUrl})`);
	}
	const candidate = module?.default;
	if (typeof candidate !== "function") throw new Error(`pack "${name}" component "${component}" does not default-export a React component function (pack contract §12.2: default export must be the component); got ${candidate === void 0 ? "no default export" : typeof candidate}`);
	return candidate;
}
function describe(error) {
	return error instanceof Error ? error.message : String(error);
}
//#endregion
//#region src/index.ts
const name = "openloop-dsh-panels";
const inject = [
	"tools",
	"fs",
	"skills"
];
const Config = z.object({ packsDir: z.string() });
function apply(ctx, config) {
	const logger = ctx.logger("openloop-dsh-panels");
	new PanelsAssets().register(ctx);
	ctx.inject(["webServer"], (routeCtx) => {
		new PanelsPackAssets(routeCtx.webServer).register(routeCtx);
		new PanelsRefreshRoute(routeCtx.webServer).register(routeCtx);
	});
	if (typeof config.packsDir === "string" && config.packsDir.length > 0) scanPacksDir(config.packsDir).then(({ registered, errors }) => {
		for (const name of registered) {
			const pack = packRegistry.getPack(name);
			if (pack !== void 0) registerPack$1(pack.manifest.name, Object.keys(pack.manifest.components));
		}
		if (errors.length > 0) logger.warn(`pack scan skipped ${errors.length} entry(s): ${errors.join("; ")}`);
		if (registered.length > 0) logger.info(`registered ${registered.length} external pack(s): ${registered.join(", ")}`);
	}).catch((error) => logger.warn(`pack scan failed: ${error instanceof Error ? error.message : String(error)}`));
	const tool = definePanelTool();
	tool.execute = createPanelExecute(tool, ctx);
	ctx.tools.register(tool);
	for (const provider of panelsSkillProviders) ctx.skills.registerProvider(() => provider);
}
/**
* panel 工具的执行包装层（导出以便单测）：字符串容错 → load 唤起 → 编译注入 → 持久化。
*
* ⚠️ 冻结契约（真机事故 2026-08-22）：dsh-tools 会把 args 深冻结（Object.freeze），
* 包装层绝不能在原对象上赋值——先浅拷贝 `{ ...args }` 再改，且下游调用必须传拷贝。
*/
function createPanelExecute(tool, ctx) {
	const originalExecute = tool.execute;
	return async (args, exec) => {
		const argsLike = { ...args };
		if (typeof argsLike.panel === "string") argsLike.panel = coercePanelArg(argsLike.panel);
		if ((argsLike.panel === void 0 || argsLike.panel === null) && typeof argsLike.panelFile === "string" && argsLike.panelFile.length > 0) {
			const panelFile = argsLike.panelFile;
			const resolved = ctx.get("sandboxPolicy")?.resolve?.(exec.agent ? { session: exec.agent.session } : void 0);
			const cwd = resolved?.workspaceRoot ?? exec.agent?.session.header.cwd;
			const fs = createCtxPanelFs({
				fs: ctx.fs,
				cwd,
				signal: exec.signal,
				sandboxPolicy: resolved
			});
			let content;
			try {
				content = await fs.readText(panelFile);
			} catch (error) {
				throw new Error(`panelFile "${panelFile}" could not be read: ${error instanceof Error ? error.message : String(error)}`);
			}
			if (content === void 0) throw new Error(`panelFile "${panelFile}" does not exist in the workspace. Write the PanelDefinition JSON to a file first (write tool), then pass its path via panelFile.`);
			let parsed;
			try {
				parsed = JSON.parse(content);
			} catch (error) {
				throw new Error(`panelFile "${panelFile}" contains malformed JSON (${error instanceof SyntaxError ? error.message : String(error)}). Fix the file syntax and retry.`);
			}
			if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error(`panelFile "${panelFile}" must contain a single PanelDefinition JSON object.`);
			argsLike.panel = parsed;
		}
		if ((argsLike.panel === void 0 || argsLike.panel === null) && typeof argsLike.load === "string" && argsLike.load.length > 0) {
			const resolved = ctx.get("sandboxPolicy")?.resolve?.(exec.agent ? { session: exec.agent.session } : void 0);
			const cwd = resolved?.workspaceRoot ?? exec.agent?.session.header.cwd;
			const fs = createCtxPanelFs({
				fs: ctx.fs,
				cwd,
				signal: exec.signal,
				sandboxPolicy: resolved
			});
			const stored = await createPanelStore({
				dir: PANELS_SUBDIR,
				fs
			}).load(argsLike.load);
			if (stored === void 0) throw new Error(`panel "${argsLike.load}" is not persisted in this workspace. Persist it first with persist: true, or pass a full PanelDefinition.`);
			argsLike.panel = stored.panel;
		}
		const rawPanel = argsLike.panel;
		if (typeof rawPanel === "object" && rawPanel !== null) argsLike.panel = compilePanelCustomCode(rawPanel);
		const result = await originalExecute.call(tool, argsLike, exec);
		const panel = argsLike.panel;
		if (argsLike.persist === true || typeof panel === "object" && panel !== null && panel.persist === true) {
			const logger = ctx.logger("openloop-dsh-panels");
			try {
				const resolved = ctx.get("sandboxPolicy")?.resolve?.(exec.agent ? { session: exec.agent.session } : void 0);
				const cwd = resolved?.workspaceRoot ?? exec.agent?.session.header.cwd;
				const fs = createCtxPanelFs({
					fs: ctx.fs,
					cwd,
					signal: exec.signal,
					sandboxPolicy: resolved
				});
				const { path } = await createPanelStore({
					dir: PANELS_SUBDIR,
					fs
				}).save(panel);
				logger.info(`panel "${panel.id}" persisted to ${path}`);
			} catch (error) {
				const id = typeof panel === "object" && panel !== null ? String(panel.id ?? "?") : "?";
				logger.warn(`savePanel failed for "${id}": ${error instanceof Error ? error.message : String(error)} (rendering continues)`);
			}
		}
		return result;
	};
}
//#endregion
export { CUSTOM_CODE_MAX_BYTES, Config, DEFAULT_TIMEOUT_MS, HOST_LANE_RUNTIME, MAX_RESPONSE_BYTES, MAX_TIMEOUT_MS, PACKS_ROUTE, PACK_ENTRY_VIRTUAL, PACK_NAME_RE, PACK_RUNTIMES, PACK_STYLES_VIRTUAL, PANELS_SUBDIR, PANEL_OUTPUT_SCHEMA, PANEL_PARAMETERS, PANEL_TOOL, PLUGIN_VERSION, PRESET_KINDS, PackRegistry, PanelsPackAssets, apply, buildApiUrl, coercePanelArg, createCtxPanelFs, createMemoryPanelFs, createPanelExecute, createPanelStore, definePanelTool, forbiddenCustomCodeTerm, getPack, hasPack, inject, isForbiddenApiUrl, isPackComponent, isSafePackRelPath, listPacks, listPanels, loadPackComponent, loadPanel, looksLikeJsonContentType, name, nodePackFs, normalizeTimeoutMs, packEntryUrl, packLaneFor, packRegistry, panelsSkillProviders, parseJsonResponse, parsePackManifest, parsePickPath, pickValue, readBodyBytes, registerPack, resetPackRegistry, resolvePanelData, resolveWidgetData, savePanel, scanPacksDir, toAntdThemeTokens, toMuiThemeTokens, validateApiUrl, validatePanel };
