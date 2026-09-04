/**
 * 路由契约测试（VISUAL_ROUTING.md 的机器断言）。
 *
 * 三个可视化工具在目录中：panel / html_artifact / show_widget。
 * visualize_ui（declarative 包）已于 2026-09-04 正式退役：不再注册、不再
 * 打包安装（dsh 已卸载）——死亡路标使命结束，目录收敛为三工具。历史对话中
 * 若模型仍凭记忆调 visualize_ui，将得到工具不存在错误并自行改选 panel。
 *
 * 维护纪律：改预设/能力/档位时同步 VISUAL_ROUTING.md + 三工具 description
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

/** 提取工具注册的主 description（三工具主 description 均以 Render 开头）。 */
function mainToolDescription(source: string): string {
  const match = source.match(/description: '(Render[^']*)'/)
  if (!match?.[1]) throw new Error('main tool description not found — check the extraction anchor (must start with Render)')
  return match[1]
}

const panelDescription = mainToolDescription(readPackageSource('panels', 'src', 'tool.ts'))
const artifactDescription = mainToolDescription(readPackageSource('artifact', 'src', 'index.ts'))
const widgetDescription = mainToolDescription(readPackageSource('widget', 'src', 'index.ts'))
const catalog: ReadonlyArray<readonly [string, string]> = [
  ['panel', panelDescription],
  ['html_artifact', artifactDescription],
  ['show_widget', widgetDescription],
]

describe('visual routing contract (VISUAL_ROUTING.md)', () => {
  it('catalog admits three visual tools (visualize_ui retired 2026-09-04)', () => {
    expect(catalog.map(([name]) => name)).toEqual(['panel', 'html_artifact', 'show_widget'])
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
    expect(matrix).toContain('已退役')
  })
})
