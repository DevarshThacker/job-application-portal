import { prisma } from '../config/db.js';
import { asyncHandler, publicUser } from '../utils/http.js';

async function load(user) {
  const full = await prisma.user.findUnique({ where: { id: user.id }, include: { candidateProfile: true, recruiterProfile: true } });
  return { ...publicUser(full), candidateProfile: full.candidateProfile, recruiterProfile: full.recruiterProfile };
}
export const getProfile = asyncHandler(async (req, res) => res.json({ data: await load(req.user) }));

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, location, skills, education, bio, companyName, companyDescription, website } = req.body;
  const u = req.user;
  await prisma.$transaction(async (tx) => {
    if (name) await tx.user.update({ where: { id: u.id }, data: { name } });
    if (u.role === 'CANDIDATE') {
      const data = { phone, location, skills, education, bio };
      Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
      await tx.candidateProfile.upsert({ where: { userId: u.id }, update: data, create: { userId: u.id, ...data } });
    } else if (u.role === 'RECRUITER') {
      const data = { companyDescription, website };
      if (companyName) data.companyName = companyName;
      Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
      await tx.recruiterProfile.update({ where: { userId: u.id }, data });
      if (companyName) {
        const rp = await tx.recruiterProfile.findUnique({ where: { userId: u.id } });
        await tx.job.updateMany({ where: { recruiterId: rp.id }, data: { companyName } });
      }
    }
  });
  res.json({ data: await load(u) });
});
