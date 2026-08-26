/**
 * PocketBase 进程管理（MVP 验证车，APP_PLATFORM_DESIGN §4.1/§4.2）：
 * - 二进制定位链：OPENLOOP_PB_BIN 环境变量 → `<DSH_HOME>/cache/pocketbase/<version>/pocketbase`
 *   （不存在则从 GitHub releases 下载 pin 版本，系统 unzip 解压）
 * - 数据落 `<DSH_HOME>/data/openloop-app/pb_data/`（DSH_HOME 级，跨 profile 共享——
 *   与 mcp.json 同级语义：boards/tiles 是用户数据，不该绑定单个 profile）
 * - superuser 凭据一次性生成存 `<DSH_HOME>/data/openloop-app/.superuser.json`（0600），
 *   只在插件进程内使用；Agent / 前端永远拿不到（门面隔离 + 凭据不回显）
 * - 启动顺序：superuser upsert（建库）→ 空闲端口探测 → serve → /api/health 轮询就绪
 * - stop()：SIGTERM → 3s 宽限 → SIGKILL（cordis dispose 钩子调用）
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'

/** pin 版本（验证车：升级需重验 superuser CLI / collections API 形态） */
export const PB_VERSION = 'v0.39.10'
const PB_VERSION_NUM = PB_VERSION.replace(/^v/, '')

export const SUPERUSER_EMAIL = 'openloop@local.app'

export interface PbLogger {
  info(msg: string): void
  warn(msg: string): void
  error(msg: string): void
}

export interface PbProcessOptions {
  dshHome?: string
  /** 二进制覆盖路径（测试 / 离线环境用） */
  binPath?: string
  logger?: PbLogger
  /** 进程退出回调（watchdog 接线；正常 stop() 不触发——intentional 语义由调用方持有） */
  onExit?: (code: number | null) => void
}

export interface SuperuserCredentials {
  email: string
  password: string
}

export interface RunningPb {
  baseUrl: string
  port: number
  dataDir: string
  credentials: SuperuserCredentials
  stop(): Promise<void>
}

const noopLogger: PbLogger = { info: () => {}, warn: () => {}, error: () => {} }

export function resolveDshHome(override?: string): string {
  return override ?? process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

/** 平台 → GitHub asset 名（不支持的平台返回 undefined，错误消息指引手动路径） */
export function pbAssetName(): string | undefined {
  const platform = process.platform
  const arch = process.arch
  if (platform === 'darwin' && arch === 'arm64') return `pocketbase_${PB_VERSION_NUM}_darwin_arm64.zip`
  if (platform === 'darwin' && arch === 'x64') return `pocketbase_${PB_VERSION_NUM}_darwin_amd64.zip`
  if (platform === 'linux' && arch === 'arm64') return `pocketbase_${PB_VERSION_NUM}_linux_arm64.zip`
  if (platform === 'linux' && arch === 'x64') return `pocketbase_${PB_VERSION_NUM}_linux_amd64.zip`
  return undefined
}

export function pbDownloadUrl(asset: string): string {
  return `https://github.com/pocketbase/pocketbase/releases/download/${PB_VERSION}/${asset}`
}

/** 运行子命令直到退出；非零退出码抛错（stderr 并入错误消息——面向用户可诊断） */
function runBin(bin: string, args: string[], timeoutMs = 30_000): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`pocketbase ${args[0]} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    child.stdout.on('data', d => { stdout += String(d) })
    child.stderr.on('data', d => { stderr += String(d) })
    child.on('error', err => { clearTimeout(timer); reject(err) })
    child.on('close', code => {
      clearTimeout(timer)
      resolve({ code: code ?? -1, stdout, stderr })
    })
  })
}

/** 二进制定位：覆盖路径 → 缓存命中 → 下载解压（系统 unzip） */
export async function ensureBinary(dshHome: string, override: string | undefined, logger: PbLogger): Promise<string> {
  if (override !== undefined && override.length > 0) {
    if (!existsSync(override)) throw new Error(`OPENLOOP_PB_BIN points to a missing file: ${override}`)
    return override
  }
  const cacheDir = join(dshHome, 'cache', 'pocketbase', PB_VERSION)
  const bin = join(cacheDir, 'pocketbase')
  if (existsSync(bin)) return bin

  const asset = pbAssetName()
  if (asset === undefined) {
    throw new Error(`no prebuilt PocketBase asset for ${process.platform}/${process.arch}. Download ${PB_VERSION} manually, place the binary anywhere and set OPENLOOP_PB_BIN=<path>.`)
  }

  mkdirSync(cacheDir, { recursive: true })
  const zipPath = join(cacheDir, asset)
  logger.info(`downloading PocketBase ${PB_VERSION} (${asset})…`)
  const response = await fetch(pbDownloadUrl(asset))
  if (!response.ok || response.body === null) {
    throw new Error(`failed to download PocketBase (${response.status}). Check network access to github.com, or set OPENLOOP_PB_BIN to a local binary.`)
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  writeFileSync(zipPath, bytes)

  // 解压：依赖系统 unzip（macOS / 主流 Linux 发行版预装）；失败给手动指引
  const unzip = await runBin('unzip', ['-o', zipPath, '-d', cacheDir])
  if (unzip.code !== 0 || !existsSync(bin)) {
    throw new Error(`failed to unzip ${zipPath} (unzip exit ${unzip.code}: ${unzip.stderr.trim().slice(0, 200)}). Unzip it manually and ensure ${bin} exists.`)
  }
  chmodSync(bin, 0o755)
  logger.info(`PocketBase binary ready at ${bin}`)
  return bin
}

/** superuser 凭据：读已有或生成随机密码（不回显给任何消费方） */
function ensureCredentials(dataRoot: string): SuperuserCredentials {
  const credPath = join(dataRoot, '.superuser.json')
  if (existsSync(credPath)) {
    try {
      const parsed = JSON.parse(readFileSync(credPath, 'utf8')) as SuperuserCredentials
      if (typeof parsed.email === 'string' && typeof parsed.password === 'string' && parsed.password.length >= 16) {
        return parsed
      }
    } catch { /* 损坏则重新生成 */ }
  }
  const credentials: SuperuserCredentials = { email: SUPERUSER_EMAIL, password: randomBytes(24).toString('hex') }
  writeFileSync(credPath, JSON.stringify(credentials), { mode: 0o600 })
  return credentials
}

/** 探测一个空闲 TCP 端口（listen 0 取随机 → 立即释放；存在与 serve 之间的竞态窗口，失败由调用方重试语义兜底） */
export async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address !== null ? address.port : 0
      server.close(() => { port > 0 ? resolve(port) : reject(new Error('failed to allocate a free port')) })
    })
  })
}

async function waitHealthy(baseUrl: string, timeoutMs: number, logger: PbLogger): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/health`)
      if (res.ok) return
    } catch { /* 未就绪，继续轮询 */ }
    await new Promise(r => setTimeout(r, 250))
  }
  throw new Error(`PocketBase did not become healthy within ${timeoutMs}ms (${baseUrl}/api/health)`)
}

