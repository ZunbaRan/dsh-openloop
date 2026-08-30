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

export const V2_CSS = `
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

/* ---------- 横向拖拽把手（rail 右缘） ---------- */
.d2-resize-h { position: absolute; top: 0; right: -4px; width: 8px; height: 100%; cursor: col-resize; z-index: 6; touch-action: none; }
.d2-resize-h::after { content: ""; position: absolute; top: 0; bottom: 0; left: 3px; width: 2px; border-radius: 2px; background: transparent; transition: background .15s; }
.d2-resize-h:hover::after { background: var(--dsw-alias-state-business-primary, #4176e6); }

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
.d2-resource-row .d2-rowdesc { font-size: 11px; color: var(--dsw-alias-label-tertiary, inherit); flex-shrink: 0; }
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

.d2-applist { width: 240px; flex-shrink: 0; border-right: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); display: flex; flex-direction: column; background: var(--dsw-alias-bg-layer-1, #fff); min-height: 0; }
.d2-applist .d2-col-head { padding: 10px 12px 8px; font-size: 10.5px; font-weight: 600; letter-spacing: .06em; color: var(--dsw-alias-label-caption, #888); display: flex; align-items: center; justify-content: space-between; }
.d2-applist .d2-rows { flex: 1; overflow-y: auto; padding: 2px 8px 10px; display: flex; flex-direction: column; gap: 2px; }
.d2-applist .d2-app-row { width: 100%; border: 0; background: none; font-family: inherit; cursor: pointer; }
.d2-applist .d2-app-row .d2-sub { display: flex; align-items: center; gap: 6px; }
.d2-applist .d2-app-row .d2-status { margin-left: auto; flex-shrink: 0; }

.d2-rescol { width: 290px; flex-shrink: 0; border-right: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12)); display: flex; flex-direction: column; background: var(--dsw-alias-bg-layer-1, #fff); min-height: 0; }
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
.d2-resource-row.on { background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 8%, transparent); box-shadow: inset 2px 0 0 var(--dsw-alias-state-business-primary, #4176e6); }
.d2-resource-row .d2-pin-dot { flex-shrink: 0; }

.d2-detailpane { flex: 1; min-width: 0; display: flex; flex-direction: column; background: var(--dsw-alias-bg-layer-1, #fff); overflow-y: auto; min-height: 0; }
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
`
