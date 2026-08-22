window.__ModuleLoader__.load({
	id: "@openloop/dsh-show-widget",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _openloop_dsh_base_client = require("@openloop/dsh-base/client");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		const HEIGHT_MESSAGE = "openloop-widget:height";
		const STREAM_MESSAGE = "openloop-widget:stream";
		function widgetMetaFrom(value) {
			if (typeof value !== "object" || value === null) return void 0;
			const record = value;
			if (record.kind !== "openloop.widget" || record.version !== 1) return void 0;
			if (typeof record.title !== "string" || typeof record.fragment !== "string") return void 0;
			return {
				kind: "openloop.widget",
				version: 1,
				title: record.title,
				fragment: record.fragment
			};
		}
		const ESCAPES = {
			"\"": "\"",
			"\\": "\\",
			"/": "/",
			b: "\b",
			f: "\f",
			n: "\n",
			r: "\r",
			t: "	"
		};
		function extractStreamingFragment(argsRaw) {
			const opener = /"fragment"\s*:\s*"/u.exec(argsRaw);
			if (!opener) return void 0;
			let output = "";
			for (let index = opener.index + opener[0].length; index < argsRaw.length; index += 1) {
				const character = argsRaw[index];
				if (character === "\"") return output;
				if (character !== "\\") {
					output += character;
					continue;
				}
				const escaped = argsRaw[index + 1];
				if (escaped === void 0) return output;
				if (escaped === "u") {
					const hex = argsRaw.slice(index + 2, index + 6);
					if (hex.length < 4 || !/^[0-9a-f]{4}$/iu.test(hex)) return output;
					output += String.fromCharCode(Number.parseInt(hex, 16));
					index += 5;
					continue;
				}
				if (ESCAPES[escaped] === void 0) return output;
				output += ESCAPES[escaped];
				index += 1;
			}
			return output;
		}
		function previewFragment(fragment) {
			const lastOpen = fragment.toLowerCase().lastIndexOf("<script");
			if (lastOpen === -1) return fragment;
			return fragment.toLowerCase().indexOf("<\/script>", lastOpen) === -1 ? fragment.slice(0, lastOpen) : fragment;
		}
		//#endregion
		//#region src/shell.ts
		const WIDGET_CSP = [
			"default-src 'none'",
			"script-src 'unsafe-inline'",
			"style-src 'unsafe-inline'",
			"img-src data: blob:",
			"connect-src 'none'",
			"font-src 'none'",
			"frame-src 'none'",
			"object-src 'none'",
			"base-uri 'none'",
			"form-action 'none'"
		].join("; ");
		const BASE_CSS = `
:root {
  color-scheme: light dark;
  --background: transparent;
  --foreground: var(--openloop-foreground, light-dark(#17191d, #f3f5f8));
  --muted: var(--openloop-muted, light-dark(rgb(23 25 29 / 58%), rgb(243 245 248 / 58%)));
  --surface: var(--openloop-surface, light-dark(rgb(255 255 255 / 72%), rgb(255 255 255 / 7%)));
  --border: var(--openloop-border, light-dark(rgb(25 30 38 / 10%), rgb(255 255 255 / 12%)));
  --accent: var(--openloop-accent, light-dark(#4d76e8, #85a4ff));
  --radius: 16px;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { background: transparent; color: var(--foreground); font: 400 14px/1.5 system-ui, -apple-system, sans-serif; padding: 2px; }
h1, h2, h3, p { margin-top: 0; }
h1 { font-size: 20px; letter-spacing: -.025em; }
h2 { font-size: 17px; letter-spacing: -.015em; }
.surface { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); padding: 16px; box-shadow: 0 14px 34px rgb(0 0 0 / 7%); backdrop-filter: blur(18px); }
.row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.muted { color: var(--muted); font-size: 12px; }
.value { font-size: 24px; font-weight: 650; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
button, input, select { font: inherit; }
button { border: 1px solid var(--border); border-radius: 999px; padding: 7px 12px; color: var(--foreground); background: transparent; cursor: pointer; }
button:hover, button[aria-pressed="true"] { border-color: var(--accent); background: color-mix(in oklab, var(--accent) 12%, transparent); }
input[type="range"] { accent-color: var(--accent); }
svg text { fill: var(--foreground); font: 12px system-ui, sans-serif; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; } }
`;
		function buildWidgetDocument(fragment, title, token, theme) {
			return documentShell(title, token, theme, `${fragment}\n<script>${heightReporter(token)}<\/script>`);
		}
		function buildStreamingDocument(token, theme) {
			return documentShell("Widget preview", token, theme, `<div id="openloop-widget-stream"></div><script>
  (function () {
    var root = document.getElementById('openloop-widget-stream');
    addEventListener('message', function (event) {
      var data = event.data;
      if (!data || data.type !== ${JSON.stringify(STREAM_MESSAGE)} || data.token !== ${JSON.stringify(token)} || typeof data.fragment !== 'string') return;
      root.innerHTML = data.fragment;
      requestAnimationFrame(function () { parent.postMessage({ type: ${JSON.stringify(HEIGHT_MESSAGE)}, token: ${JSON.stringify(token)}, height: document.documentElement.scrollHeight }, '*'); });
    });
  })();
  ${heightReporter(token)}
  <\/script>`);
		}
		function documentShell(title, _token, theme, content) {
			const values = [
				["foreground", theme.foreground],
				["muted", theme.muted],
				["surface", theme.surface],
				["border", theme.border],
				["accent", theme.accent],
				...Object.entries(theme.tokens ?? {})
			].filter((entry) => typeof entry[1] === "string" && safeCss(entry[1]).length > 0).map(([name, value]) => `--openloop-${name}:${safeCss(value)};`).join("");
			return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${WIDGET_CSP}"><title>${escapeHtml(title)}</title><style>${BASE_CSS}:root{${values}color-scheme:${theme.scheme};}</style></head><body>${content}</body></html>`;
		}
		function heightReporter(token) {
			return `(function(){var post=function(){parent.postMessage({type:${JSON.stringify(HEIGHT_MESSAGE)},token:${JSON.stringify(token)},height:document.documentElement.scrollHeight},'*')};new ResizeObserver(post).observe(document.documentElement);addEventListener('load',post);post()})();`;
		}
		function safeCss(value) {
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
				border: values.border ?? "",
				accent: values.primary ?? "",
				scheme
			};
		}
		//#endregion
		//#region src/client/WidgetCard.tsx
		const subtle = {
			color: "var(--dsw-alias-label-caption)",
			fontSize: 12,
			lineHeight: 1.4
		};
		function firstText(content) {
			for (const part of content) if (typeof part === "object" && part !== null && "type" in part && part.type === "text" && "text" in part && typeof part.text === "string") return part.text;
		}
		function WidgetCard({ callId, block, scope }) {
			const [height, setHeight] = (0, react.useState)(72);
			const theme = (0, _openloop_dsh_base_client.useOpenLoopVisualTheme)(scope);
			const meta = "kind" in block && !block.isError ? widgetMetaFrom(block.meta) : void 0;
			(0, react.useEffect)(() => {
				const listener = (event) => {
					const data = event.data;
					if (data?.type === "openloop-widget:height" && data.token === callId && typeof data.height === "number" && Number.isFinite(data.height)) setHeight(Math.max(72, Math.min(640, Math.ceil(data.height))));
				};
				addEventListener("message", listener);
				return () => removeEventListener("message", listener);
			}, [callId]);
			const doc = (0, react.useMemo)(() => meta ? buildWidgetDocument(meta.fragment, meta.title, callId, resolveTheme(theme.palette, theme.appearance)) : "", [
				meta,
				callId,
				theme.palette,
				theme.appearance
			]);
			if (!("kind" in block)) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: subtle,
				children: "Widget · composing…"
			});
			if (block.isError || !meta) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: subtle,
				children: firstText(block.content) ?? "Widget unavailable"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					width: "100%",
					...theme.style
				},
				"data-openloop-preset": theme.settings.preset,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						...subtle,
						color: "var(--openloop-muted-foreground)",
						display: "flex",
						alignItems: "center",
						gap: 7,
						margin: "0 2px 7px"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
						width: 7,
						height: 7,
						borderRadius: 999,
						background: "var(--openloop-primary)"
					} }), meta.title]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
					title: meta.title,
					sandbox: "allow-scripts",
					referrerPolicy: "no-referrer",
					srcDoc: doc,
					style: {
						display: "block",
						width: "100%",
						height,
						border: 0,
						background: "transparent"
					}
				})]
			});
		}
		//#endregion
		//#region src/client/StreamingPreview.tsx
		function Preview({ raw, scope }) {
			const fragment = previewFragment(extractStreamingFragment(raw) ?? "");
			const frame = (0, react.useRef)(null);
			const [loaded, setLoaded] = (0, react.useState)(false);
			const [height, setHeight] = (0, react.useState)(0);
			const theme = (0, _openloop_dsh_base_client.useOpenLoopVisualTheme)(scope);
			const doc = (0, react.useMemo)(() => buildStreamingDocument("openloop-widget-preview", resolveTheme(theme.palette, theme.appearance)), [theme.palette, theme.appearance]);
			(0, react.useEffect)(() => {
				const timer = setTimeout(() => {
					if (loaded) frame.current?.contentWindow?.postMessage({
						type: STREAM_MESSAGE,
						token: "openloop-widget-preview",
						fragment
					}, "*");
				}, 100);
				return () => clearTimeout(timer);
			}, [fragment, loaded]);
			(0, react.useEffect)(() => {
				const listener = (event) => {
					const data = event.data;
					if (data?.type === "openloop-widget:height" && data.token === "openloop-widget-preview" && typeof data.height === "number") setHeight(Math.min(280, Math.max(0, Math.ceil(data.height))));
				};
				addEventListener("message", listener);
				return () => removeEventListener("message", listener);
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					width: "100%",
					maxWidth: 760,
					margin: "8px auto 2px"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 11,
						color: "var(--dsw-alias-label-caption)",
						marginBottom: 4
					},
					children: "Widget · live preview"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
					ref: frame,
					title: "Widget live preview",
					sandbox: "allow-scripts",
					referrerPolicy: "no-referrer",
					srcDoc: doc,
					onLoad: () => setLoaded(true),
					style: {
						display: "block",
						width: "100%",
						height,
						border: 0,
						transition: "height 180ms ease",
						background: "transparent"
					}
				})]
			});
		}
		function StreamingPreview({ session, scope }) {
			let raw;
			for (const block of session?.partial?.blocks ?? []) if (block.kind === "tool-call" && block.name === "show_widget") raw = block.argsRaw;
			return raw === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Preview, {
				raw,
				scope
			});
		}
		//#endregion
		//#region src/client/index.tsx
		const name = "openloop-show-widget";
		const inject = ["slots"];
		function apply(ctx) {
			const scope = (0, _openloop_dsh_base_client.createOpenLoopSettingsScope)();
			const ThemedWidgetCard = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WidgetCard, {
				...props,
				scope
			});
			const ThemedStreamingPreview = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StreamingPreview, {
				...props,
				scope
			});
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "show_widget"
			}, ThemedWidgetCard));
			ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
				name: "conversation.input.dock",
				id: "openloop-widget-preview",
				order: 32
			}, ThemedStreamingPreview));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
