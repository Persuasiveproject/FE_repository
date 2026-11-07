import { useCallback, useEffect, useRef, useState } from 'react';

// React state 갱신 전 빠른 연속 터치도 ref 잠금으로 차단합니다.
export function useMutation() {
  const lock = useRef(false);
  const mounted = useRef(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = useCallback(async <T,>(action: () => Promise<T>, onSuccess?: (value: T) => void) => {
    if (lock.current) return;
    lock.current = true; setPending(true); setError('');
    try { const result = await action(); if (mounted.current) onSuccess?.(result); }
    catch (caught) { if (mounted.current) setError(caught instanceof Error ? caught.message : '요청을 처리하지 못했습니다.'); }
    finally { lock.current = false; if (mounted.current) setPending(false); }
  }, []);
  return { run, pending, error };
}
