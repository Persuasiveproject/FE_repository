import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Page } from '@/components/page';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { Body, Caption, Heading, Notice, Panel } from '@/components/ui/content-blocks';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { dataSource, gateway } from '@/services/gateway';

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const loader = useCallback(() => gateway.getSummary(id), [id]);
  const { resource, reload } = useFocusResource(loader);
  return <Page title="AI 요약">
    {dataSource === 'mock' && <Notice>현재는 AI 서버를 호출하지 않는 데모 요약입니다. 화면 구조와 원문 이동을 확인할 수 있습니다.</Notice>}
    <ResourceContent resource={resource} reload={reload}>{(summary) => <>
      {summary.generatedAt === null || summary.sections.length === 0
        ? <Notice>의견이 더 모이면 요약해 드려요.</Notice>
        : <Caption>{new Date(summary.generatedAt).toLocaleString('ko-KR')} 생성</Caption>}
      {summary.sections.map((section) => <Panel key={section.title}><Heading>{section.title}</Heading><Body>{section.text}</Body>
        {section.opinionIds.map((opinionId) => <AppButton key={opinionId} label="바탕이 된 의견 보기" onPress={() => router.navigate({ pathname: '/discussions/[id]/threads/[opinionId]', params: { id, opinionId } })} />)}
      </Panel>)}
    </>}</ResourceContent>
  </Page>;
}
