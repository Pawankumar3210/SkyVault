import { expect, test } from '@playwright/test';

test('opens the shared workspace and creates a subject without login', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /welcome to sky vault/i })).toBeVisible();
  await expect(page.getByText('Demo Mode')).toBeVisible();
  await page.getByRole('link', { name: /subjects/i }).click();
  await page.getByRole('button', { name: 'Add subject' }).click();
  await page.getByPlaceholder('e.g. Cloud Computing').fill('Browser test course');
  await page.getByPlaceholder('e.g. CCT').fill('BTC');
  await page.getByRole('button', { name: 'Add subject' }).last().click();
  await expect(page.getByRole('heading', { name: 'Browser test course' })).toBeVisible();
});

test('persists a workspace change after a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /subjects/i }).click();
  await page.getByRole('button', { name: 'Add subject' }).click();
  await page.getByPlaceholder('e.g. Cloud Computing').fill('Reload persistence course');
  await page.getByPlaceholder('e.g. CCT').fill('RPC');
  await page.getByRole('button', { name: 'Add subject' }).last().click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Reload persistence course' })).toBeVisible();
});
