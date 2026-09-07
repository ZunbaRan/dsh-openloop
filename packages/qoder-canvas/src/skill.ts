/**
 * canvas 插件的 skill 通道（0.9.3）：
 *
 * 1. canvasSkillProvider —— 插件内含 skill（canvas 使用哲学 + companion 清单），
 *    artifact 包同款 15 行模板（registerProvider 不依赖 skill-filesystem——
 *    AGENTS.md #22 沉淀：那是 preset 级磁盘扫描器，默认禁用；registry/catalog/skill
 *    工具链路在当前配置下是活的）
 * 2. localSkillsProvider —— 轻量目录扫描（替代被禁的 skill-filesystem）：
 *    扫 $DSH_HOME/skills/<name>/SKILL.md，用户自行 clone 的社区 skill 自动入册。
 *    简化语义：list 每次实扫（无缓存）；frontmatter 只解析单行 name/description/
 *    whenToUse（多行折叠语法不支持——解析失败的 skill 跳过并告警，不炸 provider）
 */
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BUNDLED_SKILL_RANK, type SkillCandidate, type SkillDefinition, type SkillProvider } from '@deepseek-ai/dsh-skill'

// ---------------------------------------------------------------------------
// ① 插件内含 skill（canvas 自身）
// ---------------------------------------------------------------------------

const bundledBody = new URL('../assets/canvas-skill.md', import.meta.url)
const bundledResourceBase = { kind: 'directory', path: fileURLToPath(new URL('../assets/', import.meta.url)) } as const

const canvasCandidate: SkillCandidate = {
  name: 'canvas-design',
  description: 'Author canvas panels (dashboards, designs, prototypes, PPT, diagrams) via the canvas tool: mixed DSL nodes + sandboxed html nodes with element-level annotation feedback. Read before authoring rich layouts or iterating user-annotated canvases.',
  whenToUse: 'canvas 工具建布/续编/处理画布标注时；html 节点风格选择时（含 companion skill 路由表）',
  invocation: { modelInvocable: true, userInvocable: true },
  provider: 'openloop-qoder-canvas-bundled',
  source: 'bundled',
  resourceBase: bundledResourceBase,
  rank: BUNDLED_SKILL_RANK,
  locator: bundledBody,
}

export const canvasSkillProvider: SkillProvider = {
  name: canvasCandidate.provider,
  list: () => Promise.resolve([canvasCandidate]),
  async get(): Promise<SkillDefinition | undefined> {
    return { ...canvasCandidate, content: await readFile(bundledBody, 'utf8') }
  },
}

// ---------------------------------------------------------------------------
// ② 目录扫描 provider（$DSH_HOME/skills/<name>/SKILL.md）
// ---------------------------------------------------------------------------

const LOCAL_RANK = 100 // 对齐 skill-filesystem 的 project 根语义（README rank 表）

function localSkillsRoot(): string {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'skills')
}

/** 简化 frontmatter 解析：只认单行 `key: value`（多行折叠语法跳过该 skill） */
function parseFrontmatter(raw: string): { name: string; description: string; whenToUse?: string | undefined } | null {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)
  if (m === null) return null
  let name: string | undefined
  let description: string | undefined
  let whenToUse: string | undefined
  for (const line of (m[1] ?? '').split(/\r?\n/)) {
    const kv = /^([a-zA-Z-]+):\s*(.+)$/.exec(line.trim())
    if (kv === null) continue
    const val = (kv[2] ?? '').trim().replace(/^['"]|['"]$/g, '')
    if (val.length === 0) continue
    const key = (kv[1] ?? '').toLowerCase()
    if (key === 'name' && name === undefined) name = val
    else if (key === 'description' && description === undefined) description = val
    else if (key === 'whentouse' && whenToUse === undefined) whenToUse = val
  }
  if (name === undefined || description === undefined) return null
  return whenToUse !== undefined ? { name, description, whenToUse } : { name, description }
}

/** 提取 frontmatter 之后的正文（skill body 不含 frontmatter） */
function stripFrontmatter(raw: string): string {
  const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(raw)
  return m === null ? raw : raw.slice(m[0].length)
}

interface LocalLocator {
  readonly path: string
}

export const localSkillsProvider: SkillProvider = {
  name: 'openloop-qoder-canvas-local',
  list: async (options) => {
    const root = localSkillsRoot()
    if (!existsSync(root)) return []
    const signal = options.signal
    const out: SkillCandidate[] = []
    let dirs: string[]
    try {
      dirs = (await readdir(root, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name)
    } catch {
      return []
    }
    for (const dir of dirs) {
      if (signal?.aborted) break
      const skillPath = join(root, dir, 'SKILL.md')
      try {
        const raw = await readFile(skillPath, 'utf8')
        const fm = parseFrontmatter(raw)
        if (fm === null) continue
        out.push({
          name: fm.name,
          description: fm.description.slice(0, 300),
          ...(fm.whenToUse !== undefined ? { whenToUse: fm.whenToUse.slice(0, 200) } : {}),
          invocation: { modelInvocable: true, userInvocable: true },
          provider: localSkillsProvider.name,
          source: 'bundled',
          path: skillPath,
          rank: LOCAL_RANK,
          locator: { path: skillPath } satisfies LocalLocator,
        })
      } catch {
        // 无 SKILL.md / 读失败——跳过该目录（软链目录 SKILL.md 在内层时也会走到这）
      }
    }
    return out
  },
  async get(candidate): Promise<SkillDefinition | undefined> {
    const loc = candidate.locator as LocalLocator | undefined
    if (loc === undefined || typeof loc.path !== 'string') return undefined
    try {
      const raw = await readFile(loc.path, 'utf8')
      return { ...candidate, content: stripFrontmatter(raw) }
    } catch {
      return undefined
    }
  },
}
