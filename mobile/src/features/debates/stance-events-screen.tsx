import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { ResourceContent } from '@/components/resource-content';
import { Body, Caption, Notice, Panel } from '@/components/ui/content-blocks';
import { STANCE_LABEL } from '@/features/core/rules';
import { useSession } from '@/features/session/session-provider';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { withAuthRevision } from '@/services/basic-auth';
import { dataSource } from '@/services/gateway';
import { getStanceEvents } from '@/services/remaining-api';

export default function StanceEventsScreen() {
  const { revision } = useSession();
  return <Page title="내 입장 변경 이력"><RequireSession>{dataSource === 'api' ? <Events key={revision} /> : <Notice>아직 입장을 바꾼 기록이 없어요.</Notice>}</RequireSession></Page>;
}
function Events() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { revision } = useSession();
  const loader = useCallback(() => withAuthRevision(revision, () => getStanceEvents(id)), [id, revision]);
  const { resource, reload } = useFocusResource(loader);
  return <ResourceContent resource={resource} reload={reload}>{(events) => <>
    {events.length === 0 && <Notice>아직 입장을 변경한 기록이 없습니다.</Notice>}
    {events.map((event) => <Panel key={event.id}>
      <Body>{STANCE_LABEL[event.fromStance]} → {STANCE_LABEL[event.toStance]}</Body>
      <Caption>{new Date(event.changedAt).toLocaleString('ko-KR')}</Caption>
      {event.persuasionId !== null && <Caption>영업 근거를 반영한 변경</Caption>}
    </Panel>)}
  </>}</ResourceContent>;
}
