import { useState } from 'react';
import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { AppButton } from '@/components/ui/app-button';
import { FormField } from '@/components/ui/form-field';
import { Caption, ErrorNotice, Notice, Row } from '@/components/ui/content-blocks';
import { CREATE_CATEGORIES, validateProfile } from '@/features/core/rules';
import { useSession } from '@/features/session/session-provider';
import { useMutation } from '@/hooks/use-mutation';
import { gateway } from '@/services/gateway';

export default function ProfileScreen() {
  return <Page title="프로필 수정"><RequireSession><ProfileForm /></RequireSession></Page>;
}
function ProfileForm() {
  const { profile, refresh } = useSession();
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [interests, setInterests] = useState(profile?.interests ?? []);
  const [saved, setSaved] = useState(false);
  const mutation = useMutation();
  const invalid = validateProfile({ nickname, interests, termsAccepted: true, privacyAccepted: true });
  return <>
    <FormField label="닉네임" value={nickname} onChangeText={(value) => { setNickname(value); setSaved(false); }} maxLength={20} counter />
    <Caption>관심 주제 · 최대 5개</Caption>
    <Row>{CREATE_CATEGORIES.map((category) => <AppButton key={category} label={category} selected={interests.includes(category)} onPress={() => {
      setSaved(false); setInterests((current) => current.includes(category) ? current.filter((item) => item !== category) : current.length < 5 ? [...current, category] : current);
    }} />)}</Row>
    <ErrorNotice message={mutation.error} />
    {saved && <Notice>데모 프로필을 저장했습니다.</Notice>}
    <AppButton label="변경 내용 저장" variant="primary" disabled={!!invalid} loading={mutation.pending}
      onPress={() => void mutation.run(async () => { await gateway.updateProfile({ nickname, interests }); await refresh(); }, () => setSaved(true))} />
  </>;
}
