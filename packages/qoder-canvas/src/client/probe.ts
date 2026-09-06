/**
 * iframe 探针（0.9.0 增强档核心）：注入 html 节点 iframe 内部的自包含脚本。
 *
 * 架构定位（QODER_CANVAS html-node 设计）：
 * - 探针在 iframe 的 opaque origin 里跑（sandbox="allow-scripts"，无 allow-same-origin
 *   ——宿主 cookie/token 天然不可见），与父页面通过 postMessage + 每帧随机 token 通信
 * - 只算不画：命中数据（rect/domPath/tag/text/snippet）回传父页面，高亮统一画在父层
 * - 命中算法与外层 CanvasPinLayer 同源（elementsFromPoint 最深层 / :nth-of-type
 *   domPath / 矩形相交占比 / TreeWalker 划字索引）——CanvasPinLayer 踩坑结论直接继承：
 *   domPath 必带 :nth-of-type（回查唯一命中）；文本命中记 node 归属。
 *
 * 打包形态：PROBE_SCRIPT 是字符串常量（严格 IIFE、零 import、不引用任何外部符号），
 * tsdown 会把它内联进 client bundle；HtmlNode 渲染时拼进 srcdoc 顶部。
 * Agent/skill 生成的 HTML 零配合——能力长在 canvas 渲染管道上（一次性基建）。
 *
 * 消息协议（html-bridge.ts 对端）：
 *   iframe→父: {t:'ready'|'height'|'hit-result'|'marquee-result'|'selection', token}
 *   父→iframe: {t:'mode'|'hit'|'marquee', token}（t:'ping' 探活）
 */

/** iframe 内命中结果（探针 → 父页面；rect 为 iframe 视口坐标） */
export interface ProbeHit {
  readonly domPath: string
  readonly tag: string
  readonly text?: string | undefined
  readonly snippet: string
  readonly rect: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
}

/**
 * 探针源码。注意：这是【要在 iframe 里 eval 的字符串】，写法约束：
 * - 不用 TS 语法、不用可选链（保守 ES2018）——srcdoc 里直接执行
 * - 不引用任何 import/外部变量；window.parent 是唯一出口
 * - html 里的用户脚本可能随后执行，探针脚本放 <head> 最前（buildProbeDocument 拼接序）
 */
