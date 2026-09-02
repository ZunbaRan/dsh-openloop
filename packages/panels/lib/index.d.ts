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
type PresetKind = 'text' | 'markdown' | 'heading' | 'badge' | 'tag' | 'divider' | 'avatar' | 'card' | 'section' | 'stack' | 'grid' | 'row' | 'split' | 'scroll-area' | 'metric' | 'metric-grid' | 'data-table' | 'list' | 'key-value' | 'stat' | 'rating' | 'empty-state' | 'timeline' | 'chart' | 'sparkline' | 'gauge' | 'funnel' | 'heatmap' | 'flow' | 'comparison' | 'steps' | 'tree' | 'callout' | 'status' | 'progress' | 'skeleton' | 'tabs' | 'accordion' | 'pagination' | 'tooltip' | 'pb-stats' | 'db-browser' | 'storage-usage' | 'api-credentials' | 'sessions-stats' | 'mcp-status' | 'plugin-registry' | 'app-manager' | 'api-usage-monitor' | 'system-overview' | 'event-log' | 'agent-activity';
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
  timeoutMs?: number;
};
interface WidgetDataBinding {
  source: WidgetDataSource;
  /** JSONPath 子集取值路径（v1：仅 a.b[0].c 形态），缺省取整个响应 */
  pick?: string;
  /**
   * 参数化取数（联动特性 v1）：url/query/body 中的 `{{paramName}}` 模板变量，
   * 渲染时用关联事件映射来的参数值替换（如 leadId）。未提供参数的变量替换为空串。
   */
  params?: Record<string, string>;
}
/**
 * 页面关联（relations）契约 v1（2026-09-02 联动特性）。
 *
 * 面板可声明两类关系：
 * - emits：本面板产生的事件（如列表点行）——payload 模板值支持 `$row.<path>`
 *   / `$panel.<path>` 取自触发上下文（被点行数据 / 面板当前数据）。
 * - consumes：本面板响应的事件——事件 payload 的某字段映射为本面板数据参数，
 *   渲染时经 refresh 端点带参取数（binding.params 声明模板变量）。
 *
 * 事件命名空间：`{app}:{entity}:{action}`（如 my-crm:lead:selected），
 * 与 rid 命名空间（`app:component`）对齐，避免跨 APP 撞名。
 */
