import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      '@gitroom/backend': fileURLToPath(
        new URL('../../apps/backend/src', import.meta.url)
      ),
      '@gitroom/frontend': fileURLToPath(
        new URL('../../apps/frontend/src', import.meta.url)
      ),
      '@gitroom/helpers': fileURLToPath(
        new URL('../../libraries/helpers/src', import.meta.url)
      ),
      '@gitroom/react': fileURLToPath(
        new URL('../../libraries/react-shared-libraries/src', import.meta.url)
      ),
      '@gitroom/nestjs-libraries': fileURLToPath(
        new URL('../../libraries/nestjs-libraries/src', import.meta.url)
      ),
    },
  },
  test: {
    include: ['tests/uploads/**/*.test.ts', 'tests/auth/**/*.test.ts'],
    environment: 'node',
    env: {
      CLOUDFLARE_ACCOUNT_ID: 'local-upload-test',
      CLOUDFLARE_ACCESS_KEY: 'local-test-key',
      CLOUDFLARE_SECRET_ACCESS_KEY: 'local-test-secret',
      CLOUDFLARE_BUCKETNAME: 'local-test-bucket',
      CLOUDFLARE_BUCKET_URL: 'https://media.example.test',
    },
  },
});
