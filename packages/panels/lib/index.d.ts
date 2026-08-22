import z from "@deepseek-ai/schemastery";
import { ToolDefinition } from "@deepseek-ai/dsh-tools";
import { ComponentType } from "react";
import { SkillProvider } from "@deepseek-ai/dsh-skill";
import { Context, Service } from "@deepseek-ai/cordis";
import { IncomingMessage, ServerResponse } from "node:http";
import { Duplex } from "node:stream";
//#region src/contract.d.ts
/**
 * 数据契约（设计文档 §5，client/server 共享）。
 * 权威定义：字段名 / 默认值 / 注释与 DSH_PANELS_DESIGN.md §5 保持一致。
 */
type JsonObject = Record<string, unknown>;
/** 预设组件 kind，§6 全清单 */
type PresetKind = 'text' | 'markdown' | 'heading' | 'badge' | 'tag' | 'divider' | 'avatar' | 'card' | 'section' | 'stack' | 'grid' | 'row' | 'split' | 'scroll-area' | 'metric' | 'metric-grid' | 'data-table' | 'list' | 'key-value' | 'stat' | 'rating' | 'empty-state' | 'timeline' | 'chart' | 'sparkline' | 'gauge' | 'funnel' | 'heatmap' | 'flow' | 'comparison' | 'steps' | 'tree' | 'callout' | 'status' | 'progress' | 'skeleton' | 'tabs' | 'accordion' | 'pagination' | 'tooltip';
type WidgetSource = {
  type: 'preset';
  kind: PresetKind;
  props: JsonObject;
} | {
  type: 'pack';
  pack: string;
  component: string;
  props: JsonObject;
} | {
  type: 'custom';
  code: string;
};
type Lane = 'host' | 'sandbox';
interface WidgetUnit {
  /** 面板内唯一 id，kebab-case */
  id: string;
  /** 缺省推导：preset→host；pack→按 manifest.runtime；custom→sandbox */
  lane?: Lane;
  source: WidgetSource;
  data?: WidgetDataBinding;
  refresh?: RefreshPolicy;
}
interface RefreshPolicy {
  /** 面板打开时重新拉取，默认 true（D4 实时语义） */
  onLoad?: boolean;
  /** 定时刷新间隔；缺省不定时。最小 10_000 */
  intervalMs?: number;
  /** 渲染手动刷新按钮，默认 true（有 api 数据时） */
  manual?: boolean;
}
type WidgetDataSource = {
  type: 'static';
  value: unknown;
} | {
  type: 'api';
  url: string;
  method?: 'GET' | 'POST';
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
  credentialRef?: string;
  timeoutMs?: number;
};
interface WidgetDataBinding {
  source: WidgetDataSource;
  /** JSONPath 子集取值路径（v1：仅 a.b[0].c 形态），缺省取整个响应 */
  pick?: string;
}
interface PanelDefinition {
  $schema: 'openloop.panel/v1';
  /** kebab-case；同 id 再调用 = 更新该面板 */
  id: string;
  title: string;
  description?: string;
  layout?: {
    mode: 'stack' | 'grid';
    columns?: 1 | 2 | 3;
  };
  widgets: WidgetUnit[];
  persist?: boolean;
}
/** 工具返回的 meta（渲染入口） */
interface PanelMeta {
  kind: 'openloop.panel';
  version: 1;
  panel: PanelDefinition;
  /** server 解析完成的数据快照：widgetId → data */
  resolved: Record<string, unknown>;
  resolvedAt: string;
}
//#endregion
//#region src/validation.d.ts
/** §6.1 预设组件 kind 全清单（运行时白名单，与 contract.ts 的 PresetKind 类型逐字对齐） */
declare const PRESET_KINDS: readonly PresetKind[];
/** 查询 pack 是否已注册且含指定 component（未注册返回 false，fail-closed） */
declare function isPackComponent(pack: string, component: string): boolean;
/** custom code 大小上限（§5.4） */
declare const CUSTOM_CODE_MAX_BYTES: number;
/** 扫描 custom code 是否命中禁词；命中返回命中的词，否则返回 undefined */
declare function forbiddenCustomCodeTerm(code: string): string | undefined;
/**
 * SSRF 检测（§15 S3）：url 指向环回/内网/不可解析地址时返回 true。
 * 仅做静态判定：hostname 为 IP 字面量或 localhost 时按网段检查；
 * 普通域名无法在编译期解析，默认放行（服务端 fetch 层另有二次防护）。
 */
