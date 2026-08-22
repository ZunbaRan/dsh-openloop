import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOpenLoopSettingsScope } from '../src/client.tsx'

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

beforeEach(() => {
  const events = new EventTarget()
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'window', { configurable: true, value: events })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  } })
})

afterEach(() => {
  vi.restoreAllMocks()
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
  else Reflect.deleteProperty(globalThis, 'window')
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('browser-local OpenLoop visual settings', () => {
  it('synchronizes a selection across independently bundled plugin scopes', async () => {
    const declarative = createOpenLoopSettingsScope()
    const widget = createOpenLoopSettingsScope()
    const artifact = createOpenLoopSettingsScope()
    const widgetChanged = vi.fn()
    const artifactChanged = vi.fn()
    const stopWidget = widget.subscribe(widgetChanged)
    const stopArtifact = artifact.subscribe(artifactChanged)

    await declarative.set('preset', 'claude')
    await declarative.set('appearance', 'dark')

    expect(widget.getSnapshot().value).toEqual({ preset: 'claude', appearance: 'dark' })
    expect(artifact.getSnapshot().value).toEqual({ preset: 'claude', appearance: 'dark' })
    expect(widgetChanged).toHaveBeenCalledTimes(2)
    expect(artifactChanged).toHaveBeenCalledTimes(2)
    stopWidget()
    stopArtifact()
  })

  it('rehydrates the last selection for a newly loaded plugin bundle', async () => {
    const first = createOpenLoopSettingsScope()
    await first.set('preset', 'apple')
    const reloaded = createOpenLoopSettingsScope()
    expect(reloaded.getSnapshot().value?.preset).toBe('apple')
  })
})
