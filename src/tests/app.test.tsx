import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/authentication/AuthContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { MarketOverviewPage } from '@/pages/MarketOverviewPage';
import { LoginPage } from '@/pages/LoginPage';
import { AdminWorkspacePage } from '@/pages/AdminWorkspacePage';
import { api } from '@/services/apiClient';
import { formatNGN, formatPercent } from '@/utilities/format';
import type { MarketOverview } from '@/types/api';

const MOCK_OVERVIEW: MarketOverview = {
  market_status: {
    exchange: 'NGX',
    timezone: 'Africa/Lagos',
    session: 'CLOSED',
    is_open: false,
    utc_timestamp: '2026-11-22T12:00:00Z',
    lagos_timestamp: '2026-11-22T13:00:00+01:00',
    trading_hours_wat: '10:00 - 14:30 WAT (Mon-Fri)',
  },
  sandbox_mode: true,
  data_classification: 'SIMULATED',
  freshness_status: 'FRESH',
  asi_index: {
    id: 'idx-1',
    code: 'NGX-ASI',
    name: 'NGX All-Share Index',
    description: 'Benchmark index',
    value: 104825.4,
    open: 104183.22,
    high: 105100,
    low: 104100,
    change_points: 642.18,
    change_percent: 0.62,
    total_market_cap: 64850000000000,
    value_date: '2026-11-22',
    data_classification: 'SIMULATED',
  },
  indices: [],
  total_market_cap_ngn: 52000000000000,
  total_volume: 280000000,
  breadth: { advancers: 14, decliners: 6, unchanged: 2, total: 22 },
  featured_stock: {
    instrument_id: 'inst-fh-1',
    symbol: 'FIRSTHOLDCO',
    isin: 'NGFBNH000009',
    company_name: 'First HoldCo Plc',
    short_name: 'First HoldCo',
    sector_code: 'FINANCIAL_SERVICES',
    sector_name: 'Financial Services',
    currency: 'NGN',
    trading_status: 'ACTIVE',
    is_featured: true,
    aliases: ['FBNH'],
    last_price: 28.5,
    open_price: 28.1,
    high_price: 29.0,
    low_price: 27.9,
    previous_close: 28.0,
    change: 0.5,
    change_percent: 1.79,
    volume: 38500000,
    market_cap: 1023015844572,
    pe_ratio: 3.02,
    pb_ratio: 0.54,
    dividend_yield_pct: 2.11,
    eps: 9.45,
    provider_name: 'mock_ngx_sandbox',
    provider_timestamp: '2026-11-22T12:00:00Z',
    ingestion_timestamp: '2026-11-22T12:00:00Z',
    freshness_status: 'FRESH',
    quality_status: 'VALIDATED',
    data_classification: 'SIMULATED',
  },
  market_chart_series: [{ date: '2026-11-20', ngx_asi: 104825.4, firstholdco: 28.5, volume: 38500000 }],
  top_gainers: [],
  top_losers: [],
  most_active: [],
  sector_performance: [
    { sector: 'Financial Services', equities_count: 8, avg_change_percent: 1.25, total_market_cap: 9e12, total_volume: 1e8 },
  ],
  recent_news: [
    {
      id: 'n1',
      headline: 'First HoldCo Plc Continues Digital Expansion [Sandbox]',
      summary: 'Sandbox summary',
      source: 'StockExchange Sandbox',
      category: 'ISSUER_UPDATE',
      published_at: '2026-11-22T10:00:00Z',
      is_simulated: true,
    },
  ],
};

function renderWithProviders(ui: React.ReactElement, initialEntries = ['/']) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('StockExchange Frontend Core Components', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('formats NGN currency and signed percentages accurately', () => {
    expect(formatNGN(28.5)).toContain('28.50');
    expect(formatNGN(64850000000000, true)).toBe('₦64.85T');
    expect(formatPercent(1.79)).toBe('+1.79%');
    expect(formatPercent(-2.5)).toBe('-2.50%');
  });

  it('renders prominent SANDBOX banner, featured First HoldCo card, and TradingView attribution', async () => {
    vi.spyOn(api, 'getMarketOverview').mockResolvedValue(MOCK_OVERVIEW);
    renderWithProviders(
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<MarketOverviewPage />} />
        </Route>
      </Routes>,
    );

    expect(screen.getByTestId('sandbox-banner')).toHaveTextContent(/SANDBOX PORTFOLIO DEMONSTRATION/i);
    expect(screen.getByText(/TradingView Lightweight Charts/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/NGX Market Intelligence Overview/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Legacy Ticker: FBNH/i)).toBeInTheDocument();
    expect(screen.getByText(/ISIN: NGFBNH000009/i)).toBeInTheDocument();
    // Admin link is NOT shown to unauthenticated / non-staff users
    expect(screen.queryByText(/Admin & Compliance/i)).not.toBeInTheDocument();
  });

  it('shows graceful backend outage recovery UI and retries cleanly', async () => {
    const spy = vi
      .spyOn(api, 'getMarketOverview')
      .mockRejectedValueOnce(new Error('Backend connection refused'))
      .mockResolvedValueOnce(MOCK_OVERVIEW);

    renderWithProviders(<MarketOverviewPage />);

    await waitFor(() => {
      expect(screen.getByText(/Market Overview Unavailable/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /Retry/i }));

    await waitFor(() => {
      expect(screen.getByText(/NGX Market Intelligence Overview/i)).toBeInTheDocument();
    });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('blocks unauthenticated/customer users from Administrative Workspace', () => {
    renderWithProviders(<AdminWorkspacePage />);
    expect(screen.getByText(/Administrative Access Restricted/i)).toBeInTheDocument();
  });

  it('renders OIDC PKCE Login page with sandbox demo personas', async () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/Continue with Keycloak OIDC \(PKCE\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Development Fixture Accounts/i)).toBeInTheDocument();
    await userEvent.click(screen.getByText(/Platform Administrator/i));
    expect(screen.getByText(/Channel: stockexchange-admin/i)).toBeInTheDocument();
  });
});
