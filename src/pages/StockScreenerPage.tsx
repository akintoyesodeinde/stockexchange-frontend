import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Star } from 'lucide-react';
import { useAuth } from '@/features/authentication/AuthContext';
import { api } from '@/services/apiClient';
import type { StockSummary } from '@/types/api';
import {
  Badge,
  Button,
  Card,
  DataClassificationBadge,
  ErrorRecoveryState,
  Skeleton,
  cn,
} from '@/components/ui/primitives';
import { formatNGN, formatNumber, formatPercent, movementBgClass } from '@/utilities/format';

const SECTORS = [
  { value: '', label: 'All NGX Sectors' },
  { value: 'FINANCIAL_SERVICES', label: 'Financial Services' },
  { value: 'INDUSTRIAL_GOODS', label: 'Industrial Goods' },
  { value: 'ICT', label: 'ICT & Telecoms' },
  { value: 'CONSUMER_GOODS', label: 'Consumer Goods' },
  { value: 'OIL_GAS', label: 'Oil & Gas' },
  { value: 'CONGLOMERATES', label: 'Conglomerates' },
  { value: 'AGRICULTURE', label: 'Agriculture' },
];

const columnHelper = createColumnHelper<StockSummary>();

export function StockScreenerPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [q, setQ] = useState('');
  const [sector, setSector] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minDivYield, setMinDivYield] = useState('');
  const [minVolume, setMinVolume] = useState('');
  const [minChange, setMinChange] = useState('');
  const [sortBy, setSortBy] = useState('market_cap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      'stocks-screener',
      q,
      sector,
      minPrice,
      maxPrice,
      minDivYield,
      minVolume,
      minChange,
      sortBy,
      sortDir,
      page,
    ],
    queryFn: () =>
      api.getStocksScreener({
        q: q || undefined,
        sector: sector || undefined,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
        min_dividend_yield: minDivYield ? Number(minDivYield) : undefined,
        min_volume: minVolume ? Number(minVolume) : undefined,
        min_change_pct: minChange ? Number(minChange) : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        page_size: 12,
      }),
  });

  const { data: watchlists } = useQuery({
    queryKey: ['watchlists'],
    queryFn: () => api.getWatchlists(),
    enabled: isAuthenticated,
  });

  const defaultWatchlist = watchlists?.items[0];
  const watchedSymbols = useMemo(
    () => new Set(defaultWatchlist?.items.map((i) => i.symbol) ?? []),
    [defaultWatchlist],
  );

  const addWatchMutation = useMutation({
    mutationFn: async (symbol: string) => {
      if (!defaultWatchlist) throw new Error('Sign in to manage watchlists.');
      await api.addWatchlistItem(defaultWatchlist.id, symbol);
      return symbol;
    },
    onSuccess: (symbol) => {
      setToast(`Added ${symbol} to "${defaultWatchlist?.name}"`);
      void queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />;
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('symbol', {
        header: () => (
          <button
            type="button"
            onClick={() => toggleSort('symbol')}
            className="inline-flex items-center gap-1 font-semibold"
          >
            Symbol {renderSortIcon('symbol')}
          </button>
        ),
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <Link
                to={`/stocks/${row.symbol}`}
                className="font-bold text-[#002855] hover:underline dark:text-white"
              >
                {row.symbol}
              </Link>
              {row.is_featured && (
                <Badge tone="gold" className="ml-1.5">
                  Featured
                </Badge>
              )}
              {row.aliases.length > 0 && (
                <div className="text-[10px] text-slate-400">ex-{row.aliases.join(', ')}</div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('company_name', {
        header: 'Company / Sector',
        cell: (info) => (
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">
              {info.getValue()}
            </div>
            <div className="text-[11px] text-slate-500">{info.row.original.sector_name}</div>
          </div>
        ),
      }),
      columnHelper.accessor('last_price', {
        header: () => (
          <button
            type="button"
            onClick={() => toggleSort('last_price')}
            className="inline-flex items-center gap-1 font-semibold"
          >
            Price (NGN) {renderSortIcon('last_price')}
          </button>
        ),
        cell: (info) => (
          <div className="text-right font-semibold tabular-nums">
            {formatNGN(info.getValue())}
          </div>
        ),
      }),
      columnHelper.accessor('change_percent', {
        header: () => (
          <button
            type="button"
            onClick={() => toggleSort('change_percent')}
            className="inline-flex items-center gap-1 font-semibold"
          >
            Change % {renderSortIcon('change_percent')}
          </button>
        ),
        cell: (info) => (
          <div className="text-right tabular-nums">
            <span
              className={cn(
                'rounded px-2 py-0.5 text-xs font-semibold',
                movementBgClass(info.getValue()),
              )}
            >
              {formatPercent(info.getValue())}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor('volume', {
        header: () => (
          <button
            type="button"
            onClick={() => toggleSort('volume')}
            className="inline-flex items-center gap-1 font-semibold"
          >
            Volume {renderSortIcon('volume')}
          </button>
        ),
        cell: (info) => (
          <div className="text-right text-xs tabular-nums">{formatNumber(info.getValue(), true)}</div>
        ),
      }),
      columnHelper.accessor('market_cap', {
        header: () => (
          <button
            type="button"
            onClick={() => toggleSort('market_cap')}
            className="inline-flex items-center gap-1 font-semibold"
          >
            Market Cap {renderSortIcon('market_cap')}
          </button>
        ),
        cell: (info) => (
          <div className="text-right text-xs font-medium tabular-nums">
            {formatNGN(info.getValue(), true)}
          </div>
        ),
      }),
      columnHelper.accessor('pe_ratio', {
        header: () => (
          <button
            type="button"
            onClick={() => toggleSort('pe_ratio')}
            className="inline-flex items-center gap-1 font-semibold"
          >
            P/E {renderSortIcon('pe_ratio')}
          </button>
        ),
        cell: (info) => (
          <div className="text-right text-xs tabular-nums">
            {info.getValue() !== null ? `${info.getValue()!.toFixed(2)}x` : '—'}
          </div>
        ),
      }),
      columnHelper.accessor('dividend_yield_pct', {
        header: () => (
          <button
            type="button"
            onClick={() => toggleSort('dividend_yield_pct')}
            className="inline-flex items-center gap-1 font-semibold"
          >
            Div Yield {renderSortIcon('dividend_yield_pct')}
          </button>
        ),
        cell: (info) => (
          <div className="text-right text-xs tabular-nums">
            {info.getValue() !== null ? `${info.getValue()!.toFixed(2)}%` : '—'}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
          const sym = info.row.original.symbol;
          const isWatched = watchedSymbols.has(sym);
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                title={isWatched ? 'In watchlist' : 'Add to watchlist'}
                onClick={() =>
                  isAuthenticated ? addWatchMutation.mutate(sym) : navigate('/login')
                }
                className={cn(
                  'rounded p-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800',
                  isWatched ? 'text-[#D4AF37]' : 'text-slate-400',
                )}
              >
                <Star className="h-4 w-4" fill={isWatched ? 'currentColor' : 'none'} />
              </button>
              <Button size="sm" variant="primary" onClick={() => navigate(`/trade?symbol=${sym}`)}>
                Trade
              </Button>
            </div>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortBy, sortDir, watchedSymbols, isAuthenticated],
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: data?.pagination.total_pages ?? 1,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#002855] dark:text-white">
            NGX Equity Stock Screener
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Filter Nigerian Exchange equities by symbol, legacy alias (e.g. FBNH), sector, price,
            dividend yield, volume, and daily momentum.
          </p>
        </div>
        <DataClassificationBadge classification="SIMULATED" />
      </div>

      {toast && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
          {toast}
        </div>
      )}

      {/* Filter Controls */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Symbol, FBNH, ISIN, company..."
              aria-label="Filter stocks by keyword"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <select
            value={sector}
            onChange={(e) => {
              setSector(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by sector"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {SECTORS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setPage(1);
            }}
            placeholder="Min Price (₦)"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
            placeholder="Max Price (₦)"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <input
            type="number"
            step="0.5"
            min="0"
            value={minDivYield}
            onChange={(e) => {
              setMinDivYield(e.target.value);
              setPage(1);
            }}
            placeholder="Min Div Yield (%)"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={minChange}
              onChange={(e) => {
                setMinChange(e.target.value);
                setPage(1);
              }}
              placeholder="Min % Chg"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQ('');
                setSector('');
                setMinPrice('');
                setMaxPrice('');
                setMinDivYield('');
                setMinVolume('');
                setMinChange('');
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <ErrorRecoveryState
          title="Screener Query Failed"
          message={error instanceof Error ? error.message : 'Unable to load NGX equities.'}
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.getRowModel().rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-xs text-slate-500">
                      No NGX stocks match your active screener filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Server-Side Pagination Footer */}
          {data && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800">
              <span>
                Showing page <strong>{data.pagination.page}</strong> of{' '}
                <strong>{data.pagination.total_pages}</strong> ({data.pagination.total} equities)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= data.pagination.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
