/**
 * 面板视觉主题的轻量读取（data-openloop-preset/data-openloop-appearance 取值源 + §8.4 token 快照）。
 * 与 theme 包共享同一 localStorage 键/事件（openloop.visuals.v1 + openloop-visual-settings-change），
 * 故预设/明暗切换实时同步；token 快照（global/preset 系）直接取自 theme 包单一来源（§14）。
 */
import { useEffect, useState } from 'react'
import type { OpenLoopPreset } from '@openloop/dsh-base/client' // type-only：编译后消失，不触发评估期 require
import { getBaseClient } from './base-bridge.tsx'

const STORAGE_KEY = 'openloop.visuals.v1'
const CHANGE_EVENT = 'openloop-visual-settings-change'
const FALLBACK_PRESET = 'linear'

export interface PanelVisualTheme {
  preset: string
  appearance: 'light' | 'dark'
  /** 全局系 token（§14：不随预设/明暗变化；桥消息 token-sync 载荷） */
  global: Record<string, string>
  /** 预设系 token（§14：OPENLOOP_PRESETS[preset][appearance]；桥消息 token-sync 载荷） */
  tokens: Record<string, string>
}

function systemIsDark(): boolean {
  if (typeof document === 'undefined') return false
  return document.body.hasAttribute('data-ds-dark-theme') || window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readStored(): { preset?: string | undefined; appearance?: 'light' | 'dark' | 'system' | undefined } {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const record = JSON.parse(raw) as Record<string, unknown>
    const appearance = record.appearance === 'light' || record.appearance === 'dark' || record.appearance === 'system' ? record.appearance : undefined
    return { preset: typeof record.preset === 'string' ? record.preset : undefined, appearance }
  } catch {
    return {}
  }
}

function resolveTheme(): PanelVisualTheme {
  const stored = readStored()
  const dark = systemIsDark()
  const appearance: 'light' | 'dark' =
    stored.appearance === 'light' || stored.appearance === 'dark' ? stored.appearance : dark ? 'dark' : 'light'
  // 懒桥取 base 的静态 token 数据（base 被禁用时 token 快照降级为空映射——
  // 面板以 CSS 变量默认值渲染，不再炸 loader）
  const base = getBaseClient()
  if (base === undefined) {
    return { preset: FALLBACK_PRESET, appearance, global: {}, tokens: {} }
  }
  // 非法/未存 preset 一律回退 FALLBACK_PRESET（与 theme 包 decodeOpenLoopSettings 同规则）
  const preset: OpenLoopPreset = base.OPENLOOP_PRESET_IDS.includes(stored.preset as OpenLoopPreset)
    ? (stored.preset as OpenLoopPreset)
    : FALLBACK_PRESET
  return {
    preset,
    appearance,
    global: base.OPENLOOP_GLOBAL_TOKENS,
    tokens: base.OPENLOOP_PRESETS[preset][appearance],
  }
}

/** 读取当前预设/明暗，并订阅 theme 包的变更事件保持同步 */
export function usePanelVisualTheme(): PanelVisualTheme {
  const [theme, setTheme] = useState<PanelVisualTheme>(resolveTheme)
  useEffect(() => {
    const update = () => setTheme(resolveTheme())
    window.addEventListener(CHANGE_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(CHANGE_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])
  return theme
}
