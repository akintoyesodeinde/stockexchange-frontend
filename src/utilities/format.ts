export function formatNGN(value: number | string | null | undefined, compact = false): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '—';
  if (compact) {
    const abs = Math.abs(num);
    if (abs >= 1e12) return `₦${(num / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `₦${(num / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `₦${(num / 1e6).toFixed(2)}M`;
  }
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(value: number | string | null | undefined, compact = false): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '—';
  if (compact) {
    return new Intl.NumberFormat('en-NG', {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(num);
  }
  return new Intl.NumberFormat('en-NG', { maximumFractionDigits: 2 }).format(num);
}

export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '—';
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

export function formatLagosDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-NG', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso)) + ' WAT';
  } catch {
    return iso;
  }
}

export function movementColorClass(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? Number(value) : value ?? 0;
  if (num > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (num < 0) return 'text-rose-600 dark:text-rose-400';
  return 'text-slate-500 dark:text-slate-400';
}

export function movementBgClass(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? Number(value) : value ?? 0;
  if (num > 0) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
  if (num < 0) return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

export function generateIdempotencyKey(prefix = 'ord'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
