import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Alert } from '@/api/types';

const api = vi.hoisted(() => vi.fn());
vi.mock('@/api/client', async () => {
  class ApiError extends Error {
    constructor(readonly status: number, readonly detail: string | null) {
      super(detail ?? String(status));
    }
  }
  return { api, ApiError };
});

const { useAlerts } = await import('./alerts');
const { ApiError } = await import('@/api/client');

const alert = (id: number, fired_at: string, acknowledged = 0): Alert => ({
  id,
  ticker: `T${id}`,
  alert_type: 'mos_dropped',
  message: `alert ${id}`,
  fired_at,
  acknowledged: acknowledged as 0 | 1,
});
const A1 = alert(1, '2026-10-05T03:00:00');
const A2 = alert(2, '2026-10-04T03:00:00');
const A3 = alert(3, '2026-10-03T03:00:00');

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => (resolve = res));
  return { promise, resolve };
}

beforeEach(() => {
  api.mockReset();
  useAlerts.getState().reset();
});

describe('alerts store', () => {
  it('loads unacknowledged alerts and derives the badge count', async () => {
    api.mockResolvedValueOnce([A1, A2]);
    await useAlerts.getState().fetch();
    expect(api).toHaveBeenCalledWith('/api/alerts?only_unacked=true&limit=50');
    expect(useAlerts.getState()).toMatchObject({ alerts: [A1, A2], unackedCount: 2, loaded: true });
  });

  it('acknowledges optimistically and posts', async () => {
    useAlerts.setState({ alerts: [A1, A2], unackedCount: 2, loaded: true });
    api.mockResolvedValueOnce({ acknowledged: 1 });
    const p = useAlerts.getState().acknowledge(1);
    expect(useAlerts.getState()).toMatchObject({ alerts: [A2], unackedCount: 1 });
    await p;
    expect(api).toHaveBeenCalledWith('/api/alerts/1/acknowledge', { method: 'POST' });
  });

  it('restores only the failed alert, in date order', async () => {
    useAlerts.setState({ alerts: [A1, A2, A3], unackedCount: 3, loaded: true });
    api.mockRejectedValueOnce(new ApiError(500, 'boom')).mockResolvedValueOnce({});
    const p = useAlerts.getState().acknowledge(2);
    await useAlerts.getState().acknowledge(3); // succeeds meanwhile
    await p;
    expect(useAlerts.getState().alerts.map((a) => a.id)).toEqual([1, 2]);
    expect(useAlerts.getState().unackedCount).toBe(2);
  });

  it('treats a 404 as already acknowledged', async () => {
    useAlerts.setState({ alerts: [A1], unackedCount: 1, loaded: true });
    api.mockRejectedValueOnce(new ApiError(404, 'Alert not found'));
    await useAlerts.getState().acknowledge(1);
    expect(useAlerts.getState()).toMatchObject({ alerts: [], unackedCount: 0, error: null });
  });

  it('marks read in place when showing all', async () => {
    useAlerts.setState({ alerts: [A1, A2], showAll: true, unackedCount: 2, loaded: true });
    api.mockResolvedValueOnce({});
    await useAlerts.getState().acknowledge(1);
    expect(useAlerts.getState().alerts.map((a) => [a.id, Boolean(a.acknowledged)])).toEqual([
      [1, true],
      [2, false],
    ]);
  });

  it('mark all read clears the badge and the new list', async () => {
    useAlerts.setState({ alerts: [A1, A2], unackedCount: 2, loaded: true });
    api.mockResolvedValueOnce({ acknowledged_count: 2 });
    await useAlerts.getState().acknowledgeAll();
    expect(api).toHaveBeenCalledWith('/api/alerts/acknowledge-all', { method: 'POST' });
    expect(useAlerts.getState()).toMatchObject({ alerts: [], unackedCount: 0 });
  });

  it('switching to all fetches acknowledged ones too and keeps the badge right', async () => {
    api.mockResolvedValueOnce([A1, alert(9, '2026-10-01T00:00:00', 1)]).mockResolvedValueOnce([A1]);
    await useAlerts.getState().setShowAll(true);
    expect(api).toHaveBeenNthCalledWith(1, '/api/alerts?only_unacked=false&limit=50');
    await vi.waitFor(() => expect(useAlerts.getState().unackedCount).toBe(1));
  });

  it('drops a list that resolves after the view switched', async () => {
    const slow = deferred<Alert[]>();
    api.mockImplementationOnce(() => slow.promise).mockResolvedValue([A1]);
    const p = useAlerts.getState().fetch(); // "new" view
    await useAlerts.getState().setShowAll(true);
    slow.resolve([A2, A3]);
    await p;
    expect(useAlerts.getState().alerts).toEqual([A1]);
  });

  it('drops results that resolve after sign-out reset', async () => {
    const slow = deferred<Alert[]>();
    api.mockImplementationOnce(() => slow.promise);
    const p = useAlerts.getState().fetch();
    useAlerts.getState().reset();
    slow.resolve([A1]);
    await p;
    expect(useAlerts.getState()).toMatchObject({ alerts: [], unackedCount: 0, loaded: false });
  });
});
