import { Context } from "@deepseek-ai/cordis";
//#region src/types.d.ts
/** 共享基础类型（host/client 两半都引用） */
type JsonPrimitive = string | number | boolean | null;
type JsonObject = {
  readonly [key: string]: JsonPrimitive | JsonObject | readonly unknown[];
};
//#endregion
//#region src/dsl.d.ts
type CanvasLayout = 'grid' | 'flow' | 'split-h' | 'split-v';
interface CanvasNode {
  readonly id: string;
  readonly type: string;
  readonly props: JsonObject;
}
interface CanvasDocument {
  readonly title: string;
  readonly layout: CanvasLayout;
  readonly nodes: readonly CanvasNode[];
  readonly edges: readonly {
    from: string;
    to: string;
  }[];
}
interface CanvasSnapshot {
  readonly kind: 'qoder-canvas';
  readonly version: 1;
  readonly canvasId: string;
  readonly revision: number;
  readonly canvas: CanvasDocument;
}
type NodePropRule = {
  readonly kind: 'string';
  readonly maxLength: number;
  readonly required?: boolean;
} | {
  readonly kind: 'number';
  readonly min?: number;
  readonly max?: number;
  readonly required?: boolean;
} | {
  readonly kind: 'enum';
  readonly values: readonly string[];
  readonly required?: boolean;
} | {
  readonly kind: 'boolean';
  readonly required?: boolean;
} | {
  readonly kind: 'string-array';
  readonly maxLength: number;
  readonly itemMaxLength: number;
  readonly required?: boolean;
} | {
  readonly kind: 'kv-pairs';
  readonly maxPairs: number;
  readonly keyMaxLength: number;
  readonly valueMaxLength: number;
  readonly required?: boolean;
} | {
  readonly kind: 'chart-series';
  readonly required?: boolean;
} | {
  readonly kind: 'table-data';
  readonly required?: boolean;
} | {
  readonly kind: 'context-object';
  readonly maxBytes: number;
  readonly required?: boolean;
} | {
  readonly kind: 'html-source';
  readonly maxBytes: number;
  readonly required?: boolean;
};
interface NodeDefinition {
  readonly type: string;
  readonly description: string;
  readonly props: Readonly<Record<string, NodePropRule>>;
}
/** v0.1 仪表盘节点集（10 节点） */
declare const NODE_REGISTRY: Readonly<Record<string, NodeDefinition>>;
declare const LAYOUTS: readonly CanvasLayout[];
declare const LIMITS: {
  readonly maxNodes: 32;
  readonly maxDocumentBytes: number;
  readonly maxNodeBytes: number;
  readonly maxSeries: 8;
  readonly maxPointsPerSeries: 200;
  readonly maxTableRows: 100;
  readonly maxTableColumns: 12;
  readonly maxTitleLength: 120;
  readonly maxEdges: 64;
};
declare class CanvasValidationError extends Error {
  constructor(message: string);
}
declare function isValidCanvasId(id: string): boolean;
/** 生成 canvasId：cv_ + 8 位 base32（host 专用） */
declare function generateCanvasId(rand?: () => number): string;
/** 校验画布 document（fail-closed；错误聚合后统一抛 CanvasValidationError，面向 Agent 自修正） */
declare function validateCanvasDocument(value: unknown): CanvasDocument;
//#endregion
//#region src/storage.d.ts
/** 结构化路径身份（真实 FsTarget 的最小形态；宽松声明兼容测试桩） */
interface FsTargetLike {
  readonly targetKey?: string;
}
interface FsDirEntryLike {
  readonly name: string;
  readonly type: 'file' | 'directory' | 'other';
}
interface FsLike {
  resolve(path: string, opts?: {
    cwd?: string;
  }): Promise<FsTargetLike>;
  readText(target: FsTargetLike, signal?: unknown): Promise<string>;
  /** dsh-fs 形态：writeText(target, content, expected?, signal?, sandboxPolicy?) */
  writeText(target: FsTargetLike, content: string, expected?: unknown, signal?: unknown, policy?: unknown): Promise<unknown>;
  listDir?(target: FsTargetLike, signal?: unknown): Promise<readonly FsDirEntryLike[]>;
}
interface StorageOptions {
  readonly fs: FsLike;
  /** sandboxPolicy.resolve({session}) 的产物；writeText 第 5 参 */
  readonly policy?: unknown;
  /** workspace 隔离键（session cwd 编码） */
  readonly workspaceKey: string;
  /** 存储根（默认 $DSH_HOME/data/qoder-canvas 绝对路径；测试可注入相对路径） */
  readonly rootDir?: string;
}
/** 画布清单条目（工作区目录 + 版本管理 UI 的数据源） */
interface CanvasIndexEntry {
  readonly canvasId: string;
  readonly title: string;
  /** 最新 revision */
  readonly revision: number;
  /** 全部历史版本号（升序，含最新） */
  readonly revisions: readonly number[];
  /** 最近一次写入时间（ISO；listDir 无 mtime 时为空串，UI 自行容错） */
  readonly updatedAt: string;
}
/**
 * 存储根（M4 落盘修复，2026-09-06 实证）：绝对路径 $DSH_HOME/data/qoder-canvas。
 * 真机教训：相对路径（'qoder-canvas/...'）被 sandbox resolve 到【进程 cwd】
 * （非会话工作区），workspace-write 模式直接 file access denied——save 从
 * S4 起从未落盘。DSH_HOME 语义与 app 包 resolveDshHome 一致。
 */
