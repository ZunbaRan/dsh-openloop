import { Context } from "@deepseek-ai/cordis";
import { JsonObject, McpAppResource, McpCallResult, McpToolRecord, McpUiBinding } from "@openloop/dsh-mcp-runtime";
//#region src/security.d.ts
declare const MCP_APP_PRESENTATION_KIND = "openloop.dsh-mcp";
declare const MCP_APP_DEFAULT_IFRAME_HEIGHT = 560;
declare const MCP_APP_MAX_IFRAME_HEIGHT = 720;
declare const MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX = "⁣openloop.dsh-mcp/code-dispatch:v1:";
/** PTC Code Mode durable-display transport cap; oversized presentations degrade to ordinary fallback, not 8 MiB rendering. */
declare const MCP_APP_CODE_DISPATCH_PRESENTATION_MAX_BYTES: number;
interface McpAppPresentation {
  readonly kind: typeof MCP_APP_PRESENTATION_KIND;
  readonly version: 1;
  readonly callName: string;
  readonly serverId: string;
  readonly toolName: string;
  readonly toolMeta?: JsonObject;
  readonly binding?: McpUiBinding;
  readonly result: McpCallResult;
}
interface AppMessageEventLike {
  readonly source: unknown;
  readonly origin: string;
  readonly data: unknown;
}
interface McpCodeDispatchPresentation {
  readonly presentation: McpAppPresentation;
  readonly envelopeText: string;
}
declare function isTrustedAppMessage(event: AppMessageEventLike, expectedSource: unknown, expectedOrigin: string): boolean;
declare function parseMcpAppPresentation(value: unknown, expectedCallName: string): McpAppPresentation | undefined;
declare function parseMcpAppCodeDispatchPresentation(content: readonly unknown[], expectedCallName: string, expectedCallId: string): McpCodeDispatchPresentation | undefined;
declare function ensurePresentationMatchesTool(presentation: McpAppPresentation, tool: Pick<McpToolRecord, 'serverId' | 'name' | 'ui'>): boolean;
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
declare function resolveAppDocumentUrl(documentUrl: string, locationHref: string): string | undefined;
declare function sandboxAllow(meta: JsonObject | undefined): string;
declare function buildSandboxDocument(html: string, meta?: JsonObject): string;
declare function resourceAsReadResult(resource: McpAppResource): {
  contents: {
    _meta?: JsonObject;
    uri: string;
    mimeType: string;
    text: string;
  }[];
};
declare function fallbackCallResult(result: McpCallResult): {
  content: [{
    type: 'text';
    text: string;
  }];
  isError: true;
};
declare function unsupportedAppToolCallResult(): {
  content: [{
    type: 'text';
    text: string;
  }];
  isError: true;
};
//#endregion
//#region src/index.d.ts
declare const name = "openloop-dsh-mcp-apps";
declare const inject: string[];
declare function apply(ctx: Context): void;
declare const _default: {
  name: string;
  inject: string[];
  apply: typeof apply;
};
//#endregion
export { AppMessageEventLike, MCP_APP_CODE_DISPATCH_PRESENTATION_MAX_BYTES, MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX, MCP_APP_DEFAULT_IFRAME_HEIGHT, MCP_APP_MAX_IFRAME_HEIGHT, MCP_APP_PRESENTATION_KIND, McpAppPresentation, McpCodeDispatchPresentation, apply, buildSandboxDocument, _default as default, ensurePresentationMatchesTool, fallbackCallResult, inject, isTrustedAppMessage, name, parseMcpAppCodeDispatchPresentation, parseMcpAppPresentation, resolveAppDocumentUrl, resourceAsReadResult, sandboxAllow, unsupportedAppToolCallResult };