interface PanelEmitsDecl {
  /** 事件名：`{app}:{entity}:{action}` */
  event: string;
  /** payload 模板：值支持 `$row.x` / `$panel.x` 引用（其余按字面值下发） */
  payload?: JsonObject;
  /** 渲染目标（可选）：显式指向消费方 rid；缺省按事件名推断 `{app}:{entity}-detail` */
  target?: {
    rid: string;
  };
  /** 事件说明（资源列表展示用，建议中英双语） */
  note?: string;
}
interface PanelConsumesDecl {
  /** 响应的事件名（须与某 emits 方的事件名一致才成对） */
  event: string;
  /** 事件 payload 的哪个字段映射为本面板参数（如 leadId） */
  param: string;
  /** 参数说明（资源列表展示用） */
  note?: string;
}
interface PanelRelationsDecl {
  /** 本面板触发的事件 */
  emits?: PanelEmitsDecl[];
  /** 本面板响应的事件（事件参数 → 本面板数据参数） */
  consumes?: PanelConsumesDecl[];
}
interface PanelDefinition {
  $schema: 'openloop.panel/v1';
  /** kebab-case；同 id 再调用 = 更新该面板 */
  id: string;
  title: string;
  description?: string;
  /** 页面关联声明（联动特性 v1） */
  relations?: PanelRelationsDecl;
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
//#region ../base/lib/server/index.d.ts
/**
 * SSRF 静态判定：url 指向环回/内网/不可解析地址时返回 true。
 * 普通域名无法在编译期解析，默认放行（fetch 层超时/大小限制兜底）。
 */
declare function isForbiddenApiUrl(url: string): boolean;
/** 归一化 timeoutMs：缺省 10s；超上限 clamp 30s；非法值回退默认 */
declare function normalizeTimeoutMs(timeoutMs?: number): number;
/** content-type 是否声明为 JSON */
declare function looksLikeJsonContentType(contentType: string | null | undefined): boolean;
/** 判定并解析 JSON 响应；非 JSON（声明与体解析双失败）抛可自修正错误 */
declare function parseJsonResponse(contentType: string | null | undefined, bodyText: string): unknown;
/** 流式读取响应体，超过 maxBytes 立即停止并标记截断（不缓冲超限数据） */
declare function readBodyBytes(stream: ReadableStream<Uint8Array>, maxBytes?: number): Promise<{
  bytes: Uint8Array;
  truncated: boolean;
}>;
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+cosmokit@1.8.2/node_modules/@deepseek-ai/cosmokit/lib/types/types.d.ts
declare function isArrayBufferLike(value: any): value is ArrayBufferLike;
declare function isArrayBufferSource(value: any): value is Binary.Source;
/** Binary source detection and base64/hex conversion helpers. */
declare namespace Binary {
  type Source<T extends ArrayBufferLike = ArrayBufferLike> = T | ArrayBufferView<T>;
  const is: typeof isArrayBufferLike;
  const isSource: typeof isArrayBufferSource;
  function fromSource<T extends ArrayBufferLike>(source: Source<T>): T;
  function toBase64(source: Source): string;
  function fromBase64(source: string): ArrayBuffer | Uint8Array<ArrayBuffer>;
  function toHex(source: Source): string;
  function fromHex(source: string): ArrayBuffer;
}
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+cosmokit@1.8.2/node_modules/@deepseek-ai/cosmokit/lib/types/misc.d.ts
/** String/symbol keyed dictionary type. */
type Dict<T = any, K extends string | symbol = string> = { [key in K]: T; };
/** Wrap a value in `Promise`, preserving the resolved type of existing promises. */
type Promisify<T> = Promise<T extends Promise<infer S> ? S : T>;
/** Accept a value or promise unless the value type is already promise-like. */
type Awaitable<T> = [T] extends [Promise<unknown>] ? T : T | Promise<T>;
//#endregion
//#region ../../node_modules/.pnpm/@standard-schema+spec@1.1.0/node_modules/@standard-schema/spec/dist/index.d.ts
/** The Standard Typed interface. This is a base type extended by other specs. */
interface StandardTypedV1<Input = unknown, Output = Input> {
  /** The Standard properties. */
  readonly "~standard": StandardTypedV1.Props<Input, Output>;
}
declare namespace StandardTypedV1 {
  /** The Standard Typed properties interface. */
  interface Props<Input = unknown, Output = Input> {
    /** The version number of the standard. */
    readonly version: 1;
    /** The vendor name of the schema library. */
    readonly vendor: string;
    /** Inferred types associated with the schema. */
    readonly types?: Types<Input, Output> | undefined;
  }
  /** The Standard Typed types interface. */
  interface Types<Input = unknown, Output = Input> {
    /** The input type of the schema. */
    readonly input: Input;
    /** The output type of the schema. */
    readonly output: Output;
  }
  /** Infers the input type of a Standard Typed. */
  type InferInput<Schema extends StandardTypedV1> = NonNullable<Schema["~standard"]["types"]>["input"];
  /** Infers the output type of a Standard Typed. */
  type InferOutput<Schema extends StandardTypedV1> = NonNullable<Schema["~standard"]["types"]>["output"];
}
/** The Standard Schema interface. */
interface StandardSchemaV1<Input = unknown, Output = Input> {
  /** The Standard Schema properties. */
  readonly "~standard": StandardSchemaV1.Props<Input, Output>;
}
declare namespace StandardSchemaV1 {
  /** The Standard Schema properties interface. */
  interface Props<Input = unknown, Output = Input> extends StandardTypedV1.Props<Input, Output> {
    /** Validates unknown input values. */
    readonly validate: (value: unknown, options?: StandardSchemaV1.Options | undefined) => Result<Output> | Promise<Result<Output>>;
  }
  /** The result interface of the validate function. */
  type Result<Output> = SuccessResult<Output> | FailureResult;
  /** The result interface if validation succeeds. */
  interface SuccessResult<Output> {
    /** The typed output value. */
    readonly value: Output;
    /** A falsy value for `issues` indicates success. */
    readonly issues?: undefined;
  }
  interface Options {
    /** Explicit support for additional vendor-specific parameters, if needed. */
    readonly libraryOptions?: Record<string, unknown> | undefined;
  }
  /** The result interface if validation fails. */
  interface FailureResult {
    /** The issues of failed validation. */
    readonly issues: ReadonlyArray<Issue>;
  }
  /** The issue interface of the failure output. */
  interface Issue {
    /** The error message of the issue. */
    readonly message: string;
    /** The path of the issue, if any. */
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }
  /** The path segment interface of the issue. */
  interface PathSegment {
    /** The key representing a path segment. */
    readonly key: PropertyKey;
  }
  /** The Standard types interface. */
  interface Types<Input = unknown, Output = Input> extends StandardTypedV1.Types<Input, Output> {}
  /** Infers the input type of a Standard. */
  type InferInput<Schema extends StandardTypedV1> = StandardTypedV1.InferInput<Schema>;
  /** Infers the output type of a Standard. */
  type InferOutput<Schema extends StandardTypedV1> = StandardTypedV1.InferOutput<Schema>;
}
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+cordis@4.0.1_@deepseek-ai+cordis-plugin-include@1.0.6_@deepseek-ai+cordis-plugin-loader@1.0.2/node_modules/@deepseek-ai/cordis/lib/types/utils.d.ts
/** Ordered collection of disposable values with O(1) deletion by value. */
declare class DisposableList<T extends WeakKey> {
  private sn;
  private map;
  private weak;
  get length(): number;
  push(value: T): () => boolean;
  delete(value: T): boolean;
  clear(): T[];
  [Symbol.iterator](): MapIterator<T>;
}
/** Shared symbols used to avoid public property-name collisions. */
declare const symbols: {
  shadow: symbol;
  receiver: symbol;
  original: symbol;
  metadata: symbol;
  initHooks: symbol;
  checkProto: symbol;
  effect: typeof Context$1.effect;
  filter: typeof Context$1.filter;
  isolate: typeof Context$1.isolate;
  intercept: typeof Context$1.intercept;
  init: typeof Service$1.init;
  check: typeof Service$1.check;
  config: typeof Service$1.config;
  invoke: typeof Service$1.invoke;
  extend: typeof Service$1.extend;
  tracker: typeof Service$1.tracker;
  resolveConfig: typeof Service$1.resolveConfig;
};
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+cordis@4.0.1_@deepseek-ai+cordis-plugin-include@1.0.6_@deepseek-ai+cordis-plugin-loader@1.0.2/node_modules/@deepseek-ai/cordis/lib/types/registry.d.ts
/**
 * Service dependency declaration accepted by plugins and the `@Inject`
 * decorator.
 *
 * Array form requests services without intercept config. Object form maps each
 * service name to optional intercept config for the plugin context.
 */
type Inject<M = Dict> = (keyof M)[] | { [K in keyof M]?: M[K]; };
/** Context keys that correspond to services with typed intercept config. */
type InjectKey = keyof { [K in keyof Context$1 & string as Context$1[K] extends {
  [symbols.config]: any;
} ? K : never]: any; };
/**
 * Decorator for declaring service dependencies on classes or class methods.
 *
 * On classes it contributes to the plugin's static `inject` map. On methods it
 * delays the method call until the declared services are available.
 */
/**
 * @param name — the required service name.
 * @param config — optional intercept config applied for that service.
 * @returns the class or method decorator.
 */
declare function Inject<K extends InjectKey>(name: K, config?: Context$1[K] extends {
  [symbols.config]: infer T;
} ? T : never): (value: any, decorator: ClassDecoratorContext<any> | ClassMethodDecoratorContext<any>) => void;
/** Utilities for normalizing plugin dependency declarations. */
declare namespace Inject {
  /**
   * Convert array/object/class-inherited inject metadata into a plain map.
   *
   * @param inject — the declaration to normalize; `null`/`undefined` add nothing.
   * @param result — the map to fill (service name → intercept config or `null`).
   * @returns `result`.
   */
  function resolve(inject: Inject | null | undefined, result?: Dict): Dict;
}
/** Supported plugin entrypoint shapes. */
type Plugin<T = any> = Plugin.Function<T> | Plugin.Constructor<T> | Plugin.Object<T>;
/** Types associated with plugin entrypoints and runtime records. */
declare namespace Plugin {
  /** Shared metadata understood by the plugin registry and related tooling. */
  interface Base<T = any> {
    /** Display name used for fiber diagnostics and logger names. */
    name?: string;
    /** Standard-schema validator applied to config before the plugin starts. */
    Config?: StandardSchemaV1<any, T>;
    /** Services the plugin requires; it only loads while all are available. */
    inject?: Inject;
    /** Service name(s) the plugin provides (read by `Service` and by loaders). */
    provide?: string | string[];
    /** Service names whose intercept config the plugin declares it consumes. */
    intercept?: Dict<boolean>;
  }
  interface Transform<S, T> {
    /** Marks the transform object as a schema/config transform. */
    schema?: true;
    /** Convert user-facing config to runtime config. */
    Config: (config: S) => T;
  }
  /** Function plugin called with `(ctx, config)`. */
  interface Function<T = any> extends Base<T> {
    (ctx: Context$1, config: T): any;
  }
  /** Class plugin constructed with `(ctx, config)`. */
  interface Constructor<T = any> extends Base<T> {
    new (ctx: Context$1, config: T): any;
  }
  /** Object plugin with an `apply(ctx, config)` method. */
  interface Object<T = any> extends Base<T> {
    apply(ctx: Context$1, config: T): any;
  }
  /** Mutable registry record shared by all fibers of one plugin callback. */
  interface Runtime {
    /** Display name copied from the first registered plugin shape. */
    name?: string;
    /** Every live fiber of this plugin (one per `ctx.plugin()` call). */
    fibers: DisposableList<Fiber>;
    /** The executable entrypoint all fibers share (registry identity key). */
    callback: globalThis.Function;
    /** Standard-schema validator applied to each fiber's config. */
    Config?: StandardSchemaV1;
  }
}
type Spread<T> = undefined extends T ? [config?: T] : [config: T];
type GetPluginParameters<P> = P extends ((ctx: Context$1, ...args: infer R) => any) ? R : P extends (new (ctx: Context$1, ...args: infer R) => any) ? R : P extends {
  apply(ctx: Context$1, ...args: infer R): any;
} ? R : never;
type GetPluginConfig<P> = P extends Plugin.Transform<infer S, any> ? S : GetPluginParameters<P>[0];
declare module './context.ts' {
  interface Context {
    /**
     * Run a callback once the requested services are available.
     *
     * Shorthand for `ctx.plugin({ inject, apply: callback })`: the callback
     * is unloaded and re-run whenever a required service changes.
     *
     * @param deps — required services, as an array or a name → config map.
     * @param callback — plugin body called with `(ctx, config)`.
     * @returns the fiber; awaiting it settles once loading finished.
     */
    inject(deps: Inject, callback: Plugin.Function<void>): Fiber & PromiseLike<Fiber>;
    /**
     * Load a plugin in the current context.
     *
     * @param plugin — a function, class, or `{ apply }` object plugin.
     * @param args — the plugin config, validated against its `Config` schema.
     * @returns the fiber; awaiting it settles once loading finished
     * (rejecting on config or startup errors).
     */
    plugin<P extends Plugin>(plugin: P, ...args: Spread<GetPluginConfig<P>>): Fiber & PromiseLike<Fiber>;
  }
}
/**
 * Plugin registry installed as `ctx.registry` and mixed into every context.
 *
 * It normalizes plugin shapes, tracks plugin runtimes, starts fibers, and
 * exposes map-like inspection over active plugin callbacks.
 */
declare class RegistryService {
  ctx: Context$1;
  private _counter;
  private _internal;
  constructor(ctx: Context$1);
  /** Allocate the next fiber uid (increments on every read). */
  get counter(): number;
  /** Number of registered plugin runtimes. */
  get size(): number;
  /**
   * Resolve a supported plugin shape to its executable callback.
   *
   * @param plugin — a function, class, or `{ apply }` object plugin.
   * @returns the callback identifying the plugin, or `undefined` if invalid.
   */
  resolve(plugin: Plugin): Function | undefined;
  /**
   * Look up the runtime record for a plugin.
   *
   * @param plugin — any supported plugin shape.
   * @returns the runtime, or `undefined` when the plugin is not registered.
   */
  get(plugin: Plugin): Plugin.Runtime | undefined;
  /**
   * Check whether a plugin has a registered runtime.
   *
   * @param plugin — any supported plugin shape.
   * @returns `true` when at least one fiber of the plugin exists.
   */
  has(plugin: Plugin): boolean;
  /**
   * Dispose every running fiber for a plugin and remove its runtime record.
   *
   * @param plugin — any supported plugin shape.
   * @returns the removed runtime, or `undefined` when none was registered.
   */
  delete(plugin: Plugin): Plugin.Runtime | undefined;
  /** Iterate the registered plugin callbacks. */
  keys(): MapIterator<Function>;
  /** Iterate the registered plugin runtimes. */
  values(): MapIterator<Plugin.Runtime>;
  /** Iterate `[callback, runtime]` pairs. */
  entries(): MapIterator<[Function, Plugin.Runtime]>;
  /**
   * Visit every registered runtime.
   *
   * @param callback — receives each runtime and its identifying callback.
   */
  forEach(callback: (value: Plugin.Runtime, key: Function) => void): void;
  /**
   * Start a callback once the requested dependencies are available.
   *
   * @param inject — required services, as an array or a name → config map.
   * @param callback — plugin body called with `(ctx, config)`.
   * @returns the fiber; awaiting it settles once loading finished.
   */
  inject(inject: Inject, callback: Plugin.Function<void>): Fiber & PromiseLike<Fiber>;
  /**
   * Start a plugin in the current context and return its fiber.
   *
   * Creates (or reuses) the plugin's runtime record, then starts a new fiber
   * under the current context. Throws if `plugin` is not a supported shape or
   * if the current fiber is already disposed.
   *
   * @param plugin — a function, class, or `{ apply }` object plugin.
   * @param config — the plugin config, validated against its `Config` schema.
   * @param getOuterStack — captures the caller stack for effect diagnostics.
   * @returns the fiber; awaiting it settles once loading finished.
   */
  plugin(plugin: Plugin, config?: any, getOuterStack?: () => string[]): Fiber & PromiseLike<Fiber>;
}
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+cordis@4.0.1_@deepseek-ai+cordis-plugin-include@1.0.6_@deepseek-ai+cordis-plugin-loader@1.0.2/node_modules/@deepseek-ai/cordis/lib/types/reflect.d.ts
declare module './context.ts' {
  interface Context {
    /**
     * Read a service from the store without the inject requirement.
     *
     * @param name — the service name.
     * @param strict — when `true` (default), only return implementations
     * whose providing fiber is currently active.
     * @returns the service value, or `undefined` when not (yet) provided.
     */
    get<K extends string & keyof this>(name: K, strict?: boolean): undefined | this[K];
    /** Same as above for service names outside the typed `Context` surface. */
    get(name: string, strict?: boolean): any;
    /**
     * Overwrite a provided service's value.
     *
     * Only the fiber that provided the service may set it; setting an
     * unprovided name throws.
     *
     * @param name — the service name.
     * @param value — the new service value.
     */
    set<K extends string & keyof this>(name: K, value: undefined | this[K]): void;
    /** Same as above for service names outside the typed `Context` surface. */
    set(name: string, value: any): void;
    /**
     * Register a service implementation owned by the current fiber.
     *
     * The service becomes visible to dependents in the same isolation scope
     * once the fiber is active; it is unregistered (waking dependents) when
     * the returned disposer runs or the fiber unloads. Throws if the name is
     * already provided in this scope or declared as an accessor.
     *
     * @param name — the service name.
     * @param value — the service value.
     * @returns a disposer that unregisters the service.
     */
    provide<K extends string & keyof this>(name: K, value: undefined | this[K]): () => void;
    /** Same as above for service names outside the typed `Context` surface. */
    provide(name: string, value?: any): () => void;
    /**
     * Define a computed context property backed by get/set hooks.
     *
     * The accessor is removed when the current fiber unloads. Throws if the
     * name is already declared.
     *
     * @param name — the context property name.
     * @param options — the `get` hook and optional `set` hook.
     */
    accessor(name: string, options: Omit<Property.Accessor, 'type'>): void;
    /**
     * Expose selected members of a service directly on `ctx`.
     *
     * Each mixed-in key becomes an accessor that forwards to the service
     * (binding methods to it), so e.g. `ctx.on` forwards to `ctx.events.on`.
     * Mixins are removed when the current fiber unloads.
     *
     * @param name — the context property holding the source service.
     * @param mixins — keys to forward, or a source-key → ctx-key map.
     */
    mixin<K extends string & keyof this>(name: K, mixins: (keyof this & keyof this[K])[] | Dict<string>): void;
    /** Same as above with a source object instead of a context property name. */
    mixin<T extends {}>(source: T, mixins: (keyof this & keyof T)[] | Dict<string>): void;
  }
}
/** Context property definition known by the reflection service. */
type Property = Property.Service | Property.Accessor;
/** Property definition variants understood by `ReflectService`. */
declare namespace Property {
  /** Service property backed by a provided implementation. */
  interface Service {
    /** Discriminator. */
    type: 'service';
  }
  /** Computed context property backed by custom get/set hooks. */
  interface Accessor {
    /** Discriminator. */
    type: 'accessor';
    /** Compute the property value; `error` carries the caller stack for diagnostics. */
    get: (this: Context$1, receiver: any, error: Error) => any;
    /** Optional setter; return `false` to reject the write. */
    set?: (this: Context$1, value: any, receiver: any, error: Error) => boolean;
  }
}
/** Concrete service implementation record stored in the root reflect service. */
interface Impl {
  /** The service name. */
  name: string;
  /** The fiber that provided the service (owns its lifetime). */
  fiber: Fiber;
  /** The current service value. */
  value?: any;
  /** Optional availability predicate consulted before dependents may load. */
  check?: () => boolean;
}
/**
 * Reflection and service-resolution layer installed as `ctx.reflect`.
 *
 * This service powers the context proxy, service registration, accessors, and
 * the mixins that expose core service methods directly on `ctx`.
 */
declare class ReflectService {
  ctx: Context$1;
  /** Proxy traps implementing service resolution for every context object. */
  static handler: ProxyHandler<Context$1>;
  /** Service implementations, keyed by isolation label. */
  store: Dict<Impl, symbol>;
  /** Declared context properties (services and accessors), by name. */
  props: Dict<Property>;
  constructor(ctx: Context$1);
  /**
   * Read a service from the store without the inject requirement.
   *
   * @param name — the service name.
   * @param strict — when `true`, only return implementations whose providing
   * fiber is currently active.
   * @returns the service value, or `undefined` when not (yet) provided.
   */
  get(name: string, strict?: boolean): any;
  _getImpl(name: string, strict?: boolean): Impl | undefined;
  /**
   * Overwrite a provided service's value.
   *
   * @param name — the service name.
   * @param value — the new service value.
   * @param error — carrier for the caller stack in diagnostics.
   * @returns `true` on success.
   * @throws when `name` was never provided, or was provided by another fiber.
   */
  set(name: string, value: any, error?: Error): boolean;
  /**
   * Register a service implementation owned by the current fiber.
   *
   * See the `ctx.provide()` overload above for the full contract.
   *
   * @param name — the service name.
   * @param value — the service value.
   * @param check — optional availability predicate for dependents.
   * @returns a disposer that unregisters the service.
   */
  provide(name: string, value?: any, check?: () => boolean): Disposable<Promise<void>>;
  /**
   * Re-evaluate every fiber that requires one of the given services.
   *
   * @param names — the service names that changed.
   * @param filter — restricts notification to matching isolation scopes.
   * @returns the fibers whose dependency state was refreshed.
   */
  notify(names: string[], filter?: (ctx: Context$1, name: string) => boolean): Fiber[];
  /**
   * Define a computed context property backed by get/set hooks.
   *
   * @param name — the context property name.
   * @param options — the `get` hook and optional `set` hook.
   * @returns a disposer that removes the accessor.
   */
  accessor(name: string, options: Omit<Property.Accessor, 'type'>): Disposable<Promise<void>>;
  /**
   * Expose selected members of a service directly on `ctx`.
   *
   * See the `ctx.mixin()` overload above for the full contract.
   *
   * @param source — a context property name or a source object.
   * @param mixins — keys to forward, or a source-key → ctx-key map.
   * @returns a disposer that removes all created accessors.
   */
  mixin(source: any, mixins: string[] | Dict<string>): Disposable<Promise<void>>;
  /**
   * Attach this context's tracing wrapper to a value.
   *
   * @param value — the value to wrap.
   * @returns the traceable wrapper (or the value itself when not applicable).
   */
  trace<T>(value: T): T;
  /**
   * Wrap a callback so calls trace `this` and arguments to this context.
   *
   * @param callback — the function to wrap.
   * @returns a proxy delegating to `callback` with traced values.
   */
  bind<T extends Function>(callback: T): T;
}
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+cordis@4.0.1_@deepseek-ai+cordis-plugin-include@1.0.6_@deepseek-ai+cordis-plugin-loader@1.0.2/node_modules/@deepseek-ai/cordis/lib/types/fiber.d.ts
declare module './context.ts' {
  interface Context extends Pick<Fiber, 'effect'> {
    /** The fiber (plugin runtime instance) that owns this context. */
    fiber: Fiber;
  }
}
interface AsyncDisposable<T extends Awaitable<void> = Awaitable<void>> extends PromiseLike<() => T> {
  (): T;
}
/**
 * Function returned by an effect to release resources during disposal.
 *
 * Disposers run in reverse registration order when the owning fiber unloads;
 * they may be async, in which case unloading awaits them.
 */
type Disposable<T = any> = () => T;
/**
 * Effect body result accepted by `ctx.effect()` and plugin startup.
 *
 * Either a single disposer, a promise of one, or a (possibly async) iterable
 * yielding several — generator effects register each yielded disposer as it
 * is produced.
 */
type Effect<T = any> = SyncEffect<T> | AsyncEffect<T>;
type SyncEffect<T = any> = Disposable<T> | Iterable<Disposable<T>, void, void>;
type AsyncEffect<T = any> = Promise<Disposable<T>> | AsyncIterable<Disposable<T>, void, void>;
/** Tree node used to expose nested effect labels for diagnostics. */
interface EffectMeta {
  /** Human-readable effect label, e.g. `ctx.on("event")` or `ctx.provide("name")`. */
  label: string;
  /** Metadata of nested effects registered while this effect ran. */
  children: EffectMeta[];
}
/**
 * Lifecycle state for one plugin fiber.
 *
 * `PENDING` — waiting for required services; `LOADING` — the plugin callback
 * is running; `ACTIVE` — loaded and providing; `FAILED` — the callback or its
 * config threw; `UNLOADING` — disposers are running; `DISPOSED` — the fiber
 * was removed and cannot restart.
 */
declare const enum FiberState {
  PENDING = 0,
  LOADING = 1,
  ACTIVE = 2,
  FAILED = 3,
  DISPOSED = 4,
  UNLOADING = 5
}
/**
 * Runtime instance of one plugin application.
 *
 * A fiber tracks dependency state, validated config, lifecycle effects, and
 * cleanup for the plugin context returned by `ctx.plugin()`.
 */
declare class Fiber {
  parent: Context$1;
  inject: Dict<any>;
  runtime: Plugin.Runtime | null;
  /** Unique id within the registry; 0 for the root fiber, `null` once disposed. */
  uid: number | null;
  /** The context this fiber's plugin runs in (extends the parent context). */
  readonly ctx: Context$1;
  /** The validated plugin config (updated by `update()`). */
  config: any;
  /** The raw plugin config, re-resolved before each activation. */
  _config: any;
  /** Current lifecycle state; transitions emit `internal/status`. */
  state: FiberState;
  /** Dispose this fiber: unload the plugin, then settle once cleanup finished. */
  readonly dispose: () => Promise<void>;
  /** Snapshot of required service implementations while loaded; `undefined` otherwise. */
  store: Dict<Impl> | undefined;
  /** The in-flight load/unload transition, if one is currently running. */
  inertia: Promise<void> | undefined;
  readonly _hooks: Dict<DisposableList<Function>>;
  readonly _disposables: DisposableList<Disposable<any>>;
  protected context: Context$1;
  private _error;
  private _runner;
  private _store;
  /**
   * Create a fiber. Plugin authors normally obtain fibers from `ctx.plugin()`
   * rather than constructing them directly.
   *
   * @param parent — the context the plugin was loaded from.
   * @param config — raw config, validated against the runtime's schema.
   * @param inject — resolved dependency map (service name → intercept config).
   * @param runtime — the shared plugin runtime, or `null` for the root fiber.
   * @param getOuterStack — captures the caller stack for effect diagnostics.
   */
  constructor(parent: Context$1, config: any, inject: Dict<any>, runtime: Plugin.Runtime | null, getOuterStack: () => string[]);
  /** The plugin's display name, inherited from the nearest named ancestor, else `'root'`. */
  get name(): string;
  /**
   * Throw if the fiber has already been disposed.
   *
   * @returns nothing when the fiber is still active.
   * @throws {CordisError} `INACTIVE_EFFECT` when the fiber's uid has been cleared.
   */
  assertActive(): void;
  private _execute;
  /**
   * Register a cleanup-aware effect on this fiber.
   *
   * `execute` runs immediately; the disposers it produces are collected and
   * run (in reverse order) either when the returned disposer is called or
   * when the fiber unloads, whichever comes first. Calling the disposer twice
   * is a no-op. Throws `CordisError('INACTIVE_EFFECT')` if the fiber is
   * already disposed, and `TypeError` if `execute` returns an invalid shape.
   *
   * @param execute — the effect body; see {@link Effect} for accepted shapes.
   * @param label — effect label shown in `getEffects()` diagnostics.
   * @returns a disposer that tears the effect down and settles once done.
   */
  effect(execute: () => SyncEffect, label?: string): Disposable<Promise<void>>;
  /** Same as above for async effects; the disposer is also awaitable. */
  effect(execute: () => Effect, label?: string): AsyncDisposable<Promise<void>>;
  /**
   * Return metadata for currently registered effects.
   *
   * @returns one {@link EffectMeta} tree per labeled live effect.
   */
  getEffects(): EffectMeta[];
  private _getState;
  private _updateState;
  _checkImpl(name: string): boolean | undefined;
  _refresh(): void;
  private _setEpoch;
  private _resolveConfig;
  private _reload;
  private _unload;
  /**
   * Wait for current lifecycle work and rethrow startup errors.
   *
   * @returns this fiber, once it has settled into a stable state.
   * @throws the config-validation or plugin-startup error, if any.
   */
  await(): Promise<this>;
  /**
   * Dispose and immediately reload this plugin with its current config.
   *
   * @returns a promise resolving once the reload settled.
   * @throws {CordisError} `INACTIVE_EFFECT` when the fiber is already disposed.
   */
  restart(): Promise<void>;
  /**
   * Validate and apply new config, then restart the plugin.
   *
   * Runs the `internal/update` waterfall first, so update hooks (and HMR)
   * can veto or replace the restart.
   *
   * @param config — the new raw config; validated before anything restarts.
   * @param noSave — hint for persistence hooks not to write the change back.
   * @returns the update waterfall result; the default restart returns a promise.
   * @throws when validation, an update listener, or the restarted plugin fails.
   */
  update(config: any, noSave?: boolean): void | Promise<void>;
}
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+cordis@4.0.1_@deepseek-ai+cordis-plugin-include@1.0.6_@deepseek-ai+cordis-plugin-loader@1.0.2/node_modules/@deepseek-ai/cordis/lib/types/events.d.ts
/** Extract the parameter tuple from a function type. */
type Parameters<F> = F extends ((...args: infer P) => any) ? P : never;
/** Extract the return type from a function type. */
type ReturnType$1<F> = F extends ((...args: any) => infer R) ? R : never;
/** Extract the explicit `this` type from a function type. */
type ThisType<F> = F extends ((this: infer T, ...args: any) => any) ? T : never;
/**
 * Event dispatch strategy used by the event service.
 *
 * `emit` runs synchronous listeners without awaiting them, `parallel` awaits
 * all listeners together, `serial` awaits them in order until one bails,
 * `bail` stops on the first synchronous bail value, and `waterfall` composes
 * listeners around a final `next` callback.
 */
type DispatchMode = 'emit' | 'parallel' | 'serial' | 'bail' | 'waterfall';
declare module './context.ts' {
  interface Context {
    /**
     * Dispatch an event, running all listeners concurrently.
     *
     * @param name — the event name.
     * @param args — arguments passed to every listener.
     * @returns a promise resolving once every listener has settled.
     */
    parallel<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>): Promise<void>;
    /** Same as above, with an explicit `this` for listeners (also used for filtering). */
    parallel<K extends keyof Events>(thisArg: NoInfer<ThisType<Events[K]>>, name: K, ...args: Parameters<Events[K]>): Promise<void>;
    /**
     * Dispatch an event synchronously, ignoring listener return values.
     *
     * @param name — the event name.
     * @param args — arguments passed to every listener.
     */
    emit<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>): void;
    /** Same as above, with an explicit `this` for listeners (also used for filtering). */
    emit<K extends keyof Events>(thisArg: NoInfer<ThisType<Events[K]>>, name: K, ...args: Parameters<Events[K]>): void;
    /**
     * Dispatch an event, awaiting listeners in order until one bails.
     *
     * @param name — the event name.
     * @param args — arguments passed to each listener.
     * @returns the first bail value (non-null, non-false, non-undefined), if any.
     */
    serial<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>): Promisify<ReturnType$1<Events[K]>>;
    /** Same as above, with an explicit `this` for listeners (also used for filtering). */
    serial<K extends keyof Events>(thisArg: NoInfer<ThisType<Events[K]>>, name: K, ...args: Parameters<Events[K]>): Promisify<ReturnType$1<Events[K]>>;
    /**
     * Dispatch an event, calling listeners in order until one bails.
     *
     * @param name — the event name.
     * @param args — arguments passed to each listener.
     * @returns the first bail value (non-null, non-false, non-undefined), if any.
     */
    bail<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>): ReturnType$1<Events[K]>;
    /** Same as above, with an explicit `this` for listeners (also used for filtering). */
    bail<K extends keyof Events>(thisArg: NoInfer<ThisType<Events[K]>>, name: K, ...args: Parameters<Events[K]>): ReturnType$1<Events[K]>;
    /**
     * Dispatch an event whose last argument is a `next` continuation.
     *
     * Each listener wraps the rest of the chain: calling `next()` invokes the
     * next listener (finally the built-in behavior); not calling it vetoes.
     *
     * @param name — the event name.
     * @param args — listener arguments; the final one is the innermost `next`.
     * @returns the outermost listener's return value.
     */
    waterfall<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>): ReturnType$1<Events[K]>;
    /** Same as above, with an explicit `this` for listeners (also used for filtering). */
    waterfall<K extends keyof Events>(thisArg: NoInfer<ThisType<Events[K]>>, name: K, ...args: Parameters<Events[K]>): ReturnType$1<Events[K]>;
    /**
     * Register an event listener owned by the current fiber.
     *
     * @param name — the event name to listen for.
     * @param listener — called with the dispatch arguments.
     * @param options — listener options; a boolean is shorthand for `prepend`.
     * @returns a disposer removing the listener; `true` if it was still registered.
     */
    on<K extends keyof Events>(name: K, listener: Events[K], options?: boolean | EventOptions): () => boolean;
    /**
     * Same as `on()`, but the listener disposes itself after its first call.
     *
     * @param name — the event name to listen for.
     * @param listener — called at most once with the dispatch arguments.
     * @param options — listener options; a boolean is shorthand for `prepend`.
     * @returns a disposer removing the listener; `true` if it was still registered.
     */
    once<K extends keyof Events>(name: K, listener: Events[K], options?: boolean | EventOptions): () => boolean;
  }
}
/** Options accepted by `ctx.on()` and `ctx.once()`. */
interface EventOptions {
  /** Add the listener before existing listeners for the same event. */
  prepend?: boolean;
  /** Receive the event regardless of context filter checks. */
  global?: boolean;
}
/** Registered listener record stored by the event service. */
interface Hook extends EventOptions {
  ctx: Context$1;
  callback: (...args: any[]) => any;
}
/**
 * Event bus installed as `ctx.events` and mixed into every context.
 *
 * The service supports concurrent, synchronous, serial, bail, and waterfall
 * dispatch and automatically disposes listeners with their owning fiber.
 */
