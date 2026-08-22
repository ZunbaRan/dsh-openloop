---
name: openloop-panels-pack-guide
description: OpenLoop panels 外部组件包接入指引（§13.3）：pack manifest 契约、硬性约束、打包/注册/启用流程、主题桥接器用法与验收清单。接入外部组件包前先读。
---

# OpenLoop Panels 外部组件包接入指引

给面板接入外部组件包（`source.type: "pack"`）的完整流程与硬约束。适用对象：开发者（非运行时模型）。

## 1. pack manifest 契约（包根 `dsh-pack.json`，§12.1）

```json
{
  "name": "@acme/dsh-pack-fancy",
  "version": "0.1.0",
  "runtime": "react18",
  "entry": "dist/index.esm.js",
  "styles": "dist/index.css",
  "components": {
    "FancyCard": { "description": "…", "propsSchema": { "type": "object", "…": "…" } }
  }
}
```

- `runtime: "react18"` 走宿主车道；`"react19"` 走沙箱车道（批 4）
- `components` 的键即 widget 里 `source.component` 的合法值；`propsSchema` 供模型校验与 skill 速查

## 2. 硬性约束（§12.2，接入前逐条自检）

1. **React 18 peer**（`^18`）；`runtime: "react18"` 走宿主车道，`react19` 走沙箱车道（批 4）
2. **构建为 ESM**；`react`/`react-dom` 必须 external——server serve 时用 esbuild 将裸导入重写为共享 ESM React（`/openloop/runtime/react18-esm.<hash>.js`）
3. **样式**打进 CSS 随包 serve 或内联；**禁止全局 reset/Preflight**（manifest 校验 + 人工审核）
4. **网络**：组件禁止自发 fetch（数据走 §5.2 绑定）；校验层做禁词扫描
5. **token 合规**：推荐消费 `var(--openloop-*)`（档 2）；antd/MUI 类自带主题系统的库，经桥接器映射（§12.3）

> 注：设计文档 §12.2 即上述 5 条硬性约束（标题编号 12.2）。

## 3. 打包 / 注册 / 启用流程

1. **构建**：按 §2 约束产出 ESM + CSS（esbuild/rollup 均可，`external: ["react", "react-dom"]`）
2. **写 manifest**：包根 `dsh-pack.json`（§1），`components` 键名与导出组件一一对应
3. **装入 profile**：`pnpm` 以 file: tarball 装入目标 profile 的依赖（lab 期分发方式，O5）
4. **配置声明**：在 panels 插件配置中注册该 pack 名 → 重启 DSH 生效
5. **验证**：widget `source.type: "pack"` 的组件出现在「已注册 pack」校验清单内；面板中可引用

## 4. 主题桥接器（§12.3，批 4 启用）

自带主题系统的库经桥接器把**我们的 50 个预设系 token**映射为库的主题对象，随预设/明暗切换自动换肤：

- **antd 6**：`ConfigProvider theme.token` ← 映射我们的预设系 token，方向示例
  - `colorPrimary ← var(--openloop-primary)`
  - `borderRadius ← var(--openloop-radius-md)`
  - `colorBgBase ← var(--openloop-surface)` / `colorText ← var(--openloop-foreground)` / `colorBorder ← var(--openloop-border)`
- **MUI 9**：`createTheme({ palette, shape })` ← 同理
  - `palette.primary.main ← var(--openloop-primary)` / `palette.text.primary ← var(--openloop-foreground)`
  - `shape.borderRadius ← var(--openloop-radius-md)`
- **映射是有损的**：如 Appica 的 7 级前景 ← 我们 4 级前景（foreground/muted-foreground/subtle/strong），桥接只能近似映射，丢掉的档位按最近语义取。

方向判定：**库的「强调/主色/前景/背景/边框/圆角」六类一律从 token 取**；库内部自洽的派生色（如 hover 阶）可由其主题系统自行推导，但基色必须 token 化，否则换预设时「半套换肤」崩。

## 5. 验收清单

- [ ] `dsh-pack.json` 五字段齐全，`components` 与导出对齐
- [ ] React 18 peer；ESM 产物；react/react-dom 已 external（`grep -r "from \"react\"" dist/` 只见重写占位或注释）
- [ ] **禁全局 reset 检查**：`grep -nE "\*|html,?\s*body|:root" dist/index.css`——不得有命中全局选择器的样式；若有，改写为限定组件命名空间（如 `.fancy-card *`）或删除
- [ ] 禁词扫描通过：组件源码无 `fetch`/`XMLHttpRequest`/`WebSocket`/`eval`/`import(` 动态导入（数据必须走 §5.2 绑定）
- [ ] 换肤实测：切换 ≥2 个预设 + 明暗，组件无破版、无「半套 token」现象（见 style-guide §3 禁令）
- [ ] 错误路径：组件抛错时该格渲染「组件不可用」占位，面板其余格子正常（§11 降级）
- [ ] 真机双验证：`pnpm check` 全过 + 装入隔离 profile 端到端渲染
