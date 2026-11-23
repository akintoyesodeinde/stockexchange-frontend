import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Landmark, Lock, ShieldAlert, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '@/features/authentication/AuthContext';
import { getKeycloakResetPasswordUrl } from '@/services/oidc';
import { Badge, Button, Card } from '@/components/ui/primitives';

const SANDBOX_FIXTURES = [
  {
    label: 'Retail Investor (Adebayo)',
    role: 'CUSTOMER',
    username: 'adebayo.investor',
    password: 'SandboxInvestor123!',
    clientId: 'stockexchange-web',
    note: 'Pre-funded NGN 5M, FIRSTHOLDCO + NGX holdings, KYC verified',
  },
  {
    label: 'Platform Administrator (Tunde)',
    role: 'ADMIN / SUPER_ADMIN',
    username: 'tunde.admin',
    password: 'SandboxAdmin123!',
    clientId: 'stockexchange-admin',
    note: 'Full Administrative, Settlement, Reconciliation & Maker-Checker Access',
  },
  {
    label: 'Compliance Officer (Zainab)',
    role: 'COMPLIANCE_OFFICER',
    username: 'zainab.compliance',
    password: 'SandboxCompliance123!',
    clientId: 'stockexchange-admin',
    note: 'KYC Monitoring, Surveillance Flags, Trading Restrictions & Audit',
  },
  {
    label: 'Operations & Recon (Emeka)',
    role: 'OPERATIONS / RECON',
    username: 'emeka.operations',
    password: 'SandboxOps123!',
    clientId: 'stockexchange-admin',
    note: 'Settlement Lifecycle, 8-Dimension Reconciliation & CSV Exports',
  },
];

export function LoginPage() {
  const { loginWithPkce, loginWithCredentials } = useAuth();
  const navigate = useNavigate();
  const isSandboxBuild = import.meta.env.VITE_SANDBOX_MODE !== 'false';
  const [username, setUsername] = useState(isSandboxBuild ? 'adebayo.investor' : '');
  const [password, setPassword] = useState(isSandboxBuild ? 'SandboxInvestor123!' : '');
  const [clientId, setClientId] = useState('stockexchange-web');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithCredentials(username, password, clientId);
      navigate(clientId === 'stockexchange-admin' ? '/admin' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl py-6">
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Identity Panel */}
        <Card className="overflow-hidden lg:col-span-3">
          <div className="bg-gradient-to-r from-[#002855] to-[#001A35] px-6 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D4AF37] text-[#001A35]">
                <Landmark className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  Stock<span className="text-[#D4AF37]">Exchange</span> OIDC Sign In
                </h1>
                <p className="text-xs text-slate-300">
                  OAuth 2.0 + OpenID Connect (PKCE) via Keycloak Identity Provider
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                Sandbox Identity Provider Mode
              </div>
              <p className="mt-1">
                Authentication and RS256 JWT token issuance are delegated to the Keycloak{' '}
                <code>stockexchange</code> realm. Choose standard OIDC PKCE redirect or sign in
                directly with a sandbox fixture identity below.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="gold"
                className="flex-1"
                onClick={() => void loginWithPkce('login')}
              >
                <ShieldCheck className="h-4 w-4" /> Continue with Keycloak OIDC (PKCE)
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void loginWithPkce('register')}
              >
                <UserPlus className="h-4 w-4" /> Register via IdP
              </Button>
            </div>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
              <span className="mx-3 shrink text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Or Sandbox OIDC Direct Sign-In
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleCredentialSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Username or Email
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-between">
                <a
                  href={getKeycloakResetPasswordUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-[#002855] underline dark:text-[#D4AF37]"
                >
                  Password recovery (Keycloak)
                </a>
                <Badge tone="navy">Channel: {clientId}</Badge>
              </div>
              <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
                <Lock className="h-4 w-4" />
                {submitting ? 'Authenticating with Keycloak...' : 'Sign In (Keycloak RS256 JWT)'}
              </Button>
            </form>
          </div>
        </Card>

        {/* Right Demo Personas Panel (strictly disabled in non-sandbox builds) */}
        {isSandboxBuild && (
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#D4AF37]" />
            <h2 className="text-sm font-bold text-[#002855] dark:text-white">
              Development Fixture Accounts
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Click any sandbox persona to pre-fill credentials (disabled in production builds).
          </p>
          <div className="mt-4 space-y-2.5">
            {SANDBOX_FIXTURES.map((f) => (
              <button
                key={f.username}
                type="button"
                onClick={() => {
                  setUsername(f.username);
                  setPassword(f.password);
                  setClientId(f.clientId);
                }}
                className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:border-[#D4AF37] hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#002855] dark:text-white">
                    {f.label}
                  </span>
                  <Badge tone="gold">{f.role}</Badge>
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                  {f.username}
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{f.note}</p>
              </button>
            ))}
          </div>
        </Card>
        )}
      </div>
    </div>
  );
}
