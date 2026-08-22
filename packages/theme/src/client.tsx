import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import {
  DEFAULT_OPENLOOP_SETTINGS, OPENLOOP_GLOBAL_TOKENS, PRESET_META,
  decodeOpenLoopSettings, paletteVariables, resolvePalette,
  type OpenLoopAppearance, type OpenLoopVisualSettings,
} from './index.ts'

// 静态数据再导出：external 共享模式下消费者只能解析 ./client 子路径（模块图只认 /client 别名），
// token 数据经此出口共享，无需再 import 主入口。
export {
  OPENLOOP_PRESETS, OPENLOOP_PRESET_IDS, OPENLOOP_GLOBAL_TOKENS, PRESET_META,
  DEFAULT_OPENLOOP_SETTINGS, paletteVariables, resolvePalette,
} from './index.ts'
export type {
  OpenLoopPreset, OpenLoopAppearance, OpenLoopResolvedAppearance, OpenLoopVisualSettings,
} from './index.ts'

export type OpenLoopSettingsScope = SettingsScope<OpenLoopVisualSettings>

const STORAGE_KEY = 'openloop.visuals.v1'
const CHANGE_EVENT = 'openloop-visual-settings-change'

function loadStoredSettings(): OpenLoopVisualSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_OPENLOOP_SETTINGS
  try { return decodeOpenLoopSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')) ?? DEFAULT_OPENLOOP_SETTINGS } catch { return DEFAULT_OPENLOOP_SETTINGS }
}

export function createOpenLoopSettingsScope(): OpenLoopSettingsScope {
  let value = loadStoredSettings()
  let snapshot = { status: 'ready' as const, value, base: DEFAULT_OPENLOOP_SETTINGS, user: value, revision: 0, writable: true, mode: 'host' as const }
  const listeners = new Set<() => void>()
  const publish = () => {
    const next = loadStoredSettings()
    if (next.preset === value.preset && next.appearance === value.appearance) return
    value = next
    snapshot = { ...snapshot, value, user: value, revision: snapshot.revision + 1 }
    for (const listener of listeners) listener()
  }
  const onChange = () => publish()
  const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) publish() }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      if (listeners.size === 1) { window.addEventListener(CHANGE_EVENT, onChange); window.addEventListener('storage', onStorage) }
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) { window.removeEventListener(CHANGE_EVENT, onChange); window.removeEventListener('storage', onStorage) }
      }
    },
    async set(field, nextValue) {
      const next = decodeOpenLoopSettings({ ...value, [field]: nextValue }) ?? value
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      publish()
      window.dispatchEvent(new Event(CHANGE_EVENT))
    },
    async unset(field) {
      const next = { ...value, [field]: DEFAULT_OPENLOOP_SETTINGS[field as keyof OpenLoopVisualSettings] }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      publish()
      window.dispatchEvent(new Event(CHANGE_EVENT))
    },
  }
}

function systemIsDark(): boolean {
  if (typeof document === 'undefined') return false
  return document.body.hasAttribute('data-ds-dark-theme') || matchMedia('(prefers-color-scheme: dark)').matches
}

export function useOpenLoopVisualTheme(scope: OpenLoopSettingsScope) {
  const snapshot = useSyncExternalStore(scope.subscribe, scope.getSnapshot, scope.getSnapshot)
  const [dark, setDark] = useState(systemIsDark)
  useEffect(() => {
    const update = () => setDark(systemIsDark())
    const observer = new MutationObserver(update)
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
    const media = matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', update)
    return () => { observer.disconnect(); media.removeEventListener('change', update) }
  }, [])
  const settings = snapshot.value ?? DEFAULT_OPENLOOP_SETTINGS
  const resolved = resolvePalette(settings, dark)
  return {
    settings, snapshot,
    preset: settings.preset,
    appearance: resolved.appearance,
    palette: resolved.values,
    values: resolved.values,
    global: OPENLOOP_GLOBAL_TOKENS,
    style: paletteVariables(settings, dark) as CSSProperties,
  }
}

const page: CSSProperties = { display: 'grid', gap: 24, padding: '4px 2px 28px', color: 'var(--dsw-alias-label-primary)' }
const heading: CSSProperties = { margin: 0, fontSize: 24, lineHeight: 1.25, letterSpacing: '-0.025em' }
const copy: CSSProperties = { margin: '6px 0 0', color: 'var(--dsw-alias-label-caption)', fontSize: 14, lineHeight: 1.55 }
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }
const segment: CSSProperties = { display: 'inline-flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid var(--dsw-alias-border-l2)' }

