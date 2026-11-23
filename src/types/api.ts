export interface AuthMeResponse {
  user_id: string;
  oidc_sub: string;
  email: string;
  username: string;
  full_name: string;
  roles: string[];
  scopes: string[];
  channel: string;
  client_id: string;
  mfa_verified: boolean;
  is_dev_fixture: boolean;
  customer_id: string | null;
  environment: string;
  sandbox_mode: boolean;
  features: {
    market_intelligence: boolean;
    trading_enabled: boolean;
  };
}

export interface MarketStatus {
  exchange: string;
  timezone: string;
  session: string;
  is_open: boolean;
  utc_timestamp: string;
  lagos_timestamp: string;
  trading_hours_wat: string;
}

export interface MarketIndexItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  value: number;
  open: number;
  high: number;
  low: number;
  change_points: number;
  change_percent: number;
  total_market_cap: number | null;
  value_date: string | null;
  data_classification: string;
}

export interface StockSummary {
  instrument_id: string;
  symbol: string;
  isin: string;
  company_name: string;
  short_name: string;
  sector_code: string;
  sector_name: string;
  currency: string;
  trading_status: string;
  is_featured: boolean;
  aliases: string[];
  last_price: number;
  open_price: number;
  high_price: number;
  low_price: number;
  previous_close: number;
  change: number;
  change_percent: number;
  volume: number;
  market_cap: number;
  pe_ratio: number | null;
  pb_ratio: number | null;
  dividend_yield_pct: number | null;
  eps: number | null;
  provider_name: string;
  provider_timestamp: string | null;
  ingestion_timestamp: string | null;
  freshness_status: string;
  quality_status: string;
  data_classification: string;
}

export interface MarketOverview {
  market_status: MarketStatus;
  sandbox_mode: boolean;
  data_classification: string;
  freshness_status: string;
  asi_index: MarketIndexItem | null;
  indices: MarketIndexItem[];
  total_market_cap_ngn: number;
  total_volume: number;
  breadth: { advancers: number; decliners: number; unchanged: number; total: number };
  featured_stock: StockSummary | null;
  market_chart_series: Array<{ date: string; ngx_asi: number; firstholdco: number; volume: number }>;
  top_gainers: StockSummary[];
  top_losers: StockSummary[];
  most_active: StockSummary[];
  sector_performance: Array<{
    sector: string;
    equities_count: number;
    avg_change_percent: number;
    total_market_cap: number;
    total_volume: number;
  }>;
  recent_news: Array<{
    id: string;
    headline: string;
    summary: string;
    source: string;
    category: string;
    published_at: string;
    is_simulated: boolean;
  }>;
}

export interface StockDetail {
  instrument_id: string;
  symbol: string;
  requested_identifier: string;
  isin: string;
  exchange: string;
  company_name: string;
  short_name: string;
  sector_code: string;
  sector_name: string;
  description: string;
  website_url: string | null;
  investor_relations_url: string | null;
  currency: string;
  trading_status: string;
  shares_outstanding: number | null;
  listing_date: string | null;
  is_featured: boolean;
  aliases: Array<{
    alias_symbol: string;
    alias_name: string | null;
    alias_type: string;
    effective_from: string | null;
    effective_to: string | null;
  }>;
  quote: {
    last_price: number;
    open_price: number;
    high_price: number;
    low_price: number;
    previous_close: number;
    change: number;
    change_percent: number;
    volume: number;
    market_cap: number | null;
    provider_timestamp: string;
    freshness_status: string;
    data_classification: string;
    is_live_market_price: boolean;
  };
}

export interface HistoricalBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  unadjusted_close: number;
  adjusted_close: number;
  volume: number;
}

export interface StockHistoryResponse {
  instrument_id: string;
  symbol: string;
  range: string;
  interval: string;
  intraday_supported: boolean;
  message?: string;
  available_ranges: string[];
  data_classification: string;
  bars: HistoricalBar[];
}

export interface StockAnalyticsResponse {
  instrument_id: string;
  symbol: string;
  as_of_date: string | null;
  price_series_mode: string;
  observations_count: number;
  latest_close: number | null;
  daily_change: number | null;
  daily_return_pct: number | null;
  returns: Record<'7d' | '30d' | '90d' | 'ytd' | '1y', number | null>;
  moving_averages: {
    sma_20: number | null;
    sma_50: number | null;
    sma_200: number | null;
    ema_12: number | null;
    ema_26: number | null;
  };
  oscillators: {
    rsi_14: number | null;
    macd: number | null;
    macd_signal: number | null;
    macd_histogram: number | null;
    bollinger_upper: number | null;
    bollinger_middle: number | null;
    bollinger_lower: number | null;
  };
  volume_analysis: {
    avg_volume_20d: number | null;
    relative_volume: number | null;
    volume_trend: string;
  };
  risk_metrics: {
    annualized_volatility_pct: number | null;
    volatility_label: string;
    volatility_disclaimer: string;
    max_drawdown_pct: number | null;
    week_52_high: number | null;
    week_52_low: number | null;
  };
  valuation: {
    dividend_yield_pct: number | null;
    eps: number | null;
    pe_ratio: number | null;
    pb_ratio: number | null;
    market_cap: number | null;
  };
  indicator_series: Array<{
    date: string;
    close: number | null;
    sma_20: number | null;
    sma_50: number | null;
    ema_12: number | null;
    ema_26: number | null;
    rsi_14: number | null;
    macd: number | null;
    macd_signal: number | null;
    macd_histogram: number | null;
    bb_upper: number | null;
    bb_middle: number | null;
    bb_lower: number | null;
  }>;
  warnings: string[];
}

