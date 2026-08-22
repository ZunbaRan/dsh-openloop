# panels 代码生成通道（Python builder API）设计草案 v1

> **状态**：**已立项、暂缓实施（2026-08-22 用户拍板）**——作为后续大版本项目；当前先跑通全部验收 prompt（PANELS_ACCEPTANCE_PROMPTS.md）再启动。实施时以本文档为基准，从 §7 S1 开始。
> **日期**：2026-08-22
> **前置**：panelFile 通道已上线（panels 0.2.5+）；DSH bash 沙箱在用户环境实测可用（workspace-write 正常，check.txt 验证通过）

## 1. 背景与实证

| 证据 | 结论 |
|---|---|
| qwen3.7-plus 字符串化 2000+ 字符 JSON：31 调用 0 交付 | arguments 内嵌 JSON 是死路（双重编码） |
| panelFile（write JSON 文件）：1m27s 一次到位 | 文件通道成立，但 JSON 手写负担仍在（series 必填坑、引号/逗号严格性） |
| 用户 excalidraw skill（Python builder API）：JSON 问题消失 + 输出/思考时间双降 | **代码生成是被实证的最优形态**：五层机制（必填默认值化 / id 自动生成 / 结构噪音吸收 / 智能辅助 / 高层组合子）+ Python 语法宽容 |
| 用户 Terminal + DSH web：bash 写文件成功 | 执行通道可用，插件无需绑定 runtime |

## 2. 架构

```
模型                          DSH 环境                    panels 插件
──────                        ──────────                  ───────────
write gen_panel.py     ──►    workspace 文件
                              （import skill 自带的
                               openloop_panels 库）
bash python3 gen_panel.py ──► 输出 panels/<id>.json
                              （构造期 fail-fast 校验）
panel { panelFile }    ─────────────────────────────►   读取 → 服务端
                                                              validatePanel（最终闸门）
                                                              → 渲染
```

- **零绑定 runtime**：用环境自带 python3（用户主机 3.13.11 已验证）；库只用标准库
- **三层防线**：Python 构造期校验（快速反馈，错误定位到脚本行）→ JSON 本身合法（json.dumps 保证）→ 服务端 validatePanel（安全网，兜住库版本漂移）
- **降级链**：bash 不可用的环境 → panelFile + 手写 JSON（现状保留）→ 直传对象

## 3. Python API 表面（对齐 excalidraw canvas/api.py 模式）

### 3.1 核心对象

```python
from openloop_panels import Panel, grid, card, metric, donut, gauge, funnel, heatmap, ...

p = Panel("data-insights", title="数据洞察", description="核心业务指标一览")
```

### 3.2 组合子分层（26 kind 全覆盖，按使用频率排优先级）

**P0（高频，v1 必做）**

| API | 生成 kind | sugar 说明 |
|---|---|---|
| `p.add(widget)` / `p.add_all([...])` | — | 顶层添加（widgets） |
| `grid(children, cols=2, gap=12)` | grid | children 为子 widget 列表 |
| `card(children, title=None, description=None)` | card | children 可单个或列表 |
| `metric(label, value, *, fmt="number", delta=None, delta_tone=None, emphasis=None)` | metric-grid 单项 | **id 自动生成**（kebab-case，可 `id=` 覆盖） |
| `metric_grid(items)` / `p.metrics([(label, value), ...])` | metric-grid | 列表快捷式 |
| `donut(pairs, title=None)` / `bar(rows, x_key, series)` / `line(rows, x_key, series)` | chart | **series 契约内化**：`donut([("订阅", 62), ("定制", 38)])` 自动生成 data+series+xKey——本轮真机坑在 API 形态下不可能发生 |
| `gauge(label, value)` | gauge | value 0–100 |
| `funnel(stages)` / `funnel([("访问",128000), ...])` | funnel | |
| `heatmap(matrix, row_labels, col_labels)` | heatmap | |
| `table(columns, rows)` | data-table | |
| `callout(text, tone="info", title=None)` | callout | tone 白名单构造期校验 |
| `text(s)` / `heading(s, level=2)` / `badge(s, tone)` / `divider()` | 同名 | |

**P1（v1.1）**：`flow(nodes, edges)`（tone 枚举校验——danger/default 坑免疫）、`timeline(items)`、`comparison(columns, rows)`（列 id 自动生成——本轮真机坑免疫）、`key_value(pairs)`、`list_widget(items)`、`progress(value)`、`sparkline(points)`、`status(label, tone)`

