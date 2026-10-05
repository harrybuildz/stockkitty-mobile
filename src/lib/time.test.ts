import { describe, expect, it } from 'vitest';

import { parseServerTime, relativeAge } from './time';

const NOW = Date.parse('2026-10-05T12:00:00Z');

describe('parseServerTime', () => {
  it('treats an offset-less backend timestamp as UTC', () => {
    expect(parseServerTime('2026-10-05T07:30:00.123456').toISOString()).toBe('2026-10-05T07:30:00.123Z');
  });

  it('keeps an explicit offset', () => {
    expect(parseServerTime('2026-10-05T07:30:00+02:00').toISOString()).toBe('2026-10-05T05:30:00.000Z');
    expect(parseServerTime('2026-10-05T07:30:00Z').toISOString()).toBe('2026-10-05T07:30:00.000Z');
  });
});

describe('relativeAge', () => {
  it.each([
    ['2026-10-05T11:59:40', 'just now'],
    ['2026-10-05T11:45:00', '15m ago'],
    ['2026-10-05T09:00:00', '3h ago'],
    ['2026-10-03T12:00:00', '2d ago'],
  ])('%s → %s', (iso, want) => {
    expect(relativeAge(iso, NOW)).toBe(want);
  });

  it('is empty for missing or unparseable input', () => {
    expect(relativeAge(null, NOW)).toBe('');
    expect(relativeAge('not a date', NOW)).toBe('');
  });
});
