import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { gateway } from '@/services/gateway';
import type { Profile } from '@/types/core';
import { getAuthRevision, subscribeBasicAuth } from '@/services/basic-auth';

type SessionContextValue = { profile: Profile | null; ready: boolean; revision: number; refresh: () => Promise<void> };
const SessionContext = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(getAuthRevision);
  useEffect(() => subscribeBasicAuth(() => { setProfile(null); setReady(true); setRevision(getAuthRevision()); }), []);
  const refresh = useCallback(async () => {
    const revision = getAuthRevision();
    try { const next = await gateway.getSession(); if (revision === getAuthRevision()) { setProfile(next); setReady(true); } }
    catch (error) { if (revision === getAuthRevision()) { setProfile(null); setReady(true); } throw error; }
  }, []);
  useEffect(() => {
    let active = true;
    const revision = getAuthRevision();
    gateway.getSession().then((next) => { if (active && revision === getAuthRevision()) { setProfile(next); setReady(true); } },
      () => { if (active && revision === getAuthRevision()) setReady(true); });
    return () => { active = false; };
  }, []);
  return <SessionContext.Provider value={{ profile, ready, revision, refresh }}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider 안에서 useSession을 사용해 주세요.');
  return value;
}