**P2（随需）**：stack/row/split/section/tag/avatar/rating/empty-state/steps/tree/accordion/tabs/skeleton/tooltip/pagination/scroll-area/stat/metric（单数）

### 3.3 设计原则（从 excalidraw api.py 提炼）

1. **必填字段默认值化**：id 自动生成（`_nid()` 模式）、`$schema`/`source.type` 等包装结构全部内化
2. **契约即签名**：枚举值（tone/format/variant）用 Python 字面量集合 + 构造期校验，错误消息带合法值列表和脚本行号
3. **智能 sugar**：常见模式一个调用（donut 两元组列表、metrics 二元组列表、comparison 列 id 自动生成）
4. **只做数据构造，不做布局计算**：不做 excalidraw 的坐标/测量（那是画布场景）；panels 的布局是声明式（grid cols），无需智能辅助
5. **fail-fast**：构造期校验数量边界（metric-grid 1–6、children 0–12、容器两层规则），违反立即抛 `PanelBuildError`（中文消息 + 合法范围）

### 3.4 输出

```python
p.save("panels/data-insights.json")      # 格式化 JSON（ensure_ascii=False, indent=2）
print(p.to_json())                        # stdout 输出（调试用）
```

## 4. 契约单一来源策略（关键风险对策）

**风险**：TS schema（schema.ts/validate.ts）与 Python 库双维护 → 枚举/边界漂移。

**对策（v1 务实版）**：

1. TS 侧 schema 始终是 **source of truth**；Python 库的枚举表/边界常量集中放在 `contracts.py` 单文件，头部注释标注「同步自 packages/panels/src/presets/*/schema.ts」
2. 服务端 validatePanel 是最终闸门——即使 Python 库漂移放过非法值，服务端 fail-closed 拒绝且错误可自修正（已实证模型能 read→write 自愈）
3. （后续可选）构建期从 schema.ts 生成 contracts.py 的代码片段，彻底消灭手抄——v1 不做，等漂移真正发生再上

## 5. 交付物与目录

```
packages/panels/assets/skills/openloop-panels-widget-authoring/
├── SKILL.md                    # 新增 §1B 代码生成工作流教学
└── scripts/
    └── openloop_panels/
        ├── __init__.py         # 公共 API 面（组合子 re-export）
        ├── builder.py          # Panel 对象 + add/save/to_json
        ├── widgets.py          # P0/P1 组合子
        └── contracts.py        # 枚举/边界常量（同步自 TS schema）
```

- 随 tarball 分发（assets 已在 files 列表），skill base directory 即库根——模型 `sys.path.insert(0, "<skill_dir>/scripts")` 后 import
- skill 教学模板：

```
大型面板（>4 个 widget 或含多图表）优先代码生成：
1. write gen_panel.py（模板见下）
2. bash: python3 gen_panel.py
3. panel { "panelFile": "panels/<id>.json" }
```

## 6. 测试计划

1. **Python 侧单测**（pytest 或 unittest，随包但不依赖安装）：每个组合子的契约校验（枚举拒绝/边界拒绝/id 自动生成/series 内化）
2. **golden 对拍**：同一面板「API 生成 JSON」vs「手写合法 JSON」结构一致
3. **服务端闭环**：API 生成的 JSON 全部通过 validatePanel（对 26 kind 采样）
4. **真机验证**：headless 跑大面板 prompt（含 chart/card/grid 组合），确认模型走 write 脚本 → bash 执行 → panelFile 路径

## 7. 实施步骤

| 步骤 | 内容 | 产出 |
|---|---|---|
| S1 | contracts.py + widgets.py（P0 组合子 + 构造期校验） | Python 库 v0.1 |
| S2 | builder.py（Panel/save）+ Python 单测 + golden 对拍 | 测试绿 |
| S3 | SKILL.md §1B 教学 + 模板 | 文档 |
| S4 | 打包发布 panels 0.3.0 + 双 profile 安装 | tgz |
| S5 | headless 真机：大面板代码生成链路端到端 | 会话日志证据 |

## 8. 边界与非目标

- **不提供 JS 版生成器**（v1）：模型 python3/node 都有，但单语言减少双维护；JS 版随需
- **不在插件服务端执行任何模型代码**：执行完全在 DSH bash 沙箱（用户方案核心），插件只消费 JSON 产物
- **不替代 panelFile/直传**：三条通道并存，skill 教学给出选择阶梯（代码生成 > panelFile > 直传对象）
- bash 不可用环境（如 CI 受限沙箱）：文档注明降级到 panelFile + JSON 手写
