window.__ModuleLoader__.load({
	id: "@openloop/dsh-visual-declarative",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
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
		/** base 缺失时的统一降级 UI（说明依赖关系，指引用户启用） */
		function DependencyMissing({ what, dep = "@openloop/dsh-base" }) {
			return (0, react.createElement)("div", { style: {
				padding: "14px 16px",
				fontSize: 12,
				lineHeight: 1.6,
				opacity: .75,
				border: "1px dashed rgba(127,127,127,.4)",
				borderRadius: 10,
				display: "flex",
				gap: 8,
				alignItems: "center",
				flexWrap: "wrap"
			} }, (0, react.createElement)("strong", { style: { fontSize: 12 } }, what), (0, react.createElement)("span", null, `依赖插件 ${dep} 未启用——在设置 · 插件页启用后自动恢复`));
		}
		//#endregion
		//#region src/document.ts
		const TONES = [
			"neutral",
			"info",
			"success",
			"warning",
			"danger"
		];
		const headerProperties = {
			title: {
				type: "string",
				required: true,
				description: "Short user-facing title."
			},
			description: {
				type: "string",
				description: "One concise sentence explaining what to inspect."
			}
		};
		({ ...headerProperties }), [...TONES], { ...headerProperties }, { ...headerProperties };
		function validateDocument(document) {
			nonEmpty(document.title, "title");
			if (document.title.length > 120) throw new Error("visualize_ui title must be at most 120 characters");
			if (document.description !== void 0 && document.description.length > 360) throw new Error("visualize_ui description must be at most 360 characters");
			if (document.kind === "flow") validateFlow(document);
			if (document.kind === "timeline") validateTimeline(document);
			if (document.kind === "comparison") validateComparison(document);
		}
		function validateFlow(document) {
			if (document.nodes.length < 2 || document.nodes.length > 12) throw new Error("flow requires 2–12 nodes");
			if (document.edges.length < 1 || document.edges.length > 20) throw new Error("flow requires 1–20 edges");
			const ids = uniqueIds(document.nodes.map((node) => node.id), "flow node");
			for (const node of document.nodes) {
				nonEmpty(node.label, `flow node ${node.id} label`);
				if (node.label.length > 80) throw new Error(`flow node ${node.id} label is too long`);
			}
			for (const edge of document.edges) {
				if (!ids.has(edge.from) || !ids.has(edge.to)) throw new Error(`flow edge ${edge.from} → ${edge.to} references an unknown node`);
				if (edge.from === edge.to) throw new Error(`flow edge ${edge.from} cannot point to itself`);
			}
		}
		function validateTimeline(document) {
			if (document.items.length < 2 || document.items.length > 16) throw new Error("timeline requires 2–16 items");
			uniqueIds(document.items.map((item) => item.id), "timeline item");
			for (const item of document.items) nonEmpty(item.title, `timeline item ${item.id} title`);
		}
		function validateComparison(document) {
			if (document.columns.length < 2 || document.columns.length > 4) throw new Error("comparison requires 2–4 columns");
			if (document.rows.length < 1 || document.rows.length > 12) throw new Error("comparison requires 1–12 rows");
			uniqueIds(document.columns.map((column) => column.id), "comparison column");
			if (document.columns.filter((column) => column.recommended === true).length > 1) throw new Error("comparison allows at most one recommended column");
			for (const row of document.rows) {
				nonEmpty(row.label, "comparison row label");
				if (row.values.length !== document.columns.length) throw new Error(`comparison row "${row.label}" has ${row.values.length} values for ${document.columns.length} columns`);
			}
		}
		function uniqueIds(ids, label) {
			const seen = /* @__PURE__ */ new Set();
			for (const id of ids) {
				nonEmpty(id, `${label} id`);
				if (seen.has(id)) throw new Error(`${label} id "${id}" is duplicated`);
				seen.add(id);
			}
			return seen;
		}
		function nonEmpty(value, label) {
			if (value.trim().length === 0) throw new Error(`${label} must not be empty`);
		}
		function declarativeMetaFrom(value) {
			if (typeof value !== "object" || value === null) return void 0;
			const record = value;
			if (record.kind !== "openloop.declarative" || record.version !== 1) return void 0;
			if (record.mode !== "inline" && record.mode !== "wide") return void 0;
			const document = record.document;
			if (typeof document !== "object" || document === null) return void 0;
			const kind = document.kind;
			if (kind !== "flow" && kind !== "timeline" && kind !== "comparison") return void 0;
			try {
				validateDocument(document);
			} catch {
				return;
			}
			return {
				kind: "openloop.declarative",
				version: 1,
				mode: record.mode,
				document
			};
		}
		//#endregion
		//#region src/client/DeclarativeCard.tsx
		const palette = {
			neutral: {
				soft: "var(--openloop-surface-muted)",
				strong: "var(--openloop-muted-foreground)"
			},
			info: {
				soft: "var(--openloop-info-background)",
				strong: "var(--openloop-info)"
			},
			success: {
				soft: "var(--openloop-success-background)",
				strong: "var(--openloop-success)"
			},
			warning: {
				soft: "var(--openloop-warning-background)",
				strong: "var(--openloop-warning)"
			},
			danger: {
				soft: "var(--openloop-error-background)",
				strong: "var(--openloop-error)"
			}
		};
		const shell = {
			width: "100%",
			border: "1px solid var(--openloop-border)",
			borderRadius: "var(--openloop-radius-lg)",
			background: "var(--openloop-surface)",
			color: "var(--openloop-foreground)",
			overflow: "hidden",
			boxShadow: "var(--openloop-shadow-2)"
		};
		const header = {
			padding: "18px 20px 14px",
			borderBottom: "1px solid var(--openloop-border)"
		};
		const titleStyle = {
			margin: 0,
			fontSize: 18,
			lineHeight: 1.3,
			letterSpacing: "-0.02em",
			fontWeight: 650
		};
		const descriptionStyle = {
			margin: "5px 0 0",
			color: "var(--openloop-muted-foreground)",
			fontSize: 13,
			lineHeight: 1.55
		};
		function Frame({ document, scope }) {
			const theme = getBaseClient().useOpenLoopVisualTheme(scope);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					...shell,
					...theme.style
				},
				"data-openloop-visual": document.kind,
				"data-openloop-preset": theme.settings.preset,
				"data-openloop-appearance": theme.appearance,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						style: header,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							style: titleStyle,
							children: document.title
						}), document.description && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: descriptionStyle,
							children: document.description
						})]
					}),
					document.kind === "flow" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FlowView, { document }),
					document.kind === "timeline" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelineView, { document }),
					document.kind === "comparison" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ComparisonView, { document })
				]
			});
		}
		function FlowView({ document }) {
			const incoming = new Map(document.nodes.map((node) => [node.id, document.edges.filter((edge) => edge.to === node.id)]));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					padding: 20,
					display: "grid",
					gap: 10
				},
				children: document.nodes.map((node, index) => {
					const tone = palette[node.tone ?? (index === 0 ? "info" : "neutral")];
					const edges = incoming.get(node.id) ?? [];
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [edges.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							minHeight: 26,
							marginLeft: 22,
							borderLeft: "1px solid var(--openloop-border)",
							paddingLeft: 17,
							color: "var(--openloop-muted-foreground)",
							fontSize: 11,
							display: "flex",
							alignItems: "center"
						},
						children: edges.map((edge) => edge.label).filter(Boolean).join(" · ") || "↓"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "32px minmax(0, 1fr)",
							gap: 12,
							alignItems: "start",
							border: "1px solid var(--openloop-border)",
							borderRadius: "var(--openloop-radius-md)",
							padding: "13px 14px",
							background: tone.soft
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								width: 30,
								height: 30,
								borderRadius: 999,
								display: "grid",
								placeItems: "center",
								background: tone.strong,
								color: "white",
								fontSize: 12,
								fontWeight: 700
							},
							children: index + 1
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontWeight: 620,
								lineHeight: 1.35
							},
							children: node.label
						}), node.detail && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								marginTop: 4,
								color: "var(--openloop-muted-foreground)",
								fontSize: 12,
								lineHeight: 1.5
							},
							children: node.detail
						})] })]
					})] }, node.id);
				})
			});
		}
		function TimelineView({ document }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
				style: {
					listStyle: "none",
					margin: 0,
					padding: "20px 20px 22px"
				},
				children: document.items.map((item, index) => {
					const status = item.status ?? (index === 0 ? "current" : "future");
					const active = status === "current";
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
						style: {
							display: "grid",
							gridTemplateColumns: "82px 20px minmax(0,1fr)",
							columnGap: 12,
							minHeight: 72
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									textAlign: "right",
									paddingTop: 2,
									color: "var(--openloop-muted-foreground)",
									fontSize: 11
								},
								children: item.time
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									position: "relative",
									display: "flex",
									justifyContent: "center"
								},
								children: [index < document.items.length - 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
									position: "absolute",
									top: 16,
									bottom: -2,
									width: 1,
									background: "var(--openloop-border)"
								} }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
									position: "relative",
									width: active ? 14 : 10,
									height: active ? 14 : 10,
									marginTop: active ? 1 : 3,
									borderRadius: 999,
									background: active ? "var(--openloop-primary)" : status === "past" ? "var(--openloop-success)" : "var(--openloop-border)",
									boxShadow: active ? "0 0 0 5px var(--openloop-selection)" : void 0
								} })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { paddingBottom: 20 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: { fontWeight: active ? 650 : 560 },
									children: item.title
								}), item.detail && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										color: "var(--openloop-muted-foreground)",
										fontSize: 12,
										lineHeight: 1.5,
										marginTop: 4
									},
									children: item.detail
								})]
							})
						]
					}, item.id);
				})
			});
		}
		function ComparisonView({ document }) {
			const recommended = document.columns.findIndex((column) => column.recommended === true);
			const [focus, setFocus] = (0, react.useState)(recommended >= 0 ? recommended : 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					padding: 20,
					overflowX: "auto"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						display: "flex",
						flexWrap: "wrap",
						gap: 8,
						marginBottom: 14
					},
					children: document.columns.map((column, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
						active: focus === index,
						onClick: () => setFocus(index),
						children: [column.title, column.recommended ? " · 推荐" : ""]
					}, column.id))
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						minWidth: 460,
						display: "grid",
						gridTemplateColumns: `minmax(120px, .8fr) repeat(${document.columns.length}, minmax(120px, 1fr))`,
						border: "1px solid var(--openloop-border)",
						borderRadius: "var(--openloop-radius-md)",
						overflow: "hidden"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
							padding: 12,
							background: "var(--openloop-surface-muted)"
						} }),
						document.columns.map((column, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								padding: "12px 14px",
								background: focus === index ? "var(--openloop-selection)" : "var(--openloop-surface-muted)",
								color: focus === index ? "var(--openloop-selection-foreground)" : void 0,
								borderLeft: "1px solid var(--openloop-border)"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: { fontWeight: 650 },
								children: column.title
							}), column.subtitle && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 11,
									color: focus === index ? "var(--openloop-selection-foreground)" : "var(--openloop-muted-foreground)",
									opacity: focus === index ? .7 : 1,
									marginTop: 3
								},
								children: column.subtitle
							})]
						}, column.id)),
						document.rows.flatMap((row, rowIndex) => [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								padding: "11px 12px",
								borderTop: "1px solid var(--openloop-border)",
								fontSize: 12,
								color: "var(--openloop-muted-foreground)",
								fontWeight: row.emphasis === "strong" ? 650 : 500
							},
							children: row.label
						}, `label-${rowIndex}`), ...row.values.map((value, columnIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								padding: "11px 14px",
								borderTop: "1px solid var(--openloop-border)",
								borderLeft: "1px solid var(--openloop-border)",
								background: focus === columnIndex ? "var(--openloop-selection)" : void 0,
								color: focus === columnIndex ? "var(--openloop-selection-foreground)" : void 0,
								fontWeight: row.emphasis === "strong" ? 650 : 450,
								fontSize: 13
							},
							children: value
						}, `${rowIndex}-${columnIndex}`))])
					]
				})]
			});
		}
		function firstLine(block) {
			return block.content.find((part) => part.type === "text" && part.text)?.text?.split("\n")[0] ?? "Visualization unavailable";
		}
		function DeclarativeCard(props) {
			if (props.scope === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DependencyMissing, { what: "OpenLoop Declarative" });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DeclarativeCardInner, {
				...props,
				scope: props.scope
			});
		}
		function DeclarativeCardInner({ block, scope }) {
			if (!("kind" in block)) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: descriptionStyle,
				children: "OpenLoop Visual · rendering…"
			});
			if (block.isError) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: descriptionStyle,
				children: firstLine(block)
			});
			const meta = declarativeMetaFrom(block.meta);
			if (!meta) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: descriptionStyle,
				children: firstLine(block)
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Frame, {
				document: meta.document,
				scope
			});
		}
		//#endregion
		//#region src/client/index.tsx
		const name = "openloop-visual-declarative";
		const inject = ["slots"];
		function apply(ctx) {
			const scope = getBaseClient()?.createOpenLoopSettingsScope();
			const ThemedDeclarativeCard = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DeclarativeCard, {
				...props,
				scope
			});
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "visualize_ui"
			}, ThemedDeclarativeCard));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
