import { validateJsonSchemaValue, valueSchemaSpecToJsonSchema } from '@deepseek-ai/dsh-tools'
import { DOCUMENT_SCHEMA, validateDocument, type DeclarativeDocument } from './document.ts'

const DOCUMENT_JSON_SCHEMA = valueSchemaSpecToJsonSchema(DOCUMENT_SCHEMA)

export function parseDocumentInput(input: unknown): DeclarativeDocument {
  let candidate = input
  if (typeof input === 'string') {
    if (new TextEncoder().encode(input).byteLength > 64_000) throw new Error('visualize_ui document JSON must be at most 64 KB')
    try {
      candidate = JSON.parse(input)
    } catch (error) {
      throw new Error(`visualize_ui document is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const violations = validateJsonSchemaValue(DOCUMENT_JSON_SCHEMA, candidate, 'document')
  if (violations.length > 0) throw new Error(`visualize_ui document is invalid: ${violations.join('; ')}`)
  const document = candidate as DeclarativeDocument
  validateDocument(document)
  return document
}
