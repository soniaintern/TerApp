import apiClient, { uploadMultipart } from './client';
import { appendFormFile, FormFilePart } from '../utils/formFile';

/**
 * DG advances — raised and paid on the TER portal (web). In the app the
 * employee sees the advances paid to them and uploads invoices against each
 * one. The L1 supervisor (Requested By) checks those bills in the app, then the
 * maker verifies them on the portal — only then do they count in the knock-off.
 */

export type DgPayStatus = 'processing' | 'sent' | 'paid';
export type DgKnockOffState = 'unpaid' | 'pending' | 'partial' | 'carry' | 'settled' | 'bal_due' | 'bal_queued';
// pending = with L1 supervisor, l1_verified = with maker
export type DgInvoiceStatus = 'pending' | 'l1_verified' | 'verified' | 'rejected';

export interface DgCarry {
  req_no: string | null;
  amount: number;
}

export interface DgInvoice {
  id: number;
  invoice_no: string;
  invoice_date: string | null;
  amount: number;
  status: DgInvoiceStatus;
  status_label: string;
  reject_reason: string | null;
  uploaded_from: 'app' | 'web';
  uploaded_at: string | null;
  files: { name: string; url: string | null }[];
  // supervisor view only: this bill is waiting for your L1 check
  can_check?: boolean;
}

export interface DgAdvance {
  id: number;
  unid: string | null;
  req_no: string;
  activity_type: string;
  activity_name: string;
  request_date: string | null;
  requested_by: string | null;
  po_no: string | null;
  request_status: string;
  amount: number;
  payment: {
    status: DgPayStatus;
    label: string;
    amount_paid: number;
    utr: string | null;
    paid_on: string | null;
  };
  carried_in: DgCarry[];
  carried_out: DgCarry[];
  knock_off: {
    state: DgKnockOffState;
    label: string;
    advance: number;
    verified: number;
    awaiting_verification: number;
    carried_out: number;
    balance_paid: number;
    // > 0 still to cover with invoices; < 0 spent more than the advance
    balance: number;
  };
  can_upload: boolean;
  invoice_counts: DgInvoiceCounts;
  invoices?: DgInvoice[];
}

export interface DgInvoiceCounts {
  pending: number;
  l1_verified: number;
  verified: number;
  rejected: number;
}

export interface DgAdvanceSummary {
  count: number;
  to_knock_off: number;
  awaiting_verification: number;
}

/** A request raised on the portal with this supervisor as "Requested By". */
export interface DgTeamRequest {
  id: number;
  req_no: string;
  activity_type: string;
  activity_name: string;
  request_date: string | null;
  po_no: string | null;
  po_amount: number | null;
  status: 'pending' | 'approved' | 'paid' | 'closed' | 'rejected';
  status_label: string;
  reject_reason: string | null;
  total: number;
  employees: number;
  paid_employees: number;
  verified: number;
  awaiting_verification: number;
  to_knock_off: number;
  invoice_counts: DgInvoiceCounts;
  lines?: (DgAdvance & { emp_code: string; emp_name: string; state: string | null })[];
}

export interface DgInvoiceDraft {
  invoice_no: string;
  invoice_date: string; // yyyy-mm-dd
  amount: string;
  files: FormFilePart[];
}

export interface DgInvoiceAmounts {
  advanceCents: number;
  uploadedCents: number;
  remainingCents: number;
}

export const dgAmountToCents = (amount: number | string | null | undefined): number => {
  const parsed = Number(amount);
  return Number.isFinite(parsed)
    ? Math.round((parsed + Number.EPSILON * Math.max(1, Math.abs(parsed))) * 100)
    : 0;
};

/** Totals for one advance only; rejected invoices do not consume its balance. */
export function getDgInvoiceAmounts(advance: DgAdvance): DgInvoiceAmounts {
  const advanceCents = Math.max(0, dgAmountToCents(advance.knock_off?.advance ?? advance.amount));
  const aggregateCents = Math.max(0, dgAmountToCents(advance.knock_off?.verified))
    + Math.max(0, dgAmountToCents(advance.knock_off?.awaiting_verification));
  let listedCents = 0;

  if (Array.isArray(advance.invoices)) {
    const seen = new Set<number>();
    for (const invoice of advance.invoices) {
      if (seen.has(invoice.id)) continue;
      seen.add(invoice.id);
      if (invoice.status === 'pending' || invoice.status === 'l1_verified' || invoice.status === 'verified') {
        listedCents += Math.max(0, dgAmountToCents(invoice.amount));
      }
    }
  }

  // The invoice list is the primary source; the existing knock-off aggregates
  // protect against a partial invoice list response without adding both totals.
  const uploadedCents = Math.max(listedCents, aggregateCents);
  return {
    advanceCents,
    uploadedCents,
    remainingCents: Math.max(0, advanceCents - uploadedCents),
  };
}

