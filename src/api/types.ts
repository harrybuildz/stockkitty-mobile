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
  // Fields read by the filter system (lib/screener-filters.ts).
  fcf_price: number | null;
  ep_price: number | null;
  re_price: number | null;
  cash_conversion: number | null;
  dividend_yield: number | null;
  buyback_yield: number | null;
  /** JSON string of {code, model, msg}[] — parse with parseFlags. */
  flags: string | null;
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

// GET /api/company/{ticker}/quality-indicators. Metric fields are null when
// the batch couldn't compute them — "no data" and "not applicable" render
// the same.
export type QualityIndicators = {
  piotroski: {
    score: number | null;
    total_testable: number;
  };
  quality: {
    roic: number | null;
    net_debt_to_ebitda: number | null;
    gross_margin: number | null;
    revenue_cagr: number | null;
    fcf_positive_years: number | null;
    industry: string | null;
  };
  earnings_quality: {
    cash_conversion: number | null;
  };
  capital_return: {
    dividend_yield: number | null;
    buyback_yield: number | null;
    total_shareholder_yield: number | null;
  };
};

// GET /api/company/{ticker}/thesis — 404 means no cached thesis; pass
// ?generate=true to create one (counts against the shared 10/hour
// per-user refresh budget, takes 5–15s).
export type Thesis = {
  bull_case: string;
  bear_case: string;
  quality_assessment: string;
  peer_comparison: string;
  stored_at: string;
  is_stale: boolean;
};

// GET /api/company/{ticker}/ddm — applicable=false (no dividend) still
// returns the supplementary ratios.
export type Ddm = {
  applicable: boolean;
  reason: string | null;
  pricePerShare: number | null;
  marginOfSafety: number | null;
  currentDividend: number;
  dividendYield: number | null;
  costOfEquity: number;
  stage1Growth: number;
  stage2Growth: number;
  terminalGrowth: number;
  pb: number | null;
  pffo: number | null;
};

// GET /api/company/{ticker}/news-sentiment (the fields the app renders;
// the endpoint returns more).
export type NewsSentiment = {
  news_count_7d: number;
  news_count_30d: number;
  velocity_7d: number;
  net_sentiment_7d: number;
  net_sentiment_30d: number;
  sentiment_momentum: number | null;
  recent_headlines: {
    headline: string;
    url: string;
    published_utc: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    publisher: string;
  }[];
  reddit_mentions: number | null;
  reddit_rank_change: number | null;
  sentiment_history: { date: string; net_sentiment: number; count: number }[] | null;
  reddit_by_subreddit: Record<
    string,
    { mentions: number; rank: number; rank_change: number | null; sentiment_score: number | null }
  > | null;
  fetch_status?: 'partial' | 'stale';
};

// GET /api/company/{ticker}/insider — available=false when the server has
// no Polygon key; transactions can be empty with a valid zeroed summary.
export type InsiderActivity = {
  summary: {
    buyer_count: number;
    seller_count: number;
    buy_value: number;
    sell_value: number;
    net_value: number;
    tx_count: number;
  };
  transactions: {
    date: string;
    insider: string;
    role: string;
    action: string;
    shares: number;
    price: number;
    value: number;
    is_buy: boolean;
    is_sell: boolean;
  }[];
  days: number;
  available: boolean;
};

// GET /api/highlights — screener rows grouped by spotlight rule, with a
// one-sentence evidence string per company. Companies are server-capped
// at 15 per rule; `total` carries the uncapped count.
export type Highlights = {
  categories: { key: string; label: string }[];
  rules: {
    code: string;
    category: string;
    label: string;
    blurb: string;
    total: number;
    companies: {
      ticker: string;
      company_name: string | null;
      sector: string | null;
      market_cap: number | null;
      market_price: number | null;
      margin_of_safety: number | null;
      consensus_label: string | null;
      evidence: string;
    }[];
  }[];
};

// GET /api/positions/{portfolio_id} — real brokerage holdings for an
// account-kind portfolio. target_weight/drift are meaningful only when a
// lens strategy is attached (all-zero otherwise).
export type AccountPosition = {
  ticker: string;
  company_name: string;
  sector: string;
  shares: number;
  cost_basis: number | null;
  current_price: number | null;
  market_value: number | null;
  actual_weight: number;
  target_weight: number;
  drift: number;
  return_pct: number | null;
  unrealized_gain: number | null;
  in_strategy: boolean;
};

export type AccountPositionsResponse = {
  positions: AccountPosition[];
  totals: {
    market_value: number;
    cost: number;
    return_pct: number | null;
  };
};

// GET /api/alerts — fired after each nightly batch for the user's watchlist
// and custom-portfolio tickers. fired_at is UTC without an offset; parse it
// with lib/time.ts parseServerTime.
export type Alert = {
  id: number;
  ticker: string;
  alert_type: string;
  message: string;
  fired_at: string;
  acknowledged: 0 | 1 | boolean;
};
