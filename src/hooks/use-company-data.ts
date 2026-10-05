import { useEffect, useState } from 'react';

import { api, ApiError } from '@/api/client';

export type CompanyData<T> =
  | { kind: 'loading' }
  | { kind: 'ready'; data: T }
  | { kind: 'missing' } // 404 — batch hasn't computed this yet (or no cache)
  | { kind: 'error'; message: string };

/**
 * One company-page card's fetch lifecycle. State is tagged with the path
 * it answered (the same stale-response rule as the rest of the app), so a
 * card never shows another ticker's data mid-navigation.
 */
export function useCompanyData<T>(path: string): CompanyData<T> {
  const [state, setState] = useState<{ path: string; value: CompanyData<T> } | null>(null);

  useEffect(() => {
    let current = true;
    api<T>(path)
      .then((data) => {
        if (current) setState({ path, value: { kind: 'ready', data } });
      })
      .catch((e) => {
        if (!current) return;
        if (e instanceof ApiError && e.status === 404) {
          setState({ path, value: { kind: 'missing' } });
        } else {
          const message =
            e instanceof ApiError && e.detail ? e.detail : 'Couldn’t load this section.';
          setState({ path, value: { kind: 'error', message } });
        }
      });
    return () => {
      current = false;
    };
  }, [path]);

  return state?.path === path ? state.value : { kind: 'loading' };
}
