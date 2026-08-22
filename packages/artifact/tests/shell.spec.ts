import { describe, expect, it } from 'vitest'
import { ARTIFACT_CSP, buildArtifactDocument } from '../src/shell.ts'
describe('artifact shell', () => {
  it('blocks network and marks the selected runtime', () => {
    expect(ARTIFACT_CSP).toContain("connect-src 'none'")
    expect(ARTIFACT_CSP).toContain("frame-src 'none'")
    const doc = buildArtifactDocument('<main>A</main>', 'Artifact', 'static', 'call', { scheme: 'light' })
    expect(doc).toContain('content="static"')
    expect(doc).toContain('<main>A</main>')
    const themed = buildArtifactDocument('<main>A</main>', 'Artifact', 'static', 'call', { scheme: 'dark', tokens: { 'chart-8': '#123456', primary: '#abcdef' } })
    expect(themed).toContain('--openloop-chart-8:#123456')
  })
})
