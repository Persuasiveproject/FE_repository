import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Page } from '@/components/page';
import { ResourceState } from '@/components/resource-state';
import { AppButton } from '@/components/ui/app-button';
import { FormField } from '@/components/ui/form-field';
import { Caption, ErrorNotice, Heading, Notice, Row } from '@/components/ui/content-blocks';
import { CREATE_CATEGORIES, validateProfile } from '@/features/core/rules';
import { useSession } from '@/features/session/session-provider';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useMutation } from '@/hooks/use-mutation';
import { dataSource, gateway } from '@/services/gateway';
import { getPublicCategories } from '@/services/public-api';

export default function SignupScreen() {
  const [nickname, setNickname] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [selectionMessage, setSelectionMessage] = useState('');
  const [termsAccepted, setTerms] = useState(false);
  const [privacyAccepted, setPrivacy] = useState(false);
  const { refresh } = useSession();
  const mutation = useMutation();
  const loadCategories = useCallback(async () => dataSource === 'api'
    ? (await getPublicCategories()).map((category) => category.name)
    : [...CREATE_CATEGORIES], []);
  const { resource: categoryResource, reload: reloadCategories } = useFocusResource(loadCategories);
  const categories = categoryResource.status === 'success' ? categoryResource.data : [];
  const input = { nickname, interests, termsAccepted, privacyAccepted };
  const invalid = validateProfile(input, categories);

  function toggleInterest(category: string) {
    if (interests.includes(category)) {
      setInterests((current) => current.filter((item) => item !== category));
      setSelectionMessage('');
      return;
    }
    if (interests.length >= 5) {
      setSelectionMessage('최대 5개까지 고를 수 있어요');
      return;
    }
    setInterests((current) => [...current, category]);
    setSelectionMessage('');
  }

  function complete(selectedInterests: string[]) {
    if (dataSource !== 'mock') return;
    const signup = { ...input, interests: selectedInterests };
    void mutation.run(async () => {
      await gateway.signUpDemo(signup);
      await refresh();
    }, () => router.replace('/'));
  }

  function skip() {
    setInterests([]);
    setSelectionMessage('');
    if (dataSource === 'mock') complete([]);
    else router.replace('/');
  }

  return <Page title="회원가입 · 데모">
    <Notice>{dataSource === 'api'
      ? '서버 카테고리를 표시합니다. 실제 회원가입 및 관심 카테고리 저장 API는 아직 연결되어 있지 않습니다.'
      : '데모 폼입니다. 실제 회원가입·본인확인·약관 동의 기록은 생성되지 않습니다. 실제 약관과 개인정보 문서는 서비스 연동 전에 연결해야 합니다.'}</Notice>
    <FormField label="닉네임" value={nickname} onChangeText={setNickname} maxLength={20} counter placeholder="2~20자" />
    <Heading>관심 주제</Heading>
    <Caption>최대 5개까지 선택할 수 있어요.</Caption>
    {categoryResource.status === 'loading' && <ResourceState kind="loading" />}
    {categoryResource.status === 'error' && <ResourceState kind="error" message={categoryResource.error.message} onRetry={reloadCategories} />}
    {categoryResource.status === 'success' && categories.length === 0 && <ResourceState kind="empty" message="선택할 수 있는 카테고리가 없습니다." />}
    {selectionMessage !== '' && <Notice>{selectionMessage}</Notice>}
    {categoryResource.status === 'success' && <Row>{categories.map((category) => <AppButton key={category} label={category} selected={interests.includes(category)}
      disabled={mutation.pending} onPress={() => toggleInterest(category)} />)}</Row>}
    <AppButton label="[필수 · 데모] 서비스 이용약관 확인" selected={termsAccepted} disabled={mutation.pending} onPress={() => setTerms(!termsAccepted)} />
    <AppButton label="[필수 · 데모] 개인정보 안내 확인" selected={privacyAccepted} disabled={mutation.pending} onPress={() => setPrivacy(!privacyAccepted)} />
    <ErrorNotice message={mutation.error} />
    <AppButton label="완료" variant="primary" disabled={dataSource !== 'mock' || !!invalid || categoryResource.status !== 'success' || mutation.pending} loading={mutation.pending}
      onPress={() => complete(interests)} />
    {dataSource === 'api' && <Notice>실서버 회원가입 저장은 지원되지 않아 완료 버튼을 사용할 수 없습니다.</Notice>}
    <AppButton label="건너뛰기" disabled={mutation.pending || (dataSource === 'mock' && !!validateProfile({ ...input, interests: [] }, categories))} onPress={skip} />
  </Page>;
}
