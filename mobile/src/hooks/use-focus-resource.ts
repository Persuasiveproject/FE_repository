import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

export type ScreenResource<T> = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'success'; data: T };

// Stack에서 돌아오거나 탭이 다시 열릴 때 최신 데이터를 읽습니다.
export function useFocusResource<T>(loader: () => Promise<T>) {
  const [resource, setResource] = useState<ScreenResource<T>>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  // revision이 바뀌면 새 요청으로 취급해 포커스 중에도 다시 읽습니다.
  const request = useMemo(() => ({ loader, revision }), [loader, revision]);
  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) setResource({ status: 'loading' });
      return request.loader();
    }).then((data) => {
      if (active) setResource({ status: 'success', data });
    }, (error: unknown) => {
      if (active) setResource({ status: 'error', error: error instanceof Error ? error : new Error('데이터를 불러오지 못했습니다.') });
    });
    return () => { active = false; };
  }, [request]));
  return { resource, reload };
}
