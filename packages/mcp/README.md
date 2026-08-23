# @openloop/dsh-mcp

DSH 的 MCP client 插件：把任意 MCP server 的工具/资源桥接给 Agent，支持
**MCP App**（HTML 资源展示）与 **MCP 2.0**（streamable-http era negotiation）。

## 配置 MCP server（多作用域 mcp.json，对齐 dsh-plugin-mcp）

插件**不带任何默认 server**。在以下任一位置创建 `mcp.json`（低 → 高，按 server id 覆盖）：

| 作用域 | 路径 | 场景 |
|---|---|---|
| 用户全局 | `$DSH_HOME/mcp.json`（缺省 `~/.dsh/mcp.json`） | 所有项目共享 |
| 项目本地 | `<项目>/.dsh/mcp.json` | 单项目作用域 |

格式：

```json
{
  "servers": {
    "tldraw": { "type": "http", "url": "http://127.0.0.1:39513/mcp" },
    "excalidraw": { "type": "http", "url": "https://mcp.excalidraw.com", "protocol": "legacy" },
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}" }
    }
  }
}
```

- `type`: `stdio`（command/args/env/cwd）| `http` | `sse`（后两者映射 streamable-http）
- 字符串值支持 `${ENV_VAR}` 插值（url/command/args/env/headers）
- `protocol` 可选：缺省 `auto`（探测 MCP 2026 → 回退 legacy）
- server 不可达不阻断启动（boot 容错 + 惰性重连自愈）
