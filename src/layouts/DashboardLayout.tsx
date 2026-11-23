import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  Bell,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Compass,
  Filter,
  GitCompare,
  Landmark,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Sun,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/authentication/AuthContext';
import { api } from '@/services/apiClient';
import { Badge, Button, cn } from '@/components/ui/primitives';
import { formatLagosDateTime, formatNGN, formatPercent, movementColorClass } from '@/utilities/format';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const CUSTOMER_NAV: NavItem[] = [
  { to: '/', label: 'Market Overview', icon: Compass },
  { to: '/stocks/FIRSTHOLDCO', label: 'First HoldCo (FIRSTHOLDCO)', icon: Landmark, badge: 'Featured' },
  { to: '/screener', label: 'Stock Screener', icon: Filter },
  { to: '/compare', label: 'Compare Equities', icon: GitCompare },
  { to: '/portfolio', label: 'My Portfolio', icon: Briefcase },
  { to: '/trade', label: 'Trade Execution', icon: ArrowLeftRight },
  { to: '/orders', label: 'Orders & Notes', icon: ClipboardList },
  { to: '/watchlists', label: 'Watchlists & Alerts', icon: Star },
  { to: '/onboarding', label: 'Onboarding & KYC', icon: UserCheck },
];

export function DashboardLayout() {
  const { user, isAuthenticated, isAdminStaff, theme, toggleTheme, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: searchResults } = useQuery({
    queryKey: ['global-search', searchQuery],
    queryFn: () => api.searchStocks(searchQuery),
    enabled: searchQuery.trim().length >= 1,
    staleTime: 30_000,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const breadcrumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((segment, idx, arr) => ({
      label: segment.toUpperCase() === 'FIRSTHOLDCO' ? 'FIRSTHOLDCO' : segment.replace(/-/g, ' '),
      path: '/' + arr.slice(0, idx + 1).join('/'),
    }));

  const navLinks = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4" aria-label="Primary Navigation">
      {CUSTOMER_NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#D4AF37] text-[#001A35] shadow-sm'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && (
              <span className="flex flex-1 items-center justify-between truncate">
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-1 rounded bg-[#001A35]/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </span>
            )}
          </NavLink>
        );
      })}

      {isAdminStaff && (
        <div className="mt-4 border-t border-white/15 pt-4">
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
              Governance &amp; Ops
            </p>
          )}
          <NavLink
            to="/admin"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#D4AF37] text-[#001A35]'
                  : 'text-amber-100 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">Admin &amp; Compliance</span>}
          </NavLink>
        </div>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA] dark:bg-[#071426]">
      {/* Prominent Mandatory Sandbox Environment Indicator */}
      <div
        role="banner"
        data-testid="sandbox-banner"
        className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/50 bg-amber-50 px-4 py-1.5 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/60 dark:text-amber-200"
      >
        <div className="flex items-center gap-2 font-medium">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>SANDBOX PORTFOLIO DEMONSTRATION:</strong> Simulated NGX market data &amp;
            simulated brokerage only. Not an officially authorized FirstBank of Nigeria, First
            HoldCo Plc, NGX, SEC Nigeria, or CSCS platform. Real funds &amp; live trading disabled.
          </span>
        </div>
        <span className="rounded bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-950 dark:bg-amber-900 dark:text-amber-100">
          NGX SANDBOX • NGN
        </span>
      </div>

      <div className="flex flex-1">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={cn(
            'hidden flex-col border-r border-[#001A35] bg-gradient-to-b from-[#002855] to-[#001A35] text-white transition-all duration-200 lg:flex',
            collapsed ? 'w-[72px]' : 'w-64',
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
            <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37] font-black text-[#001A35]">
                SE
              </div>
              {!collapsed && (
                <div className="leading-tight">
                  <div className="text-base font-bold tracking-tight text-white">
                    Stock<span className="text-[#D4AF37]">Exchange</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-300">
                    NGX Intelligence
                  </div>
                </div>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          {navLinks}
          {!collapsed && (
            <div className="border-t border-white/10 p-3 text-[11px] text-slate-300">
              <div className="font-semibold text-[#D4AF37]">Featured NGX Equity</div>
              <Link
                to="/stocks/FIRSTHOLDCO"
                className="mt-1 block rounded-lg bg-white/5 p-2 hover:bg-white/10"
              >
                <div className="font-semibold text-white">First HoldCo Plc</div>
                <div className="text-[10px] text-slate-300">FIRSTHOLDCO (ex-FBNH) • NGFBNH000009</div>
              </Link>
            </div>
          )}
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside className="relative z-10 flex w-72 flex-col bg-[#002855] text-white shadow-xl">
              <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
                <span className="text-lg font-bold">
                  Stock<span className="text-[#D4AF37]">Exchange</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation menu"
                  className="rounded p-1 hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {navLinks}
            </aside>
          </div>
        )}

        {/* Main Content Column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-[#0B1A30]/95 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Breadcrumbs */}
              <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-xs md:flex">
                <Link
                  to="/"
                  className="font-medium text-slate-500 hover:text-[#002855] dark:text-slate-400 dark:hover:text-white"
                >
                  Home
                </Link>
                {breadcrumbs.map((b) => (
                  <React.Fragment key={b.path}>
                    <span className="text-slate-400">/</span>
                    <Link
                      to={b.path}
                      className="font-semibold capitalize text-[#002855] dark:text-[#D4AF37]"
                    >
                      {b.label}
                    </Link>
                  </React.Fragment>
                ))}
              </nav>
            </div>

            {/* Global Stock Search (resolves FIRSTHOLDCO, FBNH, GTCO, ISIN, company names) */}
            <div ref={searchRef} className="relative max-w-md flex-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  placeholder="Search NGX stocks, aliases (FBNH, FIRSTHOLDCO), ISIN..."
                  aria-label="Global stock search"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002855] focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              {searchOpen && searchQuery.trim().length >= 1 && (
                <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#0E1F38]">
                  {searchResults?.items.length ? (
                    searchResults.items.map((item) => (
                      <button
                        key={item.instrument_id}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery('');
                          navigate(`/stocks/${item.symbol}`);
                        }}
                        className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-2.5 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#002855] dark:text-white">
                              {item.symbol}
                            </span>
                            {item.aliases.length > 0 && (
                              <Badge tone="gold">ex-{item.aliases.join(', ')}</Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {item.company_name} • {item.isin}
                          </div>
                        </div>
                        <div className="text-right tabular-nums">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {formatNGN(item.last_price)}
                          </div>
                          <div className={cn('text-xs font-medium', movementColorClass(item.change_percent))}>
                            {formatPercent(item.change_percent)}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-center text-xs text-slate-500">
                      No matching NGX equities found for "{searchQuery}".
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Utility Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle light and dark theme"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-[#D4AF37]" /> : <Moon className="h-4 w-4" />}
              </button>

              {isAuthenticated && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotifOpen((o) => !o)}
                    aria-label="Notification center"
                    className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Bell className="h-4 w-4" />
                    {(notifications?.unread_count ?? 0) > 0 && (
                      <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                        {notifications?.unread_count}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#0E1F38]">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                        <span className="text-xs font-bold text-[#002855] dark:text-white">
                          Notifications ({notifications?.unread_count ?? 0} unread)
                        </span>
                        <button
                          type="button"
                          onClick={() => setNotifOpen(false)}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Close
                        </button>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications?.items.length ? (
                          notifications.items.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => !n.is_read && markReadMutation.mutate(n.id)}
                              className={cn(
                                'cursor-pointer border-b border-slate-100 px-4 py-2.5 text-xs last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50',
                                !n.is_read && 'bg-sky-50/50 dark:bg-sky-950/30',
                              )}
                            >
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {n.title}
                              </div>
                              <p className="mt-0.5 text-slate-600 dark:text-slate-300">{n.body}</p>
                              <div className="mt-1 text-[10px] text-slate-400">
                                {formatLagosDateTime(n.created_at)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-500">
                            No notifications yet.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isAuthenticated && user ? (
                <div className="flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-700">
                  <div className="hidden text-right sm:block">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {user.full_name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {user.roles.join(', ')}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </div>
              ) : (
                <Button variant="primary" size="sm" onClick={() => navigate('/login')}>
                  <LogIn className="h-3.5 w-3.5" /> Sign In
                </Button>
              )}
            </div>
          </header>

          {/* Main View */}
          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>

          {/* Footer with Mandatory TradingView Lightweight Charts Apache 2.0 Attribution */}
          <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-[#0B1A30] dark:text-slate-400">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <strong>StockExchange</strong> — Independent NGX Investment Banking Sandbox. Inspired
                by FirstBank &amp; First HoldCo Plc ecosystem. Not officially endorsed or licensed
                for live trading.
              </div>
              <div>
                Charts powered by{' '}
                <a
                  href="https://www.tradingview.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#002855] underline dark:text-[#D4AF37]"
                >
                  TradingView Lightweight Charts™
                </a>{' '}
                (Apache 2.0) &amp; Recharts (MIT).
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
