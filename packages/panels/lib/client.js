window.__ModuleLoader__.load({
	id: "@openloop/dsh-panels",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/dock-pin.ts
		function getDockService() {
			return globalThis.__openloopDockService;
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
			const [state, setState] = (0, react.useState)({
				loading: path !== null,
				unavailable: false
			});
			(0, react.useEffect)(() => {
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
		const headerStyle$15 = {
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
		const placeholderStyle$13 = {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: panel,
				"data-openloop-preset": "agent-activity",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: headerStyle$15,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: title,
						children: headerTitle
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: meta,
						children: scanned > 0 ? `扫描 ${scanned} 个会话 · ${actions.length} 动作` : ""
					})]
				}), state.unavailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$13,
					children: [
						"应用后端未启用",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: meta,
							children: "安装并激活 @openloop/dsh-app 后可查看 Agent 行为"
						})
					]
				}) : actions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$13,
					children: [
						"尚无 Agent 活动记录",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: meta,
							children: "Agent 调用工具的动作会实时出现在此（基于会话日志聚合）"
						})
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: colsStyle,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: sectionLabelStyle,
						children: "最近动作"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: listStyle$2,
						children: actions.map((a, i) => {
							const at = typeof a.at === "number" ? a.at : null;
							const ws = typeof a.workspace === "string" ? a.workspace : "";
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: actionRowStyle,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											...monoStyle$6,
											color: "var(--openloop-primary)",
											flexShrink: 0
										},
										children: String(a.tool)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
					})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							borderLeft: "1px solid var(--openloop-border)",
							minWidth: 0
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: sectionLabelStyle,
							children: "工具热度"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: listStyle$2,
							children: heat.map((h, i) => {
								const count = typeof h.count === "number" ? h.count : 0;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: heatRowStyle,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												width: 64,
												height: 6,
												borderRadius: 3,
												background: "var(--openloop-surface-muted)",
												overflow: "hidden",
												flexShrink: 0
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
												width: `${Math.max(4, count / maxHeat * 100)}%`,
												height: "100%",
												background: "var(--openloop-primary)"
											} })
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
		const headerStyle$14 = {
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
		const placeholderStyle$12 = {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: panel,
				"data-openloop-preset": "api-usage-monitor",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: headerStyle$14,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: title,
						children: headerTitle
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: meta,
						children: sources.length > 0 ? `${totalCalls} 次调用 · ${totalFailures} 失败 · 近 24h` : ""
					})]
				}), state.unavailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$12,
					children: [
						"应用后端未启用",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: meta,
							children: "安装并激活 @openloop/dsh-app 后可查看调用统计"
						})
					]
				}) : sources.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$12,
					children: [
						"尚无调用记录",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: meta,
							children: "面板数据绑定与 MCP 工具调用会在此累计（重启后清零）"
						})
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: scrollStyle$6,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						style: tableStyle$9,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: thStyle$4,
								children: "来源"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: thStyle$4,
								children: "类型"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: thStyle$4,
								children: "调用"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: thStyle$4,
								children: "失败"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: thStyle$4,
								children: "均耗"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: {
									...thStyle$4,
									width: "30%"
								},
								children: "频度"
							})
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: sources.map((s) => {
							const total = typeof s.total === "number" ? s.total : 0;
							const failures = typeof s.failures === "number" ? s.failures : 0;
							const kind = typeof s.kind === "string" ? s.kind : "";
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									style: {
										...tdStyle$6,
										...monoStyle$5
									},
									children: truncate(String(s.source), 44)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									style: tdStyle$6,
									children: KIND_LABEL$1[kind] ?? kind
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									style: {
										...tdStyle$6,
										fontVariantNumeric: "tabular-nums"
									},
									children: total
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									style: {
										...tdStyle$6,
										fontVariantNumeric: "tabular-nums",
										color: failures > 0 ? "var(--openloop-error)" : "var(--openloop-muted-foreground)"
									},
									children: failures
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									style: {
										...tdStyle$6,
										fontVariantNumeric: "tabular-nums"
									},
									children: typeof s.avgMs === "number" ? `${s.avgMs}ms` : "—"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									style: tdStyle$6,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											height: 6,
											borderRadius: 3,
											background: "var(--openloop-surface-muted)",
											overflow: "hidden"
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
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
		const headerStyle$13 = {
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
		const placeholderStyle$11 = {
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
			const [busy, setBusy] = (0, react.useState)(null);
			const [message, setMessage] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
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
			const [reloadNonce, setReloadNonce] = (0, react.useState)(0);
			const registry = useAppEndpoint("/openloop/app/registry", autoRefreshMs);
			const mcp = useAppEndpoint("/openloop/mcp/servers", autoRefreshMs);
			const { run, busy, message } = useManageAction(() => setReloadNonce((n) => n + 1));
			(0, react.useEffect)(() => {}, [reloadNonce]);
			const headerTitle = typeof record.title === "string" && record.title.length > 0 ? record.title : "APP 管理";
			const confirmKey = typeof record.confirm === "string" ? record.confirm : null;
			const [confirming, setConfirming] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: panel,
				"data-openloop-preset": "app-manager",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: headerStyle$13,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: title,
							children: headerTitle
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: meta,
							children: [apps.length > 0 ? `${apps.length} 个应用` : "", busy !== null ? " · 处理中…" : ""]
						})]
					}),
					message !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							padding: "6px 14px",
							fontSize: 11.5,
							color: "var(--openloop-muted-foreground)",
							borderBottom: "1px solid var(--openloop-border)"
						},
						children: message
					}) : null,
					registry.unavailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: placeholderStyle$11,
						children: [
							"应用后端未启用",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: meta,
								children: "安装并激活 @openloop/dsh-app 后可管理 APP"
							})
						]
					}) : apps.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: placeholderStyle$11,
						children: "暂无注册 APP"
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: scrollStyle$5,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
							style: tableStyle$8,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									style: thStyle$3,
									children: "应用"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									style: thStyle$3,
									children: "资源"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									style: thStyle$3,
									children: "连接"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									style: thStyle$3,
									children: "操作"
								})
							] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: apps.map((a) => {
								const name = String(a.app?.name);
								const kind = typeof a.app?.kind === "string" ? a.app.kind : "local";
								const state = mcpStateOf(name);
								const displayName = typeof a.app?.displayName === "string" && a.app.displayName.length > 0 ? a.app.displayName : name;
								const isThirdparty = kind === "thirdparty";
								const isBuiltin = kind === "builtin";
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
										style: tdStyle$5,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: { fontWeight: 600 },
												children: truncate(displayName, 24)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													...meta,
													marginLeft: 7
												},
												children: KIND_LABEL[kind] ?? kind
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												style: {
													...monoStyle$4,
													...meta,
													marginTop: 2
												},
												children: name
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
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
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
										style: tdStyle$5,
										children: [state === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: meta,
											children: "—"
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
											display: "inline-block",
											width: 8,
											height: 8,
											borderRadius: "50%",
											marginRight: 6,
											background: state === "running" ? "var(--openloop-success)" : state === "error" ? "var(--openloop-error)" : "var(--openloop-muted-foreground)"
										} }), state ?? "本地"]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										style: {
											...tdStyle$5,
											whiteSpace: "nowrap"
										},
										children: isBuiltin ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: meta,
											children: "系统保留"
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [isThirdparty ? state === "running" || state === "connecting" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: btnStyle,
											disabled: busy !== null,
											onClick: () => onAction("disconnect", name),
											children: "断开"
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: btnStyle,
											disabled: busy !== null,
											onClick: () => onAction("reconnect", name),
											children: "重连"
										}) : null, confirming === name ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: confirmBtnStyle,
											disabled: busy !== null,
											onClick: () => onAction("delete", name),
											children: "确认删除？"
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
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
		const headerStyle$12 = {
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
		const placeholderStyle$10 = {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: panel,
				"data-openloop-preset": "event-log",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: headerStyle$12,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: title,
						children: headerTitle
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: meta,
						children: events.length > 0 ? `${events.length} 条 · 新→旧` : ""
					})]
				}), state.unavailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$10,
					children: [
						"应用后端未启用",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: meta,
							children: "安装并激活 @openloop/dsh-app 后可查看系统事件"
						})
					]
				}) : events.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$10,
					children: [
						"暂无事件",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: meta,
							children: "接入/断开第三方包、删除 APP、后端重启等动作会记录在此"
						})
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: listStyle$1,
					children: events.map((e, i) => {
						const kind = typeof e.kind === "string" ? e.kind : "";
						const level = typeof e.level === "string" ? e.level : "info";
						const at = typeof e.at === "number" ? e.at : null;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: rowStyle$2,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: timeStyle$1,
									children: at !== null ? relativeTime(new Date(at).toISOString()) : "—"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: dotStyle$3(level) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: kindBadgeStyle,
									children: kind
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
		const headerStyle$11 = {
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
		const placeholderStyle$9 = {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: panel,
				"data-openloop-preset": "system-overview",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: headerStyle$11,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: title,
						children: headerTitle
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: meta,
						children: backendState === "running" && servers.length > 0 ? `运行中 · ${typeof status.data?.version === "string" ? status.data.version : ""} · ${mcpRunning}/${servers.length} MCP` : ""
					})]
				}), status.unavailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$9,
					children: [
						"应用后端未启用",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: meta,
							children: "安装并激活 @openloop/dsh-app 后可查看系统总览"
						})
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: gridStyle$1,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: cellStyle$3,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: cellLabelStyle,
								children: "应用后端"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									...cellValueStyle,
									color: backendState === "running" ? "var(--openloop-success)" : "var(--openloop-error)"
								},
								children: backendState === "running" ? "正常" : backendState === "starting" ? "启动中" : "异常"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: cellStyle$3,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: cellLabelStyle,
								children: "MCP 服务"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: cellValueStyle,
								children: [mcpRunning, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: meta,
									children: [" / ", servers.length]
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: cellStyle$3,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: cellLabelStyle,
								children: "磁盘占用"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: cellValueStyle,
								children: totalBytes !== null ? formatBytes(totalBytes) : "—"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: cellStyle$3,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: cellLabelStyle,
								children: "会话总数"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: cellValueStyle,
								children: sessionsTotal !== null ? sessionsTotal : "—"
							})]
						})
					]
				}), warnings.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: warnings.map((w, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						...warnRowStyle,
						borderTop: i === 0 ? "1px solid var(--openloop-border)" : void 0
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: dotStyle$2(w.tone) }), w.text]
				}, i)) }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						...warnRowStyle,
						color: "var(--openloop-muted-foreground)",
						borderBottom: 0
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: dotStyle$2("ok") }), " 全部子系统正常"]
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
			const baseId = (0, react.useId)();
			const requestedDefault = isFiniteNumber(root.defaultOpenIndex) ? Math.trunc(root.defaultOpenIndex) : 0;
			const [openIndex, setOpenIndex] = (0, react.useState)(requestedDefault >= 0 && requestedDefault < items.length ? requestedDefault : items.length > 0 ? 0 : null);
			if (items.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-openloop-preset": "accordion",
				"data-openloop-count": "0",
				style: {
					...panel,
					padding: "12px 14px"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: meta,
					children: "暂无内容"
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "accordion",
				"data-openloop-count": String(items.length),
				style: {
					...panel,
					overflow: "hidden",
					padding: 0
				},
				children: [panelTitle !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: index > 0 ? { borderTop: "1px solid var(--openloop-border)" } : void 0,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							id: triggerId,
							"aria-expanded": expanded,
							"aria-controls": panelId,
							onClick: () => setOpenIndex(expanded ? null : index),
							style: triggerStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: triggerLabelStyle,
								children: item.label
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: expanded ? {
									...chevronStyle,
									transform: "rotate(180deg)"
								} : chevronStyle,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
									width: "14",
									height: "14",
									viewBox: "0 0 16 16",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "1.5",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 6l4 4 4-4" })
								})
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
		const headerStyle$10 = {
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
		const placeholderStyle$8 = {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: panel,
				"data-openloop-preset": "api-credentials",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: headerStyle$10,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: title,
						children: headerTitle
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: meta,
						children: apis.length > 0 ? `${configuredCount} / ${apis.length} 已配置` : ""
					})]
				}), state.unavailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$8,
					children: [
						"本地应用后端未启用",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: meta,
							children: "安装并激活 @openloop/dsh-app 插件后可查看凭据配置"
						})
					]
				}) : state.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$8,
					children: ["凭据信息读取失败：", state.error]
				}) : apis.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$8,
					children: [
						"暂无登记的 API 资源",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: meta,
							children: "让 Agent 经 app_backend 工具 register_api + set_api_key 登记"
						})
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: scrollStyle$4,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						style: tableStyle$7,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: thStyle$2,
								children: "资源 ID"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: thStyle$2,
								children: "端点"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: thStyle$2,
								children: "鉴权"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: thStyle$2,
								children: "状态"
							})
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: apis.map((api) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								style: {
									...tdStyle$4,
									...monoStyle$3
								},
								children: truncate(String(api.rid), 48)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
								style: tdStyle$4,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: monoStyle$3,
									children: truncate(String(api.domain ?? ""), 30)
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: meta,
									children: String(api.path ?? "")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								style: tdStyle$4,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
								style: tdStyle$4,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
		const shellStyle$1 = {
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
		const titleStyle$5 = {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "callout",
				"data-openloop-tone": tone,
				role: tone === "error" ? "alert" : "status",
				style: {
					...shellStyle$1,
					border: `1px solid ${palette.border}`,
					background: palette.background,
					color: palette.text
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					"aria-hidden": "true",
					style: glyphStyle,
					children: TONE_GLYPH[tone]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: bodyStyle$2,
					children: [title !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							...titleStyle$5,
							color: palette.text
						},
						children: title
					}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
				if (typeof kind !== "string" || !PRESET_KINDS.includes(kind)) {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: { marginBottom: 10 },
				children: [title ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: containerTitleStyle,
					children: title
				}) : null, description ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: containerDescStyle,
					children: description
				}) : null]
			});
		}
		//#endregion
		//#region src/presets/widget-view.tsx
		const placeholderStyle$7 = {
			padding: "10px 12px",
			border: "1px dashed var(--openloop-border)",
			borderRadius: "var(--openloop-radius-sm)",
			fontSize: 12,
			lineHeight: 1.5,
			color: "var(--openloop-muted-foreground)"
		};
		/** 单格降级占位：kind + 面向 Agent 的可修正提示 */
		function WidgetPlaceholder({ kind, message }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-widget": "invalid",
				style: placeholderStyle$7,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: { fontWeight: 600 },
					children: ["子组件不可用", kind ? ` · ${kind}` : ""]
				}), message ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: { marginTop: 2 },
					children: message
				}) : null]
			});
		}
		/** 渲染一个子 widget（WidgetUnit 形状）；非法/不可渲染返回占位 */
		function WidgetView({ widget }) {
			const source = asRecord(widget.source);
			if (!source) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetPlaceholder, { message: "缺少 source，无法渲染" });
			if (source.type !== "preset") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetPlaceholder, {
				kind: String(source.type),
				message: "pack/custom 需走沙箱车道，容器 children 仅支持 preset 组件"
			});
			const kind = source.kind;
			if (typeof kind !== "string") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetPlaceholder, { message: "preset source 缺少 kind" });
			const preset = getPreset(kind);
			if (!preset) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetPlaceholder, {
				kind,
				message: "未知或未实现的 preset kind"
			});
			if (isLayoutKind(preset.kind)) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetPlaceholder, {
				kind: String(kind),
				message: "布局容器（stack/grid/row/split）不可作为子组件；如需分组请用 card/section"
			});
			const props = source.props === void 0 ? {} : asRecord(source.props);
			if (props === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetPlaceholder, {
				kind: String(kind),
				message: "props 必须是 JSON 对象"
			});
			const result = preset.validate(props);
			if (!result.ok) {
				const first = result.errors[0];
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetPlaceholder, {
					kind: String(kind),
					message: first ? first.message : "props 校验失败"
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(preset.Render, { props });
		}
		/** 批量渲染容器 children（key 用 widget.id，缺省回退 index） */
		function renderChildren(children) {
			return children.map((child, index) => {
				const id = child?.id;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetView, { widget: child }, typeof id === "string" ? id : `child-${index}`);
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "card",
				style: shell$1,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContainerHeader, {
					title,
					description
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
		const titleStyle$4 = {
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
			const [hiddenKeys, setHiddenKeys] = (0, react.useState)([]);
			const hidden = new Set(hiddenKeys);
			const series = allSeries.filter((entry) => !hidden.has(entry.key));
			const toggleSeries = (key) => {
				setHiddenKeys((current) => current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
			};
			const [tooltip, setTooltip] = (0, react.useState)(null);
			const legend = allSeries.length > 1 && legendVisible ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: legendStyle,
				children: allSeries.map((item, index) => {
					const isHidden = hidden.has(item.key);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
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
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
			const empty = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "chart",
				"data-openloop-variant": variant,
				"data-openloop-count": "0",
				style: containerStyle$5,
				children: [panelTitle !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: titleStyle$4,
					children: panelTitle
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					"data-openloop-preset": "chart",
					"data-openloop-variant": "donut",
					"data-openloop-count": String(rows.length),
					style: containerStyle$5,
					children: [
						panelTitle !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: titleStyle$4,
							children: panelTitle
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								position: "relative",
								maxWidth: 240,
								margin: "0 auto"
							},
							onPointerLeave: () => setTooltip(null),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
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
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
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
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
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
											}), showProportion ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
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
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
										x: "110",
										y: "104",
										textAnchor: "middle",
										fontSize: "11",
										fill: "var(--openloop-muted-foreground)",
										children: firstSeries.label ?? firstSeries.key
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
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
							}), tooltip ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								role: "tooltip",
								style: {
									...tooltipStyle,
									left: `${tooltip.x / 220 * 100}%`,
									top: `${tooltip.y / 220 * 100}%`
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: meta,
									children: tooltip.label
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: tooltip.series }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
					bars.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
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
				if (withArea) elements.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: `${linePath} L ${lastPoint.x.toFixed(2)} ${baseline.toFixed(2)} L ${firstPoint.x.toFixed(2)} ${baseline.toFixed(2)} Z`,
					fill: color,
					opacity: "0.14"
				}, "area"));
				elements.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: linePath,
					fill: "none",
					stroke: color,
					strokeWidth: "3",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}, "line"));
				points.forEach(({ x, y, label, value }, pointIndex) => {
					elements.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
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
				lines.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", { children: elements }, item.key));
			});
			const referenceY = referenceLine !== void 0 ? yAt(referenceLine) : void 0;
			const showReference = referenceY !== void 0 && Number.isFinite(referenceY) && referenceY >= MARGIN.top && referenceY <= MARGIN.top + PLOT_HEIGHT;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "chart",
				"data-openloop-variant": variant,
				"data-openloop-count": String(rows.length),
				style: containerStyle$5,
				children: [
					panelTitle !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: titleStyle$4,
						children: panelTitle
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
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
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
									x1: MARGIN.left,
									x2: WIDTH - MARGIN.right,
									y1: y,
									y2: y,
									stroke: "var(--openloop-border)",
									strokeOpacity: "0.35",
									strokeDasharray: "3 4"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									x: MARGIN.left - 8,
									y: y + 4,
									textAnchor: "end",
									fontSize: "10",
									fill: "var(--openloop-muted-foreground)",
									children: compactTick$2(value)
								})] }, `grid:${index}`);
							}),
							showReference && referenceY !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
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
							rows.map((row, index) => index === 0 || index === rows.length - 1 || index % labelEvery === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
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
		const headerStyle$9 = {
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
			const [focus, setFocus] = (0, react.useState)(recommendedIndex >= 0 ? recommendedIndex : 0);
			const focused = focus >= 0 && focus < columns.length ? focus : 0;
			if (columns.length === 0 || rows.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-openloop-preset": "comparison",
				"data-openloop-count": "0",
				style: {
					...panel,
					padding: "12px 14px"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: meta,
					children: "暂无对比数据"
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "comparison",
				"data-openloop-count": String(rows.length),
				style: {
					...panel,
					overflow: "hidden",
					padding: 0
				},
				children: [panelTitle !== void 0 || description !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: headerStyle$9,
					children: [panelTitle !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: title,
						children: panelTitle
					}) : null, description !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							...meta,
							marginTop: 3
						},
						children: description
					}) : null]
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: bodyStyle$1,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: pillRowStyle,
						role: "tablist",
						"aria-label": "聚焦对比列",
						children: columns.map((column, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							role: "tab",
							"aria-selected": focused === index,
							onClick: () => setFocus(index),
							style: focused === index ? pillActiveStyle : pillStyle,
							children: [column.title, column.recommended ? " · 推荐" : ""]
						}, column.id))
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							minWidth: 420,
							display: "grid",
							gridTemplateColumns: `minmax(110px, .8fr) repeat(${columns.length}, minmax(110px, 1fr))`,
							border: "1px solid var(--openloop-border)",
							borderRadius: "var(--openloop-radius-md)",
							overflow: "hidden"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
								padding: 10,
								background: "var(--openloop-surface-muted)"
							} }),
							columns.map((column, index) => {
								const isFocused = focused === index;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										padding: "10px 12px",
										background: isFocused ? "var(--openloop-selection)" : "var(--openloop-surface-muted)",
										borderLeft: "1px solid var(--openloop-border)"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 13,
											lineHeight: 1.4,
											fontWeight: 650,
											color: isFocused ? "var(--openloop-selection-foreground)" : "var(--openloop-foreground)"
										},
										children: column.title
									}), column.subtitle !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											...micro,
											marginTop: 2
										},
										children: column.subtitle
									}) : null]
								}, column.id);
							}),
							rows.flatMap((row, rowIndex) => [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									...cellBaseStyle,
									fontSize: 12,
									lineHeight: 1.5,
									color: "var(--openloop-muted-foreground)",
									fontWeight: row.emphasis === "strong" ? 650 : 500
								},
								children: row.label
							}, `label-${rowIndex}`), ...row.values.map((value, columnIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "data-table",
				"data-openloop-density": density,
				style: containerStyle$4,
				children: [panelTitle !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						...title,
						...headerPadding,
						paddingLeft: 12,
						paddingRight: 12,
						borderBottom: "1px solid var(--openloop-border)"
					},
					children: panelTitle
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: scrollStyle$3,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						style: tableStyle$6,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: effectiveColumns.map((column) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							scope: "col",
							"data-openloop-column": column.key,
							style: {
								...column.numeric ? headerCellNumericStyle : headerCellStyle,
								...headerPadding
							},
							children: column.label ?? column.key
						}, column.key)) }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [rows.map((row, rowIndex) => {
							const tone = row.tone === "success" || row.tone === "error" || row.tone === "warning" ? row.tone : void 0;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", {
								style: {
									borderTop: "1px solid var(--openloop-border)",
									...tone ? { background: ROW_TONE_BG[tone] } : {}
								},
								"data-openloop-row-tone": tone ?? "none",
								"data-openloop-row-index": rowIndex,
								children: effectiveColumns.map((column) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									style: {
										...column.numeric ? cellNumericStyle : cellStyle$2,
										...bodyPadding
									},
									children: cellText$1(row[column.key], column.format)
								}, column.key))
							}, String(row.id ?? rowIndex));
						}), rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
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
		const headerStyle$8 = {
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
		const placeholderStyle$6 = {
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
			const [browserState, setBrowserState] = (0, react.useState)(readBrowserState);
			const collection = browserState.collection;
			const query = browserState.query;
			const [queryInput, setQueryInput] = (0, react.useState)(query);
			const [page, setPage] = (0, react.useState)(1);
			const persistBrowserState = (next) => {
				setBrowserState(next);
				try {
					localStorage.setItem(browserKey, JSON.stringify(next));
				} catch {}
			};
			(0, react.useEffect)(() => {
				if (collection === null && collections.length > 0) persistBrowserState({
					collection: collections[0]?.name ?? null,
					query
				});
			}, [collection, collections]);
			(0, react.useEffect)(() => {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: panel,
				"data-openloop-preset": "db-browser",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: headerStyle$8,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: title,
						children: headerTitle
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: meta,
						children: totalItems > 0 ? `${totalItems.toLocaleString()} 条记录` : ""
					})]
				}), unavailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$6,
					children: [
						"本地应用后端未启用",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: meta,
							children: "安装并激活 @openloop/dsh-app 插件后可浏览数据库"
						})
					]
				}) : error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$6,
					children: ["数据读取失败：", error]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: controlsStyle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								style: selectStyle,
								value: collection ?? "",
								"aria-label": "选择集合",
								onChange: (e) => persistBrowserState({
									collection: e.target.value,
									query
								}),
								children: collections.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
									value: c.name,
									children: [
										c.name,
										"（",
										c.count,
										"）"
									]
								}, c.name))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								style: inputStyle,
								placeholder: "关键词筛选（Enter 应用）",
								"aria-label": "关键词筛选",
								value: queryInput,
								onChange: (e) => setQueryInput(e.target.value),
								onKeyDown: onSearchKeyDown
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: buttonStyle,
								onClick: () => persistBrowserState({
									collection,
									query: queryInput.trim()
								}),
								children: "查询"
							}),
							query !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
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
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: scrollStyle$2,
						children: items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: placeholderStyle$6,
							children: recordsState.loading ? "读取中…" : "无匹配记录"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
							style: tableStyle$5,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: thStyle$1,
								children: "id"
							}), columnKeys.map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: thStyle$1,
								children: key
							}, key))] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: items.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								style: {
									...tdStyle$3,
									color: "var(--openloop-muted-foreground)"
								},
								children: truncate(String(row.id ?? ""), 14)
							}), columnKeys.map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								style: tdStyle$3,
								children: cellText(row[key])
							}, key))] }, String(row.id ?? index))) })]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: footerStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: meta,
							children: [
								"第 ",
								currentPage,
								" / ",
								Math.max(1, totalPages),
								" 页"
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								display: "flex",
								gap: 6
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: buttonStyle,
								disabled: currentPage <= 1,
								onClick: () => setPage(currentPage - 1),
								children: "上一页"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "divider",
				"data-openloop-has-label": label ? "true" : "false",
				style: lineStyle,
				role: "separator",
				"aria-orientation": "horizontal",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: rule }),
					label !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: labelStyle$4,
						children: label
					}) : null,
					label !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: rule }) : null
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
		const headerStyle$7 = {
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
			if (nodes.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-openloop-preset": "flow",
				"data-openloop-count": "0",
				style: {
					...panel,
					padding: "12px 14px"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: meta,
					children: "暂无流程数据"
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "flow",
				"data-openloop-count": String(nodes.length),
				style: {
					...panel,
					overflow: "hidden",
					padding: 0
				},
				children: [panelTitle !== void 0 || description !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: headerStyle$7,
					children: [panelTitle !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: title,
						children: panelTitle
					}) : null, description !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							...meta,
							marginTop: 3
						},
						children: description
					}) : null]
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: bodyStyle,
					children: nodes.map((node, index) => {
						const tone = toneColors(node.tone ?? (index === 0 ? "info" : "neutral"));
						const incomingEdges = incoming.get(node.id) ?? [];
						const connectorText = incomingEdges.map((edge) => edge.label).filter((label) => typeof label === "string" && label.length > 0).join(" · ");
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [incomingEdges.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...connectorStyle,
								...micro
							},
							children: connectorText || "↓"
						}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								...nodeCardStyle,
								background: tone.background,
								borderColor: tone.border
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									...badgeStyle,
									background: tone.background,
									color: tone.foreground,
									border: `1px solid ${tone.border}`
								},
								"aria-hidden": "true",
								children: index + 1
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { minWidth: 0 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: nodeLabelStyle,
									children: node.label
								}), node.detail !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
		const titleStyle$3 = {
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
			if (stages.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "funnel",
				"data-openloop-count": "0",
				style: containerStyle$3,
				children: [panelTitle !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: titleStyle$3,
					children: panelTitle
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: meta,
					children: "暂无数据"
				})]
			});
			const maximum = Math.max(...stages.map((stage) => Math.max(0, stage.value)), 1);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "funnel",
				"data-openloop-count": String(stages.length),
				style: containerStyle$3,
				children: [panelTitle !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: titleStyle$3,
					children: panelTitle
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 8
					},
					children: stages.map((stage) => {
						const ratio = Math.max(0, stage.value) / maximum;
						const width = Math.max(10, ratio * 100);
						const fill = `var(--openloop-chart-seq-${seqStep$1(ratio)})`;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: rowStyle$1,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: labelStyle$3,
									children: stage.label
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: trackStyle$1,
									"aria-hidden": "true",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
										height: "100%",
										width: `${width}%`,
										borderRadius: "var(--openloop-radius-md)",
										background: fill
									} })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
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
		const titleStyle$2 = {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "gauge",
				"data-openloop-value": String(Math.round(value)),
				style: containerStyle$2,
				children: [panelTitle !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: titleStyle$2,
					children: panelTitle
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 14,
						flexWrap: "wrap"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
								cx: "66",
								cy: "66",
								r: "52",
								fill: "none",
								stroke: "var(--openloop-surface-muted)",
								strokeWidth: "12"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
								x: "66",
								y: "62",
								textAnchor: "middle",
								fontSize: "18",
								fontWeight: 650,
								fill: "var(--openloop-foreground)",
								style: { fontVariantNumeric: "tabular-nums" },
								children: displayValue
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("text", {
								x: "66",
								y: "82",
								textAnchor: "middle",
								fontSize: "10",
								fill: "var(--openloop-muted-foreground)",
								children: [Math.round(progress * 100), "%"]
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							minWidth: 0,
							flex: 1
						},
						children: [
							label !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: labelStyle$2,
								children: label
							}) : null,
							detail !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: detailStyle,
								children: detail
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tag, {
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
		const titleStyle$1 = {
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
			if (matrix.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "heatmap",
				"data-openloop-count": "0",
				style: containerStyle$1,
				children: [panelTitle !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: titleStyle$1,
					children: panelTitle
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: meta,
					children: "暂无数据"
				})]
			});
			const allValues = matrix.flat();
			const minimum = Math.min(...allValues);
			const extent = Math.max(...allValues) - minimum;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "heatmap",
				"data-openloop-count": String(allValues.length),
				style: containerStyle$1,
				children: [panelTitle !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: titleStyle$1,
					children: panelTitle
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: scrollStyle$1,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						style: tableStyle$4,
						children: [colLabels.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							style: cornerStyle,
							"aria-hidden": "true"
						}), colLabels.map((label, colIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							style: labelCellStyle,
							scope: "col",
							children: label
						}, `col:${colIndex}`))] }) }) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: matrix.map((row, rowIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [rowLabels.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							style: rowLabelStyle,
							scope: "row",
							children: rowLabels[rowIndex] ?? `R${rowIndex + 1}`
						}) : null, row.map((value, colIndex) => {
							const step = seqStep(extent > 0 ? (value - minimum) / extent : .5);
							const background = `var(--openloop-chart-seq-${step})`;
							const color = step >= 4 ? "var(--openloop-surface)" : "var(--openloop-foreground)";
							const rowLabel = rowLabels.length > 0 ? rowLabels[rowIndex] ?? "" : `R${rowIndex + 1}`;
							const colLabel = colLabels.length > 0 ? colLabels[colIndex] ?? "" : `C${colIndex + 1}`;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
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
				if (token.startsWith("**")) nodes.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: token.slice(2, -2) }, `${prefix}-b${index}`));
				else nodes.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
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
				blocks.push(listType === "ol" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
					style: {
						margin: "4px 0",
						paddingLeft: 20
					},
					children: items.map((text, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: renderInline(text, `ol${key}-${i}`) }, i))
				}, `ol${key}`) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					style: {
						margin: "4px 0",
						paddingLeft: 20
					},
					children: items.map((text, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: renderInline(text, `ul${key}-${i}`) }, i))
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
					blocks.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tag, {
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
				blocks.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
		const headerStyle$6 = {
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
		const placeholderStyle$5 = {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: panel,
				"data-openloop-preset": "mcp-status",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: headerStyle$6,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: title,
						children: headerTitle
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: meta,
						children: servers.length > 0 ? `${runningCount} / ${servers.length} 运行中` : ""
					})]
				}), state.unavailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$5,
					children: [
						"MCP 插件未启用",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: meta,
							children: "安装并激活 @openloop/dsh-mcp 后可查看服务清单"
						})
					]
				}) : state.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$5,
					children: ["服务清单读取失败：", state.error]
				}) : servers.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$5,
					children: [
						"mcp.json 中没有配置服务",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: meta,
							children: "在 DSH_HOME/mcp.json 或项目 .dsh/mcp.json 登记 MCP server"
						})
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: scrollStyle,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						style: tableStyle$3,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: thStyle,
								children: "服务"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: thStyle,
								children: "来源"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: thStyle,
								children: "端点"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: thStyle,
								children: "状态"
							})
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: servers.map((s) => {
							const stateStr = typeof s.state === "string" ? s.state : "unknown";
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									style: {
										...tdStyle$2,
										...monoStyle$2
									},
									children: truncate(String(s.id), 36)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									style: tdStyle$2,
									children: String(s.source ?? "")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
									style: {
										...tdStyle$2,
										...monoStyle$2
									},
									title: String(s.endpoint ?? ""),
									children: [truncate(String(s.endpoint ?? ""), 40), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: meta,
										children: [" · ", String(s.kind ?? "")]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
									style: tdStyle$2,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
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
			if (items.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-openloop-preset": "metric-grid",
				"data-openloop-count": "0",
				style: {
					...panel,
					padding: "14px 16px"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: meta,
					children: "暂无指标数据"
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "metric-grid",
				"data-openloop-count": String(items.length),
				children: [title !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						...meta,
						marginBottom: 8,
						fontWeight: 600
					},
					children: title
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: columns ? {
						...gridStyle,
						gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
					} : gridStyle,
					children: items.map((item, index) => {
						const isHero = index === heroAt;
						const toneColor = DELTA_COLOR[item.deltaTone];
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: isHero ? cardHeroStyle : cardStyle,
							"data-openloop-emphasis": isHero ? "hero" : "standard",
							children: [
								item.label !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: labelStyle$1,
									children: item.label
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										...isHero ? displayValue : standardValue,
										wordBreak: "break-word"
									},
									children: formatValue(item.value, item.format)
								}),
								item.delta !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										...deltaStyle,
										color: toneColor
									},
									"data-openloop-delta-tone": item.deltaTone,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
		const headerStyle$5 = {
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
		const placeholderStyle$4 = {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: panel,
				"data-openloop-preset": "pb-stats",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: headerStyle$5,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: title,
						children: headerTitle
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: meta,
						children: version !== "" ? `PocketBase ${version}` : ""
					})]
				}), state.unavailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$4,
					children: [
						"本地应用后端未启用",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: meta,
							children: "安装并激活 @openloop/dsh-app 插件后可查看运行状态"
						})
					]
				}) : state.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$4,
					children: ["后端状态读取失败：", state.error]
				}) : state.loading || state.data === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: placeholderStyle$4,
					children: "读取中…"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: metricsStyle$1,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: metricStyle$1,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: meta,
								children: "运行时长"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: metricValueStyle$1,
								children: formatDuration(typeof state.data.uptimeMs === "number" ? state.data.uptimeMs : 0)
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: metricStyle$1,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: meta,
								children: "管理表"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: metricValueStyle$1,
								children: collections.length
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: metricStyle$1,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: meta,
								children: "总记录数"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: metricValueStyle$1,
								children: totalRecords.toLocaleString()
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: metricStyle$1,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: meta,
								children: "数据占用"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: metricValueStyle$1,
								children: formatBytes(typeof state.data.dataDirBytes === "number" ? state.data.dataDirBytes : 0)
							})]
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					style: tableStyle$2,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
						style: {
							...cellStyle,
							color: "var(--openloop-muted-foreground)",
							fontWeight: 600,
							textAlign: "left"
						},
						children: "集合"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
						style: {
							...cellStyle,
							color: "var(--openloop-muted-foreground)",
							fontWeight: 600,
							textAlign: "right"
						},
						children: "记录数"
					})] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: collections.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
						style: {
							...cellStyle,
							fontFamily: "var(--openloop-font-mono, ui-monospace, \"SF Mono\", Menlo, monospace)",
							fontSize: 11.5
						},
						children: c.name
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
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
		const headerStyle$4 = {
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
		const placeholderStyle$3 = {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: panel,
				"data-openloop-preset": "plugin-registry",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: headerStyle$4,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: title,
						children: headerTitle
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: meta,
						children: entries.length > 0 ? `${entries.length} 个已加载` : ""
					})]
				}), entries.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$3,
					children: [
						"页面启动载荷不可读",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: groupLabelStyle,
						children: [
							GROUP_LABELS[group],
							"（",
							rows.length,
							"）"
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("table", {
						style: tableStyle$1,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: rows.map((e) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							style: {
								...tdStyle$1,
								...monoStyle$1
							},
							children: truncate(e.id, 52)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "progress",
				"data-openloop-value": String(Math.round(value)),
				"data-openloop-tone": tone,
				children: [label !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 8,
						marginBottom: 4
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: meta,
						children: label
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: micro,
						"data-openloop-percent": String(roundedPercent),
						children: [roundedPercent, "%"]
					})]
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					role: "progressbar",
					"aria-valuemin": 0,
					"aria-valuemax": Math.round(max),
					"aria-valuenow": Math.round(value),
					style: trackStyle,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"data-openloop-preset": "section",
				"data-openloop-bordered": bordered ? "true" : "false",
				style: bordered ? borderedShell : plainShell,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContainerHeader, { title }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
		const headerStyle$3 = {
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
		const placeholderStyle$2 = {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: panel,
				"data-openloop-preset": "sessions-stats",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: headerStyle$3,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: title,
						children: headerTitle
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: meta,
						children: byDay.length > 0 ? `近 ${byDay.length} 天` : ""
					})]
				}), state.unavailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$2,
					children: [
						"本地应用后端未启用",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: meta,
							children: "安装并激活 @openloop/dsh-app 插件后可查看会话统计"
						})
					]
				}) : state.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$2,
					children: ["会话统计读取失败：", state.error]
				}) : state.loading || state.data === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: placeholderStyle$2,
					children: "统计中…"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: metricsStyle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: metricStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: meta,
									children: "会话总数"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: metricValueStyle,
									children: (typeof state.data.totalSessions === "number" ? state.data.totalSessions : 0).toLocaleString()
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: metricStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: meta,
									children: "总占用"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: metricValueStyle,
									children: formatBytes(typeof state.data.totalBytes === "number" ? state.data.totalBytes : 0)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: metricStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: meta,
									children: "最近活跃"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										...metricValueStyle,
										fontSize: 13
									},
									children: relativeTime(typeof state.data.lastActiveAt === "string" ? state.data.lastActiveAt : null)
								})]
							})
						]
					}),
					byDay.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: chartStyle,
						role: "img",
						"aria-label": "近 14 天每日会话数",
						children: byDay.map((d) => {
							const count = Number(d.count ?? 0);
							const h = maxCount > 0 ? Math.max(4, count / maxCount * 100) : 0;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									...barStyle,
									height: `${h}%`
								},
								title: `${String(d.date)}：${count} 会话 · ${formatBytes(Number(d.bytes ?? 0))}`
							}, String(d.date));
						})
					}) : null,
					largest.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						style: tableStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							style: {
								...tdStyle,
								color: "var(--openloop-muted-foreground)",
								fontWeight: 600,
								background: "var(--openloop-surface-muted)"
							},
							children: "最大占用"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							style: {
								...tdStyle,
								color: "var(--openloop-muted-foreground)",
								fontWeight: 600,
								textAlign: "right",
								background: "var(--openloop-surface-muted)"
							},
							children: "大小"
						})] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: largest.map((l) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							style: {
								...tdStyle,
								...monoStyle
							},
							children: truncate(String(l.name ?? ""), 56)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
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
			if (values.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-openloop-preset": "sparkline",
				"data-openloop-count": "0",
				style: {
					...panel,
					padding: "12px 14px"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "sparkline",
				"data-openloop-count": String(values.length),
				style: containerStyle,
				children: [hasText ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: textBlockStyle,
					children: [label !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: meta,
						children: label
					}) : null, displayValue !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: valueStyle,
						children: String(displayValue)
					}) : null]
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
					style: {
						width: 140,
						height: 40,
						flexShrink: 0
					},
					role: "img",
					"aria-label": label ?? "sparkline",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("polyline", {
						points,
						fill: "none",
						stroke: "var(--openloop-chart-1)",
						strokeWidth: "3",
						strokeLinecap: "round",
						strokeLinejoin: "round"
					}), showExtremes ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
						x: "6",
						y: "14",
						fontSize: "9",
						fill: "var(--openloop-muted-foreground)",
						children: compactTick(max)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "split",
				"data-openloop-panes": right ? "2" : "1",
				style: {
					display: "grid",
					gridTemplateColumns: right ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
					gap: gutter
				},
				children: [left ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: pane,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetView, { widget: left })
				}) : null, right ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: pane,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetView, { widget: right })
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
		const headerStyle$2 = {
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
		const placeholderStyle$1 = {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: panel,
				"data-openloop-preset": "storage-usage",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: headerStyle$2,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: title,
						children: headerTitle
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: meta,
						title: home,
						children: totalBytes > 0 ? `${formatBytes(totalBytes)} · ${truncate(home, 48)}` : ""
					})]
				}), state.unavailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$1,
					children: [
						"本地应用后端未启用",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: meta,
							children: "安装并激活 @openloop/dsh-app 插件后可查看存储占用"
						})
					]
				}) : state.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle$1,
					children: ["存储统计读取失败：", state.error]
				}) : state.loading || state.data === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: placeholderStyle$1,
					children: "统计中…"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: rowsStyle,
					children: entries.map((e) => {
						const bytes = Number(e.bytes ?? 0);
						const pct = maxBytes > 0 ? Math.max(1.5, bytes / maxBytes * 100) : 0;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: rowStyle,
							title: String(e.path ?? ""),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: labelStyle,
									children: truncate(String(e.label ?? ""), 18)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: barTrackStyle,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
										display: "block",
										width: `${pct}%`,
										height: "100%",
										background: "var(--openloop-chart-1)",
										borderRadius: 3
									} })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
		const headerStyle$1 = {
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
			if (items.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-openloop-preset": "timeline",
				"data-openloop-count": "0",
				style: {
					...panel,
					padding: "12px 14px"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: meta,
					children: "暂无时间线数据"
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-preset": "timeline",
				"data-openloop-count": String(items.length),
				style: {
					...panel,
					overflow: "hidden",
					padding: 0
				},
				children: [panelTitle !== void 0 || description !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: headerStyle$1,
					children: [panelTitle !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: title,
						children: panelTitle
					}) : null, description !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							...meta,
							marginTop: 3
						},
						children: description
					}) : null]
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
					style: listStyle,
					children: items.map((item, index) => {
						const status = item.status ?? (index === 0 ? "current" : "future");
						const active = status === "current";
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							style: itemStyle,
							"data-openloop-status": status,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: timeStyle,
									children: item.time
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: railStyle,
									children: [index < items.length - 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: railLineStyle }) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: dotStyle(status),
										"aria-hidden": "true"
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: contentStyle,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 13,
											lineHeight: 1.4,
											fontWeight: active ? 650 : 560,
											color: "var(--openloop-foreground)",
											wordBreak: "break-word"
										},
										children: item.title
									}), item.detail !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
		/** 已注册的全部预设 kind（批 1 + 批 2 + 批 3 + 批 4，共 26 个） */
		function allPresetKinds() {
			return Object.keys(registry).sort();
		}
		//#endregion
		//#region src/packs/manifest.ts
		/** pack 资产路由前缀（§9）：绝对路径、无尾部斜杠；panels 独占，撞前缀即 register 抛错（IMPL_NOTES §1.4） */
		const PACKS_ROUTE = "/openloop/packs";
		/**
		* pack 路由虚拟入口名（§12 加载契约）：
		* client 加载器固定请求 `<packBaseUrl>/entry.js`，pack 路由（serve.ts）从注册表解析 manifest.entry 实际文件。
		* 这样 client 无需知道 manifest.entry 值，服务端可随时改入口文件路径。
		*/
		const PACK_ENTRY_VIRTUAL = "entry.js";
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
		//#region src/sandbox/shell.ts
		/**
		* 沙箱 srcDoc 合成（DSH_PANELS_DESIGN §8.1/§8.4，参照 artifact/src/shell.ts）。
		*
		* 安全约束（§15）：
		* - S5：**禁止 regex 注入**——永远用合成文档包装（消化 mcp-apps F2 教训），
		*   App 内容只进 `<body>`，真实 `<head>` 由本函数独占并带标记属性，
		*   App HTML 里的 `<!-- <head> -->` 之类伪 head 无法骗过解析器。
		* - S2：CSP 恒为 `connect-src 'none'`，widget 代码不直连网络（§5.2 数据流铁律）。
		* - S6：runtime URL 仅入 `script-src` 来源白名单，iframe 保持 opaque origin，
		*   从宿主源加载 runtime ≠ 获得宿主身份（消化 mcp-apps F1 教训）。
		*
		* 纯函数，无 DOM/node 依赖，便于测试。
		*
		* 与 runtime-entry.tsx 的分工：
		* - 高度上报（openloop:size-change）由本文件的内联 heightReporter 独占（runtime 资产
		*   加载失败也能上报）；runtime-entry 只上报 ready/error 并处理 token-sync/data（二选一）。
		* - widget 级 token 经 `window.__OPENLOOP_BRIDGE_TOKEN__` 注入文档，runtime-entry 据此校验
		*   宿主 → iframe 消息（§8.4 方向 B）；heightReporter 的内联 token 用于 iframe → 宿主 方向（S7）。
		*/
		/** §8.1 CSP：default-src 'none'；script-src 只放行本地 runtime origin + 内联产物 */
		function sandboxContentSecurityPolicy(runtimeOrigin) {
			return [
				"default-src 'none'",
				`script-src ${runtimeOrigin} 'unsafe-inline'`,
				"style-src 'unsafe-inline'",
				"connect-src 'none'",
				"img-src data:",
				"font-src 'none'"
			].join("; ");
		}
		/** iframe → 宿主 桥消息 type（§8.4） */
		const SANDBOX_SIZE_CHANGE_MESSAGE = "openloop:size-change";
		/** 基础文档样式：token 全部来自 var(--openloop-*)，注入时缺省则用 fallback */
		const BASE_CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body { background: var(--openloop-background, transparent); color: var(--openloop-foreground, inherit); font: 400 14px/1.55 var(--openloop-font-sans, system-ui, -apple-system, sans-serif); }
