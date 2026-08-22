import type { ArtifactTheme } from '../shell.ts'
export function resolveTheme(values: Record<string, string>, scheme: 'light' | 'dark'): ArtifactTheme {
  return { tokens: values, foreground: values.foreground ?? '', muted: values['muted-foreground'] ?? '', surface: values.surface ?? '', elevated: values['surface-subtle'] ?? '', border: values.border ?? '', accent: values.primary ?? '', scheme }
}
