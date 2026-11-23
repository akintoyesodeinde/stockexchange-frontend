import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, FileText, Lock, XCircle } from 'lucide-react';
import { useAuth } from '@/features/authentication/AuthContext';
import { api } from '@/services/apiClient';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Skeleton,
  cn,
} from '@/components/ui/primitives';
import { formatLagosDateTime, formatNGN, formatNumber } from '@/utilities/format';

const STATUS_TABS = [
  { key: '', label: 'All Orders' },
  { key: 'ACCEPTED', label: 'Open / Accepted' },
  { key: 'PENDING_SUBMISSION', label: 'Pending' },
  { key: 'PARTIALLY_FILLED', label: 'Partially Filled' },
  { key: 'FILLED', label: 'Executed (Filled)' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [noteHtml, setNoteHtml] = useState<{ number: string; html: string } | null>(null);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => api.getOrders(statusFilter || undefined),
    enabled: isAuthenticated,
  });

  const { data: tradesData } = useQuery({
    queryKey: ['trades'],
    queryFn: () => api.getTrades(),
    enabled: isAuthenticated,
  });

  const { data: orderDetail } = useQuery({
    queryKey: ['order-detail', selectedOrderId],
    queryFn: () => api.getOrderDetail(selectedOrderId!),
    enabled: Boolean(selectedOrderId),
  });

  const { data: orderExecs } = useQuery({
    queryKey: ['order-execs', selectedOrderId],
    queryFn: () => api.getOrderExecutions(selectedOrderId!),
    enabled: Boolean(selectedOrderId),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelOrder(id, 'Customer cancelled via Order Management'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      if (selectedOrderId) {
        void queryClient.invalidateQueries({ queryKey: ['order-detail', selectedOrderId] });
      }
    },
  });

  const openContractNote = async (tradeId: string) => {
    const cnData = await api.getContractNote(tradeId);
    setNoteHtml({ number: cnData.note_number, html: cnData.rendered_html });
  };

  const downloadContractNote = () => {
    if (!noteHtml) return;
    const blob = new Blob([noteHtml.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${noteHtml.number}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Sign in to manage Orders & Contract Notes"
        description="Track order state transitions, partial executions, settlement status, and download sandbox contract notes."
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
            Order Management &amp; Contract Notes
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Explicit order state machine, independent settlement tracking (T+3), execution logs, and downloadable sandbox contract notes.
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={() => navigate('/trade')}>
          New Simulated Order
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatusFilter(t.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              statusFilter === t.key
                ? 'bg-[#002855] text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-[#0E1F38] dark:text-slate-300 dark:ring-slate-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3">Order Ref</th>
                  <th className="px-4 py-3">Security</th>
                  <th className="px-4 py-3 text-right">Filled / Qty</th>
                  <th className="px-4 py-3 text-right">Avg Price</th>
                  <th className="px-4 py-3">Order Status</th>
                  <th className="px-4 py-3">Settlement</th>
                  <th className="px-4 py-3">Created (WAT)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ordersData?.items.map((o) => {
                  const canCancel = ['CREATED', 'PENDING_SUBMISSION', 'SUBMITTED', 'ACCEPTED', 'PARTIALLY_FILLED'].includes(o.status);
                  const statusTone =
                    o.status === 'FILLED'
                      ? 'green'
                      : o.status === 'REJECTED' || o.status === 'CANCELLED'
                        ? 'red'
                        : 'amber';
                  const stlTone =
                    o.settlement_status === 'SETTLED'
                      ? 'green'
                      : o.settlement_status === 'SETTLEMENT_FAILED'
                        ? 'red'
                        : 'blue';
                  return (
                    <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-semibold">{o.order_reference}</td>
                      <td className="px-4 py-3">
                        <Badge tone={o.side === 'BUY' ? 'green' : 'red'} className="mr-1.5">
                          {o.side}
                        </Badge>
                        <strong>{o.symbol}</strong> ({o.order_type})
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatNumber(o.filled_quantity)} / {formatNumber(o.quantity)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {o.average_fill_price ? formatNGN(o.average_fill_price) : formatNGN(o.reference_price)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone}>{o.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={stlTone}>{o.settlement_status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatLagosDateTime(o.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => setSelectedOrderId(o.id)}>
                            <Eye className="h-3.5 w-3.5" /> Inspect
                          </Button>
                          {canCancel && (
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={cancelMutation.isPending}
                              onClick={() => cancelMutation.mutate(o.id)}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {ordersData?.items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      No orders found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Selected Order Audit Trail & Executions */}
      {orderDetail && (
        <Card>
          <CardHeader
            title={`Order Audit Trail: ${orderDetail.order_reference}`}
            subtitle={`Broker ID: ${orderDetail.broker_order_id || 'N/A'} • Channel: ${orderDetail.channel}`}
            action={
              <Button size="sm" variant="ghost" onClick={() => setSelectedOrderId(null)}>
                Close
              </Button>
            }
          />
          <div className="grid gap-6 p-5 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase text-slate-500">
                State Transition History
              </h4>
              <ol className="space-y-2 text-xs">
                {orderDetail.status_history.map((h, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-slate-100 p-2.5 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>
                        {h.from_status || 'INIT'} → <span className="text-[#002855] dark:text-[#D4AF37]">{h.to_status}</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatLagosDateTime(h.timestamp)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-slate-500">{h.reason}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase text-slate-500">
                Broker Executions ({orderExecs?.items.length ?? 0})
              </h4>
              <div className="space-y-2 text-xs tabular-nums">
                {orderExecs?.items.map((ex) => (
                  <div
                    key={ex.id}
                    className="rounded-lg border border-slate-100 p-2.5 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="font-mono">{ex.broker_execution_id}</span>
                      <span>
                        {formatNumber(ex.quantity)} @ {formatNGN(ex.price)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between text-slate-500">
                      <span>Gross: {formatNGN(ex.gross_value)}</span>
                      <span>Net: {formatNGN(ex.net_value)}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      onClick={() => void openContractNote(ex.trade_id)}
                    >
                      <FileText className="h-3.5 w-3.5" /> View Sandbox Contract Note
                    </Button>
                  </div>
                ))}
                {orderExecs?.items.length === 0 && (
                  <p className="text-slate-500">No executions recorded for this order.</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Executed Trades & Contract Notes Table */}
      <Card>
        <CardHeader
          title="Confirmed Trades &amp; Sandbox Contract Notes"
          subtitle="Downloadable sandbox execution confirmations (simulated trades)"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3">Trade Ref</th>
                <th className="px-4 py-3">Security</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Exec Price</th>
                <th className="px-4 py-3 text-right">Charges</th>
                <th className="px-4 py-3 text-right">Net Amount</th>
                <th className="px-4 py-3">Settlement</th>
                <th className="px-4 py-3 text-right">Contract Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tradesData?.items.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-mono font-semibold">{t.trade_reference}</td>
                  <td className="px-4 py-3">
                    <Badge tone={t.side === 'BUY' ? 'green' : 'red'} className="mr-1">
                      {t.side}
                    </Badge>
                    <strong>{t.symbol}</strong>
                  </td>
                  <td className="px-4 py-3 text-right">{formatNumber(t.quantity)}</td>
                  <td className="px-4 py-3 text-right">{formatNGN(t.execution_price)}</td>
                  <td className="px-4 py-3 text-right">{formatNGN(t.total_charges)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatNGN(t.net_amount)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={t.settlement_status === 'SETTLED' ? 'green' : 'amber'}>
                      {t.settlement_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="secondary" onClick={() => void openContractNote(t.id)}>
                      <FileText className="h-3.5 w-3.5" /> Contract Note
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Contract Note Modal */}
      {noteHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b bg-[#002855] px-5 py-3 text-white">
              <span className="text-sm font-bold">Sandbox Contract Note: {noteHtml.number}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="gold" onClick={downloadContractNote}>
                  <Download className="h-3.5 w-3.5" /> Download HTML
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setNoteHtml(null)}>
                  Close
                </Button>
              </div>
            </div>
            <iframe
              title={noteHtml.number}
              srcDoc={noteHtml.html}
              className="h-[70vh] w-full border-0 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
