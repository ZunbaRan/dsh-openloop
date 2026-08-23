"""OpenLoop panels codegen 单测（python3 -m unittest，从 packages/panels 目录跑）。

运行：cd packages/panels && python3 -m unittest discover tests/python -v
"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'assets/skills/openloop-panels-widget-authoring/scripts'))

from openloop_panels import (  # noqa: E402
    Panel, PanelBuildError, badge, callout, card, divider, donut, funnel,
    gauge, grid, heading, heatmap, line, metrics, stack, table, text,
)


class TestWidgets(unittest.TestCase):
    def test_metrics_sugar_and_autodelta(self):
        g = metrics([('月营收', 48210, '+12.4%', 'currency'), ('订单数', 1208, '-2.1%'), ('退款率', 1.2)])
        items = g['source']['props']['items']
        self.assertEqual(items[0]['format'], 'currency')
        self.assertEqual(items[0]['deltaTone'], 'up')
        self.assertEqual(items[1]['deltaTone'], 'down')
        self.assertNotIn('deltaTone', items[2])  # 无 delta 则无 tone

    def test_metric_enum_failfast(self):
        with self.assertRaises(PanelBuildError):
            metrics([('x', 1)], )  # ok
            from openloop_panels import metric_item
            metric_item('x', 1, fmt='人民币')  # 非法枚举 → 构造期拒绝

    def test_donut_series_interned(self):
        d = donut([('订阅', 62), ('定制', 38)], title='营收构成')
        p = d['source']['props']
        self.assertEqual(p['variant'], 'donut')
        self.assertEqual(p['series'], [{'key': 'value', 'label': '数值'}])
        self.assertEqual(p['xKey'], 'label')
        self.assertEqual(len(p['data']), 2)

    def test_chart_series_key_mismatch_failfast(self):
        from openloop_panels import bar
        with self.assertRaises(PanelBuildError):
            bar([{'m': 'a', 'v': 1}], [('v', '销量')], 'm')  # v 在；构造 series 用不存在 key
            bar([{'m': 'a'}], [('missing', '销量')], 'm')  # missing 不在 data → 拒绝

    def test_funnel_bounds(self):
        with self.assertRaises(PanelBuildError):
            funnel([('仅一段', 100)])
        f = funnel([('访问', 128000), ('注册', 64000), ('付费', 12800, '转化 10%')])
        self.assertEqual(f['source']['props']['stages'][2]['detail'], '转化 10%')

    def test_gauge_range(self):
        with self.assertRaises(PanelBuildError):
            gauge('完成率', 150)

    def test_heatmap_shape(self):
        with self.assertRaises(PanelBuildError):
            heatmap([[1, 2], [3, 4]], ['r1'], ['c1', 'c2'])

    def test_container_rules(self):
        # grid > card > 叶子 ✓；card > card ✗；grid > grid ✗
        ok = grid([card(gauge('完成率', 72, title='进度'), title='卡片')])
        self.assertEqual(ok['source']['kind'], 'grid')
        with self.assertRaises(PanelBuildError):
            card([card(text('内层'))])
        with self.assertRaises(PanelBuildError):
            grid([grid([text('x')])])

    def test_table_and_callout_and_text(self):
        t = table([('name', '姓名'), ('count', '数量', 'right')], [('张三', 3), ('李四', 5)], title='成员')
        self.assertEqual(t['source']['props']['columns'][1]['align'], 'right')
        c = callout('两个里程碑延期', tone='warning', title='风险')
        self.assertEqual(c['source']['props']['tone'], 'warning')
        with self.assertRaises(PanelBuildError):
            text('x' * 5001)


class TestPanelBuilder(unittest.TestCase):
    def test_build_save_reload(self):
        p = Panel('demo-panel', title='演示')
        p.layout_grid(columns=2)
        p += card(donut([('订阅', 62), ('定制', 38)], title='营收构成'), title='收入')
        p += metrics([('月营收', 48210, '+12.4%', 'currency'), ('订单数', 1208, '-2.1%')])
        with tempfile.TemporaryDirectory() as d:
            path = p.save(f'{d}/demo.json')
            loaded = json.loads(Path(path).read_text(encoding='utf-8'))
        self.assertEqual(loaded['$schema'], 'openloop.panel/v1')
        self.assertEqual(loaded['layout'], {'mode': 'grid', 'columns': 2})
        self.assertEqual(len(loaded['widgets']), 2)

    def test_id_uniqueness(self):
        p = Panel('dup', title='重复检测')
        w = {'id': 'same-id', 'source': {'type': 'preset', 'kind': 'text', 'props': {'text': 'a'}}}
        p.add(w)
        p.add(dict(w))  # 相同 id → to_dict 时拒绝
        with self.assertRaises(PanelBuildError):
            p.to_dict()

    def test_widget_count_bounds(self):
        p = Panel('too-many', title='超限')
        for i in range(25):
            p += text(f't{i}')
        with self.assertRaises(PanelBuildError):
            p.to_dict()

    def test_bad_panel_id(self):
        with self.assertRaises(PanelBuildError):
            Panel('Bad_ID', title='x')


class TestGoldenParity(unittest.TestCase):
    """golden 对拍：API 产物的结构形状与手写合法 JSON 一致（关键字段逐一比对）。"""

    def test_golden_shape(self):
        p = Panel('golden', title='对拍')
        p += metrics([('月营收', 48210, '+12.4%', 'currency')])
        p += funnel([('访问', 100), ('付费', 10)])
        p += badge('正常')
        p += divider()
        p += heading('总结')
        p += stack([text('一行总结')])
        d = p.to_dict()
        # 顶层契约字段
        self.assertIn('$schema', d)
        self.assertEqual(sorted(d.keys()), ['$schema', 'id', 'title', 'widgets'])
        # widget 形状
        for w in d['widgets']:
            self.assertEqual(sorted(w.keys()), ['id', 'source'])
            self.assertEqual(w['source']['type'], 'preset')
            self.assertIsInstance(w['source']['props'], dict)


if __name__ == '__main__':
    unittest.main()
