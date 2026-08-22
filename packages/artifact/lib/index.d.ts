import z from "@deepseek-ai/schemastery";
import { Context } from "@deepseek-ai/cordis";
//#region src/contract.d.ts
declare const HTML_ARTIFACT_TOOL = "html_artifact";
declare const ARTIFACT_HEIGHT_MESSAGE = "openloop-artifact:height";
type ArtifactRuntime = 'static' | 'scripts';
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
export { ARTIFACT_CSP, ARTIFACT_HEIGHT_MESSAGE, ArtifactMeta, ArtifactRuntime, ArtifactTheme, Config, HTML_ARTIFACT_TOOL, apply, artifactMetaFrom, buildArtifactDocument, hash, inject, name, slug, validateArtifact };