"""OpenLoop panels codegen · 公共 API 面。

模型脚本模板：
    import sys; sys.path.insert(0, "<skill_dir>/scripts")
    from openloop_panels import Panel, grid, card, metric, metrics, donut, gauge, funnel, heatmap, table, callout, text, heading, badge, divider, bar, line, stack
"""
from .contracts import PanelBuildError
from .widgets import (
    badge, bar, callout, card, divider, donut, funnel, gauge, grid,
    heading, heatmap, line, metric_grid, metric_item, metrics, stack, table, text,
)
from .builder import Panel

__all__ = [
    'Panel', 'PanelBuildError',
    'text', 'heading', 'badge', 'divider',
    'metric_item', 'metric_grid', 'metrics',
    'donut', 'bar', 'line', 'gauge', 'funnel', 'heatmap',
    'table', 'callout',
    'card', 'grid', 'stack',
]
