window.__ModuleLoader__.load({
	id: "@openloop/dsh-dock",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
		//#endregion
		let react = require("react");
		let react_dom_client = require("react-dom/client");
		let react_dom = require("react-dom");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _openloop_dsh_panels_client = require("@openloop/dsh-panels/client");
		let _openloop_dsh_html_artifact_client = require("@openloop/dsh-html-artifact/client");
		let _openloop_dsh_base_client = require("@openloop/dsh-base/client");
		//#region src/client/DockHost.tsx
		/**
		* DockHost：右侧 dock 的挂载层（方案 A，DOCK_DESIGN §1）。
		*
		* 冲突规避三件套：
		* 1. host div 挂 body（data-openloop-dock），MutationObserver 保活——与 better-sidebar 各挂各的；
		* 2. 挤压用 #root 的 padding-right（better-sidebar 用 margin-right，天然叠加不覆盖）；
		* 3. 空间探测（非 API 对接）：[data-dsh-better-sidebar] 存在 → dock 贴其左侧；
		*    不存在 → 贴视口右缘。ResizeObserver + MutationObserver 跟踪其开/关/宽度变化。
		*/
		const DOCK_WIDTH_VAR = "--openloop-dock-width";
		const BSB_HOST = "[data-dsh-better-sidebar]";
		/** 读取 better-sidebar 的右缘（存在且可见时返回其左边界 x；否则返回视口宽） */
		function probeRightEdge() {
			if (typeof window === "undefined") return 0;
			const host = document.querySelector(BSB_HOST);
			if (!host) return window.innerWidth;
			const rect = host.getBoundingClientRect();
			if (rect.width <= 0 || rect.right <= 0) return window.innerWidth;
			return rect.left;
		}
		function DockHost({ open, width, children }) {
			const [host, setHost] = (0, react.useState)(null);
			const [rightEdge, setRightEdge] = (0, react.useState)(() => probeRightEdge());
			(0, react.useEffect)(() => {
				const el = document.createElement("div");
				el.setAttribute("data-openloop-dock", "");
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
				const update = () => setRightEdge(probeRightEdge());
				update();
				const bsb = document.querySelector(BSB_HOST);
				const observers = [];
				if (bswObserve(bsb)) {
					const ro = new ResizeObserver(update);
					ro.observe(bsb);
					observers.push(ro);
				}
				const mo = new MutationObserver(update);
				mo.observe(document.body, {
					childList: true,
					subtree: false
				});
				observers.push(mo);
				window.addEventListener("resize", update);
				return () => {
					for (const o of observers) o.disconnect();
					window.removeEventListener("resize", update);
				};
			}, []);
			(0, react.useEffect)(() => {
				const root = document.getElementById("root");
				if (!root) return;
				const apply = () => {
					root.style.setProperty(DOCK_WIDTH_VAR, open ? `${width}px` : "0px");
				};
				apply();
				return () => {
					root.style.removeProperty(DOCK_WIDTH_VAR);
				};
			}, [open, width]);
			if (!host || !open) return null;
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					position: "fixed",
					top: 0,
					bottom: 0,
					left: void 0,
					right: void 0,
					width,
					zIndex: 2147483e3,
					display: "flex",
					flexDirection: "column",
					background: "var(--dsw-alias-bg-layer-1, #fff)",
					borderLeft: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.08))",
					boxSizing: "border-box",
					left: rightEdge - width
				},
				"data-openloop-dock-panel": "",
				children
			}), host);
		}
		function bswObserve(target) {
			return target instanceof Element && target.isConnected;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/@dnd-kit+utilities@3.2.2_react@18.3.1/node_modules/@dnd-kit/utilities/dist/utilities.cjs.production.min.js
		var require_utilities_cjs_production_min = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: !0 });
			var e = require("react");
			const t = "undefined" != typeof window && void 0 !== window.document && void 0 !== window.document.createElement;
			function n(e) {
				const t = Object.prototype.toString.call(e);
				return "[object Window]" === t || "[object global]" === t;
			}
			function r(e) {
				return "nodeType" in e;
			}
			function o(e) {
				var t, o;
				return e ? n(e) ? e : r(e) && null != (t = null == (o = e.ownerDocument) ? void 0 : o.defaultView) ? t : window : window;
			}
			function u(e) {
				const { Document: t } = o(e);
				return e instanceof t;
			}
			function c(e) {
				return !n(e) && e instanceof o(e).HTMLElement;
			}
			function s(e) {
				return e instanceof o(e).SVGElement;
			}
			const i = t ? e.useLayoutEffect : e.useEffect;
			function a(t) {
				const n = e.useRef(t);
				return i(() => {
					n.current = t;
				}), e.useCallback((function() {
					for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) t[r] = arguments[r];
					return null == n.current ? void 0 : n.current(...t);
				}), []);
			}
			let l = {};
			function f(e) {
				return function(t) {
					for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), o = 1; o < n; o++) r[o - 1] = arguments[o];
					return r.reduce((t, n) => {
						const r = Object.entries(n);
						for (const [n, o] of r) {
							const r = t[n];
							null != r && (t[n] = r + e * o);
						}
						return t;
					}, { ...t });
				};
			}
			const d = f(1);
			const p = f(-1);
			function x(e) {
				return "clientX" in e && "clientY" in e;
			}
			function m(e) {
				if (!e) return !1;
				const { TouchEvent: t } = o(e.target);
				return t && e instanceof t;
			}
			const h = Object.freeze({
				Translate: { toString(e) {
					if (!e) return;
					const { x: t, y: n } = e;
					return "translate3d(" + (t ? Math.round(t) : 0) + "px, " + (n ? Math.round(n) : 0) + "px, 0)";
				} },
				Scale: { toString(e) {
					if (!e) return;
					const { scaleX: t, scaleY: n } = e;
					return "scaleX(" + t + ") scaleY(" + n + ")";
				} },
				Transform: { toString(e) {
					if (e) return [h.Translate.toString(e), h.Scale.toString(e)].join(" ");
				} },
				Transition: { toString(e) {
					let { property: t, duration: n, easing: r } = e;
					return t + " " + n + "ms " + r;
				} }
			});
			const b = "a,frame,iframe,input:not([type=hidden]):not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled),*[tabindex]";
			exports.CSS = h, exports.add = d, exports.canUseDOM = t, exports.findFirstFocusableNode = function(e) {
				return e.matches(b) ? e : e.querySelector(b);
			}, exports.getEventCoordinates = function(e) {
				if (m(e)) {
					if (e.touches && e.touches.length) {
						const { clientX: t, clientY: n } = e.touches[0];
						return {
							x: t,
							y: n
						};
					}
					if (e.changedTouches && e.changedTouches.length) {
						const { clientX: t, clientY: n } = e.changedTouches[0];
						return {
							x: t,
							y: n
						};
					}
				}
				return x(e) ? {
					x: e.clientX,
					y: e.clientY
				} : null;
			}, exports.getOwnerDocument = function(e) {
				return e ? n(e) ? e.document : r(e) ? u(e) ? e : c(e) || s(e) ? e.ownerDocument : document : document : document;
			}, exports.getWindow = o, exports.hasViewportRelativeCoordinates = x, exports.isDocument = u, exports.isHTMLElement = c, exports.isKeyboardEvent = function(e) {
				if (!e) return !1;
				const { KeyboardEvent: t } = o(e.target);
				return t && e instanceof t;
			}, exports.isNode = r, exports.isSVGElement = s, exports.isTouchEvent = m, exports.isWindow = n, exports.subtract = p, exports.useCombinedRefs = function() {
				for (var t = arguments.length, n = new Array(t), r = 0; r < t; r++) n[r] = arguments[r];
				return e.useMemo(() => (e) => {
					n.forEach((t) => t(e));
				}, n);
			}, exports.useEvent = a, exports.useInterval = function() {
				const t = e.useRef(null);
				return [e.useCallback((e, n) => {
					t.current = setInterval(e, n);
				}, []), e.useCallback(() => {
					null !== t.current && (clearInterval(t.current), t.current = null);
				}, [])];
			}, exports.useIsomorphicLayoutEffect = i, exports.useLatestValue = function(t, n) {
				void 0 === n && (n = [t]);
				const r = e.useRef(t);
				return i(() => {
					r.current !== t && (r.current = t);
				}, n), r;
			}, exports.useLazyMemo = function(t, n) {
				const r = e.useRef();
				return e.useMemo(() => {
					const e = t(r.current);
					return r.current = e, e;
				}, [...n]);
			}, exports.useNodeRef = function(t) {
				const n = a(t), r = e.useRef(null);
				return [r, e.useCallback((e) => {
					e !== r.current && n?.(e, r.current), r.current = e;
				}, [])];
			}, exports.usePrevious = function(t) {
				const n = e.useRef();
				return e.useEffect(() => {
					n.current = t;
				}, [t]), n.current;
			}, exports.useUniqueId = function(t, n) {
				return e.useMemo(() => {
					if (n) return n;
					const e = null == l[t] ? 0 : l[t] + 1;
					return l[t] = e, t + "-" + e;
				}, [t, n]);
			};
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/@dnd-kit+utilities@3.2.2_react@18.3.1/node_modules/@dnd-kit/utilities/dist/index.js
		var require_dist$2 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_utilities_cjs_production_min();
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/@dnd-kit+accessibility@3.1.1_react@18.3.1/node_modules/@dnd-kit/accessibility/dist/accessibility.cjs.production.min.js
		var require_accessibility_cjs_production_min = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: !0 });
			var e;
			var t$1 = require("react");
			var n = (e = t$1) && "object" == typeof e && "default" in e ? e.default : e;
			const i = { display: "none" };
			exports.HiddenText = function(e) {
				let { id: t, value: r } = e;
				return n.createElement("div", {
					id: t,
					style: i
				}, r);
			}, exports.LiveRegion = function(e) {
				let { id: t, announcement: i, ariaLiveType: r = "assertive" } = e;
				return n.createElement("div", {
					id: t,
					style: {
						position: "fixed",
						top: 0,
						left: 0,
						width: 1,
						height: 1,
						margin: -1,
						border: 0,
						padding: 0,
						overflow: "hidden",
						clip: "rect(0 0 0 0)",
						clipPath: "inset(100%)",
						whiteSpace: "nowrap"
					},
					role: "status",
					"aria-live": r,
					"aria-atomic": !0
				}, i);
			}, exports.useAnnouncement = function() {
				const [e, n] = t$1.useState("");
				return {
					announce: t$1.useCallback((e) => {
						null != e && n(e);
					}, []),
					announcement: e
				};
			};
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/@dnd-kit+accessibility@3.1.1_react@18.3.1/node_modules/@dnd-kit/accessibility/dist/index.js
		var require_dist$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_accessibility_cjs_production_min();
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/@dnd-kit+core@6.3.1_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/@dnd-kit/core/dist/core.cjs.production.min.js
		var require_core_cjs_production_min = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: !0 });
			var e;
			var t = require("react");
			var n = (e = t) && "object" == typeof e && "default" in e ? e.default : e;
			var r = require("react-dom");
			var o = require_dist$2();
			var i = require_dist$1();
			const a = t.createContext(null);
			function s(e) {
				const n = t.useContext(a);
				t.useEffect(() => {
					if (!n) throw new Error("useDndMonitor must be used within a children of <DndContext>");
					return n(e);
				}, [e, n]);
			}
			const l = { draggable: "\n    To pick up a draggable item, press the space bar.\n    While dragging, use the arrow keys to move the item.\n    Press space again to drop the item in its new position, or press escape to cancel.\n  " };
			const c = {
				onDragStart(e) {
					let { active: t } = e;
					return "Picked up draggable item " + t.id + ".";
				},
				onDragOver(e) {
					let { active: t, over: n } = e;
					return n ? "Draggable item " + t.id + " was moved over droppable area " + n.id + "." : "Draggable item " + t.id + " is no longer over a droppable area.";
				},
				onDragEnd(e) {
					let { active: t, over: n } = e;
					return n ? "Draggable item " + t.id + " was dropped over droppable area " + n.id : "Draggable item " + t.id + " was dropped.";
				},
				onDragCancel(e) {
					let { active: t } = e;
					return "Dragging was cancelled. Draggable item " + t.id + " was dropped.";
				}
			};
			function d(e) {
				let { announcements: a = c, container: d, hiddenTextDescribedById: u, screenReaderInstructions: f = l } = e;
				const { announce: v, announcement: g } = i.useAnnouncement(), p = o.useUniqueId("DndLiveRegion"), [h, b] = t.useState(!1);
				if (t.useEffect(() => {
					b(!0);
				}, []), s(t.useMemo(() => ({
					onDragStart(e) {
						let { active: t } = e;
						v(a.onDragStart({ active: t }));
					},
					onDragMove(e) {
						let { active: t, over: n } = e;
						a.onDragMove && v(a.onDragMove({
							active: t,
							over: n
						}));
					},
					onDragOver(e) {
						let { active: t, over: n } = e;
						v(a.onDragOver({
							active: t,
							over: n
						}));
					},
					onDragEnd(e) {
						let { active: t, over: n } = e;
						v(a.onDragEnd({
							active: t,
							over: n
						}));
					},
					onDragCancel(e) {
						let { active: t, over: n } = e;
						v(a.onDragCancel({
							active: t,
							over: n
						}));
					}
				}), [v, a])), !h) return null;
				const m = n.createElement(n.Fragment, null, n.createElement(i.HiddenText, {
					id: u,
					value: f.draggable
				}), n.createElement(i.LiveRegion, {
					id: p,
					announcement: g
				}));
				return d ? r.createPortal(m, d) : m;
			}
			var u;
			function f() {}
			(function(e) {
				e.DragStart = "dragStart", e.DragMove = "dragMove", e.DragEnd = "dragEnd", e.DragCancel = "dragCancel", e.DragOver = "dragOver", e.RegisterDroppable = "registerDroppable", e.SetDroppableDisabled = "setDroppableDisabled", e.UnregisterDroppable = "unregisterDroppable";
			})(u || (u = {}));
			const v = Object.freeze({
				x: 0,
				y: 0
			});
			function g(e, t) {
				return Math.sqrt(Math.pow(e.x - t.x, 2) + Math.pow(e.y - t.y, 2));
			}
			function p(e, t) {
				const n = o.getEventCoordinates(e);
				return n ? (n.x - t.left) / t.width * 100 + "% " + (n.y - t.top) / t.height * 100 + "%" : "0 0";
			}
			function h(e, t) {
				let { data: { value: n } } = e, { data: { value: r } } = t;
				return n - r;
			}
			function b(e, t) {
				let { data: { value: n } } = e, { data: { value: r } } = t;
				return r - n;
			}
			function m(e) {
				let { left: t, top: n, height: r, width: o } = e;
				return [
					{
						x: t,
						y: n
					},
					{
						x: t + o,
						y: n
					},
					{
						x: t,
						y: n + r
					},
					{
						x: t + o,
						y: n + r
					}
				];
			}
			function y(e, t) {
				if (!e || 0 === e.length) return null;
				const [n] = e;
				return t ? n[t] : n;
			}
			function x(e, t, n) {
				return void 0 === t && (t = e.left), void 0 === n && (n = e.top), {
					x: t + .5 * e.width,
					y: n + .5 * e.height
				};
			}
			function w(e, t) {
				const n = Math.max(t.top, e.top), r = Math.max(t.left, e.left), o = Math.min(t.left + t.width, e.left + e.width), i = Math.min(t.top + t.height, e.top + e.height);
				if (r < o && n < i) {
					const a = (o - r) * (i - n);
					return Number((a / (t.width * t.height + e.width * e.height - a)).toFixed(4));
				}
				return 0;
			}
			const C = (e) => {
				let { collisionRect: t, droppableRects: n, droppableContainers: r } = e;
				const o = [];
				for (const e of r) {
					const { id: r } = e, i = n.get(r);
					if (i) {
						const n = w(i, t);
						n > 0 && o.push({
							id: r,
							data: {
								droppableContainer: e,
								value: n
							}
						});
					}
				}
				return o.sort(b);
			};
			function E(e, t) {
				const { top: n, left: r, bottom: o, right: i } = t;
				return n <= e.y && e.y <= o && r <= e.x && e.x <= i;
			}
			function D(e, t) {
				return e && t ? {
					x: e.left - t.left,
					y: e.top - t.top
				} : v;
			}
			function R(e) {
				return function(t) {
					for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), o = 1; o < n; o++) r[o - 1] = arguments[o];
					return r.reduce((t, n) => ({
						...t,
						top: t.top + e * n.y,
						bottom: t.bottom + e * n.y,
						left: t.left + e * n.x,
						right: t.right + e * n.x
					}), { ...t });
				};
			}
			const S = R(1);
			function M(e) {
				if (e.startsWith("matrix3d(")) {
					const t = e.slice(9, -1).split(/, /);
					return {
						x: +t[12],
						y: +t[13],
						scaleX: +t[0],
						scaleY: +t[5]
					};
				}
				if (e.startsWith("matrix(")) {
					const t = e.slice(7, -1).split(/, /);
					return {
						x: +t[4],
						y: +t[5],
						scaleX: +t[0],
						scaleY: +t[3]
					};
				}
				return null;
			}
			const N = { ignoreTransform: !1 };
			function O(e, t) {
				void 0 === t && (t = N);
				let n = e.getBoundingClientRect();
				if (t.ignoreTransform) {
					const { transform: t, transformOrigin: r } = o.getWindow(e).getComputedStyle(e);
					t && (n = function(e, t, n) {
						const r = M(t);
						if (!r) return e;
						const { scaleX: o, scaleY: i, x: a, y: s } = r, l = e.left - a - (1 - o) * parseFloat(n), c = e.top - s - (1 - i) * parseFloat(n.slice(n.indexOf(" ") + 1)), d = o ? e.width / o : e.width, u = i ? e.height / i : e.height;
						return {
							width: d,
							height: u,
							top: c,
							right: l + d,
							bottom: c + u,
							left: l
						};
					}(n, t, r));
				}
				const { top: r, left: i, width: a, height: s, bottom: l, right: c } = n;
				return {
					top: r,
					left: i,
					width: a,
					height: s,
					bottom: l,
					right: c
				};
			}
			function A(e) {
				return O(e, { ignoreTransform: !0 });
			}
			function L(e, t) {
				const n = [];
				return e ? function r(i) {
					if (null != t && n.length >= t) return n;
					if (!i) return n;
					if (o.isDocument(i) && null != i.scrollingElement && !n.includes(i.scrollingElement)) return n.push(i.scrollingElement), n;
					if (!o.isHTMLElement(i) || o.isSVGElement(i)) return n;
					if (n.includes(i)) return n;
					const a = o.getWindow(e).getComputedStyle(i);
					return i !== e && function(e, t) {
						void 0 === t && (t = o.getWindow(e).getComputedStyle(e));
						const n = /(auto|scroll|overlay)/;
						return [
							"overflow",
							"overflowX",
							"overflowY"
						].some((e) => {
							const r = t[e];
							return "string" == typeof r && n.test(r);
						});
					}(i, a) && n.push(i), function(e, t) {
						return void 0 === t && (t = o.getWindow(e).getComputedStyle(e)), "fixed" === t.position;
					}(i, a) ? n : r(i.parentNode);
				}(e) : n;
			}
			function k(e) {
				const [t] = L(e, 1);
				return null != t ? t : null;
			}
			function T(e) {
				return o.canUseDOM && e ? o.isWindow(e) ? e : o.isNode(e) ? o.isDocument(e) || e === o.getOwnerDocument(e).scrollingElement ? window : o.isHTMLElement(e) ? e : null : null : null;
			}
			function K(e) {
				return o.isWindow(e) ? e.scrollX : e.scrollLeft;
			}
			function P(e) {
				return o.isWindow(e) ? e.scrollY : e.scrollTop;
			}
			function I(e) {
				return {
					x: K(e),
					y: P(e)
				};
			}
			var B;
			function z(e) {
				return !(!o.canUseDOM || !e) && e === document.scrollingElement;
			}
			function F(e) {
				const t = {
					x: 0,
					y: 0
				}, n = z(e) ? {
					height: window.innerHeight,
					width: window.innerWidth
				} : {
					height: e.clientHeight,
					width: e.clientWidth
				}, r = {
					x: e.scrollWidth - n.width,
					y: e.scrollHeight - n.height
				};
				return {
					isTop: e.scrollTop <= t.y,
					isLeft: e.scrollLeft <= t.x,
					isBottom: e.scrollTop >= r.y,
					isRight: e.scrollLeft >= r.x,
					maxScroll: r,
					minScroll: t
				};
			}
			(function(e) {
				e[e.Forward = 1] = "Forward", e[e.Backward = -1] = "Backward";
			})(B || (B = {}));
			const W = {
				x: .2,
				y: .2
			};
			function U(e, t, n, r, o) {
				let { top: i, left: a, right: s, bottom: l } = n;
				void 0 === r && (r = 10), void 0 === o && (o = W);
				const { isTop: c, isBottom: d, isLeft: u, isRight: f } = F(e), v = {
					x: 0,
					y: 0
				}, g = {
					x: 0,
					y: 0
				}, p = t.height * o.y, h = t.width * o.x;
				return !c && i <= t.top + p ? (v.y = B.Backward, g.y = r * Math.abs((t.top + p - i) / p)) : !d && l >= t.bottom - p && (v.y = B.Forward, g.y = r * Math.abs((t.bottom - p - l) / p)), !f && s >= t.right - h ? (v.x = B.Forward, g.x = r * Math.abs((t.right - h - s) / h)) : !u && a <= t.left + h && (v.x = B.Backward, g.x = r * Math.abs((t.left + h - a) / h)), {
					direction: v,
					speed: g
				};
			}
			function j(e) {
				if (e === document.scrollingElement) {
					const { innerWidth: e, innerHeight: t } = window;
					return {
						top: 0,
						left: 0,
						right: e,
						bottom: t,
						width: e,
						height: t
					};
				}
				const { top: t, left: n, right: r, bottom: o } = e.getBoundingClientRect();
				return {
					top: t,
					left: n,
					right: r,
					bottom: o,
					width: e.clientWidth,
					height: e.clientHeight
				};
			}
			function q(e) {
				return e.reduce((e, t) => o.add(e, I(t)), v);
			}
			function H(e, t) {
				if (void 0 === t && (t = O), !e) return;
				const { top: n, left: r, bottom: o, right: i } = t(e);
				k(e) && (o <= 0 || i <= 0 || n >= window.innerHeight || r >= window.innerWidth) && e.scrollIntoView({
					block: "center",
					inline: "center"
				});
			}
			const X = [[
				"x",
				["left", "right"],
				function(e) {
					return e.reduce((e, t) => e + K(t), 0);
				}
			], [
				"y",
				["top", "bottom"],
				function(e) {
					return e.reduce((e, t) => e + P(t), 0);
				}
			]];
			var Y = class {
				constructor(e, t) {
					this.rect = void 0, this.width = void 0, this.height = void 0, this.top = void 0, this.bottom = void 0, this.right = void 0, this.left = void 0;
					const n = L(t), r = q(n);
					this.rect = { ...e }, this.width = e.width, this.height = e.height;
					for (const [e, t, o] of X) for (const i of t) Object.defineProperty(this, i, {
						get: () => {
							const t = o(n);
							return this.rect[i] + (r[e] - t);
						},
						enumerable: !0
					});
					Object.defineProperty(this, "rect", { enumerable: !1 });
				}
			};
			var V = class {
				constructor(e) {
					this.target = void 0, this.listeners = [], this.removeAll = () => {
						this.listeners.forEach((e) => {
							var t;
							return null == (t = this.target) ? void 0 : t.removeEventListener(...e);
						});
					}, this.target = e;
				}
				add(e, t, n) {
					var r;
					null == (r = this.target) || r.addEventListener(e, t, n), this.listeners.push([
						e,
						t,
						n
					]);
				}
			};
			function J(e, t) {
				const n = Math.abs(e.x), r = Math.abs(e.y);
				return "number" == typeof t ? Math.sqrt(n ** 2 + r ** 2) > t : "x" in t && "y" in t ? n > t.x && r > t.y : "x" in t ? n > t.x : "y" in t && r > t.y;
			}
			var _;
			var G;
			function Q(e) {
				e.preventDefault();
			}
			function Z(e) {
				e.stopPropagation();
			}
			(function(e) {
				e.Click = "click", e.DragStart = "dragstart", e.Keydown = "keydown", e.ContextMenu = "contextmenu", e.Resize = "resize", e.SelectionChange = "selectionchange", e.VisibilityChange = "visibilitychange";
			})(_ || (_ = {})), (G = exports.KeyboardCode || (exports.KeyboardCode = {})).Space = "Space", G.Down = "ArrowDown", G.Right = "ArrowRight", G.Left = "ArrowLeft", G.Up = "ArrowUp", G.Esc = "Escape", G.Enter = "Enter", G.Tab = "Tab";
			const $ = {
				start: [exports.KeyboardCode.Space, exports.KeyboardCode.Enter],
				cancel: [exports.KeyboardCode.Esc],
				end: [
					exports.KeyboardCode.Space,
					exports.KeyboardCode.Enter,
					exports.KeyboardCode.Tab
				]
			};
			const ee = (e, t) => {
				let { currentCoordinates: n } = t;
				switch (e.code) {
					case exports.KeyboardCode.Right: return {
						...n,
						x: n.x + 25
					};
					case exports.KeyboardCode.Left: return {
						...n,
						x: n.x - 25
					};
					case exports.KeyboardCode.Down: return {
						...n,
						y: n.y + 25
					};
					case exports.KeyboardCode.Up: return {
						...n,
						y: n.y - 25
					};
				}
			};
			var te = class {
				constructor(e) {
					this.props = void 0, this.autoScrollEnabled = !1, this.referenceCoordinates = void 0, this.listeners = void 0, this.windowListeners = void 0, this.props = e;
					const { event: { target: t } } = e;
					this.props = e, this.listeners = new V(o.getOwnerDocument(t)), this.windowListeners = new V(o.getWindow(t)), this.handleKeyDown = this.handleKeyDown.bind(this), this.handleCancel = this.handleCancel.bind(this), this.attach();
				}
				attach() {
					this.handleStart(), this.windowListeners.add(_.Resize, this.handleCancel), this.windowListeners.add(_.VisibilityChange, this.handleCancel), setTimeout(() => this.listeners.add(_.Keydown, this.handleKeyDown));
				}
				handleStart() {
					const { activeNode: e, onStart: t } = this.props, n = e.node.current;
					n && H(n), t(v);
				}
				handleKeyDown(e) {
					if (o.isKeyboardEvent(e)) {
						const { active: t, context: n, options: r } = this.props, { keyboardCodes: i = $, coordinateGetter: a = ee, scrollBehavior: s = "smooth" } = r, { code: l } = e;
						if (i.end.includes(l)) return void this.handleEnd(e);
						if (i.cancel.includes(l)) return void this.handleCancel(e);
						const { collisionRect: c } = n.current, d = c ? {
							x: c.left,
							y: c.top
						} : v;
						this.referenceCoordinates || (this.referenceCoordinates = d);
						const u = a(e, {
							active: t,
							context: n.current,
							currentCoordinates: d
						});
						if (u) {
							const t = o.subtract(u, d), r = {
								x: 0,
								y: 0
							}, { scrollableAncestors: i } = n.current;
							for (const n of i) {
								const o = e.code, { isTop: i, isRight: a, isLeft: l, isBottom: c, maxScroll: d, minScroll: f } = F(n), v = j(n), g = {
									x: Math.min(o === exports.KeyboardCode.Right ? v.right - v.width / 2 : v.right, Math.max(o === exports.KeyboardCode.Right ? v.left : v.left + v.width / 2, u.x)),
									y: Math.min(o === exports.KeyboardCode.Down ? v.bottom - v.height / 2 : v.bottom, Math.max(o === exports.KeyboardCode.Down ? v.top : v.top + v.height / 2, u.y))
								}, p = o === exports.KeyboardCode.Right && !a || o === exports.KeyboardCode.Left && !l, h = o === exports.KeyboardCode.Down && !c || o === exports.KeyboardCode.Up && !i;
								if (p && g.x !== u.x) {
									const e = n.scrollLeft + t.x, i = o === exports.KeyboardCode.Right && e <= d.x || o === exports.KeyboardCode.Left && e >= f.x;
									if (i && !t.y) return void n.scrollTo({
										left: e,
										behavior: s
									});
									r.x = i ? n.scrollLeft - e : o === exports.KeyboardCode.Right ? n.scrollLeft - d.x : n.scrollLeft - f.x, r.x && n.scrollBy({
										left: -r.x,
										behavior: s
									});
									break;
								}
								if (h && g.y !== u.y) {
									const e = n.scrollTop + t.y, i = o === exports.KeyboardCode.Down && e <= d.y || o === exports.KeyboardCode.Up && e >= f.y;
									if (i && !t.x) return void n.scrollTo({
										top: e,
										behavior: s
									});
									r.y = i ? n.scrollTop - e : o === exports.KeyboardCode.Down ? n.scrollTop - d.y : n.scrollTop - f.y, r.y && n.scrollBy({
										top: -r.y,
										behavior: s
									});
									break;
								}
							}
							this.handleMove(e, o.add(o.subtract(u, this.referenceCoordinates), r));
						}
					}
				}
				handleMove(e, t) {
					const { onMove: n } = this.props;
					e.preventDefault(), n(t);
				}
				handleEnd(e) {
					const { onEnd: t } = this.props;
					e.preventDefault(), this.detach(), t();
				}
				handleCancel(e) {
					const { onCancel: t } = this.props;
					e.preventDefault(), this.detach(), t();
				}
				detach() {
					this.listeners.removeAll(), this.windowListeners.removeAll();
				}
			};
			function ne(e) {
				return Boolean(e && "distance" in e);
			}
			function re(e) {
				return Boolean(e && "delay" in e);
			}
			te.activators = [{
				eventName: "onKeyDown",
				handler: (e, t, n) => {
					let { keyboardCodes: r = $, onActivation: o } = t, { active: i } = n;
					const { code: a } = e.nativeEvent;
					if (r.start.includes(a)) {
						const t = i.activatorNode.current;
						return !(t && e.target !== t || (e.preventDefault(), o?.({ event: e.nativeEvent }), 0));
					}
					return !1;
				}
			}];
			var oe = class {
				constructor(e, t, n) {
					var r;
					void 0 === n && (n = function(e) {
						const { EventTarget: t } = o.getWindow(e);
						return e instanceof t ? e : o.getOwnerDocument(e);
					}(e.event.target)), this.props = void 0, this.events = void 0, this.autoScrollEnabled = !0, this.document = void 0, this.activated = !1, this.initialCoordinates = void 0, this.timeoutId = null, this.listeners = void 0, this.documentListeners = void 0, this.windowListeners = void 0, this.props = e, this.events = t;
					const { event: i } = e, { target: a } = i;
					this.props = e, this.events = t, this.document = o.getOwnerDocument(a), this.documentListeners = new V(this.document), this.listeners = new V(n), this.windowListeners = new V(o.getWindow(a)), this.initialCoordinates = null != (r = o.getEventCoordinates(i)) ? r : v, this.handleStart = this.handleStart.bind(this), this.handleMove = this.handleMove.bind(this), this.handleEnd = this.handleEnd.bind(this), this.handleCancel = this.handleCancel.bind(this), this.handleKeydown = this.handleKeydown.bind(this), this.removeTextSelection = this.removeTextSelection.bind(this), this.attach();
				}
				attach() {
					const { events: e, props: { options: { activationConstraint: t, bypassActivationConstraint: n } } } = this;
					if (this.listeners.add(e.move.name, this.handleMove, { passive: !1 }), this.listeners.add(e.end.name, this.handleEnd), e.cancel && this.listeners.add(e.cancel.name, this.handleCancel), this.windowListeners.add(_.Resize, this.handleCancel), this.windowListeners.add(_.DragStart, Q), this.windowListeners.add(_.VisibilityChange, this.handleCancel), this.windowListeners.add(_.ContextMenu, Q), this.documentListeners.add(_.Keydown, this.handleKeydown), t) {
						if (null != n && n({
							event: this.props.event,
							activeNode: this.props.activeNode,
							options: this.props.options
						})) return this.handleStart();
						if (re(t)) return this.timeoutId = setTimeout(this.handleStart, t.delay), void this.handlePending(t);
						if (ne(t)) return void this.handlePending(t);
					}
					this.handleStart();
				}
				detach() {
					this.listeners.removeAll(), this.windowListeners.removeAll(), setTimeout(this.documentListeners.removeAll, 50), null !== this.timeoutId && (clearTimeout(this.timeoutId), this.timeoutId = null);
				}
				handlePending(e, t) {
					const { active: n, onPending: r } = this.props;
					r(n, e, this.initialCoordinates, t);
				}
				handleStart() {
					const { initialCoordinates: e } = this, { onStart: t } = this.props;
					e && (this.activated = !0, this.documentListeners.add(_.Click, Z, { capture: !0 }), this.removeTextSelection(), this.documentListeners.add(_.SelectionChange, this.removeTextSelection), t(e));
				}
				handleMove(e) {
					var t;
					const { activated: n, initialCoordinates: r, props: i } = this, { onMove: a, options: { activationConstraint: s } } = i;
					if (!r) return;
					const l = null != (t = o.getEventCoordinates(e)) ? t : v, c = o.subtract(r, l);
					if (!n && s) {
						if (ne(s)) {
							if (null != s.tolerance && J(c, s.tolerance)) return this.handleCancel();
							if (J(c, s.distance)) return this.handleStart();
						}
						return re(s) && J(c, s.tolerance) ? this.handleCancel() : void this.handlePending(s, c);
					}
					e.cancelable && e.preventDefault(), a(l);
				}
				handleEnd() {
					const { onAbort: e, onEnd: t } = this.props;
					this.detach(), this.activated || e(this.props.active), t();
				}
				handleCancel() {
					const { onAbort: e, onCancel: t } = this.props;
					this.detach(), this.activated || e(this.props.active), t();
				}
				handleKeydown(e) {
					e.code === exports.KeyboardCode.Esc && this.handleCancel();
				}
				removeTextSelection() {
					var e;
					null == (e = this.document.getSelection()) || e.removeAllRanges();
				}
			};
			const ie = {
				cancel: { name: "pointercancel" },
				move: { name: "pointermove" },
				end: { name: "pointerup" }
			};
			var ae = class extends oe {
				constructor(e) {
					const { event: t } = e, n = o.getOwnerDocument(t.target);
					super(e, ie, n);
				}
			};
			ae.activators = [{
				eventName: "onPointerDown",
				handler: (e, t) => {
					let { nativeEvent: n } = e, { onActivation: r } = t;
					return !(!n.isPrimary || 0 !== n.button || (r?.({ event: n }), 0));
				}
			}];
			const se = {
				move: { name: "mousemove" },
				end: { name: "mouseup" }
			};
			var le;
			(function(e) {
				e[e.RightClick = 2] = "RightClick";
			})(le || (le = {}));
			var ce = class extends oe {
				constructor(e) {
					super(e, se, o.getOwnerDocument(e.event.target));
				}
			};
			ce.activators = [{
				eventName: "onMouseDown",
				handler: (e, t) => {
					let { nativeEvent: n } = e, { onActivation: r } = t;
					return n.button !== le.RightClick && (r?.({ event: n }), !0);
				}
			}];
			const de = {
				cancel: { name: "touchcancel" },
				move: { name: "touchmove" },
				end: { name: "touchend" }
			};
			var ue = class extends oe {
				constructor(e) {
					super(e, de);
				}
				static setup() {
					return window.addEventListener(de.move.name, e, {
						capture: !1,
						passive: !1
					}), function() {
						window.removeEventListener(de.move.name, e);
					};
					function e() {}
				}
			};
			var fe;
			var ve;
			ue.activators = [{
				eventName: "onTouchStart",
				handler: (e, t) => {
					let { nativeEvent: n } = e, { onActivation: r } = t;
					const { touches: o } = n;
					return !(o.length > 1 || (r?.({ event: n }), 0));
				}
			}], (fe = exports.AutoScrollActivator || (exports.AutoScrollActivator = {}))[fe.Pointer = 0] = "Pointer", fe[fe.DraggableRect = 1] = "DraggableRect", (ve = exports.TraversalOrder || (exports.TraversalOrder = {}))[ve.TreeOrder = 0] = "TreeOrder", ve[ve.ReversedTreeOrder = 1] = "ReversedTreeOrder";
			const ge = {
				x: {
					[B.Backward]: !1,
					[B.Forward]: !1
				},
				y: {
					[B.Backward]: !1,
					[B.Forward]: !1
				}
			};
			var pe;
			(pe = exports.MeasuringStrategy || (exports.MeasuringStrategy = {}))[pe.Always = 0] = "Always", pe[pe.BeforeDragging = 1] = "BeforeDragging", pe[pe.WhileDragging = 2] = "WhileDragging", (exports.MeasuringFrequency || (exports.MeasuringFrequency = {})).Optimized = "optimized";
			const he = /* @__PURE__ */ new Map();
			function be(e, t) {
				return o.useLazyMemo((n) => e ? n || ("function" == typeof t ? t(e) : e) : null, [t, e]);
			}
			function me(e) {
				let { callback: n, disabled: r } = e;
				const i = o.useEvent(n), a = t.useMemo(() => {
					if (r || "undefined" == typeof window || void 0 === window.ResizeObserver) return;
					const { ResizeObserver: e } = window;
					return new e(i);
				}, [r]);
				return t.useEffect(() => () => null == a ? void 0 : a.disconnect(), [a]), a;
			}
			function ye(e) {
				return new Y(O(e), e);
			}
			function xe(e, n, r) {
				void 0 === n && (n = ye);
				const [i, a] = t.useState(null);
				function s() {
					a((t) => {
						if (!e) return null;
						var o;
						if (!1 === e.isConnected) return null != (o = null != t ? t : r) ? o : null;
						const i = n(e);
						return JSON.stringify(t) === JSON.stringify(i) ? t : i;
					});
				}
				const l = function(e) {
					let { callback: n, disabled: r } = e;
					const i = o.useEvent(n), a = t.useMemo(() => {
						if (r || "undefined" == typeof window || void 0 === window.MutationObserver) return;
						const { MutationObserver: e } = window;
						return new e(i);
					}, [i, r]);
					return t.useEffect(() => () => null == a ? void 0 : a.disconnect(), [a]), a;
				}({ callback(t) {
					if (e) for (const n of t) {
						const { type: t, target: r } = n;
						if ("childList" === t && r instanceof HTMLElement && r.contains(e)) {
							s();
							break;
						}
					}
				} }), c = me({ callback: s });
				return o.useIsomorphicLayoutEffect(() => {
					s(), e ? (c?.observe(e), l?.observe(document.body, {
						childList: !0,
						subtree: !0
					})) : (c?.disconnect(), l?.disconnect());
				}, [e]), i;
			}
			const we = [];
			function Ce(e, n) {
				void 0 === n && (n = []);
				const r = t.useRef(null);
				return t.useEffect(() => {
					r.current = null;
				}, n), t.useEffect(() => {
					const t = e !== v;
					t && !r.current && (r.current = e), !t && r.current && (r.current = null);
				}, [e]), r.current ? o.subtract(e, r.current) : v;
			}
			function Ee(e) {
				return t.useMemo(() => e ? function(e) {
					const t = e.innerWidth, n = e.innerHeight;
					return {
						top: 0,
						left: 0,
						right: t,
						bottom: n,
						width: t,
						height: n
					};
				}(e) : null, [e]);
			}
			const De = [];
			function Re(e) {
				if (!e) return null;
				if (e.children.length > 1) return e;
				const t = e.children[0];
				return o.isHTMLElement(t) ? t : e;
			}
			const Se = [{
				sensor: ae,
				options: {}
			}, {
				sensor: te,
				options: {}
			}];
			const Me = { current: {} };
			const Ne = {
				draggable: { measure: A },
				droppable: {
					measure: A,
					strategy: exports.MeasuringStrategy.WhileDragging,
					frequency: exports.MeasuringFrequency.Optimized
				},
				dragOverlay: { measure: O }
			};
			var Oe = class extends Map {
				get(e) {
					var t;
					return null != e && null != (t = super.get(e)) ? t : void 0;
				}
				toArray() {
					return Array.from(this.values());
				}
				getEnabled() {
					return this.toArray().filter((e) => {
						let { disabled: t } = e;
						return !t;
					});
				}
				getNodeFor(e) {
					var t, n;
					return null != (t = null == (n = this.get(e)) ? void 0 : n.node.current) ? t : void 0;
				}
			};
			const Ae = {
				activatorEvent: null,
				active: null,
				activeNode: null,
				activeNodeRect: null,
				collisions: null,
				containerNodeRect: null,
				draggableNodes: /* @__PURE__ */ new Map(),
				droppableRects: /* @__PURE__ */ new Map(),
				droppableContainers: new Oe(),
				over: null,
				dragOverlay: {
					nodeRef: { current: null },
					rect: null,
					setRef: f
				},
				scrollableAncestors: [],
				scrollableAncestorRects: [],
				measuringConfiguration: Ne,
				measureDroppableContainers: f,
				windowRect: null,
				measuringScheduled: !1
			};
			const Le = {
				activatorEvent: null,
				activators: [],
				active: null,
				activeNodeRect: null,
				ariaDescribedById: { draggable: "" },
				dispatch: f,
				draggableNodes: /* @__PURE__ */ new Map(),
				over: null,
				measureDroppableContainers: f
			};
			const ke = t.createContext(Le);
			const Te = t.createContext(Ae);
			function Ke() {
				return {
					draggable: {
						active: null,
						initialCoordinates: {
							x: 0,
							y: 0
						},
						nodes: /* @__PURE__ */ new Map(),
						translate: {
							x: 0,
							y: 0
						}
					},
					droppable: { containers: new Oe() }
				};
			}
			function Pe(e, t) {
				switch (t.type) {
					case u.DragStart: return {
						...e,
						draggable: {
							...e.draggable,
							initialCoordinates: t.initialCoordinates,
							active: t.active
						}
					};
					case u.DragMove: return null == e.draggable.active ? e : {
						...e,
						draggable: {
							...e.draggable,
							translate: {
								x: t.coordinates.x - e.draggable.initialCoordinates.x,
								y: t.coordinates.y - e.draggable.initialCoordinates.y
							}
						}
					};
					case u.DragEnd:
					case u.DragCancel: return {
						...e,
						draggable: {
							...e.draggable,
							active: null,
							initialCoordinates: {
								x: 0,
								y: 0
							},
							translate: {
								x: 0,
								y: 0
							}
						}
					};
					case u.RegisterDroppable: {
						const { element: n } = t, { id: r } = n, o = new Oe(e.droppable.containers);
						return o.set(r, n), {
							...e,
							droppable: {
								...e.droppable,
								containers: o
							}
						};
					}
					case u.SetDroppableDisabled: {
						const { id: n, key: r, disabled: o } = t, i = e.droppable.containers.get(n);
						if (!i || r !== i.key) return e;
						const a = new Oe(e.droppable.containers);
						return a.set(n, {
							...i,
							disabled: o
						}), {
							...e,
							droppable: {
								...e.droppable,
								containers: a
							}
						};
					}
					case u.UnregisterDroppable: {
						const { id: n, key: r } = t, o = e.droppable.containers.get(n);
						if (!o || r !== o.key) return e;
						const i = new Oe(e.droppable.containers);
						return i.delete(n), {
							...e,
							droppable: {
								...e.droppable,
								containers: i
							}
						};
					}
					default: return e;
				}
			}
			function Ie(e) {
				let { disabled: n } = e;
				const { active: r, activatorEvent: i, draggableNodes: a } = t.useContext(ke), s = o.usePrevious(i), l = o.usePrevious(null == r ? void 0 : r.id);
				return t.useEffect(() => {
					if (!n && !i && s && null != l) {
						if (!o.isKeyboardEvent(s)) return;
						if (document.activeElement === s.target) return;
						const e = a.get(l);
						if (!e) return;
						const { activatorNode: t, node: n } = e;
						if (!t.current && !n.current) return;
						requestAnimationFrame(() => {
							for (const e of [t.current, n.current]) {
								if (!e) continue;
								const t = o.findFirstFocusableNode(e);
								if (t) {
									t.focus();
									break;
								}
							}
						});
					}
				}, [
					i,
					n,
					a,
					l,
					s
				]), null;
			}
			function Be(e, t) {
				let { transform: n, ...r } = t;
				return null != e && e.length ? e.reduce((e, t) => t({
					transform: e,
					...r
				}), n) : n;
			}
			const ze = t.createContext({
				...v,
				scaleX: 1,
				scaleY: 1
			});
			var Fe;
			(function(e) {
				e[e.Uninitialized = 0] = "Uninitialized", e[e.Initializing = 1] = "Initializing", e[e.Initialized = 2] = "Initialized";
			})(Fe || (Fe = {}));
			const We = t.memo((function(e) {
				var i, s, l, c;
				let { id: f, accessibility: g, autoScroll: p = !0, children: h, sensors: b = Se, collisionDetection: m = C, measuring: x, modifiers: w, ...E } = e;
				const [M, N] = t.useReducer(Pe, void 0, Ke), [A, K] = function() {
					const [e] = t.useState(() => /* @__PURE__ */ new Set()), n = t.useCallback((t) => (e.add(t), () => e.delete(t)), [e]);
					return [t.useCallback((t) => {
						let { type: n, event: r } = t;
						e.forEach((e) => {
							var t;
							return null == (t = e[n]) ? void 0 : t.call(e, r);
						});
					}, [e]), n];
				}(), [P, F] = t.useState(Fe.Uninitialized), W = P === Fe.Initialized, { draggable: { active: j, nodes: H, translate: X }, droppable: { containers: V } } = M, J = null != j ? H.get(j) : null, _ = t.useRef({
					initial: null,
					translated: null
				}), G = t.useMemo(() => {
					var e;
					return null != j ? {
						id: j,
						data: null != (e = null == J ? void 0 : J.data) ? e : Me,
						rect: _
					} : null;
				}, [j, J]), Q = t.useRef(null), [Z, $] = t.useState(null), [ee, te] = t.useState(null), ne = o.useLatestValue(E, Object.values(E)), re = o.useUniqueId("DndDescribedBy", f), oe = t.useMemo(() => V.getEnabled(), [V]), ie = t.useMemo(() => ({
					draggable: {
						...Ne.draggable,
						...null == ae ? void 0 : ae.draggable
					},
					droppable: {
						...Ne.droppable,
						...null == ae ? void 0 : ae.droppable
					},
					dragOverlay: {
						...Ne.dragOverlay,
						...null == ae ? void 0 : ae.dragOverlay
					}
				}), [
					null == (ae = x) ? void 0 : ae.draggable,
					null == ae ? void 0 : ae.droppable,
					null == ae ? void 0 : ae.dragOverlay
				]);
				var ae;
				const { droppableRects: se, measureDroppableContainers: le, measuringScheduled: ce } = function(e, n) {
					let { dragging: r, dependencies: i, config: a } = n;
					const [s, l] = t.useState(null), { frequency: c, measure: d, strategy: u } = a, f = t.useRef(e), v = function() {
						switch (u) {
							case exports.MeasuringStrategy.Always: return !1;
							case exports.MeasuringStrategy.BeforeDragging: return r;
							default: return !r;
						}
					}(), g = o.useLatestValue(v), p = t.useCallback((function(e) {
						void 0 === e && (e = []), g.current || l((t) => null === t ? e : t.concat(e.filter((e) => !t.includes(e))));
					}), [g]), h = t.useRef(null), b = o.useLazyMemo((t) => {
						if (v && !r) return he;
						if (!t || t === he || f.current !== e || null != s) {
							const t = /* @__PURE__ */ new Map();
							for (let n of e) {
								if (!n) continue;
								if (s && s.length > 0 && !s.includes(n.id) && n.rect.current) {
									t.set(n.id, n.rect.current);
									continue;
								}
								const e = n.node.current, r = e ? new Y(d(e), e) : null;
								n.rect.current = r, r && t.set(n.id, r);
							}
							return t;
						}
						return t;
					}, [
						e,
						s,
						r,
						v,
						d
					]);
					return t.useEffect(() => {
						f.current = e;
					}, [e]), t.useEffect(() => {
						v || p();
					}, [r, v]), t.useEffect(() => {
						s && s.length > 0 && l(null);
					}, [JSON.stringify(s)]), t.useEffect(() => {
						v || "number" != typeof c || null !== h.current || (h.current = setTimeout(() => {
							p(), h.current = null;
						}, c));
					}, [
						c,
						v,
						p,
						...i
					]), {
						droppableRects: b,
						measureDroppableContainers: p,
						measuringScheduled: null != s
					};
				}(oe, {
					dragging: W,
					dependencies: [X.x, X.y],
					config: ie.droppable
				}), de = function(e, t) {
					const n = null != t ? e.get(t) : void 0, r = n ? n.node.current : null;
					return o.useLazyMemo((e) => {
						var n;
						return null == t ? null : null != (n = null != r ? r : e) ? n : null;
					}, [r, t]);
				}(H, j), ue = t.useMemo(() => ee ? o.getEventCoordinates(ee) : null, [ee]), fe = function() {
					const e = W && !(!1 === (null == Z ? void 0 : Z.autoScrollEnabled)) && !("object" == typeof p ? !1 === p.enabled : !1 === p);
					return "object" == typeof p ? {
						...p,
						enabled: e
					} : { enabled: e };
				}(), ve = function(e, t) {
					return be(e, t);
				}(de, ie.draggable.measure);
				(function(e) {
					let { activeNode: n, measure: r, initialRect: i, config: a = !0 } = e;
					const s = t.useRef(!1), { x: l, y: c } = "boolean" == typeof a ? {
						x: a,
						y: a
					} : a;
					o.useIsomorphicLayoutEffect(() => {
						if (!l && !c || !n) return void (s.current = !1);
						if (s.current || !i) return;
						const e = null == n ? void 0 : n.node.current;
						if (!e || !1 === e.isConnected) return;
						const t = D(r(e), i);
						if (l || (t.x = 0), c || (t.y = 0), s.current = !0, Math.abs(t.x) > 0 || Math.abs(t.y) > 0) {
							const n = k(e);
							n && n.scrollBy({
								top: t.y,
								left: t.x
							});
						}
					}, [
						n,
						l,
						c,
						i,
						r
					]);
				})({
					activeNode: null != j ? H.get(j) : null,
					config: fe.layoutShiftCompensation,
					initialRect: ve,
					measure: ie.draggable.measure
				});
				const pe = xe(de, ie.draggable.measure, ve), ye = xe(de ? de.parentElement : null), Oe = t.useRef({
					activatorEvent: null,
					active: null,
					activeNode: de,
					collisionRect: null,
					collisions: null,
					droppableRects: se,
					draggableNodes: H,
					draggingNode: null,
					draggingNodeRect: null,
					droppableContainers: V,
					over: null,
					scrollableAncestors: [],
					scrollAdjustedTranslate: null
				}), Ae = V.getNodeFor(null == (i = Oe.current.over) ? void 0 : i.id), Le = function(e) {
					let { measure: n } = e;
					const [r, i] = t.useState(null), a = me({ callback: t.useCallback((e) => {
						for (const { target: t } of e) if (o.isHTMLElement(t)) {
							i((e) => {
								const r = n(t);
								return e ? {
									...e,
									width: r.width,
									height: r.height
								} : r;
							});
							break;
						}
					}, [n]) }), s = t.useCallback((e) => {
						const t = Re(e);
						a?.disconnect(), t && a?.observe(t), i(t ? n(t) : null);
					}, [n, a]), [l, c] = o.useNodeRef(s);
					return t.useMemo(() => ({
						nodeRef: l,
						rect: r,
						setRef: c
					}), [
						r,
						l,
						c
					]);
				}({ measure: ie.dragOverlay.measure }), We = null != (s = Le.nodeRef.current) ? s : de, Ue = W ? null != (l = Le.rect) ? l : pe : null, je = Boolean(Le.nodeRef.current && Le.rect), qe = D(He = je ? null : pe, be(He));
				var He;
				const Xe = Ee(We ? o.getWindow(We) : null), Ye = function(e) {
					const n = t.useRef(e), r = o.useLazyMemo((t) => e ? t && t !== we && e && n.current && e.parentNode === n.current.parentNode ? t : L(e) : we, [e]);
					return t.useEffect(() => {
						n.current = e;
					}, [e]), r;
				}(W ? null != Ae ? Ae : de : null), Ve = function(e, n) {
					void 0 === n && (n = O);
					const [r] = e, i = Ee(r ? o.getWindow(r) : null), [a, s] = t.useState(De);
					function l() {
						s(() => e.length ? e.map((e) => z(e) ? i : new Y(n(e), e)) : De);
					}
					const c = me({ callback: l });
					return o.useIsomorphicLayoutEffect(() => {
						c?.disconnect(), l(), e.forEach((e) => null == c ? void 0 : c.observe(e));
					}, [e]), a;
				}(Ye), Je = Be(w, {
					transform: {
						x: X.x - qe.x,
						y: X.y - qe.y,
						scaleX: 1,
						scaleY: 1
					},
					activatorEvent: ee,
					active: G,
					activeNodeRect: pe,
					containerNodeRect: ye,
					draggingNodeRect: Ue,
					over: Oe.current.over,
					overlayNodeRect: Le.rect,
					scrollableAncestors: Ye,
					scrollableAncestorRects: Ve,
					windowRect: Xe
				}), _e = ue ? o.add(ue, X) : null, Ge = function(e) {
					const [n, r] = t.useState(null), i = t.useRef(e), a = t.useCallback((e) => {
						const t = T(e.target);
						t && r((e) => e ? (e.set(t, I(t)), new Map(e)) : null);
					}, []);
					return t.useEffect(() => {
						const t = i.current;
						if (e !== t) {
							n(t);
							const o = e.map((e) => {
								const t = T(e);
								return t ? (t.addEventListener("scroll", a, { passive: !0 }), [t, I(t)]) : null;
							}).filter((e) => null != e);
							r(o.length ? new Map(o) : null), i.current = e;
						}
						return () => {
							n(e), n(t);
						};
						function n(e) {
							e.forEach((e) => {
								T(e)?.removeEventListener("scroll", a);
							});
						}
					}, [a, e]), t.useMemo(() => e.length ? n ? Array.from(n.values()).reduce((e, t) => o.add(e, t), v) : q(e) : v, [e, n]);
				}(Ye), Qe = Ce(Ge), Ze = Ce(Ge, [pe]), $e = o.add(Je, Qe), et = Ue ? S(Ue, Je) : null, tt = G && et ? m({
					active: G,
					collisionRect: et,
					droppableRects: se,
					droppableContainers: oe,
					pointerCoordinates: _e
				}) : null, nt = y(tt, "id"), [rt, ot] = t.useState(null), it = function(e, t, n) {
					return {
						...e,
						scaleX: t && n ? t.width / n.width : 1,
						scaleY: t && n ? t.height / n.height : 1
					};
				}(je ? Je : o.add(Je, Ze), null != (c = null == rt ? void 0 : rt.rect) ? c : null, pe), at = t.useRef(null), st = t.useCallback((e, t) => {
					let { sensor: n, options: o } = t;
					if (null == Q.current) return;
					const i = H.get(Q.current);
					if (!i) return;
					const a = e.nativeEvent, s = new n({
						active: Q.current,
						activeNode: i,
						event: a,
						options: o,
						context: Oe,
						onAbort(e) {
							if (!H.get(e)) return;
							const { onDragAbort: t } = ne.current, n = { id: e };
							t?.(n), A({
								type: "onDragAbort",
								event: n
							});
						},
						onPending(e, t, n, r) {
							if (!H.get(e)) return;
							const { onDragPending: o } = ne.current, i = {
								id: e,
								constraint: t,
								initialCoordinates: n,
								offset: r
							};
							o?.(i), A({
								type: "onDragPending",
								event: i
							});
						},
						onStart(e) {
							const t = Q.current;
							if (null == t) return;
							const n = H.get(t);
							if (!n) return;
							const { onDragStart: o } = ne.current, i = {
								activatorEvent: a,
								active: {
									id: t,
									data: n.data,
									rect: _
								}
							};
							r.unstable_batchedUpdates(() => {
								o?.(i), F(Fe.Initializing), N({
									type: u.DragStart,
									initialCoordinates: e,
									active: t
								}), A({
									type: "onDragStart",
									event: i
								}), $(at.current), te(a);
							});
						},
						onMove(e) {
							N({
								type: u.DragMove,
								coordinates: e
							});
						},
						onEnd: l(u.DragEnd),
						onCancel: l(u.DragCancel)
					});
					function l(e) {
						return async function() {
							const { active: t, collisions: n, over: o, scrollAdjustedTranslate: i } = Oe.current;
							let s = null;
							if (t && i) {
								const { cancelDrop: r } = ne.current;
								s = {
									activatorEvent: a,
									active: t,
									collisions: n,
									delta: i,
									over: o
								}, e === u.DragEnd && "function" == typeof r && await Promise.resolve(r(s)) && (e = u.DragCancel);
							}
							Q.current = null, r.unstable_batchedUpdates(() => {
								N({ type: e }), F(Fe.Uninitialized), ot(null), $(null), te(null), at.current = null;
								const t = e === u.DragEnd ? "onDragEnd" : "onDragCancel";
								if (s) {
									const e = ne.current[t];
									e?.(s), A({
										type: t,
										event: s
									});
								}
							});
						};
					}
					at.current = s;
				}, [H]), lt = function(e, n) {
					return t.useMemo(() => e.reduce((e, t) => {
						const { sensor: r } = t;
						return [...e, ...r.activators.map((e) => ({
							eventName: e.eventName,
							handler: n(e.handler, t)
						}))];
					}, []), [e, n]);
				}(b, t.useCallback((e, t) => (n, r) => {
					const o = n.nativeEvent, i = H.get(r);
					null !== Q.current || !i || o.dndKit || o.defaultPrevented || !0 === e(n, t.options, { active: i }) && (o.dndKit = { capturedBy: t.sensor }, Q.current = r, st(n, t));
				}, [H, st]));
				(function(e) {
					t.useEffect(() => {
						if (!o.canUseDOM) return;
						const t = e.map((e) => {
							let { sensor: t } = e;
							return null == t.setup ? void 0 : t.setup();
						});
						return () => {
							for (const e of t) e?.();
						};
					}, e.map((e) => {
						let { sensor: t } = e;
						return t;
					}));
				})(b), o.useIsomorphicLayoutEffect(() => {
					pe && P === Fe.Initializing && F(Fe.Initialized);
				}, [pe, P]), t.useEffect(() => {
					const { onDragMove: e } = ne.current, { active: t, activatorEvent: n, collisions: o, over: i } = Oe.current;
					if (!t || !n) return;
					const a = {
						active: t,
						activatorEvent: n,
						collisions: o,
						delta: {
							x: $e.x,
							y: $e.y
						},
						over: i
					};
					r.unstable_batchedUpdates(() => {
						e?.(a), A({
							type: "onDragMove",
							event: a
						});
					});
				}, [$e.x, $e.y]), t.useEffect(() => {
					const { active: e, activatorEvent: t, collisions: n, droppableContainers: o, scrollAdjustedTranslate: i } = Oe.current;
					if (!e || null == Q.current || !t || !i) return;
					const { onDragOver: a } = ne.current, s = o.get(nt), l = s && s.rect.current ? {
						id: s.id,
						rect: s.rect.current,
						data: s.data,
						disabled: s.disabled
					} : null, c = {
						active: e,
						activatorEvent: t,
						collisions: n,
						delta: {
							x: i.x,
							y: i.y
						},
						over: l
					};
					r.unstable_batchedUpdates(() => {
						ot(l), a?.(c), A({
							type: "onDragOver",
							event: c
						});
					});
				}, [nt]), o.useIsomorphicLayoutEffect(() => {
					Oe.current = {
						activatorEvent: ee,
						active: G,
						activeNode: de,
						collisionRect: et,
						collisions: tt,
						droppableRects: se,
						draggableNodes: H,
						draggingNode: We,
						draggingNodeRect: Ue,
						droppableContainers: V,
						over: rt,
						scrollableAncestors: Ye,
						scrollAdjustedTranslate: $e
					}, _.current = {
						initial: Ue,
						translated: et
					};
				}, [
					G,
					de,
					tt,
					et,
					H,
					We,
					Ue,
					se,
					V,
					rt,
					Ye,
					$e
				]), function(e) {
					let { acceleration: n, activator: r = exports.AutoScrollActivator.Pointer, canScroll: i, draggingRect: a, enabled: s, interval: l = 5, order: c = exports.TraversalOrder.TreeOrder, pointerCoordinates: d, scrollableAncestors: u, scrollableAncestorRects: f, delta: v, threshold: g } = e;
					const p = function(e) {
						let { delta: t, disabled: n } = e;
						const r = o.usePrevious(t);
						return o.useLazyMemo((e) => {
							if (n || !r || !e) return ge;
							const o = Math.sign(t.x - r.x), i = Math.sign(t.y - r.y);
							return {
								x: {
									[B.Backward]: e.x[B.Backward] || -1 === o,
									[B.Forward]: e.x[B.Forward] || 1 === o
								},
								y: {
									[B.Backward]: e.y[B.Backward] || -1 === i,
									[B.Forward]: e.y[B.Forward] || 1 === i
								}
							};
						}, [
							n,
							t,
							r
						]);
					}({
						delta: v,
						disabled: !s
					}), [h, b] = o.useInterval(), m = t.useRef({
						x: 0,
						y: 0
					}), y = t.useRef({
						x: 0,
						y: 0
					}), x = t.useMemo(() => {
						switch (r) {
							case exports.AutoScrollActivator.Pointer: return d ? {
								top: d.y,
								bottom: d.y,
								left: d.x,
								right: d.x
							} : null;
							case exports.AutoScrollActivator.DraggableRect: return a;
						}
					}, [
						r,
						a,
						d
					]), w = t.useRef(null), C = t.useCallback(() => {
						const e = w.current;
						e && e.scrollBy(m.current.x * y.current.x, m.current.y * y.current.y);
					}, []), E = t.useMemo(() => c === exports.TraversalOrder.TreeOrder ? [...u].reverse() : u, [c, u]);
					t.useEffect(() => {
						if (s && u.length && x) {
							for (const e of E) {
								if (!1 === (null == i ? void 0 : i(e))) continue;
								const t = u.indexOf(e), r = f[t];
								if (!r) continue;
								const { direction: o, speed: a } = U(e, r, x, n, g);
								for (const e of ["x", "y"]) p[e][o[e]] || (a[e] = 0, o[e] = 0);
								if (a.x > 0 || a.y > 0) return b(), w.current = e, h(C, l), m.current = a, void (y.current = o);
							}
							m.current = {
								x: 0,
								y: 0
							}, y.current = {
								x: 0,
								y: 0
							}, b();
						} else b();
					}, [
						n,
						C,
						i,
						b,
						s,
						l,
						JSON.stringify(x),
						JSON.stringify(p),
						h,
						u,
						E,
						f,
						JSON.stringify(g)
					]);
				}({
					...fe,
					delta: X,
					draggingRect: et,
					pointerCoordinates: _e,
					scrollableAncestors: Ye,
					scrollableAncestorRects: Ve
				});
				const ct = t.useMemo(() => ({
					active: G,
					activeNode: de,
					activeNodeRect: pe,
					activatorEvent: ee,
					collisions: tt,
					containerNodeRect: ye,
					dragOverlay: Le,
					draggableNodes: H,
					droppableContainers: V,
					droppableRects: se,
					over: rt,
					measureDroppableContainers: le,
					scrollableAncestors: Ye,
					scrollableAncestorRects: Ve,
					measuringConfiguration: ie,
					measuringScheduled: ce,
					windowRect: Xe
				}), [
					G,
					de,
					pe,
					ee,
					tt,
					ye,
					Le,
					H,
					V,
					se,
					rt,
					le,
					Ye,
					Ve,
					ie,
					ce,
					Xe
				]), dt = t.useMemo(() => ({
					activatorEvent: ee,
					activators: lt,
					active: G,
					activeNodeRect: pe,
					ariaDescribedById: { draggable: re },
					dispatch: N,
					draggableNodes: H,
					over: rt,
					measureDroppableContainers: le
				}), [
					ee,
					lt,
					G,
					pe,
					N,
					re,
					H,
					rt,
					le
				]);
				return n.createElement(a.Provider, { value: K }, n.createElement(ke.Provider, { value: dt }, n.createElement(Te.Provider, { value: ct }, n.createElement(ze.Provider, { value: it }, h)), n.createElement(Ie, { disabled: !1 === (null == g ? void 0 : g.restoreFocus) })), n.createElement(d, {
					...g,
					hiddenTextDescribedById: re
				}));
			}));
			const Ue = t.createContext(null);
			const je = "button";
			function qe() {
				return t.useContext(Te);
			}
			const He = { timeout: 25 };
			function Xe(e) {
				let { animation: r, children: i } = e;
				const [a, s] = t.useState(null), [l, c] = t.useState(null), d = o.usePrevious(i);
				return i || a || !d || s(d), o.useIsomorphicLayoutEffect(() => {
					if (!l) return;
					const e = null == a ? void 0 : a.props.id;
					null != (null == a ? void 0 : a.key) && null != e ? Promise.resolve(r(e, l)).then(() => {
						s(null);
					}) : s(null);
				}, [
					r,
					a,
					l
				]), n.createElement(n.Fragment, null, i, a ? t.cloneElement(a, { ref: c }) : null);
			}
			const Ye = {
				x: 0,
				y: 0,
				scaleX: 1,
				scaleY: 1
			};
			function Ve(e) {
				let { children: t } = e;
				return n.createElement(ke.Provider, { value: Le }, n.createElement(ze.Provider, { value: Ye }, t));
			}
			const Je = {
				position: "fixed",
				touchAction: "none"
			};
			const _e = (e) => o.isKeyboardEvent(e) ? "transform 250ms ease" : void 0;
			const Ge = t.forwardRef((e, t) => {
				let { as: r, activatorEvent: i, adjustScale: a, children: s, className: l, rect: c, style: d, transform: u, transition: f = _e } = e;
				if (!c) return null;
				const v = a ? u : {
					...u,
					scaleX: 1,
					scaleY: 1
				}, g = {
					...Je,
					width: c.width,
					height: c.height,
					top: c.top,
					left: c.left,
					transform: o.CSS.Transform.toString(v),
					transformOrigin: a && i ? p(i, c) : void 0,
					transition: "function" == typeof f ? f(i) : f,
					...d
				};
				return n.createElement(r, {
					className: l,
					style: g,
					ref: t
				}, s);
			});
			const Qe = (e) => (t) => {
				let { active: n, dragOverlay: r } = t;
				const o = {}, { styles: i, className: a } = e;
				if (null != i && i.active) for (const [e, t] of Object.entries(i.active)) void 0 !== t && (o[e] = n.node.style.getPropertyValue(e), n.node.style.setProperty(e, t));
				if (null != i && i.dragOverlay) for (const [e, t] of Object.entries(i.dragOverlay)) void 0 !== t && r.node.style.setProperty(e, t);
				return null != a && a.active && n.node.classList.add(a.active), null != a && a.dragOverlay && r.node.classList.add(a.dragOverlay), function() {
					for (const [e, t] of Object.entries(o)) n.node.style.setProperty(e, t);
					null != a && a.active && n.node.classList.remove(a.active);
				};
			};
			const Ze = {
				duration: 250,
				easing: "ease",
				keyframes: (e) => {
					let { transform: { initial: t, final: n } } = e;
					return [{ transform: o.CSS.Transform.toString(t) }, { transform: o.CSS.Transform.toString(n) }];
				},
				sideEffects: Qe({ styles: { active: { opacity: "0" } } })
			};
			let $e = 0;
			function et(e) {
				return t.useMemo(() => {
					if (null != e) return $e++, $e;
				}, [e]);
			}
			const tt = n.memo((e) => {
				let { adjustScale: r = !1, children: i, dropAnimation: a, style: s, transition: l, modifiers: c, wrapperElement: d = "div", className: u, zIndex: f = 999 } = e;
				const { activatorEvent: v, active: g, activeNodeRect: p, containerNodeRect: h, draggableNodes: b, droppableContainers: m, dragOverlay: y, over: x, measuringConfiguration: w, scrollableAncestors: C, scrollableAncestorRects: E, windowRect: D } = qe(), R = t.useContext(ze), S = et(null == g ? void 0 : g.id), N = Be(c, {
					activatorEvent: v,
					active: g,
					activeNodeRect: p,
					containerNodeRect: h,
					draggingNodeRect: y.rect,
					over: x,
					overlayNodeRect: y.rect,
					scrollableAncestors: C,
					scrollableAncestorRects: E,
					transform: R,
					windowRect: D
				}), O = be(p), A = function(e) {
					let { config: t, draggableNodes: n, droppableContainers: r, measuringConfiguration: i } = e;
					return o.useEvent((e, a) => {
						if (null === t) return;
						const s = n.get(e);
						if (!s) return;
						const l = s.node.current;
						if (!l) return;
						const c = Re(a);
						if (!c) return;
						const { transform: d } = o.getWindow(a).getComputedStyle(a), u = M(d);
						if (!u) return;
						const f = "function" == typeof t ? t : function(e) {
							const { duration: t, easing: n, sideEffects: r, keyframes: o } = {
								...Ze,
								...e
							};
							return (e) => {
								let { active: i, dragOverlay: a, transform: s, ...l } = e;
								if (!t) return;
								const c = {
									x: s.x - (a.rect.left - i.rect.left),
									y: s.y - (a.rect.top - i.rect.top),
									scaleX: 1 !== s.scaleX ? i.rect.width * s.scaleX / a.rect.width : 1,
									scaleY: 1 !== s.scaleY ? i.rect.height * s.scaleY / a.rect.height : 1
								}, d = o({
									...l,
									active: i,
									dragOverlay: a,
									transform: {
										initial: s,
										final: c
									}
								}), [u] = d, f = d[d.length - 1];
								if (JSON.stringify(u) === JSON.stringify(f)) return;
								const v = null == r ? void 0 : r({
									active: i,
									dragOverlay: a,
									...l
								}), g = a.node.animate(d, {
									duration: t,
									easing: n,
									fill: "forwards"
								});
								return new Promise((e) => {
									g.onfinish = () => {
										v?.(), e();
									};
								});
							};
						}(t);
						return H(l, i.draggable.measure), f({
							active: {
								id: e,
								data: s.data,
								node: l,
								rect: i.draggable.measure(l)
							},
							draggableNodes: n,
							dragOverlay: {
								node: a,
								rect: i.dragOverlay.measure(c)
							},
							droppableContainers: r,
							measuringConfiguration: i,
							transform: u
						});
					});
				}({
					config: a,
					draggableNodes: b,
					droppableContainers: m,
					measuringConfiguration: w
				});
				return n.createElement(Ve, null, n.createElement(Xe, { animation: A }, g && S ? n.createElement(Ge, {
					key: S,
					id: g.id,
					ref: O ? y.setRef : void 0,
					as: d,
					activatorEvent: v,
					adjustScale: r,
					className: u,
					transition: l,
					rect: O,
					style: {
						zIndex: f,
						...s
					},
					transform: N
				}, i) : null));
			});
			exports.DndContext = We, exports.DragOverlay = tt, exports.KeyboardSensor = te, exports.MouseSensor = ce, exports.PointerSensor = ae, exports.TouchSensor = ue, exports.applyModifiers = Be, exports.closestCenter = (e) => {
				let { collisionRect: t, droppableRects: n, droppableContainers: r } = e;
				const o = x(t, t.left, t.top), i = [];
				for (const e of r) {
					const { id: t } = e, r = n.get(t);
					if (r) {
						const n = g(x(r), o);
						i.push({
							id: t,
							data: {
								droppableContainer: e,
								value: n
							}
						});
					}
				}
				return i.sort(h);
			}, exports.closestCorners = (e) => {
				let { collisionRect: t, droppableRects: n, droppableContainers: r } = e;
				const o = m(t), i = [];
				for (const e of r) {
					const { id: t } = e, r = n.get(t);
					if (r) {
						const n = m(r), a = o.reduce((e, t, r) => e + g(n[r], t), 0), s = Number((a / 4).toFixed(4));
						i.push({
							id: t,
							data: {
								droppableContainer: e,
								value: s
							}
						});
					}
				}
				return i.sort(h);
			}, exports.defaultAnnouncements = c, exports.defaultCoordinates = v, exports.defaultDropAnimation = Ze, exports.defaultDropAnimationSideEffects = Qe, exports.defaultKeyboardCoordinateGetter = ee, exports.defaultScreenReaderInstructions = l, exports.getClientRect = O, exports.getFirstCollision = y, exports.getScrollableAncestors = L, exports.pointerWithin = (e) => {
				let { droppableContainers: t, droppableRects: n, pointerCoordinates: r } = e;
				if (!r) return [];
				const o = [];
				for (const e of t) {
					const { id: t } = e, i = n.get(t);
					if (i && E(r, i)) {
						const n = m(i).reduce((e, t) => e + g(r, t), 0), a = Number((n / 4).toFixed(4));
						o.push({
							id: t,
							data: {
								droppableContainer: e,
								value: a
							}
						});
					}
				}
				return o.sort(h);
			}, exports.rectIntersection = C, exports.useDndContext = qe, exports.useDndMonitor = s, exports.useDraggable = function(e) {
				let { id: n, data: r, disabled: i = !1, attributes: a } = e;
				const s = o.useUniqueId("Draggable"), { activators: l, activatorEvent: c, active: d, activeNodeRect: u, ariaDescribedById: f, draggableNodes: v, over: g } = t.useContext(ke), { role: p = je, roleDescription: h = "draggable", tabIndex: b = 0 } = null != a ? a : {}, m = (null == d ? void 0 : d.id) === n, y = t.useContext(m ? ze : Ue), [x, w] = o.useNodeRef(), [C, E] = o.useNodeRef(), D = function(e, n) {
					return t.useMemo(() => e.reduce((e, t) => {
						let { eventName: r, handler: o } = t;
						return e[r] = (e) => {
							o(e, n);
						}, e;
					}, {}), [e, n]);
				}(l, n), R = o.useLatestValue(r);
				return o.useIsomorphicLayoutEffect(() => (v.set(n, {
					id: n,
					key: s,
					node: x,
					activatorNode: C,
					data: R
				}), () => {
					const e = v.get(n);
					e && e.key === s && v.delete(n);
				}), [v, n]), {
					active: d,
					activatorEvent: c,
					activeNodeRect: u,
					attributes: t.useMemo(() => ({
						role: p,
						tabIndex: b,
						"aria-disabled": i,
						"aria-pressed": !(!m || p !== je) || void 0,
						"aria-roledescription": h,
						"aria-describedby": f.draggable
					}), [
						i,
						p,
						b,
						m,
						h,
						f.draggable
					]),
					isDragging: m,
					listeners: i ? void 0 : D,
					node: x,
					over: g,
					setNodeRef: w,
					setActivatorNodeRef: E,
					transform: y
				};
			}, exports.useDroppable = function(e) {
				let { data: n, disabled: r = !1, id: i, resizeObserverConfig: a } = e;
				const s = o.useUniqueId("Droppable"), { active: l, dispatch: c, over: d, measureDroppableContainers: f } = t.useContext(ke), v = t.useRef({ disabled: r }), g = t.useRef(!1), p = t.useRef(null), h = t.useRef(null), { disabled: b, updateMeasurementsFor: m, timeout: y } = {
					...He,
					...a
				}, x = o.useLatestValue(null != m ? m : i), w = me({
					callback: t.useCallback(() => {
						g.current ? (null != h.current && clearTimeout(h.current), h.current = setTimeout(() => {
							f(Array.isArray(x.current) ? x.current : [x.current]), h.current = null;
						}, y)) : g.current = !0;
					}, [y]),
					disabled: b || !l
				}), C = t.useCallback((e, t) => {
					w && (t && (w.unobserve(t), g.current = !1), e && w.observe(e));
				}, [w]), [E, D] = o.useNodeRef(C), R = o.useLatestValue(n);
				return t.useEffect(() => {
					w && E.current && (w.disconnect(), g.current = !1, w.observe(E.current));
				}, [E, w]), t.useEffect(() => (c({
					type: u.RegisterDroppable,
					element: {
						id: i,
						key: s,
						disabled: r,
						node: E,
						rect: p,
						data: R
					}
				}), () => c({
					type: u.UnregisterDroppable,
					key: s,
					id: i
				})), [i]), t.useEffect(() => {
					r !== v.current.disabled && (c({
						type: u.SetDroppableDisabled,
						id: i,
						key: s,
						disabled: r
					}), v.current.disabled = r);
				}, [
					i,
					s,
					r,
					c
				]), {
					active: l,
					rect: p,
					isOver: (null == d ? void 0 : d.id) === i,
					node: E,
					over: d,
					setNodeRef: D
				};
			}, exports.useSensor = function(e, n) {
				return t.useMemo(() => ({
					sensor: e,
					options: null != n ? n : {}
				}), [e, n]);
			}, exports.useSensors = function() {
				for (var e = arguments.length, n = new Array(e), r = 0; r < e; r++) n[r] = arguments[r];
				return t.useMemo(() => [...n].filter((e) => null != e), [...n]);
			};
		}));
		//#endregion
		//#region src/client/layout.ts
		var import_dist = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_core_cjs_production_min();
		})))();
		const int = (value, fallback) => Number.isFinite(value) ? Math.round(value) : fallback;
		/** 钳制布局到合法边界（宽 1-12 列 / 高 1-24 行 / 不越出右缘） */
		function clampLayout(layout) {
			const columns = Math.min(12, Math.max(1, int(layout.columns ?? 6, 6)));
			const rows = Math.min(24, Math.max(1, int(layout.rows ?? 4, 4)));
			return {
				column: Math.min(12 - columns, Math.max(0, int(layout.column ?? 0, 0))),
				row: Math.max(0, int(layout.row ?? 0, 0)),
				columns,
				rows
			};
		}
		const overlaps = (a, b) => a.column < b.column + b.columns && b.column < a.column + a.columns && a.row < b.row + b.rows && b.row < a.row + a.rows;
		/** 网格占用图（行数动态）：occupied[r][c] = tileId */
		function buildOccupancy(tiles, skipId) {
			const occupied = /* @__PURE__ */ new Map();
			for (const tile of tiles) {
				if (tile.tileId === skipId) continue;
				for (let r = tile.layout.row; r < tile.layout.row + tile.layout.rows; r++) for (let c = tile.layout.column; c < tile.layout.column + tile.layout.columns; c++) {
					if (!occupied.has(r)) occupied.set(r, /* @__PURE__ */ new Set());
					occupied.get(r).add(c);
				}
			}
			return occupied;
		}
		const cellFree = (occupied, row, column) => !(occupied.get(row)?.has(column) ?? false);
		/** 从上往下找第一个能放下的空位（紧凑布局：新 tile 落到最上可用位置） */
		function findNearestSlot(tiles, size, skipId) {
			const { columns, rows } = clampLayout({
				...size,
				column: 0,
				row: 0
			});
			const occupied = buildOccupancy(tiles, skipId);
			for (let r = 0; r <= 24 - rows; r++) for (let c = 0; c <= 12 - columns; c++) {
				let free = true;
				for (let dr = 0; dr < rows && free; dr++) for (let dc = 0; dc < columns && free; dc++) if (!cellFree(occupied, r + dr, c + dc)) free = false;
				if (free) return {
					column: c,
					row: r,
					columns,
					rows
				};
			}
			return {
				column: 0,
				row: 24,
				columns,
				rows
			};
		}
		/** 紧凑化：所有 tile 依次按原顺序下落到最低可能位置（重力排序） */
		function compactTiles(tiles) {
			const sorted = [...tiles].sort((a, b) => a.layout.row - b.layout.row || a.layout.column - b.layout.column);
			const placed = [];
			const result = [];
			for (const tile of sorted) {
				const slot = findNearestSlot(placed, tile.layout);
				placed.push({
					tileId: tile.tileId,
					layout: slot
				});
				result.push({
					...tile,
					layout: slot
				});
			}
			return result;
		}
		/** 网格总高度（行数）：空板为 0 */
		function gridHeight(tiles) {
			return tiles.reduce((max, t) => Math.max(max, t.layout.row + t.layout.rows), 0);
		}
		/** 放置校验：target 位置若与其他 tile 碰撞则返回被撞者（用于拖放交换判定） */
		function collisionAt(tiles, tileId, target) {
			const clamped = clampLayout(target);
			return tiles.find((other) => other.tileId !== tileId && overlaps(clamped, other.layout));
		}
		/** 交换两 tile 的布局（拖到已占用格时的 OCIX swap 行为） */
		function swapLayouts(tiles, dragId, overId) {
			const drag = tiles.find((t) => t.tileId === dragId);
			const over = tiles.find((t) => t.tileId === overId);
			if (!drag || !over) return [...tiles];
			return tiles.map((t) => {
				if (t.tileId === dragId) return {
					...t,
					layout: over.layout
				};
				if (t.tileId === overId) return {
					...t,
					layout: drag.layout
				};
				return t;
			});
		}
		//#endregion
		//#region src/client/store.ts
		/**
		* Dock Board store：tile 集合 + localStorage 持久化（OCIX useExtensionWorkbenchStore 同款语义）。
		* 使用 useSyncExternalStore 友好的手写 store（无 zustand 依赖——bundle 尺寸考虑）。
		*/
		const STORAGE_KEY = "openloop.dock.board.v1";
		let seq = 0;
		const newTileId = () => {
			seq += 1;
			return `tile-${Date.now().toString(36)}-${seq.toString(36)}`;
		};
		const emptyBoard = () => ({
			version: 1,
			tiles: []
		});
		function readBoard() {
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (raw === null) return emptyBoard();
				const parsed = JSON.parse(raw);
				if (parsed?.version !== 1 || !Array.isArray(parsed.tiles)) return emptyBoard();
				return {
					version: 1,
					tiles: parsed.tiles.filter((t) => t && typeof t.tileId === "string" && t.source && t.source.kind).map((t) => ({
						...t,
						layout: clampLayout(t.layout ?? {})
					}))
				};
			} catch {
				return emptyBoard();
			}
		}
		var DockStore = class {
			board = emptyBoard();
			listeners = /* @__PURE__ */ new Set();
			initialized = false;
			subscribe(listener) {
				if (!this.initialized && typeof localStorage !== "undefined") {
					this.board = readBoard();
					this.initialized = true;
				}
				this.listeners.add(listener);
				return () => this.listeners.delete(listener);
			}
			getSnapshot() {
				if (!this.initialized && typeof localStorage !== "undefined") {
					this.board = readBoard();
					this.initialized = true;
				}
				return this.board;
			}
			emit(next, persist = true) {
				this.board = next;
				if (persist && typeof localStorage !== "undefined") try {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
				} catch {}
				for (const listener of this.listeners) listener();
			}
			pin(source, title, origin = null, layoutHint) {
				const current = this.getSnapshot();
				const layout = findNearestSlot(current.tiles, {
					columns: layoutHint?.columns ?? 6,
					rows: layoutHint?.rows ?? 4
				});
				const tile = {
					tileId: newTileId(),
					title,
					source,
					layout: {
						...layout,
						...layoutHint?.column !== void 0 || layoutHint?.row !== void 0 ? clampLayout({
							...layout,
							...layoutHint
						}) : {}
					},
					origin,
					createdAt: Date.now()
				};
				this.emit({
					version: 1,
					tiles: [...current.tiles, tile]
				});
				return tile;
			}
			remove(tileId) {
				const current = this.getSnapshot();
				this.emit({
					version: 1,
					tiles: current.tiles.filter((t) => t.tileId !== tileId)
				});
			}
			move(tileId, target) {
				const current = this.getSnapshot();
				this.emit({
					version: 1,
					tiles: current.tiles.map((t) => t.tileId === tileId ? {
						...t,
						layout: clampLayout(target)
					} : t)
				});
			}
			compact() {
				const current = this.getSnapshot();
				this.emit({
					version: 1,
					tiles: compactTiles(current.tiles)
				});
			}
			clear() {
				this.emit(emptyBoard());
			}
		};
		const dockStore = new DockStore();
		//#endregion
		//#region src/client/DockBoardView.tsx
		/**
		* DockBoardView：12 列网格画板（OCIX workbench 复刻）。
		* - dnd-kit 拖放：drop 时按指针换算网格坐标，碰撞则 swap、空位则 move
		* - 拖角 resize（右下角手柄，按格步进）
		* - tile 渲染：panel → PanelCard（external panels/client）；artifact → ArtifactFrame（external artifact/client）
		*/
		const scope = (0, _openloop_dsh_base_client.createOpenLoopSettingsScope)();
		function TileChrome({ title, onRemove, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					position: "absolute",
					inset: 0,
					display: "flex",
					flexDirection: "column",
					borderRadius: 12,
					border: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.08))",
					background: "var(--dsw-alias-bg-layer-1, #fff)",
					overflow: "hidden"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "6px 10px",
						borderBottom: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.06))",
						fontSize: 12,
						fontWeight: 600,
						flexShrink: 0
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap"
						},
						children: title
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onRemove,
						"aria-label": "unpin",
						style: {
							border: 0,
							background: "transparent",
							cursor: "pointer",
							fontSize: 13,
							lineHeight: 1,
							padding: "2px 4px"
						},
						children: "✕"
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						position: "relative",
						flex: 1,
						minHeight: 0,
						overflow: "auto",
						padding: 8
					},
					children
				})]
			});
		}
		function TileContent({ tile }) {
			if (tile.source.kind === "panel") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_openloop_dsh_panels_client.PanelSurface, { meta: tile.source.meta });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_openloop_dsh_html_artifact_client.ArtifactFrame, {
				meta: tile.source.meta,
				token: `dock-${tile.tileId}`,
				fullscreen: false,
				scope
			});
		}
		function GridTile({ tile, cellH, onRemove }) {
			const { attributes, listeners, setNodeRef, isDragging } = (0, import_dist.useDraggable)({ id: tile.tileId });
			const boardRef = (0, react.useRef)(null);
			const [resizing, setResizing] = (0, react.useState)(false);
			const startResize = (0, react.useCallback)((event) => {
				event.stopPropagation();
				event.preventDefault();
				const startX = event.clientX;
				const startY = event.clientY;
				const start = { ...tile.layout };
				const colW = (boardRef.current?.parentElement?.clientWidth ?? 300) / 12;
				const move = (e) => {
					const dCols = Math.round((e.clientX - startX) / colW);
					const dRows = Math.round((e.clientY - startY) / cellH);
					dockStore.move(tile.tileId, clampLayout({
						...start,
						columns: start.columns + dCols,
						rows: start.rows + dRows
					}));
				};
				const up = () => {
					setResizing(false);
					window.removeEventListener("pointermove", move);
					window.removeEventListener("pointerup", up);
				};
				setResizing(true);
				window.addEventListener("pointermove", move);
				window.addEventListener("pointerup", up);
			}, [
				tile.tileId,
				tile.layout,
				cellH
			]);
			const style = {
				position: "absolute",
				left: `${tile.layout.column / 12 * 100}%`,
				width: `${tile.layout.columns / 12 * 100}%`,
				top: tile.layout.row * cellH,
				height: tile.layout.rows * cellH,
				padding: 4,
				boxSizing: "border-box",
				opacity: isDragging || resizing ? .4 : 1
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: (node) => {
					setNodeRef(node);
					boardRef.current = node;
				},
				style,
				...attributes,
				...listeners,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TileChrome, {
					title: tile.title,
					onRemove,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TileContent, { tile })
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					onPointerDown: startResize,
					title: "拖动调整大小",
					style: {
						position: "absolute",
						right: 2,
						bottom: 2,
						width: 14,
						height: 14,
						cursor: "nwse-resize",
						background: "linear-gradient(135deg, transparent 50%, var(--dsw-alias-border-l2, rgba(0,0,0,.25)) 50%)",
						borderRadius: 3,
						zIndex: 2
					}
				})]
			});
		}
		function DockBoardView({ onEmpty }) {
			const [cellH, setCellH] = (0, react.useState)(52);
			const boardRef = (0, react.useRef)(null);
			const [dragging, setDragging] = (0, react.useState)(null);
			const sensors = (0, import_dist.useSensors)((0, import_dist.useSensor)(import_dist.PointerSensor, { activationConstraint: { distance: 4 } }), (0, import_dist.useSensor)(import_dist.TouchSensor, { activationConstraint: {
				delay: 120,
				tolerance: 6
			} }));
			const tiles = (0, react.useMemo)(() => dockStore.getSnapshot().tiles, [dragging]);
			const onDragStart = (event) => {
				setDragging(tiles.find((t) => t.tileId === event.active.id) ?? null);
			};
			const onDragEnd = (event) => {
				setDragging(null);
				const dragId = String(event.active.id);
				const overId = event.over?.id !== void 0 ? String(event.over.id) : null;
				const board = boardRef.current;
				if (!board) return;
				if (overId && overId !== dragId) {
					const current = dockStore.getSnapshot().tiles;
					const swapped = swapLayouts(current, dragId, overId);
					for (const t of swapped) {
						const before = current.find((x) => x.tileId === t.tileId);
						if (before && before.layout !== t.layout) dockStore.move(t.tileId, t.layout);
					}
					dockStore.compact();
					return;
				}
				const pointer = event.activatorEvent instanceof PointerEvent ? event.activatorEvent : null;
				const px = pointer?.clientX ?? 0;
				const py = pointer?.clientY ?? 0;
				const rect = board.getBoundingClientRect();
				const colW = rect.width / 12;
				const tile = tiles.find((t) => t.tileId === dragId);
				if (!tile || colW <= 0) return;
				const target = clampLayout({
					...tile.layout,
					column: Math.floor((px - rect.left) / colW - tile.layout.columns / 2),
					row: Math.max(0, Math.round((py - rect.top) / cellH - tile.layout.rows / 2))
				});
				const hit = collisionAt(dockStore.getSnapshot().tiles, dragId, target);
				if (hit) {
					const current = dockStore.getSnapshot().tiles;
					const swapped = swapLayouts(current, dragId, hit.tileId);
					for (const t of swapped) {
						const before = current.find((x) => x.tileId === t.tileId);
						if (before && before.layout !== t.layout) dockStore.move(t.tileId, t.layout);
					}
				} else dockStore.move(dragId, target);
				dockStore.compact();
			};
			const height = Math.max(gridHeight(tiles) * cellH, cellH * 2);
			if (tiles.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					padding: 24,
					color: "var(--dsw-alias-label-caption, #888)",
					fontSize: 13,
					textAlign: "center"
				},
				children: "空画板——在面板 / HTML artifact 卡片上点 📌 固定到这里"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(import_dist.DndContext, {
				sensors,
				collisionDetection: import_dist.closestCenter,
				onDragStart,
				onDragEnd,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: boardRef,
						style: {
							position: "relative",
							height,
							minHeight: 104
						},
						children: tiles.map((tile) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GridTile, {
							tile,
							cellH,
							onRemove: () => {
								dockStore.remove(tile.tileId);
								if (dockStore.getSnapshot().tiles.length === 0) onEmpty?.();
							}
						}, tile.tileId))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(import_dist.DragOverlay, {
						dropAnimation: null,
						children: dragging ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								width: 240,
								opacity: .85
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TileChrome, {
								title: dragging.title,
								onRemove: () => {},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TileContent, { tile: dragging })
							})
						}) : null
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						hidden: true,
						onClick: () => setCellH(cellH)
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.tsx
		const name = "openloop-dock";
		const inject = [];
		function DockToggle({ open, onToggle, count }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onToggle,
				title: open ? "收起 OpenLoop Dock" : "展开 OpenLoop Dock",
				style: {
					position: "fixed",
					top: 10,
					right: 10,
					zIndex: 2147483100,
					width: 34,
					height: 34,
					borderRadius: 10,
					border: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12))",
					background: "var(--dsw-alias-bg-layer-1, #fff)",
					cursor: "pointer",
					fontSize: 14,
					lineHeight: 1,
					boxShadow: "0 2px 8px rgba(0,0,0,.12)"
				},
				children: [open ? "▶" : "📌", count > 0 && !open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						fontSize: 10,
						marginLeft: 2
					},
					children: count
				}) : null]
			});
		}
		function DockShell() {
			const [open, setOpen] = (0, react.useState)(() => dockStore.getSnapshot().tiles.length > 0);
			const [version, setVersion] = (0, react.useState)(0);
			(0, react.useEffect)(() => dockStore.subscribe(() => setVersion((v) => v + 1)), []);
			const tiles = dockStore.getSnapshot().tiles;
			(0, react.useEffect)(() => {
				window.__openloopDockToggle = () => setOpen((o) => !o);
				return () => {
					delete window.__openloopDockToggle;
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DockToggle, {
				open,
				onToggle: () => setOpen((o) => !o),
				count: tiles.length
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DockHost, {
				open,
				width: 420,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						height: "100%"
					},
					"data-dock-version": version,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							padding: "10px 14px",
							borderBottom: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.08))",
							flexShrink: 0
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							style: { fontSize: 13 },
							children: "OpenLoop Dock"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => dockStore.compact(),
								style: {
									fontSize: 11,
									padding: "3px 8px",
									borderRadius: 6,
									border: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12))",
									background: "transparent",
									cursor: "pointer"
								},
								children: "整理"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									if (confirm("清空 Dock 画板？")) dockStore.clear();
								},
								style: {
									fontSize: 11,
									padding: "3px 8px",
									borderRadius: 6,
									border: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12))",
									background: "transparent",
									cursor: "pointer"
								},
								children: "清空"
							})]
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							flex: 1,
							minHeight: 0,
							overflow: "auto"
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DockBoardView, {})
					})]
				})
			})] });
		}
		function apply(ctx) {
			ctx.provide("openloop-dock/client", {
				pinPanel(meta, title, origin) {
					dockStore.pin({
						kind: "panel",
						meta
					}, title, origin);
					window.__openloopDockToggle?.();
				},
				pinArtifact(meta, title, origin) {
					dockStore.pin({
						kind: "artifact",
						meta
					}, title, origin);
					window.__openloopDockToggle?.();
				},
				toggle() {
					window.__openloopDockToggle?.();
				},
				isOpen() {
					return document.querySelector("[data-openloop-dock-panel]") !== null;
				}
			});
			ctx.effect(() => {
				const host = document.createElement("div");
				host.setAttribute("data-openloop-dock-root", "");
				document.body.appendChild(host);
				let root;
				try {
					root = (0, react_dom_client.createRoot)(host);
					root.render((0, react.createElement)(DockShell));
				} catch {}
				return () => {
					root?.unmount();
					host.remove();
				};
			}, "openloop-dock: shell mount");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
