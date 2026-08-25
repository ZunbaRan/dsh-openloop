/**
 * 横向拖拽调宽助手（Dock 2.0，原型 components.jsx 的 dragResize 直搬 + TS 化）。
 * - onLive：拖动中实时回调（调用方只写 state，不持久化、禁过渡）
 * - onDone：松手回调（吸附/持久化时机）
 * 纯 DOM 逻辑无 React 依赖。放 client 而非 shared——包级 tsc 无 DOM lib
 * （见 dock-width.ts 注释），shared 只收环境无关代码。
 */
export interface DragResizeStartEvent {
  preventDefault(): void
  stopPropagation(): void
  clientX: number
}

export function dragResize(
  e: DragResizeStartEvent,
  startW: number,
  min: number,
  max: number,
  onLive: (width: number) => void,
  onDone?: (width: number) => void,
): void {
  e.preventDefault()
  e.stopPropagation()
  const startX = e.clientX
  let last = startW
  const move = (ev: PointerEvent): void => {
    last = Math.min(max, Math.max(min, startW + ev.clientX - startX))
    onLive(last)
  }
  const up = (): void => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    onDone?.(last)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}