declare function isForbiddenApiUrl(url: string): boolean;
/**
 * §5.4 面板全量校验（fail-closed）。
 * 校验通过后输入收敛为 PanelDefinition；任何非法形状/规则都以 Error 拒绝。
 */
declare function validatePanel(input: unknown): asserts input is PanelDefinition;
//#endregion
//#region src/datasource.d.ts
/** 响应体大小上限（§15 S9：1MB） */
declare const MAX_RESPONSE_BYTES: number;
/** 超时默认值 / 上限（§5.2：默认 10_000，上限 30_000） */
declare const DEFAULT_TIMEOUT_MS = 10000;
declare const MAX_TIMEOUT_MS = 30000;
/** 注入 seam：测试注入 mock fetch；真机缺省用全局 fetch */
interface ResolveWidgetDataContext {
  fetchFn?: typeof fetch;
  /** 调用方中止信号（如 tool execute 的 exec.signal）；触发即中止本次请求 */
  signal?: AbortSignal;
}
/**
 * 归一化 timeoutMs：缺省 10_000；超上限 clamp 到 30_000；非法值（非有限数）回退默认。
 * validation.ts 已对 >30_000 的模型输入 fail-closed，这里 clamp 属纵深防御。
 */
declare function normalizeTimeoutMs(timeoutMs?: number): number;
/**
 * 解析 pick 路径（v1：仅 a.b[0].c 形态）：`a.b[0].c` → ['a', 'b', 0, 'c']。
 * 裸数字段转 number（数组索引），其余为字符串键。
 */
declare function parsePickPath(pick: string): Array<string | number>;
/**
 * 按 pick 路径取值；缺路径/路径不存在返回 undefined（不抛错）。
 * 段访问用 hasOwnProperty 防护，避免命中原型链（JSON.parse 产物亦安全）。
 */
declare function pickValue(data: unknown, pick?: string): unknown;
/** content-type 是否声明为 JSON（含 json 子串即可，如 application/json; charset=utf-8） */
declare function looksLikeJsonContentType(contentType: string | null | undefined): boolean;
/**
 * 判定并解析 JSON 响应（§10 仅接受 JSON：content-type 含 json 或体可 JSON.parse）。
 * content-type 声明 json 但体解析失败 → 抛错；两者都非 JSON → 抛错。
 * 错误消息面向 Agent 可自修正（fail-closed）。
 */
declare function parseJsonResponse(contentType: string | null | undefined, bodyText: string): unknown;
/**
 * 流式读取响应体，超过 maxBytes 立即停止并标记截断（不缓冲超限数据）。
 * 返回 { bytes, truncated }，由调用方按 truncated 抛「超 1MB」错误。
 */
declare function readBodyBytes(stream: ReadableStream<Uint8Array>, maxBytes?: number): Promise<{
  bytes: Uint8Array;
  truncated: boolean;
}>;
/** 拼接 query 参数到 api url（原 url 已有 query 时合并） */
declare function buildApiUrl(url: string, query?: Record<string, string>): string;
/**
 * api source URL 校验（§5.4 / §15 S3，fail-closed）：
 * 必须 https://，且不指向环回/内网。复用 validation.ts 的 isForbiddenApiUrl。
 */
declare function validateApiUrl(url: string): void;
/**
 * 解析单个 widget 的数据绑定（§5.2 / §10）。
 * static → 直接返回 value；api → 校验 URL → Node fetch（超时/1MB/仅 JSON）→ pick 取值。
 * 校验失败抛错（消息面向 Agent 可自修正）；网络/解析失败同样抛错，由 resolvePanelData 统一隔离。
 */
declare function resolveWidgetData(binding: WidgetDataBinding, ctx?: ResolveWidgetDataContext): Promise<unknown>;
/**
 * 解析面板全部 api widget 数据（§10）：并行 fetch（Promise.allSettled），
 * 单格失败不拖垮整体——成功写入 resolved[widgetId]，失败写入 { __error: message }
 * （约定见文件头注释；渲染端据此渲染错误占位）。
 * 面板无 api widget 时返回空对象（与 §5.3 resolved 缺省语义一致）。
 * ctx 透传给 resolveWidgetData（测试注入 fetchFn / 调用方取消 signal）。
 */
