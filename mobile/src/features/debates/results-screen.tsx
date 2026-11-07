import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Page } from '@/components/page';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { Body, Caption, Heading, Notice, Panel } from '@/components/ui/content-blocks';
import { STANCES, STANCE_LABEL } from '@/features/core/rules';
import { TransitionChart } from './transition-chart';
import { STANCE_COLOR } from '@/features/opinions/opinion-card';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { gateway } from '@/services/gateway';

export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const loader = useCallback(async () => ({ debate: await gateway.getDebate(id), results: await gateway.getResults(id) }), [id]);
  const { resource, reload } = useFocusResource(loader);
  return <Page title="최종 통계" footer={<AppButton label="토론 내용 다시보기" onPress={() => router.replace({ pathname: '/discussions/[id]', params: { id } })} />}>
    <ResourceContent resource={resource} reload={reload}>{({ debate, results }) => <>
      <Panel><Caption>토론 종료 · 데모 집계</Caption><Heading>{debate.title}</Heading><Body>토론이 종료되어 투표와 입장 변경이 마감되었습니다.</Body></Panel>
      <Panel><Body>누적 참여자 {results.total}명</Body><Body>의견 {results.opinionCount}개 · 답글 {results.replyCount}개</Body></Panel>
      <Panel><Heading>토론 전후, 입장은 어떻게 달라졌을까요?</Heading>
        {results.transitions.length > 0 ? <TransitionChart transitions={results.transitions} total={results.total} /> : <Notice>개인정보 보호 또는 집계 데이터 부족으로 입장 변화 흐름을 표시하지 않습니다.</Notice>}
        {results.changed !== null && <Body>입장 변경 {results.changed}명 · 입장 유지 {results.kept}명</Body>}
      </Panel>
      <Panel><Heading>최종 선택</Heading>
        {STANCES.map((stance) => {
          const count = results.final[stance]; const percent = results.total ? count / results.total * 100 : 0;
          return <View key={stance} style={styles.distribution}>
            <Body>{STANCE_LABEL[stance]} {count}명 · {percent.toFixed(1)}%</Body>
            <View style={styles.track}><View style={{ height: 12, borderRadius: 6, width: `${Math.min(100, percent)}%`, backgroundColor: STANCE_COLOR[stance] }} /></View>
          </View>;
        })}
      </Panel>
      <Notice>성별·연령·지역 통계는 현재 BE에서도 공개 집계가 준비되지 않아 표시하지 않습니다. 다른 사람의 개인정보를 추측해 채우지 않습니다.</Notice>
      <Caption>집계 시각: {new Date(results.computedAt).toLocaleString('ko-KR')}</Caption>
    </>}</ResourceContent>
  </Page>;
}
const styles = StyleSheet.create({ distribution: { gap: 8 }, track: { backgroundColor: '#E3E9EE', borderRadius: 6, overflow: 'hidden' } });