`;
		/** 合成文档 + CSP + token + runtime/编译产物/高度上报脚本；App 内容只进 body */
		function buildSandboxDocument(options) {
			const runtimeOrigin = new URL(options.runtimeUrl).origin;
			const variables = [...Object.entries(options.globalTokens), ...Object.entries(options.presetTokens)].filter((entry) => typeof entry[1] === "string").map(([name, value]) => ({
				name,
				value: sanitizeCssValue(value)
			})).filter((entry) => entry.value.length > 0 && isValidCssVariableName(entry.name)).map((entry) => `--openloop-${entry.name}:${entry.value};`).join("");
			const safeCompiledJs = options.compiledJs.replace(/<\/(script)/giu, "<\\/$1");
			return [
				"<!doctype html>",
				"<html>",
				`<head data-openloop-sandbox="1">${[
					"<meta charset=\"utf-8\">",
					"<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">",
					"<meta name=\"referrer\" content=\"no-referrer\">",
					`<meta http-equiv="Content-Security-Policy" content="${sandboxContentSecurityPolicy(runtimeOrigin)}">`,
					`<meta name="openloop-sandbox" content="preset=${escapeAttr(options.preset)},appearance=${options.appearance}">`,
					`<title>${escapeHtml(options.widgetId)}</title>`,
					`<style>:root{${variables}color-scheme:${options.appearance};}${BASE_CSS}</style>`,
					`<script>window.__OPENLOOP_BRIDGE_TOKEN__=${JSON.stringify(options.token)};<\/script>`
				].join("")}</head>`,
				"<body>",
				"<div id=\"openloop-root\"></div>",
				options.appHtml ?? "",
				`<script src="${escapeAttr(options.runtimeUrl)}"><\/script>`,
				`<script>${safeCompiledJs}<\/script>`,
				`<script>${heightReporter(options.token)}<\/script>`,
				"</body>",
				"</html>"
			].join("");
		}
		/** 内联高度上报（参照 artifact heightReporter 模式）：ResizeObserver + load + 首帧，带 token */
		function heightReporter(token) {
			const jsonToken = JSON.stringify(token);
			return [
				"(function(){",
				"var post=function(){parent.postMessage({type:" + JSON.stringify(SANDBOX_SIZE_CHANGE_MESSAGE) + ",token:" + jsonToken + ",height:document.documentElement.scrollHeight},'*')};",
				"if(typeof ResizeObserver!==\"undefined\"){new ResizeObserver(post).observe(document.documentElement);}",
				"addEventListener('load',post);post();",
				"})();"
			].join("");
		}
		/** token 值净化：含 ;{}<> 的整条丢弃（防 CSS 注入）；trim 后取余 */
		function sanitizeCssValue(value) {
			return /[;{}<>]/u.test(value) ? "" : value.trim();
		}
		/** CSS 变量名白名单：仅小写字母/数字/连字符（与 :root 注入同规则） */
		function isValidCssVariableName(name) {
			return /^[a-zA-Z0-9-]+$/u.test(name);
		}
		function escapeHtml(value) {
			return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
		}
		function escapeAttr(value) {
			return escapeHtml(value).replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
		}
		//#endregion
		//#region src/client/bridge.ts
		/**
		* 桥协议客户端（DSH_PANELS_DESIGN §8.4，宿主侧）。
		*
		* - `isTrustedBridgeMessage`：宿主侧 message 监听入口，校验
		*   ① `event.origin` 在可信来源内——沙箱 iframe 无 `allow-same-origin`，恒为 opaque
		*   origin，其 `event.origin` 是字符串 `"null"`（§15 S7 source 校验）；
		*   ② `data.type` 在 iframe → 宿主白名单内；
		*   ③ `data.token` 与 widget 级随机 token 一致（参照 artifact ArtifactCard token 校验模式）。
		*   任一不满足即拒绝（fail-closed）。
		* - `sendTokenSync` / `sendData`：宿主 → iframe 消息构造（§8.4）。
		*
		* 类型刻意不依赖 DOM（用结构类型），保证该文件可被纯 Node 单测直接 import。
		*/
		/** §8.4 桥消息 type 全集 */
		const BRIDGE_MESSAGE = {
			tokenSync: "openloop:token-sync",
			data: "openloop:data",
			sizeChange: "openloop:size-change",
			ready: "openloop:ready",
			error: "openloop:error"
		};
		/** iframe → 宿主 方向的可信 type 白名单 */
		const FROM_IFRAME_TYPES = [
			BRIDGE_MESSAGE.sizeChange,
			BRIDGE_MESSAGE.ready,
			BRIDGE_MESSAGE.error
		];
		/** opaque origin iframe 的 `event.origin` 恒为字符串 "null"（S7 默认可信来源） */
		const TRUSTED_BRIDGE_ORIGIN = "null";
		/** 校验桥消息可信性：来源 + type 白名单 + widget token 三关，任一不满足即拒绝（S7） */
		function isTrustedBridgeMessage(event, token, trustedOrigins = [TRUSTED_BRIDGE_ORIGIN]) {
			if (!trustedOrigins.includes(event.origin)) return false;
			if (typeof event.data !== "object" || event.data === null) return false;
			const data = event.data;
			if (typeof data.type !== "string" || !FROM_IFRAME_TYPES.includes(data.type)) return false;
			return data.token === token;
		}
		/** 发送 token-sync（§8.4）：预设/明暗切换或首帧必发；tokenSchema 恒为 2 */
		function sendTokenSync(frame, payload) {
			frame?.postMessage({
				type: BRIDGE_MESSAGE.tokenSync,
				token: payload.token,
				tokenSchema: 2,
				preset: payload.preset,
				appearance: payload.appearance,
				global: payload.global,
				tokens: payload.tokens
			}, "*");
		}
		/** 发送数据消息（§8.4）：数据刷新时宿主重新解析后重推，不重建 iframe */
		function sendData(frame, payload) {
			frame?.postMessage({
				type: BRIDGE_MESSAGE.data,
				token: payload.token,
				widgetId: payload.widgetId,
				data: payload.data,
				resolvedAt: payload.resolvedAt
			}, "*");
		}
		//#endregion
		//#region src/client/SandboxLane.tsx
		/**
		* 沙箱车道格子（DSH_PANELS_DESIGN §8，宿主侧渲染）。
		*
		* - iframe 恒 `sandbox="allow-scripts"`（**不给** `allow-same-origin` → opaque origin，§15 S1），
		*   `referrerPolicy="no-referrer"`，`srcDoc` 由 `buildSandboxDocument` 合成（§15 S5）。
		* - 高度由 `openloop:size-change` 驱动，`clamp(360, 1600)`（§8.5）。
		* - 桥消息经 `isTrustedBridgeMessage` 三关校验（§15 S7）；token 由宿主每渲染生成（tokenPayload.token）。
		* - 错误边界渲染降级占位；初始显示 loading 占位，收到 `openloop:ready` 后移除。
		*
		* 注意：custom code 的编译（sucrase）在服务端 compiler.ts 完成（index.ts 于 tool.execute
		* 包装处接入，§8.3），此处直接透传 widget.source.code（已是编译产物；源码形态由 runtime 容错）。
		* 主题/数据切换不重建 iframe：token-sync / data 经桥消息热更新（§8.5）；srcDoc 仅在
		* runtime/编译产物/token 变化时重建。
		*/
		const MIN_HEIGHT = 360;
		const MAX_HEIGHT = 1600;
		const overlay = {
			position: "absolute",
			inset: 0,
			display: "grid",
			placeItems: "center",
			fontSize: 12,
			color: "var(--openloop-muted-foreground, rgba(128,128,128,.7))",
			pointerEvents: "none"
		};
		const errorBox = {
			position: "absolute",
			inset: 0,
			display: "flex",
			alignItems: "center",
			padding: 12,
			fontSize: 12,
			lineHeight: 1.5,
			color: "var(--openloop-error, #c0392b)",
			background: "color-mix(in oklab, var(--openloop-error, #c0392b) 6%, transparent)",
			border: "1px solid var(--openloop-border, rgba(128,128,128,.35))",
			borderRadius: "var(--openloop-radius-md, 8px)"
		};
		/** 单格错误边界：沙箱渲染/文档生成崩溃时降级，不拖垮面板（§7 错误边界约束） */
		var SandboxErrorBoundary = class extends react.Component {
			state = { error: null };
			static getDerivedStateFromError(error) {
				return { error };
			}
			render() {
				if (this.state.error) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: errorBox,
					children: ["Sandbox widget failed: ", this.state.error.message]
				});
				return this.props.children;
			}
		};
		function SandboxFrame({ widget, runtimeUrl, tokenPayload, data }) {
			const [height, setHeight] = (0, react.useState)(MIN_HEIGHT);
			const [ready, setReady] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const frameRef = (0, react.useRef)(null);
			const { token } = tokenPayload;
			const initialPayload = (0, react.useRef)(tokenPayload);
			const compiledJs = (0, react.useMemo)(() => widget.source.type === "custom" ? widget.source.code : "", [widget]);
			const doc = (0, react.useMemo)(() => buildSandboxDocument({
				runtimeUrl,
				compiledJs,
				preset: initialPayload.current.preset,
				appearance: initialPayload.current.appearance,
				token,
				widgetId: widget.id,
				presetTokens: initialPayload.current.tokens,
				globalTokens: initialPayload.current.global
			}), [
				runtimeUrl,
				compiledJs,
				token,
				widget.id
			]);
			(0, react.useEffect)(() => {
				const listener = (event) => {
					if (!isTrustedBridgeMessage(event, token)) return;
					const data = event.data;
					if (data.type === BRIDGE_MESSAGE.sizeChange && typeof data.height === "number" && Number.isFinite(data.height)) setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.ceil(data.height))));
					else if (data.type === BRIDGE_MESSAGE.ready) setReady(true);
					else if (data.type === BRIDGE_MESSAGE.error && typeof data.message === "string") setError(data.message);
				};
				addEventListener("message", listener);
				return () => removeEventListener("message", listener);
			}, [token]);
			const pushTokenSync = () => sendTokenSync(frameRef.current?.contentWindow ?? null, tokenPayload);
			(0, react.useEffect)(() => {
				pushTokenSync();
			}, [tokenPayload, token]);
			(0, react.useEffect)(() => {
				sendData(frameRef.current?.contentWindow ?? null, {
					token,
					widgetId: widget.id,
					data,
					resolvedAt: (/* @__PURE__ */ new Date()).toISOString()
				});
			}, [
				data,
				token,
				widget.id
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					position: "relative",
					width: "100%",
					minHeight: MIN_HEIGHT
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
						ref: frameRef,
						title: widget.id,
						sandbox: "allow-scripts",
						referrerPolicy: "no-referrer",
						srcDoc: doc,
						onLoad: pushTokenSync,
						style: {
							display: "block",
							width: "100%",
							height,
							border: 0,
							background: "transparent"
						}
					}),
					!ready && !error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: overlay,
						children: "Sandbox widget · loading…"
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: errorBox,
						children: error
					})
				]
			});
		}
		function SandboxLane(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SandboxErrorBoundary, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SandboxFrame, { ...props }) });
		}
		//#endregion
		//#region src/client/refresh.ts
		/** 与 server src/refresh.ts 的 PANELS_REFRESH_ROUTE 一致（client 同源相对路径） */
		const PANELS_REFRESH_PATH = "/openloop/panels/refresh";
		/**
		* 判定数据快照是否为失败形态 `{ __error: string }`（§10 失败语义）。
		* 仅 hasOwnProperty + 字符串类型判定；数组/null/非对象/`__error` 非字符串一律 false
		* （datasource 约定：widget 数据含同名键但非字符串时按成功数据处理）。
		*/
		function isErrorData(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
			const record = value;
			return Object.prototype.hasOwnProperty.call(record, "__error") && typeof record.__error === "string";
		}
		/** 归一化 RefreshPolicy（§10）；hasApiData=false 时一切刷新关闭 */
		function normalizeRefreshPolicy(policy, hasApiData) {
			if (!hasApiData) return {
				onLoad: false,
				manual: false
			};
			const raw = policy?.intervalMs;
			const intervalMs = typeof raw === "number" && Number.isFinite(raw) && raw >= 1e4 ? raw : void 0;
			return {
				onLoad: policy?.onLoad ?? true,
				manual: policy?.manual ?? true,
				...intervalMs !== void 0 ? { intervalMs } : {}
			};
		}
		function errorMessage(error) {
			return error instanceof Error ? error.message : String(error);
		}
		/** 从响应载荷提取 error 字段（非字符串返回 undefined） */
		function payloadError(payload) {
			if (typeof payload !== "object" || payload === null) return void 0;
			const error = payload.error;
			return typeof error === "string" ? error : void 0;
		}
		/**
		* 调用刷新通道重新解析单个 widget 的 api 数据（§10）。
		* 成功 → { ok: true, data }；任何失败（网络/非 JSON 响应/HTTP 非 2xx/业务 ok:false）
		* → { ok: false, error }，由调用方按 §10 失败语义处理（保留旧快照 + stale / 错误占位）。
		* params（联动 v1）：关联事件映射来的参数值，server 侧替换 binding 的 {{param}} 模板。
		*/
		async function requestWidgetRefresh(widgetId, binding, fetchFn, params) {
			const doFetch = fetchFn ?? fetch;
			let response;
			try {
				response = await doFetch(PANELS_REFRESH_PATH, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						widgetId,
						data: binding,
						...params !== void 0 ? { params } : {}
					})
				});
			} catch (error) {
				return {
					ok: false,
					error: `refresh request failed: ${errorMessage(error)}`
				};
			}
			let payload;
			try {
				payload = await response.json();
			} catch {
				return {
					ok: false,
					error: `refresh route response (HTTP ${response.status}) is not valid JSON`
				};
			}
			if (!response.ok) return {
				ok: false,
				error: payloadError(payload) ?? `refresh route returned HTTP ${response.status}`
			};
			if (typeof payload === "object" && payload !== null && payload.ok === true) return {
				ok: true,
				data: payload.data
			};
			return {
				ok: false,
				error: payloadError(payload) ?? "refresh route returned an unexpected payload"
			};
		}
		//#endregion
		//#region src/client/runtime-url.gen.ts
		/** 最新 runtime 资产相对 URL（§9；build:runtime 后更新） */
		const RUNTIME_ASSET_PATH = "/openloop/runtime/runtime.react18.5d9e19a08da736df.js";
		/** 沙箱 iframe 的 runtime 资产 URL（默认宿主 origin；非宿主环境可传 baseOrigin） */
		function runtimeUrl(baseOrigin = globalThis.location?.origin ?? "") {
			return baseOrigin === "" ? RUNTIME_ASSET_PATH : `${baseOrigin}${RUNTIME_ASSET_PATH}`;
		}
		//#endregion
		//#region src/client/base-bridge.tsx
		/**
		* OpenLoop Base client 懒桥（「关 base 不炸 loader」根治，2026-08-24）：
		*
		* 背景：external 依赖的顶层 import 会被 rolldown 编译成 bundle factory 体内
		* 的立即 require——base 被禁用时 require 抛 "missed the module table"，
		* materialize 失败炸掉整个插件树（页面 "Failed to load plugins"）。
		*
		* 方案：require 移入函数体（rolldown 原样保留调用位置）+ try/catch + 缓存
		* （失败不缓存，插件启用后无需刷新即可恢复）。base 缺失时调用方渲染
		* DependencyMissing 降级条，而不是让 loader 崩溃。
		*/
		let cached;
		/** base 可用时返回其 client 模块；被禁用时返回 undefined（下次调用重试，不缓存失败） */
		function getBaseClient() {
			if (cached !== void 0) return cached;
			try {
				cached = require("@openloop/dsh-base/client");
			} catch {
				return;
			}
			return cached;
		}
		//#endregion
		//#region src/client/theme.ts
		/**
		* 面板视觉主题的轻量读取（data-openloop-preset/data-openloop-appearance 取值源 + §8.4 token 快照）。
		* 与 theme 包共享同一 localStorage 键/事件（openloop.visuals.v1 + openloop-visual-settings-change），
		* 故预设/明暗切换实时同步；token 快照（global/preset 系）直接取自 theme 包单一来源（§14）。
		*/
		const STORAGE_KEY = "openloop.visuals.v1";
		const CHANGE_EVENT = "openloop-visual-settings-change";
		const FALLBACK_PRESET = "linear";
		function systemIsDark() {
			if (typeof document === "undefined") return false;
			return document.body.hasAttribute("data-ds-dark-theme") || window.matchMedia("(prefers-color-scheme: dark)").matches;
		}
		function readStored() {
			if (typeof localStorage === "undefined") return {};
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (!raw) return {};
				const record = JSON.parse(raw);
				const appearance = record.appearance === "light" || record.appearance === "dark" || record.appearance === "system" ? record.appearance : void 0;
				return {
					preset: typeof record.preset === "string" ? record.preset : void 0,
					appearance
				};
			} catch {
				return {};
			}
		}
		function resolveTheme() {
			const stored = readStored();
			const dark = systemIsDark();
			const appearance = stored.appearance === "light" || stored.appearance === "dark" ? stored.appearance : dark ? "dark" : "light";
			const base = getBaseClient();
			if (base === void 0) return {
				preset: FALLBACK_PRESET,
				appearance,
				global: {},
				tokens: {}
			};
			const preset = base.OPENLOOP_PRESET_IDS.includes(stored.preset) ? stored.preset : FALLBACK_PRESET;
			return {
				preset,
				appearance,
				global: base.OPENLOOP_GLOBAL_TOKENS,
				tokens: base.OPENLOOP_PRESETS[preset][appearance]
			};
		}
		/** 读取当前预设/明暗，并订阅 theme 包的变更事件保持同步 */
		function usePanelVisualTheme() {
			const [theme, setTheme] = (0, react.useState)(resolveTheme);
			(0, react.useEffect)(() => {
				const update = () => setTheme(resolveTheme());
				window.addEventListener(CHANGE_EVENT, update);
				window.addEventListener("storage", update);
				return () => {
					window.removeEventListener(CHANGE_EVENT, update);
					window.removeEventListener("storage", update);
				};
			}, []);
			return theme;
		}
		//#endregion
		//#region src/client/rel-bus.ts
		/**
		* 联动事件通道（client 侧，2026-09-02 联动特性 v1）。
		*
		* 极小的 window 事件总线：panel 行点击产生带参事件（emits）→ 宿主监听按
		* relations.consumes 映射为目标面板参数（rid + params）→ 由对话流卡片 /
		* Board 悬浮窗渲染。遵循仓库既有 window 单例事实标准（__openloopDockService
		* 模式），不引入 cordis 依赖、不跨插件 import。
		*
		* 事件流：window.postMessage('openloop-rel:{event}', { payload }) —— 用
		* postMessage 而非 CustomEvent 直发，是因为沙箱 iframe（panel 的 sandbox 车道）
		* 只能经 window.parent.postMessage 与宿主通信；宿主与 iframe 两侧用同一形态。
		*/
		/** 消息前缀（联动事件通道专用） */
		const REL_EVENT_PREFIX = "openloop-rel:";
		const BUS_KEY = "__openloopRelBus";
		function createBus() {
			const listeners = /* @__PURE__ */ new Set();
			const onMessage = (ev) => {
				if (typeof ev.data !== "object" || ev.data === null) return;
				const data = ev.data;
				if (typeof data.type !== "string" || !data.type.startsWith("openloop-rel:")) return;
				const event = data.type.slice(13);
				const payload = typeof data.payload === "object" && data.payload !== null && !Array.isArray(data.payload) ? data.payload : {};
				for (const listener of listeners) listener(event, payload);
			};
			window.addEventListener("message", onMessage);
			return {
				subscribe(listener) {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				dispatch(event, payload) {
					for (const listener of listeners) listener(event, payload);
				}
			};
		}
		/** 宿主侧联动事件总线（window 单例；测试可重复创建） */
		function relBus() {
			const w = window;
			if (!w[BUS_KEY]) w[BUS_KEY] = createBus();
			return w[BUS_KEY];
		}
		/** 便捷直发（宿主侧 React 组件内，不经 postMessage 绕行） */
		function dispatchRelEvent(event, payload) {
			relBus().dispatch(event, payload);
		}
		/** iframe 侧便捷发送（panel 沙箱车道 widget → 宿主） */
		function postRelEvent(event, payload) {
			window.parent.postMessage({
				type: REL_EVENT_PREFIX + event,
				payload
			}, "*");
		}
		/** 宽松校验提取 relations（形状不对按无声明处理，不致命） */
		function parseRelations(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
			const record = value;
			const out = {};
			if (Array.isArray(record.emits)) {
				const emits = [];
				for (const item of record.emits) {
					if (typeof item !== "object" || item === null) continue;
					const decl = item;
					if (typeof decl.event !== "string" || decl.event.length === 0) continue;
					emits.push({
						event: decl.event,
						...decl.payload && typeof decl.payload === "object" && !Array.isArray(decl.payload) ? { payload: decl.payload } : {},
						...typeof decl.note === "string" ? { note: decl.note } : {}
					});
				}
				if (emits.length > 0) out.emits = emits;
			}
			if (Array.isArray(record.consumes)) {
				const consumes = [];
				for (const item of record.consumes) {
					if (typeof item !== "object" || item === null) continue;
					const decl = item;
					if (typeof decl.event !== "string" || decl.event.length === 0) continue;
					if (typeof decl.param !== "string" || decl.param.length === 0) continue;
					consumes.push({
						event: decl.event,
						param: decl.param,
						...typeof decl.note === "string" ? { note: decl.note } : {}
					});
				}
				if (consumes.length > 0) out.consumes = consumes;
			}
			return out.emits || out.consumes ? out : void 0;
		}
		/**
		* payload 模板求值（emits 侧）：`$row.x` / `$panel.x` 引用触发上下文。
		* 非模板值原样下发；路径不存在时该字段省略。
		*/
		function evalPayloadTemplate(template, row, panel) {
			if (!template) return {};
			const out = {};
			for (const [key, value] of Object.entries(template)) if (typeof value === "string" && value.startsWith("$row.")) {
				const resolved = pickPath(row, value.slice(5));
				if (resolved !== void 0) out[key] = resolved;
			} else if (typeof value === "string" && value.startsWith("$panel.")) {
				const resolved = pickPath(panel, value.slice(7));
				if (resolved !== void 0) out[key] = resolved;
			} else out[key] = value;
			return out;
		}
		function pickPath(source, path) {
			let cursor = source;
			for (const segment of path.split(".").filter(Boolean)) {
				if (typeof cursor !== "object" || cursor === null) return void 0;
				cursor = cursor[segment];
			}
			return cursor;
		}
		//#endregion
		//#region src/client/RelLinked.tsx
		/**
		* 联动详情渲染槽（M2，2026-09-02 联动特性 v1；2026-09-03 多消费方扩展）。
		*
		* PanelCard 的一部分：列表面板声明了 emits 时，卡片内渲染此槽。
		* 订阅联动事件总线 → 解析「该事件的全部消费方」（dock 注入的 consumes 索引
		* 优先；缺省回落到 emits.target 显式指向或事件名推断）→ 逐个解析目标面板
		* 定义 → 带参渲染 PanelSurface（多消费方堆叠）。
		*/
		let panelResolver;
		let consumesIndexFn;
		/** 注入注册表面板解析器（dock client 启动时调用一次） */
		function setRelPanelResolver(resolver) {
			panelResolver = resolver;
		}
		/** 注入消费方索引（dock client 启动时调用一次；惰性调用时读取最新 registry） */
		function setRelConsumesIndex(fn) {
			consumesIndexFn = fn;
		}
		function resolvePanelDefinition(rid) {
			try {
				return panelResolver?.(rid);
			} catch {
				return;
			}
		}
		/** 把注册表条目 entry 宽松解析为 PanelDefinition（形状不对返回 undefined） */
		function panelDefinitionFromEntry(entry) {
			if (typeof entry !== "object" || entry === null) return void 0;
			const record = entry;
			const panel = record.panel ?? record;
			if (typeof panel !== "object" || panel === null) return void 0;
			const def = panel;
			if (typeof def.id !== "string" || typeof def.title !== "string" || !Array.isArray(def.widgets)) return void 0;
			return def;
		}
		/**
		* 联动渲染槽：emits 声明 + 事件 → 目标面板带参渲染。
		* 行点击（PanelSurface 事件委托）→ relBus 事件 → 这里解析全部消费方并堆叠渲染。
		*/
		function RelLinkedSlot({ relations }) {
			const [targets, setTargets] = (0, react.useState)();
			const [event, setEvent] = (0, react.useState)("");
			const relationsRef = (0, react.useRef)(relations);
			relationsRef.current = relations;
			(0, react.useEffect)(() => {
				return relBus().subscribe((ev, payload) => {
					const emit = relationsRef.current.emits?.find((e) => e.event === ev);
					if (!emit) return;
					const consumers = (() => {
						try {
							return consumesIndexFn?.(ev) ?? [];
						} catch {
							return [];
						}
					})();
					const resolved = (consumers.length > 0 ? consumers.map((c) => c.rid) : emit.target?.rid !== void 0 ? [emit.target.rid] : inferTargetRid(ev) !== void 0 ? [inferTargetRid(ev)] : []).map((rid) => ({
						rid,
						panel: resolvePanelDefinition(rid)
					})).filter((t) => t.panel !== void 0);
					if (resolved.length === 0) return;
					setTargets(resolved.map((t) => ({
						rid: t.rid,
						panel: t.panel,
						params: payload
					})));
					setEvent(ev);
				});
			}, []);
			if (!targets || targets.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					padding: "10px 14px",
					fontSize: 12,
					color: "var(--openloop-muted-foreground, #888)",
					borderTop: "1px dashed var(--openloop-border)"
				},
				"data-openloop-rel-slot": "empty",
				children: "点击列表行，关联页面将在这里呈现 · click a row to open the linked page"
			});
			const first = targets[0];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					borderTop: "1px dashed var(--openloop-border)",
					paddingTop: 10,
					marginTop: 10
				},
				"data-openloop-rel-slot": "linked",
				children: [first !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 7,
						padding: "4px 10px",
						marginBottom: 8,
						fontSize: 10.5,
						color: "var(--openloop-muted-foreground, #888)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["⚡ ", event] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontFamily: "ui-monospace, monospace",
								opacity: .8
							},
							children: Object.keys(first.params).map((k) => `${k}=${String(first.params[k])}`).join(" · ")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { marginLeft: "auto" },
							children: targets.map((t) => t.rid).join(" · ")
						})
					]
				}), targets.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: targets.length > 1 ? { marginBottom: 12 } : void 0,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LinkedPanelSurface, {
						panel: t.panel,
						params: t.params
					})
				}, t.rid))]
			});
		}
		/** 带参面板渲染：api widget 的 {{param}} 经 refresh 端点带参解析（M1 通道） */
		function LinkedPanelSurface({ panel, params }) {
			const meta = (0, react.useMemo)(() => ({
				kind: "openloop.panel",
				version: 1,
				panel,
				resolved: {},
				resolvedAt: (/* @__PURE__ */ new Date()).toISOString()
			}), [panel]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PanelSurface, {
				meta,
				relParams: params
			});
		}
		/** 事件名 → 目标 rid 推断（未显式声明 target 时的兜底：{app}:{entity}:selected → 同 entity 详情） */
		function inferTargetRid(event) {
			const match = /^([a-z0-9][a-z0-9-]*):([a-z][a-z0-9-]*):selected$/.exec(event);
			if (!match) return void 0;
			return `${match[1]}:${match[2]}-detail`;
		}
		//#endregion
		//#region src/client/PanelCard.tsx
		/**
		* PanelCard：面板容器（§7 宿主车道编排）。
		* - 读 PanelMeta（§5.3），按 layout.mode（stack / grid+columns）布局 widgets
		* - 宿主车道（source.type === 'preset'）经 presets registry 渲染
		* - 外部组件包（source.type === 'pack'）经 pack 加载器动态 import 渲染（§12，S6 接入）
		* - 沙箱车道（source.type === 'custom'）经 SandboxLane（opaque-origin iframe + §8.4 桥协议）渲染
		* - 每个 widget 格独立 ErrorBoundary：单格崩溃渲染降级占位，不拖垮面板
		* - 面板根节点挂 data-openloop-preset / data-openloop-appearance（§7 与三插件一致）
		* - §10 数据失败语义与刷新编排（RefreshableWidgetCell）：
		*   `{ __error }` 失败快照 → 错误占位 + 重试按钮（宿主/沙箱车道同判定，见 client/refresh.ts）；
		*   manual（默认 true）→ 格内刷新按钮，成功更新该格数据（沙箱格经 bridge 重推，不重建 iframe），
		*   失败保留旧快照 + stale 角标；intervalMs（≥10s）→ setInterval 定时刷新，
		*   IntersectionObserver 在面板不可见时暂停；同一 widget 上一次未返回不重复发（防重入）。
		*/
		const caption = {
			color: "var(--dsw-alias-label-caption, #666)",
			fontSize: 12
		};
		/** 容错解析 presentationMeta 的 PanelMeta（§5.3）；无法解析返回 undefined（不抛错） */
		function panelMetaFrom(value) {
			if (typeof value !== "object" || value === null) return void 0;
			const record = value;
			if (record.kind !== "openloop.panel" || record.version !== 1) return void 0;
			const panel = record.panel;
			if (typeof panel !== "object" || panel === null) return void 0;
			const resolved = record.resolved;
			return {
				kind: "openloop.panel",
				version: 1,
				panel,
				resolved: typeof resolved === "object" && resolved !== null ? resolved : {},
				resolvedAt: typeof record.resolvedAt === "string" ? record.resolvedAt : ""
			};
		}
		function PinToDock({ meta, title }) {
			const dock = getDockService();
			if (!dock) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				title: "固定到 OpenLoop Dock",
				onClick: () => dock.pinPanel(meta, title),
				style: {
					position: "absolute",
					top: 6,
					right: 6,
					zIndex: 5,
					width: 24,
					height: 24,
					borderRadius: 7,
					border: "1px solid var(--openloop-border)",
					background: "var(--openloop-elevated)",
					cursor: "pointer",
					fontSize: 11,
					lineHeight: 1
				},
				children: "📌"
			});
		}
		function PanelCard({ block }) {
			if (!("kind" in block)) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: caption,
				children: "OpenLoop Panel · rendering…"
			});
			if (block.isError) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: caption,
				children: "OpenLoop Panel · failed"
			});
			const meta = panelMetaFrom(block.meta);
			if (!meta) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: caption,
				children: "OpenLoop Panel · metadata unavailable"
			});
			const relations = meta.panel.relations;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: { position: "relative" },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinToDock, {
						meta,
						title: meta.panel?.title ?? "Panel"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PanelSurface, { meta }),
					relations?.emits && relations.emits.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelLinkedSlot, { relations }) : null
				]
			});
		}
		const shellStyle = {
			width: "100%",
			boxSizing: "border-box",
			border: "1px solid var(--openloop-border)",
			borderRadius: "var(--openloop-radius-lg)",
			background: "var(--openloop-surface)",
			color: "var(--openloop-foreground)",
			overflow: "hidden",
			boxShadow: "var(--openloop-shadow-2)",
			fontFamily: "var(--openloop-font-sans, system-ui, -apple-system, sans-serif)"
		};
		const headerStyle = {
			padding: "14px 16px 10px",
			borderBottom: "1px solid var(--openloop-border)"
		};
		const titleStyle = {
			margin: 0,
			fontSize: "var(--openloop-type-title, 18px)",
			lineHeight: 1.3,
			fontWeight: 650,
			letterSpacing: "-0.02em",
			color: "var(--openloop-foreground)",
			wordBreak: "break-word"
		};
		const descStyle = {
			margin: "5px 0 0",
			fontSize: "var(--openloop-type-meta, 12px)",
			lineHeight: 1.5,
			color: "var(--openloop-muted-foreground)"
		};
		function PanelSurface({ meta, relParams }) {
			const theme = usePanelVisualTheme();
			const themeVars = (0, react.useMemo)(() => {
				const vars = {};
				for (const [key, value] of Object.entries(theme.tokens)) vars[`--openloop-${key}`] = value;
				for (const [key, value] of Object.entries(theme.global)) vars[`--openloop-${key}`] = value;
				return vars;
			}, [theme]);
			const { panel } = meta;
			const layout = panel.layout ?? { mode: "stack" };
			const columns = layout.columns ?? 2;
			const isGrid = layout.mode === "grid";
			const [resolved, setResolved] = (0, react.useState)(meta.resolved);
			const updateWidgetData = (0, react.useCallback)((widgetId, data) => {
				setResolved((prev) => ({
					...prev,
					[widgetId]: data
				}));
			}, []);
			const emits = panel.relations?.emits;
			const onRowClick = (0, react.useCallback)((event) => {
				if (!emits || emits.length === 0) return;
				const rowEl = event.target.closest("tr[data-openloop-row-index]");
				if (!rowEl) return;
				const index = Number(rowEl.dataset["openloopRowIndex"]);
				const rowsFromData = Object.values(resolved).find((v) => Array.isArray(v));
				const rowsFromProps = panel.widgets.map((w) => w.source.type === "preset" ? w.source.props?.rows : void 0).find((v) => Array.isArray(v));
				const rowsSource = rowsFromData ?? rowsFromProps;
				const row = Array.isArray(rowsSource) ? rowsSource[index] : void 0;
				if (row === void 0 || typeof row !== "object") return;
				for (const decl of emits) {
					const payload = evalPayloadTemplate(decl.payload, row, { resolved });
					dispatchRelEvent(decl.event, payload);
				}
			}, [
				emits,
				resolved,
				panel.widgets
			]);
			const containerStyle = isGrid ? {
				display: "grid",
				gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
				gap: 12,
				padding: 12,
				alignItems: "start"
			} : {
				display: "flex",
				flexDirection: "column",
				gap: 12,
				padding: 12
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"data-openloop-panel": panel.id,
				"data-openloop-preset": theme.preset,
				"data-openloop-appearance": theme.appearance,
				style: {
					...shellStyle,
					...themeVars
				},
				onClick: emits && emits.length > 0 ? onRowClick : void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					style: headerStyle,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						style: titleStyle,
						children: panel.title
					}), panel.description !== void 0 && panel.description.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: descStyle,
						children: panel.description
					}) : null]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: containerStyle,
					"data-openloop-layout": layout.mode,
					children: panel.widgets.map((widget) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetErrorBoundary, {
						widget,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefreshableWidgetCell, {
							widget,
							theme,
							data: resolved[widget.id],
							onData: updateWidgetData,
							relParams
						})
					}, widget.id))
				})]
			});
		}
		/** 降级占位格（组件不可用 / 渲染崩溃 / 沙箱待集成共用视觉） */
		const placeholderStyle = {
			padding: "12px 14px",
			border: "1px dashed var(--openloop-border)",
			borderRadius: "var(--openloop-radius-md)",
			background: "var(--openloop-surface-subtle)",
			fontSize: 12,
			lineHeight: 1.5,
			color: "var(--openloop-muted-foreground)",
			minWidth: 0
		};
		function CellPlaceholder({ kind, message }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: placeholderStyle,
				"data-openloop-widget": "unavailable",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: { fontWeight: 600 },
					children: ["组件不可用", kind !== void 0 ? ` · ${kind}` : ""]
				}), message !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: { marginTop: 2 },
					children: message
				}) : null]
			});
		}
		/** §8.4：widget 级随机 token（每 widget 每生命周期生成；主题/数据切换不换 token，iframe 不重建） */
		function makeBridgeToken() {
			if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
			return `t-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
		}
		/** 沙箱车道：custom code 经编译产物在 opaque-origin iframe 内渲染（§8） */
		function SandboxCell({ widget, theme, data }) {
			const token = (0, react.useMemo)(() => makeBridgeToken(), []);
			const tokenPayload = (0, react.useMemo)(() => ({
				token,
				preset: theme.preset,
				appearance: theme.appearance,
				global: theme.global,
				tokens: theme.tokens
			}), [token, theme]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SandboxLane, {
				widget,
				runtimeUrl: runtimeUrl(),
				tokenPayload,
				data
			});
		}
		function PackCell({ widget, data }) {
			const source = widget.source;
			const props = asRecord(source.props) ?? {};
			const propsKey = JSON.stringify(source.props);
			const [state, setState] = (0, react.useState)({ status: "loading" });
			(0, react.useEffect)(() => {
				let cancelled = false;
				setState({ status: "loading" });
				loadPackComponent(source.pack, source.component, props).then((Component) => {
					if (!cancelled) setState({
						status: "ready",
						Component
					});
				}).catch((error) => {
					if (!cancelled) setState({
						status: "error",
						message: error instanceof Error ? error.message : String(error)
					});
				});
				return () => {
					cancelled = true;
				};
			}, [
				source.pack,
				source.component,
				propsKey
			]);
			if (state.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: placeholderStyle,
				"data-openloop-widget": "pack-loading",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: { fontWeight: 600 },
					children: ["加载外部组件 · ", source.component]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: { marginTop: 2 },
					children: [
						"从 pack \"",
						source.pack,
						"\" 动态加载中…"
					]
				})]
			});
			if (state.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CellPlaceholder, {
				kind: source.component,
				message: state.message
			});
			const Component = state.Component;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Component, {
				props,
				data
			});
		}
		/** §10 错误占位：error 色系 token + 错误首行 + 重试按钮（manual=true 时） */
		const dataErrorStyle = {
			padding: "12px 14px",
			border: "1px solid var(--openloop-error-border, rgba(192,57,43,.4))",
			borderRadius: "var(--openloop-radius-md)",
			background: "var(--openloop-error-background, rgba(192,57,43,.08))",
			color: "var(--openloop-error, #c0392b)",
			fontSize: 12,
			lineHeight: 1.5,
			minWidth: 0
		};
		const retryButtonStyle = {
			marginTop: 8,
			padding: "3px 10px",
			fontSize: 12,
			lineHeight: 1.5,
			color: "var(--openloop-error, #c0392b)",
			background: "transparent",
			border: "1px solid var(--openloop-error-border, rgba(192,57,43,.4))",
			borderRadius: "var(--openloop-radius-sm, 6px)",
			cursor: "pointer"
		};
		/** 格角控件容器（刷新按钮 + stale 角标），绝对定位于格子右上角 */
		const cornerControlsStyle = {
			position: "absolute",
			top: 4,
			right: 4,
			display: "flex",
			gap: 6,
			alignItems: "center"
		};
		const refreshButtonStyle = {
			padding: "1px 7px",
			fontSize: 11,
			lineHeight: 1.5,
			color: "var(--openloop-muted-foreground)",
			background: "var(--openloop-surface)",
			border: "1px solid var(--openloop-border)",
			borderRadius: "var(--openloop-radius-sm, 6px)",
			cursor: "pointer"
		};
		/** §10 stale 角标：warning 色系小圆点（刷新失败但保留旧快照时） */
		const staleDotStyle = {
			width: 8,
			height: 8,
			borderRadius: "50%",
			background: "var(--openloop-warning, #d48806)",
			border: "1px solid var(--openloop-warning-border, transparent)"
		};
		function DataErrorPlaceholder({ widgetId, error, busy, onRetry }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: dataErrorStyle,
				"data-openloop-widget": "data-error",
				"data-widget-id": widgetId,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { fontWeight: 600 },
						children: "数据加载失败"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { marginTop: 2 },
						children: error.split("\n")[0] ?? error
					}),
					onRetry !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						style: retryButtonStyle,
						disabled: busy,
						onClick: onRetry,
						children: busy ? "重试中…" : "重试"
					}) : null
				]
			});
		}
		/**
		* §10 刷新编排格（PanelCard 唯一消费方）：对有 api 数据源的 widget 应用 RefreshPolicy。
		* - manual（默认 true）：格角渲染刷新按钮；成功 → onData 更新该格数据（宿主格重渲染；
		*   沙箱格经 bridge sendData 重推，不重建 iframe）；失败 → 有旧快照则保留 + stale 角标，
		*   无旧数据则写入 `{ __error }` 走错误占位。
		* - intervalMs（≥10s）：setInterval 定时刷新；IntersectionObserver 在格不可见时暂停定时器。
		* - onLoad（默认 true）：面板打开时重新拉取一次。
		* - 防重入：同一 widget 上一次请求未返回不重复发。
		*/
		function RefreshableWidgetCell({ widget, theme, data, onData, relParams }) {
			const binding = widget.data;
			const hasApiData = binding?.source.type === "api";
			const policy = normalizeRefreshPolicy(widget.refresh, hasApiData);
			const [stale, setStale] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			const inFlightRef = (0, react.useRef)(false);
			const cellRef = (0, react.useRef)(null);
			const dataRef = (0, react.useRef)(data);
			dataRef.current = data;
			const relParamsKey = JSON.stringify(relParams ?? null);
			const awaitingParams = binding?.params !== void 0 && Object.keys(binding.params).length > 0 && (relParams === void 0 || Object.keys(relParams).length === 0);
			const refresh = (0, react.useCallback)(async () => {
				if (binding?.source.type !== "api" || inFlightRef.current) return;
				if (binding.params !== void 0 && Object.keys(binding.params).length > 0 && (relParams === void 0 || Object.keys(relParams).length === 0)) return;
				inFlightRef.current = true;
				setBusy(true);
				try {
					const outcome = await requestWidgetRefresh(widget.id, binding, void 0, relParams);
					if (outcome.ok) {
						onData(widget.id, outcome.data);
						setStale(false);
					} else {
						const current = dataRef.current;
						if (current !== void 0 && !isErrorData(current)) setStale(true);
						else onData(widget.id, { __error: outcome.error });
					}
				} finally {
					inFlightRef.current = false;
					setBusy(false);
				}
			}, [
				binding,
				widget.id,
				onData,
				relParams
			]);
			(0, react.useEffect)(() => {
				if (policy.onLoad) refresh();
			}, [
				policy.onLoad,
				refresh,
				relParamsKey
			]);
			const intervalMs = policy.intervalMs;
			(0, react.useEffect)(() => {
				if (intervalMs === void 0) return;
				const node = cellRef.current;
				let timer;
				const start = () => {
					if (timer === void 0) timer = setInterval(() => void refresh(), intervalMs);
				};
				const stop = () => {
					if (timer !== void 0) {
						clearInterval(timer);
						timer = void 0;
					}
				};
				if (node === null || typeof IntersectionObserver === "undefined") {
					start();
					return stop;
				}
				const observer = new IntersectionObserver((entries) => {
					for (const entry of entries) if (entry.isIntersecting) start();
					else stop();
				});
				observer.observe(node);
				return () => {
					observer.disconnect();
					stop();
				};
			}, [intervalMs, refresh]);
			const errorData = isErrorData(data);
			const showManual = policy.manual && !errorData;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: cellRef,
				style: {
					position: "relative",
					minWidth: 0
				},
				"data-openloop-cell": widget.id,
				children: [errorData ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DataErrorPlaceholder, {
					widgetId: widget.id,
					error: data.__error,
					busy,
					onRetry: policy.manual ? () => void refresh() : void 0
				}) : awaitingParams ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: placeholderStyle,
					"data-openloop-widget": "awaiting-params",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { fontWeight: 600 },
						children: "⏳ 等待联动参数 · awaiting linkage"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { marginTop: 2 },
						children: "此页数据需要从关联列表点选后带参获取——到来源页面点一行，这里会显示对应数据。"
					})]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetCell, {
					widget,
					theme,
					data
				}), stale || showManual ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: cornerControlsStyle,
					children: [stale && !errorData ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: staleDotStyle,
						title: "数据已过期（stale）：上次刷新失败，展示的是上一份成功快照"
					}) : null, showManual ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						style: refreshButtonStyle,
						title: "刷新数据",
						"aria-label": "刷新数据",
						disabled: busy,
						onClick: () => void refresh(),
						children: busy ? "…" : "↻"
					}) : null]
				}) : null]
			});
		}
		/** 单格渲染：preset → registry；pack → 动态加载；custom → 沙箱格 */
		function WidgetCell({ widget, theme, data }) {
			const source = widget.source;
			if (source.type === "custom" || widget.lane === "sandbox") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SandboxCell, {
				widget,
				theme,
				data
			});
			if (source.type === "pack") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PackCell, {
				widget,
				data
			});
			const sourceRecord = source;
			if (sourceRecord.type !== "preset") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CellPlaceholder, {
				kind: sourceRecord.type,
				message: "无法识别的 widget source"
			});
			const preset = getPreset(source.kind);
			if (!preset) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CellPlaceholder, {
				kind: source.kind,
				message: "该预设组件尚未实现（后续批次交付）"
			});
			const props = asRecord(source.props) ?? {};
			const dataRecord = asRecord(data);
			const effectiveProps = dataRecord ? {
				...props,
				...dataRecord
			} : Array.isArray(data) ? {
				...props,
				rows: data
			} : props;
			const result = preset.validate(effectiveProps);
			if (!result.ok) {
				const first = result.errors[0];
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CellPlaceholder, {
					kind: source.kind,
					message: first !== void 0 ? first.message : "props 校验失败"
				});
			}
			const Render = preset.Render;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Render, { props: effectiveProps });
		}
		/** 单格 ErrorBoundary：子组件渲染崩溃 → 降级占位，不拖垮整面板 */
		var WidgetErrorBoundary = class extends react.Component {
			state = { error: null };
			static getDerivedStateFromError(error) {
				return { error };
			}
			render() {
				if (this.state.error !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CellPlaceholder, {
					kind: this.props.widget.id,
					message: `渲染崩溃：${this.state.error.message.split("\n")[0] ?? "未知错误"}`
				});
				return this.props.children;
			}
		};
		//#endregion
		//#region src/datasource.ts
		/**
		* 联动参数模板替换（2026-09-02 联动特性 v1）：
		* 把 binding.params 声明的 `{{paramName}}` 模板变量替换为运行时参数值。
		* 替换范围：url / query 值 / body 序列化后的字符串 / pick 不动。
		* - 参数已提供 → 替换为 encodeURIComponent 后的值（URL 上下文安全）
		* - 声明了但未提供 → 替换为空串（面板可先渲染空态）
		* - 值含特殊字符按 URL 语境转义；body 为 JSON 序列化后整体替换（保持结构合法）
		*/
		function applyBindingParams(binding, values) {
			const declared = binding.params;
			if (!declared || Object.keys(declared).length === 0) return binding;
			const resolve = (template) => {
				return template.replace(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g, (_m, name) => {
					const value = values[name];
					if (value === void 0 || value === null) return "";
					return encodeURIComponent(String(value));
				});
			};
			const source = binding.source;
			if (source.type !== "api") return binding;
			return {
				...binding,
				source: {
					...source,
					url: resolve(source.url),
					...source.query ? { query: Object.fromEntries(Object.entries(source.query).map(([k, v]) => [k, resolve(v)])) } : {},
					...source.body !== void 0 ? { body: JSON.parse(resolve(JSON.stringify(source.body))) } : {}
				}
			};
		}
		//#endregion
		//#region src/client/index.tsx
		const name = "openloop-dsh-panels";
		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "panel"
			}, PanelCard));
		}
		//#endregion
		exports.LinkedPanelSurface = LinkedPanelSurface;
		exports.PanelCard = PanelCard;
		exports.PanelSurface = PanelSurface;
		exports.REL_EVENT_PREFIX = REL_EVENT_PREFIX;
		exports.RelLinkedSlot = RelLinkedSlot;
		exports.allPresetKinds = allPresetKinds;
		exports.apply = apply;
		exports.applyBindingParams = applyBindingParams;
		exports.dispatchRelEvent = dispatchRelEvent;
		exports.evalPayloadTemplate = evalPayloadTemplate;
		exports.getDockService = getDockService;
		exports.inject = inject;
		exports.name = name;
		exports.panelDefinitionFromEntry = panelDefinitionFromEntry;
		exports.panelMetaFrom = panelMetaFrom;
		exports.parseRelations = parseRelations;
		exports.postRelEvent = postRelEvent;
		exports.relBus = relBus;
		exports.setRelConsumesIndex = setRelConsumesIndex;
		exports.setRelPanelResolver = setRelPanelResolver;
		return module.exports;
	}
});
