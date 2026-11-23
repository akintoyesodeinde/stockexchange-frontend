import { getValidAccessToken } from '@/services/oidc';
import type {
  AuthMeResponse,
  CustomerProfileSummary,
  MarketOverview,
  OrderItem,
  OrderPreviewResponse,
  PortfolioValuation,
  StockAnalyticsResponse,
  StockDetail,
  StockHistoryResponse,
  StockSummary,
  TradeItem,
} from '@/types/api';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;
  correlationId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
    correlationId?: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.correlationId = correlationId;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { idempotencyKey?: string; requireAuth?: boolean } = {},
): Promise<T> {
  const { idempotencyKey, requireAuth = false, headers: customHeaders, ...rest } = options;
  const headers = new Headers(customHeaders);
  if (!headers.has('Content-Type') && rest.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (idempotencyKey) {
    headers.set('Idempotency-Key', idempotencyKey);
  }
  const token = await getValidAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else if (requireAuth) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in to access this resource.');
  }

  const resp = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers,
  });

  if (resp.status === 204) {
    return undefined as T;
  }

  const contentType = resp.headers.get('content-type') || '';
  if (!resp.ok) {
    if (contentType.includes('application/json')) {
      const data = await resp.json().catch(() => ({}));
      const err = data?.error;
      throw new ApiError(
        resp.status,
        err?.code || `HTTP_${resp.status}`,
        err?.message || data?.detail || resp.statusText,
        err?.details || {},
        err?.correlation_id || resp.headers.get('X-Correlation-ID') || undefined,
      );
    }
    throw new ApiError(resp.status, `HTTP_${resp.status}`, await resp.text());
  }

  if (contentType.includes('application/json')) {
    return (await resp.json()) as T;
  }
  return (await resp.text()) as unknown as T;
}

