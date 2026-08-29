/**
 * dock 的 panels/artifact/mcp external 懒桥（与 base-bridge 同款机制）：
 * 顶层 import 的评估期 require 在插件被禁用时炸 loader；这里函数体内
 * 懒 require + 失败不缓存，tile 渲染时按需取、缺失降级。
 *
 * MCP App tile 走 @openloop/dsh-mcp/client（profile 单 client 模块原则：
 * mcp-apps 客户端内联在 mcp bundle 里，McpAppResourceView 由它 re-export）。
 */
type PanelsClientModule = typeof import('@openloop/dsh-panels/client')
type ArtifactClientModule = typeof import('@openloop/dsh-html-artifact/client')
type McpClientModule = typeof import('@openloop/dsh-mcp/client')

let panelsCache: PanelsClientModule | undefined
let artifactCache: ArtifactClientModule | undefined
let mcpCache: McpClientModule | undefined

export function getPanelsClient(): PanelsClientModule | undefined {
  if (panelsCache !== undefined) return panelsCache
  try {
    panelsCache = require('@openloop/dsh-panels/client') as PanelsClientModule
  } catch {
    return undefined
  }
  return panelsCache
}

export function getArtifactClient(): ArtifactClientModule | undefined {
  if (artifactCache !== undefined) return artifactCache
  try {
    artifactCache = require('@openloop/dsh-html-artifact/client') as ArtifactClientModule
  } catch {
    return undefined
  }
  return artifactCache
}

export function getMcpAppsClient(): McpClientModule | undefined {
  if (mcpCache !== undefined) return mcpCache
  try {
    mcpCache = require('@openloop/dsh-mcp/client') as McpClientModule
  } catch {
    return undefined
  }
  return mcpCache
}
