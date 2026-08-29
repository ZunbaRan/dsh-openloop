# 方向 1 · 第三方包协议 v1 草案（「刚刚好」版）

> ⛔ **本草案已废弃（2026-08-28 用户拍板 v2 取代）**：v2 = **复用 MCP Apps 2.0 作第三方包协议底座**——第三方包 = 一个实现 MCP Apps 2.0 的 server，DSH 是 client + 容器；connect = initialize 握手 + listTools 发现；render = `readResource` 渲染时取资源；API = 沙箱内 AppBridge 回环 callTool，**凭据归 server 自管永不过 DSH**。「包是安装时概念 / agent 即安装器」的 v1 模型不再实施。本文件保留作设计演进的历史参考。
>
> ⚠️ **凭据职责切分（v2 拍板时明确）**：v1 草案中 `registerApi` / `set_api_key` 等 API 资源体系**属方向 2 本地后端**（dsh-app / PocketBase 门面）的领地，**不进方向 1 第三方协议**——第三方 API = MCP tools，凭据由第三方 server 自管。v2 协议文档（待写）须维持这一划分。

> **状态**：设计提案（2026-08-27），等用户拍板后实施
> **定位**：第三方开发者按此规范交付「包」接入 DSH 工作台
> **设计哲学**：包是**安装时**概念，不是**运行时**概念——安装完成后，第三方组件与 agent 现场生成的组件在 registry 里**形态完全相同**，现有渲染/pin/溯源/刷新管线零改动全部复用

---

## 1. 核心洞察（为什么能这么简）

OCIX 原方案复杂在把「包」当运行时对象：签名、验签、发布者指纹、路由消解、市场目录。全部砍掉后重新审视：

- **信任**：本地单用户，用户手动放进来的包天然被信任（和你 `pnpm add` 一个包同级）——不需要签名体系
- **冲突**：命名即寻址（`acme-crm:dashboard` 全局唯一）已经消灭了消解问题
- **运行时**：entry 闭环已验收——registry 里的组件（PanelDefinition / artifact HTML）dock 直接渲染
- **安装**：agent 有 read 工具 + app_backend 工具——**agent 本身就是安装器**

所以 v1 协议 = **一个 manifest 约定 + 一份安装指引 skill**。没有包管理器、没有安装命令、没有新的运行时机制。

## 2. 包结构（manifest 尽量薄）

```
my-pack/                        # 任意目录名；放 workspace/ 或 DSH_HOME/packs/ 下
├── manifest.json               # 唯一必须的入口
├── SKILL.md                    # 唤起规则（自由 markdown；可选）
├── components/                 # 组件资源（被 manifest 引用）
│   ├── dashboard.json          # 完整 PanelDefinition
│   └── report.html             # 完整 HTML artifact（自包含文档）
└── apis.json                   # API 清单（可选；纯 API 包的核心）
```

### manifest.json（权威形状）

```jsonc
{
  "id": "acme-crm",                    // 包名（kebab-case，全局命名空间）
  "name": "Acme CRM",                  // 展示名
  "version": "0.1.0",
  "kind": "thirdparty",               // thirdparty | local（builtin 保留给 openloop）
  "description": "Acme 客户关系管理包",
  "skill": "SKILL.md",                // 相对路径引用（可选）
  "components": [                      // 前端资源（纯 API 包此数组为空/省略）
    {
      "rid": "acme-crm:dashboard",     // 必须 "<包id>:<组件名>"
      "kind": "panel",                 // panel | artifact
      "title": "客户看板",
      "file": "components/dashboard.json"   // 相对路径；安装时读文件内容内联进 entry
    }
  ],
  "apis": [                            // 可选；也可以单独放 apis.json 被这里引用
    {
      "rid": "acme-crm:customers",
      "domain": "api.acme.com",
      "path": "/v1/customers",
      "authType": "key",               // key | none
      "summary": "客户列表（分页 / 筛选）"
    }
  ]
}
```

**裁定：manifest 不内联组件内容，只引用文件**。安装时（agent）读文件 → 组装 entry → `register_component`。原因：PanelDefinition 可能很大（widgets 数组几十项），内联进 manifest 会让 manifest 不可读；而 agent 读两个文件毫无成本。

### 组件文件的两种形态

