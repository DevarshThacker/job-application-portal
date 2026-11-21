import { test, expect, SHOTS, registerUi, logoutUi, loginUi, uniqueEmail, pdfFile } from './helpers.js';

test.describe.serial('recruiter + candidate hiring workflow', () => {
  const recEmail = uniqueEmail('rec'); const candEmail = uniqueEmail('cand'); const cand2Email = uniqueEmail('cand2');
  const title = `E2E Platform Engineer ${Date.now()}`;
  let jobUrl;

  test('recruiter registers and creates a job (with validation)', async ({ page }) => {
    await registerUi(page, { role: 'RECRUITER', name: 'Rita Recruiter', email: recEmail, company: 'E2E Corp' });
    await expect(page.getByRole('heading', { name: 'Recruiter dashboard' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/08-recruiter-dashboard.png`, fullPage: true });

    await page.getByRole('link', { name: 'Create Job' }).click();
    await page.getByRole('button', { name: 'Publish job' }).click();
    await expect(page.getByText('Title is required')).toBeVisible();
    await expect(page.getByText('Description is required')).toBeVisible();

    await page.getByLabel('Job title').fill(title);
    await page.getByLabel('Location').fill('Remote');
    await page.getByLabel('Employment type').selectOption('REMOTE');
    await page.getByLabel('Salary range (optional)').fill('$100k');
    await page.getByLabel('Description').fill('Build and operate our internal developer platform end to end.');
    await page.getByLabel('Requirements').fill('Kubernetes, Terraform, and Linux experience.');
    await page.screenshot({ path: `${SHOTS}/09-create-job.png`, fullPage: true });
    await page.getByRole('button', { name: 'Publish job' }).click();
    await page.waitForURL('**/recruiter/jobs');
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/10-manage-jobs.png`, fullPage: true });
  });

  test('recruiter edits the job', async ({ page }) => {
    await loginUi(page, recEmail);
    await page.waitForURL('**/recruiter');
    await page.goto('/recruiter/jobs');
    await page.getByRole('link', { name: `Edit ${title}` }).click();
    await page.getByLabel('Salary range (optional)').fill('$110k–$140k');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL('**/recruiter/jobs');
    await page.getByRole('link', { name: title, exact: true }).click();
    await expect(page.getByText('$110k–$140k').first()).toBeVisible();
    jobUrl = page.url();
  });

  test('candidate applies: rejects bad files, uploads PDF, applies, duplicate blocked', async ({ page }) => {
    await registerUi(page, { role: 'CANDIDATE', name: 'Carl Candidate', email: candEmail });
    await page.goto(jobUrl);
    await expect(page.getByRole('heading', { name: 'Apply for this job' })).toBeVisible();

    await page.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByText('Please choose or upload a resume')).toBeVisible();

    const fileInput = page.getByLabel('Upload resume file');
    await fileInput.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    await expect(page.getByText('Only PDF and DOCX files are allowed.')).toBeVisible();
    await fileInput.setInputFiles({ name: 'huge.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(5 * 1024 * 1024 + 100, 1) });
    await expect(page.getByText('File is too large. Maximum size is 5 MB.')).toBeVisible();
    // Client checks pass, server must still reject spoofed content
    await fileInput.setInputFiles({ name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('MZ not a pdf at all') });
    await expect(page.getByText(/Unsupported file/)).toBeVisible();

    await fileInput.setInputFiles(pdfFile('Carl_Resume.pdf'));
    await expect(page.getByText('Resume uploaded')).toBeVisible();
    await page.getByLabel('Cover note (optional)').fill('I would love to join E2E Corp.');
    await page.screenshot({ path: `${SHOTS}/11-apply.png`, fullPage: true });
    await page.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByText('You have applied')).toBeVisible();

    await page.goto('/candidate/applications');
    await expect(page.getByRole('link', { name: title, exact: true }).first()).toBeVisible();
    await expect(page.locator('td').getByText('Applied', { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/12-my-applications.png`, fullPage: true });
    // duplicate prevention via API (UI hides the form)
    const dup = await page.request.get('/api/applications/my');
    const apps = (await dup.json()).data;
    const post = await page.request.post('/api/applications', { data: { jobId: apps[0].job.id, resumeId: apps[0].resume.id } });
    expect(post.status()).toBe(409);
  });

  test('second candidate registers, uploads a resume and applies', async ({ page }) => {
    await registerUi(page, { role: 'CANDIDATE', name: 'Dana Second', email: cand2Email });
    await page.goto(jobUrl);
    await page.getByLabel('Upload resume file').setInputFiles(pdfFile('Dana_Resume.pdf'));
    await expect(page.getByText('Resume uploaded')).toBeVisible();
    await page.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByText('You have applied')).toBeVisible();
  });

  test('recruiter reviews resume, shortlists -> interview -> offer; rejects the other', async ({ page }) => {
    await loginUi(page, recEmail);
    await page.waitForURL('**/recruiter');
    await page.goto('/recruiter/applicants');
    await expect(page.getByRole('link', { name: 'Carl Candidate' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dana Second' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/13-applicants.png`, fullPage: true });

    await page.getByRole('link', { name: 'Carl Candidate' }).click();
    await expect(page.getByRole('heading', { name: 'Carl Candidate' })).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download resume' }).click()]);
    expect(download.suggestedFilename()).toBe('Carl_Resume.pdf');
    const fs = await import('node:fs');
    expect(fs.readFileSync(await download.path()).subarray(0, 5).toString()).toBe('%PDF-');

    for (const [btn, label] of [['Move to Shortlisted', 'Shortlisted'], ['Move to Interview', 'Interview'], ['Move to Offer', 'Offer']]) {
      await page.getByRole('button', { name: btn }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click();
      await expect(page.getByText(`Status updated to ${label}`)).toBeVisible();
    }
    // final state: no more transition buttons
    await expect(page.getByRole('button', { name: /Move to|Reject candidate/ })).toHaveCount(0);
    await expect(page.getByText(/final state/)).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/14-applicant-detail.png`, fullPage: true });

    await page.goto('/recruiter/applicants');
    await page.getByRole('link', { name: 'Dana Second' }).click();
    await page.getByRole('button', { name: 'Reject candidate' }).click();
    await page.getByRole('alertdialog').getByLabel('Note (optional)').fill('Not enough experience');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText('Status updated to Rejected')).toBeVisible();
  });

  test('candidate sees updated status and timeline; cannot withdraw a final application', async ({ page }) => {
    await loginUi(page, candEmail);
    await page.waitForURL('**/candidate');
    await page.goto('/candidate/applications');
    await expect(page.locator('td').getByText('Offer', { exact: true }).first()).toBeVisible();
    await page.getByRole('link', { name: title, exact: true }).first().click();
    const tl = page.getByRole('list', { name: 'Status history' });
    await expect(tl.getByRole('listitem')).toHaveCount(4);
    await expect(tl).toContainText('Rita Recruiter');
    await expect(page.getByRole('button', { name: 'Withdraw application' })).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/15-application-timeline.png`, fullPage: true });
  });

  test('candidate sees rejection, resume management works', async ({ page }) => {
    await loginUi(page, cand2Email);
    await page.waitForURL('**/candidate');
    await page.goto('/candidate/applications');
    await expect(page.locator('td').getByText('Rejected', { exact: true }).first()).toBeVisible();
    await page.goto('/candidate/resumes');
    await expect(page.getByText('Dana_Resume.pdf')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete Dana_Resume.pdf' })).toBeDisabled(); // used by application
    await page.screenshot({ path: `${SHOTS}/16-resumes.png`, fullPage: true });
  });

  test('candidate can withdraw an application in progress', async ({ page }) => {
    await registerUi(page, { role: 'CANDIDATE', name: 'Wendy Withdraw', email: uniqueEmail('wd') });
    const jobs = (await (await page.request.get('/api/jobs?limit=1')).json()).data;
    const up = await page.request.post('/api/resumes', { multipart: { resume: pdfFile('Wendy.pdf') } });
    expect(up.status()).toBe(201);
    const apply = await page.request.post('/api/applications', { data: { jobId: jobs[0].id, resumeId: (await up.json()).data.id } });
    expect(apply.status()).toBe(201);
    await page.goto('/candidate/applications');
    await page.getByRole('link', { name: 'Track' }).first().click();
    await page.getByRole('button', { name: 'Withdraw application' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Withdraw' }).click();
    await expect(page.getByText('Application withdrawn')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Withdraw application' })).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Status history' }).getByRole('listitem')).toHaveCount(2);
  });

  test("another recruiter cannot see or change this recruiter's applicant", async ({ page, browser }) => {
    await loginUi(page, recEmail); await page.waitForURL('**/recruiter');
    await page.goto('/recruiter/applicants');
    await page.getByRole('link', { name: 'Carl Candidate' }).click();
    const appUrl = page.url(); const appId = appUrl.split('/').pop();

    const ctx = await browser.newContext({ baseURL: 'http://localhost:5173' });
    const p2 = await ctx.newPage();
    await loginUi(p2, 'recruiter2@jobportal.dev', 'Password@123');
    await p2.waitForURL('**/recruiter');
    const res = await p2.request.patch(`/api/applications/${appId}/status`, { data: { status: 'REJECTED', note: 'x' } });
    expect(res.status()).toBe(403);
    await p2.goto(`/recruiter/applicants/${appId}`);
    await expect(p2.getByText('You do not have access to this application')).toBeVisible();
    // and cannot edit the job
    const jobId = jobUrl.split('/').pop();
    expect((await p2.request.patch(`/api/jobs/${jobId}`, { data: { title: 'Hijacked job' } })).status()).toBe(403);
    await ctx.close();
  });

  test('recruiter closes then reopens the job', async ({ page }) => {
    await loginUi(page, recEmail); await page.waitForURL('**/recruiter');
    await page.goto('/recruiter/jobs');
    await page.getByRole('button', { name: `Close ${title}` }).click();
    await expect(page.getByText('Job closed')).toBeVisible();
    await page.getByRole('button', { name: `Reopen ${title}` }).click();
    await expect(page.getByText('Job reopened')).toBeVisible();
    await logoutUi(page);
  });
});
