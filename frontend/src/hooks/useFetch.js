import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../services/api';

// Runs `fn` on mount and whenever `deps` change; ignores stale responses.
export function useFetch(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true); setError(null);
    try {
      const d = await fnRef.current();
      if (id === seq.current) setData(d);
    } catch (e) {
      if (id === seq.current) setError(errorMessage(e, 'Failed to load data'));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, deps);
  return { data, loading, error, reload: run, setData };
}
