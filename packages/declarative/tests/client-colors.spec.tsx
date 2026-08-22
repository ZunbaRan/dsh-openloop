import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ComparisonView } from '../src/client/DeclarativeCard.tsx'
import type { ComparisonDocument } from '../src/document.ts'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  Pill: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
}))

describe('declarative comparison colors', () => {
  it('uses the semantic selection foreground for every focused cell', () => {
    const document: ComparisonDocument = {
      kind: 'comparison',
      title: 'Options',
      columns: [
        { id: 'recommended', title: 'Recommended', subtitle: 'Best fit', recommended: true },
        { id: 'other', title: 'Other' },
      ],
      rows: [{ label: 'Cost', values: ['Low', 'High'] }],
    }

    const markup = renderToStaticMarkup(<ComparisonView document={document} />)
    const selectedCells = markup.match(/background:var\(--openloop-selection\)[^\"]*/g) ?? []

    expect(selectedCells).toHaveLength(2)
    for (const style of selectedCells) {
      expect(style).toContain('color:var(--openloop-selection-foreground)')
    }
  })
})
