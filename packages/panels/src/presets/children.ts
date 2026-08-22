/**
 * 容器组件子 widget（children: JsonObject[]）共享校验（§6 组件间组合）。
 * 契约（0.2.4 放宽）：两层有界组合——
 *   布局容器（stack/grid/row/split）的 children 可为叶子组件 + 分组容器（card/section）；
 *   分组容器（card/section）的 children 仅叶子组件。
 * 结构性防递归：分组容器不可再含任何容器，深度恒 ≤ 3（面板 → 布局 → 分组 → 叶子）。
 * 每项为 WidgetUnit 形状（id + source.preset），props 过对应组件 schema 校验，非法项 fail-closed。
 */
import type { PresetKind } from '../contract.ts'
import { asRecord, error, type PresetError } from './common.ts'

/** 全部容器 kind（布局 + 分组） */
export const CONTAINER_KINDS: readonly PresetKind[] = ['card', 'section', 'stack', 'grid', 'row', 'split']

/** 布局容器：children 可含分组容器（card/section）与叶子 */
export const LAYOUT_KINDS: readonly PresetKind[] = ['stack', 'grid', 'row', 'split']

/** 分组容器：children 仅叶子（防递归的执行依据——分组内不可再出现任何容器） */
export const GROUP_KINDS: readonly PresetKind[] = ['card', 'section']

export function isLayoutKind(kind: PresetKind): boolean {
  return (LAYOUT_KINDS as readonly PresetKind[]).includes(kind)
}

export function isGroupKind(kind: PresetKind): boolean {
  return (GROUP_KINDS as readonly PresetKind[]).includes(kind)
}

/** children 数量上限（0–12，bounded） */
export const CHILDREN_MAX = 12

/** 运行时预设 kind 白名单（与 contract.ts PresetKind 逐字一致；不引 validation.ts 以免服务端依赖进 client） */
export const PRESET_KINDS: readonly PresetKind[] = [
  'text', 'markdown', 'heading', 'badge', 'tag', 'divider', 'avatar',
  'card', 'section', 'stack', 'grid', 'row', 'split', 'scroll-area',
  'metric', 'metric-grid', 'data-table', 'list', 'key-value', 'stat',
  'rating', 'empty-state', 'timeline',
  'chart', 'sparkline', 'gauge', 'funnel', 'heatmap',
  'flow', 'comparison', 'steps', 'tree',
  'callout', 'status', 'progress', 'skeleton',
  'tabs', 'accordion', 'pagination', 'tooltip',
]

export function isContainerKind(kind: PresetKind): boolean {
  return (CONTAINER_KINDS as readonly PresetKind[]).includes(kind)
}

/**
 * 校验容器 children（widget 子树）。
 * @param parentKind 发起调用的容器 kind：布局容器（stack/grid/row/split）允许子项为
 *   叶子 + 分组容器；分组容器（card/section）允许子项仅叶子。
 */
export function validateChildren(value: unknown, path: string, parentKind: PresetKind): PresetError[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) return [error(path, `${path} 必须是 widget 对象数组（0–${CHILDREN_MAX} 个）`)]
  if (value.length > CHILDREN_MAX) return [error(path, `${path} 数量上限为 ${CHILDREN_MAX}，当前 ${value.length}`)]

  const errors: PresetError[] = []
  const seenIds = new Set<string>()
  value.forEach((raw, index) => {
    const childPath = `${path}[${index}]`
    const widget = asRecord(raw)
    if (!widget) {
      errors.push(error(childPath, '子 widget 必须是 JSON 对象'))
      return
    }
    const id = widget.id
    if (typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      if (seenIds.has(id)) errors.push(error(`${childPath}.id`, `子 widget id "${id}" 在 children 内重复，需唯一`))
      seenIds.add(id)
    } else {
      errors.push(error(`${childPath}.id`, '子 widget id 必须为非空 kebab-case 字符串（小写字母、数字、单连字符）'))
    }

    const source = asRecord(widget.source)
    if (!source) {
      errors.push(error(`${childPath}.source`, '子 widget 缺少 source'))
      return
    }
    if (source.type !== 'preset') {
      errors.push(error(`${childPath}.source.type`, `子 widget 仅支持 preset source；pack/custom 需走沙箱车道，当前 "${String(source.type)}"`))
      return
    }
    const kind = source.kind
    if (typeof kind !== 'string' || !(PRESET_KINDS as readonly string[]).includes(kind)) {
      errors.push(error(`${childPath}.source.kind`, `子 widget kind "${String(kind)}" 不在预设白名单（§6.1 全 40 个）`))
      return
    }
    const presetKind = kind as PresetKind
    if (isContainerKind(presetKind)) {
      // 布局容器内允许分组容器（card/section）——两层有界组合；分组容器内一律拒绝任何容器
      const allowed = isLayoutKind(parentKind) && isGroupKind(presetKind)
      if (!allowed) {
        errors.push(error(
          `${childPath}.source.kind`,
          isGroupKind(parentKind)
            ? `分组容器 "${parentKind}" 的 children 仅支持叶子组件（"${kind}" 是容器，禁止嵌套）`
            : `布局容器 "${parentKind}" 的 children 不支持布局容器 "${kind}"（布局不可嵌套；可用分组容器 card/section 包一层）`,
        ))
        return
      }
    }
    const props = source.props === undefined ? {} : asRecord(source.props)
    if (props === null) {
      errors.push(error(`${childPath}.source.props`, '子 widget props 必须是 JSON 对象'))
      return
    }
  })
  return errors
}
