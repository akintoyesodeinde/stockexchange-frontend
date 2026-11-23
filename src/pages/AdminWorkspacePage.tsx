import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  Download,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/features/authentication/AuthContext';
import { api, ApiError } from '@/services/apiClient';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  cn,
} from '@/components/ui/primitives';
import { formatLagosDateTime, formatNGN } from '@/utilities/format';

const ADMIN_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'customers', label: 'Customers & KYC' },
  { id: 'orders', label: 'Orders Monitor' },
  { id: 'settlements', label: 'Settlements' },
  { id: 'reconciliation', label: 'Reconciliation' },
  { id: 'compliance', label: 'Compliance Flags' },
  { id: 'approvals', label: 'Maker-Checker' },
  { id: 'providers', label: 'Providers Health' },
  { id: 'audit', label: 'Audit Logs' },
  { id: 'config', label: 'Config & Channels' },
] as const;

export function AdminWorkspacePage() {
  const { isAuthenticated, isAdminStaff, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof ADMIN_TABS)[number]['id']>('overview');
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [ussdChoice, setUssdChoice] = useState('');
  const [ussdOutput, setUssdOutput] = useState<string | null>(null);

  const notify = (tone: 'ok' | 'err', text: string) => {
    setBanner({ tone, text });
    setTimeout(() => setBanner(null), 5000);
  };

  const { data: dashboard } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.adminGetDashboard(),
    enabled: isAdminStaff,
  });

  const { data: customers } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => api.adminGetCustomers(),
    enabled: isAdminStaff && tab === 'customers',
  });

  const { data: orders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api.adminGetOrders(),
    enabled: isAdminStaff && tab === 'orders',
  });

  const { data: settlements } = useQuery({
    queryKey: ['admin-settlements'],
    queryFn: () => api.adminGetSettlements(),
    enabled: isAdminStaff && tab === 'settlements',
  });

  const { data: reconRuns } = useQuery({
    queryKey: ['admin-recon-runs'],
    queryFn: () => api.adminGetReconRuns(),
    enabled: isAdminStaff && tab === 'reconciliation',
  });

  const { data: reconExceptions } = useQuery({
    queryKey: ['admin-recon-exceptions'],
    queryFn: () => api.adminGetReconExceptions(),
    enabled: isAdminStaff && tab === 'reconciliation',
  });

  const { data: flags } = useQuery({
    queryKey: ['admin-compliance-flags'],
    queryFn: () => api.adminGetComplianceFlags(),
    enabled: isAdminStaff && tab === 'compliance',
  });

  const { data: approvals } = useQuery({
    queryKey: ['admin-approvals'],
    queryFn: () => api.adminGetApprovals(),
    enabled: isAdminStaff && tab === 'approvals',
  });

  const { data: providersHealth } = useQuery({
    queryKey: ['admin-providers'],
    queryFn: () => api.adminGetProvidersHealth(),
    enabled: isAdminStaff && tab === 'providers',
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => api.adminGetAuditLogs(),
    enabled: isAdminStaff && tab === 'audit',
  });

  const { data: sysConfig } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => api.adminGetConfig(),
    enabled: isAdminStaff && tab === 'config',
  });

  const runReconMutation = useMutation({
    mutationFn: () => api.adminRunReconciliation(),
    onSuccess: () => {
      notify('ok', '8-dimension reconciliation run completed.');
      void queryClient.invalidateQueries({ queryKey: ['admin-recon-runs'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-recon-exceptions'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => notify('err', err instanceof ApiError ? err.message : String(err)),
  });

  const settleMutation = useMutation({
    mutationFn: (id: string) => api.adminSettleTrade(id),
    onSuccess: () => {
      notify('ok', 'Trade settlement completed and ledger updated.');
      void queryClient.invalidateQueries({ queryKey: ['admin-settlements'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => notify('err', err instanceof ApiError ? err.message : String(err)),
  });

  const retrySettleMutation = useMutation({
    mutationFn: (id: string) => api.adminRetrySettlement(id),
    onSuccess: () => {
      notify('ok', 'Failed settlement queued back to PENDING_SETTLEMENT.');
      void queryClient.invalidateQueries({ queryKey: ['admin-settlements'] });
    },
  });

  const decideApprovalMutation = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      api.adminDecideApproval(id, approve, approve ? 'Approved by independent checker.' : 'Rejected by checker.'),
    onSuccess: () => {
      notify('ok', 'Maker-checker decision recorded with audit trail.');
      void queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-recon-exceptions'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => notify('err', err instanceof ApiError ? `${err.code}: ${err.message}` : String(err)),
  });

  const initiateReconApprovalMutation = useMutation({
    mutationFn: (excId: string) =>
      api.adminCreateApproval({
        approval_type: 'RECON_ADJUSTMENT',
        resource_type: 'RECONCILIATION_EXCEPTION',
        resource_id: excId,
        reason: 'Resolution proposal submitted from Reconciliation Dashboard.',
      }),
    onSuccess: () => {
      notify('ok', 'Maker-checker approval request created. Another officer must approve.');
      void queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });
    },
    onError: (err) => notify('err', err instanceof ApiError ? err.message : String(err)),
  });

  const restrictMutation = useMutation({
    mutationFn: ({ id, restricted }: { id: string; restricted: boolean }) =>
      api.adminSetCustomerRestriction(
        id,
        restricted,
        restricted ? 'Compliance restriction enabled via Admin Desk' : 'Compliance restriction lifted',
      ),
    onSuccess: () => {
      notify('ok', 'Customer trading restriction updated and audited.');
      void queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
    },
    onError: (err) => notify('err', err instanceof ApiError ? err.message : String(err)),
  });

  const resolveFlagMutation = useMutation({
    mutationFn: (id: string) =>
      api.adminUpdateComplianceFlag(id, 'RESOLVED', 'Reviewed and cleared by Compliance Officer.'),
    onSuccess: () => {
      notify('ok', 'Compliance flag resolved.');
      void queryClient.invalidateQueries({ queryKey: ['admin-compliance-flags'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => notify('err', err instanceof ApiError ? err.message : String(err)),
  });

  const ingestMutation = useMutation({
    mutationFn: () => api.adminTriggerIngestion(),
    onSuccess: () => {
      notify('ok', 'Sandbox market data quote ingestion executed.');
      void queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
    },
    onError: (err) => notify('err', err instanceof ApiError ? err.message : String(err)),
  });

  const exportCsv = async () => {
    const csv = await api.adminExportReconCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stockexchange-reconciliation-exceptions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated || !isAdminStaff) {
    return (
      <EmptyState
        title="Administrative Access Restricted"
        description="This workspace requires ADMIN, COMPLIANCE_OFFICER, OPERATIONS_OFFICER, RECONCILIATION_OFFICER, or AUDITOR role privileges."
        action={
          <Button variant="primary" onClick={() => navigate('/login')}>
            Sign In with Staff Account
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#D4AF37]" />
            <h1 className="text-2xl font-bold text-[#002855] dark:text-white">
              Administrative, Compliance &amp; Operations Console
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Signed in as <strong>{user?.full_name}</strong> ({user?.roles.join(', ')}) • Channel:{' '}
            {user?.channel}
          </p>
        </div>
        <Badge tone="gold">ROLE-PROTECTED WORKSPACE</Badge>
      </div>

      {banner && (
        <div
          role="status"
          className={cn(
            'rounded-lg border px-4 py-2.5 text-xs font-semibold',
            banner.tone === 'ok'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
              : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200',
          )}
        >
          {banner.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3 dark:border-slate-800">
        {ADMIN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              tab === t.id
                ? 'bg-[#002855] text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-[#0E1F38] dark:text-slate-300 dark:ring-slate-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: OVERVIEW */}
      {tab === 'overview' && dashboard && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(dashboard.kpis).map(([k, val]) => (
            <Card key={k} className="p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {k.replace(/_/g, ' ')}
              </div>
              <div className="mt-2 text-2xl font-black tabular-nums text-[#002855] dark:text-[#D4AF37]">
                {val}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB: CUSTOMERS & KYC */}
      {tab === 'customers' && (
        <Card className="overflow-hidden">
          <CardHeader title="Customers, Investment Accounts, KYC & Risk Monitoring" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">KYC / AML</th>
                  <th className="px-4 py-3">Risk Tier</th>
                  <th className="px-4 py-3">Trading Status</th>
                  <th className="px-4 py-3 text-right">Compliance Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers?.items.map((c) => (
                  <tr key={String(c.id)}>
                    <td className="px-4 py-3">
                      <div className="font-bold">{String(c.full_name)}</div>
                      <div className="text-[11px] text-slate-500">{String(c.email)}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">{String(c.account_number || '—')}</td>
                    <td className="px-4 py-3">
                      <Badge tone={c.kyc_status === 'VERIFIED' ? 'green' : 'amber'}>
                        {String(c.kyc_status)} / {String(c.aml_status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{String(c.risk_tier)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={c.trading_restricted ? 'red' : 'green'}>
                        {c.trading_restricted ? 'RESTRICTED' : 'ACTIVE'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={c.trading_restricted ? 'success' : 'danger'}
                        onClick={() =>
                          restrictMutation.mutate({
                            id: String(c.id),
                            restricted: !c.trading_restricted,
                          })
                        }
                      >
                        {c.trading_restricted ? 'Lift Restriction' : 'Restrict Trading'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB: ORDERS */}
      {tab === 'orders' && (
        <Card className="overflow-hidden">
          <CardHeader title="Platform-Wide Trading Order Monitor" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="border-b bg-slate-50 uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Side / Symbol</th>
                  <th className="px-4 py-3 text-right">Filled / Qty</th>
                  <th className="px-4 py-3 text-right">Est. Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders?.items.map((o) => (
                  <tr key={String(o.id)}>
                    <td className="px-4 py-3 font-mono font-semibold">{String(o.order_reference)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={o.side === 'BUY' ? 'green' : 'red'} className="mr-1">
                        {String(o.side)}
                      </Badge>
                      <strong>{String(o.symbol)}</strong>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {String(o.filled_quantity)} / {String(o.quantity)}
                    </td>
                    <td className="px-4 py-3 text-right">{formatNGN(String(o.estimated_total_value))}</td>
                    <td className="px-4 py-3">
                      <Badge tone={o.status === 'FILLED' ? 'green' : 'amber'}>{String(o.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">{String(o.channel)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatLagosDateTime(String(o.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB: SETTLEMENTS */}
      {tab === 'settlements' && (
        <Card className="overflow-hidden">
          <CardHeader title="Settlement Lifecycle Monitoring (T+3 NGX Sandbox)" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="border-b bg-slate-50 uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3">Settlement Ref</th>
                  <th className="px-4 py-3">Side / Qty</th>
                  <th className="px-4 py-3 text-right">Net Cash</th>
                  <th className="px-4 py-3">Cycle / Expected</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ops Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {settlements?.items.map((s) => (
                  <tr key={String(s.id)}>
                    <td className="px-4 py-3 font-mono font-semibold">{String(s.settlement_reference)}</td>
                    <td className="px-4 py-3">
                      {String(s.side)} • {String(s.quantity)} shares
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatNGN(String(s.net_cash_amount))}</td>
                    <td className="px-4 py-3">
                      {String(s.settlement_cycle)} ({String(s.expected_settlement_date)})
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          s.status === 'SETTLED'
                            ? 'green'
                            : s.status === 'SETTLEMENT_FAILED'
                              ? 'red'
                              : 'amber'
                        }
                      >
                        {String(s.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.status === 'PENDING_SETTLEMENT' && (
                        <Button size="sm" variant="success" onClick={() => settleMutation.mutate(String(s.id))}>
                          Complete Settlement
                        </Button>
                      )}
                      {s.status === 'SETTLEMENT_FAILED' && (
                        <Button size="sm" variant="gold" onClick={() => retrySettleMutation.mutate(String(s.id))}>
                          Retry Failed Settlement
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB: RECONCILIATION */}
      {tab === 'reconciliation' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => runReconMutation.mutate()}>
              <Play className="h-3.5 w-3.5" /> Run 8-Dimension Reconciliation Now
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void exportCsv()}>
              <Download className="h-3.5 w-3.5" /> Export Exceptions CSV
            </Button>
          </div>

          <Card>
            <CardHeader title="Reconciliation Runs" />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="border-b bg-slate-50 uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-2.5">Run Ref</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5 text-right">Checked</th>
                    <th className="px-4 py-2.5 text-right">Matched</th>
                    <th className="px-4 py-2.5 text-right">Exceptions</th>
                    <th className="px-4 py-2.5">Triggered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reconRuns?.items.map((r) => (
                    <tr key={String(r.id)}>
                      <td className="px-4 py-2.5 font-mono font-semibold">{String(r.run_reference)}</td>
                      <td className="px-4 py-2.5">{String(r.run_type)}</td>
                      <td className="px-4 py-2.5 text-right">{String(r.total_items_checked)}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600">{String(r.matched_items)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-rose-600">
                        {String(r.exceptions_found)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{String(r.triggered_by)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Reconciliation Exceptions"
              subtitle="Balances are NEVER silently altered; resolution requires Maker-Checker approval"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-slate-50 uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-2.5">Code / Category</th>
                    <th className="px-4 py-2.5">Severity</th>
                    <th className="px-4 py-2.5">Ref</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Workflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reconExceptions?.items.map((e) => (
                    <tr key={String(e.id)}>
                      <td className="px-4 py-2.5">
                        <div className="font-bold">{String(e.exception_code)}</div>
                        <div className="text-[10px] text-slate-500">{String(e.category)}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={e.severity === 'CRITICAL' ? 'red' : 'amber'}>
                          {String(e.severity)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono">{String(e.reference_id)}</td>
                      <td className="px-4 py-2.5">{String(e.description)}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={e.status === 'RESOLVED' ? 'green' : 'red'}>
                          {String(e.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {e.status !== 'RESOLVED' && (
                          <Button
                            size="sm"
                            variant="gold"
                            onClick={() => initiateReconApprovalMutation.mutate(String(e.id))}
                          >
                            Initiate Maker-Checker
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB: COMPLIANCE FLAGS */}
      {tab === 'compliance' && (
        <Card>
          <CardHeader title="Compliance Surveillance &amp; Suspicious Activity Flags" />
          <div className="divide-y divide-slate-100 p-4 dark:divide-slate-800">
            {flags?.items.map((f) => (
              <div key={String(f.id)} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    <strong className="text-sm">{String(f.title)}</strong>
                    <Badge tone={f.severity === 'HIGH' ? 'red' : 'amber'}>{String(f.severity)}</Badge>
                    <Badge tone={f.status === 'RESOLVED' ? 'green' : 'blue'}>{String(f.status)}</Badge>
                  </div>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">{String(f.description)}</p>
                </div>
                {f.status !== 'RESOLVED' && (
                  <Button size="sm" variant="primary" onClick={() => resolveFlagMutation.mutate(String(f.id))}>
                    Mark Reviewed &amp; Resolved
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB: MAKER-CHECKER APPROVALS */}
      {tab === 'approvals' && (
        <Card>
          <CardHeader
            title="Maker-Checker Staff Approval Queue"
            subtitle="Segregation of duties enforced at API & PostgreSQL CHECK constraint: Maker MUST NOT approve their own request."
          />
          <div className="divide-y divide-slate-100 p-4 dark:divide-slate-800">
            {approvals?.items.map((a) => {
              const isOwnRequest = String(a.maker_user_id) === user?.user_id;
              return (
                <div key={String(a.id)} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{String(a.approval_reference)}</span>
                      <Badge tone="navy">{String(a.approval_type)}</Badge>
                      <Badge
                        tone={
                          a.status === 'APPROVED'
                            ? 'green'
                            : a.status === 'REJECTED'
                              ? 'red'
                              : 'amber'
                        }
                      >
                        {String(a.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{String(a.reason)}</p>
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      Maker: {String(a.maker_user_id)} {isOwnRequest && '(YOU — cannot self-approve)'}
                    </div>
                  </div>
                  {a.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => decideApprovalMutation.mutate({ id: String(a.id), approve: true })}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => decideApprovalMutation.mutate({ id: String(a.id), approve: false })}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* TAB: PROVIDERS HEALTH */}
      {tab === 'providers' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <Button size="sm" variant="primary" onClick={() => ingestMutation.mutate()}>
              <RefreshCw className="h-3.5 w-3.5" /> Trigger Market Data Quote Ingestion
            </Button>
          </div>
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#002855] dark:text-white">
              <Activity className="h-4 w-4 text-[#D4AF37]" /> Market Data, Broker &amp; Banking Providers Health
            </h3>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-emerald-300">
              {JSON.stringify(providersHealth, null, 2)}
            </pre>
          </Card>
        </div>
      )}

      {/* TAB: AUDIT LOGS */}
      {tab === 'audit' && (
        <Card className="overflow-hidden">
          <CardHeader title="Immutable Security &amp; Operations Audit Trail" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-2.5">Timestamp (WAT)</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Resource</th>
                  <th className="px-4 py-2.5">Channel</th>
                  <th className="px-4 py-2.5">Outcome</th>
                  <th className="px-4 py-2.5">Correlation ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs?.items.map((l) => (
                  <tr key={String(l.id)}>
                    <td className="px-4 py-2.5 text-slate-500">{formatLagosDateTime(String(l.created_at))}</td>
                    <td className="px-4 py-2.5 font-semibold">{String(l.action)}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px]">
                      {String(l.resource_type)}:{String(l.resource_id || '').slice(0, 8)}
                    </td>
                    <td className="px-4 py-2.5">{String(l.channel)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={l.outcome === 'SUCCESS' ? 'green' : 'red'}>{String(l.outcome)}</Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400">
                      {String(l.correlation_id).slice(0, 16)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB: CONFIG & MULTI-CHANNEL */}
      {tab === 'config' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-bold text-[#002855] dark:text-white">
              Feature Flags, Effective-Dated Fee Schedule &amp; Banking Channels
            </h3>
            <pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-sky-300">
              {JSON.stringify(sysConfig, null, 2)}
            </pre>
          </Card>

          <Card className="p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#002855] dark:text-white">
              <Smartphone className="h-4 w-4 text-[#D4AF37]" /> Sample USSD Channel Adapter Simulator
            </h3>
            <p className="mb-3 text-xs text-slate-500">
              Test the multi-channel USSD gateway contract (menu: blank, 1 = FIRSTHOLDCO quote, 4 = NGX Session).
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={ussdChoice}
                onChange={(e) => setUssdChoice(e.target.value)}
                placeholder="Enter USSD input (blank, 1, or 4)"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
              />
              <Button
                size="sm"
                variant="gold"
                onClick={async () => {
                  const res = await api.ussdSimulate('sbx-ussd-001', ussdChoice);
                  setUssdOutput(`[${res.action}]\n${res.text}`);
                }}
              >
                Dial USSD
              </Button>
            </div>
            {ussdOutput && (
              <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-[#001A35] p-4 font-mono text-xs text-amber-200">
                {ussdOutput}
              </pre>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
