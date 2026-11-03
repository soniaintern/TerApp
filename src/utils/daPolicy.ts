export interface DaPolicyInput {
  unit?: string | null;
  designation?: string | null;
  categoryName?: string | null;
  limitAmount?: number | string | null;
  maxDays?: number | string | null;
  periodDays: number;
}

export interface DaPolicy {
  dailyRate: number | null;
  monthlyLimit: number | null;
  maxDays: number;
  configured: boolean;
}

const D2F_MONTH_DAYS = 30;

export function calculateDaClaimAmount(policy: DaPolicy, days: number): number {
  const amount = policy.monthlyLimit !== null
    ? (policy.monthlyLimit * days) / D2F_MONTH_DAYS
    : (policy.dailyRate ?? 0) * days;
  return Math.round(amount * 100) / 100;
}

export function resolveDaPolicy({
  unit,
  designation,
  categoryName,
  limitAmount,
  maxDays,
  periodDays,
}: DaPolicyInput): DaPolicy {
  if (String(unit || '').trim().toUpperCase() === 'D2F') {
    const configuredMonthlyLimit = Number(limitAmount);
    const configuredDays = Number(maxDays);
    const configuredDayCap = Math.floor(configuredDays);
    const hasConfiguredDayCap = maxDays !== null
      && maxDays !== undefined
      && String(maxDays).trim() !== '';
    const isMonthlyLimitValid = Number.isFinite(configuredMonthlyLimit) && configuredMonthlyLimit > 0;
    const dailyRate = isMonthlyLimitValid
      ? configuredMonthlyLimit / D2F_MONTH_DAYS
      : null;
    const monthlyDayCap = dailyRate !== null
      ? Math.floor(configuredMonthlyLimit / dailyRate)
      : periodDays;
    const configuredDayLimit = hasConfiguredDayCap && Number.isFinite(configuredDayCap)
      ? Math.max(0, configuredDayCap)
      : periodDays;
    return {
      dailyRate,
      monthlyLimit: isMonthlyLimitValid ? configuredMonthlyLimit : null,
      maxDays: Math.min(configuredDayLimit, periodDays, monthlyDayCap),
      configured: dailyRate !== null,
    };
  }

  const name = String(categoryName || '').toLowerCase();
  const designationName = String(designation || '').toLowerCase();
  let dailyRate = 175;
  if (name.includes('local market')) dailyRate = 150;
  else if (name.includes('out of hq')) dailyRate = 175;
  else if (designationName.includes('dgo') || designationName.includes('co')) dailyRate = 300;

  return {
    dailyRate,
    monthlyLimit: null,
    maxDays: Math.min(26, periodDays),
    configured: true,
  };
}
