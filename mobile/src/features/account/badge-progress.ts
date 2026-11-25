type BadgeProgress = { nextBadge: string; remaining: string } | { nextBadge: null; remaining: '0' };

// 표시 계산에서도 서버의 소수 6자리 점수를 이진 부동소수점으로 반올림하지 않습니다.
export function badgeProgress(credit: number | string | undefined): BadgeProgress | null {
  const value = typeof credit === 'number' && Number.isFinite(credit) ? credit.toFixed(6) : credit;
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,6})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const score = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
  if (score > 100_000_000n) return null;
  const next = score < 40_000_000n ? { threshold: 40_000_000n, name: '관점 탐험가' }
    : score < 55_000_000n ? { threshold: 55_000_000n, name: '생각 연결자' } : null;
  if (!next) return { nextBadge: null, remaining: '0' };
  const remaining = next.threshold - score;
  const decimals = (remaining % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return { nextBadge: next.name, remaining: `${remaining / 1_000_000n}${decimals ? `.${decimals}` : ''}` };
}
