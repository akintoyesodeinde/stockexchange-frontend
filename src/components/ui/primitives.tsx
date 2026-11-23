import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function cn(...inputs: Array<string | undefined | null | false>) {
  return twMerge(clsx(inputs));
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0E1F38]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800',
        className,
      )}
    >
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-[#002855] dark:text-white">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'gold' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}) {
  const variants = {
    primary:
      'bg-[#002855] text-white hover:bg-[#001A35] dark:bg-[#14437A] dark:hover:bg-[#1B5394]',
    gold: 'bg-[#D4AF37] text-[#001A35] font-semibold hover:bg-[#c5a02e]',
    secondary:
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
    ghost:
      'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  };
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
    />
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'navy' | 'gold' | 'green' | 'red' | 'amber' | 'blue';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    navy: 'bg-[#002855]/10 text-[#002855] dark:bg-[#002855] dark:text-[#E8C964]',
    gold: 'bg-[#D4AF37]/20 text-[#8a6f14] dark:bg-[#D4AF37]/20 dark:text-[#E8C964]',
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
    red: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300',
    amber: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300',
    blue: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DataClassificationBadge({ classification }: { classification?: string }) {
  const cls = (classification || 'SIMULATED').toUpperCase();
  const tone =
    cls === 'REAL_TIME'
      ? 'green'
      : cls === 'STALE'
        ? 'red'
        : cls === 'SIMULATED'
          ? 'amber'
          : 'blue';
  return <Badge tone={tone}>{cls.replace('_', ' ')}</Badge>;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800/80',
        className,
      )}
    />
  );
}

export function ErrorRecoveryState({
  title = 'Unable to load data',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-rose-200 p-6 text-center dark:border-rose-900/60">
      <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" aria-hidden="true" />
      <h4 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {message || 'The backend service may be temporarily unavailable. Please retry.'}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-4">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
