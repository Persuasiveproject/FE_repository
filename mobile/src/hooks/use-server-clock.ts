import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { getServerTiming, monotonicNow, serverClockState, type ClockSample } from '@/services/remaining-api';

// 화면이 보일 때만 갱신합니다. 휴대폰 시각 대신 서버 시각 + 경과 시간을 사용합니다.
export function useServerClock(debateId: string) {
  const [sample, setSample] = useState<ClockSample | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(monotonicNow);
  const [attempt, setAttempt] = useState(0);
  const request = useMemo(() => ({ debateId, attempt }), [debateId, attempt]);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  useFocusEffect(useCallback(() => {
    let active = true; let pending = false;
    const controller = new AbortController();
    async function sync() {
      if (pending) return;
      pending = true;
      try {
        const next = await getServerTiming(request.debateId, controller.signal);
        if (active) { setSample(next); setNow(monotonicNow()); setError(''); }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : '서버 시간을 확인하지 못했습니다.');
      } finally { pending = false; }
    }
    void Promise.resolve().then(() => {
      if (active) { setSample(null); setError(''); void sync(); }
    });
    const refresh = setInterval(() => void sync(), 15000);
    const tick = setInterval(() => { if (active) setNow(monotonicNow()); }, 1000);
    return () => { active = false; controller.abort(); clearInterval(refresh); clearInterval(tick); };
  }, [request]));
  const clock = sample ? serverClockState(sample, now) : null;
  return { clock, error, reload, writable: !!clock && !error && !clock.isReadOnly };
}
