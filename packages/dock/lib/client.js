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
		//#region src/client/DockHost.tsx
		/**
		* DockHost：右侧 dock 的挂载层（方案 A，DOCK_DESIGN §1）。
		*
		* 冲突规避三件套：
		* 1. host div 挂 body（data-openloop-dock），MutationObserver 保活——与 better-sidebar 各挂各的；
		* 2. 挤压用 #root 的 padding-right（better-sidebar 用 margin-right，天然叠加不覆盖）；
		* 3. 空间探测（bsb 的公开布局副作用：#root computed margin-right）+ 500ms poll。
		*
		* 展开交互（2026-08-24 重做，对齐 better-sidebar 体验）：
		* - 面板常驻渲染，宽度过渡（width 0 ↔ W）——从右侧推出的动画效果；
		* - 左缘 6px 拖宽手柄（col-resize），实时生效，松手持久化 localStorage；
		* - 拖动期间禁用 width 过渡（否则动画滞后手感）；内容层固定宽度不随动画压缩。
		*/
		const DOCK_WIDTH_VAR = "--openloop-dock-width";
		const TRANSITION = "width .22s ease";
		/** 右侧空间探测：锚 #root 的 computed margin-right（bsb 的公开布局副作用） */
		function probeDockRightEdge() {
			if (typeof window === "undefined") return 0;
			const root = document.getElementById("root");
			if (!root) return window.innerWidth;
			const marginRight = parseFloat(getComputedStyle(root).marginRight) || 0;
			const occupied = marginRight > 0 && marginRight < window.innerWidth * .7 ? marginRight : 0;
			return window.innerWidth - occupied;
		}
		function DockHost({ open, width, onWidthChange, children }) {
			const [host, setHost] = (0, react.useState)(null);
			const [rightEdge, setRightEdge] = (0, react.useState)(() => probeDockRightEdge());
			const [resizing, setResizing] = (0, react.useState)(false);
			const widthRef = (0, react.useRef)(width);
			widthRef.current = width;
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
				const update = () => setRightEdge(probeDockRightEdge());
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
				styleEl.textContent = `#root { padding-right: var(${DOCK_WIDTH_VAR}, 0px); transition: padding-right .22s ease }`;
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
					const next = Math.round(Math.max(280, Math.min(760, startW + (startX - e.clientX))));
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
						style: {
							position: "absolute",
							left: 0,
							top: 0,
							bottom: 0,
							width: 7,
							cursor: open ? "col-resize" : "default",
							pointerEvents: open ? "auto" : "none",
							zIndex: 10
						},
						title: "拖动调整宽度"
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
			x = clamp$1(x, 0, cols - w);
			y = clamp$1(y, 0, maxRows - h);
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
		function clamp$1(num, lowerBound, upperBound) {
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
		function clamp(value, min, max) {
			return Math.max(min, Math.min(max, value));
		}
		var defaultConstraints = [{
			name: "gridBounds",
			constrainPosition(item, x, y, { cols, maxRows }) {
				return {
					x: clamp(x, 0, Math.max(0, cols - item.w)),
					y: clamp(y, 0, Math.max(0, maxRows - item.h))
				};
			},
			constrainSize(item, w, h, handle, { cols, maxRows }) {
				const maxW = handle === "w" || handle === "nw" || handle === "sw" ? item.x + item.w : cols - item.x;
				const maxH = handle === "n" || handle === "nw" || handle === "ne" ? item.y + item.h : maxRows - item.y;
				return {
					w: clamp(w, 1, Math.max(1, maxW)),
					h: clamp(h, 1, Math.max(1, maxH))
				};
			}
		}, {
			name: "minMaxSize",
			constrainSize(item, w, h) {
				return {
					w: clamp(w, item.minW ?? 1, item.maxW ?? Infinity),
					h: clamp(h, item.minH ?? 1, item.maxH ?? Infinity)
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
		function r(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
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
						top = clamp$1(top, 0, bottomBoundary);
						const colWidth2 = calcGridColWidth(positionParams);
						const rightBoundary = containerWidth - calcGridItemWHPx(w, colWidth2, margin[0]);
						left = clamp$1(left, 0, rightBoundary);
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
			/**
			* RGL onLayoutChange 回写（2026-08-24 v0.3.0）：一次 emit 写回全部 tile 布局
			* （RGL 的 verticalCompactor 会同时移动多个 tile）。未知 tileId 忽略。
			*/
			applyLayout(items) {
				const next = fromRglLayout(items);
				if (next.size === 0) return;
				const current = this.getSnapshot();
				let changed = false;
				const tiles = current.tiles.map((t) => {
					const layout = next.get(t.tileId);
					if (layout === void 0 || layout === t.layout) return t;
					changed = true;
					return {
						...t,
						layout
					};
				});
				if (changed) this.emit({
					version: 1,
					tiles
				});
			}
			clear() {
				this.emit(emptyBoard());
			}
			/** 「整理」：重力紧凑（消除空洞、保持相对顺序）——无变化时不 emit */
			compact() {
				const current = this.getSnapshot();
				if (current.tiles.length === 0) return;
				const compacted = compactTiles(current.tiles);
				if (compacted.some((t, i) => t.layout !== current.tiles[i]?.layout)) this.emit({
					version: 1,
					tiles: compacted
				});
			}
		};
		const dockStore = new DockStore();
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
		//#endregion
		//#region src/client/DockBoardView.tsx
		/**
		* DockBoardView：12 列网格画板（2026-08-24 v0.3.0 起交互引擎 = react-grid-layout v2）。
		*
		* 迁移背景（用户验收反馈）：手写 dnd-kit 网格的拖拽 hover 丢失、无吸附预览、
		* 视觉对齐散乱。RGL（Grafana/Kibana 生产验证）提供：指针捕获式拖拽（无 hover 丢失）、
		* 拖拽 placeholder 实时占位预览、松手网格吸附、碰撞自动推挤 + verticalCompactor
		* 重力紧凑、CSS Transform 定位（GPU 平滑）。
		*
		* 数据流：dockStore（TileLayout 坐标）↔ RGL LayoutItem 双向映射（layout.ts）；
		* onLayoutChange 一次回写全部（applyLayout），localStorage 持久化语义不变。
		*/
		/** scope 惰性单例（base 缺失时 undefined——ArtifactFrame 外壳自行降级） */
		let scopeCache;
		function getScope() {
			if (scopeCache === void 0) scopeCache = getBaseClient()?.createOpenLoopSettingsScope();
			return scopeCache;
		}
		const ROW_HEIGHT = 48;
		const GRID_MARGIN = [12, 12];
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
  background: var(--dsw-alias-accent, rgba(88, 101, 242, 0.35));
  opacity: 0.14;
  border: 1.5px dashed var(--dsw-alias-accent, rgba(88, 101, 242, 0.55));
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
		function TileChrome({ title, onRemove, children }) {
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
					overflow: "hidden"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
						color: "var(--dsw-alias-label-title, inherit)",
						userSelect: "none"
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
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						position: "relative",
						flex: 1,
						minHeight: 0,
						overflow: "auto",
						padding: 10
					},
					children
				})]
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
			const artifact = getArtifactClient();
			if (artifact === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DependencyMissing, {
				what: "Dock Artifact tile",
				dep: "@openloop/dsh-html-artifact"
			});
			const ArtifactFrame = artifact.ArtifactFrame;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArtifactFrame, {
				meta: tile.source.meta,
				token: `dock-${tile.tileId}`,
				fullscreen: false,
				scope: getScope()
			});
		}
		function DockBoardView({ onEmpty }) {
			const { width, containerRef, mounted } = useContainerWidth();
			const tiles = dockStore.getSnapshot().tiles;
			const layout = toRglLayout(tiles);
			if (tiles.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					padding: 24,
					color: "var(--dsw-alias-label-caption, #888)",
					fontSize: 13,
					textAlign: "center"
				},
				children: "空画板——在面板 / HTML artifact 卡片上点 📌 固定到这里"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: containerRef,
				style: { minHeight: 104 },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GridStyles, {}), mounted && width > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GridLayout, {
					width,
					layout,
					gridConfig: {
						cols: 12,
						rowHeight: ROW_HEIGHT,
						margin: GRID_MARGIN,
						maxRows: 24
					},
					dragConfig: {
						enabled: true,
						handle: ".dock-tile-handle",
						cancel: ".dock-tile-cancel"
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
					children: tiles.map((tile) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TileChrome, {
						title: tile.title,
						onRemove: () => {
							dockStore.remove(tile.tileId);
							if (dockStore.getSnapshot().tiles.length === 0) onEmpty?.();
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TileErrorBoundary, {
							tileId: tile.tileId,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TileContent, { tile })
						})
					}) }, tile.tileId))
				}) : null]
			});
		}
		//#endregion
		//#region src/client/index.tsx
		const name = "openloop-dock";
		const inject = [];
		function DockToggle({ open, onToggle, count, right }) {
			const [hover, setHover] = (0, react.useState)(false);
			if (open) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onToggle,
				title: "展开 OpenLoop Dock",
				onMouseEnter: () => setHover(true),
				onMouseLeave: () => setHover(false),
				style: {
					position: "fixed",
					top: 52,
					right,
					zIndex: 2147483100,
					minWidth: 34,
					height: 34,
					padding: "0 8px",
					borderRadius: 10,
					border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.25))",
					background: "var(--dsw-alias-bg-layer-1, #fff)",
					cursor: "pointer",
					fontSize: 14,
					lineHeight: 1,
					opacity: hover ? 1 : .55,
					transition: "opacity .15s ease",
					display: "flex",
					alignItems: "center",
					gap: 4
				},
				children: ["📌", count > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						fontSize: 10,
						opacity: .7
					},
					children: count
				}) : null]
			});
		}
		const WIDTH_KEY = "openloop.dock.width.v1";
		const DEFAULT_WIDTH = 420;
		function readStoredWidth() {
			try {
				const raw = localStorage.getItem(WIDTH_KEY);
				const n = raw === null ? NaN : Number(raw);
				return Number.isFinite(n) ? Math.max(280, Math.min(760, n)) : DEFAULT_WIDTH;
			} catch {
				return DEFAULT_WIDTH;
			}
		}
		/** header ghost 按钮（bsb 工具栏风格：无边框、hover 淡底、可 danger 态） */
		function HeaderButton({ label, title, onClick, danger = false }) {
			const [hover, setHover] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				title,
				onClick,
				onMouseEnter: () => setHover(true),
				onMouseLeave: () => setHover(false),
				style: {
					fontSize: 11,
					padding: "3px 8px",
					borderRadius: 6,
					border: "none",
					cursor: "pointer",
					lineHeight: 1.5,
					color: danger ? "var(--dsw-alias-danger, #d4453a)" : "inherit",
					opacity: danger ? 1 : .72,
					background: hover ? danger ? "rgba(212,69,58,.12)" : "rgba(127,127,127,.14)" : "transparent",
					transition: "background .12s ease"
				},
				children: label
			});
		}
		function DockShell() {
			const [open, setOpen] = (0, react.useState)(() => dockStore.getSnapshot().tiles.length > 0);
			const [version, setVersion] = (0, react.useState)(0);
			const [width, setWidth] = (0, react.useState)(readStoredWidth);
			const [confirmingClear, setConfirmingClear] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (!confirmingClear) return;
				const timer = setTimeout(() => setConfirmingClear(false), 3e3);
				return () => clearTimeout(timer);
			}, [confirmingClear]);
			(0, react.useEffect)(() => dockStore.subscribe(() => setVersion((v) => v + 1)), []);
			const tiles = dockStore.getSnapshot().tiles;
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
				const w = window;
				w.__openloopDockToggle = () => setOpen((o) => !o);
				w.__openloopDockOpen = () => setOpen(true);
				return () => {
					delete w.__openloopDockToggle;
					delete w.__openloopDockOpen;
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DockToggle, {
				open,
				onToggle: () => setOpen((o) => !o),
				count: tiles.length,
				right: toggleRight
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DockHost, {
				open,
				width,
				onWidthChange: (w) => {
					setWidth(w);
					try {
						localStorage.setItem(WIDTH_KEY, String(w));
					} catch {}
				},
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
							padding: "8px 12px",
							borderBottom: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))",
							flexShrink: 0
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 12,
								fontWeight: 600,
								letterSpacing: .2,
								opacity: .85
							},
							children: "OpenLoop Dock"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 2
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(HeaderButton, {
									label: "整理",
									title: "重力紧凑：消除空洞，保持相对顺序",
									onClick: () => dockStore.compact()
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(HeaderButton, {
									label: "收起",
									title: "收起 Dock（tile 保留，再点右上角 📌 展开）",
									onClick: () => setOpen(false)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(HeaderButton, {
									label: confirmingClear ? "确认清空？" : "清空",
									title: confirmingClear ? "再次点击确认移除全部 tile" : "移除画板上的全部 tile",
									danger: confirmingClear,
									onClick: () => {
										if (confirmingClear) {
											dockStore.clear();
											setConfirmingClear(false);
										} else setConfirmingClear(true);
									}
								})
							]
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							flex: 1,
							minHeight: 0,
							overflow: "auto"
						},
						children: tiles.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								height: "100%",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								gap: 10,
								opacity: .45,
								padding: 24,
								textAlign: "center",
								userSelect: "none"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: { fontSize: 24 },
								children: "📌"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: 12,
									lineHeight: 1.8
								},
								children: [
									"面板或页面卡片右上角点「📌 固定」",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
									"把 widget / artifact 钉到这里自由排布"
								]
							})]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DockBoardView, {})
					})]
				})
			})] });
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
				toggle() {
					window.__openloopDockToggle?.();
				},
				isOpen() {
					return document.querySelector("[data-openloop-dock-panel]") !== null;
				}
			};
			ctx.provide("openloop-dock/client", service);
			window.__openloopDockService = service;
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