/**
 * 启动 PocketBase：superuser upsert（建库）→ 空闲端口 → serve → 健康就绪。
 * 数据目录由调用方管理（dshHome 默认解析也在此导出供门面/路由复用）。
 */
export async function startPocketBase(options: PbProcessOptions = {}): Promise<RunningPb> {
  const logger = options.logger ?? noopLogger
  const dshHome = resolveDshHome(options.dshHome)
  const dataRoot = join(dshHome, 'data', 'openloop-app')
  const dataDir = join(dataRoot, 'pb_data')
  mkdirSync(dataDir, { recursive: true })

  const bin = await ensureBinary(dshHome, options.binPath, logger)
  const credentials = ensureCredentials(dataRoot)

  // superuser upsert 幂等（首次建库 / 后续改密——密码恒从凭据文件来，两者一致）
  const upsert = await runBin(bin, ['superuser', 'upsert', credentials.email, credentials.password, '--dir', dataDir])
  if (upsert.code !== 0) {
    throw new Error(`pocketbase superuser upsert failed (exit ${upsert.code}): ${(upsert.stderr || upsert.stdout).trim().slice(0, 300)}`)
  }

  const port = await findFreePort()
  const baseUrl = `http://127.0.0.1:${port}`
  // v0.39 实测：serve 的监听 flag 是 --http（--addr 不存在——传错时进程静默不监听，勿改回）
  const child: ChildProcess = spawn(bin, ['serve', '--http', `127.0.0.1:${port}`, '--dir', dataDir], {
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  let stderrTail = ''
  child.stderr?.on('data', d => {
    const text = String(d)
    stderrTail = (stderrTail + text).slice(-2000)
    logger.warn(`pocketbase: ${text.trim()}`)
  })
  let exited = false
  let onExit: ((code: number | null) => void) | undefined = options.onExit
  child.on('exit', code => {
    logger.info(`pocketbase exited (code ${code ?? 'null'})`)
    if (!exited) {
      exited = true
      // stop() 主动杀进程时先摘掉回调（意图性停止不触发 watchdog）
      onExit?.(code ?? null)
    }
  })

  const stop = async (): Promise<void> => {
    onExit = undefined
    if (child.exitCode !== null || child.signalCode !== null) return
    await new Promise<void>(resolve => {
      const killTimer = setTimeout(() => { child.kill('SIGKILL') }, 3000)
      child.on('exit', () => { clearTimeout(killTimer); resolve() })
      child.kill('SIGTERM')
      // 3s 宽限后 SIGKILL；再兜底 500ms
      setTimeout(() => { resolve() }, 3500)
    })
  }

  try {
    await waitHealthy(baseUrl, 30_000, logger)
  } catch (error) {
    await stop()
    throw new Error(`${error instanceof Error ? error.message : String(error)}; pocketbase stderr tail: ${stderrTail.slice(-400)}`)
  }
  logger.info(`pocketbase serving at ${baseUrl} (data: ${dataDir})`)
  return { baseUrl, port, dataDir, credentials, stop }
}