declare class EventsService {
  private ctx;
  _hooks: Record<keyof any, Hook[]>;
  constructor(ctx: Context$1);
  /**
   * Resolve listeners for one dispatch and apply context filtering.
   *
   * @param type — the dispatch mode, reported on `internal/dispatch`.
   * @param args — the raw dispatch arguments; consumed up to the event name.
   * @returns the matching listener callbacks, bound to the dispatch `this`.
   */
  dispatch(type: string, args: any[]): ((...args: any[]) => any)[];
  /**
   * Run listeners concurrently and wait for all of them.
   *
   * @param args — optional `this`, the event name, then listener arguments.
   * @returns a promise resolving once every listener has settled.
   */
  parallel(...args: any[]): Promise<void>;
  /**
   * Run listeners synchronously without waiting for returned promises.
   *
   * @param args — optional `this`, the event name, then listener arguments.
   */
  emit(...args: any[]): void;
  /**
   * Run listeners in order, awaiting each, until one returns a bail value.
   *
   * @param args — optional `this`, the event name, then listener arguments.
   * @returns the first bail value (see {@link isBailed}), if any.
   */
  serial(...args: any[]): Promise<any>;
  /**
   * Run listeners synchronously until one returns a bail value.
   *
   * @param args — optional `this`, the event name, then listener arguments.
   * @returns the first bail value (see {@link isBailed}), if any.
   */
  bail(...args: any[]): any;
  /**
   * Compose listeners around the final `next` callback.
   *
   * The last dispatch argument is treated as the innermost `next`. Listeners
   * run outermost-first; a listener that does not call `next()` vetoes the
   * rest of the chain, including the built-in behavior.
   *
   * @param args — optional `this`, the event name, listener arguments, then `next`.
   * @returns the outermost listener's return value.
   */
  waterfall(...args: any[]): any;
  /**
   * Store a listener record as an effect on the current fiber.
   *
   * @param label — effect label shown in fiber diagnostics.
   * @param hooks — the listener list for one event.
   * @param callback — the listener to store.
   * @param options — placement and filtering options.
   * @returns a disposer that unregisters the listener.
   */
  register(label: string, hooks: Hook[], callback: any, options: EventOptions): () => void;
  /**
   * Remove a stored listener record.
   *
   * @param hooks — the listener list for one event.
   * @param callback — the listener to remove.
   * @returns `true` if the listener was found and removed.
   */
  unregister(hooks: Hook[], callback: any): true | undefined;
  /**
   * Register an event listener owned by the current fiber.
   *
   * The listener is removed automatically when the fiber unloads. Throws
   * `CordisError('INACTIVE_EFFECT')` if the fiber is already disposed.
   *
   * @param name — the event name to listen for.
   * @param listener — called with the dispatch arguments.
   * @param options — listener options; a boolean is shorthand for `prepend`.
   * @returns a disposer removing the listener; `true` if it was still registered.
   */
  on(name: string | symbol, listener: (...args: any) => any, options?: boolean | EventOptions): any;
  /**
   * Register an event listener that disposes itself after the first call.
   *
   * @param name — the event name to listen for.
   * @param listener — called at most once with the dispatch arguments.
   * @param options — listener options; a boolean is shorthand for `prepend`.
   * @returns a disposer removing the listener; `true` if it was still registered.
   */
  once(name: string, listener: (...args: any) => any, options?: boolean | EventOptions): any;
}
/**
 * Built-in framework events used by core services and extension points.
 *
 * Plugin and status events track fiber lifecycle, service events observe
 * dependency registration, update/get/set/listener events allow core services
 * to intercept runtime operations, and `internal/dispatch` exposes event-bus
 * diagnostics before public events are delivered.
 */
