/**
 * progress 渲染器。
 * 结构参照 NativeProgress/declarative progress（h-2 圆角轨道 + 填充条）；
 * 样式 100% 来自 var(--openloop-*)，内联 style；带 role="progressbar" 无障碍。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord, isFiniteNumber } from '../common.ts'
import { meta, micro } from '../style.ts'

type Tone = 'primary' | 'success' | 'warning' | 'error' | 'info'

const TONE_COLOR: Record<Tone, string> = {
  primary: 'var(--openloop-primary)',
  success: 'var(--openloop-success)',
  warning: 'var(--openloop-warning)',
  error: 'var(--openloop-error)',
  info: 'var(--openloop-info)',
}

const trackStyle: CSSProperties = {
  height: 8,
  borderRadius: 999,
  background: 'var(--openloop-surface-muted)',
  overflow: 'hidden',
}

export function ProgressRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const label = typeof root.label === 'string' ? root.label : undefined
  const rawValue = isFiniteNumber(root.value) ? root.value : 0
  const max = isFiniteNumber(root.max) && root.max > 0 ? root.max : 100
  const tone: Tone = root.tone === 'success' || root.tone === 'warning' || root.tone === 'error' || root.tone === 'info'
    ? root.tone
    : 'primary'
  const value = Math.max(0, Math.min(max, rawValue))
  const percent = max > 0 ? value / max : 0
  const roundedPercent = Math.round(percent * 100)

  return (
    <div data-openloop-preset="progress" data-openloop-value={String(Math.round(value))} data-openloop-tone={tone}>
      {label !== undefined ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <span style={meta}>{label}</span>
          <span style={micro} data-openloop-percent={String(roundedPercent)}>{roundedPercent}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
        aria-valuenow={Math.round(value)}
        style={trackStyle}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 999,
            background: TONE_COLOR[tone],
            width: `${percent * 100}%`,
            transition: 'width 200ms ease',
          }}
        />
      </div>
    </div>
  )
}
