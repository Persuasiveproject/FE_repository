import { router } from 'expo-router';
import { useCallback } from 'react';
import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { Caption, Heading, Notice, Panel } from '@/components/ui/content-blocks';
import { useSession } from '@/features/session/session-provider';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { withAuthRevision } from '@/services/basic-auth';
import { dataSource, gateway } from '@/services/gateway';

export default function SavedDraftsScreen() {
  const { revision } = useSession();
  return <Page title="저장한 초안"><RequireSession>{dataSource === 'api' ? <Drafts key={revision} /> : <Notice>초안 저장은 실제 서버 모드에서 사용할 수 있습니다.</Notice>}</RequireSession></Page>;
}
function Drafts() {
  const { revision } = useSession();
  const loader = useCallback(() => withAuthRevision(revision, async () => gateway.getSavedDrafts!()), [revision]);
  const { resource, reload } = useFocusResource(loader);
  return <>
    <Notice>이 앱 실행 중 저장하거나 불러온 초안입니다. 초안 내용은 서버에 저장되지만, 이 목록은 새로고침·로그아웃 시 비워집니다.</Notice>
    <ResourceContent resource={resource} reload={reload}>{(drafts) => <>
      {drafts.length === 0 && <Notice>현재 앱에서 기억하는 초안이 없습니다.</Notice>}
      {drafts.map((draft) => <Panel key={draft.id}>
        <Caption>초안 {draft.id} · {draft.input.category} · {new Date(draft.createdAt).toLocaleString('ko-KR')} 저장</Caption>
        <Heading>{draft.input.title}</Heading>
        <AppButton label="이어서 수정하기" onPress={() => router.navigate({ pathname: '/discussions/create', params: { draftId: draft.id } })} />
      </Panel>)}
    </>}</ResourceContent>
    <AppButton label="새 토론 만들기" onPress={() => router.navigate('/discussions/create')} />
  </>;
}
