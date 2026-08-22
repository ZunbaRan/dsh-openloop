import { McpCallResult, McpToolRecord } from "@openloop/dsh-mcp-runtime";
import { Context } from "@deepseek-ai/cordis";
//#region src/contract.d.ts
declare const MCP_TOOL_PREFIX = "mcp__";
declare const MCP_PRESENTATION_KIND = "openloop.dsh-mcp";
declare const MCP_CODE_DISPATCH_PRESENTATION_PREFIX = "⁣openloop.dsh-mcp/code-dispatch:v1:";
/** PTC Code Mode durable-display transport cap; oversized presentations degrade to ordinary fallback, not 8 MiB rendering. */
declare const MCP_CODE_DISPATCH_PRESENTATION_MAX_BYTES: number;
declare function mcpToolName(serverId: string, toolName: string): string;
interface McpToolPresentation {
  readonly kind: typeof MCP_PRESENTATION_KIND;
  readonly version: 1;
  readonly callName: string;
  readonly serverId: string;
  readonly toolName: string;
  readonly toolMeta?: Record<string, unknown>;
  readonly binding?: McpToolRecord['ui'];
  readonly result: McpCallResult;
}
interface McpCodeDispatchPresentationEnvelope {
  readonly kind: 'openloop.dsh-mcp/code-dispatch';
  readonly version: 1;
  readonly callId: string;
  readonly callName: string;
  readonly presentation: McpToolPresentation;
}
type TextContentBlock = {
  readonly type: 'text';
  readonly text: string;
};
declare function codeDispatchPresentationBlock(callId: string, presentation: McpToolPresentation): TextContentBlock | undefined;
declare function textFallback(content: readonly unknown[]): string;
declare function toPresentation(tool: McpToolRecord, callName: string, result: McpCallResult): McpToolPresentation;
//#endregion
//#region src/index.d.ts
declare const name = "openloop-dsh-mcp-tools";
declare const inject: string[];
declare function apply(ctx: Context): Promise<void>;
declare const _default: {
  name: string;
  inject: string[];
  apply: typeof apply;
};
//#endregion
export { MCP_CODE_DISPATCH_PRESENTATION_MAX_BYTES, MCP_CODE_DISPATCH_PRESENTATION_PREFIX, MCP_PRESENTATION_KIND, MCP_TOOL_PREFIX, McpCodeDispatchPresentationEnvelope, McpToolPresentation, apply, codeDispatchPresentationBlock, _default as default, inject, mcpToolName, name, textFallback, toPresentation };