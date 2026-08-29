import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { BUNDLED_SKILL_RANK, type SkillCandidate, type SkillDefinition, type SkillProvider } from '@deepseek-ai/dsh-skill'

const body = new URL('../assets/widget-skill.md', import.meta.url)
const resourceBase = { kind: 'directory', path: fileURLToPath(new URL('../assets/', import.meta.url)) } as const
const candidate: SkillCandidate = {
  name: 'openloop-show-widget', description: 'Author small self-contained offline HTML widgets for show_widget: one focused simulator, calculator, or inline explanation. Read when the user wants a small card rather than a dashboard (panel) or a full page (html_artifact).',
  invocation: { modelInvocable: true, userInvocable: true }, provider: 'openloop-show-widget', source: 'bundled', resourceBase,
  rank: BUNDLED_SKILL_RANK, locator: body,
}
export const widgetSkillProvider: SkillProvider = {
  name: candidate.provider, list: () => Promise.resolve([candidate]),
  async get(): Promise<SkillDefinition> { return { ...candidate, content: await readFile(body, 'utf8') } },
}
