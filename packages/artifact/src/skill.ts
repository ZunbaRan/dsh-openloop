import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { BUNDLED_SKILL_RANK, type SkillCandidate, type SkillDefinition, type SkillProvider } from '@deepseek-ai/dsh-skill'
const body = new URL('../assets/artifact-skill.md', import.meta.url)
const resourceBase = { kind: 'directory', path: fileURLToPath(new URL('../assets/', import.meta.url)) } as const
const candidate: SkillCandidate = {
  name: 'openloop-html-artifact', description: 'Author free-form HTML pages for html_artifact: multi-panel explorers, simulations, custom topologies, fullscreen apps. Read when the user wants a full page rather than a dashboard (panel) or a small card (show_widget).',
  invocation: { modelInvocable: true, userInvocable: true }, provider: 'openloop-html-artifact', source: 'bundled', resourceBase,
  rank: BUNDLED_SKILL_RANK, locator: body,
}
export const artifactSkillProvider: SkillProvider = {
  name: candidate.provider, list: () => Promise.resolve([candidate]),
  async get(): Promise<SkillDefinition> { return { ...candidate, content: await readFile(body, 'utf8') } },
}
