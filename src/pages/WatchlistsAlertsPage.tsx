import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Lock, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/authentication/AuthContext';
import { api } from '@/services/apiClient';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  cn,
} from '@/components/ui/primitives';
import { formatNGN, formatPercent, movementColorClass } from '@/utilities/format';

export function WatchlistsAlertsPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [newWlName, setNewWlName] = useState('');
  const [addSymbolMap, setAddSymbolMap] = useState<Record<string, string>>({});
  const [alertSymbol, setAlertSymbol] = useState('FIRSTHOLDCO');
  const [alertCond, setAlertCond] = useState('PRICE_ABOVE');
  const [alertThreshold, setAlertThreshold] = useState('35.00');

  const { data: watchlists } = useQuery({
    queryKey: ['watchlists'],
    queryFn: () => api.getWatchlists(),
    enabled: isAuthenticated,
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.getAlerts(),
    enabled: isAuthenticated,
  });

  const createWlMutation = useMutation({
    mutationFn: () => api.createWatchlist(newWlName.trim()),
    onSuccess: () => {
      setNewWlName('');
      void queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });

  const deleteWlMutation = useMutation({
    mutationFn: (id: string) => api.deleteWatchlist(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['watchlists'] }),
  });

  const addItemMutation = useMutation({
    mutationFn: ({ wlId, symbol }: { wlId: string; symbol: string }) =>
      api.addWatchlistItem(wlId, symbol),
    onSuccess: (_, vars) => {
      setAddSymbolMap((m) => ({ ...m, [vars.wlId]: '' }));
      void queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ wlId, instId }: { wlId: string; instId: string }) =>
      api.removeWatchlistItem(wlId, instId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['watchlists'] }),
  });

  const createAlertMutation = useMutation({
    mutationFn: (e: React.FormEvent) => {
      e.preventDefault();
      return api.createAlert({
        symbol: alertSymbol.trim().toUpperCase(),
        condition_type: alertCond,
        threshold_value: Number(alertThreshold),
      });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const toggleAlertMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.updateAlert(id, { is_active: isActive }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (id: string) => api.deleteAlert(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Sign in to manage Watchlists & Price Alerts"
        description="Track multiple personalized NGX watchlists and automated threshold/percentage/volume alerts."
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
      <div>
        <h1 className="text-2xl font-bold text-[#002855] dark:text-white">
          Watchlists &amp; Price Alerts
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Organize NGX equities into custom watchlists and configure automated threshold notifications.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Watchlists Column */}
        <div className="space-y-5 lg:col-span-7">
          <Card className="p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newWlName.trim()) createWlMutation.mutate();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={newWlName}
                onChange={(e) => setNewWlName(e.target.value)}
                placeholder="New watchlist name (e.g. Dividend Champions)"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
              />
              <Button type="submit" variant="primary" size="sm" disabled={createWlMutation.isPending}>
                <Plus className="h-3.5 w-3.5" /> Create Watchlist
              </Button>
            </form>
          </Card>

          {watchlists?.items.map((wl) => (
            <Card key={wl.id}>
              <CardHeader
                title={wl.name}
                subtitle={wl.description || `${wl.items.length} tracked NGX equities`}
                action={
                  !wl.is_default && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteWlMutation.mutate(wl.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    </Button>
                  )
                }
              />
              <div className="p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const sym = (addSymbolMap[wl.id] || '').trim();
                    if (sym) addItemMutation.mutate({ wlId: wl.id, symbol: sym });
                  }}
                  className="mb-3 flex gap-2"
                >
                  <input
                    type="text"
                    value={addSymbolMap[wl.id] || ''}
                    onChange={(e) =>
                      setAddSymbolMap((m) => ({ ...m, [wl.id]: e.target.value.toUpperCase() }))
                    }
                    placeholder="Add symbol or alias (e.g. FBNH, SEPLAT, MTNN)"
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    Add
                  </Button>
                </form>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {wl.items.map((it) => (
                    <div key={it.item_id} className="flex items-center justify-between py-2.5 text-xs">
                      <div>
                        <Link
                          to={`/stocks/${it.symbol}`}
                          className="font-bold text-[#002855] hover:underline dark:text-white"
                        >
                          {it.symbol}
                        </Link>
                        <div className="text-[11px] text-slate-500">{it.company_name}</div>
                      </div>
                      <div className="flex items-center gap-4 tabular-nums">
                        <div className="text-right">
                          <div className="font-semibold">{formatNGN(it.last_price)}</div>
                          <div className={cn('text-[11px] font-semibold', movementColorClass(it.change_percent))}>
                            {formatPercent(it.change_percent)}
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${it.symbol}`}
                          onClick={() =>
                            removeItemMutation.mutate({ wlId: wl.id, instId: it.instrument_id })
                          }
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {wl.items.length === 0 && (
                    <p className="py-4 text-center text-xs text-slate-500">
                      No equities in this watchlist yet.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Price Alerts Column */}
        <div className="space-y-5 lg:col-span-5">
          <Card>
            <CardHeader
              title="Create Price / Volume Alert"
              action={<Bell className="h-4 w-4 text-[#D4AF37]" />}
            />
            <form onSubmit={(e) => createAlertMutation.mutate(e)} className="space-y-3 p-4 text-xs">
              <div>
                <label className="mb-1 block font-semibold">Symbol / Alias</label>
                <input
                  type="text"
                  required
                  value={alertSymbol}
                  onChange={(e) => setAlertSymbol(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Trigger Condition</label>
                <select
                  value={alertCond}
                  onChange={(e) => setAlertCond(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="PRICE_ABOVE">Price Exceeds Threshold (NGN)</option>
                  <option value="PRICE_BELOW">Price Falls Below Threshold (NGN)</option>
                  <option value="PCT_CHANGE">Daily % Movement Exceeds (%)</option>
                  <option value="VOLUME_ABOVE">Trading Volume Exceeds (Shares)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold">Threshold Value</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 tabular-nums dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <Button type="submit" variant="gold" className="w-full" disabled={createAlertMutation.isPending}>
                Create Alert
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader title={`Active & Configured Alerts (${alerts?.items.length ?? 0})`} />
            <div className="divide-y divide-slate-100 p-4 dark:divide-slate-800">
              {alerts?.items.map((al) => (
                <div key={al.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong>{al.symbol}</strong>
                      <Badge tone={al.is_active ? 'green' : 'neutral'}>
                        {al.is_active ? 'ACTIVE' : 'PAUSED'}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {al.condition_type.replace('_', ' ')}: <strong>{al.threshold_value}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        toggleAlertMutation.mutate({ id: al.id, isActive: !al.is_active })
                      }
                    >
                      {al.is_active ? 'Pause' : 'Resume'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => deleteAlertMutation.mutate(al.id)}
                      className="rounded p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
