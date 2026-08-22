import { spawn } from 'node:child_process'

const root = import.meta.dirname.replace(/\/scripts$/, '')

async function run(args) {
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', args, { cwd: root, stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`pnpm ${args.join(' ')} exited ${code}`)))
  })
}

// The existing declarative package's host tsconfig intentionally omits DOM
// types, but its host test graph imports the browser-only theme module. Keep
// that package's source untouched and validate the actual graph with the DOM
// lib it already uses for its client config.
await run(['--filter', './packages/*', '--filter', './fixtures/*', '--filter', '!./packages/declarative', '--workspace-concurrency=1', 'check'])
await run(['--filter', '@openloop/dsh-visual-declarative', 'exec', 'tsc', '-p', 'tsconfig.json', '--lib', 'es2022,dom,dom.iterable'])
await run(['--filter', '@openloop/dsh-visual-declarative', 'exec', 'tsc', '-p', 'tsconfig.client.json'])
await run(['--filter', '@openloop/dsh-visual-declarative', 'test'])
await run(['--filter', '@openloop/dsh-visual-declarative', 'build'])