export interface PortfolioHolding {
  instrument_id: string;
  symbol: string;
  company_name: string;
  sector: string;
  settled_quantity: string;
  unsettled_quantity: string;
  reserved_quantity: string;
  available_to_sell: string;
  total_quantity: string;
  average_cost: string;
  current_price: string;
  cost_basis: string;
  market_value: string;
  unrealized_pnl: string;
  return_pct: string;
  realized_pnl: string;
  day_change: string;
  data_classification: string;
}

export interface PortfolioValuation {
  id: string;
  name: string;
  account_number: string;
  currency: string;
  cost_basis_method: string;
  equity_market_value: string;
  available_cash: string;
  reserved_cash: string;
  total_cash: string;
  total_portfolio_value: string;
  total_cost_basis: string;
  unrealized_pnl: string;
  realized_pnl: string;
  return_pct: string;
  daily_change: string;
  daily_change_pct: string;
  holdings_count: number;
  holdings: PortfolioHolding[];
  asset_allocation: Array<{ name: string; value: number; pct: number }>;
  sector_allocation: Array<{ sector: string; value: number; pct: number }>;
  concentration: {
    hhi: number;
    concentration_band: string;
    top_holding_symbol: string | null;
    top_holding_weight_pct: number;
  };
}

export interface CustomerProfileSummary {
  id: string;
  customer_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  state_of_residence: string | null;
  onboarding_status: string;
  trading_restricted: boolean;
  restriction_reason: string | null;
  investment_account: {
    id: string;
    account_number: string;
    cscs_sandbox_chn: string | null;
    currency: string;
    status: string;
    available_cash: string;
    reserved_cash: string;
    total_cash: string;
  };
  default_portfolio_id: string;
  kyc: {
    status: string;
    kyc_tier: string;
    aml_screening_status: string;
    verified_at: string | null;
  };
  risk_assessment: {
    id: string;
    risk_tier: string;
    total_score: number;
    max_score: number;
    suitability_summary: string;
    expires_at: string;
  } | null;
  consents: Array<{
    consent_type: string;
    version: string;
    accepted: boolean;
    accepted_at: string;
  }>;
  required_consents: string[];
  trading_eligibility: {
    eligible: boolean;
    blocking_reasons: string[];
  };
}

export interface OrderPreviewResponse {
  preview_id: string;
  symbol: string;
  company_name: string;
  side: 'BUY' | 'SELL';
  order_type: 'MARKET' | 'LIMIT';
  time_in_force: string;
  quantity: string;
  limit_price: string | null;
  estimated_price: string;
  gross_consideration: string;
  charges: {
    brokerage_fee: string;
    sec_fee: string;
    ngx_fee: string;
    cscs_fee: string;
    stamp_duty: string;
    vat_amount: string;
    total_charges: string;
    effective_date: string;
  };
  net_order_value: string;
  currency: string;
  available_cash: string;
  available_shares: string;
  quote_timestamp: string;
  quote_classification: string;
  binding_digest_sha256: string;
  risk_warnings: string[];
  expires_at: string;
}

export interface OrderItem {
  id: string;
  order_reference: string;
  symbol: string;
  instrument_id: string;
  side: 'BUY' | 'SELL';
  order_type: string;
  time_in_force: string;
  quantity: string;
  filled_quantity: string;
  remaining_quantity: string;
  limit_price: string | null;
  reference_price: string;
  average_fill_price: string | null;
  estimated_total_value: string;
  reserved_amount: string;
  currency: string;
  status: string;
  settlement_status: string;
  broker_provider: string;
  broker_order_id: string | null;
  simulation_mode: string | null;
  channel: string;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  is_simulated: boolean;
  created_at: string;
  submitted_at: string | null;
  completed_at: string | null;
}

export interface TradeItem {
  id: string;
  trade_reference: string;
  order_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: string;
  execution_price: string;
  gross_consideration: string;
  brokerage_fee: string;
  statutory_fees: string;
  taxes: string;
  total_charges: string;
  net_amount: string;
  currency: string;
  settlement_status: string;
  expected_settlement_date: string | null;
  executed_at: string;
  is_simulated: boolean;
}