declare function resolvePanelData(panel: PanelDefinition, ctx?: ResolveWidgetDataContext): Promise<Record<string, unknown>>;
//#endregion
//#region src/tool.d.ts
/** 工具名常量；与 client 注入 key（src/client/index.tsx）逐字一致 */
declare const PANEL_TOOL = "panel";
/** 工具参数 schema（PanelDefinition 形状；persist 为 §11 持久化开关；load 为按 id 唤起已存档面板） */
declare const PANEL_PARAMETERS: {
  readonly panel: {
    readonly oneOf: readonly [{
      readonly type: "object";
      readonly additionalProperties: false;
      readonly properties: {
        readonly $schema: {
          readonly type: "string";
          readonly const: "openloop.panel/v1";
        };
        readonly id: {
          readonly type: "string";
          readonly required: true;
          readonly description: "kebab-case，面板内唯一；同 id 再调用 = 更新";
        };
        readonly title: {
          readonly type: "string";
          readonly required: true;
        };
        readonly description: {
          readonly type: "string";
        };
        readonly layout: {
          readonly type: "object";
          readonly additionalProperties: true;
        };
        readonly widgets: {
          readonly type: "array";
          readonly required: true;
          readonly description: "1–24 个 WidgetUnit";
        };
        readonly persist: {
          readonly type: "boolean";
        };
      };
    }, {
      readonly type: "string";
    }];
    readonly description: "A PanelDefinition (openloop.panel/v1). Strongly prefer passing the JSON object itself; a stringified JSON text is also accepted and will be parsed. Omit when using load or panelFile.";
  };
  readonly panelFile: {
    readonly type: "string";
    readonly description: "Read the PanelDefinition from a JSON file in the workspace (recommended for large panels: write the JSON to e.g. \"panels/<id>.json\" with the write tool first — single-layer encoding avoids string-escape corruption — then pass its path here). Priority: panel > panelFile > load. To modify, read the file, edit, write back, and call again.";
  };
  readonly load: {
    readonly type: "string";
    readonly description: "Recall a previously persisted panel by its id (saved earlier with persist: true). When given without panel, the stored PanelDefinition is loaded, re-validated and re-rendered with fresh data.";
  };
  readonly persist: {
    readonly type: "boolean";
    readonly description: "Write the panel to disk when true (persisted panels can be recalled later via the load parameter).";
  };
};
/**
 * panel 参数的字符串容错（真机教训：模型可能把对象序列化成 JSON 文本）。
 * 可解析 → 返回对象；不可解析/非对象 → 抛出面向 Agent 的可自修正错误。
 */
declare function coercePanelArg(value: unknown): unknown;
/** 输出 schema：与 §5.3 PanelMeta 逐字段对齐（resolved 为 server 解析的数据快照，无 api widget 时为空对象） */
declare const PANEL_OUTPUT_SCHEMA: {
  readonly type: "object";
  readonly additionalProperties: false;
  readonly properties: {
    readonly version: {
      readonly type: "integer";
      readonly const: 1;
      readonly required: true;
    };
    readonly panel: {
      readonly type: "json";
      readonly required: true;
    };
    readonly resolved: {
      readonly type: "json";
      readonly required: true;
    };
    readonly resolvedAt: {
      readonly type: "string";
      readonly required: true;
    };
  };
};
/** 构建 panel 工具定义；由 src/index.ts 注册进 ctx.tools */
declare function definePanelTool(): ToolDefinition;
//#endregion
//#region src/skills/index.d.ts
declare const panelsSkillProviders: readonly SkillProvider[];
//#endregion
//#region src/store.d.ts
declare const PANELS_SUBDIR = "openloop-panels";
/** 插件版本，写盘记录用（与 package.json 保持同步） */
declare const PLUGIN_VERSION = "0.1.0";
/** 落盘记录：PanelDefinition 全量 + 元数据（§11） */
interface StoredPanel {
  panel: PanelDefinition;
  savedAt: string;
  pluginVersion: string;
}
/**
 * 最小文件系统 seam（路径相对 DSH fs 执行世界根 / cwd）。
 * 真机由 createCtxPanelFs 包装 ctx.fs 实现；测试注入内存实现。
 */
