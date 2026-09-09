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
		function NodeRenderer({ node, onAction, renderHtml }) {
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
				case "html": return renderHtml !== void 0 ? renderHtml(node) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						...nodeBase(),
						padding: 20,
						fontSize: 12,
						color: "var(--dsw-alias-label-caption, #888)"
					},
					children: [
						"自由 HTML 块（",
						String(props.title ?? node.id),
						"）——打开工作台查看与标注"
					]
				});
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
		function CanvasSurface({ snapshot, onAction, renderHtml }) {
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
								onAction,
								renderHtml
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
				zIndex: 2147483052,
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
					opacity: hover ? 1 : .55,
					transition: "opacity .15s ease, background .15s ease",
					display: open ? "none" : "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "var(--dsw-alias-label-secondary, inherit)"
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
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "3.5",
							y: "3.5",
							width: "17",
							height: "17",
							rx: "2.5"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3.5 12h17M12 3.5v17" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							cx: "12",
							cy: "12",
							r: "1.2",
							fill: "currentColor",
							stroke: "none"
						})
					]
				})
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
		/** 序列化安全：targets 里的元素引用（DOM 对象，JSON.stringify 循环引用会炸）在持久化前剥离（0.12.7） */
		function stripTransientTargets(targets) {
			return targets.map((t) => {
				if (t.kind === "html-element" && t.el !== void 0) {
					const { el: _drop, ...rest } = t;
					return rest;
				}
				return t;
			});
		}
		function addAnnotation(input) {
			const annotation = {
				...input,
				targets: stripTransientTargets(input.targets),
				id: `ann_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`,
				createdAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			writeAll(input.canvasId, [...readAll(input.canvasId), annotation]);
			return annotation;
		}
		/** 单个 target 的结构化块（node/element 带 DSL 源码；text 带所属节点定位；html-element 带 snippet） */
		function formatTargetBlock(t, nodes) {
			if (t.kind === "html-element") return formatHtmlElementTarget(t, nodes);
			if (t.kind === "node" || t.kind === "element") {
				const idx = nodes.findIndex((n) => n.id === t.id);
				const node = idx >= 0 ? nodes[idx] : void 0;
				const elementAttrs = t.kind === "element" ? ` element="${t.domPath}" tag="${t.tag}"${t.text !== void 0 && t.text.length > 0 ? ` text="${t.text.replace(/"/g, "&quot;")}"` : ""}` : "";
				if (node !== void 0) return `<target type="${node.type}" id="${node.id}" path="nodes[${idx}]"${elementAttrs}>\n${JSON.stringify(node, null, 2)}\n</target>`;
				return `<target id="${t.id}" note="not found in current revision"${elementAttrs}>${t.label}</target>`;
			}
			const idx = t.nodeId !== void 0 ? nodes.findIndex((n) => n.id === t.nodeId) : -1;
			return `<target type="text"${idx >= 0 ? ` in="nodes[${idx}]"` : t.nodeId !== void 0 ? ` in="${t.nodeId}"` : ""}>"${t.excerpt}"</target>`;
		}
		/** html-element target 块（0.12）：snippet 是 Agent 定位修改的主线索 */
		function formatHtmlElementTarget(t, nodes) {
			const idx = nodes.findIndex((n) => n.id === t.id);
			const pathAttr = idx >= 0 ? `nodes[${idx}]` : t.id;
			const textAttr = t.text !== void 0 && t.text.length > 0 ? ` text="${escapeAttr(t.text)}"` : "";
			const snippet = t.snippet.length > 0 && /[[@\d]/.test(t.snippet[0] ?? "") ? `\n${t.snippet}` : t.snippet;
			return `<target type="html" id="${t.id}" path="${pathAttr}" element="${escapeAttr(t.domPath)}" tag="${t.tag}"${textAttr}>\n${snippet}\n</target>\n定位说明：该元素在 html 节点 ${pathAttr} 的 source 内，无结构化路径——请以上方源码片段做文本匹配定位，修改后重发完整 source`;
		}
		/** 属性值转义（防注入破坏 XML 结构） */
		function escapeAttr(s) {
			return s.replace(/"/g, "&quot;").replace(/\n/g, " ");
		}
		/**
		* 同画布多条注释合并注入（S7.1）：共享一个定位头，逐条编号。
		* 头部不带方括号（真机教训：Lexical composer 的 markdown 插件会把 `[...]`
		* 误识别为 link 语法）；条目序号用 `#1`（`[1]` 有 link 风险、`1)` 行首有
		* 有序列表转换风险，`#1` 无 markdown 语义——`#` 后必须跟空格才是 heading）。
		*/
		function formatAnnotationBatch(snapshot, anns) {
			const nodes = snapshot.canvas.nodes ?? [];
			const multi = anns.length > 1;
			return `${`画布标注 · ${snapshot.canvas.title} ${snapshot.canvasId} · r${snapshot.revision}${multi ? `（${anns.length} 条）` : ""}`}\n${anns.map((ann, i) => {
				const block = ann.targets.map((t) => formatTargetBlock(t, nodes)).join("\n");
				return `${multi ? `#${i + 1} ` : ""}${block}\n评注：${ann.note}`;
			}).join("\n")}`;
		}
		//#endregion
		//#region src/client/composer-bridge.ts
		/** 定位 composer 元素（data-* 语义选择器，0.1.2 实证存在） */
		function findComposer() {
			return document.querySelector("[data-composer-input=\"true\"]");
		}
		/**
		* 向 composer 追加草稿文本。返回是否成功。
		*
		* 真机教训（2026-09-06，S7.1）：多行 insertText 在 DSH 的 Lexical 覆写里
		* 行为畸形——第一行总是跑到文档末尾（头部「画布标注 · ...」出现在消息
		* 最后而不是最前）。改为【逐行插入】（单行 insertText 行为 M0 验证可靠，
		* 行间用 insertParagraph 分段）。
		*/
		function injectComposerDraft(text, _options) {
			const el = findComposer();
			if (el === null) return false;
			el.focus();
			const lines = text.split("\n");
			let ok = true;
			for (let i = 0; i < lines.length; i += 1) {
				if (i > 0) try {
					document.execCommand("insertParagraph", false);
				} catch {
					ok = false;
				}
				const line = lines[i];
				if (line !== void 0 && line.length > 0) try {
					if (!document.execCommand("insertText", false, line)) el.dispatchEvent(new InputEvent("beforeinput", {
						bubbles: true,
						cancelable: true,
						inputType: "insertText",
						data: line
					}));
				} catch {
					ok = false;
				}
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
		let currentCanvas = null;
		function setCurrentCanvasRef(ref) {
			currentCanvas = ref;
		}
		function flushDraftsIntoComposer() {
			if (drafts.length === 0) {
				if (currentCanvas !== null) injectComposerDraft(`当前画布 · ${currentCanvas.title} ${currentCanvas.canvasId} · r${currentCanvas.revision}`);
				return;
			}
			const byCanvas = /* @__PURE__ */ new Map();
			for (const ann of drafts) {
				const list = byCanvas.get(ann.canvasId) ?? [];
				list.push(ann);
				byCanvas.set(ann.canvasId, list);
			}
			const parts = [];
			for (const [canvasId, anns] of byCanvas) {
				const snap = latestSnapshots.get(canvasId);
				if (snap !== void 0) {
					const revision = Math.max(...anns.map((a) => a.revision));
					parts.push(formatAnnotationBatch({
						canvasId,
						revision,
						canvas: snap.canvas
					}, anns));
				} else parts.push(`画布标注 · ${canvasId}\n${anns.map((a, i) => `#${i + 1} 评注：${a.note}`).join("\n")}`);
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
			const resendRef = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				const tryFlushAndResend = (input) => {
					if (resendRef.current) return;
					const sendBtn = findSendButton(findComposerFrame(input));
					flushDraftsIntoComposer();
					if (sendBtn === null) return;
					resendRef.current = true;
					setTimeout(() => {
						sendBtn.click();
						setTimeout(() => {
							resendRef.current = false;
						}, 120);
					}, 80);
				};
				const onKeydown = (e) => {
					if (resendRef.current) return;
					if (drafts.length === 0 && currentCanvas === null) return;
					if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
					const input = findComposerInput();
					if (input === null || !input.contains(e.target)) return;
					if ((input.textContent ?? "").trim().length === 0) return;
					e.preventDefault();
					e.stopImmediatePropagation();
					tryFlushAndResend(input);
				};
				const onClick = (e) => {
					if (resendRef.current) return;
					if (drafts.length === 0 && currentCanvas === null) return;
					const input = findComposerInput();
					if (input === null) return;
					const sendBtn = findSendButton(findComposerFrame(input));
					if (sendBtn !== null && sendBtn.contains(e.target)) {
						if ((input.textContent ?? "").trim().length === 0) return;
						e.preventDefault();
						e.stopImmediatePropagation();
						tryFlushAndResend(input);
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
		//#region src/canvas-app-bridge.ts
		/** 信封解析（魔数 + token 校验；失败返回 null——静默丢弃，防伪造/无关消息） */
		function parseEnvelope(data, expectToken) {
			if (typeof data !== "object" || data === null) return null;
			const env = data;
			if (env.__openloopCanvasApp !== true) return null;
			if (expectToken !== null && env.token !== expectToken) return null;
			if (typeof env.t !== "string" || env.t.length === 0) return null;
			return {
				t: env.t,
				get: (k) => env[k]
			};
		}
		/** 生成随机 token（host init 用） */
		function generateBridgeToken() {
			return `ca_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
		}
		var CanvasAppHostBridge = class {
			token;
			iframe;
			handlers;
			onMessage;
			disposed = false;
			pendingTheme;
			constructor(iframe, handlers = {}) {
				this.token = generateBridgeToken();
				this.iframe = iframe;
				this.handlers = handlers;
				this.onMessage = (ev) => {
					if (this.disposed) return;
					if (ev.source !== this.iframe.contentWindow) return;
					const hello = parseEnvelope(ev.data, null);
					if (hello !== null && hello.t === "hello") {
						console.info("[canvas-bridge] hello received — resending init");
						this.sendInit(this.pendingTheme);
						return;
					}
					const msg = parseEnvelope(ev.data, this.token);
					if (msg === null) return;
					switch (msg.t) {
						case "ready":
							console.info("[canvas-bridge] app ready");
							this.handlers.onReady?.();
							break;
						case "height": {
							const h = msg.get("height");
							if (typeof h === "number" && h > 0) this.handlers.onHeight?.(h);
							break;
						}
						case "annotation": {
							const p = msg.get("payload");
							if (p !== void 0 && typeof p === "object") this.handlers.onAnnotation?.(p);
							break;
						}
						case "action": {
							const n = msg.get("node");
							if (n !== void 0 && typeof n === "object") this.handlers.onAction?.(n);
							break;
						}
					}
				};
				window.addEventListener("message", this.onMessage);
			}
			/** iframe onload 后调用：下发 init（token + 可选主题变量）；theme 暂存供 hello 重发 */
			sendInit(theme) {
				this.pendingTheme = theme;
				this.iframe.contentWindow?.postMessage({
					__openloopCanvasApp: true,
					token: this.token,
					t: "init",
					theme
				}, "*");
			}
			/** 0.12.9：宿主点击「评论 N」→ 通知 iframe 弹出评注面板（交互反馈） */
			sendOpenPanel() {
				this.iframe.contentWindow?.postMessage({
					__openloopCanvasApp: true,
					token: this.token,
					t: "open-panel"
				}, "*");
			}
			sendSnapshot(snapshot, annotations) {
				console.info("[canvas-bridge] snapshot pushed");
				this.iframe.contentWindow?.postMessage({
					__openloopCanvasApp: true,
					token: this.token,
					t: "snapshot",
					snapshot,
					annotations
				}, "*");
			}
			dispose() {
				this.disposed = true;
				window.removeEventListener("message", this.onMessage);
			}
		};
		//#endregion
		//#region src/client/CanvasWorkbench.tsx
		/**
		* CanvasWorkbench：canvas dock 工作台（0.12 整体 iframe 化）。
		*
		* 架构（用户 2026-09-08 拍板「canvas 整体放 iframe 里运行」）：
		* - 画布区 = sandbox="allow-scripts" iframe（/qoder-canvas/app 壳端点）——
		*   DSL 渲染 + 标注交互（toolbar/评注面板）全部住在 iframe 内，交互零跨界
		* - 宿主保留：header（目录/版本菜单）、composer 胶囊链路、注释持久化
		* - 通信只有低频业务事件（canvas-app-bridge）：init 主题/snapshot 进；
		*   ready/height/annotation/action 出
		* - 降级：iframe 3s 未 ready（webServer 未注入的 headless/端点缺失）→
		*   直渲染 CanvasSurface（无标注，保底可看）
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
		/** 采集宿主主题关键变量下传 iframe（可选增强——不传走 fallback 也能跑） */
		const THEME_VARS = [
			"--dsw-alias-bg-layer-1",
			"--dsw-alias-bg-layer-2",
			"--dsw-alias-border-l1",
			"--dsw-alias-border-l2",
			"--dsw-alias-label-primary",
			"--dsw-alias-label-secondary",
			"--dsw-alias-label-caption",
			"--dsw-alias-state-business-primary",
			"--dsw-alias-interactive-bg-hover"
		];
		function collectTheme() {
			const out = {};
			try {
				const cs = getComputedStyle(document.documentElement);
				for (const v of THEME_VARS) {
					const val = cs.getPropertyValue(v).trim();
					if (val.length > 0) out[v] = val;
				}
				out["--openloop-host-font"] = getComputedStyle(document.body).fontFamily;
			} catch {}
			return out;
		}
		function CanvasWorkbench() {
			const [open, setOpen] = (0, react.useState)(readOpen);
			const [width, setWidth] = (0, react.useState)(readWidth);
			const [snapshot, setSnapshot] = (0, react.useState)(null);
			const [annotations, setAnnotations] = (0, react.useState)([]);
			const [toast, setToast] = (0, react.useState)(null);
			/** 工作区目录（M4） */
			const [catalogOpen, setCatalogOpen] = (0, react.useState)(false);
			const [catalogItems, setCatalogItems] = (0, react.useState)([]);
			const [revMenuOpen, setRevMenuOpen] = (0, react.useState)(false);
			/** iframe 桥状态 */
			const [appReady, setAppReady] = (0, react.useState)(false);
			const [appFailed, setAppFailed] = (0, react.useState)(false);
			const [iframeH, setIframeH] = (0, react.useState)(400);
			const iframeRef = (0, react.useRef)(null);
			const bridgeRef = (0, react.useRef)(null);
			/** 最新数据 ref（桥回调闭包读最新值——避免闭包旧值） */
			const snapshotRef = (0, react.useRef)(null);
			const annotationsRef = (0, react.useRef)([]);
			snapshotRef.current = snapshot;
			annotationsRef.current = annotations;
			(0, react.useEffect)(() => {
				const onDiag = (ev) => {
					const d = ev.data;
					if (d?.__openloopCanvasAppDiag === true) console.info("[canvas-app-diag]", d.kind, d.message ?? "");
				};
				window.addEventListener("message", onDiag);
				return () => {
					window.removeEventListener("message", onDiag);
				};
			}, []);
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
			/** M4 工作区目录：拉清单（列表端点；失败静默）+ 空态诊断（lastSaveError 自浮现） */
			const [catalogDiag, setCatalogDiag] = (0, react.useState)(null);
			const refreshCatalog = async () => {
				try {
					const res = await fetch("/qoder-canvas/list");
					if (!res.ok) return;
					const body = await res.json();
					if (Array.isArray(body.items)) setCatalogItems(body.items);
					try {
						const d = await fetch("/qoder-canvas/diag");
						if (d.ok) {
							const dj = await d.json();
							setCatalogDiag(dj.lastSaveError ?? null);
						}
					} catch {}
				} catch {}
			};
			/** M4 切换画布（目录点击）：拉指定 canvas 最新快照 + 注释跟随 */
			const openCanvas = async (canvasId) => {
				setSnapshot(null);
				setAnnotations([]);
				try {
					const res = await fetch(`/qoder-canvas/canvas/${canvasId}`);
					if (res.ok) {
						const snap = await res.json();
						if (snap?.kind === "qoder-canvas" && snap.canvasId === canvasId) {
							setSnapshot(snap);
							registerCanvasSnapshot(snap);
						}
					}
				} catch {}
				setAnnotations(listAnnotations(canvasId));
				setCatalogOpen(false);
			};
			/** M4 版本切换：读指定 rev 快照（标注按 canvasId 共享，天然跨版本） */
			const openRevision = async (canvasId, rev) => {
				if (snapshot !== null && snapshot.canvasId === canvasId && snapshot.revision === rev) {
					setRevMenuOpen(false);
					return;
				}
				try {
					const res = await fetch(`/qoder-canvas/canvas/${canvasId}?rev=${rev}`);
					if (!res.ok) {
						setRevMenuOpen(false);
						return;
					}
					const snap = await res.json();
					if (snap?.kind === "qoder-canvas" && snap.canvasId === canvasId && snap.revision === rev) {
						setSnapshot(snap);
						registerCanvasSnapshot(snap);
					}
				} catch {}
				setRevMenuOpen(false);
			};
			(0, react.useEffect)(() => {
				setCurrentCanvasRef(snapshot !== null && open ? {
					canvasId: snapshot.canvasId,
					revision: snapshot.revision,
					title: snapshot.canvas.title
				} : null);
			}, [snapshot, open]);
			(0, react.useEffect)(() => {
				const iframe = iframeRef.current;
				if (iframe === null || snapshot === null) return;
				iframe.setAttribute("sandbox", "allow-scripts");
				iframe.setAttribute("src", "/qoder-canvas/app");
				const bridge = new CanvasAppHostBridge(iframe, {
					onReady: () => {
						setAppReady(true);
						setAppFailed(false);
					},
					onHeight: (h) => {
						setIframeH(Math.min(Math.max(h, 200), 4e3));
					},
					onAnnotation: (payload) => {
						pushCapsuleDraft(addAnnotation({
							canvasId: payload.canvasId,
							revision: payload.revision,
							targets: payload.targets,
							note: payload.note
						}));
						setAnnotations(listAnnotations(payload.canvasId));
						reportAnnotation({
							canvasId: payload.canvasId,
							revision: payload.revision,
							targets: payload.targets.map((t) => t.kind === "node" || t.kind === "element" || t.kind === "html-element" ? String(t.id ?? "") : "text"),
							note: payload.note
						});
						showToast("评论已保存——已挂到输入框上方胶囊，发送时随消息发出");
					},
					onAction: (node) => {
						const intent = typeof node.props.intent === "string" ? node.props.intent : node.id;
						const ctx = typeof node.props.context === "object" && node.props.context !== null ? JSON.stringify(node.props.context) : "";
						injectComposerDraft(`${intent}${ctx.length > 0 ? `\ncontext: ${ctx}` : ""}`);
					}
				});
				bridgeRef.current = bridge;
				const failTimer = setTimeout(() => {
					setAppReady((ready) => {
						if (!ready) setAppFailed(true);
						return ready;
					});
				}, 3e3);
				const onLoad = () => {
					bridge.sendInit(collectTheme());
				};
				iframe.addEventListener("load", onLoad);
				return () => {
					clearTimeout(failTimer);
					iframe.removeEventListener("load", onLoad);
					bridge.dispose();
					bridgeRef.current = null;
				};
			}, [snapshot === null]);
			(0, react.useEffect)(() => {
				if (!appReady || snapshot === null) return;
				bridgeRef.current?.sendSnapshot(snapshot, annotations);
			}, [
				appReady,
				snapshot,
				annotations
			]);
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
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										setCatalogOpen((v) => !v);
										if (!catalogOpen) refreshCatalog();
									},
									title: "工作区画布目录",
									style: {
										fontSize: 11,
										padding: "3px 9px",
										borderRadius: 6,
										border: catalogOpen ? `1px solid ${ACCENT}` : "1px solid transparent",
										cursor: "pointer",
										background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))",
										color: catalogOpen ? ACCENT : "var(--dsw-alias-label-secondary, inherit)",
										fontFamily: "inherit"
									},
									children: "目录"
								}),
								snapshot !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: { position: "relative" },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => setRevMenuOpen((v) => !v),
										title: `版本历史 · ${snapshot.canvasId}@r${snapshot.revision}`,
										style: {
											display: "inline-flex",
											alignItems: "center",
											gap: 4,
											fontSize: 10,
											color: "var(--dsw-alias-label-caption, #888)",
											background: "none",
											border: revMenuOpen ? `1px solid ${ACCENT}` : "1px solid transparent",
											borderRadius: 5,
											padding: "2px 6px",
											cursor: "pointer",
											fontFamily: "inherit"
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
												width: "11",
												height: "11",
												viewBox: "0 0 24 24",
												fill: "none",
												stroke: "currentColor",
												strokeWidth: "2",
												strokeLinecap: "round",
												strokeLinejoin: "round",
												"aria-hidden": "true",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 12a9 9 3 0 9-9 9.75 9.75 0 0 1-6.74 2.74L3 8" }),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 3v5h5" }),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 7v5l4 2" })
												]
											}),
											"版本 r",
											snapshot.revision,
											" ▾"
										]
									}), revMenuOpen ? (() => {
										const item = catalogItems.find((c) => c.canvasId === snapshot.canvasId);
										const revs = item !== void 0 && item.revisions.length > 0 ? item.revisions : [snapshot.revision];
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												position: "absolute",
												right: 0,
												top: "100%",
												marginTop: 4,
												zIndex: 60,
												minWidth: 120,
												borderRadius: 8,
												padding: "4px",
												background: "var(--dsw-alias-bg-layer-1, #fff)",
												border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
												boxShadow: "0 8px 24px rgba(0,0,0,.2)"
											},
											children: [...revs].reverse().map((r) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => {
													openRevision(snapshot.canvasId, r);
												},
												style: {
													display: "block",
													width: "100%",
													textAlign: "left",
													fontSize: 10.5,
													padding: "4px 8px",
													borderRadius: 5,
													border: 0,
													cursor: "pointer",
													fontFamily: "ui-monospace, Menlo, monospace",
													background: r === snapshot.revision ? "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)" : "none",
													color: r === snapshot.revision ? ACCENT : "inherit"
												},
												children: [
													"r",
													r,
													r === snapshot.revision ? " · 当前" : ""
												]
											}, r))
										});
									})() : null]
								}) : null,
								snapshot !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										bridgeRef.current?.sendOpenPanel();
										showToast("已打开画布内的评论面板");
									},
									title: "打开评论面板（画布内悬浮）",
									style: {
										fontSize: 11,
										padding: "3px 9px",
										borderRadius: 6,
										border: 0,
										cursor: "pointer",
										background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))",
										color: annotations.length > 0 ? ACCENT : "var(--dsw-alias-label-secondary, inherit)",
										fontFamily: "inherit",
										fontWeight: annotations.length > 0 ? 600 : 400
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
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								flex: 1,
								minHeight: 0,
								display: "flex",
								flexDirection: "column",
								overflow: "auto",
								padding: 14,
								position: "relative"
							},
							children: [
								catalogOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										position: "absolute",
										right: 12,
										top: 0,
										zIndex: 65,
										width: 320,
										maxHeight: "min(480px, calc(100% - 24px))",
										overflow: "auto",
										borderRadius: 12,
										background: "var(--dsw-alias-bg-layer-1, #fff)",
										border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2))",
										boxShadow: "0 12px 36px rgba(0,0,0,.26)"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											alignItems: "center",
											gap: 6,
											padding: "8px 12px",
											borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.1))",
											background: "var(--dsw-alias-bg-layer-2, rgba(127,127,127,.05))"
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: {
													fontSize: 11,
													fontWeight: 600,
													flex: 1
												},
												children: [
													"工作区画布（",
													catalogItems.length,
													"）"
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => {
													refreshCatalog();
												},
												title: "刷新目录",
												style: {
													border: 0,
													background: "none",
													padding: 2,
													cursor: "pointer",
													color: "var(--dsw-alias-label-caption, #888)",
													display: "flex",
													fontFamily: "inherit"
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
													width: "13",
													height: "13",
													viewBox: "0 0 24 24",
													fill: "none",
													stroke: "currentColor",
													strokeWidth: "2",
													strokeLinecap: "round",
													strokeLinejoin: "round",
													"aria-hidden": "true",
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 12a9 9 0 1 1-2.64-6.36L21 8" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 3v5h-5" })]
												})
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setCatalogOpen(false),
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
									}), catalogItems.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											padding: "20px 14px",
											fontSize: 11,
											color: "var(--dsw-alias-label-caption, #888)",
											textAlign: "center"
										},
										children: [
											"还没有画布产物",
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: { fontSize: 10 },
												children: "让 Agent 用 canvas 工具生成第一个（历史画布首次续编后入册）"
											}),
											catalogDiag !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: {
													marginTop: 8,
													fontSize: 9.5,
													color: "var(--dsw-alias-state-business-danger, #d0453e)",
													textAlign: "left",
													fontFamily: "ui-monospace, Menlo, monospace",
													maxHeight: 80,
													overflow: "auto"
												},
												children: ["落盘诊断：", catalogDiag]
											}) : null
										]
									}) : catalogItems.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											alignItems: "center",
											gap: 4,
											padding: "8px 6px 8px 12px",
											borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.06))",
											background: snapshot?.canvasId === item.canvasId ? "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 8%, transparent)" : "none"
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => {
												openCanvas(item.canvasId);
											},
											style: {
												flex: 1,
												minWidth: 0,
												textAlign: "left",
												border: 0,
												background: "none",
												cursor: "pointer",
												padding: 0,
												fontFamily: "inherit",
												color: "inherit"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: {
													display: "flex",
													alignItems: "center",
													gap: 6
												},
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: {
														fontSize: 11.5,
														fontWeight: 600,
														flex: 1,
														minWidth: 0,
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap"
													},
													children: item.title
												}), item.revisions.length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													style: {
														fontSize: 9.5,
														color: ACCENT,
														fontWeight: 600
													},
													children: [
														"r",
														item.revision,
														" · ",
														item.revisions.length,
														"版"
													]
												}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													style: {
														fontSize: 9.5,
														color: "var(--dsw-alias-label-caption, #999)"
													},
													children: ["r", item.revision]
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: {
													fontSize: 9.5,
													color: "var(--dsw-alias-label-caption, #999)",
													marginTop: 2,
													fontFamily: "ui-monospace, Menlo, monospace"
												},
												children: [item.canvasId, item.updatedAt.length > 0 ? ` · ${new Date(item.updatedAt).toLocaleString("zh-CN", {
													month: "numeric",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit"
												})}` : ""]
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											title: `删除「${item.title}」（全部版本）`,
											onClick: (e) => {
												e.stopPropagation();
												if (!window.confirm(`删除画布「${item.title}」（${item.canvasId}，全部 ${item.revisions.length} 个版本）？此操作不可恢复。`)) return;
												(async () => {
													try {
														if ((await fetch(`/qoder-canvas/delete/${item.canvasId}`, { method: "POST" })).ok) {
															if (snapshot?.canvasId === item.canvasId) {
																setSnapshot(null);
																setAnnotations([]);
															}
															await refreshCatalog();
															showToast(`已删除「${item.title}」`);
														} else showToast("删除失败");
													} catch {
														showToast("删除失败（网络）");
													}
												})();
											},
											style: {
												flexShrink: 0,
												border: 0,
												background: "none",
												padding: "3px 6px",
												cursor: "pointer",
												fontSize: 13,
												lineHeight: 1,
												color: "var(--dsw-alias-state-business-danger, #d0453e)",
												fontFamily: "inherit",
												opacity: .7
											},
											children: "×"
										})]
									}, item.canvasId))]
								}) : null,
								appFailed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										padding: 10,
										fontSize: 11,
										color: "var(--dsw-alias-label-caption, #888)",
										border: "1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,.25))",
										borderRadius: 8,
										marginBottom: 10
									},
									children: "画布沙箱应用未加载（降级直渲染——标注交互不可用，查看无碍）"
								}) : null,
								appFailed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasSurface, { snapshot }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
									ref: iframeRef,
									title: `canvas-app-${snapshot.canvasId}`,
									style: {
										width: "100%",
										flex: 1,
										minHeight: 240,
										border: 0,
										display: "block",
										borderRadius: 10,
										background: "var(--dsw-alias-bg-layer-1, #fff)"
									}
								})
							]
						})]
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnnotationCapsuleBar, {}),
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
