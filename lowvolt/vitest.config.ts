import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The parent repo (an unrelated Vite app) has a postcss.config.js that Vite
  // would otherwise walk up and find. LowVolt has no CSS pipeline.
  css: { postcss: { plugins: [] } },
  test: {
    include: ['packages/**/test/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@lowvolt/schema': new URL('./packages/schema/src/index.ts', import.meta.url).pathname,
      '@lowvolt/catalog': new URL('./packages/catalog/src/index.ts', import.meta.url).pathname,
      '@lowvolt/rule-engine': new URL('./packages/rule-engine/src/index.ts', import.meta.url).pathname,
    },
  },
});
