// Idempotent demo seed. Safe to run repeatedly. Development data only.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import fs from 'node:fs/promises';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const prisma = new PrismaClient();
const ADMIN_PW = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
const USER_PW = process.env.SEED_USER_PASSWORD || 'Password@123';

const recruiters = [
  { name: 'Priya Sharma', email: 'recruiter1@jobportal.dev', company: 'NimbusTech Solutions', desc: 'Cloud-native product studio building SaaS for logistics.', website: 'https://nimbustech.example.com' },
  { name: 'Daniel Brooks', email: 'recruiter2@jobportal.dev', company: 'DataBridge Analytics', desc: 'Analytics and ML consultancy for retail and fintech.', website: 'https://databridge.example.com' },
  { name: 'Aisha Khan', email: 'recruiter3@jobportal.dev', company: 'PixelForge Labs', desc: 'Frontend-first agency crafting web and mobile experiences.', website: 'https://pixelforge.example.com' },
];
const candidates = [
  ['Arjun Mehta', 'Mumbai, India', 'JavaScript, React, Node.js', 'B.Tech Computer Science'],
  ['Sofia Rossi', 'Berlin, Germany', 'Python, Django, SQL', 'BSc Software Engineering'],
  ['Liam Chen', 'Toronto, Canada', 'AWS, Terraform, Docker', 'BEng Computer Engineering'],
  ['Emma Wilson', 'London, UK', 'Python, Pandas, Tableau', 'MSc Data Science'],
  ['Noah Patel', 'Bengaluru, India', 'Java, Spring, Kubernetes', 'B.E. Information Technology'],
  ['Olivia Martin', 'Austin, USA', 'React, TypeScript, CSS', 'BA Interactive Media'],
  ['Mateo Garcia', 'Madrid, Spain', 'PyTorch, scikit-learn, Python', 'MSc Artificial Intelligence'],
  ['Zara Ahmed', 'Dubai, UAE', 'Node.js, PostgreSQL, GraphQL', 'BSc Computer Science'],
  ['Ethan Kim', 'Seoul, South Korea', 'Go, Linux, CI/CD', 'BS Computer Science'],
  ['Maya Singh', 'Remote', 'Full-stack, React, Express', 'B.Tech Information Technology'],
];
// [recruiterIdx, title, location, type, salary, desc, reqs, status]
const jobs = [
  [0, 'Software Engineer', 'Bengaluru, India', 'FULL_TIME', '₹18–28 LPA', 'Build and maintain core services for our logistics SaaS platform. You will design APIs, review code and ship features weekly.', '3+ years of experience with Node.js or Java. Strong data structures knowledge. Experience with REST APIs and SQL.'],
  [0, 'Python Developer', 'Pune, India', 'FULL_TIME', '₹12–20 LPA', 'Develop backend services and automation tooling in Python for route optimisation workloads.', 'Proficiency in Python 3, FastAPI or Django, PostgreSQL. Familiarity with unit testing.'],
  [0, 'Cloud Engineer', 'Remote', 'REMOTE', '$80k–$110k', 'Design and operate AWS infrastructure for multi-tenant workloads, focusing on reliability and cost.', 'Hands-on AWS (EC2, S3, IAM, VPC). Infrastructure as code (Terraform or CloudFormation). Linux administration.'],
  [0, 'DevOps Engineer', 'Hyderabad, India', 'FULL_TIME', '₹15–25 LPA', 'Own our CI/CD pipelines, observability stack and release process across environments.', 'Experience with CI/CD tools, Docker, Linux, shell scripting, and monitoring (CloudWatch, Prometheus).'],
  [0, 'Backend Engineering Intern', 'Pune, India', 'INTERNSHIP', '₹25k / month', 'Six-month internship working alongside senior engineers on production backend features.', 'Currently pursuing a CS degree. Basic knowledge of JavaScript or Python and Git.'],
  [1, 'Data Analyst', 'London, UK', 'FULL_TIME', '£42k–£55k', 'Turn retail transaction data into insights. Build dashboards and present findings to stakeholders.', 'SQL expertise, Python or R, experience with Tableau or Power BI. Strong communication skills.'],
  [1, 'Machine Learning Engineer', 'Berlin, Germany', 'FULL_TIME', '€70k–€90k', 'Train, evaluate and deploy ML models for fraud detection and demand forecasting.', 'Python, PyTorch or TensorFlow, MLOps basics, solid statistics foundation. Production ML experience preferred.'],
  [1, 'Senior Data Analyst', 'New York, USA', 'FULL_TIME', '$95k–$120k', 'Lead analytics projects for fintech clients and mentor junior analysts.', '5+ years in analytics, advanced SQL, experimentation and A/B testing experience.'],
  [1, 'Data Engineer (Contract)', 'Remote', 'CONTRACT', '$55–$70 / hour', '6-month contract to build ELT pipelines on a modern warehouse.', 'Strong SQL and Python, Airflow or dbt, experience with Snowflake or BigQuery.'],
  [1, 'ML Research Intern', 'Toronto, Canada', 'INTERNSHIP', 'CA$28 / hour', 'Assist our research team in prototyping NLP models and evaluation pipelines.', 'Graduate student in CS or related field. Python and PyTorch coursework or projects.'],
  [2, 'React Developer', 'Austin, USA', 'FULL_TIME', '$100k–$130k', 'Build polished, accessible interfaces in React for consumer web products.', '3+ years of React, modern JavaScript, CSS/Tailwind, component testing.'],
  [2, 'Full-Stack Developer', 'Remote', 'REMOTE', '$90k–$120k', 'Own features end-to-end across a React frontend and Node/PostgreSQL backend.', 'Experience with React, Node.js/Express, PostgreSQL and REST API design.'],
  [2, 'Frontend Engineer (Part-time)', 'Dubai, UAE', 'PART_TIME', 'AED 12k / month', 'Part-time role maintaining our design system and marketing sites.', 'React, TypeScript, strong CSS fundamentals, eye for design detail.'],
  [2, 'Full-Stack Engineer', 'Toronto, Canada', 'FULL_TIME', 'CA$100k–$125k', 'Join a small team shipping client web apps from prototype to production.', 'React, Node.js, SQL, familiarity with cloud deployment.'],
  [2, 'UI Engineering Intern', 'Mumbai, India', 'INTERNSHIP', '₹20k / month', 'Learn modern frontend practices while shipping real UI components.', 'HTML, CSS, JavaScript basics. Portfolio or GitHub projects appreciated.'],
  [0, 'Site Reliability Engineer', 'Dublin, Ireland', 'FULL_TIME', '€75k–€95k', 'Improve availability and incident response for customer-facing systems.', 'Linux, networking, Go or Python, on-call experience, SLO/SLI practices.'],
  [1, 'Business Intelligence Developer', 'Chicago, USA', 'CONTRACT', '$60–$75 / hour', 'Develop semantic models and reports for the finance team.', 'SQL, data modelling, Power BI or Looker.'],
  [2, 'Mobile Web Developer', 'Remote', 'REMOTE', '$70k–$95k', 'Optimise our PWA for performance on low-end devices.', 'JavaScript performance profiling, React, service workers, Lighthouse.'],
];

