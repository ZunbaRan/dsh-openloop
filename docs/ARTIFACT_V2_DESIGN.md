# artifact 全栈化（v2）设计草案

> **状态**：草案，待用户批准后实施（用户已定方向：先于 codegen 做）
> **日期**：2026-08-22
> **定位宣言（用户拍板）**：panels = widget 组装（结构化、bounded、声明式）；**artifact = 完全自由的 HTML 页面**——像真实网页一样，页面各项行为完全可自定义。技术栈底座与 panels 统一（共享 theme 体系），theme 为**可选底座**而非强制。

## 1. 现状与差距

| 能力 | 现状（0.2.1） | 目标（v2） |
|---|---|---|
| 纯静态交互演示 | ✅ | ✅ 保持 |
| 外部 API 调用 | ❌ CSP `connect-src 'none'` | ✅ 宿主代理桥 |
| 本机 API 调用 | ❌ 断网 + 独立源 CORS | ✅ 宿主代理桥（宿主 Node 侧无 CORS） |
| 外部 UI 库/CSS | ❌ 禁远程资源 | ✅ 宿主本地 runtime 路由（+ CDN 可选档） |
| 主题 | 注入 --openloop-* + 默认 CSS | 保持 + skill 双档教学（预设 token / 完全自定义） |
| 可重放语义 | 文件 = 100% 静态回放 | 数据档 = 回放时重拉（与 panels 实时语义对齐）；纯静态档语义不变 |

## 2. 架构（决策已定：资源 B + API B，均复用 panels 已验证机制）

```
模型输入：title + runtime(static|scripts|network*) + html
                                        ↑ 新增 network 档（显式 opt-in 数据能力）
    ↓ 校验层（fail-closed）
  现有规则保持 + network 档附加：禁词扫描改为允许 openloop.fetch 桥调用
    ↓ execute
  内容寻址落盘（不变）
    ↓ 渲染层
  iframe（sandbox=allow-scripts，独立源）
  CSP 分档：
    static  → 现行 CSP（无脚本）
    scripts → 现行 CSP（unsafe-eval/wasm，断网）——纯本地计算页
    network → connect-src 'none' 依旧（ iframe 本身仍断网），
              联网经 openloop.fetch 桥 → 宿主服务端 fetch → 回注
  资源通道（network 档）：
    <script src="/openloop/runtime/react19.js">   ← 宿主本地路由（panels 同款）
    <link href="/openloop/runtime/pico.css">      ← 预置库清单（见 §4）
```

## 3. API 桥协议（openloop.fetch）

```js
// html 内（network 档自动注入桥脚本）
const res = await openloop.fetch('https://api.github.com/repos/deepseek-ai/deepseek-harness')
const data = await res.json()
// 本机 API 同样语法：
const local = await openloop.fetch('http://127.0.0.1:9090/metrics')  // 经宿主白名单
```

- 协议：postMessage `{ type: 'openloop-artifact:fetch', token, callId, url, init }` → 宿主校验 token → 服务端 fetch（**复用 panels 的 isForbiddenApiUrl SSRF 校验**）→ 回 `{ ok, status, body }` 或 `{ ok: false, error }`
- **本机 API 策略**：默认仍拒环回/内网（与 panels 同规）；新增 cordis Config `allowLoopbackOrigins: string[]`（部署级白名单，用户显式配置后本机 API 可用）——这满足「调本机 API」需求同时不默认开 SSRF 大门
- 超时/体积上限沿用 panels datasource 语义（10s/1MB/JSON）

## 4. 宿主 runtime 库清单（首批预置，走 /openloop/runtime/* 路由）

| 库 | 路由 | 用途 |
|---|---|---|
| react19 ESM + jsx 运行时 | /openloop/runtime/react19.js | 组件化页面（与 panels react18 车道并存的独立版本） |
| pico.css / preflight | /openloop/runtime/pico.css | 零类名语义样式底座 |
| lucide icons（sprite） | /openloop/runtime/lucide.js | 图标 |
| chart.js UMD | /openloop/runtime/chartjs.js | 图表（比手绘 SVG 强） |

- 版本锁定（immutable 缓存头，panels runtime 同款）；清单可经 cordis Config 扩展
- CDN 直连档（`assets: 'cdn'`）后置为 v2.1 可选项，不进首发

## 5. skill 重写要点（openloop-html-artifact）

1. **路由指引**：结构化数据面板 → panel 工具；自由页面/演示/交互应用/需要任意 CSS·JS·canvas → html_artifact
2. **主题双档教学**：无品牌倾向 → 用 `--openloop-*` 变量（白赚换肤跟手，与 8 预设联动）；有品牌色 → 完全自定义（不写 --openloop-* 即可，档 3 行为）
3. **runtime 三档选择**：无交互 static / 本地计算 scripts（wasm·canvas·模拟器）/ 需要 API 数据 network
4. **runtime 库清单速查**：预置路由表 + 「外部库默认不可用，需要时建议宿主预置」
5. openloop.fetch 用法示例 + 本机 API 需部署白名单的说明

## 6. 安全面变化声明（重要）

- `network` 档下 iframe 仍断网（CSP 不变），联网全部经宿主代理 → SSRF 校验统一、可审计
- unsafe-eval/wasm 与「宿主代理联网」的组合风险可控：代码执行在断网 iframe，数据经白名单通道进出
- 新增攻击面：桥协议本身（token 校验 + origin 校验 + 消息 schema 校验，复用 panels bridge 模式）
- replay 语义变化仅在 network 档（回放时重拉数据）；static/scripts 档承诺不变——skill 中明示

## 7. 实施步骤

| 步骤 | 内容 | 依赖 |
|---|---|---|
| A1 | contract: runtime 增加 'network' 档 + 校验规则 | — |
| A2 | shell: 桥脚本注入（openloop.fetch polyfill）+ CSP 保持 | A1 |
| A3 | 宿主 fetch 端：消息处理 + 复用 SSRF 校验 + allowLoopbackOrigins Config | A1 |
| A4 | runtime 库预置路由（4 个首批库 + Config 扩展点） | — |
| A5 | skill 重写（路由/双档/三档/库清单） | A1-A4 |
| A6 | 测试：桥协议单测（token/SSRF/超时/JSON-only）+ CSP 头断言 + golden 页面 | 全部 |
| A7 | 真机验收：外部 API 页 / 本机 API 页（白名单）/ React19 组件页 / 换肤双档页 | A6 |

## 8. 非目标

- 不做 artifact 内的数据绑定声明（那是 panels 领地——边界共识）
- 不做 artifact 的持久化 API/load 参数（文件本身即产物，天然可重开）
- CDN 直连档后置（v2.1）
- codegen（Python 生成器）继续排队（模型写 HTML 熟练，优先级低于 panels 的 JSON 场景）
