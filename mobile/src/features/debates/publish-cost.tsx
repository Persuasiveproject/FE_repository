import { useCallback, type ReactNode } from 'react';
import { ResourceContent } from '@/components/resource-content';
import { Body, Notice, Panel } from '@/components/ui/content-blocks';
import { LIMITS } from '@/features/core/rules';
import { useSession } from '@/features/session/session-provider';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { withAuthRevision } from '@/services/basic-auth';
import { dataSource } from '@/services/gateway';
import { getCoinBalance } from '@/services/wallet-api';

export function PublishCost({ children }: { children: (canPublish: boolean) => ReactNode }) {
  const { profile, revision } = useSession();
  const mockBalance = profile?.coins ?? 0;
  const loader = useCallback(() => dataSource === 'api'
    ? withAuthRevision(revision, getCoinBalance) : Promise.resolve(mockBalance), [revision, mockBalance]);
  const { resource, reload } = useFocusResource(loader);
  return <ResourceContent resource={resource} reload={reload}>{(balance) => <>
    <Panel><Body>현재 잔액: {balance} 코인</Body><Body>필요한 코인: {LIMITS.cost} 코인</Body>
      {balance >= LIMITS.cost && <Body>게시 후 예상 잔액: {balance - LIMITS.cost} 코인</Body>}</Panel>
    {balance < LIMITS.cost && <Notice>코인이 부족해요. 작성한 내용은 유지됩니다.</Notice>}
    {children(balance >= LIMITS.cost)}
  </>}</ResourceContent>;
}
