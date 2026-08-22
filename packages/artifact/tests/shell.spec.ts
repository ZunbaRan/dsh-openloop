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

describe('v2 openloop.fetch 桥（A2/A6）', () => {
  it('buildArtifactDocument 注入桥脚本：window.openloop.fetch 定义存在', () => {
    const doc = buildArtifactDocument('<div>hi</div>', 'T', 'network', 'tok123', { scheme: 'dark' })
    expect(doc).toContain('window.openloop')
    expect(doc).toContain('openloop-artifact:fetch')
    expect(doc).toContain('"tok123"')
  })
  it('桥脚本在所有 runtime 档注入（static 因 CSP 无脚本执行不生效，属文档化行为）', () => {
    const doc = buildArtifactDocument('<div>hi</div>', 'T', 'scripts', 'tok456', { scheme: 'light' })
    expect(doc).toContain('window.openloop')
  })
  it('marker 反映 runtime 档', () => {
    expect(buildArtifactDocument('<i/>', 'T', 'network', 'tk', { scheme: 'dark' })).toContain('content="network"')
  })
})
