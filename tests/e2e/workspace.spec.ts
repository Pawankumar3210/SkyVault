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

test('collapses and restores the sidebar rail on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /welcome to sky vault/i })).toBeVisible();
  const toggle = page.locator('.nav-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(page.locator('.app-frame')).toHaveClass(/is-collapsed/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#primary-sidebar .nav-caption').first()).toBeHidden();
  await expect(page.getByRole('link', { name: 'Subjects', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Subjects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Subjects' })).toBeVisible();
  await toggle.click();
  await expect(page.locator('.app-frame')).not.toHaveClass(/is-collapsed/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('opens and closes the mobile navigation drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /welcome to sky vault/i })).toBeVisible();
  const toggle = page.locator('.nav-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(page.locator('#primary-sidebar')).toHaveClass(/is-open/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'Analytics', exact: true })).toBeVisible();
  await page.locator('.nav-scrim').click({ position: { x: 360, y: 300 } });
  await expect(page.locator('#primary-sidebar')).not.toHaveClass(/is-open/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('supports accessible keyboard search from the command palette', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox', { name: 'Search workspace' });
  await expect(input).toBeFocused();
  await input.fill('a');
  await expect(page.locator('#search-results')).toHaveAttribute('role', 'listbox');
  await expect(page.locator('[role="option"]').first()).toBeVisible();
  await input.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', /search-hit-/);
  await input.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Search workspace' })).toHaveCount(0);
});
