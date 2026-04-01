import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
  },
  test: {
    include: ['test/**/*.test.js'],
  },
});
