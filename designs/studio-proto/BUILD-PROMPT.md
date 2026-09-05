# Studio 构建提示词（PRD → DSH）

> 用法：起一个 DSH web 会话（任意工作目录均可，路径已写绝对路径），按「阶段 0 → M0 → M1…」顺序逐段粘贴。
> 每阶段 agent 完工后，你先按该阶段验收清单真机检查，通过后再贴下一阶段。
> 不要一次全贴——分段喂才能让它每步都建立在已验收的地基上。

---

## ⚠️ 先读：平台能力边界（2026-09-05 首轮实跑教训）

本 PRD 混合了两类内容，喂给 DSH 前必须区分，否则它会提出「改 vendor node_modules 里的平台包」这种越界方案：

- **平台已有能力**（A 轨，会话内可直接用）：PB 集合机制（app_events/api_usage 先例，initCollections 幂等）、panels 数据驱动注入 + 本地后端预设族（local-backend.ts，7 预设 5 端点）、relations refresh 取数、浏览器侧 POST 写路径（30s 去重）、app-manager 写操作先例
- **平台待扩展**（B 轨，回 openloop 源仓库走发布纪律，不归 DSH 会话）：form 预设族、声明式 submitAction 写桥、通用建集合 action、自定义聚合端点（pipeline-stats/overview）
- **硬边界**：禁止改 vendor node_modules 平台包；禁止重启/占用 3080；真机验证用隔离实例（独立 DSH_HOME + 3082/3084）

若 DSH 提出扩展平台才能继续：让它先出「能力审计 + A/B 分轨计划」（A 轨现有能力先建 studio 骨架，B 轨输出需求清单给维护者），确认后再动手。

---

## 阶段 0 · 读 PRD + 复述理解（先贴这段）

```
你要用 openloop 插件体系真实构建「studio 内容创作工作室」系统。
PRD 是一个高保真交互原型，先全部读完再动手：

- /Users/loloru/Documents/data/project/openChamber/dsh-visual-plugins/designs/studio-proto/data.jsx
  —— 数据模型（ideas/drafts/assets/calendar 字段）、状态机、组件清单（STUDIO_RESOURCES，12 个）、
  API 清单（STUDIO_APIS，10 个）、关联声明（REL_DECLS）
- 同目录下 scene-chat.jsx / scene-board.jsx / scene-registry.jsx /
  scene-detail.jsx / scene-edit.jsx / scene-topology.jsx —— 每个组件的规格与交互
- 同目录下 scene-forms.jsx —— 只需理解「三形态选型矩阵」，月历拖块是
  panels-自由二期候选，本期不实现

若上述路径不可达，直接向我要仓库位置——不要凭记忆猜测文件内容。

设计法则（不可违背）：
1. 读写组件分离：detail 只读；edit/create 是独立 form 组件，靠 relations 串联，
   禁止在任何组件里内嵌「编辑模式开关」
2. 数据绑定服务端注入，panel 零网络；表单提交走声明式 submitAction（宿主写桥执行）
3. 校验 fail-closed，错误消息带「期望值 vs 实际值」，面向 Agent 可自修正
4. 关联声明用 {app}:{entity}:{action} 命名空间（见 data.jsx REL_DECLS）
5. artifact 只用于 studio:system-map；其余全部 panel 预设，不发明新的表面
6. 状态机是写操作的骨架：想法 候选→采中→立项/搁置→归档；稿件 制作中→审核中→排期中→已发布

读完后不要写任何代码，先复述：① 系统实体与字段 ② 组件清单及各自预设/形态
③ API 清单 ④ 关联图 ⑤ 你对设计法则的理解。我确认无误后再给你开工指令。
```

---

## M0 · 地基：集合 + API + seed + 想法库端到端

