import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['libs/**/*.spec.ts', 'apps/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@shared': path.resolve(root, 'libs/shared'),
      '@generated': path.resolve(root, 'generated'),
      '@emails': path.resolve(root, 'emails'),
      '@api': path.resolve(root, 'apps/api/src'),
    },
  },
});
