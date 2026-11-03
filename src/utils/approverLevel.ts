// Approver role resolution for dedicated L1/L2 approvers.
//
// Approvers are onboarded as employees with a designation that marks their
// approval level, e.g. "Supervisor L1" or "Supervisor L2". The app uses this
// to show only the queues that belong to the user:
//   l1   → L1 card/queue only
//   l2   → L2 card/queue only
//   both → no level marker found (or ambiguous) — keep the old behaviour of
//          showing both queues (safe fallback for existing supervisors).

export type ApproverLevel = 'l1' | 'l2' | 'both';

export function approverLevelFromDesignation(designation?: string | null): ApproverLevel {
  const d = (designation || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const hasL1 = d.includes('l1');
  const hasL2 = d.includes('l2');
  if (hasL1 && !hasL2) return 'l1';
  if (hasL2 && !hasL1) return 'l2';
  return 'both';
}
