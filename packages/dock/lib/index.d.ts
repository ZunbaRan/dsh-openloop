import { Context } from "@deepseek-ai/cordis";
//#region src/contract.d.ts
/** cordis 插件契约常量（与 package.json/cordis.patch.yml 对齐） */
declare const DOCK_PLUGIN_ID = "openloop-dock";
//#endregion
//#region src/index.d.ts
declare function apply(_ctx: Context): void;
//#endregion
export { DOCK_PLUGIN_ID, apply };