const appearanceOptions: Array<{ id: OpenLoopAppearance; zh: string; en: string }> = [
  { id: 'system', zh: '跟随 DSH', en: 'Follow DSH' }, { id: 'light', zh: '浅色', en: 'Light' }, { id: 'dark', zh: '深色', en: 'Dark' },
]

export function OpenLoopVisualSettingsPage({ scope }: { scope: OpenLoopSettingsScope }) {
  const { settings, snapshot } = useOpenLoopVisualTheme(scope)
  const zh = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')
  return <div style={page}>
    <header><h2 style={heading}>{zh ? 'OpenLoop 视觉' : 'OpenLoop Visuals'}</h2><p style={copy}>{zh ? '仅控制 Declarative、Show Widget 与 HTML Artifact，不修改 DSH 全局主题。' : 'Controls Declarative, Show Widget, and HTML Artifact only. The DSH theme remains untouched.'}</p></header>
    <section>
      <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{zh ? '明暗模式' : 'Appearance'}</h3>
      <p style={{ ...copy, marginBottom: 12 }}>{zh ? '跟随 DSH 会随当前界面自动切换；也可以固定为浅色或深色。' : 'Follow DSH switches automatically, or choose a fixed appearance.'}</p>
      <div style={segment} role="radiogroup" aria-label={zh ? '明暗模式' : 'Appearance'}>
        {appearanceOptions.map(option => <button key={option.id} type="button" role="radio" aria-checked={settings.appearance === option.id} onClick={() => void scope.set('appearance', option.id)} style={{ border: 0, borderRadius: 9, padding: '8px 13px', cursor: 'pointer', color: settings.appearance === option.id ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-caption)', background: settings.appearance === option.id ? 'var(--dsw-alias-bg-layer-1)' : 'transparent', boxShadow: settings.appearance === option.id ? '0 1px 3px rgb(0 0 0 / 12%)' : 'none', font: 'inherit' }}>{zh ? option.zh : option.en}</button>)}
      </div>
    </section>
    <section>
      <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{zh ? '风格预设' : 'Style preset'}</h3>
      <p style={{ ...copy, marginBottom: 12 }}>{zh ? '八套色板来自 OpenLoop OCIX Style v2，选择会立即同步到三套组件。' : 'Eight palettes from OpenLoop OCIX Style v2. Changes apply to all three surfaces immediately.'}</p>
      <div style={grid} role="radiogroup" aria-label={zh ? '风格预设' : 'Style preset'}>
        {PRESET_META.map(meta => {
          const selected = settings.preset === meta.id
          const chosen = resolvePalette({ preset: meta.id, appearance: settings.appearance }, document.body.hasAttribute('data-ds-dark-theme') || matchMedia('(prefers-color-scheme: dark)').matches)
          const p = chosen.values
          return <button key={meta.id} type="button" role="radio" aria-checked={selected} onClick={() => void scope.set('preset', meta.id)} style={{ textAlign: 'left', cursor: 'pointer', padding: 12, borderRadius: 14, border: `1px solid ${selected ? p.primary : p.border}`, outline: selected ? `1px solid ${p.primary}` : 'none', background: p.surface, color: p.foreground, font: 'inherit' }}>
            <span style={{ display: 'flex', height: 42, alignItems: 'center', gap: 8, padding: 7, overflow: 'hidden', borderRadius: 9, border: `1px solid ${p.border}`, background: p['surface-muted'] }}>
              <span aria-hidden style={{ width: 28, alignSelf: 'stretch', borderRadius: 7, background: p.primary }} />
              <span style={{ flex: 1, display: 'grid', gap: 6 }}><span style={{ height: 6, width: '74%', borderRadius: 99, background: p.foreground, opacity: .7 }} /><span style={{ height: 6, width: '48%', borderRadius: 99, background: p['muted-foreground'], opacity: .65 }} /></span>
            </span>
            <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 9, fontSize: 13, fontWeight: 650 }}><span>{meta.name}</span><span aria-hidden style={{ color: p.primary }}>{selected ? '✓' : ''}</span></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>{[1,2,3,4].map(i => <span key={i} aria-hidden style={{ width: 8, height: 8, borderRadius: 99, background: p[`chart-${i}` as keyof typeof p] }} />)}<span style={{ marginLeft: 3, color: p['muted-foreground'], fontSize: 11 }}>{zh ? meta.character : meta.character.split('、').join(' · ')}</span></span>
          </button>
        })}
      </div>
      {snapshot.status !== 'ready' && <p style={copy}>{snapshot.status === 'loading' ? (zh ? '正在读取设置…' : 'Loading settings…') : (zh ? '当前连接不支持持久化设置。' : 'Persistent settings are unavailable for this connection.')}</p>}
    </section>
  </div>
}
