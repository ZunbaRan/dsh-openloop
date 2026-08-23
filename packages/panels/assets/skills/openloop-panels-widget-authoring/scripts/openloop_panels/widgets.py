"""OpenLoop panels codegen · P0 组合子（契约内化到函数签名）。

每个组合子返回 widget dict（{id, source: {type: 'preset', kind, props}}），
构造期 fail-fast 校验（枚举/边界/容器规则），id 自动生成（kind-N 计数器）。
对齐 excalidraw canvas/api.py 模式：必填默认值化 / id 自动生成 / 结构噪音吸收 /
智能 sugar（donut(pairs)、metrics(list)）/ 契约即签名。
"""
from __future__ import annotations

import re
from typing import Any, Iterable, Sequence

from . import contracts as C

_id_counter: dict[str, int] = {}


def _auto_id(kind: str) -> str:
    _id_counter[kind] = _id_counter.get(kind, 0) + 1
    n = _id_counter[kind]
    return kind if n == 1 else f'{kind}-{n}'


def _widget(kind: str, props: dict[str, Any], id: str | None = None) -> dict[str, Any]:
    return {'id': id or _auto_id(kind), 'source': {'type': 'preset', 'kind': kind, 'props': props}}


def _check_enum(value: str, allowed: Sequence[str], label: str) -> None:
    if value not in allowed:
        raise C.PanelBuildError(f'{label} 必须是 {" / ".join(allowed)} 之一，收到 {value!r}')


def _check_len(value: str, maximum: int, label: str) -> None:
    if len(value) > maximum:
        raise C.PanelBuildError(f'{label} 长度上限 {maximum} 字符，当前 {len(value)}')


def _check_children(children: Sequence[dict[str, Any]], parent_kind: str) -> list[dict[str, Any]]:
    if isinstance(children, dict):
        children = [children]
    if len(children) > C.CHILDREN_MAX:
        raise C.PanelBuildError(f'{parent_kind} children 数量上限 {C.CHILDREN_MAX}，当前 {len(children)}')
    for child in children:
        kind = child.get('source', {}).get('kind', '?')
        if kind in C.CONTAINER_KINDS:
            ok = kind in C.GROUP_KINDS and parent_kind in C.LAYOUT_KINDS
            if not ok:
                rule = (f'分组容器 "{parent_kind}" 的 children 仅支持叶子组件' if parent_kind in C.GROUP_KINDS
                        else f'布局容器 "{parent_kind}" 的 children 不支持布局容器（布局不可嵌套；用 card/section 分组）')
                raise C.PanelBuildError(f'children 内容器 "{kind}" 不允许：{rule}')
    return list(children)


# ---------------------------------------------------------------------------
# 文本族
# ---------------------------------------------------------------------------

def text(s: str, *, tone: str = 'default', size: str = 'md', align: str = 'left', id: str | None = None) -> dict:
    _check_enum(tone, C.TEXT_TONES, 'text tone')
    _check_enum(size, C.TEXT_SIZES, 'text size')
    _check_enum(align, C.TEXT_ALIGNS, 'text align')
    _check_len(s, C.TEXT_MAX, 'text')
    return _widget('text', {'text': s, 'tone': tone, 'size': size, 'align': align}, id)


def heading(s: str, *, align: str = 'left', id: str | None = None) -> dict:
    _check_enum(align, C.TEXT_ALIGNS, 'heading align')
    _check_len(s, C.HEADING_MAX, 'heading')
    return _widget('heading', {'text': s, 'align': align}, id)


def badge(label: str, *, tone: str = 'neutral', id: str | None = None) -> dict:
    _check_enum(tone, C.BADGE_TONES, 'badge tone')
    _check_len(label, C.BADGE_LABEL_MAX, 'badge label')
    return _widget('badge', {'label': label, 'tone': tone}, id)


def divider(id: str | None = None) -> dict:
    return _widget('divider', {}, id)


# ---------------------------------------------------------------------------
# 指标族
# ---------------------------------------------------------------------------

