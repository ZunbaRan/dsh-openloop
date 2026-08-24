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
import { useEffect, type ReactNode } from 'react'
import { GridLayout, useContainerWidth } from 'react-grid-layout'
import { GRID_COLUMNS, MAX_ROWS, toRglLayout } from './layout.ts'
import { dockStore, type DockTile } from './store.ts'

// 跨插件 client 组件懒桥（DSH ModuleLoader external：评估期 require 在插件
// 被禁用时炸 loader——懒 require 后 tile 按需取，缺失渲染降级条）
import { getBaseClient, DependencyMissing } from './base-bridge.tsx'
import { getPanelsClient, getArtifactClient } from './openloop-clients.ts'

/** scope 惰性单例（base 缺失时 undefined——ArtifactFrame 外壳自行降级） */
let scopeCache: ReturnType<NonNullable<ReturnType<typeof getBaseClient>>['createOpenLoopSettingsScope']> | undefined
function getScope() {
  if (scopeCache === undefined) scopeCache = getBaseClient()?.createOpenLoopSettingsScope()
  return scopeCache
}

const ROW_HEIGHT = 48
const GRID_MARGIN: readonly [number, number] = [12, 12]

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
`

function GridStyles(): null {
  useEffect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-openloop-dock-grid', '')
    el.textContent = GRID_CSS
    document.head.appendChild(el)
    return () => el.remove()
  }, [])
  return null
}

function TileChrome({ title, onRemove, children }: { title: string; onRemove: () => void; children: ReactNode }) {
  return (
    <div
      className="dock-tile-chrome"
      style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        borderRadius: 10,
        border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.08))',
        background: 'var(--dsw-alias-bg-layer-1, #fff)',
        overflow: 'hidden',
      }}
    >
      <div
        className="dock-tile-handle"
        title="拖动排列"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, padding: '5px 6px 5px 10px', flexShrink: 0,
          borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.06))',
          fontSize: 11.5, fontWeight: 600, letterSpacing: 0.2,
          color: 'var(--dsw-alias-label-title, inherit)',
          userSelect: 'none',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        <button
          type="button"
          className="dock-tile-cancel"
          onClick={onRemove}
          aria-label="unpin"
          title="取消固定"
          style={{
            border: 0, background: 'transparent', cursor: 'pointer', flexShrink: 0,
            fontSize: 12, lineHeight: 1, padding: '3px 6px', borderRadius: 6,
            color: 'var(--dsw-alias-label-caption, #888)',
          }}
        >✕</button>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'auto', padding: 10 }}>{children}</div>
    </div>
  )
}

function TileContent({ tile }: { tile: DockTile }) {
  if (tile.source.kind === 'panel') {
    const panels = getPanelsClient()
    if (panels === undefined) {
      return <DependencyMissing what="Dock 面板 tile" dep="@openloop/dsh-panels" />
    }
    const PanelSurface = panels.PanelSurface
    return <PanelSurface meta={tile.source.meta as never} />
  }
  const artifact = getArtifactClient()
  if (artifact === undefined) {
    return <DependencyMissing what="Dock Artifact tile" dep="@openloop/dsh-html-artifact" />
  }
  const ArtifactFrame = artifact.ArtifactFrame
  return <ArtifactFrame meta={tile.source.meta as never} token={`dock-${tile.tileId}`} fullscreen={false} scope={getScope()} />
}

export function DockBoardView({ onEmpty }: { onEmpty?: () => void }): ReactNode {
  const { width, containerRef, mounted } = useContainerWidth()
  // 每渲染读最新 snapshot（外层 DockShell 的 store 订阅驱动重渲染）
  const tiles = dockStore.getSnapshot().tiles
  const layout = toRglLayout(tiles)

  if (tiles.length === 0) {
    return (
      <div style={{ padding: 24, color: 'var(--dsw-alias-label-caption, #888)', fontSize: 13, textAlign: 'center' }}>
        空画板——在面板 / HTML artifact 卡片上点 📌 固定到这里
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ minHeight: 104 }}>
      <GridStyles />
      {mounted && width > 0
        ? (
          <GridLayout
            width={width}
            layout={layout}
            gridConfig={{ cols: GRID_COLUMNS, rowHeight: ROW_HEIGHT, margin: GRID_MARGIN, maxRows: MAX_ROWS }}
            dragConfig={{ enabled: true, handle: '.dock-tile-handle', cancel: '.dock-tile-cancel' }}
            resizeConfig={{ enabled: true, handles: ['se', 'e', 's'] }}
            onLayoutChange={items => dockStore.applyLayout(items)}
          >
            {tiles.map(tile => (
              <div key={tile.tileId}>
                <TileChrome
                  title={tile.title}
                  onRemove={() => {
                    dockStore.remove(tile.tileId)
                    if (dockStore.getSnapshot().tiles.length === 0) onEmpty?.()
                  }}
                >
                  <TileContent tile={tile} />
                </TileChrome>
              </div>
            ))}
          </GridLayout>
        )
        : null}
    </div>
  )
}
