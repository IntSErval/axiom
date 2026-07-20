import { test, expect } from '@playwright/test';

test('unauthenticated /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/\/login$/);
});

test('/login renders email + password form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'AXIOM' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

test('signed-in user can navigate all tabs and open the coach', async ({ page }) => {
    test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not set');

    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard');

    for (const tab of ['Tasks', 'Habits', 'Finance', 'Goals']) {
        await page.getByRole('link', { name: tab }).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/${tab.toLowerCase()}`));
    }

    await page.getByRole('button', { name: 'Open coach chat' }).click();
    await expect(page.getByPlaceholder('Ask your coach…')).toBeVisible();
});
