import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Page } from '@/components/page';
import { ResourceState } from '@/components/resource-state';
import { AppButton } from '@/components/ui/app-button';
import { ErrorNotice } from '@/components/ui/content-blocks';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { AppColors, AppSpacing, AppTypography } from '@/constants/theme';
import { CREATE_CATEGORIES } from '@/features/core/rules';
import { useSession } from '@/features/session/session-provider';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useMutation } from '@/hooks/use-mutation';
import { dataSource, gateway } from '@/services/gateway';
import { getPublicCategories } from '@/services/public-api';
import type { AuthTerm } from '@/types/core';
import { clearPendingSignup, getPendingSignup } from './auth-flow';

const TERM_TITLE: Record<string, string> = { SERVICE: '서비스 이용약관', PRIVACY: '개인정보 수집·이용', MARKETING: '이벤트·소식 알림 받기' };
const MAX_INTERESTS = 5;

export default function SignupScreen() {
  const pending = getPendingSignup();
  if (!pending) {
    return <Page title="가입" demo={false}>
      <Text style={styles.body}>가입 정보가 없어요.</Text>
      <AppButton label="처음부터 다시 하기" variant="primary" onPress={() => router.replace('/auth/login')} />
    </Page>;
  }
  return <SignupForm signupToken={pending.signupToken} method={pending.method} />;
}

function SignupForm({ signupToken, method }: { signupToken: string; method: 'PHONE' | 'KAKAO' }) {
  const { refresh } = useSession();
  const mutation = useMutation();
  const [nickname, setNickname] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [agreed, setAgreed] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const loader = useCallback(async () => {
    const [terms, categories] = await Promise.all([
      gateway.getTerms ? gateway.getTerms() : Promise.resolve([] as AuthTerm[]),
      dataSource === 'api' ? getPublicCategories().then((items) => items.map((item) => item.name)) : Promise.resolve([...CREATE_CATEGORIES]),
    ]);
    return { terms, categories };
  }, []);
  const { resource, reload } = useFocusResource(loader);
  const terms = resource.status === 'success' ? resource.data.terms : [];
  const required = terms.filter((term) => term.isRequired).map((term) => term.id);
  const allAgreed = terms.length > 0 && terms.every((term) => agreed.includes(term.id));
  const trimmed = nickname.trim();
  const nicknameError = nickname && (trimmed.length < 2 || trimmed.length > 20) ? '닉네임은 2~20자로 정해 주세요.' : undefined;
  const ready = resource.status === 'success' && trimmed.length >= 2 && trimmed.length <= 20 && required.every((id) => agreed.includes(id));

  const toggle = (list: string[], value: string) => list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  function submit() {
    void mutation.run(async () => {
      await gateway.completeSignup!({ signupToken, nickname: trimmed, agreedTermIds: agreed, interests });
      clearPendingSignup();
      await refresh();
    }, () => router.replace('/'));
  }

  return <Page title="가입" demo={false}>
    <View style={styles.intro}>
      <Text accessibilityRole="header" style={styles.title}>{method === 'KAKAO' ? '카카오 확인이 끝났어요' : '번호 확인이 끝났어요'}</Text>
    </View>

    <FormField label="닉네임" value={nickname} onChangeText={setNickname} maxLength={20} counter placeholder="2~20자" error={nicknameError} />

    {resource.status === 'loading' && <ResourceState kind="loading" />}
    {resource.status === 'error' && <ResourceState kind="error" message={resource.error.message} onRetry={reload} />}
    {resource.status === 'success' && <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>관심 주제 <Text style={styles.optional}>선택 · 최대 {MAX_INTERESTS}개</Text></Text>
        <View style={styles.chips}>
          {resource.data.categories.map((name) => {
            const on = interests.includes(name);
            const full = !on && interests.length >= MAX_INTERESTS;
            return <Pressable key={name} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: full }} disabled={full}
              onPress={() => setInterests((current) => toggle(current, name))} style={[styles.chip, on && styles.chipOn, full && styles.chipOff]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{name}</Text>
            </Pressable>;
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>약관 동의</Text>
        {terms.length === 0 && <Text style={styles.caption}>동의할 약관이 아직 등록되지 않았어요.</Text>}
        {terms.length > 0 && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: allAgreed }}
          onPress={() => setAgreed(allAgreed ? [] : terms.map((term) => term.id))} style={[styles.termRow, styles.allRow]}>
          <Check on={allAgreed} /><Text style={styles.allText}>모두 동의</Text>
        </Pressable>}
        {terms.map((term) => <View key={term.id}>
          <View style={styles.termRow}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed.includes(term.id) }}
              onPress={() => setAgreed((current) => toggle(current, term.id))} style={styles.termMain}>
              <Check on={agreed.includes(term.id)} />
              <Text style={styles.termText}><Text style={term.isRequired ? styles.req : styles.opt}>{term.isRequired ? '필수' : '선택'}</Text>  {TERM_TITLE[term.type] ?? term.type}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`${TERM_TITLE[term.type] ?? term.type} 내용 보기`} hitSlop={8}
              onPress={() => setOpen(open === term.id ? null : term.id)}>
              <Text style={styles.view}>{open === term.id ? '접기' : '보기'}</Text>
            </Pressable>
          </View>
          {open === term.id && <Text style={styles.termContent}>{term.content}</Text>}
        </View>)}
      </View>
    </>}

    <ErrorNotice message={mutation.error} />
    <AppButton label="가입하고 시작하기" variant="primary" disabled={!ready} loading={mutation.pending} onPress={submit} />
  </Page>;
}

