import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";
//#region src/contract.ts
const SHOW_WIDGET_TOOL = "show_widget";
const HEIGHT_MESSAGE = "openloop-widget:height";
const STREAM_MESSAGE = "openloop-widget:stream";
const SKELETON = /<!doctype\b|<\s*(?:html|head|body)\b/iu;
const REMOTE_URL = /(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\//iu;
function validateWidget(fragment, maxBytes) {
	if (fragment.trim().length === 0) throw new Error("show_widget fragment must not be empty");
	const size = new TextEncoder().encode(fragment).length;
	if (size > maxBytes) throw new Error(`show_widget fragment is ${size} bytes, over the ${maxBytes}-byte limit`);
	if (SKELETON.test(fragment)) throw new Error("show_widget accepts an HTML fragment, not a document skeleton");
	if (REMOTE_URL.test(fragment)) throw new Error("show_widget does not allow remote src or href assets; keep the widget self-contained");
	return size;
}
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
//#region src/skill.ts
const body = new URL("../assets/widget-skill.md", import.meta.url);
const candidate = {
	name: "openloop-show-widget",
	description: "Author small self-contained streaming HTML widgets for show_widget.",
	invocation: {
		modelInvocable: true,
		userInvocable: true
	},
	provider: "openloop-show-widget",
	source: "bundled",
	resourceBase: {
		kind: "directory",
		path: fileURLToPath(new URL("../assets/", import.meta.url))
	},
	rank: BUNDLED_SKILL_RANK,
	locator: body
};
const widgetSkillProvider = {
	name: candidate.provider,
	list: () => Promise.resolve([candidate]),
	async get() {
		return {
			...candidate,
			content: await readFile(body, "utf8")
		};
	}
};
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
//#region src/index.ts
const name = "openloop-show-widget";
const inject = ["tools", "skills"];
const Config = z.object({ maxFragmentBytes: z.natural().default(3e5) });
function apply(ctx, config) {
	ctx.tools.register(defineTool({
		name: SHOW_WIDGET_TOOL,
		description: "Render a small, self-contained interactive HTML fragment inline. Use for one focused simulator, calculator, or free-form explanation; use visualize_ui for structured flow/timeline/comparison and html_artifact for a large multi-panel canvas. Load the openloop-show-widget skill first.",
		parameters: {
			title: {
				type: "string",
				required: true,
				description: "Short user-facing title."
			},
			fragment: {
				type: "string",
				required: true,
				description: "Inline HTML fragment with optional inline style/script; no document skeleton or remote assets."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					version: {
						type: "integer",
						const: 1,
						required: true
					},
					title: {
						type: "string",
						required: true
					},
					fragment: {
						type: "string",
						required: true
					},
					sizeBytes: {
						type: "integer",
						required: true
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: `Rendered widget: ${value.title} (${value.sizeBytes} bytes).`
			}],
			presentationMeta: (_args, value) => ({
				kind: "openloop.widget",
				version: 1,
				title: value.title,
				fragment: value.fragment
			})
		},
		async execute(args) {
			const title = args.title.trim();
			if (!title) throw new Error("show_widget title must not be empty");
			if (title.length > 120) throw new Error("show_widget title must be at most 120 characters");
			const sizeBytes = validateWidget(args.fragment, config.maxFragmentBytes);
			return {
				version: 1,
				title,
				fragment: args.fragment,
				sizeBytes
			};
		},
		presentCall: () => ({
			card: "generic",
			title: "Widget · composing",
			kind: "other"
		}),
		presentResult: (_args, result) => result.isError ? void 0 : {
			card: "generic",
			title: "Widget"
		}
	}));
	ctx.skills.registerProvider(() => widgetSkillProvider);
}
//#endregion
export { Config, HEIGHT_MESSAGE, SHOW_WIDGET_TOOL, STREAM_MESSAGE, WIDGET_CSP, apply, buildStreamingDocument, buildWidgetDocument, extractStreamingFragment, inject, name, previewFragment, validateWidget, widgetMetaFrom };
