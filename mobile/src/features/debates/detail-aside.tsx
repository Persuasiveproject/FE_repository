import { DebateInfoPanel, SummaryPreviewPanel } from '@/components/side-panel';
import { remainingTime } from '@/features/core/rules';
import { IssueMapPanel } from './issue-map';

type Props = { id: string; endsAt: string | null; closed: boolean; participants: number; category: string; kind?: string };

// PC 토론 상세 오른쪽 패널: 토론 정보, AI 요약 미리보기, (끝장토론) 쟁점 정리. 대화를 읽으면서 함께 볼 수 있다.
export function DetailAside({ id, endsAt, closed, participants, category, kind }: Props) {
  const rows: [string, string][] = [['손님', `${participants}명`], ['주제', category]];
  if (kind) rows.push(['방식', kind]);
  if (endsAt) rows.push(['문 닫는 시각', new Date(endsAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })]);
  return <>
    <DebateInfoPanel remaining={closed ? '문 닫은 토론' : remainingTime(endsAt)} rows={rows} />
    <SummaryPreviewPanel debateId={id} />
    {kind === '끝장토론' && <IssueMapPanel debateId={id} />}
  </>;
}