interface PanelFs {
  /** 原子写文本（父目录由 backend 保证可写） */
  writeText(relPath: string, content: string): Promise<void>;
  /** 读文本；不存在或读失败返回 undefined */
  readText(relPath: string): Promise<string | undefined>;
  /** 列目录直接子项名（不递归、不读内容） */
  listDir(relDir: string): Promise<string[]>;
}
interface PanelStoreOptions {
  /** 面板存储根目录（真机 = DSH home data 目录，设计文档 §11；测试注入临时目录） */
  dir: string;
  fs: PanelFs;
}
interface PanelStore {
  /** 校验并写盘（同 id 覆盖 = 更新面板）；返回相对路径 */
  save(panel: PanelDefinition): Promise<{
    path: string;
  }>;
  /** 读盘；损坏/不存在返回 undefined */
  load(id: string): Promise<StoredPanel | undefined>;
  /** 列出全部可读面板，按 savedAt 新→旧 */
  list(): Promise<StoredPanel[]>;
}
declare function createPanelStore(options: PanelStoreOptions): PanelStore;
declare function savePanel(panel: PanelDefinition, store: PanelStore): Promise<{
  path: string;
}>;
declare function loadPanel(id: string, store: PanelStore): Promise<StoredPanel | undefined>;
declare function listPanels(store: PanelStore): Promise<StoredPanel[]>;
/**
 * ctx.fs 最小结构化类型（不引入 @deepseek-ai/dsh-fs 依赖；
 * 运行期对象即 ctx.fs，方法签名与 dsh-fs FileSystem 对齐，见 IMPL_NOTES §3.1）。
 */
interface FsTargetLike {
  displayPath: string;
  targetKey: unknown;
}
interface DshFsLike {
  resolve(path: string, opts?: {
    cwd?: string;
    signal?: AbortSignal;
  }): Promise<FsTargetLike>;
  stat(target: FsTargetLike, signal?: AbortSignal): Promise<unknown>;
  readText(target: FsTargetLike, signal?: AbortSignal): Promise<string>;
  writeText(target: FsTargetLike, content: string, expected?: unknown, signal?: AbortSignal, sandboxPolicy?: unknown): Promise<unknown>;
  listDir(target: FsTargetLike, signal?: AbortSignal): Promise<Array<{
    name: string;
  }>>;
}
interface CtxPanelFsOptions {
  fs: DshFsLike;
  /** 相对路径解析基（sandboxPolicy.workspaceRoot 优先，session cwd 兜底，IMPL_NOTES §3.2） */
  cwd?: string | undefined;
  signal?: AbortSignal;
  /** 第 5 参必须传 sandboxPolicy，漏传沙箱后端可能静默拒写（§3.3） */
  sandboxPolicy?: unknown;
}
/** 用 ctx.fs + sandboxPolicy 实现 PanelFs（resolve 相对路径 + cwd，S10 seams） */
declare function createCtxPanelFs(opts: CtxPanelFsOptions): PanelFs;
declare function createMemoryPanelFs(): PanelFs & {
  snapshot(): Map<string, string>;
};
//#endregion
//#region src/packs/manifest.d.ts
/**
 * pack manifest（§12.1 `dsh-pack.json`）解析与校验。
 *
 * - 校验是 fail-closed 的：任何非法/未知输入一律抛 Error，消息面向开发者可自修正。
 * - 本模块**零依赖**（不含 node:fs / node:net / react），client（loader/PanelCard）与服务端（registry/serve）均可安全引用。
 * - 硬约束（§12.2）：`runtime: "react18"` 走宿主车道；`react19` 标记为待沙箱车道（批 4），v1 在注册层拒绝（见 registry.ts）。
 */
