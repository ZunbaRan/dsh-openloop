window.__ModuleLoader__.load({
	id: "@openloop/dsh-qoder-canvas",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_dom_client = require("react-dom/client");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
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
		//#region src/client/CanvasCard.tsx
		const captionStyle = {
			color: "var(--dsw-alias-label-caption, #888)",
			fontSize: 12
		};
		/** 容错解析 presentationMeta 的快照（§5.3 惯例：无法解析返回 undefined 不抛错）。
		*  presentationMeta 返回扁平 snapshot 本体（无包装层）。 */
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
		/** 入口卡片（只读预览 + 工作台入口；零标注交互） */
		function CanvasCardInner({ snapshot }) {
			(0, react.useEffect)(() => {
				window.__openloopCanvasUpdate?.(snapshot.canvasId, snapshot);
			}, [snapshot]);
			/** action 节点在对话流的语义：点击 = 打开工作台执行（不在对话流注入） */
			const onAction = () => {
				window.__openloopCanvasOpen?.(snapshot.canvasId, snapshot);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: { position: "relative" },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => window.__openloopCanvasOpen?.(snapshot.canvasId, snapshot),
					title: "在画布工作台打开（右侧推出栏：标注/迭代）",
					style: {
						position: "absolute",
						top: 6,
						right: 8,
						zIndex: 20,
						display: "inline-flex",
						alignItems: "center",
						gap: 4,
						fontSize: 10.5,
						padding: "3px 10px",
						borderRadius: 6,
						cursor: "pointer",
						color: "#fff",
						background: "var(--dsw-alias-state-business-primary, #4176e6)",
						border: "none",
						fontFamily: "inherit",
						fontWeight: 600,
						whiteSpace: "nowrap",
						boxShadow: "0 2px 8px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 35%, transparent)"
					},
					children: "⇱ 工作台"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasSurface, {
					snapshot,
					onAction
				})]
			});
		}
		//#endregion
		//#region src/client/CanvasDockHost.tsx
		/**
		* CanvasDockHost：canvas dock 的推出面板（复刻 dock DockHost 已验证机制）。
		*
		* 与 board 的关系（QODER_CANVAS_SIDEBAR §2）：
		* - canvas dock 是与 board 平级的独立第二推出面板（内容 | canvas dock | board | bsb）
		* - 右缘定位：right = bsbWidth + boardWidth（读 --dsh-sidebar-width +
		*   --openloop-dock-width 两个变量，500ms 探测）
		* - 挤压：设 --openloop-canvas-width 变量；margin 总管规则在 dock 的 DockHost
		*   （calc(dock + canvas)，缺省 0 向后兼容）——本组件【不写】挤压规则
		* - 推出动画/左缘拖宽/bsb 同款嵌入式（无阴影无描边）——全部复刻 DockHost
		*/
		const CANVAS_WIDTH_VAR = "--openloop-canvas-width";
		const BSB_WIDTH_VAR = "--dsh-sidebar-width";
		const BOARD_WIDTH_VAR = "--openloop-dock-width";
		const TRANSITION = "width .22s ease";
		function clampCanvasWidth(w) {
			const max = Math.max(320, (typeof window === "undefined" ? 1200 : window.innerWidth) - 200);
			return Math.min(Math.max(320, w), max);
		}
		/** canvas dock 右缘 = bsbWidth + boardWidth（最靠内容的面板） */
		function probeCanvasRightEdge() {
			if (typeof window === "undefined") return 0;
			const cs = getComputedStyle(document.documentElement);
			const read = (v) => {
				const n = parseFloat(cs.getPropertyValue(v)) || 0;
				return n > 0 && n < window.innerWidth * .8 ? n : 0;
			};
			return window.innerWidth - read(BSB_WIDTH_VAR) - read(BOARD_WIDTH_VAR);
		}
		function CanvasDockHost({ open, width, onWidthChange, children }) {
			const [host, setHost] = (0, react.useState)(null);
			const [rightEdge, setRightEdge] = (0, react.useState)(() => probeCanvasRightEdge());
			const [resizing, setResizing] = (0, react.useState)(false);
			const [handleHover, setHandleHover] = (0, react.useState)(false);
			const widthRef = (0, react.useRef)(width);
			widthRef.current = width;
			(0, react.useEffect)(() => {
				const el = document.createElement("div");
				el.setAttribute("data-openloop-canvas-dock", "");
				document.body.appendChild(el);
				setHost(el);
				const observer = new MutationObserver(() => {
					if (!document.body.contains(el)) document.body.appendChild(el);
				});
				observer.observe(document.body, { childList: true });
				return () => {
					observer.disconnect();
					el.remove();
				};
			}, []);
			(0, react.useEffect)(() => {
				const update = () => setRightEdge(probeCanvasRightEdge());
				update();
				const timer = setInterval(update, 500);
				window.addEventListener("resize", update);
				return () => {
					clearInterval(timer);
					window.removeEventListener("resize", update);
				};
			}, []);
			(0, react.useEffect)(() => {
				const root = document.getElementById("root");
				if (!root) return;
				root.style.setProperty(CANVAS_WIDTH_VAR, open ? `${width}px` : "0px");
				return () => {
					root.style.removeProperty(CANVAS_WIDTH_VAR);
				};
			}, [open, width]);
			const startResize = (event) => {
				if (!open) return;
				event.preventDefault();
				const startX = event.clientX;
				const startW = widthRef.current;
				setResizing(true);
				const move = (e) => {
					onWidthChange?.(clampCanvasWidth(Math.round(startW + (startX - e.clientX))));
				};
				const up = () => {
					setResizing(false);
					removeEventListener("pointermove", move);
					removeEventListener("pointerup", up);
				};
				addEventListener("pointermove", move);
				addEventListener("pointerup", up);
			};
			if (!host) return null;
			const outer = {
				position: "fixed",
				top: 0,
				bottom: 0,
				right: typeof window === "undefined" ? 0 : Math.max(0, window.innerWidth - rightEdge),
				width: open ? width : 0,
				transition: resizing ? "none" : TRANSITION,
				overflow: "hidden",
				zIndex: 2147483045,
				background: "var(--dsw-alias-bg-layer-1, #fff)",
				boxSizing: "border-box"
			};
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: outer,
				"data-openloop-canvas-panel": "",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						position: "absolute",
						top: 0,
						bottom: 0,
						right: 0,
						width,
						height: "100%",
						display: "flex",
						flexDirection: "column",
						background: "var(--dsw-alias-bg-layer-1, #fff)",
						boxSizing: "border-box"
					},
					children: [children, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						onPointerDown: startResize,
						onPointerEnter: () => setHandleHover(true),
						onPointerLeave: () => setHandleHover(false),
						style: {
							position: "absolute",
							left: 0,
							top: 0,
							bottom: 0,
							width: 10,
							cursor: open ? "col-resize" : "default",
							pointerEvents: open ? "auto" : "none",
							zIndex: 10
						},
						title: "拖动调整宽度",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
							width: resizing || handleHover ? 6 : 4,
							height: "100%",
							background: resizing || handleHover ? "var(--dsw-alias-state-business-primary, #4176e6)" : "var(--dsw-alias-border-l2, rgba(127,127,127,.3))",
							transition: "background .15s ease, width .15s ease"
						} })
					})]
				})
			}), host);
		}
		/** canvas toggle（board toggle 左侧；right = bsbWidth + boardWidth + 46） */
		function CanvasToggle({ open, onToggle }) {
			const [hover, setHover] = (0, react.useState)(false);
			const [right, setRight] = (0, react.useState)(46);
			(0, react.useEffect)(() => {
				const update = () => {
					const edge = probeCanvasRightEdge();
					setRight(Math.max(46, window.innerWidth - edge + 46));
				};
				update();
				const timer = setInterval(update, 500);
				window.addEventListener("resize", update);
				return () => {
					clearInterval(timer);
					window.removeEventListener("resize", update);
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onToggle,
				title: open ? "收起画布工作台" : "展开画布工作台",
				onMouseEnter: () => setHover(true),
				onMouseLeave: () => setHover(false),
				style: {
					position: "fixed",
					top: 38,
					right,
					zIndex: 2147483045,
					width: 28,
					height: 28,
					padding: 0,
					borderRadius: "50%",
					border: "none",
					background: hover ? "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))" : "transparent",
					cursor: "pointer",
					lineHeight: 1,
					opacity: hover || open ? 1 : .55,
					transition: "opacity .15s ease, background .15s ease",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: open ? "var(--dsw-alias-state-business-primary, #4176e6)" : "var(--dsw-alias-label-secondary, inherit)"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					width: "15",
					height: "15",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.9",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					"aria-hidden": "true",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "3",
						y: "3",
						width: "18",
						height: "18",
						rx: "2.5"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 9h18M9 9v12" })]
				})
			});
		}
		//#endregion
		//#region src/client/CanvasPinLayer.tsx
		/**
		* CanvasPinLayer：画布上的元素 pin 标注层（S7 元素级精度重写）。
		*
		* 核心升级（2026-09-06 用户拍板，对齐 workbuddy/DevTools 检查器精度）：
		* - 点选命中 = elementsFromPoint 的【最深层 DOM 元素】，不再只到 data-canvas-node 级
		*   ——复杂布局里能选到一个小框里的一个胶囊/一个字
		* - target 记录：所属 nodeId（DSL 注入）+ domPath（node → 元素的 CSS 路径）+ tag + 文本
		* - hover 高亮元素本身 + DevTools 式 tooltip（tag · 宽×高）
		* - mode 受控（toolbar 提到 CanvasWorkbench）
		*
		* 设计参照（QODER_CANVAS_SIDEBAR §3）：零蒙层拦截，hover 高亮 → 点击锁定 →
		* targets 气泡 → 评注 → 结构化草稿（canvas-annotations.ts）。
		*/
		const ACCENT$3 = "var(--dsw-alias-state-business-primary, #4176e6)";
		/** 已存注释的编号角标（点击弹操作卡） */
		function PinBadge({ n, annotation, onEdit, onDelete, onHover }) {
			const [cardOpen, setCardOpen] = (0, react.useState)(false);
			const firstTarget = annotation.targets[0];
			const anchorId = firstTarget !== void 0 && (firstTarget.kind === "node" || firstTarget.kind === "element") ? firstTarget.id : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				"data-openloop-pin-badge": true,
				onPointerDown: (e) => e.stopPropagation(),
				onClick: (e) => {
					e.stopPropagation();
					setCardOpen((v) => !v);
				},
				onPointerEnter: () => {
					if (anchorId !== null) onHover(anchorId);
				},
				onPointerLeave: () => onHover(null),
				title: annotation.note,
				style: {
					position: "absolute",
					right: -9,
					top: -9,
					zIndex: 40,
					width: 18,
					height: 18,
					borderRadius: "50%",
					border: "2px solid var(--dsw-alias-bg-layer-1, #fff)",
					background: ACCENT$3,
					color: "#fff",
					fontSize: 10,
					fontWeight: 700,
					lineHeight: 1,
					cursor: "pointer",
					padding: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					boxShadow: "0 1px 4px rgba(0,0,0,.25)",
					fontFamily: "inherit"
				},
				children: n
			}), cardOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				onPointerDown: (e) => e.stopPropagation(),
				style: {
					position: "absolute",
					right: -8,
					top: 14,
					zIndex: 41,
					width: 190,
					borderRadius: 9,
					padding: "8px 10px",
					display: "flex",
					flexDirection: "column",
					gap: 6,
					background: "var(--dsw-alias-bg-layer-1, #fff)",
					border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
					boxShadow: "0 8px 24px rgba(0,0,0,.22)",
					fontSize: 11
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						color: "var(--dsw-alias-label-secondary, inherit)",
						lineHeight: 1.5,
						maxHeight: 72,
						overflow: "auto"
					},
					children: annotation.note
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						gap: 5,
						justifyContent: "flex-end"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							onEdit();
							setCardOpen(false);
						},
						style: {
							fontSize: 10.5,
							padding: "2px 9px",
							borderRadius: 5,
							border: `1px solid ${ACCENT$3}`,
							background: "none",
							color: ACCENT$3,
							cursor: "pointer",
							fontFamily: "inherit"
						},
						children: "编辑"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							onDelete();
							setCardOpen(false);
						},
						style: {
							fontSize: 10.5,
							padding: "2px 9px",
							borderRadius: 5,
							border: "1px solid var(--dsw-alias-state-business-danger, #d0453e)",
							background: "none",
							color: "var(--dsw-alias-state-business-danger, #d0453e)",
							cursor: "pointer",
							fontFamily: "inherit"
						},
						children: "删除"
					})]
				})]
			}) : null] });
		}
		function CanvasPinLayer({ snapshot, containerRef, mode, callbacks }) {
			const [hovered, setHovered] = (0, react.useState)(null);
			const [locked, setLocked] = (0, react.useState)(null);
			const [marquee, setMarquee] = (0, react.useState)(null);
			const marqueeActive = (0, react.useRef)(false);
			const surfaceRef = (0, react.useRef)(null);
			surfaceRef.current = containerRef.current;
			const annotationsByNode = /* @__PURE__ */ new Map();
			callbacks.annotations.forEach((ann, i) => {
				const t = ann.targets[0];
				if (t !== void 0 && (t.kind === "node" || t.kind === "element")) {
					const list = annotationsByNode.get(t.id) ?? [];
					list.push({
						ann,
						n: i + 1
					});
					annotationsByNode.set(t.id, list);
				}
			});
			/**
			* 元素级命中（S7 核心）：elementsFromPoint 取最深层属于画布的元素。
			* - 跳过 pin 层自身（badges/高亮——高亮是 pointer-events:none 本不会被返回，badge 需要跳过）
			* - 返回元素 + 所属 nodeId + domPath
			*/
			const hitElement = (x, y) => {
				const surface = surfaceRef.current;
				if (surface === null) return null;
				for (const el of document.elementsFromPoint(x, y)) {
					if (el.closest("[data-openloop-canvas-pin-layer]") !== null) continue;
					if (!surface.contains(el)) continue;
					const nodeEl = el.closest("[data-canvas-node]");
					if (nodeEl === null || !surface.contains(nodeEl)) continue;
					const nodeId = nodeEl.getAttribute("data-canvas-node");
					if (nodeId === null || nodeId.length === 0) continue;
					if (el === nodeEl) return {
						nodeId,
						domPath: "",
						tag: nodeEl.tagName.toLowerCase()
					};
					const domPath = domPathWithin(nodeEl, el);
					const text = (el.textContent ?? "").trim();
					return {
						nodeId,
						domPath,
						tag: el.tagName.toLowerCase(),
						text: text.length > 0 ? text.slice(0, 40) : void 0
					};
				}
				return null;
			};
			/** 命中矩形内的全部 node（框选保持 node 级——用户拍板框选暂不深化） */
			const hitNodesInRect = (rect) => {
				const surface = surfaceRef.current;
				if (surface === null) return [];
				const out = [];
				for (const el of surface.querySelectorAll("[data-canvas-node]")) {
					const r = el.getBoundingClientRect();
					if (r.left >= rect.left && r.right <= rect.right && r.top >= rect.top && r.bottom <= rect.bottom) {
						const id = el.getAttribute("data-canvas-node");
						if (id !== null) out.push(id);
					}
				}
				return out;
			};
			const buildRangeIndex = (range) => {
				const surface = surfaceRef.current;
				if (surface === null) return [];
				const out = [];
				for (const el of surface.querySelectorAll("[data-canvas-node]")) {
					const id = el.getAttribute("data-canvas-node");
					if (id === null) continue;
					const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
					let textNode = walker.nextNode();
					let acc = "";
					let hit = false;
					while (textNode !== null) {
						const tr = document.createRange();
						tr.selectNodeContents(textNode);
						if (range.compareBoundaryPoints(Range.END_TO_START, tr) < 0 && range.compareBoundaryPoints(Range.START_TO_END, tr) > 0) {
							acc += textNode.textContent ?? "";
							hit = true;
						}
						textNode = walker.nextNode();
					}
					if (hit) out.push({
						nodeId: id,
						text: acc.trim()
					});
				}
				return out;
			};
			const hitText = () => {
				const sel = window.getSelection();
				if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) return [];
				const surface = surfaceRef.current;
				if (surface === null) return [];
				const range = sel.getRangeAt(0);
				if (!surface.contains(range.commonAncestorContainer)) return [];
				return buildRangeIndex(range);
			};
			(0, react.useEffect)(() => {
				const container = containerRef.current;
				if (container === null) return;
				/**
				* 悬浮注释面板内的交互完全豁免（真机教训 2026-09-06：面板在画布容器内，
				* 面板上的点击会冒泡到容器触发点选——点 textarea/保存按钮时穿透命中
				* 画布元素或把 targets 重置为空，导致「评论了但什么都没保存」）
				*/
				const inFloatPanel = (e) => e.target instanceof Element && e.target.closest("[data-annotation-float]") !== null;
				const onPointerMove = (e) => {
					if (inFloatPanel(e)) {
						setHovered(null);
						return;
					}
					if (mode === "point" && !marqueeActive.current) setHovered(hitElement(e.clientX, e.clientY));
					else if (marqueeActive.current) setMarquee((prev) => prev !== null ? {
						...prev,
						x1: e.clientX,
						y1: e.clientY
					} : null);
				};
				const onPointerDown = (e) => {
					if (inFloatPanel(e)) return;
					if (mode === "marquee" && e.button === 0) {
						marqueeActive.current = true;
						setMarquee({
							x0: e.clientX,
							y0: e.clientY,
							x1: e.clientX,
							y1: e.clientY
						});
						setLocked(null);
						e.preventDefault();
					}
				};
				const onPointerUp = (e) => {
					if (inFloatPanel(e)) {
						marqueeActive.current = false;
						setMarquee(null);
						return;
					}
					if (mode === "point" && !marqueeActive.current) {
						const hit = hitElement(e.clientX, e.clientY);
						if (hit !== null) {
							setLocked(hit);
							const node = snapshot.canvas.nodes.find((n) => n.id === hit.nodeId);
							const type = node?.type ?? hit.nodeId;
							if (hit.domPath.length === 0) {
								const label = node !== void 0 ? String(node.props.label ?? node.props.title ?? hit.nodeId) : hit.nodeId;
								callbacks.onTargetsChange([{
									kind: "node",
									id: hit.nodeId,
									label
								}]);
							} else callbacks.onTargetsChange([{
								kind: "element",
								id: hit.nodeId,
								label: `${type} ${hit.tag}${hit.text !== void 0 ? ` "${hit.text.slice(0, 20)}"` : ""}`,
								tag: hit.tag,
								domPath: hit.domPath,
								text: hit.text
							}]);
						} else {
							setLocked(null);
							callbacks.onTargetsChange([]);
						}
					} else if (marqueeActive.current) {
						marqueeActive.current = false;
						setMarquee((prev) => {
							if (prev !== null) {
								const rect = {
									left: Math.min(prev.x0, prev.x1),
									right: Math.max(prev.x0, prev.x1),
									top: Math.min(prev.y0, prev.y1),
									bottom: Math.max(prev.y0, prev.y1)
								};
								if (rect.right - rect.left > 6 && rect.bottom - rect.top > 6) {
									const nodes = hitNodesInRect(rect);
									if (nodes.length > 0) callbacks.onTargetsChange(nodes.map((id) => {
										const node = snapshot.canvas.nodes.find((n) => n.id === id);
										return {
											kind: "node",
											id,
											label: node !== void 0 ? String(node.props.label ?? node.props.title ?? id) : id
										};
									}));
									else callbacks.onTargetsChange([]);
								}
							}
							return null;
						});
					} else if (mode === "text") {
						const hits = hitText();
						if (hits.length > 0) {
							const excerpt = hits.map((h) => h.text).join(" ").slice(0, 120);
							callbacks.onTargetsChange([{
								kind: "text",
								excerpt
							}]);
						}
					}
				};
				const onKeyDown = (e) => {
					if (e.key === "Escape") {
						setLocked(null);
						setMarquee(null);
						callbacks.onTargetsChange([]);
					}
					if (e.key === "Enter" && (e.target === document.body || e.target === container)) callbacks.onSave();
				};
				container.addEventListener("pointermove", onPointerMove);
				container.addEventListener("pointerdown", onPointerDown);
				container.addEventListener("pointerup", onPointerUp);
				document.addEventListener("keydown", onKeyDown);
				return () => {
					container.removeEventListener("pointermove", onPointerMove);
					container.removeEventListener("pointerdown", onPointerDown);
					container.removeEventListener("pointerup", onPointerUp);
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [
				mode,
				snapshot.canvasId,
				snapshot.revision,
				containerRef.current
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `[data-openloop-canvas-workbench] [data-openloop-canvas]{ cursor: ${mode === "marquee" ? "crosshair" : mode === "text" ? "text" : "default"}; }` }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-canvas-pin-layer": true,
				style: {
					position: "absolute",
					inset: 0,
					pointerEvents: "none",
					zIndex: 20
				},
				children: [
					hovered !== null && (locked === null || hovered.nodeId !== locked.nodeId || hovered.domPath !== locked.domPath) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HighlightEl, {
						surface: surfaceRef.current,
						hit: hovered,
						borderStyle: "outline",
						nodeType: snapshot.canvas.nodes.find((n) => n.id === hovered.nodeId)?.type
					}) : null,
					locked !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HighlightEl, {
						surface: surfaceRef.current,
						hit: locked,
						borderStyle: "solid",
						nodeType: snapshot.canvas.nodes.find((n) => n.id === locked.nodeId)?.type
					}) : null,
					marquee !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
						position: "fixed",
						left: Math.min(marquee.x0, marquee.x1),
						top: Math.min(marquee.y0, marquee.y1),
						width: Math.abs(marquee.x1 - marquee.x0),
						height: Math.abs(marquee.y1 - marquee.y0),
						border: `1.5px dashed ${ACCENT$3}`,
						background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 8%, transparent)",
						pointerEvents: "none",
						zIndex: 50
					} }) : null,
					[...annotationsByNode.entries()].map(([nodeId, list]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NodeBadgeAnchor, {
						surface: surfaceRef.current,
						nodeId,
						children: list.map(({ ann, n }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinBadge, {
							n,
							annotation: ann,
							onEdit: () => callbacks.onEditAnnotation(ann),
							onDelete: () => callbacks.onDeleteAnnotation(ann),
							onHover: callbacks.onFocusNode
						}, ann.id))
					}, nodeId))
				]
			})] });
		}
		/**
		* 从 ancestor 到 el 的 CSS 路径（tag.firstClass > tag:nth-of-type(n) > ...）。
		* 真机教训（2026-09-06）：无 class 的元素（table 的 td、stat-card 的子 div）
		* 若不带序号，`nodeEl.querySelector(domPath)` 永远命中【第一个】匹配——
		* 高亮框永远钉在第一格/第一个子元素上，用户以为「只能选第一格」。
		* 加 :nth-of-type 保证回查唯一命中自己。
		*/
		function domPathWithin(ancestor, el) {
			const parts = [];
			let cur = el;
			while (cur !== null && cur !== ancestor) {
				const tag = cur.tagName.toLowerCase();
				const cls = (cur.getAttribute("class") ?? "").trim().split(/\s+/)[0];
				let part = cls !== void 0 && cls.length > 0 ? `${tag}.${CSS.escape(cls)}` : tag;
				const parent = cur.parentElement;
				if (parent !== null) {
					const sameTag = [...parent.children].filter((c) => c.tagName === cur.tagName);
					if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(cur) + 1})`;
				}
				parts.unshift(part);
				cur = cur.parentElement;
			}
			return parts.join(" > ");
		}
		/** badge 锚点：包一层 node 元素尺寸的 absolute 容器，角标钉在右上 */
		function NodeBadgeAnchor({ surface, nodeId, children }) {
			if (surface === null) return null;
			const el = surface.querySelector(`[data-canvas-node="${CSS.escape(nodeId)}"]`);
			if (el === null) return null;
			const box = surface.getBoundingClientRect();
			const r = el.getBoundingClientRect();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					position: "absolute",
					left: r.left - box.left,
					top: r.top - box.top,
					width: r.width,
					height: r.height,
					pointerEvents: "none",
					zIndex: 35
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						position: "absolute",
						right: 0,
						top: 0,
						pointerEvents: "auto"
					},
					children
				})
			});
		}
		/** 元素级高亮框 + DevTools 式 tooltip（type tag · 宽×高） */
		function HighlightEl({ surface, hit, borderStyle, nodeType }) {
			if (surface === null) return null;
			const nodeEl = surface.querySelector(`[data-canvas-node="${CSS.escape(hit.nodeId)}"]`);
			if (nodeEl === null) return null;
			let el = nodeEl;
			if (hit.domPath.length > 0) try {
				el = nodeEl.querySelector(hit.domPath) ?? nodeEl;
			} catch {
				el = nodeEl;
			}
			const box = surface.getBoundingClientRect();
			const r = el.getBoundingClientRect();
			if (r.width === 0 && r.height === 0) return null;
			const tooltip = `${nodeType ?? ""} ${hit.tag} · ${Math.round(r.width)}×${Math.round(r.height)}`.trim();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
				position: "absolute",
				left: r.left - box.left - 2,
				top: r.top - box.top - 2,
				width: r.width + 4,
				height: r.height + 4,
				border: borderStyle === "outline" ? `1.5px solid ${ACCENT$3}` : `2px solid ${ACCENT$3}`,
				borderRadius: 5,
				pointerEvents: "none",
				zIndex: 30,
				background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)",
				boxShadow: borderStyle === "solid" ? `0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 18%, transparent)` : "none"
			} }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					position: "absolute",
					left: r.left - box.left - 2,
					top: Math.max(2, r.top - box.top - 22),
					zIndex: 31,
					fontSize: 10,
					fontFamily: "ui-monospace, Menlo, monospace",
					lineHeight: 1,
					padding: "3px 7px",
					borderRadius: 4,
					pointerEvents: "none",
					whiteSpace: "nowrap",
					color: "#fff",
					background: "var(--dsw-alias-state-business-primary, #4176e6)",
					boxShadow: "0 2px 6px rgba(0,0,0,.2)"
				},
				children: tooltip
			})] });
		}
		//#endregion
		//#region src/client/CommentPanel.tsx
		/**
		* CommentPanel：工作台右侧常驻评论面板（design-comments 范式，QODER_CANVAS_SIDEBAR §3）。
		*
		* 与对话流版「画布浮动小框」的根本区别：评论 UI 是【常驻面板】——
		* 注释按元素分组列表 + 新建输入框（targets 已选时出现）+ 编辑/删除。
		* 空间从容，评论历史/输入/管理分层清晰。
		*/
		const ACCENT$2 = "var(--dsw-alias-state-business-primary, #4176e6)";
		function CommentPanel({ targets, note, setNote, onRemoveTarget, onSave, onCancel, annotations, onEdit, onDelete, focusNodeId }) {
			const listRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (focusNodeId === null || listRef.current === null) return;
				listRef.current.querySelector(`[data-ann-node="${CSS.escape(focusNodeId)}"]`)?.scrollIntoView({
					behavior: "smooth",
					block: "nearest"
				});
			}, [focusNodeId]);
			const byNode = /* @__PURE__ */ new Map();
			const textAnns = [];
			for (const a of annotations) {
				const nodeTarget = a.targets.find((t) => t.kind === "node");
				if (nodeTarget !== void 0 && nodeTarget.kind === "node") {
					const arr = byNode.get(nodeTarget.id) ?? [];
					arr.push(a);
					byNode.set(nodeTarget.id, arr);
				} else textAnns.push(a);
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					height: "100%",
					minHeight: 0,
					borderLeft: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							padding: "8px 12px",
							borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
							display: "flex",
							alignItems: "center",
							gap: 6
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 11,
								fontWeight: 650
							},
							children: "评论"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 10,
								color: "var(--dsw-alias-label-caption, #888)"
							},
							children: annotations.length
						})]
					}),
					targets.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							padding: "10px 12px",
							borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
							display: "flex",
							flexDirection: "column",
							gap: 7,
							background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 5%, transparent)"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									display: "flex",
									flexWrap: "wrap",
									gap: 5
								},
								children: targets.map((t, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										display: "inline-flex",
										alignItems: "center",
										gap: 4,
										fontSize: 10,
										padding: "1.5px 7px",
										borderRadius: 5,
										background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)",
										color: ACCENT$2,
										maxWidth: "100%",
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: [t.kind === "text" ? `文本 "${t.excerpt}"` : t.label, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => onRemoveTarget(i),
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
								}, i))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								value: note,
								onChange: (e) => setNote(e.target.value),
								placeholder: "添加评论…（保存后注入输入框草稿）",
								rows: 3,
								autoFocus: true,
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
									onClick: onCancel,
									style: {
										fontSize: 10.5,
										padding: "3px 10px",
										borderRadius: 6,
										border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
										background: "none",
										cursor: "pointer",
										fontFamily: "inherit"
									},
									children: "取消"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: onSave,
									disabled: note.trim().length === 0,
									style: {
										fontSize: 10.5,
										padding: "3px 12px",
										borderRadius: 6,
										border: 0,
										cursor: note.trim().length > 0 ? "pointer" : "not-allowed",
										fontFamily: "inherit",
										color: "#fff",
										background: note.trim().length > 0 ? ACCENT$2 : "var(--dsw-alias-interactive-bg-active, rgba(127,127,127,.2))"
									},
									children: "保存"
								})]
							})
						]
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						ref: listRef,
						style: {
							flex: 1,
							minHeight: 0,
							overflow: "auto",
							padding: "8px 12px",
							display: "flex",
							flexDirection: "column",
							gap: 12
						},
						children: [
							annotations.length === 0 && targets.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: 11,
									color: "var(--dsw-alias-label-caption, #888)",
									lineHeight: 1.7,
									padding: "12px 4px"
								},
								children: [
									"还没有评论",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: { fontSize: 10 },
										children: "在左侧画布上点选/框选元素或选中文本，即可添加评论"
									})
								]
							}) : null,
							[...byNode.entries()].map(([nodeId, anns]) => {
								const first = anns[0]?.targets.find((t) => t.kind === "node");
								const label = first !== void 0 && first.kind === "node" ? first.label : nodeId;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									"data-ann-node": nodeId,
									style: {
										display: "flex",
										flexDirection: "column",
										gap: 6
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											fontSize: 10.5,
											fontWeight: 650,
											color: ACCENT$2,
											display: "flex",
											alignItems: "center",
											gap: 5
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
												width: 6,
												height: 6,
												borderRadius: "50%",
												background: ACCENT$2,
												flexShrink: 0
											} }),
											nodeId,
											" ",
											label
										]
									}), anns.map((a) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											gap: 6,
											alignItems: "flex-start",
											fontSize: 11.5,
											lineHeight: 1.55,
											padding: "6px 8px",
											borderRadius: 7,
											background: "var(--dsw-alias-bg-layer-2, #f6f6f7)"
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													flex: 1,
													minWidth: 0,
													wordBreak: "break-word"
												},
												children: a.note
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => onEdit(a),
												title: "编辑",
												style: {
													border: 0,
													background: "none",
													cursor: "pointer",
													fontSize: 11,
													color: "var(--dsw-alias-label-caption, #888)",
													padding: 0,
													flexShrink: 0
												},
												children: "✎"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => onDelete(a),
												title: "删除",
												style: {
													border: 0,
													background: "none",
													cursor: "pointer",
													fontSize: 11,
													color: "var(--dsw-alias-label-caption, #888)",
													padding: 0,
													flexShrink: 0
												},
												children: "🗑"
											})
										]
									}, a.id))]
								}, nodeId);
							}),
							textAnns.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexDirection: "column",
									gap: 6
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 10.5,
										fontWeight: 650,
										color: "var(--dsw-alias-label-secondary, inherit)"
									},
									children: "文本注释"
								}), textAnns.map((a) => {
									const excerpt = a.targets.find((t) => t.kind === "text");
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											flexDirection: "column",
											gap: 4,
											fontSize: 11.5,
											padding: "6px 8px",
											borderRadius: 7,
											background: "var(--dsw-alias-bg-layer-2, #f6f6f7)"
										},
										children: [excerpt !== void 0 && excerpt.kind === "text" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: {
												fontSize: 10,
												color: "var(--dsw-alias-label-caption, #888)",
												fontStyle: "italic",
												borderLeft: `2px solid ${ACCENT$2}`,
												paddingLeft: 6
											},
											children: [
												"\"",
												excerpt.excerpt,
												"\""
											]
										}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												gap: 6,
												alignItems: "flex-start"
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: {
														flex: 1,
														minWidth: 0,
														wordBreak: "break-word"
													},
													children: a.note
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => onEdit(a),
													title: "编辑",
													style: {
														border: 0,
														background: "none",
														cursor: "pointer",
														fontSize: 11,
														color: "var(--dsw-alias-label-caption, #888)",
														padding: 0,
														flexShrink: 0
													},
													children: "✎"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => onDelete(a),
													title: "删除",
													style: {
														border: 0,
														background: "none",
														cursor: "pointer",
														fontSize: 11,
														color: "var(--dsw-alias-label-caption, #888)",
														padding: 0,
														flexShrink: 0
													},
													children: "🗑"
												})
											]
										})]
									}, a.id);
								})]
							}) : null
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/canvas-annotations.ts
		const KEY_PREFIX = "qoder-canvas.annotations.v1.";
		function keyOf(canvasId) {
			return KEY_PREFIX + canvasId;
		}
		function readAll(canvasId) {
			try {
				const raw = localStorage.getItem(keyOf(canvasId));
				if (raw === null) return [];
				const parsed = JSON.parse(raw);
				return Array.isArray(parsed) ? parsed.filter((a) => typeof a?.id === "string" && typeof a?.note === "string") : [];
			} catch {
				return [];
			}
		}
		function writeAll(canvasId, items) {
			try {
				localStorage.setItem(keyOf(canvasId), JSON.stringify(items));
			} catch {}
		}
		function listAnnotations(canvasId) {
			return readAll(canvasId);
		}
		function addAnnotation(input) {
			const annotation = {
				...input,
				id: `ann_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`,
				createdAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			writeAll(input.canvasId, [...readAll(input.canvasId), annotation]);
			return annotation;
		}
		function updateAnnotationNote(canvasId, id, note) {
			writeAll(canvasId, readAll(canvasId).map((a) => a.id === id ? {
				...a,
				note
			} : a));
		}
		function removeAnnotation(canvasId, id) {
			writeAll(canvasId, readAll(canvasId).filter((a) => a.id !== id));
		}
		/**
		* 进 composer 的草稿格式（S6 结构化重做，2026-09-06 用户拍板）：
		* 标注是给 Agent 消费的结构化上下文（Qoder「注释即 API 文档」），不是给人看的标签。
		* 每个 node target 带：document 路径（nodes[i]）+ 节点类型 + id + 【完整 DSL 源码片段】
		* ——Agent 拿到后能精确定位 canvas 工具的 document 里改哪一段。
		*/
		function formatAnnotationDraft(snapshot, targets, note) {
			const nodes = snapshot.canvas.nodes ?? [];
			const blocks = [];
			for (const t of targets) if (t.kind === "node" || t.kind === "element") {
				const idx = nodes.findIndex((n) => n.id === t.id);
				const node = idx >= 0 ? nodes[idx] : void 0;
				const elementAttrs = t.kind === "element" ? ` element="${t.domPath}" tag="${t.tag}"${t.text !== void 0 && t.text.length > 0 ? ` text="${t.text.replace(/"/g, "&quot;")}"` : ""}` : "";
				if (node !== void 0) blocks.push(`<target type="${node.type}" id="${node.id}" path="nodes[${idx}]"${elementAttrs}>\n${JSON.stringify(node, null, 2)}\n</target>`);
				else blocks.push(`<target id="${t.id}" note="not found in current revision"${elementAttrs}>${t.label}</target>`);
			} else blocks.push(`<target type="text">"${t.excerpt}"</target>`);
			return `画布标注 · ${snapshot.canvas.title} ${snapshot.canvasId}@r${snapshot.revision}\n${blocks.join("\n")}\n${note}`;
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
		//#region src/client/annotation-capsule.tsx
		/**
		* annotation-capsule：画布注释的 composer 胶囊（S7 新增，2026-09-06 用户拍板）。
		*
		* 核心语义（对齐 workbuddy/Qoder Canvas 的「引用胶囊」）：
		* - 保存注释【不再】把文本铺进输入框——而是以「胶囊」挂在 composer 上方
		* - hover 胶囊 → 悬浮详情卡（每条注释的 target 摘要 + 评注 + 编辑/删除）
		* - 用户正常输入自己的问题，按 Enter（或点发送按钮）时，
		*   胶囊里的全部注释被格式化为结构化草稿注入 composer 随消息一起发出
		* - 发送后胶囊清空
		*
		* 技术要点：
		* - 胶囊条用 fixed 定位贴 composer 外框上方（不侵入 Lexical 内部结构）
		* - 发送拦截 = document 级 capture（keydown Enter / 发送按钮 click），
		*   在 DSH 处理之前把草稿注入（execCommand 同步生效，发送时完整携带）
		*/
		const drafts = [];
		const latestSnapshots = /* @__PURE__ */ new Map();
		const listeners = /* @__PURE__ */ new Set();
		function emit() {
			for (const l of listeners) l();
		}
		function pushCapsuleDraft(ann) {
			drafts.push(ann);
			emit();
		}
		function registerCanvasSnapshot(snap) {
			latestSnapshots.set(snap.canvasId, snap);
		}
		function flushDraftsIntoComposer() {
			if (drafts.length === 0) return;
			const parts = [];
			for (const ann of drafts) {
				const snap = latestSnapshots.get(ann.canvasId);
				if (snap !== void 0) parts.push(formatAnnotationDraft({
					canvasId: ann.canvasId,
					revision: ann.revision,
					canvas: snap.canvas
				}, ann.targets, ann.note));
				else parts.push(`画布标注 · ${ann.canvasId}@r${ann.revision}\n${ann.note}`);
			}
			injectComposerDraft(parts.join("\n\n"));
			drafts.length = 0;
			emit();
		}
		function findComposerInput() {
			return document.querySelector("[data-composer-input=\"true\"]") ?? document.querySelector("[contenteditable=\"true\"]");
		}
		/** composer 外框（含输入区+工具行的容器）：从输入框向上找第一个带 button 的祖先 */
		function findComposerFrame(input) {
			let cur = input;
			for (let i = 0; i < 8 && cur !== null; i += 1) {
				if (cur.querySelector("button") !== null && cur.getBoundingClientRect().height > 60) return cur;
				cur = cur.parentElement;
			}
			return input.parentElement ?? input;
		}
		/** 发送按钮探测：composer 外框内最后一个【无文本内容的圆形/图标按钮】 */
		function findSendButton(frame) {
			const buttons = [...frame.querySelectorAll("button")];
			for (let i = buttons.length - 1; i >= 0; i -= 1) {
				const b = buttons[i];
				if (b === void 0) continue;
				if ((b.textContent ?? "").trim().length === 0 && b.querySelector("svg") !== null) return b;
			}
			return null;
		}
		const ACCENT$1 = "var(--dsw-alias-state-business-primary, #4176e6)";
		function AnnotationCapsuleBar() {
			const [, force] = (0, react.useReducer)((x) => x + 1, 0);
			const [anchor, setAnchor] = (0, react.useState)(null);
			const [detailOpen, setDetailOpen] = (0, react.useState)(false);
			const [editingId, setEditingId] = (0, react.useState)(null);
			const [editingNote, setEditingNote] = (0, react.useState)("");
			const hoverTimer = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const l = () => force();
				listeners.add(l);
				return () => {
					listeners.delete(l);
				};
			}, []);
			(0, react.useEffect)(() => {
				const update = () => {
					const input = findComposerInput();
					if (input === null) {
						setAnchor(null);
						return;
					}
					const r = findComposerFrame(input).getBoundingClientRect();
					if (r.width === 0) {
						setAnchor(null);
						return;
					}
					setAnchor((prev) => {
						const next = {
							left: r.left + 10,
							top: r.top - 36
						};
						return prev !== null && Math.abs(prev.left - next.left) < 1 && Math.abs(prev.top - next.top) < 1 ? prev : next;
					});
				};
				update();
				window.addEventListener("resize", update);
				document.addEventListener("scroll", update, true);
				const timer = setInterval(update, 800);
				return () => {
					window.removeEventListener("resize", update);
					document.removeEventListener("scroll", update, true);
					clearInterval(timer);
				};
			}, []);
			(0, react.useEffect)(() => {
				const onKeydown = (e) => {
					if (drafts.length === 0) return;
					if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
					const input = findComposerInput();
					if (input === null || !input.contains(e.target)) return;
					flushDraftsIntoComposer();
				};
				const onClick = (e) => {
					if (drafts.length === 0) return;
					const input = findComposerInput();
					if (input === null) return;
					const sendBtn = findSendButton(findComposerFrame(input));
					if (sendBtn !== null && e.target.nodeType === 1 && sendBtn.contains(e.target)) {
						if ((input.textContent ?? "").trim().length > 0) flushDraftsIntoComposer();
					}
				};
				document.addEventListener("keydown", onKeydown, true);
				document.addEventListener("click", onClick, true);
				return () => {
					document.removeEventListener("keydown", onKeydown, true);
					document.removeEventListener("click", onClick, true);
				};
			}, []);
			if (drafts.length === 0 || anchor === null) return null;
			const openDetail = () => {
				if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
				setDetailOpen(true);
			};
			const closeDetail = () => {
				if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
				hoverTimer.current = setTimeout(() => setDetailOpen(false), 180);
			};
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-annotation-capsule": true,
				onPointerEnter: openDetail,
				onPointerLeave: closeDetail,
				style: {
					position: "fixed",
					left: anchor.left,
					top: anchor.top,
					zIndex: 2147483050,
					display: "flex",
					alignItems: "center",
					gap: 6
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: {
						display: "inline-flex",
						alignItems: "center",
						gap: 5,
						fontSize: 11,
						padding: "3px 8px 3px 7px",
						borderRadius: 999,
						color: "var(--dsw-alias-label-primary, inherit)",
						background: "var(--dsw-alias-bg-layer-1, #fff)",
						border: `1px solid ${ACCENT$1}`,
						boxShadow: "0 2px 10px rgba(0,0,0,.14)",
						cursor: "default",
						userSelect: "none"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
							width: "11",
							height: "11",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: ACCENT$1,
							strokeWidth: "2",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							"aria-hidden": "true",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								color: ACCENT$1,
								fontWeight: 600
							},
							children: [drafts.length, " 条画布注释"]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							title: "移除全部注释",
							onClick: () => {
								drafts.length = 0;
								emit();
							},
							style: {
								border: 0,
								background: "none",
								padding: 0,
								cursor: "pointer",
								color: "var(--dsw-alias-label-caption, #888)",
								fontSize: 12,
								lineHeight: 1,
								fontFamily: "inherit"
							},
							children: "×"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						fontSize: 10,
						color: "var(--dsw-alias-label-caption, #999)"
					},
					children: "发送消息时随消息发出"
				})]
			}), detailOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				onPointerEnter: openDetail,
				onPointerLeave: closeDetail,
				style: {
					position: "fixed",
					left: anchor.left,
					top: anchor.top - 8,
					transform: "translateY(-100%)",
					zIndex: 2147483051,
					width: 320,
					maxHeight: 300,
					overflow: "auto",
					borderRadius: 10,
					padding: "10px 12px",
					background: "var(--dsw-alias-bg-layer-1, #fff)",
					border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
					boxShadow: "0 10px 32px rgba(0,0,0,.24)",
					display: "flex",
					flexDirection: "column",
					gap: 8,
					fontSize: 11.5
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						fontSize: 10.5,
						fontWeight: 600,
						color: ACCENT$1
					},
					children: [
						"待发送的画布注释（",
						drafts.length,
						"）"
					]
				}), drafts.map((ann, i) => {
					const t = ann.targets[0];
					const targetLabel = t === void 0 ? "" : t.kind === "text" ? `文本 "${t.excerpt.slice(0, 24)}"` : t.label;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 4,
							padding: "7px 9px",
							borderRadius: 8,
							background: "var(--dsw-alias-bg-layer-2, rgba(127,127,127,.06))"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 6
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										fontWeight: 650,
										flex: 1,
										minWidth: 0,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: [
										i + 1,
										"。",
										targetLabel
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									title: "编辑评注",
									onClick: () => {
										setEditingId(ann.id);
										setEditingNote(ann.note);
									},
									style: {
										border: 0,
										background: "none",
										padding: 2,
										cursor: "pointer",
										color: "var(--dsw-alias-label-caption, #888)",
										display: "flex"
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
										width: "12",
										height: "12",
										viewBox: "0 0 24 24",
										fill: "none",
										stroke: "currentColor",
										strokeWidth: "2",
										strokeLinecap: "round",
										strokeLinejoin: "round",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" })
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									title: "移除",
									onClick: () => {
										const idx = drafts.findIndex((d) => d.id === ann.id);
										if (idx >= 0) {
											drafts.splice(idx, 1);
											emit();
										}
									},
									style: {
										border: 0,
										background: "none",
										padding: 2,
										cursor: "pointer",
										color: "var(--dsw-alias-label-caption, #888)",
										fontSize: 13,
										lineHeight: 1,
										fontFamily: "inherit"
									},
									children: "×"
								})
							]
						}), editingId === ann.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: 5
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								value: editingNote,
								onChange: (e) => setEditingNote(e.target.value),
								rows: 2,
								autoFocus: true,
								style: {
									fontSize: 11,
									padding: "5px 7px",
									borderRadius: 6,
									border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2))",
									background: "var(--dsw-alias-bg-layer-1, #fff)",
									color: "inherit",
									resize: "vertical",
									fontFamily: "inherit"
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 5,
									justifyContent: "flex-end"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setEditingId(null),
									style: {
										fontSize: 10,
										padding: "2px 8px",
										borderRadius: 5,
										border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2))",
										background: "none",
										cursor: "pointer",
										fontFamily: "inherit",
										color: "inherit"
									},
									children: "取消"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: editingNote.trim().length === 0,
									onClick: () => {
										const d = drafts.find((x) => x.id === ann.id);
										if (d !== void 0) d.note = editingNote.trim();
										setEditingId(null);
										emit();
									},
									style: {
										fontSize: 10,
										padding: "2px 10px",
										borderRadius: 5,
										border: 0,
										cursor: "pointer",
										fontFamily: "inherit",
										color: "#fff",
										background: ACCENT$1
									},
									children: "保存"
								})]
							})]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								color: "var(--dsw-alias-label-secondary, inherit)",
								lineHeight: 1.5,
								whiteSpace: "pre-wrap",
								wordBreak: "break-word"
							},
							children: ann.note
						})]
					}, ann.id);
				})]
			}) : null] }), document.body);
		}
		//#endregion
		//#region src/client/CanvasWorkbench.tsx
		/**
		* CanvasWorkbench：canvas dock 的工作台（S7 布局重做，2026-09-06 用户拍板）。
		*
		* 布局（推翻 S5 两列方案）：
		* - 画布区【铺满】整个工作台（不留右栏）
		* - toolbar（点击/框选/划字 三模式）常驻 header 之下——清晰可见
		* - 注释面板 = 【悬浮窗】浮在画布上（默认右上，可拖拽移动，可关闭）
		* - 保存注释 → composer 胶囊（annotation-capsule），不再把文本铺进输入框
		*/
		const WIDTH_KEY = "openloop.canvas.width.v1";
		const OPEN_KEY = "openloop.canvas.open.v1";
		function readWidth() {
			try {
				const v = Number(localStorage.getItem(WIDTH_KEY));
				return Number.isFinite(v) && v > 0 ? clampCanvasWidth(v) : 560;
			} catch {
				return 560;
			}
		}
		function readOpen() {
			try {
				return localStorage.getItem(OPEN_KEY) === "1";
			} catch {
				return false;
			}
		}
		const ACCENT = "var(--dsw-alias-state-business-primary, #4176e6)";
		const MODES = [
			{
				key: "point",
				label: "点击",
				hint: "hover 高亮元素，点击选中（元素级精度）"
			},
			{
				key: "marquee",
				label: "框选",
				hint: "拖拽框选多个节点"
			},
			{
				key: "text",
				label: "划字",
				hint: "划选文本作为引用"
			}
		];
		function CanvasWorkbench() {
			const [open, setOpen] = (0, react.useState)(readOpen);
			const [width, setWidth] = (0, react.useState)(readWidth);
			const [snapshot, setSnapshot] = (0, react.useState)(null);
			const [annotations, setAnnotations] = (0, react.useState)([]);
			const [targets, setTargets] = (0, react.useState)([]);
			const [note, setNote] = (0, react.useState)("");
			const [mode, setMode] = (0, react.useState)("point");
			const [focusNodeId, setFocusNodeId] = (0, react.useState)(null);
			const [editAnn, setEditAnn] = (0, react.useState)(null);
			const [toast, setToast] = (0, react.useState)(null);
			const [panelOpen, setPanelOpen] = (0, react.useState)(false);
			const [panelPos, setPanelPos] = (0, react.useState)(null);
			const canvasAreaRef = (0, react.useRef)(null);
			const dragRef = (0, react.useRef)(null);
			const persistOpen = (v) => {
				setOpen(v);
				try {
					localStorage.setItem(OPEN_KEY, v ? "1" : "0");
				} catch {}
			};
			const persistWidth = (w) => {
				setWidth(w);
				try {
					localStorage.setItem(WIDTH_KEY, String(w));
				} catch {}
			};
			const showToast = (msg) => {
				setToast(msg);
				setTimeout(() => {
					setToast((cur) => cur === msg ? null : cur);
				}, 2200);
			};
			const hasEverOpened = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				const applySnapshot = (canvasId, snap) => {
					if (snap != null) {
						setSnapshot(snap);
						registerCanvasSnapshot(snap);
					}
					setAnnotations(listAnnotations(canvasId));
					setTargets([]);
				};
				window.__openloopCanvasOpen = (canvasId, snap) => {
					applySnapshot(canvasId, snap);
					hasEverOpened.current = true;
					persistOpen(true);
					refreshFromStorage(canvasId);
				};
				window.__openloopCanvasUpdate = (canvasId, snap) => {
					applySnapshot(canvasId, snap);
					if (!hasEverOpened.current) {
						hasEverOpened.current = true;
						persistOpen(true);
					}
					refreshFromStorage(canvasId);
				};
				return () => {
					delete window.__openloopCanvasOpen;
					delete window.__openloopCanvasUpdate;
				};
			}, []);
			const refreshFromStorage = async (canvasId) => {
				try {
					const res = await fetch(`/qoder-canvas/canvas/${canvasId}`);
					if (!res.ok) return;
					const snap = await res.json();
					if (snap?.kind === "qoder-canvas" && snap.canvasId === canvasId) setSnapshot((prev) => {
						if (prev !== null && snap.revision <= prev.revision) return prev;
						registerCanvasSnapshot(snap);
						return snap;
					});
				} catch {}
			};
			const saveAnnotation = () => {
				if (snapshot === null || note.trim().length === 0 || targets.length === 0) return;
				const trimmed = note.trim();
				pushCapsuleDraft(addAnnotation({
					canvasId: snapshot.canvasId,
					revision: snapshot.revision,
					targets,
					note: trimmed
				}));
				setAnnotations(listAnnotations(snapshot.canvasId));
				reportAnnotation({
					canvasId: snapshot.canvasId,
					revision: snapshot.revision,
					targets: targets.map((t) => t.kind === "node" || t.kind === "element" ? t.id : "text"),
					note: trimmed
				});
				showToast("评论已保存——已挂到输入框上方胶囊，发送时随消息发出");
				setTargets([]);
				setNote("");
			};
			(0, react.useEffect)(() => {
				if (targets.length > 0) setPanelOpen(true);
			}, [targets.length]);
			const onPanelDragStart = (e) => {
				const area = canvasAreaRef.current;
				if (area === null) return;
				const panel = e.target.closest("[data-annotation-float]");
				if (panel === null) return;
				const areaBox = area.getBoundingClientRect();
				const panelBox = panel.getBoundingClientRect();
				dragRef.current = {
					dx: e.clientX - panelBox.left,
					dy: e.clientY - panelBox.top
				};
				const onMove = (ev) => {
					const d = dragRef.current;
					if (d === null) return;
					const x = Math.max(0, Math.min(ev.clientX - d.dx - areaBox.left, areaBox.width - 120));
					const y = Math.max(0, Math.min(ev.clientY - d.dy - areaBox.top, areaBox.height - 60));
					setPanelPos({
						x,
						y
					});
				};
				const onUp = () => {
					dragRef.current = null;
					window.removeEventListener("pointermove", onMove);
					window.removeEventListener("pointerup", onUp);
				};
				window.addEventListener("pointermove", onMove);
				window.addEventListener("pointerup", onUp);
			};
			const modeHint = MODES.find((m) => m.key === mode)?.hint ?? "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasToggle, {
					open,
					onToggle: () => persistOpen(!open)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasDockHost, {
					open,
					width,
					onWidthChange: persistWidth,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							height: "100%",
							minWidth: 0
						},
						"data-openloop-canvas-workbench": true,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 8,
								padding: "10px 14px",
								borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 13,
										fontWeight: 650,
										flex: 1,
										minWidth: 0,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: snapshot !== null ? snapshot.canvas.title : "画布工作台"
								}),
								snapshot !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
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
								}) : null,
								snapshot !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setPanelOpen((v) => !v),
									title: "评论面板（悬浮窗）",
									style: {
										fontSize: 11,
										padding: "3px 9px",
										borderRadius: 6,
										border: panelOpen ? `1px solid ${ACCENT}` : "1px solid transparent",
										cursor: "pointer",
										background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))",
										color: panelOpen ? ACCENT : "var(--dsw-alias-label-secondary, inherit)",
										fontFamily: "inherit"
									},
									children: ["评论", annotations.length > 0 ? ` ${annotations.length}` : ""]
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => persistOpen(false),
									title: "收起（画布保留）",
									style: {
										fontSize: 11,
										padding: "3px 9px",
										borderRadius: 6,
										border: 0,
										cursor: "pointer",
										background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))",
										color: "var(--dsw-alias-label-secondary, inherit)",
										fontFamily: "inherit"
									},
									children: "收起"
								})
							]
						}), snapshot === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								flex: 1,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								gap: 10,
								padding: "48px 20px",
								color: "var(--dsw-alias-label-caption, #888)"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
								width: "40",
								height: "40",
								viewBox: "0 0 24 24",
								fill: "none",
								stroke: "currentColor",
								strokeWidth: "1.4",
								strokeLinecap: "round",
								strokeLinejoin: "round",
								opacity: "0.5",
								"aria-hidden": "true",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
									x: "3",
									y: "3",
									width: "18",
									height: "18",
									rx: "2.5"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 9h18M9 9v12" })]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: 12,
									lineHeight: 1.7,
									textAlign: "center"
								},
								children: [
									"还没有打开的画布",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: { fontSize: 11 },
										children: "让 Agent 用 canvas 工具画一个，或在对话流的画布卡片上点「⇱ 工作台」"
									})
								]
							})]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 5,
								padding: "6px 12px",
								borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.1))",
								flexShrink: 0
							},
							children: [
								MODES.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									title: m.hint,
									onClick: () => setMode(m.key),
									style: {
										fontSize: 11,
										padding: "3px 10px",
										borderRadius: 6,
										fontFamily: "inherit",
										cursor: "pointer",
										border: mode === m.key ? `1px solid ${ACCENT}` : "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
										background: mode === m.key ? "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)" : "none",
										color: mode === m.key ? ACCENT : "var(--dsw-alias-label-secondary, inherit)"
									},
									children: m.label
								}, m.key)),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										marginLeft: 4,
										fontSize: 10,
										color: "var(--dsw-alias-label-caption, #999)"
									},
									children: modeHint
								}),
								targets.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										marginLeft: "auto",
										fontSize: 10,
										color: ACCENT,
										fontWeight: 600
									},
									children: [
										"已选 ",
										targets.length,
										" 个目标 → 在评论面板写评注"
									]
								}) : null
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								flex: 1,
								minHeight: 0,
								overflow: "auto",
								padding: 14,
								position: "relative"
							},
							ref: canvasAreaRef,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasSurface, { snapshot }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasPinLayer, {
									snapshot,
									containerRef: canvasAreaRef,
									mode,
									callbacks: {
										onTargetsChange: (t) => {
											setTargets([...t]);
											setNote("");
										},
										onSave: () => saveAnnotation(),
										annotations,
										onEditAnnotation: (a) => setEditAnn(a),
										onDeleteAnnotation: (a) => {
											removeAnnotation(snapshot.canvasId, a.id);
											setAnnotations(listAnnotations(snapshot.canvasId));
										},
										onFocusNode: (id) => setFocusNodeId(id)
									}
								}),
								panelOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									"data-annotation-float": true,
									style: {
										position: "absolute",
										zIndex: 45,
										width: 280,
										maxHeight: "min(520px, calc(100% - 24px))",
										display: "flex",
										flexDirection: "column",
										borderRadius: 12,
										overflow: "hidden",
										background: "var(--dsw-alias-bg-layer-1, #fff)",
										border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2))",
										boxShadow: "0 12px 36px rgba(0,0,0,.26)",
										...panelPos !== null ? {
											left: panelPos.x,
											top: panelPos.y
										} : {
											right: 12,
											top: 12
										}
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										onPointerDown: onPanelDragStart,
										style: {
											display: "flex",
											alignItems: "center",
											gap: 6,
											padding: "7px 10px",
											cursor: "grab",
											userSelect: "none",
											borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.1))",
											background: "var(--dsw-alias-bg-layer-2, rgba(127,127,127,.05))"
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
												width: "10",
												height: "10",
												viewBox: "0 0 24 24",
												fill: "currentColor",
												opacity: "0.4",
												"aria-hidden": "true",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
														cx: "8",
														cy: "5",
														r: "1.6"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
														cx: "16",
														cy: "5",
														r: "1.6"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
														cx: "8",
														cy: "12",
														r: "1.6"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
														cx: "16",
														cy: "12",
														r: "1.6"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
														cx: "8",
														cy: "19",
														r: "1.6"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
														cx: "16",
														cy: "19",
														r: "1.6"
													})
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													fontSize: 11,
													fontWeight: 600,
													flex: 1
												},
												children: "评论"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setPanelOpen(false),
												title: "关闭面板",
												style: {
													border: 0,
													background: "none",
													padding: 0,
													cursor: "pointer",
													fontSize: 13,
													lineHeight: 1,
													color: "var(--dsw-alias-label-caption, #888)",
													fontFamily: "inherit"
												},
												children: "×"
											})
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											flex: 1,
											minHeight: 0,
											overflow: "auto"
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommentPanel, {
											targets,
											note,
											setNote,
											onRemoveTarget: (i) => setTargets((prev) => prev.filter((_, j) => j !== i)),
											onSave: saveAnnotation,
											onCancel: () => {
												setTargets([]);
												setNote("");
											},
											annotations,
											onEdit: (a) => setEditAnn(a),
											onDelete: (a) => {
												removeAnnotation(snapshot.canvasId, a.id);
												setAnnotations(listAnnotations(snapshot.canvasId));
											},
											focusNodeId
										})
									})]
								}) : null
							]
						})] })]
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnnotationCapsuleBar, {}),
				editAnn !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						position: "fixed",
						top: 60,
						left: "50%",
						transform: "translateX(-50%)",
						zIndex: 2147483100,
						width: 300,
						display: "flex",
						flexDirection: "column",
						gap: 7,
						padding: "10px 12px",
						borderRadius: 10,
						background: "var(--dsw-alias-bg-layer-1, #fff)",
						border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
						boxShadow: "0 8px 28px rgba(0,0,0,.22)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 10.5,
								fontWeight: 600,
								color: ACCENT
							},
							children: "编辑评论"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							value: editAnn.note,
							onChange: (e) => setEditAnn({
								...editAnn,
								note: e.target.value
							}),
							rows: 3,
							autoFocus: true,
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
								onClick: () => setEditAnn(null),
								style: {
									fontSize: 10.5,
									padding: "3px 10px",
									borderRadius: 6,
									border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
									background: "none",
									cursor: "pointer",
									fontFamily: "inherit",
									color: "inherit"
								},
								children: "取消"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									if (snapshot !== null) {
										updateAnnotationNote(snapshot.canvasId, editAnn.id, editAnn.note.trim());
										setAnnotations(listAnnotations(snapshot.canvasId));
									}
									setEditAnn(null);
								},
								disabled: editAnn.note.trim().length === 0,
								style: {
									fontSize: 10.5,
									padding: "3px 12px",
									borderRadius: 6,
									border: 0,
									cursor: "pointer",
									fontFamily: "inherit",
									color: "#fff",
									background: ACCENT
								},
								children: "保存"
							})]
						})
					]
				}) : null,
				toast !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						position: "fixed",
						bottom: 26,
						left: "50%",
						transform: "translateX(-50%)",
						zIndex: 2147483100,
						fontSize: 11,
						padding: "7px 14px",
						borderRadius: 9,
						color: "var(--dsw-alias-label-primary, inherit)",
						background: "var(--dsw-alias-bg-layer-1, #fff)",
						border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
						boxShadow: "0 8px 28px rgba(0,0,0,.25)"
					},
					children: toast
				}) : null
			] });
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
			ctx.effect(() => {
				const host = document.createElement("div");
				host.setAttribute("data-openloop-canvas-root", "");
				document.body.appendChild(host);
				let root;
				try {
					root = (0, react_dom_client.createRoot)(host);
					root.render((0, react.createElement)(CanvasWorkbench));
				} catch {}
				return () => {
					root?.unmount();
					host.remove();
				};
			}, "openloop-canvas: workbench mount");
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
