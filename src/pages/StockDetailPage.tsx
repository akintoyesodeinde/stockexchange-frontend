import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  ExternalLink,
  Landmark,
  ShieldAlert,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/features/authentication/AuthContext';
import { api } from '@/services/apiClient';
import { CandlestickChart } from '@/components/charts/CandlestickChart';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataClassificationBadge,
  ErrorRecoveryState,
  Skeleton,
  cn,
} from '@/components/ui/primitives';
import {
  formatLagosDateTime,
  formatNGN,
  formatNumber,
  formatPercent,
  movementBgClass,
  movementColorClass,
} from '@/utilities/format';

const CHART_RANGES = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'] as const;

export function StockDetailPage() {
  const { symbol = 'FIRSTHOLDCO' } = useParams();
  const { isAuthenticated, theme } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [range, setRange] = useState<(typeof CHART_RANGES)[number]>('1Y');
  const [chartMode, setChartMode] = useState<'candlestick' | 'area'>('candlestick');
  const [adjusted, setAdjusted] = useState(true);
  const [showSma20, setShowSma20] = useState(true);
  const [showSma50, setShowSma50] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'statements' | 'dividends' | 'actions' | 'news'
  >('overview');
  const [statementFilter, setStatementFilter] = useState<'INCOME' | 'BALANCE_SHEET' | 'CASH_FLOW'>(
    'INCOME',
  );
  const [watchMsg, setWatchMsg] = useState<string | null>(null);

  const { data: detail, isLoading, error, refetch } = useQuery({
    queryKey: ['stock-detail', symbol],
    queryFn: () => api.getStockDetail(symbol),
  });

  const { data: history } = useQuery({
    queryKey: ['stock-history', symbol, range, adjusted],
    queryFn: () => api.getStockHistory(symbol, range, adjusted),
  });

  const { data: analytics } = useQuery({
    queryKey: ['stock-analytics', symbol, adjusted],
    queryFn: () => api.getStockAnalytics(symbol, adjusted),
  });

  const { data: fundamentals } = useQuery({
    queryKey: ['stock-fundamentals', symbol],
    queryFn: () => api.getStockFundamentals(symbol),
  });

  const { data: statements } = useQuery({
    queryKey: ['stock-statements', symbol],
    queryFn: () => api.getStockStatements(symbol),
  });

  const { data: dividends } = useQuery({
    queryKey: ['stock-dividends', symbol],
    queryFn: () => api.getStockDividends(symbol),
  });

  const { data: actions } = useQuery({
    queryKey: ['stock-actions', symbol],
    queryFn: () => api.getStockCorporateActions(symbol),
  });

  const { data: news } = useQuery({
    queryKey: ['stock-news', symbol],
    queryFn: () => api.getStockNews(symbol),
  });

  const { data: watchlists } = useQuery({
    queryKey: ['watchlists'],
    queryFn: () => api.getWatchlists(),
    enabled: isAuthenticated,
  });

  const addWatchMutation = useMutation({
    mutationFn: async () => {
      const wl = watchlists?.items[0];
      if (!wl) throw new Error('Sign in first to add to a watchlist.');
      await api.addWatchlistItem(wl.id, detail?.symbol || symbol);
    },
    onSuccess: () => {
      setWatchMsg(`Added ${detail?.symbol || symbol} to your watchlist.`);
      void queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      setTimeout(() => setWatchMsg(null), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <ErrorRecoveryState
        title={`Unable to load ${symbol}`}
        message={error instanceof Error ? error.message : 'Stock not found.'}
        onRetry={() => void refetch()}
      />
    );
  }

  const fund = fundamentals?.fundamentals;
  const volLabel = analytics?.risk_metrics.volatility_label ?? 'INSUFFICIENT_DATA';
  const volTone =
    volLabel === 'LOW_VOLATILITY'
      ? 'green'
      : volLabel === 'MEDIUM_VOLATILITY'
        ? 'amber'
        : volLabel === 'HIGH_VOLATILITY'
          ? 'red'
          : 'neutral';

  return (
    <div className="space-y-6">
      {/* Issuer Hero Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#002855] to-[#001A35] p-6 text-white">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {detail.is_featured && <Badge tone="gold">FEATURED NGX COMPANY</Badge>}
                <Badge tone="blue">{detail.exchange} • {detail.sector_name}</Badge>
                <Badge tone="neutral">ISIN: {detail.isin}</Badge>
                {detail.aliases.map((al) => (
                  <Badge key={al.alias_symbol} tone="gold">
                    Former Symbol: {al.alias_symbol}
                  </Badge>
                ))}
                <DataClassificationBadge classification={detail.quote.data_classification} />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4AF37] text-[#001A35]">
                  <Landmark className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {detail.company_name}{' '}
                    <span className="text-[#D4AF37]">({detail.symbol})</span>
                  </h1>
                  <p className="text-xs text-slate-300">
                    Internal Stable Instrument ID: <code>{detail.instrument_id}</code> • Status:{' '}
                    <strong>{detail.trading_status}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              <div className="tabular-nums">
                <div className="text-[11px] uppercase tracking-wider text-slate-300">
                  Latest Available Price (Simulated)
                </div>
                <div className="text-3xl font-black">{formatNGN(detail.quote.last_price)}</div>
                <div className="mt-0.5 flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold',
                      movementBgClass(detail.quote.change_percent),
                    )}
                  >
                    {detail.quote.change >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {detail.quote.change >= 0 ? '+' : ''}
                    {formatNGN(detail.quote.change)} ({formatPercent(detail.quote.change_percent)})
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="gold"
                  onClick={() => navigate(`/trade?symbol=${detail.symbol}&side=BUY`)}
                >
                  Buy {detail.symbol}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => navigate(`/trade?symbol=${detail.symbol}&side=SELL`)}
                >
                  Sell {detail.symbol}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    isAuthenticated ? addWatchMutation.mutate() : navigate('/login')
                  }
                >
                  <Star className="h-4 w-4 text-[#D4AF37]" /> Watchlist
                </Button>
              </div>
            </div>
          </div>
          {watchMsg && (
            <div className="mt-3 rounded bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-200">
              {watchMsg}
            </div>
          )}
        </div>

        {/* Key Quote Strip */}
        <div className="grid grid-cols-2 gap-4 bg-white px-6 py-3.5 text-xs tabular-nums dark:bg-[#0E1F38] sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <span className="text-slate-500">Open</span>
            <div className="font-bold text-slate-900 dark:text-white">
              {formatNGN(detail.quote.open_price)}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Day High / Low</span>
            <div className="font-bold text-slate-900 dark:text-white">
              {formatNGN(detail.quote.high_price)} / {formatNGN(detail.quote.low_price)}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Prev. Close</span>
            <div className="font-bold text-slate-900 dark:text-white">
              {formatNGN(detail.quote.previous_close)}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Volume</span>
            <div className="font-bold text-slate-900 dark:text-white">
              {formatNumber(detail.quote.volume, true)}
            </div>
          </div>
          <div>
            <span className="text-slate-500">52W High / Low</span>
            <div className="font-bold text-slate-900 dark:text-white">
              {formatNGN(analytics?.risk_metrics.week_52_high)} /{' '}
              {formatNGN(analytics?.risk_metrics.week_52_low)}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Market Cap</span>
            <div className="font-bold text-slate-900 dark:text-white">
              {formatNGN(detail.quote.market_cap, true)}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Interactive Price & Candlestick Chart (TradingView Lightweight Charts) */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            {CHART_RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition',
                  range === r
                    ? 'bg-[#002855] text-white dark:bg-[#D4AF37] dark:text-[#001A35]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setChartMode((m) => (m === 'candlestick' ? 'area' : 'candlestick'))}
              className="rounded-md border border-slate-200 px-2.5 py-1 font-medium dark:border-slate-700"
            >
              Mode: {chartMode === 'candlestick' ? 'Candlestick' : 'Line / Area'}
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={showSma20}
                onChange={(e) => setShowSma20(e.target.checked)}
              />
              <span className="text-amber-600 dark:text-[#D4AF37]">SMA 20</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={showSma50}
                onChange={(e) => setShowSma50(e.target.checked)}
              />
              <span className="text-sky-600 dark:text-sky-400">SMA 50</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={showVolume}
                onChange={(e) => setShowVolume(e.target.checked)}
              />
              <span>Volume</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={adjusted}
                onChange={(e) => setAdjusted(e.target.checked)}
              />
              <span>Corp. Action Adjusted</span>
            </label>
          </div>
        </div>

        <div className="p-4">
          {history && history.bars.length > 0 ? (
            <CandlestickChart
              bars={history.bars}
              indicators={analytics?.indicator_series}
              chartMode={chartMode}
              showSma20={showSma20}
              showSma50={showSma50}
              showVolume={showVolume}
              darkMode={theme === 'dark'}
            />
          ) : (
            <div className="flex h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
              <AlertCircle className="h-8 w-8 text-amber-500" />
              <p className="mt-2 max-w-md text-sm font-semibold text-slate-800 dark:text-slate-200">
                {history?.message || 'Historical price bars unavailable for this range.'}
              </p>
              <Button variant="primary" size="sm" className="mt-3" onClick={() => setRange('1Y')}>
                Switch to 1Y Daily OHLCV
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Analytics Grid: Returns, Technical Indicators, RSI/MACD Chart, Volatility */}
      {analytics && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader
              title="Technical Oscillators — RSI (14) & MACD (12, 26, 9)"
              subtitle={`Computed by Pandas/NumPy engine (${analytics.observations_count} trading days, ${analytics.price_series_mode})`}
            />
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                  <span>RSI (14)</span>
                  <span className="tabular-nums text-[#002855] dark:text-[#D4AF37]">
                    {analytics.oscillators.rsi_14 ?? '—'}
                  </span>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.indicator_series.slice(-60)}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" hide />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="3 3" />
                      <ReferenceLine y={30} stroke="#10B981" strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="rsi_14" stroke="#002855" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                  <span>MACD vs Signal</span>
                  <span className="tabular-nums text-[#002855] dark:text-[#D4AF37]">
                    {analytics.oscillators.macd ?? '—'} / {analytics.oscillators.macd_signal ?? '—'}
                  </span>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.indicator_series.slice(-60)}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" hide />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="macd" stroke="#002855" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="macd_signal" stroke="#D4AF37" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Period Returns Bar */}
            <div className="grid grid-cols-5 gap-2 border-t border-slate-100 px-5 py-3 text-center text-xs tabular-nums dark:border-slate-800">
              {(['7d', '30d', '90d', 'ytd', '1y'] as const).map((period) => (
                <div key={period}>
                  <div className="uppercase text-slate-500">{period}</div>
                  <div
                    className={cn(
                      'mt-0.5 font-bold',
                      movementColorClass(analytics.returns[period]),
                    )}
                  >
                    {formatPercent(analytics.returns[period])}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Volatility & Technical Summary"
              action={<Badge tone={volTone}>{volLabel.replace('_', ' ')}</Badge>}
            />
            <div className="space-y-3 p-4 text-xs tabular-nums">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900">
                  <span className="text-slate-500">Annualized Vol (252d)</span>
                  <div className="mt-0.5 text-base font-bold">
                    {analytics.risk_metrics.annualized_volatility_pct !== null
                      ? `${analytics.risk_metrics.annualized_volatility_pct}%`
                      : '—'}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900">
                  <span className="text-slate-500">Max Drawdown</span>
                  <div className="mt-0.5 text-base font-bold text-rose-600">
                    {analytics.risk_metrics.max_drawdown_pct !== null
                      ? `${analytics.risk_metrics.max_drawdown_pct}%`
                      : '—'}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900">
                  <span className="text-slate-500">Bollinger Upper / Lower</span>
                  <div className="mt-0.5 font-bold">
                    {formatNGN(analytics.oscillators.bollinger_upper)} /{' '}
                    {formatNGN(analytics.oscillators.bollinger_lower)}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900">
                  <span className="text-slate-500">Volume Trend (20D)</span>
                  <div className="mt-0.5 font-bold">
                    {analytics.volume_analysis.volume_trend.replace('_', ' ')} (
                    {analytics.volume_analysis.relative_volume ?? '—'}x)
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                <div className="flex items-center gap-1 font-semibold">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" /> Risk Disclosure
                </div>
                <p className="mt-1">{analytics.risk_metrics.volatility_disclaimer}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Fundamental Tabs: Overview, Financial Statements, Dividends, Corporate Actions, News */}
      <Card>
        <div className="flex flex-wrap gap-1 border-b border-slate-100 px-5 pt-3 dark:border-slate-800">
          {(
            [
              ['overview', 'Company Overview & Ratios'],
              ['statements', 'Financial Statements'],
              ['dividends', 'Dividend History'],
              ['actions', 'Corporate Actions'],
              ['news', 'Issuer News'],
            ] as const
          ).map(([key, lbl]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                'border-b-2 px-4 py-2.5 text-xs font-semibold transition',
                activeTab === key
                  ? 'border-[#D4AF37] text-[#002855] dark:text-[#D4AF37]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400',
              )}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'overview' && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-3 lg:col-span-2">
                <h3 className="text-sm font-bold text-[#002855] dark:text-white">
                  About {detail.company_name}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {detail.description}
                </p>
                <div className="flex flex-wrap gap-4 pt-2 text-xs">
                  {detail.website_url && (
                    <a
                      href={detail.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#002855] underline dark:text-[#D4AF37]"
                    >
                      Official Website <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {detail.investor_relations_url && (
                    <a
                      href={detail.investor_relations_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#002855] underline dark:text-[#D4AF37]"
                    >
                      Investor Relations <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
                {[
                  ['EPS (TTM)', fund?.eps !== null && fund?.eps !== undefined ? formatNGN(fund.eps) : '—'],
                  ['P/E Ratio', fund?.pe_ratio ? `${fund.pe_ratio.toFixed(2)}x` : '—'],
                  ['P/B Ratio', fund?.pb_ratio ? `${fund.pb_ratio.toFixed(2)}x` : '—'],
                  ['Book Value/Sh', fund?.book_value_per_share ? formatNGN(fund.book_value_per_share) : '—'],
                  ['Dividend Yield', fund?.dividend_yield_pct ? `${fund.dividend_yield_pct.toFixed(2)}%` : '—'],
                  ['ROE', fund?.roe_pct ? `${fund.roe_pct.toFixed(2)}%` : '—'],
                  ['ROA', fund?.roa_pct ? `${fund.roa_pct.toFixed(2)}%` : '—'],
                  ['Debt/Equity', fund?.debt_to_equity ? `${fund.debt_to_equity.toFixed(2)}x` : '—'],
                ].map(([label, val]) => (
                  <div key={label} className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900">
                    <div className="text-slate-500">{label}</div>
                    <div className="mt-0.5 font-bold text-slate-900 dark:text-white">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'statements' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {(['INCOME', 'BALANCE_SHEET', 'CASH_FLOW'] as const).map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={statementFilter === st ? 'primary' : 'secondary'}
                    onClick={() => setStatementFilter(st)}
                  >
                    {st.replace('_', ' ')}
                  </Button>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                    <tr>
                      <th className="py-2 pr-4">Line Item (NGN — Simulated)</th>
                      {statements?.items
                        .filter((s) => s.statement_type === statementFilter)
                        .map((s) => (
                          <th key={s.id} className="px-4 py-2 text-right">
                            FY {s.fiscal_year}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums dark:divide-slate-800">
                    {(() => {
                      const filtered =
                        statements?.items.filter((s) => s.statement_type === statementFilter) ?? [];
                      const keys = filtered[0] ? Object.keys(filtered[0].line_items) : [];
                      return keys.map((k) => (
                        <tr key={k}>
                          <td className="py-2.5 pr-4 font-medium capitalize">
                            {k.replace(/_/g, ' ')}
                          </td>
                          {filtered.map((s) => (
                            <td key={s.id} className="px-4 py-2.5 text-right font-semibold">
                              {k.includes('eps')
                                ? formatNGN(s.line_items[k])
                                : formatNGN(s.line_items[k], true)}
                            </td>
                          ))}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'dividends' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                  <tr>
                    <th className="py-2">Fiscal Year</th>
                    <th className="py-2">Type</th>
                    <th className="py-2 text-right">Amount/Share</th>
                    <th className="py-2">Ex-Dividend Date</th>
                    <th className="py-2">Payment Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums dark:divide-slate-800">
                  {dividends?.items.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2.5 font-semibold">{d.fiscal_year}</td>
                      <td className="py-2.5">{d.dividend_type}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">
                        {formatNGN(d.amount_per_share)}
                      </td>
                      <td className="py-2.5">{d.ex_dividend_date}</td>
                      <td className="py-2.5">{d.payment_date}</td>
                    </tr>
                  )) || null}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-3">
              {actions?.items.length ? (
                actions.items.map((ca) => (
                  <div
                    key={ca.id}
                    className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#002855] dark:text-white">
                        {ca.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge tone="gold">{ca.action_type}</Badge>
                        <span className="text-xs text-slate-500">
                          Effective: {ca.effective_date}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {ca.description}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No recorded corporate actions for this equity.</p>
              )}
            </div>
          )}

          {activeTab === 'news' && (
            <div className="space-y-3">
              {news?.items.length ? (
                news.items.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {n.headline}
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{n.summary}</p>
                    <div className="mt-1.5 text-[11px] text-slate-400">
                      {n.source} • {formatLagosDateTime(n.published_at)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No issuer-specific news items available.</p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
