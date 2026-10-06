import { describe, expect, it } from 'vitest';

import type { ScreenerRow } from '@/api/types';

import {
  activeFilterCount,
  applyFilters,
  BUILTIN_PRESETS,
  consensusCount,
  DEFAULT_HIDDEN_CATS,
  FILTERS_BY_KEY,
  flagCategories,
  loudFlags,
} from './screener-filters';

function row(overrides: Partial<ScreenerRow>): ScreenerRow {
  return {
    ticker: 'TEST',
    company_name: 'Test Co',
    sector: 'Technology',
    market_price: 100,
    avg_price: 150,
    margin_of_safety: 0.33,
    market_cap: 5e9,
    piotroski_score: 8,
    fcf_price: 120,
    ep_price: 160,
    re_price: 90,
    cash_conversion: 1.1,
    dividend_yield: 0.02,
    buyback_yield: 0.01,
    flags: null,
    ...overrides,
  };
}

describe('flag parsing', () => {
  it('ignores quiet and info codes', () => {
    const flags = JSON.stringify([
      { code: 'missing_capex' },
      { code: 'ddm_primary' },
      { code: 'sparse_data' },
    ]);
    expect(loudFlags(flags).map((f) => f.code)).toEqual(['sparse_data']);
  });

  it('maps unknown codes to the data category', () => {
    const flags = JSON.stringify([{ code: 'some_future_code' }]);
    expect([...flagCategories(flags)]).toEqual(['data']);
  });

  it('tolerates malformed JSON', () => {
    expect(loudFlags('not json')).toEqual([]);
    expect(loudFlags(null)).toEqual([]);
  });
});

describe('predicates', () => {
  it('consensus counts models pricing above market', () => {
    // fcf 120 > 100, ep 160 > 100, re 90 < 100 → 2 of 3
    expect(consensusCount(row({}))).toBe(2);
    expect(FILTERS_BY_KEY.consensus_2of3.predicate(row({}), 2)).toBe(true);
    expect(FILTERS_BY_KEY.consensus_2of3.predicate(row({}), 3)).toBe(false);
    expect(consensusCount(row({ market_price: null }))).toBe(0);
  });

  it('shareholder yield is strictly positive at the zero threshold', () => {
    const zeroYield = row({ dividend_yield: 0, buyback_yield: 0 });
    expect(FILTERS_BY_KEY.tsy_pos.predicate(zeroYield, 0)).toBe(false);
    expect(FILTERS_BY_KEY.tsy_pos.predicate(row({}), 0)).toBe(true);
    // Negative buybacks (dilution) can sink the total below a threshold.
    const diluted = row({ dividend_yield: 0.01, buyback_yield: -0.03 });
    expect(FILTERS_BY_KEY.tsy_pos.predicate(diluted, 0)).toBe(false);
  });

  it('yield fails when both components are unknown', () => {
    expect(
      FILTERS_BY_KEY.tsy_pos.predicate(row({ dividend_yield: null, buyback_yield: null }), 0),
    ).toBe(false);
  });

  it('structural filter reads flag codes, not sector names', () => {
    const bank = row({ flags: JSON.stringify([{ code: 'financial_sector' }]) });
    expect(FILTERS_BY_KEY.hide_structural.predicate(bank, 0)).toBe(false);
    expect(FILTERS_BY_KEY.hide_structural.predicate(row({}), 0)).toBe(true);
  });

  it('null metric values fail quality filters', () => {
    expect(FILTERS_BY_KEY.fscore_7.predicate(row({ piotroski_score: null }), 7)).toBe(false);
    expect(FILTERS_BY_KEY.cc_08.predicate(row({ cash_conversion: null }), 0.8)).toBe(false);
  });
});

describe('applyFilters', () => {
  const rows = [
    row({ ticker: 'GOOD' }),
    row({ ticker: 'SMALL', market_cap: 5e8 }),
    row({ ticker: 'FLAGGED', flags: JSON.stringify([{ code: 'sparse_data' }]) }),
  ];

  it('hides default flag categories like the web fresh load', () => {
    const out = applyFilters(rows, { active: {}, hiddenCats: DEFAULT_HIDDEN_CATS, watchlistOnly: false }, []);
    expect(out.map((r) => r.ticker)).toEqual(['GOOD', 'SMALL']);
  });

  it('ANDs active filters together', () => {
    const out = applyFilters(
      rows,
      { active: { mkt_cap_2b: 2e9, fscore_7: 7 }, hiddenCats: DEFAULT_HIDDEN_CATS, watchlistOnly: false },
      [],
    );
    expect(out.map((r) => r.ticker)).toEqual(['GOOD']);
  });

  it('restricts to the watchlist when asked', () => {
    const out = applyFilters(rows, { active: {}, hiddenCats: [], watchlistOnly: true }, ['FLAGGED']);
    expect(out.map((r) => r.ticker)).toEqual(['FLAGGED']);
  });
});

describe('presets', () => {
  it('every preset references real filters with valid thresholds', () => {
    for (const preset of BUILTIN_PRESETS) {
      for (const [key, value] of Object.entries(preset.filters)) {
        const filter = FILTERS_BY_KEY[key as keyof typeof FILTERS_BY_KEY];
        expect(filter, `${preset.id} → ${key}`).toBeDefined();
        if (filter.threshold) {
          expect(typeof value).toBe('number');
          expect(value as number).toBeGreaterThanOrEqual(filter.threshold.min);
          expect(value as number).toBeLessThanOrEqual(filter.threshold.max);
        } else {
          expect(value).toBe(true);
        }
      }
    }
  });

  it('Quality at a Discount keeps only rows passing all its gates', () => {
    const qv = BUILTIN_PRESETS.find((p) => p.id === 'builtin:quality_at_a_discount')!;
    const out = applyFilters(
      [row({}), row({ ticker: 'LOWMOS', margin_of_safety: 0.1 })],
      { active: qv.filters, hiddenCats: [], watchlistOnly: false },
      [],
    );
    expect(out.map((r) => r.ticker)).toEqual(['TEST']);
  });
});

describe('activeFilterCount', () => {
  it('counts zero on fresh defaults', () => {
    expect(
      activeFilterCount({ active: {}, hiddenCats: DEFAULT_HIDDEN_CATS, watchlistOnly: false }),
    ).toBe(0);
  });

  it('counts category deltas from the default', () => {
    expect(activeFilterCount({ active: {}, hiddenCats: [], watchlistOnly: true })).toBe(4);
  });
});
