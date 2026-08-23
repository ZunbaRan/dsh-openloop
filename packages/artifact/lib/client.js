window.__ModuleLoader__.load({
	id: "@openloop/dsh-html-artifact",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _openloop_dsh_base_client = require("@openloop/dsh-base/client");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/contract.ts
		const ARTIFACT_HEIGHT_MESSAGE = "openloop-artifact:height";
		const ARTIFACT_FETCH_MESSAGE = "openloop-artifact:fetch";
		const ARTIFACT_FETCH_RESULT_MESSAGE = "openloop-artifact:fetch-result";
		function artifactMetaFrom(value) {
			if (typeof value !== "object" || value === null) return void 0;
			const record = value;
			if (record.kind !== "openloop.html-artifact" || record.version !== 1) return void 0;
			if (typeof record.title !== "string" || typeof record.html !== "string" || typeof record.path !== "string") return void 0;
			if (record.runtime !== "static" && record.runtime !== "scripts" && record.runtime !== "network") return void 0;
			return {
				kind: "openloop.html-artifact",
				version: 1,
				title: record.title,
				html: record.html,
				path: record.path,
				runtime: record.runtime
			};
		}
		//#endregion
		//#region src/shell.ts
		const ARTIFACT_CSP = [
			"default-src 'none'",
			"script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:",
			"style-src 'unsafe-inline'",
			"img-src data: blob:",
			"media-src data: blob:",
			"worker-src blob:",
			"connect-src 'none'",
			"font-src 'none'",
			"frame-src 'none'",
			"object-src 'none'",
			"base-uri 'none'",
			"form-action 'none'"
		].join("; ");
		const CSS = `
:root {
  color-scheme: light dark;
  --background: var(--openloop-background, light-dark(#f7f8fa, #111318));
  --foreground: var(--openloop-foreground, light-dark(#17191d, #f2f4f7));
  --muted: var(--openloop-muted, light-dark(rgb(23 25 29 / 58%), rgb(242 244 247 / 58%)));
  --surface: var(--openloop-surface, light-dark(rgb(255 255 255 / 82%), rgb(255 255 255 / 6%)));
  --elevated: var(--openloop-elevated, light-dark(#fff, #1b1e25));
  --border: var(--openloop-border, light-dark(rgb(20 25 34 / 11%), rgb(255 255 255 / 12%)));
  --accent: var(--openloop-accent, light-dark(#4d76e8, #84a4ff));
  --radius: 18px;
}
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body { background: var(--background); color: var(--foreground); font: 400 14px/1.55 system-ui, -apple-system, sans-serif; padding: 18px; }
h1, h2, h3 { letter-spacing: -.025em; line-height: 1.25; }
h1 { font-size: clamp(24px, 4vw, 42px); }
h2 { font-size: clamp(18px, 2.4vw, 26px); }
.artifact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.artifact-panel { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); padding: 18px; box-shadow: 0 16px 40px rgb(0 0 0 / 7%); }
.artifact-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; margin-bottom: 14px; }
.artifact-muted { color: var(--muted); }
.artifact-value { font-size: 30px; font-weight: 680; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
button, input, select, textarea { font: inherit; }
button { border: 1px solid var(--border); border-radius: 999px; background: var(--elevated); color: var(--foreground); padding: 7px 13px; cursor: pointer; }
button:hover, button[aria-pressed="true"] { border-color: var(--accent); background: color-mix(in oklab, var(--accent) 12%, var(--elevated)); }
input, select, textarea { border: 1px solid var(--border); border-radius: 10px; background: var(--elevated); color: var(--foreground); padding: 7px 10px; }
input[type="range"] { accent-color: var(--accent); }
table { border-collapse: collapse; width: 100%; }
th, td { padding: 8px 10px; border-bottom: 1px solid var(--border); text-align: left; }
th { color: var(--muted); font-size: 12px; font-weight: 600; }
svg text { fill: var(--foreground); font: 12px system-ui, sans-serif; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; } }
`;
		function buildArtifactDocument(html, title, runtime, token, theme) {
			const variables = [
				["foreground", theme.foreground],
				["muted", theme.muted],
				["surface", theme.surface],
				["elevated", theme.elevated],
				["border", theme.border],
				["accent", theme.accent],
				...Object.entries(theme.tokens ?? {})
			].filter((entry) => typeof entry[1] === "string" && sanitize(entry[1]).length > 0).map(([name, value]) => `--openloop-${name}:${sanitize(value)};`).join("");
			return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">${`<meta name="openloop-artifact-runtime" content="${runtime}">`}<meta http-equiv="Content-Security-Policy" content="${ARTIFACT_CSP}"><title>${escapeHtml(title)}</title><style>${CSS}:root{${variables}color-scheme:${theme.scheme};}</style></head><body><script>${fetchBridge(token)}<\/script>${html}<script>${heightReporter(token)}<\/script></body></html>`;
		}
		/**
		* network 档桥脚本：注入 window.openloop.fetch(url, init?) → Promise。
		* 实际联网由宿主经 /openloop/base/fetch 服务端代理（SSRF 校验 + 白名单），
		* iframe 本身保持断网（CSP connect-src 'none' 不变）。
		*/
		function fetchBridge(token) {
			return `(function(){
  var seq = 0; var pending = new Map();
  window.openloop = {
    fetch: function(url, init) {
      init = init || {};
      return new Promise(function(resolve, reject) {
        var id = 'f' + (++seq);
        pending.set(id, { resolve: resolve, reject: reject });
        parent.postMessage({ type: ${JSON.stringify(ARTIFACT_FETCH_MESSAGE)}, token: ${JSON.stringify(token)}, callId: id,
          url: String(url), init: { timeoutMs: init.timeoutMs } }, '*');
        setTimeout(function() {
          if (pending.has(id)) { pending.delete(id); reject(new Error('openloop.fetch timeout (15s)')); }
        }, init.timeoutMs && init.timeoutMs < 15000 ? init.timeoutMs + 2000 : 15000);
      });
    },
  };
  addEventListener('message', function(event) {
    var data = event.data;
    if (!data || data.type !== ${JSON.stringify(ARTIFACT_FETCH_RESULT_MESSAGE)} || data.token !== ${JSON.stringify(token)}) return;
    var entry = pending.get(data.callId);
    if (!entry) return;
    pending.delete(data.callId);
    if (data.ok) { entry.resolve({ ok: true, status: data.status, json: function() { return Promise.resolve(data.data); } }); }
    else { entry.reject(new Error(data.error || 'openloop.fetch failed')); }
  });
})();`;
		}
		function heightReporter(token) {
			return `(function(){var post=function(){parent.postMessage({type:${JSON.stringify(ARTIFACT_HEIGHT_MESSAGE)},token:${JSON.stringify(token)},height:document.documentElement.scrollHeight},'*')};new ResizeObserver(post).observe(document.documentElement);addEventListener('load',post);post()})();`;
		}
		function sanitize(value) {
			return /[;{}<>]/u.test(value) ? "" : value.trim();
		}
		function escapeHtml(value) {
			return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
		}
		//#endregion
		//#region src/client/theme.ts
		function resolveTheme(values, scheme) {
			return {
				tokens: values,
				foreground: values.foreground ?? "",
				muted: values["muted-foreground"] ?? "",
				surface: values.surface ?? "",
				elevated: values["surface-subtle"] ?? "",
				border: values.border ?? "",
				accent: values.primary ?? "",
				scheme
			};
		}
		//#endregion
		//#region src/client/dock-pin.ts
		let dockService;
		function setDockService(service) {
			dockService = service;
		}
		function getDockService() {
			return dockService;
		}
		//#endregion
		//#region src/client/ArtifactCard.tsx
		const caption = {
			color: "var(--dsw-alias-label-caption)",
			fontSize: 12
		};
		function firstText(content) {
			for (const part of content) if (typeof part === "object" && part !== null && "type" in part && part.type === "text" && "text" in part && typeof part.text === "string") return part.text;
		}
		function ArtifactFrame({ meta, token, fullscreen, scope }) {
			const [height, setHeight] = (0, react.useState)(fullscreen ? 700 : 520);
			const frameRef = (0, react.useRef)(null);
			const theme = (0, _openloop_dsh_base_client.useOpenLoopVisualTheme)(scope);
			(0, react.useEffect)(() => {
				const listener = (event) => {
					const data = event.data;
					if (data?.type === "openloop-artifact:height" && data.token === token && typeof data.height === "number" && Number.isFinite(data.height)) setHeight(Math.max(360, Math.min(fullscreen ? 1600 : 760, Math.ceil(data.height))));
				};
				addEventListener("message", listener);
				return () => removeEventListener("message", listener);
			}, [token, fullscreen]);
			(0, react.useEffect)(() => {
				const listener = async (event) => {
					const data = event.data;
					if (data?.type !== "openloop-artifact:fetch" || data.token !== token) return;
					if (typeof data.callId !== "string" || typeof data.url !== "string") return;
					const frame = frameRef.current;
					if (!frame || event.source !== frame.contentWindow) return;
					try {
						const result = await (await fetch("/openloop/base/fetch", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								url: data.url,
								...typeof data.init?.timeoutMs === "number" ? { timeoutMs: data.init.timeoutMs } : {}
							})
						})).json();
						frame.contentWindow?.postMessage(result.ok ? {
							type: ARTIFACT_FETCH_RESULT_MESSAGE,
							token,
							callId: data.callId,
							ok: true,
							status: result.status,
							data: result.data
						} : {
							type: ARTIFACT_FETCH_RESULT_MESSAGE,
							token,
							callId: data.callId,
							ok: false,
							error: result.error
						}, "*");
					} catch (error) {
						frame.contentWindow?.postMessage({
							type: ARTIFACT_FETCH_RESULT_MESSAGE,
							token,
							callId: data.callId,
							ok: false,
							error: error instanceof Error ? error.message : String(error)
						}, "*");
					}
				};
				addEventListener("message", listener);
				return () => removeEventListener("message", listener);
			}, [token]);
			const doc = (0, react.useMemo)(() => buildArtifactDocument(meta.html, meta.title, meta.runtime, token, resolveTheme(theme.palette, theme.appearance)), [
				meta,
				token,
				theme.palette,
				theme.appearance
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
				ref: frameRef,
				title: meta.title,
				sandbox: "allow-scripts",
				referrerPolicy: "no-referrer",
				srcDoc: doc,
				style: {
					display: "block",
					width: "100%",
					height: fullscreen ? "100%" : height,
					minHeight: fullscreen ? 0 : 360,
					border: 0,
					background: "var(--dsw-alias-bg-layer-1)",
					borderRadius: fullscreen ? 0 : 14
				}
			});
		}
		function ArtifactSurface({ meta, callId, scope }) {
			const [fullscreen, setFullscreen] = (0, react.useState)(false);
			const theme = (0, _openloop_dsh_base_client.useOpenLoopVisualTheme)(scope);
			(0, react.useEffect)(() => {
				if (!fullscreen) return;
				const listener = (event) => {
					if (event.key === "Escape") setFullscreen(false);
				};
				addEventListener("keydown", listener);
				return () => removeEventListener("keydown", listener);
			}, [fullscreen]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					...theme.style,
					border: "1px solid var(--openloop-border)",
					borderRadius: "var(--openloop-radius-lg)",
					overflow: "hidden",
					background: "var(--openloop-surface)",
					color: "var(--openloop-foreground)",
					boxShadow: "var(--openloop-shadow-2)"
				},
				"data-openloop-preset": theme.settings.preset,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					style: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 12,
						padding: "10px 12px 10px 15px",
						borderBottom: "1px solid var(--openloop-border)"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: { minWidth: 0 },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 13,
								fontWeight: 650,
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis"
							},
							children: meta.title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...caption,
								marginTop: 2
							},
							children: meta.path
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8
						},
						children: [
							getDockService() ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "toolbar",
								onClick: () => getDockService()?.pinArtifact(meta, meta.title),
								children: "📌 Pin"
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, { children: meta.runtime === "static" ? "Static" : meta.runtime === "network" ? "Network" : "Interactive" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "toolbar",
								onClick: () => setFullscreen(true),
								children: "Fullscreen"
							})
						]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: { padding: 8 },
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArtifactFrame, {
						meta,
						token: callId,
						fullscreen: false,
						scope
					})
				})]
			}), fullscreen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": meta.title,
				style: {
					position: "fixed",
					inset: 12,
					zIndex: 2147482e3,
					display: "grid",
					gridTemplateRows: "52px minmax(0,1fr)",
					border: "1px solid var(--dsw-alias-border-l2)",
					borderRadius: 20,
					overflow: "hidden",
					background: "var(--dsw-alias-bg-layer-1)",
					boxShadow: "0 30px 100px rgb(0 0 0 / 38%)"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					style: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "0 14px 0 18px",
						borderBottom: "1px solid var(--dsw-alias-border-l2)"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: meta.title }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "outline",
						onClick: () => setFullscreen(false),
						children: "Close"
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArtifactFrame, {
					meta,
					token: `${callId}:fullscreen`,
					fullscreen: true,
					scope
				})]
			})] });
		}
		function ArtifactCard({ callId, block, scope }) {
			if (!("kind" in block)) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: caption,
				children: "HTML Artifact · building…"
			});
			if (block.isError) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: caption,
				children: firstText(block.content) ?? "Artifact failed"
			});
			const meta = artifactMetaFrom(block.meta);
			return meta ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArtifactSurface, {
				meta,
				callId,
				scope
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: caption,
				children: "Artifact metadata unavailable"
			});
		}
		//#endregion
		//#region src/client/index.tsx
		const name = "openloop-html-artifact";
		const inject = ["slots"];
		function apply(ctx) {
			ctx.inject(["openloop-dock/client"], (dockCtx) => {
				setDockService(dockCtx["openloop-dock/client"]);
			});
			const scope = (0, _openloop_dsh_base_client.createOpenLoopSettingsScope)();
			const ThemedArtifactCard = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArtifactCard, {
				...props,
				scope
			});
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "html_artifact"
			}, ThemedArtifactCard));
		}
		//#endregion
		exports.ArtifactFrame = ArtifactFrame;
		exports.apply = apply;
		exports.getDockService = getDockService;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
