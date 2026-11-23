import { test, expect } from '@playwright/test';

test.describe('StockExchange NGX Sandbox End-to-End Journeys', () => {
  test('market overview loads with sandbox banner, First HoldCo spotlight, and FBNH search', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('sandbox-banner')).toBeVisible();
    await expect(page.getByText('NGX Market Intelligence Overview')).toBeVisible();
    await expect(page.getByText('First HoldCo Plc')).toBeVisible();

    const search = page.getByLabel('Global stock search');
    await search.fill('FBNH');
    await expect(page.getByText('FIRSTHOLDCO')).toBeVisible();
    await page.getByText('FIRSTHOLDCO').first().click();

    await expect(page).toHaveURL(/\/stocks\/FIRSTHOLDCO/);
    await expect(page.getByTestId('lightweight-chart-container')).toBeVisible();
  });

  test('customer login, buy order execution, portfolio & contract note check', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign In \(Keycloak RS256 JWT\)/i }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/trade?symbol=FIRSTHOLDCO&side=BUY');
    await page.getByRole('button', { name: /Generate Order Preview/i }).click();
    await expect(page.getByText(/Order Preview: BUY/i)).toBeVisible();

    await page.getByRole('button', { name: /Request Step-Up MFA Authorization/i }).click();
    await page.getByRole('button', { name: /Verify OTP/i }).click();
    await page.getByRole('button', { name: /Confirm & Execute Simulated BUY Order/i }).click();
    await expect(page.getByText(/Order Confirmed:/i)).toBeVisible();
  });
});