const PROBE_SOURCE = `(function () {
  'use strict';
  var token = null;
  var mode = 'off';
  function send(msg) {
    try { window.parent.postMessage(Object.assign({ token: token, __openloopProbe: true }, msg), '*'); } catch (e) {}
  }
  function domPath(el) {
    var parts = [];
    var cur = el;
    while (cur && cur !== document.body) {
      var tag = cur.tagName ? cur.tagName.toLowerCase() : 'node';
      var cls = (cur.getAttribute && cur.getAttribute('class')) || '';
      cls = cls.trim().split(/\\s+/)[0];
      var part = cls ? tag + '.' + cls : tag;
      var parent = cur.parentElement;
      if (parent) {
        var same = [];
        for (var i = 0; i < parent.children.length; i++) if (parent.children[i].tagName === cur.tagName) same.push(parent.children[i]);
        if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(cur) + 1) + ')';
      }
      parts.unshift(part);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }
  function rectOf(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }
  function hitOf(el) {
    var text = (el.textContent || '').trim();
    var snippet = '';
    try { snippet = el.outerHTML || ''; } catch (e) {}
    if (snippet.length > 600) snippet = snippet.slice(0, 600);
    return {
      domPath: domPath(el),
      tag: el.tagName ? el.tagName.toLowerCase() : 'node',
      text: text ? text.slice(0, 40) : undefined,
      snippet: snippet,
      rect: rectOf(el)
    };
  }
  function hitAt(x, y) {
    var stack = document.elementsFromPoint(x, y);
    for (var i = 0; i < stack.length; i++) {
      var el = stack[i];
      if (el === document.documentElement || el === document.body) continue;
      return hitOf(el);
    }
    return null;
  }
  function leafHitsIn(rect) {
    var out = [];
    var walk = function (el) {
      for (var i = 0; i < el.children.length; i++) {
        var child = el.children[i];
        if (child.children.length === 0) {
          var r = child.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && !(r.right < rect.left || r.left > rect.right || r.bottom < rect.top || r.top > rect.bottom)) {
            out.push(hitOf(child));
          }
        } else {
          walk(child);
        }
      }
    };
    walk(document.body || document.documentElement);
    return out;
  }
  function selectionInfo() {
    var sel = window.getSelection && window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    var range = sel.getRangeAt(0);
    var node = range.startContainer;
    while (node && node.nodeType !== 1) node = node.parentNode;
    if (!node) return null;
    return { excerpt: String(sel.toString()).slice(0, 120), domPath: domPath(node) };
  }
  // 模式转发：父页面切换选区模式（text 模式 iframe 放行原生划选，其他模式父层透明捕获层接管）
  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || d.__openloopProbe !== true || typeof d.t !== 'string') return;
    if (d.t === 'init') {
      token = d.token;
      mode = d.mode || 'off';
      send({ t: 'ready', height: document.documentElement.scrollHeight });
    } else if (d.t === 'mode') {
      mode = d.mode;
    } else if (d.t === 'hit') {
      send({ t: 'hit-result', reqId: d.reqId, hit: hitAt(d.x, d.y) });
    } else if (d.t === 'marquee') {
      send({ t: 'marquee-result', reqId: d.reqId, hits: leafHitsIn(d.rect) });
    } else if (d.t === 'ping') {
      send({ t: 'pong', reqId: d.reqId });
    }
  }, false);
  // 划字上报：text 模式下 iframe 内原生 selection 变化即上报（父层无捕获层）
  document.addEventListener('selectionchange', function () {
    if (mode !== 'text' || !token) return;
    var info = selectionInfo();
    if (info) send({ t: 'selection', excerpt: info.excerpt, domPath: info.domPath });
  });
  // 高度自适应：内容变化上报（ResizeObserver 兜底 scroll 监听）
  var lastH = -1;
  var reportH = function () {
    if (!token) return;
    var h = document.documentElement.scrollHeight;
    if (h !== lastH) { lastH = h; send({ t: 'height', height: h }); }
  };
  if (window.ResizeObserver) {
    try { new ResizeObserver(reportH).observe(document.documentElement); } catch (e) {}
  }
  window.addEventListener('load', reportH);
  setTimeout(reportH, 200);
  // 握手拉模式（真机教训 2026-09-06：父侧 init 可能在探针挂监听前发出而丢失——
  // 探针脚本一执行就发 hello，父侧收到后（重）发 init，确保 token 必达）
  send({ t: 'hello', height: document.documentElement.scrollHeight });
})();`

/** 导出探针源码（HtmlNode 拼 srcdoc 用；html-bridge 无需 import 本文件其它符号） */
export const PROBE_SCRIPT = PROBE_SOURCE

/**
 * 组装 iframe 文档（srcdoc）：探针在最前 + Agent HTML。
 * - Agent HTML 可能是 fragment（无 <html>）也可能是完整文档——fragment 包一层基础骨架
 * - 探针脚本放 <head> 首位：先于 Agent 脚本初始化（token 就绪前探针静默）
 * - </script> 转义：Agent HTML 若含字面 </script> 会在字符串拼接中截断脚本——
 *   JSON.stringify 注入变量 + innerHTML 之外的安全路径（本函数只做拼接，转义责任在
 *   fragment 分支的 script 内联处理：source 作为字符串变量注入，不直接拼进脚本区）
 */
export function buildProbeDocument(source: string): string {
  const wrapped = /<html[\s>]|<!doctype/i.test(source)
    ? source // 完整文档：探针插进 head（无 head 则前置）
    : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:inherit}</style></head><body>${source}</body></html>`
  const probeTag = `<script>${PROBE_SOURCE}<\/script>`
  if (/<head[^>]*>/i.test(wrapped)) {
    return wrapped.replace(/<head[^>]*>/i, m => `${m}${probeTag}`)
  }
  return probeTag + wrapped
}
