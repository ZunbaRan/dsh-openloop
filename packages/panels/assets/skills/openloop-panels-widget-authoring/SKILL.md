---
name: openloop-panels-widget-authoring
description: OpenLoop panels Agent widget 编写指引（§13.2）：资源选择阶梯、33 个预设组件 kind+props 速查、custom code 契约、数据绑定写法与面板构图硬规则。调用 panel 工具前先读。
---

# OpenLoop Panels Agent widget 编写指引

用 `panel` 工具做**多 widget 的面板**（仪表盘/监控/汇总）。先读本 skill，再选资源，再写面板。

> **调用约定（重要）**：`panel` 参数**直接传 JSON 对象**（`{"$schema":"openloop.panel/v1","id":"...","title":"...","widgets":[...]}`），不要把它字符串化成一段 JSON 文本——对象形式有完整的结构引导，校验信息也更易自修正。

## 0. 资源选择阶梯（默认路由，优先用左边）

```
① 预设组件能表达 → 用预设（零成本车道：无 runtime、≈0 内存、原生换肤）
② 结构不够但无品牌要求 → token 化自定义（沙箱 + 桥接，仍跟随换肤）
③ 品牌强定制 / 复杂交互 / 指定 React 库 → 沙箱自由车道（付全价）
```

写 widget 前先自问：预设有没有？结构不够？品牌要求强不强？**能预设就别写代码。**

## 1. 面板构建通道（按复杂度选）

| 场景 | 通道 | 说明 |
|---|---|---|
| 小面板（≤3 个简单 widget） | 直传 panel 对象 | 一次工具调用 |
| **复杂面板（多 widget/图表/容器组合）** | **代码生成（主推）** | 见下，写代码比手写 JSON 快且不会踩契约坑 |
| 调试已有面板 JSON | panelFile | write/edit 文件后渲染 |

### 代码生成工作流（复杂面板首选，推荐所有面板）

本 skill 自带 Python 生成器库（openloop_panels），**契约内化到函数签名**——枚举/边界/容器规则在构造期校验，手写 JSON 会踩的坑（series 必填、tone 枚举、列 id、数字 values）在这里结构性不会发生：

1. write `gen_panel.py`（库路径 = 本 skill 目录下 `scripts/`）：

```python
import sys; sys.path.insert(0, "<skill_dir>/scripts")
from openloop_panels import Panel, grid, card, metrics, donut, gauge, funnel, heatmap, callout, heading, text

p = Panel("data-insights", title="数据洞察")
p.layout_grid(columns=2)
p.add(card(donut([("订阅", 62), ("定制", 38)], title="营收构成"), title="收入"))
p.add(card(gauge("完成率", 72, tone="info"), title="进度"))
p.add(metrics([("月营收", 48210, "+12.4%", "currency"), ("订单数", 1208, "-2.1%")]))
p.save("panels/data-insights.json")
```

2. bash 执行：`python3 gen_panel.py`
3. 渲染：`panel { "panelFile": "panels/data-insights.json" }`
4. 修改：编辑脚本重跑（或 read 生成的 JSON 局部改）

组合子速查（全部返回 widget dict，可直接嵌套）：
- `metrics([(label, value, delta?, fmt?)...], title=?)` 指标组（delta 自动推断涨跌色）
- `donut([(label, value)...])` / `bar(rows, [(key,label)...], x_key)` / `line(...)` 图表（series 契约自动内化）
- `gauge(label, 0-100)` / `funnel([(label, value, detail?)...])` / `heatmap(matrix, row_labels, col_labels)`
- `table([(key, label, align?)...], rows, title=?)` / `callout(text, tone=?, title=?)`
- `text(s)` / `heading(s)` / `badge(label, tone=?)` / `divider()`
- 容器：`card(children, title=?)`、`grid(children, columns=2)`、`stack(children)`（两层规则构造期强制：布局>分组>叶子）
- `Panel(id, title).add(widget)` → `.save(path)`；非法输入抛 `PanelBuildError`（中文消息带合法值）

### panelFile 通道（调试/微调 JSON 用）

write `panels/<id>.json`（单层编码无转义问题）→ `panel { "panelFile": "..." }`；修改 = read → 局部改 → write → 重渲染。优先级：panel > panelFile > load。

## 4. 数据绑定（§5.2，实时语义） PLACEHOLDER