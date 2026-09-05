/** 场景 ⑧ · artifact 价值场：两个预设给不了、但创作者真需要的整页组件 */

function SceneArtifact() {
  const [title, setTitle] = React.useState('我用 DSH 搭了个工作室（本系统）')
  const [playing, setPlaying] = React.useState(false)
  const [speed, setSpeed] = React.useState('1.0×')

  return (
    <div className="forms-scroll" data-screen-label="scene-artifact">
      <div className="forms-head">
        <h2>artifact 什么时候真有用 —— 两个创作者刚需场景</h2>
        <div className="sub">判断标准不是「想要好看的整页」，而是「预设契约在原理上表达不了」：平台品牌仿真、阅读型整页。这两个场景 data-table/flow/timeline 都给不了。</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
        {/* 发布预览 */}
        <div>
          <div className="form-col-head" style={{ marginBottom: 8 }}>
            <span className="fc-name">多平台发布预览</span>
            <span className="kind-badge local">artifact · scripts 档</span>
            <span className="mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--dsw-alias-label-caption)' }}>studio:publish-preview</span>
          </div>
          <PanelShell preset={null}>
            <div className="detail-section" style={{ borderTop: 0 }}>
              <div className="ol-field">
                <span className="fl">稿件标题 <span className="fh">改字即看三平台卡片效果</span></span>
                <input className="ol-input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="pf-row" style={{ padding: 0 }}>
                <div className="pf-card">
                  <div className="pf-cover" style={{ background: '#1f3a5f', height: 120 }}><span className="t">{title || '（无标题）'}</span></div>
                  <div className="pf-meta">
                    <div className="pf1">视频号 · 竖版沉浸卡</div>
                    <div className="pf2">封面 9:16 · 标题压底部 2 行 · 左下头像+昵称</div>
                  </div>
                </div>
                <div className="pf-card">
                  <div className="pf-cover" style={{ background: '#4a2d52', height: 120 }}><span className="t">{title || '（无标题）'}</span></div>
                  <div className="pf-meta">
                    <div className="pf1">B站 · 横版推荐卡</div>
                    <div className="pf2">封面 16:9 · 右下时长角标 · 标题在图下</div>
                  </div>
                </div>
                <div className="pf-card">
                  <div className="pf-cover" style={{ background: '#5f2d2d', height: 120 }}><span className="t">{title || '（无标题）'}</span></div>
                  <div className="pf-meta">
                    <div className="pf1">小红书 · 双列笔记卡</div>
                    <div className="pf2">封面 3:4 · 标题压图 · 关键词前置更优</div>
                  </div>
                </div>
              </div>
              <div className="ol-micro" style={{ marginTop: 10 }}>一稿多投前最后一眼：同标题在三平台卡片里的截断/压图效果不同——值得为它调整措辞。未来接 network 档可直接拉真实封面图。</div>
            </div>
          </PanelShell>
          <div className="gap-note" style={{ marginTop: 8 }}><b>为什么是 artifact</b>：三个平台卡片是三种品牌视觉契约，不是数据表/流程/时间线；且需要标题输入 → 三卡即时联动的整页交互。</div>
        </div>

        {/* 提词器 */}
        <div>
          <div className="form-col-head" style={{ marginBottom: 8 }}>
            <span className="fc-name">提词器</span>
            <span className="kind-badge local">artifact · scripts 档</span>
            <span className="mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--dsw-alias-label-caption)' }}>studio:teleprompter</span>
          </div>
          <div className="tp-mock" style={{ height: 240, borderRadius: 12, border: '1px solid var(--art-border)' }}>
            <span className="tp-hint">{playing ? `▸ 滚动中 · ${speed}` : '‖ 已暂停'}</span>
            <div style={playing ? { animation: `tp-scroll 12s linear infinite` } : undefined}>
              <div className="tp-line dim">开场三秒，我只问一个问题：</div>
              <div className="tp-line mid">你的内容管线，还在五个软件之间来回搬吗？</div>
              <div className="tp-line">这个工作室，是我用对话搭出来的。</div>
              <div className="tp-line mid">想法、稿件、排期、素材，全在一个地方。</div>
              <div className="tp-line dim">接下来三十秒，带你看它是怎么长的。</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <button className="ol-act-btn" onClick={() => setPlaying((p) => !p)}>{playing ? '暂停' : '播放'}</button>
            {['0.8×', '1.0×', '1.3×'].map((s) => (
              <button key={s} className={`multi-tag ${speed === s ? 'on' : ''}`} onClick={() => setSpeed(s)}>{s}</button>
            ))}
            <span className="ol-micro" style={{ marginLeft: 'auto' }}>全屏投到 iPad 即拍摄现场</span>
          </div>
          <div className="gap-note" style={{ marginTop: 8 }}><b>为什么是 artifact</b>：整页大字、自滚动、深底反白——是「阅读型设备页」而非数据组件；脚本内容来自 studio:drafts 的脚本文档字段。</div>
        </div>
      </div>

      <div>
        <div className="sec-label" style={{ marginBottom: 8 }}>artifact 适用判断（本系统结论）</div>
        <table className="matrix">
          <thead>
            <tr><th style={{ width: 180 }}>候选需求</th><th>预设能给吗</th><th>结论</th></tr>
          </thead>
          <tbody>
            <tr><td>想法/稿件/素材的列表与详情</td><td>能（data-table / 组合模式）</td><td className="dim">panel 预设，不做 artifact</td></tr>
            <tr><td>管线、排期、热度、概览</td><td>能（flow / timeline / heatmap / metric-grid）</td><td className="dim">panel 预设</td></tr>
            <tr><td>月历拖块改期</td><td>契约内给不了，但想留 panel 体系</td><td>panels-自由（custom code）</td></tr>
            <tr><td><b>多平台发布预览</b></td><td>原理上给不了（平台品牌仿真 + 整页联动）</td><td className="best">artifact ✓</td></tr>
            <tr><td><b>提词器</b></td><td>原理上给不了（阅读型设备整页）</td><td className="best">artifact ✓</td></tr>
            <tr><td><b>系统地图</b></td><td>拓扑 + 状态 + 导航中枢，契约外</td><td className="best">artifact ✓（场景⑦）</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

Object.assign(window, { SceneArtifact })