interface Events {
  /** A plugin fiber was created or its uid was cleared on disposal. */
  'internal/plugin'(fiber: Fiber): void;
  /** A fiber changed lifecycle state; receives the fiber and its previous state. */
  'internal/status'(fiber: Fiber, oldValue: FiberState): void;
  /**
   * Resolve raw plugin config after the fiber's injections become active.
   * @param config - the raw config for this activation.
   * @mode waterfall
   */
  'internal/config'(this: Fiber, config: any, next: () => any): any;
  /** Interception hook for a service binding (no core producer). */
  'internal/service'(this: Context$1, name: string, value: any): void;
  /** Waterfall: a fiber config update is being applied; skip `next()` to veto. */
  'internal/update'(this: Fiber, config: any, noSave: boolean, next: () => void | Promise<void>): void | Promise<void>;
  /** Waterfall: a service is being read through the context proxy. */
  'internal/get'(ctx: Context$1, name: string, error: Error, next: () => any): any;
  /** Waterfall: a service is being written through the context proxy. */
  'internal/set'(ctx: Context$1, name: string, value: any, error: Error, next: () => boolean): boolean;
  /** Bail: a listener is being registered; a non-null result replaces registration. */
  'internal/listener'(this: Context$1, name: string, listener: any, prepend: boolean): void;
  /** An event is being dispatched to listeners (fired for non-internal events only). */
  'internal/dispatch'(mode: DispatchMode, name: string, args: any[], thisArg: any): void;
}
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+cordis@4.0.1_@deepseek-ai+cordis-plugin-include@1.0.6_@deepseek-ai+cordis-plugin-loader@1.0.2/node_modules/@deepseek-ai/cordis/lib/types/logger.d.ts
declare module './context.ts' {
  interface Intercept {
    logger: LoggerService.Intercept;
  }
}
/** Logger method name and severity category. */
type LoggerType = 'error' | 'info' | 'warn' | 'debug';
/** Callable shape for one logger severity method. */
type LoggerMethod = (format: any, ...param: any[]) => void;
/** Formatter used to resolve a printf-style placeholder. */
type Formatter = (value: any, exporter: Exporter, message: Message) => any;
/** Structured log record delivered to exporters. */
interface Message {
  sn: number;
  ts: number;
  name: string;
  type: LoggerType;
  level: number;
  args: any[];
  fiber?: WeakRef<Fiber>;
}
/** Sink that receives structured log messages. */
interface Exporter {
  colors?: number | false;
  maxLength?: number;
  levels?: Record<string, number>;
  formatters?: Record<string, Formatter>;
  export(message: Message): void;
}
/** Options used when creating a named logger facade. */
interface LoggerOptions {
  /** The logger name shown with each message. */
  name: string;
  /** Message fields merged into every record from this logger. */
  meta?: Partial<Message>;
  /** Default maximum level exported when an exporter has no own threshold. */
  level?: number;
}
/** Logger facade identity, inherited message metadata, and optional minimum level. */
interface Logger extends LoggerOptions {}
/** Logger facade severity methods. */
interface Logger extends Record<LoggerType, LoggerMethod> {}
/** Logger facade for one named subsystem. */
declare class Logger {
  private service;
  static color(exporter: Exporter, code: number, value: any, decoration?: string): string;
  static code(name: string, level?: false | number): number;
  static format(exporter: Exporter, message: Message): string;
  constructor(options: LoggerOptions, service: LoggerService);
  private _method;
}
/** Logger service configuration merged from context intercepts. */
declare namespace LoggerService {
  interface Intercept {
    name?: string;
    level?: number;
  }
}
/** Callable `ctx.logger` service shape. */
interface LoggerService extends Record<LoggerType, LoggerMethod> {
  (name?: string): Logger;
}
/**
 * Built-in logging service.
 *
 * Call `ctx.logger()` to create a named logger, or call `ctx.logger.info()`
 * directly to log with the current fiber-derived name.
 */
