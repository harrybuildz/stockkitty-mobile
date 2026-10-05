import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => vi.fn());
vi.mock('@/api/client', async () => {
  class ApiError extends Error {
    constructor(readonly status: number, readonly detail: string | null) {
      super(detail ?? String(status));
    }
  }
  return { api, ApiError };
});

const { useWatchlist } = await import('./watchlist');
const { ApiError } = await import('@/api/client');

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  api.mockReset();
  useWatchlist.getState().reset();
});

describe('watchlist store', () => {
  it('loads the server list', async () => {
    api.mockResolvedValueOnce(['MSFT', 'AAPL']);
    await useWatchlist.getState().fetch();
    expect(useWatchlist.getState()).toMatchObject({ tickers: ['MSFT', 'AAPL'], loaded: true });
    expect(api).toHaveBeenCalledWith('/api/watchlist');
  });

  it('adds optimistically (newest first) and posts', async () => {
    useWatchlist.setState({ tickers: ['MSFT'], loaded: true });
    api.mockResolvedValueOnce({ ticker: 'AAPL', added: true });
    const p = useWatchlist.getState().toggle('AAPL');
    expect(useWatchlist.getState().tickers).toEqual(['AAPL', 'MSFT']);
    await p;
    expect(api).toHaveBeenCalledWith('/api/watchlist/AAPL', { method: 'POST' });
  });

  it('rolls back only the failed change, not a concurrent one', async () => {
    useWatchlist.setState({ tickers: [], loaded: true });
    const first = deferred<unknown>();
    api.mockImplementationOnce(() => first.promise).mockResolvedValueOnce({});
    const p1 = useWatchlist.getState().toggle('AAPL');
    await useWatchlist.getState().toggle('MSFT'); // succeeds while AAPL is in flight
    first.reject(new ApiError(500, 'boom'));
    await p1;
    expect(useWatchlist.getState().tickers).toEqual(['MSFT']);
  });

  it('treats a 404 on removal as already removed', async () => {
    useWatchlist.setState({ tickers: ['AAPL'], loaded: true });
    api.mockRejectedValueOnce(new ApiError(404, 'Not on watchlist'));
    await useWatchlist.getState().toggle('AAPL');
    expect(useWatchlist.getState()).toMatchObject({ tickers: [], error: null });
  });

  it('drops a fetch that resolves after sign-out reset', async () => {
    const slow = deferred<string[]>();
    api.mockImplementationOnce(() => slow.promise);
    const p = useWatchlist.getState().fetch();
    useWatchlist.getState().reset(); // user signs out mid-request
    slow.resolve(['PREVIOUS_USER']);
    await p;
    expect(useWatchlist.getState()).toMatchObject({ tickers: [], loaded: false, loading: false });
  });
});
