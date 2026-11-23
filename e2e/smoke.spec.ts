import { test, expect } from '@playwright/test';

test.describe('StockExchange Frontend CI Smoke Suite', () => {
  test('renders sandbox banner, featured First HoldCo card, and login page cleanly', async ({
    page,
  }) => {
    await page.route('**/api/v1/market/overview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          market_status: {
            session: 'CLOSED',
            timezone: 'Africa/Lagos',
            trading_hours_wat: '10:00–14:30 WAT',
            utc_timestamp: new Date().toISOString(),
            is_open: false,
          },
          sandbox_mode: true,
          data_classification: 'SIMULATED',
          freshness_status: 'FRESH',
          asi_index: {
            code: 'NGX-ASI',
            name: 'NGX All-Share Index',
            value: 104825.4,
            change_points: 645.2,
            change_percent: 0.62,
            data_classification: 'SIMULATED',
          },
          indices: [],
          total_market_cap_ngn: 59000000000000,
          total_volume: 420000000,
          breadth: { advancers: 12, decliners: 9, unchanged: 1, total: 22 },
          featured_stock: {
            instrument_id: '00000000-0000-0000-0000-000000000001',
            symbol: 'FIRSTHOLDCO',
            isin: 'NGFBNH000009',
            company_name: 'First HoldCo Plc',
            short_name: 'First HoldCo',
            sector_code: 'FIN',
            sector_name: 'Financial Services',
            currency: 'NGN',
            trading_status: 'ACTIVE',
            is_featured: true,
            aliases: ['FBNH'],
            last_price: 28.5,
            open_price: 28.4,
            high_price: 28.75,
            low_price: 28.3,
            previous_close: 28.48,
            change: 0.02,
            change_percent: 0.07,
            volume: 77290000,
            market_cap: 1020000000000,
            pe_ratio: 3.02,
            pb_ratio: 0.54,
            dividend_yield_pct: 2.11,
            eps: 9.45,
            provider_name: 'mock_ngx_sandbox',
            provider_timestamp: new Date().toISOString(),
            ingestion_timestamp: new Date().toISOString(),
            freshness_status: 'FRESH',
            quality_status: 'VALID',
            data_classification: 'SIMULATED',
          },
          market_chart_series: [],
          top_gainers: [],
          top_losers: [],
          most_active: [],
          sector_performance: [],
          recent_news: [],
        }),
      });
    });

    await page.goto('/');
    await expect(page.getByTestId('sandbox-banner')).toBeVisible();
    await expect(page.getByRole('heading', { name: /First HoldCo Plc/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /TradingView Lightweight Charts/i })).toBeVisible();

    await page.goto('/login');
    await expect(page.getByRole('button', { name: /Continue with Keycloak OIDC \(PKCE\)/i })).toBeVisible();
  });
});
