// Response shapes for endpoints the backend returns as untyped dicts (no
// FastAPI response_model), so types.gen.ts can't describe them. Request
// paths and bodies come from types.gen.ts; keep these to the fields the app
// actually reads.

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: 'bearer';
};

export type Me = {
  username: string;
  id: number;
  is_admin: boolean;
  terms_accepted: boolean;
};

// One row of `valuation_results` (GET /api/screener). Nullable fields are
// null when the batch couldn't compute them for that ticker.
export type ScreenerRow = {
  ticker: string;
  company_name: string | null;
  sector: string | null;
  market_price: number | null;
  avg_price: number | null;
  margin_of_safety: number | null;
  market_cap: number | null;
  piotroski_score: number | null;
};

// GET /api/company/{ticker}/financials — a large dict of series and scalars.
// Typed loosely; valuation code reads it through @stockkitty/valuation.
export type Financials = Record<string, unknown> & {
  companyName?: string;
  sharesOutstanding?: number;
  currentMarketPrice?: number;
};

// GET /api/search — screener-cache matches first, then wider lookups.
export type SearchResult = {
  symbol: string;
  name: string;
};

export type PortfolioHolding = {
  ticker: string;
  company_name: string | null;
  sector: string | null;
  allocation: number; // fraction of the portfolio, 0–1
  market_price: number | null;
  avg_price: number | null;
  margin_of_safety: number | null;
};

// One entry of GET /api/portfolios: built-in strategies first, then the
// user's custom portfolios (id "custom_<n>"). Accounts hold real positions,
// not target weights, so their `holdings` is empty.
export type Portfolio = {
  id: string;
  name: string;
  subtitle: string;
  philosophy: string;
  holdings: PortfolioHolding[];
  sector_breakdown: Record<string, number>;
  holding_count?: number;
  is_account?: boolean;
};
