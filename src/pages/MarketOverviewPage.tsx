import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Clock,
  Landmark,
  Newspaper,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/features/authentication/AuthContext';
import { api } from '@/services/apiClient';
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

export function MarketOverviewPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [moversTab, setMoversTab] = useState<'gainers' | 'losers' | 'active'>('gainers');

  const {
    data: overview,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['market-overview'],
    queryFn: () => api.getMarketOverview(),
    refetchInterval: 60_000,
  });

  const { data: portfolios } = useQuery({
    queryKey: ['portfolios'],
    queryFn: () => api.getPortfolios(),
    enabled: isAuthenticated && Boolean(user?.customer_id),
  });

  const { data: watchlists } = useQuery({
    queryKey: ['watchlists'],
    queryFn: () => api.getWatchlists(),
    enabled: isAuthenticated && Boolean(user?.customer_id),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <ErrorRecoveryState
        title="Market Overview Unavailable"
        message={error instanceof Error ? error.message : 'Unable to reach StockExchange API.'}
        onRetry={() => void refetch()}
      />
    );
  }

  const primaryPortfolio = portfolios?.items[0];
  const featured = overview.featured_stock;
  const asi = overview.asi_index;
  const movers =
    moversTab === 'gainers'
      ? overview.top_gainers
      : moversTab === 'losers'
        ? overview.top_losers
        : overview.most_active;

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#002855] dark:text-white">
            NGX Market Intelligence Overview
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Session: <strong>{overview.market_status.session}</strong> (
              {overview.market_status.trading_hours_wat})
            </span>
            <span>•</span>
            <span>{formatLagosDateTime(overview.market_status.utc_timestamp)}</span>
            <DataClassificationBadge classification={overview.data_classification} />
            <Badge tone="blue">Freshness: {overview.freshness_status}</Badge>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/screener')}>
            Explore NGX Screener
          </Button>
          <Button variant="gold" size="sm" onClick={() => navigate('/trade?symbol=FIRSTHOLDCO')}>
            Trade FIRSTHOLDCO
          </Button>
        </div>
      </div>

      {/* Top KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>NGX All-Share Index (ASI)</span>
            <Activity className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-[#002855] dark:text-white">
            {asi ? formatNumber(asi.value) : '—'}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs tabular-nums">
            <span className={cn('font-semibold', movementColorClass(asi?.change_percent))}>
              {asi ? `${asi.change_points >= 0 ? '+' : ''}${formatNumber(asi.change_points)} (${formatPercent(asi.change_percent)})` : '—'}
            </span>
            <DataClassificationBadge classification={asi?.data_classification} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Tracked NGX Market Cap</span>
            <Building2 className="h-4 w-4 text-[#002855] dark:text-[#D4AF37]" />
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-[#002855] dark:text-white">
            {formatNGN(overview.total_market_cap_ngn, true)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Breadth:{' '}
            <span className="font-semibold text-emerald-600">{overview.breadth.advancers} Up</span>{' '}
            / <span className="font-semibold text-rose-600">{overview.breadth.decliners} Down</span>{' '}
            / {overview.breadth.total} Equities
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Available Investment Cash</span>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-[#002855] dark:text-white">
            {primaryPortfolio ? formatNGN(primaryPortfolio.available_cash) : 'Sign in to view'}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {primaryPortfolio ? (
              <span>Reserved cash: {formatNGN(primaryPortfolio.reserved_cash)}</span>
            ) : (
              <Link to="/login" className="font-semibold text-[#002855] underline dark:text-[#D4AF37]">
                Sign in with Sandbox Investor
              </Link>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Portfolio Valuation</span>
            <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-[#002855] dark:text-white">
            {primaryPortfolio ? formatNGN(primaryPortfolio.total_portfolio_value) : '—'}
          </div>
          <div className="mt-1 text-xs tabular-nums">
            {primaryPortfolio ? (
              <span className={cn('font-semibold', movementColorClass(primaryPortfolio.daily_change))}>
                Day: {formatNGN(primaryPortfolio.daily_change)} (
                {formatPercent(primaryPortfolio.daily_change_pct)})
              </span>
            ) : (
              <span className="text-slate-400">Portfolio &amp; P&amp;L tracked in NGN</span>
            )}
          </div>
        </Card>
      </div>

      {/* Featured First HoldCo Hero Spotlight Card */}
      {featured && (
        <div className="rounded-2xl bg-gradient-to-r from-[#002855] via-[#001F44] to-[#00142C] p-6 text-white shadow-lg">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="gold">FEATURED NGX COMPANY</Badge>
                <Badge tone="blue">ISIN: {featured.isin}</Badge>
                {featured.aliases.length > 0 && (
                  <Badge tone="neutral">Legacy Ticker: {featured.aliases.join(', ')}</Badge>
                )}
                <DataClassificationBadge classification={featured.data_classification} />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4AF37]/20 ring-1 ring-[#D4AF37]">
                  <Landmark className="h-6 w-6 text-[#D4AF37]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {featured.company_name}{' '}
                    <span className="text-[#D4AF37]">({featured.symbol})</span>
                  </h2>
                  <p className="text-xs text-slate-300">
                    {featured.sector_name} • Nigerian Exchange Limited (NGX) • Currency: NGN
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="tabular-nums">
                <div className="text-xs uppercase tracking-wider text-slate-300">
                  Simulated Share Price
                </div>
                <div className="text-3xl font-black text-white">
                  {formatNGN(featured.last_price)}
                </div>
                <div
                  className={cn(
                    'mt-0.5 text-sm font-semibold',
                    featured.change >= 0 ? 'text-emerald-400' : 'text-rose-400',
                  )}
                >
                  {featured.change >= 0 ? '+' : ''}
                  {formatNGN(featured.change)} ({formatPercent(featured.change_percent)})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-l border-white/15 pl-6 text-xs tabular-nums">
                <div>
                  <span className="text-slate-400">Market Cap</span>
                  <div className="font-semibold text-white">
                    {formatNGN(featured.market_cap, true)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Volume</span>
                  <div className="font-semibold text-white">
                    {formatNumber(featured.volume, true)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">P/E Ratio</span>
                  <div className="font-semibold text-white">
                    {featured.pe_ratio ? `${featured.pe_ratio.toFixed(2)}x` : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Div. Yield</span>
                  <div className="font-semibold text-[#D4AF37]">
                    {featured.dividend_yield_pct ? `${featured.dividend_yield_pct.toFixed(2)}%` : '—'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="gold"
                  onClick={() => navigate(`/stocks/${featured.symbol}`)}
                >
                  Analyze First HoldCo <ArrowUpRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/trade?symbol=${featured.symbol}`)}
                >
                  Simulated Order
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row: Market Performance + Sector Performance */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="min-w-0 overflow-hidden xl:col-span-2">
          <CardHeader
            title="NGX All-Share Index (ASI) — 60-Day Simulated Trend"
            subtitle="Normalized daily benchmark series (SIMULATED sandbox data)"
            action={<DataClassificationBadge classification="SIMULATED" />}
          />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview.market_chart_series}>
                <defs>
                  <linearGradient id="asiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#002855" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#002855" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatNumber(value), 'NGX ASI']}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="ngx_asi"
                  stroke="#002855"
                  strokeWidth={2.2}
                  fill="url(#asiGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Sector Performance"
            subtitle="Average daily % move by NGX sector"
          />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview.sector_performance} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.35} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="sector" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [`${value}%`, 'Avg Change']} />
                <Bar dataKey="avg_change_percent" fill="#D4AF37" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Movers + Watchlist Summary + Market News */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="min-w-0 overflow-hidden xl:col-span-2">
          <CardHeader
            title="Market Movers"
            subtitle="Top NGX gainers, losers, and most active equities by volume"
            action={
              <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                {(
                  [
                    ['gainers', 'Top Gainers'],
                    ['losers', 'Top Losers'],
                    ['active', 'Most Active'],
                  ] as const
                ).map(([key, lbl]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMoversTab(key)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-semibold transition',
                      moversTab === key
                        ? 'bg-[#002855] text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300',
                    )}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Symbol</th>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3 text-right">Price (NGN)</th>
                  <th className="px-5 py-3 text-right">Change</th>
                  <th className="px-5 py-3 text-right">Volume</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {movers.map((s) => (
                  <tr
                    key={s.instrument_id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-3 font-bold text-[#002855] dark:text-white">
                      <Link to={`/stocks/${s.symbol}`} className="hover:underline">
                        {s.symbol}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600 dark:text-slate-300">
                      {s.company_name}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">
                      {formatNGN(s.last_price)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <span
                        className={cn(
                          'inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-xs font-semibold',
                          movementBgClass(s.change_percent),
                        )}
                      >
                        {s.change_percent >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {formatPercent(s.change_percent)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">
                      {formatNumber(s.volume, true)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/stocks/${s.symbol}`}
                        className="text-xs font-semibold text-[#002855] hover:underline dark:text-[#D4AF37]"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Watchlist Summary & News */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Watchlist Summary"
              action={
                <Link
                  to="/watchlists"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#002855] hover:underline dark:text-[#D4AF37]"
                >
                  Manage <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
            <div className="divide-y divide-slate-100 p-4 dark:divide-slate-800">
              {watchlists?.items[0]?.items.slice(0, 5).map((w) => (
                <Link
                  key={w.item_id}
                  to={`/stocks/${w.symbol}`}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 hover:opacity-80"
                >
                  <div>
                    <div className="text-xs font-bold text-[#002855] dark:text-white">
                      {w.symbol}
                    </div>
                    <div className="text-[11px] text-slate-500">{w.company_name}</div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="text-xs font-semibold">{formatNGN(w.last_price)}</div>
                    <div className={cn('text-[11px] font-medium', movementColorClass(w.change_percent))}>
                      {formatPercent(w.change_percent)}
                    </div>
                  </div>
                </Link>
              )) || (
                <div className="py-4 text-center text-xs text-slate-500">
                  {isAuthenticated
                    ? 'Add NGX stocks to your watchlist.'
                    : 'Sign in to view your personal NGX watchlists.'}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Market News & Research"
              subtitle="Simulated NGX digest"
              action={<Newspaper className="h-4 w-4 text-[#D4AF37]" />}
            />
            <div className="divide-y divide-slate-100 p-4 dark:divide-slate-800">
              {overview.recent_news.slice(0, 4).map((n) => (
                <div key={n.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    {n.headline}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                    {n.summary}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{n.source}</span>
                    <span>{formatLagosDateTime(n.published_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
