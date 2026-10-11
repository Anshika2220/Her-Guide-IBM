import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errMsg } from '../services/api';

/** GET helper with loading/error state; ignores out-of-order responses. */
export function useApi<T>(url: string | null, params?: Record<string, unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const key = JSON.stringify(params ?? {});

  const load = useCallback(async () => {
    if (!url) return;
    const id = ++seq.current;
    setLoading(true); setError(null);
    try {
      const r = await api.get<T>(url, { params });
      if (id === seq.current) setData(r.data);
    } catch (e) {
      if (id === seq.current) setError(errMsg(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load, setData };
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
