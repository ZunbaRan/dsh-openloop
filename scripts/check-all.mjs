import { spawn } from 'node:child_process'

const root = import.meta.dirname.replace(/\/scripts$/, '')

async function run(args) {
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', args, { cwd: root, stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`pnpm ${args.join(' ')} exited ${code}`)))
  })
}

// declarative 已退役（2026-09-04 用户拍板：标记废弃 + 不再打包安装，dsh 已卸载）——
// 不再进 check 管线（源码保留作历史参考，其 host tsconfig 本就缺 DOM lib，
// 退役前也是靠排除 + 单独 tsc 保底；现保底一并取消）。死亡路标使命已结束，
// 路由目录收敛为三工具。
await run(['--filter', './packages/*', '--filter', './fixtures/*', '--filter', '!./packages/declarative', '--workspace-concurrency=1', 'check'])
