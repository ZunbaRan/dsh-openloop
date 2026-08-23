"""OpenLoop panels codegen · 契约常量（同步自 TS schema）。

⚠️ 维护纪律（2026-08-23 用户定）：TS schema（packages/panels/src/presets/*/schema.ts）
是唯一事实源；新增/修改预设组件或 theme token 时**必须同步本文件**，并同步
widgets.py 组合子签名、Python 单测（tests/python/）、widget-authoring skill 速查表。
服务端 validatePanel 是漂移兜底，但不应依赖兜底。
"""

# ---- metric-grid ----
METRIC_FORMATS = ('currency-cny', 'currency', 'number', 'percent', 'text')
METRIC_DELTA_TONES = ('up', 'down', 'flat')
METRIC_EMPHASIS = ('hero', 'standard')
METRIC_ITEMS_MAX = 6
METRIC_ITEMS_MIN = 1
METRIC_LABEL_MAX = 40
METRIC_DELTA_MAX = 24
METRIC_HERO_MAX = 1

# ---- chart ----
CHART_VARIANTS = ('bar', 'line', 'donut')
CHART_DATA_MIN, CHART_DATA_MAX = 1, 100
CHART_SERIES_MIN, CHART_SERIES_MAX = 1, 6
CHART_LABEL_MAX = 40

# ---- gauge ----
GAUGE_TONES = ('success', 'warning', 'error', 'info')
GAUGE_LABEL_MAX = 40
GAUGE_TITLE_MAX = 80
GAUGE_UNIT_MAX = 8

# ---- funnel ----
FUNNEL_STAGES_MIN, FUNNEL_STAGES_MAX = 2, 8
FUNNEL_LABEL_MAX = 40

# ---- heatmap ----
HEATMAP_MAX = 10  # 行/列/标签上限均为 10
HEATMAP_LABEL_MAX = 40

# ---- data-table ----
TABLE_COLUMNS_MIN, TABLE_COLUMNS_MAX = 1, 12
TABLE_ROWS_MAX = 200
TABLE_KEY_MAX = 40

# ---- callout ----
CALLOUT_TONES = ('info', 'success', 'warning', 'error')
CALLOUT_TITLE_MAX = 80
CALLOUT_DESC_MAX = 240

# ---- text / heading / badge ----
TEXT_MAX = 5000
TEXT_SIZES = ('xs', 'sm', 'md', 'lg', 'xl')
TEXT_TONES = ('default', 'muted', 'subtle', 'strong')
TEXT_ALIGNS = ('left', 'center', 'right')
HEADING_MAX = 200
BADGE_TONES = ('neutral', 'primary', 'info', 'success', 'warning', 'error')
BADGE_LABEL_MAX = 80

# ---- 容器组合（0.2.4 两层有界规则）----
LAYOUT_KINDS = ('stack', 'grid', 'row', 'split')   # 布局容器：children 可含分组容器 + 叶子
GROUP_KINDS = ('card', 'section')                  # 分组容器：children 仅叶子
CONTAINER_KINDS = LAYOUT_KINDS + GROUP_KINDS
CHILDREN_MAX = 12

# ---- 面板级 ----
WIDGETS_MIN, WIDGETS_MAX = 1, 24
TITLE_MAX = 80


class PanelBuildError(Exception):
    """构造期 fail-fast（面向 Agent 可自修正）：消息含合法值/边界。"""
