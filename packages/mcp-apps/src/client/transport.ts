import type { MessageExtraInfo, JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'
import { JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'
import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js'
import { isTrustedAppMessage } from '../security.ts'

export class SecurePostMessageTransport implements Transport {
  private readonly listener = (event: MessageEvent) => {
    if (!isTrustedAppMessage(event, this.eventSource, this.expectedOrigin)) return
    const parsed = JSONRPCMessageSchema.safeParse(event.data)
    if (!parsed.success) {
      this.onerror?.(new Error('MCP App message failed JSON-RPC validation'))
      return
    }
    this.onmessage?.(parsed.data, {} as MessageExtraInfo)
  }

  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void
  sessionId?: string
  setProtocolVersion?: (version: string) => void

  constructor(
    private readonly eventTarget: Window,
    private readonly eventSource: Window,
    private readonly expectedOrigin: string,
  ) {}

  async start(): Promise<void> {
    this.eventTarget.addEventListener('message', this.listener)
  }

  async send(message: JSONRPCMessage, _options?: TransportSendOptions): Promise<void> {
    this.eventSource.postMessage(message, this.expectedOrigin === 'null' ? '*' : this.expectedOrigin)
  }

  async close(): Promise<void> {
    this.eventTarget.removeEventListener('message', this.listener)
    this.onclose?.()
  }
}
