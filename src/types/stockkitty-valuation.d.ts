// The package is plain ESM JavaScript with no bundled types. Declare the
// surface the app uses; widen as more screens consume it.
declare module '@stockkitty/valuation' {
  export type ModelResult = {
    pricePerShare: number | null;
    [key: string]: unknown;
  };

  export type ValuationResult = {
    fcf: ModelResult;
    ep: ModelResult;
    re: ModelResult;
    summary: {
      avgIntrinsicValue: number;
      currentMarketPrice: number | undefined;
      marginOfSafety: number | null;
      isUndervalued: boolean | null;
      modelDispersion: number | null;
      valueLow: number | null;
      valueHigh: number | null;
    };
  };

  export function runValuation(inputs: Record<string, unknown>): ValuationResult;
}
