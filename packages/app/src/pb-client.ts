/**
 * PocketBase admin REST 极薄封装（门面专用）：
 * - superuser token 登录 + 自动随请求携带；401 时重登一次再重试（token 过期自愈）
 * - 错误归一为面向 Agent 的可自修正消息（状态码 + PB 的 message/data 摘要）
 * - 只暴露 request()——collections/records 的具体语义由 schema.ts / facade.ts 组织
 */
import type { SuperuserCredentials } from './pb-process.ts'

export class PbRequestError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'PbRequestError'
    this.status = status
  }
}

export interface PbClient {
  request<T = unknown>(method: string, path: string, body?: unknown): Promise<T>
}

export function createPbClient(baseUrl: string, credentials: SuperuserCredentials): PbClient {
  let token: string | null = null

  const auth = async (): Promise<string> => {
    const res = await fetch(`${baseUrl}/api/collections/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: credentials.email, password: credentials.password }),
    })
    const payload = await res.json().catch(() => ({})) as { token?: unknown; message?: unknown }
    if (!res.ok || typeof payload.token !== 'string') {
      throw new PbRequestError(res.status, `pocketbase superuser auth failed (${res.status}): ${String(payload.message ?? 'no token in response')}`)
    }
    token = payload.token
    return token
  }

  const rawRequest = async (method: string, path: string, body: unknown, useToken: string | null): Promise<Response> => {
    const headers: Record<string, string> = {}
    if (useToken !== null) headers.Authorization = useToken
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const init: RequestInit = { method, headers }
    if (body !== undefined) init.body = JSON.stringify(body)
    return fetch(`${baseUrl}${path}`, init)
  }

  const describeFailure = async (res: Response, method: string, path: string): Promise<string> => {
    const payload = await res.json().catch(() => ({})) as { message?: unknown; data?: unknown }
    const detail = payload.message !== undefined ? `: ${String(payload.message)}` : ''
    const fieldErrors = payload.data !== undefined && typeof payload.data === 'object' && payload.data !== null
      ? ` (${JSON.stringify(payload.data).slice(0, 200)})`
      : ''
    return `pocketbase ${method} ${path} failed (${res.status})${detail}${fieldErrors}`
  }

  return {
    async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
      if (token === null) await auth()
      let res = await rawRequest(method, path, body, token)
      if (res.status === 401) {
        token = await auth()
        res = await rawRequest(method, path, body, token)
      }
      if (!res.ok) throw new PbRequestError(res.status, await describeFailure(res, method, path))
      if (res.status === 204) return undefined as T
      const text = await res.text()
      return (text.length === 0 ? undefined : JSON.parse(text)) as T
    },
  }
}
