import { describe, expect, it } from 'vitest'
import { artifactMetaFrom, hash, slug, validateArtifact } from '../src/contract.ts'

describe('artifact contract', () => {
  it('separates static and scripts policy', () => {
    expect(() => validateArtifact('<section>safe</section>', 'static', 1000)).not.toThrow()
    expect(() => validateArtifact('<button onclick="go()">x</button>', 'static', 1000)).toThrow(/static/)
    expect(() => validateArtifact('<button onclick="go()">x</button><script>function go(){}</script>', 'scripts', 1000)).not.toThrow()
  })
  it('rejects remote assets and document skeletons', () => {
    expect(() => validateArtifact('<img src="https://x.test/a.png">', 'static', 1000)).toThrow(/remote/)
    expect(() => validateArtifact('<body>x</body>', 'static', 1000)).toThrow(/body content/)
  })
  it('uses stable safe file names', () => {
    expect(slug('TCP 三次握手 / Demo')).toBe('tcp-demo')
    expect(hash('same')).toMatch(/^[0-9a-f]{8}$/u)
    expect(hash('same')).toBe(hash('same'))
  })
  it('narrows durable replay metadata', () => {
    expect(artifactMetaFrom({ kind: 'openloop.html-artifact', version: 1, title: 'A', runtime: 'static', html: '<p>A</p>', path: 'artifacts/a.html' })?.runtime).toBe('static')
    expect(artifactMetaFrom({ kind: 'openloop.html-artifact', version: 2 })).toBeUndefined()
  })
})
