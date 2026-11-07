import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { gateway } from '@/services/gateway';
import type { Profile } from '@/types/core';

type SessionContextValue = { profile: Profile | null; ready: boolean; refresh: () => Promise<void> };
const SessionContext = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    const next = await gateway.getSession(); setProfile(next); setReady(true);
  }, []);
  useEffect(() => {
    let active = true;
    gateway.getSession().then((next) => { if (active) { setProfile(next); setReady(true); } },
      () => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  return <SessionContext.Provider value={{ profile, ready, refresh }}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider 안에서 useSession을 사용해 주세요.');
  return value;
}
