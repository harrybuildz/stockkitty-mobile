import { pct, ratio } from '@/lib/format';
import { useCompanyData } from '@/hooks/use-company-data';
import { colors } from '@/theme';
import type { QualityIndicators } from '@/api/types';

import { DataCard, MetricRow } from './card';

// Mirrors the web QualityIndicators panel: Piotroski composite up top,
// then the quality / earnings-quality / capital-return tiers inline.
export function QualityCard({ ticker }: { ticker: string }) {
  const state = useCompanyData<QualityIndicators>(
    `/api/company/${encodeURIComponent(ticker)}/quality-indicators`,
  );
  return (
    <DataCard title="Quality" state={state}>
      {(q) => (
        <>
          <MetricRow
            label="Piotroski F-Score"
            value={
              q.piotroski.score == null ? '—' : `${q.piotroski.score} / ${q.piotroski.total_testable}`
            }
            color={scoreColor(q.piotroski.score, q.piotroski.total_testable)}
          />
          <MetricRow label="ROIC" value={pct(q.quality.roic)} />
          <MetricRow label="Net debt / EBITDA" value={ratio(q.quality.net_debt_to_ebitda)} />
          <MetricRow label="Gross margin" value={pct(q.quality.gross_margin)} />
          <MetricRow label="Revenue CAGR" value={pct(q.quality.revenue_cagr)} />
          <MetricRow
            label="FCF-positive years"
            value={q.quality.fcf_positive_years == null ? '—' : `${q.quality.fcf_positive_years} / 4`}
          />
          <MetricRow label="Cash conversion" value={ratio(q.earnings_quality.cash_conversion)} />
          <MetricRow label="Dividend yield" value={pct(q.capital_return.dividend_yield)} />
          <MetricRow label="Buyback yield" value={pct(q.capital_return.buyback_yield)} />
          <MetricRow
            label="Total shareholder yield"
            value={pct(q.capital_return.total_shareholder_yield)}
            last
          />
        </>
      )}
    </DataCard>
  );
}

function scoreColor(score: number | null, total: number): string | undefined {
  if (score == null || !total) return undefined;
  const frac = score / total;
  return frac >= 0.7 ? colors.positive : frac <= 0.4 ? colors.negative : colors.warning;
}
