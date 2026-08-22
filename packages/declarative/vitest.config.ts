import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // theme 0.3.0 起 exports['./client'] 默认指向带 ModuleLoader banner 的构建产物（浏览器运行时装配壳），
      // 测试环境没有 window.__ModuleLoader__，需别名回源码。
      '@openloop/dsh-visual-theme/client': fileURLToPath(new URL('../theme/src/client.tsx', import.meta.url)),
      '@openloop/dsh-visual-theme': fileURLToPath(new URL('../theme/src/index.ts', import.meta.url)),
    },
  },
  test: { include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'] },
})
