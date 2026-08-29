# 可视化工具路由矩阵（唯一事实源）

> **状态**：2026-08-29 建立Routing 评审（三方交叉：主 Agent 分析 + 路由红队 + 信息架构评审）结论落地的产物。
> **读者**：维护者（人 + Agent）。本文件是「用户意图 → 可视化工具」决策表的唯一事实源；四个工具 description 与 skill description 是它的镜像。
> **背景问题**：入口文本（description 层）曾把 flow/timeline/comparison 引流到已退役的 visualize_ui、panel 的数据/预设能力零声明、计数漂移两次（26 vs 33、61 vs 62）。模糊用户请求（"画个图""帮我看看这组数据"）12 条实测 7 条犹豫/错路由。

## 1. 决策表

工具：`panel`（预设组件 + 数据绑定 + persist）/ `html_artifact`（自由 HTML 三档）/ `show_widget`（小卡片）。`visualize_ui` 已退役。

| 用户意图（含模糊说法） | panel | html_artifact | show_widget |
|---|---|---|---|
| 仪表盘 / 监控看板 / 多指标汇总 / "数据大屏"（结构化） | ✅ 首选（预设 + API 数据绑定 + refresh + persist） | ⚠️ 可用（network 档自由实现，放弃契约与复用） | ❌ 太小 |
| 单张图表（"画个图" / "数字太多要直观"） | ✅ 首选（chart/gauge/funnel/heatmap 预设；**单 widget 面板合法**） | ⚠️ 可用（chartjs 预置库） | ⚠️ 可用（内联 SVG，仅小图） |
| 流程图 / 时间线 / 对比 | ✅ 首选（**flow / timeline / comparison 预设已实现**） | ⚠️ 可用（手写） | ⚠️ 可用（小图手写） |
| 小交互卡片（计算器 / 单模拟器 / 单点讲解） | ❌ 杀鸡用牛刀 | ❌ 太重 | ✅ 首选 |
| 需要实时 API 数据的**小工具**（如汇率计算器） | ✅ 首选（数据绑定，结构化） | ✅ 首选（network 档，页面代码自己 fetch） | ❌ **离线，禁 API** |
| 整页应用 / 自由布局 / 品牌定制 / 全屏 | ❌ 契约限制 | ✅ 首选 | ❌ 太小 |
| 持久保存 / 以后复用（"保存下来以后看"） | ✅ 首选（persist + load） | ⚠️（session 内回放） | ❌ 临时卡片 |
| 单句结论 | ❌ 勿建面板，直接文字回答 | ❌ | ❌ |

## 2. 硬边界（三条，路由裁决的根据）

1. **show_widget 离线**：fragment 无网络（CSP 禁 fetch）——任何"要实时数据"的请求都不得路由给它。
2. **panel 输出受契约约束**：预设/custom code 都无网络（custom code CSP `connect-src 'none'`）；数据一律经服务端数据绑定注入。
3. **html_artifact network 档是唯一「页面代码自己 fetch」的通道**（openloop.fetch 桥，https JSON，SSRF 防护）。

## 3. 退役迁移

`visualize_ui`（declarative 包）已退役：flow / timeline / comparison 一律走 **panel 预设**。任何入口文本（工具 description / skill description / skill 正文路由句）不得再引流到 visualize_ui；declarative 自身 description 以 "Deprecated" 开头自我声明。

## 4. 维护纪律（本文件是唯一事实源）

- **新增/修改预设组件、数据能力、runtime 档位时，必须同步**：① 本矩阵 ② 四个工具 description（`packages/{panels,artifact,widget,declarative}/src` 的工具注册处）③ skill 注册 description（`panels/src/skills/index.ts`、`artifact/src/skill.ts`、`widget/src/skill.ts`）。
- **计数禁令**：N 个预设 / N 个 token 这类计数**禁止出现在 description 层**（已发生两次漂移）；精确计数只允许存在于 skill 正文一处。
- **对称性由测试锁定**：`packages/panels/tests/routing-contract.spec.ts` 断言互引矩阵对称、无退役引用、意图词存在——`pnpm check` 强制执行，对称性从「约定」变「断言」。
- **意图级回归**：`docs/PANELS_ACCEPTANCE_PROMPTS.md` §「意图级路由回归」收录不点名工具的模糊 prompt，供真机回归。