/** pack 运行时车道（§12.2 硬约束 1） */
type PackRuntime = 'react18' | 'react19';
/** 单个 component 元数据（§12.1） */
interface PackComponentMeta {
  description?: string;
  /** props 的 JSON Schema（v1 仅存证，不做深度校验；§6.3 同源约定） */
  propsSchema?: object;
}
/** §12.1 pack manifest（包根 `dsh-pack.json` 的权威形状） */
interface PackManifest {
  /** 包名：裸名 `dsh-pack-fancy` 或 scoped `@acme/dsh-pack-fancy`（与设计文档示例一致） */
  name: string;
  version: string;
  runtime: PackRuntime;
  /** ESM 入口，相对包根（§12.2 硬约束 2）；v1 由 pack 路由 serve */
  entry: string;
  /** 随包 CSS，相对包根（可选；禁止全局 reset/Preflight，§12.2 硬约束 3） */
  styles?: string;
  /** component 名 → 元数据；至少 1 个（§12.1） */
  components: Record<string, PackComponentMeta>;
}
declare const PACK_RUNTIMES: readonly PackRuntime[];
/** v1 宿主车道允许的 runtime（§12.2 硬约束 1）；react19 留待批 4 沙箱车道 */
declare const HOST_LANE_RUNTIME: PackRuntime;
/** pack 资产路由前缀（§9）：绝对路径、无尾部斜杠；panels 独占，撞前缀即 register 抛错（IMPL_NOTES §1.4） */
declare const PACKS_ROUTE = "/openloop/packs";
/**
 * pack 路由虚拟入口名（§12 加载契约）：
 * client 加载器固定请求 `<packBaseUrl>/entry.js`，pack 路由（serve.ts）从注册表解析 manifest.entry 实际文件。
 * 这样 client 无需知道 manifest.entry 值，服务端可随时改入口文件路径。
 */
declare const PACK_ENTRY_VIRTUAL = "entry.js";
/** pack 路由虚拟样式名：`<packBaseUrl>/styles.css` → manifest.styles（可选，缺失时 404） */
declare const PACK_STYLES_VIRTUAL = "styles.css";
/**
 * pack 名校验（§12.1 + 路径安全）：裸名或 scoped 名，仅小写字母/数字/`. _ -`；
 * 含 `/` 的 scoped 名至多一个 `/`（`@scope/name`）。
 * 禁止 `..`、反斜杠、空白——保证 pack 名可安全拼进 URL 与文件系统路径（防穿越）。
 */
declare const PACK_NAME_RE: RegExp;
/** 包内文件路径校验：相对、无绝对前缀、无 `..` 段、无反斜杠（防路径穿越） */
declare function isSafePackRelPath(path: string): boolean;
/** 车道判定（§5.1：pack → 按 manifest.runtime）：react18→host；react19→sandbox（批 4） */
declare function packLaneFor(runtime: PackRuntime): 'host' | 'sandbox';
/**
 * 解析并校验一个未知输入为 PackManifest（fail-closed）。
 * 任何缺字段/类型错误/非法值都抛 Error；react19 是合法值（解析不拒，注册层按车道策略拒绝）。
 */
declare function parsePackManifest(input: unknown): PackManifest;
//#endregion
//#region src/packs/registry.d.ts
/** 文件系统 seam（§12 scanPacksDir 可注入；真实实现 = node:fs/promises 适配） */
interface PackFs {
  /** 列目录直接子项名（不递归） */
  readdir(dir: string): Promise<string[]>;
  /** 读 UTF-8 文本；文件不存在/不可读时抛错（由调用方容错） */
  readFile(path: string): Promise<string>;
}
/** node:fs/promises 适配（scanPacksDir 默认实现） */
declare const nodePackFs: PackFs;
/** 已注册 pack（§12）：manifest + 资产 URL 前缀 + 文件系统根 */
interface RegisteredPack {
  manifest: PackManifest;
  /** pack 资产 URL 前缀（以 `/` 结尾）：`${PACKS_ROUTE}/${manifest.name}/`（§9 pack 路由解析用） */
  baseUrl: string;
  /** 包文件系统根（pack 路由 serve 时读文件的根目录）；未提供则 pack 资产不可用（404） */
  fsRoot: string;
}
/** scanPacksDir 结果：注册成功名单 + 每包跳过原因（目录不存在整体返回空，不抛错） */
interface ScanResult {
  registered: string[];
  errors: string[];
}
declare class PackRegistry {
  private readonly packs;
  /**
   * 校验并注册一个 pack（重复 name = 覆盖更新，幂等，scan 重跑安全）。
   * react19 runtime 抛错（v1 宿主车道仅 react18）；baseUrl 必须为绝对 URL 前缀（`/` 开头、`/` 结尾）。
   */
  registerPack(manifest: PackManifest, baseUrl: string, fsRoot?: string): void;
  getPack(name: string): RegisteredPack | undefined;
  hasPack(name: string): boolean;
  listPacks(): RegisteredPack[];
  /** 清空注册表（测试用；不影响 validation.ts 的白名单） */
  clear(): void;
}
/** 全局单例（服务端 index.ts 接线用） */
declare const packRegistry: PackRegistry;
declare function registerPack(manifest: PackManifest, baseUrl: string, fsRoot?: string, registry?: PackRegistry): void;
declare function getPack(name: string, registry?: PackRegistry): RegisteredPack | undefined;
declare function hasPack(name: string, registry?: PackRegistry): boolean;
declare function listPacks(registry?: PackRegistry): RegisteredPack[];
/** 清空全局注册表（测试隔离用） */
declare function resetPackRegistry(registry?: PackRegistry): void;
/**
 * 扫描 `dir` 下每个子目录的 `dsh-pack.json` 批量注册（§12 启用方式 v1）。
 * - 每个子目录若无 `dsh-pack.json` / 解析失败 / 注册被拒（如 react19）→ 记录 errors 并跳过，不中断整体。
 * - 目录本身不存在/不可读 → 返回空结果（v1 启动容错：pack 目录未建时不打扰）。
 * - fsRoot 恒为该子目录（pack 资产路由从 fsRoot 相对读文件）。
 */
