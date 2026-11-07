import { useCallback, useEffect, useState } from 'react';

type Resource<T> = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'success'; data: T };

// loader는 컴포넌트 밖에서 정의한 안정적인 함수로 전달합니다.
export function useResource<T>(loader: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [resource, setResource] = useState<Resource<T>>({ status: 'loading' });
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) setResource({ status: 'loading' });
      return loader();
    }).then(
      (data) => { if (active) setResource({ status: 'success', data }); },
      (error: unknown) => { if (active) setResource({ status: 'error',
        error: error instanceof Error ? error : new Error('데이터를 불러오지 못했습니다.') }); },
    );
    // 화면을 벗어났거나 새 요청이 시작되면 이전 결과를 반영하지 않습니다.
    return () => { active = false; };
  }, [loader, attempt]);

  return { resource, retry };
}
