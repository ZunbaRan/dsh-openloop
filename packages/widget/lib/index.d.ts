import z from "@deepseek-ai/schemastery";
import { Context } from "@deepseek-ai/cordis";
//#region src/contract.d.ts
declare const SHOW_WIDGET_TOOL = "show_widget";
declare const HEIGHT_MESSAGE = "openloop-widget:height";
declare const STREAM_MESSAGE = "openloop-widget:stream";
interface WidgetMeta {
  kind: 'openloop.widget';
  version: 1;
  title: string;
  fragment: string;
}
declare function validateWidget(fragment: string, maxBytes: number): number;
declare function widgetMetaFrom(value: unknown): WidgetMeta | undefined;
declare function extractStreamingFragment(argsRaw: string): string | undefined;
declare function previewFragment(fragment: string): string;
//#endregion
//#region src/shell.d.ts
declare const WIDGET_CSP: string;
interface ThemeBridge {
  tokens?: Record<string, string>;
  foreground?: string;
  muted?: string;
  surface?: string;
  border?: string;
  accent?: string;
  scheme: 'light' | 'dark';
}
declare function buildWidgetDocument(fragment: string, title: string, token: string, theme: ThemeBridge): string;
declare function buildStreamingDocument(token: string, theme: ThemeBridge): string;
//#endregion
//#region src/index.d.ts
declare const name = "openloop-show-widget";
declare const inject: string[];
interface Config {
  maxFragmentBytes: number;
}
declare const Config: z<Config>;
declare function apply(ctx: Context, config: Config): void;
//#endregion
export { Config, HEIGHT_MESSAGE, SHOW_WIDGET_TOOL, STREAM_MESSAGE, ThemeBridge, WIDGET_CSP, WidgetMeta, apply, buildStreamingDocument, buildWidgetDocument, extractStreamingFragment, inject, name, previewFragment, validateWidget, widgetMetaFrom };