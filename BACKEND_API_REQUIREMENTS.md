# TER Backend (Laravel) — API & Admin Requirements — Supervisor Module

Requirements and current implementation status for the Laravel backend powering the TER mobile app, focused on the supervisor approval flow and the admin features that support it.

**Status legend**
- ✅ **Done** — implemented in the canonical branch `ter-indofil` (local XAMPP: `/Applications/XAMPP/xamppfiles/htdocs/projects/ter`)
- 🚧 **Done in code, deploy pending** — implemented locally but the live server (`https://ternew.etsbeta.com/`) still runs older code
- ⬜ **Pending** — not yet built

> ⚠️ **Deployment status:** the live server is running code from before the 2026-08-04 supervisor work (per the backup `ter-terfinfect_live`, zipped Aug 3). Deploying `ter-indofil` to live is the single highest-priority pending item — until then the supervisor APIs and the OTP fix are not active in production.

---

## 1. Workflow context (why these requirements exist)

**Old flow:** employee submits bills → UNID generated immediately (tercouriers status 14) → existing pipeline.

**New flow (per business):** employee submits → bills locked (status 5, *pending supervisor*) → supervisor approves → **only then** UNID generated server-side (tercouriers status 14, unchanged) → existing pipeline. Rejection returns bills to status 1 (editable) → employee rectifies → resubmits (back to 5).

- No new `tercouriers` statuses. Pre-UNID state lives on `bill_items.status = 5` (0 deleted, 1 active, 2 UNID-linked, 4 F&F, 5 pending supervisor).
- No `tercouriers` row exists before approval → no UNID before approval.

---

## 2. Database changes

