# StockExchange Frontend — NGX Investment Banking Dashboard

> **SANDBOX PORTFOLIO DEMONSTRATION DISCLAIMER**: Independent portfolio demonstration inspired by FirstBank of Nigeria and First HoldCo Plc's digital banking and investment ecosystem. Uses simulated NGX market data and a sandbox brokerage provider. **Not** officially authorized for live trading or real customer funds.

## Technology Stack
- **React 19** + **TypeScript (Strict Mode)** + **Vite 6**
- **Tailwind CSS v4** (Institutional Navy `#002855`, Deep Navy `#001A35`, Gold `#D4AF37`, Light/Dark modes, mobile responsive)
- **TanStack Query** (caching, retries, graceful backend outage recovery) & **TanStack Table** (server-side sorting/pagination screener)
- **React Router v7**, **React Hook Form**, and **Zod v4**
- **TradingView Lightweight Charts™** (Apache License 2.0 — visible attribution & link to https://www.tradingview.com preserved in both chart and global footer)
- **Recharts** (MIT License — portfolio allocation and market analytics charts)
- **OAuth 2.0 Authorization Code Flow with PKCE** via Keycloak OIDC (`stockexchange` realm)
- **Vitest**, **React Testing Library**, and **Playwright** E2E testing

## Key Pages & Capabilities
- **Market Overview (`/`)**: Prominent sandbox banner, NGX ASI & market breadth summary, Featured **First HoldCo Plc (`FIRSTHOLDCO` / legacy `FBNH`, ISIN `NGFBNH000009`)** hero card, sector charts, gainers/losers/most active tables, corporate news, and watchlist summary.
- **Stock Screener (`/stocks`)**: Server-side search, sector filter, sorting, and pagination powered by TanStack Table.
- **Stock Detail (`/stocks/:symbol`)**: Resolves both `FIRSTHOLDCO` and `FBNH`; TradingView Lightweight Charts candlestick/area/SMA/volume chart with truthful `1D` timeframe disclosure, RSI/MACD/Bollinger technicals, volatility disclaimer, financial statements, dividends, corporate actions, and news.
- **Stock Comparison (`/compare`)**: Side-by-side NGX equity metrics and normalized performance chart.
- **Portfolio & Cash Account (`/portfolio`)**: Total value, settled/reserved/available cash, unrealized/realized P&L, sector allocation donut, holdings breakdown, and immutable ledger history.
- **Simulated Trading (`/trade`)**: Full Order Preview → Step-Up MFA OTP → `Idempotency-Key` order submission supporting all sandbox broker simulation modes.
- **Orders & Contract Notes (`/orders`)**: Order state history, executions, cancellation, and printable/downloadable HTML sandbox contract notes.
- **Watchlists & Price Alerts (`/watchlists`)** and **Investor Onboarding (`/onboarding`)**.
- **Role-Protected Administrative Workspace (`/admin`)**: Hidden from non-staff; exposes 10 governance tabs (Overview, Customers/KYC, Orders/Executions, Settlements, 8-Dimension Reconciliation + CSV export, Maker-Checker Approvals, Compliance/Surveillance, Market Data Providers, Audit Logs, and USSD Simulator).

## Commands
```powershell
npm ci
npm run dev          # Local dev server on http://localhost:3010
npm run typecheck    # Strict TypeScript check
npm run lint         # ESLint check
npm test             # Vitest + React Testing Library suite
npm run build        # Production TypeScript + Vite bundle
npm run test:e2e     # Playwright end-to-end tests
```

## Docker Build
```powershell
docker build `
  --build-arg VITE_API_BASE_URL=http://localhost:8000/api/v1 `
  --build-arg VITE_OIDC_AUTHORITY=http://localhost:8180/realms/stockexchange `
  --build-arg VITE_OIDC_CLIENT_ID=stockexchange-web `
  -t stockexchange-frontend:local .
```
