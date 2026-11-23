import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Briefcase, Lock, PieChart as PieIcon, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '@/features/authentication/AuthContext';
import { api } from '@/services/apiClient';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorRecoveryState,
  Skeleton,
  cn,
} from '@/components/ui/primitives';
import {
  formatLagosDateTime,
  formatNGN,
  formatNumber,
  formatPercent,
  movementColorClass,
} from '@/utilities/format';

const CHART_COLORS = ['#002855', '#D4AF37', '#10B981', '#38BDF8', '#6366F1', '#F59E0B'];

export function PortfolioPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'holdings' | 'dividends' | 'transactions'>('holdings');

  const { data: portfolios, isLoading, error, refetch } = useQuery({
    queryKey: ['portfolios'],
    queryFn: () => api.getPortfolios(),
    enabled: isAuthenticated,
  });

  const portfolio = portfolios?.items[0];

  const { data: perf } = useQuery({
    queryKey: ['portfolio-performance', portfolio?.id],
    queryFn: () => api.getPortfolioPerformance(portfolio!.id),
    enabled: Boolean(portfolio?.id),
  });

  const { data: transactions } = useQuery({
    queryKey: ['portfolio-transactions', portfolio?.id],
    queryFn: () => api.getPortfolioTransactions(portfolio!.id),
    enabled: Boolean(portfolio?.id),
  });

  const { data: dividends } = useQuery({
    queryKey: ['portfolio-dividends', portfolio?.id],
    queryFn: () => api.getPortfolioDividends(portfolio!.id),
    enabled: Boolean(portfolio?.id),
  });

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Sign in to view your NGX Investment Portfolio"
        description="Access live sandbox cash balances, FIFO lot cost basis, settled/unsettled holdings, and P&L."
        action={
          <Button variant="primary" onClick={() => navigate('/login')}>
            <Lock className="h-4 w-4" /> Sign In
          </Button>
        }
      />
    );
  }

  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !portfolio) {
    return (
      <ErrorRecoveryState
        title="Portfolio Unavailable"
        message={error instanceof Error ? error.message : 'No portfolio found for this account.'}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#002855] dark:text-white">{portfolio.name}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Account: <strong>{portfolio.account_number}</strong> • Cost Basis Method:{' '}
            <strong>{portfolio.cost_basis_method}</strong> • Currency: {portfolio.currency}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/onboarding')}>
            Sandbox Top-Up
          </Button>
          <Button variant="gold" size="sm" onClick={() => navigate('/trade')}>
            Place Order
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Portfolio Value</span>
            <Briefcase className="h-4 w-4 text-[#002855] dark:text-[#D4AF37]" />
          </div>
          <div className="mt-1.5 text-xl font-black tabular-nums text-[#002855] dark:text-white">
            {formatNGN(portfolio.total_portfolio_value)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Equities: {formatNGN(portfolio.equity_market_value)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Available Cash</span>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 text-xl font-black tabular-nums text-emerald-600">
            {formatNGN(portfolio.available_cash)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Reserved (Open Orders): {formatNGN(portfolio.reserved_cash)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-500">Total Cost Basis</div>
          <div className="mt-1.5 text-xl font-black tabular-nums text-slate-900 dark:text-white">
            {formatNGN(portfolio.total_cost_basis)}
          </div>
          <div className="mt-1 text-xs text-slate-500">{portfolio.holdings_count} NGX Equities</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Unrealized P&amp;L</span>
            <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <div
            className={cn(
              'mt-1.5 text-xl font-black tabular-nums',
              movementColorClass(portfolio.unrealized_pnl),
            )}
          >
            {formatNGN(portfolio.unrealized_pnl)}
          </div>
          <div className={cn('mt-1 text-xs font-semibold tabular-nums', movementColorClass(portfolio.return_pct))}>
            Return: {formatPercent(portfolio.return_pct)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Realized P&amp;L &amp; Concentration</span>
            <PieIcon className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <div
            className={cn(
              'mt-1.5 text-xl font-black tabular-nums',
              movementColorClass(portfolio.realized_pnl),
            )}
          >
            {formatNGN(portfolio.realized_pnl)}
          </div>
          <div className="mt-1">
            <Badge tone="navy">
              HHI {portfolio.concentration.hhi} ({portfolio.concentration.concentration_band.replace('_', ' ')})
            </Badge>
          </div>
        </Card>
      </div>

      {/* Allocation & Performance Charts */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Asset Allocation" subtitle="Equities vs Available & Reserved Cash" />
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={portfolio.asset_allocation.filter((a) => a.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={82}
                  paddingAngle={2}
                >
                  {portfolio.asset_allocation.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatNGN(val)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 border-t border-slate-100 px-5 py-3 text-xs dark:border-slate-800">
            {portfolio.asset_allocation.map((a, idx) => (
              <div key={a.name} className="flex items-center justify-between tabular-nums">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
                  />
                  {a.name}
                </span>
                <span className="font-semibold">
                  {formatNGN(a.value)} ({a.pct}%)
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Sector Allocation" subtitle="NGX equity exposure by sector" />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={portfolio.sector_allocation} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="sector" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Weight']} />
                <Bar dataKey="pct" fill="#002855" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Portfolio Performance History" subtitle="Daily valuation snapshots (NGN)" />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={perf?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={18} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `₦${(Number(v) / 1e6).toFixed(1)}M`}
                />
                <Tooltip formatter={(val: number) => formatNGN(val)} />
                <Area
                  type="monotone"
                  dataKey="total_value"
                  stroke="#D4AF37"
                  fill="#D4AF37"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Holdings / Dividends / Transactions Table */}
      <Card>
        <div className="flex gap-1 border-b border-slate-100 px-5 pt-3 dark:border-slate-800">
          {(
            [
              ['holdings', `Holdings (${portfolio.holdings.length})`],
              ['dividends', 'Dividend Income'],
              ['transactions', 'Ledger Transaction History'],
            ] as const
          ).map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                'border-b-2 px-4 py-2.5 text-xs font-semibold',
                tab === k
                  ? 'border-[#D4AF37] text-[#002855] dark:text-[#D4AF37]'
                  : 'border-transparent text-slate-500',
              )}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto p-4">
          {tab === 'holdings' && (
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="border-b border-slate-200 uppercase text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 pr-4">Symbol</th>
                  <th className="px-3 py-2.5 text-right">Settled</th>
                  <th className="px-3 py-2.5 text-right">Unsettled</th>
                  <th className="px-3 py-2.5 text-right">Reserved</th>
                  <th className="px-3 py-2.5 text-right">Avg Cost</th>
                  <th className="px-3 py-2.5 text-right">Market Price</th>
                  <th className="px-3 py-2.5 text-right">Market Value</th>
                  <th className="px-3 py-2.5 text-right">Unrealized P&amp;L</th>
                  <th className="py-2.5 pl-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {portfolio.holdings.map((h) => (
                  <tr key={h.instrument_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 pr-4">
                      <Link
                        to={`/stocks/${h.symbol}`}
                        className="font-bold text-[#002855] hover:underline dark:text-white"
                      >
                        {h.symbol}
                      </Link>
                      <div className="text-[10px] text-slate-500">{h.company_name}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">
                      {formatNumber(h.settled_quantity)}
                    </td>
                    <td className="px-3 py-3 text-right text-amber-600">
                      {formatNumber(h.unsettled_quantity)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-500">
                      {formatNumber(h.reserved_quantity)}
                    </td>
                    <td className="px-3 py-3 text-right">{formatNGN(h.average_cost)}</td>
                    <td className="px-3 py-3 text-right font-semibold">
                      {formatNGN(h.current_price)}
                    </td>
                    <td className="px-3 py-3 text-right font-bold">{formatNGN(h.market_value)}</td>
                    <td className={cn('px-3 py-3 text-right font-bold', movementColorClass(h.unrealized_pnl))}>
                      {formatNGN(h.unrealized_pnl)} ({formatPercent(h.return_pct)})
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/trade?symbol=${h.symbol}&side=SELL`)}
                      >
                        Sell
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'dividends' && (
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="border-b border-slate-200 uppercase text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="py-2">Symbol</th>
                  <th className="py-2">FY</th>
                  <th className="py-2 text-right">Per Share</th>
                  <th className="py-2 text-right">Held Shares</th>
                  <th className="py-2 text-right">Est. Gross Payout</th>
                  <th className="py-2">Payment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dividends?.items.map((d, i) => (
                  <tr key={i}>
                    <td className="py-2.5 font-bold">{d.symbol}</td>
                    <td className="py-2.5">{d.fiscal_year}</td>
                    <td className="py-2.5 text-right">{formatNGN(d.amount_per_share)}</td>
                    <td className="py-2.5 text-right">{formatNumber(d.held_shares)}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-600">
                      {formatNGN(d.estimated_gross_payout)}
                    </td>
                    <td className="py-2.5">{d.payment_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'transactions' && (
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="border-b border-slate-200 uppercase text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="py-2">Reference</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2">Timestamp (WAT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions?.items.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5 font-mono text-[11px]">{t.transaction_reference}</td>
                    <td className="py-2.5">
                      <Badge tone="navy">{t.transaction_type}</Badge>
                    </td>
                    <td className="py-2.5">{t.description}</td>
                    <td className="py-2.5 text-right font-bold">{formatNGN(t.amount)}</td>
                    <td className="py-2.5 text-slate-500">{formatLagosDateTime(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
