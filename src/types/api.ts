// API Response Types

export interface LoginResponse {
  status: string;
  message: string;
  statuscode: number;
  data: string;
}

export interface ExpenseCategory {
  id: number;
  head_name: string;
}

export interface UserData {
  id: number;
  name: string;
  employee_id: string;
  ax_id: string;
  iag_code: string;
  telephone_no: string;
  designation: string;
  pfu: string;
  grade: string;
  location: string;
  status: string;
  personal_email_id: string;
  // 'd-M-Y' from the API. Drives pro-rated limits and, in the app, whether a
  // period before this one is claimable at all.
  date_of_joining?: string | null;
  // nullable: only resigned employees have an exit date
  last_working_date: string | null;
  account_number: string;
  bank_name: string;
  beneficiary_name: string;
  ifsc: string;
  token?: string;
  // supervisor context (from verify-otp / profile)
  role?: string;
  is_supervisor?: number;
  supervisor?: { id: number; name: string } | null;
  team_members_count?: number;
  // DG Advance module context
  can_process_dg_advance?: boolean;
  // Per-company enforcement mode: 'A' block at add | 'B' block at submit | 'C' flag only
  enforcement_mode?: string;
  // Per-unit feature toggles: which cards to show (Travel Plan / DG Advance)
  features?: { travel_plan_enabled?: boolean; dg_advance_enabled?: boolean };
}

export interface VerifyOtpResponse {
  status: string;
  message: string;
  statuscode: number;
  data: {
    user: UserData;
    token: string;
    expense_category: ExpenseCategory[];
  };
}

export interface ProfileResponse {
  user: UserData;
}

export interface ExpenseLimitItem {
  category_id: number;
  head_name: string;
  is_da?: number;
  is_cf: number | null;
  limit_amount: number | string;
  bill_count: number;
  claimed_amount: number;
  // Yearly limits (limit_period = 'Y', e.g. lodging 50 nights/year)
  limit_period?: 'M' | 'Y' | string | null;
  max_days?: number | string | null;
  fy_used_amount?: number | null;
  fy_used_days?: number | null;
}

export interface PaidTo {
  acc_no: string;
  bank_name: string;
  account_holder: string;
  ifsc_code: string;
}

export interface BillItem {
  id: number;
  expense_categories_id: number;
  sender_details_id: number;
  bill_no: string;
  bill_amount: string;
  claimed_amount: string;
  from_date: string;
  to_date: string;
  vendor_name: string;
  attachment: string | null;
  remarks?: string | null; // DA bills: exact marked days, e.g. "1,3,5,6"
  // set by finance on approval — drives the claimed/approved swap on Track
  approved_amount?: string | null;
  approved_amount_date?: string | null;
  status: number;
  unid: number | null;
}

export interface ExpenseLimitDataItem {
  unid: number | null;
  status: string | null;
  is_da?: number; // 1 = Daily Allowance category (day-marker form)
  // pre-UNID submission state: none | pending_l1 | pending_l2 | returned
  submission_status?: string | null;
  reject_reason?: string | null;
  final_payable_amount: string | null;
  claimed_amount: string | null;
  approved_amount: string | null;
  paid_date: string | null;
  utr_no: string | null;
  late_fine_deductions: string | null;
  paid_to: PaidTo;
  date: string | null;
  expense_limit_data: ExpenseLimitItem[];
  bill_item: BillItem[];
}

export interface ExpenseLimitDataResponse {
  status: string;
  message: string;
  statuscode: number;
  data: ExpenseLimitDataItem[];
  emp_data: {
    // nullable: only resigned employees have an exit date
  last_working_date: string | null;
    status: string;
  };
}

export interface TrackDataItem {
  unid: number | null;
  status: string | null;
  final_payable_amount: string | null;
  claimed_amount: string | null;
  approved_amount: string | null;
  paid_date: string | null;
  utr_no: string | null;
  late_fine_deductions: string | null;
  paid_to: PaidTo;
  date: string | null;
  // the track payload (api/expense-limit-data) carries these too — needed for the
  // category-wise invoice breakdown on the track detail screen
  expense_limit_data?: ExpenseLimitItem[];
  bill_item?: BillItem[];
}

export interface TrackDataResponse {
  status: string;
  message: string;
  statuscode: number;
  data: TrackDataItem[];
}

export interface GenerateUnidResponse {
  status: string;
  message: string;
  statuscode: number;
  data: {
    unid: number;
  };
}

