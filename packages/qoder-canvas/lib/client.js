window.__ModuleLoader__.load({
	id: "@openloop/dsh-qoder-canvas",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_dom_client = require("react-dom/client");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		//#region src/client/markdown.tsx
		function renderInline(text, keyPrefix) {
			const out = [];
			const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
			let last = 0;
			let m;
			let i = 0;
			while ((m = re.exec(text)) !== null) {
				if (m.index > last) out.push(text.slice(last, m.index));
				const token = m[0];
				if (token.startsWith("**")) out.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: token.slice(2, -2) }, `${keyPrefix}-b${i}`));
				else out.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
					style: {
						fontFamily: "ui-monospace, Menlo, monospace",
						fontSize: "0.9em",
						background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))",
						padding: "1px 4px",
						borderRadius: 4
					},
					children: token.slice(1, -1)
				}, `${keyPrefix}-c${i}`));
				last = m.index + token.length;
				i += 1;
			}
			if (last < text.length) out.push(text.slice(last));
			return out;
		}
		function renderMarkdownLines(text) {
			const lines = text.split("\n");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: lines.map((line, i) => {
				if (line.trim() === "") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: { height: 8 } }, i);
				if (line.startsWith("### ")) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 12,
						fontWeight: 650,
						marginTop: 8
					},
					children: renderInline(line.slice(4), `l${i}`)
				}, i);
				if (line.startsWith("## ")) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 13,
						fontWeight: 650,
						marginTop: 10
					},
					children: renderInline(line.slice(3), `l${i}`)
				}, i);
				if (line.startsWith("# ")) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 14,
						fontWeight: 700,
						marginTop: 12
					},
					children: renderInline(line.slice(2), `l${i}`)
				}, i);
				if (line.startsWith("- ") || line.startsWith("* ")) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						gap: 6
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: { color: "var(--dsw-alias-label-caption, #888)" },
						children: "•"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: renderInline(line.slice(2), `l${i}`) })]
				}, i);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: renderInline(line, `l${i}`) }, i);
			}) });
		}
		//#endregion
		//#region src/client/probe.ts
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
    // 真机教训（2026-09-07 用户 kami 设计稿实测）：textContent/outerHTML 会序列化
    // 整个子树——hover 到大容器（几百上千后代）时计算爆炸，probeHitAt 300ms 超时
    // 降级为节点级大框（「还是只能选最外层」）。
    // 大元素降级：text 只取【自身直接文本节点】（不递归子树）；snippet 对超多
    // 后代的容器给骨架版（tag+属性+子数），不序列化全树。
    var isBig = el.querySelectorAll('*').length > 60;
    var text = '';
    if (isBig) {
      var direct = '';
      for (var ni = 0; ni < el.childNodes.length; ni++) {
        var cn = el.childNodes[ni];
        if (cn.nodeType === 3) direct += cn.textContent;
      }
      text = direct.trim();
    } else {
      text = (el.textContent || '').trim();
    }
    var snippet = '';
    if (isBig) {
      var openTag = '';
      try { openTag = (el.outerHTML || '').split('>')[0] || ''; } catch (e) {}
      snippet = openTag + '> …(' + el.querySelectorAll('*').length + ' children)</' + (el.tagName ? el.tagName.toLowerCase() : 'node') + '>';
    } else {
      try { snippet = el.outerHTML || ''; } catch (e) {}
      if (snippet.length > 600) snippet = snippet.slice(0, 600);
    }
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
})();`;
		/**
		* 组装 iframe 文档（srcdoc）：探针在最前 + Agent HTML。
		* - Agent HTML 可能是 fragment（无 <html>）也可能是完整文档——fragment 包一层基础骨架
		* - 探针脚本放 <head> 首位：先于 Agent 脚本初始化（token 就绪前探针静默）
		* - <\/script> 转义：Agent HTML 若含字面 <\/script> 会在字符串拼接中截断脚本——
		*   JSON.stringify 注入变量 + innerHTML 之外的安全路径（本函数只做拼接，转义责任在
		*   fragment 分支的 script 内联处理：source 作为字符串变量注入，不直接拼进脚本区）
		*/
		function buildProbeDocument(source) {
			const wrapped = /<html[\s>]|<!doctype/i.test(source) ? source : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:inherit}</style></head><body>${source}</body></html>`;
			const probeTag = `<script>${PROBE_SOURCE}<\/script>`;
			if (/<head[^>]*>/i.test(wrapped)) return wrapped.replace(/<head[^>]*>/i, (m) => `${m}${probeTag}`);
			return probeTag + wrapped;
		}
		//#endregion
		//#region src/client/html-bridge.ts
		const READY_TIMEOUT_MS = 3e3;
		let reqSeq = 1;
		const registry = /* @__PURE__ */ new Map();
		const listeners$1 = /* @__PURE__ */ new Set();
		function emit$1() {
			for (const l of listeners$1) l();
		}
		function randomToken() {
			return `p_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
		}
		/** 全局 message 监听（模块级一次；HtmlNode 的注册驱动它） */
		if (typeof window !== "undefined") window.addEventListener("message", (ev) => {
			const d = ev.data;
			if (d === null || typeof d !== "object" || d["__openloopProbe"] !== true) return;
			for (const rec of registry.values()) {
				if (!(d["t"] === "hello" ? rec.frame.contentWindow === ev.source : rec.token === d["token"]) || rec.frame.contentWindow !== ev.source) continue;
				const t = d["t"];
				if (t === "hello") rec.frame.contentWindow?.postMessage({
					__openloopProbe: true,
					t: "init",
					token: rec.token
				}, "*");
				else if (t === "ready") {
					rec.ready = true;
					rec.degraded = false;
					const h = d["height"];
					if (typeof h === "number" && h > 0) rec.height = h;
					emit$1();
				} else if (t === "height") {
					const h = d["height"];
					if (typeof h === "number" && h > 0 && Math.abs(h - rec.height) > 2) {
						rec.height = h;
						emit$1();
					}
				} else if (t === "hit-result" || t === "marquee-result") {
					const reqId = d["reqId"];
					if (typeof reqId === "number") {
						const resolver = rec.pending.get(reqId);
						if (resolver !== void 0) {
							rec.pending.delete(reqId);
							resolver(t === "hit-result" ? d["hit"] : d["hits"]);
						}
					}
				}
				if (t === "selection") for (const sel of selectionListeners) sel(rec.nodeId, {
					excerpt: String(d["excerpt"] ?? ""),
					domPath: String(d["domPath"] ?? "")
				});
				return;
			}
		});
		const selectionListeners = /* @__PURE__ */ new Set();
		/** 划字订阅（PinLayer text 模式挂） */
		function onProbeSelection(fn) {
			selectionListeners.add(fn);
			return () => {
				selectionListeners.delete(fn);
			};
		}
		/** 注册/重注册一个 html 节点的 iframe（HtmlNode onload 调用；重渲染自动覆盖旧记录） */
		function registerProbeFrame(nodeId, frame) {
			const token = randomToken();
			const rec = {
				nodeId,
				frame,
				token,
				ready: false,
				degraded: false,
				height: 0,
				mountedAt: Date.now(),
				pending: /* @__PURE__ */ new Map()
			};
			registry.set(nodeId, rec);
			frame.contentWindow?.postMessage({
				__openloopProbe: true,
				t: "init",
				token
			}, "*");
			setTimeout(() => {
				if (rec.ready === false && registry.get(nodeId) === rec) {
					rec.degraded = true;
					emit$1();
				}
			}, READY_TIMEOUT_MS);
			emit$1();
		}
		/** 卸载（HtmlNode unmount；版本重渲染先卸后挂） */
		function unregisterProbeFrame(nodeId) {
			const rec = registry.get(nodeId);
			if (rec !== void 0) {
				for (const resolve of rec.pending.values()) resolve(null);
				registry.delete(nodeId);
			}
			emit$1();
		}
		/** 模式广播（PinLayer mode 变化时对全部 frame 补发——含未 ready 的，探针 init 后生效） */
		function broadcastProbeMode(mode) {
			for (const rec of registry.values()) rec.frame.contentWindow?.postMessage({
				__openloopProbe: true,
				t: "mode",
				token: rec.token,
				mode
			}, "*");
		}
		/** 订阅 bridge 状态（ready/degraded/height 变化——HtmlNode 高度 + PinLayer 路由用） */
		function onBridgeChange(fn) {
			listeners$1.add(fn);
			return () => {
				listeners$1.delete(fn);
			};
		}
		/** 找全部 html 节点中坐标命中的 frame（跨节点查询——PinLayer hitElement 用） */
		function frameAtAny(clientX, clientY) {
			for (const rec of registry.values()) {
				const r = rec.frame.getBoundingClientRect();
				if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return rec;
			}
			return null;
		}
		/** 全部 frame 记录（框选扫描用） */
		function allFrameRecords() {
			return [...registry.values()];
		}
		/** 诊断暴露（真机调试用；生产无害——只读。挂 window 便于控制台排查） */
		function bridgeDebug() {
			const out = [];
			for (const r of registry.values()) out.push({
				nodeId: r.nodeId,
				ready: r.ready,
				degraded: r.degraded,
				token: r.token.slice(0, 6),
				height: r.height,
				pending: r.pending.size
			});
			return out;
		}
		if (typeof window !== "undefined") window.__openloopBridgeDebug = bridgeDebug;
		/** iframe 内容坐标（父页面 client 坐标 → iframe 视口坐标） */
		function toFrameCoords(rec, clientX, clientY) {
			const r = rec.frame.getBoundingClientRect();
			return {
				x: clientX - r.left,
				y: clientY - r.top
			};
		}
		/** 点查询（探针 ready 才有效；degraded/未 ready 返回 null → 走节点级降级。
		* 真机教训：120ms 对复杂 HTML 过紧（postMessage 往返 + 大 DOM 命中计算 + 主线程
		* 竞争）——点选体验优先放宽默认 300ms） */
		function probeHitAt(rec, x, y, timeoutMs = 500) {
			if (!rec.ready || rec.degraded) return Promise.resolve(null);
			return new Promise((resolve) => {
				const reqId = reqSeq++;
				const timer = setTimeout(() => {
					rec.pending.delete(reqId);
					resolve(null);
				}, timeoutMs);
				rec.pending.set(reqId, (hit) => {
					clearTimeout(timer);
					resolve(hit);
				});
				rec.frame.contentWindow?.postMessage({
					__openloopProbe: true,
					t: "hit",
					token: rec.token,
					reqId,
					x,
					y
				}, "*");
			});
		}
		/** 框选查询（同上；返回叶子元素命中数组。默认 400ms——复杂 HTML 多叶子遍历） */
		function probeMarqueeIn(rec, rect, timeoutMs = 400) {
			if (!rec.ready || rec.degraded) return Promise.resolve([]);
			return new Promise((resolve) => {
				const reqId = reqSeq++;
				const timer = setTimeout(() => {
					rec.pending.delete(reqId);
					resolve([]);
				}, timeoutMs);
				rec.pending.set(reqId, (hits) => {
					clearTimeout(timer);
					resolve(Array.isArray(hits) ? hits : []);
				});
				rec.frame.contentWindow?.postMessage({
					__openloopProbe: true,
					t: "marquee",
					token: rec.token,
					reqId,
					rect
				}, "*");
			});
		}
		/** iframe 内容高度（自适应；degraded 时 0 = iframe 用固定高度兜底） */
		function probeHeight(nodeId) {
			return registry.get(nodeId)?.height ?? 0;
		}
		/**
		* 坐标换算（纯函数，单测覆盖）：探针 rect（iframe 视口）→ 父页面画布容器坐标。
		* iframe 本身不滚动（高度自适应），故只加 iframe 在容器内的偏移。
		*/
		function frameRectToContainer(frame, container, r) {
			const fb = frame.getBoundingClientRect();
			const cb = container.getBoundingClientRect();
			return {
				left: fb.left - cb.left + r.x,
				top: fb.top - cb.top + r.y,
				width: r.w,
				height: r.h
			};
		}
		//#endregion
		//#region src/client/HtmlNode.tsx
		/**
		* HtmlNode：html 节点的 iframe 沙箱渲染器（0.9.0 增强档）。
		*
		* - srcdoc = buildProbeDocument(source)：探针自动注入（skill/Agent HTML 零配合）
		* - sandbox="allow-scripts"（opaque origin；html-artifact 先例）+ referrerPolicy
		* - 高度自适应：bridge 高度（探针 ResizeObserver 上报）clamp [120, 640]，
		*   超上限 iframe 内部滚动（frameRectToContainer 假设 iframe 不滚——超上限时
		*   探针 rect 含内部滚动偏移，父层高亮换算仍正确：getBoundingClientRect 本身
		*   是视口坐标，滚动只影响内容可见性不影响 rect 换算基）
		* - onload → registerProbeFrame（版本重渲染自动覆盖旧记录）
		* - 降级态（探针超时未 ready）：显示提示条 + 固定高度 320（节点级标注仍可用）
		*/
		const MIN_H = 120;
		const MAX_H = 640;
		function HtmlNode({ nodeId, props }) {
			const [height, setHeight] = (0, react.useState)(240);
			const source = typeof props.source === "string" ? props.source : "";
			const title = typeof props.title === "string" ? props.title : "";
			(0, react.useEffect)(() => {
				const update = () => {
					const h = probeHeight(nodeId);
					if (h > 0) setHeight(Math.min(Math.max(h, MIN_H), MAX_H));
				};
				update();
				return onBridgeChange(update);
			}, [nodeId]);
			const frameRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const f = frameRef.current;
				if (f === null) return;
				const doc = buildProbeDocument(source);
				f.setAttribute("sandbox", "allow-scripts");
				f.setAttribute("referrerpolicy", "no-referrer");
				f.setAttribute("srcdoc", doc);
			}, [source]);
			(0, react.useEffect)(() => {
				const register = () => {
					if (frameRef.current !== null) registerProbeFrame(nodeId, frameRef.current);
				};
				register();
				const t = setTimeout(register, 400);
				return () => {
					clearTimeout(t);
					unregisterProbeFrame(nodeId);
				};
			}, [nodeId, source]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					border: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
					borderRadius: 10,
					overflow: "hidden",
					background: "#fff",
					display: "flex",
					flexDirection: "column",
					minWidth: 0
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
					ref: frameRef,
					title: title.length > 0 ? title : `html-${nodeId}`,
					onLoad: () => {
						if (frameRef.current !== null) registerProbeFrame(nodeId, frameRef.current);
					},
					style: {
						width: "100%",
						height,
						border: 0,
						display: "block",
						background: "#fff"
					}
				})
			});
		}
		//#endregion
		//#region src/client/CanvasSurface.tsx
		const surface = {
			width: "100%",
			boxSizing: "border-box",
			border: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
			borderRadius: 14,
			background: "var(--dsw-alias-bg-layer-1, #fff)",
			overflow: "hidden",
			fontFamily: "inherit"
		};
		const headerStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			padding: "12px 16px 10px",
			borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))"
		};
		const TONE_COLOR = {
			default: "var(--dsw-alias-label-primary, inherit)",
			success: "var(--dsw-alias-state-success-primary, #22c55e)",
			warn: "var(--dsw-alias-state-warn-primary, #f59e0b)",
			error: "var(--dsw-alias-state-error-primary, #d4453a)",
			info: "var(--dsw-alias-state-business-primary, #4176e6)"
		};
		function layoutStyle(layout, nodeCount) {
			if (layout === "flow") return {
				display: "flex",
				flexWrap: "wrap",
				gap: 12,
				padding: 12,
				alignItems: "stretch"
			};
			if (layout === "split-h") return {
				display: "grid",
				gridTemplateColumns: `repeat(${Math.min(nodeCount, 2)}, minmax(0, 1fr))`,
				gap: 12,
				padding: 12
			};
			if (layout === "split-v") return {
				display: "flex",
				flexDirection: "column",
				gap: 12,
				padding: 12
			};
			return {
				display: "grid",
				gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
				gap: 12,
				padding: 12,
				alignItems: "stretch"
			};
		}
		function nodeBase() {
			return {
				border: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
				borderRadius: 10,
				background: "var(--dsw-alias-bg-layer-2, #f6f6f7)",
				padding: 12,
				minWidth: 0,
				overflow: "hidden"
			};
		}
		function StatCardNode({ props }) {
			const tone = typeof props.tone === "string" ? props.tone : "default";
			const delta = typeof props.delta === "number" ? props.delta : null;
			const deltaLabel = typeof props.deltaLabel === "string" ? props.deltaLabel : "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: nodeBase(),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 11,
							color: "var(--dsw-alias-label-caption, #888)"
						},
						children: String(props.label ?? "")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 22,
							fontWeight: 700,
							marginTop: 6,
							fontVariantNumeric: "tabular-nums",
							color: TONE_COLOR[tone] ?? TONE_COLOR["default"]
						},
						children: String(props.value ?? "")
					}),
					delta !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							fontSize: 11,
							marginTop: 4,
							color: delta >= 0 ? "var(--dsw-alias-state-success-primary, #22c55e)" : "var(--dsw-alias-state-error-primary, #d4453a)"
						},
						children: [
							delta >= 0 ? "▲" : "▼",
							" ",
							Math.abs(delta),
							deltaLabel ? ` ${deltaLabel}` : ""
						]
					}) : null
				]
			});
		}
		function ChartNode({ props }) {
			const series = Array.isArray(props.series) ? props.series : [];
			const kind = typeof props.chart === "string" ? props.chart : "line";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...nodeBase(),
					display: "flex",
					flexDirection: "column",
					gap: 8
				},
				children: [
					typeof props.title === "string" && props.title.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 12,
							fontWeight: 600
						},
						children: props.title
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InlineChart, {
						kind,
						series
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							gap: 12,
							flexWrap: "wrap",
							fontSize: 10,
							color: "var(--dsw-alias-label-caption, #888)"
						},
						children: series.map((s, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								display: "inline-flex",
								alignItems: "center",
								gap: 4
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
								width: 8,
								height: 8,
								borderRadius: 2,
								background: SERIES_COLORS[i % SERIES_COLORS.length]
							} }), String(s.name ?? `S${i + 1}`)]
						}, i))
					})
				]
			});
		}
		const SERIES_COLORS = [
			"#4176e6",
			"#22c55e",
			"#f59e0b",
			"#d4453a",
			"#b06ad9",
			"#14b8a6",
			"#f97316",
			"#64748b"
		];
		/** 内联 SVG 图表（line/area/bar/pie；数据已在 dsl 层限流） */
		function InlineChart({ kind, series }) {
			const W = 320, H = 160, PAD = 8;
			if (kind === "pie") {
				const values = (series[0]?.points ?? []).map((p) => typeof p?.y === "number" ? p.y : 0).filter((v) => v > 0);
				const total = values.reduce((a, b) => a + b, 0);
				if (total <= 0 || values.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 11,
						color: "var(--dsw-alias-label-caption, #888)",
						padding: 16
					},
					children: "无数据"
				});
				let acc = 0;
				const R = 60, CX = W / 2, CY = H / 2;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
					viewBox: `0 0 ${W} ${H}`,
					style: {
						width: "100%",
						height: "auto"
					},
					"aria-hidden": "true",
					children: values.map((v, i) => {
						const start = acc / total * Math.PI * 2 - Math.PI / 2;
						acc += v;
						const end = acc / total * Math.PI * 2 - Math.PI / 2;
						const large = end - start > Math.PI ? 1 : 0;
						const x1 = CX + R * Math.cos(start), y1 = CY + R * Math.sin(start);
						const x2 = CX + R * Math.cos(end), y2 = CY + R * Math.sin(end);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`,
							fill: SERIES_COLORS[i % SERIES_COLORS.length],
							stroke: "var(--dsw-alias-bg-layer-2, #f6f6f7)",
							strokeWidth: "1.5"
						}, i);
					})
				});
			}
			const allPoints = [];
			for (const s of series) {
				const points = s?.points;
				if (Array.isArray(points)) for (const p of points) {
					const pp = p;
					if (typeof pp.y === "number") allPoints.push({
						x: pp.x,
						y: pp.y
					});
				}
			}
			if (allPoints.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					fontSize: 11,
					color: "var(--dsw-alias-label-caption, #888)",
					padding: 16
				},
				children: "无数据"
			});
			const ys = allPoints.map((p) => p.y);
			const minY = Math.min(...ys);
			const yRange = Math.max(...ys) - minY || 1;
			const n = Math.max(...series.map((s) => (s?.points ?? []).length), 1);
			const xAt = (i) => PAD + i / Math.max(n - 1, 1) * 304;
			const yAt = (y) => 152 - (y - minY) / yRange * 144;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				viewBox: `0 0 ${W} ${H}`,
				style: {
					width: "100%",
					height: "auto"
				},
				"aria-hidden": "true",
				children: [[
					0,
					.5,
					1
				].map((f) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
					x1: PAD,
					x2: 312,
					y1: PAD + f * 144,
					y2: PAD + f * 144,
					stroke: "var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
					strokeWidth: "1"
				}, f)), kind === "bar" ? series.map((s, si) => {
					const points = s?.points ?? [];
					const bw = Math.min(18, 304 / Math.max(points.length * (series.length + .5), 1));
					return points.map((p, i) => typeof p.y === "number" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: xAt(i) + si * bw - series.length * bw / 2,
						y: yAt(p.y),
						width: Math.max(bw - 1, 2),
						height: 152 - yAt(p.y),
						fill: SERIES_COLORS[si % SERIES_COLORS.length],
						rx: "1.5"
					}, `${si}-${i}`) : null);
				}) : series.map((s, si) => {
					const points = (s?.points ?? []).filter((p) => typeof p.y === "number");
					if (points.length === 0) return null;
					const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(p.y)}`).join(" ");
					const color = SERIES_COLORS[si % SERIES_COLORS.length];
					return kind === "area" && si === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: `${d} L ${xAt(points.length - 1)} 152 L ${xAt(0)} 152 Z`,
						fill: color,
						opacity: "0.12"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d,
						fill: "none",
						stroke: color,
						strokeWidth: "2",
						strokeLinejoin: "round"
					})] }, si) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d,
						fill: "none",
						stroke: color,
						strokeWidth: "2",
						strokeLinejoin: "round"
					}, si);
				})]
			});
		}
		function TableNode({ props }) {
			const columns = Array.isArray(props.columns) ? props.columns.map(String) : [];
			const rows = Array.isArray(props.rows) ? props.rows : [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...nodeBase(),
					padding: 0,
					overflow: "auto"
				},
				children: [typeof props.title === "string" && props.title.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 12,
						fontWeight: 600,
						padding: "10px 12px 0"
					},
					children: props.title
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					style: {
						width: "100%",
						borderCollapse: "collapse",
						fontSize: 11.5
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: columns.map((c, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
						style: {
							textAlign: "left",
							padding: "7px 12px",
							color: "var(--dsw-alias-label-caption, #888)",
							fontSize: 10,
							fontWeight: 600,
							borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
							whiteSpace: "nowrap"
						},
						children: c
					}, i)) }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: rows.map((row, ri) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: (Array.isArray(row) ? row : []).map((cell, ci) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
						style: {
							padding: "6px 12px",
							borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
							whiteSpace: "nowrap",
							maxWidth: 220,
							overflow: "hidden",
							textOverflow: "ellipsis"
						},
						children: cell === null || cell === void 0 ? "" : String(cell)
					}, ci)) }, ri)) })]
				})]
			});
		}
		function KeyValueNode({ props }) {
			const pairs = props.pairs ?? {};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...nodeBase(),
					display: "flex",
					flexDirection: "column",
					gap: 6
				},
				children: [typeof props.title === "string" && props.title.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 12,
						fontWeight: 600
					},
					children: props.title
				}) : null, Object.entries(pairs).map(([k, v]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						justifyContent: "space-between",
						gap: 12,
						fontSize: 11.5
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: { color: "var(--dsw-alias-label-caption, #888)" },
						children: k
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontWeight: 500,
							textAlign: "right",
							wordBreak: "break-all"
						},
						children: String(v)
					})]
				}, k))]
			});
		}
		function MarkdownNode({ props }) {
			const text = typeof props.text === "string" ? props.text : "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					...nodeBase(),
					fontSize: 12,
					lineHeight: 1.65
				},
				children: renderMarkdownLines(text)
			});
		}
		function CalloutNode({ props }) {
			const tone = typeof props.tone === "string" ? props.tone : "info";
			const color = TONE_COLOR[tone] ?? TONE_COLOR["info"];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...nodeBase(),
					borderLeft: `3px solid ${color}`,
					background: "var(--dsw-alias-bg-layer-2, #f6f6f7)"
				},
				children: [typeof props.title === "string" && props.title.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 12,
						fontWeight: 600,
						color
					},
					children: props.title
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 11.5,
						lineHeight: 1.6,
						marginTop: props.title ? 4 : 0
					},
					children: String(props.text ?? "")
				})]
			});
		}
		function SectionNode({ node, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					gridColumn: "1 / -1",
					border: "1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
					borderRadius: 10,
					padding: 12
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 11,
						fontWeight: 600,
						color: "var(--dsw-alias-label-caption, #888)",
						marginBottom: 8,
						letterSpacing: ".05em"
					},
					children: String(node.props.title ?? "")
				}), children]
			});
		}
		function ActionNode({ props, onClick }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				onClick,
				title: "点击把此动作的意图与上下文注入输入框草稿",
				style: {
					...nodeBase(),
					cursor: "pointer",
					textAlign: "center",
					fontSize: 12,
					fontWeight: 600,
					color: "var(--dsw-alias-state-business-primary, #4176e6)",
					background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 8%, transparent)",
					borderColor: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 30%, transparent)"
				},
				children: String(props.label ?? "Action")
			});
		}
		function LinkNode({ props }) {
			const href = typeof props.href === "string" ? props.href : "#";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
				href,
				target: "_blank",
				rel: "noreferrer noopener",
				style: {
					...nodeBase(),
					display: "block",
					textAlign: "center",
					fontSize: 12,
					fontWeight: 600,
					color: "var(--dsw-alias-state-business-primary, #4176e6)",
					textDecoration: "none"
				},
				children: [String(props.label ?? href), " ↗"]
			});
		}
		function NodeRenderer({ node, onAction }) {
			const props = node.props;
			switch (node.type) {
				case "stat-card": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCardNode, { props });
				case "chart": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChartNode, { props });
				case "table": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TableNode, { props });
				case "key-value": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KeyValueNode, { props });
				case "markdown": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownNode, { props });
				case "callout": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CalloutNode, { props });
				case "action": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionNode, {
					props,
					onClick: () => onAction?.(node)
				});
				case "link": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LinkNode, { props });
				case "section": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionNode, {
					node,
					children: null
				});
				case "panel": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: nodeBase() });
				case "html": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HtmlNode, {
					nodeId: node.id,
					props
				});
				default: return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: nodeBase(),
					children: ["未知节点 ", node.type]
				});
			}
		}
		function CanvasSurface({ snapshot, onAction }) {
			const { canvas } = snapshot;
			const sectionNodes = canvas.nodes.filter((n) => n.type === "section");
			const plainNodes = canvas.nodes.filter((n) => n.type !== "section");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: surface,
				"data-openloop-canvas": snapshot.canvasId,
				"data-revision": snapshot.revision,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						style: headerStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 13,
								fontWeight: 650,
								flex: 1,
								minWidth: 0,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap"
							},
							children: canvas.title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								fontSize: 10,
								fontFamily: "ui-monospace, Menlo, monospace",
								color: "var(--dsw-alias-label-caption, #888)"
							},
							children: [
								snapshot.canvasId,
								"@r",
								snapshot.revision
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: layoutStyle(canvas.layout, canvas.nodes.length),
						children: plainNodes.map((n) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-canvas-node": n.id,
							style: {
								display: "flex",
								flexDirection: "column",
								minWidth: 0
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NodeRenderer, {
								node: n,
								onAction
							})
						}, n.id))
					}),
					sectionNodes.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							padding: "0 12px 12px",
							display: "flex",
							flexDirection: "column",
							gap: 12
						},
						children: sectionNodes.map((n) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-canvas-node": n.id,
							style: {
								display: "flex",
								flexDirection: "column",
								minWidth: 0
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionNode, {
								node: n,
								children: null
							})
						}, n.id))
					}) : null
				]
			});
		}
		//#endregion
		//#region src/client/CanvasCard.tsx
		const captionStyle = {
			color: "var(--dsw-alias-label-caption, #888)",
			fontSize: 12
		};
		/** 容错解析 presentationMeta 的快照（§5.3 惯例：无法解析返回 undefined 不抛错）。
		*  presentationMeta 返回扁平 snapshot 本体（无包装层）。 */
		function canvasMetaFrom(value) {
			if (typeof value !== "object" || value === null) return void 0;
			const s = value;
			if (s.kind !== "qoder-canvas" || s.version !== 1) return void 0;
			if (typeof s.canvasId !== "string" || typeof s.revision !== "number") return void 0;
			const canvas = s.canvas;
			if (typeof canvas !== "object" || canvas === null) return void 0;
			const c = canvas;
			if (typeof c.title !== "string" || !Array.isArray(c.nodes)) return void 0;
			return value;
		}
		function CanvasCard({ block }) {
			if (!("kind" in block)) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: captionStyle,
				children: "Canvas · rendering…"
			});
			if (block.isError) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: captionStyle,
				children: "Canvas · failed"
			});
			const meta = canvasMetaFrom(block.meta);
			if (!meta) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: captionStyle,
				children: "Canvas · metadata unavailable"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasCardInner, { snapshot: meta });
		}
		/** 入口卡片（只读预览 + 工作台入口；零标注交互） */
		function CanvasCardInner({ snapshot }) {
			(0, react.useEffect)(() => {
				window.__openloopCanvasUpdate?.(snapshot.canvasId, snapshot);
			}, [snapshot]);
			/** action 节点在对话流的语义：点击 = 打开工作台执行（不在对话流注入） */
			const onAction = () => {
				window.__openloopCanvasOpen?.(snapshot.canvasId, snapshot);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: { position: "relative" },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => window.__openloopCanvasOpen?.(snapshot.canvasId, snapshot),
					title: "在画布工作台打开（右侧推出栏：标注/迭代）",
					style: {
						position: "absolute",
						top: 6,
						right: 8,
						zIndex: 20,
						display: "inline-flex",
						alignItems: "center",
						gap: 4,
						fontSize: 10.5,
						padding: "3px 10px",
						borderRadius: 6,
						cursor: "pointer",
						color: "#fff",
						background: "var(--dsw-alias-state-business-primary, #4176e6)",
						border: "none",
						fontFamily: "inherit",
						fontWeight: 600,
						whiteSpace: "nowrap",
						boxShadow: "0 2px 8px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 35%, transparent)"
					},
					children: "⇱ 工作台"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasSurface, {
					snapshot,
					onAction
				})]
			});
		}
		//#endregion
		//#region src/client/CanvasDockHost.tsx
		/**
		* CanvasDockHost：canvas dock 的推出面板（复刻 dock DockHost 已验证机制）。
		*
		* 与 board 的关系（QODER_CANVAS_SIDEBAR §2）：
		* - canvas dock 是与 board 平级的独立第二推出面板（内容 | canvas dock | board | bsb）
		* - 右缘定位：right = bsbWidth + boardWidth（读 --dsh-sidebar-width +
		*   --openloop-dock-width 两个变量，500ms 探测）
		* - 挤压：设 --openloop-canvas-width 变量；margin 总管规则在 dock 的 DockHost
		*   （calc(dock + canvas)，缺省 0 向后兼容）——本组件【不写】挤压规则
		* - 推出动画/左缘拖宽/bsb 同款嵌入式（无阴影无描边）——全部复刻 DockHost
		*/
		const CANVAS_WIDTH_VAR = "--openloop-canvas-width";
		const BSB_WIDTH_VAR = "--dsh-sidebar-width";
		const BOARD_WIDTH_VAR = "--openloop-dock-width";
		const TRANSITION = "width .22s ease";
		function clampCanvasWidth(w) {
			const max = Math.max(320, (typeof window === "undefined" ? 1200 : window.innerWidth) - 200);
			return Math.min(Math.max(320, w), max);
		}
		/** canvas dock 右缘 = bsbWidth + boardWidth（最靠内容的面板） */
		function probeCanvasRightEdge() {
			if (typeof window === "undefined") return 0;
			const cs = getComputedStyle(document.documentElement);
			const read = (v) => {
				const n = parseFloat(cs.getPropertyValue(v)) || 0;
				return n > 0 && n < window.innerWidth * .8 ? n : 0;
			};
			return window.innerWidth - read(BSB_WIDTH_VAR) - read(BOARD_WIDTH_VAR);
		}
		function CanvasDockHost({ open, width, onWidthChange, children }) {
			const [host, setHost] = (0, react.useState)(null);
			const [rightEdge, setRightEdge] = (0, react.useState)(() => probeCanvasRightEdge());
			const [resizing, setResizing] = (0, react.useState)(false);
			const [handleHover, setHandleHover] = (0, react.useState)(false);
			const widthRef = (0, react.useRef)(width);
			widthRef.current = width;
			(0, react.useEffect)(() => {
				const el = document.createElement("div");
				el.setAttribute("data-openloop-canvas-dock", "");
				document.body.appendChild(el);
				setHost(el);
				const observer = new MutationObserver(() => {
					if (!document.body.contains(el)) document.body.appendChild(el);
				});
				observer.observe(document.body, { childList: true });
				return () => {
					observer.disconnect();
					el.remove();
				};
			}, []);
			(0, react.useEffect)(() => {
				const update = () => setRightEdge(probeCanvasRightEdge());
				update();
				const timer = setInterval(update, 500);
				window.addEventListener("resize", update);
				return () => {
					clearInterval(timer);
					window.removeEventListener("resize", update);
				};
			}, []);
			(0, react.useEffect)(() => {
				const root = document.getElementById("root");
				if (!root) return;
				root.style.setProperty(CANVAS_WIDTH_VAR, open ? `${width}px` : "0px");
				return () => {
					root.style.removeProperty(CANVAS_WIDTH_VAR);
				};
			}, [open, width]);
			const startResize = (event) => {
				if (!open) return;
				event.preventDefault();
				const startX = event.clientX;
				const startW = widthRef.current;
				setResizing(true);
				const move = (e) => {
					onWidthChange?.(clampCanvasWidth(Math.round(startW + (startX - e.clientX))));
				};
				const up = () => {
					setResizing(false);
					removeEventListener("pointermove", move);
					removeEventListener("pointerup", up);
				};
				addEventListener("pointermove", move);
				addEventListener("pointerup", up);
			};
			if (!host) return null;
			const outer = {
				position: "fixed",
				top: 0,
				bottom: 0,
				right: typeof window === "undefined" ? 0 : Math.max(0, window.innerWidth - rightEdge),
				width: open ? width : 0,
				transition: resizing ? "none" : TRANSITION,
				overflow: "hidden",
				zIndex: 2147483045,
				background: "var(--dsw-alias-bg-layer-1, #fff)",
				boxSizing: "border-box"
			};
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: outer,
				"data-openloop-canvas-panel": "",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						position: "absolute",
						top: 0,
						bottom: 0,
						right: 0,
						width,
						height: "100%",
						display: "flex",
						flexDirection: "column",
						background: "var(--dsw-alias-bg-layer-1, #fff)",
						boxSizing: "border-box"
					},
					children: [children, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						onPointerDown: startResize,
						onPointerEnter: () => setHandleHover(true),
						onPointerLeave: () => setHandleHover(false),
						style: {
							position: "absolute",
							left: 0,
							top: 0,
							bottom: 0,
							width: 10,
							cursor: open ? "col-resize" : "default",
							pointerEvents: open ? "auto" : "none",
							zIndex: 10
						},
						title: "拖动调整宽度",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
							width: resizing || handleHover ? 6 : 4,
							height: "100%",
							background: resizing || handleHover ? "var(--dsw-alias-state-business-primary, #4176e6)" : "var(--dsw-alias-border-l2, rgba(127,127,127,.3))",
							transition: "background .15s ease, width .15s ease"
						} })
					})]
				})
			}), host);
		}
		/** canvas toggle（board toggle 左侧；right = bsbWidth + boardWidth + 46） */
		function CanvasToggle({ open, onToggle }) {
			const [hover, setHover] = (0, react.useState)(false);
			const [right, setRight] = (0, react.useState)(46);
			(0, react.useEffect)(() => {
				const update = () => {
					const edge = probeCanvasRightEdge();
					setRight(Math.max(46, window.innerWidth - edge + 46));
				};
				update();
				const timer = setInterval(update, 500);
				window.addEventListener("resize", update);
				return () => {
					clearInterval(timer);
					window.removeEventListener("resize", update);
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onToggle,
				title: open ? "收起画布工作台" : "展开画布工作台",
				onMouseEnter: () => setHover(true),
				onMouseLeave: () => setHover(false),
				style: {
					position: "fixed",
					top: 38,
					right,
					zIndex: 2147483045,
					width: 28,
					height: 28,
					padding: 0,
					borderRadius: "50%",
					border: "none",
					background: hover ? "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))" : "transparent",
					cursor: "pointer",
					lineHeight: 1,
					opacity: hover ? 1 : .55,
					transition: "opacity .15s ease, background .15s ease",
					display: open ? "none" : "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "var(--dsw-alias-label-secondary, inherit)"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					width: "15",
					height: "15",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.9",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "3.5",
							y: "3.5",
							width: "17",
							height: "17",
							rx: "2.5"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3.5 12h17M12 3.5v17" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							cx: "12",
							cy: "12",
							r: "1.2",
							fill: "currentColor",
							stroke: "none"
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client/CanvasPinLayer.tsx
		/**
		* CanvasPinLayer：画布上的元素 pin 标注层（S7 元素级精度重写）。
		*
		* 核心升级（2026-09-06 用户拍板，对齐 workbuddy/DevTools 检查器精度）：
		* - 点选命中 = elementsFromPoint 的【最深层 DOM 元素】，不再只到 data-canvas-node 级
		*   ——复杂布局里能选到一个小框里的一个胶囊/一个字
		* - target 记录：所属 nodeId（DSL 注入）+ domPath（node → 元素的 CSS 路径）+ tag + 文本
		* - hover 高亮元素本身 + DevTools 式 tooltip（tag · 宽×高）
		* - mode 受控（toolbar 提到 CanvasWorkbench）
		*
		* 设计参照（QODER_CANVAS_SIDEBAR §3）：零蒙层拦截，hover 高亮 → 点击锁定 →
		* targets 气泡 → 评注 → 结构化草稿（canvas-annotations.ts）。
		*/
		const ACCENT$3 = "var(--dsw-alias-state-business-primary, #4176e6)";
		/** AnnotationTarget → ElementHit（text 类无定位返回 null） */
		function targetToHit(t) {
			if (t.kind === "node") return {
				nodeId: t.id,
				domPath: "",
				tag: "div"
			};
			if (t.kind === "element") return {
				nodeId: t.id,
				domPath: t.domPath,
				tag: t.tag,
				text: t.text
			};
			return null;
		}
		/** 已存注释的编号角标（点击弹操作卡） */
		function PinBadge({ n, annotation, onEdit, onDelete, onHover }) {
			const [cardOpen, setCardOpen] = (0, react.useState)(false);
			const firstTarget = annotation.targets[0];
			const anchorId = firstTarget !== void 0 && (firstTarget.kind === "node" || firstTarget.kind === "element") ? firstTarget.id : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				"data-openloop-pin-badge": true,
				onPointerDown: (e) => e.stopPropagation(),
				onClick: (e) => {
					e.stopPropagation();
					setCardOpen((v) => !v);
				},
				onPointerEnter: () => {
					if (anchorId !== null) onHover(anchorId);
				},
				onPointerLeave: () => onHover(null),
				title: annotation.note,
				style: {
					position: "absolute",
					right: -9,
					top: -9,
					zIndex: 40,
					width: 18,
					height: 18,
					borderRadius: "50%",
					border: "2px solid var(--dsw-alias-bg-layer-1, #fff)",
					background: ACCENT$3,
					color: "#fff",
					fontSize: 10,
					fontWeight: 700,
					lineHeight: 1,
					cursor: "pointer",
					padding: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					boxShadow: "0 1px 4px rgba(0,0,0,.25)",
					fontFamily: "inherit"
				},
				children: n
			}), cardOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				onPointerDown: (e) => e.stopPropagation(),
				style: {
					position: "absolute",
					right: -8,
					top: 14,
					zIndex: 41,
					width: 190,
					borderRadius: 9,
					padding: "8px 10px",
					display: "flex",
					flexDirection: "column",
					gap: 6,
					background: "var(--dsw-alias-bg-layer-1, #fff)",
					border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
					boxShadow: "0 8px 24px rgba(0,0,0,.22)",
					fontSize: 11
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						color: "var(--dsw-alias-label-secondary, inherit)",
						lineHeight: 1.5,
						maxHeight: 72,
						overflow: "auto"
					},
					children: annotation.note
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						gap: 5,
						justifyContent: "flex-end"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							onEdit();
							setCardOpen(false);
						},
						style: {
							fontSize: 10.5,
							padding: "2px 9px",
							borderRadius: 5,
							border: `1px solid ${ACCENT$3}`,
							background: "none",
							color: ACCENT$3,
							cursor: "pointer",
							fontFamily: "inherit"
						},
						children: "编辑"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							onDelete();
							setCardOpen(false);
						},
						style: {
							fontSize: 10.5,
							padding: "2px 9px",
							borderRadius: 5,
							border: "1px solid var(--dsw-alias-state-business-danger, #d0453e)",
							background: "none",
							color: "var(--dsw-alias-state-business-danger, #d0453e)",
							cursor: "pointer",
							fontFamily: "inherit"
						},
						children: "删除"
					})]
				})]
			}) : null] });
		}
		function CanvasPinLayer({ snapshot, containerRef, mode, targets, callbacks }) {
			const [hovered, setHovered] = (0, react.useState)(null);
			const [locked, setLocked] = (0, react.useState)(null);
			const [marquee, setMarquee] = (0, react.useState)(null);
			/** 框选拖拽中实时命中的元素（Figma 式即时反馈，元素级） */
			const [marqueeHits, setMarqueeHits] = (0, react.useState)([]);
			const marqueeActive = (0, react.useRef)(false);
			const marqueeStart = (0, react.useRef)(null);
			/** 框选实时命中节流：同帧合并一次计算 + 矩形未变跳过重算 */
			const marqueeRaf = (0, react.useRef)(0);
			const lastMarqueeRect = (0, react.useRef)(null);
			/** iframe hover 预取竞态序号（旧异步响应丢弃） */
			const hoverIframeSeq = (0, react.useRef)(0);
			/** iframe hover 探针查询去抖定时器（鼠标稳定 60ms 才发） */
			const hoverIframeTimer = (0, react.useRef)(null);
			/** 最新 targets（异步 iframe 框选合并时读取——避免闭包旧值） */
			const targetsRef = (0, react.useRef)([]);
			targetsRef.current = targets;
			(0, react.useEffect)(() => {
				broadcastProbeMode(mode === "text" ? "text" : "off");
			}, [mode]);
			(0, react.useEffect)(() => {
				if (mode !== "text") return;
				return onProbeSelection((nodeId, info) => {
					if (info.excerpt.length === 0) return;
					callbacks.onTargetsChange([{
						kind: "text",
						excerpt: info.excerpt,
						nodeId
					}]);
				});
			}, [mode]);
			const annotationsByNode = /* @__PURE__ */ new Map();
			callbacks.annotations.forEach((ann, i) => {
				const t = ann.targets[0];
				if (t !== void 0 && (t.kind === "node" || t.kind === "element")) {
					const list = annotationsByNode.get(t.id) ?? [];
					list.push({
						ann,
						n: i + 1
					});
					annotationsByNode.set(t.id, list);
				}
			});
			/**
			* 元素级命中（S7 核心 + 0.9.0 iframe 扩展）：
			* 外层 DOM 命中（elementsFromPoint）优先；未命中且坐标落在 html 节点 iframe 上时
			* 返回 iframe 占位命中（同步）；探针细粒度命中走 hover 预取缓存（异步，见 onPointerMove）。
			*/
			const hitElement = (x, y) => {
				const surface = containerRef.current;
				if (surface === null) return null;
				const dbgStack = [];
				for (const el of document.elementsFromPoint(x, y)) {
					if (el.closest("[data-openloop-canvas-pin-layer]") !== null) {
						dbgStack.push(`${el.tagName}:pin`);
						continue;
					}
					if (!surface.contains(el)) {
						dbgStack.push(`${el.tagName}:!in`);
						continue;
					}
					const nodeEl = el.closest("[data-canvas-node]");
					if (nodeEl === null || !surface.contains(nodeEl)) continue;
					const nodeId = nodeEl.getAttribute("data-canvas-node");
					if (nodeId === null || nodeId.length === 0) continue;
					if (el.tagName === "IFRAME") return {
						nodeId,
						domPath: "",
						tag: "iframe"
					};
					if (el === nodeEl) return {
						nodeId,
						domPath: "",
						tag: nodeEl.tagName.toLowerCase()
					};
					const domPath = domPathWithin(nodeEl, el);
					const text = (el.textContent ?? "").trim();
					return {
						nodeId,
						domPath,
						tag: el.tagName.toLowerCase(),
						text: text.length > 0 ? text.slice(0, 40) : void 0
					};
				}
				return null;
			};
			/**
			* iframe 探针命中（异步）：坐标落在 html 节点 iframe → 查探针。
			* point/marquee 两查询；命中返回带 iframeHit 的 ElementHit（nodeId 归属 html 节点）。
			*/
			const hitIframeAt = async (x, y) => {
				const surface = containerRef.current;
				if (surface === null) return null;
				const rec = frameAtAny(x, y);
				if (rec === null) {
					`${Math.round(x)}${Math.round(y)}`;
					return null;
				}
				if (!surface.contains(rec.frame)) {
					`${rec.nodeId}`;
					return null;
				}
				const coords = toFrameCoords(rec, x, y);
				const hit = await probeHitAt(rec, coords.x, coords.y);
				if (hit === null) return {
					nodeId: rec.nodeId,
					domPath: "",
					tag: "iframe"
				};
				return {
					nodeId: rec.nodeId,
					domPath: hit.domPath,
					tag: hit.tag,
					text: hit.text,
					iframeHit: hit
				};
			};
			/**
			* 框选命中（S8.1 元素级深化，用户拍板）：
			* - node 与矩形相交面积占比 ≥ 0.5 → 选整个 node（node 级）
			*   （旧逻辑要求完全包含——大卡片框不住，用户「框了都没选到」）
			* - 占比不足 → 深入 node 内部，收集与矩形相交的【叶子元素】（element 级）
			*   （如只框住 table 第一列 → 选中该列的若干 td，而不是整个 table）
			*/
			const hitMarquee = (rect) => {
				const surface = containerRef.current;
				if (surface === null) return [];
				const intersects = (r) => !(r.right < rect.left || r.left > rect.right || r.bottom < rect.top || r.top > rect.bottom);
				const intersectArea = (r) => {
					const w = Math.min(r.right, rect.right) - Math.max(r.left, rect.left);
					const h = Math.min(r.bottom, rect.bottom) - Math.max(r.top, rect.top);
					return w > 0 && h > 0 ? w * h : 0;
				};
				const out = [];
				for (const nodeEl of surface.querySelectorAll("[data-canvas-node]")) {
					const nodeId = nodeEl.getAttribute("data-canvas-node");
					if (nodeId === null || nodeId.length === 0) continue;
					const nr = nodeEl.getBoundingClientRect();
					if (!intersects(nr)) continue;
					const node = snapshot.canvas.nodes.find((n) => n.id === nodeId);
					const type = node?.type ?? nodeId;
					const label = node !== void 0 ? String(node.props.label ?? node.props.title ?? nodeId) : nodeId;
					if ((nr.width * nr.height > 0 ? intersectArea(nr) / (nr.width * nr.height) : 0) >= .5) {
						out.push({
							kind: "node",
							id: nodeId,
							label
						});
						continue;
					}
					const walk = (el) => {
						for (const child of el.children) {
							if (child.tagName === "IFRAME") continue;
							if (child.children.length === 0) {
								const cr = child.getBoundingClientRect();
								if (cr.width > 0 && cr.height > 0 && intersects(cr)) {
									const domPath = domPathWithin(nodeEl, child);
									const text = (child.textContent ?? "").trim();
									const tag = child.tagName.toLowerCase();
									out.push({
										kind: "element",
										id: nodeId,
										label: `${type} ${tag}${text.length > 0 ? ` "${text.slice(0, 20)}"` : ""}`,
										tag,
										domPath,
										text: text.length > 0 ? text.slice(0, 40) : void 0
									});
								}
							} else walk(child);
						}
					};
					walk(nodeEl);
				}
				return out;
			};
			const buildRangeIndex = (range) => {
				const surface = containerRef.current;
				if (surface === null) return [];
				const out = [];
				for (const el of surface.querySelectorAll("[data-canvas-node]")) {
					const id = el.getAttribute("data-canvas-node");
					if (id === null) continue;
					const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
					let textNode = walker.nextNode();
					let acc = "";
					let hit = false;
					while (textNode !== null) {
						const tr = document.createRange();
						tr.selectNodeContents(textNode);
						if (range.compareBoundaryPoints(Range.END_TO_START, tr) < 0 && range.compareBoundaryPoints(Range.START_TO_END, tr) > 0) {
							acc += textNode.textContent ?? "";
							hit = true;
						}
						textNode = walker.nextNode();
					}
					if (hit) out.push({
						nodeId: id,
						text: acc.trim()
					});
				}
				return out;
			};
			const hitText = () => {
				const sel = window.getSelection();
				if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) return [];
				const surface = containerRef.current;
				if (surface === null) return [];
				const range = sel.getRangeAt(0);
				if (!surface.contains(range.commonAncestorContainer)) return [];
				return buildRangeIndex(range);
			};
			(0, react.useEffect)(() => {
				const container = containerRef.current;
				if (container === null) return;
				/**
				* 悬浮注释面板内的交互完全豁免（真机教训 2026-09-06：面板在画布容器内，
				* 面板上的点击会冒泡到容器触发点选——点 textarea/保存按钮时穿透命中
				* 画布元素或把 targets 重置为空，导致「评论了但什么都没保存」）
				*/
				const inFloatPanel = (e) => e.target instanceof Element && e.target.closest("[data-annotation-float]") !== null;
				const onPointerMove = (e) => {
					if (inFloatPanel(e)) {
						setHovered(null);
						return;
					}
					if (mode === "point" && !marqueeActive.current) {
						const domHit = hitElement(e.clientX, e.clientY);
						if (domHit !== null && domHit.tag === "iframe") {
							const seq = ++hoverIframeSeq.current;
							setHovered(domHit);
							const ex = e.clientX, ey = e.clientY;
							if (hoverIframeTimer.current !== null) clearTimeout(hoverIframeTimer.current);
							hoverIframeTimer.current = setTimeout(() => {
								hoverIframeTimer.current = null;
								hitIframeAt(ex, ey).then((h) => {
									if (seq === hoverIframeSeq.current && h !== null) setHovered(h);
								});
							}, 60);
						} else {
							hoverIframeSeq.current++;
							setHovered(domHit);
						}
					} else if (marqueeActive.current) {
						setMarquee((prev) => prev !== null ? {
							...prev,
							x1: e.clientX,
							y1: e.clientY
						} : null);
						const start = marqueeStart.current;
						if (start !== null && marqueeRaf.current === 0) {
							const ex = e.clientX, ey = e.clientY;
							marqueeRaf.current = requestAnimationFrame(() => {
								marqueeRaf.current = 0;
								const rect = {
									left: Math.min(start.x, ex),
									right: Math.max(start.x, ex),
									top: Math.min(start.y, ey),
									bottom: Math.max(start.y, ey)
								};
								const last = lastMarqueeRect.current;
								if (last !== null && Math.abs(last.left - rect.left) < 2 && Math.abs(last.right - rect.right) < 2 && Math.abs(last.top - rect.top) < 2 && Math.abs(last.bottom - rect.bottom) < 2) return;
								lastMarqueeRect.current = rect;
								setMarqueeHits(hitMarquee(rect).map(targetToHit).filter((h) => h !== null));
							});
						}
					}
				};
				const onPointerDown = (e) => {
					if (inFloatPanel(e)) return;
					if (mode === "marquee" && e.button === 0) {
						marqueeActive.current = true;
						marqueeStart.current = {
							x: e.clientX,
							y: e.clientY
						};
						setMarquee({
							x0: e.clientX,
							y0: e.clientY,
							x1: e.clientX,
							y1: e.clientY
						});
						setMarqueeHits([]);
						setLocked(null);
						e.preventDefault();
					}
				};
				const onPointerUp = (e) => {
					if (inFloatPanel(e)) {
						marqueeActive.current = false;
						marqueeStart.current = null;
						setMarquee(null);
						setMarqueeHits([]);
						return;
					}
					if (mode === "point" && !marqueeActive.current) {
						const hit = hitElement(e.clientX, e.clientY);
						const lockAndEmit = (h) => {
							setLocked(h);
							const node = snapshot.canvas.nodes.find((n) => n.id === h.nodeId);
							const type = node?.type ?? h.nodeId;
							if (h.iframeHit !== void 0) {
								callbacks.onTargetsChange([{
									kind: "html-element",
									id: h.nodeId,
									label: `html ${h.tag}${h.text !== void 0 ? ` "${h.text.slice(0, 20)}"` : ""}`,
									tag: h.tag,
									domPath: h.domPath,
									text: h.text,
									snippet: h.iframeHit.snippet
								}]);
								return;
							}
							if (h.domPath.length === 0) {
								const label = node !== void 0 ? String(node.props.label ?? node.props.title ?? h.nodeId) : h.nodeId;
								callbacks.onTargetsChange([{
									kind: "node",
									id: h.nodeId,
									label
								}]);
							} else callbacks.onTargetsChange([{
								kind: "element",
								id: h.nodeId,
								label: `${type} ${h.tag}${h.text !== void 0 ? ` "${h.text.slice(0, 20)}"` : ""}`,
								tag: h.tag,
								domPath: h.domPath,
								text: h.text
							}]);
						};
						if (hit !== null && hit.tag === "iframe") {
							lockAndEmit(hit);
							hitIframeAt(e.clientX, e.clientY).then((h) => {
								if (h !== null) lockAndEmit(h);
							});
						} else if (hit !== null) lockAndEmit(hit);
						else {
							setLocked(null);
							callbacks.onTargetsChange([]);
						}
					} else if (marqueeActive.current) {
						marqueeActive.current = false;
						marqueeStart.current = null;
						if (marqueeRaf.current !== 0) {
							cancelAnimationFrame(marqueeRaf.current);
							marqueeRaf.current = 0;
						}
						lastMarqueeRect.current = null;
						setMarqueeHits([]);
						setMarquee((prev) => {
							if (prev !== null) {
								const rect = {
									left: Math.min(prev.x0, prev.x1),
									right: Math.max(prev.x0, prev.x1),
									top: Math.min(prev.y0, prev.y1),
									bottom: Math.max(prev.y0, prev.y1)
								};
								if (rect.right - rect.left > 6 && rect.bottom - rect.top > 6) {
									callbacks.onTargetsChange(hitMarquee(rect));
									(async () => {
										const surface = containerRef.current;
										if (surface === null) return;
										for (const rec of allFrameRecords()) {
											const fr = rec.frame.getBoundingClientRect();
											if (fr.width === 0 || !surface.contains(rec.frame)) continue;
											const probeRect = {
												left: Math.max(rect.left, fr.left) - fr.left,
												right: Math.min(rect.right, fr.right) - fr.left,
												top: Math.max(rect.top, fr.top) - fr.top,
												bottom: Math.min(rect.bottom, fr.bottom) - fr.top
											};
											if (probeRect.right - probeRect.left <= 4 || probeRect.bottom - probeRect.top <= 4) continue;
											const hits = await probeMarqueeIn(rec, probeRect);
											if (hits.length === 0) continue;
											const htmlTargets = hits.map((h) => ({
												kind: "html-element",
												id: rec.nodeId,
												label: `html ${h.tag}${h.text !== void 0 && h.text.length > 0 ? ` "${h.text.slice(0, 20)}"` : ""}`,
												tag: h.tag,
												domPath: h.domPath,
												text: h.text,
												snippet: h.snippet
											}));
											callbacks.onTargetsChange([...targetsRef.current, ...htmlTargets]);
										}
									})();
								}
							}
							return null;
						});
					} else if (mode === "text") {
						const hits = hitText();
						const first = hits[0];
						if (first !== void 0) {
							const excerpt = hits.map((h) => h.text).join(" ").slice(0, 120);
							callbacks.onTargetsChange([{
								kind: "text",
								excerpt,
								nodeId: first.nodeId
							}]);
						}
					}
				};
				const onKeyDown = (e) => {
					if (e.key === "Escape") {
						setLocked(null);
						setMarquee(null);
						setMarqueeHits([]);
						if (marqueeRaf.current !== 0) {
							cancelAnimationFrame(marqueeRaf.current);
							marqueeRaf.current = 0;
						}
						lastMarqueeRect.current = null;
						callbacks.onTargetsChange([]);
					}
					if (e.key === "Enter" && (e.target === document.body || e.target === container)) callbacks.onSave();
				};
				container.addEventListener("pointermove", onPointerMove);
				container.addEventListener("pointerdown", onPointerDown);
				container.addEventListener("pointerup", onPointerUp);
				document.addEventListener("keydown", onKeyDown);
				return () => {
					container.removeEventListener("pointermove", onPointerMove);
					container.removeEventListener("pointerdown", onPointerDown);
					container.removeEventListener("pointerup", onPointerUp);
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [
				mode,
				snapshot.canvasId,
				snapshot.revision,
				containerRef.current
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `[data-openloop-canvas-workbench] [data-openloop-canvas]{ cursor: ${mode === "marquee" ? "crosshair" : mode === "text" ? "text" : "default"}; }` }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-canvas-pin-layer": true,
				style: {
					position: "absolute",
					inset: 0,
					pointerEvents: "none",
					zIndex: 20
				},
				children: [
					hovered !== null && (locked === null || hovered.nodeId !== locked.nodeId || hovered.domPath !== locked.domPath) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HighlightEl, {
						surface: containerRef.current,
						hit: hovered,
						borderStyle: "outline",
						nodeType: snapshot.canvas.nodes.find((n) => n.id === hovered.nodeId)?.type
					}) : null,
					targets.map((t) => {
						if (t.kind === "node" || t.kind === "element") {
							const hit = t.kind === "element" ? {
								nodeId: t.id,
								domPath: t.domPath,
								tag: t.tag,
								text: t.text
							} : {
								nodeId: t.id,
								domPath: "",
								tag: "div"
							};
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HighlightEl, {
								surface: containerRef.current,
								hit,
								borderStyle: "solid",
								nodeType: snapshot.canvas.nodes.find((n) => n.id === t.id)?.type,
								showTooltip: targets.length === 1
							}, `sel-${t.id}-${t.kind === "element" ? t.domPath : "root"}`);
						}
						if (t.kind === "html-element") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HighlightEl, {
							surface: containerRef.current,
							hit: {
								nodeId: t.id,
								domPath: "",
								tag: "iframe"
							},
							borderStyle: "solid",
							nodeType: "html",
							showTooltip: targets.length === 1
						}, `sel-${t.id}-${t.domPath}`);
						return null;
					}),
					marqueeHits.map((h) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HighlightEl, {
						surface: containerRef.current,
						hit: h,
						borderStyle: "outline",
						nodeType: void 0,
						showTooltip: false
					}, `mq-${h.nodeId}-${h.domPath}`)),
					marquee !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
						position: "fixed",
						left: Math.min(marquee.x0, marquee.x1),
						top: Math.min(marquee.y0, marquee.y1),
						width: Math.abs(marquee.x1 - marquee.x0),
						height: Math.abs(marquee.y1 - marquee.y0),
						border: `1.5px dashed ${ACCENT$3}`,
						background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 8%, transparent)",
						pointerEvents: "none",
						zIndex: 50
					} }) : null,
					[...annotationsByNode.entries()].map(([nodeId, list]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NodeBadgeAnchor, {
						surface: containerRef.current,
						nodeId,
						children: list.map(({ ann, n }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinBadge, {
							n,
							annotation: ann,
							onEdit: () => callbacks.onEditAnnotation(ann),
							onDelete: () => callbacks.onDeleteAnnotation(ann),
							onHover: callbacks.onFocusNode
						}, ann.id))
					}, nodeId))
				]
			})] });
		}
		/**
		* 从 ancestor 到 el 的 CSS 路径（tag.firstClass > tag:nth-of-type(n) > ...）。
		* 真机教训（2026-09-06）：无 class 的元素（table 的 td、stat-card 的子 div）
		* 若不带序号，`nodeEl.querySelector(domPath)` 永远命中【第一个】匹配——
		* 高亮框永远钉在第一格/第一个子元素上，用户以为「只能选第一格」。
		* 加 :nth-of-type 保证回查唯一命中自己。
		*/
		function domPathWithin(ancestor, el) {
			const parts = [];
			let cur = el;
			while (cur !== null && cur !== ancestor) {
				const tag = cur.tagName.toLowerCase();
				const cls = (cur.getAttribute("class") ?? "").trim().split(/\s+/)[0];
				let part = cls !== void 0 && cls.length > 0 ? `${tag}.${CSS.escape(cls)}` : tag;
				const parent = cur.parentElement;
				if (parent !== null) {
					const sameTag = [...parent.children].filter((c) => c.tagName === cur.tagName);
					if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(cur) + 1})`;
				}
				parts.unshift(part);
				cur = cur.parentElement;
			}
			return parts.join(" > ");
		}
		/** badge 锚点：包一层 node 元素尺寸的 absolute 容器，角标钉在右上 */
		function NodeBadgeAnchor({ surface, nodeId, children }) {
			if (surface === null) return null;
			const el = surface.querySelector(`[data-canvas-node="${CSS.escape(nodeId)}"]`);
			if (el === null) return null;
			const box = surface.getBoundingClientRect();
			const r = el.getBoundingClientRect();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					position: "absolute",
					left: r.left - box.left,
					top: r.top - box.top,
					width: r.width,
					height: r.height,
					pointerEvents: "none",
					zIndex: 35
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						position: "absolute",
						right: 0,
						top: 0,
						pointerEvents: "auto"
					},
					children
				})
			});
		}
		/**
		* 元素级高亮框 + DevTools 式 tooltip（showTooltip=false 时只画框）。
		* 0.9.0：iframe 命中（iframeHit 携带探针 rect）直接按换算坐标画——不经 DOM 回查
		* （iframe 内元素父层 querySelector 不可达）；domPath 命中照旧回查。
		*/
		function HighlightEl({ surface, hit, borderStyle, nodeType, showTooltip = true }) {
			if (surface === null) return null;
			const box = surface.getBoundingClientRect();
			let r = null;
			if (hit.iframeHit !== void 0) {
				const frameEl = surface.querySelector(`[data-canvas-node="${CSS.escape(hit.nodeId)}"] iframe`);
				if (frameEl === null) return null;
				r = frameRectToContainer(frameEl, surface, hit.iframeHit.rect);
			} else {
				const nodeEl = surface.querySelector(`[data-canvas-node="${CSS.escape(hit.nodeId)}"]`);
				if (nodeEl === null) return null;
				let el = nodeEl;
				if (hit.domPath.length > 0) try {
					el = nodeEl.querySelector(hit.domPath) ?? nodeEl;
				} catch {
					el = nodeEl;
				}
				const er = el.getBoundingClientRect();
				r = {
					left: er.left,
					top: er.top,
					width: er.width,
					height: er.height
				};
			}
			if (r.width === 0 && r.height === 0) return null;
			const tooltip = `${nodeType ?? ""} ${hit.tag} · ${Math.round(r.width)}×${Math.round(r.height)}`.trim();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
				position: "absolute",
				left: r.left - box.left - 2,
				top: r.top - box.top - 2,
				width: r.width + 4,
				height: r.height + 4,
				border: borderStyle === "outline" ? `1.5px solid ${ACCENT$3}` : `2px solid ${ACCENT$3}`,
				borderRadius: 5,
				pointerEvents: "none",
				zIndex: 30,
				background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)",
				boxShadow: borderStyle === "solid" ? `0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 18%, transparent)` : "none"
			} }), showTooltip ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					position: "absolute",
					left: r.left - box.left - 2,
					top: Math.max(2, r.top - box.top - 22),
					zIndex: 31,
					fontSize: 10,
					fontFamily: "ui-monospace, Menlo, monospace",
					lineHeight: 1,
					padding: "3px 7px",
					borderRadius: 4,
					pointerEvents: "none",
					whiteSpace: "nowrap",
					color: "#fff",
					background: "var(--dsw-alias-state-business-primary, #4176e6)",
					boxShadow: "0 2px 6px rgba(0,0,0,.2)"
				},
				children: tooltip
			}) : null] });
		}
		//#endregion
		//#region src/client/CommentPanel.tsx
		/**
		* CommentPanel：工作台右侧常驻评论面板（design-comments 范式，QODER_CANVAS_SIDEBAR §3）。
		*
		* 与对话流版「画布浮动小框」的根本区别：评论 UI 是【常驻面板】——
		* 注释按元素分组列表 + 新建输入框（targets 已选时出现）+ 编辑/删除。
		* 空间从容，评论历史/输入/管理分层清晰。
		*/
		const ACCENT$2 = "var(--dsw-alias-state-business-primary, #4176e6)";
		function CommentPanel({ targets, note, setNote, onRemoveTarget, onSave, onCancel, annotations, onEdit, onDelete, focusNodeId }) {
			const listRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (focusNodeId === null || listRef.current === null) return;
				listRef.current.querySelector(`[data-ann-node="${CSS.escape(focusNodeId)}"]`)?.scrollIntoView({
					behavior: "smooth",
					block: "nearest"
				});
			}, [focusNodeId]);
			const byNode = /* @__PURE__ */ new Map();
			const textAnns = [];
			for (const a of annotations) {
				const nodeTarget = a.targets.find((t) => t.kind === "node");
				if (nodeTarget !== void 0 && nodeTarget.kind === "node") {
					const arr = byNode.get(nodeTarget.id) ?? [];
					arr.push(a);
					byNode.set(nodeTarget.id, arr);
				} else textAnns.push(a);
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					height: "100%",
					minHeight: 0,
					borderLeft: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							padding: "8px 12px",
							borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
							display: "flex",
							alignItems: "center",
							gap: 6
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 11,
								fontWeight: 650
							},
							children: "评论"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 10,
								color: "var(--dsw-alias-label-caption, #888)"
							},
							children: annotations.length
						})]
					}),
					targets.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							padding: "10px 12px",
							borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
							display: "flex",
							flexDirection: "column",
							gap: 7,
							background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 5%, transparent)"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									display: "flex",
									flexWrap: "wrap",
									gap: 5
								},
								children: targets.map((t, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										display: "inline-flex",
										alignItems: "center",
										gap: 4,
										fontSize: 10,
										padding: "1.5px 7px",
										borderRadius: 5,
										background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)",
										color: ACCENT$2,
										maxWidth: "100%",
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: [t.kind === "text" ? `文本 "${t.excerpt}"` : t.label, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => onRemoveTarget(i),
										style: {
											border: 0,
											background: "none",
											cursor: "pointer",
											padding: 0,
											color: "inherit",
											fontSize: 11,
											lineHeight: 1
										},
										children: "×"
									})]
								}, i))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								value: note,
								onChange: (e) => setNote(e.target.value),
								placeholder: "添加评论…（保存后注入输入框草稿）",
								rows: 3,
								autoFocus: true,
								style: {
									fontSize: 11.5,
									padding: "6px 8px",
									borderRadius: 7,
									border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
									background: "var(--dsw-alias-bg-layer-2, #f6f6f7)",
									color: "inherit",
									resize: "vertical",
									fontFamily: "inherit"
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 6,
									justifyContent: "flex-end"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: onCancel,
									style: {
										fontSize: 10.5,
										padding: "3px 10px",
										borderRadius: 6,
										border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
										background: "none",
										cursor: "pointer",
										fontFamily: "inherit"
									},
									children: "取消"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: onSave,
									disabled: note.trim().length === 0,
									style: {
										fontSize: 10.5,
										padding: "3px 12px",
										borderRadius: 6,
										border: 0,
										cursor: note.trim().length > 0 ? "pointer" : "not-allowed",
										fontFamily: "inherit",
										color: "#fff",
										background: note.trim().length > 0 ? ACCENT$2 : "var(--dsw-alias-interactive-bg-active, rgba(127,127,127,.2))"
									},
									children: "保存"
								})]
							})
						]
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						ref: listRef,
						style: {
							flex: 1,
							minHeight: 0,
							overflow: "auto",
							padding: "8px 12px",
							display: "flex",
							flexDirection: "column",
							gap: 12
						},
						children: [
							annotations.length === 0 && targets.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: 11,
									color: "var(--dsw-alias-label-caption, #888)",
									lineHeight: 1.7,
									padding: "12px 4px"
								},
								children: [
									"还没有评论",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: { fontSize: 10 },
										children: "在左侧画布上点选/框选元素或选中文本，即可添加评论"
									})
								]
							}) : null,
							[...byNode.entries()].map(([nodeId, anns]) => {
								const first = anns[0]?.targets.find((t) => t.kind === "node");
								const label = first !== void 0 && first.kind === "node" ? first.label : nodeId;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									"data-ann-node": nodeId,
									style: {
										display: "flex",
										flexDirection: "column",
										gap: 6
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											fontSize: 10.5,
											fontWeight: 650,
											color: ACCENT$2,
											display: "flex",
											alignItems: "center",
											gap: 5
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
												width: 6,
												height: 6,
												borderRadius: "50%",
												background: ACCENT$2,
												flexShrink: 0
											} }),
											nodeId,
											" ",
											label
										]
									}), anns.map((a) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											gap: 6,
											alignItems: "flex-start",
											fontSize: 11.5,
											lineHeight: 1.55,
											padding: "6px 8px",
											borderRadius: 7,
											background: "var(--dsw-alias-bg-layer-2, #f6f6f7)"
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													flex: 1,
													minWidth: 0,
													wordBreak: "break-word"
												},
												children: a.note
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => onEdit(a),
												title: "编辑",
												style: {
													border: 0,
													background: "none",
													cursor: "pointer",
													fontSize: 11,
													color: "var(--dsw-alias-label-caption, #888)",
													padding: 0,
													flexShrink: 0
												},
												children: "✎"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => onDelete(a),
												title: "删除",
												style: {
													border: 0,
													background: "none",
													cursor: "pointer",
													fontSize: 11,
													color: "var(--dsw-alias-label-caption, #888)",
													padding: 0,
													flexShrink: 0
												},
												children: "🗑"
											})
										]
									}, a.id))]
								}, nodeId);
							}),
							textAnns.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexDirection: "column",
									gap: 6
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 10.5,
										fontWeight: 650,
										color: "var(--dsw-alias-label-secondary, inherit)"
									},
									children: "文本注释"
								}), textAnns.map((a) => {
									const excerpt = a.targets.find((t) => t.kind === "text");
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											flexDirection: "column",
											gap: 4,
											fontSize: 11.5,
											padding: "6px 8px",
											borderRadius: 7,
											background: "var(--dsw-alias-bg-layer-2, #f6f6f7)"
										},
										children: [excerpt !== void 0 && excerpt.kind === "text" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: {
												fontSize: 10,
												color: "var(--dsw-alias-label-caption, #888)",
												fontStyle: "italic",
												borderLeft: `2px solid ${ACCENT$2}`,
												paddingLeft: 6
											},
											children: [
												"\"",
												excerpt.excerpt,
												"\""
											]
										}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												gap: 6,
												alignItems: "flex-start"
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: {
														flex: 1,
														minWidth: 0,
														wordBreak: "break-word"
													},
													children: a.note
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => onEdit(a),
													title: "编辑",
													style: {
														border: 0,
														background: "none",
														cursor: "pointer",
														fontSize: 11,
														color: "var(--dsw-alias-label-caption, #888)",
														padding: 0,
														flexShrink: 0
													},
													children: "✎"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => onDelete(a),
													title: "删除",
													style: {
														border: 0,
														background: "none",
														cursor: "pointer",
														fontSize: 11,
														color: "var(--dsw-alias-label-caption, #888)",
														padding: 0,
														flexShrink: 0
													},
													children: "🗑"
												})
											]
										})]
									}, a.id);
								})]
							}) : null
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/canvas-annotations.ts
		const KEY_PREFIX = "qoder-canvas.annotations.v1.";
		function keyOf(canvasId) {
			return KEY_PREFIX + canvasId;
		}
		function readAll(canvasId) {
			try {
				const raw = localStorage.getItem(keyOf(canvasId));
				if (raw === null) return [];
				const parsed = JSON.parse(raw);
				return Array.isArray(parsed) ? parsed.filter((a) => typeof a?.id === "string" && typeof a?.note === "string") : [];
			} catch {
				return [];
			}
		}
		function writeAll(canvasId, items) {
			try {
				localStorage.setItem(keyOf(canvasId), JSON.stringify(items));
			} catch {}
		}
		function listAnnotations(canvasId) {
			return readAll(canvasId);
		}
		function addAnnotation(input) {
			const annotation = {
				...input,
				id: `ann_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`,
				createdAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			writeAll(input.canvasId, [...readAll(input.canvasId), annotation]);
			return annotation;
		}
		function updateAnnotationNote(canvasId, id, note) {
			writeAll(canvasId, readAll(canvasId).map((a) => a.id === id ? {
				...a,
				note
			} : a));
		}
		function removeAnnotation(canvasId, id) {
			writeAll(canvasId, readAll(canvasId).filter((a) => a.id !== id));
		}
		/** 单个 target 的结构化块（node/element 带 DSL 源码；text 带所属节点定位；html-element 带 snippet） */
		function formatTargetBlock(t, nodes) {
			if (t.kind === "html-element") return formatHtmlElementTarget(t, nodes);
			if (t.kind === "node" || t.kind === "element") {
				const idx = nodes.findIndex((n) => n.id === t.id);
				const node = idx >= 0 ? nodes[idx] : void 0;
				const elementAttrs = t.kind === "element" ? ` element="${t.domPath}" tag="${t.tag}"${t.text !== void 0 && t.text.length > 0 ? ` text="${t.text.replace(/"/g, "&quot;")}"` : ""}` : "";
				if (node !== void 0) return `<target type="${node.type}" id="${node.id}" path="nodes[${idx}]"${elementAttrs}>\n${JSON.stringify(node, null, 2)}\n</target>`;
				return `<target id="${t.id}" note="not found in current revision"${elementAttrs}>${t.label}</target>`;
			}
			const idx = t.nodeId !== void 0 ? nodes.findIndex((n) => n.id === t.nodeId) : -1;
			return `<target type="text"${idx >= 0 ? ` in="nodes[${idx}]"` : t.nodeId !== void 0 ? ` in="${t.nodeId}"` : ""}>"${t.excerpt}"</target>`;
		}
		/** html-element target 块（0.9.0 增强档）：snippet 是 Agent 定位修改的主线索 */
		function formatHtmlElementTarget(t, nodes) {
			const idx = nodes.findIndex((n) => n.id === t.id);
			const pathAttr = idx >= 0 ? `nodes[${idx}]` : t.id;
			const textAttr = t.text !== void 0 && t.text.length > 0 ? ` text="${escapeAttr(t.text)}"` : "";
			const snippet = t.snippet.length > 0 && /[[@\d]/.test(t.snippet[0] ?? "") ? `\n${t.snippet}` : t.snippet;
			return `<target type="html" id="${t.id}" path="${pathAttr}" element="${escapeAttr(t.domPath)}" tag="${t.tag}"${textAttr}>\n${snippet}\n</target>\n定位说明：该元素在 html 节点 ${pathAttr} 的 source 内，无结构化路径——请以上方源码片段做文本匹配定位，修改后重发完整 source`;
		}
		/** 属性值转义（防注入破坏 XML 结构） */
		function escapeAttr(s) {
			return s.replace(/"/g, "&quot;").replace(/\n/g, " ");
		}
		/**
		* 同画布多条注释合并注入（S7.1）：共享一个定位头，逐条编号。
		* 头部不带方括号（真机教训：Lexical composer 的 markdown 插件会把 `[...]`
		* 误识别为 link 语法）；条目序号用 `#1`（`[1]` 有 link 风险、`1)` 行首有
		* 有序列表转换风险，`#1` 无 markdown 语义——`#` 后必须跟空格才是 heading）。
		*/
		function formatAnnotationBatch(snapshot, anns) {
			const nodes = snapshot.canvas.nodes ?? [];
			const multi = anns.length > 1;
			return `${`画布标注 · ${snapshot.canvas.title} ${snapshot.canvasId} · r${snapshot.revision}${multi ? `（${anns.length} 条）` : ""}`}\n${anns.map((ann, i) => {
				const block = ann.targets.map((t) => formatTargetBlock(t, nodes)).join("\n");
				return `${multi ? `#${i + 1} ` : ""}${block}\n评注：${ann.note}`;
			}).join("\n")}`;
		}
		//#endregion
		//#region src/client/composer-bridge.ts
		/** 定位 composer 元素（data-* 语义选择器，0.1.2 实证存在） */
		function findComposer() {
			return document.querySelector("[data-composer-input=\"true\"]");
		}
		/**
		* 向 composer 追加草稿文本。返回是否成功。
		*
		* 真机教训（2026-09-06，S7.1）：多行 insertText 在 DSH 的 Lexical 覆写里
		* 行为畸形——第一行总是跑到文档末尾（头部「画布标注 · ...」出现在消息
		* 最后而不是最前）。改为【逐行插入】（单行 insertText 行为 M0 验证可靠，
		* 行间用 insertParagraph 分段）。
		*/
		function injectComposerDraft(text, _options) {
			const el = findComposer();
			if (el === null) return false;
			el.focus();
			const lines = text.split("\n");
			let ok = true;
			for (let i = 0; i < lines.length; i += 1) {
				if (i > 0) try {
					document.execCommand("insertParagraph", false);
				} catch {
					ok = false;
				}
				const line = lines[i];
				if (line !== void 0 && line.length > 0) try {
					if (!document.execCommand("insertText", false, line)) el.dispatchEvent(new InputEvent("beforeinput", {
						bubbles: true,
						cancelable: true,
						inputType: "insertText",
						data: line
					}));
				} catch {
					ok = false;
				}
			}
			return ok;
		}
		/** 审计上报（尽力而为：fire-and-forget，失败静默——注入不依赖端点，设计文档 §3.4） */
		function reportAnnotation(payload) {
			try {
				fetch("/qoder-canvas/annotate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload)
				}).catch(() => void 0);
			} catch {}
		}
		//#endregion
		//#region src/client/annotation-capsule.tsx
		/**
		* annotation-capsule：画布注释的 composer 胶囊（S7 新增，2026-09-06 用户拍板）。
		*
		* 核心语义（对齐 workbuddy/Qoder Canvas 的「引用胶囊」）：
		* - 保存注释【不再】把文本铺进输入框——而是以「胶囊」挂在 composer 上方
		* - hover 胶囊 → 悬浮详情卡（每条注释的 target 摘要 + 评注 + 编辑/删除）
		* - 用户正常输入自己的问题，按 Enter（或点发送按钮）时，
		*   胶囊里的全部注释被格式化为结构化草稿注入 composer 随消息一起发出
		* - 发送后胶囊清空
		*
		* 技术要点：
		* - 胶囊条用 fixed 定位贴 composer 外框上方（不侵入 Lexical 内部结构）
		* - 发送拦截 = document 级 capture（keydown Enter / 发送按钮 click），
		*   在 DSH 处理之前把草稿注入（execCommand 同步生效，发送时完整携带）
		*/
		const drafts = [];
		const latestSnapshots = /* @__PURE__ */ new Map();
		const listeners = /* @__PURE__ */ new Set();
		function emit() {
			for (const l of listeners) l();
		}
		function pushCapsuleDraft(ann) {
			drafts.push(ann);
			emit();
		}
		function registerCanvasSnapshot(snap) {
			latestSnapshots.set(snap.canvasId, snap);
		}
		let currentCanvas = null;
		function setCurrentCanvasRef(ref) {
			currentCanvas = ref;
		}
		function flushDraftsIntoComposer() {
			if (drafts.length === 0) {
				if (currentCanvas !== null) injectComposerDraft(`当前画布 · ${currentCanvas.title} ${currentCanvas.canvasId} · r${currentCanvas.revision}`);
				return;
			}
			const byCanvas = /* @__PURE__ */ new Map();
			for (const ann of drafts) {
				const list = byCanvas.get(ann.canvasId) ?? [];
				list.push(ann);
				byCanvas.set(ann.canvasId, list);
			}
			const parts = [];
			for (const [canvasId, anns] of byCanvas) {
				const snap = latestSnapshots.get(canvasId);
				if (snap !== void 0) {
					const revision = Math.max(...anns.map((a) => a.revision));
					parts.push(formatAnnotationBatch({
						canvasId,
						revision,
						canvas: snap.canvas
					}, anns));
				} else parts.push(`画布标注 · ${canvasId}\n${anns.map((a, i) => `#${i + 1} 评注：${a.note}`).join("\n")}`);
			}
			injectComposerDraft(parts.join("\n\n"));
			drafts.length = 0;
			emit();
		}
		function findComposerInput() {
			return document.querySelector("[data-composer-input=\"true\"]") ?? document.querySelector("[contenteditable=\"true\"]");
		}
		/** composer 外框（含输入区+工具行的容器）：从输入框向上找第一个带 button 的祖先 */
		function findComposerFrame(input) {
			let cur = input;
			for (let i = 0; i < 8 && cur !== null; i += 1) {
				if (cur.querySelector("button") !== null && cur.getBoundingClientRect().height > 60) return cur;
				cur = cur.parentElement;
			}
			return input.parentElement ?? input;
		}
		/** 发送按钮探测：composer 外框内最后一个【无文本内容的圆形/图标按钮】 */
		function findSendButton(frame) {
			const buttons = [...frame.querySelectorAll("button")];
			for (let i = buttons.length - 1; i >= 0; i -= 1) {
				const b = buttons[i];
				if (b === void 0) continue;
				if ((b.textContent ?? "").trim().length === 0 && b.querySelector("svg") !== null) return b;
			}
			return null;
		}
		const ACCENT$1 = "var(--dsw-alias-state-business-primary, #4176e6)";
		function AnnotationCapsuleBar() {
			const [, force] = (0, react.useReducer)((x) => x + 1, 0);
			const [anchor, setAnchor] = (0, react.useState)(null);
			const [detailOpen, setDetailOpen] = (0, react.useState)(false);
			const [editingId, setEditingId] = (0, react.useState)(null);
			const [editingNote, setEditingNote] = (0, react.useState)("");
			const hoverTimer = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const l = () => force();
				listeners.add(l);
				return () => {
					listeners.delete(l);
				};
			}, []);
			(0, react.useEffect)(() => {
				const update = () => {
					const input = findComposerInput();
					if (input === null) {
						setAnchor(null);
						return;
					}
					const r = findComposerFrame(input).getBoundingClientRect();
					if (r.width === 0) {
						setAnchor(null);
						return;
					}
					setAnchor((prev) => {
						const next = {
							left: r.left + 10,
							top: r.top - 36
						};
						return prev !== null && Math.abs(prev.left - next.left) < 1 && Math.abs(prev.top - next.top) < 1 ? prev : next;
					});
				};
				update();
				window.addEventListener("resize", update);
				document.addEventListener("scroll", update, true);
				const timer = setInterval(update, 800);
				return () => {
					window.removeEventListener("resize", update);
					document.removeEventListener("scroll", update, true);
					clearInterval(timer);
				};
			}, []);
			const resendRef = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				const tryFlushAndResend = (input) => {
					if (resendRef.current) return;
					const sendBtn = findSendButton(findComposerFrame(input));
					flushDraftsIntoComposer();
					if (sendBtn === null) return;
					resendRef.current = true;
					setTimeout(() => {
						sendBtn.click();
						setTimeout(() => {
							resendRef.current = false;
						}, 120);
					}, 80);
				};
				const onKeydown = (e) => {
					if (resendRef.current) return;
					if (drafts.length === 0 && currentCanvas === null) return;
					if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
					const input = findComposerInput();
					if (input === null || !input.contains(e.target)) return;
					if ((input.textContent ?? "").trim().length === 0) return;
					e.preventDefault();
					e.stopImmediatePropagation();
					tryFlushAndResend(input);
				};
				const onClick = (e) => {
					if (resendRef.current) return;
					if (drafts.length === 0 && currentCanvas === null) return;
					const input = findComposerInput();
					if (input === null) return;
					const sendBtn = findSendButton(findComposerFrame(input));
					if (sendBtn !== null && sendBtn.contains(e.target)) {
						if ((input.textContent ?? "").trim().length === 0) return;
						e.preventDefault();
						e.stopImmediatePropagation();
						tryFlushAndResend(input);
					}
				};
				document.addEventListener("keydown", onKeydown, true);
				document.addEventListener("click", onClick, true);
				return () => {
					document.removeEventListener("keydown", onKeydown, true);
					document.removeEventListener("click", onClick, true);
				};
			}, []);
			if (drafts.length === 0 || anchor === null) return null;
			const openDetail = () => {
				if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
				setDetailOpen(true);
			};
			const closeDetail = () => {
				if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
				hoverTimer.current = setTimeout(() => setDetailOpen(false), 180);
			};
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-annotation-capsule": true,
				onPointerEnter: openDetail,
				onPointerLeave: closeDetail,
				style: {
					position: "fixed",
					left: anchor.left,
					top: anchor.top,
					zIndex: 2147483050,
					display: "flex",
					alignItems: "center",
					gap: 6
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: {
						display: "inline-flex",
						alignItems: "center",
						gap: 5,
						fontSize: 11,
						padding: "3px 8px 3px 7px",
						borderRadius: 999,
						color: "var(--dsw-alias-label-primary, inherit)",
						background: "var(--dsw-alias-bg-layer-1, #fff)",
						border: `1px solid ${ACCENT$1}`,
						boxShadow: "0 2px 10px rgba(0,0,0,.14)",
						cursor: "default",
						userSelect: "none"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
							width: "11",
							height: "11",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: ACCENT$1,
							strokeWidth: "2",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							"aria-hidden": "true",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								color: ACCENT$1,
								fontWeight: 600
							},
							children: [drafts.length, " 条画布注释"]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							title: "移除全部注释",
							onClick: () => {
								drafts.length = 0;
								emit();
							},
							style: {
								border: 0,
								background: "none",
								padding: 0,
								cursor: "pointer",
								color: "var(--dsw-alias-label-caption, #888)",
								fontSize: 12,
								lineHeight: 1,
								fontFamily: "inherit"
							},
							children: "×"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						fontSize: 10,
						color: "var(--dsw-alias-label-caption, #999)"
					},
					children: "发送消息时随消息发出"
				})]
			}), detailOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				onPointerEnter: openDetail,
				onPointerLeave: closeDetail,
				style: {
					position: "fixed",
					left: anchor.left,
					top: anchor.top - 8,
					transform: "translateY(-100%)",
					zIndex: 2147483051,
					width: 320,
					maxHeight: 300,
					overflow: "auto",
					borderRadius: 10,
					padding: "10px 12px",
					background: "var(--dsw-alias-bg-layer-1, #fff)",
					border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
					boxShadow: "0 10px 32px rgba(0,0,0,.24)",
					display: "flex",
					flexDirection: "column",
					gap: 8,
					fontSize: 11.5
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						fontSize: 10.5,
						fontWeight: 600,
						color: ACCENT$1
					},
					children: [
						"待发送的画布注释（",
						drafts.length,
						"）"
					]
				}), drafts.map((ann, i) => {
					const t = ann.targets[0];
					const targetLabel = t === void 0 ? "" : t.kind === "text" ? `文本 "${t.excerpt.slice(0, 24)}"` : t.label;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 4,
							padding: "7px 9px",
							borderRadius: 8,
							background: "var(--dsw-alias-bg-layer-2, rgba(127,127,127,.06))"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 6
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										fontWeight: 650,
										flex: 1,
										minWidth: 0,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: [
										i + 1,
										"。",
										targetLabel
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									title: "编辑评注",
									onClick: () => {
										setEditingId(ann.id);
										setEditingNote(ann.note);
									},
									style: {
										border: 0,
										background: "none",
										padding: 2,
										cursor: "pointer",
										color: "var(--dsw-alias-label-caption, #888)",
										display: "flex"
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
										width: "12",
										height: "12",
										viewBox: "0 0 24 24",
										fill: "none",
										stroke: "currentColor",
										strokeWidth: "2",
										strokeLinecap: "round",
										strokeLinejoin: "round",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" })
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									title: "移除",
									onClick: () => {
										const idx = drafts.findIndex((d) => d.id === ann.id);
										if (idx >= 0) {
											drafts.splice(idx, 1);
											emit();
										}
									},
									style: {
										border: 0,
										background: "none",
										padding: 2,
										cursor: "pointer",
										color: "var(--dsw-alias-label-caption, #888)",
										fontSize: 13,
										lineHeight: 1,
										fontFamily: "inherit"
									},
									children: "×"
								})
							]
						}), editingId === ann.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: 5
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								value: editingNote,
								onChange: (e) => setEditingNote(e.target.value),
								rows: 2,
								autoFocus: true,
								style: {
									fontSize: 11,
									padding: "5px 7px",
									borderRadius: 6,
									border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2))",
									background: "var(--dsw-alias-bg-layer-1, #fff)",
									color: "inherit",
									resize: "vertical",
									fontFamily: "inherit"
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 5,
									justifyContent: "flex-end"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setEditingId(null),
									style: {
										fontSize: 10,
										padding: "2px 8px",
										borderRadius: 5,
										border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2))",
										background: "none",
										cursor: "pointer",
										fontFamily: "inherit",
										color: "inherit"
									},
									children: "取消"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: editingNote.trim().length === 0,
									onClick: () => {
										const d = drafts.find((x) => x.id === ann.id);
										if (d !== void 0) d.note = editingNote.trim();
										setEditingId(null);
										emit();
									},
									style: {
										fontSize: 10,
										padding: "2px 10px",
										borderRadius: 5,
										border: 0,
										cursor: "pointer",
										fontFamily: "inherit",
										color: "#fff",
										background: ACCENT$1
									},
									children: "保存"
								})]
							})]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								color: "var(--dsw-alias-label-secondary, inherit)",
								lineHeight: 1.5,
								whiteSpace: "pre-wrap",
								wordBreak: "break-word"
							},
							children: ann.note
						})]
					}, ann.id);
				})]
			}) : null] }), document.body);
		}
		//#endregion
		//#region src/client/CanvasWorkbench.tsx
		/**
		* CanvasWorkbench：canvas dock 的工作台（S7 布局重做，2026-09-06 用户拍板）。
		*
		* 布局（推翻 S5 两列方案）：
		* - 画布区【铺满】整个工作台（不留右栏）
		* - toolbar（点击/框选/划字 三模式）常驻 header 之下——清晰可见
		* - 注释面板 = 【悬浮窗】浮在画布上（默认右上，可拖拽移动，可关闭）
		* - 保存注释 → composer 胶囊（annotation-capsule），不再把文本铺进输入框
		*/
		const WIDTH_KEY = "openloop.canvas.width.v1";
		const OPEN_KEY = "openloop.canvas.open.v1";
		function readWidth() {
			try {
				const v = Number(localStorage.getItem(WIDTH_KEY));
				return Number.isFinite(v) && v > 0 ? clampCanvasWidth(v) : 560;
			} catch {
				return 560;
			}
		}
		function readOpen() {
			try {
				return localStorage.getItem(OPEN_KEY) === "1";
			} catch {
				return false;
			}
		}
		const ACCENT = "var(--dsw-alias-state-business-primary, #4176e6)";
		const MODES = [
			{
				key: "point",
				label: "点击",
				hint: "hover 高亮元素，点击选中（元素级精度）"
			},
			{
				key: "marquee",
				label: "框选",
				hint: "拖拽框选多个节点"
			},
			{
				key: "text",
				label: "划字",
				hint: "划选文本作为引用"
			}
		];
		function CanvasWorkbench() {
			const [open, setOpen] = (0, react.useState)(readOpen);
			const [width, setWidth] = (0, react.useState)(readWidth);
			const [snapshot, setSnapshot] = (0, react.useState)(null);
			const [annotations, setAnnotations] = (0, react.useState)([]);
			const [targets, setTargets] = (0, react.useState)([]);
			const [note, setNote] = (0, react.useState)("");
			const [mode, setMode] = (0, react.useState)("point");
			const [focusNodeId, setFocusNodeId] = (0, react.useState)(null);
			const [editAnn, setEditAnn] = (0, react.useState)(null);
			const [toast, setToast] = (0, react.useState)(null);
			const [panelOpen, setPanelOpen] = (0, react.useState)(false);
			const [panelPos, setPanelPos] = (0, react.useState)(null);
			/** 工作区目录（M4） */
			const [catalogOpen, setCatalogOpen] = (0, react.useState)(false);
			const [catalogItems, setCatalogItems] = (0, react.useState)([]);
			const [revMenuOpen, setRevMenuOpen] = (0, react.useState)(false);
			const canvasAreaRef = (0, react.useRef)(null);
			const dragRef = (0, react.useRef)(null);
			const persistOpen = (v) => {
				setOpen(v);
				try {
					localStorage.setItem(OPEN_KEY, v ? "1" : "0");
				} catch {}
			};
			const persistWidth = (w) => {
				setWidth(w);
				try {
					localStorage.setItem(WIDTH_KEY, String(w));
				} catch {}
			};
			const showToast = (msg) => {
				setToast(msg);
				setTimeout(() => {
					setToast((cur) => cur === msg ? null : cur);
				}, 2200);
			};
			const hasEverOpened = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				const applySnapshot = (canvasId, snap) => {
					if (snap != null) {
						setSnapshot(snap);
						registerCanvasSnapshot(snap);
					}
					setAnnotations(listAnnotations(canvasId));
					setTargets([]);
				};
				window.__openloopCanvasOpen = (canvasId, snap) => {
					applySnapshot(canvasId, snap);
					hasEverOpened.current = true;
					persistOpen(true);
					refreshFromStorage(canvasId);
				};
				window.__openloopCanvasUpdate = (canvasId, snap) => {
					applySnapshot(canvasId, snap);
					if (!hasEverOpened.current) {
						hasEverOpened.current = true;
						persistOpen(true);
					}
					refreshFromStorage(canvasId);
				};
				return () => {
					delete window.__openloopCanvasOpen;
					delete window.__openloopCanvasUpdate;
				};
			}, []);
			const refreshFromStorage = async (canvasId) => {
				try {
					const res = await fetch(`/qoder-canvas/canvas/${canvasId}`);
					if (!res.ok) return;
					const snap = await res.json();
					if (snap?.kind === "qoder-canvas" && snap.canvasId === canvasId) setSnapshot((prev) => {
						if (prev !== null && snap.revision <= prev.revision) return prev;
						registerCanvasSnapshot(snap);
						return snap;
					});
				} catch {}
			};
			/** M4 工作区目录：拉清单（列表端点；失败静默） */
			const refreshCatalog = async () => {
				try {
					const res = await fetch("/qoder-canvas/list");
					if (!res.ok) return;
					const body = await res.json();
					if (Array.isArray(body.items)) setCatalogItems(body.items);
				} catch {}
			};
			/** M4 切换画布（目录点击）：拉指定 canvas 最新快照 + 注释跟随 */
			const openCanvas = async (canvasId) => {
				setSnapshot(null);
				setAnnotations([]);
				setTargets([]);
				try {
					const res = await fetch(`/qoder-canvas/canvas/${canvasId}`);
					if (res.ok) {
						const snap = await res.json();
						if (snap?.kind === "qoder-canvas" && snap.canvasId === canvasId) {
							setSnapshot(snap);
							registerCanvasSnapshot(snap);
						}
					}
				} catch {}
				setAnnotations(listAnnotations(canvasId));
				setCatalogOpen(false);
			};
			/** M4 版本切换：读指定 rev 快照（标注按 canvasId 共享，天然跨版本） */
			const openRevision = async (canvasId, rev) => {
				if (snapshot !== null && snapshot.canvasId === canvasId && snapshot.revision === rev) {
					setRevMenuOpen(false);
					return;
				}
				try {
					const res = await fetch(`/qoder-canvas/canvas/${canvasId}?rev=${rev}`);
					if (!res.ok) {
						setRevMenuOpen(false);
						return;
					}
					const snap = await res.json();
					if (snap?.kind === "qoder-canvas" && snap.canvasId === canvasId && snap.revision === rev) {
						setSnapshot(snap);
						registerCanvasSnapshot(snap);
						setTargets([]);
					}
				} catch {}
				setRevMenuOpen(false);
			};
			(0, react.useEffect)(() => {
				setCurrentCanvasRef(snapshot !== null && open ? {
					canvasId: snapshot.canvasId,
					revision: snapshot.revision,
					title: snapshot.canvas.title
				} : null);
			}, [snapshot, open]);
			const saveAnnotation = () => {
				if (snapshot === null || note.trim().length === 0 || targets.length === 0) return;
				const trimmed = note.trim();
				pushCapsuleDraft(addAnnotation({
					canvasId: snapshot.canvasId,
					revision: snapshot.revision,
					targets,
					note: trimmed
				}));
				setAnnotations(listAnnotations(snapshot.canvasId));
				reportAnnotation({
					canvasId: snapshot.canvasId,
					revision: snapshot.revision,
					targets: targets.map((t) => t.kind === "node" || t.kind === "element" ? t.id : "text"),
					note: trimmed
				});
				showToast("评论已保存——已挂到输入框上方胶囊，发送时随消息发出");
				setTargets([]);
				setNote("");
			};
			(0, react.useEffect)(() => {
				if (targets.length > 0) setPanelOpen(true);
			}, [targets.length]);
			const onPanelDragStart = (e) => {
				const area = canvasAreaRef.current;
				if (area === null) return;
				const panel = e.target.closest("[data-annotation-float]");
				if (panel === null) return;
				const areaBox = area.getBoundingClientRect();
				const panelBox = panel.getBoundingClientRect();
				dragRef.current = {
					dx: e.clientX - panelBox.left,
					dy: e.clientY - panelBox.top
				};
				const onMove = (ev) => {
					const d = dragRef.current;
					if (d === null) return;
					const x = Math.max(0, Math.min(ev.clientX - d.dx - areaBox.left, areaBox.width - 120));
					const y = Math.max(0, Math.min(ev.clientY - d.dy - areaBox.top, areaBox.height - 60));
					setPanelPos({
						x,
						y
					});
				};
				const onUp = () => {
					dragRef.current = null;
					window.removeEventListener("pointermove", onMove);
					window.removeEventListener("pointerup", onUp);
				};
				window.addEventListener("pointermove", onMove);
				window.addEventListener("pointerup", onUp);
			};
			const modeHint = MODES.find((m) => m.key === mode)?.hint ?? "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasToggle, {
					open,
					onToggle: () => persistOpen(!open)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasDockHost, {
					open,
					width,
					onWidthChange: persistWidth,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							height: "100%",
							minWidth: 0
						},
						"data-openloop-canvas-workbench": true,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 8,
								padding: "10px 14px",
								borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 13,
										fontWeight: 650,
										flex: 1,
										minWidth: 0,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: snapshot !== null ? snapshot.canvas.title : "画布工作台"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										setCatalogOpen((v) => !v);
										if (!catalogOpen) refreshCatalog();
									},
									title: "工作区画布目录",
									style: {
										fontSize: 11,
										padding: "3px 9px",
										borderRadius: 6,
										border: catalogOpen ? `1px solid ${ACCENT}` : "1px solid transparent",
										cursor: "pointer",
										background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))",
										color: catalogOpen ? ACCENT : "var(--dsw-alias-label-secondary, inherit)",
										fontFamily: "inherit"
									},
									children: "目录"
								}),
								snapshot !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: { position: "relative" },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => setRevMenuOpen((v) => !v),
										title: `版本历史 · ${snapshot.canvasId}@r${snapshot.revision}`,
										style: {
											display: "inline-flex",
											alignItems: "center",
											gap: 4,
											fontSize: 10,
											color: "var(--dsw-alias-label-caption, #888)",
											background: "none",
											border: revMenuOpen ? `1px solid ${ACCENT}` : "1px solid transparent",
											borderRadius: 5,
											padding: "2px 6px",
											cursor: "pointer",
											fontFamily: "inherit"
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
												width: "11",
												height: "11",
												viewBox: "0 0 24 24",
												fill: "none",
												stroke: "currentColor",
												strokeWidth: "2",
												strokeLinecap: "round",
												strokeLinejoin: "round",
												"aria-hidden": "true",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 12a9 9 3 0 9-9 9.75 9.75 0 0 1-6.74 2.74L3 8" }),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 3v5h5" }),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 7v5l4 2" })
												]
											}),
											"版本 r",
											snapshot.revision,
											" ▾"
										]
									}), revMenuOpen ? (() => {
										const item = catalogItems.find((c) => c.canvasId === snapshot.canvasId);
										const revs = item !== void 0 && item.revisions.length > 0 ? item.revisions : [snapshot.revision];
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												position: "absolute",
												right: 0,
												top: "100%",
												marginTop: 4,
												zIndex: 60,
												minWidth: 120,
												borderRadius: 8,
												padding: "4px",
												background: "var(--dsw-alias-bg-layer-1, #fff)",
												border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
												boxShadow: "0 8px 24px rgba(0,0,0,.2)"
											},
											children: [...revs].reverse().map((r) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => {
													openRevision(snapshot.canvasId, r);
												},
												style: {
													display: "block",
													width: "100%",
													textAlign: "left",
													fontSize: 10.5,
													padding: "4px 8px",
													borderRadius: 5,
													border: 0,
													cursor: "pointer",
													fontFamily: "ui-monospace, Menlo, monospace",
													background: r === snapshot.revision ? "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)" : "none",
													color: r === snapshot.revision ? ACCENT : "inherit"
												},
												children: [
													"r",
													r,
													r === snapshot.revision ? " · 当前" : ""
												]
											}, r))
										});
									})() : null]
								}) : null,
								snapshot !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setPanelOpen((v) => !v),
									title: "评论面板（悬浮窗）",
									style: {
										fontSize: 11,
										padding: "3px 9px",
										borderRadius: 6,
										border: panelOpen ? `1px solid ${ACCENT}` : "1px solid transparent",
										cursor: "pointer",
										background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))",
										color: panelOpen ? ACCENT : "var(--dsw-alias-label-secondary, inherit)",
										fontFamily: "inherit"
									},
									children: ["评论", annotations.length > 0 ? ` ${annotations.length}` : ""]
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => persistOpen(false),
									title: "收起（画布保留）",
									style: {
										fontSize: 11,
										padding: "3px 9px",
										borderRadius: 6,
										border: 0,
										cursor: "pointer",
										background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))",
										color: "var(--dsw-alias-label-secondary, inherit)",
										fontFamily: "inherit"
									},
									children: "收起"
								})
							]
						}), snapshot === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								flex: 1,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								gap: 10,
								padding: "48px 20px",
								color: "var(--dsw-alias-label-caption, #888)"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
								width: "40",
								height: "40",
								viewBox: "0 0 24 24",
								fill: "none",
								stroke: "currentColor",
								strokeWidth: "1.4",
								strokeLinecap: "round",
								strokeLinejoin: "round",
								opacity: "0.5",
								"aria-hidden": "true",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
									x: "3",
									y: "3",
									width: "18",
									height: "18",
									rx: "2.5"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 9h18M9 9v12" })]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: 12,
									lineHeight: 1.7,
									textAlign: "center"
								},
								children: [
									"还没有打开的画布",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: { fontSize: 11 },
										children: "让 Agent 用 canvas 工具画一个，或在对话流的画布卡片上点「⇱ 工作台」"
									})
								]
							})]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 5,
								padding: "6px 12px",
								borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.1))",
								flexShrink: 0
							},
							children: [
								MODES.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									title: m.hint,
									onClick: () => setMode(m.key),
									style: {
										fontSize: 11,
										padding: "3px 10px",
										borderRadius: 6,
										fontFamily: "inherit",
										cursor: "pointer",
										border: mode === m.key ? `1px solid ${ACCENT}` : "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
										background: mode === m.key ? "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)" : "none",
										color: mode === m.key ? ACCENT : "var(--dsw-alias-label-secondary, inherit)"
									},
									children: m.label
								}, m.key)),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										marginLeft: 4,
										fontSize: 10,
										color: "var(--dsw-alias-label-caption, #999)"
									},
									children: modeHint
								}),
								targets.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										marginLeft: "auto",
										fontSize: 10,
										color: ACCENT,
										fontWeight: 600
									},
									children: [
										"已选 ",
										targets.length,
										" 个目标 → 在评论面板写评注"
									]
								}) : null
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								flex: 1,
								minHeight: 0,
								overflow: "auto",
								padding: 14,
								position: "relative"
							},
							ref: canvasAreaRef,
							children: [
								catalogOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										position: "absolute",
										right: 12,
										top: 0,
										zIndex: 65,
										width: 270,
										maxHeight: "min(420px, calc(100% - 24px))",
										overflow: "auto",
										borderRadius: 12,
										background: "var(--dsw-alias-bg-layer-1, #fff)",
										border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2))",
										boxShadow: "0 12px 36px rgba(0,0,0,.26)"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											alignItems: "center",
											gap: 6,
											padding: "8px 12px",
											borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.1))",
											background: "var(--dsw-alias-bg-layer-2, rgba(127,127,127,.05))"
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: {
												fontSize: 11,
												fontWeight: 600,
												flex: 1
											},
											children: [
												"工作区画布（",
												catalogItems.length,
												"）"
											]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setCatalogOpen(false),
											style: {
												border: 0,
												background: "none",
												padding: 0,
												cursor: "pointer",
												fontSize: 13,
												lineHeight: 1,
												color: "var(--dsw-alias-label-caption, #888)",
												fontFamily: "inherit"
											},
											children: "×"
										})]
									}), catalogItems.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											padding: "20px 14px",
											fontSize: 11,
											color: "var(--dsw-alias-label-caption, #888)",
											textAlign: "center"
										},
										children: [
											"还没有画布产物",
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: { fontSize: 10 },
												children: "让 Agent 用 canvas 工具生成第一个（历史画布首次续编后入册）"
											})
										]
									}) : catalogItems.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => {
											openCanvas(item.canvasId);
										},
										style: {
											display: "block",
											width: "100%",
											textAlign: "left",
											padding: "8px 12px",
											border: 0,
											borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.06))",
											cursor: "pointer",
											background: snapshot?.canvasId === item.canvasId ? "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 8%, transparent)" : "none",
											fontFamily: "inherit"
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												alignItems: "center",
												gap: 6
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													fontSize: 11.5,
													fontWeight: 600,
													flex: 1,
													minWidth: 0,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
													color: "inherit"
												},
												children: item.title
											}), item.revisions.length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: {
													fontSize: 9.5,
													color: ACCENT,
													fontWeight: 600
												},
												children: [
													"r",
													item.revision,
													" · ",
													item.revisions.length,
													"版"
												]
											}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: {
													fontSize: 9.5,
													color: "var(--dsw-alias-label-caption, #999)"
												},
												children: ["r", item.revision]
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												fontSize: 9.5,
												color: "var(--dsw-alias-label-caption, #999)",
												marginTop: 2,
												fontFamily: "ui-monospace, Menlo, monospace"
											},
											children: [item.canvasId, item.updatedAt.length > 0 ? ` · ${new Date(item.updatedAt).toLocaleString("zh-CN", {
												month: "numeric",
												day: "numeric",
												hour: "2-digit",
												minute: "2-digit"
											})}` : ""]
										})]
									}, item.canvasId))]
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasSurface, { snapshot }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanvasPinLayer, {
									snapshot,
									containerRef: canvasAreaRef,
									mode,
									targets,
									callbacks: {
										onTargetsChange: (t) => {
											setTargets([...t]);
											setNote("");
										},
										onSave: () => saveAnnotation(),
										annotations,
										onEditAnnotation: (a) => setEditAnn(a),
										onDeleteAnnotation: (a) => {
											removeAnnotation(snapshot.canvasId, a.id);
											setAnnotations(listAnnotations(snapshot.canvasId));
										},
										onFocusNode: (id) => setFocusNodeId(id)
									}
								}),
								panelOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									"data-annotation-float": true,
									style: {
										position: "absolute",
										zIndex: 45,
										width: 280,
										maxHeight: "min(520px, calc(100% - 24px))",
										display: "flex",
										flexDirection: "column",
										borderRadius: 12,
										overflow: "hidden",
										background: "var(--dsw-alias-bg-layer-1, #fff)",
										border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2))",
										boxShadow: "0 12px 36px rgba(0,0,0,.26)",
										...panelPos !== null ? {
											left: panelPos.x,
											top: panelPos.y
										} : {
											right: 12,
											top: 12
										}
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										onPointerDown: onPanelDragStart,
										style: {
											display: "flex",
											alignItems: "center",
											gap: 6,
											padding: "7px 10px",
											cursor: "grab",
											userSelect: "none",
											borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.1))",
											background: "var(--dsw-alias-bg-layer-2, rgba(127,127,127,.05))"
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
												width: "10",
												height: "10",
												viewBox: "0 0 24 24",
												fill: "currentColor",
												opacity: "0.4",
												"aria-hidden": "true",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
														cx: "8",
														cy: "5",
														r: "1.6"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
														cx: "16",
														cy: "5",
														r: "1.6"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
														cx: "8",
														cy: "12",
														r: "1.6"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
														cx: "16",
														cy: "12",
														r: "1.6"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
														cx: "8",
														cy: "19",
														r: "1.6"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
														cx: "16",
														cy: "19",
														r: "1.6"
													})
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													fontSize: 11,
													fontWeight: 600,
													flex: 1
												},
												children: "评论"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setPanelOpen(false),
												title: "关闭面板",
												style: {
													border: 0,
													background: "none",
													padding: 0,
													cursor: "pointer",
													fontSize: 13,
													lineHeight: 1,
													color: "var(--dsw-alias-label-caption, #888)",
													fontFamily: "inherit"
												},
												children: "×"
											})
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											flex: 1,
											minHeight: 0,
											overflow: "auto"
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommentPanel, {
											targets,
											note,
											setNote,
											onRemoveTarget: (i) => setTargets((prev) => prev.filter((_, j) => j !== i)),
											onSave: saveAnnotation,
											onCancel: () => {
												setTargets([]);
												setNote("");
											},
											annotations,
											onEdit: (a) => setEditAnn(a),
											onDelete: (a) => {
												removeAnnotation(snapshot.canvasId, a.id);
												setAnnotations(listAnnotations(snapshot.canvasId));
											},
											focusNodeId
										})
									})]
								}) : null
							]
						})] })]
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnnotationCapsuleBar, {}),
				editAnn !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						position: "fixed",
						top: 60,
						left: "50%",
						transform: "translateX(-50%)",
						zIndex: 2147483100,
						width: 300,
						display: "flex",
						flexDirection: "column",
						gap: 7,
						padding: "10px 12px",
						borderRadius: 10,
						background: "var(--dsw-alias-bg-layer-1, #fff)",
						border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
						boxShadow: "0 8px 28px rgba(0,0,0,.22)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 10.5,
								fontWeight: 600,
								color: ACCENT
							},
							children: "编辑评论"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							value: editAnn.note,
							onChange: (e) => setEditAnn({
								...editAnn,
								note: e.target.value
							}),
							rows: 3,
							autoFocus: true,
							style: {
								fontSize: 11.5,
								padding: "6px 8px",
								borderRadius: 7,
								border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
								background: "var(--dsw-alias-bg-layer-2, #f6f6f7)",
								color: "inherit",
								resize: "vertical",
								fontFamily: "inherit"
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 6,
								justifyContent: "flex-end"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setEditAnn(null),
								style: {
									fontSize: 10.5,
									padding: "3px 10px",
									borderRadius: 6,
									border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
									background: "none",
									cursor: "pointer",
									fontFamily: "inherit",
									color: "inherit"
								},
								children: "取消"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									if (snapshot !== null) {
										updateAnnotationNote(snapshot.canvasId, editAnn.id, editAnn.note.trim());
										setAnnotations(listAnnotations(snapshot.canvasId));
									}
									setEditAnn(null);
								},
								disabled: editAnn.note.trim().length === 0,
								style: {
									fontSize: 10.5,
									padding: "3px 12px",
									borderRadius: 6,
									border: 0,
									cursor: "pointer",
									fontFamily: "inherit",
									color: "#fff",
									background: ACCENT
								},
								children: "保存"
							})]
						})
					]
				}) : null,
				toast !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						position: "fixed",
						bottom: 26,
						left: "50%",
						transform: "translateX(-50%)",
						zIndex: 2147483100,
						fontSize: 11,
						padding: "7px 14px",
						borderRadius: 9,
						color: "var(--dsw-alias-label-primary, inherit)",
						background: "var(--dsw-alias-bg-layer-1, #fff)",
						border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
						boxShadow: "0 8px 28px rgba(0,0,0,.25)"
					},
					children: toast
				}) : null
			] });
		}
		//#endregion
		//#region src/client/index.tsx
		const name = "openloop-qoder-canvas";
		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "canvas"
			}, CanvasCard));
			ctx.effect(() => {
				const host = document.createElement("div");
				host.setAttribute("data-openloop-canvas-root", "");
				document.body.appendChild(host);
				let root;
				try {
					root = (0, react_dom_client.createRoot)(host);
					root.render((0, react.createElement)(CanvasWorkbench));
				} catch {}
				return () => {
					root?.unmount();
					host.remove();
				};
			}, "openloop-canvas: workbench mount");
		}
		//#endregion
		exports.CanvasCard = CanvasCard;
		exports.apply = apply;
		exports.canvasMetaFrom = canvasMetaFrom;
		exports.inject = inject;
		exports.injectComposerDraft = injectComposerDraft;
		exports.name = name;
		return module.exports;
	}
});
