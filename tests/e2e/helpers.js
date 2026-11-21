import { test as base, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

export const SHOTS = path.resolve(process.cwd(), 'docs/screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

export const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
export const pdfFile = (name = 'resume.pdf') => ({ name, mimeType: 'application/pdf', buffer: PDF });

// Fails any test that sees an uncaught page error, console error (other than expected 4xx resource loads),
// failed request, or 5xx response.
export const test = base.extend({
  issues: [async ({ page }, use) => {
    const issues = [];
    page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const t = m.text();
      if (/Failed to load resource: the server responded with a status of (400|401|403|404|409|413)/.test(t)) return; // expected negative-path responses
      issues.push(`console.error: ${t}`);
    });
    page.on('requestfailed', (r) => { if (!/net::ERR_ABORTED/.test(r.failure()?.errorText || '')) issues.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`); });
    page.on('response', (r) => { if (r.status() >= 500) issues.push(`HTTP ${r.status()}: ${r.url()}`); });
    await use(issues);
    expect(issues, 'browser console / network issues').toEqual([]);
  }, { auto: true }],
});
export { expect };

export const uniqueEmail = (p) => `${p}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@e2e.test`;
export const PASSWORD = 'E2ePassw0rd!';

export async function registerUi(page, { role, name, email, company }) {
  await page.goto(role === 'RECRUITER' ? '/register/recruiter' : '/register');
  await page.getByLabel('Full name').fill(name);
  if (company) await page.getByLabel('Company name').fill(company);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(role === 'RECRUITER' ? '**/recruiter' : '**/candidate');
}

export async function loginUi(page, email, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

export async function logoutUi(page) {
  const mobileBtn = page.getByRole('button', { name: 'Open menu' });
  if (await mobileBtn.isVisible()) await mobileBtn.click();
  await page.getByRole('button', { name: 'Log out' }).first().click();
}
