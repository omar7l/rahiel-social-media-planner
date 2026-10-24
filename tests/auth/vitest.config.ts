import { defineConfig } from 'vitest/config';
import mediaConfig from '../uploads/vitest.config';

export default defineConfig({
  ...mediaConfig,
  test: {
    include: ['tests/auth/**/*.test.ts'],
    environment: 'jsdom',
  },
});
