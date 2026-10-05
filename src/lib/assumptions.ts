// Default valuation assumptions derived from a company's financials.
// Verbatim port of DEFAULT_ASSUMPTIONS + the assumption block in
// loadCompany (stockkitty/frontend/src/store/index.js). Keep the two in
// sync until this moves into @stockkitty/valuation as a shared function.

export type Financials = Record<string, unknown> & {
  revenue?: number[];
  interestExpense?: number[];
  totalDebtSeries?: number[];
  longTermDebtSeries?: number[];
  debt?: number;
  beta?: number;
  roic?: number;
  roe?: number;
  payoutRatio?: number;
  riskFreeRate?: number;
  effectiveTaxRate?: number;
  sharesOutstanding?: number;
  currentMarketPrice?: number;
  companyName?: string;
};

export const DEFAULT_ASSUMPTIONS = {
  taxRate: 0.21,
  longTermGrowth: 0.025,
  rm: 0.095,
  // Last-resort fallback; the financials response carries the live 10-year
  // Treasury yield (riskFreeRate). Matches backend market_config.
  rf: 0.043,
  capExpEfficiency: 1.0,
};

export function deriveAssumptions(financials: Financials) {
  // Cost of debt = avg interest / avg debt, capped 20%, floored 1%.
  const rd = (() => {
    const intExp = financials.interestExpense ?? [];
    const debtSeries = (financials.totalDebtSeries ?? financials.longTermDebtSeries ?? []).filter(
      (v) => v && v > 0,
    );
    const avgDebt = debtSeries.length
      ? debtSeries.reduce((s, v) => s + v, 0) / debtSeries.length
      : (financials.debt ?? 0);
    const raw =
      intExp.length && avgDebt > 0 ? intExp.reduce((s, v) => s + v, 0) / intExp.length / avgDebt : 0.05;
    return Math.max(Math.min(raw, 0.2), 0.01);
  })();

  const salesGrowth = (() => {
    const rev = financials.revenue ?? [];
    if (rev.length >= 2 && rev[0] > 0) {
      return Math.min(((rev[rev.length - 1] / rev[0]) ** (1 / (rev.length - 1)) - 1) * 0.7, 0.5);
    }
    return 0.05;
  })();

  return {
    ...DEFAULT_ASSUMPTIONS,
    rf: financials.riskFreeRate || DEFAULT_ASSUMPTIONS.rf,
    taxRate: financials.effectiveTaxRate || DEFAULT_ASSUMPTIONS.taxRate,
    beta: Math.min(Math.max(financials.beta || 1.0, 0.2), 3.0),
    roic: financials.roic || 0.1,
    roe: financials.roe || 0.1,
    payoutRatio: financials.payoutRatio || 0.05,
    rd,
    salesGrowth,
  };
}

/** Inputs for runValuation, merged the same way as the web `recalculate`. */
export function valuationInputs(financials: Financials) {
  return {
    ...deriveAssumptions(financials),
    ...financials,
    sharesOutstanding: financials.sharesOutstanding,
    currentMarketPrice: financials.currentMarketPrice,
  };
}
