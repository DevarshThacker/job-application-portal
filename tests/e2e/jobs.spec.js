import { test, expect, SHOTS } from './helpers.js';

test.describe('browse, search, filter', () => {
  test('keyword search, type filter, location filter and details', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.getByText(/\d+ jobs? found/)).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/05-browse-jobs.png`, fullPage: true });

    await page.getByLabel('Keyword').fill('Python');
    await expect(page.getByRole('link', { name: 'Python Developer' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'UI Engineering Intern' })).toHaveCount(0);
    await expect(page).toHaveURL(/q=Python/);

    await page.getByLabel('Keyword').fill('');
    await page.getByLabel('Job type').selectOption('INTERNSHIP');
    await expect(page.getByRole('link', { name: 'UI Engineering Intern' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Software Engineer', exact: true })).toHaveCount(0);

    await page.getByLabel('Job type').selectOption('');
    await page.getByLabel('Location').fill('berlin');
    await expect(page.getByRole('link', { name: 'Machine Learning Engineer' })).toBeVisible();

    await page.getByLabel('Location').fill('nowhereville-xyz');
    await expect(page.getByText('No jobs match your search')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/06-empty-search.png` });
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await expect(page.getByText(/\d+ jobs? found/)).toBeVisible();

    await page.getByLabel('Keyword').fill('Cloud Engineer');
    await page.getByRole('link', { name: 'Cloud Engineer' }).first().click();
    await expect(page.getByRole('heading', { name: 'Cloud Engineer' })).toBeVisible();
    await expect(page.getByText('Log in to apply')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/07-job-details-anon.png`, fullPage: true });
  });

  test('pagination works', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.getByText(/Page 1 of/)).toBeVisible();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText(/Page 2 of/)).toBeVisible();
  });
});
