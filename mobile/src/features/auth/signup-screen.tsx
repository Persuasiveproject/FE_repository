import { router } from 'expo-router';
import { useState } from 'react';
import { Page } from '@/components/page';
import { AppButton } from '@/components/ui/app-button';
import { FormField } from '@/components/ui/form-field';
import { Caption, ErrorNotice, Heading, Notice, Row } from '@/components/ui/content-blocks';
import { CREATE_CATEGORIES, validateProfile } from '@/features/core/rules';
import { useSession } from '@/features/session/session-provider';
import { useMutation } from '@/hooks/use-mutation';
import { gateway } from '@/services/gateway';

export default function SignupScreen() {
  const [nickname, setNickname] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [termsAccepted, setTerms] = useState(false);
  const [privacyAccepted, setPrivacy] = useState(false);
  const { refresh } = useSession();
  const mutation = useMutation();
  const input = { nickname, interests, termsAccepted, privacyAccepted };
  return <Page title="회원가입 · 데모">
    <Notice>데모 폼입니다. 실제 회원가입·본인확인·약관 동의 기록은 생성되지 않습니다. 실제 약관과 개인정보 문서는 서비스 연동 전에 연결해야 합니다.</Notice>
    <FormField label="닉네임" value={nickname} onChangeText={setNickname} maxLength={20} counter placeholder="2~20자" />
    <Heading>관심 주제</Heading>
    <Caption>최대 5개까지 선택할 수 있어요.</Caption>
    <Row>{CREATE_CATEGORIES.map((category) => <AppButton key={category} label={category} selected={interests.includes(category)}
      onPress={() => setInterests((current) => current.includes(category) ? current.filter((item) => item !== category) : current.length < 5 ? [...current, category] : current)} />)}</Row>
    <AppButton label="[필수 · 데모] 서비스 이용약관 확인" selected={termsAccepted} onPress={() => setTerms(!termsAccepted)} />
    <AppButton label="[필수 · 데모] 개인정보 안내 확인" selected={privacyAccepted} onPress={() => setPrivacy(!privacyAccepted)} />
    <ErrorNotice message={mutation.error} />
    <AppButton label="데모 프로필 만들기" variant="primary" disabled={!!validateProfile(input)} loading={mutation.pending}
      onPress={() => void mutation.run(async () => { await gateway.signUpDemo(input); await refresh(); }, () => router.replace('/my'))} />
  </Page>;
}
