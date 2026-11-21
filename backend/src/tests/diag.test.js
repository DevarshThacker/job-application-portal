import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Separate file so we can set DIAG_TOKEN before the config module loads.
describe('GET /api/diag with DIAG_TOKEN set', () => {
  it('requires the exact token and returns host info only then', async () => {
    vi.resetModules();
    process.env.DIAG_TOKEN = 'test-diag-token-123';
    const { createApp } = await import('../app.js');
    const app = createApp();
    expect((await request(app).get('/api/diag')).status).toBe(403);
    expect((await request(app).get('/api/diag').set('X-Diag-Token', 'wrong-token-1234567')).status).toBe(403);
    const ok = await request(app).get('/api/diag').set('X-Diag-Token', 'test-diag-token-123');
    expect(ok.status).toBe(200);
    expect(ok.body).toHaveProperty('hostname');
    delete process.env.DIAG_TOKEN;
  });
});
