import type { ScreenerRow } from '@/api/types';

// Port of the web screener's COLUMN_FILTERS + flag-category logic
// (stockkitty/frontend/src/components/Screener.jsx). Keep the predicates
// and thresholds in lockstep with the web — same filters, same results.

export type FilterKey =
  | 'mkt_cap_2b'
  | 'mos_25'
  | 'consensus_2of3'
  | 'fscore_7'
  | 'cc_08'
  | 'tsy_pos'
  | 'hide_structural'
  | 'hide_loud_flags';

export type ThresholdConfig = {
  default: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
};

export type ColumnFilter = {
  key: FilterKey;
  label: string;
  threshold?: ThresholdConfig;
  predicate: (row: ScreenerRow, t: number) => boolean;
};

// Flags arrive as a JSON string of {code, model, msg}. Quiet codes are
// data-provider coverage gaps, info codes are informational — neither
// counts as a "loud" flag.
const QUIET_FLAG_CODES = new Set(['missing_depreciation', 'missing_capex']);
const INFO_FLAG_CODES = new Set(['ddm_primary']);
const STRUCTURAL_FLAG_CODES = new Set(['financial_sector', 'reit_sector', 'utility_sector']);

export const FLAG_CATEGORY_OF_CODE: Record<string, 'na' | 'model' | 'data'> = {
  financial_sector: 'na',
  reit_sector: 'na',
  utility_sector: 'na',
  negative_value: 'model',
  negative_equity: 'model',
  wacc_growth_tight: 'model',
  extreme_value: 'data',
  sparse_data: 'data',
  missing_income_statement: 'data',
};

export type FlagCategory = 'na' | 'model' | 'data';
export const FLAG_CATEGORY_LABELS: Record<FlagCategory, string> = {
  na: 'DCF n/a (banks, REITs, utilities)',
  model: 'Model warnings',
  data: 'Data issues',
};

type Flag = { code: string };

export function parseFlags(raw: unknown): Flag[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((f): f is Flag => typeof f?.code === 'string') : [];
  } catch {
    return [];
  }
}

export function loudFlags(raw: unknown): Flag[] {
  return parseFlags(raw).filter(
    (f) => !QUIET_FLAG_CODES.has(f.code) && !INFO_FLAG_CODES.has(f.code),
  );
}

export function flagCategories(raw: unknown): Set<FlagCategory> {
  const cats = new Set<FlagCategory>();
  for (const f of loudFlags(raw)) cats.add(FLAG_CATEGORY_OF_CODE[f.code] ?? 'data');
  return cats;
}

function hasStructuralFlag(row: ScreenerRow): boolean {
  return parseFlags(row.flags).some((f) => STRUCTURAL_FLAG_CODES.has(f.code));
}

export function consensusCount(row: ScreenerRow): number {
  if (row.market_price == null) return 0;
  let agree = 0;
  for (const price of [row.fcf_price, row.ep_price, row.re_price]) {
    if (price != null && price > row.market_price) agree += 1;
  }
  return agree;
}

