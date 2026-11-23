import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  KeyRound,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/features/authentication/AuthContext';
import { api, ApiError } from '@/services/apiClient';
import type { OrderItem, OrderPreviewResponse } from '@/types/api';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataClassificationBadge,
  EmptyState,
  cn,
} from '@/components/ui/primitives';
import { formatLagosDateTime, formatNGN, formatNumber, generateIdempotencyKey } from '@/utilities/format';

const ticketSchema = z
  .object({
    symbol: z.string().min(1, 'Select a stock'),
    side: z.enum(['BUY', 'SELL']),
    order_type: z.enum(['MARKET', 'LIMIT']),
    quantity: z.number().int().positive('Quantity must be a positive whole number'),
    limit_price: z.number().optional(),
    simulation_mode: z.string(),
  })
  .refine((v) => v.order_type !== 'LIMIT' || (v.limit_price && v.limit_price > 0), {
    message: 'Limit orders require a positive limit price in NGN',
    path: ['limit_price'],
  });

type TicketFormValues = z.infer<typeof ticketSchema>;

const SIM_MODES = [
  { value: 'IMMEDIATE_FILL', label: 'Immediate Fill (Standard Sandbox Execution)' },
  { value: 'PARTIAL_FILL', label: 'Partial Fill (50% Executed, 50% Open)' },
  { value: 'PENDING', label: 'Accepted / Pending Execution (Open Order)' },
  { value: 'REJECTED', label: 'Broker Rejection (Releases Reservation)' },
  { value: 'TIMEOUT', label: 'Broker Timeout (SUBMISSION_UNKNOWN Recovery)' },
  { value: 'CANCELLATION_RACE', label: 'Cancellation Race (Fills During Cancel)' },
  { value: 'SETTLEMENT_FAILURE', label: 'Execute + Simulate Settlement Failure' },
];

