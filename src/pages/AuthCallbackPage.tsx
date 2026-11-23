import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/authentication/AuthContext';
import { Card, ErrorRecoveryState } from '@/components/ui/primitives';

export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const { handlePkceCallback } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    const oidcError = params.get('error_description') || params.get('error');
    if (oidcError) {
      setError(oidcError);
      return;
    }
    if (!code || !state) {
      setError('Missing OIDC authorization code or state parameter.');
      return;
    }
    handlePkceCallback(code, state)
      .then(() => navigate('/', { replace: true }))
      .catch((err) => setError(err instanceof Error ? err.message : 'OIDC callback failed.'));
  }, [params, handlePkceCallback, navigate]);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-12">
        <ErrorRecoveryState
          title="OIDC Sign-In Failed"
          message={error}
          onRetry={() => navigate('/login')}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <Card className="p-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#002855] border-t-[#D4AF37]" />
        <h2 className="mt-4 text-sm font-semibold text-[#002855] dark:text-white">
          Completing PKCE Token Exchange...
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Verifying Keycloak RS256 credentials and loading your NGX investment workspace.
        </p>
      </Card>
    </div>
  );
}