declare class LoggerService {
  bufferSize: number;
  buffer: Message[];
  ctx: Context$1;
  _snMessage: number;
  _snExporter: number;
  exporters: Map<number, Exporter>;
  constructor(ctx: Context$1);
  /**
   * Register an exporter and dispose it with the current fiber.
   *
   * @param exporter — the sink that receives structured log messages.
   * @returns a disposer that removes the exporter.
   */
  exporter(exporter: Exporter): Disposable<Promise<void>>;
  private _resolveConfig;
  [symbols.invoke](name?: string): Logger;
}
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+cordis@4.0.1_@deepseek-ai+cordis-plugin-include@1.0.6_@deepseek-ai+cordis-plugin-loader@1.0.2/node_modules/@deepseek-ai/cordis/lib/types/context.d.ts
/**
 * Public shape of a Cordis context.
 *
 * The concrete `Context` class is proxied at runtime, so this interface is
 * augmented by core services and plugins to describe the properties that may
 * be read from `ctx`.
 */
interface Context$1 {
  /** Isolation map: service name → scope label. Lookups for a name resolve within its label. */
  [symbols.isolate]: Dict<symbol>;
  /** Intercept map: service name → config merged into that service's per-plugin config. */
  [symbols.intercept]: Dict;
  /** The root context of the application (every child context shares it). @experimental */
  root: this;
  /** Base URL used to resolve relative plugin/module specifiers, if the runtime sets one. */
  baseUrl?: string;
  /** The event bus. Its methods are also mixed onto `ctx` (`ctx.on`, `ctx.emit`, ...). */
  events: EventsService;
  /** The logging service. Call `ctx.logger(name)` for a named logger. */
  logger: LoggerService;
  /** The reflection layer backing the context proxy (`ctx.get`, `ctx.provide`, ...). */
  reflect: ReflectService;
  /** The plugin registry. Its methods are mixed onto `ctx` (`ctx.plugin`, `ctx.inject`). */
  registry: RegistryService;
}
/**
 * Root and child dependency containers for Cordis plugins.
 *
 * A context is a proxy: normal property reads go through the service resolver,
 * while `extend()`, `isolate()`, and `intercept()` create scoped child
 * contexts without mutating their parent.
 */