def metric_item(label: str, value: Any, *, fmt: str = 'number', delta: str | None = None,
                delta_tone: str | None = None, emphasis: str = 'standard', id: str | None = None) -> dict:
    """metric-grid 的单个指标。delta 为字符串（如 '+12.4%'）；delta_tone 可自动推断。"""
    _check_enum(fmt, C.METRIC_FORMATS, 'metric format')
    _check_enum(emphasis, C.METRIC_EMPHASIS, 'metric emphasis')
    _check_len(label, C.METRIC_LABEL_MAX, 'metric label')
    if delta_tone is not None:
        _check_enum(delta_tone, C.METRIC_DELTA_TONES, 'metric deltaTone')
    elif delta is not None:
        delta_tone = 'up' if delta.startswith('+') else ('down' if delta.startswith('-') else 'flat')
    if delta is not None:
        _check_len(delta, C.METRIC_DELTA_MAX, 'metric delta')
    if fmt in ('currency-cny', 'currency', 'number', 'percent') and not isinstance(value, (int, float)):
        raise C.PanelBuildError(f'metric "{label}" 的 value 在 fmt={fmt!r} 下必须是数字，收到 {type(value).__name__}')
    item: dict[str, Any] = {'id': id or _auto_id('m'), 'label': label, 'value': value, 'format': fmt}
    if delta is not None:
        item['delta'] = delta
        item['deltaTone'] = delta_tone
    if emphasis != 'standard':
        item['emphasis'] = emphasis
    return item


def metric_grid(items: Sequence[dict], *, title: str | None = None, id: str | None = None) -> dict:
    if not (C.METRIC_ITEMS_MIN <= len(items) <= C.METRIC_ITEMS_MAX):
        raise C.PanelBuildError(f'metric-grid items 数量必须 {C.METRIC_ITEMS_MIN}–{C.METRIC_ITEMS_MAX}，当前 {len(items)}')
    heroes = sum(1 for it in items if it.get('emphasis') == 'hero')
    if heroes > C.METRIC_HERO_MAX:
        raise C.PanelBuildError(f'metric-grid emphasis=hero 至多 {C.METRIC_HERO_MAX} 个，当前 {heroes}')
    props: dict[str, Any] = {'items': list(items)}
    if title:
        _check_len(title, C.TITLE_MAX, 'metric-grid title')
        props['title'] = title
    return _widget('metric-grid', props, id)


def metrics(pairs: Sequence[Sequence[Any]], *, title: str | None = None, id: str | None = None) -> dict:
    """快捷式：[(label, value), (label, value, delta), (label, value, delta, fmt), ...]"""
    items = []
    for pair in pairs:
        label, value = pair[0], pair[1]
        delta = pair[2] if len(pair) > 2 else None
        fmt = pair[3] if len(pair) > 3 else 'number'
        items.append(metric_item(label, value, fmt=fmt, delta=delta))
    return metric_grid(items, title=title, id=id)


# ---------------------------------------------------------------------------
# 图表族（chart 多 variant 单 kind；series 契约内化）
# ---------------------------------------------------------------------------

def _chart(variant: str, data: list[dict], series: list[dict], x_key: str,
           *, title: str | None = None, legend: bool | None = None, id: str | None = None) -> dict:
    _check_enum(variant, C.CHART_VARIANTS, 'chart variant')
    if not (C.CHART_DATA_MIN <= len(data) <= C.CHART_DATA_MAX):
        raise C.PanelBuildError(f'chart data 行数必须 {C.CHART_DATA_MIN}–{C.CHART_DATA_MAX}，当前 {len(data)}')
    if not (C.CHART_SERIES_MIN <= len(series) <= C.CHART_SERIES_MAX):
        raise C.PanelBuildError(f'chart series 数量必须 {C.CHART_SERIES_MIN}–{C.CHART_SERIES_MAX}，当前 {len(series)}')
    for s in series:
        if s.get('key') not in (data[0] if data else {}):
            raise C.PanelBuildError(f'chart series key {s.get("key")!r} 在 data 行中不存在（data 字段须与 series.key 对应）')
    props: dict[str, Any] = {'variant': variant, 'data': data, 'series': series, 'xKey': x_key}
    if title:
        _check_len(title, C.TITLE_MAX, 'chart title')
        props['title'] = title
    if legend is not None:
        props['legend'] = legend
    return _widget('chart', props, id)


