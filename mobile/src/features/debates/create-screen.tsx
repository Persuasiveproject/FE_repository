import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { ErrorNotice, Notice } from '@/components/ui/content-blocks';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { StatusSign } from '@/components/ui/stance';
import { AppColors, AppRadius, AppSpacing, AppTypography } from '@/constants/theme';
import { CREATE_CATEGORIES, LIMITS, validateDebate } from '@/features/core/rules';
import { useSession } from '@/features/session/session-provider';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useMutation } from '@/hooks/use-mutation';
import { useWide } from '@/hooks/use-wide';
import { withAuthRevision } from '@/services/basic-auth';
import { dataSource, gateway } from '@/services/gateway';
import { getPublicCategories } from '@/services/public-api';
import type { CreateDebateInput, SavedDraft } from '@/types/core';

// 토론 만들기: 1 주제와 방식 → 2 질문과 설명 → 3 미리보기와 게시.
// 버튼은 아래 고정 영역에 두어, 긴 내용을 쓰는 중에도 '다음'이 항상 보이게 한다.
const STEPS = ['주제와 방식', '질문과 설명', '미리보기와 게시'] as const;
const DURATIONS = [5, 10, 15] as const;

export default function CreateScreen() {
  const { revision, profile, ready } = useSession();
  const { draftId, category } = useLocalSearchParams<{ draftId?: string; category?: string }>();
  // 로그인 전에는 안내만 보여 준다(폼과 아래 버튼 영역은 로그인 후에).
  if (!ready || !profile) return <Page title="토론 만들기" demo={false}><RequireSession>{null}</RequireSession></Page>;
  return dataSource === 'api'
    ? <ServerCreateForm key={`${revision}/${draftId ?? 'new'}`} draftId={draftId} initialCategory={category} />
    : <CreateForm initialCategory={category} />;
}

function ServerCreateForm({ draftId, initialCategory }: { draftId?: string; initialCategory?: string }) {
  const { revision } = useSession();
  const loader = useCallback(() => withAuthRevision(revision, async () => {
    const [categories, draft] = await Promise.all([getPublicCategories(), draftId ? gateway.getDraft!(draftId) : Promise.resolve(undefined)]);
    return { categories, draft };
  }), [revision, draftId]);
  const { resource, reload } = useFocusResource(loader);
  if (resource.status !== 'success') return <Page title="토론 만들기" demo={false}><ResourceContent resource={resource} reload={reload}>{() => null}</ResourceContent></Page>;
  const { categories, draft } = resource.data;
  if (!categories.length) return <Page title="토론 만들기" demo={false}><Notice>지금은 토론을 열 수 있는 주제가 없어요.</Notice></Page>;
  return <CreateForm categories={categories.map((item) => item.name)} initialDraft={draft} initialCategory={initialCategory} />;
}

