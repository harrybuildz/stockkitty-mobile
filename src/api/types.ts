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
