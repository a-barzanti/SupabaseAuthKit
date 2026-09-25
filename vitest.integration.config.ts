import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.{test,spec}.{ts,tsx}'],
    globals: true,
    fileParallelism: false,
    // Reuse one Bun worker so sequential files and global fixture teardown finish.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    globalSetup: ['./tests/integration/global-setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/hooks': path.resolve(__dirname, './hooks'),
    },
  },
});