```
开工 M0（只做什么，不多做）：
1. app_backend 建 5 个集合（ideas/drafts/assets/calendar/events），字段按 data.jsx 的
   mock 结构；幂等，存在即跳过
2. 注册 10 个 API 资源（STUDIO_APIS 清单），含 tags/platforms 配置查询、
   pipeline-stats/overview 聚合端点、idea-actions 动作端点
3. 用 data.jsx 的 mock 数据做 seed（9 想法 / 6 稿件 / 8 素材 / 6 排期）
4. 生成 studio:idea-bank（data-table 预设，数据绑定 studio:ideas）：
   状态筛选 chips（全部/采中/候选/搁置/归档 带计数）+ 行内轻操作（采中/搁置/复活）+ 空态文案

验收（你自查后报告）：
- curl 10 个端点全部 200 且返回 seed 数据
- 想法库在对话流渲染，筛选/轻操作生效，轻操作后 events 集合出现对应事件
```

## M1 · 详情与关联

```
M1：
1. studio:draft-list（data-table，consumes idea:open/stage:open/day:open 三参数）
2. studio:idea-detail（只读组合：detail-grid + 关联稿件 + 状态时间线 + markdown 备注）
3. 接通 relations：idea-bank 点行 → draft-list 按 {{ideaId}} 取数（不经 Agent）；
   idea-detail 消费 idea:open
验收：点想法行 → 关联稿件即时出现；切行 → 联动内容跟着变；event-log 无异常错误
```

## M2 · 管线与写路径

```
M2：
1. studio:pipeline-flow（flow 预设，数据绑定 studio:pipeline-stats）：
   每阶段显示计数 + 平均滞留 + 滞留超限标警（瓶颈监测，不是美化计数器）
2. 状态流转写操作全部走 studio:idea-actions（pick/hold/revive/archive/promote + bulk）
3. promote 动作 = 建 draft（关联 ideaId），emit studio:idea:promote
验收：推进一个稿件阶段 → pipeline-stats 变化 + app_events 落库 + event-log 可见；
点管线阶段 → draft-list 按 {{stage}} 过滤
```

## M3 · 排期/素材/表单组件

```
M3（注意：form 预设族属 B 轨平台扩展——若审计确认平台尚无 form 预设，
本阶段 3/4 顺延，先交付 1/2，表单组件等 B 轨发布后补建）：
1. studio:calendar（timeline，绑定 studio:calendar?week=）+ 排期改期写操作
2. studio:asset-table（data-table + 搜索栏 ?q=）
3. studio:idea-create / studio:idea-edit（form 预设族，声明式 submitAction，
   校验失败不出请求、错误文案双语）【依赖 B 轨】
4. idea-detail 的「✎ 编辑」→ emits idea:edit → idea-edit 以浮窗/跳转打开（不内嵌编辑模式）【依赖 B 轨】
验收：空标题提交 idea-create 返回结构化校验错误；idea-edit 保存后详情/列表同步刷新；
素材搜索过滤生效（3/4 顺延时验收只覆盖 1/2）
```

## M4 · 看板组装 + 系统地图 + 自观察

```
M4：
1. 把 8 个 tile pin 上「工作室驾驶舱」看板（想法热度 heatmap / 管线 / 本周概览 metric-grid /
   排期 / 素材 / 方法论 markdown / event-log / excalidraw mcp-app）
2. studio:system-map（artifact network 档）：全系统拓扑 + 节点健康状态 + 点节点导航
3. 自观察四件套 pin 同板：event-log / api-usage-monitor / system-overview / agent-activity
验收：重启 web 后看板与 tile 仍在且重新取数；hover 想法 tile 关联 tile 亮灯；
杀一次 PB 进程看 watchdog 重启 + pendingSync 恢复对齐
```

---

## 全程纪律

- 每阶段只做完工范围，**禁止提前做下一阶段**；每阶段末停下来等验收
- 出 bug 先看 `openloop-app-doctor` skill 的自愈决策树，不要乱改架构
- 所有写操作必须落 app_events（这是自观察层与 bug 探测的数据源）
- 真机验证端口用 3082/3084，不占用户 3080
