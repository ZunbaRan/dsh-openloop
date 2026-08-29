/**
 * 路由契约测试（VISUAL_ROUTING.md 的机器断言）。
 *
 * 四个可视化工具均在目录中：panel / html_artifact / show_widget / visualize_ui。
 * visualize_ui 仍注册、可标 Deprecated，将在后续版本再卸——测试不得因兄弟
 * description 提及它而失败，也不得要求它从目录消失。
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

/** 提取工具注册的主 description（四工具主 description 均以 Render/Deprecated 开头）。 */
function mainToolDescription(source: string): string {
  const match = source.match(/description: '((?:Render|Deprecated)[^']*)'/)
  if (!match?.[1]) throw new Error('main tool description not found — check the extraction anchor (must start with Render or Deprecated)')
  return match[1]
}

const panelDescription = mainToolDescription(readPackageSource('panels', 'src', 'tool.ts'))
const artifactDescription = mainToolDescription(readPackageSource('artifact', 'src', 'index.ts'))
const widgetDescription = mainToolDescription(readPackageSource('widget', 'src', 'index.ts'))
const visualizeUiDescription = mainToolDescription(readPackageSource('declarative', 'src', 'index.ts'))
const catalog: ReadonlyArray<readonly [string, string]> = [
  ['panel', panelDescription],
  ['html_artifact', artifactDescription],
  ['show_widget', widgetDescription],
  ['visualize_ui', visualizeUiDescription],
]

describe('visual routing contract (VISUAL_ROUTING.md)', () => {
  it('catalog admits four visual tools; visualize_ui stays registered', () => {
    expect(catalog.map(([name]) => name)).toEqual(['panel', 'html_artifact', 'show_widget', 'visualize_ui'])
    for (const [name, description] of catalog) {
      expect(description.length, `${name} must have a main description`).toBeGreaterThan(0)
    }
  })

  it('preferred live tools mention both sibling preferred tools', () => {
    expect(panelDescription).toContain('show_widget')
    expect(panelDescription).toContain('html_artifact')
    expect(artifactDescription).toContain('panel')
    expect(artifactDescription).toContain('show_widget')
    expect(widgetDescription).toContain('panel')
    expect(widgetDescription).toContain('html_artifact')
  })

  it('visualize_ui may be labeled Deprecated; sibling mentions of it must not fail the contract', () => {
    expect(visualizeUiDescription.startsWith('Deprecated')).toBe(true)
    expect(visualizeUiDescription).toContain('panel')
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
    expect(matrix).toContain('visualize_ui')
  })
})
