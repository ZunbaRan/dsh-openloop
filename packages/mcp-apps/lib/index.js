//#region src/security.ts
const MCP_APP_MIME = "text/html;profile=mcp-app";
const MCP_APP_PRESENTATION_KIND = "openloop.dsh-mcp";
const MCP_APP_DEFAULT_IFRAME_HEIGHT = 560;
const MCP_APP_MAX_IFRAME_HEIGHT = 720;
const MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX = "⁣openloop.dsh-mcp/code-dispatch:v1:";
/** PTC Code Mode durable-display transport cap; oversized presentations degrade to ordinary fallback, not 8 MiB rendering. */
const MCP_APP_CODE_DISPATCH_PRESENTATION_MAX_BYTES = 262144;
function isUiResourceUri(uri) {
	return uri.startsWith("ui://") && uri.length > 5;
}
function validateUiBinding(binding, expectedServerId, expectedToolName) {
	if (!isUiResourceUri(binding.resourceUri) || binding.serverId !== expectedServerId || binding.toolName !== expectedToolName || binding.visibility !== void 0 && binding.visibility !== "inline" && binding.visibility !== "fullscreen") throw new Error("MCP App binding does not match the expected tool resource");
}
function validateAppHtml(html) {
	if (new TextEncoder().encode(html).byteLength > 8388608) throw new Error("MCP App resource exceeds the 8 MiB limit");
}
function isTrustedAppMessage(event, expectedSource, expectedOrigin) {
	if (event.source !== expectedSource || event.origin !== expectedOrigin) return false;
	return typeof event.data === "object" && event.data !== null && !Array.isArray(event.data);
}
function record(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function bindingFrom(value) {
	const binding = record(value);
	if (!binding || typeof binding.serverId !== "string" || typeof binding.toolName !== "string" || typeof binding.resourceUri !== "string") return void 0;
	if (binding.visibility !== void 0 && binding.visibility !== "inline" && binding.visibility !== "fullscreen") return void 0;
	const bindingMeta = record(binding._meta);
	return {
		serverId: binding.serverId,
		toolName: binding.toolName,
		resourceUri: binding.resourceUri,
		...binding.visibility === "fullscreen" ? { visibility: "fullscreen" } : {},
		...bindingMeta ? { _meta: bindingMeta } : {}
	};
}
function resultFrom(value) {
	const result = record(value);
	if (!result || typeof result.serverId !== "string" || typeof result.toolName !== "string" || !Array.isArray(result.content) || typeof result.isError !== "boolean") return void 0;
	const resourceValue = record(result.uiResource);
	const uiResource = resourceValue && typeof resourceValue.serverId === "string" && typeof resourceValue.resourceUri === "string" && typeof resourceValue.mimeType === "string" ? (() => {
		const resourceMeta = record(resourceValue._meta);
		if (typeof resourceValue.html === "string") return {
			serverId: resourceValue.serverId,
			resourceUri: resourceValue.resourceUri,
			mimeType: resourceValue.mimeType,
			html: resourceValue.html,
			...resourceMeta ? { _meta: resourceMeta } : {}
		};
		if (typeof resourceValue.resourceUrl === "string" && typeof resourceValue.callToolUrl === "string" && typeof resourceValue.documentUrl === "string" && resourceValue.resourceUrl.startsWith("/api/openloop/mcp-app/resource/") && resourceValue.documentUrl.startsWith("/api/openloop/mcp-app/document/") && resourceValue.callToolUrl.startsWith("/api/openloop/mcp-app/call/")) return {
			serverId: resourceValue.serverId,
			resourceUri: resourceValue.resourceUri,
			mimeType: resourceValue.mimeType,
			resourceUrl: resourceValue.resourceUrl,
			documentUrl: resourceValue.documentUrl,
			callToolUrl: resourceValue.callToolUrl,
			...resourceMeta ? { _meta: resourceMeta } : {}
		};
	})() : void 0;
	const structuredContent = record(result.structuredContent);
	const resultMeta = record(result._meta);
	return {
		serverId: result.serverId,
		toolName: result.toolName,
		content: result.content,
		...structuredContent ? { structuredContent } : {},
		isError: result.isError,
		...resultMeta ? { _meta: resultMeta } : {},
		...uiResource ? { uiResource } : {}
	};
}
function parseMcpAppPresentation(value, expectedCallName) {
	const envelope = record(value);
	if (!envelope || envelope.kind !== "openloop.dsh-mcp" || envelope.version !== 1 || envelope.callName !== expectedCallName) return void 0;
	if (typeof envelope.serverId !== "string" || typeof envelope.toolName !== "string") return void 0;
	if (expectedCallName !== `mcp__${envelope.serverId}__${envelope.toolName}`) return void 0;
	const result = resultFrom(envelope.result);
	if (!result || result.serverId !== envelope.serverId || result.toolName !== envelope.toolName) return void 0;
	const binding = bindingFrom(envelope.binding);
	const toolMeta = record(envelope.toolMeta);
	if (binding) {
		try {
			validateUiBinding(binding, envelope.serverId, envelope.toolName);
		} catch {
			return;
		}
		if (!result.uiResource || result.uiResource.resourceUri !== binding.resourceUri || result.uiResource.serverId !== binding.serverId) return void 0;
	} else if (result.uiResource) return;
	if (result.uiResource) {
		if (result.isError || result.uiResource.mimeType !== MCP_APP_MIME || result.uiResource.serverId !== envelope.serverId) return void 0;
		if ("html" in result.uiResource) try {
			validateAppHtml(result.uiResource.html);
		} catch {
			return;
		}
	}
	return {
		kind: MCP_APP_PRESENTATION_KIND,
		version: 1,
		callName: expectedCallName,
		serverId: envelope.serverId,
		toolName: envelope.toolName,
		...toolMeta ? { toolMeta } : {},
		...binding ? { binding } : {},
		result
	};
}
function textByteLength(value) {
	return new TextEncoder().encode(value).byteLength;
}
function parseMcpAppCodeDispatchPresentation(content, expectedCallName, expectedCallId) {
	if (!expectedCallId || expectedCallId.length > 512) return void 0;
	const candidates = [];
	let candidateIndex = -1;
	for (const [index, value] of content.entries()) {
		const block = record(value);
		if (block?.type !== "text" || typeof block.text !== "string" || !block.text.startsWith("⁣openloop.dsh-mcp/code-dispatch:v1:")) continue;
		candidates.push(block.text);
		candidateIndex = index;
	}
	if (candidates.length !== 1 || candidateIndex <= 0 || candidateIndex !== content.length - 1) return void 0;
	const envelopeText = candidates[0];
	if (envelopeText === void 0 || textByteLength(envelopeText) > 262144) return void 0;
	let envelope;
	try {
		envelope = JSON.parse(envelopeText.slice(35));
	} catch {
		return;
	}
	const value = record(envelope);
	if (!value || Object.keys(value).length !== 5 || value.kind !== "openloop.dsh-mcp/code-dispatch" || value.version !== 1 || value.callId !== expectedCallId || value.callName !== expectedCallName) return void 0;
	const presentation = parseMcpAppPresentation(value.presentation, expectedCallName);
	if (!presentation?.result.uiResource) return void 0;
	return {
		presentation,
		envelopeText
	};
}
function ensurePresentationMatchesTool(presentation, tool) {
	return presentation.serverId === tool.serverId && presentation.toolName === tool.name && presentation.callName === `mcp__${tool.serverId}__${tool.name}` && (tool.ui ? presentation.binding?.resourceUri === tool.ui.resourceUri && presentation.result.uiResource?.resourceUri === tool.ui.resourceUri : presentation.binding === void 0 && presentation.result.uiResource === void 0);
}
/**
* Resolve the cross-origin App document URL for the sandboxed iframe.
*
* The App document is served from the same DSH origin, so the host swaps the
* loopback hostname (127.0.0.1 <-> localhost) to place the App on a distinct
* origin while `allow-same-origin` stays available for App storage.
*
* Fail-closed: when the App document would still share the host origin (for
* example a non-loopback or IPv6-loopback deployment where the swap does not
* apply), return undefined so the caller falls back to the opaque-origin
* srcDoc path without `allow-same-origin` instead of granting the App
* same-origin access to the DSH host.
*/
function resolveAppDocumentUrl(documentUrl, locationHref) {
	const locationUrl = new URL(locationHref);
	const url = new URL(documentUrl, locationHref);
	if (url.origin === locationUrl.origin) {
		if (url.hostname === "127.0.0.1" || url.hostname === "localhost") url.hostname = url.hostname === "127.0.0.1" ? "localhost" : "127.0.0.1";
		if (url.origin === locationUrl.origin) return void 0;
	}
	return url.href;
}
function metadataPolicy(meta) {
	const ui = record(meta?.ui);
	const csp = record(ui?.csp);
	const permissions = record(ui?.permissions);
	const sources = (key) => Array.isArray(csp?.[key]) ? (csp?.[key]).filter((value) => typeof value === "string") : [];
	const resource = sources("resourceDomains");
	const connect = sources("connectDomains");
	const frames = sources("frameDomains");
	const directive = (name, values) => `${name} ${values.length > 0 ? values.join(" ") : "'none'"}`;
	const policy = [
		"default-src 'none'",
		directive("script-src", ["'unsafe-inline'", ...resource]),
		directive("style-src", ["'unsafe-inline'", ...resource]),
		directive("img-src", [
			"data:",
			"blob:",
			...resource
		]),
		directive("media-src", [
			"data:",
			"blob:",
			...resource
		]),
		directive("font-src", ["data:", ...resource]),
		directive("worker-src", ["blob:", ...resource]),
		directive("connect-src", connect),
		directive("frame-src", frames),
		"object-src 'none'",
		"base-uri 'none'",
		"form-action 'none'"
	].join("; ");
	const allow = [];
	if (record(permissions?.clipboardWrite)) allow.push("clipboard-write");
	if (record(permissions?.camera)) allow.push("camera");
	if (record(permissions?.microphone)) allow.push("microphone");
	if (record(permissions?.geolocation)) allow.push("geolocation");
	return {
		csp: policy,
		allow: allow.join("; ")
	};
}
function sandboxAllow(meta) {
	return metadataPolicy(meta).allow;
}
function buildSandboxDocument(html, meta) {
	validateAppHtml(html);
	const policy = metadataPolicy(meta);
	return `<!doctype html><html><head><meta charset="utf-8">${`<meta http-equiv="Content-Security-Policy" content=${JSON.stringify(policy.csp)}>`}</head><body>${html}</body></html>`;
}
function resourceAsReadResult(resource) {
	if (resource.mimeType !== MCP_APP_MIME) throw new Error(`Unexpected MCP App MIME: ${resource.mimeType}`);
	return { contents: [{
		uri: resource.resourceUri,
		mimeType: resource.mimeType,
		text: resource.html,
		...resource._meta ? { _meta: resource._meta } : {}
	}] };
}
function fallbackCallResult(result) {
	const text = result.content.find((part) => typeof part === "object" && part !== null && part.type === "text" && typeof part.text === "string");
	return {
		content: [{
			type: "text",
			text: text && typeof text.text === "string" ? text.text : "MCP App request rejected by the host policy"
		}],
		isError: true
	};
}
function unsupportedAppToolCallResult() {
	return {
		content: [{
			type: "text",
			text: "MCP App tool calls are disabled in this DSH host; invoke the ordinary bound MCP tool instead."
		}],
		isError: true
	};
}
//#endregion
//#region src/index.ts
const name = "openloop-dsh-mcp-apps";
const inject = ["mcpRuntime"];
function apply(ctx) {
	ctx.mcpRuntime;
}
var src_default = {
	name,
	inject,
	apply
};
//#endregion
export { MCP_APP_CODE_DISPATCH_PRESENTATION_MAX_BYTES, MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX, MCP_APP_DEFAULT_IFRAME_HEIGHT, MCP_APP_MAX_IFRAME_HEIGHT, MCP_APP_PRESENTATION_KIND, apply, buildSandboxDocument, src_default as default, ensurePresentationMatchesTool, fallbackCallResult, inject, isTrustedAppMessage, name, parseMcpAppCodeDispatchPresentation, parseMcpAppPresentation, resolveAppDocumentUrl, resourceAsReadResult, sandboxAllow, unsupportedAppToolCallResult };
