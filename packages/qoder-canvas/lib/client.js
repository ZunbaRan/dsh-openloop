window.__ModuleLoader__.load({
	id: "@openloop/dsh-qoder-canvas",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
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
		function ActionNode({ props }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: true,
				title: "M2 将启用：点击注入上下文草稿",
				style: {
					...nodeBase(),
					cursor: "not-allowed",
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
		function NodeRenderer({ node }) {
			const props = node.props;
			switch (node.type) {
				case "stat-card": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCardNode, { props });
				case "chart": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChartNode, { props });
				case "table": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TableNode, { props });
				case "key-value": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KeyValueNode, { props });
				case "markdown": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownNode, { props });
				case "callout": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CalloutNode, { props });
				case "action": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionNode, { props });
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
		function CanvasSurface({ snapshot }) {
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
						children: plainNodes.map((n) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NodeRenderer, { node: n }, n.id))
					}),
					sectionNodes.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							padding: "0 12px 12px",
							display: "flex",
							flexDirection: "column",
							gap: 12
						},
						children: sectionNodes.map((n) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionNode, {
							node: n,
							children: null
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
		/** 容错解析 presentationMeta 的快照（§5.3 惯例：无法解析返回 undefined 不抛错） */
		function canvasMetaFrom(value) {
			if (typeof value !== "object" || value === null) return void 0;
			const record = value;
			if (record.kind !== "qoder-canvas" || record.version !== 1) return void 0;
			const snapshot = record.snapshot;
			if (typeof snapshot !== "object" || snapshot === null) return void 0;
			const s = snapshot;
			if (s.kind !== "qoder-canvas" || typeof s.canvasId !== "string" || typeof s.revision !== "number") return void 0;
			const canvas = s.canvas;
			if (typeof canvas !== "object" || canvas === null) return void 0;
			const c = canvas;
			if (typeof c.title !== "string" || !Array.isArray(c.nodes)) return void 0;
			return snapshot;
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: { position: "relative" },
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasSurface, { snapshot: meta })
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
