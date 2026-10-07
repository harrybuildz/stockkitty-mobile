import { describe, expect, it } from 'vitest';

import { usdThousands } from './format';

describe('usdThousands', () => {
  it('groups thousands and keeps cents', () => {
    expect(usdThousands(11439.93)).toBe('$11,439.93');
    expect(usdThousands(1486.2, 0)).toBe('$1,486');
    expect(usdThousands(952, 0)).toBe('$952');
    expect(usdThousands(1234567.5, 2)).toBe('$1,234,567.50');
  });

  it('handles sign, zero and missing values', () => {
    expect(usdThousands(-2500.5)).toBe('-$2,500.50');
    expect(usdThousands(0)).toBe('$0.00');
    expect(usdThousands(null)).toBe('—');
    expect(usdThousands(Number.NaN)).toBe('—');
  });

  it('rounds rather than truncates at digit boundaries', () => {
    expect(usdThousands(999.995, 2)).toBe('$1,000.00');
    expect(usdThousands(999.6, 0)).toBe('$1,000');
  });
});
