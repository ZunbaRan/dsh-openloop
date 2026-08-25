/**
 * openloop-app-backend skill（skill 即 API 文档——插件设计四原则之二）。
 * content 为 assets/skills/openloop-app-backend/SKILL.md（bundled asset；src 下的
 * .md 不进 lib 的教训见 panels skills 注释）。
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { BUNDLED_SKILL_RANK, type SkillCandidate, type SkillDefinition, type SkillProvider } from '@deepseek-ai/dsh-skill'

const SKILL_NAME = 'openloop-app-backend'

const resourceBase = { kind: 'directory', path: fileURLToPath(new URL('../assets/skills/', import.meta.url)) } as const

export const appBackendSkillProvider: SkillProvider = {
  name: SKILL_NAME,
  list: () => Promise.resolve([createCandidate()]),
  async get(): Promise<SkillDefinition> {
    const body = new URL(`../assets/skills/${SKILL_NAME}/SKILL.md`, import.meta.url)
    return { ...createCandidate(), content: await readFile(body, 'utf8') }
  },
}

function createCandidate(): SkillCandidate {
  return {
    name: SKILL_NAME,
    description: 'OpenLoop 本地应用后端（PocketBase 门面）：注册 APP/组件/API 资源、配置 API 凭据（只写不读）、存取看板与 tile。用 app_backend 工具前先读——action 清单、rid 命名规则（包名:组件名）与错误自修正指南。',
    invocation: { modelInvocable: true, userInvocable: true },
    provider: SKILL_NAME,
    source: 'bundled',
    resourceBase,
    rank: BUNDLED_SKILL_RANK,
    locator: new URL(`../assets/skills/${SKILL_NAME}/SKILL.md`, import.meta.url),
  }
}
