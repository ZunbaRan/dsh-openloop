"""OpenLoop panels codegen · Panel builder（面板组装与落盘）。"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from . import contracts as C

SCHEMA = 'openloop.panel/v1'
WIDGETS_MIN, WIDGETS_MAX = 1, 24


def _check_panel_id(pid: str) -> None:
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', pid):
        raise C.PanelBuildError(f'panel id 必须是 kebab-case（小写字母/数字/单连字符），收到 {pid!r}')


class Panel:
    """面板定义组装器：add/add_all 添加顶层 widget；save 落盘为 JSON。

    用法：
        p = Panel('data-insights', title='数据洞察')
        p.add(grid([card(gauge('完成率', 72), title='进度'), ...], columns=2))
        p.save('panels/data-insights.json')
    """

    def __init__(self, id: str, *, title: str, description: str | None = None) -> None:
        _check_panel_id(id)
        if not title or len(title) > C.TITLE_MAX:
            raise C.PanelBuildError(f'panel title 必填且 ≤{C.TITLE_MAX} 字符')
        self._id = id
        self._title = title
        self._description = description
        self._layout: dict[str, Any] | None = None
        self._widgets: list[dict[str, Any]] = []

    # ---- 布局 ----
    def layout_grid(self, columns: int = 2) -> 'Panel':
        self._layout = {'mode': 'grid', 'columns': columns}
        return self

    def layout_stack(self) -> 'Panel':
        self._layout = {'mode': 'stack'}
        return self

    # ---- 顶层 widget ----
    def add(self, widget: dict[str, Any]) -> 'Panel':
        self._widgets.append(widget)
        return self

    def add_all(self, widgets: list[dict[str, Any]]) -> 'Panel':
        for w in widgets:
            self._widgets.append(w)
        return self

    def __iadd__(self, widget: dict[str, Any]) -> 'Panel':
        return self.add(widget)

    # ---- 产物 ----
    def to_dict(self) -> dict[str, Any]:
        if not (WIDGETS_MIN <= len(self._widgets) <= WIDGETS_MAX):
            raise C.PanelBuildError(f'面板 widgets 数量必须 {WIDGETS_MIN}–{WIDGETS_MAX}，当前 {len(self._widgets)}')
        # id 唯一性（顶层 + 各容器 children，两层遍历）
        seen: set[str] = set()

        def collect(ws: list[dict[str, Any]]) -> None:
            for w in ws:
                wid = w.get('id')
                if wid in seen:
                    raise C.PanelBuildError(f'widget id "{wid}" 重复，需全面板唯一')
                seen.add(wid)
                for child in w.get('source', {}).get('props', {}).get('children', []) or []:
                    collect([child])

        collect(self._widgets)
        panel: dict[str, Any] = {'$schema': SCHEMA, 'id': self._id, 'title': self._title, 'widgets': self._widgets}
        if self._description:
            panel['description'] = self._description
        if self._layout:
            panel['layout'] = self._layout
        return panel

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)

    def save(self, path: str) -> str:
        out = Path(path)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(self.to_json() + '\n', encoding='utf-8')
        return str(out)
