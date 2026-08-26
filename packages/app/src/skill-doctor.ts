/**
 * openloop-app-doctor skill（P3 自愈）：PB 门面故障的诊断决策树。
 * 与 openloop-app-backend skill 并列注册（后者管 CRUD 用法，本 skill 管健康）。
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { BUNDLED_SKILL_RANK, type SkillCandidate, type SkillDefinition, type SkillProvider } from '@deepseek-ai/dsh-skill'

const SKILL_NAME = 'openloop-app-doctor'

const resourceBase = { kind: 'directory', path: fileURLToPath(new URL('../assets/skills/', import.meta.url)) } as const

function createCandidate(): SkillCandidate {
  return {
    name: SKILL_NAME,
    description: 'OpenLoop 本地后端自愈：PocketBase 门面故障的诊断与修复（backend_health 查状态、对因修复、backend_restart 恢复）。app_backend 报 backend 未运行/failed、dock 降级提示、APP 页异常时先读——分诊表 + 熔断恢复路径。',
    invocation: { modelInvocable: true, userInvocable: true },
    provider: SKILL_NAME,
    source: 'bundled',
    resourceBase,
    rank: BUNDLED_SKILL_RANK,
    locator: new URL(`../assets/skills/${SKILL_NAME}/SKILL.md`, import.meta.url),
  }
}

export const appDoctorSkillProvider: SkillProvider = {
  name: SKILL_NAME,
  list: () => Promise.resolve([createCandidate()]),
  async get(): Promise<SkillDefinition> {
    const body = new URL(`../assets/skills/${SKILL_NAME}/SKILL.md`, import.meta.url)
    return { ...createCandidate(), content: await readFile(body, 'utf8') }
  },
}
