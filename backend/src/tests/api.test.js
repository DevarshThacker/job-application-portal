import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, PDF, makeDocx, registerAgent, adminAgent, jobBody, uniq } from './helpers.js';
import { prisma } from '../config/db.js';

afterAll(async () => { await prisma.$disconnect(); });

describe('monitoring', () => {
  it('GET /api/health -> 200', async () => {
    const r = await request(app).get('/api/health');
    expect(r.status).toBe(200); expect(r.body.status).toBe('ok');
  });
  it('GET /api/ready checks database', async () => {
    const r = await request(app).get('/api/ready');
    expect(r.status).toBe(200); expect(r.body.database).toBe('up');
  });
  it('GET /api/diag is disabled (404) when DIAG_TOKEN is not configured', async () => {
    const r = await request(app).get('/api/diag').set('X-Diag-Token', 'anything');
    expect(r.status).toBe(404);
  });
  it('unknown route -> 404 JSON', async () => {
    const r = await request(app).get('/api/nope');
    expect(r.status).toBe(404); expect(r.body.error.code).toBe('NOT_FOUND');
  });
});

describe('auth', () => {
  it('registers candidate, sets httpOnly cookie, never returns hash', async () => {
    const email = uniq('c');
    const r = await request(app).post('/api/auth/register').send({ name: 'Cand', email, password: 'Passw0rd!x' });
    expect(r.status).toBe(201);
    expect(r.body.data.user.role).toBe('CANDIDATE');
    expect(JSON.stringify(r.body)).not.toMatch(/passwordHash/);
    const cookie = r.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(r.body.data.token).toBeUndefined();
  });
  it('rejects duplicate email (409)', async () => {
    const { email } = await registerAgent('CANDIDATE');
    const r = await request(app).post('/api/auth/register').send({ name: 'Dup', email, password: 'Passw0rd!x' });
    expect(r.status).toBe(409);
  });
  it('cannot self-register as ADMIN', async () => {
    const r = await request(app).post('/api/auth/register').send({ name: 'Evil', email: uniq('e'), password: 'Passw0rd!x', role: 'ADMIN' });
    expect(r.status).toBe(400);
  });
  it('validates weak password and missing recruiter company', async () => {
    let r = await request(app).post('/api/auth/register').send({ name: 'Weak', email: uniq('w'), password: 'short' });
    expect(r.status).toBe(400); expect(r.body.error.details.length).toBeGreaterThan(0);
    r = await request(app).post('/api/auth/register').send({ name: 'Rec', email: uniq('r'), password: 'Passw0rd!x', role: 'RECRUITER' });
    expect(r.status).toBe(400);
  });
  it('login valid / invalid / me / logout', async () => {
    const { email } = await registerAgent('CANDIDATE');
    const bad = await request(app).post('/api/auth/login').send({ email, password: 'wrongpass1' });
    expect(bad.status).toBe(401);
    const agent = request.agent(app);
    expect((await agent.post('/api/auth/login').send({ email, password: 'Passw0rd!x' })).status).toBe(200);
    expect((await agent.get('/api/auth/me')).body.data.user.email).toBe(email);
    expect((await agent.post('/api/auth/logout')).status).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
  it('protected route without cookie -> 401; garbage cookie -> 401', async () => {
    expect((await request(app).get('/api/dashboard/candidate')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Cookie', 'jp_token=garbage')).status).toBe(401);
  });
  it('deactivated user cannot log in or use existing session', async () => {
    const { agent, user, email } = await registerAgent('CANDIDATE');
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    expect((await agent.get('/api/auth/me')).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email, password: 'Passw0rd!x' })).status).toBe(403);
  });
  it('allows same-origin requests (Origin host equals Host header) but still rejects foreign origins', async () => {
    const same = await request(app).post('/api/auth/login').set('Host', 'portal.example.test').set('Origin', 'http://portal.example.test').send({ email: 'nobody@x.co', password: 'x' });
    expect(same.status).toBe(401); // reached the handler (bad creds), not blocked as FORBIDDEN_ORIGIN
    const foreign = await request(app).post('/api/auth/login').set('Host', 'portal.example.test').set('Origin', 'http://evil.example').send({ email: 'nobody@x.co', password: 'x' });
    expect(foreign.status).toBe(403);
  });
  it('rejects cross-origin state-changing requests', async () => {
    const r = await request(app).post('/api/auth/login').set('Origin', 'http://evil.example').send({ email: 'a@b.co', password: 'x' });
    expect(r.status).toBe(403);
  });
});

describe('role-based access', () => {
  it('candidate cannot create jobs or open recruiter/admin dashboards', async () => {
    const { agent } = await registerAgent('CANDIDATE');
    expect((await agent.post('/api/jobs').send(jobBody())).status).toBe(403);
    expect((await agent.get('/api/dashboard/recruiter')).status).toBe(403);
    expect((await agent.get('/api/dashboard/admin')).status).toBe(403);
    expect((await agent.get('/api/admin/users')).status).toBe(403);
  });
  it('recruiter cannot apply to jobs or view candidate dashboard', async () => {
    const { agent } = await registerAgent('RECRUITER');
    expect((await agent.get('/api/dashboard/candidate')).status).toBe(403);
    expect((await agent.post('/api/applications').send({})).status).toBe(403);
  });
});

describe('jobs', () => {
  let rec; let other;
  beforeAll(async () => { rec = await registerAgent('RECRUITER'); other = await registerAgent('RECRUITER'); });

  it('recruiter creates, edits, closes, reopens a job', async () => {
    const c = await rec.agent.post('/api/jobs').send(jobBody({ title: 'Unique Zebra Wrangler' }));
    expect(c.status).toBe(201); expect(c.body.data.companyName).toBe('TestCo');
    const id = c.body.data.id;
    expect((await rec.agent.patch(`/api/jobs/${id}`).send({ title: 'Zebra Wrangler II' })).body.data.title).toBe('Zebra Wrangler II');
    expect((await rec.agent.patch(`/api/jobs/${id}`).send({ status: 'CLOSED' })).body.data.status).toBe('CLOSED');
    const pub = await request(app).get('/api/jobs').query({ q: 'Zebra' });
    expect(pub.body.data.find((j) => j.id === id)).toBeUndefined();
    expect((await rec.agent.patch(`/api/jobs/${id}`).send({ status: 'OPEN' })).body.data.status).toBe('OPEN');
    const pub2 = await request(app).get('/api/jobs').query({ q: 'zebra' });
    expect(pub2.body.data.find((j) => j.id === id)).toBeTruthy();
  });
  it('validates job input', async () => {
    const r = await rec.agent.post('/api/jobs').send({ title: 'x' });
    expect(r.status).toBe(400);
  });
  it("blocks editing/deleting another recruiter's job", async () => {
    const id = (await rec.agent.post('/api/jobs').send(jobBody())).body.data.id;
    expect((await other.agent.patch(`/api/jobs/${id}`).send({ title: 'Hacked title' })).status).toBe(403);
    expect((await other.agent.delete(`/api/jobs/${id}`)).status).toBe(403);
    expect((await request(app).patch(`/api/jobs/${id}`).send({ title: 'Hacked title' })).status).toBe(401);
  });
  it('search, filter by type + location, pagination', async () => {
    const loc = `Zzville${Date.now()}`;
    await rec.agent.post('/api/jobs').send(jobBody({ title: 'Filter A', location: loc, employmentType: 'CONTRACT' }));
    await rec.agent.post('/api/jobs').send(jobBody({ title: 'Filter B', location: loc, employmentType: 'INTERNSHIP' }));
    let r = await request(app).get('/api/jobs').query({ location: loc.toLowerCase() });
    expect(r.body.meta.total).toBe(2);
    r = await request(app).get('/api/jobs').query({ location: loc, type: 'CONTRACT' });
    expect(r.body.data).toHaveLength(1); expect(r.body.data[0].title).toBe('Filter A');
    r = await request(app).get('/api/jobs').query({ location: loc, limit: '1', page: '2' });
    expect(r.body.data).toHaveLength(1); expect(r.body.meta.totalPages).toBe(2);
    expect((await request(app).get('/api/jobs').query({ type: 'BOGUS' })).status).toBe(400);
  });
  it('mine=true lists only own jobs; invalid id -> 400, unknown -> 404', async () => {
    const mine = await rec.agent.get('/api/jobs').query({ mine: 'true', limit: '50' });
    expect(mine.status).toBe(200);
    expect(mine.body.data.every((j) => j.recruiter.userId === rec.user.id)).toBe(true);
    expect((await request(app).get('/api/jobs/not-a-uuid')).status).toBe(400);
    expect((await request(app).get('/api/jobs/00000000-0000-4000-8000-000000000000')).status).toBe(404);
  });
});

describe('resumes', () => {
  let cand;
  beforeAll(async () => { cand = await registerAgent('CANDIDATE'); });
  it('accepts a valid PDF and a valid DOCX', async () => {
    const a = await cand.agent.post('/api/resumes').attach('resume', PDF, { filename: 'cv.pdf', contentType: 'application/pdf' });
    expect(a.status).toBe(201); expect(a.body.data.contentType).toBe('application/pdf'); expect(a.body.data.storageKey).toBeUndefined();
    const b = await cand.agent.post('/api/resumes').attach('resume', makeDocx(), { filename: 'cv.docx' });
    expect(b.status).toBe(201); expect(b.body.data.contentType).toMatch(/wordprocessingml/);
  });
  it('rejects wrong content disguised with a .pdf name', async () => {
    const r = await cand.agent.post('/api/resumes').attach('resume', Buffer.from('<?php echo 1; ?>'), { filename: 'evil.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(400);
  });
  it('rejects unsupported types (png / txt)', async () => {
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    expect((await cand.agent.post('/api/resumes').attach('resume', png, { filename: 'a.png' })).status).toBe(400);
    expect((await cand.agent.post('/api/resumes').attach('resume', Buffer.from('hello'), { filename: 'a.txt' })).status).toBe(400);
  });
  it('rejects files over 5 MB (413)', async () => {
    const big = Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024 + 10)]);
    const r = await cand.agent.post('/api/resumes').attach('resume', big, { filename: 'big.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(413);
  });
  it('requires a file', async () => {
    expect((await cand.agent.post('/api/resumes')).status).toBe(400);
  });
  it('sanitises path traversal in file names and keeps storage key safe', async () => {
    const r = await cand.agent.post('/api/resumes').attach('resume', PDF, { filename: '../../etc/passwd.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(201); expect(r.body.data.fileName).not.toMatch(/\.\.|\//);
    const row = await prisma.resume.findUnique({ where: { id: r.body.data.id } });
    expect(row.storageKey).toMatch(/^resumes\/[0-9a-f-]+\/[0-9a-f-]+\.pdf$/);
  });
});

describe('application workflow end-to-end', () => {
  let rec; let rec2; let cand; let cand2; let admin; let job; let resumeId; let appId;
  beforeAll(async () => {
    rec = await registerAgent('RECRUITER'); rec2 = await registerAgent('RECRUITER');
    cand = await registerAgent('CANDIDATE'); cand2 = await registerAgent('CANDIDATE'); admin = await adminAgent();
    job = (await rec.agent.post('/api/jobs').send(jobBody())).body.data;
    resumeId = (await cand.agent.post('/api/resumes').attach('resume', PDF, { filename: 'cv.pdf', contentType: 'application/pdf' })).body.data.id;
  });

  it('candidate applies; duplicate blocked (409); history starts at APPLIED', async () => {
    const r = await cand.agent.post('/api/applications').send({ jobId: job.id, resumeId, coverNote: 'hi' });
    expect(r.status).toBe(201); expect(r.body.data.status).toBe('APPLIED'); appId = r.body.data.id;
    expect((await cand.agent.post('/api/applications').send({ jobId: job.id, resumeId })).status).toBe(409);
    const d = await cand.agent.get(`/api/applications/${appId}`);
    expect(d.body.data.history).toHaveLength(1); expect(d.body.data.history[0].newStatus).toBe('APPLIED');
  });
  it("cannot apply using another candidate's resume or to a closed job", async () => {
    expect((await cand2.agent.post('/api/applications').send({ jobId: job.id, resumeId })).status).toBe(400);
    const closed = (await rec.agent.post('/api/jobs').send(jobBody({ title: 'Closed Role' }))).body.data;
    await rec.agent.patch(`/api/jobs/${closed.id}`).send({ status: 'CLOSED' });
    expect((await cand.agent.post('/api/applications').send({ jobId: closed.id, resumeId })).status).toBe(400);
  });
  it('lists my applications; job detail shows hasApplied', async () => {
    const r = await cand.agent.get('/api/applications/my');
    expect(r.body.data.map((a) => a.id)).toContain(appId);
    expect((await cand.agent.get(`/api/jobs/${job.id}`)).body.data.hasApplied).toBe(true);
    expect((await cand2.agent.get(`/api/jobs/${job.id}`)).body.data.hasApplied).toBe(false);
  });
  it('access control on application detail', async () => {
    expect((await cand2.agent.get(`/api/applications/${appId}`)).status).toBe(403);
    expect((await rec2.agent.get(`/api/applications/${appId}`)).status).toBe(403);
    expect((await rec.agent.get(`/api/applications/${appId}`)).status).toBe(200);
    const list = await rec.agent.get('/api/applications');
    expect(list.body.data.map((a) => a.id)).toContain(appId);
    expect((await rec2.agent.get('/api/applications')).body.data.map((a) => a.id)).not.toContain(appId);
  });
  it('recruiter resume download: owner recruiter ok, other recruiter / candidate blocked', async () => {
    const ok = await rec.agent.get(`/api/resumes/${resumeId}/download`);
    expect(ok.status).toBe(200); expect(ok.headers['content-type']).toMatch(/pdf/);
    expect(ok.headers['content-disposition']).toMatch(/attachment/);
    expect(Buffer.from(ok.body).subarray(0, 5).toString()).toBe('%PDF-');
    expect((await rec2.agent.get(`/api/resumes/${resumeId}/download`)).status).toBe(403);
    expect((await cand2.agent.get(`/api/resumes/${resumeId}/download`)).status).toBe(403);
    expect((await cand.agent.get(`/api/resumes/${resumeId}/download`)).status).toBe(200);
    expect((await admin.agent.get(`/api/resumes/${resumeId}/download`)).status).toBe(200);
    expect((await request(app).get(`/api/resumes/${resumeId}/download`)).status).toBe(401);
  });
  it('uploads directory is not served publicly', async () => {
    expect((await request(app).get('/uploads/anything.pdf')).status).toBe(404);
  });
  it('status machine: only valid transitions; other recruiter and candidate blocked', async () => {
    const set = (a, status, note) => a.agent.patch(`/api/applications/${appId}/status`).send({ status, note });
    expect((await set(rec2, 'SHORTLISTED')).status).toBe(403);
    expect((await set(cand, 'SHORTLISTED')).status).toBe(403);
    expect((await set(rec, 'OFFER')).status).toBe(400);        // skip stage
    expect((await set(rec, 'INTERVIEW')).status).toBe(400);    // skip stage
    expect((await set(rec, 'BOGUS')).status).toBe(400);
    expect((await set(rec, 'SHORTLISTED')).body.data.status).toBe('SHORTLISTED');
    expect((await set(rec, 'INTERVIEW')).body.data.status).toBe('INTERVIEW');
    expect((await set(rec, 'OFFER')).body.data.status).toBe('OFFER');
    expect((await set(rec, 'REJECTED')).status).toBe(400);     // final state locked
  });
  it('candidate sees full timeline with actors and timestamps', async () => {
    const d = (await cand.agent.get(`/api/applications/${appId}`)).body.data;
    expect(d.status).toBe('OFFER');
    expect(d.history.map((h) => h.newStatus)).toEqual(['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER']);
    expect(d.history[1].oldStatus).toBe('APPLIED'); expect(d.history[1].actor.role).toBe('RECRUITER'); expect(d.history[1].changedAt).toBeTruthy();
  });
  it('final-state applications cannot be withdrawn; admin override requires note', async () => {
    expect((await cand.agent.patch(`/api/applications/${appId}/withdraw`)).status).toBe(400);
    const noNote = await admin.agent.patch(`/api/applications/${appId}/status`).send({ status: 'REJECTED' });
    expect(noNote.status).toBe(400);
    const ok = await admin.agent.patch(`/api/applications/${appId}/status`).send({ status: 'REJECTED', note: 'Background check failed' });
    expect(ok.body.data.status).toBe('REJECTED');
    expect(ok.body.data.history.at(-1).note).toMatch(/ADMIN OVERRIDE/);
  });
  it('rejection path and withdraw path', async () => {
    const r2 = (await cand2.agent.post('/api/resumes').attach('resume', PDF, { filename: 'c2.pdf', contentType: 'application/pdf' })).body.data.id;
    const a2 = (await cand2.agent.post('/api/applications').send({ jobId: job.id, resumeId: r2 })).body.data.id;
    expect((await rec.agent.patch(`/api/applications/${a2}/status`).send({ status: 'REJECTED' })).body.data.status).toBe('REJECTED');

    const job2 = (await rec.agent.post('/api/jobs').send(jobBody({ title: 'Second Role' }))).body.data;
    const a3 = (await cand2.agent.post('/api/applications').send({ jobId: job2.id, resumeId: r2 })).body.data.id;
    expect((await cand.agent.patch(`/api/applications/${a3}/withdraw`)).status).toBe(403);
    const w = await cand2.agent.patch(`/api/applications/${a3}/withdraw`);
    expect(w.status).toBe(200); expect(w.body.data.status).toBe('WITHDRAWN');
    expect((await cand2.agent.patch(`/api/applications/${a3}/withdraw`)).status).toBe(400);
  });
  it('resume attached to an application cannot be deleted', async () => {
    expect((await cand.agent.delete(`/api/resumes/${resumeId}`)).status).toBe(409);
  });
});

describe('dashboards & admin', () => {
  it('candidate / recruiter / admin dashboards return stats', async () => {
    const c = await registerAgent('CANDIDATE'); const r = await registerAgent('RECRUITER'); const a = await adminAgent();
    const cd = await c.agent.get('/api/dashboard/candidate');
    expect(cd.status).toBe(200); expect(cd.body.data.byStatus).toHaveProperty('APPLIED');
    const rd = await r.agent.get('/api/dashboard/recruiter');
    expect(rd.status).toBe(200); expect(rd.body.data.totals).toHaveProperty('openJobs');
    const ad = await a.agent.get('/api/dashboard/admin');
    expect(ad.status).toBe(200); expect(ad.body.data.totals.users).toBeGreaterThan(0);
  });
  it('admin lists/deactivates users, manages jobs; cannot deactivate self', async () => {
    const a = await adminAgent(); const c = await registerAgent('CANDIDATE'); const r = await registerAgent('RECRUITER');
    const users = await a.agent.get('/api/admin/users').query({ q: c.email });
    expect(users.body.data).toHaveLength(1);
    expect((await a.agent.patch(`/api/admin/users/${c.user.id}`).send({ isActive: false })).body.data.isActive).toBe(false);
    expect((await c.agent.get('/api/auth/me')).status).toBe(401);
    expect((await a.agent.patch(`/api/admin/users/${a.user.id}`).send({ isActive: false })).status).toBe(400);
    const job = (await r.agent.post('/api/jobs').send(jobBody())).body.data;
    expect((await a.agent.patch(`/api/jobs/${job.id}`).send({ status: 'CLOSED' })).status).toBe(200);
    const all = await a.agent.get('/api/jobs').query({ status: 'CLOSED', limit: '50' });
    expect(all.body.data.map((j) => j.id)).toContain(job.id);
    expect((await a.agent.delete(`/api/jobs/${job.id}`)).status).toBe(200);
  });
});

describe('profile', () => {
  it('candidate and recruiter can update profile', async () => {
    const c = await registerAgent('CANDIDATE');
    const u = await c.agent.put('/api/profile').send({ name: 'New Name', phone: '123', skills: 'Go, Rust', location: 'Paris' });
    expect(u.status).toBe(200); expect(u.body.data.name).toBe('New Name'); expect(u.body.data.candidateProfile.skills).toBe('Go, Rust');
    const r = await registerAgent('RECRUITER');
    const ru = await r.agent.put('/api/profile').send({ companyName: 'NewCo', website: 'https://newco.example' });
    expect(ru.body.data.recruiterProfile.companyName).toBe('NewCo');
    expect((await r.agent.put('/api/profile').send({ website: 'javascript:alert(1)' })).status).toBe(400);
  });
});
