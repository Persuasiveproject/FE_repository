import { useCallback } from 'react';
import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { ResourceContent } from '@/components/resource-content';
import { Body, Caption, Heading, Panel } from '@/components/ui/content-blocks';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { gateway } from '@/services/gateway';

export default function CoinsScreen() {
  const loader = useCallback(() => gateway.getWallet(), []);
  const { resource, reload } = useFocusResource(loader);
  return <Page title="코인 관리"><RequireSession>
    <ResourceContent resource={resource} reload={reload}>{(wallet) => <>
      <Panel><Heading>{wallet.balance} 코인</Heading></Panel>
      <Heading>사용 내역</Heading>
      {!wallet.transactions.length && <Caption>아직 내역이 없어요.</Caption>}
      {wallet.transactions.map((entry) => <Panel key={entry.id}><Body>{entry.label}</Body>
        <Body>{entry.amount > 0 ? '+' : ''}{entry.amount} 코인</Body><Caption>{new Date(entry.createdAt).toLocaleString('ko-KR')}</Caption></Panel>)}
    </>}</ResourceContent>
  </RequireSession></Page>;
}