declare function scanPacksDir(dir: string, fs?: PackFs, registry?: PackRegistry): Promise<ScanResult>;
//#endregion
//#region src/packs/bridge.d.ts
/**
 * 主题桥接器（§12.3，纯函数，**零依赖**：不引入 antd/MUI，只输出其主题输入的普通对象）。
 *
 * - 输入：openloop token 快照（`Record<string, string>`，键为 §14 词汇表；预设系 50 + 可选全局系）。
 * - 输出：antd `ConfigProvider theme.token` 输入对象 / MUI `createTheme()` 输入对象（结构类型，非官方包）。
 * - **映射是有损的**（§12.3）：antd/MUI 的颜色语义粒度比我们的 token 粗/细不同——
 *   - antd 有 10 级 text 灰阶，我们只有 foreground / muted-foreground / foreground-subtle / foreground-strong 4 级 → 灰阶按语义就近归并；
 *   - MUI 的 `secondary` 在 openloop 无对应 token（无第二品牌色）→ 以 `chart-1` 近似；
 *   - 圆角把 `radius-*` 的 `"12px"` 解析为数字（解析失败用 0，缺失用 0）。
 *   有损近似的依据是"视觉同族就近"，做换肤近似可用；品牌级精确还原应直接消费 `var(--openloop-*)`。
 */
/** antd `ConfigProvider theme.token` 的输入形状（v1 仅映射我们有的字段；缺失字段不输出） */
interface AntdThemeTokens {
  colorPrimary?: string;
  colorPrimaryHover?: string;
  colorPrimaryActive?: string;
  colorInfo?: string;
  colorSuccess?: string;
  colorWarning?: string;
  colorError?: string;
  colorLink?: string;
  colorBgContainer?: string;
  colorBgLayout?: string;
  colorBgElevated?: string;
  colorText?: string;
  colorTextHeading?: string;
  colorTextSecondary?: string;
  colorTextTertiary?: string;
  colorTextQuaternary?: string;
  colorBorder?: string;
  colorBorderSecondary?: string;
  borderRadius?: number;
  borderRadiusSM?: number;
  borderRadiusLG?: number;
}
/** MUI `createTheme()` 的输入形状（v1 仅映射我们有的字段） */
interface MuiThemeInput {
  palette?: {
    primary?: {
      main?: string;
      light?: string;
      dark?: string;
      contrastText?: string;
    };
    /** openloop 无第二品牌色，以 chart-1 近似（有损，§12.3 说明） */
    secondary?: {
      main?: string;
    };
    error?: {
      main?: string;
    };
    warning?: {
      main?: string;
    };
    info?: {
      main?: string;
    };
    success?: {
      main?: string;
    };
    text?: {
      primary?: string;
      secondary?: string;
      disabled?: string;
    };
    background?: {
      default?: string;
      paper?: string;
    };
    divider?: string;
  };
  shape?: {
    borderRadius?: number;
  };
  typography?: {
    fontFamily?: string;
  };
}
type TokenMap = Readonly<Record<string, string>>;
/**
 * openloop 预设系 token → antd `ConfigProvider theme.token` 输入对象（§12.3）。
 * 有损点：colorText* 灰阶 4 级归并 antd 10 级；无 focus 系列 token（antd 的 controlOutline 等）→ 不输出。
 */
declare function toAntdThemeTokens(openloopTokens: TokenMap): AntdThemeTokens;
/**
 * openloop 预设系 token → MUI `createTheme()` 输入对象（§12.3）。
 * 有损点：`secondary` 无对应 token → chart-1 近似；MUI 默认 8px 圆角 → radius-md；阴影/motion 不映射。
 */