const compactUsd = (v: number) => (v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${Math.round(v / 1e6)}M`);

export const COLUMN_FILTERS: ColumnFilter[] = [
  {
    key: 'mkt_cap_2b',
    label: 'Market cap',
    threshold: { default: 2e9, min: 1e8, max: 5e10, step: 1e8, format: (v) => `≥ ${compactUsd(v)}` },
    predicate: (r, t) => r.market_cap != null && r.market_cap >= t,
  },
  {
    key: 'mos_25',
    label: 'Margin of safety',
    threshold: { default: 0.25, min: 0, max: 0.5, step: 0.05, format: (v) => `≥ ${Math.round(v * 100)}%` },
    predicate: (r, t) => r.margin_of_safety != null && r.margin_of_safety >= t,
  },
  {
    key: 'consensus_2of3',
    label: 'Model consensus',
    threshold: { default: 2, min: 1, max: 3, step: 1, format: (v) => `≥ ${v}/3` },
    predicate: (r, t) => consensusCount(r) >= t,
  },
  {
    key: 'fscore_7',
    label: 'Piotroski F-Score',
    threshold: { default: 7, min: 0, max: 9, step: 1, format: (v) => `≥ ${v}` },
    predicate: (r, t) => r.piotroski_score != null && r.piotroski_score >= t,
  },
  {
    key: 'cc_08',
    label: 'Cash conversion',
    threshold: { default: 0.8, min: 0, max: 2, step: 0.1, format: (v) => `≥ ${v.toFixed(1)}×` },
    predicate: (r, t) => r.cash_conversion != null && r.cash_conversion >= t,
  },
  {
    key: 'tsy_pos',
    label: 'Shareholder yield',
    threshold: {
      default: 0,
      min: -0.05,
      max: 0.1,
      step: 0.005,
      format: (v) => (v === 0 ? '> 0' : `≥ ${(v * 100).toFixed(1)}%`),
    },
    // Same special case as the web: at exactly 0 the rule is strictly
    // positive; any other threshold is >=.
    predicate: (r, t) => {
      if (r.dividend_yield == null && r.buyback_yield == null) return false;
      const tsy = (r.dividend_yield ?? 0) + (r.buyback_yield ?? 0);
      return t === 0 ? tsy > 0 : tsy >= t;
    },
  },
  {
    key: 'hide_structural',
    label: 'Hide banks / REITs / utilities',
    predicate: (r) => !hasStructuralFlag(r),
  },
  {
    key: 'hide_loud_flags',
    label: 'No warning flags',
    predicate: (r) => loudFlags(r.flags).length === 0,
  },
];

export const FILTERS_BY_KEY = Object.fromEntries(COLUMN_FILTERS.map((f) => [f.key, f])) as Record<
  FilterKey,
  ColumnFilter
>;

// The web's four built-in presets (FilterPresets.jsx) — value is the
// threshold, or true for binary filters.
export type Preset = { id: string; name: string; filters: Partial<Record<FilterKey, number | true>> };

export const BUILTIN_PRESETS: Preset[] = [
  {
    id: 'builtin:quality_at_a_discount',
    name: 'Quality at a Discount',
    filters: { mos_25: 0.25, consensus_2of3: 2, fscore_7: 7, cc_08: 0.8, mkt_cap_2b: 2e9, hide_structural: true },
  },
  {
    id: 'builtin:cheap_dividend_payers',
    name: 'Cheap Dividend Payers',
    filters: { mos_25: 0.25, tsy_pos: 0, hide_loud_flags: true },
  },
  {
    id: 'builtin:quality_compounders',
    name: 'Quality Compounders',
    filters: { fscore_7: 7, cc_08: 0.8, tsy_pos: 0, mkt_cap_2b: 5e9 },
  },
  {
    id: 'builtin:avoid_landmines',
    name: 'Avoid Landmines',
    filters: { hide_loud_flags: true, fscore_7: 7, cc_08: 0.8, hide_structural: true },
  },
];

export type FilterState = {
  /** Active filters: threshold value, or true for binary filters. */
  active: Partial<Record<FilterKey, number | true>>;
  /** Flag categories to hide — web default hides all three. */
  hiddenCats: FlagCategory[];
  watchlistOnly: boolean;
};

export const DEFAULT_HIDDEN_CATS: FlagCategory[] = ['na', 'model', 'data'];

export function applyFilters(
  rows: ScreenerRow[],
  state: FilterState,
  watchlist: string[],
): ScreenerRow[] {
  let out = rows;
  if (state.hiddenCats.length) {
    const hidden = new Set(state.hiddenCats);
    out = out.filter((r) => {
      for (const cat of flagCategories(r.flags)) if (hidden.has(cat)) return false;
      return true;
    });
  }
  if (state.watchlistOnly) {
    const watched = new Set(watchlist);
    out = out.filter((r) => watched.has(r.ticker));
  }
  for (const [key, value] of Object.entries(state.active)) {
    const filter = FILTERS_BY_KEY[key as FilterKey];
    if (!filter || value == null) continue;
    const t = typeof value === 'number' ? value : 0;
    out = out.filter((r) => filter.predicate(r, t));
  }
  return out;
}

export function activeFilterCount(state: FilterState): number {
  // The category toggles only count when they differ from the default —
  // "Filters (3)" on a fresh launch would read as mystery state.
  const catDelta = DEFAULT_HIDDEN_CATS.filter((c) => !state.hiddenCats.includes(c)).length
    + state.hiddenCats.filter((c) => !DEFAULT_HIDDEN_CATS.includes(c)).length;
  return Object.keys(state.active).length + (state.watchlistOnly ? 1 : 0) + catDelta;
}
