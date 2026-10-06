import { describe, expect, it } from 'vitest';

import type { ScreenerRow } from '@/api/types';

import { extremes, formatValue, METRICS } from './compare';

function row(overrides: Partial<ScreenerRow>): ScreenerRow {
  return {
    ticker: 'T',
    company_name: null,
    sector: null,
    market_price: null,
    avg_price: null,
    margin_of_safety: null,
    market_cap: null,
    piotroski_score: null,
    fcf_price: null,
    ep_price: null,
    re_price: null,
    cash_conversion: null,
    dividend_yield: null,
    buyback_yield: null,
    flags: null,
    ddm_price: null,
    roic: null,
    net_debt_to_ebitda: null,
    gross_margin: null,
    revenue_cagr: null,
    fcf_positive_years: null,
    piotroski_total_testable: null,
    ...overrides,
  };
}

const metric = (key: string) => METRICS.find((m) => m.key === key)!;

describe('extremes', () => {
  it('higher-is-better picks max as best, min as worst', () => {
    const rows = [row({ roic: 0.2 }), row({ roic: 0.05 }), row({ roic: 0.1 })];
    const { best, worst } = extremes(metric('roic'), rows);
    expect([...best]).toEqual([0]);
    expect([...worst]).toEqual([1]);
  });

  it('lower-is-better inverts direction (leverage)', () => {
    const rows = [row({ net_debt_to_ebitda: 3 }), row({ net_debt_to_ebitda: 0.5 })];
    const { best, worst } = extremes(metric('nde'), rows);
    expect([...best]).toEqual([1]);
    expect([...worst]).toEqual([0]);
  });

  it('needs two numeric values and skips nulls', () => {
    const rows = [row({ roic: 0.2 }), row({}), row({})];
    const { best, worst } = extremes(metric('roic'), rows);
    expect(best.size).toBe(0);
    expect(worst.size).toBe(0);
  });

  it('ties all highlight as best; identical values highlight nothing', () => {
    const tied = [row({ roic: 0.2 }), row({ roic: 0.2 }), row({ roic: 0.1 })];
    const { best } = extremes(metric('roic'), tied);
    expect([...best].sort()).toEqual([0, 1]);
    const identical = [row({ roic: 0.2 }), row({ roic: 0.2 })];
    expect(extremes(metric('roic'), identical).best.size).toBe(0);
  });

  it('directionless metrics never rank', () => {
    const rows = [row({ market_price: 10 }), row({ market_price: 999 })];
    expect(extremes(metric('market_price'), rows).best.size).toBe(0);
  });
});

describe('formatValue', () => {
  it('derives total shareholder yield from components', () => {
    expect(formatValue(metric('tsy'), row({ dividend_yield: 0.02, buyback_yield: 0.03 }))).toBe('+5.0%');
    expect(formatValue(metric('tsy'), row({}))).toBe('—');
  });

  it('renders missing rows and nulls as em dash', () => {
    expect(formatValue(metric('roic'), null)).toBe('—');
    expect(formatValue(metric('roic'), row({}))).toBe('—');
  });
});
