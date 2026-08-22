import type { UserConfig } from 'tsdown'

export default {
  entry: { server: 'src/server.ts' },
  outDir: 'dist',
  format: ['esm'],
  platform: 'node',
  target: 'es2022',
  fixedExtension: false,
  dts: false,
  clean: true,
  deps: { neverBundle: ['@modelcontextprotocol/sdk'] },
} satisfies UserConfig
