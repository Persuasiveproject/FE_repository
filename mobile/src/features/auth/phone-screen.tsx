import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Page } from '@/components/page';
import { AppButton } from '@/components/ui/app-button';
import { ErrorNotice } from '@/components/ui/content-blocks';
import { FormField } from '@/components/ui/form-field';
import { AppColors, AppSpacing, AppTypography } from '@/constants/theme';
import { useSession } from '@/features/session/session-provider';
import { useMutation } from '@/hooks/use-mutation';
import { gateway } from '@/services/gateway';
import type { PhoneCodeResult } from '@/types/core';
import { finishAuth } from './auth-flow';

const digits = (value: string) => value.replace(/\D/g, '').slice(0, 11);
// 입력하면서 010-1234-5678 모양으로 보이게 한다. 서버에는 숫자만 보낸다.
function formatPhone(value: string) {
  const d = digits(value);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}
const validPhone = (value: string) => /^01[016789]\d{7,8}$/.test(digits(value));
const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function useCountdown(until: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  return until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
}

export default function PhoneScreen() {
  const { refresh } = useSession();
  const send = useMutation();
  const verify = useMutation();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState<(PhoneCodeResult & { at: number; number: string }) | null>(null);
  const expiresIn = useCountdown(sent ? sent.at + sent.expiresInSeconds * 1000 : null);
  const resendIn = useCountdown(sent ? sent.at + sent.resendAfterSeconds * 1000 : null);

  function requestCode() {
    const number = digits(phone);
    void send.run(() => gateway.requestPhoneCode!(number), (result) => {
      setSent({ ...result, at: Date.now(), number });
      setCode('');
    });
  }
  function submitCode() {
    if (!sent) return;
    void verify.run(() => gateway.verifyPhoneCode!(sent.number, code), (result) => void finishAuth(result, refresh));
  }
  const changed = !!sent && digits(phone) !== sent.number;

  return <Page title="휴대폰 번호로 시작" demo={false}>
    <View style={styles.intro}>
      <Text accessibilityRole="header" style={styles.title}>휴대폰 번호를 알려 주세요</Text>
    </View>

    <FormField label="휴대폰 번호" value={formatPhone(phone)} onChangeText={(value) => setPhone(digits(value))}
      keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="010-0000-0000" maxLength={13} />
    {(!sent || changed) && <AppButton label="인증번호 받기" variant="primary" disabled={!validPhone(phone)} loading={send.pending} onPress={requestCode} />}
    <ErrorNotice message={send.error} />

    {sent && !changed && <View style={styles.codeBlock}>
      {sent.devCode && <View style={styles.devNote}>
        <Text style={styles.devTitle}>시연용 인증번호 {sent.devCode}</Text>
      </View>}
      <FormField label="인증번호 6자리" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode" maxLength={6} placeholder="000000"
        error={expiresIn === 0 ? '인증번호가 만료됐어요. 다시 받아 주세요.' : undefined} />
      <View style={styles.row}>
        <Text style={[styles.timer, expiresIn <= 30 && styles.timerUrgent]}>{expiresIn > 0 ? `${mmss(expiresIn)} 남음` : '만료됨'}</Text>
        <Pressable accessibilityRole="button" disabled={resendIn > 0 || send.pending} onPress={requestCode} hitSlop={8}>
          <Text style={[styles.resend, resendIn > 0 && styles.resendOff]}>{resendIn > 0 ? `${resendIn}초 뒤 다시 받기` : '인증번호 다시 받기'}</Text>
        </Pressable>
      </View>
      <AppButton label="확인" variant="primary" disabled={code.length !== 6 || expiresIn === 0} loading={verify.pending} onPress={submitCode} />
      <ErrorNotice message={verify.error} />
    </View>}
  </Page>;
}

const styles = StyleSheet.create({
  intro: { gap: AppSpacing.sm, paddingTop: AppSpacing.sm },
  title: { ...AppTypography.title, fontSize: 24, lineHeight: 32, color: AppColors.text },
  codeBlock: { gap: AppSpacing.md, paddingTop: AppSpacing.sm },
  devNote: { gap: 4, padding: 14, borderRadius: 14, backgroundColor: AppColors.soft },
  devTitle: { ...AppTypography.label, fontSize: 15, fontWeight: '700', color: AppColors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timer: { ...AppTypography.caption, fontSize: 14, fontWeight: '600', color: AppColors.textSecondary },
  timerUrgent: { color: AppColors.danger },
  resend: { ...AppTypography.caption, fontSize: 14, fontWeight: '600', color: AppColors.text, textDecorationLine: 'underline' },
  resendOff: { color: AppColors.textFaint, textDecorationLine: 'none' },
});
