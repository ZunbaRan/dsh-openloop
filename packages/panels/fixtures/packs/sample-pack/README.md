# sample-pack（外部组件包最小示例）

设计文档 §12（pack 契约）的最小示例。**v1（S6）不要求真实构建产物**——pack 路由静态
serve 产物文件，loader 测试用 mock；本目录只提供 manifest + 源码 + 构建说明。

## 结构

```
sample-pack/
├── dsh-pack.json      # §12.1 pack manifest（name/version/runtime/entry/styles/components）
└── src/index.jsx      # React 18 组件源码（默认导出 FancyCard）
```

## 构建（示意，安装进 profile 目录前执行）

入口契约：构建产物为 **ESM** 且 **默认导出组件函数**（§12.2 硬约束 1/2 + loader.ts 校验）。

```bash
# 用 esbuild 打包为 ESM；react / react-dom 必须 external（由宿主 React 18 提供）
npx esbuild src/index.jsx \
  --bundle \
  --format=esm \
  --platform=browser \
  --jsx=automatic \
  --external:react \
  --external:react-dom \
  --outfile=dist/index.js

# 样式可选：css 打进 dist/index.css（如有），禁止全局 reset/Preflight（§12.2 硬约束 3）
```

产物布局与 `dsh-pack.json` 对齐：`entry: "dist/index.js"`、`styles: "dist/index.css"`。

## 安装 / 启用（v1）

把整个包目录（含构建产物）放进 `packsDir` 下（每包一子目录），并在插件配置声明：

```jsonc
{ "openloop-dsh-panels": { "packsDir": "<profile>/data/openloop-packs" } }
```

启动时 `scanPacksDir` 读取 `<packsDir>/*/dsh-pack.json` 注册（§12 启用方式 v1），
随后 pack 路由 `/openloop/packs/<name>/...` 开始 serve，模型即可在面板里引用
`{ "type": "pack", "pack": "@openloop/sample-pack", "component": "FancyCard", "props": {...} }`。
