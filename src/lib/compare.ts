import type { ScreenerRow } from '@/api/types';

// Port of the web Compare tool's metric table (frontend Compare.jsx):
// same rows, same order, same best/worst direction. All metrics read the
// screener row — no per-company fetches.

export type Direction = 'higher' | 'lower' | null;

export type Metric = {
  key: string;
  group: 'Identity' | 'Valuation' | 'Quality' | 'Capital return';
  label: string;
  direction: Direction;
  value: (r: ScreenerRow) => number | string | null;
  format: (v: number) => string;
};

const usd2 = (v: number) => `$${v.toFixed(2)}`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const signedPct1 = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
const times1 = (v: number) => `${v.toFixed(1)}×`;
const cap = (v: number) => (v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${Math.round(v / 1e6)}M`);

export const METRICS: Metric[] = [
  { key: 'sector', group: 'Identity', label: 'Sector', direction: null, value: (r) => r.sector, format: String },
  { key: 'market_cap', group: 'Identity', label: 'Market cap', direction: null, value: (r) => r.market_cap, format: cap },
  { key: 'market_price', group: 'Identity', label: 'Price', direction: null, value: (r) => r.market_price, format: usd2 },
  { key: 'avg_price', group: 'Valuation', label: 'Composite IV', direction: null, value: (r) => r.avg_price, format: usd2 },
  { key: 'mos', group: 'Valuation', label: 'Margin of safety', direction: 'higher', value: (r) => r.margin_of_safety, format: signedPct1 },
  { key: 'fcf_price', group: 'Valuation', label: 'FCF value', direction: null, value: (r) => r.fcf_price, format: usd2 },
  { key: 'ep_price', group: 'Valuation', label: 'EP value', direction: null, value: (r) => r.ep_price, format: usd2 },
  { key: 're_price', group: 'Valuation', label: 'RE value', direction: null, value: (r) => r.re_price, format: usd2 },
  { key: 'ddm_price', group: 'Valuation', label: 'DDM value', direction: null, value: (r) => r.ddm_price, format: usd2 },
  { key: 'roic', group: 'Quality', label: 'ROIC', direction: 'higher', value: (r) => r.roic, format: pct1 },
  { key: 'nde', group: 'Quality', label: 'Net debt / EBITDA', direction: 'lower', value: (r) => r.net_debt_to_ebitda, format: times1 },
  { key: 'gm', group: 'Quality', label: 'Gross margin', direction: 'higher', value: (r) => r.gross_margin, format: pct1 },
  { key: 'cagr', group: 'Quality', label: 'Revenue CAGR', direction: 'higher', value: (r) => r.revenue_cagr, format: signedPct1 },
  { key: 'fcf_years', group: 'Quality', label: 'FCF-positive years', direction: 'higher', value: (r) => r.fcf_positive_years, format: (v) => `${v}/4` },
  {
    key: 'fscore',
    group: 'Quality',
    label: 'Piotroski F-Score',
    direction: 'higher',
    value: (r) => r.piotroski_score,
    format: (v) => `${v}/9`,
  },
  { key: 'cc', group: 'Quality', label: 'Cash conversion', direction: 'higher', value: (r) => r.cash_conversion, format: times1 },
  { key: 'dy', group: 'Capital return', label: 'Dividend yield', direction: 'higher', value: (r) => r.dividend_yield, format: pct1 },
  { key: 'by', group: 'Capital return', label: 'Buyback yield', direction: 'higher', value: (r) => r.buyback_yield, format: signedPct1 },
  {
    key: 'tsy',
    group: 'Capital return',
    label: 'Total shareholder yield',
    direction: 'higher',
    value: (r) =>
      r.dividend_yield == null && r.buyback_yield == null
        ? null
        : (r.dividend_yield ?? 0) + (r.buyback_yield ?? 0),
    format: signedPct1,
  },
];

/**
 * Per-row extreme indices among the selected rows. Needs at least two
 * numeric values to rank; nulls and non-numerics never win or lose.
 */
export function extremes(
  metric: Metric,
  rows: (ScreenerRow | null)[],
): { best: Set<number>; worst: Set<number> } {
  const none = { best: new Set<number>(), worst: new Set<number>() };
  if (!metric.direction) return none;
  const values = rows.map((r) => (r ? metric.value(r) : null));
  const numeric = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (numeric.length < 2) return none;
  const max = Math.max(...numeric);
  const min = Math.min(...numeric);
  if (max === min) return none;
  const bestVal = metric.direction === 'higher' ? max : min;
  const worstVal = metric.direction === 'higher' ? min : max;
  const best = new Set<number>();
  const worst = new Set<number>();
  values.forEach((v, i) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return;
    if (v === bestVal) best.add(i);
    else if (v === worstVal) worst.add(i);
  });
  return { best, worst };
}

export function formatValue(metric: Metric, row: ScreenerRow | null): string {
  if (!row) return '—';
  const v = metric.value(row);
  if (v == null) return '—';
  return typeof v === 'number' ? metric.format(v) : String(v);
}
