// Shared invoice (bill item) status vocabulary — used by the TER detail screen
// and the Track detail screen so the same invoice never shows two different
// labels. Codes come from the API's BillItem.status.
export const BILL_STATUS: Record<number, { label: string; bg: string; fg: string }> = {
  1: { label: 'Draft', bg: '#F1F5F9', fg: '#475569' },
  5: { label: 'Pending L1', bg: '#FEF3C7', fg: '#92400E' },
  6: { label: 'Pending L2', bg: '#FEF3C7', fg: '#92400E' },
  2: { label: 'Processing', bg: '#D9EEF5', fg: '#125A79' },
  3: { label: 'Sent to Accounts', bg: '#E0F7F5', fg: '#0B6B5B' },
  14: { label: 'Received', bg: '#E0F7F5', fg: '#0B6B5B' },
  4: { label: 'Paid', bg: '#D1FAE5', fg: '#065F46' },
};

export const billStatus = (s: number | undefined) =>
  s !== undefined ? BILL_STATUS[s] : undefined;
