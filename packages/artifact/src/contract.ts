export const HTML_ARTIFACT_TOOL = 'html_artifact'
export const ARTIFACT_HEIGHT_MESSAGE = 'openloop-artifact:height'
export type ArtifactRuntime = 'static' | 'scripts'

export interface ArtifactMeta {
  kind: 'openloop.html-artifact'
  version: 1
  title: string
  runtime: ArtifactRuntime
  html: string
  path: string
}

const SKELETON = /<!doctype\b|<\s*(?:html|head|body)\b/iu
const REMOTE_URL = /(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\//iu
const SCRIPT = /<\s*script\b/iu
const EVENT_HANDLER = /\son[a-z]+\s*=/iu
const JAVASCRIPT_URL = /(?:href|src)\s*=\s*["']\s*javascript:/iu

export function validateArtifact(html: string, runtime: ArtifactRuntime, maxBytes: number): number {
  if (html.trim().length === 0) throw new Error('html_artifact content must not be empty')
  const size = new TextEncoder().encode(html).length
  if (size > maxBytes) throw new Error(`html_artifact content is ${size} bytes, over the ${maxBytes}-byte limit`)
  if (SKELETON.test(html)) throw new Error('html_artifact accepts body content only; the runtime owns the document skeleton')
  if (REMOTE_URL.test(html)) throw new Error('html_artifact remote src/href assets are disabled; inline or use data/blob URLs')
  if (JAVASCRIPT_URL.test(html)) throw new Error('html_artifact javascript: URLs are not allowed')
  if (runtime === 'static' && (SCRIPT.test(html) || EVENT_HANDLER.test(html))) {
    throw new Error('static html_artifact cannot contain scripts or inline event handlers; choose runtime="scripts" explicitly')
  }
  return size
}

export function artifactMetaFrom(value: unknown): ArtifactMeta | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  if (record.kind !== 'openloop.html-artifact' || record.version !== 1) return undefined
  if (typeof record.title !== 'string' || typeof record.html !== 'string' || typeof record.path !== 'string') return undefined
  if (record.runtime !== 'static' && record.runtime !== 'scripts') return undefined
  return { kind: 'openloop.html-artifact', version: 1, title: record.title, html: record.html, path: record.path, runtime: record.runtime }
}

export function slug(title: string): string {
  const value = title.toLowerCase().replaceAll(/[^a-z0-9]+/gu, '-').replaceAll(/^-+|-+$/gu, '').slice(0, 48)
  return value || 'artifact'
}

export function hash(text: string): string {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193)
  }
  return (value >>> 0).toString(16).padStart(8, '0')
}
