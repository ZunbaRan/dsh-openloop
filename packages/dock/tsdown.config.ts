import type { UserConfig } from 'tsdown'
const id = '@openloop/dsh-dock'
const externals = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-runtime/client', '@deepseek-ai/dsh-client-ui-tool/client',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@openloop/dsh-base/client', '@openloop/dsh-panels/client', '@openloop/dsh-html-artifact/client',
  '@openloop/dsh-mcp/client',
]
export default [
  { entry: { index: 'src/index.ts' }, outDir: 'lib', format: ['esm'], platform: 'node', target: 'es2024', fixedExtension: false, dts: true, clean: true, deps: { neverBundle: ['@deepseek-ai/schemastery', '@deepseek-ai/cordis'] } },
  {
    entry: { client: 'src/client/index.tsx' }, outDir: 'lib', format: 'cjs', platform: 'browser', dts: false, clean: false,
    deps: { neverBundle: externals }, define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production') },
    outputOptions: { entryFileNames: 'client.js', banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`, footer: 'return module.exports; } });', intro: 'var module = { exports: {} }; var exports = module.exports;' },
  },
] satisfies UserConfig[]
