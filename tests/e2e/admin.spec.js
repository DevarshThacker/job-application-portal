import { test, expect, SHOTS, loginUi, registerUi, logoutUi, uniqueEmail } from './helpers.js';

test.describe('administrator', () => {
  test('admin dashboard, users, jobs, applications', async ({ page }) => {
    await loginUi(page, 'admin@jobportal.dev', 'Admin@12345');
    await page.waitForURL('**/admin');
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
    await expect(page.getByText('Total users')).toBeVisible();
    await expect(page.getByText('Recruiters', { exact: true })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/17-admin-dashboard.png`, fullPage: true });

    await page.getByRole('link', { name: 'Manage Users' }).click();
    await expect(page.getByRole('heading', { name: 'Manage users' })).toBeVisible();
    await page.getByLabel('Role').selectOption('RECRUITER');
    await expect(page.getByText('recruiter1@jobportal.dev')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/18-admin-users.png`, fullPage: true });

    await page.getByRole('link', { name: 'Manage Jobs' }).click();
    await expect(page.getByRole('heading', { name: 'All job postings' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/19-admin-jobs.png`, fullPage: true });

    await page.getByRole('link', { name: 'Applications' }).click();
    await expect(page.getByRole('heading', { name: 'Application overview' })).toBeVisible();
    await page.getByLabel('Search candidate').fill('Arjun');
    await expect(page.getByRole('link', { name: 'Arjun Mehta' }).first()).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/20-admin-applications.png`, fullPage: true });
  });

  test('admin can deactivate a user who is then locked out', async ({ page, browser }) => {
    const email = uniqueEmail('victim');
    const ctx = await browser.newContext({ baseURL: 'http://localhost:5173' });
    const vp = await ctx.newPage();
    await registerUi(vp, { role: 'CANDIDATE', name: 'Vic Victim', email });

    await loginUi(page, 'admin@jobportal.dev', 'Admin@12345');
    await page.waitForURL('**/admin');
    await page.goto('/admin/users');
    await page.getByLabel('Search').fill(email);
    await page.getByRole('button', { name: 'Deactivate Vic Victim' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Deactivate' }).click();
    await expect(page.getByText('User deactivated')).toBeVisible();

    await vp.reload();
    await expect(vp).toHaveURL(/\/login|\/$/); // session no longer valid
    await vp.goto('/candidate');
    await expect(vp).toHaveURL(/\/login/);
    await loginUi(vp, email);
    await expect(vp.getByRole('alert').filter({ hasText: /deactivated/ })).toBeVisible();
    await ctx.close();
  });

  test('admin API authorization: unauthenticated and non-admin are denied', async ({ request, page }) => {
    expect((await request.get('/api/dashboard/admin')).status()).toBe(401);
    await loginUi(page, 'recruiter1@jobportal.dev', 'Password@123');
    await page.waitForURL('**/recruiter');
    expect((await page.request.get('/api/admin/users')).status()).toBe(403);
    await logoutUi(page);
  });
});
