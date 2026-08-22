/**
 * markdown 校验（fail-closed）：content 必填 1–10000 字符。
 */
import { asRecord, error, isNonEmptyString, validationFail, validationOk, type PresetValidation } from '../common.ts'

export function validateMarkdown(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'markdown props 必须是 JSON 对象')])
  if (!isNonEmptyString(root.content)) {
    return validationFail([error('content', 'content 必填，必须是非空字符串（1–10000 字符）')])
  }
  if (root.content.length > 10000) {
    return validationFail([error('content', `content 长度不得超过 10000 字符，当前 ${root.content.length}`)])
  }
  return validationOk()
}