declare function toMuiThemeTokens(openloopTokens: TokenMap): MuiThemeInput;
//#endregion
//#region src/packs/loader.d.ts
/** pack 组件入参：`props` = widget.source.props（§5.1）；`data` = §5.2 解析结果（resolved[widgetId]） */
interface PackComponentProps {
  props: JsonObject;
  data?: unknown;
}
/** 对外契约：pack 组件 = 默认导出的 React 组件函数 */
type PackComponent = ComponentType<PackComponentProps>;
interface LoadPackComponentOptions {
  /** 测试注入：entry 模块 URL；缺省 `packEntryUrl(name)` */
  entryUrl?: string;
  /** 测试注入：模块加载函数；缺省运行时动态 `import(url)` */
  importModule?: (url: string) => Promise<unknown>;
}
/** pack 入口 URL（虚拟名 entry.js，pack 路由从注册表解析 manifest.entry） */
declare function packEntryUrl(name: string): string;
/**
 * 加载 pack 组件（宿主车道）。成功返回组件函数；任何失败抛可读 Error。
 * props 必须为 JSON 对象（非数组）；component 名仅用于错误消息（注册校验已在服务端完成）。
 */
declare function loadPackComponent(name: string, component: string, props: unknown, opts?: LoadPackComponentOptions): Promise<PackComponent>;
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+dsh-host-webserver@0.1.0-rc.6_@deepseek-ai+cordis@4.0.1_@deepseek-ai+dsh-i_4e83f049ed8dee9b8d2facc78c419c22/node_modules/@deepseek-ai/dsh-host-webserver/lib/types/index.d.ts
declare module '@deepseek-ai/cordis' {
  interface Context {
    webServer: WebServer;
  }
}
/** Route match kind: 'exact' matches the pathname verbatim; 'prefix' p matches p and p/<anything>. */
type WebRouteKind = 'exact' | 'prefix';
/** One named route registration. */
interface WebRoute {
  kind: WebRouteKind;
  /** Absolute pathname, no trailing slash. */
  path: string;
  /** Owns the full response lifecycle (may hold the response open, e.g. SSE). */
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
}
/** One exact-path HTTP upgrade registration. */
interface WebUpgradeRoute {
  /** Absolute pathname, no trailing slash. */
  path: string;
  /** Owns protocol negotiation and the upgraded socket after dispatch. */
  handler: (req: IncomingMessage, socket: Duplex, head: Buffer) => void | Promise<void>;
}
/** Gateway config: the listen address. */
interface Config$1 {
  /** Listen host; the two supported values are loopback and all-interfaces. */
  host: '127.0.0.1' | '0.0.0.0';
  /** Listen port; zero requests an OS-assigned port. */
  port: number;
}
/**
 * The browser HTTP carrier service. Activation listens immediately. Route
 * registration order does not affect requests because configured named routes
 * must be distinct, and the fallback handler answers anything not yet claimed
 * during startup with 404 until its owner registers. A listen failure rejects
 * initialization, and the boot process reports the failed fiber.
 */
