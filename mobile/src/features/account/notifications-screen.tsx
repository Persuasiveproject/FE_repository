import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { Body, Caption, ErrorNotice, Heading, Notice, Panel } from '@/components/ui/content-blocks';
import { ChoiceGroup } from '@/features/core/choice-group';
import { useSession } from '@/features/session/session-provider';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useMutation } from '@/hooks/use-mutation';
import { withAuthRevision } from '@/services/basic-auth';
import { dataSource } from '@/services/gateway';
import { appendNotifications, getNotifications, type NotificationPage } from '@/services/remaining-api';

export default function NotificationsScreen() {
  const { revision } = useSession();
  return <Page title="알림"><RequireSession>{dataSource === 'api' ? <Notifications key={revision} /> : <Notice>알림은 실제 서버 모드에서 확인할 수 있습니다.</Notice>}</RequireSession></Page>;
}
function Notifications() {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  return <>
    <ChoiceGroup options={[{ value: 'ALL', label: '전체' }, { value: 'UNREAD', label: '안 읽은 알림' }]} value={filter} onChange={setFilter} />
    <NotificationPages key={filter} unreadOnly={filter === 'UNREAD'} />
  </>;
}
function NotificationPages({ unreadOnly }: { unreadOnly: boolean }) {
  const { revision } = useSession();
  const sequence = useRef(0);
  const loader = useCallback(async () => ({ page: await withAuthRevision(revision, () => getNotifications({ unreadOnly })), number: ++sequence.current }), [revision, unreadOnly]);
  const { resource, reload } = useFocusResource(loader);
  return <ResourceContent resource={resource} reload={reload}>{({ page, number }) => <LoadedNotifications key={number} firstPage={page} unreadOnly={unreadOnly} reload={reload} />}</ResourceContent>;
}
function LoadedNotifications({ firstPage, unreadOnly, reload }: { firstPage: NotificationPage; unreadOnly: boolean; reload: () => void }) {
  const [items, setItems] = useState(firstPage.items);
  const [cursor, setCursor] = useState(firstPage.nextCursor);
  const [unreadCount, setUnreadCount] = useState(firstPage.unreadCount);
  const requested = useRef<string[]>([]);
  const mutation = useMutation();
  return <>
    <Caption>안 읽은 알림 {unreadCount}개</Caption>
    <Caption>현재 서버는 조회만 지원합니다. 알림을 열어도 읽음 상태는 바뀌지 않습니다.</Caption>
    {items.length === 0 && <Notice>{unreadOnly ? '안 읽은 알림이 없습니다.' : '아직 알림이 없습니다.'}</Notice>}
    {items.map((item) => <Panel key={item.id}>
      <Caption>{item.isRead ? '읽음' : '안 읽음'} · {new Date(item.createdAt).toLocaleString('ko-KR')}</Caption>
      <Heading>{item.title}</Heading>{item.body !== null && <Body>{item.body}</Body>}
      {item.targetType === 'DEBATE' && item.targetId !== null && <AppButton label="토론 보기" onPress={() => router.navigate({ pathname: '/discussions/[id]', params: { id: item.targetId! } })} />}
    </Panel>)}
    <ErrorNotice message={mutation.error} />
    {cursor !== null && <AppButton label="알림 더 보기" loading={mutation.pending} onPress={() => {
      const next = cursor;
      void mutation.run(async () => {
        const page = await getNotifications({ unreadOnly, cursor: next });
        return { page, combined: appendNotifications(items, page, [...requested.current, next]) };
      }, ({ page, combined }) => { requested.current.push(next); setItems(combined); setCursor(page.nextCursor); setUnreadCount(page.unreadCount); });
    }} />}
    <AppButton label="알림 새로고침" disabled={mutation.pending} onPress={reload} />
  </>;
}
