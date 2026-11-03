import apiClient from './client';
import type {
  ExpenseLimitDataResponse,
  GenerateUnidResponse,
  FetchBillsResponse,
  DeleteBillResponse,
  SubmitForApprovalResponse,
  SupervisorClaimsResponse,
  SupervisorClaimDetailResponse,
  SupervisorActionResponse,
  SupervisorReviewsResponse,
  TeamMembersResponse,
  TravelPlansResponse,
  TravelPlanResponse,
  TravelPlanConfigResponse,
  SupervisorTravelPlansResponse,
} from '../types/api';

export const terApi = {
  getExpenseLimitData: (fromDate?: string, toDate?: string) =>
    apiClient.post<ExpenseLimitDataResponse>('api/expense-limit-data', null, {
      params: { from_date: fromDate, to_date: toDate },
    }),

  generateUnid: (fromDate: string, toDate: string) =>
    apiClient.post<GenerateUnidResponse>('api/unid-generate', {
      from_date: fromDate,
      to_date: toDate,
    }),

  fetchBills: (fromDate: string, toDate: string, categoryId?: string) =>
    apiClient.get<FetchBillsResponse>('api/fetch-bills', {
      params: { from_date: fromDate, to_date: toDate, category_id: categoryId },
    }),

  deleteBill: (id: number) =>
    apiClient.post<DeleteBillResponse>('api/delete-billItem', null, {
      params: { id },
    }),

  // ---- P4: pre-UNID submission flow ----

  submitForApproval: (fromDate: string, toDate: string) =>
    apiClient.post<SubmitForApprovalResponse>('api/submit-for-approval', {
      from_date: fromDate,
      to_date: toDate,
    }),

  resubmit: (fromDate: string, toDate: string) =>
    apiClient.post<SubmitForApprovalResponse>('api/employee/resubmit', {
      from_date: fromDate,
      to_date: toDate,
    }),

  // ---- P5: supervisor endpoints ----

  supervisorClaims: (level: 'l1' | 'l2' = 'l1') =>
    apiClient.get<SupervisorClaimsResponse>('api/supervisor/claims', {
      params: { level },
    }),

  supervisorClaimDetail: (senderId: number, fromDate: string, toDate: string) =>
    apiClient.get<SupervisorClaimDetailResponse>('api/supervisor/claim-detail', {
      params: { sender_id: senderId, from_date: fromDate, to_date: toDate },
    }),

  // approvedAmounts: { [billId]: amount } — only the invoices the supervisor edited.
  // The server caps each one at that invoice's claimed amount.
  supervisorApprove: (
    senderId: number,
    fromDate: string,
    toDate: string,
    comment?: string,
    forwardToL2?: boolean,
    approvedAmounts?: Record<number, number>,
  ) =>
    apiClient.post<SupervisorActionResponse>('api/supervisor/approve', {
      sender_id: senderId,
      from_date: fromDate,
      to_date: toDate,
      comment,
      ...(forwardToL2 ? { forward_to_l2: true } : {}),
      ...(approvedAmounts && Object.keys(approvedAmounts).length
        ? { approved_amounts: approvedAmounts }
        : {}),
    }),

  // employeeCode is the code the supervisor typed; the server resolves it against
  // sender_details. month/year filter the CLAIM period, not when the action was taken.
  supervisorReviews: (
    action?: 'approve' | 'reject',
    employeeCode?: string,
    month?: number,
    year?: number,
  ) =>
    apiClient.get<SupervisorReviewsResponse>('api/supervisor/reviews', {
      params: {
        ...(action ? { action } : {}),
        ...(employeeCode && employeeCode.trim() ? { employee_code: employeeCode.trim() } : {}),
        ...(month ? { month } : {}),
        ...(year ? { year } : {}),
      },
    }),

  supervisorReject: (senderId: number, fromDate: string, toDate: string, reason: string, categories?: number[]) =>
    apiClient.post<SupervisorActionResponse>('api/supervisor/reject', {
      sender_id: senderId,
      from_date: fromDate,
      to_date: toDate,
      reason,
      ...(categories && categories.length ? { categories } : {}),
    }),

  supervisorTeamMembers: () =>
    apiClient.get<TeamMembersResponse>('api/supervisor/team-members'),

  // ---- P6: travel plan ----

  travelPlanSubmit: (plan: { plan_month: number; plan_year: number; items: any[] }) =>
    apiClient.post<TravelPlanResponse>('api/travel-plan/submit', plan),

  travelPlanMyPlans: () =>
    apiClient.get<TravelPlansResponse>('api/travel-plan/my-plans'),

  travelPlanDetail: (planId: number) =>
    apiClient.get<TravelPlanResponse>('api/travel-plan/detail', { params: { plan_id: planId } }),

  travelPlanResubmit: (planId: number, items?: any[]) =>
    apiClient.post<TravelPlanResponse>('api/travel-plan/resubmit', { plan_id: planId, items }),

  travelPlanConfig: () =>
    apiClient.get<TravelPlanConfigResponse>('api/travel-plan/config'),

  supervisorTravelPlans: () =>
    apiClient.get<SupervisorTravelPlansResponse>('api/supervisor/travel-plans'),

  supervisorTravelPlanApprove: (planId: number) =>
    apiClient.post<SupervisorActionResponse>('api/supervisor/travel-plan/approve', { plan_id: planId }),

  supervisorTravelPlanReject: (planId: number, remarks: string) =>
    apiClient.post<SupervisorActionResponse>('api/supervisor/travel-plan/reject', { plan_id: planId, remarks }),

  supervisorTravelPlanReturn: (planId: number, remarks: string) =>
    apiClient.post<SupervisorActionResponse>('api/supervisor/travel-plan/return-for-modification', { plan_id: planId, remarks }),
};
