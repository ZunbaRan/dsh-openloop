/**
 * dock 的 panels/artifact external 懒桥（与 base-bridge 同款机制）：
 * 顶层 import 的评估期 require 在插件被禁用时炸 loader；这里函数体内
 * 懒 require + 失败不缓存，tile 渲染时按需取、缺失降级。
 */
type PanelsClientModule = typeof import('@openloop/dsh-panels/client')
type ArtifactClientModule = typeof import('@openloop/dsh-html-artifact/client')

let panelsCache: PanelsClientModule | undefined
let artifactCache: ArtifactClientModule | undefined

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