export const api = {
  // Identity & Customers
  getAuthMe: () => apiRequest<AuthMeResponse>('/auth/me', { requireAuth: true }),
  getCustomerMe: () => apiRequest<CustomerProfileSummary>('/customers/me', { requireAuth: true }),
  updateCustomerMe: (body: Record<string, unknown>) =>
    apiRequest<CustomerProfileSummary>('/customers/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
      requireAuth: true,
    }),
  getInvestmentProfile: () =>
    apiRequest<{ completed: boolean; profile: Record<string, unknown> | null }>(
      '/customers/me/investment-profile',
      { requireAuth: true },
    ),
  saveInvestmentProfile: (body: Record<string, unknown>) =>
    apiRequest('/customers/me/investment-profile', {
      method: 'POST',
      body: JSON.stringify(body),
      requireAuth: true,
    }),
  submitRiskAssessment: (answers: Record<string, number>) =>
    apiRequest('/customers/me/risk-assessment', {
      method: 'POST',
      body: JSON.stringify({ questionnaire_version: 'v1.0', answers }),
      requireAuth: true,
    }),
  saveConsents: (consents: Array<{ consent_type: string; version: string; accepted: boolean }>) =>
    apiRequest('/customers/me/consents', {
      method: 'POST',
      body: JSON.stringify({ consents }),
      requireAuth: true,
    }),
  verifySandboxKyc: (idLastFour = '4821') =>
    apiRequest('/customers/me/kyc/verify-sandbox', {
      method: 'POST',
      body: JSON.stringify({ id_document_type: 'NIN_SANDBOX', id_last_four: idLastFour }),
      requireAuth: true,
    }),
  fundSandboxCash: (amount: number) =>
    apiRequest('/customers/me/sandbox-fund', {
      method: 'POST',
      body: JSON.stringify({ amount }),
      requireAuth: true,
    }),
  getNotifications: () =>
    apiRequest<{
      unread_count: number;
      items: Array<{
        id: string;
        event_type: string;
        title: string;
        body: string;
        is_read: boolean;
        created_at: string;
      }>;
    }>('/notifications', { requireAuth: true }),
  markNotificationRead: (id: string) =>
    apiRequest(`/notifications/${id}/read`, { method: 'PATCH', requireAuth: true }),

  // Market & Equities
  getMarketOverview: () => apiRequest<MarketOverview>('/market/overview'),
  getMarketStatus: () => apiRequest<Record<string, unknown>>('/market/status'),
  getStocksScreener: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return apiRequest<{
      items: StockSummary[];
      pagination: { page: number; page_size: number; total: number; total_pages: number };
    }>(`/stocks?${qs.toString()}`);
  },
  searchStocks: (q: string) =>
    apiRequest<{
      query: string;
      items: Array<{
        instrument_id: string;
        symbol: string;
        isin: string;
        company_name: string;
        aliases: string[];
        is_featured: boolean;
        last_price: number;
        change_percent: number;
        data_classification: string;
      }>;
    }>(`/stocks/search?q=${encodeURIComponent(q)}`),
  compareStocks: (symbols: string[]) =>
    apiRequest<{
      items: Array<{
        symbol: string;
        company_name: string;
        quote: StockDetail['quote'];
        analytics: StockAnalyticsResponse;
      }>;
    }>(`/stocks/compare?symbols=${encodeURIComponent(symbols.join(','))}`),
  getStockDetail: (symbol: string) => apiRequest<StockDetail>(`/stocks/${encodeURIComponent(symbol)}`),
  getStockHistory: (symbol: string, range = '1Y', adjusted = true) =>
    apiRequest<StockHistoryResponse>(
      `/stocks/${encodeURIComponent(symbol)}/history?range=${range}&adjusted=${adjusted}`,
    ),
  getStockAnalytics: (symbol: string, adjusted = true) =>
    apiRequest<StockAnalyticsResponse>(
      `/stocks/${encodeURIComponent(symbol)}/analytics?adjusted=${adjusted}`,
    ),
  getStockFundamentals: (symbol: string) =>
    apiRequest<{ symbol: string; available: boolean; fundamentals: Record<string, number | null> | null }>(
      `/stocks/${encodeURIComponent(symbol)}/fundamentals`,
    ),
  getStockStatements: (symbol: string) =>
    apiRequest<{
      symbol: string;
      items: Array<{
        id: string;
        statement_type: string;
        fiscal_period: string;
        fiscal_year: number;
        period_end_date: string;
        line_items: Record<string, number>;
      }>;
    }>(`/stocks/${encodeURIComponent(symbol)}/financial-statements`),
  getStockDividends: (symbol: string) =>
    apiRequest<{
      symbol: string;
      items: Array<{
        id: string;
        dividend_type: string;
        fiscal_year: number;
        amount_per_share: number;
        currency: string;
        ex_dividend_date: string;
        payment_date: string;
      }>;
    }>(`/stocks/${encodeURIComponent(symbol)}/dividends`),
  getStockCorporateActions: (symbol: string) =>
    apiRequest<{
      symbol: string;
      items: Array<{
        id: string;
        action_type: string;
        title: string;
        description: string;
        effective_date: string;
        adjustment_factor: number;
      }>;
    }>(`/stocks/${encodeURIComponent(symbol)}/corporate-actions`),
  getStockNews: (symbol: string) =>
    apiRequest<{
      symbol: string;
      items: Array<{
        id: string;
        headline: string;
        summary: string;
        source: string;
        published_at: string;
      }>;
    }>(`/stocks/${encodeURIComponent(symbol)}/news`),

  // Portfolios
  getPortfolios: () => apiRequest<{ items: PortfolioValuation[] }>('/portfolios', { requireAuth: true }),
  getPortfolioPerformance: (id: string) =>
    apiRequest<{
      series: Array<{ date: string; total_value: number; equity_value: number; cash_value: number; unrealized_pnl: number }>;
    }>(`/portfolios/${id}/performance`, { requireAuth: true }),
  getPortfolioTransactions: (id: string) =>
    apiRequest<{
      items: Array<{
        id: string;
        transaction_reference: string;
        transaction_type: string;
        amount: string;
        currency: string;
        status: string;
        description: string;
        created_at: string;
      }>;
    }>(`/portfolios/${id}/transactions`, { requireAuth: true }),
  getPortfolioDividends: (id: string) =>
    apiRequest<{
      items: Array<{
        symbol: string;
        company_name: string;
        fiscal_year: number;
        amount_per_share: string;
        held_shares: string;
        estimated_gross_payout: string;
        payment_date: string;
      }>;
    }>(`/portfolios/${id}/dividends`, { requireAuth: true }),

  // Watchlists & Alerts
  getWatchlists: () =>
    apiRequest<{
      items: Array<{
        id: string;
        name: string;
        description: string | null;
        is_default: boolean;
        items: Array<{
          item_id: string;
          instrument_id: string;
          symbol: string;
          company_name: string;
          last_price: number;
          change: number;
          change_percent: number;
          volume: number;
          data_classification: string;
        }>;
      }>;
    }>('/watchlists', { requireAuth: true }),
  createWatchlist: (name: string, description?: string) =>
    apiRequest('/watchlists', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
      requireAuth: true,
    }),
  deleteWatchlist: (id: string) =>
    apiRequest(`/watchlists/${id}`, { method: 'DELETE', requireAuth: true }),
  addWatchlistItem: (watchlistId: string, symbol: string) =>
    apiRequest(`/watchlists/${watchlistId}/items`, {
      method: 'POST',
      body: JSON.stringify({ symbol }),
      requireAuth: true,
    }),
  removeWatchlistItem: (watchlistId: string, instrumentId: string) =>
    apiRequest(`/watchlists/${watchlistId}/items/${instrumentId}`, {
      method: 'DELETE',
      requireAuth: true,
    }),
  getAlerts: () =>
    apiRequest<{
      items: Array<{
        id: string;
        instrument_id: string;
        symbol: string;
        company_name: string;
        condition_type: string;
        threshold_value: string;
        is_active: boolean;
        triggered_count: number;
        notification_channels: string;
        created_at: string;
      }>;
    }>('/alerts', { requireAuth: true }),
  createAlert: (body: { symbol: string; condition_type: string; threshold_value: number }) =>
    apiRequest('/alerts', {
      method: 'POST',
      body: JSON.stringify(body),
      requireAuth: true,
    }),
  updateAlert: (id: string, body: { is_active?: boolean; threshold_value?: number }) =>
    apiRequest(`/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      requireAuth: true,
    }),
  deleteAlert: (id: string) =>
    apiRequest(`/alerts/${id}`, { method: 'DELETE', requireAuth: true }),

  // Trading & Orders
  previewOrder: (body: {
    symbol: string;
    side: 'BUY' | 'SELL';
    order_type: 'MARKET' | 'LIMIT';
    quantity: number;
    limit_price?: number;
  }) =>
    apiRequest<OrderPreviewResponse>('/orders/preview', {
      method: 'POST',
      body: JSON.stringify(body),
      requireAuth: true,
    }),
  createOrderAuthChallenge: (previewId: string) =>
    apiRequest<{
      authorization_id: string;
      preview_id: string;
      challenge_method: string;
      status: string;
      expires_at: string;
      sandbox_otp_hint: string | null;
      instructions: string;
    }>('/orders/authorization-challenges', {
      method: 'POST',
      body: JSON.stringify({ preview_id: previewId }),
      requireAuth: true,
    }),
  verifyOrderAuthChallenge: (challengeId: string, otpCode: string) =>
    apiRequest<{ authorization_id: string; status: string }>(
      `/orders/authorization-challenges/${challengeId}/verify`,
      {
        method: 'POST',
        body: JSON.stringify({ otp_code: otpCode }),
        requireAuth: true,
      },
    ),
  placeOrder: (
    body: {
      preview_id: string;
      authorization_id: string;
      symbol: string;
      side: 'BUY' | 'SELL';
      order_type: 'MARKET' | 'LIMIT';
      quantity: number;
      limit_price?: number;
      simulation_mode?: string;
    },
    idempotencyKey: string,
  ) =>
    apiRequest<OrderItem & { idempotency_replayed: boolean }>('/orders', {
      method: 'POST',
      body: JSON.stringify(body),
      idempotencyKey,
      requireAuth: true,
    }),
  getOrders: (statusFilter?: string) =>
    apiRequest<{ items: OrderItem[] }>(
      statusFilter ? `/orders?status=${encodeURIComponent(statusFilter)}` : '/orders',
      { requireAuth: true },
    ),
  getOrderDetail: (id: string) =>
    apiRequest<
      OrderItem & {
        status_history: Array<{
          from_status: string | null;
          to_status: string;
          reason: string;
          correlation_id: string;
          timestamp: string;
        }>;
      }
    >(`/orders/${id}`, { requireAuth: true }),
  getOrderExecutions: (id: string) =>
    apiRequest<{
      items: Array<{
        id: string;
        trade_id: string;
        broker_execution_id: string;
        quantity: string;
        price: string;
        gross_value: string;
        fees: string;
        taxes: string;
        net_value: string;
        executed_at: string;
      }>;
    }>(`/orders/${id}/executions`, { requireAuth: true }),
  cancelOrder: (id: string, reason: string) =>
    apiRequest<OrderItem>(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      requireAuth: true,
    }),
  getTrades: () => apiRequest<{ items: TradeItem[] }>('/trades', { requireAuth: true }),
  getContractNote: (tradeId: string) =>
    apiRequest<{
      id: string;
      note_number: string;
      trade_id: string;
      is_sandbox: boolean;
      generated_at: string;
      details: Record<string, unknown>;
      rendered_html: string;
    }>(`/trades/${tradeId}/contract-note`, { requireAuth: true }),

  // Admin
  adminGetDashboard: () =>
    apiRequest<{ kpis: Record<string, number>; sandbox_mode: boolean; generated_at: string }>(
      '/admin/dashboard',
      { requireAuth: true },
    ),
  adminGetCustomers: () =>
    apiRequest<{ items: Array<Record<string, unknown>> }>('/admin/customers', { requireAuth: true }),
  adminSetCustomerRestriction: (customerId: string, restricted: boolean, reason: string) =>
    apiRequest(`/admin/customers/${customerId}/restriction`, {
      method: 'PATCH',
      body: JSON.stringify({ trading_restricted: restricted, reason }),
      requireAuth: true,
    }),
  adminGetOrders: () =>
    apiRequest<{ items: Array<Record<string, unknown>> }>('/admin/orders', { requireAuth: true }),
  adminGetSettlements: () =>
    apiRequest<{ items: Array<Record<string, unknown>> }>('/admin/settlements', { requireAuth: true }),
  adminSettleTrade: (id: string) =>
    apiRequest(`/admin/settlements/${id}/settle`, { method: 'POST', requireAuth: true }),
  adminFailSettlement: (id: string, reason: string) =>
    apiRequest(`/admin/settlements/${id}/fail`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      requireAuth: true,
    }),
  adminRetrySettlement: (id: string) =>
    apiRequest(`/admin/settlements/${id}/retry`, { method: 'POST', requireAuth: true }),
  adminGetReconRuns: () =>
    apiRequest<{ items: Array<Record<string, unknown>> }>('/admin/reconciliation', {
      requireAuth: true,
    }),
  adminRunReconciliation: () =>
    apiRequest('/admin/reconciliation/run', {
      method: 'POST',
      body: JSON.stringify({ run_type: 'MANUAL' }),
      requireAuth: true,
    }),
  adminGetReconExceptions: () =>
    apiRequest<{ items: Array<Record<string, unknown>> }>('/admin/reconciliation/exceptions', {
      requireAuth: true,
    }),
  adminExportReconCsv: () =>
    apiRequest<string>('/admin/reconciliation/exceptions/export', { requireAuth: true }),
  adminGetComplianceFlags: () =>
    apiRequest<{ items: Array<Record<string, unknown>> }>('/admin/compliance/flags', {
      requireAuth: true,
    }),
  adminUpdateComplianceFlag: (id: string, status: string, resolutionNotes: string) =>
    apiRequest(`/admin/compliance/flags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolution_notes: resolutionNotes }),
      requireAuth: true,
    }),
  adminGetApprovals: () =>
    apiRequest<{ items: Array<Record<string, unknown>> }>('/admin/approvals', { requireAuth: true }),
  adminCreateApproval: (body: {
    approval_type: string;
    resource_type: string;
    resource_id: string;
    reason: string;
    payload?: Record<string, unknown>;
  }) =>
    apiRequest('/admin/approvals', {
      method: 'POST',
      body: JSON.stringify(body),
      requireAuth: true,
    }),
  adminDecideApproval: (id: string, approve: boolean, decisionNotes: string) =>
    apiRequest(`/admin/approvals/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ approve, decision_notes: decisionNotes }),
      requireAuth: true,
    }),
  adminGetAuditLogs: () =>
    apiRequest<{ items: Array<Record<string, unknown>> }>('/admin/audit-logs', { requireAuth: true }),
  adminGetProvidersHealth: () =>
    apiRequest<Record<string, unknown>>('/admin/providers/health', { requireAuth: true }),
  adminTriggerIngestion: () =>
    apiRequest('/admin/providers/ingest', { method: 'POST', requireAuth: true }),
  adminGetConfig: () =>
    apiRequest<Record<string, unknown>>('/admin/config', { requireAuth: true }),
  ussdSimulate: (sessionId: string, text: string) =>
    apiRequest<{ session_id: string; action: string; text: string }>('/channels/ussd/session', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, text }),
    }),
};