declare function resolveStorageRoot(): string;
/** workspace 路径 → 隔离键（与 dsh 会话编码同风格：路径分隔符转下划线） */
declare function workspaceKeyOf(cwd: string | undefined): string;
declare class CanvasStorage {
  private readonly fs;
  private readonly policy;
  private readonly workspaceKey;
  private readonly rootDir;
  constructor(options: StorageOptions);
  private targetFor;
  save(snapshot: CanvasSnapshot, signal?: unknown): Promise<void>;
  /** 目录列举（listDir 可用时；canvasId 目录内的 rev 文件名） */
  private revisionsOfDir;
  /** 读最新快照（listDir 优先；降级线性扫描——listDir 不可用的桩环境） */
  latest(canvasId: string): Promise<CanvasSnapshot | null>;
  read(canvasId: string, revision: number): Promise<CanvasSnapshot | null>;
  /**
   * 画布清单（工作区目录/工具 list 参数）：listDir 扫 workspace 根，
   * 每个 cv_* 目录列 rev 文件，读最新 rev 拿标题。listDir 不可用（旧桩）返回空。
   */
  list(): Promise<readonly CanvasIndexEntry[]>;
  /** 删除一个画布产物的全部版本（0.12.10）——node:fs 递归删目录（canvasId 正则防注入） */
  deleteArtifact(canvasId: string): Promise<boolean>;
}
/** 删除一个画布产物的全部版本（返回是否真删到了东西） */
declare function deleteCanvasArtifact(rootDir: string, workspaceKey: string, canvasId: string): Promise<boolean>;
/** CanvasStorage 便捷删除（包 deleteCanvasArtifact，用本实例 rootDir/workspaceKey） */
declare module './storage.ts' {}
//#endregion
//#region src/index.d.ts
declare const name = "openloop-qoder-canvas";
declare const inject: string[];
declare function apply(ctx: Context): void;
//#endregion
export { CanvasDocument, CanvasIndexEntry, CanvasLayout, CanvasNode, CanvasSnapshot, CanvasStorage, CanvasValidationError, FsDirEntryLike, FsLike, FsTargetLike, LAYOUTS, LIMITS, NODE_REGISTRY, NodeDefinition, NodePropRule, StorageOptions, apply, deleteCanvasArtifact, generateCanvasId, inject, isValidCanvasId, name, resolveStorageRoot, validateCanvasDocument, workspaceKeyOf };