export function TradingPage() {
  const { isAuthenticated } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [preview, setPreview] = useState<OrderPreviewResponse | null>(null);
  const [challenge, setChallenge] = useState<{
    authorization_id: string;
    sandbox_otp_hint: string | null;
    status: string;
    expires_at: string;
  } | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [verifiedAuthId, setVerifiedAuthId] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<(OrderItem & { idempotency_replayed: boolean }) | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      symbol: (params.get('symbol') || 'FIRSTHOLDCO').toUpperCase(),
      side: params.get('side') === 'SELL' ? 'SELL' : 'BUY',
      order_type: 'MARKET',
      quantity: 100,
      simulation_mode: 'IMMEDIATE_FILL',
    },
  });

  const watchedSymbol = watch('symbol');
  const watchedSide = watch('side');
  const watchedOrderType = watch('order_type');
  const watchedSimMode = watch('simulation_mode');

  const { data: stocksList } = useQuery({
    queryKey: ['stocks-all-ticket'],
    queryFn: () => api.getStocksScreener({ page: 1, page_size: 50 }),
  });

  const { data: customer } = useQuery({
    queryKey: ['customer-me'],
    queryFn: () => api.getCustomerMe(),
    enabled: isAuthenticated,
  });

  const { data: quoteDetail } = useQuery({
    queryKey: ['stock-detail', watchedSymbol],
    queryFn: () => api.getStockDetail(watchedSymbol),
    enabled: Boolean(watchedSymbol),
  });

  const previewMutation = useMutation({
    mutationFn: (values: TicketFormValues) =>
      api.previewOrder({
        symbol: values.symbol,
        side: values.side,
        order_type: values.order_type,
        quantity: values.quantity,
        limit_price: values.order_type === 'LIMIT' ? values.limit_price : undefined,
      }),
    onSuccess: (data) => {
      setErrorMsg(null);
      setPreview(data);
      setChallenge(null);
      setVerifiedAuthId(null);
      setPlacedOrder(null);
      setOtpInput('');
    },
    onError: (err) => {
      setErrorMsg(err instanceof ApiError ? `${err.code}: ${err.message}` : String(err));
    },
  });

  const challengeMutation = useMutation({
    mutationFn: (previewId: string) => api.createOrderAuthChallenge(previewId),
    onSuccess: (data) => {
      setErrorMsg(null);
      setChallenge(data);
      if (data.sandbox_otp_hint) {
        setOtpInput(data.sandbox_otp_hint);
      }
    },
    onError: (err) => setErrorMsg(err instanceof Error ? err.message : String(err)),
  });

  const verifyMutation = useMutation({
    mutationFn: () => api.verifyOrderAuthChallenge(challenge!.authorization_id, otpInput),
    onSuccess: (data) => {
      setErrorMsg(null);
      setVerifiedAuthId(data.authorization_id);
    },
    onError: (err) => setErrorMsg(err instanceof Error ? err.message : String(err)),
  });

  const placeMutation = useMutation({
    mutationFn: () => {
      if (!preview || !verifiedAuthId) throw new Error('Preview and step-up authorization required.');
      return api.placeOrder(
        {
          preview_id: preview.preview_id,
          authorization_id: verifiedAuthId,
          symbol: preview.symbol,
          side: preview.side,
          order_type: preview.order_type,
          quantity: Number(preview.quantity),
          limit_price: preview.limit_price ? Number(preview.limit_price) : undefined,
          simulation_mode: watchedSimMode,
        },
        generateIdempotencyKey('ui-ord'),
      );
    },
    onSuccess: (data) => {
      setErrorMsg(null);
      setPlacedOrder(data);
      void queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['customer-me'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => setErrorMsg(err instanceof Error ? err.message : String(err)),
  });

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Sign in to access Simulated Trading"
        description="Step-up order authorization, double-entry cash reservation, and sandbox broker execution require an authenticated customer identity."
        action={
          <Button variant="primary" onClick={() => navigate('/login')}>
            <Lock className="h-4 w-4" /> Sign In
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#002855] dark:text-white">
            Digital Equity Trading Desk (Sandbox)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Expiring order preview → Step-up MFA authorization → Idempotent atomic ledger reservation → Sandbox Broker execution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="amber">SIMULATED TRADING ONLY</Badge>
          {customer && (
            <Badge tone={customer.trading_eligibility.eligible ? 'green' : 'red'}>
              Eligibility: {customer.trading_eligibility.eligible ? 'APPROVED' : 'ACTION REQUIRED'}
            </Badge>
          )}
        </div>
      </div>

      {customer && !customer.trading_eligibility.eligible && (
        <Card className="border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          <div className="font-bold">Trading Eligibility Prerequisites Incomplete:</div>
          <ul className="mt-1 list-disc pl-5">
            {customer.trading_eligibility.blocking_reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <Button size="sm" variant="primary" className="mt-3" onClick={() => navigate('/onboarding')}>
            Complete Investment Onboarding
          </Button>
        </Card>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200"
        >
          {errorMsg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Interactive Order Ticket */}
        <Card className="lg:col-span-5">
          <CardHeader
            title="Order Ticket"
            subtitle={
              customer
                ? `Available Cash: ${formatNGN(customer.investment_account.available_cash)} • Reserved: ${formatNGN(customer.investment_account.reserved_cash)}`
                : undefined
            }
          />
          <form
            onSubmit={handleSubmit((vals) => previewMutation.mutate(vals))}
            className="space-y-4 p-5"
          >
            {/* Buy / Sell Toggle */}
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setValue('side', 'BUY');
                  setPreview(null);
                }}
                className={cn(
                  'rounded-md py-2 text-xs font-bold transition',
                  watchedSide === 'BUY'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300',
                )}
              >
                BUY EQUITY
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue('side', 'SELL');
                  setPreview(null);
                }}
                className={cn(
                  'rounded-md py-2 text-xs font-bold transition',
                  watchedSide === 'SELL'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300',
                )}
              >
                SELL EQUITY
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold">NGX Security</label>
              <select
                {...register('symbol')}
                onChange={(e) => {
                  setValue('symbol', e.target.value);
                  setPreview(null);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                {stocksList?.items.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} — {s.company_name} ({formatNGN(s.last_price)})
                  </option>
                )) || <option value="FIRSTHOLDCO">FIRSTHOLDCO — First HoldCo Plc</option>}
              </select>
            </div>

            {quoteDetail && (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs dark:bg-slate-900">
                <div>
                  <span className="text-slate-500">Reference Quote</span>
                  <div className="text-base font-bold tabular-nums text-[#002855] dark:text-white">
                    {formatNGN(quoteDetail.quote.last_price)}
                  </div>
                </div>
                <DataClassificationBadge classification={quoteDetail.quote.data_classification} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">Order Type</label>
                <select
                  {...register('order_type')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="MARKET">MARKET</option>
                  <option value="LIMIT">LIMIT</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Quantity (Shares)</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  {...register('quantity', { valueAsNumber: true })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-900"
                />
                {errors.quantity && (
                  <p className="mt-1 text-[11px] text-rose-600">{errors.quantity.message}</p>
                )}
              </div>
            </div>

            {watchedOrderType === 'LIMIT' && (
              <div>
                <label className="mb-1 block text-xs font-semibold">Limit Price (NGN)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  {...register('limit_price', {
                    setValueAs: (v: string) => (v === '' || v == null ? undefined : Number(v)),
                  })}
                  placeholder={quoteDetail ? String(quoteDetail.quote.last_price) : '28.50'}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-900"
                />
                {errors.limit_price && (
                  <p className="mt-1 text-[11px] text-rose-600">{errors.limit_price.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold">
                Sandbox Broker Simulation Mode
              </label>
              <select
                {...register('simulation_mode')}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
              >
                {SIM_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              variant={watchedSide === 'BUY' ? 'primary' : 'danger'}
              className="w-full"
              disabled={previewMutation.isPending}
            >
              <ArrowLeftRight className="h-4 w-4" />
              {previewMutation.isPending ? 'Calculating Charges...' : 'Generate Order Preview'}
            </Button>
          </form>
        </Card>

        {/* Right: Order Preview, Step-Up Authorization & Confirmation */}
        <div className="space-y-5 lg:col-span-7">
          {!preview && !placedOrder && (
            <Card className="flex h-full min-h-80 flex-col items-center justify-center p-8 text-center">
              <ShieldCheck className="h-12 w-12 text-[#D4AF37]" />
              <h3 className="mt-3 text-base font-bold text-[#002855] dark:text-white">
                Regulated Two-Stage Order Authorization
              </h3>
              <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
                1. Generate an expiring order preview with exact NGN brokerage commission, SEC/NGX/CSCS
                statutory fees, stamp duty, and VAT.<br />
                2. Authorize the exact cryptographic preview digest via step-up MFA.<br />
                3. Submit idempotently to reserve funds/shares in the immutable double-entry ledger.
              </p>
            </Card>
          )}

          {preview && !placedOrder && (
            <Card>
              <CardHeader
                title={`Order Preview: ${preview.side} ${formatNumber(preview.quantity)} ${preview.symbol}`}
                subtitle={`Expires: ${formatLagosDateTime(preview.expires_at)} • Fee Schedule Effective: ${preview.charges.effective_date}`}
                action={<Badge tone="gold">{preview.order_type}</Badge>}
              />
              <div className="space-y-4 p-5 text-xs tabular-nums">
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3.5 dark:bg-slate-900 sm:grid-cols-3">
                  <div>
                    <span className="text-slate-500">Est. Price</span>
                    <div className="text-sm font-bold">{formatNGN(preview.estimated_price)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Gross Consideration</span>
                    <div className="text-sm font-bold">{formatNGN(preview.gross_consideration)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">
                      {preview.side === 'BUY' ? 'Total Debit Est.' : 'Net Proceeds Est.'}
                    </span>
                    <div className="text-sm font-black text-[#002855] dark:text-[#D4AF37]">
                      {formatNGN(preview.net_order_value)}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 border-y border-slate-100 py-3 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Brokerage Commission (Sandbox)</span>
                    <span>{formatNGN(preview.charges.brokerage_fee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SEC / NGX / CSCS Statutory Fees</span>
                    <span>
                      {formatNGN(
                        Number(preview.charges.sec_fee) +
                          Number(preview.charges.ngx_fee) +
                          Number(preview.charges.cscs_fee),
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Stamp Duty &amp; VAT</span>
                    <span>
                      {formatNGN(
                        Number(preview.charges.stamp_duty) + Number(preview.charges.vat_amount),
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 font-bold">
                    <span>Total Estimated Charges</span>
                    <span>{formatNGN(preview.charges.total_charges)}</span>
                  </div>
                </div>

                {/* Risk Warnings */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-3.5 w-3.5" /> Pre-Trade Risk Disclosures
                  </div>
                  <ul className="mt-1 list-disc pl-4">
                    {preview.risk_warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>

                {/* Step-up Authorization Controls */}
                {!challenge && (
                  <Button
                    variant="gold"
                    className="w-full"
                    disabled={challengeMutation.isPending}
                    onClick={() => challengeMutation.mutate(preview.preview_id)}
                  >
                    <KeyRound className="h-4 w-4" />
                    Request Step-Up MFA Authorization Challenge
                  </Button>
                )}

                {challenge && !verifiedAuthId && (
                  <div className="space-y-3 rounded-lg border border-[#002855]/30 bg-sky-50/40 p-4 dark:border-sky-900 dark:bg-sky-950/30">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#002855] dark:text-white">
                        Step-Up Authorization Code Required
                      </span>
                      {challenge.sandbox_otp_hint && (
                        <Badge tone="gold">Sandbox OTP: {challenge.sandbox_otp_hint}</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                      <Button
                        variant="primary"
                        disabled={verifyMutation.isPending || otpInput.length < 4}
                        onClick={() => verifyMutation.mutate()}
                      >
                        Verify OTP
                      </Button>
                    </div>
                  </div>
                )}

                {verifiedAuthId && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        Step-up MFA verified and cryptographically bound to preview digest{' '}
                        <code className="text-[10px]">
                          {preview.binding_digest_sha256.slice(0, 12)}...
                        </code>
                      </span>
                    </div>
                    <Button
                      variant={preview.side === 'BUY' ? 'success' : 'danger'}
                      className="w-full"
                      disabled={placeMutation.isPending}
                      onClick={() => placeMutation.mutate()}
                    >
                      {placeMutation.isPending
                        ? 'Submitting Idempotent Order...'
                        : `Confirm & Execute Simulated ${preview.side} Order`}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {placedOrder && (
            <Card className="border-emerald-300 dark:border-emerald-800">
              <CardHeader
                title={`Order Confirmed: ${placedOrder.order_reference}`}
                subtitle={`Broker Ref: ${placedOrder.broker_order_id || 'Pending Outbox Relay'}`}
                action={<Badge tone="green">{placedOrder.status}</Badge>}
              />
              <div className="space-y-3 p-5 text-xs tabular-nums">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <span className="text-slate-500">Security</span>
                    <div className="font-bold">
                      {placedOrder.side} {placedOrder.symbol}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Filled / Ordered</span>
                    <div className="font-bold">
                      {formatNumber(placedOrder.filled_quantity)} / {formatNumber(placedOrder.quantity)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Avg Fill Price</span>
                    <div className="font-bold">
                      {placedOrder.average_fill_price
                        ? formatNGN(placedOrder.average_fill_price)
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Settlement Status</span>
                    <div className="font-bold text-amber-600">{placedOrder.settlement_status}</div>
                  </div>
                </div>
                {placedOrder.rejection_reason && (
                  <div className="rounded bg-rose-50 p-2.5 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200">
                    Rejection Reason: {placedOrder.rejection_reason}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="primary" size="sm" onClick={() => navigate('/orders')}>
                    View Orders &amp; Contract Note
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => navigate('/portfolio')}>
                    Inspect Updated Portfolio
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPlacedOrder(null);
                      setPreview(null);
                      setChallenge(null);
                      setVerifiedAuthId(null);
                    }}
                  >
                    Place Another Order
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
