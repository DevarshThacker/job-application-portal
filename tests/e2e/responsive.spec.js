import { test, expect, SHOTS, loginUi } from './helpers.js';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('responsive layout (mobile 390x844)', () => {
  test('public pages have no horizontal scroll and menu works', async ({ page }) => {
    for (const p of ['/', '/jobs', '/login', '/register']) {
      await page.goto(p);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow, `horizontal overflow on ${p}`).toBe(false);
    }
    await page.goto('/');
    await page.screenshot({ path: `${SHOTS}/21-mobile-home.png` });
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/22-mobile-menu.png` });
    await page.getByRole('link', { name: 'Browse Jobs' }).click();
    await expect(page).toHaveURL(/\/jobs/);
    await page.screenshot({ path: `${SHOTS}/23-mobile-jobs.png` });
  });

  test('dashboard sidebar collapses behind a menu button', async ({ page }) => {
    await loginUi(page, 'recruiter1@jobportal.dev', 'Password@123');
    await page.waitForURL('**/recruiter');
    await expect(page.getByRole('navigation', { name: 'Sidebar' })).toBeHidden();
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('navigation', { name: 'Sidebar' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/24-mobile-recruiter-sidebar.png` });
    await page.getByRole('link', { name: 'Manage Jobs' }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
  });
});
