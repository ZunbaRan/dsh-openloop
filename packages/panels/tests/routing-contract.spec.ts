/**
 * 路由契约测试（VISUAL_ROUTING.md 的机器断言，2026-08-29）。
 *
 * 背景：入口文本曾发生三类漂移——互引不对称（被引用最多的是已退役工具）、
 * 计数过期（26 vs 33、61 vs 62）、死亡路标（flow/timeline/comparison 引流到
 * visualize_ui）。本测试把「路由知识必须在模型决策时可见的层正确」从约定
 * 变成断言；pnpm check 强制执行。
 *
 * 维护纪律：改预设/能力/档位时同步 VISUAL_ROUTING.md + 四工具 description
 * + skill description，本测试会拦住遗忘。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..')

function readPackageSource(...segments: readonly string[]): string {
  return readFileSync(resolve(repoRoot, 'packages', ...segments), 'utf8')
}

/** 提取工具注册的主 description（三个活工具与 declarative 的主 description 均以 Render/Deprecated 开头）。 */
function mainToolDescription(source: string): string {
  const match = source.match(/description: '((?:Render|Deprecated)[^']*)'/)
  if (!match?.[1]) throw new Error('main tool description not found — check the extraction anchor (must start with Render or Deprecated)')
  return match[1]
}

const panelDescription = mainToolDescription(readPackageSource('panels', 'src', 'tool.ts'))
const artifactDescription = mainToolDescription(readPackageSource('artifact', 'src', 'index.ts'))
const widgetDescription = mainToolDescription(readPackageSource('widget', 'src', 'index.ts'))
const declarativeDescription = mainToolDescription(readPackageSource('declarative', 'src', 'index.ts'))

describe('visual routing contract (VISUAL_ROUTING.md)', () => {
  it('every live tool description mentions both sibling live tools', () => {
    expect(panelDescription).toContain('show_widget')
    expect(panelDescription).toContain('html_artifact')
    expect(artifactDescription).toContain('panel')
    expect(artifactDescription).toContain('show_widget')
    expect(widgetDescription).toContain('panel')
    expect(widgetDescription).toContain('html_artifact')
  })

  it('four tools remain in the catalog; visualize_ui stays registered until a later version', () => {
    expect(panelDescription.length).toBeGreaterThan(0)
    expect(artifactDescription.length).toBeGreaterThan(0)
    expect(widgetDescription.length).toBeGreaterThan(0)
    expect(declarativeDescription.startsWith('Deprecated')).toBe(true)
    expect(declarativeDescription).toContain('panel')
  })

  it('panel declares its preset and data capabilities (anti blind-spot)', () => {
    expect(panelDescription).toContain('flow/timeline/comparison')
    expect(panelDescription).toContain('chart')
    expect(panelDescription).toContain('API')
    expect(panelDescription).toContain('persist')
  })

  it('show_widget declares its offline boundary (anti hidden misrouting)', () => {
    expect(widgetDescription).toContain('offline')
  })

  it('skill descriptions are intent-oriented and count-free (anti drift)', () => {
    const skillsSource = readPackageSource('panels', 'src', 'skills', 'index.ts')
    expect(skillsSource).not.toMatch(/\d+ 个预设组件/)
    expect(skillsSource).not.toMatch(/\d+ 个 token/)
    expect(skillsSource).toContain('仪表盘')
    const artifactSkillSource = readPackageSource('artifact', 'src', 'skill.ts')
    expect(artifactSkillSource).toContain('dashboard')
    expect(artifactSkillSource).toContain('small card')
    const widgetSkillSource = readPackageSource('widget', 'src', 'skill.ts')
    expect(widgetSkillSource).toContain('dashboard')
    expect(widgetSkillSource).toContain('full page')
  })

  it('the developer-facing pack guide stays out of the model catalog', () => {
    const skillsSource = readPackageSource('panels', 'src', 'skills', 'index.ts')
    expect(skillsSource).toContain('modelInvocable: false')
  })

  it('the routing matrix document exists as the single source of truth', () => {
    const matrix = readFileSync(resolve(repoRoot, 'docs', 'VISUAL_ROUTING.md'), 'utf8')
    expect(matrix).toContain('唯一事实源')
    expect(matrix).toContain('仍在工具表')
    expect(matrix).toContain('visualize_ui')
  })
})
