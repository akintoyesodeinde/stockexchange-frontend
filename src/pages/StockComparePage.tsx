import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/apiClient';
import { Badge, Button, Card, CardHeader, Skeleton, cn } from '@/components/ui/primitives';
import { formatNGN, formatPercent, movementColorClass } from '@/utilities/format';

const PRESET_SYMBOLS = ['FIRSTHOLDCO', 'GTCO', 'ZENITHBANK', 'UBA', 'ACCESSCORP', 'DANGCEM', 'MTNN', 'SEPLAT'];

export function StockComparePage() {
  const [selected, setSelected] = useState<string[]>(['FIRSTHOLDCO', 'GTCO', 'ZENITHBANK']);

  const { data, isLoading } = useQuery({
    queryKey: ['stocks-compare', selected.join(',')],
    queryFn: () => api.compareStocks(selected),
    enabled: selected.length >= 2,
  });

  const toggleSymbol = (sym: string) => {
    setSelected((prev) => {
      if (prev.includes(sym)) {
        return prev.length > 2 ? prev.filter((s) => s !== sym) : prev;
      }
      return prev.length < 4 ? [...prev, sym] : prev;
    });
  };

  type CompareItem = NonNullable<typeof data>['items'][number];

  const rows: Array<[string, (it: CompareItem) => string, boolean?]> = [
    ['Last Price (NGN)', (it) => formatNGN(it.quote.last_price)],
    ['Daily Change %', (it) => formatPercent(it.quote.change_percent), true],
    ['30D Return', (it) => formatPercent(it.analytics.returns['30d']), true],
    ['YTD Return', (it) => formatPercent(it.analytics.returns.ytd), true],
    ['1Y Return', (it) => formatPercent(it.analytics.returns['1y']), true],
    ['P/E Ratio', (it) => (it.analytics.valuation.pe_ratio ? `${it.analytics.valuation.pe_ratio}x` : '—')],
    ['P/B Ratio', (it) => (it.analytics.valuation.pb_ratio ? `${it.analytics.valuation.pb_ratio}x` : '—')],
    ['Dividend Yield', (it) => (it.analytics.valuation.dividend_yield_pct ? `${it.analytics.valuation.dividend_yield_pct}%` : '—')],
    ['RSI (14)', (it) => String(it.analytics.oscillators.rsi_14 ?? '—')],
    ['Annualized Volatility', (it) => (it.analytics.risk_metrics.annualized_volatility_pct ? `${it.analytics.risk_metrics.annualized_volatility_pct}%` : '—')],
    ['Max Drawdown', (it) => (it.analytics.risk_metrics.max_drawdown_pct ? `${it.analytics.risk_metrics.max_drawdown_pct}%` : '—')],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#002855] dark:text-white">
          NGX Equity Peer Comparison
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Compare First HoldCo Plc side-by-side against Nigerian banking and blue-chip peers (select 2 to 4 equities).
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {PRESET_SYMBOLS.map((sym) => (
            <Button
              key={sym}
              size="sm"
              variant={selected.includes(sym) ? 'primary' : 'secondary'}
              onClick={() => toggleSymbol(sym)}
            >
              {sym}
            </Button>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader title="Side-by-Side Valuation, Returns & Volatility Matrix" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                <tr>
                  <th className="px-5 py-3">Metric</th>
                  {data?.items.map((it) => (
                    <th key={it.symbol} className="px-5 py-3 text-right">
                      <div className="text-sm font-bold text-[#002855] dark:text-[#D4AF37]">
                        {it.symbol}
                      </div>
                      <div className="text-[10px] font-normal text-slate-500">{it.company_name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map(([label, getter, isReturn]) => (
                  <tr key={label}>
                    <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">
                      {label}
                    </td>
                    {data?.items.map((it) => {
                      const val = getter(it);
                      return (
                        <td
                          key={it.symbol}
                          className={cn(
                            'px-5 py-3 text-right font-semibold',
                            isReturn && movementColorClass(parseFloat(val)),
                          )}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="px-5 py-3 font-semibold">Volatility Classification</td>
                  {data?.items.map((it) => (
                    <td key={it.symbol} className="px-5 py-3 text-right">
                      <Badge tone="navy">
                        {it.analytics.risk_metrics.volatility_label.replace('_', ' ')}
                      </Badge>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
