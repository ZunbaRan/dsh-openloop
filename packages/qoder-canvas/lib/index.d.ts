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
interface FsLike {
  /** 相对路径解析（cwd 回退链），返回绝对路径或 null */
  resolve(path: string, options?: {
    cwd?: string;
  }): string | null;
  readText(path: string): Promise<string | null>;
  /** dsh-fs 形态：writeText(path, content, encoding?, signal?, policy?) */
  writeText(path: string, content: string, encoding?: unknown, signal?: unknown, policy?: unknown): Promise<void>;
}
interface StorageOptions {
  readonly fs: FsLike;
  /** sandboxPolicy.resolve({session}) 的产物；writeText 第 5 参 */
  readonly policy?: unknown;
  /** workspace 隔离键（session cwd 编码） */
  readonly workspaceKey: string;
  /** 存储根（默认 'qoder-canvas'，测试可注入） */
  readonly rootDir?: string;
}
/** workspace 路径 → 隔离键（与 dsh 会话编码同风格：路径分隔符转下划线） */
declare function workspaceKeyOf(cwd: string | undefined): string;
declare class CanvasStorage {
  private readonly fs;
  private readonly policy;
  private readonly workspaceKey;
  private readonly rootDir;
  constructor(options: StorageOptions);
  private pathFor;
  save(snapshot: CanvasSnapshot, signal?: unknown): Promise<void>;
  /** 读最新快照（扫描 rev 递减；v0.1 不存索引文件，快照数 ≤ 轮数，线性可接受） */
  latest(canvasId: string): Promise<CanvasSnapshot | null>;
  read(canvasId: string, revision: number): Promise<CanvasSnapshot | null>;
  /** 画布清单（list 参数）：扫 workspace 目录下全部 canvasId 取各自最新 rev */
  list(): Promise<readonly {
    canvasId: string;
    title: string;
    revision: number;
  }[]>;
}
//#endregion
//#region src/index.d.ts
declare const name = "openloop-qoder-canvas";
declare const inject: string[];
declare function apply(ctx: Context): void;
//#endregion
export { CanvasDocument, CanvasLayout, CanvasNode, CanvasSnapshot, CanvasStorage, CanvasValidationError, FsLike, LAYOUTS, LIMITS, NODE_REGISTRY, NodeDefinition, NodePropRule, StorageOptions, apply, generateCanvasId, inject, isValidCanvasId, name, validateCanvasDocument, workspaceKeyOf };