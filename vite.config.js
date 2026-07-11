import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// base: './' keeps asset paths relative. viteSingleFile inlines all JS/CSS into
// a single dist/index.html so the production build can be opened directly from
// the filesystem (double-click) — inline module scripts run under file://,
// unlike external ones which Chrome blocks. `npm run dev` is unaffected.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    // Everything inlines into one file; silence the (expected) large-chunk warning.
    chunkSizeWarningLimit: 4000,
  },
});