def donut(pairs: Sequence[Sequence[Any]], *, title: str | None = None, id: str | None = None) -> dict:
    """快捷式：donut([('订阅', 62), ('定制', 38)]) → xKey=label, series=[{key:'value'}]。"""
    data = []
    for pair in pairs:
        label, value = pair[0], pair[1]
        if not isinstance(value, (int, float)):
            raise C.PanelBuildError(f'donut 数值必须是数字，{label!r} 收到 {type(value).__name__}')
        data.append({'label': str(label), 'value': value})
    series = [{'key': 'value', 'label': '数值'}]
    return _chart('donut', data, series, 'label', title=title, id=id)


def bar(rows: Sequence[dict], series: Sequence[Sequence[str]], x_key: str,
        *, title: str | None = None, id: str | None = None) -> dict:
    """series 快捷式：[('key', 'label'), ...]；rows 为 dict 列表（字段名对齐 series key）。"""
    series_items = [{'key': k, 'label': lbl} for k, lbl in series]
    return _chart('bar', [dict(r) for r in rows], series_items, x_key, title=title, id=id)


def line(rows: Sequence[dict], series: Sequence[Sequence[str]], x_key: str,
         *, title: str | None = None, id: str | None = None) -> dict:
    series_items = [{'key': k, 'label': lbl} for k, lbl in series]
    return _chart('line', [dict(r) for r in rows], series_items, x_key, title=title, id=id)


def gauge(label: str, value: float, *, tone: str | None = None, unit: str | None = None,
          title: str | None = None, id: str | None = None) -> dict:
    _check_len(label, C.GAUGE_LABEL_MAX, 'gauge label')
    if not isinstance(value, (int, float)) or not 0 <= value <= 100:
        raise C.PanelBuildError(f'gauge value 必须是 0–100 的数字，收到 {value!r}')
    props: dict[str, Any] = {'label': label, 'value': value}
    if tone:
        _check_enum(tone, C.GAUGE_TONES, 'gauge tone')
        props['tone'] = tone
    if unit:
        _check_len(unit, C.GAUGE_UNIT_MAX, 'gauge unit')
        props['unit'] = unit
    if title:
        _check_len(title, C.GAUGE_TITLE_MAX, 'gauge title')
        props['title'] = title
    return _widget('gauge', props, id)


def funnel(stages: Sequence[Sequence[Any]], *, title: str | None = None, id: str | None = None) -> dict:
    """快捷式：funnel([('访问', 128000), ('注册', 64000), ...])，detail 可作第三元。"""
    if not (C.FUNNEL_STAGES_MIN <= len(stages) <= C.FUNNEL_STAGES_MAX):
        raise C.PanelBuildError(f'funnel stages 数量必须 {C.FUNNEL_STAGES_MIN}–{C.FUNNEL_STAGES_MAX}，当前 {len(stages)}')
    items = []
    for stage in stages:
        label, value = stage[0], stage[1]
        _check_len(label, C.FUNNEL_LABEL_MAX, 'funnel label')
        if not isinstance(value, (int, float)):
            raise C.PanelBuildError(f'funnel "{label}" 的 value 必须是数字，收到 {type(value).__name__}')
        item: dict[str, Any] = {'label': label, 'value': value}
        if len(stage) > 2 and stage[2] is not None:
            item['detail'] = str(stage[2])
        items.append(item)
    props: dict[str, Any] = {'stages': items}
    if title:
        _check_len(title, C.TITLE_MAX, 'funnel title')
        props['title'] = title
    return _widget('funnel', props, id)


def heatmap(matrix: Sequence[Sequence[float]], row_labels: Sequence[str], col_labels: Sequence[str],
            *, title: str | None = None, id: str | None = None) -> dict:
    if not (1 <= len(matrix) <= C.HEATMAP_MAX) or any(not (1 <= len(r) <= C.HEATMAP_MAX) for r in matrix):
        raise C.PanelBuildError(f'heatmap 矩阵行列均须 1–{C.HEATMAP_MAX}')
    if len(matrix) != len(row_labels) or len(matrix[0]) != len(col_labels):
        raise C.PanelBuildError('heatmap row_labels/col_labels 数量必须与矩阵行列一致')
    for lbl in list(row_labels) + list(col_labels):
        _check_len(lbl, C.HEATMAP_LABEL_MAX, 'heatmap label')
    props: dict[str, Any] = {'matrix': [list(r) for r in matrix],
                             'rowLabels': list(row_labels), 'columnLabels': list(col_labels)}
    if title:
        _check_len(title, C.TITLE_MAX, 'heatmap title')
        props['title'] = title
    return _widget('heatmap', props, id)


