/**
 * 三个 skill 注册（D12 skill 三件套，§13）。
 * 参照 declarative/src/skill.ts 的 provider 模式：每个 skill 一个 provider，
 * content 为 src/skills/<name>/SKILL.md（bundled asset，经 ctx.skills.registerProvider 注入）。
 *
 * 注册顺序：预设风格指引（公共基础）→ Agent widget 编写指引（运行时注入）→ 外部组件包接入指引。
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { BUNDLED_SKILL_RANK, type SkillCandidate, type SkillDefinition, type SkillProvider } from '@deepseek-ai/dsh-skill'

interface PanelsSkillSpec {
  name: string
  description: string
  file: string
  /** 面向开发者而非运行时模型的 skill 置 false（不进模型目录） */
  modelInvocable?: boolean
}

const SKILL_SPECS: readonly PanelsSkillSpec[] = [
  {
    name: 'openloop-panels-style-guide',
    description: 'OpenLoop panels 预设风格开发指引：token 词汇表、三档 token 规则、半 token 化禁令与 Appica 审美参照。写预设组件/自定义 widget 样式前先读。',
    file: 'openloop-panels-style-guide/SKILL.md',
  },
  {
    name: 'openloop-panels-widget-authoring',
    description: 'OpenLoop panels Agent widget 编写指引：资源选择阶梯、全部预设组件 kind+props 速查、custom code 契约、数据绑定与面板构图硬规则。用户要仪表盘/监控看板/多指标汇总/流程图/对比图，或要保存复用面板时，调用 panel 工具前先读本 skill。',
    file: 'openloop-panels-widget-authoring/SKILL.md',
  },
  {
    name: 'openloop-panels-pack-guide',
    description: 'OpenLoop panels 外部组件包接入指引：pack manifest 契约、硬性约束、打包注册启用流程、主题桥接器与验收清单。接入外部组件包前先读。（面向开发者）',
    file: 'openloop-panels-pack-guide/SKILL.md',
    modelInvocable: false,
  },
]

// 打包后本模块合入 lib/index.js，故 ../assets/skills/ = 包根/assets/skills/（真机教训：src/ 下的 .md 不进 lib，曾致 ENOENT）
const resourceBase = { kind: 'directory', path: fileURLToPath(new URL('../assets/skills/', import.meta.url)) } as const

function createProvider(spec: PanelsSkillSpec): SkillProvider {
  const body = new URL(`../assets/skills/${spec.file}`, import.meta.url)
  const candidate: SkillCandidate = {
    name: spec.name,
    description: spec.description,
    invocation: { modelInvocable: spec.modelInvocable !== false, userInvocable: true },
    provider: spec.name,
    source: 'bundled',
    resourceBase,
    rank: BUNDLED_SKILL_RANK,
    locator: body,
  }
  return {
    name: candidate.provider,
    list: () => Promise.resolve([candidate]),
    async get(): Promise<SkillDefinition> {
      return { ...candidate, content: await readFile(body, 'utf8') }
    },
  }
}

export const panelsSkillProviders: readonly SkillProvider[] = SKILL_SPECS.map(createProvider)
