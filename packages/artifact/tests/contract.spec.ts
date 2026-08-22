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

describe('v2 network 档（ARTIFACT_V2_DESIGN A1/A6）', () => {
  it('network 档接受脚本与事件处理器', () => {
    expect(() => validateArtifact('<div onclick="go()">x</div><script>1</script>', 'network', 600_000)).not.toThrow()
  })
  it('network 档仍拒绝远程资源与 javascript: URL', () => {
    expect(() => validateArtifact('<script src="https://cdn.example.com/x.js"></script>', 'network', 600_000)).toThrow(/remote/)
    expect(() => validateArtifact('<a href="javascript:x()">a</a>', 'network', 600_000)).toThrow(/javascript:/)
  })
  it('static 档拒绝脚本不变', () => {
    expect(() => validateArtifact('<script>1</script>', 'static', 1_000_000)).toThrow(/static/)
  })
  it('artifactMetaFrom 接受 network 档并回读', () => {
    const meta = artifactMetaFrom({ kind: 'openloop.html-artifact', version: 1, title: 't', runtime: 'network', html: '<b>x</b>', path: '/a/b.html' })
    expect(meta?.runtime).toBe('network')
  })
})