# ---------------------------------------------------------------------------
# 表格与反馈
# ---------------------------------------------------------------------------

def table(columns: Sequence[Sequence[str]], rows: Sequence[Sequence[Any]] | None = None,
          *, title: str | None = None, density: str = 'comfortable', id: str | None = None) -> dict:
    """columns: [(key, label), ...]；rows: 元组/列表的序列（按 columns 顺序）。
    数据驱动模式（绑定扁平 API）时不传 columns/rows。"""
    if density not in ('comfortable', 'compact'):
        raise C.PanelBuildError(f'table density 必须是 comfortable / compact，收到 {density!r}')
    props: dict[str, Any] = {}
    if columns is not None:
        if not (C.TABLE_COLUMNS_MIN <= len(columns) <= C.TABLE_COLUMNS_MAX):
            raise C.PanelBuildError(f'table columns 数量必须 {C.TABLE_COLUMNS_MIN}–{C.TABLE_COLUMNS_MAX}')
        cols = []
        for col in columns:
            key, label = col[0], col[1]
            _check_len(key, C.TABLE_KEY_MAX, 'table key')
            col_def: dict[str, Any] = {'key': key, 'label': label}
            if len(col) > 2 and col[2]:
                col_def['align'] = col[2]
            cols.append(col_def)
        props['columns'] = cols
        if rows is not None:
            if len(rows) > C.TABLE_ROWS_MAX:
                raise C.PanelBuildError(f'table rows 上限 {C.TABLE_ROWS_MAX}，当前 {len(rows)}')
            row_dicts = []
            for row in rows:
                row_dicts.append({col[0]: (v if isinstance(v, (str, int, float, bool, type(None))) else str(v))
                                  for col, v in zip(columns, row)})
            props['rows'] = row_dicts
    if title:
        _check_len(title, C.TITLE_MAX, 'table title')
        props['title'] = title
    props['density'] = density
    return _widget('data-table', props, id)


def callout(description: str, *, tone: str = 'info', title: str | None = None, id: str | None = None) -> dict:
    _check_enum(tone, C.CALLOUT_TONES, 'callout tone')
    _check_len(description, C.CALLOUT_DESC_MAX, 'callout description')
    props: dict[str, Any] = {'description': description, 'tone': tone}
    if title:
        _check_len(title, C.CALLOUT_TITLE_MAX, 'callout title')
        props['title'] = title
    return _widget('callout', props, id)


# ---------------------------------------------------------------------------
# 容器（两层有界组合：布局 > 分组 > 叶子）
# ---------------------------------------------------------------------------

def card(children: dict | Sequence[dict], *, title: str | None = None,
         description: str | None = None, id: str | None = None) -> dict:
    kids = _check_children(children if isinstance(children, Sequence) else [children], 'card')
    props: dict[str, Any] = {'children': kids}
    if title:
        _check_len(title, 120, 'card title')
        props['title'] = title
    if description:
        _check_len(description, 360, 'card description')
        props['description'] = description
    return _widget('card', props, id)


def grid(children: dict | Sequence[dict], *, columns: int = 2, gap: int = 12, id: str | None = None) -> dict:
    kids = _check_children(children if isinstance(children, Sequence) else [children], 'grid')
    if not (1 <= columns <= 6):
        raise C.PanelBuildError(f'grid columns 建议 1–6，收到 {columns}')
    return _widget('grid', {'children': kids, 'columns': columns, 'gap': gap}, id)


def stack(children: dict | Sequence[dict], *, direction: str = 'vertical', gap: int = 12, id: str | None = None) -> dict:
    kids = _check_children(children if isinstance(children, Sequence) else [children], 'stack')
    if direction not in ('vertical', 'horizontal'):
        raise C.PanelBuildError(f'stack direction 必须是 vertical / horizontal，收到 {direction!r}')
    return _widget('stack', {'children': kids, 'direction': direction, 'gap': gap}, id)