- **`*.json`（panel）**：完整 PanelDefinition——与 panel 工具生成物同构（`$schema: openloop.panel/v1`）。第三方用 33 个预设组合；自定义交互逻辑用 custom widget（沙箱 JSX）或直接做 artifact
- **`*.html`（artifact）**：自包含 HTML 文档。**默认 static 档**（无脚本）；需要 scripts/network 档必须在 manifest 组件条目声明 `"runtime": "scripts" | "network"`（opt-in，与 artifact 现有三档对齐——沙箱边界即信任边界）

### SKILL.md（自由 markdown）

无结构化 frontmatter 强制。开头建议两行语义（agent 解析用），其余自由：

```markdown
---
name: acme-crm-usage
description: 何时唤起 Acme CRM 的组件与 API
---
用户谈到客户管理 / 商机跟进 / 销售管道时……（自由正文，写给 agent 读）
```

安装时全文注册进 registry 的 `app.skill` 字段（facade 已有该字段，零改动）。

## 3. 安装流程（agent 即安装器）

**用户**：把包目录放进 workspace（如 `packs/acme-crm/`），然后对 dsh 说：

```
帮我安装 packs/acme-crm 这个包：读 manifest.json，按清单把组件注册进
app_backend（panel 组件把文件内容内联进 entry；artifact 组件把 HTML
内容装进 entry.artifact），API 资源也注册上，skill 内容写进 app 描述。
完成后 get_app 验证。
```

**agent 动作序列**（安装 skill 会把这个流程文档化）：
1. `read packs/acme-crm/manifest.json`
2. `read` 各组件文件 + SKILL.md
3. `app_backend upsert_app`（name=manifest.id，skill=SKILL.md 全文）
4. 逐组件 `register_component`（entry = 文件内容）
5. 逐 API `register_api`（+ 引导用户 `set_api_key`，如有 authType: key）
6. `get_app` 验收 → **P1 轻探 15s 内工作台自动出现**

**卸载** = `delete_app`（级联清理资源——facade 已有）。**升级** = 重新走安装（upsert 幂等）。

## 4. 四个开放问题的裁定（「刚刚好」答案）

| 问题 | 裁定 | 理由 |
|---|---|---|
| **分发形态** | 本地目录（workspace `packs/` 或任意路径）。不做 git/tarball/市场 | 用户拷文件夹 = 最直觉的信任动作；分发渠道等生态起量再说（YAGNI） |
| **artifact 档位** | 默认 static；scripts/network 须 manifest 显式声明 | 与 artifact 插件三档 opt-in 语义一致；默认安全 |
| **skill.md 格式** | 自由 markdown + 建议性 frontmatter | 结构化 schema 是过度设计——agent 读自由文本完全够 |
| **纯 API 包的面板生成** | agent 现场生成**不自动注册**；用户说「固定」才 persist + register | 避免 registry 被一次性生成物污染；registry 只收「成品」 |

**额外裁定——不碰 panels pack 重通道**：panels 已有 pack 系统（React ESM 组件 + 运行时车道），那是「重包」机制，v1 协议**不用它**。PanelDefinition + artifact HTML 覆盖 90% 第三方场景；要交付自定义 React 组件的，v2 再考虑桥接（或引导他们用 artifact scripts 档）。

## 5. 实施清单（极小）

| 项 | 工作量 | 说明 |
|---|---|---|
| **dock：entryArtifactOf** | ~1h | entry 的 artifact 形态识别（`{ kind:'openloop.html-artifact', version, title, runtime, html, path }` = ArtifactMeta）→ pin 走 ArtifactFrame。panel/artifact 两条 entry 路径并列 |
| **skill：openloop-pack-install** | ~0.5h | 安装流程文档（上面 §3 的正式化）+ 卸载/升级语义 |
| **示例包：examples/acme-demo** | ~0.5h | 一个最小可安装包（1 panel + 1 artifact + 1 API + skill）——验收用 + 给第三方当模板 |
| **（可选）manifest 校验** | ~1h | app_backend 加 `install_manifest` action（读路径+校验+注册一步到位）。**v1 可先不做**——agent 手动流程跑顺了再固化 |

**合计 ~2.5h**（不含可选项）。没有新依赖、没有新运行时机制、没有新的安全面。

## 6. 明确不做（v1）

- 签名 / 验签 / 发布者指纹（信任 = 用户手动放置）
- 市场目录 / 注册中心（分发 = 拷目录）
- 包管理器 / install 命令（安装 = agent prompt）
- panels pack 桥接（重包通道）
- 版本依赖解析（registry 记 version 字段仅展示；同 id upsert = 覆盖）
