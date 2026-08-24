/**
 * OpenLoop Base client 懒桥（「关 base 不炸 loader」根治，2026-08-24）：
 *
 * 背景：external 依赖的顶层 import 会被 rolldown 编译成 bundle factory 体内
 * 的立即 require——base 被禁用时 require 抛 "missed the module table"，
 * materialize 失败炸掉整个插件树（页面 "Failed to load plugins"）。
 *
 * 方案：require 移入函数体（rolldown 原样保留调用位置）+ try/catch + 缓存
 * （失败不缓存，插件启用后无需刷新即可恢复）。base 缺失时调用方渲染
 * DependencyMissing 降级条，而不是让 loader 崩溃。
 */
import { createElement, type ReactNode } from 'react'

type BaseClientModule = typeof import('@openloop/dsh-base/client')

let cached: BaseClientModule | undefined

/** base 可用时返回其 client 模块；被禁用时返回 undefined（下次调用重试，不缓存失败） */
export function getBaseClient(): BaseClientModule | undefined {
  if (cached !== undefined) return cached
  try {
    cached = require('@openloop/dsh-base/client') as BaseClientModule
  } catch {
    return undefined
  }
  return cached
}

/** base 缺失时的统一降级 UI（说明依赖关系，指引用户启用） */
export function DependencyMissing({ what, dep = '@openloop/dsh-base' }: { what: string; dep?: string }): ReactNode {
  return createElement('div', {
    style: {
      padding: '14px 16px', fontSize: 12, lineHeight: 1.6, opacity: 0.75,
      border: '1px dashed rgba(127,127,127,.4)', borderRadius: 10,
      display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
    },
  },
    createElement('strong', { style: { fontSize: 12 } }, what),
    createElement('span', null, `依赖插件 ${dep} 未启用——在设置 · 插件页启用后自动恢复`),
  )
}
