/**
 * composer-bridge：标注/action 草稿注入 DSH 输入框（M2 转正使用）。
 *
 * ── M0 spike 选型结论（2026-09-05，3085 实例真机实测）──
 *
 * composer 是 Lexical 编辑器（`[data-composer-input="true"]`，
 * `data-lexical-editor="true"`，contenteditable div，phase 属性 plain/auto）。
 *
 * ✅ 可靠路径（首选）：focus + `document.execCommand('insertText', false, text)`
 *    —— Lexical 覆写了 execCommand，写入其 model；实测 3 次注入全部成功，
 *    `\n` 换行保留；写入是异步的，读 textContent 需延迟。
 * ✅ 备用路径：`InputEvent('beforeinput', {inputType:'insertText', data})` 派发
 *    —— 实测同样生效（Lexical 监听 beforeinput），作为 execCommand 被未来
 *    内核禁用时的兜底。
 * ❌ 清空不可用：execCommand selectAll/delete 被 Lexical 拦截——
 *    注入语义定为「追加草稿」，不试图清空用户已有输入。
 * ⚠️ 时序：注入目标为输入框而非消息流——Agent streaming 中照常注入，
 *    用户自行决定何时发送（设计文档 §3.4 定死的「标注即草稿」语义）。
 *
 * 验证链路（全通）：注入 → 发送按钮激活（disabled=false）→ 点击发送 →
 * 消息以用户身份入流（data-chat-flow-kind=user）→ composer 自动清空。
 */
export interface ComposerInjectOptions {
  /** 注入失败的降级文案（剪贴板复制提示） */
  readonly fallbackHint?: string
}

/** 定位 composer 元素（data-* 语义选择器，0.1.2 实证存在） */
function findComposer(): HTMLElement | null {
  return document.querySelector('[data-composer-input="true"]')
}

/**
 * 向 composer 追加草稿文本。返回是否成功。
 *
 * 真机教训（2026-09-06，S7.1）：多行 insertText 在 DSH 的 Lexical 覆写里
 * 行为畸形——第一行总是跑到文档末尾（头部「画布标注 · ...」出现在消息
 * 最后而不是最前）。改为【逐行插入】（单行 insertText 行为 M0 验证可靠，
 * 行间用 insertParagraph 分段）。
 */
export function injectComposerDraft(text: string, _options?: ComposerInjectOptions): boolean {
  const el = findComposer()
  if (el === null) return false
  el.focus()
  const lines = text.split('\n')
  let ok = true
  for (let i = 0; i < lines.length; i += 1) {
    if (i > 0) {
      try { document.execCommand('insertParagraph', false) } catch { ok = false }
    }
    const line = lines[i]
    if (line !== undefined && line.length > 0) {
      try {
        const lineOk = document.execCommand('insertText', false, line)
        if (!lineOk) {
          // 单行兜底：beforeinput
          el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: line }))
        }
      } catch {
        ok = false
      }
    }
  }
  return ok
}

/** 审计上报（尽力而为：fire-and-forget，失败静默——注入不依赖端点，设计文档 §3.4） */
export function reportAnnotation(payload: { canvasId: string; revision: number; targets: readonly string[]; note: string }): void {
  try {
    void fetch('/qoder-canvas/annotate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => undefined)
  } catch { /* 端点不存在（headless）或网络异常——审计尽力而为 */ }
}
