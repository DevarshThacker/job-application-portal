import { execSync } from 'node:child_process';
export default function teardown() {
  try { execSync('npm run cleanup:e2e --prefix backend', { stdio: 'inherit' }); } catch { /* best effort */ }
}
