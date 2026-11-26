export type PlanCode = 'FLEXIBLE' | 'NON_REFUNDABLE';
export type FeeRule = 'FIRST_NIGHT' | 'FULL' | 'NONE';
export type Policy = {
  code: PlanCode;
  discountPercent: number;
  freeCancellationHours: number | null;
  lateFee: string;
  noShowFee: string;
  active: boolean;
};
export function defaultPolicy(code: PlanCode): Policy {
  return { code, discountPercent: code === 'FLEXIBLE' ? 0 : 10, freeCancellationHours: code === 'FLEXIBLE' ? 48 : null, lateFee: code === 'FLEXIBLE' ? 'FIRST_NIGHT' : 'FULL', noShowFee: code === 'FLEXIBLE' ? 'FIRST_NIGHT' : 'FULL', active: true };
}
export function bookedPolicy(code: PlanCode, snapshot: unknown): Policy {
  return snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot as Policy : defaultPolicy(code);
}
export function resolveNight(date: Date, base: number, weekend: {
  enabled: boolean;
  surchargeVnd: number;
}, override?: number) {
  const weekendApplies = weekend.enabled && [0, 6].includes(date.getUTCDay());
  return { raw: override ?? (base + (weekendApplies ? weekend.surchargeVnd : 0)), source: override !== undefined ? 'SPECIAL' : weekendApplies ? 'WEEKEND' : 'BASE' };
}
export function planAmount(raw: number, policy: Policy) { return Math.round(raw * (100 - policy.discountPercent) / 100); }
export function feeAmount(rule: string, firstNight: number, obligation: number) {
  return rule === 'FULL' ? obligation : rule === 'FIRST_NIGHT' ? Math.min(firstNight, obligation) : 0;
}
export function policyFingerprint(p: Policy) { return JSON.stringify([p.code, p.discountPercent, p.freeCancellationHours, p.lateFee, p.noShowFee, p.active]); }
