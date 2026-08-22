import type { ThemeBridge } from '../shell.ts'

export function resolveTheme(values: Record<string, string>, scheme: 'light' | 'dark'): ThemeBridge {
  return { tokens: values, foreground: values.foreground ?? '', muted: values['muted-foreground'] ?? '', surface: values.surface ?? '', border: values.border ?? '', accent: values.primary ?? '', scheme }
}
