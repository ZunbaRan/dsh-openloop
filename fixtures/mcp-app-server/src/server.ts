import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const TOOL_NAME = 'mcp_app_tool'
const RESOURCE_URI = 'ui://fixture/mcp-app.html'
const MIME_TYPE = 'text/html;profile=mcp-app'

const APP_HTML = `
<style>
  :root { color-scheme: light dark; font: 14px system-ui, sans-serif; }
  body { margin: 0; padding: 16px; background: transparent; color: CanvasText; }
  #result { padding: 16px; border: 1px solid color-mix(in srgb, CanvasText 20%, transparent); border-radius: 14px; background: color-mix(in srgb, Canvas 88%, #5b8cff 12%); box-shadow: 0 8px 24px color-mix(in srgb, CanvasText 10%, transparent); }
  .label { opacity: .68; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
  #text { margin-top: 7px; font-size: 16px; font-weight: 650; }
  .actions { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
  button { appearance: none; border: 0; border-radius: 999px; padding: 8px 13px; background: #2563eb; color: white; font: inherit; font-weight: 650; cursor: pointer; }
  button:hover { background: #1d4ed8; }
  #count { opacity: .72; font-variant-numeric: tabular-nums; }
</style>
<div id="result">
  <div class="label">MCP App fixture</div>
  <div id="text">Waiting for the shared MCP result…</div>
  <div class="actions"><button type="button" data-action="increment">Click to interact</button><span id="count">0 interactions</span></div>
</div>
<script>
  (() => {
    const tokenKey = '__openloop_dsh_mcp_token';
    const token = window[tokenKey];
    let nextId = 1;
    let initializeId;
    const send = (message) => window.parent.postMessage({ ...message, [tokenKey]: token }, '*');
    const text = document.getElementById('text');
    const count = document.getElementById('count');
    const increment = document.querySelector('[data-action="increment"]');
    let interactions = 0;
    const reportSize = () => send({ jsonrpc: '2.0', method: 'ui/notifications/size-changed', params: { height: document.body.scrollHeight } });
    increment.addEventListener('click', () => {
      interactions += 1;
      count.textContent = interactions + (interactions === 1 ? ' interaction' : ' interactions');
    });
    const initialize = () => {
      initializeId = nextId++;
      send({ jsonrpc: '2.0', id: initializeId, method: 'ui/initialize', params: {
        protocolVersion: '2026-01-26',
        appInfo: { name: 'OpenLoop MCP App Fixture', version: '0.1.0' },
        appCapabilities: { availableDisplayModes: ['inline'] }
      }});
    };
    window.addEventListener('message', (event) => {
      if (event.source !== window.parent || event.data?.[tokenKey] !== token) return;
      const data = { ...event.data };
      delete data[tokenKey];
      if (data.id === initializeId && data.result) {
        send({ jsonrpc: '2.0', method: 'ui/notifications/initialized', params: {} });
        reportSize();
      }
      if (data.method === 'ui/notifications/tool-result') {
        const part = data.params?.content?.find((item) => item?.type === 'text');
        text.textContent = data.params?.structuredContent?.label || part?.text || 'The shared MCP tool returned no text.';
        reportSize();
      }
      if (data.method === 'ui/notifications/tool-input') reportSize();
    });
    initialize();
  })();
</script>`

const server = new Server(
  { name: 'OpenLoop MCP App Fixture', version: '0.1.0' },
  {
    capabilities: {
      tools: { listChanged: false },
      resources: { listChanged: false, subscribe: false },
    },
  },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: TOOL_NAME,
    description: 'Return a text fallback and render the same result in a sandboxed MCP App.',
    inputSchema: {
      type: 'object',
      properties: { label: { type: 'string', description: 'Label shown by the interactive fixture.' } },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: { label: { type: 'string' }, rendered: { type: 'boolean' } },
      required: ['label', 'rendered'],
      additionalProperties: false,
    },
    _meta: {
      ui: {
        resourceUri: RESOURCE_URI,
        visibility: 'inline',
      },
      fixtureTool: true,
    },
  }],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== TOOL_NAME) {
    return { content: [{ type: 'text', text: `Unknown fixture tool: ${request.params.name}` }], isError: true }
  }
  const requested = request.params.arguments?.label
  const label = typeof requested === 'string' && requested.trim() ? requested.trim() : 'hello from the DSH MCP fixture'
  return {
    content: [{ type: 'text', text: `MCP fixture fallback: ${label}` }],
    structuredContent: { label, rendered: true },
    _meta: { fixtureResult: true, connection: 'shared' },
  }
})

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri !== RESOURCE_URI) return { contents: [] }
  return {
    contents: [{
      uri: RESOURCE_URI,
      mimeType: MIME_TYPE,
      text: APP_HTML,
      _meta: {
        ui: {
          resourceUri: RESOURCE_URI,
          csp: { connectDomains: [], resourceDomains: [], scriptDomains: [], styleDomains: [] },
          permissions: {},
        },
        fixtureResource: true,
      },
    }],
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
