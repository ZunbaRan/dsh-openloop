# 可视化工具路由矩阵（唯一事实源）

> **状态**：2026-08-29 建立Routing 评审（三方交叉：主 Agent 分析 + 路由红队 + 信息架构评审）结论落地的产物；2026-09-04 visualize_ui 正式退役。
> **读者**：维护者（人 + Agent）。本文件是「用户意图 → 可视化工具」决策表的唯一事实源；三个工具（panel / html_artifact / show_widget）description 与 skill description 是它的镜像。
> **背景问题**：入口文本（description 层）曾把 flow/timeline/comparison 引流到当时仍注册的 visualize_ui、panel 的数据/预设能力零声明、计数漂移两次（26 vs 33、61 vs 62）。模糊用户请求（"画个图""帮我看看这组数据"）12 条实测 7 条犹豫/错路由。

## 1. 决策表

三个工具：`panel`（预设组件 + 数据绑定 + persist）/ `html_artifact`（自由 HTML 三档）/ `show_widget`（小卡片）。

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

## 3. visualize_ui 已退役（2026-09-04）

`visualize_ui`（declarative 包）**已退役**：能力自 0.1.4 起被 panels 完全覆盖（flow/timeline/comparison 移植改写），先以 Deprecated 路标形态保留注册防止模型凭记忆调用落空；2026-09-04 用户拍板正式卸载——dsh 已卸载该插件、不再打包分发（`pack-all.mjs`/`check-all.mjs` 均已移除）、源码保留作历史参考。历史对话中模型若仍凭记忆调 visualize_ui，将得到「工具不存在」并自行改选 panel（panel description 已声明 flow/timeline/comparison 预设）。

## 4. 维护纪律（本文件是唯一事实源）

- **新增/修改预设组件、数据能力、runtime 档位时，必须同步**：① 本矩阵 ② 三个工具 description（`packages/{panels,artifact,widget}/src` 的工具注册处）③ skill 注册 description（`panels/src/skills/index.ts`、`artifact/src/skill.ts`、`widget/src/skill.ts`）。
- **计数禁令**：N 个预设 / N 个 token 这类计数**禁止出现在 description 层**（已发生两次漂移）；精确计数只允许存在于 skill 正文一处。
- **对称性由测试锁定**：`packages/panels/tests/routing-contract.spec.ts` 断言三工具在目录中、首选三工具互引——`pnpm check` 强制执行。
- **意图级回归**：`docs/PANELS_ACCEPTANCE_PROMPTS.md` §「意图级路由回归」收录不点名工具的模糊 prompt，供真机回归。
