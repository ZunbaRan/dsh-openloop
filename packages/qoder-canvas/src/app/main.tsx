/**
 * canvas app 入口（0.12）：iframe 内自包含画布应用的挂载点。
 * 由 app-serve.ts 的壳端点加载（/qoder-canvas/app → 壳 HTML → 本 bundle）。
 */
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { CanvasApp } from './App.tsx'

const host = document.getElementById('openloop-canvas-app-root')
if (host !== null) {
  createRoot(host).render(createElement(CanvasApp))
}
