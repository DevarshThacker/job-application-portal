// Removes data created by Playwright runs (users with @e2e.test emails) incl. uploaded files.
// FKs on history.changedBy / application.resumeId are RESTRICT by design, so delete in dependency order.
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const root = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');

const users = await prisma.user.findMany({ where: { email: { endsWith: '@e2e.test' } }, select: { id: true } });
const ids = users.map((u) => u.id);
if (ids.length) {
  const apps = { OR: [{ candidateId: { in: ids } }, { job: { recruiter: { userId: { in: ids } } } }] };
  const appIds = (await prisma.application.findMany({ where: apps, select: { id: true } })).map((a) => a.id);
  await prisma.$transaction([
    prisma.applicationStatusHistory.deleteMany({ where: { OR: [{ applicationId: { in: appIds } }, { changedBy: { in: ids } }] } }),
    prisma.application.deleteMany({ where: { id: { in: appIds } } }),
    prisma.resume.deleteMany({ where: { candidateId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
  for (const id of ids) await fs.rm(path.join(root, 'resumes', id), { recursive: true, force: true });
}
console.log(`cleanup-e2e: removed ${ids.length} e2e users`);
await prisma.$disconnect();
