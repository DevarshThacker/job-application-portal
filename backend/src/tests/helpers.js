import zlib from 'node:zlib';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import { prisma } from '../config/db.js';

export const app = createApp();

export const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');

// Build a minimal ZIP (stored) containing the OOXML parts that identify a .docx
export function makeDocx() {
  const entries = [['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'], ['word/document.xml', '<w:document/>']];
  const locals = []; const centrals = []; let offset = 0;
  for (const [name, content] of entries) {
    const n = Buffer.from(name); const d = Buffer.from(content); const crc = zlib.crc32(d);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt32LE(crc >>> 0, 14);
    lh.writeUInt32LE(d.length, 18); lh.writeUInt32LE(d.length, 22); lh.writeUInt16LE(n.length, 26);
    locals.push(lh, n, d);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
    ch.writeUInt32LE(crc >>> 0, 16); ch.writeUInt32LE(d.length, 20); ch.writeUInt32LE(d.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, n);
    offset += 30 + n.length + d.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

export const uniq = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.dev`;

export async function registerAgent(role, extra = {}) {
  const agent = request.agent(app);
  const email = uniq(role.toLowerCase());
  const body = { name: `Test ${role}`, email, password: 'Passw0rd!x', role, ...(role === 'RECRUITER' ? { companyName: 'TestCo' } : {}), ...extra };
  const res = await agent.post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`register failed ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user: res.body.data.user, email };
}

export async function adminAgent() {
  const email = uniq('admin');
  await prisma.user.create({ data: { name: 'Test Admin', email, role: 'ADMIN', passwordHash: await bcrypt.hash('Passw0rd!x', 4) } });
  const agent = request.agent(app);
  const r = await agent.post('/api/auth/login').send({ email, password: 'Passw0rd!x' });
  if (r.status !== 200) throw new Error('admin login failed');
  return { agent, user: r.body.data.user };
}

export const jobBody = (o = {}) => ({
  title: 'Test Engineer', location: 'Remote', employmentType: 'FULL_TIME', salaryRange: '$100k',
  description: 'A long enough job description for validation.', requirements: 'Some requirements here', ...o,
});
