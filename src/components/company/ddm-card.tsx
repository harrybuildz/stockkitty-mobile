import { pct, ratio, usd } from '@/lib/format';
import { useCompanyData } from '@/hooks/use-company-data';
import { colors } from '@/theme';
import type { Ddm } from '@/api/types';

import { DataCard, MetricRow } from './card';

// Dividend Discount Model — the fourth model, for dividend payers (banks,
// REITs, utilities). Non-payers get applicable=false and the card hides
// itself, same as the web DDMPanel.
export function DdmCard({ ticker }: { ticker: string }) {
  const state = useCompanyData<Ddm>(`/api/company/${encodeURIComponent(ticker)}/ddm`);
  if (state.kind === 'ready' && !state.data.applicable) return null;
  return (
    <DataCard title="Dividend Discount Model" state={state}>
      {(d) => {
        const mos = d.marginOfSafety;
        return (
          <>
            <MetricRow label="DDM intrinsic value" value={usd(d.pricePerShare)} />
            <MetricRow
              label="Margin of safety"
              value={pct(mos)}
              color={mos == null ? undefined : mos > 0 ? colors.positive : colors.negative}
            />
            <MetricRow label="Annual dividend" value={usd(d.currentDividend)} />
            <MetricRow label="Dividend yield" value={pct(d.dividendYield)} />
            <MetricRow label="Cost of equity" value={pct(d.costOfEquity)} />
            <MetricRow
              label="Growth (yrs 1–5 / 6–10 / terminal)"
              value={`${pct(d.stage1Growth)} / ${pct(d.stage2Growth)} / ${pct(d.terminalGrowth)}`}
            />
            <MetricRow label="Price / book" value={ratio(d.pb)} />
            <MetricRow label="Price / FFO" value={ratio(d.pffo)} last />
          </>
        );
      }}
    </DataCard>
  );
}
