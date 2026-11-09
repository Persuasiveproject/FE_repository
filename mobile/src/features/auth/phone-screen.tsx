import { router } from 'expo-router';
import { useState } from 'react';
import { Page } from '@/components/page';
import { AppButton } from '@/components/ui/app-button';
import { FormField } from '@/components/ui/form-field';
import { ErrorNotice, Notice } from '@/components/ui/content-blocks';
import { useMutation } from '@/hooks/use-mutation';
import { requestDemoCode, verifyDemoCode } from '@/services/demo-phone';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState('');
  const mutation = useMutation();
  return <Page title="휴대폰 확인 · 데모">
    <Notice>실제 번호를 입력할 필요가 없습니다. 예: 01000000000. SMS를 전송하지 않으며 본인 인증을 완료하지 않습니다.</Notice>
    <FormField label="휴대폰 번호" value={phone} onChangeText={(value) => { setPhone(value); setChallenge(''); setCode(''); }} keyboardType="phone-pad" maxLength={13} placeholder="01000000000" />
    <AppButton label={challenge ? '데모 코드 다시 받기' : '데모 코드 받기'} disabled={!phone.trim()} loading={mutation.pending}
      onPress={() => void mutation.run(() => requestDemoCode(phone), setChallenge)} />
    {!!challenge && <>
      <Notice>데모 확인 코드: 123456. 이 과정은 실제 전화번호 인증이 아닙니다.</Notice>
      <FormField label="데모 확인 코드" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
      <AppButton label="데모 확인 후 가입 폼으로" variant="primary" disabled={code.length !== 6} loading={mutation.pending}
        onPress={() => void mutation.run(() => verifyDemoCode(challenge, code), () => router.replace('/auth/signup'))} />
    </>}
    <ErrorNotice message={mutation.error} />
  </Page>;
}
