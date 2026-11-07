import { useCallback } from 'react';
import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { ResourceContent } from '@/components/resource-content';
import { Body, Caption, Heading, Notice, Panel } from '@/components/ui/content-blocks';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { gateway } from '@/services/gateway';

export default function CoinsScreen() {
  const loader = useCallback(() => gateway.getWallet(), []);
  const { resource, reload } = useFocusResource(loader);
  return <Page title="코인 관리"><RequireSession>
    <ResourceContent resource={resource} reload={reload}>{(wallet) => <>
      <Panel><Heading>{wallet.balance} 코인</Heading><Caption>데모 잔액</Caption></Panel>
      <Heading>사용 내역</Heading>
      {wallet.transactions.map((entry) => <Panel key={entry.id}><Body>{entry.label}</Body>
        <Body>{entry.amount > 0 ? '+' : ''}{entry.amount} 코인</Body><Caption>{new Date(entry.createdAt).toLocaleString('ko-KR')}</Caption></Panel>)}
      <Notice>실제 결제·충전은 지원하지 않습니다. 데모 토론 게시 시에만 메모리 잔액에서 1코인이 차감됩니다.</Notice>
    </>}</ResourceContent>
  </RequireSession></Page>;
}
