import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { ResourceContent } from '@/components/resource-content';
import { DiscussionCard } from '@/components/discussion-card';
import { Caption, Notice } from '@/components/ui/content-blocks';
import { ChoiceGroup } from '@/features/core/choice-group';
import { STANCE_LABEL } from '@/features/core/rules';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { dataSource, gateway } from '@/services/gateway';

export default function JoinedScreen() {
  return <Page title="참여 중" back={false} tab><RequireSession><JoinedList /></RequireSession></Page>;
}
function JoinedList() {
  const [status, setStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const loader = useCallback(() => gateway.listJoined(status), [status]);
  const { resource, reload } = useFocusResource(loader);
  return <>
    {dataSource === 'api' && <Caption>최근 참여 토론 최대 20개를 표시합니다.</Caption>}
    <ChoiceGroup options={[{ value: 'OPEN', label: '진행 중' }, { value: 'CLOSED', label: '종료' }]} value={status} onChange={setStatus} />
    <ResourceContent resource={resource} reload={reload}>{(items) => <>
      {items.length === 0 && <Notice>아직 참여한 토론이 없습니다. 홈에서 관심 있는 토론의 입장을 선택해 보세요.</Notice>}
      {items.map((item) => <View key={item.id} style={{ gap: 8 }}>
        <DiscussionCard discussion={item} onPress={() => router.navigate({ pathname: '/discussions/[id]', params: { id: item.id } })} />
        {item.membership && <Caption>내 입장 · {STANCE_LABEL[item.membership.currentStance]}</Caption>}
      </View>)}
    </>}</ResourceContent>
  </>;
}
