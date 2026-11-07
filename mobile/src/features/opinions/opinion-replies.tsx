import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { ErrorNotice, Notice } from '@/components/ui/content-blocks';
import { AppColors, AppSpacing } from '@/constants/theme';
import { useSession } from '@/features/session/session-provider';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useMutation } from '@/hooks/use-mutation';
import { gateway } from '@/services/gateway';
import { OpinionCard } from './opinion-card';

type Props = { debateId: string; parentId: string; closed: boolean; canParticipate: boolean; onOpenThread: () => void };

// 펼친 의견의 답글만 조회합니다. 기존 전체 답글 화면과 작성 경로도 유지합니다.
export function OpinionReplies({ debateId, parentId, closed, canParticipate, onOpenThread }: Props) {
  const loader = useCallback(() => gateway.listOpinions(debateId, parentId), [debateId, parentId]);
  const { resource, reload } = useFocusResource(loader);
  const mutation = useMutation();
  const { profile } = useSession();
  return <View style={styles.replies}>
    <ResourceContent resource={resource} reload={reload}>{(items) => <>
      {items.length === 0 && <Notice>아직 답글이 없습니다. 첫 답글을 남겨 보세요.</Notice>}
      {items.map((item) => <OpinionCard key={item.id} item={item} disabled={mutation.pending || closed}
        canVote={canParticipate && item.authorId !== profile?.id}
        onVote={(vote) => void mutation.run(() => gateway.voteOpinion(debateId, item.id, vote), reload)}
        onPersuaded={() => router.navigate({ pathname: '/discussions/[id]/vote', params: { id: debateId, opinionId: item.id } })} />)}
    </>}</ResourceContent>
    <ErrorNotice message={mutation.error} />
    {!closed && <AppButton label="이 의견에 답글 쓰기" onPress={() => router.navigate({ pathname: '/discussions/[id]/reply/[opinionId]', params: { id: debateId, opinionId: parentId } })} />}
    <AppButton label="답글 전체 화면 보기" onPress={onOpenThread} />
  </View>;
}

const styles = StyleSheet.create({
  replies: { gap: AppSpacing.sm, paddingLeft: AppSpacing.sm, borderLeftWidth: 2, borderLeftColor: AppColors.border },
});
