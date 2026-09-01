#!/usr/bin/env bash
# 重打 agent-sdk teardown 崩溃补丁
# 背景：@tencent-ai/agent-sdk 的 ProcessTransport 在 CodeBuddy CLI 子进程退出后，
#       收尾的 MCP 控制响应 writeLine 会同步抛 "Transport not started"（或异步 EPIPE），
#       uncaughtException 直接杀死 pi 宿主进程。表现为「回答正常返回、回合结束后 pi 退出」。
# 详见 patches/agent-sdk-teardown-crash.patch 与 AGENTS.md「已知问题」节。
set -euo pipefail

TARGET="${HOME}/.pi/agent/npm/node_modules/@tencent-ai/agent-sdk/lib/transport/process-transport.js"
PATCH="$(cd "$(dirname "$0")" && pwd)/agent-sdk-teardown-crash.patch"

if [[ ! -f "$TARGET" ]]; then
  echo "✗ 目标文件不存在: $TARGET"
  echo "  （pi-codebuddy-sdk 扩展可能未安装或路径变更，先确认扩展仍在 settings.json）"
  exit 1
fi

if grep -q "tryWriteLine" "$TARGET" 2>/dev/null && grep -q "stdin.on('error'" "$TARGET" 2>/dev/null; then
  echo "✓ 补丁已在位，无需重打"
  exit 0
fi

echo "→ 打补丁: $TARGET"
# 先备份本次的原始文件（带时间戳，幂等不覆盖旧备份）
if [[ ! -f "${TARGET}.orig-backup" ]]; then
  cp "$TARGET" "${TARGET}.orig-backup"
  echo "  已备份原始文件 → ${TARGET}.orig-backup"
fi

patch --quiet "$TARGET" < "$PATCH"

# 验证
node --check "$TARGET"
grep -q "tryWriteLine" "$TARGET"
grep -q "stdin.on('error'" "$TARGET"
echo "✓ 补丁应用成功（语法 OK + 两处修复点均在位）"
echo "  重启 pi 后生效。"
