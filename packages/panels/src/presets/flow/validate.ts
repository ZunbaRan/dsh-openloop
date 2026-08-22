/**
 * flow 校验（fail-closed）。
 * 移植自 declarative document.ts validateFlow：
 * - nodes 2–12，id 唯一非空，label 必填 1–80 字符
 * - edges 1–20，from/to 必须引用已知节点，禁止自环
 * 错误消息面向 Agent 可自修正（指明路径与取值范围）。
 */
import {
  asRecord,
  error,
  isNonEmptyString,
  validationFail,
  validationOk,
  type PresetError,
  type PresetValidation,
} from '../common.ts'

const TONES = ['neutral', 'info', 'success', 'warning', 'error', 'danger'] as const // danger = declarative 兼容别名（渲染归一 error）

export function validateFlow(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'flow props 必须是 JSON 对象')])

  const errors: PresetError[] = []

  if (root.title !== undefined && (typeof root.title !== 'string' || root.title.length > 120)) {
    errors.push(error('title', 'title 必须是 ≤120 字符的字符串'))
  }
  if (root.description !== undefined && (typeof root.description !== 'string' || root.description.length > 360)) {
    errors.push(error('description', 'description 必须是 ≤360 字符的字符串'))
  }

  // nodes：先校验数组本身，再逐项；id 唯一集合留给 edges 引用检查
  if (!Array.isArray(root.nodes)) {
    errors.push(error('nodes', 'nodes 必填，必须是 2–12 个节点的数组'))
    return validationFail(errors)
  }
  if (root.nodes.length < 2 || root.nodes.length > 12) {
    errors.push(error('nodes', `nodes 数量必须为 2–12，当前 ${root.nodes.length}`))
  }

  const nodeIds = new Set<string>()
  const nodes: unknown[] = root.nodes
  nodes.forEach((raw, index) => {
    const path = `nodes[${index}]`
    const node = asRecord(raw)
    if (!node) {
      errors.push(error(path, '每个节点必须是 JSON 对象'))
      return
    }
    if (!isNonEmptyString(node.id)) {
      errors.push(error(`${path}.id`, 'id 必填，必须是非空字符串'))
    } else if (nodeIds.has(node.id)) {
      errors.push(error(`${path}.id`, `节点 id "${node.id}" 重复，nodes 内 id 必须唯一`))
    } else {
      nodeIds.add(node.id)
    }
    if (!isNonEmptyString(node.label)) {
      errors.push(error(`${path}.label`, 'label 必填，必须是非空字符串（1–80 字符）'))
    } else if (node.label.length > 80) {
      errors.push(error(`${path}.label`, `label 长度不得超过 80 字符，当前 ${node.label.length}`))
    }
    if (node.detail !== undefined && (typeof node.detail !== 'string' || node.detail.length > 240)) {
      errors.push(error(`${path}.detail`, 'detail 必须是 ≤240 字符的字符串'))
    }
    if (node.tone !== undefined && !(TONES as readonly string[]).includes(String(node.tone))) {
      errors.push(error(`${path}.tone`, 'tone 必须是 neutral / info / success / warning / error / danger 之一（danger 等同 error）'))
    }
  })

  // edges：引用完整性 + 禁自环
  if (!Array.isArray(root.edges)) {
    errors.push(error('edges', 'edges 必填，必须是 1–20 条边的数组'))
    return validationFail(errors)
  }
  if (root.edges.length < 1 || root.edges.length > 20) {
    errors.push(error('edges', `edges 数量必须为 1–20，当前 ${root.edges.length}`))
  }

  const edges: unknown[] = root.edges
  edges.forEach((raw, index) => {
    const path = `edges[${index}]`
    const edge = asRecord(raw)
    if (!edge) {
      errors.push(error(path, '每条边必须是 JSON 对象'))
      return
    }
    const fromOk = isNonEmptyString(edge.from)
    const toOk = isNonEmptyString(edge.to)
    if (!fromOk) errors.push(error(`${path}.from`, 'from 必填，必须是已知节点 id'))
    if (!toOk) errors.push(error(`${path}.to`, 'to 必填，必须是已知节点 id'))
    if (fromOk && toOk) {
      if (!nodeIds.has(edge.from as string)) {
        errors.push(error(`${path}.from`, `from 引用了未知节点 "${edge.from as string}"，必须是 nodes 中的 id`))
      }
      if (!nodeIds.has(edge.to as string)) {
        errors.push(error(`${path}.to`, `to 引用了未知节点 "${edge.to as string}"，必须是 nodes 中的 id`))
      }
      if (edge.from === edge.to) {
        errors.push(error(path, `禁止自环：边 "${edge.from as string}" 不能指向自身`))
      }
    }
    if (edge.label !== undefined && (typeof edge.label !== 'string' || edge.label.length > 60)) {
      errors.push(error(`${path}.label`, 'label 必须是 ≤60 字符的字符串'))
    }
  })

  return errors.length > 0 ? validationFail(errors) : validationOk()
}