function Check({ on }: { on: boolean }) {
  return <View style={[styles.box, on && styles.boxOn]}>{on && <Icon name="check" size={14} color={AppColors.surface} strokeWidth={2.4} />}</View>;
}

const styles = StyleSheet.create({
  intro: { gap: AppSpacing.sm, paddingTop: AppSpacing.sm },
  title: { ...AppTypography.title, fontSize: 24, lineHeight: 32, color: AppColors.text },
  body: { ...AppTypography.body, color: AppColors.textSecondary },
  caption: { ...AppTypography.caption, fontSize: 13, color: AppColors.textSecondary },
  section: { gap: AppSpacing.sm, paddingTop: AppSpacing.sm },
  sectionTitle: { ...AppTypography.label, fontSize: 15, fontWeight: '700', color: AppColors.text },
  optional: { fontSize: 13, fontWeight: '400', color: AppColors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: AppColors.soft },
  chipOn: { backgroundColor: AppColors.text },
  chipOff: { opacity: 0.4 },
  chipText: { ...AppTypography.caption, fontSize: 14, fontWeight: '600', color: AppColors.text },
  chipTextOn: { color: AppColors.surface },
  termRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, gap: AppSpacing.sm },
  allRow: { justifyContent: 'flex-start', paddingHorizontal: 12, borderRadius: 12, backgroundColor: AppColors.soft },
  allText: { ...AppTypography.label, fontSize: 15, fontWeight: '700', color: AppColors.text },
  termMain: { flexDirection: 'row', alignItems: 'center', gap: AppSpacing.sm, flex: 1, paddingHorizontal: 12, minHeight: 44 },
  termText: { ...AppTypography.caption, fontSize: 14, color: AppColors.text, flexShrink: 1 },
  req: { fontWeight: '700', color: AppColors.text },
  opt: { fontWeight: '700', color: AppColors.textSecondary },
  view: { ...AppTypography.caption, fontSize: 13, color: AppColors.textSecondary, textDecorationLine: 'underline', paddingRight: 12 },
  termContent: { ...AppTypography.caption, fontSize: 13, lineHeight: 20, color: AppColors.textSecondary, backgroundColor: AppColors.soft, borderRadius: 12, padding: 12, marginHorizontal: 12 },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: AppColors.textFaint, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: AppColors.text, borderColor: AppColors.text },
});
