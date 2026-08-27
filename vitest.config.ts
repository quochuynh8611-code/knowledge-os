import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Redirect Vite temp/cache dir away from node_modules/.vite-temp to avoid
  // EPERM errors in sandboxed or agent-mode environments where node_modules
  // may be read-only. .cache/vitest is project-local and safely writable.
  cacheDir: '.cache/vitest',
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'threads',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