// Minimal valid 1-page PDF used as demo resume content.
const demoPdf = (name) => Buffer.from(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 60>>stream
BT /F1 20 Tf 72 700 Td (Resume - ${name.replace(/[()\\]/g, '')}) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R/Size 6>>
%%EOF
`);

async function upsertUser({ name, email, role, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({ where: { email }, update: {}, create: { name, email, role, passwordHash } });
}

async function main() {
  const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');

  const admin = await upsertUser({ name: 'Portal Admin', email: 'admin@jobportal.dev', role: 'ADMIN', password: ADMIN_PW });

  const rprofiles = [];
  for (const r of recruiters) {
    const u = await upsertUser({ name: r.name, email: r.email, role: 'RECRUITER', password: USER_PW });
    const p = await prisma.recruiterProfile.upsert({
      where: { userId: u.id }, update: {},
      create: { userId: u.id, companyName: r.company, companyDescription: r.desc, website: r.website },
    });
    rprofiles.push(p);
  }

  const cusers = [];
  for (let i = 0; i < candidates.length; i++) {
    const [name, location, skills, education] = candidates[i];
    const u = await upsertUser({ name, email: `candidate${i + 1}@jobportal.dev`, role: 'CANDIDATE', password: USER_PW });
    await prisma.candidateProfile.upsert({
      where: { userId: u.id }, update: {},
      create: { userId: u.id, location, skills, education, phone: `+1-555-01${String(i).padStart(2, '0')}`, bio: `${name} is an engineer interested in ${skills.split(',')[0].trim()} roles.` },
    });
    cusers.push(u);
  }

  const jobRows = [];
  for (const [ri, title, location, employmentType, salaryRange, description, requirements] of jobs) {
    const rp = rprofiles[ri];
    let job = await prisma.job.findFirst({ where: { recruiterId: rp.id, title } });
    if (!job) job = await prisma.job.create({ data: { recruiterId: rp.id, companyName: rp.companyName, title, location, employmentType, salaryRange, description, requirements } });
    jobRows.push(job);
  }
  // Close one job for demo purposes
  await prisma.job.update({ where: { id: jobRows[16].id }, data: { status: 'CLOSED' } });

  // Resumes (one per candidate, real PDF on disk through the same key scheme as the app)
  const resumes = [];
  for (const c of cusers) {
    let resume = await prisma.resume.findFirst({ where: { candidateId: c.id } });
    if (!resume) {
      const key = `resumes/${c.id}/seed-resume.pdf`;
      const buf = demoPdf(c.name);
      if ((process.env.STORAGE_DRIVER || 'local') === 's3') {
        // Same bucket/prefix the app uses; credentials come from the instance role.
        await new S3Client({ region: process.env.AWS_REGION }).send(new PutObjectCommand({
          Bucket: process.env.S3_BUCKET, Key: (process.env.S3_KEY_PREFIX || '') + key, Body: buf, ContentType: 'application/pdf', ServerSideEncryption: 'AES256',
        }));
      } else {
        const full = path.join(uploadRoot, key);
        await fs.mkdir(path.dirname(full), { recursive: true });
        await fs.writeFile(full, buf);
      }
      resume = await prisma.resume.create({ data: { candidateId: c.id, fileName: `${c.name.replace(/\s+/g, '_')}_Resume.pdf`, storageKey: key, contentType: 'application/pdf', fileSize: buf.length } });
    }
    if (resume) resumes.push(resume);
  }

  // Applications across stages: [candidateIdx, jobIdx, path of statuses]
  const flows = [
    [0, 0, ['SHORTLISTED', 'INTERVIEW', 'OFFER']], [0, 10, []], [1, 1, ['SHORTLISTED']], [1, 6, ['REJECTED']],
    [2, 2, ['SHORTLISTED', 'INTERVIEW']], [2, 3, ['SHORTLISTED']], [3, 5, ['SHORTLISTED', 'INTERVIEW', 'OFFER']], [3, 7, []],
    [4, 0, ['REJECTED']], [4, 15, ['SHORTLISTED']], [5, 10, ['SHORTLISTED', 'INTERVIEW']], [5, 11, []],
    [6, 6, ['SHORTLISTED']], [6, 9, []], [7, 11, ['SHORTLISTED']], [7, 1, []],
    [8, 3, ['SHORTLISTED', 'INTERVIEW']], [8, 15, []], [9, 11, ['SHORTLISTED', 'INTERVIEW', 'OFFER']], [9, 13, []],
    [9, 0, ['WITHDRAW']],
  ];
  let created = 0;
  for (const [ci, ji, path_] of flows) {
    const cand = cusers[ci]; const job = jobRows[ji];
    if (await prisma.application.findUnique({ where: { candidateId_jobId: { candidateId: cand.id, jobId: job.id } } })) continue;
    const recruiterUser = await prisma.recruiterProfile.findUnique({ where: { id: job.recruiterId } });
    const base = Date.now() - (30 - created) * 86400000;
    const app = await prisma.application.create({
      data: { candidateId: cand.id, jobId: job.id, resumeId: resumes[ci].id, coverNote: 'I am excited about this opportunity and believe my background is a strong fit.', appliedAt: new Date(base) },
    });
    let prev = null; let status = 'APPLIED';
    const steps = [['APPLIED', cand.id, 'Application submitted'], ...path_.map((s) => (s === 'WITHDRAW' ? ['WITHDRAWN', cand.id, 'Withdrawn by candidate'] : [s, recruiterUser.userId, null]))];
    let t = base;
    for (const [s, actor, note] of steps) {
      await prisma.applicationStatusHistory.create({ data: { applicationId: app.id, oldStatus: prev, newStatus: s, changedBy: actor, note, changedAt: new Date(t) } });
      prev = s; status = s; t += 2 * 86400000;
    }
    await prisma.application.update({ where: { id: app.id }, data: { status } });
    created++;
  }

  const counts = { users: await prisma.user.count(), jobs: await prisma.job.count(), applications: await prisma.application.count() };
   
  console.log(`Seed complete. admin=${admin.email} newApplications=${created}`, counts);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
