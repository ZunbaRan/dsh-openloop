# 方向 1 · 第三方包协议 —— 历史草案（勿当现行协议）

> 🛑 **HISTORICAL / 非现行协议（2026-08-29 再确认）**
>
> 本文件是 **历史草案**，不是现行 Direction 1 协议。
>
> - **Direction 1 v2 仍在开发中，尚未完成。** 不要按本文件实施 connect / install，也不要写 v2 全文规范。
> - **下面的 v1 正文（manifest 约定、agent 即安装器、`register_api` / `set_api_key` 安装流程）不得当作当前协议来遵循或实现。**
> - 2026-08-28 拍板方向：v2 拟复用 MCP Apps 2.0 作第三方包协议底座（第三方包 = MCP Apps 2.0 server，DSH 是 client + 容器；凭据归 server 自管永不过 DSH）。该方向的 connect/install **尚未落地**。
> - **凭据职责切分**：v1 草案中的 `registerApi` / `set_api_key` 等 API 资源体系**属方向 2 本地后端**（dsh-app / PocketBase 门面），**不进方向 1 第三方协议**。方向 2 现有 `app_backend` `set_api_key` / `keySecret` 保持不动。
>
> 以下全文仅作设计演进的考古材料。读完不要去实现 §2–§5。

> **状态（历史）**：2026-08-27 设计提案。已被否决实施；v2 仍在开发。本文不得作为实施清单。
> **定位（历史）**：当时设想第三方按此规范交付「包」。现行 Direction 1 不走这条路。
> **设计哲学（历史）**：包是**安装时**概念，不是**运行时**概念——当时想让安装完成后第三方组件与 agent 现场生成的组件在 registry 里形态相同。v1 模型不再实施。

---

## 1. 核心洞察（为什么能这么简）

OCIX 原方案复杂在把「包」当运行时对象：签名、验签、发布者指纹、路由消解、市场目录。全部砍掉后重新审视：

- **信任**：本地单用户，用户手动放进来的包天然被信任（和你 `pnpm add` 一个包同级）——不需要签名体系
- **冲突**：命名即寻址（`acme-crm:dashboard` 全局唯一）已经消灭了消解问题
- **运行时**：entry 闭环已验收——registry 里的组件（PanelDefinition / artifact HTML）dock 直接渲染
- **安装**：agent 有 read 工具 + app_backend 工具——**agent 本身就是安装器**

所以 v1 协议 = **一个 manifest 约定 + 一份安装指引 skill**。没有包管理器、没有安装命令、没有新的运行时机制。