declare class Context$1 {
  /** Symbol key under which a disposer exposes its {@link EffectMeta} diagnostics tree. */
  static readonly effect: unique symbol;
  /** Symbol key for a context's listener filter, consulted on every event dispatch. */
  static readonly filter: unique symbol;
  /** Symbol key of the isolation map (see the `Context[symbols.isolate]` property). */
  static readonly isolate: unique symbol;
  /** Symbol key of the intercept map (see the `Context[symbols.intercept]` property). */
  static readonly intercept: unique symbol;
  /**
   * Returns true for Cordis context proxies and context prototypes.
   *
   * Works across realms and across multiple copies of cordis, because the
   * brand is keyed by a global symbol rather than by `instanceof`.
   *
   * @param value — the value to test.
   * @returns `true` if `value` is a Cordis context, narrowing its type.
   */
  static is(value: any): value is Context$1;
  /** Create the root context and install the built-in services. */
  constructor();
  /**
   * Create a child context with extra metadata on top of the current scope.
   *
   * The child prototypally inherits every property of this context; own
   * properties of `meta` shadow the inherited ones. The parent is not mutated.
   *
   * @param meta — own properties (including symbol keys) to define on the child.
   * @returns a child context inheriting from this one.
   */
  extend(meta?: {}): this;
  /**
   * Create a child context with an independent service scope for `name`.
   *
   * Below the returned context, reads and writes of the service `name`
   * resolve against the new label instead of the parent's, so a different
   * implementation can be provided without affecting the parent scope.
   * Passing the same `label` to two `isolate()` calls joins their scopes.
   *
   * @param name — the service name to isolate.
   * @param label — scope label to join; defaults to a fresh unique symbol.
   * @returns a child context whose `name` service resolves in the new scope.
   */
  isolate(name: string, label?: symbol): this;
  /**
   * Add service-specific intercept config for plugins started below this
   * context.
   *
   * Plugins loaded under the returned context see `config` merged into the
   * service's resolved config (ancestor entries first; see
   * `Service[symbols.resolveConfig]`). The parent context is not affected.
   *
   * @param name — the service name whose config to intercept.
   * @param config — the intercept config to merge for that service.
   * @returns a child context carrying the additional intercept entry.
   */
  intercept<K extends InjectKey>(name: K, config: Context$1[K] extends {
    [symbols.config]: infer T;
  } ? T : never): this;
  intercept(name: string, config: any): this;
}
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+cordis@4.0.1_@deepseek-ai+cordis-plugin-include@1.0.6_@deepseek-ai+cordis-plugin-loader@1.0.2/node_modules/@deepseek-ai/cordis/lib/types/service.d.ts
/**
 * Base class for services that expose a named API on `ctx`.
 *
 * Subclasses call `super(ctx, name)` from their constructor. The service is
 * registered immediately and is automatically removed with the owning fiber.
 */
declare abstract class Service$1<out T = never> {
  protected ctx: Context$1;
  /** Symbol key of an instance method run after construction (class plugins). */
  static readonly init: unique symbol;
  /** Symbol key of the availability predicate passed to `ctx.provide()`. */
  static readonly check: unique symbol;
  /** Symbol key of the phantom intercept-config type parameter. */
  static readonly config: unique symbol;
  /** Symbol key of the call body making a service callable (e.g. `ctx.logger()`). */
  static readonly invoke: unique symbol;
  /** Symbol key of the helper deriving an extended service instance. */
  static readonly extend: unique symbol;
  /** Symbol key of the tracker metadata used for context tracing. */
  static readonly tracker: unique symbol;
  /** Symbol key of the intercept-config resolution helper below. */
  static readonly resolveConfig: unique symbol;
  [symbols.config]: T;
  /** The service name this instance is registered under. */
  name: string;
  /**
   * Register this instance as `name` in the current context.
   *
   * Calls `ctx.reflect.provide(name, this, this[Service.check])`, so the
   * service is unregistered automatically when the owning fiber unloads.
   * Services with a `[Service.invoke]` body return a callable instance.
   *
   * @param ctx — the context to register in (stored as `this.ctx`).
   * @param name — the service name; defaults to the static `provide` field.
   */
  constructor(ctx: Context$1, name: string);
  protected [symbols.filter](ctx: Context$1): boolean;
  protected [symbols.extend](props?: any): any;
  /**
   * Merge intercept config from ancestors with optional base and head values.
   *
   * Entries added closer to the root apply first; `base` is prepended and
   * `head` appended. Uses `Config.merge` when the service declares one,
   * otherwise a shallow `Object.assign`.
   *
   * @param base — lowest-precedence config merged before all intercepts.
   * @param head — highest-precedence config merged after all intercepts.
   * @returns the merged config.
   */
  [symbols.resolveConfig](base?: T, head?: T): T;
  static [Symbol.hasInstance](instance: any): boolean;
}
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+schemastery@3.18.1/node_modules/@deepseek-ai/schemastery/lib/types/index.d.ts
declare const kSchema: unique symbol;
declare global {
  namespace Schemastery {
    /** Convert primitive constructors, constants, and existing schemas into a schema type. */
    type From<X> = X extends string | number | boolean ? Schema<X> : X extends Schema ? X : X extends typeof String ? Schema<string> : X extends typeof Number ? Schema<number> : X extends typeof Boolean ? Schema<boolean> : X extends typeof Function ? Schema<Function, (...args: any[]) => any> : X extends Constructor<infer S> ? Schema<S> : never;
    type TypeS1<X> = X extends Schema<infer S, unknown> ? S : never;
    type Inverse<X> = X extends Schema<any, infer Y> ? (arg: Y) => void : never;
    /** Input type accepted by a schema-like value. */
    type TypeS<X> = TypeS1<From<X>>;
    /** Output type returned by a schema-like value after validation. */
    type TypeT<X> = ReturnType<From<X>>;
    /** Resolver callback used by custom schema types registered with `Schema.extend()`. */
    type Resolve = (data: any, schema: Schema, options: Options, strict?: boolean) => [any, any?];
    /** Input type accepted by one schema in an intersection. */
    type IntersectS<X> = From<X> extends Schema<infer S, unknown> ? S : never;
    /** Output type returned by one schema in an intersection. */
    type IntersectT<X> = Inverse<From<X>> extends ((arg: infer T) => void) ? T : never;
    type TupleS<X extends readonly any[]> = X extends readonly [infer L, ...infer R] ? [TypeS<L>?, ...TupleS<R>] : any[];
    type TupleT<X extends readonly any[]> = X extends readonly [infer L, ...infer R] ? [TypeT<L>?, ...TupleT<R>] : any[];
    type ObjectS<X extends Dict> = { [K in keyof X]?: TypeS<X[K]> | null; } & Dict;
    type ObjectT<X extends Dict> = { [K in keyof X]: TypeT<X[K]>; } & Dict;
    type Constructor<T = any> = new (...args: any[]) => T;
    /** Static constructor and factory methods exposed by the default `Schema` export. */
    interface Static {
      <T = any>(options: Partial<Schema<T>>): Schema<T>;
      new <T = any>(options: Partial<Schema<T>>): Schema<T>;
      prototype: Schema;
      /** Validate a value against a schema node and return `[output, adaptedInput?]`. */
      resolve: Resolve;
      /** Infer a schema from a primitive value, constructor, or existing schema. */
      from<X = any>(source?: X): From<X>;
      /** Register a resolver for a custom schema `type`. */
      extend(type: string, resolve: Resolve): void;
      /** Accept any value without validation. */
      any<T = any>(): Schema<T>;
      /** Accept only nullable input. */
      never(): Schema<never>;
      /** Accept exactly one constant value. */
      const<const T>(value: T): Schema<T>;
      /** Accept strings, with optional metadata constraints added by instance methods. */
      string(): Schema<string>;
      /** Accept numbers, with optional range and step constraints. */
      number(): Schema<number>;
      /** Accept non-negative integer numbers. */
      natural(): Schema<number>;
      /** Accept a number between 0 and 1 and mark it as a slider. */
      percent(): Schema<number>;
      /** Accept booleans. */
      boolean(): Schema<boolean>;
      /** Accept `Date` instances or parse datetime strings into `Date` objects. */
      date(): Schema<string | Date, Date>;
      /** Accept `RegExp` instances or parse strings into regular expressions. */
      regExp(flag?: string): Schema<string | RegExp, RegExp>;
      /** Accept binary sources and normalize them to `ArrayBufferLike`. */
      arrayBuffer(): Schema<Binary.Source, ArrayBufferLike>;
      arrayBuffer(encoding: 'hex' | 'base64'): Schema<Binary.Source | string, ArrayBufferLike>;
      /** Accept a numeric bitset or string keys and normalize to a number. */
      bitset<K extends string>(bits: Partial<Record<K, number>>): Schema<number | readonly K[], number>;
      /** Accept functions. */
      function(): Schema<Function, (...args: any[]) => any>;
      /** Accept instances of a constructor or objects whose constructor name matches. */
      is(constructor: string): Schema;
      is<T>(constructor: Constructor<T>): Schema<T>;
      /** Accept arrays whose elements match `inner`. */
      array<X>(inner: X): Schema<TypeS<X>[], TypeT<X>[]>;
      /** Accept plain objects with values matching `inner` and optional key schema. */
      dict<X, Y extends Schema<any, string> = Schema<string>>(inner: X, sKey?: Y): Schema<Dict<TypeS<X>, TypeS<Y>>, Dict<TypeT<X>, TypeT<Y>>>;
      /** Accept tuple arrays where each index matches the corresponding schema. */
      tuple<const X extends readonly any[]>(list: X): Schema<TupleS<X>, TupleT<X>>;
      /** Accept plain objects whose declared properties match the schema dictionary. */
      object<X extends Dict>(dict: X): Schema<ObjectS<X>, ObjectT<X>>;
      /** Accept values matching at least one schema in `list`. */
      union<const X>(list: readonly X[]): Schema<TypeS<X>, TypeT<X>>;
      /** Accept values matching every schema in `list`, merging object outputs. */
      intersect<const X>(list: readonly X[]): Schema<IntersectS<X>, IntersectT<X>>;
      /** Validate with `inner`, then convert the result with `callback`. */
      transform<X, T>(inner: X, callback: (value: TypeS<X>, options: Schemastery.Options) => T, preserve?: boolean): Schema<TypeS<X>, T>;
      /** Defer construction of a recursive schema until validation or serialization. */
      lazy<X extends Schema>(callback: () => X): X;
      ValidationError: typeof ValidationError;
    }
    /** Runtime validation options shared by all schema calls. */
    interface Options {
      /** Remove invalid object properties instead of throwing when possible. */
      autofix?: boolean;
      /** Skip validation for selected values and schema nodes. */
      ignore?(data: any, schema: Schema): boolean;
      /** Path used to format nested validation errors. */
      path?: (keyof any)[];
    }
    /** UI and validation metadata attached by schema builder methods. */
    interface Meta<T = any> {
      default?: T extends {} ? Partial<T> : T;
      required?: boolean;
      disabled?: boolean;
      collapse?: boolean;
      badges?: {
        text: string;
        type: string;
      }[];
      hidden?: boolean;
      loose?: boolean;
      role?: string;
      extra?: any;
      link?: string;
      description?: string | Dict<string>;
      comment?: string;
      pattern?: {
        source: string;
        flags?: string;
      };
      max?: number;
      min?: number;
      step?: number;
    }
  }
  /** Callable schema instance that validates input and returns normalized output. */
  interface Schemastery<S = any, T = S> {
    (data?: S | null, options?: Schemastery.Options): T;
    new (data?: S | null, options?: Schemastery.Options): T;
    [kSchema]: true;
    uid: number;
    meta: Schemastery.Meta<T>;
    type: string;
    sKey?: Schema;
    inner?: Schema;
    list?: Schema[];
    dict?: Dict<Schema>;
    bits?: Dict<number>;
    callback?: Function;
    constructor?: string | Function;
    builder?: Function;
    value?: T;
    refs?: Dict<Schema>;
    preserve?: boolean;
    '~standard': StandardSchemaV1.Props;
    /** Format this schema as a compact TypeScript-like type string. */
    toString(inline?: boolean): string;
    /** Serialize this schema, preserving shared and recursive references. */
    toJSON(): Schema<S, T>;
    /** Mark nullable input as invalid unless a default supplies a fallback. */
    required(value?: boolean): Schema<S, T>;
    /** Hide this schema node from UI renderers. */
    hidden(value?: boolean): Schema<S, T>;
    /** Return the default value instead of throwing when validation fails. */
    loose(value?: boolean): Schema<S, T>;
    /** Attach a renderer role and optional role-specific metadata. */
    role(text: string, extra?: any): Schema<S, T>;
    /** Attach an external documentation link. */
    link(link: string): Schema<S, T>;
    /** Set the fallback value used for nullable input. */
    default(value: T): Schema<S, T>;
    /** Attach an auxiliary comment for documentation or form UIs. */
    comment(text: string): Schema<S, T>;
    /** Attach a localized or plain description for documentation or form UIs. */
    description(text: string): Schema<S, T>;
    /** Mark this schema node as disabled for form UIs. */
    disabled(value?: boolean): Schema<S, T>;
    /** Request collapsed rendering for nested form UIs. */
    collapse(value?: boolean): Schema<S, T>;
    /** Add a deprecated badge to this schema node. */
    deprecated(): Schema<S, T>;
    /** Add an experimental badge to this schema node. */
    experimental(): Schema<S, T>;
    /** Require strings to match a regular expression. */
    pattern(regexp: RegExp): Schema<S, T>;
    /** Set an inclusive maximum for numbers or collection lengths. */
    max(value: number): Schema<S, T>;
    /** Set an inclusive minimum for numbers or collection lengths. */
    min(value: number): Schema<S, T>;
    /** Set the numeric increment constraint. */
    step(value: number): Schema<S, T>;
    /** Add or replace an object property schema. */
    set(key: string, value: Schema): Schema<S, T>;
    /** Append a tuple, union, or intersection member schema. */
    push(value: Schema): Schema<S, T>;
    /** Remove values equal to schema defaults from normalized output. */
    simplify(value?: any): any;
    /** Return a schema clone with descriptions merged from locale messages. */
    i18n(messages: Dict): Schema<S, T>;
    /** Attach arbitrary metadata consumed by form renderers and downstream tools. */
    extra<K extends keyof Schemastery.Meta>(key: K, value: Schemastery.Meta[K]): Schema<S, T>;
  }
}
declare class ValidationError extends TypeError {
  options: Schemastery.Options;
  name: string;
  constructor(message: string, options: Schemastery.Options);
  static is(error: any): error is ValidationError;
}
type Schema<S = any, T = S> = Schemastery<S, T>;
declare const Schema: Schemastery.Static;
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+dsh-host-webserver@0.1.1-rc.2_@deepseek-ai+cordis@4.0.1_@deepseek-ai+dsh-i_e7f477f2960cf0c612a9f538dd11e2fa/node_modules/@deepseek-ai/dsh-host-webserver/lib/types/injections.d.ts
/**
 * Structured index injections: the typed rows plugins contribute to the boot
 * HTML instead of raw `tapIndex` string transforms. Rows are pure
 * JSON-serializable data because one table feeds two renderers: the served
 * form renders rows into the index.html text ({@link renderIndexInjections}),
 * and a static worker deployment ships the same rows over its boot payload
 * for a page-side interpreter. Anything not expressible as a row stays on
 * `tapIndex`, which runs after row rendering.
 */
