/**
 * 本地后端预设族测试（批 5）：
 * - schema 边界（共享 title/autoRefreshMs 规则 + db-browser 专属 collection/perPage）
 * - 渲染：无硬编码色值（token 纪律）· unavailable 占位（fetch 到 HTML 时）
 * - formatBytes / formatDuration / relativeTime 纯函数
 */
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { validatePbStats } from '../../src/presets/pb-stats/validate.ts'
import { PbStatsRender } from '../../src/presets/pb-stats/Render.tsx'
import { validateDbBrowser } from '../../src/presets/db-browser/validate.ts'
import { DbBrowserRender } from '../../src/presets/db-browser/Render.tsx'
import { validateStorageUsage } from '../../src/presets/storage-usage/validate.ts'
import { StorageUsageRender } from '../../src/presets/storage-usage/Render.tsx'
import { validateApiCredentials } from '../../src/presets/api-credentials/validate.ts'
import { ApiCredentialsRender } from '../../src/presets/api-credentials/Render.tsx'
import { validateSessionsStats } from '../../src/presets/sessions-stats/validate.ts'
import { SessionsStatsRender } from '../../src/presets/sessions-stats/Render.tsx'
import { validateMcpStatus } from '../../src/presets/mcp-status/validate.ts'
import { McpStatusRender } from '../../src/presets/mcp-status/Render.tsx'
import { validatePluginRegistry } from '../../src/presets/plugin-registry/validate.ts'
import { PluginRegistryRender } from '../../src/presets/plugin-registry/Render.tsx'
import { formatBytes, formatDuration, relativeTime } from '../../src/presets/local-backend.ts'

const spafetch = async () => new Response('<!doctype html>', { status: 200, headers: { 'Content-Type': 'text/html' } })

describe('本地后端预设 · schema 边界（共享规则）', () => {
  it('空对象/缺省合法；title ≤80；autoRefreshMs 10000–3600000', () => {
    for (const validate of [validatePbStats, validateStorageUsage, validateApiCredentials, validateSessionsStats, validateMcpStatus, validatePluginRegistry]) {
      expect(validate({}).ok).toBe(true)
      expect(validate({ title: 'x' }).ok).toBe(true)
      expect(validate({ title: 'x'.repeat(81) }).ok).toBe(false)
      expect(validate({ autoRefreshMs: 9999 }).ok).toBe(false)
      expect(validate({ autoRefreshMs: 10000 }).ok).toBe(true)
      expect(validate('x').ok).toBe(false)
    }
  })

  it('db-browser 专属：collection ≤40 / perPage 5–100', () => {
    expect(validateDbBrowser({ collection: 'apps', perPage: 20 }).ok).toBe(true)
    expect(validateDbBrowser({ collection: 'x'.repeat(41) }).ok).toBe(false)
    expect(validateDbBrowser({ perPage: 4 }).ok).toBe(false)
    expect(validateDbBrowser({ perPage: 101 }).ok).toBe(false)
  })
})

describe('本地后端预设 · 渲染纪律', () => {
  it('SPA fallback（HTML 应答）→ 「未启用」占位而非错误（pb-storage/api-credentials/mcp-status）', async () => {
    vi.stubGlobal('fetch', vi.fn(spafetch))
    // useAppEndpoint 的 fetch 在 useEffect 中执行——SSR 下 effect 不跑，这里只验证
    // 组件可渲染不抛错 + 根属性正确
    for (const [kind, node] of [
      ['pb-stats', <PbStatsRender props={{}} />],
      ['storage-usage', <StorageUsageRender props={{}} />],
      ['api-credentials', <ApiCredentialsRender props={{}} />],
      ['sessions-stats', <SessionsStatsRender props={{}} />],
      ['mcp-status', <McpStatusRender props={{}} />],
      ['db-browser', <DbBrowserRender props={{}} />],
    ] as const) {
      const markup = renderToString(node)
      expect(markup).toContain(`data-openloop-preset="${kind}"`)
      // token 纪律：无硬编码色值
      expect(markup).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(markup).not.toContain('rgb(')
    }
    vi.unstubAllGlobals()
  })

  it('plugin-registry：boot 载荷分组渲染（openloop/deepseek/其他）', () => {
    vi.stubGlobal('__DSH_BOOT__', {
      entries: [
        { id: '@openloop/dsh-panels', inject: ['tools'] },
        { id: '@deepseek-ai/dsh-base', inject: [] },
        { id: 'dshmarket', inject: ['webServer'] },
      ],
    })
    const markup = renderToString(<PluginRegistryRender props={{}} />)
    expect(markup).toContain('data-openloop-preset="plugin-registry"')
    expect(markup).toContain('OpenLoop 插件')
    expect(markup).toContain('DeepSeek 官方')
    expect(markup).toContain('@openloop/dsh-panels')
    expect(markup).toContain('1 注入')
    // 无硬编码色值
    expect(markup).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    vi.unstubAllGlobals()
  })

  it('plugin-registry：载荷缺失 → 占位不炸', () => {
    const markup = renderToString(<PluginRegistryRender props={{}} />)
    expect(markup).toContain('不可读')
  })
})

describe('本地后端预设 · 格式化纯函数', () => {
  it('formatBytes 阶梯', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB')
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3 GB')
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB')
    expect(formatBytes(Number.NaN)).toBe('—')
  })

  it('formatDuration 阶梯', () => {
    expect(formatDuration(4500)).toBe('4s')
    expect(formatDuration(65000)).toBe('1m 5s')
    expect(formatDuration(3 * 3600_000 + 2 * 60_000)).toBe('3h 2m')
    expect(formatDuration(50 * 3600_000)).toBe('2d 2h')
  })

  it('relativeTime 相对时间', () => {
    expect(relativeTime(null)).toBe('—')
    expect(relativeTime('junk')).toBe('—')
    expect(relativeTime(new Date(Date.now() - 30_000).toISOString())).toBe('刚刚')
    expect(relativeTime(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5 分钟前')
    expect(relativeTime(new Date(Date.now() - 3 * 3600_000).toISOString())).toBe('3 小时前')
  })
})
