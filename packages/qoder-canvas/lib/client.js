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
		/** 进 composer 的草稿格式：引用头 + 评注（纯文本胶囊风格） */
		function formatAnnotationDraft(snapshot, targets, note) {
			const lines = targets.map((t) => t.kind === "node" ? `▸ ${t.id} ${t.label}` : `▸ 文本 "${t.excerpt}"`);
			return `[画布标注 · ${snapshot.canvas.title} ${snapshot.canvasId}@r${snapshot.revision}]\n${lines.join("\n")}\n${note}`;
		}
		//#endregion
		//#region src/client/AnnotationOverlay.tsx
		/**
		* AnnotationOverlay v2（M2.5，用户 2026-09-05 拍板的交互重做）：
		* 「浏览器检查器选择器 + CodeBuddy 注释」模型：
		*
		* 1. 标注模式：节点 hover → outline 高亮 + 角标 badge（检查器感）；
		*    点选 → 高亮固定 + 选中元素右上悬浮「💬 评论」按钮
		* 2. 文本：画布内文本选中（浏览器原生 selection）→ 选区末端悬浮「评论」按钮
		* 3. 框选：拖框圈节点 → 松手【直接弹出评注输入框】（用户拍板，少一步点击）
		* 4. 评注输入框（悬浮可取消）→ 保存 → 草稿注入 composer（引用头+评注）
		*    + 注释持久化到画布（元素角标 ①，hover 弹出详情卡可编辑/删除）
		*
		* 事件模型（v0.2.1 教训保留）：蒙层 pointer-events:auto + cursor:crosshair；
		* 点选/框选/悬停命中全部走【纯几何法】（遍历节点 rect），不依赖 elementsFromPoint。
		*/
		const ACCENT = "var(--dsw-alias-state-business-primary, #4176e6)";
		const QUICK_PHRASES = [
			"太小了",
			"信息过时",
			"这里错了",
			"删掉这块"
		];
		/** node id → 人类可读描述（类型 + 标题/首行） */
		function nodeLabelOf(node) {
			const p = node.props;
			return typeof p.title === "string" && p.title.length > 0 ? p.title : typeof p.label === "string" && p.label.length > 0 ? p.label : typeof p.text === "string" && p.text.length > 0 ? p.text.length > 24 ? `${p.text.slice(0, 24)}…` : p.text : node.type;
		}
		function normalizeRect(r) {
			return {
				x: Math.min(r.x, r.x + r.w),
				y: Math.min(r.y, r.y + r.h),
				w: Math.abs(r.w),
				h: Math.abs(r.h)
			};
		}
		/** 几何命中：surface 内找包含坐标点的最小面积 node */
		function hitNode(surface, clientX, clientY) {
			let best = null;
			for (const el of surface.querySelectorAll("[data-canvas-node]")) {
				const r = el.getBoundingClientRect();
				if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) continue;
				const area = r.width * r.height;
				const id = el.getAttribute("data-canvas-node");
				if (id !== null && id.length > 0 && (best === null || area < best.area)) best = {
					id,
					area,
					rect: r
				};
			}
			return best === null ? null : {
				id: best.id,
				rect: best.rect
			};
		}
		function AnnotationOverlay({ snapshot, containerRef }) {
			const [active, setActive] = (0, react.useState)(false);
			const [hoveredId, setHoveredId] = (0, react.useState)(null);
			const [lockedId, setLockedId] = (0, react.useState)(null);
			const [targets, setTargets] = (0, react.useState)([]);
			const [draftRect, setDraftRect] = (0, react.useState)(null);
			const [note, setNote] = (0, react.useState)("");
			const [noteBox, setNoteBox] = (0, react.useState)(null);
			const [annotations, setAnnotations] = (0, react.useState)(() => listAnnotations(snapshot.canvasId));
			const [editAnn, setEditAnn] = (0, react.useState)(null);
			const [toast, setToast] = (0, react.useState)(null);
			const dragStart = (0, react.useRef)(null);
			const surfaceRef = containerRef;
			const nodeById = new Map(snapshot.canvas.nodes.map((n) => [n.id, n]));
			const showToast = (msg) => {
				setToast(msg);
				setTimeout(() => {
					setToast((cur) => cur === msg ? null : cur);
				}, 2200);
			};
			/** 文本选择监听（仅画布内）：selection 完成 → targets = 文本节选 + 浮评论按钮 */
			(0, react.useEffect)(() => {
				if (!active) return;
				const onSel = () => {
					const sel = window.getSelection();
					if (sel === null || sel.isCollapsed || sel.rangeCount === 0) return;
					const range = sel.getRangeAt(0);
					const container = range.commonAncestorContainer;
					const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
					if (el === null || surfaceRef.current?.contains(el) !== true) return;
					const text = sel.toString().trim();
					if (text.length < 4) return;
					const rects = range.getClientRects();
					const last = rects[rects.length - 1];
					if (last === void 0) return;
					const box = surfaceRef.current.getBoundingClientRect();
					setTargets([{
						kind: "text",
						excerpt: text.length > 60 ? `${text.slice(0, 60)}…` : text
					}]);
					setNoteBox({
						x: last.right - box.left,
						y: last.bottom - box.top + 6,
						w: 320,
						h: 0
					});
				};
				document.addEventListener("mouseup", onSel);
				return () => document.removeEventListener("mouseup", onSel);
			}, [active, surfaceRef]);
			/** 收集 targets（单节点锁定/框选/文本已各自写入 setTargets）后弹评注框 */
			const openNoteBox = (anchor) => {
				setNoteBox(anchor);
			};
			const saveAnnotation = () => {
				const trimmed = note.trim();
				if (trimmed.length === 0 || targets.length === 0) return;
				const text = formatAnnotationDraft(snapshot, targets, trimmed);
				const ok = injectComposerDraft(text);
				addAnnotation({
					canvasId: snapshot.canvasId,
					revision: snapshot.revision,
					targets,
					note: trimmed
				});
				setAnnotations(listAnnotations(snapshot.canvasId));
				reportAnnotation({
					canvasId: snapshot.canvasId,
					revision: snapshot.revision,
					targets: targets.map((t) => t.kind === "node" ? t.id : "text"),
					note: trimmed
				});
				showToast(ok ? "注释已保存并注入输入框草稿" : "注释已保存；注入失败已复制到剪贴板");
				if (!ok) try {
					navigator.clipboard?.writeText(text);
				} catch {}
				setTargets([]);
				setLockedId(null);
				setNote("");
				setNoteBox(null);
				setActive(false);
			};
			/** 评注详情卡：hover 元素角标弹出 */
			const annForNode = (nodeId) => annotations.filter((a) => a.targets.some((t) => t.kind === "node" && t.id === nodeId));
			if (!active) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => setActive(true),
				title: "标注画布：点选/框选元素或选中文本，写评注注入输入框",
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
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
							children: "点选 / 框选 / 选文本"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setActive(false);
								setTargets([]);
								setLockedId(null);
								setNoteBox(null);
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
					style: {
						position: "absolute",
						inset: 0,
						zIndex: 30,
						background: "rgba(0,0,0,.04)",
						cursor: "crosshair",
						pointerEvents: "auto",
						userSelect: "none"
					},
					onPointerMove: (e) => {
						const start = dragStart.current;
						const box = surfaceRef.current?.getBoundingClientRect();
						if (start !== null && box !== void 0) {
							setDraftRect({
								x: start.x,
								y: start.y,
								w: e.clientX - box.left - start.x,
								h: e.clientY - box.top - start.y
							});
							setHoveredId(null);
							return;
						}
						const surface = surfaceRef.current;
						if (surface === null) return;
						const hit = hitNode(surface, e.clientX, e.clientY);
						setHoveredId(hit?.id ?? null);
					},
					onPointerDown: (e) => {
						if (e.button !== 0) return;
						const box = surfaceRef.current?.getBoundingClientRect();
						if (box === void 0) return;
						dragStart.current = {
							x: e.clientX - box.left,
							y: e.clientY - box.top
						};
						setDraftRect({
							x: e.clientX - box.left,
							y: e.clientY - box.top,
							w: 0,
							h: 0
						});
					},
					onPointerUp: () => {
						const rect = draftRect;
						dragStart.current = null;
						setDraftRect(null);
						if (rect === null) return;
						const n = normalizeRect(rect);
						if (n.w < 10 && n.h < 10) {
							const surface = surfaceRef.current;
							if (surface === null) return;
							const box = surface.getBoundingClientRect();
							const hit = hitNode(surface, box.left + n.x, box.top + n.y);
							if (hit !== null) {
								const node = nodeById.get(hit.id);
								if (node !== void 0) {
									setLockedId(hit.id);
									setTargets([{
										kind: "node",
										id: hit.id,
										label: nodeLabelOf(node)
									}]);
									const box = surface.getBoundingClientRect();
									openNoteBox({
										x: hit.rect.right - box.left,
										y: hit.rect.top - box.top,
										w: 320,
										h: 0
									});
								}
							}
							return;
						}
						const surface = surfaceRef.current;
						if (surface === null) return;
						const box = surface.getBoundingClientRect();
						const hits = [];
						for (const el of surface.querySelectorAll("[data-canvas-node]")) {
							const r = el.getBoundingClientRect();
							const nx = r.left - box.left, ny = r.top - box.top;
							if (nx < n.x + n.w && nx + r.width > n.x && ny < n.y + n.h && ny + r.height > n.y) {
								const id = el.getAttribute("data-canvas-node");
								const node = id !== null ? nodeById.get(id) : void 0;
								if (node !== void 0 && id !== null) hits.push({
									kind: "node",
									id,
									label: nodeLabelOf(node)
								});
							}
						}
						if (hits.length > 0) {
							setTargets(hits);
							setLockedId(null);
							openNoteBox({
								x: n.x + n.w,
								y: n.y,
								w: 320,
								h: 0
							});
						}
					},
					children: [
						draftRect !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
							...normalizeRect(draftRect),
							position: "absolute",
							border: `1.5px dashed ${ACCENT}`,
							background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent)",
							borderRadius: 4,
							pointerEvents: "none"
						} }) : null,
						hoveredId !== null && hoveredId !== lockedId && !targets.some((t) => t.kind === "node" && t.id === hoveredId) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HighlightRect, {
							surface: surfaceRef.current,
							nodeId: hoveredId,
							borderStyle: "outline"
						}) : null,
						targets.filter((t) => t.kind === "node").map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HighlightRect, {
							surface: surfaceRef.current,
							nodeId: t.id,
							borderStyle: "solid"
						}, t.id)),
						snapshot.canvas.nodes.map((n) => {
							const anns = annForNode(n.id);
							if (anns.length === 0) return null;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnnotationBadge, {
								surface: surfaceRef.current,
								nodeId: n.id,
								anns,
								onEdit: (a) => setEditAnn(a),
								onDelete: (a) => {
									removeAnnotation(snapshot.canvasId, a.id);
									setAnnotations(listAnnotations(snapshot.canvasId));
								}
							}, n.id);
						})
					]
				}),
				noteBox !== null && targets.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						position: "absolute",
						left: Math.max(8, Math.min(noteBox.x - 320, (surfaceRef.current?.getBoundingClientRect().width ?? 400) - 340)),
						top: noteBox.y,
						zIndex: 50,
						width: 320,
						display: "flex",
						flexDirection: "column",
						gap: 7,
						padding: "10px 12px",
						borderRadius: 10,
						background: "var(--dsw-alias-bg-layer-1, #fff)",
						border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
						boxShadow: "0 8px 28px rgba(0,0,0,.2)"
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
									color: ACCENT,
									maxWidth: "100%",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								children: [t.kind === "node" ? `${t.id} ${t.label}` : `文本 "${t.excerpt}"`, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setTargets((prev) => prev.filter((_, j) => j !== i)),
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
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								gap: 5,
								flexWrap: "wrap"
							},
							children: QUICK_PHRASES.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setNote((cur) => cur.length > 0 ? `${cur}；${p}` : p),
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
								children: p
							}, p))
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
								onClick: () => {
									setNoteBox(null);
									setTargets([]);
									setLockedId(null);
									setNote("");
								},
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
								onClick: saveAnnotation,
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
								children: "保存"
							})]
						})
					]
				}) : null,
				editAnn !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnnotationEditPopover, {
					ann: editAnn,
					onSave: (note) => {
						updateAnnotationNote(snapshot.canvasId, editAnn.id, note);
						setAnnotations(listAnnotations(snapshot.canvasId));
						setEditAnn(null);
					},
					onClose: () => setEditAnn(null)
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
		/** 节点高亮框（hover outline / 锁定 solid） */
		function HighlightRect({ surface, nodeId, borderStyle }) {
			if (surface === null) return null;
			const el = surface.querySelector(`[data-canvas-node="${CSS.escape(nodeId)}"]`);
			if (el === null) return null;
			const box = surface.getBoundingClientRect();
			const r = el.getBoundingClientRect();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
				position: "absolute",
				left: r.left - box.left - 3,
				top: r.top - box.top - 3,
				width: r.width + 6,
				height: r.height + 6,
				border: borderStyle === "outline" ? `2px dashed ${ACCENT}` : `2px solid ${ACCENT}`,
				borderRadius: 8,
				pointerEvents: "none",
				boxShadow: borderStyle === "solid" ? `0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 18%, transparent)` : "none"
			} });
		}
		/** 已保存注释角标（①；hover 详情卡） */
		function AnnotationBadge({ surface, nodeId, anns, onEdit, onDelete }) {
			const [hover, setHover] = (0, react.useState)(false);
			if (surface === null) return null;
			const el = surface.querySelector(`[data-canvas-node="${CSS.escape(nodeId)}"]`);
			if (el === null) return null;
			const box = surface.getBoundingClientRect();
			const r = el.getBoundingClientRect();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					position: "absolute",
					left: r.right - box.left - 10,
					top: r.top - box.top - 8,
					zIndex: 35
				},
				onPointerEnter: () => setHover(true),
				onPointerLeave: () => setHover(false),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						minWidth: 17,
						height: 17,
						padding: "0 4px",
						borderRadius: 999,
						fontSize: 10,
						fontWeight: 700,
						color: "#fff",
						background: ACCENT,
						boxShadow: "0 2px 8px rgba(0,0,0,.2)",
						cursor: "pointer"
					},
					children: anns.length
				}), hover ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						position: "absolute",
						left: 0,
						top: 20,
						zIndex: 55,
						width: 260,
						display: "flex",
						flexDirection: "column",
						gap: 6,
						padding: "8px 10px",
						borderRadius: 9,
						background: "var(--dsw-alias-bg-layer-1, #fff)",
						border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
						boxShadow: "0 8px 26px rgba(0,0,0,.2)",
						userSelect: "text"
					},
					children: anns.map((a) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 6,
							alignItems: "flex-start",
							fontSize: 11,
							lineHeight: 1.5
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									flex: 1,
									minWidth: 0
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
									padding: 0
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
									padding: 0
								},
								children: "🗑"
							})
						]
					}, a.id))
				}) : null]
			});
		}
		/** 注释编辑弹层 */
		function AnnotationEditPopover({ ann, onSave, onClose }) {
			const [note, setNote] = (0, react.useState)(ann.note);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					position: "absolute",
					top: 40,
					left: "50%",
					transform: "translateX(-50%)",
					zIndex: 70,
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
						children: "编辑注释"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						value: note,
						onChange: (e) => setNote(e.target.value),
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
							onClick: onClose,
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
							onClick: () => onSave(note.trim()),
							disabled: note.trim().length === 0,
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
			});
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
				const text = formatAnnotationDraft(snapshot, [{
					kind: "node",
					id: node.id,
					label
				}], `执行动作：${intent}${ctxText.length > 0 ? `（${ctxText}）` : ""}`);
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
