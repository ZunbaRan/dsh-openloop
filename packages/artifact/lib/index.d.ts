import z from "@deepseek-ai/schemastery";
import { Context } from "@deepseek-ai/cordis";
//#region src/contract.d.ts
declare const HTML_ARTIFACT_TOOL = "html_artifact";
declare const ARTIFACT_HEIGHT_MESSAGE = "openloop-artifact:height";
declare const ARTIFACT_FETCH_MESSAGE = "openloop-artifact:fetch";
declare const ARTIFACT_FETCH_RESULT_MESSAGE = "openloop-artifact:fetch-result";
/**
 * runtime 三档（v2 全栈化，ARTIFACT_V2_DESIGN）：
 * - static  无脚本纯静态（可重放承诺最强）
 * - scripts 本地计算自由（unsafe-eval/wasm），iframe 断网（可重放）
 * - network 在 scripts 基础上经宿主代理桥（openloop.fetch）取数——
 *   iframe 本身仍断网，联网全部走 /openloop/base/fetch（SSRF 校验 + 白名单）
 */
type ArtifactRuntime = 'static' | 'scripts' | 'network';
interface ArtifactMeta {
  kind: 'openloop.html-artifact';
  version: 1;
  title: string;
  runtime: ArtifactRuntime;
  html: string;
  path: string;
}
declare function validateArtifact(html: string, runtime: ArtifactRuntime, maxBytes: number): number;
declare function artifactMetaFrom(value: unknown): ArtifactMeta | undefined;
declare function slug(title: string): string;
declare function hash(text: string): string;
//#endregion
//#region src/shell.d.ts
declare const ARTIFACT_CSP: string;
interface ArtifactTheme {
  tokens?: Record<string, string>;
  foreground?: string;
  muted?: string;
  surface?: string;
  elevated?: string;
  border?: string;
  accent?: string;
  scheme: 'light' | 'dark';
}
declare function buildArtifactDocument(html: string, title: string, runtime: ArtifactRuntime, token: string, theme: ArtifactTheme): string;
//#endregion
//#region src/index.d.ts
declare const name = "openloop-html-artifact";
declare const inject: string[];
interface Config {
  maxStaticBytes: number;
  maxScriptBytes: number;
  allowScripts: boolean;
}
declare const Config: z<Config>;
declare function apply(ctx: Context, config: Config): void;
//#endregion
export { ARTIFACT_CSP, ARTIFACT_FETCH_MESSAGE, ARTIFACT_FETCH_RESULT_MESSAGE, ARTIFACT_HEIGHT_MESSAGE, ArtifactMeta, ArtifactRuntime, ArtifactTheme, Config, HTML_ARTIFACT_TOOL, apply, artifactMetaFrom, buildArtifactDocument, hash, inject, name, slug, validateArtifact };