/** Document region a rendered row lands in: after the opening head or body tag. */
type IndexInjectionPlacement$1 = 'head' | 'body';
/** One structured index injection row. */
type IndexInjection$1 =
/** Assign a JSON-serializable value to a `globalThis` property, ahead of later script rows. */
{
  kind: 'global';
  name: string;
  value: unknown;
} |
/** Inline classic script. `text` must not contain `</script`, which would close the element early. */
{
  kind: 'script';
  placement: IndexInjectionPlacement$1;
  text: string;
} |
/**
 * External classic script, executed in table order: a parser-blocking tag
 * when served, an awaited fetch-and-execute in the worker form (whose
 * loader resolves worker-only URLs such as `/plugins/...`).
 */
{
  kind: 'script-src';
  placement: IndexInjectionPlacement$1;
  src: string;
} |
/** A `<style>` element in the head. `text` must not contain `</style`, which would close the element early. */
{
  kind: 'style';
  text: string;
} |
/** Raw markup fragment. */
{
  kind: 'html';
  placement: IndexInjectionPlacement$1;
  html: string;
};
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+dsh-host-webserver@0.1.1-rc.2_@deepseek-ai+cordis@4.0.1_@deepseek-ai+dsh-i_e7f477f2960cf0c612a9f538dd11e2fa/node_modules/@deepseek-ai/dsh-host-webserver/lib/types/index.d.ts
declare module '@deepseek-ai/cordis' {
  interface Context {
    webServer: WebServer$1;
  }
  interface Events {
    /**
     * Collect the structured index injection table. Emitted on every index
     * render and every worker boot-payload request; listeners push their
     * current rows, so a row's data is read fresh at emit time.
     * @param table - Mutable row table; listeners append in activation order.
     * @mode emit
     */
    'webserver/index-inject'(table: IndexInjection$1[]): void;
  }
}
/** Route match kind: 'exact' matches the pathname verbatim; 'prefix' p matches p and p/<anything>. */
type WebRouteKind$1 = 'exact' | 'prefix';
/** One named route registration. */
interface WebRoute$1 {
  kind: WebRouteKind$1;
  /** Absolute pathname, no trailing slash. */
  path: string;
  /** Owns the full response lifecycle (may hold the response open, e.g. SSE). */
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
}
/** One exact-path HTTP upgrade registration. */
interface WebUpgradeRoute$1 {
  /** Absolute pathname, no trailing slash. */
  path: string;
  /** Owns protocol negotiation and the upgraded socket after dispatch. */
  handler: (req: IncomingMessage, socket: Duplex, head: Buffer) => void | Promise<void>;
}
/** Gateway config: the listen address. */
interface Config$2 {
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
declare class WebServer$1 extends Service$1 {
  private config;
  static Config: Schema<Config$2>;
  private readonly exact;
  private readonly prefixes;
  private readonly upgrades;
  private readonly upgradedSockets;
  private readonly indexTaps;
  private fallback;
  private server;
  private listenedPort;
  constructor(ctx: Context$1, config: Config$2);
  /** The listening port (the OS-assigned value when config.port is 0). */
  get port(): number;
  /** The configured bind host (the loopback or all-interfaces literal). */
  get host(): Config$2['host'];
  /**
   * Register a named route. Duplicate (kind, path) throws — route patterns are
   * a composition-level contract, so a collision is a misconfiguration.
   * @param route - kind, path, and the owning handler.
   * @returns the disposer removing the route.
   */
  register(route: WebRoute$1): () => void;
  /**
   * Register an exact-path HTTP upgrade route. Duplicate paths throw because
   * one socket can have only one protocol owner.
   * @param route - pathname and handler owning negotiation plus socket use.
   * @returns the disposer removing the route.
   */
  registerUpgrade(route: WebUpgradeRoute$1): () => void;
  /**
   * Claim the fallback seat: the handler answering every request no named
   * route matches (the SPA dist server in the shipped Web composition). One
   * owner only — a second registration throws, because two fallbacks cannot
   * compose.
   * @param handler - owns the full response lifecycle of unmatched requests.
   * @returns the disposer releasing the seat.
   */
  registerFallback(handler: WebRoute$1['handler']): () => void;
  /**
   * Register a raw-HTML index transform, the escape hatch for markup no
   * {@link IndexInjection} row expresses: {@link renderIndex} applies taps in
   * registration order after rendering the structured rows.
   * @param transform - pure html-to-html function.
   * @returns the disposer removing the transform.
   */
  tapIndex(transform: (html: string) => string): () => void;
  /** Listen; resolves once the socket is bound (rejection = FAILED fiber). */
  [Service$1.init](): Promise<void>;
  /** Longest-prefix-wins over the prefix table after an exact-table miss. */
  private match;
  /**
   * Run an index.html body through the registered taps in registration order
   * — called by the fallback owner on every index response it renders.
   * @param html - the raw index.html body.
   * @returns the transformed body.
   */
  applyIndexTaps(html: string): string;
  /**
   * Gather the structured injection table: one `webserver/index-inject` emit,
   * every subscriber pushes its current rows. Fresh per call, so subscribers
   * read live state (module graph, theme preference) at emit time.
   * @returns rows in subscriber activation order.
   */
  collectIndexInjections(): IndexInjection$1[];
  /**
   * Render one index.html body: the structured injection table first, then
   * the raw `tapIndex` transforms over the result.
   * @param html - the raw index.html body.
   * @returns the transformed body.
   */
  renderIndex(html: string): string;
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
 * 校验页面关联声明（联动 v1）：emits（event/payload/target/note）与
 * consumes（event/param/note）。事件名要求 `{app}:{entity}:{action}` 三段命名空间。
 */
declare function validateRelations(panelId: string, relations: unknown): void;
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
 * 解析 pick 路径（v1：仅 a.b[0].c 形态）：`a.b[0].c` → ['a', 'b', 0, 'c']。
 * 裸数字段转 number（数组索引），其余为字符串键。
 */
declare function parsePickPath(pick: string): Array<string | number>;
/**
 * 按 pick 路径取值；缺路径/路径不存在返回 undefined（不抛错）。
 * 段访问用 hasOwnProperty 防护，避免命中原型链（JSON.parse 产物亦安全）。
 */
declare function pickValue(data: unknown, pick?: string): unknown;
/** 拼接 query 参数到 api url（原 url 已有 query 时合并） */
declare function buildApiUrl(url: string, query?: Record<string, string>): string;
/**
 * 联动参数模板替换（2026-09-02 联动特性 v1）：
 * 把 binding.params 声明的 `{{paramName}}` 模板变量替换为运行时参数值。
 * 替换范围：url / query 值 / body 序列化后的字符串 / pick 不动。
 * - 参数已提供 → 替换为 encodeURIComponent 后的值（URL 上下文安全）
 * - 声明了但未提供 → 替换为空串（面板可先渲染空态）
 * - 值含特殊字符按 URL 语境转义；body 为 JSON 序列化后整体替换（保持结构合法）
 */
declare function applyBindingParams(binding: WidgetDataBinding, values: Record<string, unknown>): WidgetDataBinding;
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
//#region ../../node_modules/.pnpm/@deepseek-ai+dsh-host-webserver@0.1.1-rc.2_@deepseek-ai+cordis@4.0.1_@deepseek-ai+dsh-i_e7f477f2960cf0c612a9f538dd11e2fa/node_modules/@deepseek-ai/dsh-host-webserver/lib/types/injections.d.ts
/**
 * Structured index injections: the typed rows plugins contribute to the boot
 * HTML instead of raw `tapIndex` string transforms. Rows are pure
 * JSON-serializable data because one table feeds two renderers: the served
 * form renders rows into the index.html text ({@link renderIndexInjections}),
 * and a static worker deployment ships the same rows over its boot payload
 * for a page-side interpreter. Anything not expressible as a row stays on
 * `tapIndex`, which runs after row rendering.
 */
/** Document region a rendered row lands in: after the opening head or body tag. */
type IndexInjectionPlacement = 'head' | 'body';
/** One structured index injection row. */
type IndexInjection =
/** Assign a JSON-serializable value to a `globalThis` property, ahead of later script rows. */
{
  kind: 'global';
  name: string;
  value: unknown;
} |
/** Inline classic script. `text` must not contain `</script`, which would close the element early. */
{
  kind: 'script';
  placement: IndexInjectionPlacement;
  text: string;
} |
/**
 * External classic script, executed in table order: a parser-blocking tag
 * when served, an awaited fetch-and-execute in the worker form (whose
 * loader resolves worker-only URLs such as `/plugins/...`).
 */
{
  kind: 'script-src';
  placement: IndexInjectionPlacement;
  src: string;
} |
/** A `<style>` element in the head. `text` must not contain `</style`, which would close the element early. */
{
  kind: 'style';
  text: string;
} |
/** Raw markup fragment. */
{
  kind: 'html';
  placement: IndexInjectionPlacement;
  html: string;
};
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+dsh-host-webserver@0.1.1-rc.2_@deepseek-ai+cordis@4.0.1_@deepseek-ai+dsh-i_e7f477f2960cf0c612a9f538dd11e2fa/node_modules/@deepseek-ai/dsh-host-webserver/lib/types/index.d.ts
declare module '@deepseek-ai/cordis' {
  interface Context {
    webServer: WebServer;
  }
  interface Events {
    /**
     * Collect the structured index injection table. Emitted on every index
     * render and every worker boot-payload request; listeners push their
     * current rows, so a row's data is read fresh at emit time.
     * @param table - Mutable row table; listeners append in activation order.
     * @mode emit
     */
    'webserver/index-inject'(table: IndexInjection[]): void;
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
   * Register a raw-HTML index transform, the escape hatch for markup no
   * {@link IndexInjection} row expresses: {@link renderIndex} applies taps in
   * registration order after rendering the structured rows.
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
  /**
   * Gather the structured injection table: one `webserver/index-inject` emit,
   * every subscriber pushes its current rows. Fresh per call, so subscribers
   * read live state (module graph, theme preference) at emit time.
   * @returns rows in subscriber activation order.
   */
  collectIndexInjections(): IndexInjection[];
  /**
   * Render one index.html body: the structured injection table first, then
   * the raw `tapIndex` transforms over the result.
   * @param html - the raw index.html body.
   * @returns the transformed body.
   */
  renderIndex(html: string): string;
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
export { type AntdThemeTokens, CUSTOM_CODE_MAX_BYTES, Config, DEFAULT_TIMEOUT_MS, HOST_LANE_RUNTIME, JsonObject, Lane, type LoadPackComponentOptions, MAX_RESPONSE_BYTES, MAX_TIMEOUT_MS, type MuiThemeInput, PACKS_ROUTE, PACK_ENTRY_VIRTUAL, PACK_NAME_RE, PACK_RUNTIMES, PACK_STYLES_VIRTUAL, PANELS_SUBDIR, PANEL_OUTPUT_SCHEMA, PANEL_PARAMETERS, PANEL_TOOL, PLUGIN_VERSION, PRESET_KINDS, type PackComponent, type PackComponentMeta, type PackComponentProps, type PackFs, type PackManifest, PackRegistry, type PackRuntime, PanelConsumesDecl, PanelDefinition, PanelEmitsDecl, type PanelFs, PanelMeta, PanelRelationsDecl, type PanelStore, type PanelStoreOptions, PanelsPackAssets, PresetKind, RefreshPolicy, type RegisteredPack, ResolveWidgetDataContext, type ScanResult, type StoredPanel, WidgetDataBinding, WidgetDataSource, WidgetSource, WidgetUnit, apply, applyBindingParams, buildApiUrl, coercePanelArg, createCtxPanelFs, createMemoryPanelFs, createPanelExecute, createPanelStore, definePanelTool, forbiddenCustomCodeTerm, getPack, hasPack, inject, isForbiddenApiUrl, isPackComponent, isSafePackRelPath, listPacks, listPanels, loadPackComponent, loadPanel, looksLikeJsonContentType, name, nodePackFs, normalizeTimeoutMs, packEntryUrl, packLaneFor, packRegistry, panelsSkillProviders, parseJsonResponse, parsePackManifest, parsePickPath, pickValue, readBodyBytes, registerPack, resetPackRegistry, resolvePanelData, resolveWidgetData, savePanel, scanPacksDir, toAntdThemeTokens, toMuiThemeTokens, validateApiUrl, validatePanel, validateRelations };