| Change | Status | Details |
|---|---|---|
| `sender_details.is_supervisor` tinyint default 0 | ✅ | Migration `2026_08_04_000001` — flags supervisors (gates app's Supervisor tab) |
| `sender_details.supervisor_id` nullable self-FK | ✅ | Migration `2026_08_04_000001` — employee → primary supervisor (`ON DELETE SET NULL`) |
| `supervisor_reviews` table | ✅ | Migration `2026_08_04_000002` — audit + reject reason: `sender_details_id`, `supervisor_id`, `for_month/year`, `from_date/to_date`, `action` (approve/reject), `reason`, `ter_id` |
| `supervisor_reviews.ter_id` FK → tercouriers | ✅ | Migration `2026_08_04_000003` — filled on approval (the generated UNID) |
| `unit_masters.company_id` | ✅ | Migration `2026_08_04_000004` — multi-company scoping (INDOFIL) |
| `travel_plans` table | ⬜ | **Next module to build** — plan_month/year, supervisor_id, status (pending / approved / rejected / **returned_for_modification**), items JSON, reject_reason, return_remarks |
| `advance_requests` table | ⬜ **next phase** | Deferred — advance_code `ADV-YYYY-####`, DG activity type, area/village, participant count, amount, status (pending sup / approved / rejected / **returned_for_revision** / sent to processor / paid / bills pending / settled), **per-employee advance limit**, UTR, paid_date, settlement bills |
| `supervisor_backups` table | ⬜ | Optional later — co-supervisor coverage (A on leave → B sees A's queue) |

**Team model (implemented):** no `teams` table. A supervisor's team = direct reports where `sender_details.supervisor_id = me`. Universal across Frontiers/D2F/INDOFIL; escalation chain via supervisors having their own `supervisor_id`.

---

## 3. Auth, roles & middleware

| Requirement | Status | Notes |
|---|---|---|
| JWT auth (Tymon JWTAuth, `auth.jwt` middleware) | ✅ | Existing; token issued in `verify-otp` |
| Spatie role `supervisor` | ✅ | Created on demand via `set-supervisor-flag` |
| Spatie role `admin` | ✅ | Gates `/admin/*` routes |
| Spatie role `processor` (DG advance processing) | ⬜ **next phase** | Needed only when the DG advance module is built |
| `SupervisorMiddleware` | ✅ | Checks `is_supervisor === 1` → 403 "Supervisor access required" |
| `AdminMiddleware` | ✅ | Checks Spatie `admin` role → 403 "Admin access required" |
| `verify-otp` response includes `user.role`, `user.is_supervisor`, `user.supervisor {id, name}` | ✅ | Role gating for the app's Supervisor tab |
| `profile` response includes `role`, `is_supervisor`, `supervisor {id, name}` | ✅ | Restored session role gating |
| `profile` includes `team_members_count` (for supervisors) | ⬜ | Nice-to-have |

---

## 4. Employee claim-flow endpoints (JWT)

| Endpoint | Method | Status | Purpose |
|---|---|---|---|
| `api/create-billItem` | POST | ✅ | Create bill (attachment S3) |
| `api/update-billItem` | POST | ✅ | Update bill |
| `api/delete-billItem` | POST | ✅ | Delete bill |
| `api/fetch-bills` | GET | ✅ | List my bills |
| `api/expense-limit-data` | POST | ✅ | Limits + status; **now includes `submission_status`** (`none` / `pending_supervisor` / `returned` + `reject_reason`) |
| `api/submit-for-approval` | POST | ✅ | `{from_date, to_date}` → validates claims > 0 → bills → status 5. **No UNID, no tercourier** |
| `api/employee/resubmit` | POST | ✅ | After rectification: status 1 → 5 again |
| `api/unid-generate` | POST | ✅ (kept) | Backward compat only — the app no longer calls it; approval runs `generateUnidForEmployee()` server-side |

---

## 5. Supervisor endpoints (JWT + `supervisor` middleware)

| Endpoint | Method | Status | Purpose / behavior |
|---|---|---|---|
| `api/supervisor/claims` | GET | ✅ | Pending claims of my direct reports (distinct sender + month), grouped, sorted by month desc, with `pending_days` |
| `api/supervisor/claim-detail` | GET | ✅ | `{sender_id, from_date, to_date}` → employee info + bills + S3 attachment URLs + last review. **Team ownership check** (403 if not my report) |
| `api/supervisor/approve` | POST | ✅ | `{sender_id, from_date, to_date, comment?}` → DB transaction → **server-side UNID generation** → bills 2/4 + tercouriers 14 → `supervisor_reviews` row. **Double-approve guard:** 422 "Already processed by {name}" |
| `api/supervisor/reject` | POST | ✅ | `{sender_id, from_date, to_date, reason}` — **reason mandatory** (422 if empty) → bills back to status 1 → audit row |
| `api/supervisor/team-members` | GET | ✅ | My direct reports (id, name, employee_id, designation, pfu, location) — for team filter chips |
| Escalation flag in queue (`supervisor_escalation_days` config) | — | ⬜ | Optional — flag claims pending > N days |
| Travel plan queue: `submit` / `my-plans` / `detail` / `supervisor/list` / `approve` / `reject` (mandatory remarks) / **`return-for-modification`** (required changes) / `config` | — | ⬜ | P6–P7 — NEXT module |
| Advance queue: `request` / `my-requests` / `supervisor/list` / `approve` / `reject` / `finance/list` / `mark-paid` | — | ⬜ | P2 module |
| Notifications (FCM/email) for submit/approve/reject events | — | ⬜ | P10 |

---

## 6. Admin features (JWT + `admin` middleware) — required for the supervisor part

### 6.1 Implemented ✅

| Endpoint | Method | Purpose |
|---|---|---|
| `api/admin/supervisors` | GET | List all `is_supervisor = 1` (id, name, employee_id, designation, pfu, location, supervisor_id) |
| `api/admin/employee/assign-supervisor` | POST | `{employee_id, supervisor_id}` → sets the mapping |
| `api/admin/employee/set-supervisor-flag` | POST | `{employee_id, is_supervisor}` → sets flag **and syncs the Spatie `supervisor` role** |

### 6.2 Required to complete the admin experience ⬜

| Endpoint | Method | Why |
|---|---|---|
| `api/admin/employees` | GET | Paginated employee list with current supervisor, team size, status — needed to build the admin screen |
| `api/admin/employee/detail` | GET | Single employee: profile + supervisor + direct reports |
| `api/admin/employee/unassign-supervisor` | POST | Remove the supervisor mapping |
| `api/admin/hierarchy` | GET | Org tree: supervisor → team (drives a hierarchy view) |
| `api/admin/employee/bulk-assign` | POST | CSV import of employees + supervisor mapping (**INDOFIL data import is blocked on the real SMS API key**) |
| `api/admin/employee/assign-team` | POST | Legacy `sender_details.team` string — kept separate from this module |

### 6.3 Admin UI requirements (app or web — pending decision)

- Supervisor list with search + employee count per supervisor
- Assign/change supervisor for any employee (searchable picker)
- Promote/demote supervisor flag (already API-backed)
- Hierarchy/org view (supervisor → direct reports)
- Bulk CSV upload for INDOFIL onboarding

---

## 7. SMS OTP (current live blocker)

| Item | Status | Notes |
|---|---|---|
| `API/EmployeeLoginController::sendOTP` — **AGRWNG for all users** + gateway response check (`"ErrorCode":"000"`) + OTP stored only after confirmed send | ✅ | In `ter-indofil`. Old code routed non-D2F → FAPLHR which DLT-rejects the app template (error 006) → silent no-SMS |
| `verifyOTP` — checks `otp` + `otp_expires_at` (10 min) | ✅ | |
| Old web `EmployeeLoginController::sendOtp` — removed hardcoded `8219791047`, now uses submitted `telephone_no`, AGRWNG + template, gateway check | ✅ | Fixed 2026-08-05 (web portal path `/admin/send-otp`) |
| **Deploy `ter-indofil` to live** | 🚧 | PENDING — live still runs the old grade-based code |
| Verify SMS delivery on 7973338279 (gateway accepts `000`, SMS not arriving — DND / portal balance / sender status) | ⬜ | JobIds `30546320`, `30546377`, `30547424`, `30547744` |
| INDOFIL employee CSV import (needs real SMS API key) | ⬜ | Carry-over from 2026-08-04 |

Gateway facts (verified 2026-08-05): send = GET `http://sms.innuvissolutions.com/api/mt/SendSMS?...`; **AGRWNG** key `PY95H00rx0aSJP7v8ofVsA`, sender `AGRWNG`, peid `1701168155524038890`; template: "Your OTP for logging into TER App is {otp}. This OTP is valid for 10 minutes. Please do not share this OTP with anyone. Thanks, Agriwings Team". FAPLHR rejects this template.

---

## 8. Cross-cutting conventions

- Response envelope: `{ status, message, statuscode, data }`; `statuscode` 200/403/422/500
- Dates `Y-m-d`; amounts `decimal(12,2)`
- Auth: `auth.jwt` for all `/api` business routes; role groups via `supervisor` / `admin` middleware
- Audit: `supervisor_reviews` is the decision trail (submit → reject → resubmit → approve per month)
- Concurrency: approve/reject run in a transaction with a conditional status-5 check (first actor wins)
- Config values (future): `travel_plan_submit_day`, `claim_previous_months` (3, existing), `advance_max_amount`, `claim_return_edit_days`, `supervisor_escalation_days`

---

## 9. Phase status summary

| Phase | Scope | Status |
|---|---|---|
| P1 | Backend: supervisor columns, role, `supervisor_reviews`, status 5, submit-for-approval + supervisor claim endpoints, `submission_status` field | ✅ |
| P2 | Backend: approve → `generateUnid()` transaction + double-approve guard; reject/resubmit | ✅ |
| P3 | Backend: admin supervisor-management endpoints + role context in auth responses | ✅ |
| P4 | App: Submit-for-Approval button, pending/returned cards, rectify UI | ✅ |
| P5 | App: Supervisor tab (role-gated) — claim queue + review + approve/reject | ✅ |
| P6–P7 | Travel Plan module (backend + app) — approve / reject (mandatory remarks) / return-for-modification | ⬜ **NEXT** |
| P8–P9 | DG Advance module (backend + app) — request fields, employee-wise limit, approve / reject / return-for-revision, processor role, settlement bills, reminders | ⬜ **next phase** |
| P10 | Notifications for all events (claims + travel plan) | ⬜ |
| — | Deploy `ter-indofil` to live (`ternew.etsbeta.com`) | 🚧 **PENDING — do first** |
| — | Admin UI + bulk CSV import (INDOFIL) | ⬜ |
