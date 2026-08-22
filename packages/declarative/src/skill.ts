import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { BUNDLED_SKILL_RANK, type SkillCandidate, type SkillDefinition, type SkillProvider } from '@deepseek-ai/dsh-skill'

const body = new URL('../assets/declarative-skill.md', import.meta.url)
const resourceBase = { kind: 'directory', path: fileURLToPath(new URL('../assets/', import.meta.url)) } as const
const candidate: SkillCandidate = {
  name: 'openloop-visual-declarative',
  description: 'Choose and author bounded native Flow, Timeline, and Comparison documents for visualize_ui.',
  invocation: { modelInvocable: true, userInvocable: true },
  provider: 'openloop-visual-declarative', source: 'bundled', resourceBase, rank: BUNDLED_SKILL_RANK, locator: body,
}

export const declarativeSkillProvider: SkillProvider = {
  name: candidate.provider,
  list: () => Promise.resolve([candidate]),
  async get(): Promise<SkillDefinition> {
    return { ...candidate, content: await readFile(body, 'utf8') }
  },
}