function CreateForm({ categories = [...CREATE_CATEGORIES], initialDraft, initialCategory }: { categories?: string[]; initialDraft?: SavedDraft; initialCategory?: string }) {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState<CreateDebateInput>(initialDraft?.input ?? {
    // 탐색에서 '이 주제로 토론 열기'로 들어오면 그 카테고리를 미리 고른다(목록에 있는 이름만).
    category: initialCategory && categories.includes(initialCategory) ? initialCategory : '', kind: 'QUICK', durationMinutes: 15, title: '', content: '' });
  const [draftId, setDraftId] = useState(initialDraft?.id);
  const [savedSignature, setSavedSignature] = useState(initialDraft ? JSON.stringify(initialDraft.input) : '');
  const [requestId] = useState(() => `create-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const { profile, refresh } = useSession();
  const mutation = useMutation();
  const wide = useWide();
  function patch<K extends keyof CreateDebateInput>(key: K, value: CreateDebateInput[K]) { if (!mutation.pending) setInput((current) => ({ ...current, [key]: value })); }

  const firstValid = !!input.category && (input.kind === 'ENDLESS' || (input.durationMinutes >= 5 && input.durationMinutes <= 15));
  const error = validateDebate(input, categories);
  const coins = profile?.coins;
  const short = dataSource === 'mock' && (coins ?? 0) < LIMITS.cost;
  const saved = !!draftId && savedSignature === JSON.stringify(input);
  const duration = input.kind === 'QUICK' ? `${input.durationMinutes}분` : '3일';

  function publish() {
    void mutation.run(async () => {
      const debate = dataSource === 'api' && draftId ? await gateway.publishDraft!(draftId, input) : await gateway.createDebate(input, requestId);
      await refresh();
      return debate;
    }, (debate) => router.replace({ pathname: '/discussions/[id]', params: { id: debate.id } }));
  }
  function saveDraft() {
    const snapshot = { ...input };
    void mutation.run(() => gateway.saveDraft!(snapshot, requestId, draftId), (draft) => { setDraftId(draft.id); setSavedSignature(JSON.stringify(snapshot)); });
  }

  const next = step === 1 ? { label: '다음', disabled: !firstValid, onPress: () => setStep(2) }
    : step === 2 ? { label: '미리보기', disabled: !!error, onPress: () => setStep(3) }
    : { label: `${LIMITS.cost}코인으로 토론 열기`, disabled: !!error || short, onPress: publish };
  const footer = <View style={styles.footer}>
    {step > 1 && <View style={styles.footerBack}><AppButton label="이전" disabled={mutation.pending} onPress={() => setStep(step - 1)} /></View>}
    <View style={styles.footerNext}><AppButton label={next.label} variant="primary" disabled={next.disabled || mutation.pending}
      loading={step === 3 && mutation.pending} onPress={next.onPress} /></View>
  </View>;

  return <Page title="토론 만들기" demo={false} footer={wide ? undefined : footer}>
    <Progress step={step} />

    {step === 1 && <>
      <Section title="어떤 주제인가요?">
        <View style={styles.grid}>
          {categories.map((value) => <Choice key={value} label={value} selected={input.category === value}
            disabled={mutation.pending} onPress={() => patch('category', value)} compact={!wide} />)}
        </View>
      </Section>
      <Section title="어떻게 진행할까요?">
        <View style={styles.kinds}>
          <KindCard title="간단토론" body="5~15분" selected={input.kind === 'QUICK'} onPress={() => patch('kind', 'QUICK')} />
          <KindCard title="끝장토론" body="3일" selected={input.kind === 'ENDLESS'} onPress={() => patch('kind', 'ENDLESS')} />
        </View>
        {input.kind === 'QUICK' && <View style={styles.duration}>
          <Text style={styles.label}>진행 시간</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map((minutes) => <Choice key={minutes} label={`${minutes}분`} selected={input.durationMinutes === minutes}
              disabled={mutation.pending} onPress={() => patch('durationMinutes', minutes)} pill />)}
          </View>
          <View style={styles.fineRow}>
            <Text style={styles.hint}>1분 단위로 맞추기</Text>
            <Stepper value={input.durationMinutes} onChange={(value) => patch('durationMinutes', value)} disabled={mutation.pending} />
          </View>
        </View>}
      </Section>
    </>}

    {step === 2 && <>
      <Section title="무엇을 물어볼까요?">
        <FormField label="질문" value={input.title} onChangeText={(value) => patch('title', value)} maxLength={LIMITS.title} counter
          placeholder="예: 기말고사 대신 팀 프로젝트로 평가해야 할까" />
        <FormField label="설명" value={input.content} onChangeText={(value) => patch('content', value)} maxLength={LIMITS.content} counter multiline
          placeholder="왜 이 질문을 꺼냈는지, 어떤 점에서 생각이 갈리는지 적어 주세요." />
      </Section>
    </>}

    {step === 3 && <>
      <Section title="이렇게 보여요">
        <View style={styles.preview}>
          <StatusSign category={input.category} extra={[input.kind === 'QUICK' ? '간단토론' : '끝장토론']} />
          <Text style={styles.previewTitle}>{input.title.trim()}</Text>
          <Text style={styles.previewBody} numberOfLines={6}>{input.content.trim()}</Text>
          <Text style={styles.previewMeta}>{duration} 동안 열려요</Text>
        </View>
      </Section>
      <Section title="코인">
        <View style={styles.costRow}><Text style={styles.costLabel}>필요한 코인</Text><Text style={styles.costValue}>{LIMITS.cost}개</Text></View>
        {coins != null && <>
          <View style={styles.costRow}><Text style={styles.costLabel}>지금 가진 코인</Text><Text style={styles.costValue}>{coins}개</Text></View>
          <View style={styles.costRow}><Text style={styles.costLabel}>게시 후</Text><Text style={[styles.costValue, styles.costStrong]}>{Math.max(0, coins - LIMITS.cost)}개</Text></View>
        </>}
        {short && <Text accessibilityRole="alert" style={styles.warn}>코인이 부족해요.</Text>}
      </Section>
    </>}

    <ErrorNotice message={mutation.error} />
    {wide && footer}

    {dataSource === 'api' && <View style={styles.drafts}>
      <Pressable accessibilityRole="button" disabled={!!error || mutation.pending} onPress={saveDraft} hitSlop={8}>
        <Text style={[styles.draftLink, (!!error || mutation.pending) && styles.draftDisabled]}>{draftId ? '초안 변경 저장' : '초안으로 저장'}</Text>
      </Pressable>
      {draftId && <Text style={styles.draftState}>{saved ? '저장됨' : '저장하지 않은 변경 있음'}</Text>}
      <Pressable accessibilityRole="link" disabled={mutation.pending} onPress={() => router.navigate('/discussions/drafts')} hitSlop={8}>
        <Text style={styles.draftLink}>저장한 초안 보기</Text>
      </Pressable>
    </View>}
  </Page>;
}

// 단계 표시: 숫자 대신 세 칸 막대와 단계 이름.
function Progress({ step }: { step: number }) {
  return <View accessibilityLabel={`${STEPS.length}단계 중 ${step}단계, ${STEPS[step - 1]}`} style={styles.progress}>
    <View style={styles.bars}>{STEPS.map((name, index) => <View key={name} style={[styles.bar, index < step && styles.barOn]} />)}</View>
    <Text style={styles.stepName}>{STEPS[step - 1]}</Text>
  </View>;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return <View style={styles.section}>
    <View style={styles.sectionHead}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
    {children}
  </View>;
}

function Choice({ label, selected, onPress, disabled, compact, pill }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean; compact?: boolean; pill?: boolean }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [pill ? styles.pill : styles.tile, compact && styles.tileCompact, selected && styles.choiceOn, pressed && !selected && styles.pressed]}>
    <Text numberOfLines={2} style={[styles.choiceText, selected && styles.choiceTextOn]}>{label}</Text>
    {selected && !pill && <Icon name="check" size={18} color={AppColors.text} strokeWidth={2.4} />}
  </Pressable>;
}

function KindCard({ title, body, selected, onPress }: { title: string; body: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress}
    style={({ pressed }) => [styles.kind, selected && styles.choiceOn, pressed && !selected && styles.pressed]}>
    <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.radioDot} />}</View>
    <View style={styles.kindText}>
      <Text style={styles.kindTitle}>{title}</Text>
      <Text style={styles.kindBody}>{body}</Text>
    </View>
  </Pressable>;
}

// 5·10·15분 외의 시간은 1분 단위로 맞춘다.
function Stepper({ value, onChange, disabled }: { value: number; onChange: (value: number) => void; disabled?: boolean }) {
  return <View style={styles.stepper}>
    <Pressable accessibilityRole="button" accessibilityLabel="1분 줄이기" disabled={disabled || value <= 5} onPress={() => onChange(value - 1)} hitSlop={6}
      style={[styles.stepButton, (disabled || value <= 5) && styles.stepDisabled]}><Text style={styles.stepSign}>−</Text></Pressable>
    <Text style={styles.stepValue}>{value}분</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="1분 늘리기" disabled={disabled || value >= 15} onPress={() => onChange(value + 1)} hitSlop={6}
      style={[styles.stepButton, (disabled || value >= 15) && styles.stepDisabled]}><Text style={styles.stepSign}>+</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  progress: { gap: AppSpacing.sm },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: AppColors.border },
  barOn: { backgroundColor: AppColors.text },
  stepName: { ...AppTypography.caption, color: AppColors.textSecondary, fontWeight: '600' },
  section: { gap: AppSpacing.md },
  sectionHead: { gap: 4 },
  sectionTitle: { ...AppTypography.title, fontSize: 22, lineHeight: 30, color: AppColors.text },
  hint: { ...AppTypography.caption, fontSize: 14, color: AppColors.textSecondary },
  label: { ...AppTypography.label, fontSize: 14, fontWeight: '700', color: AppColors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: AppSpacing.sm, justifyContent: 'space-between' },
  tile: { width: '32%', minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6,
    paddingHorizontal: AppSpacing.lg, borderRadius: AppRadius.field, borderWidth: 1.5, borderColor: AppColors.border, backgroundColor: AppColors.surface },
  tileCompact: { width: '48.5%' },
  pill: { minHeight: 44, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1.5, borderColor: AppColors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: AppColors.surface },
  choiceOn: { borderColor: AppColors.text, backgroundColor: AppColors.soft },
  choiceText: { ...AppTypography.label, flexShrink: 1, color: AppColors.textSecondary },
  choiceTextOn: { color: AppColors.text, fontWeight: '700' },
  pressed: { backgroundColor: AppColors.soft },
  kinds: { gap: AppSpacing.sm },
  kind: { flexDirection: 'row', alignItems: 'center', gap: AppSpacing.md, padding: AppSpacing.lg, borderRadius: AppRadius.field,
    borderWidth: 1.5, borderColor: AppColors.border, backgroundColor: AppColors.surface },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: AppColors.textFaint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: AppColors.text },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AppColors.text },
  kindText: { flex: 1, gap: 2 },
  kindTitle: { ...AppTypography.heading, fontSize: 17, color: AppColors.text },
  kindBody: { ...AppTypography.caption, fontSize: 14, color: AppColors.textSecondary },
  duration: { gap: AppSpacing.sm, paddingTop: AppSpacing.xs },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: AppSpacing.sm },
  fineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: AppSpacing.xs },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: AppSpacing.sm },
  stepButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: AppColors.soft, alignItems: 'center', justifyContent: 'center' },
  stepDisabled: { opacity: 0.35 },
  stepSign: { fontSize: 20, lineHeight: 22, color: AppColors.text, fontWeight: '600' },
  stepValue: { ...AppTypography.label, minWidth: 40, textAlign: 'center', color: AppColors.text },
  preview: { gap: AppSpacing.sm, padding: AppSpacing.lg, borderRadius: 20, borderWidth: 1.5, borderColor: AppColors.border },
  previewTitle: { ...AppTypography.title, fontSize: 21, lineHeight: 29, color: AppColors.text },
  previewBody: { ...AppTypography.body, color: AppColors.textSecondary },
  previewMeta: { ...AppTypography.caption, color: AppColors.textFaint },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  costLabel: { ...AppTypography.body, color: AppColors.textSecondary },
  costValue: { ...AppTypography.label, color: AppColors.text },
  costStrong: { fontSize: 17 },
  costNote: { ...AppTypography.caption, color: AppColors.textFaint },
  warn: { ...AppTypography.caption, color: AppColors.danger, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: AppSpacing.sm },
  footerBack: { flex: 1 },
  footerNext: { flex: 2 },
  drafts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: AppSpacing.lg, paddingTop: AppSpacing.xs },
  draftLink: { ...AppTypography.caption, color: AppColors.textSecondary, fontWeight: '600', textDecorationLine: 'underline' },
  draftDisabled: { color: AppColors.textFaint },
  draftState: { ...AppTypography.caption, color: AppColors.textFaint },
});
