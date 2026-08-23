import { mkdir, readdir, rename, rm } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { spawn } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
const dist = resolve(root, 'dist')
await mkdir(dist, { recursive: true })

const packages = [
  ['packages', 'base'],
  ['packages', 'dock'],
  ['packages', 'declarative'],
  ['packages', 'widget'],
  ['packages', 'artifact'],
  ['packages', 'panels'],
  ['packages', 'mcp-runtime'],
  ['packages', 'mcp-tools'],
  ['packages', 'mcp-apps'],
  ['packages', 'mcp'],
  ['fixtures', 'mcp-app-server'],
]

for (const [directory, name] of packages) {
  const cwd = resolve(root, directory, name)
  const before = new Set((await readdir(cwd)).filter(file => file.endsWith('.tgz')))
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn('pnpm', ['pack'], { cwd, stdio: 'inherit' })
    child.once('error', rejectRun)
    child.once('exit', code => code === 0 ? resolveRun() : rejectRun(new Error(`pnpm pack failed for ${name}: ${code}`)))
  })
  const created = (await readdir(cwd)).filter(file => file.endsWith('.tgz') && !before.has(file))
  if (created.length !== 1) throw new Error(`expected one tarball for ${name}, found ${created.length}`)
  const source = resolve(cwd, created[0])
  const target = resolve(dist, basename(source))
  await rm(target, { force: true })
  await rename(source, target)
}
