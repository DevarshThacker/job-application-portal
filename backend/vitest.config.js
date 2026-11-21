import { defineConfig } from 'vitest/config';
import 'dotenv/config';

const base = process.env.DATABASE_URL || 'postgresql://jobportal:jobportal_dev_pw@localhost:5433/jobportal?schema=public';
const testUrl = process.env.TEST_DATABASE_URL || base.replace(/\/([^/?]+)(\?|$)/, '/$1_test$2');

export default defineConfig({
  test: {
    globalSetup: ['./src/tests/globalSetup.js'],
    include: ['src/tests/**/*.test.js'],
    fileParallelism: false,
    testTimeout: 20000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testUrl,
      JWT_SECRET: 'test-secret-test-secret-test-secret',
      UPLOAD_DIR: './uploads-test',
      STORAGE_DRIVER: 'local',
    },
  },
});
