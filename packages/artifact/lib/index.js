import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";
//#region src/skill.ts
const body = new URL("../assets/artifact-skill.md", import.meta.url);
const candidate = {
	name: "openloop-html-artifact",
	description: "Author free-form HTML pages for html_artifact: multi-panel explorers, simulations, custom topologies, fullscreen apps. Read when the user wants a full page rather than a dashboard (panel) or a small card (show_widget).",
	invocation: {
		modelInvocable: true,
		userInvocable: true
	},
	provider: "openloop-html-artifact",
	source: "bundled",
	resourceBase: {
		kind: "directory",
		path: fileURLToPath(new URL("../assets/", import.meta.url))
	},
	rank: BUNDLED_SKILL_RANK,
	locator: body
};
const artifactSkillProvider = {
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
//#region src/contract.ts
const HTML_ARTIFACT_TOOL = "html_artifact";
const ARTIFACT_HEIGHT_MESSAGE = "openloop-artifact:height";
const ARTIFACT_FETCH_MESSAGE = "openloop-artifact:fetch";
const ARTIFACT_FETCH_RESULT_MESSAGE = "openloop-artifact:fetch-result";
const SKELETON = /<!doctype\b|<\s*(?:html|head|body)\b/iu;
const REMOTE_URL = /(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\//iu;
const SCRIPT = /<\s*script\b/iu;
const EVENT_HANDLER = /\son[a-z]+\s*=/iu;
const JAVASCRIPT_URL = /(?:href|src)\s*=\s*["']\s*javascript:/iu;
function validateArtifact(html, runtime, maxBytes) {
	if (html.trim().length === 0) throw new Error("html_artifact content must not be empty");
	const size = new TextEncoder().encode(html).length;
	if (size > maxBytes) throw new Error(`html_artifact content is ${size} bytes, over the ${maxBytes}-byte limit`);
	if (SKELETON.test(html)) throw new Error("html_artifact accepts body content only; the runtime owns the document skeleton");
	if (REMOTE_URL.test(html)) throw new Error("html_artifact remote src/href assets are disabled; inline or use data/blob URLs");
	if (JAVASCRIPT_URL.test(html)) throw new Error("html_artifact javascript: URLs are not allowed");
	if (runtime === "static" && (SCRIPT.test(html) || EVENT_HANDLER.test(html))) throw new Error("static html_artifact cannot contain scripts or inline event handlers; choose runtime=\"scripts\" explicitly");
	return size;
}
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
function slug(title) {
	return title.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-").replaceAll(/^-+|-+$/gu, "").slice(0, 48) || "artifact";
}
function hash(text) {
	let value = 2166136261;
	for (let index = 0; index < text.length; index += 1) {
		value ^= text.charCodeAt(index);
		value = Math.imul(value, 16777619);
	}
	return (value >>> 0).toString(16).padStart(8, "0");
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
//#region src/index.ts
const name = "openloop-html-artifact";
const inject = [
	"tools",
	"skills",
	"fs"
];
const Config = z.object({
	maxStaticBytes: z.natural().default(1e6),
	maxScriptBytes: z.natural().default(6e5),
	allowScripts: z.boolean().default(true)
});
function apply(ctx, config) {
	ctx.tools.register(defineTool({
		name: HTML_ARTIFACT_TOOL,
		description: "Render a completely free HTML page (multi-panel explorer, simulation, custom topology, fullscreen app). Choose static by default, scripts for local computation, network when live API data is needed (openloop.fetch). Routing: use panel for structured dashboards (preset widgets, API data binding, auto refresh) and for flow/timeline/comparison diagrams (panel preset kinds); use show_widget for one small temporary card. Load the openloop-html-artifact skill first.",
		parameters: {
			title: {
				type: "string",
				required: true,
				description: "Short artifact title."
			},
			runtime: {
				type: "string",
				enum: [
					"static",
					"scripts",
					"network"
				],
				required: true,
				description: "static rejects scripts; scripts = local JS (canvas/eval/wasm, offline); network = scripts + openloop.fetch bridge for API data (https-only JSON, SSRF-guarded)."
			},
			html: {
				type: "string",
				required: true,
				description: "Self-contained body HTML with optional style; no document skeleton or remote assets."
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
					runtime: {
						type: "string",
						enum: [
							"static",
							"scripts",
							"network"
						],
						required: true
					},
					html: {
						type: "string",
						required: true
					},
					path: {
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
				text: `Rendered ${value.runtime} HTML artifact: ${value.title} (${value.sizeBytes} bytes; workspace copy at ${value.path}).`
			}],
			presentationMeta: (_args, value) => ({
				kind: "openloop.html-artifact",
				version: 1,
				title: value.title,
				runtime: value.runtime,
				html: value.html,
				path: value.path
			})
		},
		async execute(args, exec) {
			const title = args.title.trim();
			if (!title) throw new Error("html_artifact title must not be empty");
			if (title.length > 120) throw new Error("html_artifact title must be at most 120 characters");
			const runtime = args.runtime;
			if (runtime === "scripts" && !config.allowScripts) throw new Error("scripted HTML artifacts are disabled by deployment policy");
			const sizeBytes = validateArtifact(args.html, runtime, runtime === "static" ? config.maxStaticBytes : config.maxScriptBytes);
			const sandboxPolicy = ctx.get("sandboxPolicy")?.resolve({ ...exec.agent ? { session: exec.agent.session } : {} });
			const cwd = sandboxPolicy?.workspaceRoot ?? exec.agent?.session.header.cwd;
			const target = await ctx.fs.resolve(`artifacts/${slug(title)}-${hash(`${runtime}\0${args.html}`)}.html`, {
				...cwd ? { cwd } : {},
				signal: exec.signal
			});
			await ctx.fs.writeText(target, args.html, void 0, exec.signal, sandboxPolicy);
			return {
				version: 1,
				title,
				runtime,
				html: args.html,
				path: target.displayPath,
				sizeBytes
			};
		},
		presentCall: () => ({
			card: "generic",
			title: "HTML Artifact · building",
			kind: "other"
		}),
		presentResult: (_args, result) => result.isError ? void 0 : {
			card: "generic",
			title: "HTML Artifact"
		}
	}));
	ctx.skills.registerProvider(() => artifactSkillProvider);
}
//#endregion
export { ARTIFACT_CSP, ARTIFACT_FETCH_MESSAGE, ARTIFACT_FETCH_RESULT_MESSAGE, ARTIFACT_HEIGHT_MESSAGE, Config, HTML_ARTIFACT_TOOL, apply, artifactMetaFrom, buildArtifactDocument, hash, inject, name, slug, validateArtifact };
