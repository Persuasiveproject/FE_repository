import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Page } from '@/components/page';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { Body, Caption, Heading, Notice, Panel } from '@/components/ui/content-blocks';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { dataSource, gateway } from '@/services/gateway';
import { useSession } from '@/features/session/session-provider';
import { withAuthRevision } from '@/services/basic-auth';

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { revision } = useSession();
  const loader = useCallback(() => withAuthRevision(revision, () => gateway.getSummary(id)), [id, revision]);
  const { resource, reload } = useFocusResource(loader);
  return <Page title="AI 요약">
    {dataSource === 'mock' && <Notice>현재는 AI 서버를 호출하지 않는 데모 요약입니다. 화면 구조와 원문 이동을 확인할 수 있습니다.</Notice>}
    <ResourceContent resource={resource} reload={reload}>{(summary) => <>
      {summary.generatedAt && <Caption>{new Date(summary.generatedAt).toLocaleString('ko-KR')} 기준</Caption>}
      {summary.sections.length === 0 && <Notice>서버에 생성된 AI 요약이 아직 없습니다.</Notice>}
      {summary.sections.map((section) => <Panel key={section.title}><Heading>{section.title}</Heading><Body>{section.text}</Body>
        {section.generatedAt && <Caption>{new Date(section.generatedAt).toLocaleString('ko-KR')} 생성</Caption>}
        {section.opinionIds.map((opinionId) => <AppButton key={opinionId} label="바탕이 된 의견 보기" onPress={() => router.navigate({ pathname: '/discussions/[id]/threads/[opinionId]', params: { id, opinionId } })} />)}
      </Panel>)}
      <AppButton label="요약 다시 불러오기" onPress={reload} />
    </>}</ResourceContent>
  </Page>;
}
