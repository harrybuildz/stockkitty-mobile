export function usd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `$${value.toFixed(2)}`;
}

export function pct(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

// Ports of the web app's utils/serverTime.js + AlertsBell relativeAge.
// SQLite timestamps arrive as naive UTC ("2026-10-03 03:12:45"); without
// the explicit Z suffix, Date would read them as local time and every
// alert age would be off by the UTC offset.
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;

export function parseServerTime(iso: string): Date {
  return new Date(HAS_OFFSET.test(iso) ? iso : `${iso.replace(' ', 'T')}Z`);
}

export function relativeAge(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = Date.now() - parseServerTime(iso).getTime();
  if (!Number.isFinite(ms)) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
