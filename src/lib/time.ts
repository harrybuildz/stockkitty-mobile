// The backend writes timestamps with datetime.utcnow().isoformat(), which
// has no timezone suffix. JavaScript parses an offset-less date-time as
// LOCAL time, which would skew ages by the user's UTC offset, so treat
// those as UTC explicitly.
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;

export function parseServerTime(iso: string): Date {
  // Python emits microseconds (6 digits); trim to milliseconds so stricter
  // engines (Hermes on device) parse it the same way V8 does.
  const ms = iso.replace(/(\.\d{3})\d+/, '$1');
  return new Date(HAS_OFFSET.test(ms) ? ms : `${ms}Z`);
}

export function relativeAge(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '';
  const t = parseServerTime(iso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.floor((now - t) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
