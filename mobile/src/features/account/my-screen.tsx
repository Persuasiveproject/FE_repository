import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { AppButton } from '@/components/ui/app-button';
import { ErrorNotice } from '@/components/ui/content-blocks';
import { Icon } from '@/components/ui/icon';
import { AvatarStack } from '@/components/ui/stance';
import { AppColors, AppSpacing, AppTypography } from '@/constants/theme';
import { useSession } from '@/features/session/session-provider';
import { useMutation } from '@/hooks/use-mutation';
import { dataSource, gateway } from '@/services/gateway';
import { creditLabel } from '@/types/core';

// B안 마이: 프로필 한 줄 + 숫자 묶음 + 구분선 메뉴. 버튼을 세로로 쌓지 않는다.
function MenuRow({ label, value, onPress, disabled }: { label: string; value?: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.menu, (pressed || disabled) && styles.dim]}>
    <Text style={styles.menuLabel}>{label}</Text>
    <View style={styles.menuRight}>
      {!!value && <Text style={styles.menuValue}>{value}</Text>}
      <Icon name="right" size={18} color={AppColors.textFaint} />
    </View>
  </Pressable>;
}

export default function MyScreen() {
  const { profile, refresh } = useSession();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const mutation = useMutation();
  return <Page title="마이" back={false} tab demo={false}><RequireSession>
    <View style={styles.profile}>
      <AvatarStack numbers={[1, 3, 2]} size={44} />
      <View style={styles.profileText}>
        <Text accessibilityRole="header" style={styles.name}>{profile?.nickname}</Text>
        <Text style={styles.sub}>토론마다 새 캐릭터로 참여해요</Text>
      </View>
    </View>
    <View style={styles.stats}>
      <View style={styles.stat}><Text style={styles.statNumber}>{creditLabel(profile?.credit)}</Text><Text style={styles.statLabel}>크레딧</Text></View>
      <View style={styles.stat}><Text style={styles.statNumber}>{profile?.coins == null ? '-' : profile.coins.toLocaleString()}</Text><Text style={styles.statLabel}>코인</Text></View>
      <View style={styles.stat}><Text style={styles.statNumber} numberOfLines={1}>{profile?.badge || '-'}</Text><Text style={styles.statLabel}>배지</Text></View>
    </View>
    <View>
      <MenuRow label="참여한 토론" onPress={() => router.navigate('/joined')} />
      <MenuRow label="크레딧과 배지" onPress={() => router.navigate('/account/credits')} />
      <MenuRow label="코인 사용 내역" disabled={dataSource === 'api'} onPress={() => router.navigate('/account/coins')} />
      {dataSource === 'api' && <>
        <MenuRow label="알림" onPress={() => router.navigate('/account/notifications')} />
        <MenuRow label="저장한 초안" onPress={() => router.navigate('/discussions/drafts')} />
      </>}
      <MenuRow label="프로필과 관심 주제 수정" disabled={dataSource === 'api'} onPress={() => router.navigate('/account/profile')} />
      <MenuRow label={confirmLogout ? '로그아웃 취소' : '로그아웃'} onPress={() => setConfirmLogout(!confirmLogout)} />
    </View>
    {confirmLogout && <AppButton label="로그아웃 확인" variant="primary" loading={mutation.pending}
      onPress={() => void mutation.run(async () => { await gateway.signOut(); await refresh(); }, () => router.replace('/'))} />}
    <ErrorNotice message={mutation.error} />
    <Text style={styles.foot}>{dataSource === 'api' ? '시연 계정 · 실제 서버 인증' : '데모 프로필 · 실제 본인 확인 전'}</Text>
  </RequireSession></Page>;
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: AppSpacing.md + 2 },
  profileText: { flex: 1, gap: 2 },
  name: { ...AppTypography.heading, color: AppColors.text },
  sub: { ...AppTypography.caption, color: AppColors.textSecondary },
  stats: { flexDirection: 'row', paddingVertical: AppSpacing.lg, borderRadius: 20, borderWidth: 1.5, borderColor: AppColors.border },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: AppSpacing.xs },
  statNumber: { ...AppTypography.number, fontSize: 22, lineHeight: 28, color: AppColors.text },
  statLabel: { ...AppTypography.caption, color: AppColors.textSecondary },
  menu: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56,
    borderBottomWidth: 1, borderBottomColor: AppColors.border },
  menuLabel: { ...AppTypography.body, fontSize: 16, color: AppColors.text },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  menuValue: { ...AppTypography.label, fontSize: 16, color: AppColors.text },
  foot: { ...AppTypography.caption, color: AppColors.textFaint },
  dim: { opacity: 0.45 },
});
