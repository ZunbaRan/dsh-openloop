window.__ModuleLoader__.load({
	id: "@openloop/dsh-dock",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let react_dom_client = require("react-dom/client");
		let react_dom = require("react-dom");
		react_dom = __toESM(react_dom, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		/** 拖宽上限：视口全宽（2026-08-30 用户要求「想拖多宽就多宽」——满屏是用户的合法选择，不再预设 1200/70vw 封顶） */
		const dockMaxWidth = () => {
			const viewport = globalThis.innerWidth;
			return typeof viewport === "number" && Number.isFinite(viewport) ? viewport : 4096;
		};
		const clampDockWidth = (value) => Math.max(560, Math.min(dockMaxWidth(), value));
		//#endregion
		//#region src/client/DockHost.tsx
		/**
		* DockHost：右侧 dock 的挂载层（方案 A，DOCK_DESIGN §1）。
		*
		* 冲突规避三件套：
		* 1. host div 挂 body（data-openloop-dock），MutationObserver 保活——与 better-sidebar 各挂各的；
		* 2. 挤压用 bsb 同款 margin-right + width calc（见 DOCK_DESIGN §1.1 的 2026-08-24 更正：
		*    padding-right 对固定轨道 grid 的 AppFrame 无挤压效果，已被实测证伪并替换）；
		* 3. 空间探测读 bsb 的 --dsh-sidebar-width 变量（其设于 <html>，经继承在 #root computed 可见），
		*    不能再读 computed margin-right——新机制下它包含 dock 自身宽度，会形成反馈回路。
		*
		* 展开交互（2026-08-24 重做，对齐 better-sidebar 体验）：
		* - 面板常驻渲染，宽度过渡（width 0 ↔ W）——从右侧推出的动画效果；
		* - 左缘 6px 拖宽手柄（col-resize），实时生效，松手持久化 localStorage；
		* - 拖动期间禁用 width 过渡（否则动画滞后手感）；内容层固定宽度不随动画压缩。
		*/
		const DOCK_WIDTH_VAR = "--openloop-dock-width";
		const BSB_WIDTH_VAR = "--dsh-sidebar-width";
		const TRANSITION = "width .22s ease";
		/** 右侧空间探测：bsb 占用 = 其 --dsh-sidebar-width（设于 <html>，继承到 #root）。 */
		function probeDockRightEdge() {
			if (typeof window === "undefined") return 0;
			const root = document.getElementById("root");
			if (!root) return window.innerWidth;
			const raw = parseFloat(getComputedStyle(root).getPropertyValue(BSB_WIDTH_VAR)) || 0;
			const occupied = raw > 0 && raw < window.innerWidth * .7 ? raw : 0;
			return window.innerWidth - occupied;
		}
		function DockHost({ open, width, onWidthChange, children }) {
			const [host, setHost] = (0, react.useState)(null);
			const [rightEdge, setRightEdge] = (0, react.useState)(() => probeDockRightEdge());
			const [resizing, setResizing] = (0, react.useState)(false);
			const [handleHover, setHandleHover] = (0, react.useState)(false);
			const widthRef = (0, react.useRef)(width);
			widthRef.current = width;
			const openRef = (0, react.useRef)(open);
			openRef.current = open;
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
				const update = () => {
					setRightEdge(probeDockRightEdge());
					const root = document.getElementById("root");
					if (root) root.style.setProperty(DOCK_WIDTH_VAR, openRef.current ? `${widthRef.current}px` : "0px");
				};
				update();
				const timer = setInterval(update, 500);
				window.addEventListener("resize", update);
				return () => {
					clearInterval(timer);
					window.removeEventListener("resize", update);
				};
			}, []);
			(0, react.useEffect)(() => {
				const styleEl = document.createElement("style");
				styleEl.setAttribute("data-openloop-dock-style", "");
				styleEl.textContent = [
					`#root {`,
					`  margin-right: calc(var(${DOCK_WIDTH_VAR}, 0px) + var(--openloop-canvas-width, 0px));`,
					`  width: calc(100% - var(${DOCK_WIDTH_VAR}, 0px) - var(--openloop-canvas-width, 0px));`,
					`  transition: margin-right .22s ease, width .22s ease;`,
					`}`
				].join("\n");
				document.head.appendChild(styleEl);
				return () => styleEl.remove();
			}, []);
			(0, react.useEffect)(() => {
				const root = document.getElementById("root");
				if (!root) return;
				root.style.setProperty(DOCK_WIDTH_VAR, open ? `${width}px` : "0px");
				return () => {
					root.style.removeProperty(DOCK_WIDTH_VAR);
				};
			}, [open, width]);
			const startResize = (event) => {
				if (!open) return;
				event.preventDefault();
				const startX = event.clientX;
				const startW = widthRef.current;
				setResizing(true);
				const move = (e) => {
					const next = clampDockWidth(Math.round(startW + (startX - e.clientX)));
					onWidthChange?.(next);
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
				zIndex: 2147483050,
				background: "var(--dsw-alias-bg-layer-1, #fff)",
				boxSizing: "border-box"
			};
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: outer,
				"data-openloop-dock-panel": "",
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
		//#endregion
		//#region ../../node_modules/.pnpm/react-grid-layout@2.2.4_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/react-grid-layout/dist/chunk-76RTO6EO.mjs
		function calcGridColWidth(positionParams) {
			const { margin, containerPadding, containerWidth, cols } = positionParams;
			return (containerWidth - margin[0] * (cols - 1) - containerPadding[0] * 2) / cols;
		}
		function calcGridItemWHPx(gridUnits, colOrRowSize, marginPx) {
			if (!Number.isFinite(gridUnits)) return gridUnits;
			return Math.round(colOrRowSize * gridUnits + Math.max(0, gridUnits - 1) * marginPx);
		}
		function calcGridItemPosition(positionParams, x, y, w, h, dragPosition, resizePosition) {
			const { margin, containerPadding, rowHeight } = positionParams;
			const colWidth = calcGridColWidth(positionParams);
			let width;
			let height;
			let top;
			let left;
			if (resizePosition) {
				width = Math.round(resizePosition.width);
				height = Math.round(resizePosition.height);
			} else {
				width = calcGridItemWHPx(w, colWidth, margin[0]);
				height = calcGridItemWHPx(h, rowHeight, margin[1]);
			}
			if (dragPosition) {
				top = Math.round(dragPosition.top);
				left = Math.round(dragPosition.left);
			} else if (resizePosition) {
				top = Math.round(resizePosition.top);
				left = Math.round(resizePosition.left);
			} else {
				top = Math.round((rowHeight + margin[1]) * y + containerPadding[1]);
				left = Math.round((colWidth + margin[0]) * x + containerPadding[0]);
			}
			if (!dragPosition && !resizePosition) {
				if (Number.isFinite(w)) {
					const actualMarginRight = Math.round((colWidth + margin[0]) * (x + w) + containerPadding[0]) - left - width;
					if (actualMarginRight !== margin[0]) width += actualMarginRight - margin[0];
				}
				if (Number.isFinite(h)) {
					const actualMarginBottom = Math.round((rowHeight + margin[1]) * (y + h) + containerPadding[1]) - top - height;
					if (actualMarginBottom !== margin[1]) height += actualMarginBottom - margin[1];
				}
			}
			return {
				top,
				left,
				width,
				height
			};
		}
		function calcXY(positionParams, top, left, w, h) {
			const { margin, containerPadding, cols, rowHeight, maxRows } = positionParams;
			const colWidth = calcGridColWidth(positionParams);
			let x = Math.round((left - containerPadding[0]) / (colWidth + margin[0]));
			let y = Math.round((top - containerPadding[1]) / (rowHeight + margin[1]));
			x = clamp$2(x, 0, cols - w);
			y = clamp$2(y, 0, maxRows - h);
			return {
				x,
				y
			};
		}
		function calcXYRaw(positionParams, top, left) {
			const { margin, containerPadding, rowHeight } = positionParams;
			const colWidth = calcGridColWidth(positionParams);
			return {
				x: Math.round((left - containerPadding[0]) / (colWidth + margin[0])),
				y: Math.round((top - containerPadding[1]) / (rowHeight + margin[1]))
			};
		}
		function calcWHRaw(positionParams, width, height) {
			const { margin, rowHeight } = positionParams;
			const colWidth = calcGridColWidth(positionParams);
			return {
				w: Math.max(1, Math.round((width + margin[0]) / (colWidth + margin[0]))),
				h: Math.max(1, Math.round((height + margin[1]) / (rowHeight + margin[1])))
			};
		}
		function clamp$2(num, lowerBound, upperBound) {
			return Math.max(Math.min(num, upperBound), lowerBound);
		}
		function collides(l1, l2) {
			if (l1.i === l2.i) return false;
			if (l1.x + l1.w <= l2.x) return false;
			if (l1.x >= l2.x + l2.w) return false;
			if (l1.y + l1.h <= l2.y) return false;
			if (l1.y >= l2.y + l2.h) return false;
			return true;
		}
		function getFirstCollision(layout, layoutItem) {
			for (let i = 0; i < layout.length; i++) {
				const item = layout[i];
				if (item !== void 0 && collides(item, layoutItem)) return item;
			}
		}
		function getAllCollisions(layout, layoutItem) {
			return layout.filter((l) => collides(l, layoutItem));
		}
		function sortLayoutItems(layout, compactType) {
			if (compactType === "horizontal") return sortLayoutItemsByColRow(layout);
			if (compactType === "vertical") return sortLayoutItemsByRowCol(layout);
			if (compactType === "wrap") return sortLayoutItemsByRowCol(layout);
			return [...layout];
		}
		function sortLayoutItemsByRowCol(layout) {
			return [...layout].sort((a, b) => {
				if (a.y !== b.y) return a.y - b.y;
				return a.x - b.x;
			});
		}
		function sortLayoutItemsByColRow(layout) {
			return [...layout].sort((a, b) => {
				if (a.x !== b.x) return a.x - b.x;
				return a.y - b.y;
			});
		}
		function bottom(layout) {
			let max = 0;
			for (let i = 0; i < layout.length; i++) {
				const item = layout[i];
				if (item !== void 0) {
					const bottomY = item.y + item.h;
					if (bottomY > max) max = bottomY;
				}
			}
			return max;
		}
		function getLayoutItem(layout, id) {
			for (let i = 0; i < layout.length; i++) {
				const item = layout[i];
				if (item !== void 0 && item.i === id) return item;
			}
		}
		function getStatics(layout) {
			return layout.filter((l) => l.static === true);
		}
		function cloneLayoutItem(layoutItem) {
			return {
				i: layoutItem.i,
				x: layoutItem.x,
				y: layoutItem.y,
				w: layoutItem.w,
				h: layoutItem.h,
				minW: layoutItem.minW,
				maxW: layoutItem.maxW,
				minH: layoutItem.minH,
				maxH: layoutItem.maxH,
				moved: Boolean(layoutItem.moved),
				static: Boolean(layoutItem.static),
				isDraggable: layoutItem.isDraggable,
				isResizable: layoutItem.isResizable,
				resizeHandles: layoutItem.resizeHandles,
				constraints: layoutItem.constraints,
				isBounded: layoutItem.isBounded
			};
		}
		function cloneLayout(layout) {
			const newLayout = new Array(layout.length);
			for (let i = 0; i < layout.length; i++) {
				const item = layout[i];
				if (item !== void 0) newLayout[i] = cloneLayoutItem(item);
			}
			return newLayout;
		}
		function modifyLayout(layout, layoutItem) {
			const newLayout = new Array(layout.length);
			for (let i = 0; i < layout.length; i++) {
				const item = layout[i];
				if (item !== void 0) {
					if (layoutItem.i === item.i) newLayout[i] = layoutItem;
					else newLayout[i] = item;
				}
			}
			return newLayout;
		}
		function withLayoutItem(layout, itemKey, cb) {
			let item = getLayoutItem(layout, itemKey);
			if (!item) return [[...layout], null];
			item = cb(cloneLayoutItem(item));
			return [modifyLayout(layout, item), item];
		}
		function correctBounds(layout, bounds) {
			const collidesWith = getStatics(layout);
			for (let i = 0; i < layout.length; i++) {
				const l = layout[i];
				if (l === void 0) continue;
				if (l.x + l.w > bounds.cols) l.x = bounds.cols - l.w;
				if (l.x < 0) {
					l.x = 0;
					l.w = bounds.cols;
				}
				if (!l.static) collidesWith.push(l);
				else while (getFirstCollision(collidesWith, l)) l.y++;
			}
			return layout;
		}
		function moveElement(layout, l, x, y, isUserAction, preventCollision, compactType, cols, allowOverlap) {
			if (l.static && l.isDraggable !== true) return [...layout];
			if (l.y === y && l.x === x) return [...layout];
			const oldX = l.x;
			const oldY = l.y;
			if (typeof x === "number") l.x = x;
			if (typeof y === "number") l.y = y;
			l.moved = true;
			let sorted = sortLayoutItems(layout, compactType);
			if (compactType === "vertical" && typeof y === "number" ? oldY >= y : compactType === "horizontal" && typeof x === "number" ? oldX >= x : false) sorted = sorted.reverse();
			const collisions = getAllCollisions(sorted, l);
			const hasCollisions = collisions.length > 0;
			if (hasCollisions && allowOverlap) return cloneLayout(layout);
			if (hasCollisions && preventCollision) {
				l.x = oldX;
				l.y = oldY;
				l.moved = false;
				return layout;
			}
			let resultLayout = [...layout];
			for (let i = 0; i < collisions.length; i++) {
				const collision = collisions[i];
				if (collision === void 0) continue;
				if (collision.moved) continue;
				if (collision.static) resultLayout = moveElementAwayFromCollision(resultLayout, collision, l, isUserAction, compactType);
				else resultLayout = moveElementAwayFromCollision(resultLayout, l, collision, isUserAction, compactType);
			}
			return resultLayout;
		}
		function moveElementAwayFromCollision(layout, collidesWith, itemToMove, isUserAction, compactType, cols) {
			const compactH = compactType === "horizontal";
			const compactV = compactType === "vertical";
			const preventCollision = collidesWith.static;
			if (isUserAction) {
				isUserAction = false;
				const fakeItem = {
					x: compactH ? Math.max(collidesWith.x - itemToMove.w, 0) : itemToMove.x,
					y: compactV ? Math.max(collidesWith.y - itemToMove.h, 0) : itemToMove.y,
					w: itemToMove.w,
					h: itemToMove.h,
					i: "-1"
				};
				const firstCollision = getFirstCollision(layout, fakeItem);
				const collisionNorth = firstCollision !== void 0 && firstCollision.y + firstCollision.h > collidesWith.y;
				const collisionWest = firstCollision !== void 0 && collidesWith.x + collidesWith.w > firstCollision.x;
				if (!firstCollision) return moveElement(layout, itemToMove, compactH ? fakeItem.x : void 0, compactV ? fakeItem.y : void 0, isUserAction, preventCollision, compactType);
				if (collisionNorth && compactV) return moveElement(layout, itemToMove, void 0, itemToMove.y + 1, isUserAction, preventCollision, compactType);
				if (collisionNorth && compactType === null) {
					collidesWith.y = itemToMove.y;
					itemToMove.y = itemToMove.y + itemToMove.h;
					return [...layout];
				}
				if (collisionWest && compactH) return moveElement(layout, collidesWith, itemToMove.x, void 0, isUserAction, preventCollision, compactType);
			}
			const newX = compactH ? itemToMove.x + 1 : void 0;
			const newY = compactV ? itemToMove.y + 1 : void 0;
			if (newX === void 0 && newY === void 0) return [...layout];
			return moveElement(layout, itemToMove, newX, newY, isUserAction, preventCollision, compactType);
		}
		//#endregion
		//#region ../../node_modules/.pnpm/react-grid-layout@2.2.4_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/react-grid-layout/dist/chunk-KDANGDDL.mjs
		function clamp$1(value, min, max) {
			return Math.max(min, Math.min(max, value));
		}
		var defaultConstraints = [{
			name: "gridBounds",
			constrainPosition(item, x, y, { cols, maxRows }) {
				return {
					x: clamp$1(x, 0, Math.max(0, cols - item.w)),
					y: clamp$1(y, 0, Math.max(0, maxRows - item.h))
				};
			},
			constrainSize(item, w, h, handle, { cols, maxRows }) {
				const maxW = handle === "w" || handle === "nw" || handle === "sw" ? item.x + item.w : cols - item.x;
				const maxH = handle === "n" || handle === "nw" || handle === "ne" ? item.y + item.h : maxRows - item.y;
				return {
					w: clamp$1(w, 1, Math.max(1, maxW)),
					h: clamp$1(h, 1, Math.max(1, maxH))
				};
			}
		}, {
			name: "minMaxSize",
			constrainSize(item, w, h) {
				return {
					w: clamp$1(w, item.minW ?? 1, item.maxW ?? Infinity),
					h: clamp$1(h, item.minH ?? 1, item.maxH ?? Infinity)
				};
			}
		}];
		function applyPositionConstraints(constraints, item, x, y, context) {
			let result = {
				x,
				y
			};
			for (const constraint of constraints) if (constraint.constrainPosition) result = constraint.constrainPosition(item, result.x, result.y, context);
			if (item.constraints) {
				for (const constraint of item.constraints) if (constraint.constrainPosition) result = constraint.constrainPosition(item, result.x, result.y, context);
			}
			return result;
		}
		function applySizeConstraints(constraints, item, w, h, handle, context) {
			let result = {
				w,
				h
			};
			for (const constraint of constraints) if (constraint.constrainSize) result = constraint.constrainSize(item, result.w, result.h, handle, context);
			if (item.constraints) {
				for (const constraint of item.constraints) if (constraint.constrainSize) result = constraint.constrainSize(item, result.w, result.h, handle, context);
			}
			return result;
		}
		function setTransform({ top, left, width, height }) {
			const translate = `translate(${left}px,${top}px)`;
			return {
				transform: translate,
				WebkitTransform: translate,
				MozTransform: translate,
				msTransform: translate,
				OTransform: translate,
				width: `${width}px`,
				height: `${height}px`,
				position: "absolute"
			};
		}
		function setTopLeft({ top, left, width, height }) {
			return {
				top: `${top}px`,
				left: `${left}px`,
				width: `${width}px`,
				height: `${height}px`,
				position: "absolute"
			};
		}
		function perc(num) {
			return num * 100 + "%";
		}
		function constrainWidth(left, currentWidth, newWidth, containerWidth) {
			return left + newWidth > containerWidth ? currentWidth : newWidth;
		}
		function constrainHeight(top, currentHeight, newHeight) {
			return top < 0 ? currentHeight : newHeight;
		}
		function constrainLeft(left) {
			return Math.max(0, left);
		}
		function constrainTop(top) {
			return Math.max(0, top);
		}
		var resizeNorth = (currentSize, newSize, _containerWidth) => {
			const { left, height, width } = newSize;
			const top = currentSize.top - (height - currentSize.height);
			return {
				left,
				width,
				height: constrainHeight(top, currentSize.height, height),
				top: constrainTop(top)
			};
		};
		var resizeEast = (currentSize, newSize, containerWidth) => {
			const { top, left, height, width } = newSize;
			return {
				top,
				height,
				width: constrainWidth(currentSize.left, currentSize.width, width, containerWidth),
				left: constrainLeft(left)
			};
		};
		var resizeWest = (currentSize, newSize, _containerWidth) => {
			const { top, height, width } = newSize;
			const left = currentSize.left + currentSize.width - width;
			if (left < 0) return {
				height,
				width: currentSize.left + currentSize.width,
				top: constrainTop(top),
				left: 0
			};
			return {
				height,
				width,
				top: constrainTop(top),
				left
			};
		};
		var resizeSouth = (currentSize, newSize, _containerWidth) => {
			const { top, left, height, width } = newSize;
			return {
				width,
				left,
				height: constrainHeight(top, currentSize.height, height),
				top: constrainTop(top)
			};
		};
		var resizeNorthEast = (currentSize, newSize, containerWidth) => resizeNorth(currentSize, resizeEast(currentSize, newSize, containerWidth));
		var resizeNorthWest = (currentSize, newSize, containerWidth) => resizeNorth(currentSize, resizeWest(currentSize, newSize));
		var resizeSouthEast = (currentSize, newSize, containerWidth) => resizeSouth(currentSize, resizeEast(currentSize, newSize, containerWidth));
		var resizeSouthWest = (currentSize, newSize, containerWidth) => resizeSouth(currentSize, resizeWest(currentSize, newSize));
		var resizeHandlerMap = {
			n: resizeNorth,
			ne: resizeNorthEast,
			e: resizeEast,
			se: resizeSouthEast,
			s: resizeSouth,
			sw: resizeSouthWest,
			w: resizeWest,
			nw: resizeNorthWest
		};
		function resizeItemInDirection(direction, currentSize, newSize, containerWidth) {
			const handler = resizeHandlerMap[direction];
			if (!handler) return newSize;
			return handler(currentSize, {
				...currentSize,
				...newSize
			}, containerWidth);
		}
		var defaultPositionStrategy = {
			type: "transform",
			scale: 1,
			calcStyle(pos) {
				return setTransform(pos);
			}
		};
		var defaultGridConfig = {
			cols: 12,
			rowHeight: 150,
			margin: [10, 10],
			containerPadding: null,
			maxRows: Infinity
		};
		var defaultDragConfig = {
			enabled: true,
			bounded: false,
			threshold: 3
		};
		var defaultResizeConfig = {
			enabled: true,
			handles: ["se"]
		};
		var defaultDropConfig = {
			enabled: false,
			defaultItem: {
				w: 1,
				h: 1
			}
		};
		function resolveCompactionCollision(layout, item, moveToCoord, axis, hasStatics) {
			const sizeProp = axis === "x" ? "w" : "h";
			item[axis] += 1;
			const itemIndex = layout.findIndex((l) => l.i === item.i);
			const layoutHasStatics = hasStatics ?? getStatics(layout).length > 0;
			for (let i = itemIndex + 1; i < layout.length; i++) {
				const otherItem = layout[i];
				if (otherItem === void 0) continue;
				if (otherItem.static) continue;
				if (!layoutHasStatics && otherItem.y > item.y + item.h) break;
				if (collides(item, otherItem)) resolveCompactionCollision(layout, otherItem, moveToCoord + item[sizeProp], axis, layoutHasStatics);
			}
			item[axis] = moveToCoord;
		}
		function compactItemVertical(compareWith, l, fullLayout, maxY) {
			l.x = Math.max(l.x, 0);
			l.y = Math.max(l.y, 0);
			l.y = Math.min(maxY, l.y);
			while (l.y > 0 && !getFirstCollision(compareWith, l)) l.y--;
			let collision;
			while ((collision = getFirstCollision(compareWith, l)) !== void 0) resolveCompactionCollision(fullLayout, l, collision.y + collision.h, "y");
			l.y = Math.max(l.y, 0);
			return l;
		}
		function compactItemHorizontal(compareWith, l, cols, fullLayout) {
			l.x = Math.max(l.x, 0);
			l.y = Math.max(l.y, 0);
			while (l.x > 0 && !getFirstCollision(compareWith, l)) l.x--;
			let collision;
			while ((collision = getFirstCollision(compareWith, l)) !== void 0) {
				resolveCompactionCollision(fullLayout, l, collision.x + collision.w, "x");
				if (l.x + l.w > cols) {
					l.x = cols - l.w;
					l.y++;
					while (l.x > 0 && !getFirstCollision(compareWith, l)) l.x--;
				}
			}
			l.x = Math.max(l.x, 0);
			return l;
		}
		var verticalCompactor = {
			type: "vertical",
			allowOverlap: false,
			compact(layout, _cols) {
				const compareWith = getStatics(layout);
				let maxY = bottom(compareWith);
				const sorted = sortLayoutItemsByRowCol(layout);
				const out = new Array(layout.length);
				for (let i = 0; i < sorted.length; i++) {
					const sortedItem = sorted[i];
					if (sortedItem === void 0) continue;
					let l = cloneLayoutItem(sortedItem);
					if (!l.static) {
						l = compactItemVertical(compareWith, l, sorted, maxY);
						maxY = Math.max(maxY, l.y + l.h);
						compareWith.push(l);
					}
					const originalIndex = layout.indexOf(sortedItem);
					out[originalIndex] = l;
					l.moved = false;
				}
				return out;
			}
		};
		var horizontalCompactor = {
			type: "horizontal",
			allowOverlap: false,
			compact(layout, cols) {
				const compareWith = getStatics(layout);
				const sorted = sortLayoutItemsByColRow(layout);
				const out = new Array(layout.length);
				for (let i = 0; i < sorted.length; i++) {
					const sortedItem = sorted[i];
					if (sortedItem === void 0) continue;
					let l = cloneLayoutItem(sortedItem);
					if (!l.static) {
						l = compactItemHorizontal(compareWith, l, cols, sorted);
						compareWith.push(l);
					}
					const originalIndex = layout.indexOf(sortedItem);
					out[originalIndex] = l;
					l.moved = false;
				}
				return out;
			}
		};
		var noCompactor = {
			type: null,
			allowOverlap: false,
			compact(layout, _cols) {
				return cloneLayout(layout);
			}
		};
		var verticalOverlapCompactor = {
			...verticalCompactor,
			allowOverlap: true,
			compact(layout, _cols) {
				return cloneLayout(layout);
			}
		};
		var horizontalOverlapCompactor = {
			...horizontalCompactor,
			allowOverlap: true,
			compact(layout, _cols) {
				return cloneLayout(layout);
			}
		};
		var noOverlapCompactor = {
			...noCompactor,
			allowOverlap: true
		};
		function getCompactor(compactType, allowOverlap = false, preventCollision = false) {
			let baseCompactor;
			if (allowOverlap) {
				if (compactType === "vertical") baseCompactor = verticalOverlapCompactor;
				else if (compactType === "horizontal") baseCompactor = horizontalOverlapCompactor;
				else baseCompactor = noOverlapCompactor;
			} else if (compactType === "vertical") baseCompactor = verticalCompactor;
			else if (compactType === "horizontal") baseCompactor = horizontalCompactor;
			else baseCompactor = noCompactor;
			if (preventCollision) return {
				...baseCompactor,
				preventCollision
			};
			return baseCompactor;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/fast-equals@4.0.3/node_modules/fast-equals/dist/fast-equals.cjs.js
		var require_fast_equals_cjs = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			/**
			* Default equality comparator pass-through, used as the standard `isEqual` creator for
			* use inside the built comparator.
			*/
			function createDefaultIsNestedEqual(comparator) {
				return function isEqual(a, b, _indexOrKeyA, _indexOrKeyB, _parentA, _parentB, meta) {
					return comparator(a, b, meta);
				};
			}
			/**
			* Wrap the provided `areItemsEqual` method to manage the circular cache, allowing
			* for circular references to be safely included in the comparison without creating
			* stack overflows.
			*/
			function createIsCircular(areItemsEqual) {
				return function isCircular(a, b, isEqual, cache) {
					if (!a || !b || typeof a !== "object" || typeof b !== "object") return areItemsEqual(a, b, isEqual, cache);
					var cachedA = cache.get(a);
					var cachedB = cache.get(b);
					if (cachedA && cachedB) return cachedA === b && cachedB === a;
					cache.set(a, b);
					cache.set(b, a);
					var result = areItemsEqual(a, b, isEqual, cache);
					cache.delete(a);
					cache.delete(b);
					return result;
				};
			}
			/**
			* Targeted shallow merge of two objects.
			*
			* @NOTE
			* This exists as a tinier compiled version of the `__assign` helper that
			* `tsc` injects in case of `Object.assign` not being present.
			*/
			function merge(a, b) {
				var merged = {};
				for (var key in a) merged[key] = a[key];
				for (var key in b) merged[key] = b[key];
				return merged;
			}
			/**
			* Whether the value is a plain object.
			*
			* @NOTE
			* This is a same-realm compariosn only.
			*/
			function isPlainObject(value) {
				return value.constructor === Object || value.constructor == null;
			}
			/**
			* When the value is `Promise`-like, aka "then-able".
			*/
			function isPromiseLike(value) {
				return typeof value.then === "function";
			}
			/**
			* Whether the values passed are strictly equal or both NaN.
			*/
			function sameValueZeroEqual(a, b) {
				return a === b || a !== a && b !== b;
			}
			var ARGUMENTS_TAG = "[object Arguments]";
			var BOOLEAN_TAG = "[object Boolean]";
			var DATE_TAG = "[object Date]";
			var REG_EXP_TAG = "[object RegExp]";
			var MAP_TAG = "[object Map]";
			var NUMBER_TAG = "[object Number]";
			var OBJECT_TAG = "[object Object]";
			var SET_TAG = "[object Set]";
			var STRING_TAG = "[object String]";
			var toString = Object.prototype.toString;
			function createComparator(_a) {
				var areArraysEqual = _a.areArraysEqual, areDatesEqual = _a.areDatesEqual, areMapsEqual = _a.areMapsEqual, areObjectsEqual = _a.areObjectsEqual, areRegExpsEqual = _a.areRegExpsEqual, areSetsEqual = _a.areSetsEqual, createIsNestedEqual = _a.createIsNestedEqual;
				var isEqual = createIsNestedEqual(comparator);
				/**
				* compare the value of the two objects and return true if they are equivalent in values
				*/
				function comparator(a, b, meta) {
					if (a === b) return true;
					if (!a || !b || typeof a !== "object" || typeof b !== "object") return a !== a && b !== b;
					if (isPlainObject(a) && isPlainObject(b)) return areObjectsEqual(a, b, isEqual, meta);
					var aArray = Array.isArray(a);
					var bArray = Array.isArray(b);
					if (aArray || bArray) return aArray === bArray && areArraysEqual(a, b, isEqual, meta);
					var aTag = toString.call(a);
					if (aTag !== toString.call(b)) return false;
					if (aTag === DATE_TAG) return areDatesEqual(a, b, isEqual, meta);
					if (aTag === REG_EXP_TAG) return areRegExpsEqual(a, b, isEqual, meta);
					if (aTag === MAP_TAG) return areMapsEqual(a, b, isEqual, meta);
					if (aTag === SET_TAG) return areSetsEqual(a, b, isEqual, meta);
					if (aTag === OBJECT_TAG || aTag === ARGUMENTS_TAG) return isPromiseLike(a) || isPromiseLike(b) ? false : areObjectsEqual(a, b, isEqual, meta);
					if (aTag === BOOLEAN_TAG || aTag === NUMBER_TAG || aTag === STRING_TAG) return sameValueZeroEqual(a.valueOf(), b.valueOf());
					return false;
				}
				return comparator;
			}
			/**
			* Whether the arrays are equal in value.
			*/
			function areArraysEqual(a, b, isEqual, meta) {
				var index = a.length;
				if (b.length !== index) return false;
				while (index-- > 0) if (!isEqual(a[index], b[index], index, index, a, b, meta)) return false;
				return true;
			}
			/**
			* Whether the arrays are equal in value, including circular references.
			*/
			var areArraysEqualCircular = createIsCircular(areArraysEqual);
			/**
			* Whether the dates passed are equal in value.
			*
			* @NOTE
			* This is a standalone function instead of done inline in the comparator
			* to allow for overrides.
			*/
			function areDatesEqual(a, b) {
				return sameValueZeroEqual(a.valueOf(), b.valueOf());
			}
			/**
			* Whether the `Map`s are equal in value.
			*/
			function areMapsEqual(a, b, isEqual, meta) {
				var isValueEqual = a.size === b.size;
				if (!isValueEqual) return false;
				if (!a.size) return true;
				var matchedIndices = {};
				var indexA = 0;
				a.forEach(function(aValue, aKey) {
					if (!isValueEqual) return;
					var hasMatch = false;
					var matchIndexB = 0;
					b.forEach(function(bValue, bKey) {
						if (!hasMatch && !matchedIndices[matchIndexB] && (hasMatch = isEqual(aKey, bKey, indexA, matchIndexB, a, b, meta) && isEqual(aValue, bValue, aKey, bKey, a, b, meta))) matchedIndices[matchIndexB] = true;
						matchIndexB++;
					});
					indexA++;
					isValueEqual = hasMatch;
				});
				return isValueEqual;
			}
			/**
			* Whether the `Map`s are equal in value, including circular references.
			*/
			var areMapsEqualCircular = createIsCircular(areMapsEqual);
			var OWNER = "_owner";
			var hasOwnProperty = Object.prototype.hasOwnProperty;
			/**
			* Whether the objects are equal in value.
			*/
			function areObjectsEqual(a, b, isEqual, meta) {
				var keysA = Object.keys(a);
				var index = keysA.length;
				if (Object.keys(b).length !== index) return false;
				var key;
				while (index-- > 0) {
					key = keysA[index];
					if (key === OWNER) {
						var reactElementA = !!a.$$typeof;
						var reactElementB = !!b.$$typeof;
						if ((reactElementA || reactElementB) && reactElementA !== reactElementB) return false;
					}
					if (!hasOwnProperty.call(b, key) || !isEqual(a[key], b[key], key, key, a, b, meta)) return false;
				}
				return true;
			}
			/**
			* Whether the objects are equal in value, including circular references.
			*/
			var areObjectsEqualCircular = createIsCircular(areObjectsEqual);
			/**
			* Whether the regexps passed are equal in value.
			*
			* @NOTE
			* This is a standalone function instead of done inline in the comparator
			* to allow for overrides. An example of this would be supporting a
			* pre-ES2015 environment where the `flags` property is not available.
			*/
			function areRegExpsEqual(a, b) {
				return a.source === b.source && a.flags === b.flags;
			}
			/**
			* Whether the `Set`s are equal in value.
			*/
			function areSetsEqual(a, b, isEqual, meta) {
				var isValueEqual = a.size === b.size;
				if (!isValueEqual) return false;
				if (!a.size) return true;
				var matchedIndices = {};
				a.forEach(function(aValue, aKey) {
					if (!isValueEqual) return;
					var hasMatch = false;
					var matchIndex = 0;
					b.forEach(function(bValue, bKey) {
						if (!hasMatch && !matchedIndices[matchIndex] && (hasMatch = isEqual(aValue, bValue, aKey, bKey, a, b, meta))) matchedIndices[matchIndex] = true;
						matchIndex++;
					});
					isValueEqual = hasMatch;
				});
				return isValueEqual;
			}
			/**
			* Whether the `Set`s are equal in value, including circular references.
			*/
			var areSetsEqualCircular = createIsCircular(areSetsEqual);
			var DEFAULT_CONFIG = Object.freeze({
				areArraysEqual,
				areDatesEqual,
				areMapsEqual,
				areObjectsEqual,
				areRegExpsEqual,
				areSetsEqual,
				createIsNestedEqual: createDefaultIsNestedEqual
			});
			var DEFAULT_CIRCULAR_CONFIG = Object.freeze({
				areArraysEqual: areArraysEqualCircular,
				areDatesEqual,
				areMapsEqual: areMapsEqualCircular,
				areObjectsEqual: areObjectsEqualCircular,
				areRegExpsEqual,
				areSetsEqual: areSetsEqualCircular,
				createIsNestedEqual: createDefaultIsNestedEqual
			});
			var isDeepEqual = createComparator(DEFAULT_CONFIG);
			/**
			* Whether the items passed are deeply-equal in value.
			*/
			function deepEqual(a, b) {
				return isDeepEqual(a, b, void 0);
			}
			createComparator(merge(DEFAULT_CONFIG, { createIsNestedEqual: function() {
				return sameValueZeroEqual;
			} }));
			createComparator(DEFAULT_CIRCULAR_CONFIG);
			createComparator(merge(DEFAULT_CIRCULAR_CONFIG, { createIsNestedEqual: function() {
				return sameValueZeroEqual;
			} }));
			exports.deepEqual = deepEqual;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-grid-layout@2.2.4_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/react-grid-layout/dist/chunk-LY5GT7Q2.mjs
		function getContentWidth(node) {
			const style = typeof globalThis.getComputedStyle === "function" ? globalThis.getComputedStyle(node) : null;
			if (!style) return node.clientWidth;
			const px = (value) => {
				const parsed = Number.parseFloat(value);
				return Number.isFinite(parsed) ? parsed : 0;
			};
			const computed = Number.parseFloat(style.width);
			if (Number.isFinite(computed)) return Math.max(0, computed);
			return Math.max(0, node.clientWidth - px(style.paddingLeft) - px(style.paddingRight));
		}
		function useContainerWidth(options = {}) {
			const { measureBeforeMount = false, initialWidth = 1280 } = options;
			const [width, setWidth] = (0, react.useState)(initialWidth);
			const [mounted, setMounted] = (0, react.useState)(!measureBeforeMount);
			const containerRef = (0, react.useRef)(null);
			const observerRef = (0, react.useRef)(null);
			const measureWidth = (0, react.useCallback)(() => {
				const node = containerRef.current;
				if (node) {
					const newWidth = Math.round(getContentWidth(node));
					setWidth((prev) => prev === newWidth ? prev : newWidth);
					if (!mounted) setMounted(true);
				}
			}, [mounted]);
			(0, react.useEffect)(() => {
				const node = containerRef.current;
				if (!node) return;
				measureWidth();
				if (typeof ResizeObserver !== "undefined") {
					let rafId = null;
					observerRef.current = new ResizeObserver((entries) => {
						const entry = entries[0];
						if (entry) {
							const newWidth = Math.round(entry.contentRect.width);
							if (rafId !== null) cancelAnimationFrame(rafId);
							rafId = requestAnimationFrame(() => {
								setWidth((prev) => prev === newWidth ? prev : newWidth);
								rafId = null;
							});
						}
					});
					observerRef.current.observe(node);
					return () => {
						if (rafId !== null) cancelAnimationFrame(rafId);
						if (observerRef.current) {
							observerRef.current.disconnect();
							observerRef.current = null;
						}
					};
				}
				return () => {
					if (observerRef.current) {
						observerRef.current.disconnect();
						observerRef.current = null;
					}
				};
			}, [measureWidth]);
			return {
				width,
				mounted,
				containerRef,
				measureWidth
			};
		}
		//#endregion
		//#region ../../node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/lib/ReactPropTypesSecret.js
		/**
		* Copyright (c) 2013-present, Facebook, Inc.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*/
		var require_ReactPropTypesSecret = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/factoryWithThrowingShims.js
		/**
		* Copyright (c) 2013-present, Facebook, Inc.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*/
		var require_factoryWithThrowingShims = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var ReactPropTypesSecret = require_ReactPropTypesSecret();
			function emptyFunction() {}
			function emptyFunctionWithReset() {}
			emptyFunctionWithReset.resetWarningCache = emptyFunction;
			module.exports = function() {
				function shim(props, propName, componentName, location, propFullName, secret) {
					if (secret === ReactPropTypesSecret) return;
					var err = /* @__PURE__ */ new Error("Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types");
					err.name = "Invariant Violation";
					throw err;
				}
				shim.isRequired = shim;
				function getShim() {
					return shim;
				}
				var ReactPropTypes = {
					array: shim,
					bigint: shim,
					bool: shim,
					func: shim,
					number: shim,
					object: shim,
					string: shim,
					symbol: shim,
					any: shim,
					arrayOf: getShim,
					element: shim,
					elementType: shim,
					instanceOf: getShim,
					node: shim,
					objectOf: getShim,
					oneOf: getShim,
					oneOfType: getShim,
					shape: getShim,
					exact: getShim,
					checkPropTypes: emptyFunctionWithReset,
					resetWarningCache: emptyFunction
				};
				ReactPropTypes.PropTypes = ReactPropTypes;
				return ReactPropTypes;
			};
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/index.js
		var require_prop_types = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_factoryWithThrowingShims()();
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
		function r$1(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r$1(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r$1(e)) && (n && (n += " "), n += t);
			return n;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/react-draggable@4.7.1_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/react-draggable/build/cjs/chunk-ACOTSM7X.mjs
		var import_prop_types = /* @__PURE__ */ __toESM(require_prop_types(), 1);
		function findInArray(array, callback) {
			for (let i = 0, length = array.length; i < length; i++) if (callback.apply(callback, [
				array[i],
				i,
				array
			])) return array[i];
		}
		function isFunction(func) {
			return typeof func === "function" || Object.prototype.toString.call(func) === "[object Function]";
		}
		function isNum(num) {
			return typeof num === "number" && !isNaN(num);
		}
		function int$1(a) {
			return parseInt(a, 10);
		}
		function dontSetMe(props, propName, componentName) {
			if (props[propName]) return /* @__PURE__ */ new Error(`Invalid prop ${propName} passed to ${componentName} - do not set this, set it on the child.`);
		}
		var prefixes = [
			"Moz",
			"Webkit",
			"O",
			"ms"
		];
		function getPrefix(prop = "transform") {
			var _a, _b;
			if (typeof window === "undefined") return "";
			const style = (_b = (_a = window.document) == null ? void 0 : _a.documentElement) == null ? void 0 : _b.style;
			if (!style) return "";
			if (prop in style) return "";
			for (let i = 0; i < prefixes.length; i++) if (browserPrefixToKey(prop, prefixes[i]) in style) return prefixes[i];
			return "";
		}
		function browserPrefixToKey(prop, prefix) {
			return prefix ? `${prefix}${kebabToTitleCase(prop)}` : prop;
		}
		function kebabToTitleCase(str) {
			let out = "";
			let shouldCapitalize = true;
			for (let i = 0; i < str.length; i++) if (shouldCapitalize) {
				out += str[i].toUpperCase();
				shouldCapitalize = false;
			} else if (str[i] === "-") shouldCapitalize = true;
			else out += str[i];
			return out;
		}
		var getPrefix_default = getPrefix();
		var matchesSelectorFunc = "";
		function matchesSelector(el, selector) {
			var _a;
			if (!matchesSelectorFunc) matchesSelectorFunc = (_a = findInArray([
				"matches",
				"webkitMatchesSelector",
				"mozMatchesSelector",
				"msMatchesSelector",
				"oMatchesSelector"
			], function(method) {
				return isFunction(el[method]);
			})) != null ? _a : "";
			const matchFn = el[matchesSelectorFunc];
			if (!isFunction(matchFn)) return false;
			return Boolean(matchFn.call(el, selector));
		}
		function matchesSelectorAndParentsTo(el, selector, baseNode) {
			let node = el;
			do {
				if (matchesSelector(node, selector)) return true;
				if (node === baseNode) return false;
				node = node.parentNode;
			} while (node);
			return false;
		}
		function addEvent(el, event, handler, inputOptions) {
			if (!el) return;
			const options = {
				capture: true,
				...inputOptions
			};
			const listener = handler;
			if (el.addEventListener) el.addEventListener(event, listener, options);
			else if (el.attachEvent) el.attachEvent("on" + event, listener);
			else el["on" + event] = listener;
		}
		function removeEvent(el, event, handler, inputOptions) {
			if (!el) return;
			const options = {
				capture: true,
				...inputOptions
			};
			const listener = handler;
			if (el.removeEventListener) el.removeEventListener(event, listener, options);
			else if (el.detachEvent) el.detachEvent("on" + event, listener);
			else el["on" + event] = null;
		}
		function outerHeight(node) {
			let height = node.clientHeight;
			const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
			height += int$1(computedStyle.borderTopWidth);
			height += int$1(computedStyle.borderBottomWidth);
			return height;
		}
		function outerWidth(node) {
			let width = node.clientWidth;
			const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
			width += int$1(computedStyle.borderLeftWidth);
			width += int$1(computedStyle.borderRightWidth);
			return width;
		}
		function innerHeight(node) {
			let height = node.clientHeight;
			const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
			height -= int$1(computedStyle.paddingTop);
			height -= int$1(computedStyle.paddingBottom);
			return height;
		}
		function innerWidth(node) {
			let width = node.clientWidth;
			const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
			width -= int$1(computedStyle.paddingLeft);
			width -= int$1(computedStyle.paddingRight);
			return width;
		}
		function offsetXYFromParent(evt, offsetParent, scale) {
			const offsetParentRect = offsetParent === offsetParent.ownerDocument.body ? {
				left: 0,
				top: 0
			} : offsetParent.getBoundingClientRect();
			return {
				x: (evt.clientX + offsetParent.scrollLeft - offsetParentRect.left) / scale,
				y: (evt.clientY + offsetParent.scrollTop - offsetParentRect.top) / scale
			};
		}
		function createCSSTransform(controlPos, positionOffset) {
			const translation = getTranslation(controlPos, positionOffset, "px");
			return { [browserPrefixToKey("transform", getPrefix_default)]: translation };
		}
		function createSVGTransform(controlPos, positionOffset) {
			return getTranslation(controlPos, positionOffset, "");
		}
		function getTranslation({ x, y }, positionOffset, unitSuffix) {
			let translation = `translate(${x}${unitSuffix},${y}${unitSuffix})`;
			if (positionOffset) translation = `translate(${`${typeof positionOffset.x === "string" ? positionOffset.x : positionOffset.x + unitSuffix}`}, ${`${typeof positionOffset.y === "string" ? positionOffset.y : positionOffset.y + unitSuffix}`})` + translation;
			return translation;
		}
		function getTouch(e, identifier) {
			return e.targetTouches && findInArray(e.targetTouches, (t) => identifier === t.identifier) || e.changedTouches && findInArray(e.changedTouches, (t) => identifier === t.identifier);
		}
		function getTouchIdentifier(e) {
			if (e.targetTouches && e.targetTouches[0]) return e.targetTouches[0].identifier;
			if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].identifier;
		}
		function getDefaultNonce() {
			return typeof __webpack_nonce__ !== "undefined" ? __webpack_nonce__ : void 0;
		}
		function addUserSelectStyles(doc, nonce) {
			if (!doc) return;
			let styleEl = doc.getElementById("react-draggable-style-el");
			if (!styleEl) {
				styleEl = doc.createElement("style");
				styleEl.type = "text/css";
				styleEl.id = "react-draggable-style-el";
				const resolvedNonce = nonce != null ? nonce : getDefaultNonce();
				if (resolvedNonce) styleEl.setAttribute("nonce", resolvedNonce);
				styleEl.innerHTML = ".react-draggable-transparent-selection *::-moz-selection {all: inherit;}\n";
				styleEl.innerHTML += ".react-draggable-transparent-selection *::selection {all: inherit;}\n";
				doc.getElementsByTagName("head")[0].appendChild(styleEl);
			}
			if (doc.body) addClassName(doc.body, "react-draggable-transparent-selection");
		}
		function scheduleRemoveUserSelectStyles(doc) {
			if (window.requestAnimationFrame) window.requestAnimationFrame(() => {
				removeUserSelectStyles(doc);
			});
			else removeUserSelectStyles(doc);
		}
		function removeUserSelectStyles(doc) {
			if (!doc) return;
			try {
				if (doc.body) removeClassName(doc.body, "react-draggable-transparent-selection");
				const ieSelection = doc.selection;
				if (ieSelection) ieSelection.empty();
				else {
					const selection = (doc.defaultView || window).getSelection();
					if (selection && selection.type !== "Caret") selection.removeAllRanges();
				}
			} catch {}
		}
		function addClassName(el, className) {
			if (el.classList) el.classList.add(className);
			else if (!el.className.match(new RegExp(`(?:^|\\s)${className}(?!\\S)`))) el.className += ` ${className}`;
		}
		function removeClassName(el, className) {
			if (el.classList) el.classList.remove(className);
			else el.className = el.className.replace(new RegExp(`(?:^|\\s)${className}(?!\\S)`, "g"), "");
		}
		function getBoundPosition(draggable, x, y) {
			if (!draggable.props.bounds) return [x, y];
			let { bounds } = draggable.props;
			bounds = typeof bounds === "string" ? bounds : cloneBounds(bounds);
			const node = findDOMNode(draggable);
			if (typeof bounds === "string") {
				const { ownerDocument } = node;
				const ownerWindow = ownerDocument.defaultView;
				if (!ownerWindow) throw new Error("Cannot resolve the owner window of the draggable node.");
				let boundNode;
				if (bounds === "parent") boundNode = node.parentNode;
				else boundNode = node.getRootNode().querySelector(bounds);
				if (!(boundNode instanceof ownerWindow.HTMLElement)) throw new Error("Bounds selector \"" + bounds + "\" could not find an element.");
				const boundNodeEl = boundNode;
				const nodeStyle = ownerWindow.getComputedStyle(node);
				const boundNodeStyle = ownerWindow.getComputedStyle(boundNodeEl);
				bounds = {
					left: -node.offsetLeft + int$1(boundNodeStyle.paddingLeft) + int$1(nodeStyle.marginLeft),
					top: -node.offsetTop + int$1(boundNodeStyle.paddingTop) + int$1(nodeStyle.marginTop),
					right: innerWidth(boundNodeEl) - outerWidth(node) - node.offsetLeft + int$1(boundNodeStyle.paddingRight) - int$1(nodeStyle.marginRight),
					bottom: innerHeight(boundNodeEl) - outerHeight(node) - node.offsetTop + int$1(boundNodeStyle.paddingBottom) - int$1(nodeStyle.marginBottom)
				};
			}
			if (isNum(bounds.right)) x = Math.min(x, bounds.right);
			if (isNum(bounds.bottom)) y = Math.min(y, bounds.bottom);
			if (isNum(bounds.left)) x = Math.max(x, bounds.left);
			if (isNum(bounds.top)) y = Math.max(y, bounds.top);
			return [x, y];
		}
		function snapToGrid(grid, pendingX, pendingY) {
			return [Math.round(pendingX / grid[0]) * grid[0], Math.round(pendingY / grid[1]) * grid[1]];
		}
		function canDragX(draggable) {
			return draggable.props.axis === "both" || draggable.props.axis === "x";
		}
		function canDragY(draggable) {
			return draggable.props.axis === "both" || draggable.props.axis === "y";
		}
		function getControlPosition(e, touchIdentifier, draggableCore) {
			const touchObj = typeof touchIdentifier === "number" ? getTouch(e, touchIdentifier) : null;
			if (typeof touchIdentifier === "number" && !touchObj) return null;
			const node = findDOMNode(draggableCore);
			const offsetParent = draggableCore.props.offsetParent || node.offsetParent || node.ownerDocument.body;
			return offsetXYFromParent(touchObj || e, offsetParent, draggableCore.props.scale);
		}
		function createCoreData(draggable, x, y) {
			const isStart = !isNum(draggable.lastX);
			const node = findDOMNode(draggable);
			if (isStart) return {
				node,
				deltaX: 0,
				deltaY: 0,
				lastX: x,
				lastY: y,
				x,
				y
			};
			else return {
				node,
				deltaX: x - draggable.lastX,
				deltaY: y - draggable.lastY,
				lastX: draggable.lastX,
				lastY: draggable.lastY,
				x,
				y
			};
		}
		function createDraggableData(draggable, coreData) {
			const scale = draggable.props.scale;
			return {
				node: coreData.node,
				x: draggable.state.x + coreData.deltaX / scale,
				y: draggable.state.y + coreData.deltaY / scale,
				deltaX: coreData.deltaX / scale,
				deltaY: coreData.deltaY / scale,
				lastX: draggable.state.x,
				lastY: draggable.state.y
			};
		}
		function cloneBounds(bounds) {
			return {
				left: bounds.left,
				top: bounds.top,
				right: bounds.right,
				bottom: bounds.bottom
			};
		}
		function findDOMNode(draggable) {
			const node = draggable.findDOMNode();
			if (!node) throw new Error("<DraggableCore>: Unmounted during event!");
			return node;
		}
		var log_default = typeof process !== "undefined" && process.env.DRAGGABLE_DEBUG ? console.log.bind(console) : function noop() {};
		var eventsFor = {
			touch: {
				start: "touchstart",
				move: "touchmove",
				stop: "touchend"
			},
			mouse: {
				start: "mousedown",
				move: "mousemove",
				stop: "mouseup"
			}
		};
		var dragEventFor = eventsFor.mouse;
		var DraggableCore = class extends react.Component {
			constructor() {
				super(...arguments);
				this.dragging = false;
				this.lastX = NaN;
				this.lastY = NaN;
				this.touchIdentifier = null;
				this.mounted = false;
				this.handleDragStart = (e) => {
					this.props.onMouseDown(e);
					if (!this.props.allowAnyClick && (typeof e.button === "number" && e.button !== 0 || e.ctrlKey)) return false;
					const thisNode = this.findDOMNode();
					if (!thisNode || !thisNode.ownerDocument || !thisNode.ownerDocument.body) throw new Error("<DraggableCore> not mounted on DragStart!");
					const { ownerDocument } = thisNode;
					if (this.props.disabled || !(e.target instanceof ownerDocument.defaultView.Node) || this.props.handle && !matchesSelectorAndParentsTo(e.target, this.props.handle, thisNode) || this.props.cancel && matchesSelectorAndParentsTo(e.target, this.props.cancel, thisNode)) return;
					if (e.type === "touchstart" && !this.props.allowMobileScroll) e.preventDefault();
					const touchIdentifier = getTouchIdentifier(e);
					this.touchIdentifier = touchIdentifier;
					const position = getControlPosition(e, touchIdentifier, this);
					if (position == null) return;
					const { x, y } = position;
					const coreEvent = createCoreData(this, x, y);
					log_default("DraggableCore: handleDragStart: %j", coreEvent);
					log_default("calling", this.props.onStart);
					if (this.props.onStart(e, coreEvent) === false || this.mounted === false) return;
					if (this.props.enableUserSelectHack) addUserSelectStyles(ownerDocument, this.props.nonce);
					this.dragging = true;
					this.lastX = x;
					this.lastY = y;
					addEvent(ownerDocument, dragEventFor.move, this.handleDrag);
					addEvent(ownerDocument, dragEventFor.stop, this.handleDragStop);
				};
				this.handleDrag = (e) => {
					const position = getControlPosition(e, this.touchIdentifier, this);
					if (position == null) return;
					let { x, y } = position;
					if (Array.isArray(this.props.grid)) {
						let deltaX = x - this.lastX, deltaY = y - this.lastY;
						[deltaX, deltaY] = snapToGrid(this.props.grid, deltaX, deltaY);
						if (!deltaX && !deltaY) return;
						x = this.lastX + deltaX;
						y = this.lastY + deltaY;
					}
					const coreEvent = createCoreData(this, x, y);
					log_default("DraggableCore: handleDrag: %j", coreEvent);
					if (this.props.onDrag(e, coreEvent) === false || this.mounted === false) {
						try {
							this.handleDragStop(new MouseEvent("mouseup"));
						} catch {
							const event = document.createEvent("MouseEvents");
							event.initMouseEvent("mouseup", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
							this.handleDragStop(event);
						}
						return;
					}
					this.lastX = x;
					this.lastY = y;
				};
				this.handleDragStop = (e) => {
					if (!this.dragging) return;
					const position = getControlPosition(e, this.touchIdentifier, this);
					if (position == null) return;
					let { x, y } = position;
					if (Array.isArray(this.props.grid)) {
						let deltaX = x - this.lastX || 0;
						let deltaY = y - this.lastY || 0;
						[deltaX, deltaY] = snapToGrid(this.props.grid, deltaX, deltaY);
						x = this.lastX + deltaX;
						y = this.lastY + deltaY;
					}
					const coreEvent = createCoreData(this, x, y);
					if (this.props.onStop(e, coreEvent) === false || this.mounted === false) return false;
					const thisNode = this.findDOMNode();
					if (thisNode) {
						if (this.props.enableUserSelectHack) scheduleRemoveUserSelectStyles(thisNode.ownerDocument);
					}
					log_default("DraggableCore: handleDragStop: %j", coreEvent);
					this.dragging = false;
					this.lastX = NaN;
					this.lastY = NaN;
					if (thisNode) {
						log_default("DraggableCore: Removing handlers");
						removeEvent(thisNode.ownerDocument, dragEventFor.move, this.handleDrag);
						removeEvent(thisNode.ownerDocument, dragEventFor.stop, this.handleDragStop);
					}
				};
				this.onMouseDown = (e) => {
					dragEventFor = eventsFor.mouse;
					return this.handleDragStart(e);
				};
				this.onMouseUp = (e) => {
					dragEventFor = eventsFor.mouse;
					return this.handleDragStop(e);
				};
				this.onTouchStart = (e) => {
					dragEventFor = eventsFor.touch;
					return this.handleDragStart(e);
				};
				this.onTouchEnd = (e) => {
					dragEventFor = eventsFor.touch;
					return this.handleDragStop(e);
				};
			}
			componentDidMount() {
				this.mounted = true;
				const thisNode = this.findDOMNode();
				if (thisNode) addEvent(thisNode, eventsFor.touch.start, this.onTouchStart, { passive: false });
			}
			componentWillUnmount() {
				this.mounted = false;
				const thisNode = this.findDOMNode();
				if (thisNode) {
					const { ownerDocument } = thisNode;
					removeEvent(ownerDocument, eventsFor.mouse.move, this.handleDrag);
					removeEvent(ownerDocument, eventsFor.touch.move, this.handleDrag);
					removeEvent(ownerDocument, eventsFor.mouse.stop, this.handleDragStop);
					removeEvent(ownerDocument, eventsFor.touch.stop, this.handleDragStop);
					removeEvent(thisNode, eventsFor.touch.start, this.onTouchStart, { passive: false });
					if (this.props.enableUserSelectHack) scheduleRemoveUserSelectStyles(ownerDocument);
				}
			}
			findDOMNode() {
				var _a;
				if ((_a = this.props) == null ? void 0 : _a.nodeRef) return this.props.nodeRef.current;
				const legacyReactDOM = react_dom.default;
				if (typeof legacyReactDOM.findDOMNode === "function") return legacyReactDOM.findDOMNode(this);
				log_default("react-draggable: ReactDOM.findDOMNode is not available in React 19+. You must provide a nodeRef prop. See: https://github.com/react-grid-layout/react-draggable#noderef");
				return null;
			}
			render() {
				return react.cloneElement(react.Children.only(this.props.children), {
					onMouseDown: this.onMouseDown,
					onMouseUp: this.onMouseUp,
					onTouchEnd: this.onTouchEnd
				});
			}
		};
		DraggableCore.displayName = "DraggableCore";
		DraggableCore.propTypes = {
			/**
			* `allowAnyClick` allows dragging using any mouse button.
			* By default, we only accept the left button.
			*
			* Defaults to `false`.
			*/
			allowAnyClick: import_prop_types.default.bool,
			/**
			* `allowMobileScroll` turns off cancellation of the 'touchstart' event
			* on mobile devices. Only enable this if you are having trouble with click
			* events. Prefer using 'handle' / 'cancel' instead.
			*
			* Defaults to `false`.
			*/
			allowMobileScroll: import_prop_types.default.bool,
			children: import_prop_types.default.node.isRequired,
			/**
			* `disabled`, if true, stops the <Draggable> from dragging. All handlers,
			* with the exception of `onMouseDown`, will not fire.
			*/
			disabled: import_prop_types.default.bool,
			/**
			* By default, we add 'user-select:none' attributes to the document body
			* to prevent ugly text selection during drag. If this is causing problems
			* for your app, set this to `false`.
			*/
			enableUserSelectHack: import_prop_types.default.bool,
			/**
			* `offsetParent`, if set, uses the passed DOM node to compute drag offsets
			* instead of using the parent node.
			*/
			offsetParent: function(props, propName) {
				if (props[propName] && props[propName].nodeType !== 1) throw new Error("Draggable's offsetParent must be a DOM Node.");
			},
			/**
			* `grid` specifies the x and y that dragging should snap to.
			*/
			grid: import_prop_types.default.arrayOf(import_prop_types.default.number),
			/**
			* `handle` specifies a selector to be used as the handle that initiates drag.
			*
			* Example:
			*
			* ```jsx
			*   let App = React.createClass({
			*       render: function () {
			*         return (
			*            <Draggable handle=".handle">
			*              <div>
			*                  <div className="handle">Click me to drag</div>
			*                  <div>This is some other content</div>
			*              </div>
			*           </Draggable>
			*         );
			*       }
			*   });
			* ```
			*/
			handle: import_prop_types.default.string,
			/**
			* `cancel` specifies a selector to be used to prevent drag initialization.
			*
			* Example:
			*
			* ```jsx
			*   let App = React.createClass({
			*       render: function () {
			*           return(
			*               <Draggable cancel=".cancel">
			*                   <div>
			*                     <div className="cancel">You can't drag from here</div>
			*                     <div>Dragging here works fine</div>
			*                   </div>
			*               </Draggable>
			*           );
			*       }
			*   });
			* ```
			*/
			cancel: import_prop_types.default.string,
			nodeRef: import_prop_types.default.object,
			/**
			* `nonce` is applied to the dynamically-injected <style> element used by the
			* user-select hack, so it isn't blocked under a strict Content Security
			* Policy (`style-src` without `'unsafe-inline'`). If omitted, webpack's
			* `__webpack_nonce__` global is used when available.
			*/
			nonce: import_prop_types.default.string,
			/**
			* Called when dragging starts.
			* If this function returns the boolean false, dragging will be canceled.
			*/
			onStart: import_prop_types.default.func,
			/**
			* Called while dragging.
			* If this function returns the boolean false, dragging will be canceled.
			*/
			onDrag: import_prop_types.default.func,
			/**
			* Called when dragging stops.
			* If this function returns the boolean false, the drag will remain active.
			*/
			onStop: import_prop_types.default.func,
			/**
			* A workaround option which can be passed if onMouseDown needs to be accessed,
			* since it'll always be blocked (as there is internal use of onMouseDown)
			*/
			onMouseDown: import_prop_types.default.func,
			/**
			* `scale`, if set, applies scaling while dragging an element
			*/
			scale: import_prop_types.default.number,
			/**
			* These properties should be defined on the child, not here.
			*/
			className: dontSetMe,
			style: dontSetMe,
			transform: dontSetMe
		};
		DraggableCore.defaultProps = {
			allowAnyClick: false,
			allowMobileScroll: false,
			disabled: false,
			enableUserSelectHack: true,
			onStart: function() {},
			onDrag: function() {},
			onStop: function() {},
			onMouseDown: function() {},
			scale: 1
		};
		var Draggable = class extends react.Component {
			constructor(props) {
				super(props);
				this.onDragStart = (e, coreData) => {
					log_default("Draggable: onDragStart: %j", coreData);
					if (this.props.onStart(e, createDraggableData(this, coreData)) === false) return false;
					this.setState({
						dragging: true,
						dragged: true
					});
				};
				this.onDrag = (e, coreData) => {
					if (!this.state.dragging) return false;
					log_default("Draggable: onDrag: %j", coreData);
					const uiData = createDraggableData(this, coreData);
					const newState = {
						x: uiData.x,
						y: uiData.y,
						slackX: 0,
						slackY: 0
					};
					if (this.props.bounds) {
						const { x, y } = newState;
						newState.x += this.state.slackX;
						newState.y += this.state.slackY;
						const [newStateX, newStateY] = getBoundPosition(this, newState.x, newState.y);
						newState.x = newStateX;
						newState.y = newStateY;
						newState.slackX = this.state.slackX + (x - newState.x);
						newState.slackY = this.state.slackY + (y - newState.y);
						uiData.x = newState.x;
						uiData.y = newState.y;
						uiData.deltaX = newState.x - this.state.x;
						uiData.deltaY = newState.y - this.state.y;
					}
					if (this.props.onDrag(e, uiData) === false) return false;
					this.setState(newState);
				};
				this.onDragStop = (e, coreData) => {
					if (!this.state.dragging) return false;
					if (this.props.onStop(e, createDraggableData(this, coreData)) === false) return false;
					log_default("Draggable: onDragStop: %j", coreData);
					const newState = {
						dragging: false,
						slackX: 0,
						slackY: 0
					};
					if (Boolean(this.props.position)) {
						const { x, y } = this.props.position;
						newState.x = x;
						newState.y = y;
					}
					this.setState(newState);
				};
				this.state = {
					dragging: false,
					dragged: false,
					x: props.position ? props.position.x : props.defaultPosition.x,
					y: props.position ? props.position.y : props.defaultPosition.y,
					prevPropsPosition: { ...props.position },
					slackX: 0,
					slackY: 0,
					isElementSVG: false
				};
				if (props.position && !(props.onDrag || props.onStop)) console.warn("A `position` was applied to this <Draggable>, without drag handlers. This will make this component effectively undraggable. Please attach `onDrag` or `onStop` handlers so you can adjust the `position` of this element.");
			}
			static getDerivedStateFromProps({ position }, { prevPropsPosition }) {
				if (position && (!prevPropsPosition || position.x !== prevPropsPosition.x || position.y !== prevPropsPosition.y)) {
					log_default("Draggable: getDerivedStateFromProps %j", {
						position,
						prevPropsPosition
					});
					return {
						x: position.x,
						y: position.y,
						prevPropsPosition: { ...position }
					};
				}
				return null;
			}
			componentDidMount() {
				if (typeof window.SVGElement !== "undefined" && this.findDOMNode() instanceof window.SVGElement) this.setState({ isElementSVG: true });
			}
			componentWillUnmount() {
				if (this.state.dragging) this.setState({ dragging: false });
			}
			findDOMNode() {
				var _a;
				if ((_a = this.props) == null ? void 0 : _a.nodeRef) return this.props.nodeRef.current;
				const legacyReactDOM = react_dom.default;
				if (typeof legacyReactDOM.findDOMNode === "function") return legacyReactDOM.findDOMNode(this);
				return null;
			}
			render() {
				const { axis, bounds, children, defaultPosition, defaultClassName, defaultClassNameDragging, defaultClassNameDragged, position, positionOffset, scale, ...draggableCoreProps } = this.props;
				let style = {};
				let svgTransform = null;
				const draggable = !Boolean(position) || this.state.dragging;
				const validPosition = position || defaultPosition;
				const transformOpts = {
					x: canDragX(this) && draggable ? this.state.x : validPosition.x,
					y: canDragY(this) && draggable ? this.state.y : validPosition.y
				};
				if (this.state.isElementSVG) svgTransform = createSVGTransform(transformOpts, positionOffset);
				else style = createCSSTransform(transformOpts, positionOffset);
				const onlyChild = react.Children.only(children);
				const className = clsx(onlyChild.props.className || "", defaultClassName, {
					[defaultClassNameDragging]: this.state.dragging,
					[defaultClassNameDragged]: this.state.dragged
				});
				return /* @__PURE__ */ react.createElement(DraggableCore, {
					...draggableCoreProps,
					onStart: this.onDragStart,
					onDrag: this.onDrag,
					onStop: this.onDragStop
				}, react.cloneElement(onlyChild, {
					className,
					style: {
						...onlyChild.props.style,
						...style
					},
					transform: svgTransform
				}));
			}
		};
		Draggable.displayName = "Draggable";
		Draggable.propTypes = {
			...DraggableCore.propTypes,
			/**
			* `axis` determines which axis the draggable can move.
			*
			*  Note that all callbacks will still return data as normal. This only
			*  controls flushing to the DOM.
			*
			* 'both' allows movement horizontally and vertically.
			* 'x' limits movement to horizontal axis.
			* 'y' limits movement to vertical axis.
			* 'none' limits all movement.
			*
			* Defaults to 'both'.
			*/
			axis: import_prop_types.default.oneOf([
				"both",
				"x",
				"y",
				"none"
			]),
			/**
			* `bounds` determines the range of movement available to the element.
			* Available values are:
			*
			* 'parent' restricts movement within the Draggable's parent node.
			*
			* Alternatively, pass an object with the following properties, all of which are optional:
			*
			* {left: LEFT_BOUND, right: RIGHT_BOUND, bottom: BOTTOM_BOUND, top: TOP_BOUND}
			*
			* All values are in px.
			*
			* Example:
			*
			* ```jsx
			*   let App = React.createClass({
			*       render: function () {
			*         return (
			*            <Draggable bounds={{right: 300, bottom: 300}}>
			*              <div>Content</div>
			*           </Draggable>
			*         );
			*       }
			*   });
			* ```
			*/
			bounds: import_prop_types.default.oneOfType([
				import_prop_types.default.shape({
					left: import_prop_types.default.number,
					right: import_prop_types.default.number,
					top: import_prop_types.default.number,
					bottom: import_prop_types.default.number
				}),
				import_prop_types.default.string,
				import_prop_types.default.oneOf([false])
			]),
			defaultClassName: import_prop_types.default.string,
			defaultClassNameDragging: import_prop_types.default.string,
			defaultClassNameDragged: import_prop_types.default.string,
			/**
			* `defaultPosition` specifies the x and y that the dragged item should start at
			*
			* Example:
			*
			* ```jsx
			*      let App = React.createClass({
			*          render: function () {
			*              return (
			*                  <Draggable defaultPosition={{x: 25, y: 25}}>
			*                      <div>I start with transformX: 25px and transformY: 25px;</div>
			*                  </Draggable>
			*              );
			*          }
			*      });
			* ```
			*/
			defaultPosition: import_prop_types.default.shape({
				x: import_prop_types.default.number,
				y: import_prop_types.default.number
			}),
			positionOffset: import_prop_types.default.shape({
				x: import_prop_types.default.oneOfType([import_prop_types.default.number, import_prop_types.default.string]),
				y: import_prop_types.default.oneOfType([import_prop_types.default.number, import_prop_types.default.string])
			}),
			/**
			* `position`, if present, defines the current position of the element.
			*
			*  This is similar to how form elements in React work - if no `position` is supplied, the component
			*  is uncontrolled.
			*
			* Example:
			*
			* ```jsx
			*      let App = React.createClass({
			*          render: function () {
			*              return (
			*                  <Draggable position={{x: 25, y: 25}}>
			*                      <div>I start with transformX: 25px and transformY: 25px;</div>
			*                  </Draggable>
			*              );
			*          }
			*      });
			* ```
			*/
			position: import_prop_types.default.shape({
				x: import_prop_types.default.number,
				y: import_prop_types.default.number
			}),
			/**
			* These properties should be defined on the child, not here.
			*/
			className: dontSetMe,
			style: dontSetMe,
			transform: dontSetMe
		};
		Draggable.defaultProps = {
			...DraggableCore.defaultProps,
			axis: "both",
			bounds: false,
			defaultClassName: "react-draggable",
			defaultClassNameDragging: "react-draggable-dragging",
			defaultClassNameDragged: "react-draggable-dragged",
			defaultPosition: {
				x: 0,
				y: 0
			},
			scale: 1
		};
		//#endregion
		//#region ../../node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.js
		var require_clsx = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			function r(e) {
				var o, t, f = "";
				if ("string" == typeof e || "number" == typeof e) f += e;
				else if ("object" == typeof e) if (Array.isArray(e)) {
					var n = e.length;
					for (o = 0; o < n; o++) e[o] && (t = r(e[o])) && (f && (f += " "), f += t);
				} else for (t in e) e[t] && (f && (f += " "), f += t);
				return f;
			}
			function e() {
				for (var e, o, t = 0, f = "", n = arguments.length; t < n; t++) (e = arguments[t]) && (o = r(e)) && (f && (f += " "), f += o);
				return f;
			}
			module.exports = e, module.exports.clsx = e;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-draggable@4.7.1_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/react-draggable/build/cjs/Draggable.js
		var require_Draggable = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var __create = Object.create;
			var __defProp = Object.defineProperty;
			var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
			var __getOwnPropNames = Object.getOwnPropertyNames;
			var __getProtoOf = Object.getPrototypeOf;
			var __hasOwnProp = Object.prototype.hasOwnProperty;
			var __export = (target, all) => {
				for (var name in all) __defProp(target, name, {
					get: all[name],
					enumerable: true
				});
			};
			var __copyProps = (to, from, except, desc) => {
				if (from && typeof from === "object" || typeof from === "function") {
					for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
						get: () => from[key],
						enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
					});
				}
				return to;
			};
			var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
				value: mod,
				enumerable: true
			}) : target, mod));
			var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
			var Draggable_exports = {};
			__export(Draggable_exports, {
				DraggableCore: () => DraggableCore,
				default: () => Draggable
			});
			module.exports = __toCommonJS(Draggable_exports);
			var React2$1 = __toESM(require("react"));
			var import_prop_types2 = __toESM(require_prop_types());
			var import_react_dom2 = __toESM(require("react-dom"));
			var import_clsx = require_clsx();
			function findInArray(array, callback) {
				for (let i = 0, length = array.length; i < length; i++) if (callback.apply(callback, [
					array[i],
					i,
					array
				])) return array[i];
			}
			function isFunction(func) {
				return typeof func === "function" || Object.prototype.toString.call(func) === "[object Function]";
			}
			function isNum(num) {
				return typeof num === "number" && !isNaN(num);
			}
			function int(a) {
				return parseInt(a, 10);
			}
			function dontSetMe(props, propName, componentName) {
				if (props[propName]) return /* @__PURE__ */ new Error(`Invalid prop ${propName} passed to ${componentName} - do not set this, set it on the child.`);
			}
			var prefixes = [
				"Moz",
				"Webkit",
				"O",
				"ms"
			];
			function getPrefix(prop = "transform") {
				var _a, _b;
				if (typeof window === "undefined") return "";
				const style = (_b = (_a = window.document) == null ? void 0 : _a.documentElement) == null ? void 0 : _b.style;
				if (!style) return "";
				if (prop in style) return "";
				for (let i = 0; i < prefixes.length; i++) if (browserPrefixToKey(prop, prefixes[i]) in style) return prefixes[i];
				return "";
			}
			function browserPrefixToKey(prop, prefix) {
				return prefix ? `${prefix}${kebabToTitleCase(prop)}` : prop;
			}
			function kebabToTitleCase(str) {
				let out = "";
				let shouldCapitalize = true;
				for (let i = 0; i < str.length; i++) if (shouldCapitalize) {
					out += str[i].toUpperCase();
					shouldCapitalize = false;
				} else if (str[i] === "-") shouldCapitalize = true;
				else out += str[i];
				return out;
			}
			var getPrefix_default = getPrefix();
			var matchesSelectorFunc = "";
			function matchesSelector(el, selector) {
				var _a;
				if (!matchesSelectorFunc) matchesSelectorFunc = (_a = findInArray([
					"matches",
					"webkitMatchesSelector",
					"mozMatchesSelector",
					"msMatchesSelector",
					"oMatchesSelector"
				], function(method) {
					return isFunction(el[method]);
				})) != null ? _a : "";
				const matchFn = el[matchesSelectorFunc];
				if (!isFunction(matchFn)) return false;
				return Boolean(matchFn.call(el, selector));
			}
			function matchesSelectorAndParentsTo(el, selector, baseNode) {
				let node = el;
				do {
					if (matchesSelector(node, selector)) return true;
					if (node === baseNode) return false;
					node = node.parentNode;
				} while (node);
				return false;
			}
			function addEvent(el, event, handler, inputOptions) {
				if (!el) return;
				const options = {
					capture: true,
					...inputOptions
				};
				const listener = handler;
				if (el.addEventListener) el.addEventListener(event, listener, options);
				else if (el.attachEvent) el.attachEvent("on" + event, listener);
				else el["on" + event] = listener;
			}
			function removeEvent(el, event, handler, inputOptions) {
				if (!el) return;
				const options = {
					capture: true,
					...inputOptions
				};
				const listener = handler;
				if (el.removeEventListener) el.removeEventListener(event, listener, options);
				else if (el.detachEvent) el.detachEvent("on" + event, listener);
				else el["on" + event] = null;
			}
			function outerHeight(node) {
				let height = node.clientHeight;
				const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
				height += int(computedStyle.borderTopWidth);
				height += int(computedStyle.borderBottomWidth);
				return height;
			}
			function outerWidth(node) {
				let width = node.clientWidth;
				const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
				width += int(computedStyle.borderLeftWidth);
				width += int(computedStyle.borderRightWidth);
				return width;
			}
			function innerHeight(node) {
				let height = node.clientHeight;
				const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
				height -= int(computedStyle.paddingTop);
				height -= int(computedStyle.paddingBottom);
				return height;
			}
			function innerWidth(node) {
				let width = node.clientWidth;
				const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
				width -= int(computedStyle.paddingLeft);
				width -= int(computedStyle.paddingRight);
				return width;
			}
			function offsetXYFromParent(evt, offsetParent, scale) {
				const offsetParentRect = offsetParent === offsetParent.ownerDocument.body ? {
					left: 0,
					top: 0
				} : offsetParent.getBoundingClientRect();
				return {
					x: (evt.clientX + offsetParent.scrollLeft - offsetParentRect.left) / scale,
					y: (evt.clientY + offsetParent.scrollTop - offsetParentRect.top) / scale
				};
			}
			function createCSSTransform(controlPos, positionOffset) {
				const translation = getTranslation(controlPos, positionOffset, "px");
				return { [browserPrefixToKey("transform", getPrefix_default)]: translation };
			}
			function createSVGTransform(controlPos, positionOffset) {
				return getTranslation(controlPos, positionOffset, "");
			}
			function getTranslation({ x, y }, positionOffset, unitSuffix) {
				let translation = `translate(${x}${unitSuffix},${y}${unitSuffix})`;
				if (positionOffset) translation = `translate(${`${typeof positionOffset.x === "string" ? positionOffset.x : positionOffset.x + unitSuffix}`}, ${`${typeof positionOffset.y === "string" ? positionOffset.y : positionOffset.y + unitSuffix}`})` + translation;
				return translation;
			}
			function getTouch(e, identifier) {
				return e.targetTouches && findInArray(e.targetTouches, (t) => identifier === t.identifier) || e.changedTouches && findInArray(e.changedTouches, (t) => identifier === t.identifier);
			}
			function getTouchIdentifier(e) {
				if (e.targetTouches && e.targetTouches[0]) return e.targetTouches[0].identifier;
				if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].identifier;
			}
			function getDefaultNonce() {
				return typeof __webpack_nonce__ !== "undefined" ? __webpack_nonce__ : void 0;
			}
			function addUserSelectStyles(doc, nonce) {
				if (!doc) return;
				let styleEl = doc.getElementById("react-draggable-style-el");
				if (!styleEl) {
					styleEl = doc.createElement("style");
					styleEl.type = "text/css";
					styleEl.id = "react-draggable-style-el";
					const resolvedNonce = nonce != null ? nonce : getDefaultNonce();
					if (resolvedNonce) styleEl.setAttribute("nonce", resolvedNonce);
					styleEl.innerHTML = ".react-draggable-transparent-selection *::-moz-selection {all: inherit;}\n";
					styleEl.innerHTML += ".react-draggable-transparent-selection *::selection {all: inherit;}\n";
					doc.getElementsByTagName("head")[0].appendChild(styleEl);
				}
				if (doc.body) addClassName(doc.body, "react-draggable-transparent-selection");
			}
			function scheduleRemoveUserSelectStyles(doc) {
				if (window.requestAnimationFrame) window.requestAnimationFrame(() => {
					removeUserSelectStyles(doc);
				});
				else removeUserSelectStyles(doc);
			}
			function removeUserSelectStyles(doc) {
				if (!doc) return;
				try {
					if (doc.body) removeClassName(doc.body, "react-draggable-transparent-selection");
					const ieSelection = doc.selection;
					if (ieSelection) ieSelection.empty();
					else {
						const selection = (doc.defaultView || window).getSelection();
						if (selection && selection.type !== "Caret") selection.removeAllRanges();
					}
				} catch {}
			}
			function addClassName(el, className) {
				if (el.classList) el.classList.add(className);
				else if (!el.className.match(new RegExp(`(?:^|\\s)${className}(?!\\S)`))) el.className += ` ${className}`;
			}
			function removeClassName(el, className) {
				if (el.classList) el.classList.remove(className);
				else el.className = el.className.replace(new RegExp(`(?:^|\\s)${className}(?!\\S)`, "g"), "");
			}
			function getBoundPosition(draggable, x, y) {
				if (!draggable.props.bounds) return [x, y];
				let { bounds } = draggable.props;
				bounds = typeof bounds === "string" ? bounds : cloneBounds(bounds);
				const node = findDOMNode(draggable);
				if (typeof bounds === "string") {
					const { ownerDocument } = node;
					const ownerWindow = ownerDocument.defaultView;
					if (!ownerWindow) throw new Error("Cannot resolve the owner window of the draggable node.");
					let boundNode;
					if (bounds === "parent") boundNode = node.parentNode;
					else boundNode = node.getRootNode().querySelector(bounds);
					if (!(boundNode instanceof ownerWindow.HTMLElement)) throw new Error("Bounds selector \"" + bounds + "\" could not find an element.");
					const boundNodeEl = boundNode;
					const nodeStyle = ownerWindow.getComputedStyle(node);
					const boundNodeStyle = ownerWindow.getComputedStyle(boundNodeEl);
					bounds = {
						left: -node.offsetLeft + int(boundNodeStyle.paddingLeft) + int(nodeStyle.marginLeft),
						top: -node.offsetTop + int(boundNodeStyle.paddingTop) + int(nodeStyle.marginTop),
						right: innerWidth(boundNodeEl) - outerWidth(node) - node.offsetLeft + int(boundNodeStyle.paddingRight) - int(nodeStyle.marginRight),
						bottom: innerHeight(boundNodeEl) - outerHeight(node) - node.offsetTop + int(boundNodeStyle.paddingBottom) - int(nodeStyle.marginBottom)
					};
				}
				if (isNum(bounds.right)) x = Math.min(x, bounds.right);
				if (isNum(bounds.bottom)) y = Math.min(y, bounds.bottom);
				if (isNum(bounds.left)) x = Math.max(x, bounds.left);
				if (isNum(bounds.top)) y = Math.max(y, bounds.top);
				return [x, y];
			}
			function snapToGrid(grid, pendingX, pendingY) {
				return [Math.round(pendingX / grid[0]) * grid[0], Math.round(pendingY / grid[1]) * grid[1]];
			}
			function canDragX(draggable) {
				return draggable.props.axis === "both" || draggable.props.axis === "x";
			}
			function canDragY(draggable) {
				return draggable.props.axis === "both" || draggable.props.axis === "y";
			}
			function getControlPosition(e, touchIdentifier, draggableCore) {
				const touchObj = typeof touchIdentifier === "number" ? getTouch(e, touchIdentifier) : null;
				if (typeof touchIdentifier === "number" && !touchObj) return null;
				const node = findDOMNode(draggableCore);
				const offsetParent = draggableCore.props.offsetParent || node.offsetParent || node.ownerDocument.body;
				return offsetXYFromParent(touchObj || e, offsetParent, draggableCore.props.scale);
			}
			function createCoreData(draggable, x, y) {
				const isStart = !isNum(draggable.lastX);
				const node = findDOMNode(draggable);
				if (isStart) return {
					node,
					deltaX: 0,
					deltaY: 0,
					lastX: x,
					lastY: y,
					x,
					y
				};
				else return {
					node,
					deltaX: x - draggable.lastX,
					deltaY: y - draggable.lastY,
					lastX: draggable.lastX,
					lastY: draggable.lastY,
					x,
					y
				};
			}
			function createDraggableData(draggable, coreData) {
				const scale = draggable.props.scale;
				return {
					node: coreData.node,
					x: draggable.state.x + coreData.deltaX / scale,
					y: draggable.state.y + coreData.deltaY / scale,
					deltaX: coreData.deltaX / scale,
					deltaY: coreData.deltaY / scale,
					lastX: draggable.state.x,
					lastY: draggable.state.y
				};
			}
			function cloneBounds(bounds) {
				return {
					left: bounds.left,
					top: bounds.top,
					right: bounds.right,
					bottom: bounds.bottom
				};
			}
			function findDOMNode(draggable) {
				const node = draggable.findDOMNode();
				if (!node) throw new Error("<DraggableCore>: Unmounted during event!");
				return node;
			}
			var React$2 = __toESM(require("react"));
			var import_prop_types = __toESM(require_prop_types());
			var import_react_dom = __toESM(require("react-dom"));
			var log_default = typeof process !== "undefined" && process.env.DRAGGABLE_DEBUG ? console.log.bind(console) : function noop() {};
			var eventsFor = {
				touch: {
					start: "touchstart",
					move: "touchmove",
					stop: "touchend"
				},
				mouse: {
					start: "mousedown",
					move: "mousemove",
					stop: "mouseup"
				}
			};
			var dragEventFor = eventsFor.mouse;
			var DraggableCore = class extends React$2.Component {
				constructor() {
					super(...arguments);
					this.dragging = false;
					this.lastX = NaN;
					this.lastY = NaN;
					this.touchIdentifier = null;
					this.mounted = false;
					this.handleDragStart = (e) => {
						this.props.onMouseDown(e);
						if (!this.props.allowAnyClick && (typeof e.button === "number" && e.button !== 0 || e.ctrlKey)) return false;
						const thisNode = this.findDOMNode();
						if (!thisNode || !thisNode.ownerDocument || !thisNode.ownerDocument.body) throw new Error("<DraggableCore> not mounted on DragStart!");
						const { ownerDocument } = thisNode;
						if (this.props.disabled || !(e.target instanceof ownerDocument.defaultView.Node) || this.props.handle && !matchesSelectorAndParentsTo(e.target, this.props.handle, thisNode) || this.props.cancel && matchesSelectorAndParentsTo(e.target, this.props.cancel, thisNode)) return;
						if (e.type === "touchstart" && !this.props.allowMobileScroll) e.preventDefault();
						const touchIdentifier = getTouchIdentifier(e);
						this.touchIdentifier = touchIdentifier;
						const position = getControlPosition(e, touchIdentifier, this);
						if (position == null) return;
						const { x, y } = position;
						const coreEvent = createCoreData(this, x, y);
						log_default("DraggableCore: handleDragStart: %j", coreEvent);
						log_default("calling", this.props.onStart);
						if (this.props.onStart(e, coreEvent) === false || this.mounted === false) return;
						if (this.props.enableUserSelectHack) addUserSelectStyles(ownerDocument, this.props.nonce);
						this.dragging = true;
						this.lastX = x;
						this.lastY = y;
						addEvent(ownerDocument, dragEventFor.move, this.handleDrag);
						addEvent(ownerDocument, dragEventFor.stop, this.handleDragStop);
					};
					this.handleDrag = (e) => {
						const position = getControlPosition(e, this.touchIdentifier, this);
						if (position == null) return;
						let { x, y } = position;
						if (Array.isArray(this.props.grid)) {
							let deltaX = x - this.lastX, deltaY = y - this.lastY;
							[deltaX, deltaY] = snapToGrid(this.props.grid, deltaX, deltaY);
							if (!deltaX && !deltaY) return;
							x = this.lastX + deltaX;
							y = this.lastY + deltaY;
						}
						const coreEvent = createCoreData(this, x, y);
						log_default("DraggableCore: handleDrag: %j", coreEvent);
						if (this.props.onDrag(e, coreEvent) === false || this.mounted === false) {
							try {
								this.handleDragStop(new MouseEvent("mouseup"));
							} catch {
								const event = document.createEvent("MouseEvents");
								event.initMouseEvent("mouseup", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
								this.handleDragStop(event);
							}
							return;
						}
						this.lastX = x;
						this.lastY = y;
					};
					this.handleDragStop = (e) => {
						if (!this.dragging) return;
						const position = getControlPosition(e, this.touchIdentifier, this);
						if (position == null) return;
						let { x, y } = position;
						if (Array.isArray(this.props.grid)) {
							let deltaX = x - this.lastX || 0;
							let deltaY = y - this.lastY || 0;
							[deltaX, deltaY] = snapToGrid(this.props.grid, deltaX, deltaY);
							x = this.lastX + deltaX;
							y = this.lastY + deltaY;
						}
						const coreEvent = createCoreData(this, x, y);
						if (this.props.onStop(e, coreEvent) === false || this.mounted === false) return false;
						const thisNode = this.findDOMNode();
						if (thisNode) {
							if (this.props.enableUserSelectHack) scheduleRemoveUserSelectStyles(thisNode.ownerDocument);
						}
						log_default("DraggableCore: handleDragStop: %j", coreEvent);
						this.dragging = false;
						this.lastX = NaN;
						this.lastY = NaN;
						if (thisNode) {
							log_default("DraggableCore: Removing handlers");
							removeEvent(thisNode.ownerDocument, dragEventFor.move, this.handleDrag);
							removeEvent(thisNode.ownerDocument, dragEventFor.stop, this.handleDragStop);
						}
					};
					this.onMouseDown = (e) => {
						dragEventFor = eventsFor.mouse;
						return this.handleDragStart(e);
					};
					this.onMouseUp = (e) => {
						dragEventFor = eventsFor.mouse;
						return this.handleDragStop(e);
					};
					this.onTouchStart = (e) => {
						dragEventFor = eventsFor.touch;
						return this.handleDragStart(e);
					};
					this.onTouchEnd = (e) => {
						dragEventFor = eventsFor.touch;
						return this.handleDragStop(e);
					};
				}
				componentDidMount() {
					this.mounted = true;
					const thisNode = this.findDOMNode();
					if (thisNode) addEvent(thisNode, eventsFor.touch.start, this.onTouchStart, { passive: false });
				}
				componentWillUnmount() {
					this.mounted = false;
					const thisNode = this.findDOMNode();
					if (thisNode) {
						const { ownerDocument } = thisNode;
						removeEvent(ownerDocument, eventsFor.mouse.move, this.handleDrag);
						removeEvent(ownerDocument, eventsFor.touch.move, this.handleDrag);
						removeEvent(ownerDocument, eventsFor.mouse.stop, this.handleDragStop);
						removeEvent(ownerDocument, eventsFor.touch.stop, this.handleDragStop);
						removeEvent(thisNode, eventsFor.touch.start, this.onTouchStart, { passive: false });
						if (this.props.enableUserSelectHack) scheduleRemoveUserSelectStyles(ownerDocument);
					}
				}
				findDOMNode() {
					var _a;
					if ((_a = this.props) == null ? void 0 : _a.nodeRef) return this.props.nodeRef.current;
					const legacyReactDOM = import_react_dom.default;
					if (typeof legacyReactDOM.findDOMNode === "function") return legacyReactDOM.findDOMNode(this);
					log_default("react-draggable: ReactDOM.findDOMNode is not available in React 19+. You must provide a nodeRef prop. See: https://github.com/react-grid-layout/react-draggable#noderef");
					return null;
				}
				render() {
					return React$2.cloneElement(React$2.Children.only(this.props.children), {
						onMouseDown: this.onMouseDown,
						onMouseUp: this.onMouseUp,
						onTouchEnd: this.onTouchEnd
					});
				}
			};
			DraggableCore.displayName = "DraggableCore";
			DraggableCore.propTypes = {
				/**
				* `allowAnyClick` allows dragging using any mouse button.
				* By default, we only accept the left button.
				*
				* Defaults to `false`.
				*/
				allowAnyClick: import_prop_types.default.bool,
				/**
				* `allowMobileScroll` turns off cancellation of the 'touchstart' event
				* on mobile devices. Only enable this if you are having trouble with click
				* events. Prefer using 'handle' / 'cancel' instead.
				*
				* Defaults to `false`.
				*/
				allowMobileScroll: import_prop_types.default.bool,
				children: import_prop_types.default.node.isRequired,
				/**
				* `disabled`, if true, stops the <Draggable> from dragging. All handlers,
				* with the exception of `onMouseDown`, will not fire.
				*/
				disabled: import_prop_types.default.bool,
				/**
				* By default, we add 'user-select:none' attributes to the document body
				* to prevent ugly text selection during drag. If this is causing problems
				* for your app, set this to `false`.
				*/
				enableUserSelectHack: import_prop_types.default.bool,
				/**
				* `offsetParent`, if set, uses the passed DOM node to compute drag offsets
				* instead of using the parent node.
				*/
				offsetParent: function(props, propName) {
					if (props[propName] && props[propName].nodeType !== 1) throw new Error("Draggable's offsetParent must be a DOM Node.");
				},
				/**
				* `grid` specifies the x and y that dragging should snap to.
				*/
				grid: import_prop_types.default.arrayOf(import_prop_types.default.number),
				/**
				* `handle` specifies a selector to be used as the handle that initiates drag.
				*
				* Example:
				*
				* ```jsx
				*   let App = React.createClass({
				*       render: function () {
				*         return (
				*            <Draggable handle=".handle">
				*              <div>
				*                  <div className="handle">Click me to drag</div>
				*                  <div>This is some other content</div>
				*              </div>
				*           </Draggable>
				*         );
				*       }
				*   });
				* ```
				*/
				handle: import_prop_types.default.string,
				/**
				* `cancel` specifies a selector to be used to prevent drag initialization.
				*
				* Example:
				*
				* ```jsx
				*   let App = React.createClass({
				*       render: function () {
				*           return(
				*               <Draggable cancel=".cancel">
				*                   <div>
				*                     <div className="cancel">You can't drag from here</div>
				*                     <div>Dragging here works fine</div>
				*                   </div>
				*               </Draggable>
				*           );
				*       }
				*   });
				* ```
				*/
				cancel: import_prop_types.default.string,
				nodeRef: import_prop_types.default.object,
				/**
				* `nonce` is applied to the dynamically-injected <style> element used by the
				* user-select hack, so it isn't blocked under a strict Content Security
				* Policy (`style-src` without `'unsafe-inline'`). If omitted, webpack's
				* `__webpack_nonce__` global is used when available.
				*/
				nonce: import_prop_types.default.string,
				/**
				* Called when dragging starts.
				* If this function returns the boolean false, dragging will be canceled.
				*/
				onStart: import_prop_types.default.func,
				/**
				* Called while dragging.
				* If this function returns the boolean false, dragging will be canceled.
				*/
				onDrag: import_prop_types.default.func,
				/**
				* Called when dragging stops.
				* If this function returns the boolean false, the drag will remain active.
				*/
				onStop: import_prop_types.default.func,
				/**
				* A workaround option which can be passed if onMouseDown needs to be accessed,
				* since it'll always be blocked (as there is internal use of onMouseDown)
				*/
				onMouseDown: import_prop_types.default.func,
				/**
				* `scale`, if set, applies scaling while dragging an element
				*/
				scale: import_prop_types.default.number,
				/**
				* These properties should be defined on the child, not here.
				*/
				className: dontSetMe,
				style: dontSetMe,
				transform: dontSetMe
			};
			DraggableCore.defaultProps = {
				allowAnyClick: false,
				allowMobileScroll: false,
				disabled: false,
				enableUserSelectHack: true,
				onStart: function() {},
				onDrag: function() {},
				onStop: function() {},
				onMouseDown: function() {},
				scale: 1
			};
			var Draggable = class extends React2$1.Component {
				constructor(props) {
					super(props);
					this.onDragStart = (e, coreData) => {
						log_default("Draggable: onDragStart: %j", coreData);
						if (this.props.onStart(e, createDraggableData(this, coreData)) === false) return false;
						this.setState({
							dragging: true,
							dragged: true
						});
					};
					this.onDrag = (e, coreData) => {
						if (!this.state.dragging) return false;
						log_default("Draggable: onDrag: %j", coreData);
						const uiData = createDraggableData(this, coreData);
						const newState = {
							x: uiData.x,
							y: uiData.y,
							slackX: 0,
							slackY: 0
						};
						if (this.props.bounds) {
							const { x, y } = newState;
							newState.x += this.state.slackX;
							newState.y += this.state.slackY;
							const [newStateX, newStateY] = getBoundPosition(this, newState.x, newState.y);
							newState.x = newStateX;
							newState.y = newStateY;
							newState.slackX = this.state.slackX + (x - newState.x);
							newState.slackY = this.state.slackY + (y - newState.y);
							uiData.x = newState.x;
							uiData.y = newState.y;
							uiData.deltaX = newState.x - this.state.x;
							uiData.deltaY = newState.y - this.state.y;
						}
						if (this.props.onDrag(e, uiData) === false) return false;
						this.setState(newState);
					};
					this.onDragStop = (e, coreData) => {
						if (!this.state.dragging) return false;
						if (this.props.onStop(e, createDraggableData(this, coreData)) === false) return false;
						log_default("Draggable: onDragStop: %j", coreData);
						const newState = {
							dragging: false,
							slackX: 0,
							slackY: 0
						};
						if (Boolean(this.props.position)) {
							const { x, y } = this.props.position;
							newState.x = x;
							newState.y = y;
						}
						this.setState(newState);
					};
					this.state = {
						dragging: false,
						dragged: false,
						x: props.position ? props.position.x : props.defaultPosition.x,
						y: props.position ? props.position.y : props.defaultPosition.y,
						prevPropsPosition: { ...props.position },
						slackX: 0,
						slackY: 0,
						isElementSVG: false
					};
					if (props.position && !(props.onDrag || props.onStop)) console.warn("A `position` was applied to this <Draggable>, without drag handlers. This will make this component effectively undraggable. Please attach `onDrag` or `onStop` handlers so you can adjust the `position` of this element.");
				}
				static getDerivedStateFromProps({ position }, { prevPropsPosition }) {
					if (position && (!prevPropsPosition || position.x !== prevPropsPosition.x || position.y !== prevPropsPosition.y)) {
						log_default("Draggable: getDerivedStateFromProps %j", {
							position,
							prevPropsPosition
						});
						return {
							x: position.x,
							y: position.y,
							prevPropsPosition: { ...position }
						};
					}
					return null;
				}
				componentDidMount() {
					if (typeof window.SVGElement !== "undefined" && this.findDOMNode() instanceof window.SVGElement) this.setState({ isElementSVG: true });
				}
				componentWillUnmount() {
					if (this.state.dragging) this.setState({ dragging: false });
				}
				findDOMNode() {
					var _a;
					if ((_a = this.props) == null ? void 0 : _a.nodeRef) return this.props.nodeRef.current;
					const legacyReactDOM = import_react_dom2.default;
					if (typeof legacyReactDOM.findDOMNode === "function") return legacyReactDOM.findDOMNode(this);
					return null;
				}
				render() {
					const { axis, bounds, children, defaultPosition, defaultClassName, defaultClassNameDragging, defaultClassNameDragged, position, positionOffset, scale, ...draggableCoreProps } = this.props;
					let style = {};
					let svgTransform = null;
					const draggable = !Boolean(position) || this.state.dragging;
					const validPosition = position || defaultPosition;
					const transformOpts = {
						x: canDragX(this) && draggable ? this.state.x : validPosition.x,
						y: canDragY(this) && draggable ? this.state.y : validPosition.y
					};
					if (this.state.isElementSVG) svgTransform = createSVGTransform(transformOpts, positionOffset);
					else style = createCSSTransform(transformOpts, positionOffset);
					const onlyChild = React2$1.Children.only(children);
					const className = (0, import_clsx.clsx)(onlyChild.props.className || "", defaultClassName, {
						[defaultClassNameDragging]: this.state.dragging,
						[defaultClassNameDragged]: this.state.dragged
					});
					return /* @__PURE__ */ React2$1.createElement(DraggableCore, {
						...draggableCoreProps,
						onStart: this.onDragStart,
						onDrag: this.onDrag,
						onStop: this.onDragStop
					}, React2$1.cloneElement(onlyChild, {
						className,
						style: {
							...onlyChild.props.style,
							...style
						},
						transform: svgTransform
					}));
				}
			};
			Draggable.displayName = "Draggable";
			Draggable.propTypes = {
				...DraggableCore.propTypes,
				/**
				* `axis` determines which axis the draggable can move.
				*
				*  Note that all callbacks will still return data as normal. This only
				*  controls flushing to the DOM.
				*
				* 'both' allows movement horizontally and vertically.
				* 'x' limits movement to horizontal axis.
				* 'y' limits movement to vertical axis.
				* 'none' limits all movement.
				*
				* Defaults to 'both'.
				*/
				axis: import_prop_types2.default.oneOf([
					"both",
					"x",
					"y",
					"none"
				]),
				/**
				* `bounds` determines the range of movement available to the element.
				* Available values are:
				*
				* 'parent' restricts movement within the Draggable's parent node.
				*
				* Alternatively, pass an object with the following properties, all of which are optional:
				*
				* {left: LEFT_BOUND, right: RIGHT_BOUND, bottom: BOTTOM_BOUND, top: TOP_BOUND}
				*
				* All values are in px.
				*
				* Example:
				*
				* ```jsx
				*   let App = React.createClass({
				*       render: function () {
				*         return (
				*            <Draggable bounds={{right: 300, bottom: 300}}>
				*              <div>Content</div>
				*           </Draggable>
				*         );
				*       }
				*   });
				* ```
				*/
				bounds: import_prop_types2.default.oneOfType([
					import_prop_types2.default.shape({
						left: import_prop_types2.default.number,
						right: import_prop_types2.default.number,
						top: import_prop_types2.default.number,
						bottom: import_prop_types2.default.number
					}),
					import_prop_types2.default.string,
					import_prop_types2.default.oneOf([false])
				]),
				defaultClassName: import_prop_types2.default.string,
				defaultClassNameDragging: import_prop_types2.default.string,
				defaultClassNameDragged: import_prop_types2.default.string,
				/**
				* `defaultPosition` specifies the x and y that the dragged item should start at
				*
				* Example:
				*
				* ```jsx
				*      let App = React.createClass({
				*          render: function () {
				*              return (
				*                  <Draggable defaultPosition={{x: 25, y: 25}}>
				*                      <div>I start with transformX: 25px and transformY: 25px;</div>
				*                  </Draggable>
				*              );
				*          }
				*      });
				* ```
				*/
				defaultPosition: import_prop_types2.default.shape({
					x: import_prop_types2.default.number,
					y: import_prop_types2.default.number
				}),
				positionOffset: import_prop_types2.default.shape({
					x: import_prop_types2.default.oneOfType([import_prop_types2.default.number, import_prop_types2.default.string]),
					y: import_prop_types2.default.oneOfType([import_prop_types2.default.number, import_prop_types2.default.string])
				}),
				/**
				* `position`, if present, defines the current position of the element.
				*
				*  This is similar to how form elements in React work - if no `position` is supplied, the component
				*  is uncontrolled.
				*
				* Example:
				*
				* ```jsx
				*      let App = React.createClass({
				*          render: function () {
				*              return (
				*                  <Draggable position={{x: 25, y: 25}}>
				*                      <div>I start with transformX: 25px and transformY: 25px;</div>
				*                  </Draggable>
				*              );
				*          }
				*      });
				* ```
				*/
				position: import_prop_types2.default.shape({
					x: import_prop_types2.default.number,
					y: import_prop_types2.default.number
				}),
				/**
				* These properties should be defined on the child, not here.
				*/
				className: dontSetMe,
				style: dontSetMe,
				transform: dontSetMe
			};
			Draggable.defaultProps = {
				...DraggableCore.defaultProps,
				axis: "both",
				bounds: false,
				defaultClassName: "react-draggable",
				defaultClassNameDragging: "react-draggable-dragging",
				defaultClassNameDragged: "react-draggable-dragged",
				defaultPosition: {
					x: 0,
					y: 0
				},
				scale: 1
			};
			0 && (module.exports = { DraggableCore });
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-draggable@4.7.1_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/react-draggable/build/cjs/cjs.js
		var require_cjs = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			const Draggable = require_Draggable();
			const DraggableCore = Draggable.DraggableCore;
			const Default = Draggable.default || Draggable;
			module.exports = Default;
			module.exports.default = Default;
			module.exports.DraggableCore = DraggableCore;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-resizable@3.2.0_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/react-resizable/build/utils.js
		var require_utils = /* @__PURE__ */ __commonJSMin(((exports) => {
			exports.__esModule = true;
			exports.cloneElement = cloneElement;
			var _react = _interopRequireDefault(require("react"));
			function _interopRequireDefault(e) {
				return e && e.__esModule ? e : { default: e };
			}
			function ownKeys(e, r) {
				var t = Object.keys(e);
				if (Object.getOwnPropertySymbols) {
					var o = Object.getOwnPropertySymbols(e);
					r && (o = o.filter(function(r) {
						return Object.getOwnPropertyDescriptor(e, r).enumerable;
					})), t.push.apply(t, o);
				}
				return t;
			}
			function _objectSpread(e) {
				for (var r = 1; r < arguments.length; r++) {
					var t = null != arguments[r] ? arguments[r] : {};
					r % 2 ? ownKeys(Object(t), !0).forEach(function(r) {
						_defineProperty(e, r, t[r]);
					}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
						Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
					});
				}
				return e;
			}
			function _defineProperty(e, r, t) {
				return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
					value: t,
					enumerable: !0,
					configurable: !0,
					writable: !0
				}) : e[r] = t, e;
			}
			function _toPropertyKey(t) {
				var i = _toPrimitive(t, "string");
				return "symbol" == typeof i ? i : i + "";
			}
			function _toPrimitive(t, r) {
				if ("object" != typeof t || !t) return t;
				var e = t[Symbol.toPrimitive];
				if (void 0 !== e) {
					var i = e.call(t, r || "default");
					if ("object" != typeof i) return i;
					throw new TypeError("@@toPrimitive must return a primitive value.");
				}
				return ("string" === r ? String : Number)(t);
			}
			function cloneElement(element, props) {
				if (props.style && element.props.style) props.style = _objectSpread(_objectSpread({}, element.props.style), props.style);
				if (props.className && element.props.className) props.className = element.props.className + " " + props.className;
				return /*#__PURE__*/ _react.default.cloneElement(element, props);
			}
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-resizable@3.2.0_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/react-resizable/build/propTypes.js
		var require_propTypes = /* @__PURE__ */ __commonJSMin(((exports) => {
			exports.__esModule = true;
			exports.resizableProps = void 0;
			var _propTypes = _interopRequireDefault(require_prop_types());
			require_cjs();
			function _interopRequireDefault(e) {
				return e && e.__esModule ? e : { default: e };
			}
			exports.resizableProps = {
				axis: _propTypes.default.oneOf([
					"both",
					"x",
					"y",
					"none"
				]),
				className: _propTypes.default.string,
				children: _propTypes.default.element.isRequired,
				draggableOpts: _propTypes.default.shape({
					allowAnyClick: _propTypes.default.bool,
					cancel: _propTypes.default.string,
					children: _propTypes.default.node,
					disabled: _propTypes.default.bool,
					enableUserSelectHack: _propTypes.default.bool,
					offsetParent: typeof Element !== "undefined" ? _propTypes.default.instanceOf(Element) : _propTypes.default.any,
					grid: _propTypes.default.arrayOf(_propTypes.default.number),
					handle: _propTypes.default.string,
					nodeRef: _propTypes.default.object,
					onStart: _propTypes.default.func,
					onDrag: _propTypes.default.func,
					onStop: _propTypes.default.func,
					onMouseDown: _propTypes.default.func,
					scale: _propTypes.default.number
				}),
				height: function() {
					for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) args[_key] = arguments[_key];
					const props = args[0];
					if (props.axis === "both" || props.axis === "y") return _propTypes.default.number.isRequired(...args);
					return _propTypes.default.number(...args);
				},
				handle: _propTypes.default.oneOfType([_propTypes.default.node, _propTypes.default.func]),
				handleSize: _propTypes.default.arrayOf(_propTypes.default.number),
				lockAspectRatio: _propTypes.default.bool,
				maxConstraints: _propTypes.default.arrayOf(_propTypes.default.number),
				minConstraints: _propTypes.default.arrayOf(_propTypes.default.number),
				onResizeStop: _propTypes.default.func,
				onResizeStart: _propTypes.default.func,
				onResize: _propTypes.default.func,
				resizeHandles: _propTypes.default.arrayOf(_propTypes.default.oneOf([
					"s",
					"w",
					"e",
					"n",
					"sw",
					"nw",
					"se",
					"ne"
				])),
				transformScale: _propTypes.default.number,
				width: function() {
					for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) args[_key2] = arguments[_key2];
					const props = args[0];
					if (props.axis === "both" || props.axis === "x") return _propTypes.default.number.isRequired(...args);
					return _propTypes.default.number(...args);
				}
			};
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-resizable@3.2.0_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/react-resizable/build/Resizable.js
		var require_Resizable = /* @__PURE__ */ __commonJSMin(((exports) => {
			exports.__esModule = true;
			exports.default = void 0;
			var React$1 = _interopRequireWildcard(require("react"));
			var _reactDraggable = require_cjs();
			var _utils = require_utils();
			var _propTypes = require_propTypes();
			const _excluded = [
				"children",
				"className",
				"draggableOpts",
				"width",
				"height",
				"handle",
				"handleSize",
				"lockAspectRatio",
				"axis",
				"minConstraints",
				"maxConstraints",
				"onResize",
				"onResizeStop",
				"onResizeStart",
				"resizeHandles",
				"transformScale"
			];
			function _interopRequireWildcard(e, t) {
				if ("function" == typeof WeakMap) var r = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap();
				return (_interopRequireWildcard = function(e, t) {
					if (!t && e && e.__esModule) return e;
					var o, i, f = {
						__proto__: null,
						default: e
					};
					if (null === e || "object" != typeof e && "function" != typeof e) return f;
					if (o = t ? n : r) {
						if (o.has(e)) return o.get(e);
						o.set(e, f);
					}
					for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);
					return f;
				})(e, t);
			}
			function _extends() {
				return _extends = Object.assign ? Object.assign.bind() : function(n) {
					for (var e = 1; e < arguments.length; e++) {
						var t = arguments[e];
						for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
					}
					return n;
				}, _extends.apply(null, arguments);
			}
			function _objectWithoutPropertiesLoose(r, e) {
				if (null == r) return {};
				var t = {};
				for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
					if (-1 !== e.indexOf(n)) continue;
					t[n] = r[n];
				}
				return t;
			}
			function ownKeys(e, r) {
				var t = Object.keys(e);
				if (Object.getOwnPropertySymbols) {
					var o = Object.getOwnPropertySymbols(e);
					r && (o = o.filter(function(r) {
						return Object.getOwnPropertyDescriptor(e, r).enumerable;
					})), t.push.apply(t, o);
				}
				return t;
			}
			function _objectSpread(e) {
				for (var r = 1; r < arguments.length; r++) {
					var t = null != arguments[r] ? arguments[r] : {};
					r % 2 ? ownKeys(Object(t), !0).forEach(function(r) {
						_defineProperty(e, r, t[r]);
					}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
						Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
					});
				}
				return e;
			}
			function _defineProperty(e, r, t) {
				return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
					value: t,
					enumerable: !0,
					configurable: !0,
					writable: !0
				}) : e[r] = t, e;
			}
			function _toPropertyKey(t) {
				var i = _toPrimitive(t, "string");
				return "symbol" == typeof i ? i : i + "";
			}
			function _toPrimitive(t, r) {
				if ("object" != typeof t || !t) return t;
				var e = t[Symbol.toPrimitive];
				if (void 0 !== e) {
					var i = e.call(t, r || "default");
					if ("object" != typeof i) return i;
					throw new TypeError("@@toPrimitive must return a primitive value.");
				}
				return ("string" === r ? String : Number)(t);
			}
			var Resizable = class extends React$1.Component {
				constructor() {
					super(...arguments);
					this.handleRefs = {};
					this.lastHandleRect = null;
					this.slack = null;
					this.lastSize = null;
				}
				componentWillUnmount() {
					this.resetData();
				}
				resetData() {
					this.lastHandleRect = this.slack = this.lastSize = null;
				}
				runConstraints(width, height) {
					const _this$props = this.props, minConstraints = _this$props.minConstraints, maxConstraints = _this$props.maxConstraints, lockAspectRatio = _this$props.lockAspectRatio;
					if (!minConstraints && !maxConstraints && !lockAspectRatio) return [width, height];
					if (lockAspectRatio) {
						const ratio = this.props.width / this.props.height;
						const deltaW = width - this.props.width;
						const deltaH = height - this.props.height;
						if (Math.abs(deltaW) > Math.abs(deltaH * ratio)) height = width / ratio;
						else width = height * ratio;
					}
					const oldW = width, oldH = height;
					let _ref = this.slack || [0, 0], slackW = _ref[0], slackH = _ref[1];
					width += slackW;
					height += slackH;
					if (minConstraints) {
						width = Math.max(minConstraints[0], width);
						height = Math.max(minConstraints[1], height);
					}
					if (maxConstraints) {
						width = Math.min(maxConstraints[0], width);
						height = Math.min(maxConstraints[1], height);
					}
					this.slack = [slackW + (oldW - width), slackH + (oldH - height)];
					return [width, height];
				}
				/**
				* Wrapper around drag events to provide more useful data.
				*
				* @param  {String} handlerName Handler name to wrap.
				* @return {Function}           Handler function.
				*/
				resizeHandler(handlerName, axis) {
					return (e, _ref2) => {
						var _this$lastSize$width, _this$lastSize, _this$lastSize$height, _this$lastSize2;
						let node = _ref2.node, deltaX = _ref2.deltaX, deltaY = _ref2.deltaY;
						if (handlerName === "onResizeStart") this.resetData();
						const canDragX = (this.props.axis === "both" || this.props.axis === "x") && axis !== "n" && axis !== "s";
						const canDragY = (this.props.axis === "both" || this.props.axis === "y") && axis !== "e" && axis !== "w";
						if (!canDragX && !canDragY) return;
						const axisV = axis[0];
						const axisH = axis[axis.length - 1];
						const handleRect = node.getBoundingClientRect();
						if (this.lastHandleRect != null) {
							if (axisH === "w") {
								const deltaLeftSinceLast = handleRect.left - this.lastHandleRect.left;
								deltaX += deltaLeftSinceLast;
							}
							if (axisV === "n") {
								const deltaTopSinceLast = handleRect.top - this.lastHandleRect.top;
								deltaY += deltaTopSinceLast;
							}
						}
						this.lastHandleRect = handleRect;
						if (axisH === "w") deltaX = -deltaX;
						if (axisV === "n") deltaY = -deltaY;
						const baseWidth = (_this$lastSize$width = (_this$lastSize = this.lastSize) == null ? void 0 : _this$lastSize.width) != null ? _this$lastSize$width : this.props.width;
						const baseHeight = (_this$lastSize$height = (_this$lastSize2 = this.lastSize) == null ? void 0 : _this$lastSize2.height) != null ? _this$lastSize$height : this.props.height;
						let width = baseWidth + (canDragX ? deltaX / this.props.transformScale : 0);
						let height = baseHeight + (canDragY ? deltaY / this.props.transformScale : 0);
						var _this$runConstraints = this.runConstraints(width, height);
						width = _this$runConstraints[0];
						height = _this$runConstraints[1];
						if (handlerName === "onResizeStop" && this.lastSize) {
							var _this$lastSize3 = this.lastSize;
							width = _this$lastSize3.width;
							height = _this$lastSize3.height;
						}
						const dimensionsChanged = width !== baseWidth || height !== baseHeight;
						if (handlerName !== "onResizeStop") this.lastSize = {
							width,
							height
						};
						const cb = typeof this.props[handlerName] === "function" ? this.props[handlerName] : null;
						if (cb && !(handlerName === "onResize" && !dimensionsChanged)) {
							e.persist == null || e.persist();
							cb(e, {
								node,
								size: {
									width,
									height
								},
								handle: axis
							});
						}
						if (handlerName === "onResizeStop") this.resetData();
					};
				}
				renderResizeHandle(handleAxis, ref) {
					const handle = this.props.handle;
					if (!handle) return /*#__PURE__*/ React$1.createElement("span", {
						className: "react-resizable-handle react-resizable-handle-" + handleAxis,
						ref
					});
					if (typeof handle === "function") return handle(handleAxis, ref);
					const isDOMElement = typeof handle.type === "string";
					const props = _objectSpread({ ref }, isDOMElement ? {} : { handleAxis });
					return /*#__PURE__*/ React$1.cloneElement(handle, props);
				}
				render() {
					const _this$props2 = this.props, children = _this$props2.children, className = _this$props2.className, draggableOpts = _this$props2.draggableOpts;
					_this$props2.width;
					_this$props2.height;
					_this$props2.handle;
					_this$props2.handleSize;
					_this$props2.lockAspectRatio;
					_this$props2.axis;
					_this$props2.minConstraints;
					_this$props2.maxConstraints;
					_this$props2.onResize;
					_this$props2.onResizeStop;
					_this$props2.onResizeStart;
					const resizeHandles = _this$props2.resizeHandles;
					_this$props2.transformScale;
					const p = _objectWithoutPropertiesLoose(_this$props2, _excluded);
					return (0, _utils.cloneElement)(children, _objectSpread(_objectSpread({}, p), {}, {
						className: (className ? className + " " : "") + "react-resizable",
						children: [...React$1.Children.toArray(children.props.children), ...resizeHandles.map((handleAxis) => {
							var _this$handleRefs$hand;
							const ref = (_this$handleRefs$hand = this.handleRefs[handleAxis]) != null ? _this$handleRefs$hand : this.handleRefs[handleAxis] = /*#__PURE__*/ React$1.createRef();
							return /*#__PURE__*/ React$1.createElement(_reactDraggable.DraggableCore, _extends({}, draggableOpts, {
								nodeRef: ref,
								key: "resizableHandle-" + handleAxis,
								onStop: this.resizeHandler("onResizeStop", handleAxis),
								onStart: this.resizeHandler("onResizeStart", handleAxis),
								onDrag: this.resizeHandler("onResize", handleAxis)
							}), this.renderResizeHandle(handleAxis, ref));
						})]
					}));
				}
			};
			exports.default = Resizable;
			Resizable.propTypes = _propTypes.resizableProps;
			Resizable.defaultProps = {
				axis: "both",
				handleSize: [20, 20],
				lockAspectRatio: false,
				minConstraints: [20, 20],
				maxConstraints: [Infinity, Infinity],
				resizeHandles: ["se"],
				transformScale: 1
			};
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-resizable@3.2.0_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/react-resizable/build/ResizableBox.js
		var require_ResizableBox = /* @__PURE__ */ __commonJSMin(((exports) => {
			exports.__esModule = true;
			exports.default = void 0;
			var React = _interopRequireWildcard(require("react"));
			var _propTypes = _interopRequireDefault(require_prop_types());
			var _Resizable = _interopRequireDefault(require_Resizable());
			var _propTypes2 = require_propTypes();
			const _excluded = [
				"handle",
				"handleSize",
				"onResize",
				"onResizeStart",
				"onResizeStop",
				"draggableOpts",
				"minConstraints",
				"maxConstraints",
				"lockAspectRatio",
				"axis",
				"width",
				"height",
				"resizeHandles",
				"style",
				"transformScale"
			];
			function _interopRequireDefault(e) {
				return e && e.__esModule ? e : { default: e };
			}
			function _interopRequireWildcard(e, t) {
				if ("function" == typeof WeakMap) var r = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap();
				return (_interopRequireWildcard = function(e, t) {
					if (!t && e && e.__esModule) return e;
					var o, i, f = {
						__proto__: null,
						default: e
					};
					if (null === e || "object" != typeof e && "function" != typeof e) return f;
					if (o = t ? n : r) {
						if (o.has(e)) return o.get(e);
						o.set(e, f);
					}
					for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);
					return f;
				})(e, t);
			}
			function _extends() {
				return _extends = Object.assign ? Object.assign.bind() : function(n) {
					for (var e = 1; e < arguments.length; e++) {
						var t = arguments[e];
						for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
					}
					return n;
				}, _extends.apply(null, arguments);
			}
			function ownKeys(e, r) {
				var t = Object.keys(e);
				if (Object.getOwnPropertySymbols) {
					var o = Object.getOwnPropertySymbols(e);
					r && (o = o.filter(function(r) {
						return Object.getOwnPropertyDescriptor(e, r).enumerable;
					})), t.push.apply(t, o);
				}
				return t;
			}
			function _objectSpread(e) {
				for (var r = 1; r < arguments.length; r++) {
					var t = null != arguments[r] ? arguments[r] : {};
					r % 2 ? ownKeys(Object(t), !0).forEach(function(r) {
						_defineProperty(e, r, t[r]);
					}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
						Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
					});
				}
				return e;
			}
			function _defineProperty(e, r, t) {
				return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
					value: t,
					enumerable: !0,
					configurable: !0,
					writable: !0
				}) : e[r] = t, e;
			}
			function _toPropertyKey(t) {
				var i = _toPrimitive(t, "string");
				return "symbol" == typeof i ? i : i + "";
			}
			function _toPrimitive(t, r) {
				if ("object" != typeof t || !t) return t;
				var e = t[Symbol.toPrimitive];
				if (void 0 !== e) {
					var i = e.call(t, r || "default");
					if ("object" != typeof i) return i;
					throw new TypeError("@@toPrimitive must return a primitive value.");
				}
				return ("string" === r ? String : Number)(t);
			}
			function _objectWithoutPropertiesLoose(r, e) {
				if (null == r) return {};
				var t = {};
				for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
					if (-1 !== e.indexOf(n)) continue;
					t[n] = r[n];
				}
				return t;
			}
			var ResizableBox = class extends React.Component {
				constructor() {
					super(...arguments);
					this.state = {
						width: this.props.width,
						height: this.props.height,
						propsWidth: this.props.width,
						propsHeight: this.props.height
					};
					this.onResize = (e, data) => {
						const size = data.size;
						if (this.props.onResize) {
							e.persist == null || e.persist();
							this.setState(size, () => this.props.onResize && this.props.onResize(e, data));
						} else this.setState(size);
					};
				}
				static getDerivedStateFromProps(props, state) {
					if (state.propsWidth !== props.width || state.propsHeight !== props.height) return {
						width: props.width,
						height: props.height,
						propsWidth: props.width,
						propsHeight: props.height
					};
					return null;
				}
				render() {
					const _this$props = this.props, handle = _this$props.handle, handleSize = _this$props.handleSize;
					_this$props.onResize;
					const onResizeStart = _this$props.onResizeStart, onResizeStop = _this$props.onResizeStop, draggableOpts = _this$props.draggableOpts, minConstraints = _this$props.minConstraints, maxConstraints = _this$props.maxConstraints, lockAspectRatio = _this$props.lockAspectRatio, axis = _this$props.axis;
					_this$props.width;
					_this$props.height;
					const resizeHandles = _this$props.resizeHandles, style = _this$props.style, transformScale = _this$props.transformScale, props = _objectWithoutPropertiesLoose(_this$props, _excluded);
					return /*#__PURE__*/ React.createElement(_Resizable.default, {
						axis,
						draggableOpts,
						handle,
						handleSize,
						height: this.state.height,
						lockAspectRatio,
						maxConstraints,
						minConstraints,
						onResizeStart,
						onResize: this.onResize,
						onResizeStop,
						resizeHandles,
						transformScale,
						width: this.state.width
					}, /*#__PURE__*/ React.createElement("div", _extends({}, props, { style: _objectSpread(_objectSpread({}, style), {}, {
						width: this.state.width + "px",
						height: this.state.height + "px"
					}) })));
				}
			};
			exports.default = ResizableBox;
			ResizableBox.propTypes = _objectSpread(_objectSpread({}, _propTypes2.resizableProps), {}, { children: _propTypes.default.element });
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-grid-layout@2.2.4_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/react-grid-layout/dist/chunk-7ZM5LVH2.mjs
		var import_react_resizable = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = function() {
				throw new Error("Don't instantiate Resizable directly! Use require('react-resizable').Resizable");
			};
			module.exports.Resizable = require_Resizable().default;
			module.exports.ResizableBox = require_ResizableBox().default;
		})))();
		var import_fast_equals_cjs = require_fast_equals_cjs();
		function GridItem(props) {
			const { children, cols, containerWidth, margin, containerPadding, rowHeight, maxRows, isDraggable, isResizable, isBounded, static: isStatic, useCSSTransforms = true, usePercentages = false, transformScale = 1, positionStrategy, dragThreshold = 0, droppingPosition, className = "", style, handle = "", cancel = "", x, y, w, h, minW = 1, maxW = Infinity, minH = 1, maxH = Infinity, i, resizeHandles, resizeHandle, constraints = defaultConstraints, layoutItem, layout = [], onDragStart: onDragStartProp, onDrag: onDragProp, onDragStop: onDragStopProp, onResizeStart: onResizeStartProp, onResize: onResizeProp, onResizeStop: onResizeStopProp } = props;
			const [dragging, setDragging] = (0, react.useState)(false);
			const [resizing, setResizing] = (0, react.useState)(false);
			const elementRef = (0, react.useRef)(null);
			const dragPositionRef = (0, react.useRef)({
				left: 0,
				top: 0
			});
			const resizePositionRef = (0, react.useRef)({
				top: 0,
				left: 0,
				width: 0,
				height: 0
			});
			const prevDroppingPositionRef = (0, react.useRef)(void 0);
			const layoutRef = (0, react.useRef)(layout);
			layoutRef.current = layout;
			const onDragStartRef = (0, react.useRef)(null);
			const onDragRef = (0, react.useRef)(null);
			const dragPendingRef = (0, react.useRef)(false);
			const initialDragClientRef = (0, react.useRef)({
				x: 0,
				y: 0
			});
			const thresholdExceededRef = (0, react.useRef)(false);
			const positionParams = (0, react.useMemo)(() => ({
				cols,
				containerPadding,
				containerWidth,
				margin,
				maxRows,
				rowHeight
			}), [
				cols,
				containerPadding,
				containerWidth,
				margin,
				maxRows,
				rowHeight
			]);
			const constraintContext = (0, react.useMemo)(() => ({
				cols,
				maxRows,
				containerWidth,
				containerHeight: 0,
				rowHeight,
				margin,
				layout: []
			}), [
				cols,
				maxRows,
				containerWidth,
				rowHeight,
				margin
			]);
			const getConstraintContext = (0, react.useCallback)(() => ({
				...constraintContext,
				layout: layoutRef.current
			}), [constraintContext]);
			const effectiveLayoutItem = (0, react.useMemo)(() => layoutItem ?? {
				i,
				x,
				y,
				w,
				h,
				minW,
				maxW,
				minH,
				maxH
			}, [
				layoutItem,
				i,
				x,
				y,
				w,
				h,
				minW,
				maxW,
				minH,
				maxH
			]);
			const createStyle = (0, react.useCallback)((pos2) => {
				if (positionStrategy?.calcStyle) return positionStrategy.calcStyle(pos2);
				if (useCSSTransforms) return setTransform(pos2);
				const styleObj = setTopLeft(pos2);
				if (usePercentages) return {
					...styleObj,
					left: perc(pos2.left / containerWidth),
					width: perc(pos2.width / containerWidth)
				};
				return styleObj;
			}, [
				positionStrategy,
				useCSSTransforms,
				usePercentages,
				containerWidth
			]);
			const onDragStart = (0, react.useCallback)((e, { node }) => {
				if (!onDragStartProp) return;
				const { offsetParent } = node;
				if (!offsetParent) return;
				const parentRect = offsetParent.getBoundingClientRect();
				const clientRect = node.getBoundingClientRect();
				const cLeft = clientRect.left / transformScale;
				const pLeft = parentRect.left / transformScale;
				const cTop = clientRect.top / transformScale;
				const pTop = parentRect.top / transformScale;
				let newPosition;
				if (positionStrategy?.calcDragPosition) {
					const mouseEvent = e;
					newPosition = positionStrategy.calcDragPosition(mouseEvent.clientX, mouseEvent.clientY, mouseEvent.clientX - clientRect.left, mouseEvent.clientY - clientRect.top);
				} else newPosition = {
					left: cLeft - pLeft + offsetParent.scrollLeft,
					top: cTop - pTop + offsetParent.scrollTop
				};
				dragPositionRef.current = newPosition;
				if (dragThreshold > 0) {
					const mouseEvent = e;
					initialDragClientRef.current = {
						x: mouseEvent.clientX,
						y: mouseEvent.clientY
					};
					dragPendingRef.current = true;
					thresholdExceededRef.current = false;
					setDragging(true);
					return;
				}
				setDragging(true);
				const rawPos = calcXYRaw(positionParams, newPosition.top, newPosition.left);
				const { x: newX, y: newY } = applyPositionConstraints(constraints, effectiveLayoutItem, rawPos.x, rawPos.y, getConstraintContext());
				onDragStartProp(i, newX, newY, {
					e,
					node,
					newPosition
				});
			}, [
				onDragStartProp,
				transformScale,
				positionParams,
				positionStrategy,
				dragThreshold,
				constraints,
				effectiveLayoutItem,
				getConstraintContext,
				i
			]);
			const onDrag = (0, react.useCallback)((e, { node, deltaX, deltaY }) => {
				if (!onDragProp || !dragging) return;
				const mouseEvent = e;
				if (dragPendingRef.current && !thresholdExceededRef.current) {
					const dx = mouseEvent.clientX - initialDragClientRef.current.x;
					const dy = mouseEvent.clientY - initialDragClientRef.current.y;
					if (Math.hypot(dx, dy) < dragThreshold) return;
					thresholdExceededRef.current = true;
					dragPendingRef.current = false;
					if (onDragStartProp) {
						const rawPos2 = calcXYRaw(positionParams, dragPositionRef.current.top, dragPositionRef.current.left);
						const { x: startX, y: startY } = applyPositionConstraints(constraints, effectiveLayoutItem, rawPos2.x, rawPos2.y, getConstraintContext());
						onDragStartProp(i, startX, startY, {
							e,
							node,
							newPosition: dragPositionRef.current
						});
					}
				}
				let top = dragPositionRef.current.top + deltaY;
				let left = dragPositionRef.current.left + deltaX;
				if (isBounded) {
					const { offsetParent } = node;
					if (offsetParent) {
						const bottomBoundary = offsetParent.clientHeight - calcGridItemWHPx(h, rowHeight, margin[1]);
						top = clamp$2(top, 0, bottomBoundary);
						const colWidth2 = calcGridColWidth(positionParams);
						const rightBoundary = containerWidth - calcGridItemWHPx(w, colWidth2, margin[0]);
						left = clamp$2(left, 0, rightBoundary);
					}
				}
				const newPosition = {
					top,
					left
				};
				dragPositionRef.current = newPosition;
				const rawPos = calcXYRaw(positionParams, top, left);
				const { x: newX, y: newY } = applyPositionConstraints(constraints, effectiveLayoutItem, rawPos.x, rawPos.y, getConstraintContext());
				onDragProp(i, newX, newY, {
					e,
					node,
					newPosition
				});
			}, [
				onDragProp,
				onDragStartProp,
				dragging,
				dragThreshold,
				isBounded,
				h,
				rowHeight,
				margin,
				positionParams,
				containerWidth,
				w,
				i,
				constraints,
				effectiveLayoutItem,
				getConstraintContext
			]);
			const onDragStop = (0, react.useCallback)((e, { node }) => {
				if (!onDragStopProp || !dragging) return;
				const wasPending = dragPendingRef.current;
				dragPendingRef.current = false;
				thresholdExceededRef.current = false;
				initialDragClientRef.current = {
					x: 0,
					y: 0
				};
				if (wasPending) {
					setDragging(false);
					dragPositionRef.current = {
						left: 0,
						top: 0
					};
					return;
				}
				const { left, top } = dragPositionRef.current;
				const newPosition = {
					top,
					left
				};
				setDragging(false);
				dragPositionRef.current = {
					left: 0,
					top: 0
				};
				const rawPos = calcXYRaw(positionParams, top, left);
				const { x: newX, y: newY } = applyPositionConstraints(constraints, effectiveLayoutItem, rawPos.x, rawPos.y, getConstraintContext());
				onDragStopProp(i, newX, newY, {
					e,
					node,
					newPosition
				});
			}, [
				onDragStopProp,
				dragging,
				positionParams,
				constraints,
				effectiveLayoutItem,
				getConstraintContext,
				i
			]);
			onDragStartRef.current = onDragStart;
			onDragRef.current = onDrag;
			const onResizeHandler = (0, react.useCallback)((e, { node, size, handle: resizeHandle2 }, position, handlerName) => {
				const handler = handlerName === "onResizeStart" ? onResizeStartProp : handlerName === "onResize" ? onResizeProp : onResizeStopProp;
				if (!handler) return;
				let updatedSize;
				if (node) updatedSize = resizeItemInDirection(resizeHandle2, position, size, containerWidth);
				else updatedSize = {
					...size,
					top: position.top,
					left: position.left
				};
				resizePositionRef.current = updatedSize;
				const rawSize = calcWHRaw(positionParams, updatedSize.width, updatedSize.height);
				const { w: newW, h: newH } = applySizeConstraints(constraints, effectiveLayoutItem, rawSize.w, rawSize.h, resizeHandle2, getConstraintContext());
				handler(i, newW, newH, {
					e: e.nativeEvent ?? e,
					node,
					size: updatedSize,
					handle: resizeHandle2
				});
			}, [
				onResizeStartProp,
				onResizeProp,
				onResizeStopProp,
				containerWidth,
				positionParams,
				i,
				constraints,
				effectiveLayoutItem,
				getConstraintContext
			]);
			const handleResizeStart = (0, react.useCallback)((e, data) => {
				setResizing(true);
				const pos2 = calcGridItemPosition(positionParams, x, y, w, h);
				const typedData = {
					...data,
					handle: data.handle
				};
				onResizeHandler(e, typedData, pos2, "onResizeStart");
			}, [
				onResizeHandler,
				positionParams,
				x,
				y,
				w,
				h
			]);
			const handleResize = (0, react.useCallback)((e, data) => {
				const pos2 = calcGridItemPosition(positionParams, x, y, w, h);
				const typedData = {
					...data,
					handle: data.handle
				};
				onResizeHandler(e, typedData, pos2, "onResize");
			}, [
				onResizeHandler,
				positionParams,
				x,
				y,
				w,
				h
			]);
			const handleResizeStop = (0, react.useCallback)((e, data) => {
				setResizing(false);
				resizePositionRef.current = {
					top: 0,
					left: 0,
					width: 0,
					height: 0
				};
				const pos2 = calcGridItemPosition(positionParams, x, y, w, h);
				const typedData = {
					...data,
					handle: data.handle
				};
				onResizeHandler(e, typedData, pos2, "onResizeStop");
			}, [
				onResizeHandler,
				positionParams,
				x,
				y,
				w,
				h
			]);
			(0, react.useEffect)(() => {
				if (!droppingPosition) return;
				const node = elementRef.current;
				if (!node) return;
				const prevDroppingPosition = prevDroppingPositionRef.current || {
					left: 0,
					top: 0
				};
				const shouldDrag = dragging && (droppingPosition.left !== prevDroppingPosition.left || droppingPosition.top !== prevDroppingPosition.top);
				if (!dragging) {
					const fakeData = {
						node,
						deltaX: droppingPosition.left,
						deltaY: droppingPosition.top,
						lastX: 0,
						lastY: 0,
						x: droppingPosition.left,
						y: droppingPosition.top
					};
					onDragStartRef.current?.(droppingPosition.e, fakeData);
				} else if (shouldDrag) {
					const fakeData = {
						node,
						deltaX: droppingPosition.left - dragPositionRef.current.left,
						deltaY: droppingPosition.top - dragPositionRef.current.top,
						lastX: dragPositionRef.current.left,
						lastY: dragPositionRef.current.top,
						x: droppingPosition.left,
						y: droppingPosition.top
					};
					onDragRef.current?.(droppingPosition.e, fakeData);
				}
				prevDroppingPositionRef.current = droppingPosition;
			}, [
				droppingPosition,
				dragging,
				i
			]);
			const pos = calcGridItemPosition(positionParams, x, y, w, h, dragging ? dragPositionRef.current : null, resizing ? resizePositionRef.current : null);
			const child = react.default.Children.only(children);
			const colWidth = calcGridColWidth(positionParams);
			const minConstraints = [calcGridItemWHPx(minW, colWidth, margin[0]), calcGridItemWHPx(minH, rowHeight, margin[1])];
			const maxConstraints = [calcGridItemWHPx(maxW, colWidth, margin[0]), calcGridItemWHPx(maxH, rowHeight, margin[1])];
			const childProps = child.props;
			const childClassName = childProps["className"];
			const childStyle = childProps["style"];
			let newChild = react.default.cloneElement(child, {
				ref: elementRef,
				className: clsx("react-grid-item", childClassName, className, {
					static: isStatic,
					resizing,
					"react-draggable": isDraggable,
					"react-draggable-dragging": dragging,
					dropping: Boolean(droppingPosition),
					cssTransforms: useCSSTransforms
				}),
				style: {
					...style,
					...childStyle,
					...createStyle(pos)
				}
			});
			const resizableHandle = resizeHandle;
			newChild = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(import_react_resizable.Resizable, {
				draggableOpts: { disabled: !isResizable },
				className: isResizable ? void 0 : "react-resizable-hide",
				width: pos.width,
				height: pos.height,
				minConstraints,
				maxConstraints,
				onResizeStart: handleResizeStart,
				onResize: handleResize,
				onResizeStop: handleResizeStop,
				transformScale,
				resizeHandles,
				handle: resizableHandle,
				children: newChild
			});
			newChild = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DraggableCore, {
				disabled: !isDraggable,
				onStart: onDragStart,
				onDrag,
				onStop: onDragStop,
				handle,
				cancel: ".react-resizable-handle" + (cancel ? "," + cancel : ""),
				scale: transformScale,
				nodeRef: elementRef,
				children: newChild
			});
			return newChild;
		}
		var noop = () => {};
		var layoutClassName = "react-grid-layout";
		var isFirefox = false;
		try {
			isFirefox = /firefox/i.test(navigator.userAgent);
		} catch {}
		function childrenEqual(a, b) {
			const aArr = react.default.Children.toArray(a);
			const bArr = react.default.Children.toArray(b);
			if (aArr.length !== bArr.length) return false;
			for (let i = 0; i < aArr.length; i++) {
				const aChild = aArr[i];
				const bChild = bArr[i];
				if (aChild?.key !== bChild?.key) return false;
			}
			return true;
		}
		function synchronizeLayoutWithChildren(initialLayout, children, cols, compactor) {
			const layout = [];
			const childKeys = /* @__PURE__ */ new Set();
			react.default.Children.forEach(children, (child) => {
				if (!react.default.isValidElement(child) || child.key === null) return;
				const key = String(child.key);
				childKeys.add(key);
				const existingItem = initialLayout.find((l) => l.i === key);
				if (existingItem) layout.push(cloneLayoutItem(existingItem));
				else {
					const dataGrid = child.props["data-grid"];
					if (dataGrid) layout.push({
						i: key,
						x: dataGrid.x ?? 0,
						y: dataGrid.y ?? 0,
						w: dataGrid.w ?? 1,
						h: dataGrid.h ?? 1,
						minW: dataGrid.minW,
						maxW: dataGrid.maxW,
						minH: dataGrid.minH,
						maxH: dataGrid.maxH,
						static: dataGrid.static,
						isDraggable: dataGrid.isDraggable,
						isResizable: dataGrid.isResizable,
						resizeHandles: dataGrid.resizeHandles,
						isBounded: dataGrid.isBounded
					});
					else layout.push({
						i: key,
						x: 0,
						y: bottom(layout),
						w: 1,
						h: 1
					});
				}
			});
			const corrected = correctBounds(layout, { cols });
			return compactor.compact(corrected, cols);
		}
		function GridLayout(props) {
			const { children, width, gridConfig: gridConfigProp, dragConfig: dragConfigProp, resizeConfig: resizeConfigProp, dropConfig: dropConfigProp, positionStrategy = defaultPositionStrategy, compactor: compactorProp, constraints = defaultConstraints, layout: propsLayout = [], droppingItem: droppingItemProp, autoSize = true, className = "", style = {}, innerRef, onLayoutChange = noop, onDragStart: onDragStartProp = noop, onDrag: onDragProp = noop, onDragStop: onDragStopProp = noop, onResizeStart: onResizeStartProp = noop, onResize: onResizeProp = noop, onResizeStop: onResizeStopProp = noop, onDrop: onDropProp = noop, onDropDragOver: onDropDragOverProp = noop } = props;
			const gridConfig = (0, react.useMemo)(() => ({
				...defaultGridConfig,
				...gridConfigProp
			}), [gridConfigProp]);
			const dragConfig = (0, react.useMemo)(() => ({
				...defaultDragConfig,
				...dragConfigProp
			}), [dragConfigProp]);
			const resizeConfig = (0, react.useMemo)(() => ({
				...defaultResizeConfig,
				...resizeConfigProp
			}), [resizeConfigProp]);
			const dropConfig = (0, react.useMemo)(() => ({
				...defaultDropConfig,
				...dropConfigProp
			}), [dropConfigProp]);
			const { cols, rowHeight, maxRows, margin, containerPadding } = gridConfig;
			const { enabled: isDraggable, bounded: isBounded, handle: draggableHandle, cancel: draggableCancel, threshold: dragThreshold } = dragConfig;
			const { enabled: isResizable, handles: resizeHandles, handleComponent: resizeHandle } = resizeConfig;
			const { enabled: isDroppable, defaultItem: defaultDropItem, onDragOver: dropConfigOnDragOver } = dropConfig;
			const compactor = compactorProp ?? getCompactor("vertical");
			const compactType = compactor.type;
			const allowOverlap = compactor.allowOverlap;
			const preventCollision = compactor.preventCollision ?? false;
			const droppingItem = (0, react.useMemo)(() => droppingItemProp ?? {
				i: "__dropping-elem__",
				...defaultDropItem
			}, [droppingItemProp, defaultDropItem]);
			const useCSSTransforms = positionStrategy.type === "transform";
			const transformScale = positionStrategy.scale;
			const effectiveContainerPadding = containerPadding ?? margin;
			const [mounted, setMounted] = (0, react.useState)(false);
			const [layout, setLayout] = (0, react.useState)(() => synchronizeLayoutWithChildren(propsLayout, children, cols, compactor));
			const [activeDrag, setActiveDrag] = (0, react.useState)(null);
			const [resizing, setResizing] = (0, react.useState)(false);
			const [droppingDOMNode, setDroppingDOMNode] = (0, react.useState)(null);
			const [droppingPosition, setDroppingPosition] = (0, react.useState)();
			const oldDragItemRef = (0, react.useRef)(null);
			const oldResizeItemRef = (0, react.useRef)(null);
			const oldLayoutRef = (0, react.useRef)(null);
			const dragEnterCounterRef = (0, react.useRef)(0);
			const prevLayoutRef = (0, react.useRef)(layout);
			const prevPropsLayoutRef = (0, react.useRef)(propsLayout);
			const prevChildrenRef = (0, react.useRef)(children);
			const prevCompactTypeRef = (0, react.useRef)(compactType);
			const layoutRef = (0, react.useRef)(layout);
			layoutRef.current = layout;
			(0, react.useEffect)(() => {
				setMounted(true);
				if (!(0, import_fast_equals_cjs.deepEqual)(layout, propsLayout)) onLayoutChange(layout);
			}, []);
			(0, react.useEffect)(() => {
				if (activeDrag) return;
				if (droppingDOMNode) return;
				const layoutChanged = !(0, import_fast_equals_cjs.deepEqual)(propsLayout, prevPropsLayoutRef.current);
				const childrenChanged = !childrenEqual(children, prevChildrenRef.current);
				const compactTypeChanged = compactType !== prevCompactTypeRef.current;
				if (layoutChanged || childrenChanged || compactTypeChanged) {
					const newLayout = synchronizeLayoutWithChildren(layoutChanged ? propsLayout : layout, children, cols, compactor);
					if (!(0, import_fast_equals_cjs.deepEqual)(newLayout, layout)) setLayout(newLayout);
				}
				prevPropsLayoutRef.current = propsLayout;
				prevChildrenRef.current = children;
				prevCompactTypeRef.current = compactType;
			}, [
				propsLayout,
				children,
				cols,
				compactType,
				compactor,
				activeDrag,
				droppingDOMNode,
				layout
			]);
			(0, react.useEffect)(() => {
				if (!activeDrag && !(0, import_fast_equals_cjs.deepEqual)(layout, prevLayoutRef.current)) {
					prevLayoutRef.current = layout;
					const publicLayout = layout.filter((l) => l.i !== droppingItem.i);
					onLayoutChange(publicLayout);
				}
			}, [
				layout,
				activeDrag,
				onLayoutChange,
				droppingItem.i
			]);
			const containerHeight = (0, react.useMemo)(() => {
				if (!autoSize) return void 0;
				const nbRow = bottom(layout);
				const containerPaddingY = effectiveContainerPadding[1];
				return nbRow * rowHeight + (nbRow - 1) * margin[1] + containerPaddingY * 2 + "px";
			}, [
				autoSize,
				layout,
				rowHeight,
				margin,
				effectiveContainerPadding
			]);
			const onDragStart = (0, react.useCallback)((i, _x, _y, data) => {
				const currentLayout = layoutRef.current;
				const l = getLayoutItem(currentLayout, i);
				if (!l) return;
				const placeholder = {
					w: l.w,
					h: l.h,
					x: l.x,
					y: l.y,
					i
				};
				oldDragItemRef.current = cloneLayoutItem(l);
				oldLayoutRef.current = currentLayout;
				setActiveDrag(placeholder);
				onDragStartProp(currentLayout, l, l, null, data.e, data.node);
			}, [onDragStartProp]);
			const onDrag = (0, react.useCallback)((i, x, y, data) => {
				const currentLayout = layoutRef.current;
				const oldDragItem = oldDragItemRef.current;
				const l = getLayoutItem(currentLayout, i);
				if (!l) return;
				const placeholder = {
					w: l.w,
					h: l.h,
					x: l.x,
					y: l.y,
					i
				};
				const newLayout = moveElement(currentLayout, l, x, y, true, preventCollision, compactType, cols, allowOverlap);
				onDragProp(newLayout, oldDragItem, l, placeholder, data.e, data.node);
				setLayout(compactor.compact(newLayout, cols));
				setActiveDrag(placeholder);
			}, [
				preventCollision,
				compactType,
				cols,
				allowOverlap,
				compactor,
				onDragProp
			]);
			const onDragStop = (0, react.useCallback)((i, x, y, data) => {
				if (!activeDrag) return;
				const currentLayout = layoutRef.current;
				const oldDragItem = oldDragItemRef.current;
				const l = getLayoutItem(currentLayout, i);
				if (!l) return;
				const newLayout = moveElement(currentLayout, l, x, y, true, preventCollision, compactType, cols, allowOverlap);
				const finalLayout = compactor.compact(newLayout, cols);
				onDragStopProp(finalLayout, oldDragItem, l, null, data.e, data.node);
				const oldLayout = oldLayoutRef.current;
				oldDragItemRef.current = null;
				oldLayoutRef.current = null;
				setActiveDrag(null);
				setLayout(finalLayout);
				if (oldLayout && !(0, import_fast_equals_cjs.deepEqual)(oldLayout, finalLayout)) onLayoutChange(finalLayout);
			}, [
				activeDrag,
				preventCollision,
				compactType,
				cols,
				allowOverlap,
				compactor,
				onDragStopProp,
				onLayoutChange
			]);
			const onResizeStart = (0, react.useCallback)((i, _w, _h, data) => {
				const currentLayout = layoutRef.current;
				const l = getLayoutItem(currentLayout, i);
				if (!l) return;
				oldResizeItemRef.current = cloneLayoutItem(l);
				oldLayoutRef.current = currentLayout;
				setResizing(true);
				onResizeStartProp(currentLayout, l, l, null, data.e, data.node);
			}, [onResizeStartProp]);
			const onResize = (0, react.useCallback)((i, w, h, data) => {
				const currentLayout = layoutRef.current;
				const oldResizeItem = oldResizeItemRef.current;
				const { handle } = data;
				let shouldMoveItem = false;
				let newX;
				let newY;
				const [newLayout, l] = withLayoutItem(currentLayout, i, (item) => {
					newX = item.x;
					newY = item.y;
					if ([
						"sw",
						"w",
						"nw",
						"n",
						"ne"
					].includes(handle)) {
						if ([
							"sw",
							"nw",
							"w"
						].includes(handle)) {
							newX = item.x + (item.w - w);
							w = item.x !== newX && newX < 0 ? item.w : w;
							newX = newX < 0 ? 0 : newX;
						}
						if ([
							"ne",
							"n",
							"nw"
						].includes(handle)) {
							newY = item.y + (item.h - h);
							h = item.y !== newY && newY < 0 ? item.h : h;
							newY = newY < 0 ? 0 : newY;
						}
						shouldMoveItem = true;
					}
					if (preventCollision && !allowOverlap) {
						if (getAllCollisions(currentLayout, {
							...item,
							w,
							h,
							x: newX ?? item.x,
							y: newY ?? item.y
						}).filter((layoutItem) => layoutItem.i !== item.i).length > 0) {
							newY = item.y;
							h = item.h;
							newX = item.x;
							w = item.w;
							shouldMoveItem = false;
						}
					}
					item.w = w;
					item.h = h;
					return item;
				});
				if (!l) return;
				let finalLayout = newLayout;
				if (shouldMoveItem && newX !== void 0 && newY !== void 0) finalLayout = moveElement(newLayout, l, newX, newY, true, preventCollision, compactType, cols, allowOverlap);
				const placeholder = {
					w: l.w,
					h: l.h,
					x: l.x,
					y: l.y,
					i,
					static: true
				};
				onResizeProp(finalLayout, oldResizeItem, l, placeholder, data.e, data.node);
				setLayout(compactor.compact(finalLayout, cols));
				setActiveDrag(placeholder);
			}, [
				preventCollision,
				compactType,
				cols,
				allowOverlap,
				compactor,
				onResizeProp
			]);
			const onResizeStop = (0, react.useCallback)((i, _w, _h, data) => {
				const currentLayout = layoutRef.current;
				const oldResizeItem = oldResizeItemRef.current;
				const l = getLayoutItem(currentLayout, i);
				const finalLayout = compactor.compact(currentLayout, cols);
				onResizeStopProp(finalLayout, oldResizeItem, l ?? null, null, data.e, data.node);
				const oldLayout = oldLayoutRef.current;
				oldResizeItemRef.current = null;
				oldLayoutRef.current = null;
				setActiveDrag(null);
				setResizing(false);
				setLayout(finalLayout);
				if (oldLayout && !(0, import_fast_equals_cjs.deepEqual)(oldLayout, finalLayout)) onLayoutChange(finalLayout);
			}, [
				cols,
				compactor,
				onResizeStopProp,
				onLayoutChange
			]);
			const removeDroppingPlaceholder = (0, react.useCallback)(() => {
				const currentLayout = layoutRef.current;
				if (!currentLayout.some((l) => l.i === droppingItem.i)) {
					setDroppingDOMNode(null);
					setActiveDrag(null);
					setDroppingPosition(void 0);
					return;
				}
				const newLayout = compactor.compact(currentLayout.filter((l) => l.i !== droppingItem.i), cols);
				setLayout(newLayout);
				setDroppingDOMNode(null);
				setActiveDrag(null);
				setDroppingPosition(void 0);
			}, [
				droppingItem.i,
				cols,
				compactor
			]);
			const handleDragOver = (0, react.useCallback)((e) => {
				e.preventDefault();
				e.stopPropagation();
				if (isFirefox && !e.nativeEvent.target?.classList.contains(layoutClassName)) return false;
				const rawResult = dropConfigOnDragOver ? dropConfigOnDragOver(e.nativeEvent) : onDropDragOverProp(e);
				if (rawResult === false) {
					if (droppingDOMNode) removeDroppingPlaceholder();
					return false;
				}
				const { dragOffsetX = 0, dragOffsetY = 0, ...onDragOverResult } = rawResult ?? {};
				const finalDroppingItem = {
					...droppingItem,
					...onDragOverResult
				};
				const gridRect = e.currentTarget.getBoundingClientRect();
				const positionParams = {
					cols,
					margin,
					maxRows,
					rowHeight,
					containerWidth: width,
					containerPadding: effectiveContainerPadding
				};
				const actualColWidth = calcGridColWidth(positionParams);
				const itemPixelWidth = calcGridItemWHPx(finalDroppingItem.w, actualColWidth, margin[0]);
				const itemPixelHeight = calcGridItemWHPx(finalDroppingItem.h, rowHeight, margin[1]);
				const itemCenterOffsetX = itemPixelWidth / 2;
				const itemCenterOffsetY = itemPixelHeight / 2;
				const rawGridX = e.clientX - gridRect.left + dragOffsetX - itemCenterOffsetX;
				const rawGridY = e.clientY - gridRect.top + dragOffsetY - itemCenterOffsetY;
				const clampedGridX = Math.max(0, rawGridX);
				const clampedGridY = Math.max(0, rawGridY);
				const newDroppingPosition = {
					left: clampedGridX / transformScale,
					top: clampedGridY / transformScale,
					e: e.nativeEvent
				};
				if (!droppingDOMNode) {
					const calculatedPosition = calcXY(positionParams, clampedGridY, clampedGridX, finalDroppingItem.w, finalDroppingItem.h);
					setDroppingDOMNode(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {}, finalDroppingItem.i));
					setDroppingPosition(newDroppingPosition);
					const baseLayout = layoutRef.current.filter((l) => l.i !== finalDroppingItem.i);
					setLayout([...baseLayout, {
						...finalDroppingItem,
						x: calculatedPosition.x,
						y: calculatedPosition.y,
						static: false,
						isDraggable: true
					}]);
				} else if (droppingPosition) {
					if (droppingPosition.left !== newDroppingPosition.left || droppingPosition.top !== newDroppingPosition.top) setDroppingPosition(newDroppingPosition);
				}
			}, [
				droppingDOMNode,
				droppingPosition,
				droppingItem,
				dropConfigOnDragOver,
				onDropDragOverProp,
				removeDroppingPlaceholder,
				transformScale,
				cols,
				margin,
				maxRows,
				rowHeight,
				width,
				effectiveContainerPadding
			]);
			const handleDragLeave = (0, react.useCallback)((e) => {
				e.preventDefault();
				e.stopPropagation();
				dragEnterCounterRef.current--;
				if (dragEnterCounterRef.current < 0) dragEnterCounterRef.current = 0;
				if (dragEnterCounterRef.current === 0) removeDroppingPlaceholder();
			}, [removeDroppingPlaceholder]);
			const handleDragEnter = (0, react.useCallback)((e) => {
				e.preventDefault();
				e.stopPropagation();
				dragEnterCounterRef.current++;
			}, []);
			const handleDrop = (0, react.useCallback)((e) => {
				e.preventDefault();
				e.stopPropagation();
				const currentLayout = layoutRef.current;
				const item = currentLayout.find((l) => l.i === droppingItem.i);
				dragEnterCounterRef.current = 0;
				removeDroppingPlaceholder();
				onDropProp(currentLayout, item, e.nativeEvent);
			}, [
				droppingItem.i,
				removeDroppingPlaceholder,
				onDropProp
			]);
			const processGridItem = (0, react.useCallback)((child, isDroppingItem) => {
				if (!child || !child.key) return null;
				const l = getLayoutItem(layout, String(child.key));
				if (!l) return null;
				const draggable = typeof l.isDraggable === "boolean" ? l.isDraggable : !l.static && isDraggable;
				const resizable = typeof l.isResizable === "boolean" ? l.isResizable : !l.static && isResizable;
				const resizeHandlesOptions = l.resizeHandles || [...resizeHandles];
				const bounded = draggable && isBounded && l.isBounded !== false;
				const resizeHandleElement = resizeHandle;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GridItem, {
					containerWidth: width,
					cols,
					margin,
					containerPadding: effectiveContainerPadding,
					maxRows,
					rowHeight,
					cancel: draggableCancel,
					handle: draggableHandle,
					onDragStart,
					onDrag,
					onDragStop,
					onResizeStart,
					onResize,
					onResizeStop,
					isDraggable: draggable,
					isResizable: resizable,
					isBounded: bounded,
					useCSSTransforms: useCSSTransforms && mounted,
					usePercentages: !mounted,
					transformScale,
					positionStrategy,
					dragThreshold,
					w: l.w,
					h: l.h,
					x: l.x,
					y: l.y,
					i: l.i,
					minH: l.minH,
					minW: l.minW,
					maxH: l.maxH,
					maxW: l.maxW,
					static: l.static,
					droppingPosition: isDroppingItem ? droppingPosition : void 0,
					resizeHandles: resizeHandlesOptions,
					resizeHandle: resizeHandleElement,
					constraints,
					layoutItem: l,
					layout,
					children: child
				}, l.i);
			}, [
				layout,
				width,
				cols,
				margin,
				effectiveContainerPadding,
				maxRows,
				rowHeight,
				draggableCancel,
				draggableHandle,
				onDragStart,
				onDrag,
				onDragStop,
				onResizeStart,
				onResize,
				onResizeStop,
				isDraggable,
				isResizable,
				isBounded,
				useCSSTransforms,
				mounted,
				transformScale,
				positionStrategy,
				dragThreshold,
				droppingPosition,
				resizeHandles,
				resizeHandle,
				constraints
			]);
			const renderPlaceholder = () => {
				if (!activeDrag) return null;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GridItem, {
					w: activeDrag.w,
					h: activeDrag.h,
					x: activeDrag.x,
					y: activeDrag.y,
					i: activeDrag.i,
					className: `react-grid-placeholder ${resizing ? "placeholder-resizing" : ""}`,
					containerWidth: width,
					cols,
					margin,
					containerPadding: effectiveContainerPadding,
					maxRows,
					rowHeight,
					isDraggable: false,
					isResizable: false,
					isBounded: false,
					useCSSTransforms,
					transformScale,
					constraints,
					layout,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {})
				});
			};
			const mergedClassName = clsx(layoutClassName, className);
			const mergedStyle = {
				height: containerHeight,
				...style
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: innerRef,
				className: mergedClassName,
				style: mergedStyle,
				onDrop: isDroppable ? handleDrop : void 0,
				onDragLeave: isDroppable ? handleDragLeave : void 0,
				onDragEnter: isDroppable ? handleDragEnter : void 0,
				onDragOver: isDroppable ? handleDragOver : void 0,
				children: [
					react.default.Children.map(children, (child) => {
						if (!react.default.isValidElement(child)) return null;
						return processGridItem(child);
					}),
					isDroppable && droppingDOMNode && processGridItem(droppingDOMNode, true),
					renderPlaceholder()
				]
			});
		}
		/**
		* 0.9.1（2026-08-31 用户拍板 A 方案）：tile 列宽上限不再固定 12——跟随视口
		* 「能装下多少格」，拖多大松手就稳定多大（与 dock 面板「无上限拖宽」同精神）。
		* GRID_COLUMNS 仍是 RGL 显示网格与 pin 落位的参考值；存储层上限动态放宽。
		* SSR/测试环境（无 innerWidth）回落 48 列（超宽屏也够用）。
		*/
		const STORAGE_MAX_COLUMNS = () => {
			const viewport = globalThis.innerWidth;
			return typeof viewport === "number" && Number.isFinite(viewport) && viewport > 0 ? Math.ceil(viewport / 60) : 48;
		};
		const int = (value, fallback) => Number.isFinite(value) ? Math.round(value) : fallback;
		/** 钳制布局到合法边界（宽 1–视口上限列 / 高 1-24 行 / 不越出右缘） */
		function clampLayout(layout) {
			const maxColumns = STORAGE_MAX_COLUMNS();
			const columns = Math.min(maxColumns, Math.max(1, int(layout.columns ?? 6, 6)));
			const rows = Math.min(24, Math.max(1, int(layout.rows ?? 4, 4)));
			return {
				column: Math.min(Math.max(0, maxColumns - columns), Math.max(0, int(layout.column ?? 0, 0))),
				row: Math.max(0, int(layout.row ?? 0, 0)),
				columns,
				rows
			};
		}
		/** 网格占用图（行数动态）：occupied[r][c] */
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
		/**
		* pin 落位：从上往下找第一个能放下的空位（RGL 接管后仍保留——
		* 新 tile 进板需要一个合法非重叠的初始位置，RGL 不会为外部新增项找位）。
		*/
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
		/** DockTile[] → RGL layout（渲染输入） */
		function toRglLayout(tiles) {
			return tiles.map((t) => ({
				i: t.tileId,
				x: t.layout.column,
				y: t.layout.row,
				w: t.layout.columns,
				h: t.layout.rows
			}));
		}
		/** RGL layout → tileId → TileLayout（onLayoutChange 回写输入；非法项钳制） */
		function fromRglLayout(items) {
			const result = /* @__PURE__ */ new Map();
			for (const item of items) {
				if (typeof item?.i !== "string" || item.i.length === 0 || typeof item.x !== "number" || typeof item.y !== "number") continue;
				result.set(item.i, clampLayout({
					column: item.x,
					row: item.y,
					columns: item.w,
					rows: item.h
				}));
			}
			return result;
		}
		/**
		* 重力紧凑（「整理」按钮，2026-08-24 恢复）：按视觉顺序（row→col）排序后，
		* 每个 tile 从顶部找最近空位重新落位——消除拖拽产生的空洞，
		* 保持相对顺序（用户的人工排列意图不被打乱）。
		*/
		function compactTiles(tiles) {
			const sorted = [...tiles].sort((a, b) => a.layout.row - b.layout.row || a.layout.column - b.layout.column);
			const placed = [];
			const next = /* @__PURE__ */ new Map();
			for (const t of sorted) {
				const layout = findNearestSlot(placed, {
					columns: t.layout.columns,
					rows: t.layout.rows
				});
				placed.push({
					tileId: t.tileId,
					layout
				});
				next.set(t.tileId, layout);
			}
			return tiles.map((t) => ({
				...t,
				layout: next.get(t.tileId) ?? t.layout
			}));
		}
		//#endregion
		//#region src/client/store.ts
		/**
		* Dock Board store v2（2026-08-25 Dock 2.0）：多看板 + tile 别名。
		* 手写 useSyncExternalStore 友好 store（无 zustand 依赖——bundle 尺寸考虑）。
		*
		* 持久化（M3 双层）：localStorage 恒为本地副本（v1→v2 迁移也在此完成）；
		* 远端门面（@openloop/dsh-app 的 /openloop/app/boards）为权威存储——经
		* setRemotePersist 挂钩后每次 emit 异步推送（fire-and-forget，失败由挂钩方提示）。
		* 门面不可用时 store 退化为纯 localStorage（降级不炸页，DOCK_V2_FRONTEND_IMPL §7 M3）。
		*/
		const STORAGE_KEY = "openloop.dock.board.v1";
		let seq$1 = 0;
		const newTileId = () => {
			seq$1 += 1;
			return `tile-${Date.now().toString(36)}-${seq$1.toString(36)}`;
		};
		let boardSeq = 0;
		const newBoardId = () => {
			boardSeq += 1;
			return `board-${Date.now().toString(36)}-${boardSeq.toString(36)}`;
		};
		const DEFAULT_BOARD_ID = "b-default";
		const DEFAULT_BOARD_NAME = "默认看板";
		const emptyState = () => ({
			version: 2,
			boards: [{
				id: DEFAULT_BOARD_ID,
				name: DEFAULT_BOARD_NAME,
				tiles: []
			}],
			activeBoardId: DEFAULT_BOARD_ID
		});
		/** 容错：布局逐个 clamp；非法 tile 剔除（错误边界原则——坏数据不进 store） */
		function sanitizeTiles(tiles) {
			if (!Array.isArray(tiles)) return [];
			return tiles.filter((t) => t && typeof t.tileId === "string" && typeof t.title === "string" && t.source && t.source.kind).map((t) => ({
				...t,
				layout: clampLayout(t.layout ?? {})
			})).map(migrateArtifactTile);
		}
		/**
		* 0.5.5 命名迁移（2026-09-01）：旧 artifact 内置组件 rid 带 `example-` 前缀，
		* seed 后已改为正式 rid（openloop:system-map / agent-dashboard / usage-report /
		* backend-console）。已 pin 的旧 tile 是快照，rid/path 仍是 example 形态，导致
		* sourceIdOf 退化为旧 path 文件名、与 registry 新 rid 匹配不上（「已固定」徽章
		* 不显示、渲染用旧 HTML）。此处一次性迁移：把旧 rid / 旧 path 归一化为新 rid，
		* 使后续 registry 按 rid 查找命中、渲染取最新 entry。
		*/
		const LEGACY_ARTIFACT_RIDS = {
			"openloop:example-system-map": "openloop:system-map",
			"openloop:example-agent-dashboard": "openloop:agent-dashboard",
			"openloop:example-usage-report": "openloop:usage-report",
			"openloop:example-backend-console": "openloop:backend-console"
		};
		function migrateArtifactTile(tile) {
			if (tile.source.kind !== "artifact") return tile;
			const meta = tile.source.meta;
			if (typeof meta.rid === "string" && LEGACY_ARTIFACT_RIDS[meta.rid] !== void 0) return {
				...tile,
				source: {
					...tile.source,
					meta: {
						...meta,
						rid: LEGACY_ARTIFACT_RIDS[meta.rid]
					}
				}
			};
			if (typeof meta.path === "string") {
				const match = meta.path.match(/example-([a-z-]+)\.html/);
				if (match !== null) {
					const newRid = `openloop:${match[1] ?? ""}`;
					if (LEGACY_ARTIFACT_RIDS[`openloop:example-${match[1] ?? ""}`] !== void 0) return {
						...tile,
						source: {
							...tile.source,
							meta: {
								...meta,
								rid: newRid
							}
						}
					};
				}
			}
			return tile;
		}
		function persistState(state) {
			if (typeof localStorage === "undefined") return;
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
			} catch {}
		}
		/** v2 负载校验：v1 负载（单板 tiles）包成 v2（一次性迁移，无兼容层）；坏数据不进 store */
		function coerceStateV2(parsed) {
			if (parsed?.version === 2) return sanitizeStateV2(parsed);
			if (parsed?.version === 1 && Array.isArray(parsed.tiles)) return {
				version: 2,
				boards: [{
					id: DEFAULT_BOARD_ID,
					name: DEFAULT_BOARD_NAME,
					tiles: sanitizeTiles(parsed.tiles)
				}],
				activeBoardId: DEFAULT_BOARD_ID
			};
		}
		/** v2 负载校验：boards 逐个规整（名称兜底、tile 容错）；activeBoardId 失效回落首板 */
		function sanitizeStateV2(parsed) {
			const boards = (Array.isArray(parsed.boards) ? parsed.boards : []).map((b) => {
				const board = b;
				if (!board || typeof board.id !== "string" || board.id.length === 0) return void 0;
				const name = typeof board.name === "string" && board.name.trim().length > 0 ? board.name : DEFAULT_BOARD_NAME;
				return {
					id: board.id,
					name,
					tiles: sanitizeTiles(board.tiles)
				};
			}).filter((b) => b !== void 0);
			if (boards.length === 0) return emptyState();
			const first = boards[0];
			if (first === void 0) return emptyState();
			return {
				version: 2,
				boards,
				activeBoardId: typeof parsed.activeBoardId === "string" && boards.some((b) => b.id === parsed.activeBoardId) ? parsed.activeBoardId : first.id
			};
		}
		function readState() {
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (raw === null) return emptyState();
				const parsed = JSON.parse(raw);
				const state = coerceStateV2(parsed);
				if (state === void 0) return emptyState();
				if (parsed?.version !== 2) persistState(state);
				return state;
			} catch {
				return emptyState();
			}
		}
		var DockStore = class {
			state = emptyState();
			listeners = /* @__PURE__ */ new Set();
			initialized = false;
			/** 远端门面写钩子（M3：backend-sync 在门面可用后安装；fire-and-forget） */
			remotePersist = null;
			/** 远端钩子安装后抑制一次推送（载入远端数据本身不该回推） */
			suppressRemoteOnce = false;
			subscribe(listener) {
				this.ensureInit();
				this.listeners.add(listener);
				return () => this.listeners.delete(listener);
			}
			getSnapshot() {
				this.ensureInit();
				return this.state;
			}
			ensureInit() {
				if (!this.initialized && typeof localStorage !== "undefined") {
					this.state = readState();
					this.initialized = true;
				}
			}
			emit(next, persist = true) {
				this.state = next;
				if (persist) persistState(next);
				if (this.remotePersist !== null && !this.suppressRemoteOnce) this.remotePersist(next);
				else this.suppressRemoteOnce = false;
				for (const listener of this.listeners) listener();
			}
			/** M3：安装远端写钩子（门面模式启动后调用；此后每次 emit 推送远端） */
			setRemotePersist(fn) {
				this.remotePersist = fn;
			}
			/**
			* M3：载入远端权威数据（sanitize；坏数据不进 store）。
			* 输入契约 = 门面 loadDockState（恒 v2 或 null）——v1 只在 localStorage 读取时迁移，
			* 远端出现 v1/垃圾负载一律拒绝（严格，返回 false 保持本地态）。
			*/
			importState(remote) {
				this.ensureInit();
				const parsed = remote;
				if (typeof parsed !== "object" || parsed === null || parsed.version !== 2) return false;
				if (!Array.isArray(parsed.boards) || parsed.boards.length === 0) return false;
				const state = sanitizeStateV2(parsed);
				this.suppressRemoteOnce = true;
				this.emit(state, true);
				return true;
			}
			/** 当前激活板（activeBoardId 失效时回落首板；state 规整后恒有 ≥1 板，undefined 仅理论值） */
			getActiveBoard() {
				this.ensureInit();
				return this.state.boards.find((b) => b.id === this.state.activeBoardId) ?? this.state.boards[0];
			}
			updateActiveTiles(fn) {
				const board = this.getActiveBoard();
				if (board === void 0) return;
				const tiles = fn(board.tiles);
				this.emit({
					...this.state,
					boards: this.state.boards.map((b) => b.id === board.id ? {
						...b,
						tiles
					} : b)
				});
			}
			/** 新增看板页并激活；返回新板 id */
			addBoard() {
				this.ensureInit();
				const id = newBoardId();
				const name = this.nextBoardName();
				this.emit({
					...this.state,
					boards: [...this.state.boards, {
						id,
						name,
						tiles: []
					}],
					activeBoardId: id
				});
				return id;
			}
			nextBoardName() {
				for (let n = this.state.boards.length + 1;; n++) {
					const name = `看板 ${n}`;
					if (!this.state.boards.some((b) => b.name === name)) return name;
				}
			}
			renameBoard(id, name) {
				this.ensureInit();
				const trimmed = name.trim();
				if (!trimmed) return;
				this.emit({
					...this.state,
					boards: this.state.boards.map((b) => b.id === id ? {
						...b,
						name: trimmed
					} : b)
				});
			}
			/** 删除看板页；末板不可删（UI 在单板时隐藏删除入口）；删的是激活板则回落首板 */
			removeBoard(id) {
				this.ensureInit();
				if (this.state.boards.length <= 1) return;
				const boards = this.state.boards.filter((b) => b.id !== id);
				if (boards.length === this.state.boards.length) return;
				const fallback = boards[0];
				if (fallback === void 0) return;
				const activeBoardId = this.state.activeBoardId === id ? fallback.id : this.state.activeBoardId;
				this.emit({
					...this.state,
					boards,
					activeBoardId
				});
			}
			setActiveBoard(id) {
				this.ensureInit();
				if (id === this.state.activeBoardId || !this.state.boards.some((b) => b.id === id)) return;
				this.emit({
					...this.state,
					activeBoardId: id
				});
			}
			/** 看板页重排（2026-09-03 拖拽排序）：传入完整 id 顺序；未知 id 忽略，缺漏 id 续后 */
			reorderBoards(ids) {
				this.ensureInit();
				const byId = new Map(this.state.boards.map((b) => [b.id, b]));
				const next = ids.map((id) => byId.get(id)).filter((b) => b !== void 0);
				for (const b of this.state.boards) if (!next.includes(b)) next.push(b);
				if (next.length === 0) return;
				this.emit({
					...this.state,
					boards: next
				});
			}
			setTileAlias(tileId, alias) {
				this.updateActiveTiles((tiles) => tiles.map((t) => {
					if (t.tileId !== tileId) return t;
					if (alias === null || alias.length === 0) {
						const { alias: _dropped, ...rest } = t;
						return rest;
					}
					return {
						...t,
						alias
					};
				}));
			}
			pin(source, title, origin = null, layoutHint) {
				const layout = findNearestSlot(this.getActiveBoard()?.tiles ?? [], {
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
				this.updateActiveTiles((tiles) => [...tiles, tile]);
				return tile;
			}
			remove(tileId) {
				this.updateActiveTiles((tiles) => tiles.filter((t) => t.tileId !== tileId));
			}
			move(tileId, target) {
				this.updateActiveTiles((tiles) => tiles.map((t) => t.tileId === tileId ? {
					...t,
					layout: clampLayout(target)
				} : t));
			}
			/**
			* RGL onLayoutChange 回写（2026-08-24 v0.3.0）：一次 emit 写回全部 tile 布局
			* （RGL 的 verticalCompactor 会同时移动多个 tile）。未知 tileId 忽略。
			*/
			applyLayout(items) {
				const next = fromRglLayout(items);
				if (next.size === 0) return;
				const board = this.getActiveBoard();
				if (board === void 0) return;
				let changed = false;
				const tiles = board.tiles.map((t) => {
					const layout = next.get(t.tileId);
					if (layout === void 0 || layout === t.layout) return t;
					changed = true;
					return {
						...t,
						layout
					};
				});
				if (changed) this.emit({
					...this.state,
					boards: this.state.boards.map((b) => b.id === board.id ? {
						...b,
						tiles
					} : b)
				});
			}
			/** 清空激活板的全部 tile */
			clear() {
				const board = this.getActiveBoard();
				if (board === void 0 || board.tiles.length === 0) return;
				this.emit({
					...this.state,
					boards: this.state.boards.map((b) => b.id === board.id ? {
						...b,
						tiles: []
					} : b)
				});
			}
			/** 「整理」：重力紧凑（消除空洞、保持相对顺序）——无变化时不 emit */
			compact() {
				const board = this.getActiveBoard();
				if (board === void 0 || board.tiles.length === 0) return;
				const compacted = compactTiles(board.tiles);
				if (compacted.some((t, i) => t.layout !== board.tiles[i]?.layout)) this.emit({
					...this.state,
					boards: this.state.boards.map((b) => b.id === board.id ? {
						...b,
						tiles: compacted
					} : b)
				});
			}
		};
		const dockStore = new DockStore();
		//#endregion
		//#region src/client/icons.tsx
		function I({ d, size = 15, sw = 1.5 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: sw,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: d.map((p, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: p }, i))
			});
		}
		const icons = {
			board: (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(I, {
				...p,
				d: [
					"M3 3h7v7H3z",
					"M14 3h7v7h-7z",
					"M3 14h7v7H3z",
					"M14 14h7v7h-7z"
				]
			}),
			apps: (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(I, {
				...p,
				d: [
					"M12 2l9 5-9 5-9-5 9-5z",
					"M3 12l9 5 9-5",
					"M3 17l9 5 9-5"
				]
			}),
			pin: (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(I, {
				...p,
				d: ["M9 4h6l1 7 3 3H5l3-3 1-7z", "M12 14v7"]
			}),
			snap: (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(I, {
				...p,
				d: ["M11 4h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M6.5 9.5H6a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h6.5a2 2 0 0 0 2-2v-.5"]
			}),
			search: (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(I, {
				...p,
				d: ["M11 19a8 8 0 100-16 8 8 0 000 16z", "M21 21l-4.35-4.35"]
			}),
			chevronR: (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(I, {
				...p,
				d: ["M9 18l6-6-6-6"]
			}),
			chevronL: (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(I, {
				...p,
				d: ["M15 18l-6-6 6-6"]
			}),
			list: (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(I, {
				...p,
				d: [
					"M8 6h13",
					"M8 12h13",
					"M8 18h13",
					"M3 6h.01",
					"M3 12h.01",
					"M3 18h.01"
				]
			}),
			grid: (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(I, {
				...p,
				d: [
					"M3 3h7v7H3z",
					"M14 3h7v7h-7z",
					"M3 14h7v7H3z",
					"M14 14h7v7h-7z"
				]
			}),
			x: (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(I, {
				...p,
				d: ["M18 6L6 18", "M6 6l12 12"]
			}),
			plus: (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(I, {
				...p,
				d: ["M12 5v14", "M5 12h14"]
			}),
			check: (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(I, {
				...p,
				d: ["M20 6L9 17l-5-5"]
			}),
			trash: (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(I, {
				...p,
				d: [
					"M3 6h18",
					"M8 6V4h8v2",
					"M19 6l-1 14H6L5 6"
				]
			}),
			sort: (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(I, {
				...p,
				d: [
					"M11 5h10",
					"M11 9h7",
					"M11 13h4",
					"M3 17l3 3 3-3",
					"M6 18V4"
				]
			}),
			info: (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(I, {
				...p,
				d: [
					"M12 21a9 9 0 100-18 9 9 0 000 18z",
					"M12 11v6",
					"M12 7.5v.01"
				]
			})
		};
		//#endregion
		//#region src/client/base-bridge.tsx
		/**
		* OpenLoop Base client 懒桥（「关 base 不炸 loader」根治，2026-08-24）：
		*
		* 背景：external 依赖的顶层 import 会被 rolldown 编译成 bundle factory 体内
		* 的立即 require——base 被禁用时 require 抛 "missed the module table"，
		* materialize 失败炸掉整个插件树（页面 "Failed to load plugins"）。
		*
		* 方案：require 移入函数体（rolldown 原样保留调用位置）+ try/catch + 缓存
		* （失败不缓存，插件启用后无需刷新即可恢复）。base 缺失时调用方渲染
		* DependencyMissing 降级条，而不是让 loader 崩溃。
		*/
		let cached;
		/** base 可用时返回其 client 模块；被禁用时返回 undefined（下次调用重试，不缓存失败） */
		function getBaseClient() {
			if (cached !== void 0) return cached;
			try {
				cached = require("@openloop/dsh-base/client");
			} catch {
				return;
			}
			return cached;
		}
		/** base 缺失时的统一降级 UI（说明依赖关系，指引用户启用） */
		function DependencyMissing({ what, dep = "@openloop/dsh-base" }) {
			return (0, react.createElement)("div", { style: {
				padding: "14px 16px",
				fontSize: 12,
				lineHeight: 1.6,
				opacity: .75,
				border: "1px dashed rgba(127,127,127,.4)",
				borderRadius: 10,
				display: "flex",
				gap: 8,
				alignItems: "center",
				flexWrap: "wrap"
			} }, (0, react.createElement)("strong", { style: { fontSize: 12 } }, what), (0, react.createElement)("span", null, `依赖插件 ${dep} 未启用——在设置 · 插件页启用后自动恢复`));
		}
		//#endregion
		//#region src/client/openloop-clients.ts
		let panelsCache;
		let artifactCache;
		let mcpCache;
		function getPanelsClient() {
			if (panelsCache !== void 0) return panelsCache;
			try {
				panelsCache = require("@openloop/dsh-panels/client");
			} catch {
				return;
			}
			return panelsCache;
		}
		function getArtifactClient() {
			if (artifactCache !== void 0) return artifactCache;
			try {
				artifactCache = require("@openloop/dsh-html-artifact/client");
			} catch {
				return;
			}
			return artifactCache;
		}
		function getMcpAppsClient() {
			if (mcpCache !== void 0) return mcpCache;
			try {
				mcpCache = require("@openloop/dsh-mcp/client");
			} catch {
				return;
			}
			return mcpCache;
		}
		//#endregion
		//#region src/client/app-registry.ts
		const textChild = (id, text) => ({
			id,
			source: {
				type: "preset",
				kind: "text",
				props: { text }
			}
		});
		/** 26 个已实现预设的展示文案 + 示例 props（与 panels tests/presets 单测样例同源） */
		const PRESET_INFO = {
			accordion: {
				title: "折叠面板",
				desc: "可展开收起的条目组",
				props: {
					title: "使用说明",
					items: [{
						label: "第一步",
						content: "克隆仓库"
					}, {
						label: "第二步",
						content: "安装依赖"
					}]
				}
			},
			avatar: {
				title: "头像",
				desc: "姓名首字圆形徽标",
				props: { name: "王小明" }
			},
			badge: {
				title: "徽章",
				desc: "短状态标签",
				props: {
					label: "Beta",
					tone: "info"
				}
			},
			callout: {
				title: "提示条",
				desc: "醒目的信息 / 警告",
				props: {
					tone: "info",
					title: "提示",
					description: "这是一条提示信息"
				}
			},
			card: {
				title: "卡片",
				desc: "带标题的内容分组",
				props: {
					title: "卡片标题",
					description: "卡片描述",
					children: [textChild("w1", "卡片内容")]
				}
			},
			chart: {
				title: "图表",
				desc: "折线 / 柱状 / 环形",
				props: {
					variant: "line",
					xKey: "day",
					data: [
						{
							day: "周一",
							visits: 3
						},
						{
							day: "周二",
							visits: 5
						},
						{
							day: "周三",
							visits: 4
						}
					],
					series: [{ key: "visits" }],
					area: true
				}
			},
			comparison: {
				title: "对比表",
				desc: "多方案逐项对比",
				props: {
					title: "方案对比",
					columns: [{
						id: "basic",
						title: "基础版",
						subtitle: "免费"
					}, {
						id: "pro",
						title: "专业版",
						subtitle: "¥99/月",
						recommended: true
					}],
					rows: [{
						label: "存储空间",
						values: ["5 GB", "100 GB"]
					}, {
						label: "团队协作",
						values: ["不支持", "支持"]
					}]
				}
			},
			"data-table": {
				title: "数据表格",
				desc: "结构化数据表",
				props: {
					title: "订单明细",
					columns: [{
						key: "name",
						label: "客户"
					}, {
						key: "amount",
						label: "金额",
						format: "currency-cny"
					}],
					rows: [{
						id: 1,
						name: "甲公司",
						amount: 1234.5
					}, {
						id: 2,
						name: "乙公司",
						amount: 99
					}]
				}
			},
			divider: {
				title: "分隔线",
				desc: "段落分隔（可带标签）",
				props: { label: "里程碑" }
			},
			flow: {
				title: "流程图",
				desc: "节点与连边流程",
				props: {
					title: "发布流程",
					nodes: [
						{
							id: "a",
							label: "提交代码",
							tone: "info"
						},
						{
							id: "b",
							label: "CI 构建"
						},
						{
							id: "c",
							label: "部署上线",
							tone: "success"
						}
					],
					edges: [{
						from: "a",
						to: "b",
						label: "push"
					}, {
						from: "b",
						to: "c"
					}]
				}
			},
			funnel: {
				title: "漏斗",
				desc: "阶段转化比例",
				props: {
					title: "转化漏斗",
					stages: [{
						label: "访问",
						value: 1e3
					}, {
						label: "下单",
						value: 320
					}]
				}
			},
			gauge: {
				title: "仪表盘",
				desc: "单值占比仪表",
				props: {
					label: "完成率",
					value: 45,
					unit: "%"
				}
			},
			grid: {
				title: "网格",
				desc: "等宽格子布局",
				props: {
					columns: 2,
					children: [textChild("w1", "格子 A"), textChild("w2", "格子 B")]
				}
			},
			heading: {
				title: "标题",
				desc: "章节标题",
				props: {
					text: "标题",
					level: 2
				}
			},
			heatmap: {
				title: "热力图",
				desc: "矩阵强度分布",
				props: { matrix: [[1, 2], [3, 4]] }
			},
			markdown: {
				title: "Markdown",
				desc: "富文本渲染",
				props: { content: "# 摘要\n\n支持 **加粗**、`代码` 与列表" }
			},
			"metric-grid": {
				title: "指标网格",
				desc: "KPI 大数字卡片",
				props: { items: [{
					id: "rev",
					label: "月营收",
					value: 48210,
					format: "currency-cny",
					delta: "+12.4%",
					deltaTone: "up"
				}, {
					id: "ord",
					label: "订单数",
					value: 1208,
					delta: "-2.1%",
					deltaTone: "down"
				}] }
			},
			progress: {
				title: "进度条",
				desc: "目标完成度",
				props: {
					label: "完成度",
					value: 50,
					max: 100
				}
			},
			"pb-stats": {
				title: "后端状态",
				desc: "本地后端运行统计",
				props: { autoRefreshMs: 3e4 }
			},
			"db-browser": {
				title: "数据库浏览",
				desc: "筛选 + 选库 + 分页查数据",
				props: {
					collection: "apps",
					perPage: 20
				}
			},
			"storage-usage": {
				title: "存储占用",
				desc: "DSH_HOME 磁盘分解",
				props: {}
			},
			"api-credentials": {
				title: "凭据总览",
				desc: "API 凭据配置状态",
				props: {}
			},
			"sessions-stats": {
				title: "会话统计",
				desc: "会话数/占用/活跃度",
				props: {}
			},
			"mcp-status": {
				title: "MCP 状态",
				desc: "MCP 服务清单与连接",
				props: {}
			},
			"plugin-registry": {
				title: "插件清单",
				desc: "已加载插件分组",
				props: {}
			},
			"app-manager": {
				title: "APP 管理",
				desc: "全部应用的管理面板（断开/重连/删除）",
				props: { autoRefreshMs: 3e4 }
			},
			"api-usage-monitor": {
				title: "调用监控",
				desc: "API 绑定与 MCP 调用统计",
				props: { autoRefreshMs: 3e4 }
			},
			"system-overview": {
				title: "系统总览",
				desc: "后端/MCP/存储/会话一屏聚合",
				props: { autoRefreshMs: 3e4 }
			},
			"event-log": {
				title: "系统事件流",
				desc: "系统行为的历史记录",
				props: { limit: 50 }
			},
			"agent-activity": {
				title: "Agent 行为",
				desc: "Agent 最近动作与工具热度",
				props: {}
			},
			row: {
				title: "横向行",
				desc: "水平排列子组件",
				props: { children: [textChild("w1", "项 A"), textChild("w2", "项 B")] }
			},
			section: {
				title: "分区",
				desc: "带标题的内容区块",
				props: { title: "分区标题" }
			},
			sparkline: {
				title: "迷你走势",
				desc: "数值 + 趋势火花线",
				props: {
					label: "近 7 日访问",
					value: 1280,
					series: [
						1,
						3,
						2,
						5,
						4,
						8,
						6
					]
				}
			},
			split: {
				title: "分栏",
				desc: "左右两栏布局",
				props: { children: [textChild("l", "左栏"), textChild("r", "右栏")] }
			},
			stack: {
				title: "纵向堆叠",
				desc: "垂直排列子组件",
				props: { children: [textChild("w1", "条目一"), textChild("w2", "条目二")] }
			},
			tag: {
				title: "标签",
				desc: "技术 / 分类小标签",
				props: { label: "React" }
			},
			text: {
				title: "文本",
				desc: "基础段落文本",
				props: { text: "一段说明文本" }
			},
			timeline: {
				title: "时间线",
				desc: "事件先后序列",
				props: {
					title: "迭代节奏",
					items: [{
						id: "t1",
						title: "需求评审",
						status: "past",
						time: "周一"
					}, {
						id: "t2",
						title: "开发联调",
						status: "current",
						time: "周三",
						detail: "进行中"
					}]
				}
			}
		};
		/**
		* M2 内置 APP 的 API 资源（mock）：演示 API 分组的展示形态（状态点 / 鉴权徽章）。
		* M3 接 @openloop/dsh-app 门面后由真实 API 配置替换。
		*/
		const BUILTIN_APIS = [
			{
				id: "openloop:boards",
				domain: "local.app",
				path: "/api/boards",
				auth: "none",
				status: "ok",
				summary: "看板集合的 CRUD（本地后端）"
			},
			{
				id: "openloop:tiles",
				domain: "local.app",
				path: "/api/tiles",
				auth: "none",
				status: "ok",
				summary: "看板 tile 的排布与快照"
			},
			{
				id: "openloop:components",
				domain: "local.app",
				path: "/api/components",
				auth: "none",
				status: "ok",
				summary: "APP 组件资源注册表"
			}
		];
		/** 内置 APP（openloop）：组件 = panels 已实现预设清单，API = mock */
		function listBuiltinApps() {
			const panels = getPanelsClient();
			const kinds = panels?.allPresetKinds();
			if (panels === void 0 || kinds === void 0) return {
				apps: [],
				panelsMissing: true
			};
			return {
				apps: [{
					id: "openloop",
					name: "OpenLoop",
					kind: "builtin",
					version: "1.0.0",
					desc: "系统内置 APP：预置 panels 组件与本地后端 API，开箱即用。",
					components: kinds.map((kind) => {
						const info = PRESET_INFO[kind];
						if (info === void 0) return void 0;
						return {
							id: `openloop:${kind}`,
							title: info.title,
							type: "panel",
							desc: info.desc,
							kind,
							pinnable: true
						};
					}).filter((c) => c !== void 0),
					apis: BUILTIN_APIS
				}],
				panelsMissing: false
			};
		}
		Object.fromEntries(Object.entries(PRESET_INFO).map(([kind, info]) => [kind, info.props]));
		const APP_KINDS_REMOTE = [
			"builtin",
			"local",
			"thirdparty"
		];
		function str(value, fallback = "") {
			return typeof value === "string" ? value : fallback;
		}
		/** 门面行 → dock AppDescriptor（组件 pinnable：entry.panel 合法即可 pin——v1 渲染闭环；mcp-app 引用形态合法即可 pin——v2） */
		function remoteAppToDescriptor(detail) {
			const name = str(detail.app?.name);
			if (name.length === 0) return null;
			const components = (Array.isArray(detail.components) ? detail.components : []).map((c) => {
				const rid = str(c?.rid);
				if (rid.length === 0) return null;
				const entry = c?.entry;
				if (c?.kind === "mcp-app") return {
					id: rid,
					title: str(c?.title, rid),
					type: "mcp-app",
					desc: str(c?.description),
					kind: "",
					pinnable: entryMcpAppOf(entry) !== null,
					entry
				};
				return {
					id: rid,
					title: str(c?.title, rid),
					type: c?.kind === "artifact" ? "artifact" : "panel",
					desc: str(c?.description),
					kind: "",
					pinnable: entryPanelOf(entry) !== null || entryArtifactOf(entry) !== null,
					entry
				};
			}).filter((c) => c !== null);
			const apis = (Array.isArray(detail.apis) ? detail.apis : []).map((api) => ({
				id: str(api?.rid),
				domain: str(api?.domain),
				path: str(api?.path),
				auth: api?.authType === "key" ? "key" : "none",
				status: api?.configured === true ? "ok" : "warn",
				summary: str(api?.summary)
			})).filter((api) => api.id.length > 0);
			return {
				id: name,
				name: str(detail.app?.displayName, name) || name,
				kind: APP_KINDS_REMOTE.includes(str(detail.app?.kind)) ? detail.app?.kind : "local",
				version: str(detail.app?.version, "0.0.0"),
				desc: str(detail.app?.description),
				components,
				apis
			};
		}
		/** GET /openloop/app/registry —— 门面不可用/未装返回 []（APP tab 只剩内置，静默） */
		async function fetchRemoteApps() {
			try {
				const controller = new AbortController();
				const timer = setTimeout(() => controller.abort(), 4e3);
				try {
					const res = await fetch("/openloop/app/registry", { signal: controller.signal });
					if (!res.ok) return [];
					if (!(res.headers.get("content-type") ?? "").includes("application/json")) return [];
					const body = await res.json();
					return (Array.isArray(body?.apps) ? body.apps : []).map((d) => remoteAppToDescriptor(d)).filter((a) => a !== null);
				} finally {
					clearTimeout(timer);
				}
			} catch {
				return [];
			}
		}
		/** 轻探：GET /openloop/app/status 只为拿 registryRev（代次变了才拉全量 registry） */
		async function fetchRegistryRev() {
			try {
				const controller = new AbortController();
				const timer = setTimeout(() => controller.abort(), 3e3);
				try {
					const res = await fetch("/openloop/app/status", { signal: controller.signal });
					if (!res.ok) return null;
					if (!(res.headers.get("content-type") ?? "").includes("application/json")) return null;
					const body = await res.json();
					return typeof body?.registryRev === "number" ? body.registryRev : null;
				} finally {
					clearTimeout(timer);
				}
			} catch {
				return null;
			}
		}
		/**
		* M3 合并：内置 APP（本地，渲染器同源）恒在；门面 APP 追加（同 id 去重——本地优先，
		* 门面里重复注册的 openloop 不产生第二个条目）。
		*/
		function mergeApps(builtin, remote) {
			const seen = /* @__PURE__ */ new Set();
			const merged = [];
			for (const app of builtin) {
				const remoteApp = remote.find((r) => r.id === app.id);
				if (remoteApp === void 0) {
					merged.push(app);
					continue;
				}
				const byRid = /* @__PURE__ */ new Map();
				for (const c of app.components) byRid.set(c.id, c);
				for (const c of remoteApp.components) byRid.set(c.id, c);
				const apisById = /* @__PURE__ */ new Map();
				for (const a of app.apis) apisById.set(a.id, a);
				for (const a of remoteApp.apis) apisById.set(a.id, a);
				merged.push({
					...app,
					version: remoteApp.version !== "0.0.0" ? remoteApp.version : app.version,
					desc: remoteApp.desc.length > 0 ? remoteApp.desc : app.desc,
					components: [...byRid.values()].sort((a, b) => a.id.localeCompare(b.id)),
					apis: [...apisById.values()]
				});
				seen.add(app.id);
			}
			for (const r of remote) if (!seen.has(r.id)) merged.push(r);
			return merged;
		}
		/**
		* artifact entry 提取（0.5.2 few-shot 库）：entry = { artifact: ArtifactMeta }
		* （kind 'openloop.html-artifact' + title + runtime + html + path——与
		* html_artifact 工具产出的 ArtifactMeta 同构）。合法即 pinnable/可预览。
		*/
		function entryArtifactOf(entry) {
			if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return null;
			const wrapped = entry.artifact;
			const meta = typeof entry === "object" && entry.kind === "openloop.html-artifact" ? entry : wrapped;
			if (typeof meta !== "object" || meta === null || Array.isArray(meta)) return null;
			const record = meta;
			if (record.kind !== "openloop.html-artifact") return null;
			if (typeof record.html !== "string" || record.html.length === 0) return null;
			if (record.runtime !== "static" && record.runtime !== "scripts" && record.runtime !== "network") return null;
			if (typeof record.title !== "string" || record.title.length === 0) return null;
			return record;
		}
		/**
		* entry 面板提取（v1 渲染闭环契约——宽松形态）：
		* - 规范形态：`{ panel: <完整 PanelDefinition> }`（v1 文档原写法）
		* - 宽松形态：直接是 `PanelDefinition`（agent 实际写法——平铺更直觉，免一层套娃）
		*   通过形状识别：含 `$schema: 'openloop.panel/v1'` 或 ≥1 widget 且有 id/title 即可
		* - 都不是：文件路径 / 畸形 → null（待生成）
		* 注意：文件路径无效（浏览器读不到 workspace 文件）
		*/
		function entryPanelOf(entry) {
			if (looksLikePanelDefinition(entry)) return entry;
			if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
				const panel = entry.panel;
				if (looksLikePanelDefinition(panel)) return panel;
			}
			return null;
		}
		function looksLikePanelDefinition(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
			const record = value;
			if (typeof record.id !== "string" || record.id.length === 0) return false;
			if (typeof record.title !== "string" || record.title.length === 0) return false;
			if (!Array.isArray(record.widgets) || record.widgets.length === 0) return false;
			return true;
		}
		/**
		* mcp-app 引用形态提取（方向 1 v2 渲染时取数契约）：
		* entry = { serverId, toolName, resourceUri }（三 string 即合法；connect_server 写入）。
		*/
		function entryMcpAppOf(entry) {
			if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return null;
			const record = entry;
			if (typeof record.serverId !== "string" || record.serverId.length === 0) return null;
			if (typeof record.toolName !== "string" || record.toolName.length === 0) return null;
			if (typeof record.resourceUri !== "string" || record.resourceUri.length === 0) return null;
			return {
				serverId: record.serverId,
				toolName: record.toolName,
				resourceUri: record.resourceUri
			};
		}
		/**
		* pin 一个组件资源 = 构造可渲染 tile source（统一入口，2026-08-29）：
		* - mcp-app 组件（entry 引用形态合法）→ mcp-app tile（渲染时取数，不复制内容）
		* - 其余走 buildPanelMetaForComponent 的 panel 通道：
		*   内置（PRESET_INFO[kind]）→ 合法最小示例 props 实例；
		*   门面组件（entry.panel 合法）→ 直接用 agent 内联的完整 PanelDefinition
		*   （resolved 置空——api 绑定 widget 由 panels 的 onLoad 刷新在打开时自动拉取）
		* 两者皆无 → null（「待生成」态，pin 拒绝）。
		*/
		function buildTileSourceForComponent(component) {
			if (component.type === "mcp-app") {
				const reference = entryMcpAppOf(component.entry);
				if (reference === null) return null;
				return {
					kind: "mcp-app",
					meta: {
						...reference,
						...component.id ? { rid: component.id } : {}
					}
				};
			}
			if (component.type === "artifact") {
				const meta = entryArtifactOf(component.entry);
				if (meta === null) return null;
				return {
					kind: "artifact",
					meta
				};
			}
			return buildPanelMetaForComponent(component);
		}
		function buildPanelMetaForComponent(component) {
			const info = PRESET_INFO[component.kind];
			if (info !== void 0) {
				const props = info.props;
				return {
					kind: "panel",
					meta: {
						kind: "openloop.panel",
						version: 1,
						panel: {
							$schema: "openloop.panel/v1",
							id: component.kind,
							title: component.title,
							description: info.desc,
							widgets: [{
								id: "w1",
								source: {
									type: "preset",
									kind: component.kind,
									props
								}
							}]
						},
						resolved: {},
						resolvedAt: (/* @__PURE__ */ new Date()).toISOString()
					}
				};
			}
			const entryPanel = entryPanelOf(component.entry);
			if (entryPanel !== null) return {
				kind: "panel",
				meta: {
					kind: "openloop.panel",
					version: 1,
					panel: entryPanel,
					resolved: {},
					resolvedAt: (/* @__PURE__ */ new Date()).toISOString()
				}
			};
			return null;
		}
		let registryCache = /* @__PURE__ */ new Map();
		/** 由 DockShell 在 apps（mergeApps 合并后）变化时更新；组件按 id（rid）索引 */
		function setRegistryCache(apps) {
			const map = /* @__PURE__ */ new Map();
			for (const app of apps) for (const comp of app.components) map.set(comp.id, comp);
			registryCache = map;
		}
		/** 按 rid（包名:组件名）查 registry 组件；未命中返回 undefined */
		function lookupRegistryComponent(rid) {
			return registryCache.get(rid);
		}
		/** 全量 registry 组件快照（联动 consumes 索引构建等遍历场景用） */
		function getRegistryComponents() {
			return [...registryCache.values()];
		}
		//#endregion
		//#region src/client/rel-views.tsx
		/**
		* 联动关系 UI 组件（M4，2026-09-02 联动特性 v1；2026-09-03 补齐原型形态）：
		* - RelChips：资源列表行的具名关系 chip（→ 目标页名 / ← 来源页名，可点跳）
		* - RelDeclSection：组件详情页「页面关系」双语声明表
		* - RelTryIt：关联预览（可交互最小闭环——点行 → 目标面板带参渲染）
		* - RelatedPages：相关页面跳转 chips
		* 数据源：registry 组件 entry.relations（panels 契约形态，经懒桥解析）。
		*/
		/** 组件的 relations（panels 契约形态；无声明返回 undefined） */
		function relationsOf(rid) {
			const panels = getPanelsClient();
			const comp = lookupRegistryComponent(rid);
			if (!panels || !comp) return void 0;
			const entry = comp.entry;
			if (typeof entry !== "object" || entry === null) return void 0;
			const record = entry;
			const panel = typeof record.panel === "object" && record.panel !== null ? record.panel : record;
			return panels.parseRelations(panel.relations);
		}
		/** 事件名 → 目标 rid 推断（与 panels RelLinked.inferTargetRid 同规则） */
		function inferTargetRid(event) {
			const m = /^([a-z0-9][a-z0-9-]*):([a-z][a-z0-9-]*):selected$/.exec(event);
			return m ? `${m[1]}:${m[2]}-detail` : void 0;
		}
		/** 组件标题解析（未注册返回 rid 的组件名段） */
		function titleOfRid(rid) {
			return lookupRegistryComponent(rid)?.title ?? rid.split(":")[1] ?? rid;
		}
		/** 组件的全部具名关系端点：out = 本组件触发指向谁；in = 谁触发打开本组件 */
		function relPeersOf(rid) {
			const rels = relationsOf(rid);
			if (!rels) return [];
			const peers = [];
			for (const e of rels.emits ?? []) {
				const targetRid = e.target?.rid ?? inferTargetRid(e.event);
				if (!targetRid) continue;
				peers.push({
					dir: "out",
					rid: targetRid,
					title: titleOfRid(targetRid),
					event: e.event,
					how: e.note ?? "点行打开"
				});
			}
			for (const c of rels.consumes ?? []) for (const comp of getRegistryComponents()) {
				if (comp.id === rid) continue;
				if (!relationsOf(comp.id)?.emits?.some((e) => e.event === c.event)) continue;
				peers.push({
					dir: "in",
					rid: comp.id,
					title: comp.title,
					event: c.event,
					how: `按 ${c.param} 取数`
				});
			}
			return peers;
		}
		/** 全量 registry 的 consumes 索引：event → [{ rid, param }]（惰性构建） */
		function buildRelConsumesIndex() {
			const index = /* @__PURE__ */ new Map();
			for (const comp of getRegistryComponents()) {
				const rels = relationsOf(comp.id);
				if (!rels?.consumes) continue;
				for (const c of rels.consumes) {
					const list = index.get(c.event) ?? [];
					list.push({
						rid: comp.id,
						param: c.param
					});
					index.set(c.event, list);
				}
			}
			return index;
		}
		const chipStyle = {
			display: "inline-flex",
			alignItems: "center",
			gap: 4,
			fontSize: 9.5,
			padding: "1.5px 7px",
			borderRadius: 6,
			color: "#b06ad9",
			background: "rgba(176,106,217,.1)",
			border: "1px solid rgba(176,106,217,.3)",
			whiteSpace: "nowrap",
			cursor: "pointer",
			fontFamily: "inherit"
		};
		const secLabelStyle = {
			fontSize: 10,
			fontWeight: 600,
			letterSpacing: ".06em",
			color: "var(--dsw-alias-label-caption, #888)",
			marginBottom: 6,
			marginTop: 14
		};
		function RelChips({ rid, onJump }) {
			const peers = relPeersOf(rid);
			if (peers.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: peers.slice(0, 3).map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				style: chipStyle,
				title: `${p.dir === "out" ? "点行打开" : "被联动打开"} · ${p.event}`,
				onClick: (e) => {
					e.stopPropagation();
					onJump?.(p.rid);
				},
				children: [
					p.dir === "out" ? "→" : "←",
					" ",
					p.title
				]
			}, `${p.dir}:${p.rid}:${p.event}`)) });
		}
		function RelDeclSection({ rid }) {
			const rels = relationsOf(rid);
			if (!rels || (!rels.emits || rels.emits.length === 0) && (!rels.consumes || rels.consumes.length === 0)) return null;
			const rows = [];
			for (const e of rels.emits ?? []) rows.push({
				dir: "out",
				event: e.event,
				param: "—",
				note: e.note ?? "点行时触发 · fires on row click"
			});
			for (const c of rels.consumes ?? []) rows.push({
				dir: "in",
				event: c.event,
				param: c.param,
				note: c.note ?? `按 ${c.param} 取数 · renders by ${c.param}`
			});
			const cellStyle = {
				fontSize: 10.5,
				padding: "7px 10px",
				borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
				color: "var(--dsw-alias-label-primary, inherit)"
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-rel-decl": rid,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: secLabelStyle,
					children: ["页面关系 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: { fontWeight: 400 },
						children: "Relations（emits 可触发 / consumes 可响应）"
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					style: {
						width: "100%",
						borderCollapse: "collapse",
						border: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
						borderRadius: 9,
						overflow: "hidden"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
						style: { background: "var(--dsw-alias-bg-layer-2, #f6f6f7)" },
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: {
									...cellStyle,
									textAlign: "left",
									fontSize: 10,
									color: "var(--dsw-alias-label-caption, #888)"
								},
								children: "方向"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: {
									...cellStyle,
									textAlign: "left",
									fontSize: 10,
									color: "var(--dsw-alias-label-caption, #888)"
								},
								children: "事件 Event"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: {
									...cellStyle,
									textAlign: "left",
									fontSize: 10,
									color: "var(--dsw-alias-label-caption, #888)"
								},
								children: "参数 Param"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								style: {
									...cellStyle,
									textAlign: "left",
									fontSize: 10,
									color: "var(--dsw-alias-label-caption, #888)"
								},
								children: "说明"
							})
						]
					}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: rows.map((r, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
						style: i === rows.length - 1 ? { borderBottom: 0 } : void 0,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								style: cellStyle,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 9,
										fontWeight: 600,
										padding: "1px 7px",
										borderRadius: 999,
										whiteSpace: "nowrap",
										color: r.dir === "out" ? "#b06ad9" : "var(--dsw-alias-state-business-primary, #4176e6)",
										background: r.dir === "out" ? "rgba(176,106,217,.1)" : "rgba(65,118,230,.1)"
									},
									children: r.dir === "out" ? "→ 可触发 emits" : "← 可响应 consumes"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								style: {
									...cellStyle,
									fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
									fontSize: 9.5,
									color: "#b06ad9"
								},
								children: r.event
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								style: {
									...cellStyle,
									fontSize: 10
								},
								children: r.param
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								style: {
									...cellStyle,
									fontSize: 9.5,
									color: "var(--dsw-alias-label-caption, #888)"
								},
								children: r.note
							})
						]
					}, i)) })]
				})]
			});
		}
		/**
		* 不再渲染小预览表（2026-09-03 用户反馈）：上方 ComponentPreview 的
		* PanelSurface 自带行点击事件委托，点行即发事件到 relBus；这里订阅同一
		* 事件，把全部消费方面板带参渲染在下方。
		*/
		function RelTryIt({ rid }) {
			const emit = relationsOf(rid)?.emits?.[0];
			const emitEvent = emit?.event;
			const [selected, setSelected] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				const panels = getPanelsClient();
				if (!emitEvent || !panels) return;
				return panels.relBus().subscribe((event, payload) => {
					if (event === emitEvent) setSelected(payload);
				});
			}, [emitEvent]);
			const panels = getPanelsClient();
			if (!emit || !panels) return null;
			const consumers = buildRelConsumesIndex().get(emit.event) ?? (emit.target ? [{
				rid: emit.target.rid,
				param: ""
			}] : []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-openloop-rel-try": rid,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: secLabelStyle,
					children: ["关联预览 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: { fontWeight: 400 },
						children: "Try it · 在上方预览里点行看效果"
					})]
				}), selected ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 7,
						marginBottom: 8,
						fontSize: 10.5,
						color: "var(--dsw-alias-label-secondary, inherit)"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: {
							fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
							fontSize: 9.5,
							color: "#b06ad9"
						},
						children: ["⚡ ", emit.event]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontFamily: "ui-monospace, monospace",
							fontSize: 9.5,
							opacity: .75
						},
						children: Object.entries(selected).map(([k, v]) => `${k}=${String(v)}`).join(" · ")
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 10
					},
					children: consumers.map((c) => {
						const panel = panels.panelDefinitionFromEntry(lookupRegistryComponent(c.rid)?.entry);
						if (!panel) return null;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								border: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
								borderRadius: 9,
								overflow: "hidden"
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(panels.PanelSurface, {
								meta: {
									kind: "openloop.panel",
									version: 1,
									panel,
									resolved: {},
									resolvedAt: (/* @__PURE__ */ new Date()).toISOString()
								},
								relParams: selected
							})
						}, c.rid);
					})
				})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						border: "1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
						borderRadius: 9,
						padding: "14px 16px",
						fontSize: 11,
						color: "var(--dsw-alias-label-caption, #888)",
						lineHeight: 1.7
					},
					children: [
						"在上面的预览里点一行，",
						consumers.map((c) => `「${titleOfRid(c.rid)}」`).join("、"),
						" 会即时出现在这里 · click a row in the preview above to open the linked pages"
					]
				})]
			});
		}
		function RelatedPages({ rid, onJump }) {
			const peers = relPeersOf(rid);
			if (peers.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: secLabelStyle,
				children: ["相关页面 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: { fontWeight: 400 },
					children: "Related pages"
				})]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					display: "flex",
					gap: 6,
					flexWrap: "wrap"
				},
				children: peers.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					style: chipStyle,
					onClick: () => onJump(p.rid),
					children: [
						p.dir === "out" ? "→" : "←",
						" ",
						p.title,
						" · ",
						p.how
					]
				}, `${p.dir}:${p.rid}:${p.event}`))
			})] });
		}
		//#endregion
		//#region src/client/RelFloatLayer.tsx
		/**
		* Board 联动悬浮窗层（M3，2026-09-02 联动特性 v1）。
		*
		* 挂在 DockBoardView 内：监听联动事件总线，按「registry 组件 relations.consumes」
		* 把事件映射为目标面板 rid + params → 悬浮窗渲染目标面板（PanelSurface 带参）。
		*
		* 交互语义（原型 designs/linkage-proto 决策 B/C，用户已批）：
		* - 多开：不同 params 各自开窗并排对比；同 rid+params 重复事件 → 聚焦已有窗
		* - 悬浮窗不 pin 进 board（只是投影壳：拖拽 / 折叠 / 关闭）
		* - 用户关闭的窗口，同参数事件再次到来不自动重开（本会话记住关闭意图）
		*/
		let zSeq = 20;
		let winSeq = 0;
		/** rid → PanelDefinition 解析器（registry entry → panel 定义，经 panels 懒桥） */
		function registryPanelResolver(rid) {
			const comp = lookupRegistryComponent(rid);
			if (!comp) return void 0;
			return getPanelsClient()?.panelDefinitionFromEntry(comp.entry);
		}
		function RelFloatLayer() {
			const [wins, setWins] = (0, react.useState)([]);
			const closedKeysRef = (0, react.useRef)(/* @__PURE__ */ new Set());
			const zIndexRef = (0, react.useRef)(zSeq);
			(0, react.useEffect)(() => {
				const panels = getPanelsClient();
				if (!panels) return;
				const consumesIndex = buildRelConsumesIndex();
				return panels.relBus().subscribe((event, payload) => {
					const targets = consumesIndex.get(event);
					if (!targets || targets.length === 0) return;
					setWins((prev) => {
						const next = [...prev];
						for (const target of targets) {
							const paramKey = `${target.rid}::${target.param}=${String(payload[target.param] ?? "")}`;
							if (closedKeysRef.current.has(paramKey)) continue;
							const existing = next.find((w) => w.paramKey === paramKey);
							if (existing) {
								existing.z = ++zIndexRef.current;
								continue;
							}
							winSeq += 1;
							zIndexRef.current += 1;
							next.push({
								winId: `relfw-${winSeq}`,
								rid: target.rid,
								params: payload,
								paramKey,
								x: 380 + winSeq % 5 * 42,
								y: 48 + winSeq % 5 * 44,
								collapsed: false,
								z: zIndexRef.current
							});
						}
						return next;
					});
				});
			}, []);
			const closeWin = (0, react.useCallback)((winId, paramKey) => {
				closedKeysRef.current.add(paramKey);
				setWins((prev) => prev.filter((w) => w.winId !== winId));
			}, []);
			const toggleWin = (0, react.useCallback)((winId) => {
				setWins((prev) => prev.map((w) => w.winId === winId ? {
					...w,
					collapsed: !w.collapsed
				} : w));
			}, []);
			const focusWin = (0, react.useCallback)((winId) => {
				setWins((prev) => prev.map((w) => w.winId === winId ? {
					...w,
					z: ++zIndexRef.current
				} : w));
			}, []);
			const moveWin = (0, react.useCallback)((winId, x, y) => {
				setWins((prev) => prev.map((w) => w.winId === winId ? {
					...w,
					x,
					y
				} : w));
			}, []);
			if (wins.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					position: "absolute",
					inset: 0,
					pointerEvents: "none",
					zIndex: 40
				},
				"data-openloop-rel-float-layer": true,
				children: wins.map((w) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelFloatWindow, {
					win: w,
					onClose: () => closeWin(w.winId, w.paramKey),
					onToggle: () => toggleWin(w.winId),
					onFocus: () => focusWin(w.winId),
					onMove: (x, y) => moveWin(w.winId, x, y)
				}, w.winId))
			});
		}
		function RelFloatWindow({ win, onClose, onToggle, onFocus, onMove }) {
			const dragRef = (0, react.useRef)(null);
			const PanelSurface = getPanelsClient()?.PanelSurface;
			const panel = registryPanelResolver(win.rid);
			const onPointerDown = (e) => {
				onFocus();
				dragRef.current = {
					sx: e.clientX,
					sy: e.clientY,
					ox: win.x,
					oy: win.y
				};
				const move = (ev) => {
					const d = dragRef.current;
					if (!d) return;
					onMove(d.ox + ev.clientX - d.sx, d.oy + ev.clientY - d.sy);
				};
				const up = () => {
					dragRef.current = null;
					window.removeEventListener("pointermove", move);
					window.removeEventListener("pointerup", up);
				};
				window.addEventListener("pointermove", move);
				window.addEventListener("pointerup", up);
			};
			const title = panel?.title ?? win.rid;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					position: "absolute",
					left: win.x,
					top: win.y,
					width: 420,
					display: "flex",
					flexDirection: "column",
					pointerEvents: "auto",
					borderRadius: 12,
					overflow: "hidden",
					zIndex: win.z,
					boxShadow: "0 12px 40px rgba(0,0,0,.32)",
					border: "1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 38%, transparent)",
					background: "var(--dsw-alias-bg-layer-1, #fff)"
				},
				"data-openloop-rel-window": win.rid,
				onPointerDown: () => onFocus(),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						flex: "0 0 32px",
						display: "flex",
						alignItems: "center",
						gap: 7,
						padding: "0 10px",
						cursor: "grab",
						userSelect: "none",
						background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, var(--dsw-alias-bg-layer-2, #f6f6f7))",
						borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))"
					},
					onPointerDown,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 9,
								padding: "1px 6px",
								borderRadius: 5,
								color: "var(--dsw-alias-state-business-primary, #4176e6)",
								background: "color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent)"
							},
							children: "详情"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 11,
								fontWeight: 600,
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis"
							},
							children: title
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								marginLeft: "auto",
								display: "flex",
								gap: 5,
								flexShrink: 0
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								title: win.collapsed ? "展开" : "折叠",
								onClick: onToggle,
								style: {
									width: 18,
									height: 18,
									borderRadius: 5,
									border: 0,
									background: "none",
									cursor: "pointer",
									fontSize: 10,
									color: "var(--dsw-alias-label-tertiary, #888)"
								},
								children: win.collapsed ? "▢" : "—"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								title: "关闭",
								onClick: onClose,
								style: {
									width: 18,
									height: 18,
									borderRadius: 5,
									border: 0,
									background: "none",
									cursor: "pointer",
									fontSize: 11,
									color: "var(--dsw-alias-label-tertiary, #888)"
								},
								children: "×"
							})]
						})
					]
				}), win.collapsed ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						maxHeight: 360,
						overflow: "auto"
					},
					children: panel && PanelSurface ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PanelSurface, {
						meta: {
							kind: "openloop.panel",
							version: 1,
							panel,
							resolved: {},
							resolvedAt: (/* @__PURE__ */ new Date()).toISOString()
						},
						relParams: win.params
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							padding: 16,
							fontSize: 12,
							color: "var(--dsw-alias-label-caption, #888)"
						},
						children: [
							"页面 ",
							win.rid,
							" 当前不可用（可能未注册或已移除）"
						]
					})
				})]
			});
		}
		//#endregion
		//#region src/client/DockBoardView.tsx
		/**
		* DockBoardView：看板视图（Dock 2.0，RGL v2 引擎保留不变）。
		*
		* v2 变更（2026-08-25，原型 direction-a.jsx 看板段直搬）：
		* - 头部：当前页名（双击重命名）+ tile 计数 + 整理/清空/收起（收起经 onCollapse 上抛）
		* - tile 外壳：别名内联编辑（Enter/失焦提交、Esc 取消、置空恢复原名、✎ 标记）
		*   + 右下角来源 ID（包名:组件名，命名即寻址）
		* - 空态：引导去 APP 页固定 / 让 Agent 生成
		* - 数据流不变：dockStore（v2 多板）→ 激活板 tiles ↔ RGL 双向映射
		*/
		/** scope 惰性单例（base 缺失时 undefined——ArtifactFrame 外壳自行降级） */
		let scopeCache;
		function getScope$1() {
			if (scopeCache === void 0) scopeCache = getBaseClient()?.createOpenLoopSettingsScope();
			return scopeCache;
		}
		const ROW_HEIGHT = 48;
		const GRID_MARGIN = [12, 12];
		/**
		* 0.9.1（用户拍板 A）：RGL 渲染列数与存储上限同源（视口/60px 格宽）——拖多大
		* 松手稳定多大；GRID_COLUMNS 保留为 pin 落位与紧凑的参考网格。maxRows 不再
		* 硬限（行高自由，容器滚动）。
		*/
		const RGL_COLS = () => STORAGE_MAX_COLUMNS();
		/**
		* RGL 运行必需 CSS + dock 主题化覆写（注入一次）。
		* 必需部分等价于官方 styles.css 的核心规则（容器 transition / item 定位过渡 /
		* placeholder / resize 手柄）；主题化部分：placeholder 虚线框、手柄隐藏至 hover、
		* 拖拽中 tile 抬升阴影——对齐 DSH 设置壳的设计语言（hairline、克制的层次）。
		*/
		const GRID_CSS = `
.react-grid-layout { position: relative; transition: height 200ms ease; }
.react-grid-item { box-sizing: border-box; transition: all 200ms ease; transition-property: left, top, width, height; }
.react-grid-item img { pointer-events: none; user-select: none; }
.react-grid-item.cssTransforms { transition-property: transform, width, height; }
.react-grid-item.resizing { transition: none; z-index: 3; will-change: width, height; }
.react-grid-item.react-draggable-dragging { transition: none; z-index: 3; will-change: transform; }
.react-grid-item.dropping { visibility: hidden; }
.react-grid-item.react-grid-placeholder {
  background: var(--dsw-alias-state-business-primary, rgba(88, 101, 242, 0.35));
  opacity: 0.14;
  border: 1.5px dashed var(--dsw-alias-state-business-primary, rgba(88, 101, 242, 0.55));
  border-radius: 10px;
  transition-duration: 100ms;
  z-index: 2;
  user-select: none;
}
.react-grid-item.react-grid-placeholder.placeholder-resizing { transition: none; }
.react-grid-item > .react-resizable-handle { position: absolute; width: 18px; height: 18px; opacity: 0; transition: opacity .15s ease; }
.react-grid-item:hover > .react-resizable-handle { opacity: 1; }
.react-grid-item > .react-resizable-handle::after {
  content: ""; position: absolute; right: 4px; bottom: 4px; width: 5px; height: 5px;
  border-right: 2px solid var(--dsw-alias-label-caption, rgba(128, 128, 128, 0.7));
  border-bottom: 2px solid var(--dsw-alias-label-caption, rgba(128, 128, 128, 0.7));
}
.react-grid-item > .react-resizable-handle.react-resizable-handle-se { bottom: 0; right: 0; cursor: se-resize; }
.react-grid-item > .react-resizable-handle.react-resizable-handle-e { top: 50%; margin-top: -9px; right: 0; cursor: ew-resize; }
.react-grid-item > .react-resizable-handle.react-resizable-handle-s { left: 50%; margin-left: -9px; bottom: 0; cursor: ns-resize; }
/* dock tile 抬升感：拖拽/缩放中的 tile 略微上浮（阴影在 chrome 上，避免双 border 视觉） */
.react-grid-item.react-draggable-dragging > .dock-tile-chrome,
.react-grid-item.resizing > .dock-tile-chrome {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.dock-tile-handle { cursor: grab; }
.dock-tile-handle:active { cursor: grabbing; }
`;
		function GridStyles() {
			(0, react.useEffect)(() => {
				const el = document.createElement("style");
				el.setAttribute("data-openloop-dock-grid", "");
				el.textContent = GRID_CSS;
				document.head.appendChild(el);
				return () => el.remove();
			}, []);
			return null;
		}
		/** 来源 ID（包名:组件名）：panel meta.panel.id / artifact meta.path 文件名；拿不到则不显示。
		*  APP tab 的 pinned 判定也走这里（AppDetail 的组件资源 ID 与之同命名空间）。 */
		function sourceIdOf(source) {
			if (source.kind === "panel") {
				const panel = source.meta?.panel;
				return typeof panel?.id === "string" && panel.id.length > 0 ? `openloop:${panel.id}` : null;
			}
			if (source.kind === "mcp-app") {
				if (source.meta.rid !== void 0 && source.meta.rid.length > 0) return source.meta.rid;
				return `${source.meta.serverId}:${source.meta.toolName.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`;
			}
			const meta = source.meta;
			if (typeof meta?.rid === "string" && meta.rid.length > 0) return meta.rid;
			const path = meta?.path;
			if (typeof path !== "string" || path.length === 0) return null;
			const base = path.split("/").pop() ?? path;
			return base.length > 0 ? `openloop:${base}` : null;
		}
		/** 联动 v1（hover 亮灯）：tile 的 relations 事件集合（panel tile 才有） */
		function tileRelationSets(tile) {
			if (tile.source.kind !== "panel") return void 0;
			const panels = getPanelsClient();
			if (!panels) return void 0;
			const meta = tile.source.meta;
			if (!meta?.panel) return void 0;
			const rels = panels.parseRelations(meta.panel.relations);
			if (!rels) return void 0;
			return {
				emits: new Set((rels.emits ?? []).map((e) => e.event)),
				consumes: new Set((rels.consumes ?? []).map((c) => c.event))
			};
		}
		function TileChrome({ tile, relTone, onRemove, onAlias, children }) {
			const [editing, setEditing] = (0, react.useState)(false);
			const displayTitle = tile.alias ?? tile.title;
			const sourceId = sourceIdOf(tile.source);
			const commit = (value) => {
				const trimmed = value.trim();
				onAlias(!trimmed || trimmed === tile.title ? null : trimmed);
				setEditing(false);
			};
			const onEditKeyDown = (e) => {
				if (e.key === "Enter") commit(e.currentTarget.value);
				if (e.key === "Escape") setEditing(false);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dock-tile-chrome",
				style: {
					position: "absolute",
					inset: 0,
					display: "flex",
					flexDirection: "column",
					borderRadius: 10,
					border: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.08))",
					background: "var(--dsw-alias-bg-layer-1, #fff)",
					overflow: "hidden",
					transition: "box-shadow .18s, border-color .18s, opacity .18s",
					...relTone === "glow" ? {
						borderColor: "rgba(77,107,254,.7)",
						boxShadow: "0 0 0 3px rgba(77,107,254,.22), 0 4px 18px rgba(0,0,0,.18)"
					} : {},
					...relTone === "dim" ? { opacity: .45 } : {}
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dock-tile-handle",
						title: "拖动排列",
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 8,
							padding: "5px 6px 5px 10px",
							flexShrink: 0,
							borderBottom: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.06))",
							fontSize: 11.5,
							fontWeight: 600,
							letterSpacing: .2,
							color: "var(--dsw-alias-label-primary, inherit)",
							userSelect: "none"
						},
						children: [editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "d2-title-edit",
							defaultValue: displayTitle,
							autoFocus: true,
							"aria-label": "编辑别名",
							onBlur: (e) => commit(e.target.value),
							onKeyDown: onEditKeyDown
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "d2-tile-title",
							style: { flex: 1 },
							title: `双击编辑别名（原名：${tile.title}）`,
							onDoubleClick: () => setEditing(true),
							children: [displayTitle, tile.alias ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "d2-alias-mark",
								title: `原名：${tile.title}`,
								children: "✎"
							}) : null]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dock-tile-cancel",
							onClick: onRemove,
							"aria-label": "unpin",
							title: "取消固定",
							style: {
								border: 0,
								background: "transparent",
								cursor: "pointer",
								flexShrink: 0,
								fontSize: 12,
								lineHeight: 1,
								padding: "3px 6px",
								borderRadius: 6,
								color: "var(--dsw-alias-label-caption, #888)"
							},
							children: "✕"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							position: "relative",
							flex: 1,
							minHeight: 0,
							overflow: "auto",
							padding: 10
						},
						children
					}),
					sourceId ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "d2-tile-src",
						style: { right: 26 },
						children: sourceId
					}) : null
				]
			});
		}
		/**
		* tile 级错误边界（2026-08-24 真机事故）：单个 tile 内容渲染崩溃（如持久化的
		* 损坏 meta、上游面板/artifact 组件抛错）不再炸掉整个 dock React 树——
		* 降级为该 tile 内的错误卡，用户可单独 unpin。
		*/
		var TileErrorBoundary = class extends react.Component {
			constructor(props) {
				super(props);
				this.state = { failed: false };
			}
			static getDerivedStateFromError() {
				return { failed: true };
			}
			componentDidCatch(error) {
				console.warn(`[openloop-dock] tile ${this.props.tileId} render failed:`, error);
			}
			render() {
				if (this.state.failed) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						padding: 14,
						fontSize: 12,
						lineHeight: 1.7,
						opacity: .7
					},
					children: [
						"此 tile 渲染失败（内容数据可能已损坏）——",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						"可点右上角 ✕ 移除后重新固定"
					]
				});
				return this.props.children;
			}
		};
		function TileContent({ tile }) {
			if (tile.source.kind === "panel") {
				const panels = getPanelsClient();
				if (panels === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DependencyMissing, {
					what: "Dock 面板 tile",
					dep: "@openloop/dsh-panels"
				});
				const PanelSurface = panels.PanelSurface;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PanelSurface, { meta: tile.source.meta });
			}
			if (tile.source.kind === "mcp-app") {
				const mcpApps = getMcpAppsClient();
				if (mcpApps === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DependencyMissing, {
					what: "Dock MCP App tile",
					dep: "@openloop/dsh-mcp"
				});
				const McpAppResourceView = mcpApps.McpAppResourceView;
				const meta = tile.source.meta;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpAppResourceView, {
					serverId: meta.serverId,
					toolName: meta.toolName,
					resourceUri: meta.resourceUri,
					title: tile.title,
					frameId: `dock-${tile.tileId}`
				});
			}
			const artifact = getArtifactClient();
			if (artifact === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DependencyMissing, {
				what: "Dock Artifact tile",
				dep: "@openloop/dsh-html-artifact"
			});
			const ArtifactFrame = artifact.ArtifactFrame;
			const meta = resolveArtifactMeta(tile);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArtifactFrame, {
				meta,
				token: `dock-${tile.tileId}`,
				fullscreen: false,
				scope: getScope$1()
			});
		}
		/** 渲染期 artifact meta 解析：registry 同 rid 最新 entry 优先，回退 tile 快照 */
		function resolveArtifactMeta(tile) {
			const rid = sourceIdOf(tile.source);
			if (rid === null) return tile.source.meta;
			const component = lookupRegistryComponent(rid);
			if (component !== void 0) {
				const fresh = entryArtifactOf(component.entry);
				if (fresh !== null) return fresh;
			}
			return tile.source.meta;
		}
		function DockBoardView() {
			const { width, containerRef, mounted } = useContainerWidth();
			const state = dockStore.getSnapshot();
			const board = state.boards.find((b) => b.id === state.activeBoardId) ?? state.boards[0];
			const tiles = board?.tiles ?? [];
			const layout = toRglLayout(tiles);
			const [editingName, setEditingName] = (0, react.useState)(false);
			const [confirmingClear, setConfirmingClear] = (0, react.useState)(false);
			const [hoveredTileId, setHoveredTileId] = (0, react.useState)(null);
			const relToneOfTile = (tileId) => {
				if (hoveredTileId === null) return void 0;
				if (tileId === hoveredTileId) return "glow";
				const hovered = tiles.find((t) => t.tileId === hoveredTileId);
				const current = tiles.find((t) => t.tileId === tileId);
				if (!hovered || !current) return void 0;
				const h = tileRelationSets(hovered);
				const c = tileRelationSets(current);
				if (!h || !c) return "dim";
				return [...h.emits].some((e) => c.consumes.has(e)) || [...c.emits].some((e) => h.consumes.has(e)) ? "glow" : "dim";
			};
			const [tileQuery, setTileQuery] = (0, react.useState)("");
			const tileMatches = (tile) => {
				const q = tileQuery.trim().toLowerCase();
				if (q.length === 0) return true;
				return `${tile.title} ${tile.alias ?? ""} ${sourceIdOf(tile.source) ?? ""}`.toLowerCase().includes(q);
			};
			(0, react.useEffect)(() => {
				if (!confirmingClear) return;
				const timer = setTimeout(() => setConfirmingClear(false), 3e3);
				return () => clearTimeout(timer);
			}, [confirmingClear]);
			const commitName = (value) => {
				const trimmed = value.trim();
				if (trimmed && board !== void 0) dockStore.renameBoard(board.id, trimmed);
				setEditingName(false);
			};
			const onNameKeyDown = (e) => {
				if (e.key === "Enter") commitName(e.currentTarget.value);
				if (e.key === "Escape") setEditingName(false);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					flex: 1,
					minWidth: 0,
					minHeight: 0,
					display: "flex",
					flexDirection: "column",
					position: "relative"
				},
				"data-screen-label": "board",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelFloatLayer, {}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: "d2-board-head",
						children: [
							board === void 0 ? null : editingName ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "d2-board-rename",
								autoFocus: true,
								defaultValue: board.name,
								size: Math.max(4, board.name.length + 2),
								"aria-label": "重命名看板页",
								onBlur: (e) => commitName(e.target.value),
								onKeyDown: onNameKeyDown
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "d2-board-name",
								title: "双击重命名看板页",
								onDoubleClick: () => setEditingName(true),
								children: board.name
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "d2-badge kind",
								children: [tiles.length, " tiles"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "d2-search",
								type: "search",
								value: tileQuery,
								placeholder: "搜索 tile…",
								"aria-label": "搜索看板 tile",
								onChange: (e) => setTileQuery(e.target.value)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "d2-actions",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "d2-ghost-btn",
									title: "重力紧凑：消除空洞，保持相对顺序",
									onClick: () => dockStore.compact(),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.sort, { size: 13 }), " 整理"]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: confirmingClear ? "d2-ghost-btn danger" : "d2-ghost-btn",
									title: confirmingClear ? "再次点击确认清空当前页 tile" : "清空当前页 tile（其他看板页不受影响）",
									onClick: () => {
										if (confirmingClear) {
											dockStore.clear();
											setConfirmingClear(false);
										} else setConfirmingClear(true);
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.trash, { size: 13 }),
										" ",
										confirmingClear ? "确认清空？" : "清空"
									]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: containerRef,
						style: {
							flex: 1,
							minHeight: 0,
							minWidth: 0,
							overflow: "auto"
						},
						children: tiles.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "d2-empty-note",
							style: { paddingTop: 60 },
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 22,
										opacity: .6
									},
									children: "📌"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: "这一页还是空的" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "d2-tcap",
									children: "到 APP 页把组件「固定」到看板，或让 Agent 帮你生成"
								})
							]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: { minHeight: 104 },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GridStyles, {}), mounted && width > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GridLayout, {
								width,
								layout,
								gridConfig: {
									cols: RGL_COLS(),
									rowHeight: ROW_HEIGHT,
									margin: GRID_MARGIN
								},
								dragConfig: {
									enabled: true,
									handle: ".dock-tile-handle",
									cancel: ".dock-tile-cancel, .d2-title-edit"
								},
								resizeConfig: {
									enabled: true,
									handles: [
										"se",
										"e",
										"s"
									]
								},
								onLayoutChange: (items) => dockStore.applyLayout(items),
								children: tiles.map((tile) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: tileMatches(tile) ? void 0 : {
										opacity: .3,
										transition: "opacity .15s"
									},
									onMouseEnter: () => setHoveredTileId(tile.tileId),
									onMouseLeave: () => setHoveredTileId((prev) => prev === tile.tileId ? null : prev),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TileChrome, {
										tile,
										relTone: relToneOfTile(tile.tileId),
										onRemove: () => dockStore.remove(tile.tileId),
										onAlias: (alias) => dockStore.setTileAlias(tile.tileId, alias),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TileErrorBoundary, {
											tileId: tile.tileId,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TileContent, { tile })
										})
									})
								}, tile.tileId))
							}) : null]
						})
					})
				]
			});
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
		var require_dist$3 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_utilities_cjs_production_min();
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/@dnd-kit+accessibility@3.1.1_react@18.3.1/node_modules/@dnd-kit/accessibility/dist/accessibility.cjs.production.min.js
		var require_accessibility_cjs_production_min = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: !0 });
			var e;
			var t$2 = require("react");
			var n = (e = t$2) && "object" == typeof e && "default" in e ? e.default : e;
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
				const [e, n] = t$2.useState("");
				return {
					announce: t$2.useCallback((e) => {
						null != e && n(e);
					}, []),
					announcement: e
				};
			};
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/@dnd-kit+accessibility@3.1.1_react@18.3.1/node_modules/@dnd-kit/accessibility/dist/index.js
		var require_dist$2 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_accessibility_cjs_production_min();
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/@dnd-kit+core@6.3.1_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/@dnd-kit/core/dist/core.cjs.production.min.js
		var require_core_cjs_production_min = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: !0 });
			var e;
			var t$1 = require("react");
			var n = (e = t$1) && "object" == typeof e && "default" in e ? e.default : e;
			var r = require("react-dom");
			var o = require_dist$3();
			var i = require_dist$2();
			const a = t$1.createContext(null);
			function s(e) {
				const n = t$1.useContext(a);
				t$1.useEffect(() => {
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
				const { announce: v, announcement: g } = i.useAnnouncement(), p = o.useUniqueId("DndLiveRegion"), [h, b] = t$1.useState(!1);
				if (t$1.useEffect(() => {
					b(!0);
				}, []), s(t$1.useMemo(() => ({
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
				const i = o.useEvent(n), a = t$1.useMemo(() => {
					if (r || "undefined" == typeof window || void 0 === window.ResizeObserver) return;
					const { ResizeObserver: e } = window;
					return new e(i);
				}, [r]);
				return t$1.useEffect(() => () => null == a ? void 0 : a.disconnect(), [a]), a;
			}
			function ye(e) {
				return new Y(O(e), e);
			}
			function xe(e, n, r) {
				void 0 === n && (n = ye);
				const [i, a] = t$1.useState(null);
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
					const i = o.useEvent(n), a = t$1.useMemo(() => {
						if (r || "undefined" == typeof window || void 0 === window.MutationObserver) return;
						const { MutationObserver: e } = window;
						return new e(i);
					}, [i, r]);
					return t$1.useEffect(() => () => null == a ? void 0 : a.disconnect(), [a]), a;
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
				const r = t$1.useRef(null);
				return t$1.useEffect(() => {
					r.current = null;
				}, n), t$1.useEffect(() => {
					const t = e !== v;
					t && !r.current && (r.current = e), !t && r.current && (r.current = null);
				}, [e]), r.current ? o.subtract(e, r.current) : v;
			}
			function Ee(e) {
				return t$1.useMemo(() => e ? function(e) {
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
			const ke = t$1.createContext(Le);
			const Te = t$1.createContext(Ae);
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
				const { active: r, activatorEvent: i, draggableNodes: a } = t$1.useContext(ke), s = o.usePrevious(i), l = o.usePrevious(null == r ? void 0 : r.id);
				return t$1.useEffect(() => {
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
			const ze = t$1.createContext({
				...v,
				scaleX: 1,
				scaleY: 1
			});
			var Fe;
			(function(e) {
				e[e.Uninitialized = 0] = "Uninitialized", e[e.Initializing = 1] = "Initializing", e[e.Initialized = 2] = "Initialized";
			})(Fe || (Fe = {}));
			const We = t$1.memo((function(e) {
				var i, s, l, c;
				let { id: f, accessibility: g, autoScroll: p = !0, children: h, sensors: b = Se, collisionDetection: m = C, measuring: x, modifiers: w, ...E } = e;
				const [M, N] = t$1.useReducer(Pe, void 0, Ke), [A, K] = function() {
					const [e] = t$1.useState(() => /* @__PURE__ */ new Set()), n = t$1.useCallback((t) => (e.add(t), () => e.delete(t)), [e]);
					return [t$1.useCallback((t) => {
						let { type: n, event: r } = t;
						e.forEach((e) => {
							var t;
							return null == (t = e[n]) ? void 0 : t.call(e, r);
						});
					}, [e]), n];
				}(), [P, F] = t$1.useState(Fe.Uninitialized), W = P === Fe.Initialized, { draggable: { active: j, nodes: H, translate: X }, droppable: { containers: V } } = M, J = null != j ? H.get(j) : null, _ = t$1.useRef({
					initial: null,
					translated: null
				}), G = t$1.useMemo(() => {
					var e;
					return null != j ? {
						id: j,
						data: null != (e = null == J ? void 0 : J.data) ? e : Me,
						rect: _
					} : null;
				}, [j, J]), Q = t$1.useRef(null), [Z, $] = t$1.useState(null), [ee, te] = t$1.useState(null), ne = o.useLatestValue(E, Object.values(E)), re = o.useUniqueId("DndDescribedBy", f), oe = t$1.useMemo(() => V.getEnabled(), [V]), ie = t$1.useMemo(() => ({
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
					const [s, l] = t$1.useState(null), { frequency: c, measure: d, strategy: u } = a, f = t$1.useRef(e), v = function() {
						switch (u) {
							case exports.MeasuringStrategy.Always: return !1;
							case exports.MeasuringStrategy.BeforeDragging: return r;
							default: return !r;
						}
					}(), g = o.useLatestValue(v), p = t$1.useCallback((function(e) {
						void 0 === e && (e = []), g.current || l((t) => null === t ? e : t.concat(e.filter((e) => !t.includes(e))));
					}), [g]), h = t$1.useRef(null), b = o.useLazyMemo((t) => {
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
					return t$1.useEffect(() => {
						f.current = e;
					}, [e]), t$1.useEffect(() => {
						v || p();
					}, [r, v]), t$1.useEffect(() => {
						s && s.length > 0 && l(null);
					}, [JSON.stringify(s)]), t$1.useEffect(() => {
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
				}(H, j), ue = t$1.useMemo(() => ee ? o.getEventCoordinates(ee) : null, [ee]), fe = function() {
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
					const s = t$1.useRef(!1), { x: l, y: c } = "boolean" == typeof a ? {
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
				const pe = xe(de, ie.draggable.measure, ve), ye = xe(de ? de.parentElement : null), Oe = t$1.useRef({
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
					const [r, i] = t$1.useState(null), a = me({ callback: t$1.useCallback((e) => {
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
					}, [n]) }), s = t$1.useCallback((e) => {
						const t = Re(e);
						a?.disconnect(), t && a?.observe(t), i(t ? n(t) : null);
					}, [n, a]), [l, c] = o.useNodeRef(s);
					return t$1.useMemo(() => ({
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
					const n = t$1.useRef(e), r = o.useLazyMemo((t) => e ? t && t !== we && e && n.current && e.parentNode === n.current.parentNode ? t : L(e) : we, [e]);
					return t$1.useEffect(() => {
						n.current = e;
					}, [e]), r;
				}(W ? null != Ae ? Ae : de : null), Ve = function(e, n) {
					void 0 === n && (n = O);
					const [r] = e, i = Ee(r ? o.getWindow(r) : null), [a, s] = t$1.useState(De);
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
					const [n, r] = t$1.useState(null), i = t$1.useRef(e), a = t$1.useCallback((e) => {
						const t = T(e.target);
						t && r((e) => e ? (e.set(t, I(t)), new Map(e)) : null);
					}, []);
					return t$1.useEffect(() => {
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
					}, [a, e]), t$1.useMemo(() => e.length ? n ? Array.from(n.values()).reduce((e, t) => o.add(e, t), v) : q(e) : v, [e, n]);
				}(Ye), Qe = Ce(Ge), Ze = Ce(Ge, [pe]), $e = o.add(Je, Qe), et = Ue ? S(Ue, Je) : null, tt = G && et ? m({
					active: G,
					collisionRect: et,
					droppableRects: se,
					droppableContainers: oe,
					pointerCoordinates: _e
				}) : null, nt = y(tt, "id"), [rt, ot] = t$1.useState(null), it = function(e, t, n) {
					return {
						...e,
						scaleX: t && n ? t.width / n.width : 1,
						scaleY: t && n ? t.height / n.height : 1
					};
				}(je ? Je : o.add(Je, Ze), null != (c = null == rt ? void 0 : rt.rect) ? c : null, pe), at = t$1.useRef(null), st = t$1.useCallback((e, t) => {
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
					return t$1.useMemo(() => e.reduce((e, t) => {
						const { sensor: r } = t;
						return [...e, ...r.activators.map((e) => ({
							eventName: e.eventName,
							handler: n(e.handler, t)
						}))];
					}, []), [e, n]);
				}(b, t$1.useCallback((e, t) => (n, r) => {
					const o = n.nativeEvent, i = H.get(r);
					null !== Q.current || !i || o.dndKit || o.defaultPrevented || !0 === e(n, t.options, { active: i }) && (o.dndKit = { capturedBy: t.sensor }, Q.current = r, st(n, t));
				}, [H, st]));
				(function(e) {
					t$1.useEffect(() => {
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
				}, [pe, P]), t$1.useEffect(() => {
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
				}, [$e.x, $e.y]), t$1.useEffect(() => {
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
					}), [h, b] = o.useInterval(), m = t$1.useRef({
						x: 0,
						y: 0
					}), y = t$1.useRef({
						x: 0,
						y: 0
					}), x = t$1.useMemo(() => {
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
					]), w = t$1.useRef(null), C = t$1.useCallback(() => {
						const e = w.current;
						e && e.scrollBy(m.current.x * y.current.x, m.current.y * y.current.y);
					}, []), E = t$1.useMemo(() => c === exports.TraversalOrder.TreeOrder ? [...u].reverse() : u, [c, u]);
					t$1.useEffect(() => {
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
				const ct = t$1.useMemo(() => ({
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
				]), dt = t$1.useMemo(() => ({
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
			const Ue = t$1.createContext(null);
			const je = "button";
			function qe() {
				return t$1.useContext(Te);
			}
			const He = { timeout: 25 };
			function Xe(e) {
				let { animation: r, children: i } = e;
				const [a, s] = t$1.useState(null), [l, c] = t$1.useState(null), d = o.usePrevious(i);
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
				]), n.createElement(n.Fragment, null, i, a ? t$1.cloneElement(a, { ref: c }) : null);
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
			const Ge = t$1.forwardRef((e, t) => {
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
				return t$1.useMemo(() => {
					if (null != e) return $e++, $e;
				}, [e]);
			}
			const tt = n.memo((e) => {
				let { adjustScale: r = !1, children: i, dropAnimation: a, style: s, transition: l, modifiers: c, wrapperElement: d = "div", className: u, zIndex: f = 999 } = e;
				const { activatorEvent: v, active: g, activeNodeRect: p, containerNodeRect: h, draggableNodes: b, droppableContainers: m, dragOverlay: y, over: x, measuringConfiguration: w, scrollableAncestors: C, scrollableAncestorRects: E, windowRect: D } = qe(), R = t$1.useContext(ze), S = et(null == g ? void 0 : g.id), N = Be(c, {
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
				const s = o.useUniqueId("Draggable"), { activators: l, activatorEvent: c, active: d, activeNodeRect: u, ariaDescribedById: f, draggableNodes: v, over: g } = t$1.useContext(ke), { role: p = je, roleDescription: h = "draggable", tabIndex: b = 0 } = null != a ? a : {}, m = (null == d ? void 0 : d.id) === n, y = t$1.useContext(m ? ze : Ue), [x, w] = o.useNodeRef(), [C, E] = o.useNodeRef(), D = function(e, n) {
					return t$1.useMemo(() => e.reduce((e, t) => {
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
					attributes: t$1.useMemo(() => ({
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
				const s = o.useUniqueId("Droppable"), { active: l, dispatch: c, over: d, measureDroppableContainers: f } = t$1.useContext(ke), v = t$1.useRef({ disabled: r }), g = t$1.useRef(!1), p = t$1.useRef(null), h = t$1.useRef(null), { disabled: b, updateMeasurementsFor: m, timeout: y } = {
					...He,
					...a
				}, x = o.useLatestValue(null != m ? m : i), w = me({
					callback: t$1.useCallback(() => {
						g.current ? (null != h.current && clearTimeout(h.current), h.current = setTimeout(() => {
							f(Array.isArray(x.current) ? x.current : [x.current]), h.current = null;
						}, y)) : g.current = !0;
					}, [y]),
					disabled: b || !l
				}), C = t$1.useCallback((e, t) => {
					w && (t && (w.unobserve(t), g.current = !1), e && w.observe(e));
				}, [w]), [E, D] = o.useNodeRef(C), R = o.useLatestValue(n);
				return t$1.useEffect(() => {
					w && E.current && (w.disconnect(), g.current = !1, w.observe(E.current));
				}, [E, w]), t$1.useEffect(() => (c({
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
				})), [i]), t$1.useEffect(() => {
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
				return t$1.useMemo(() => ({
					sensor: e,
					options: null != n ? n : {}
				}), [e, n]);
			}, exports.useSensors = function() {
				for (var e = arguments.length, n = new Array(e), r = 0; r < e; r++) n[r] = arguments[r];
				return t$1.useMemo(() => [...n].filter((e) => null != e), [...n]);
			};
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/@dnd-kit+core@6.3.1_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/@dnd-kit/core/dist/index.js
		var require_dist$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_core_cjs_production_min();
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/@dnd-kit+sortable@10.0.0_@dnd-kit+core@6.3.1_react-dom@18.3.1_react@18.3.1__react@18.3.1__react@18.3.1/node_modules/@dnd-kit/sortable/dist/sortable.cjs.production.min.js
		var require_sortable_cjs_production_min = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: !0 });
			var e;
			var t = require("react");
			var r = (e = t) && "object" == typeof e && "default" in e ? e.default : e;
			var n = require_dist$1();
			var o = require_dist$3();
			function i(e, t, r) {
				const n = e.slice();
				return n.splice(r < 0 ? n.length + r : r, 0, n.splice(t, 1)[0]), n;
			}
			function a(e, t) {
				return e.reduce((e, r, n) => {
					const o = t.get(r);
					return o && (e[n] = o), e;
				}, Array(e.length));
			}
			function s(e) {
				return null !== e && e >= 0;
			}
			const d = {
				scaleX: 1,
				scaleY: 1
			};
			const l = (e) => {
				let { rects: t, activeIndex: r, overIndex: n, index: o } = e;
				const a = i(t, n, r), s = t[o], d = a[o];
				return d && s ? {
					x: d.left - s.left,
					y: d.top - s.top,
					scaleX: d.width / s.width,
					scaleY: d.height / s.height
				} : null;
			};
			const c = {
				scaleX: 1,
				scaleY: 1
			};
			const u = r.createContext({
				activeIndex: -1,
				containerId: "Sortable",
				disableTransforms: !1,
				items: [],
				overIndex: -1,
				useDragOverlay: !1,
				sortedRects: [],
				strategy: l,
				disabled: {
					draggable: !1,
					droppable: !1
				}
			});
			const f = (e) => {
				let { id: t, items: r, activeIndex: n, overIndex: o } = e;
				return i(r, n, o).indexOf(t);
			};
			const p = (e) => {
				let { containerId: t, isSorting: r, wasDragging: n, index: o, items: i, newIndex: a, previousItems: s, previousContainerId: d, transition: l } = e;
				return !(!l || !n || s !== i && o === a || !r && (a === o || t !== d));
			};
			const g = {
				duration: 200,
				easing: "ease"
			};
			const b = o.CSS.Transition.toString({
				property: "transform",
				duration: 0,
				easing: "linear"
			});
			const x = { roleDescription: "sortable" };
			function v(e) {
				if (!e) return !1;
				const t = e.data.current;
				return !!(t && "sortable" in t && "object" == typeof t.sortable && "containerId" in t.sortable && "items" in t.sortable && "index" in t.sortable);
			}
			const h = [
				n.KeyboardCode.Down,
				n.KeyboardCode.Right,
				n.KeyboardCode.Up,
				n.KeyboardCode.Left
			];
			function I(e, t) {
				return !(!v(e) || !v(t)) && e.data.current.sortable.containerId === t.data.current.sortable.containerId;
			}
			exports.SortableContext = function(e) {
				let { children: i, id: s, items: d, strategy: c = l, disabled: f = !1 } = e;
				const { active: p, dragOverlay: g, droppableRects: b, over: x, measureDroppableContainers: v } = n.useDndContext(), h = o.useUniqueId("Sortable", s), I = Boolean(null !== g.rect), y = t.useMemo(() => d.map((e) => "object" == typeof e && "id" in e ? e.id : e), [d]), m = null != p, w = p ? y.indexOf(p.id) : -1, C = x ? y.indexOf(x.id) : -1, R = t.useRef(y), S = !function(e, t) {
					if (e === t) return !0;
					if (e.length !== t.length) return !1;
					for (let r = 0; r < e.length; r++) if (e[r] !== t[r]) return !1;
					return !0;
				}(y, R.current), D = -1 !== C && -1 === w || S, O = function(e) {
					return "boolean" == typeof e ? {
						draggable: e,
						droppable: e
					} : e;
				}(f);
				o.useIsomorphicLayoutEffect(() => {
					S && m && v(y);
				}, [
					S,
					y,
					m,
					v
				]), t.useEffect(() => {
					R.current = y;
				}, [y]);
				const N = t.useMemo(() => ({
					activeIndex: w,
					containerId: h,
					disabled: O,
					disableTransforms: D,
					items: y,
					overIndex: C,
					useDragOverlay: I,
					sortedRects: a(y, b),
					strategy: c
				}), [
					w,
					h,
					O.draggable,
					O.droppable,
					D,
					y,
					C,
					b,
					I,
					c
				]);
				return r.createElement(u.Provider, { value: N }, i);
			}, exports.arrayMove = i, exports.arraySwap = function(e, t, r) {
				const n = e.slice();
				return n[t] = e[r], n[r] = e[t], n;
			}, exports.defaultAnimateLayoutChanges = p, exports.defaultNewIndexGetter = f, exports.hasSortableData = v, exports.horizontalListSortingStrategy = (e) => {
				var t;
				let { rects: r, activeNodeRect: n, activeIndex: o, overIndex: i, index: a } = e;
				const s = null != (t = r[o]) ? t : n;
				if (!s) return null;
				const l = function(e, t, r) {
					const n = e[t], o = e[t - 1], i = e[t + 1];
					return n && (o || i) ? r < t ? o ? n.left - (o.left + o.width) : i.left - (n.left + n.width) : i ? i.left - (n.left + n.width) : n.left - (o.left + o.width) : 0;
				}(r, a, o);
				if (a === o) {
					const e = r[i];
					return e ? {
						x: o < i ? e.left + e.width - (s.left + s.width) : e.left - s.left,
						y: 0,
						...d
					} : null;
				}
				return a > o && a <= i ? {
					x: -s.width - l,
					y: 0,
					...d
				} : a < o && a >= i ? {
					x: s.width + l,
					y: 0,
					...d
				} : {
					x: 0,
					y: 0,
					...d
				};
			}, exports.rectSortingStrategy = l, exports.rectSwappingStrategy = (e) => {
				let t, r, { activeIndex: n, index: o, rects: i, overIndex: a } = e;
				return o === n && (t = i[o], r = i[a]), o === a && (t = i[o], r = i[n]), r && t ? {
					x: r.left - t.left,
					y: r.top - t.top,
					scaleX: r.width / t.width,
					scaleY: r.height / t.height
				} : null;
			}, exports.sortableKeyboardCoordinates = (e, t) => {
				let { context: { active: r, collisionRect: i, droppableRects: a, droppableContainers: s, over: d, scrollableAncestors: l } } = t;
				if (h.includes(e.code)) {
					if (e.preventDefault(), !r || !i) return;
					const t = [];
					s.getEnabled().forEach((r) => {
						if (!r || null != r && r.disabled) return;
						const o = a.get(r.id);
						if (o) switch (e.code) {
							case n.KeyboardCode.Down:
								i.top < o.top && t.push(r);
								break;
							case n.KeyboardCode.Up:
								i.top > o.top && t.push(r);
								break;
							case n.KeyboardCode.Left:
								i.left > o.left && t.push(r);
								break;
							case n.KeyboardCode.Right: i.left < o.left && t.push(r);
						}
					});
					const f = n.closestCorners({
						active: r,
						collisionRect: i,
						droppableRects: a,
						droppableContainers: t,
						pointerCoordinates: null
					});
					let p = n.getFirstCollision(f, "id");
					if (p === (null == d ? void 0 : d.id) && f.length > 1 && (p = f[1].id), null != p) {
						const e = s.get(r.id), t = s.get(p), d = t ? a.get(t.id) : null, f = null == t ? void 0 : t.node.current;
						if (f && d && e && t) {
							const r = n.getScrollableAncestors(f).some((e, t) => l[t] !== e), a = I(e, t), s = (u = t, !(!v(c = e) || !v(u)) && !!I(c, u) && c.data.current.sortable.index < u.data.current.sortable.index), p = r || !a ? {
								x: 0,
								y: 0
							} : {
								x: s ? i.width - d.width : 0,
								y: s ? i.height - d.height : 0
							}, g = {
								x: d.left,
								y: d.top
							};
							return p.x && p.y ? g : o.subtract(g, p);
						}
					}
				}
				var c, u;
			}, exports.useSortable = function(e) {
				let { animateLayoutChanges: r = p, attributes: i, disabled: a, data: d, getNewIndex: l = f, id: c, strategy: v, resizeObserverConfig: h, transition: I = g } = e;
				const { items: y, containerId: m, activeIndex: w, disabled: C, disableTransforms: R, sortedRects: S, overIndex: D, useDragOverlay: O, strategy: N } = t.useContext(u), E = function(e, t) {
					var r, n;
					return "boolean" == typeof e ? {
						draggable: e,
						droppable: !1
					} : {
						draggable: null != (r = null == e ? void 0 : e.draggable) ? r : t.draggable,
						droppable: null != (n = null == e ? void 0 : e.droppable) ? n : t.droppable
					};
				}(a, C), K = y.indexOf(c), L = t.useMemo(() => ({
					sortable: {
						containerId: m,
						index: K,
						items: y
					},
					...d
				}), [
					m,
					d,
					K,
					y
				]), T = t.useMemo(() => y.slice(y.indexOf(c)), [y, c]), { rect: M, node: A, isOver: k, setNodeRef: X } = n.useDroppable({
					id: c,
					data: L,
					disabled: E.droppable,
					resizeObserverConfig: {
						updateMeasurementsFor: T,
						...h
					}
				}), { active: Y, activatorEvent: j, activeNodeRect: q, attributes: z, setNodeRef: U, listeners: B, isDragging: F, over: P, setActivatorNodeRef: _, transform: G } = n.useDraggable({
					id: c,
					data: L,
					attributes: {
						...x,
						...i
					},
					disabled: E.draggable
				}), H = o.useCombinedRefs(X, U), J = Boolean(Y), Q = J && !R && s(w) && s(D), V = !O && F, W = V && Q ? G : null, Z = Q ? null != W ? W : (null != v ? v : N)({
					rects: S,
					activeNodeRect: q,
					activeIndex: w,
					overIndex: D,
					index: K
				}) : null, $ = s(w) && s(D) ? l({
					id: c,
					items: y,
					activeIndex: w,
					overIndex: D
				}) : K, ee = null == Y ? void 0 : Y.id, te = t.useRef({
					activeId: ee,
					items: y,
					newIndex: $,
					containerId: m
				}), re = y !== te.current.items, ne = r({
					active: Y,
					containerId: m,
					isDragging: F,
					isSorting: J,
					id: c,
					index: K,
					items: y,
					newIndex: te.current.newIndex,
					previousItems: te.current.items,
					previousContainerId: te.current.containerId,
					transition: I,
					wasDragging: null != te.current.activeId
				}), oe = function(e) {
					let { disabled: r, index: i, node: a, rect: s } = e;
					const [d, l] = t.useState(null), c = t.useRef(i);
					return o.useIsomorphicLayoutEffect(() => {
						if (!r && i !== c.current && a.current) {
							const e = s.current;
							if (e) {
								const t = n.getClientRect(a.current, { ignoreTransform: !0 }), r = {
									x: e.left - t.left,
									y: e.top - t.top,
									scaleX: e.width / t.width,
									scaleY: e.height / t.height
								};
								(r.x || r.y) && l(r);
							}
						}
						i !== c.current && (c.current = i);
					}, [
						r,
						i,
						a,
						s
					]), t.useEffect(() => {
						d && l(null);
					}, [d]), d;
				}({
					disabled: !ne,
					index: K,
					node: A,
					rect: M
				});
				return t.useEffect(() => {
					J && te.current.newIndex !== $ && (te.current.newIndex = $), m !== te.current.containerId && (te.current.containerId = m), y !== te.current.items && (te.current.items = y);
				}, [
					J,
					$,
					m,
					y
				]), t.useEffect(() => {
					if (ee === te.current.activeId) return;
					if (null != ee && null == te.current.activeId) return void (te.current.activeId = ee);
					const e = setTimeout(() => {
						te.current.activeId = ee;
					}, 50);
					return () => clearTimeout(e);
				}, [ee]), {
					active: Y,
					activeIndex: w,
					attributes: z,
					data: L,
					rect: M,
					index: K,
					newIndex: $,
					items: y,
					isOver: k,
					isSorting: J,
					isDragging: F,
					listeners: B,
					node: A,
					overIndex: D,
					over: P,
					setNodeRef: H,
					setActivatorNodeRef: _,
					setDroppableNodeRef: X,
					setDraggableNodeRef: U,
					transform: null != oe ? oe : Z,
					transition: oe || re && te.current.newIndex === K ? b : V && !o.isKeyboardEvent(j) || !I ? void 0 : J || ne ? o.CSS.Transition.toString({
						...I,
						property: "transform"
					}) : void 0
				};
			}, exports.verticalListSortingStrategy = (e) => {
				var t;
				let { activeIndex: r, activeNodeRect: n, index: o, rects: i, overIndex: a } = e;
				const s = null != (t = i[r]) ? t : n;
				if (!s) return null;
				if (o === r) {
					const e = i[a];
					return e ? {
						x: 0,
						y: r < a ? e.top + e.height - (s.top + s.height) : e.top - s.top,
						...c
					} : null;
				}
				const d = function(e, t, r) {
					const n = e[t], o = e[t - 1], i = e[t + 1];
					return n ? r < t ? o ? n.top - (o.top + o.height) : i ? i.top - (n.top + n.height) : 0 : i ? i.top - (n.top + n.height) : o ? n.top - (o.top + o.height) : 0 : 0;
				}(i, o, r);
				return o > r && o <= a ? {
					x: 0,
					y: -s.height - d,
					...c
				} : o < r && o >= a ? {
					x: 0,
					y: s.height + d,
					...c
				} : {
					x: 0,
					y: 0,
					...c
				};
			};
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/@dnd-kit+sortable@10.0.0_@dnd-kit+core@6.3.1_react-dom@18.3.1_react@18.3.1__react@18.3.1__react@18.3.1/node_modules/@dnd-kit/sortable/dist/index.js
		var require_dist = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_sortable_cjs_production_min();
		}));
		//#endregion
		//#region src/client/sort.tsx
		var import_dist = require_dist$1();
		var import_dist$1 = require_dist();
		var import_dist$2 = require_dist$3();
		const SORT_MODE_LABEL = {
			custom: "自定义",
			az: "A → Z",
			za: "Z → A"
		};
		function readSortMode(key) {
			try {
				const v = localStorage.getItem(key);
				return v === "az" || v === "za" ? v : "custom";
			} catch {
				return "custom";
			}
		}
		function writeSortMode(key, mode) {
			try {
				localStorage.setItem(key, mode);
			} catch {}
		}
		/** custom → az → za → custom 循环 */
		function cycleSortMode(mode) {
			return mode === "custom" ? "az" : mode === "az" ? "za" : "custom";
		}
		function readOrder(key) {
			try {
				const raw = localStorage.getItem(key);
				if (!raw) return [];
				const parsed = JSON.parse(raw);
				return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
			} catch {
				return [];
			}
		}
		function writeOrder(key, order) {
			try {
				localStorage.setItem(key, JSON.stringify(order));
			} catch {}
		}
		/**
		* 应用排序：custom 模式按 saved order 排（已存 id 按保存顺序在前，新 id 按原顺序续后）；
		* az/za 按 label 排序（locale 感知，中文友好）。
		*/
		function applySortOrder(items, mode, order, keyOf, labelOf) {
			if (mode === "az" || mode === "za") {
				const sorted = [...items].sort((a, b) => labelOf(a).localeCompare(labelOf(b), "zh-Hans-CN-u-co-pinyin"));
				return mode === "az" ? sorted : sorted.reverse();
			}
			if (order.length === 0) return [...items];
			const pos = new Map(order.map((id, i) => [id, i]));
			return [...items].sort((a, b) => {
				const pa = pos.get(keyOf(a));
				const pb = pos.get(keyOf(b));
				if (pa !== void 0 && pb !== void 0) return pa - pb;
				if (pa !== void 0) return -1;
				if (pb !== void 0) return 1;
				return 0;
			});
		}
		/** 排序模式切换按钮（小图标，title 显示当前模式与切换目标） */
		function SortButton({ mode, onCycle }) {
			const next = cycleSortMode(mode);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "d2-sort-btn",
				title: `排序：${SORT_MODE_LABEL[mode]}（点击切换为 ${SORT_MODE_LABEL[next]}）`,
				onClick: (e) => {
					e.stopPropagation();
					onCycle();
				},
				children: mode === "custom" ? "⇅" : mode === "az" ? "A↓" : "Z↓"
			});
		}
		function SortableRow({ id, children }) {
			const { attributes, listeners, setNodeRef, transform, transition, isDragging } = (0, import_dist$1.useSortable)({ id });
			return children({
				setNodeRef,
				attributes,
				listeners,
				style: {
					transform: import_dist$2.CSS.Transform.toString(transform),
					transition,
					opacity: isDragging ? .6 : void 0,
					zIndex: isDragging ? 5 : void 0,
					position: "relative",
					touchAction: "none"
				},
				isDragging
			});
		}
		/**
		* 可拖拽排序列表：包一层 DndContext + SortableContext，逐行给 useSortable props。
		* 拖动中其它行 FLIP 滑动让位（dnd-kit transform transition 自带动画）；
		* onReorder 在松手时拿到完整新顺序（调用方负责持久化 + 切回 custom 模式）。
		*/
		function SortableRows({ items, keyOf, onReorder, children }) {
			const sensors = (0, import_dist.useSensors)((0, import_dist.useSensor)(import_dist.PointerSensor, { activationConstraint: { distance: 4 } }), (0, import_dist.useSensor)(import_dist.KeyboardSensor, { coordinateGetter: import_dist$1.sortableKeyboardCoordinates }));
			const ids = items.map(keyOf);
			const onDragEnd = (e) => {
				const { active, over } = e;
				if (over === null || active.id === over.id) return;
				const from = ids.indexOf(String(active.id));
				const to = ids.indexOf(String(over.id));
				if (from === -1 || to === -1) return;
				onReorder((0, import_dist$1.arrayMove)(ids, from, to));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(import_dist.DndContext, {
				sensors,
				collisionDetection: import_dist.closestCenter,
				onDragEnd,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(import_dist$1.SortableContext, {
					items: ids,
					strategy: import_dist$1.verticalListSortingStrategy,
					children: items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SortableRow, {
						id: keyOf(item),
						children: (rowProps) => children(item, rowProps)
					}, keyOf(item)))
				})
			});
		}
		//#endregion
		//#region src/client/drag-resize.ts
		function dragResize(e, startW, min, max, onLive, onDone) {
			e.preventDefault();
			e.stopPropagation();
			const startX = e.clientX;
			let last = startW;
			const move = (ev) => {
				last = Math.min(max, Math.max(min, startW + ev.clientX - startX));
				onLive(last);
			};
			const up = () => {
				window.removeEventListener("pointermove", move);
				window.removeEventListener("pointerup", up);
				onDone?.(last);
			};
			window.addEventListener("pointermove", move);
			window.addEventListener("pointerup", up);
		}
		//#endregion
		//#region src/client/RailNav.tsx
		/**
		* RailNav：Dock 左侧导航轨（两态一轨，只管看板页；0.8.0 起 APP 分区移除——
		* APP 导航收敛到顶栏 tab + APP tab 的 col1 富状态列表，消灭两列重合）。
		*
		* - 图标态 52px：看板 tab + 每个看板页 mini icon（页名首字）
		* - 中枢态 216px（拖宽 ≥100px 进入，松手吸附 52/216）：「工作台 + ⊕」看板页行
		*   （双击重命名、悬停 × 删除）
		* - 右缘 8px 拖拽把手：实时改宽（父层只写 state）；松手吸附后经 onWidthCommit 持久化；
		*   双击把手 52↔216 快捷切换
		* - tab 切换（看板 ↔ APP）由顶栏段控负责（DockShell），rail 不再承载
		*/
		const BOARDS_SORT_KEY = "openloop.dock.boards-sort.v1";
		/** 拖宽 ≥ 此值进入中枢态（仅运行时判定；松手仍吸附 52/216） */
		const RAIL_EXPAND_THRESHOLD = 100;
		const RAIL_DRAG_MAX = 260;
		function RailNav(props) {
			const { tab, onTabChange, boards, activeBoardId } = props;
			const { onSelectBoard, onAddBoard, onRenameBoard, onRemoveBoard } = props;
			const { width, onWidthChange, onWidthCommit } = props;
			const expanded = width >= RAIL_EXPAND_THRESHOLD;
			const [dragging, setDragging] = (0, react.useState)(false);
			const [editingBoard, setEditingBoard] = (0, react.useState)(null);
			const [sortMode, setSortMode] = (0, react.useState)(() => readSortMode(BOARDS_SORT_KEY));
			const sortedBoards = applySortOrder(boards, sortMode, [], (b) => b.id, (b) => b.name);
			const cycleMode = () => {
				const next = cycleSortMode(sortMode);
				setSortMode(next);
				writeSortMode(BOARDS_SORT_KEY, next);
			};
			const onReorder = (ids) => {
				dockStore.reorderBoards(ids);
				if (sortMode !== "custom") {
					setSortMode("custom");
					writeSortMode(BOARDS_SORT_KEY, "custom");
				}
			};
			const openBoard = (id) => {
				onSelectBoard(id);
				onTabChange("board");
			};
			const commitRename = (id, value) => {
				const trimmed = value.trim();
				if (trimmed) onRenameBoard(id, trimmed);
				setEditingBoard(null);
			};
			const onRenameKeyDown = (e, id) => {
				if (e.key === "Enter") commitRename(id, e.currentTarget.value);
				if (e.key === "Escape") setEditingBoard(null);
			};
			const onHandleDown = (e) => {
				setDragging(true);
				dragResize(e, width, 52, RAIL_DRAG_MAX, onWidthChange, (w) => {
					setDragging(false);
					onWidthCommit(w < RAIL_EXPAND_THRESHOLD ? 52 : 216);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
				className: `d2-rail${expanded ? " d2-expanded" : ""}${dragging ? " d2-dragging" : ""}`,
				style: { width },
				"aria-label": "Dock 导航",
				children: [expanded ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "d2-rail-sec",
					children: ["工作台", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: {
							marginLeft: "auto",
							display: "flex",
							alignItems: "center",
							gap: 4
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SortButton, {
							mode: sortMode,
							onCycle: cycleMode
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "d2-sec-add",
							title: "新增看板页",
							onClick: onAddBoard,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.plus, { size: 11 })
						})]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SortableRows, {
					items: sortedBoards,
					keyOf: (b) => b.id,
					onReorder,
					children: (b, rowProps) => editingBoard === b.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: "d2-board-rename d2-rail-rename",
						autoFocus: true,
						defaultValue: b.name,
						size: Math.max(4, b.name.length + 2),
						"aria-label": "重命名看板页",
						onBlur: (e) => commitRename(b.id, e.target.value),
						onKeyDown: (e) => onRenameKeyDown(e, b.id)
					}, b.id) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						ref: rowProps.setNodeRef,
						...rowProps.attributes,
						...rowProps.listeners,
						style: rowProps.style,
						className: `d2-rail-row${tab === "board" && b.id === activeBoardId ? " on" : ""}`,
						onClick: () => openBoard(b.id),
						onDoubleClick: () => setEditingBoard(b.id),
						title: "双击重命名；按住上下拖动调整顺序",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.board, { size: 14 }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "d2-lbl",
								children: b.name
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "d2-cnt",
								children: b.tiles.length
							}),
							boards.length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								role: "button",
								"aria-label": `删除 ${b.name}`,
								title: "删除此页",
								onClick: (e) => {
									e.stopPropagation();
									onRemoveBoard(b.id);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.x, { size: 9 })
							}) : null
						]
					}, b.id)
				})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: `d2-rail-tab${tab === "board" ? " on" : ""}`,
					title: "看板",
					onClick: () => openBoard(activeBoardId),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.board, { size: 17 })
				}), boards.map((b) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: `d2-rail-mini${tab === "board" && b.id === activeBoardId ? " on" : ""}`,
					title: b.name,
					onClick: () => openBoard(b.id),
					children: b.name.slice(0, 1)
				}, b.id))] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "d2-resize-h",
					role: "separator",
					"aria-orientation": "vertical",
					"aria-label": "调整导航轨宽度",
					title: "拖动调宽（≥100px 变中枢态，双击快捷切换）",
					onPointerDown: onHandleDown,
					onDoubleClick: () => onWidthCommit(expanded ? 52 : 216)
				})]
			});
		}
		//#endregion
		//#region src/client/badges.tsx
		const KIND_LABEL = {
			builtin: "内置",
			thirdparty: "第三方",
			local: "自研"
		};
		function KindBadge({ kind, label }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: `d2-badge ${kind}`,
				children: label ?? KIND_LABEL[kind]
			});
		}
		function TypeBadge({ type }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "d2-badge kind",
				children: type
			});
		}
		function AppIcon({ app, size = 28 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: `d2-app-icon ${app.kind}`,
				style: size !== 28 ? {
					width: size,
					height: size,
					fontSize: Math.round(size * .46)
				} : void 0,
				children: app.name.slice(0, 1)
			});
		}
		//#endregion
		//#region src/client/SnapshotLayer.tsx
		/**
		* 快照悬浮窗层（2026-09-04 快照特性 v1；交互原型 designs/snapshot-proto 四决策用户已批）：
		* - 快照 = 冻结 TileSource（panel meta 含 resolved 数据 / artifact meta 含 html），
		*   内容按冻结 meta 渲染——故意不经 resolveArtifactMeta 取 registry 最新（与 tile 不同）
		* - 纯回看：panel 渲染带 relReadonly（不派发联动事件）；窗口壳只有 拖拽/拉伸/提前/关闭
		* - 新窗右上角堆叠，旧窗向左下级联露边；点击提前——未拖过的窗随堆栈重排位，
		*   拖过的窗位置不变仅 z 提升（标准窗口管理器行为）
		* - 会话级状态，不持久化（刷新即消，与 pin 的持久布局语义分工）
		*
		* 入口：__openloopDockService.openSnapshot（panels/artifact 卡片）+
		* 本包直接 import projectSnapshot（APP 资源列表行/预览）。
		*/
		const STACK_TOP = 96;
		const STACK_RIGHT = 16;
		const CASCADE_X = -18;
		const CASCADE_Y = 16;
		const DEFAULT_W = 480;
		const DEFAULT_H = 340;
		const MIN_W = 300;
		const MIN_H = 200;
		/** DockHost 2147483050 之上、DockToggle 2147483100 之下 */
		const LAYER_Z = 2147483060;
		let state = {
			wins: [],
			freshId: null,
			bumpedId: null
		};
		let seq = 0;
		let bumpTimer;
		const listeners = /* @__PURE__ */ new Set();
		function emit(next) {
			state = next;
			for (const l of listeners) l();
		}
		function subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
		/** 投影一个快照（冻结 source；标题取卡片/组件名） */
		function projectSnapshot(source, title) {
			seq += 1;
			const now = /* @__PURE__ */ new Date();
			const takenAt = [
				now.getHours(),
				now.getMinutes(),
				now.getSeconds()
			].map((n) => String(n).padStart(2, "0")).join(":");
			const id = `snap-${seq}`;
			const win = {
				id,
				source,
				title,
				takenAt,
				pos: null,
				size: {
					w: DEFAULT_W,
					h: DEFAULT_H
				}
			};
			emit({
				wins: [...state.wins, win],
				freshId: id,
				bumpedId: null
			});
			setTimeout(() => {
				if (state.freshId === id) emit({
					...state,
					freshId: null
				});
			}, 400);
		}
		function closeSnapshot(id) {
			emit({
				...state,
				wins: state.wins.filter((w) => w.id !== id)
			});
		}
		/** 点击提前：数组末尾 = 最前；animate=true 时给「重新浮动」反馈（拖拽起手不调动画） */
		function bringToFront(id, animate) {
			const idx = state.wins.findIndex((w) => w.id === id);
			if (idx < 0 || idx === state.wins.length - 1) return;
			const wins = state.wins.slice();
			const [target] = wins.splice(idx, 1);
			if (target === void 0) return;
			wins.push(target);
			emit({
				...state,
				wins,
				bumpedId: animate ? id : state.bumpedId
			});
			if (animate) {
				if (bumpTimer !== void 0) clearTimeout(bumpTimer);
				bumpTimer = setTimeout(() => {
					if (state.bumpedId === id) emit({
						...state,
						bumpedId: null
					});
				}, 350);
			}
		}
		function setWinRect(id, rect) {
			emit({
				...state,
				wins: state.wins.map((w) => w.id === id ? {
					...w,
					pos: {
						x: rect.x,
						y: rect.y
					},
					size: {
						w: rect.w,
						h: rect.h
					}
				} : w)
			});
		}
		const SNAP_CSS = `
@keyframes openloop-snap-in { from { opacity: 0; transform: translate(26px,-18px) scale(.92); } to { opacity: 1; transform: none; } }
@keyframes openloop-snap-pop { 0% { transform: translateY(0); } 35% { transform: translateY(-6px); } 100% { transform: translateY(0); } }
`;
		function SnapshotLayer() {
			const snap = (0, react.useSyncExternalStore)(subscribe, () => state);
			(0, react.useEffect)(() => {
				const el = document.createElement("style");
				el.setAttribute("data-openloop-snapshot", "");
				el.textContent = SNAP_CSS;
				document.head.appendChild(el);
				return () => {
					el.remove();
				};
			}, []);
			if (snap.wins.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					position: "fixed",
					inset: 0,
					pointerEvents: "none",
					zIndex: LAYER_Z
				},
				"data-openloop-snapshot-layer": true,
				children: snap.wins.map((w, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SnapshotWindow, {
					win: w,
					fromFront: snap.wins.length - 1 - i,
					fresh: w.id === snap.freshId,
					bumped: w.id === snap.bumpedId
				}, w.id))
			});
		}
		function stackRect(fromFront, size) {
			const vw = window.innerWidth;
			const maxSteps = Math.max(0, Math.floor((vw - size.w - STACK_RIGHT - 8) / 18));
			const steps = Math.min(fromFront, maxSteps);
			return {
				x: vw - STACK_RIGHT - size.w + steps * CASCADE_X,
				y: STACK_TOP + fromFront * CASCADE_Y,
				w: size.w,
				h: size.h
			};
		}
		function clamp(v, min, max) {
			return Math.min(max, Math.max(min, v));
		}
		function moveRect(start, dx, dy) {
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			return {
				x: clamp(start.x + dx, -start.w + 90, vw - 90),
				y: clamp(start.y + dy, 0, vh - 42),
				w: start.w,
				h: start.h
			};
		}
		function resizeRect(start, dir, dx, dy) {
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			let left = start.x;
			let right = start.x + start.w;
			let top = start.y;
			let bottom = start.y + start.h;
			if (dir.includes("w")) left = clamp(start.x + dx, -start.w + 90, right - MIN_W);
			if (dir.includes("e")) right = clamp(right + dx, left + MIN_W, vw - 8);
			if (dir.includes("n")) top = clamp(start.y + dy, 0, bottom - MIN_H);
			if (dir.includes("s")) bottom = clamp(bottom + dy, top + MIN_H, vh - 8);
			return {
				x: left,
				y: top,
				w: right - left,
				h: bottom - top
			};
		}
		const RESIZE_HANDLES = [
			{
				d: "nw",
				style: {
					left: 0,
					top: 0,
					width: 16,
					height: 16,
					cursor: "nwse-resize"
				}
			},
			{
				d: "n",
				style: {
					left: 14,
					right: 14,
					top: 0,
					height: 8,
					cursor: "ns-resize"
				}
			},
			{
				d: "ne",
				style: {
					right: 0,
					top: 0,
					width: 16,
					height: 16,
					cursor: "nesw-resize"
				}
			},
			{
				d: "w",
				style: {
					left: 0,
					top: 14,
					bottom: 14,
					width: 8,
					cursor: "ew-resize"
				}
			},
			{
				d: "e",
				style: {
					right: 0,
					top: 14,
					bottom: 14,
					width: 8,
					cursor: "ew-resize"
				}
			},
			{
				d: "sw",
				style: {
					left: 0,
					bottom: 0,
					width: 16,
					height: 16,
					cursor: "nesw-resize"
				}
			},
			{
				d: "s",
				style: {
					left: 14,
					right: 14,
					bottom: 0,
					height: 8,
					cursor: "ns-resize"
				}
			},
			{
				d: "se",
				style: {
					right: 0,
					bottom: 0,
					width: 16,
					height: 16,
					cursor: "nwse-resize"
				}
			}
		];
		const SNAP_PURPLE = "#7a5af8";
		function SnapshotWindow({ win, fromFront, fresh, bumped }) {
			const [interacting, setInteracting] = (0, react.useState)(false);
			const cancelRef = (0, react.useRef)(() => {});
			(0, react.useEffect)(() => () => cancelRef.current(), []);
			const rect = win.pos !== null ? {
				x: win.pos.x,
				y: win.pos.y,
				w: win.size.w,
				h: win.size.h
			} : stackRect(fromFront, win.size);
			/** 拖拽/8向拉伸：pointer capture + window 级监听（univer 同款手写，零依赖）。
			*  起手只提前不播动画——拖拽本身就是反馈。 */
			const beginSession = (event, mode) => {
				if (event.button !== 0) return;
				event.preventDefault();
				event.stopPropagation();
				bringToFront(win.id, false);
				cancelRef.current();
				const view = event.currentTarget.ownerDocument.defaultView;
				if (view === null) return;
				const pointerId = event.pointerId;
				const origin = {
					x: event.clientX,
					y: event.clientY
				};
				const start = rect;
				const el = event.currentTarget;
				setInteracting(true);
				try {
					el.setPointerCapture(pointerId);
				} catch {}
				const move = (next) => {
					if (next.pointerId !== pointerId) return;
					const dx = next.clientX - origin.x;
					const dy = next.clientY - origin.y;
					setWinRect(win.id, mode === "move" ? moveRect(start, dx, dy) : resizeRect(start, mode, dx, dy));
				};
				const cleanup = () => {
					view.removeEventListener("pointermove", move);
					view.removeEventListener("pointerup", finish);
					view.removeEventListener("pointercancel", finish);
					cancelRef.current = () => {};
					try {
						el.releasePointerCapture(pointerId);
					} catch {}
				};
				const finish = (next) => {
					if (next.pointerId !== pointerId) return;
					cleanup();
					setInteracting(false);
				};
				cancelRef.current = cleanup;
				view.addEventListener("pointermove", move);
				view.addEventListener("pointerup", finish);
				view.addEventListener("pointercancel", finish);
			};
			const rid = sourceIdOf(win.source);
			const anim = fresh ? { animation: "openloop-snap-in .28s cubic-bezier(.2,.9,.3,1.2)" } : bumped ? { animation: "openloop-snap-pop .3s ease-out" } : {};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					position: "fixed",
					left: rect.x,
					top: rect.y,
					width: rect.w,
					height: rect.h,
					display: "flex",
					flexDirection: "column",
					pointerEvents: "auto",
					borderRadius: 14,
					overflow: "hidden",
					border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
					background: "var(--dsw-alias-bg-layer-1, #fff)",
					boxShadow: "0 2px 6px rgba(0,0,0,.1), 0 18px 48px rgba(0,0,0,.28)",
					...anim
				},
				"data-openloop-snapshot-window": win.id,
				onPointerDown: () => bringToFront(win.id, true),
				"aria-label": `快照 · ${win.title}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						style: {
							flex: "0 0 38px",
							display: "flex",
							alignItems: "center",
							gap: 8,
							padding: "0 8px 0 11px",
							cursor: "grab",
							userSelect: "none",
							touchAction: "none",
							background: `linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-bg-layer-2, #f6f6f7) 88%, ${SNAP_PURPLE}), var(--dsw-alias-bg-layer-2, #f6f6f7))`,
							borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))"
						},
						onPointerDown: (e) => {
							if (e.target.closest("[data-snap-control]") !== null) return;
							beginSession(e, "move");
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									flexShrink: 0,
									display: "inline-flex",
									alignItems: "center",
									gap: 4,
									fontSize: 9,
									fontWeight: 600,
									padding: "1.5px 7px",
									borderRadius: 999,
									color: SNAP_PURPLE,
									background: `color-mix(in srgb, ${SNAP_PURPLE} 13%, transparent)`,
									border: `1px solid color-mix(in srgb, ${SNAP_PURPLE} 32%, transparent)`,
									whiteSpace: "nowrap"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.snap, {
										size: 9,
										sw: 1.8
									}),
									"快照 ",
									win.takenAt
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 11.5,
									fontWeight: 600,
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis"
								},
								children: win.title
							}),
							rid !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									flexShrink: 0,
									fontSize: 9,
									fontFamily: "ui-monospace, \"SF Mono\", Menlo, monospace",
									color: "var(--dsw-alias-label-caption, #888)",
									background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))",
									padding: "1.5px 6px",
									borderRadius: 5,
									whiteSpace: "nowrap"
								},
								children: rid
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									marginLeft: "auto",
									flexShrink: 0
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"data-snap-control": "",
									title: "关闭快照",
									onClick: () => closeSnapshot(win.id),
									style: {
										width: 22,
										height: 22,
										borderRadius: 6,
										border: 0,
										background: "none",
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										color: "var(--dsw-alias-label-tertiary, #888)"
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.x, { size: 12 })
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							flex: 1,
							minHeight: 0,
							overflow: "auto",
							position: "relative"
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SnapshotContent, { win })
					}),
					interacting ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
						position: "absolute",
						inset: 0,
						zIndex: 18
					} }) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
						style: {
							flex: "0 0 24px",
							display: "flex",
							alignItems: "center",
							gap: 6,
							padding: "0 10px",
							fontSize: 9,
							color: "var(--dsw-alias-label-caption, #888)",
							borderTop: "1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))",
							background: "var(--dsw-alias-bg-layer-2, #f6f6f7)"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									color: SNAP_PURPLE,
									fontWeight: 600
								},
								children: "只读回看"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "·" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "内容冻结于投影时刻，pin 到看板才会持久保留" })
						]
					}),
					RESIZE_HANDLES.map((h) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							position: "absolute",
							zIndex: 20,
							touchAction: "none",
							...h.style
						},
						onPointerDown: (e) => beginSession(e, h.d)
					}, h.d))
				]
			});
		}
		function SnapshotContent({ win }) {
			const { source } = win;
			if (source.kind === "panel") {
				const panels = getPanelsClient();
				if (panels === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DependencyMissing, {
					what: "快照面板",
					dep: "@openloop/dsh-panels"
				});
				const PanelSurface = panels.PanelSurface;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PanelSurface, {
					meta: source.meta,
					relReadonly: true
				});
			}
			if (source.kind === "mcp-app") {
				const mcpApps = getMcpAppsClient();
				if (mcpApps === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DependencyMissing, {
					what: "快照 MCP App",
					dep: "@openloop/dsh-mcp"
				});
				const McpAppResourceView = mcpApps.McpAppResourceView;
				const meta = source.meta;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpAppResourceView, {
					serverId: meta.serverId,
					toolName: meta.toolName,
					resourceUri: meta.resourceUri,
					title: win.title,
					frameId: `snap-${win.id}`
				});
			}
			const artifact = getArtifactClient();
			if (artifact === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DependencyMissing, {
				what: "快照 Artifact",
				dep: "@openloop/dsh-html-artifact"
			});
			const ArtifactFrame = artifact.ArtifactFrame;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArtifactFrame, {
				meta: source.meta,
				token: `snap-${win.id}`,
				fullscreen: false,
				scope: getScope$1()
			});
		}
		//#endregion
		//#region src/client/AppListPanel.tsx
		/**
		* APP tab 三列结构（0.8.0 三列重构，2026-08-30；原型 designs/dock-app-redesign 已批准）：
		* - col1 AppListPanel：富状态 APP 行（图标/名称/资源计数/来源徽标/连接状态点）
		* - col2 AppResourceList：选中 APP 的资源列表（顶部默认「详情」行 + 组件/API 分组）
		* - col3 AppDetailPane：详情（原 AppDetail 直搬）/ 组件预览（免 pin 选中即看）/ API 详情
		*
		* 旧版（rail APP 分区 + 230px 侧栏 + 详情两列）废止：APP 入口收敛到 col1，
		* rail 只留看板页；预览复用 tile 渲染链（PanelSurface / McpAppResourceView）。
		*/
		const APPS_SORT_KEY = "openloop.dock.apps-sort.v1";
		const APPS_ORDER_KEY = "openloop.dock.apps-order.v1";
		/** scope 惰性单例（ArtifactFrame 主题注入；与 DockBoardView 同款） */
		let appListScopeCache;
		function getScope() {
			if (appListScopeCache === void 0) appListScopeCache = getBaseClient()?.createOpenLoopSettingsScope();
			return appListScopeCache;
		}
		/** 快照 v1：registry 组件投影为快照悬浮窗（与 pin 同数据源；按钮受 pinnable 门控，null 兜底） */
		function snapshotComponent(c) {
			const source = buildTileSourceForComponent(c);
			if (source !== null) projectSnapshot(source, c.title);
		}
		/** col 缩略/拖宽常量（0.8.2 恢复旧侧栏能力：缩略 48px 图标条；拖到 <120px 松手自动缩略） */
		const COL_COLLAPSED_WIDTH = 48;
		const COL_COLLAPSE_THRESHOLD = 120;
		const COL_MIN_EXPANDED = 160;
		const COL_MAX_EXPANDED = 420;
		function readColUi(key, fallbackWidth) {
			try {
				const raw = localStorage.getItem(key);
				if (raw === null) return {
					width: fallbackWidth,
					collapsed: false
				};
				const p = JSON.parse(raw);
				return {
					width: typeof p.width === "number" ? Math.min(COL_MAX_EXPANDED, Math.max(COL_MIN_EXPANDED, Math.round(p.width))) : fallbackWidth,
					collapsed: p.collapsed === true
				};
			} catch {
				return {
					width: fallbackWidth,
					collapsed: false
				};
			}
		}
		function writeColUi(key, state) {
			try {
				localStorage.setItem(key, JSON.stringify(state));
			} catch {}
		}
		/** col1/col2 共用的缩略+拖宽 hook（UI 态持久化 localStorage；
		*  0.8.3：缩略/展开切换即时化——拖到 <120px 即缩、拖回 ≥120px 即展开，不等松手） */
		function useCollapsibleColumn(key, fallbackWidth) {
			const [ui, setUi] = (0, react.useState)(() => readColUi(key, fallbackWidth));
			const update = (patch) => {
				const next = {
					...ui,
					...patch
				};
				setUi(next);
				writeColUi(key, next);
			};
			const expand = () => update({ collapsed: false });
			const collapse = () => update({ collapsed: true });
			const onHandleDown = (e) => {
				dragResize(e, ui.collapsed ? COL_COLLAPSED_WIDTH : ui.width, COL_COLLAPSED_WIDTH, COL_MAX_EXPANDED, (w) => {
					const collapsed = w < COL_COLLAPSE_THRESHOLD;
					setUi((u) => ({
						collapsed,
						width: collapsed ? u.width : Math.max(COL_MIN_EXPANDED, w)
					}));
				}, (w) => {
					const collapsed = w < COL_COLLAPSE_THRESHOLD;
					const next = {
						collapsed,
						width: collapsed ? ui.width : Math.max(COL_MIN_EXPANDED, Math.round(w))
					};
					setUi(next);
					writeColUi(key, next);
				});
			};
			return {
				ui,
				expand,
				collapse,
				onHandleDown
			};
		}
		/** MCP server 连接态（/openloop/mcp/servers；mcp bundle 未装时恒为空 map → 回退 API 健康态） */
		function useMcpServerStates() {
			const [states, setStates] = (0, react.useState)(() => /* @__PURE__ */ new Map());
			(0, react.useEffect)(() => {
				let cancelled = false;
				const load = () => {
					fetch("/openloop/mcp/servers", { credentials: "same-origin" }).then((res) => {
						if (!res.ok) return null;
						return (res.headers.get("content-type") ?? "").includes("application/json") ? res.json() : null;
					}).then((body) => {
						if (cancelled) return;
						const servers = body?.servers;
						if (!Array.isArray(servers)) return;
						const map = /* @__PURE__ */ new Map();
						for (const s of servers) {
							const entry = s;
							if (typeof entry?.id === "string" && typeof entry?.state === "string") map.set(entry.id, entry.state);
						}
						setStates(map);
					}).catch(() => void 0);
				};
				load();
				const timer = setInterval(load, 6e4);
				return () => {
					cancelled = true;
					clearInterval(timer);
				};
			}, []);
			return states;
		}
		function toneOfApp(app, mcpStates) {
			const state = mcpStates.get(app.id);
			if (state !== void 0) {
				if (state === "connected" || state === "connecting") return "ok";
				if (state === "error" || state === "disconnected") return "warn";
				return "off";
			}
			return app.apis.some((x) => x.status === "warn") ? "warn" : "ok";
		}
		function AppListPanel({ apps, selectedAppId, onSelect, toneOf }) {
			const { ui, expand, onHandleDown } = useCollapsibleColumn("openloop.dock.apps-col1.v1", 230);
			const [appQuery, setAppQuery] = (0, react.useState)("");
			const filteredApps = appQuery.trim().length === 0 ? apps : apps.filter((a) => `${a.name} ${a.id}`.toLowerCase().includes(appQuery.trim().toLowerCase()));
			const [sortMode, setSortMode] = (0, react.useState)(() => readSortMode(APPS_SORT_KEY));
			const [order, setOrder] = (0, react.useState)(() => readOrder(APPS_ORDER_KEY));
			const sortedApps = applySortOrder(filteredApps, sortMode, order, (a) => a.id, (a) => a.name);
			const cycleMode = () => {
				const next = cycleSortMode(sortMode);
				setSortMode(next);
				writeSortMode(APPS_SORT_KEY, next);
			};
			const onReorder = (ids) => {
				setOrder(ids);
				writeOrder(APPS_ORDER_KEY, ids);
				if (sortMode !== "custom") {
					setSortMode("custom");
					writeSortMode(APPS_SORT_KEY, "custom");
				}
			};
			if (ui.collapsed) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: "d2-applist d2-col-collapsed",
				"aria-label": "APP 列表（缩略）",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "d2-col-head",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "d2-collapse-btn",
							title: "展开 APP 列表",
							onClick: expand,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.chevronR, { size: 14 })
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "d2-rows",
						children: apps.map((a) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: `d2-col-mini${a.id === selectedAppId ? " on" : ""}`,
							title: a.name,
							onClick: () => {
								onSelect(a.id);
								expand();
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AppIcon, {
								app: a,
								size: 22
							})
						}, a.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "d2-resize-h",
						role: "separator",
						"aria-orientation": "vertical",
						title: "拖动调宽（拖到最左变缩略，缩略态向右拖恢复）",
						onPointerDown: onHandleDown
					})
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: "d2-applist",
				style: { width: ui.width },
				"aria-label": "APP 列表",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "d2-col-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "APP" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								marginLeft: "auto",
								display: "flex",
								alignItems: "center",
								gap: 6
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SortButton, {
								mode: sortMode,
								onCycle: cycleMode
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "d2-tcap",
								children: filteredApps.length
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { padding: "0 12px 6px" },
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "d2-search",
							style: { width: "100%" },
							type: "search",
							value: appQuery,
							placeholder: "搜索应用…",
							"aria-label": "搜索应用",
							onChange: (e) => setAppQuery(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "d2-rows",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SortableRows, {
							items: sortedApps,
							keyOf: (a) => a.id,
							onReorder,
							children: (a, rowProps) => {
								const tone = toneOf(a);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									ref: rowProps.setNodeRef,
									...rowProps.attributes,
									...rowProps.listeners,
									style: rowProps.style,
									className: `d2-app-row${a.id === selectedAppId ? " on" : ""}`,
									onClick: () => onSelect(a.id),
									title: `${tone === "warn" ? "MCP server 不可达（惰性重连中）" : tone === "off" ? "MCP server 已关闭" : ""}按住上下拖动调整顺序`,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AppIcon, { app: a }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "d2-meta",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "d2-name",
												children: a.name
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: "d2-sub",
												children: [
													a.components.length,
													" 组件 · ",
													a.apis.length,
													" API ",
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KindBadge, { kind: a.kind })
												]
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "d2-status",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: `d2-dot ${tone}` })
										})
									]
								});
							}
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "d2-resize-h",
						role: "separator",
						"aria-orientation": "vertical",
						title: "拖动调宽（拖到最左变缩略）",
						onPointerDown: onHandleDown
					})
				]
			});
		}
		function AppResourceList({ app, selection, onSelect, pinnedIds }) {
			const { ui, expand, onHandleDown } = useCollapsibleColumn("openloop.dock.apps-col2.v1", 290);
			const [resQuery, setResQuery] = (0, react.useState)("");
			const q = resQuery.trim().toLowerCase();
			const components = q.length === 0 ? app.components : app.components.filter((c) => `${c.title} ${c.id}`.toLowerCase().includes(q));
			const apis = q.length === 0 ? app.apis : app.apis.filter((a) => `${a.path} ${a.domain}`.toLowerCase().includes(q));
			const COMP_ORDER_KEY = `openloop.dock.res-comp-order.v1:${app.id}`;
			const API_ORDER_KEY = `openloop.dock.res-api-order.v1:${app.id}`;
			const RES_SORT_KEY = "openloop.dock.res-sort.v1";
			const [sortMode, setSortMode] = (0, react.useState)(() => readSortMode(RES_SORT_KEY));
			const [compOrder, setCompOrder] = (0, react.useState)(() => readOrder(COMP_ORDER_KEY));
			const [apiOrder, setApiOrder] = (0, react.useState)(() => readOrder(API_ORDER_KEY));
			(0, react.useEffect)(() => {
				setCompOrder(readOrder(COMP_ORDER_KEY));
				setApiOrder(readOrder(API_ORDER_KEY));
			}, [app.id]);
			const sortedComponents = applySortOrder(components, sortMode, compOrder, (c) => c.id, (c) => c.title);
			const sortedApis = applySortOrder(apis, sortMode, apiOrder, (a) => a.id, (a) => a.path);
			const cycleMode = () => {
				const next = cycleSortMode(sortMode);
				setSortMode(next);
				writeSortMode(RES_SORT_KEY, next);
			};
			const commitCustom = () => {
				if (sortMode !== "custom") {
					setSortMode("custom");
					writeSortMode(RES_SORT_KEY, "custom");
				}
			};
			const onCompReorder = (ids) => {
				setCompOrder(ids);
				writeOrder(COMP_ORDER_KEY, ids);
				commitCustom();
			};
			const onApiReorder = (ids) => {
				setApiOrder(ids);
				writeOrder(API_ORDER_KEY, ids);
				commitCustom();
			};
			if (ui.collapsed) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: "d2-rescol d2-col-collapsed",
				"aria-label": "资源列表（缩略）",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "d2-col-head",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "d2-collapse-btn",
							title: "展开资源列表",
							onClick: expand,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.chevronR, { size: 14 })
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "d2-rescol-rows",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `d2-col-mini${selection.kind === "detail" ? " on" : ""}`,
								title: "详情",
								onClick: () => {
									onSelect({ kind: "detail" });
									expand();
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.info, { size: 16 })
							}),
							app.components.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `d2-col-mini${selection.kind === "component" && selection.rid === c.id ? " on" : ""}`,
								title: c.title,
								onClick: () => {
									onSelect({
										kind: "component",
										rid: c.id
									});
									expand();
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `badge plain d2-mini-badge`,
									children: c.type === "mcp-app" ? "mcp" : "pnl"
								})
							}, c.id)),
							app.apis.map((a) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `d2-col-mini${selection.kind === "api" && selection.rid === a.id ? " on" : ""}`,
								title: a.path,
								onClick: () => {
									onSelect({
										kind: "api",
										rid: a.id
									});
									expand();
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: `d2-dot ${a.status}` })
							}, a.id))
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "d2-resize-h",
						role: "separator",
						"aria-orientation": "vertical",
						title: "拖动调宽（拖到最左变缩略，缩略态向右拖恢复）",
						onPointerDown: onHandleDown
					})
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: "d2-rescol",
				style: { width: ui.width },
				"aria-label": "资源列表",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "d2-rescol-head",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AppIcon, {
								app,
								size: 24
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "d2-rescol-name",
								children: app.name
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "d2-rescol-kind",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KindBadge, { kind: app.kind })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { marginLeft: "auto" },
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SortButton, {
									mode: sortMode,
									onCycle: cycleMode
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { padding: "0 12px 6px" },
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "d2-search",
							style: { width: "100%" },
							type: "search",
							value: resQuery,
							placeholder: "搜索组件 / API…",
							"aria-label": "搜索组件或 API",
							onChange: (e) => setResQuery(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "d2-rescol-rows",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `d2-detail-row${selection.kind === "detail" ? " on" : ""}`,
								onClick: () => onSelect({ kind: "detail" }),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "d2-di",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.info, { size: 13 })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "d2-lbl",
										children: "详情"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "d2-hint",
										children: "应用概览"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "d2-resource-group",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", { children: ["组件资源 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "d2-badge kind",
									children: components.length
								})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "d2-resource-list",
									children: [components.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "d2-resource-row",
										style: {
											color: "var(--dsw-alias-label-caption, #888)",
											fontSize: 11.5,
											cursor: "default"
										},
										children: "暂无组件资源"
									}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SortableRows, {
										items: sortedComponents,
										keyOf: (c) => c.id,
										onReorder: onCompReorder,
										children: (c, rowProps) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											ref: rowProps.setNodeRef,
											...rowProps.attributes,
											...rowProps.listeners,
											style: rowProps.style,
											className: `d2-resource-row${selection.kind === "component" && selection.rid === c.id ? " on" : ""}`,
											onClick: () => onSelect({
												kind: "component",
												rid: c.id
											}),
											title: "选中后在右侧预览；按住上下拖动调整顺序",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TypeBadge, { type: c.type }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "d2-meta",
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: "d2-name",
														children: c.title
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: "d2-rid",
														children: c.id
													})]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelChips, {
													rid: c.id,
													onJump: (rid) => onSelect({
														kind: "component",
														rid
													})
												}),
												pinnedIds.has(c.id) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "d2-pin-dot",
													title: "已固定到看板",
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "d2-dot ok" })
												}) : null
											]
										})
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "d2-resource-group",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", { children: ["API 资源 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "d2-badge kind",
									children: apis.length
								})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "d2-resource-list",
									children: [apis.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "d2-resource-row",
										style: {
											color: "var(--dsw-alias-label-caption, #888)",
											fontSize: 11.5,
											cursor: "default"
										},
										children: "暂无 API 资源"
									}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SortableRows, {
										items: sortedApis,
										keyOf: (a) => a.id,
										onReorder: onApiReorder,
										children: (a, rowProps) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											ref: rowProps.setNodeRef,
											...rowProps.attributes,
											...rowProps.listeners,
											style: rowProps.style,
											className: `d2-resource-row${selection.kind === "api" && selection.rid === a.id ? " on" : ""}`,
											onClick: () => onSelect({
												kind: "api",
												rid: a.id
											}),
											title: "选中后在右侧查看详情；按住上下拖动调整顺序",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: `d2-dot ${a.status}` }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "d2-meta",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: "d2-name",
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: "d2-mono",
														children: a.path
													})
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "d2-rid",
													children: [
														a.domain,
														" · ",
														a.id
													]
												})]
											})]
										})
									})]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "d2-resize-h",
						role: "separator",
						"aria-orientation": "vertical",
						title: "拖动调宽（拖到最左变缩略）",
						onPointerDown: onHandleDown
					})
				]
			});
		}
		/** 受控管理动作（POST /openloop/app/manage/*；错误以 toast 文案返回） */
		function useManageAction(onDone) {
			const [busy, setBusy] = (0, react.useState)(null);
			const run = (action, appName, confirm) => {
				if (busy !== null) return;
				if (action === "delete" && confirm !== appName) {
					onDone();
					return;
				}
				setBusy(`${action}:${appName}`);
				const body = action === "delete" ? { appName } : { serverId: appName };
				fetch(`/openloop/app/manage/${action}`, {
					method: "POST",
					credentials: "same-origin",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json"
					},
					body: JSON.stringify(body)
				}).then(async (res) => {
					if (!(res.headers.get("content-type") ?? "").includes("application/json")) throw new Error(`HTTP ${res.status}`);
					const payload = await res.json();
					if (!res.ok || payload.ok !== true) throw new Error(typeof payload.error === "string" ? payload.error : `HTTP ${res.status}`);
					onDone();
				}).catch(() => {}).finally(() => setBusy(null));
			};
			return {
				run,
				busy
			};
		}
		function AppDetail({ app, pinnedIds, onPin, onSelectComponent, onManaged }) {
			const [confirming, setConfirming] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (confirming === null) return;
				const timer = setTimeout(() => setConfirming(null), 3e3);
				return () => clearTimeout(timer);
			}, [confirming]);
			const manage = useManageAction(() => {
				setConfirming(null);
				onManaged?.();
			});
			const isThirdparty = app.kind === "thirdparty";
			const isBuiltin = app.kind === "builtin";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "d2-app-detail",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: "d2-app-detail-head",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AppIcon, {
							app,
							size: 36
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "d2-title-block",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h2", { children: [
								app.name,
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "d2-ver",
									children: ["v", app.version]
								})
							] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "d2-desc",
								children: app.desc.trim().length > 0 ? app.desc : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: { opacity: .55 },
									children: "暂无描述——让 Agent 经 app_backend upsert_app 补充 description（面向用户的一句话：这个 APP 是什么、给谁用）"
								})
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KindBadge, { kind: app.kind }),
						!isBuiltin ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 6,
								flexShrink: 0,
								marginLeft: 8
							},
							children: [isThirdparty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "d2-ghost-btn",
								disabled: manage.busy !== null,
								title: "断开（热移除工具与连接；保留配置，可重连）",
								onClick: () => manage.run("disconnect", app.id, null),
								children: "断开"
							}) : null, confirming === app.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "d2-ghost-btn danger",
								disabled: manage.busy !== null,
								onClick: () => manage.run("delete", app.id, app.id),
								children: "确认删除？"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "d2-ghost-btn danger",
								disabled: manage.busy !== null,
								title: "删除（级联清理组件与 API 资源）",
								onClick: () => setConfirming(app.id),
								children: "删除"
							})]
						}) : null
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "d2-resource-groups",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "d2-resource-group",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", { children: ["组件资源 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "d2-badge kind",
							children: app.components.length
						})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "d2-resource-list",
							children: app.components.map((c) => {
								const pinned = pinnedIds.has(c.id);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: `d2-resource-row${pinned ? " pinned" : ""}${onSelectComponent !== void 0 ? " d2-row-selectable" : ""}`,
									onClick: onSelectComponent !== void 0 ? () => onSelectComponent(c) : void 0,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TypeBadge, { type: c.type }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "d2-meta",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "d2-name",
												children: c.title
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "d2-rid",
												children: c.id
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "d2-rowdesc",
											children: c.desc
										}),
										c.pinnable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "d2-ghost-btn d2-pin-btn",
											title: "投影为快照（冻结当前内容，悬浮只读回看）",
											onClick: (e) => {
												e.stopPropagation();
												snapshotComponent(c);
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.snap, { size: 13 }), "快照"]
										}), pinned ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "d2-pin-locked",
											title: "已固定到看板",
											children: "已固定"
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "d2-ghost-btn d2-pin-btn",
											title: "固定到看板",
											onClick: (e) => {
												e.stopPropagation();
												onPin(app, c);
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.pin, { size: 13 }), "固定"]
										})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "d2-pin-locked",
											title: "该组件的 entry 无可渲染面板——让 Agent 经 app_backend 重新注册，entry 内联完整 PanelDefinition（entry: { panel: {...} }），文件路径无效",
											children: "待生成"
										})
									]
								}, c.id);
							})
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "d2-resource-group",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", { children: ["API 资源 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "d2-badge kind",
							children: app.apis.length
						})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "d2-resource-list",
							children: app.apis.map((api) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "d2-resource-row",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: `d2-dot ${api.status}`,
										title: api.status === "ok" ? "已配置" : "需要注意"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "d2-meta",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "d2-name",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "d2-mono",
												children: api.path
											})
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "d2-rid",
											children: [
												api.domain,
												" · ",
												api.id
											]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "d2-rowdesc",
										children: api.summary
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "d2-badge kind",
										children: api.auth === "key" ? "key + 域名" : "无鉴权"
									})
								]
							}, api.id))
						})]
					})]
				})]
			});
		}
		function ComponentPreview({ app, comp, pinned, onPin, tone, onSelectComponent }) {
			const source = buildTileSourceForComponent(comp);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "d2-detailpane",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "d2-preview-head",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TypeBadge, { type: comp.type }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "d2-meta",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "d2-name",
								children: comp.title
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "d2-rid",
								children: comp.id
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "d2-mode-badge d2-badge kind",
							children: "预览"
						}),
						comp.pinnable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "d2-ghost-btn d2-pin-btn",
							title: "投影为快照（冻结当前内容，悬浮只读回看）",
							onClick: () => snapshotComponent(comp),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.snap, { size: 13 }), "快照"]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: `d2-pin-primary${pinned ? " pinned" : ""}`,
							onClick: onPin,
							children: pinned ? "✓ 已固定到看板" : "固定到看板"
						})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "d2-pin-locked",
							children: "待生成"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "d2-preview-canvas",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "d2-preview-note",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: `d2-dot ${tone}` }), tone === "warn" ? "MCP server 当前不可达——pin 后 tile 会显示可重试错误态（惰性重连自愈）" : tone === "off" ? "MCP server 已关闭" : comp.type === "mcp-app" ? `来自 ${app.name} · 渲染时经 refresh 端点取数（沙箱）` : `来自 ${app.name} · 宿主车道渲染`]
						}),
						source === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "d2-empty-note",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 22,
										opacity: .6
									},
									children: "🧩"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: "暂无可渲染内容" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "d2-tcap",
									children: "让 Agent 经 app_backend 生成内容后重新注册"
								})
							]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "d2-frame",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "d2-frame-bar",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "d2-fdots",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: source.kind === "mcp-app" ? "opaque-origin 沙箱 · AppBridge" : "panel 宿主车道" })]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "d2-frame-body",
								children: [
									source.kind === "panel" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PanelPreviewBody, { meta: source.meta }) : null,
									source.kind === "mcp-app" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpAppPreviewBody, { comp }) : null,
									source.kind === "artifact" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArtifactPreviewBody, { meta: source.meta }) : null
								]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelDeclSection, { rid: comp.id }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelTryIt, { rid: comp.id }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelatedPages, {
							rid: comp.id,
							onJump: onSelectComponent
						})
					]
				})]
			});
		}
		function PanelPreviewBody({ meta }) {
			const panels = getPanelsClient();
			if (panels === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DependencyMissing, {
				what: "APP 组件预览",
				dep: "@openloop/dsh-panels"
			});
			const PanelSurface = panels.PanelSurface;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PanelSurface, { meta });
		}
		/** artifact 预览（0.5.2 few-shot 库）：复用 tile 渲染链的 ArtifactFrame */
		function ArtifactPreviewBody({ meta }) {
			const artifact = getArtifactClient();
			if (artifact === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DependencyMissing, {
				what: "APP Artifact 预览",
				dep: "@openloop/dsh-html-artifact"
			});
			const ArtifactFrame = artifact.ArtifactFrame;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArtifactFrame, {
				meta,
				token: "app-artifact-preview",
				fullscreen: false,
				scope: getScope()
			});
		}
		function McpAppPreviewBody({ comp }) {
			const mcpApps = getMcpAppsClient();
			if (mcpApps === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DependencyMissing, {
				what: "APP MCP 组件预览",
				dep: "@openloop/dsh-mcp"
			});
			const McpAppResourceView = mcpApps.McpAppResourceView;
			const reference = buildTileSourceForComponent(comp);
			if (reference === null || reference.kind !== "mcp-app") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "d2-empty-note",
				children: "MCP App 引用形态无效"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpAppResourceView, {
				serverId: reference.meta.serverId,
				toolName: reference.meta.toolName,
				resourceUri: reference.meta.resourceUri,
				title: comp.title,
				frameId: `app-preview-${comp.id}`
			});
		}
		function ApiDetail({ app, api }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "d2-detailpane",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "d2-preview-head",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: `d2-dot ${api.status}` }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "d2-meta",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "d2-name",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "d2-mono",
									children: api.path
								})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "d2-rid",
								children: api.id
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "d2-mode-badge d2-badge kind",
							children: "API 详情"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "d2-preview-canvas",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "d2-preview-note",
						children: "凭据只写不读——此处仅显示配置状态；key 经 set_api_key 服务端存储，任何途径不可取回。"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "d2-api-card",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "d2-api-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "d2-k",
									children: "归属 APP"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "d2-v plain",
									children: app.name
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "d2-api-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "d2-k",
									children: "域名"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "d2-v",
									children: api.domain
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "d2-api-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "d2-k",
									children: "路径"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "d2-v",
									children: api.path
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "d2-api-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "d2-k",
									children: "鉴权"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "d2-v plain",
									children: api.auth === "key" ? "API Key（服务端注入，widget 绑定调用时自动带上）" : "无"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "d2-api-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "d2-k",
									children: "配置状态"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "d2-v plain",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: `d2-status-pill ${api.status}`,
										children: api.status === "ok" ? "● 已配置" : "● 未配置 key"
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "d2-api-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "d2-k",
									children: "说明"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "d2-v plain",
									children: api.summary
								})]
							})
						]
					})]
				})]
			});
		}
		function AppsTab({ apps, selectedAppId, onOpenApp, pinnedIds, onPin, onManaged }) {
			const mcpStates = useMcpServerStates();
			const [selection, setSelection] = (0, react.useState)({ kind: "detail" });
			const app = apps.find((a) => a.id === selectedAppId) ?? apps[0];
			const appId = app?.id;
			(0, react.useEffect)(() => {
				setSelection({ kind: "detail" });
			}, [appId]);
			if (app === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "d2-empty-note",
				style: { margin: "auto" },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 22,
						opacity: .6
					},
					children: "🧩"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: "暂无 APP" })]
			});
			const toneOf = (a) => toneOfApp(a, mcpStates);
			const selectedComp = selection.kind === "component" ? app.components.find((c) => c.id === selection.rid) : void 0;
			const selectedApi = selection.kind === "api" ? app.apis.find((a) => a.id === selection.rid) : void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "d2-apps",
				"data-screen-label": "apps",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AppListPanel, {
						apps,
						selectedAppId: app.id,
						onSelect: onOpenApp,
						toneOf
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AppResourceList, {
						app,
						selection,
						onSelect: setSelection,
						pinnedIds
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							flex: 1,
							minWidth: 0,
							minHeight: 0,
							display: "flex"
						},
						children: [
							selection.kind === "detail" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AppDetail, {
								app,
								pinnedIds,
								onPin,
								onSelectComponent: (c) => setSelection({
									kind: "component",
									rid: c.id
								}),
								onManaged
							}) : null,
							selection.kind === "component" && selectedComp !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ComponentPreview, {
								app,
								comp: selectedComp,
								pinned: pinnedIds.has(selectedComp.id),
								onPin: () => onPin(app, selectedComp),
								tone: toneOf(app),
								onSelectComponent: (rid) => setSelection({
									kind: "component",
									rid
								})
							}) : null,
							selection.kind === "api" && selectedApi !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ApiDetail, {
								app,
								api: selectedApi
							}) : null,
							selection.kind === "component" && selectedComp === void 0 || selection.kind === "api" && selectedApi === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "d2-empty-note",
								style: { margin: "auto" },
								children: ["该资源已不存在（可能被移除）——", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "d2-ghost-btn",
									onClick: () => setSelection({ kind: "detail" }),
									children: "回详情"
								})]
							}) : null
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/backend-sync.ts
		const BOARDS_URL = "/openloop/app/boards";
		const FETCH_TIMEOUT_MS = 4e3;
		/** 推送失败连续多少次判定进入降级（成功即清零） */
		const PUSH_FAILURES_TO_DEGRADE = 2;
		/** localStorage 镜像的 pending 标记 key（有值 = 镜像含未对齐到门面的修改） */
		const PENDING_SYNC_KEY = "openloop.dock.pending-sync.v1";
		async function fetchJson(url, init) {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
			try {
				const res = await fetch(url, {
					...init,
					signal: controller.signal
				});
				const contentType = res.headers.get("content-type") ?? "";
				if (!contentType.includes("application/json")) return null;
				const text = await res.text();
				return {
					status: res.status,
					contentType,
					body: text.length === 0 ? void 0 : JSON.parse(text)
				};
			} finally {
				clearTimeout(timer);
			}
		}
		/** GET /openloop/app/boards —— 三态结果 */
		async function fetchRemoteBoards() {
			try {
				const res = await fetchJson(BOARDS_URL);
				if (res === null) return {
					kind: "not-installed",
					state: void 0
				};
				if (res.status === 404) return {
					kind: "not-installed",
					state: void 0
				};
				if (!okStatus(res.status)) return {
					kind: "degraded",
					state: void 0
				};
				const state = res.body?.state;
				return {
					kind: "ok",
					state: state === null ? null : state
				};
			} catch {
				return {
					kind: "degraded",
					state: void 0
				};
			}
		}
		/** PUT /openloop/app/boards —— 全量推送（失败返回 false） */
		async function pushRemoteBoards(state) {
			try {
				const res = await fetchJson(BOARDS_URL, {
					method: "PUT",
					body: JSON.stringify(state)
				});
				return res !== null && okStatus(res.status);
			} catch {
				return false;
			}
		}
		function okStatus(status) {
			return status >= 200 && status < 300;
		}
		function readPendingSync() {
			try {
				return localStorage.getItem(PENDING_SYNC_KEY) === "1";
			} catch {
				return false;
			}
		}
		function writePendingSync(pending) {
			try {
				if (pending) localStorage.setItem(PENDING_SYNC_KEY, "1");
				else localStorage.removeItem(PENDING_SYNC_KEY);
			} catch {}
		}
		function resolveBackendPlan(input) {
			const { remote, localState, pendingSync } = input;
			if (remote.kind === "not-installed") return {
				mode: "local",
				importRemote: null,
				migrate: false,
				reconcile: false
			};
			if (remote.kind === "degraded") return {
				mode: "degraded",
				importRemote: null,
				migrate: false,
				reconcile: false
			};
			if (remote.state !== null) {
				if (pendingSync) return {
					mode: "remote",
					importRemote: null,
					migrate: false,
					reconcile: true
				};
				return {
					mode: "remote",
					importRemote: remote.state,
					migrate: false,
					reconcile: false
				};
			}
			return {
				mode: "remote",
				importRemote: null,
				migrate: localState.boards.some((b) => b.tiles.length > 0),
				reconcile: false
			};
		}
		/** 装配推送钩子（syncBackend 与 revalidate 共用）：失败计数 → pending 标记 → 降级切换 */
		function attachPushHandler(store, hooks) {
			let pushFailures = 0;
			let degraded = false;
			hooks.readPending;
			const writePending = hooks.writePending ?? writePendingSync;
			const setDegraded = (next) => {
				if (next === degraded) return;
				degraded = next;
				hooks.onDegradedChange?.(next);
			};
			store.setRemotePersist((state) => {
				pushHook(state).catch(() => {});
			});
			async function pushHook(state) {
				if (await (hooks.pushBoards ?? pushRemoteBoards)(state)) {
					pushFailures = 0;
					writePending(false);
					setDegraded(false);
				} else {
					pushFailures++;
					writePending(true);
					if (pushFailures >= PUSH_FAILURES_TO_DEGRADE) {
						setDegraded(true);
						hooks.onRemoteError?.("后端同步失败——已保存本地镜像（恢复后自动对齐）");
					}
				}
			}
		}
		/**
		* 启动编排：读门面 → 决策 → 载入/迁移/对齐 → 安装写钩子。
		* 返回最终模式（UI 据此显示降级提示条）。绝不抛错（降级不炸页）。
		*/
		async function syncBackend(store, hooks = {}) {
			const fetchBoards = hooks.fetchBoards ?? fetchRemoteBoards;
			const pushBoards = hooks.pushBoards ?? pushRemoteBoards;
			const readPending = hooks.readPending ?? readPendingSync;
			const writePending = hooks.writePending ?? writePendingSync;
			const plan = resolveBackendPlan({
				remote: await fetchBoards(),
				localState: store.getSnapshot(),
				pendingSync: readPending()
			});
			if (plan.mode === "remote") {
				if (plan.reconcile) {
					if (!await pushBoards(store.getSnapshot())) {
						hooks.onRemoteError?.("本地修改对齐到后端失败——镜像已保留，稍后自动重试");
						return "degraded";
					}
					writePending(false);
				} else if (plan.importRemote !== null) store.importState(plan.importRemote);
				else if (plan.migrate) {
					if (!await pushBoards(store.getSnapshot())) {
						hooks.onRemoteError?.("看板数据迁移到后端失败——已保留本地镜像，稍后自动重试");
						return "degraded";
					}
					writePending(false);
				}
				attachPushHandler(store, hooks);
			}
			return plan.mode;
		}
		/**
		* P4：恢复探测后的对齐入口（P1 轻探发现门面恢复时调用）。
		* 门面可达 → 若 pendingSync 则回推镜像（对齐），返回 remote；不可达 → 原样返回。
		* 供 dock 的轻探循环复用（避免整页 syncBackend 重跑——那会重装钩子造成重复推送）。
		*/
		async function revalidateBackend(store, hooks = {}) {
			const fetchBoards = hooks.fetchBoards ?? fetchRemoteBoards;
			const pushBoards = hooks.pushBoards ?? pushRemoteBoards;
			const readPending = hooks.readPending ?? readPendingSync;
			const writePending = hooks.writePending ?? writePendingSync;
			const remote = await fetchBoards();
			if (remote.kind === "not-installed") return "local";
			if (remote.kind === "degraded") return "degraded";
			if (readPending()) {
				if (await pushBoards(store.getSnapshot())) {
					writePending(false);
					hooks.onDegradedChange?.(false);
					return "remote";
				}
				return "degraded";
			}
			hooks.onDegradedChange?.(false);
			return "remote";
		}
		//#endregion
		//#region src/client/v2-styles.ts
		/**
		* Dock 2.0 组件样式（原型 <style> 直搬 + 类名 d2- 前缀化 + token 零映射）。
		*
		* token 策略（DOCK_V2_FRONTEND_IMPL §4）：原型 :root 的 --ds-* 定义块整体丢弃，
		* 每处引用改指 DSH 宿主真实变量（--dsw-alias-*，定义于 @deepseek-ai/dsh-client-ui-theme），
		* 带静态 fallback 兜底（与 0.3.x 既有内联样式同款写法）。明暗双板由宿主
		* data-theme 自动生效，dock 不做主题切换。
		*
		* 注：构建链（tsdown CJS bundle）无 CSS import 通道，沿用 GRID_CSS 的
		* 字符串注入模式（<style data-openloop-dock-v2>，DockShell 挂载时注入一次）。
		*/
		const V2_CSS = `
/* ---------- 通用 ---------- */
.d2-badge { display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px; border-radius: 999px; font-size: 10.5px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18)); color: var(--dsw-alias-label-tertiary, inherit); white-space: nowrap; }
.d2-badge.builtin { color: var(--dsw-alias-state-business-primary, #4176e6); border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 40%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent); }
.d2-badge.thirdparty { color: var(--dsw-alias-state-warn-primary, #f59e0b); border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 40%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 10%, transparent); }
.d2-badge.local { color: var(--dsw-alias-state-success-primary, #22c55e); border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 40%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 10%, transparent); }
.d2-badge.kind { color: var(--dsw-alias-label-secondary, inherit); }

.d2-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.d2-dot.ok { background: var(--dsw-alias-state-success-primary, #22c55e); }
.d2-dot.warn { background: var(--dsw-alias-state-warn-primary, #f59e0b); }

.d2-app-icon { width: 28px; height: 28px; flex-shrink: 0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18)); }
.d2-app-icon.builtin { background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 16%, transparent); color: var(--dsw-alias-state-business-primary, #4176e6); border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 35%, transparent); }
.d2-app-icon.thirdparty { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 14%, transparent); color: var(--dsw-alias-state-warn-primary, #f59e0b); border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 35%, transparent); }
.d2-app-icon.local { background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 14%, transparent); color: var(--dsw-alias-state-success-primary, #22c55e); border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 35%, transparent); }

.d2-ghost-btn { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 7px; font-size: 11.5px; color: var(--dsw-alias-label-secondary, inherit); background: none; border: 0; cursor: pointer; font-family: inherit; }
.d2-ghost-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)); color: var(--dsw-alias-label-primary, inherit); }
.d2-ghost-btn.danger { color: var(--dsw-alias-state-error-primary, #d4453a); }
.d2-ghost-btn.danger:hover { background: rgba(242,90,90,.15); color: var(--dsw-alias-state-error-primary, #d4453a); }

.d2-tcap { font-size: 10.5px; color: var(--dsw-alias-label-caption, #888); }

/* ---------- RailNav（两态一轨） ---------- */
.d2-rail { position: relative; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 0; border-right: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); background: var(--dsw-alias-bg-layer-1, #fff); overflow-y: auto; scrollbar-width: none; transition: width .18s ease; }
.d2-rail::-webkit-scrollbar { width: 0; }
.d2-rail.d2-dragging { transition: none; }
.d2-rail-tab { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; color: var(--dsw-alias-label-tertiary, inherit); position: relative; background: none; border: 0; cursor: pointer; flex-shrink: 0; }
.d2-rail-tab:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)); color: var(--dsw-alias-label-primary, inherit); }
.d2-rail-tab.on { background: var(--dsw-alias-interactive-bg-active, rgba(127,127,127,.2)); color: var(--dsw-alias-label-primary, inherit); }
.d2-rail-tab.on::before { content: ""; position: absolute; left: -8px; top: 9px; bottom: 9px; width: 3px; border-radius: 3px; background: var(--dsw-alias-state-business-primary, #4176e6); }
.d2-rail-mini { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--dsw-alias-label-secondary, inherit); background: var(--dsw-alias-bg-layer-2, #f6f6f7); border: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); cursor: pointer; flex-shrink: 0; }
.d2-rail-mini:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)); color: var(--dsw-alias-label-primary, inherit); }
.d2-rail-mini.on { border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 55%, transparent); color: var(--dsw-alias-label-primary, inherit); box-shadow: 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 25%, transparent); }
.d2-rail-sep { width: 20px; height: 1px; background: var(--dsw-alias-border-l2, rgba(127,127,127,.18)); margin: 5px 0; flex-shrink: 0; }
.d2-rail.d2-expanded { align-items: stretch; padding: 10px 8px; gap: 2px; }
.d2-rail-sec { display: flex; align-items: center; justify-content: space-between; padding: 8px 8px 4px; font-size: 10.5px; font-weight: 600; letter-spacing: .06em; color: var(--dsw-alias-label-caption, #888); }
.d2-sec-add { display: flex; align-items: center; padding: 2px 4px; border-radius: 5px; color: var(--dsw-alias-label-caption, #888); background: none; border: 0; cursor: pointer; }
.d2-sec-add:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)); color: var(--dsw-alias-label-primary, inherit); }
.d2-rail-row { display: flex; align-items: center; gap: 9px; width: 100%; padding: 7px 9px; border-radius: 8px; color: var(--dsw-alias-label-secondary, inherit); font-size: 12.5px; text-align: left; background: none; border: 0; cursor: pointer; }
.d2-rail-row:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)); color: var(--dsw-alias-label-primary, inherit); }
.d2-rail-row.on { background: var(--dsw-alias-interactive-bg-active, rgba(127,127,127,.2)); color: var(--dsw-alias-label-primary, inherit); font-weight: 500; }
.d2-rail-row .d2-lbl { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.d2-rail-row .d2-cnt { margin-left: auto; font-size: 10.5px; color: var(--dsw-alias-label-caption, #888); border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18)); border-radius: 999px; padding: 0 6px; }
.d2-rail-row .d2-x { display: none; padding: 2px; border-radius: 4px; color: var(--dsw-alias-label-caption, #888); background: none; border: 0; cursor: pointer; flex-shrink: 0; }
.d2-rail-row:hover .d2-x { display: inline-flex; }
.d2-rail-row:hover .d2-cnt { display: none; }
.d2-rail-row .d2-x:hover { color: var(--dsw-alias-state-error-primary, #d4453a); background: var(--dsw-alias-interactive-bg-active, rgba(127,127,127,.2)); }

/* ---------- 横向拖拽把手（col 右缘内侧；0.8.4 常驻 4px 宽条对齐 bsb 手感。
 *  0.8.3 的 right:-5px 伸出列外——常驻线恰与相邻 border 重合并被下一列内容层盖住，
 *  导致「没有宽条 + hover 难触发」；收进列内后视觉与命中都确定。） ---------- */
.d2-resize-h { position: absolute; top: 0; right: -2px; width: 14px; height: 100%; cursor: col-resize; z-index: 50; touch-action: none; }
.d2-search { width: 128px; height: 24px; padding: 0 9px; border-radius: 7px; border: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); background: var(--dsw-alias-bg-layer-2, #f6f6f7); color: var(--dsw-alias-label-primary, inherit); font-size: 11px; font-family: inherit; outline: none; }
.d2-search:focus { border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 45%, transparent); }
.d2-sort-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 18px; padding: 0 5px; border-radius: 5px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18)); background: none; color: var(--dsw-alias-label-tertiary, inherit); font-size: 9.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
.d2-sort-btn:hover { color: var(--dsw-alias-label-primary, inherit); background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)); }
.d2-row-dragging { opacity: .45; }
.d2-app-row, .d2-rail-row, .d2-resource-row { cursor: grab; }
.d2-app-row:active, .d2-rail-row:active, .d2-resource-row:active { cursor: grabbing; }
.d2-resize-h::after { content: ""; position: absolute; top: 0; bottom: 0; right: 3px; width: 4px; border-radius: 2px; background: var(--dsw-alias-border-l2, rgba(127,127,127,.3)); transition: background .15s, width .15s; }
.d2-resize-h:hover::after { background: var(--dsw-alias-state-business-primary, #4176e6); width: 6px; }

/* ---------- 看板头 ---------- */
.d2-board-head { display: flex; align-items: center; gap: 10px; padding: 12px 16px 10px; flex-shrink: 0; }
.d2-board-name { font-size: 14px; font-weight: 600; color: var(--dsw-alias-label-primary, inherit); cursor: default; user-select: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%; }
.d2-board-head .d2-actions { margin-left: auto; display: flex; gap: 2px; align-items: center; }
.d2-board-rename { background: none; border: 1px solid var(--dsw-alias-state-business-primary, #4176e6); border-radius: 6px; outline: none; font-size: 12px; padding: 3px 6px; color: var(--dsw-alias-label-primary, inherit); font-family: inherit; }
.d2-rail-rename { margin: 2px 4px; }

/* ---------- tile 别名编辑 + 来源 ID ---------- */
.d2-tile-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: default; }
.d2-alias-mark { font-size: 9px; color: var(--dsw-alias-label-caption, #888); margin-left: 3px; }
.d2-title-edit { flex: 1; min-width: 40px; background: var(--dsw-alias-bg-layer-2, #f6f6f7); border: 1px solid var(--dsw-alias-state-business-primary, #4176e6); border-radius: 5px; padding: 1px 6px; font-size: 12px; color: var(--dsw-alias-label-primary, inherit); outline: none; font-family: inherit; }
.d2-tile-src { position: absolute; right: 8px; bottom: 5px; font-size: 10px; color: var(--dsw-alias-label-caption, #888); font-family: ui-monospace, "SF Mono", Menlo, monospace; pointer-events: none; opacity: .85; }

/* ---------- 空态 / 提示 ---------- */
.d2-empty-note { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 40px 20px; color: var(--dsw-alias-label-caption, #888); text-align: center; font-size: 12px; line-height: 1.7; }
.d2-toast { position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%); padding: 7px 14px; border-radius: 9px; background: var(--dsw-alias-tooltip-bg, #43454a); color: var(--dsw-alias-label-primary, #f9fafb); font-size: 12px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18)); box-shadow: 0 6px 20px rgba(0,0,0,.25); z-index: 100; pointer-events: none; }

/* ---------- APP tab 详情视图（col3「详情」态；0.8.0 三列重构后 AppDetail 专用） ---------- */

.d2-collapse-btn { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 7px; color: var(--dsw-alias-label-tertiary, inherit); flex-shrink: 0; background: none; border: 0; cursor: pointer; font-size: 11.5px; font-family: inherit; }
.d2-collapse-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)); color: var(--dsw-alias-label-primary, inherit); }

.d2-app-row { display: flex; align-items: center; gap: 9px; padding: 8px 9px; border-radius: 8px; text-align: left; background: none; border: 0; cursor: pointer; }
.d2-app-row:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)); }
.d2-app-row.on { background: var(--dsw-alias-interactive-bg-active, rgba(127,127,127,.2)); }
.d2-app-row .d2-meta { min-width: 0; flex: 1; }
.d2-app-row .d2-name { display: block; font-size: 12.5px; color: var(--dsw-alias-label-primary, inherit); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.d2-app-row .d2-sub { display: block; font-size: 10.5px; color: var(--dsw-alias-label-caption, #888); margin-top: 1px; }

.d2-row-selectable { cursor: pointer; }

.d2-app-detail { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow-y: auto; }
.d2-app-detail-head { display: flex; align-items: flex-start; gap: 12px; padding: 16px 18px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); }
.d2-app-detail-head .d2-title-block { min-width: 0; flex: 1; }
.d2-app-detail-head h2 { font-size: 16px; font-weight: 600; color: var(--dsw-alias-label-primary, inherit); margin: 0; }
.d2-app-detail-head .d2-ver { font-size: 11px; font-weight: 400; color: var(--dsw-alias-label-tertiary, inherit); font-family: ui-monospace, "SF Mono", Menlo, monospace; }
.d2-app-detail-head .d2-desc { font-size: 12px; color: var(--dsw-alias-label-tertiary, inherit); margin-top: 3px; }
.d2-resource-groups { padding: 12px 18px 20px; display: flex; flex-direction: column; gap: 18px; }
.d2-resource-group > h3 { font-size: 11px; font-weight: 600; letter-spacing: .05em; color: var(--dsw-alias-label-caption, #888); margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
.d2-resource-list { display: flex; flex-direction: column; border: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); border-radius: 10px; overflow: hidden; }
.d2-resource-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; background: var(--dsw-alias-bg-layer-1, #fff); }
.d2-resource-row + .d2-resource-row { border-top: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); }
.d2-resource-row:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)); }
.d2-resource-row .d2-meta { min-width: 0; flex: 1; }
.d2-resource-row .d2-name { font-size: 12.5px; color: var(--dsw-alias-label-primary, inherit); display: flex; align-items: center; gap: 7px; }
.d2-resource-row .d2-rid { font-size: 10.5px; color: var(--dsw-alias-label-caption, #888); font-family: ui-monospace, "SF Mono", Menlo, monospace; margin-top: 1px; }
.d2-resource-row .d2-rowdesc { font-size: 11px; color: var(--dsw-alias-label-tertiary, inherit); flex-shrink: 1; min-width: 0; max-width: 42%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.d2-resource-row .d2-pin-btn { opacity: 0; transition: opacity .15s; flex-shrink: 0; }
.d2-resource-row:hover .d2-pin-btn { opacity: 1; }
.d2-resource-row.pinned .d2-pin-btn { opacity: 1; color: var(--dsw-alias-state-success-primary, #22c55e); }
.d2-pin-locked { font-size: 10.5px; color: var(--dsw-alias-label-caption, #888); border: 1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,.25)); border-radius: 6px; padding: 2px 8px; flex-shrink: 0; opacity: .8; }
.d2-mono { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 11.5px; }

/* ---------- 0.8.0 顶栏（tab 段控 + 收起；2026-08-30 三列重构 issue 2） ---------- */
.d2-topbar { height: 40px; flex-shrink: 0; display: flex; align-items: center; gap: 10px; padding: 0 12px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); background: var(--dsw-alias-bg-layer-1, #fff); }
.d2-topbar-seg { display: flex; border-radius: 7px; background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)); padding: 2px; gap: 2px; }
.d2-topbar-seg button { display: flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 5px; border: 0; background: none; font-size: 11.5px; color: var(--dsw-alias-label-tertiary, inherit); cursor: pointer; font-family: inherit; }
.d2-topbar-seg button.on { background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, inherit); box-shadow: 0 1px 3px rgba(0,0,0,.12); }
.d2-topbar .d2-topbar-spacer { flex: 1; }

/* ---------- 0.8.0 APP tab 三列（col1 APP 列表 / col2 资源列表 / col3 详情预览） ---------- */
.d2-apps { flex: 1; min-width: 0; min-height: 0; display: flex; }

.d2-applist { width: 230px; min-width: 160px; flex-shrink: 1; position: relative; border-right: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); display: flex; flex-direction: column; background: var(--dsw-alias-bg-layer-1, #fff); min-height: 0; }
.d2-applist .d2-col-head { padding: 10px 12px 8px; font-size: 10.5px; font-weight: 600; letter-spacing: .06em; color: var(--dsw-alias-label-caption, #888); display: flex; align-items: center; justify-content: space-between; }
.d2-applist .d2-rows { flex: 1; overflow-y: auto; padding: 2px 8px 10px; display: flex; flex-direction: column; gap: 2px; }
.d2-applist .d2-app-row { width: 100%; border: 0; background: none; font-family: inherit; cursor: pointer; }
.d2-applist .d2-app-row .d2-sub { display: flex; align-items: center; gap: 6px; }
.d2-applist .d2-app-row .d2-status { margin-left: auto; flex-shrink: 0; }

/* col 缩略模式（0.8.2 恢复：48px 图标条；拖到 <120px 松手自动缩略） */
.d2-applist.d2-col-collapsed, .d2-rescol.d2-col-collapsed { width: 48px; min-width: 48px; flex-shrink: 0; }
.d2-col-collapsed .d2-col-head { padding: 10px 0 6px; justify-content: center; }
.d2-col-collapsed .d2-rows, .d2-col-collapsed .d2-rescol-rows { align-items: center; gap: 4px; padding: 4px 0 10px; }
.d2-col-mini { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; color: var(--dsw-alias-label-tertiary, inherit); background: none; border: 0; cursor: pointer; flex-shrink: 0; }
.d2-col-mini:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.16)); color: var(--dsw-alias-label-primary, inherit); }
.d2-col-mini.on { background: var(--dsw-alias-interactive-bg-active, rgba(127,127,127,.24)); }
.d2-col-mini .d2-mini-badge { font-size: 9px; padding: 1px 4px; }

.d2-rescol { width: 290px; min-width: 200px; flex-shrink: 1; position: relative; border-right: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); display: flex; flex-direction: column; background: var(--dsw-alias-bg-layer-1, #fff); min-height: 0; }
.d2-rescol-head { padding: 12px 14px 10px; display: flex; align-items: center; gap: 9px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); flex-shrink: 0; }
.d2-rescol-head .d2-rescol-name { font-size: 13.5px; font-weight: 600; color: var(--dsw-alias-label-primary, inherit); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.d2-rescol-head .d2-rescol-kind { margin-left: auto; flex-shrink: 0; }
.d2-rescol-rows { flex: 1; overflow-y: auto; padding: 8px 10px 14px; display: flex; flex-direction: column; gap: 14px; }

.d2-detail-row { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 9px; border: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); background: var(--dsw-alias-bg-layer-2, #f6f6f7); text-align: left; width: 100%; cursor: pointer; font-family: inherit; }
.d2-detail-row:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)); }
.d2-detail-row.on { border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 55%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 25%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 6%, transparent); }
.d2-detail-row .d2-di { color: var(--dsw-alias-label-secondary, inherit); display: flex; flex-shrink: 0; }
.d2-detail-row .d2-lbl { flex: 1; font-size: 12.5px; color: var(--dsw-alias-label-primary, inherit); }
.d2-detail-row .d2-hint { font-size: 10.5px; color: var(--dsw-alias-label-caption, #888); flex-shrink: 0; }

.d2-resource-row { cursor: pointer; font-family: inherit; width: 100%; border: 0; }
.d2-resource-row:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.16)); }
.d2-resource-row.on { background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent); box-shadow: inset 3px 0 0 var(--dsw-alias-state-business-primary, #4176e6); }
.d2-resource-row .d2-pin-dot { flex-shrink: 0; }
.d2-resource-row .d2-rid { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.d2-detailpane { flex: 1; min-width: 180px; display: flex; flex-direction: column; background: var(--dsw-alias-bg-layer-1, #fff); overflow-y: auto; min-height: 0; }
.d2-preview-head { display: flex; align-items: center; gap: 10px; padding: 13px 18px 11px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); }
.d2-preview-head .d2-meta { flex: 1; min-width: 0; }
.d2-preview-head .d2-name { font-size: 13.5px; font-weight: 600; color: var(--dsw-alias-label-primary, inherit); }
.d2-preview-head .d2-rid { font-size: 10.5px; color: var(--dsw-alias-label-caption, #888); font-family: ui-monospace, "SF Mono", Menlo, monospace; margin-top: 1px; }
.d2-preview-head .d2-mode-badge { margin-left: auto; flex-shrink: 0; }
.d2-pin-primary { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 50%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent); color: var(--dsw-alias-state-business-primary, #4176e6); font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; flex-shrink: 0; }
.d2-pin-primary:hover { background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 22%, transparent); }
.d2-pin-primary.pinned { border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 50%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 10%, transparent); color: var(--dsw-alias-state-success-primary, #22c55e); }

.d2-preview-canvas { padding: 18px 20px 24px; }
.d2-preview-note { font-size: 11px; color: var(--dsw-alias-label-caption, #888); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.d2-frame { border: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); border-radius: 12px; background: var(--dsw-alias-bg-layer-1, #fff); overflow: hidden; }
.d2-frame-bar { height: 30px; display: flex; align-items: center; gap: 7px; padding: 0 11px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); background: var(--dsw-alias-bg-layer-2, #f6f6f7); font-size: 10.5px; color: var(--dsw-alias-label-caption, #888); }
.d2-fdots { display: flex; gap: 5px; }
.d2-fdots i { width: 8px; height: 8px; border-radius: 50%; background: var(--dsw-alias-border-l2, rgba(127,127,127,.18)); }
.d2-frame-body { padding: 16px; }

.d2-api-card { border: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); border-radius: 12px; background: var(--dsw-alias-bg-layer-1, #fff); overflow: hidden; }
.d2-api-row { display: flex; gap: 12px; padding: 10px 14px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); font-size: 12px; }
.d2-api-row:last-child { border-bottom: 0; }
.d2-api-row .d2-k { width: 92px; flex-shrink: 0; color: var(--dsw-alias-label-caption, #888); font-size: 11px; padding-top: 1px; }
.d2-api-row .d2-v { flex: 1; min-width: 0; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 11.5px; color: var(--dsw-alias-label-secondary, inherit); word-break: break-all; }
.d2-api-row .d2-v.plain { font-family: inherit; color: var(--dsw-alias-label-primary, inherit); }

.d2-status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border-radius: 999px; font-size: 11px; }
.d2-status-pill.ok { color: var(--dsw-alias-state-success-primary, #22c55e); background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 10%, transparent); border: 1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 35%, transparent); }
.d2-status-pill.warn { color: var(--dsw-alias-state-warn-primary, #f59e0b); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 10%, transparent); border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 35%, transparent); }

.d2-dot.off { background: color-mix(in srgb, var(--dsw-alias-label-caption, #888) 45%, transparent); }

/* ---------- M3：后端降级提示条 ---------- */
.d2-banner { position: fixed; bottom: 54px; left: 50%; transform: translateX(-50%); padding: 7px 14px; border-radius: 9px; background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 12%, var(--dsw-alias-tooltip-bg, #43454a)); color: var(--dsw-alias-label-primary, #f9fafb); font-size: 12px; border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 45%, transparent); box-shadow: 0 6px 20px rgba(0,0,0,.25); z-index: 100; pointer-events: none; max-width: 80vw; }
`;
		//#endregion
		//#region src/client/index.tsx
		const name = "openloop-dock";
		const inject = [];
		function DockToggle({ open, onToggle, right }) {
			const [hover, setHover] = (0, react.useState)(false);
			if (open) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onToggle,
				title: "展开 OpenLoop Dock",
				onMouseEnter: () => setHover(true),
				onMouseLeave: () => setHover(false),
				style: {
					position: "fixed",
					top: 38,
					right,
					zIndex: 2147483100,
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
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "var(--dsw-alias-label-secondary, inherit)"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					width: "16",
					height: "16",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "2.2",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "3",
							y: "3",
							width: "7",
							height: "7",
							rx: "1"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "14",
							y: "3",
							width: "7",
							height: "7",
							rx: "1"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "3",
							y: "14",
							width: "7",
							height: "7",
							rx: "1"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "14",
							y: "14",
							width: "7",
							height: "7",
							rx: "1"
						})
					]
				})
			});
		}
		const WIDTH_KEY = "openloop.dock.width.v1";
		const RAIL_WIDTH_KEY = "openloop.dock.rail-width.v1";
		const TAB_KEY = "openloop.dock.tab.v1";
		const OPEN_KEY = "openloop.dock.open.v1";
		/** 默认展开宽（0.8.2：三列 APP tab 的从容布局起步宽——col1 230 + col2 290 + col3 ≥180） */
		const DEFAULT_WIDTH = 720;
		/**
		* 展开态读取（0.8.0 issue 3：进入 DSH 不再默认展开）：
		* 有存档按存档（记住上次离开状态）；无存档默认收起。
		* 旧行为（有 tile 即展开）废止——展开是用户动作，不是启动副作用。
		*/
		function readOpenState() {
			try {
				const raw = localStorage.getItem(OPEN_KEY);
				if (raw === "1") return true;
				if (raw === "0") return false;
			} catch {}
			return false;
		}
		function readStoredWidth() {
			try {
				const raw = localStorage.getItem(WIDTH_KEY);
				const n = raw === null ? NaN : Number(raw);
				return Number.isFinite(n) ? clampDockWidth(n) : DEFAULT_WIDTH;
			} catch {
				return DEFAULT_WIDTH;
			}
		}
		function readRailWidth() {
			try {
				const raw = localStorage.getItem(RAIL_WIDTH_KEY);
				const n = raw === null ? NaN : Number(raw);
				return n === 52 || n === 216 ? n : 52;
			} catch {
				return 52;
			}
		}
		function readTabState() {
			try {
				const raw = localStorage.getItem(TAB_KEY);
				if (raw === null) return {
					tab: "board",
					selectedAppId: null
				};
				if (raw === "apps" || raw === "board") return {
					tab: raw,
					selectedAppId: null
				};
				const p = JSON.parse(raw);
				return {
					tab: p.tab === "apps" ? "apps" : "board",
					selectedAppId: typeof p.selectedAppId === "string" ? p.selectedAppId : null
				};
			} catch {
				return {
					tab: "board",
					selectedAppId: null
				};
			}
		}
		function DockShell() {
			const [open, setOpen] = (0, react.useState)(readOpenState);
			(0, react.useEffect)(() => {
				try {
					localStorage.setItem(OPEN_KEY, open ? "1" : "0");
				} catch {}
			}, [open]);
			const [version, setVersion] = (0, react.useState)(0);
			const [width, setWidth] = (0, react.useState)(readStoredWidth);
			const [tabState, setTabState] = (0, react.useState)(readTabState);
			const [railWidth, setRailWidth] = (0, react.useState)(readRailWidth);
			const [toast, setToast] = (0, react.useState)(null);
			const widthPersistTimer = (0, react.useRef)(void 0);
			const [backendMode, setBackendMode] = (0, react.useState)("local");
			const backendModeRef = (0, react.useRef)("local");
			(0, react.useEffect)(() => {
				backendModeRef.current = backendMode;
			}, [backendMode]);
			const [remoteApps, setRemoteApps] = (0, react.useState)([]);
			(0, react.useEffect)(() => dockStore.subscribe(() => setVersion((v) => v + 1)), []);
			(0, react.useEffect)(() => {
				if (toast === null) return;
				const timer = setTimeout(() => setToast(null), 2200);
				return () => clearTimeout(timer);
			}, [toast]);
			(0, react.useEffect)(() => {
				let cancelled = false;
				syncBackend(dockStore, {
					onRemoteError: (message) => {
						if (!cancelled) setToast(message);
					},
					onDegradedChange: (degraded) => {
						if (!cancelled) setBackendMode(degraded ? "degraded" : "remote");
					}
				}).then((mode) => {
					if (!cancelled) setBackendMode(mode);
				});
				fetchRemoteApps().then((apps) => {
					if (!cancelled) setRemoteApps(apps);
				});
				return () => {
					cancelled = true;
				};
			}, []);
			(0, react.useEffect)(() => {
				let cancelled = false;
				let knownRev = null;
				let timer;
				const probe = async () => {
					const rev = await fetchRegistryRev();
					if (cancelled) return;
					if (rev !== null && knownRev !== null && rev !== knownRev) {
						const apps = await fetchRemoteApps();
						if (!cancelled) setRemoteApps(apps);
					}
					if (rev !== null) {
						knownRev = rev;
						if (backendModeRef.current === "degraded") {
							const mode = await revalidateBackend(dockStore, {
								onRemoteError: (message) => {
									if (!cancelled) setToast(message);
								},
								onDegradedChange: (degraded) => {
									if (!cancelled) setBackendMode(degraded ? "degraded" : "remote");
								}
							});
							if (!cancelled) setBackendMode(mode);
						}
					}
					timer = setTimeout(() => {
						probe();
					}, rev !== null ? 15e3 : 6e4);
				};
				probe();
				return () => {
					cancelled = true;
					if (timer !== void 0) clearTimeout(timer);
				};
			}, []);
			const [toggleRight, setToggleRight] = (0, react.useState)(10);
			(0, react.useEffect)(() => {
				const update = () => setToggleRight(Math.max(10, window.innerWidth - probeDockRightEdge() + 10));
				update();
				const timer = setInterval(update, 500);
				window.addEventListener("resize", update);
				return () => {
					clearInterval(timer);
					window.removeEventListener("resize", update);
				};
			}, []);
			(0, react.useEffect)(() => {
				const el = document.createElement("style");
				el.setAttribute("data-openloop-dock-v2", "");
				el.textContent = V2_CSS;
				document.head.appendChild(el);
				return () => el.remove();
			}, []);
			(0, react.useEffect)(() => {
				const w = window;
				w.__openloopDockToggle = () => setOpen((o) => !o);
				w.__openloopDockOpen = () => setOpen(true);
				return () => {
					delete w.__openloopDockToggle;
					delete w.__openloopDockOpen;
				};
			}, []);
			const state = dockStore.getSnapshot();
			const totalTiles = state.boards.reduce((n, b) => n + b.tiles.length, 0);
			const { apps: builtinApps, panelsMissing } = listBuiltinApps();
			const apps = mergeApps(builtinApps, remoteApps);
			(0, react.useEffect)(() => {
				setRegistryCache(apps);
			}, [apps]);
			const selectedApp = apps.find((a) => a.id === tabState.selectedAppId) ?? apps[0];
			const activeBoard = state.boards.find((b) => b.id === state.activeBoardId) ?? state.boards[0];
			const pinnedIds = new Set((activeBoard?.tiles ?? []).map((t) => sourceIdOf(t.source)).filter((v) => v !== null));
			const persistTabState = (next) => {
				setTabState(next);
				try {
					localStorage.setItem(TAB_KEY, JSON.stringify(next));
				} catch {}
			};
			const persistTab = (tab) => {
				persistTabState({
					...tabState,
					tab
				});
			};
			/** rail 松手吸附：持久化 rail 宽；内容区保底 DOCK_MIN_WIDTH（rail 变宽挤压时自动撑开 dock） */
			const commitRailWidth = (next) => {
				setRailWidth(next);
				try {
					localStorage.setItem(RAIL_WIDTH_KEY, String(next));
				} catch {}
				if (width < next + 560) {
					const widened = clampDockWidth(next + 560);
					setWidth(widened);
					try {
						localStorage.setItem(WIDTH_KEY, String(widened));
					} catch {}
				}
			};
			const addBoard = () => {
				const board = dockStore.getSnapshot().boards;
				dockStore.addBoard();
				persistTab("board");
				const created = dockStore.getSnapshot().boards[board.length];
				if (created !== void 0) setToast(`已新增「${created.name}」（双击页名可重命名）`);
			};
			const removeBoard = (id) => {
				const target = state.boards.find((b) => b.id === id);
				dockStore.removeBoard(id);
				if (target !== void 0) setToast(`已删除「${target.name}」`);
			};
			/** APP tab 选中（rail mini icon / 侧栏行共用） */
			const openApp = (id) => {
				persistTabState({
					tab: "apps",
					selectedAppId: id
				});
			};
			/** pin：以示例 props 建面板实例 → 落到当前看板页 → 跳回看板（M2 验收点）。
			*  v2：mcp-app 组件 pin 引用形态 tile（渲染时取数）；门面组件（无渲染数据）拒绝并提示。 */
			const pinComponent = (_app, component) => {
				const source = buildTileSourceForComponent(component);
				if (source === null) {
					setToast(`「${component.title}」暂无渲染数据——让 Agent 经 app_backend 生成内容后再固定`);
					return;
				}
				dockStore.pin(source, component.title);
				persistTabState({
					tab: "board",
					selectedAppId: tabState.selectedAppId
				});
				setToast(`已固定「${component.title}」到当前看板`);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DockToggle, {
					open,
					onToggle: () => setOpen((o) => !o),
					count: totalTiles,
					right: toggleRight
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DockHost, {
					open,
					width,
					onWidthChange: (w) => {
						setWidth(w);
						if (widthPersistTimer.current !== void 0) clearTimeout(widthPersistTimer.current);
						widthPersistTimer.current = setTimeout(() => {
							try {
								localStorage.setItem(WIDTH_KEY, String(w));
							} catch {}
						}, 400);
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							height: "100%",
							minWidth: 0
						},
						"data-dock-version": version,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: "d2-topbar",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "d2-topbar-seg",
									role: "tablist",
									"aria-label": "工作台视图切换",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										role: "tab",
										"aria-selected": tabState.tab === "board",
										className: tabState.tab === "board" ? "on" : "",
										onClick: () => persistTab("board"),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.board, { size: 13 }), " 看板"]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										role: "tab",
										"aria-selected": tabState.tab === "apps",
										className: tabState.tab === "apps" ? "on" : "",
										onClick: () => persistTab("apps"),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.apps, { size: 13 }), " APP"]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "d2-topbar-spacer" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "d2-collapse-btn",
									title: "收起工作台（tile 保留，再点右上角 📌 展开）",
									onClick: () => setOpen(false),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(icons.chevronR, { size: 14 }), " 收起"]
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								flex: 1,
								minHeight: 0,
								minWidth: 0
							},
							children: tabState.tab === "board" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RailNav, {
								tab: tabState.tab,
								onTabChange: persistTab,
								boards: state.boards,
								activeBoardId: state.activeBoardId,
								onSelectBoard: (id) => dockStore.setActiveBoard(id),
								onAddBoard: addBoard,
								onRenameBoard: (id, name) => dockStore.renameBoard(id, name),
								onRemoveBoard: removeBoard,
								width: railWidth,
								onWidthChange: setRailWidth,
								onWidthCommit: commitRailWidth
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DockBoardView, {})] }) : panelsMissing ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "d2-empty-note",
								style: { margin: "auto" },
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 22,
											opacity: .6
										},
										children: "🧩"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: "APP 注册表不可用" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "d2-tcap",
										children: "安装 / 启用 @openloop/dsh-panels 后，这里可以浏览和固定组件"
									})
								]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AppsTab, {
								apps,
								selectedAppId: selectedApp?.id ?? null,
								onOpenApp: openApp,
								pinnedIds,
								onPin: pinComponent,
								onManaged: () => {
									fetchRemoteApps().then((merged) => setRemoteApps(merged));
								}
							})
						})]
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SnapshotLayer, {}),
				toast !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "d2-toast",
					children: toast
				}) : null,
				backendMode === "degraded" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "d2-banner",
					role: "status",
					children: "应用后端暂不可用——看板已降级为本地存储（数据不丢，恢复后自动同步）"
				}) : null
			] });
		}
		function apply(ctx) {
			const service = {
				pinPanel(meta, title, origin) {
					dockStore.pin({
						kind: "panel",
						meta
					}, title, origin);
					window.__openloopDockOpen?.();
				},
				pinArtifact(meta, title, origin) {
					dockStore.pin({
						kind: "artifact",
						meta
					}, title, origin);
					window.__openloopDockOpen?.();
				},
				openSnapshot(source, title) {
					projectSnapshot(source, title);
				},
				toggle() {
					window.__openloopDockToggle?.();
				},
				isOpen() {
					return document.querySelector("[data-openloop-dock-panel]") !== null;
				}
			};
			ctx.provide("openloop-dock/client", service);
			window.__openloopDockService = service;
			const panelsClient = getPanelsClient();
			panelsClient?.setRelPanelResolver((rid) => {
				const comp = lookupRegistryComponent(rid);
				if (!comp) return void 0;
				return panelsClient.panelDefinitionFromEntry(comp.entry);
			});
			panelsClient?.setRelConsumesIndex((event) => buildRelConsumesIndex().get(event) ?? []);
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
					delete window.__openloopDockService;
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
