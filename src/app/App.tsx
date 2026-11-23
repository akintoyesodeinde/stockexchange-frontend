import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/authentication/AuthContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { MarketOverviewPage } from '@/pages/MarketOverviewPage';
import { StockScreenerPage } from '@/pages/StockScreenerPage';
import { StockDetailPage } from '@/pages/StockDetailPage';
import { StockComparePage } from '@/pages/StockComparePage';
import { PortfolioPage } from '@/pages/PortfolioPage';
import { TradingPage } from '@/pages/TradingPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { WatchlistsAlertsPage } from '@/pages/WatchlistsAlertsPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { AdminWorkspacePage } from '@/pages/AdminWorkspacePage';
import { LoginPage } from '@/pages/LoginPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 20_000,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<MarketOverviewPage />} />
              <Route path="/screener" element={<StockScreenerPage />} />
              <Route path="/stocks" element={<Navigate to="/screener" replace />} />
              <Route path="/stocks/:symbol" element={<StockDetailPage />} />
              <Route path="/compare" element={<StockComparePage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/trade" element={<TradingPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/watchlists" element={<WatchlistsAlertsPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/admin" element={<AdminWorkspacePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
