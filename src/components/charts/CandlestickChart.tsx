import { useEffect, useRef } from 'react';
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type Time,
} from 'lightweight-charts';
import type { HistoricalBar } from '@/types/api';

interface IndicatorPoint {
  date: string;
  sma_20?: number | null;
  sma_50?: number | null;
  ema_12?: number | null;
}

interface CandlestickChartProps {
  bars: HistoricalBar[];
  indicators?: IndicatorPoint[];
  chartMode: 'candlestick' | 'area';
  showSma20: boolean;
  showSma50: boolean;
  showVolume: boolean;
  darkMode: boolean;
}

export function CandlestickChart({
  bars,
  indicators = [],
  chartMode,
  showSma20,
  showSma50,
  showVolume,
  darkMode,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || bars.length === 0) return;

    const chart: IChartApi = createChart(el, {
      width: el.clientWidth,
      height: 380,
      layout: {
        background: {
          type: ColorType.Solid,
          color: darkMode ? '#0E1F38' : '#FFFFFF',
        },
        textColor: darkMode ? '#CBD5E1' : '#334155',
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: darkMode ? '#1E293B' : '#F1F5F9' },
        horzLines: { color: darkMode ? '#1E293B' : '#F1F5F9' },
      },
      rightPriceScale: {
        borderColor: darkMode ? '#334155' : '#E2E8F0',
      },
      timeScale: {
        borderColor: darkMode ? '#334155' : '#E2E8F0',
        timeVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    });

    if (chartMode === 'candlestick') {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10B981',
        downColor: '#EF4444',
        borderVisible: false,
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
      });
      candleSeries.setData(
        bars.map((b) => ({
          time: b.time as Time,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        })),
      );
    } else {
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: '#002855',
        topColor: darkMode ? 'rgba(212, 175, 55, 0.35)' : 'rgba(0, 40, 85, 0.25)',
        bottomColor: 'rgba(0, 40, 85, 0.01)',
        lineWidth: 2,
      });
      areaSeries.setData(
        bars.map((b) => ({
          time: b.time as Time,
          value: b.close,
        })),
      );
    }

    if (showVolume) {
      const volSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
      volSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volSeries.setData(
        bars.map((b) => ({
          time: b.time as Time,
          value: b.volume,
          color: b.close >= b.open ? 'rgba(16, 185, 129, 0.32)' : 'rgba(239, 68, 68, 0.32)',
        })),
      );
    }

    const barDateSet = new Set(bars.map((b) => b.time));
    if (showSma20 && indicators.length > 0) {
      const sma20Series = chart.addSeries(LineSeries, {
        color: '#D4AF37',
        lineWidth: 2,
        title: 'SMA 20',
      });
      const pts = indicators
        .filter((p) => barDateSet.has(p.date) && p.sma_20 !== null && p.sma_20 !== undefined)
        .map((p) => ({ time: p.date as Time, value: Number(p.sma_20) }));
      if (pts.length > 0) sma20Series.setData(pts);
    }

    if (showSma50 && indicators.length > 0) {
      const sma50Series = chart.addSeries(LineSeries, {
        color: '#38BDF8',
        lineWidth: 2,
        title: 'SMA 50',
      });
      const pts = indicators
        .filter((p) => barDateSet.has(p.date) && p.sma_50 !== null && p.sma_50 !== undefined)
        .map((p) => ({ time: p.date as Time, value: Number(p.sma_50) }));
      if (pts.length > 0) sma50Series.setData(pts);
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          chart.applyOptions({ width: entry.contentRect.width });
        }
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [bars, indicators, chartMode, showSma20, showSma50, showVolume, darkMode]);

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        data-testid="lightweight-chart-container"
        className="w-full overflow-hidden rounded-lg"
      />
    </div>
  );
}