export interface FetchBillsResponse {
  status: string;
  message: string;
  statuscode: number;
  data: BillItem[];
}

export interface DeleteBillResponse {
  status: string;
  message: string;
  statuscode: number;
}

export interface CreateBillResponse {
  status: string;
  message: string;
  statuscode: number;
  data: string;
}

// ---- Supervisor approval flow (P4/P5) ----

export interface SubmitForApprovalResponse {
  status: string;
  message: string;
  statuscode: number;
  data: { submission_status: string };
}

export interface SupervisorClaim {
  sender_id: number;
  employee_name: string;
  employee_id: string;
  designation: string | null;
  pfu: string | null;
  month: string;
  from_date: string;
  to_date: string;
  total_claimed_amount: number;
  bill_count: number;
  pending_days: number;
  approval_level?: 'l1' | 'l2';
}

export interface SupervisorReviewItem {
  id: number;
  // Needed to pull the invoice breakdown for this review.
  sender_details_id: number;
  employee_id: string | null;
  employee_name: string | null;
  period: [string, string];
  amount: number;
  // Period total after any supervisor reduction (falls back to claimed when untouched).
  approved_amount?: number | null;
  action: 'approve' | 'reject' | 'resubmitted';
  level: 'l1' | 'l2' | null;
  reason: string | null;
  unid: number | null;
  acted_at: string | null;
}

export interface SupervisorReviewsResponse {
  status: string;
  message: string;
  statuscode: number;
  data: {
    kpis: { approved: number; rejected: number; resubmitted: number; total: number };
    reviews: SupervisorReviewItem[];
    // Echoed back so the screen can tell "no results" from "unknown employee code".
    filter?: {
      employee_code: string | null;
      employee_name: string | null;
      month: number | null;
      year: number | null;
    };
  };
}

export interface SupervisorClaimsResponse {
  status: string;
  message: string;
  statuscode: number;
  data: SupervisorClaim[];
}

export interface ClaimReviewBill extends BillItem {
  category_name?: string | null;
  attachment_url?: string | null;
}

export interface ClaimReviewLastReview {
  action: 'approve' | 'reject';
  reason: string | null;
  reviewed_at: string | null;
}

export interface SupervisorClaimDetailResponse {
  status: string;
  message: string;
  statuscode: number;
  data: {
    employee: {
      sender_id: number;
      name: string;
      employee_id: string;
      designation: string | null;
      pfu: string | null;
      location: string | null;
    };
    period: { from_date: string; to_date: string };
    total_claimed_amount: number;
    bills: ClaimReviewBill[];
    last_review: ClaimReviewLastReview | null;
  };
}

export interface SupervisorActionResponse {
  status: string;
  message: string;
  statuscode: number;
  data: any;
}

export interface TeamMember {
  id: number;
  name: string;
  employee_id: string;
  designation: string | null;
  pfu: string | null;
  location: string | null;
}

export interface TeamMembersResponse {
  status: string;
  message: string;
  statuscode: number;
  data: TeamMember[];
}

// ---- Travel Plan (P6-P7) ----

export interface TravelPlanItem {
  type?: 'travel' | 'stay';
  date: string;
  // travel
  from?: string;
  to?: string;
  mode?: string;
  km?: number | null;
  fare?: number | null;
  // stay
  hotel_name?: string;
  check_out?: string;
  purpose?: string | null;
  estimate: number;
}

export interface TravelPlan {
  plan_id: number;
  plan_month: number;
  plan_year: number;
  status: number;
  status_label: string;
  items: TravelPlanItem[];
  reject_reason: string | null;
  return_remarks: string | null;
  submitted_at: string | null;
  supervisor: { id: number; name: string } | null;
}

export interface TravelPlansResponse {
  status: string;
  message: string;
  statuscode: number;
  data: TravelPlan[];
}

export interface TravelPlanResponse {
  status: string;
  message: string;
  statuscode: number;
  data: TravelPlan;
}

export interface TravelPlanConfigResponse {
  status: string;
  message: string;
  statuscode: number;
  data: { submit_day: number };
}

export interface SupervisorTravelPlan {
  plan_id: number;
  sender_id: number;
  employee_name: string;
  employee_id: string;
  designation: string | null;
  pfu: string | null;
  plan_month: number;
  plan_year: number;
  month: string;
  item_count: number;
  total_estimate: number;
  submitted_at: string | null;
  pending_days: number;
}

export interface SupervisorTravelPlansResponse {
  status: string;
  message: string;
  statuscode: number;
  data: SupervisorTravelPlan[];
}
