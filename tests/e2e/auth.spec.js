import { test, expect, SHOTS, registerUi, loginUi, logoutUi, uniqueEmail, PASSWORD } from './helpers.js';

test.describe('authentication & access control', () => {
  test('home page renders and is screenshot', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Find the job that fits/ })).toBeVisible();
    await expect(page.getByText('Latest openings')).toBeVisible();
    await expect(page.locator('a[href^="/jobs/"]').first()).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/01-home.png`, fullPage: true });
  });

  test('candidate registers, sees dashboard, logs out, logs back in', async ({ page }) => {
    const email = uniqueEmail('cand');
    await registerUi(page, { role: 'CANDIDATE', name: 'Eva Tester', email });
    await expect(page.getByRole('heading', { name: /Hello, Eva/ })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/02-candidate-dashboard.png`, fullPage: true });
    await logoutUi(page);
    await page.waitForURL('**/login');
    await loginUi(page, email);
    await page.waitForURL('**/candidate');
    await expect(page.getByRole('heading', { name: /Hello, Eva/ })).toBeVisible();
  });

  test('invalid login shows an error and stays on login', async ({ page }) => {
    await loginUi(page, 'candidate1@jobportal.dev', 'WrongPassword1');
    await expect(page.getByRole('alert').filter({ hasText: 'Invalid email or password' })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await page.screenshot({ path: `${SHOTS}/03-login-error.png` });
  });

  test('form validation blocks invalid registration', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Name is required')).toBeVisible();
    await expect(page.getByText('Email is required')).toBeVisible();
    await page.getByLabel('Full name').fill('Al');
    await page.getByLabel('Email').fill('bad');
    await page.getByLabel('Password', { exact: true }).fill('abcdefgh');
    await page.getByLabel('Confirm password').fill('zzz');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    await expect(page.getByText('Must contain a letter and a number')).toBeVisible();
    await expect(page.getByText('Passwords do not match')).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('duplicate email registration is rejected', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Full name').fill('Dup User');
    await page.getByLabel('Email').fill('candidate1@jobportal.dev');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('alert').filter({ hasText: /already exists/ })).toBeVisible();
  });

  test('protected routes redirect anonymous users; wrong roles are bounced', async ({ page }) => {
    await page.goto('/recruiter/jobs');
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);

    await loginUi(page, 'candidate2@jobportal.dev', 'Password@123');
    await page.waitForURL('**/candidate');
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/candidate$/);
    await page.goto('/recruiter');
    await expect(page).toHaveURL(/\/candidate$/);
  });

  test('unknown route shows 404 page', async ({ page }) => {
    await page.goto('/this/does/not/exist');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/04-404.png` });
  });

  test('session survives page reload (httpOnly cookie, no token in localStorage)', async ({ page }) => {
    await loginUi(page, 'candidate3@jobportal.dev', 'Password@123');
    await page.waitForURL('**/candidate');
    await page.reload();
    await expect(page.getByRole('heading', { name: /Hello, Liam/ })).toBeVisible();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(stored).not.toMatch(/eyJ/);
    const cookies = await page.context().cookies();
    const c = cookies.find((x) => x.name === 'jp_token');
    expect(c.httpOnly).toBe(true);
  });
});