export const dgApi = {
  async myAdvances(): Promise<{ advances: DgAdvance[]; summary: DgAdvanceSummary }> {
    const res = await apiClient.get('api/dg-requests/my-advances');
    const d = res.data?.data ?? {};
    return {
      advances: Array.isArray(d.advances) ? d.advances : [],
      summary: d.summary ?? { count: 0, to_knock_off: 0, awaiting_verification: 0 },
    };
  },

  async advance(id: number): Promise<DgAdvance> {
    const res = await apiClient.get(`api/dg-requests/my-advances/${id}`);
    return res.data?.data;
  },

  /** Supervisor: requests raised with them as "Requested By" (read-only). */
  async raisedByMe(): Promise<{ requests: DgTeamRequest[]; summary: { count: number; awaiting_verification: number } }> {
    const res = await apiClient.get('api/dg-requests/raised-by-me');
    const d = res.data?.data ?? {};
    return {
      requests: Array.isArray(d.requests) ? d.requests : [],
      summary: d.summary ?? { count: 0, awaiting_verification: 0 },
    };
  },

  async raisedByMeDetail(id: number): Promise<DgTeamRequest> {
    const res = await apiClient.get(`api/dg-requests/raised-by-me/${id}`);
    return res.data?.data;
  },

  /** L1 check passed — the bill goes to the maker. Returns the refreshed request. */
  async l1VerifyInvoice(requestId: number, invoiceId: number) {
    const res = await apiClient.post(`api/dg-requests/raised-by-me/${requestId}/invoices/${invoiceId}/verify`);
    return res.data;
  },

  async l1RejectInvoice(requestId: number, invoiceId: number, reason: string) {
    const res = await apiClient.post(`api/dg-requests/raised-by-me/${requestId}/invoices/${invoiceId}/reject`, { reason });
    return res.data;
  },

  /** Multipart: items[i][invoice_no|invoice_date|amount], items[i][files][] */
  async uploadInvoices(id: number, items: DgInvoiceDraft[]) {
    const form = new FormData();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      form.append(`items[${i}][invoice_no]`, it.invoice_no.trim());
      form.append(`items[${i}][invoice_date]`, it.invoice_date);
      form.append(`items[${i}][amount]`, it.amount);
      for (const f of it.files) {
        await appendFormFile(form, `items[${i}][files][]`, f);
      }
    }
    // Native fetch multipart — axios + RN FormData can stringify the file part.
    return uploadMultipart(`api/dg-requests/my-advances/${id}/invoices`, form);
  },
};

/** Colour per knock-off state, shared by the list and detail screens. */
export const DG_STATE_COLOR: Record<DgKnockOffState, string> = {
  unpaid: '#4338CA',
  pending: '#B45309',
  partial: '#9A3412',
  carry: '#1D4ED8',
  settled: '#065F46',
  bal_due: '#7C3AED',
  bal_queued: '#7C3AED',
};

export const DG_REQUEST_COLOR: Record<DgTeamRequest['status'], string> = {
  pending: '#B45309',
  approved: '#4338CA',
  paid: '#9A3412',
  closed: '#065F46',
  rejected: '#991B1B',
};

export const DG_INVOICE_COLOR: Record<DgInvoiceStatus, string> = {
  pending: '#B45309',
  l1_verified: '#4338CA',
  verified: '#065F46',
  rejected: '#991B1B',
};

export const fmtInr = (v: any) =>
  '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Employee-facing one-liner for where an advance stands. */
export function dgStatusText(a: DgAdvance): string {
  const k = a.knock_off;
  if (a.payment.status !== 'paid') return a.payment.label;
  switch (k.state) {
    case 'pending': return `Upload invoices for ${fmtInr(k.balance)}`;
    case 'partial': return `${fmtInr(k.balance)} still to knock off`;
    case 'carry': return `${fmtInr(k.balance)} will be adjusted in your next advance`;
    case 'settled': return 'Fully knocked off';
    case 'bal_due': return `${fmtInr(-k.balance)} extra spent — to be paid to you`;
    case 'bal_queued': return 'Extra amount payment in process';
    default: return k.label;
  }
}
