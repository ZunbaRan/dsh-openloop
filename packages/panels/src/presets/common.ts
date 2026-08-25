/**
 * 预设组件共享工具（§6.3）。
 * - 校验结果类型：fail-closed，错误消息面向 Agent 可自修正
 * - 数值格式化：currency-cny / number / percent，未知格式一律 text 兜底
 * - 纯工具，零依赖
 */
import type { JsonObject } from '../contract.ts'

/** 单条校验错误：path 为 props 内定位路径，message 面向 Agent 可自修正 */
export interface PresetError {
  path: string
  message: string
}

/** fail-closed 校验结果：ok 或全部错误 */
export type PresetValidation = { ok: true } | { ok: false; errors: PresetError[] }

export function validationOk(): PresetValidation {
  return { ok: true }
}

export function validationFail(errors: PresetError[]): PresetValidation {
  return { ok: false, errors }
}

export function error(path: string, message: string): PresetError {
  return { path, message }
}

/** 判定合法 JSON 对象（非数组、非 null），与 contract.ts JsonObject 对齐 */
export function asRecord(value: unknown): JsonObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null
}

/** 本地后端预设族共享 props 校验：title（≤80）+ autoRefreshMs（10000–3600000 整数） */
export function validateLocalPresetProps(kind: string, props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', `${kind} props 必须是 JSON 对象`)])
  const errors: PresetError[] = []
  if (root.title !== undefined && (typeof root.title !== 'string' || root.title.length > 80)) {
    errors.push(error('title', 'title 必须是 ≤80 字符的字符串'))
  }
  if (root.autoRefreshMs !== undefined) {
    const v = root.autoRefreshMs
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 10000 || v > 3600000) {
      errors.push(error('autoRefreshMs', 'autoRefreshMs 必须是 10000–3600000 的整数（毫秒）'))
    }
  }
  return errors.length > 0 ? validationFail(errors) : validationOk()
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** 数值/金额格式化枚举（§6.4：currency-cny/number/percent，未知一律 text 兜底） */
export type MetricFormat = 'currency-cny' | 'currency' | 'number' | 'percent' | 'text'

// currency 为 currency-cny 的模型友好别名（真机教训：模型高频自然猜测值）
export const METRIC_FORMATS: readonly MetricFormat[] = ['currency-cny', 'currency', 'number', 'percent', 'text']

export function isMetricFormat(value: unknown): value is MetricFormat {
  return typeof value === 'string' && (METRIC_FORMATS as readonly string[]).includes(value)
}

/**
 * 数值格式化：number/percent/currency-cny 走 Intl；非数字值或未知格式一律 text 兜底。
 * percent 语义为小数（0.124 → 12.4%）。
 */
export function formatValue(value: unknown, format: unknown): string {
  const key = isMetricFormat(format) ? format : 'text'
  if (key === 'text' || !isFiniteNumber(value)) return String(value ?? '')
  switch (key) {
    case 'currency-cny':
    case 'currency':
      return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 }).format(value)
    case 'percent':
      return new Intl.NumberFormat('zh-CN', { style: 'percent', maximumFractionDigits: 1 }).format(value)
    default:
      return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)
  }
}