declare class WebServer extends Service {
  private config;
  static Config: z<Config$1>;
  private readonly exact;
  private readonly prefixes;
  private readonly upgrades;
  private readonly upgradedSockets;
  private readonly indexTaps;
  private fallback;
  private server;
  private listenedPort;
  constructor(ctx: Context, config: Config$1);
  /** The listening port (the OS-assigned value when config.port is 0). */
  get port(): number;
  /** The configured bind host (the loopback or all-interfaces literal). */
  get host(): Config$1['host'];
  /**
   * Register a named route. Duplicate (kind, path) throws — route patterns are
   * a composition-level contract, so a collision is a misconfiguration.
   * @param route - kind, path, and the owning handler.
   * @returns the disposer removing the route.
   */
  register(route: WebRoute): () => void;
  /**
   * Register an exact-path HTTP upgrade route. Duplicate paths throw because
   * one socket can have only one protocol owner.
   * @param route - pathname and handler owning negotiation plus socket use.
   * @returns the disposer removing the route.
   */
  registerUpgrade(route: WebUpgradeRoute): () => void;
  /**
   * Claim the fallback seat: the handler answering every request no named
   * route matches (the SPA dist server in the shipped Web composition). One
   * owner only — a second registration throws, because two fallbacks cannot
   * compose.
   * @param handler - owns the full response lifecycle of unmatched requests.
   * @returns the disposer releasing the seat.
   */
  registerFallback(handler: WebRoute['handler']): () => void;
  /**
   * Register an index.html transform, applied by the fallback owner to every
   * index response ({@link applyIndexTaps}) in registration order.
   * @param transform - pure html-to-html function.
   * @returns the disposer removing the transform.
   */
  tapIndex(transform: (html: string) => string): () => void;
  /** Listen; resolves once the socket is bound (rejection = FAILED fiber). */
  [Service.init](): Promise<void>;
  /** Longest-prefix-wins over the prefix table after an exact-table miss. */
  private match;
  /**
   * Run an index.html body through the registered taps in registration order
   * — called by the fallback owner on every index response it renders.
   * @param html - the raw index.html body.
   * @returns the transformed body.
   */
  applyIndexTaps(html: string): string;
}
//#endregion
//#region src/packs/serve.d.ts
declare class PanelsPackAssets {
  private readonly webServer;
  private readonly registry;
  constructor(webServer: WebServer, registry?: PackRegistry);
  register(ctx: Context): void;
  private handle;
}
//#endregion
//#region src/index.d.ts
declare const name = "openloop-dsh-panels";
declare const inject: string[];
/**
 * 插件配置（cordis 约定：同名 type + Schemastery schema，参照 artifact）。
 * §12 外部 pack 启用配置（v1：packsDir 目录扫描；缺省不扫描）。
 */
interface Config {
  /** pack 扫描目录：`dir` 下每个子目录的 `dsh-pack.json`（§12 启用方式 v1） */
  packsDir?: string;
}
declare const Config: z<Config>;
declare function apply(ctx: Context, config: Config): void;
/**
 * panel 工具的执行包装层（导出以便单测）：字符串容错 → load 唤起 → 编译注入 → 持久化。
 *
 * ⚠️ 冻结契约（真机事故 2026-08-22）：dsh-tools 会把 args 深冻结（Object.freeze），
 * 包装层绝不能在原对象上赋值——先浅拷贝 `{ ...args }` 再改，且下游调用必须传拷贝。
 */
declare function createPanelExecute(tool: ToolDefinition, ctx: Context): ToolDefinition['execute'];
//#endregion
export { type AntdThemeTokens, CUSTOM_CODE_MAX_BYTES, Config, DEFAULT_TIMEOUT_MS, HOST_LANE_RUNTIME, JsonObject, Lane, type LoadPackComponentOptions, MAX_RESPONSE_BYTES, MAX_TIMEOUT_MS, type MuiThemeInput, PACKS_ROUTE, PACK_ENTRY_VIRTUAL, PACK_NAME_RE, PACK_RUNTIMES, PACK_STYLES_VIRTUAL, PANELS_SUBDIR, PANEL_OUTPUT_SCHEMA, PANEL_PARAMETERS, PANEL_TOOL, PLUGIN_VERSION, PRESET_KINDS, type PackComponent, type PackComponentMeta, type PackComponentProps, type PackFs, type PackManifest, PackRegistry, type PackRuntime, PanelDefinition, type PanelFs, PanelMeta, type PanelStore, type PanelStoreOptions, PanelsPackAssets, PresetKind, RefreshPolicy, type RegisteredPack, ResolveWidgetDataContext, type ScanResult, type StoredPanel, WidgetDataBinding, WidgetDataSource, WidgetSource, WidgetUnit, apply, buildApiUrl, coercePanelArg, createCtxPanelFs, createMemoryPanelFs, createPanelExecute, createPanelStore, definePanelTool, forbiddenCustomCodeTerm, getPack, hasPack, inject, isForbiddenApiUrl, isPackComponent, isSafePackRelPath, listPacks, listPanels, loadPackComponent, loadPanel, looksLikeJsonContentType, name, nodePackFs, normalizeTimeoutMs, packEntryUrl, packLaneFor, packRegistry, panelsSkillProviders, parseJsonResponse, parsePackManifest, parsePickPath, pickValue, readBodyBytes, registerPack, resetPackRegistry, resolvePanelData, resolveWidgetData, savePanel, scanPacksDir, toAntdThemeTokens, toMuiThemeTokens, validateApiUrl, validatePanel };