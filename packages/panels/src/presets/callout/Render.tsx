/**
 * callout 渲染器。
 * 参照 declarative callout / NativeNotice：tone 决定 background/border/text 件套，
 * 图形符号用纯字符（ℹ/✓/⚠/✕）替代图标库；error 时 role="alert"。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'

type Tone = 'info' | 'success' | 'warning' | 'error'

interface ToneStyle {
  background: string
  border: string
  text: string
}

const TONE_STYLES: Record<Tone, ToneStyle> = {
  info: {
    background: 'var(--openloop-info-background)',
    border: 'var(--openloop-info-border)',
    text: 'var(--openloop-info)',
  },
  success: {
    background: 'var(--openloop-success-background)',
    border: 'var(--openloop-success-border)',
    text: 'var(--openloop-success)',
  },
  warning: {
    background: 'var(--openloop-warning-background)',
    border: 'var(--openloop-warning-border)',
    text: 'var(--openloop-warning)',
  },
  error: {
    background: 'var(--openloop-error-background)',
    border: 'var(--openloop-error-border)',
    text: 'var(--openloop-error)',
  },
}

const TONE_GLYPH: Record<Tone, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
}

const shellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: '10px 12px',
  borderRadius: 'var(--openloop-radius-lg)',
}

const glyphStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.4,
  fontWeight: 600,
  flexShrink: 0,
}

const bodyStyle: CSSProperties = {
  minWidth: 0,
}

const titleStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.4,
  fontWeight: 650,
}

const descriptionStyle: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.55,
  color: 'var(--openloop-foreground)',
  wordBreak: 'break-word',
}

export function CalloutRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const tone: Tone = root.tone === 'success' || root.tone === 'warning' || root.tone === 'error' ? root.tone : 'info'
  const title = typeof root.title === 'string' && root.title.length > 0 ? root.title : undefined
  const description = typeof root.description === 'string' ? root.description : ''
  const palette = TONE_STYLES[tone]

  return (
    <div
      data-openloop-preset="callout"
      data-openloop-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
      style={{
        ...shellStyle,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.text,
      }}
    >
      <span aria-hidden="true" style={glyphStyle}>{TONE_GLYPH[tone]}</span>
      <div style={bodyStyle}>
        {title !== undefined ? <div style={{ ...titleStyle, color: palette.text }}>{title}</div> : null}
        <div style={descriptionStyle}>{description}</div>
      </div>
    </div>
  )
}
