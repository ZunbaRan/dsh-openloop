window.__ModuleLoader__.load({
	id: "@openloop/dsh-qoder-canvas",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/markdown.tsx
		function renderInline(text, keyPrefix) {
			const out = [];
			const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
			let last = 0;
			let m;
			let i = 0;
			while ((m = re.exec(text)) !== null) {
				if (m.index > last) out.push(text.slice(last, m.index));
				const token = m[0];
				if (token.startsWith("**")) out.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: token.slice(2, -2) }, `${keyPrefix}-b${i}`));
				else out.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
					style: {
						fontFamily: "ui-monospace, Menlo, monospace",
						fontSize: "0.9em",
						background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))",
						padding: "1px 4px",
						borderRadius: 4
					},
					children: token.slice(1, -1)
				}, `${keyPrefix}-c${i}`));
				last = m.index + token.length;
				i += 1;
			}
			if (last < text.length) out.push(text.slice(last));
			return out;
		}
		function renderMarkdownLines(text) {
			const lines = text.split("\n");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: lines.map((line, i) => {
				if (line.trim() === "") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: { height: 8 } }, i);
				if (line.startsWith("### ")) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 12,
						fontWeight: 650,
						marginTop: 8
					},
					children: renderInline(line.slice(4), `l${i}`)
				}, i);
				if (line.startsWith("## ")) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 13,
						fontWeight: 650,
						marginTop: 10
					},
					children: renderInline(line.slice(3), `l${i}`)
				}, i);
				if (line.startsWith("# ")) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 14,
						fontWeight: 700,
						marginTop: 12
					},
					children: renderInline(line.slice(2), `l${i}`)
				}, i);
				if (line.startsWith("- ") || line.startsWith("* ")) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						gap: 6
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: { color: "var(--dsw-alias-label-caption, #888)" },
						children: "•"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: renderInline(line.slice(2), `l${i}`) })]
				}, i);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: renderInline(line, `l${i}`) }, i);
			}) });
		}
		//#endregion
		//#region src/client/CanvasSurface.tsx
		const surface = {
			width: "100%",
			boxSizing: "border-box",
			border: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
			borderRadius: 14,
			background: "var(--dsw-alias-bg-layer-1, #fff)",
			overflow: "hidden",
			fontFamily: "inherit"
		};
		const headerStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			padding: "12px 16px 10px",
			borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))"
		};
		const TONE_COLOR = {
			default: "var(--dsw-alias-label-primary, inherit)",
			success: "var(--dsw-alias-state-success-primary, #22c55e)",
			warn: "var(--dsw-alias-state-warn-primary, #f59e0b)",
			error: "var(--dsw-alias-state-error-primary, #d4453a)",
			info: "var(--dsw-alias-state-business-primary, #4176e6)"
		};
		function layoutStyle(layout, nodeCount) {
			if (layout === "flow") return {
				display: "flex",
				flexWrap: "wrap",
				gap: 12,
				padding: 12,
				alignItems: "stretch"
			};
			if (layout === "split-h") return {
				display: "grid",
				gridTemplateColumns: `repeat(${Math.min(nodeCount, 2)}, minmax(0, 1fr))`,
				gap: 12,
				padding: 12
			};
			if (layout === "split-v") return {
				display: "flex",
				flexDirection: "column",
				gap: 12,
				padding: 12
			};
			return {
				display: "grid",
				gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
				gap: 12,
				padding: 12,
				alignItems: "stretch"
			};
		}
		function nodeBase() {
			return {
				border: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
				borderRadius: 10,
				background: "var(--dsw-alias-bg-layer-2, #f6f6f7)",
				padding: 12,
				minWidth: 0,
				overflow: "hidden"
			};
		}
		function StatCardNode({ props }) {
			const tone = typeof props.tone === "string" ? props.tone : "default";
			const delta = typeof props.delta === "number" ? props.delta : null;
			const deltaLabel = typeof props.deltaLabel === "string" ? props.deltaLabel : "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: nodeBase(),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 11,
							color: "var(--dsw-alias-label-caption, #888)"
						},
						children: String(props.label ?? "")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 22,
							fontWeight: 700,
							marginTop: 6,
							fontVariantNumeric: "tabular-nums",
							color: TONE_COLOR[tone] ?? TONE_COLOR["default"]
						},
						children: String(props.value ?? "")
					}),
					delta !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							fontSize: 11,
							marginTop: 4,
							color: delta >= 0 ? "var(--dsw-alias-state-success-primary, #22c55e)" : "var(--dsw-alias-state-error-primary, #d4453a)"
						},
						children: [
							delta >= 0 ? "▲" : "▼",
							" ",
							Math.abs(delta),
							deltaLabel ? ` ${deltaLabel}` : ""
						]
					}) : null
				]
			});
		}
		function ChartNode({ props }) {
			const series = Array.isArray(props.series) ? props.series : [];
			const kind = typeof props.chart === "string" ? props.chart : "line";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...nodeBase(),
					display: "flex",
					flexDirection: "column",
					gap: 8
				},
				children: [
					typeof props.title === "string" && props.title.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 12,
							fontWeight: 600
						},
						children: props.title
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InlineChart, {
						kind,
						series
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							gap: 12,
							flexWrap: "wrap",
							fontSize: 10,
							color: "var(--dsw-alias-label-caption, #888)"
						},
						children: series.map((s, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								display: "inline-flex",
								alignItems: "center",
								gap: 4
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
								width: 8,
								height: 8,
								borderRadius: 2,
								background: SERIES_COLORS[i % SERIES_COLORS.length]
							} }), String(s.name ?? `S${i + 1}`)]
						}, i))
					})
				]
			});
		}
		const SERIES_COLORS = [
			"#4176e6",
			"#22c55e",
			"#f59e0b",
			"#d4453a",
			"#b06ad9",
			"#14b8a6",
			"#f97316",
			"#64748b"
		];
		/** 内联 SVG 图表（line/area/bar/pie；数据已在 dsl 层限流） */
		function InlineChart({ kind, series }) {
			const W = 320, H = 160, PAD = 8;
			if (kind === "pie") {
				const values = (series[0]?.points ?? []).map((p) => typeof p?.y === "number" ? p.y : 0).filter((v) => v > 0);
				const total = values.reduce((a, b) => a + b, 0);
				if (total <= 0 || values.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 11,
						color: "var(--dsw-alias-label-caption, #888)",
						padding: 16
					},
					children: "无数据"
				});
				let acc = 0;
				const R = 60, CX = W / 2, CY = H / 2;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
					viewBox: `0 0 ${W} ${H}`,
					style: {
						width: "100%",
						height: "auto"
					},
					"aria-hidden": "true",
					children: values.map((v, i) => {
						const start = acc / total * Math.PI * 2 - Math.PI / 2;
						acc += v;
						const end = acc / total * Math.PI * 2 - Math.PI / 2;
						const large = end - start > Math.PI ? 1 : 0;
						const x1 = CX + R * Math.cos(start), y1 = CY + R * Math.sin(start);
						const x2 = CX + R * Math.cos(end), y2 = CY + R * Math.sin(end);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`,
							fill: SERIES_COLORS[i % SERIES_COLORS.length],
							stroke: "var(--dsw-alias-bg-layer-2, #f6f6f7)",
							strokeWidth: "1.5"
						}, i);
					})
				});
			}
			const allPoints = [];
			for (const s of series) {
				const points = s?.points;
				if (Array.isArray(points)) for (const p of points) {
					const pp = p;
					if (typeof pp.y === "number") allPoints.push({
						x: pp.x,
						y: pp.y
					});
				}
			}
			if (allPoints.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					fontSize: 11,
					color: "var(--dsw-alias-label-caption, #888)",
					padding: 16
				},
				children: "无数据"
			});
			const ys = allPoints.map((p) => p.y);
			const minY = Math.min(...ys);
			const yRange = Math.max(...ys) - minY || 1;
			const n = Math.max(...series.map((s) => (s?.points ?? []).length), 1);
			const xAt = (i) => PAD + i / Math.max(n - 1, 1) * 304;
			const yAt = (y) => 152 - (y - minY) / yRange * 144;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				viewBox: `0 0 ${W} ${H}`,
				style: {
					width: "100%",
					height: "auto"
				},
				"aria-hidden": "true",
				children: [[
					0,
					.5,
					1
				].map((f) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
					x1: PAD,
					x2: 312,
					y1: PAD + f * 144,
					y2: PAD + f * 144,
					stroke: "var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
					strokeWidth: "1"
				}, f)), kind === "bar" ? series.map((s, si) => {
					const points = s?.points ?? [];
					const bw = Math.min(18, 304 / Math.max(points.length * (series.length + .5), 1));
					return points.map((p, i) => typeof p.y === "number" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: xAt(i) + si * bw - series.length * bw / 2,
						y: yAt(p.y),
						width: Math.max(bw - 1, 2),
						height: 152 - yAt(p.y),
						fill: SERIES_COLORS[si % SERIES_COLORS.length],
						rx: "1.5"
					}, `${si}-${i}`) : null);
				}) : series.map((s, si) => {
					const points = (s?.points ?? []).filter((p) => typeof p.y === "number");
					if (points.length === 0) return null;
					const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(p.y)}`).join(" ");
					const color = SERIES_COLORS[si % SERIES_COLORS.length];
					return kind === "area" && si === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: `${d} L ${xAt(points.length - 1)} 152 L ${xAt(0)} 152 Z`,
						fill: color,
						opacity: "0.12"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d,
						fill: "none",
						stroke: color,
						strokeWidth: "2",
						strokeLinejoin: "round"
					})] }, si) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d,
						fill: "none",
						stroke: color,
						strokeWidth: "2",
						strokeLinejoin: "round"
					}, si);
				})]
			});
		}
		function TableNode({ props }) {
			const columns = Array.isArray(props.columns) ? props.columns.map(String) : [];
			const rows = Array.isArray(props.rows) ? props.rows : [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...nodeBase(),
					padding: 0,
					overflow: "auto"
				},
				children: [typeof props.title === "string" && props.title.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 12,
						fontWeight: 600,
						padding: "10px 12px 0"
					},
					children: props.title
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					style: {
						width: "100%",
						borderCollapse: "collapse",
						fontSize: 11.5
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: columns.map((c, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
						style: {
							textAlign: "left",
							padding: "7px 12px",
							color: "var(--dsw-alias-label-caption, #888)",
							fontSize: 10,
							fontWeight: 600,
							borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
							whiteSpace: "nowrap"
						},
						children: c
					}, i)) }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: rows.map((row, ri) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: (Array.isArray(row) ? row : []).map((cell, ci) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
						style: {
							padding: "6px 12px",
							borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
							whiteSpace: "nowrap",
							maxWidth: 220,
							overflow: "hidden",
							textOverflow: "ellipsis"
						},
						children: cell === null || cell === void 0 ? "" : String(cell)
					}, ci)) }, ri)) })]
				})]
			});
		}
		function KeyValueNode({ props }) {
			const pairs = props.pairs ?? {};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...nodeBase(),
					display: "flex",
					flexDirection: "column",
					gap: 6
				},
				children: [typeof props.title === "string" && props.title.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 12,
						fontWeight: 600
					},
					children: props.title
				}) : null, Object.entries(pairs).map(([k, v]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						justifyContent: "space-between",
						gap: 12,
						fontSize: 11.5
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: { color: "var(--dsw-alias-label-caption, #888)" },
						children: k
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontWeight: 500,
							textAlign: "right",
							wordBreak: "break-all"
						},
						children: String(v)
					})]
				}, k))]
			});
		}
		function MarkdownNode({ props }) {
			const text = typeof props.text === "string" ? props.text : "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					...nodeBase(),
					fontSize: 12,
					lineHeight: 1.65
				},
				children: renderMarkdownLines(text)
			});
		}
		function CalloutNode({ props }) {
			const tone = typeof props.tone === "string" ? props.tone : "info";
			const color = TONE_COLOR[tone] ?? TONE_COLOR["info"];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...nodeBase(),
					borderLeft: `3px solid ${color}`,
					background: "var(--dsw-alias-bg-layer-2, #f6f6f7)"
				},
				children: [typeof props.title === "string" && props.title.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 12,
						fontWeight: 600,
						color
					},
					children: props.title
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 11.5,
						lineHeight: 1.6,
						marginTop: props.title ? 4 : 0
					},
					children: String(props.text ?? "")
				})]
			});
		}
		function SectionNode({ node, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					gridColumn: "1 / -1",
					border: "1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
					borderRadius: 10,
					padding: 12
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 11,
						fontWeight: 600,
						color: "var(--dsw-alias-label-caption, #888)",
						marginBottom: 8,
						letterSpacing: ".05em"
					},
					children: String(node.props.title ?? "")
				}), children]
			});
		}
		function ActionNode({ props, onClick }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				onClick,
				title: "点击把此动作的意图与上下文注入输入框草稿",
				style: {
					...nodeBase(),
					cursor: "pointer",
					textAlign: "center",
					fontSize: 12,
					fontWeight: 600,
					color: "var(--dsw-alias-state-business-primary, #4176e6)",
					background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 8%, transparent)",
					borderColor: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 30%, transparent)"
				},
				children: String(props.label ?? "Action")
			});
		}
		function LinkNode({ props }) {
			const href = typeof props.href === "string" ? props.href : "#";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
				href,
				target: "_blank",
				rel: "noreferrer noopener",
				style: {
					...nodeBase(),
					display: "block",
					textAlign: "center",
					fontSize: 12,
					fontWeight: 600,
					color: "var(--dsw-alias-state-business-primary, #4176e6)",
					textDecoration: "none"
				},
				children: [String(props.label ?? href), " ↗"]
			});
		}
		function NodeRenderer({ node, onAction }) {
			const props = node.props;
			switch (node.type) {
				case "stat-card": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCardNode, { props });
				case "chart": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChartNode, { props });
				case "table": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TableNode, { props });
				case "key-value": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KeyValueNode, { props });
				case "markdown": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownNode, { props });
				case "callout": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CalloutNode, { props });
				case "action": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionNode, {
					props,
					onClick: () => onAction?.(node)
				});
				case "link": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LinkNode, { props });
				case "section": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionNode, {
					node,
					children: null
				});
				case "panel": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: nodeBase() });
				default: return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: nodeBase(),
					children: ["未知节点 ", node.type]
				});
			}
		}
		function CanvasSurface({ snapshot, onAction }) {
			const { canvas } = snapshot;
			const sectionNodes = canvas.nodes.filter((n) => n.type === "section");
			const plainNodes = canvas.nodes.filter((n) => n.type !== "section");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: surface,
				"data-openloop-canvas": snapshot.canvasId,
				"data-revision": snapshot.revision,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						style: headerStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 13,
								fontWeight: 650,
								flex: 1,
								minWidth: 0,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap"
							},
							children: canvas.title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								fontSize: 10,
								fontFamily: "ui-monospace, Menlo, monospace",
								color: "var(--dsw-alias-label-caption, #888)"
							},
							children: [
								snapshot.canvasId,
								"@r",
								snapshot.revision
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: layoutStyle(canvas.layout, canvas.nodes.length),
						children: plainNodes.map((n) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-canvas-node": n.id,
							style: {
								display: "flex",
								flexDirection: "column",
								minWidth: 0
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NodeRenderer, {
								node: n,
								onAction
							})
						}, n.id))
					}),
					sectionNodes.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							padding: "0 12px 12px",
							display: "flex",
							flexDirection: "column",
							gap: 12
						},
						children: sectionNodes.map((n) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-canvas-node": n.id,
							style: {
								display: "flex",
								flexDirection: "column",
								minWidth: 0
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionNode, {
								node: n,
								children: null
							})
						}, n.id))
					}) : null
				]
			});
		}
		//#endregion
		//#region src/client/composer-bridge.ts
		/** 定位 composer 元素（data-* 语义选择器，0.1.2 实证存在） */
		function findComposer() {
			return document.querySelector("[data-composer-input=\"true\"]");
		}
		/** 向 composer 追加草稿文本。返回是否成功。 */
		function injectComposerDraft(text, _options) {
			const el = findComposer();
			if (el === null) return false;
			el.focus();
			let ok = false;
			try {
				ok = document.execCommand("insertText", false, text);
			} catch {
				ok = false;
			}
			if (!ok) try {
				el.dispatchEvent(new InputEvent("beforeinput", {
					bubbles: true,
					cancelable: true,
					inputType: "insertText",
					data: text
				}));
				ok = true;
			} catch {
				ok = false;
			}
			return ok;
		}
		/** 审计上报（尽力而为：fire-and-forget，失败静默——注入不依赖端点，设计文档 §3.4） */
		function reportAnnotation(payload) {
			try {
				fetch("/qoder-canvas/annotate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload)
				}).catch(() => void 0);
			} catch {}
		}
		//#endregion
		//#region src/client/AnnotationOverlay.tsx
		/**
		* AnnotationOverlay：画布标注层（M2，设计文档 §3.3）。
		*
		* 交互：标注模式开关（卡片头按钮）→ 元素 hover 高亮 + 点选 / 矩形拖圈
		* （node rect 与选框相交判定）→ 评注输入弹层（快捷短语）→ 编排注入 composer。
		*
		* 实现要点：
		* - 每个 node 渲染时自带 data-canvas-node="<id>"（CanvasSurface 已加），
		*   overlay 用它做命中判定，无需独立坐标系
		* - 矩形圈选：overlay 蒙层上拖拽画框，松手时取所有与框相交的 node rect
		* - 编排：node id → title 翻译（meta 内嵌快照在手），紧凑草稿格式见 §3.3
		*/
		const ACCENT = "var(--dsw-alias-state-business-primary, #4176e6)";
		const QUICK_PHRASES = [
			"太小了",
			"信息过时",
			"这里错了",
			"删掉这块"
		];
		/** node id → 人类可读描述（类型 + 标题/首行文本） */
		function nodeLabelOf(node) {
			const p = node.props;
			return typeof p.title === "string" && p.title.length > 0 ? p.title : typeof p.label === "string" && p.label.length > 0 ? p.label : typeof p.text === "string" && p.text.length > 0 ? p.text.length > 24 ? `${p.text.slice(0, 24)}…` : p.text : node.type;
		}
		/** 编排为紧凑草稿文本（§3.3 格式） */
		function formatAnnotationDraft(snapshot, draft) {
			const targetText = draft.targets.map((t) => `${t.id} ${t.label}`).join(", ");
			return `[画布标注 · ${snapshot.canvas.title} ${snapshot.canvasId}@r${snapshot.revision} · 选中 ${draft.targets.length} 个节点: ${targetText}]\n${draft.note}`;
		}
		function AnnotationOverlay({ snapshot, containerRef }) {
			const [active, setActive] = (0, react.useState)(false);
			const [selected, setSelected] = (0, react.useState)([]);
			const [note, setNote] = (0, react.useState)("");
			const [dragRect, setDragRect] = (0, react.useState)(null);
			const [toast, setToast] = (0, react.useState)(null);
			const dragStart = (0, react.useRef)(null);
			const surfaceRef = containerRef;
			const nodeById = new Map(snapshot.canvas.nodes.map((n) => [n.id, n]));
			const showToast = (msg) => {
				setToast(msg);
				setTimeout(() => {
					setToast((cur) => cur === msg ? null : cur);
				}, 2e3);
			};
			/** 矩形圈选：与选框相交的 node 全选 */
			const finishDrag = (rect) => {
				const surface = surfaceRef.current;
				if (surface === null || Math.abs(rect.w) < 8 && Math.abs(rect.h) < 8) return;
				const hits = [];
				for (const el of surface.querySelectorAll("[data-canvas-node]")) {
					const r = el.getBoundingClientRect();
					const box = surface.getBoundingClientRect();
					const nx = r.left - box.left, ny = r.top - box.top;
					if (nx < rect.x + rect.w && nx + r.width > rect.x && ny < rect.y + rect.h && ny + r.height > rect.y) hits.push(el.getAttribute("data-canvas-node") ?? "");
				}
				setSelected((prev) => [.../* @__PURE__ */ new Set([...prev, ...hits.filter(Boolean)])]);
			};
			const submit = () => {
				if (selected.length === 0 || note.trim().length === 0) return;
				const targets = selected.map((id) => nodeById.get(id)).filter((n) => n !== void 0).map((n) => ({
					id: n.id,
					label: nodeLabelOf(n)
				}));
				const text = formatAnnotationDraft(snapshot, {
					targets,
					note: note.trim()
				});
				if (injectComposerDraft(text)) {
					showToast(`已注入输入框草稿（${targets.length} 个节点）——可编辑后发送`);
					setActive(false);
					setSelected([]);
					setNote("");
				} else {
					showToast("注入失败——复制到剪贴板");
					try {
						navigator.clipboard?.writeText(text);
					} catch {}
				}
				reportAnnotation({
					canvasId: snapshot.canvasId,
					revision: snapshot.revision,
					targets: selected,
					note: note.trim()
				});
			};
			if (!active) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => setActive(true),
				title: "标注画布：圈选元素写评注，注入输入框草稿",
				style: {
					position: "absolute",
					top: 6,
					right: 8,
					zIndex: 40,
					display: "inline-flex",
					alignItems: "center",
					gap: 5,
					fontSize: 10.5,
					padding: "2px 9px",
					borderRadius: 6,
					cursor: "pointer",
					color: "var(--dsw-alias-label-secondary, inherit)",
					background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))",
					border: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
					fontFamily: "inherit",
					whiteSpace: "nowrap"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					width: "11",
					height: "11",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "2",
					strokeLinecap: "round",
					"aria-hidden": "true",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 20h9" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" })]
				}), "标注"]
			});
			const overlayStyle = {
				position: "absolute",
				inset: 0,
				zIndex: 30,
				background: "rgba(0,0,0,.04)",
				cursor: "crosshair",
				pointerEvents: "auto",
				userSelect: "none"
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: overlayStyle,
					onPointerDown: (e) => {
						if (e.button !== 0) return;
						const box = surfaceRef.current?.getBoundingClientRect();
						if (box === void 0) return;
						dragStart.current = {
							x: e.clientX - box.left,
							y: e.clientY - box.top
						};
						setDragRect({
							x: e.clientX - box.left,
							y: e.clientY - box.top,
							w: 0,
							h: 0
						});
					},
					onPointerMove: (e) => {
						const start = dragStart.current;
						const box = surfaceRef.current?.getBoundingClientRect();
						if (start === null || box === void 0) return;
						setDragRect({
							x: start.x,
							y: start.y,
							w: e.clientX - box.left - start.x,
							h: e.clientY - box.top - start.y
						});
					},
					onPointerUp: () => {
						if (dragRect !== null) finishDrag(normalizeRect(dragRect));
						dragStart.current = null;
						setDragRect(null);
					},
					onClick: (e) => {
						let best = null;
						for (const el of surfaceRef.current?.querySelectorAll("[data-canvas-node]") ?? []) {
							const r = el.getBoundingClientRect();
							if (!(e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom)) continue;
							const area = r.width * r.height;
							if (best === null || area < best.area) {
								const id = el.getAttribute("data-canvas-node");
								if (id !== null && id.length > 0) best = {
									id,
									area
								};
							}
						}
						if (best !== null) {
							const id = best.id;
							setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
						}
					},
					children: [dragRect !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
						...normalizeRect(dragRect),
						position: "absolute",
						border: `1.5px dashed ${ACCENT}`,
						background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent)",
						borderRadius: 4,
						pointerEvents: "none"
					} }) : null, selected.map((id) => {
						const el = surfaceRef.current?.querySelector(`[data-canvas-node="${CSS.escape(id)}"]`);
						if (el === null || el === void 0) return null;
						const box = surfaceRef.current?.getBoundingClientRect();
						if (box === void 0) return null;
						const r = el.getBoundingClientRect();
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
							position: "absolute",
							left: r.left - box.left - 3,
							top: r.top - box.top - 3,
							width: r.width + 6,
							height: r.height + 6,
							border: `2px solid ${ACCENT}`,
							borderRadius: 8,
							pointerEvents: "none",
							boxShadow: "0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 18%, transparent)"
						} }, id);
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						position: "absolute",
						top: 6,
						right: 8,
						zIndex: 40,
						display: "flex",
						alignItems: "center",
						gap: 6,
						padding: "5px 8px",
						borderRadius: 8,
						background: "var(--dsw-alias-bg-layer-1, #fff)",
						border: `1px solid ${ACCENT}`,
						boxShadow: "0 4px 16px rgba(0,0,0,.14)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 10,
								color: ACCENT,
								fontWeight: 600
							},
							children: "标注模式"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 10,
								color: "var(--dsw-alias-label-caption, #888)"
							},
							children: selected.length > 0 ? `已选 ${selected.length} 个` : "点选或框选节点"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setActive(false);
								setSelected([]);
							},
							style: {
								fontSize: 10,
								padding: "2px 8px",
								borderRadius: 5,
								border: 0,
								cursor: "pointer",
								background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))",
								fontFamily: "inherit"
							},
							children: "取消"
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: overlayStyle,
					children: [dragRect !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
						...normalizeRect(dragRect),
						position: "absolute",
						border: `1.5px dashed ${ACCENT}`,
						background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent)",
						borderRadius: 4,
						pointerEvents: "none"
					} }) : null, selected.map((id) => {
						const el = surfaceRef.current?.querySelector(`[data-canvas-node="${CSS.escape(id)}"]`);
						if (el === null || el === void 0) return null;
						const box = surfaceRef.current?.getBoundingClientRect();
						if (box === void 0) return null;
						const r = el.getBoundingClientRect();
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
							position: "absolute",
							left: r.left - box.left - 3,
							top: r.top - box.top - 3,
							width: r.width + 6,
							height: r.height + 6,
							border: `2px solid ${ACCENT}`,
							borderRadius: 8,
							pointerEvents: "none",
							boxShadow: "0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 18%, transparent)"
						} }, id);
					})]
				}),
				selected.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						position: "absolute",
						bottom: 10,
						left: 10,
						right: 10,
						zIndex: 50,
						display: "flex",
						flexDirection: "column",
						gap: 7,
						padding: "10px 12px",
						borderRadius: 10,
						background: "var(--dsw-alias-bg-layer-1, #fff)",
						border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
						boxShadow: "0 8px 28px rgba(0,0,0,.18)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								flexWrap: "wrap",
								gap: 5
							},
							children: selected.map((id) => {
								const n = nodeById.get(id);
								return n === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										display: "inline-flex",
										alignItems: "center",
										gap: 4,
										fontSize: 10,
										padding: "1.5px 7px",
										borderRadius: 5,
										background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)",
										color: ACCENT
									},
									children: [nodeLabelOf(n), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setSelected((prev) => prev.filter((x) => x !== id)),
										style: {
											border: 0,
											background: "none",
											cursor: "pointer",
											padding: 0,
											color: "inherit",
											fontSize: 11,
											lineHeight: 1
										},
										children: "×"
									})]
								}, id);
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								gap: 5,
								flexWrap: "wrap"
							},
							children: QUICK_PHRASES.map((phrase) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setNote((cur) => cur.length > 0 ? `${cur}；${phrase}` : phrase),
								style: {
									fontSize: 10,
									padding: "2px 8px",
									borderRadius: 5,
									border: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
									background: "none",
									cursor: "pointer",
									color: "var(--dsw-alias-label-secondary, inherit)",
									fontFamily: "inherit"
								},
								children: phrase
							}, phrase))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							value: note,
							onChange: (e) => setNote(e.target.value),
							placeholder: "写下修改建议…（将注入输入框为草稿，可编辑后发送）",
							rows: 2,
							style: {
								fontSize: 11.5,
								padding: "6px 8px",
								borderRadius: 7,
								border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
								background: "var(--dsw-alias-bg-layer-2, #f6f6f7)",
								color: "inherit",
								resize: "vertical",
								fontFamily: "inherit"
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 6,
								justifyContent: "flex-end"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setSelected([]),
								style: {
									fontSize: 10.5,
									padding: "3px 10px",
									borderRadius: 6,
									border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
									background: "none",
									cursor: "pointer",
									fontFamily: "inherit"
								},
								children: "清除选择"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: submit,
								disabled: note.trim().length === 0,
								style: {
									fontSize: 10.5,
									padding: "3px 12px",
									borderRadius: 6,
									border: 0,
									cursor: note.trim().length > 0 ? "pointer" : "not-allowed",
									fontFamily: "inherit",
									color: "#fff",
									background: note.trim().length > 0 ? ACCENT : "var(--dsw-alias-interactive-bg-active, rgba(127,127,127,.2))"
								},
								children: "注入草稿"
							})]
						})
					]
				}) : null,
				toast !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						position: "absolute",
						top: 44,
						left: "50%",
						transform: "translateX(-50%)",
						zIndex: 60,
						fontSize: 10.5,
						padding: "5px 12px",
						borderRadius: 7,
						background: "var(--dsw-alias-bg-layer-1, #fff)",
						border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
						boxShadow: "0 4px 14px rgba(0,0,0,.14)",
						whiteSpace: "nowrap"
					},
					children: toast
				}) : null
			] });
		}
		function normalizeRect(r) {
			return {
				x: Math.min(r.x, r.x + r.w),
				y: Math.min(r.y, r.y + r.h),
				w: Math.abs(r.w),
				h: Math.abs(r.h)
			};
		}
		//#endregion
		//#region src/client/CanvasCard.tsx
		const captionStyle = {
			color: "var(--dsw-alias-label-caption, #888)",
			fontSize: 12
		};
		/** 容错解析 presentationMeta 的快照（§5.3 惯例：无法解析返回 undefined 不抛错）。
		*  ⚠️ 0.1.1 真机修复：presentationMeta 返回的就是扁平 snapshot 本体（无 .snapshot
		*  包装层）——原实现多剥了一层导致永远解析失败、卡片渲染成 "metadata unavailable"。 */
		function canvasMetaFrom(value) {
			if (typeof value !== "object" || value === null) return void 0;
			const s = value;
			if (s.kind !== "qoder-canvas" || s.version !== 1) return void 0;
			if (typeof s.canvasId !== "string" || typeof s.revision !== "number") return void 0;
			const canvas = s.canvas;
			if (typeof canvas !== "object" || canvas === null) return void 0;
			const c = canvas;
			if (typeof c.title !== "string" || !Array.isArray(c.nodes)) return void 0;
			return value;
		}
		function CanvasCard({ block }) {
			if (!("kind" in block)) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: captionStyle,
				children: "Canvas · rendering…"
			});
			if (block.isError) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: captionStyle,
				children: "Canvas · failed"
			});
			const meta = canvasMetaFrom(block.meta);
			if (!meta) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: captionStyle,
				children: "Canvas · metadata unavailable"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasCardInner, { snapshot: meta });
		}
		/** 有状态内层（hooks 不能在早退之后——block 校验先走完） */
		function CanvasCardInner({ snapshot }) {
			const surfaceRef = (0, react.useRef)(null);
			const [toast, setToast] = (0, react.useState)(null);
			const showToast = (msg) => {
				setToast(msg);
				setTimeout(() => {
					setToast((cur) => cur === msg ? null : cur);
				}, 2400);
			};
			/** action 节点回传（AnnotationOverlay 之外的第三入口）：intent+context 编排注入 */
			const onAction = (node) => {
				const intent = typeof node.props.intent === "string" ? node.props.intent : "";
				const label = typeof node.props.label === "string" ? node.props.label : "action";
				const context = node.props.context;
				const ctxText = typeof context === "object" && context !== null ? Object.entries(context).map(([k, v]) => `${k}=${String(v)}`).slice(0, 6).join(", ") : "";
				const text = formatAnnotationDraft(snapshot, {
					targets: [{
						id: node.id,
						label
					}],
					note: `执行动作：${intent}${ctxText.length > 0 ? `（${ctxText}）` : ""}`
				});
				const ok = injectComposerDraft(text);
				showToast(ok ? `「${label}」已注入输入框草稿——可编辑后发送` : `「${label}」注入失败，已复制到剪贴板`);
				if (!ok) try {
					navigator.clipboard?.writeText(text);
				} catch {}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: { position: "relative" },
				ref: surfaceRef,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasSurface, {
						snapshot,
						onAction
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnnotationOverlay, {
						snapshot,
						containerRef: surfaceRef
					}),
					toast !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							position: "absolute",
							top: -30,
							left: "50%",
							transform: "translateX(-50%)",
							zIndex: 70,
							fontSize: 10.5,
							padding: "5px 12px",
							borderRadius: 7,
							background: "var(--dsw-alias-bg-layer-1, #fff)",
							border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
							boxShadow: "0 4px 14px rgba(0,0,0,.14)",
							whiteSpace: "nowrap"
						},
						children: toast
					}) : null
				]
			});
		}
		//#endregion
		//#region src/client/index.tsx
		const name = "openloop-qoder-canvas";
		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "canvas"
			}, CanvasCard));
		}
		//#endregion
		exports.CanvasCard = CanvasCard;
		exports.apply = apply;
		exports.canvasMetaFrom = canvasMetaFrom;
		exports.inject = inject;
		exports.injectComposerDraft = injectComposerDraft;
		exports.name = name;
		return module.exports;
	}
});
