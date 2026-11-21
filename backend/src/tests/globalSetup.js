import { execSync } from 'node:child_process';
import fs from 'node:fs';

export default function setup() {
  const base = process.env.DATABASE_URL || 'postgresql://jobportal:jobportal_dev_pw@localhost:5433/jobportal?schema=public';
  const url = process.env.TEST_DATABASE_URL || base.replace(/\/([^/?]+)(\?|$)/, '/$1_test$2');
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
  return () => fs.rmSync('./uploads-test', { recursive: true, force: true });
}
