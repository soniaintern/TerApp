# TER App — Manual Testing Checkpoints

Use this doc to test the TER app like a real user. Tick the boxes as you verify each step. Two testers are needed: one as a **D2F employee**, one as an **INDOFIL employee**, and optionally a **supervisor** (INDOFIL).

> **Scope note:** D2F currently has **TER only** — no DG Advance, no Travel Plan, no supervisor features. Parts C and D (Travel Plan / Supervisor) apply to **INDOFIL only**.

---

## Before you start

| # | Check | Expected result |
|---|---|---|
| 1 | App is installed and open | Login screen appears with FINFECT logo, "Login with Mobile Number" |
| 2 | Tap the mobile number field (keyboard opens) | Logo shrinks, field stays visible — nothing hidden under the keyboard |
| 3 | Wrong format test: enter 5 digits, tap **Send OTP** | Error: "Please enter a valid 10-digit mobile number" |
| 4 | Enter correct 10-digit number, tap **Send OTP** | OTP SMS received within ~10–20 seconds |
| 5 | Enter OTP, tap **Verify** | Logged in → Home screen |

> **Older-device check:** on Android, while typing, the logo and form should stay above the keyboard (no jumping).

---

## PART A — D2F EMPLOYEE (admin-configured category limits, calendar month)

### A1. Home screen
> **D2F scope:** D2F currently has **TER only** — there is **no DG Advance, no Travel Plan, and no supervisor features** for D2F. D2F category limits are read from the saved backend configuration. The home screen shows the TER card (and My Account) only.

| # | Check | Expected |
|---|---|---|
| 6 | Home screen loads | Cards: TER Reimbursement + My Account (**no** DG Advance / Travel Plan cards) |
| 7 | Pull down to refresh | Content refreshes without a full-screen loader |

### A2. Add bills (basic)
| # | Check | Expected |
|---|---|---|
| 8 | Open TER → choose a claim month → **Add New** on a category | Add Bill screen opens, category selected |
| 9 | Enter bill details (vendor, dates, bill amount, claimed amount) | Amounts visible; "Claimable" shown for claimed amount |
| 10 | Add 2 bills on the **same day** for Fuel 2W | **2nd bill blocked**: "A Fuel 2W bill already exists for one of the selected dates" |
| 11 | Add 2 bills in the same month for **Phone** | **2nd blocked**: "Only one Phone bill is allowed per claim period — edit the existing" |
| 12 | Add bills on different days for Fuel | Allowed (one per day rule only) |
| 13 | **Public Transportation** — add multiple on the same day | **Allowed** (no restriction) |
| 14 | Edit an existing bill and change the amount | Saves; list updates |
| 15 | Delete a bill | Removed from the list |

### A3. Daily Allowance (DA)
| # | Check | Expected |
|---|---|---|
| 16 | Choose a DA category, mark a few days in the calendar | Days get highlighted; D2F treats admin `limit_amount` as a monthly cap, displays `limit_amount ÷ 30` per day, then multiplies by selected days; admin `max_days` and monthly cap both cap selectable days; other units retain existing policy |
| 17 | Try marking the **same day in the other DA category** | Day is **greyed out / disabled** (can't select) |
| 18 | Save DA without a bill photo | **Blocked**: "DA bill attachment is required per policy" |
| 19 | Add 2 photos → save | One merged PDF is attached (check by editing the bill) |
| 20 | Edit the DA bill | Grid shows the **full month**; previously chosen days marked; other-category days still disabled |

### A4. Submit & status
| # | Check | Expected |
|---|---|---|
| 21 | Submit the period's bills | **D2F:** success message "submitted and auto-approved" + **UNID generated** — no supervisor involved; bills show Processing/Paid |
| 22 | Try adding/editing after submission (D2F) | Blocked: "Unid already created for this month" |
| 23 | (INDOFIL) Submit the period's bills | Success message; bills show "Pending L1" |
| 24 | (INDOFIL) Try adding/editing while pending | Blocked: "Bills are pending supervisor approval" |

---

## PART B — INDOFIL EMPLOYEE (with limits, 21st–20th claim cycle)

### B1. Claim period
| # | Check | Expected |
|---|---|---|
| 25 | Open TER screen | Period shown as **dates**, e.g. "21 Aug – 20 Sep 2026" (not just a month name) |
| 26 | Open month picker | Period + dates shown, e.g. "JUN–JUL" with dates below |

### B2. Limits per category
| # | Check | Expected |
|---|---|---|
| 27 | **Lodging & Boarding** — add a bill | Tile shows "₹1,200/day"; full-width tile; FY used + nights shown |
| 28 | Enter lodging > ₹1,200 × number of nights | Blocked: "Maximum ₹X for N day(s) at ₹1,200 per day" (pro-rated if new joiner) |
| 29 | Yearly cap test: keep adding lodging | Blocked once FY limit (₹60,000, pro-rated for joiners) is used |
| 30 | **Vehicle Hiring** — add 3-day hire at ₹1,200/day | Allowed up to ₹3,600 (per-day cap = rate × days) |
| 31 | Add **Fuel Hired Vehicle** for dates NOT covered by a hire | Blocked: "Add a Vehicle Hiring bill covering these dates first" |
| 32 | Add hire → then Fuel/Toll on the hire dates | **Allowed** — fuel/toll have **no cap** (actuals) |
| 33 | Category tiles | Fuel Hired Vehicle & Toll Tax Hired Vehicle appear **under** Vehicle Hiring |

### B3. DA rules (INDOFIL)
| # | Check | Expected |
|---|---|---|
| 34 | D2F DA category: set monthly `limit_amount` to ₹9,000 and `max_days` to 30, refresh TER | App shows ₹300/day; selecting 10 days shows ₹3,000; changing the admin limit and refreshing updates the calculation |
| 35 | D2F non-DA category: admin configures a category limit; add/edit bills | Add and Edit read the mapped `limit_amount`/usage, show remaining balance and prevent a claim above the remaining limit |
| 35 | One DA bill per category per period | 2nd DA bill for same category blocked — edit the existing |

### B4. Pro-rata (only for employees who joined mid-period/FY)
| # | Check | Expected |
|---|---|---|
| 36 | New joiner sees limits reduced | Monthly limit and yearly limit/nights shown pro-rated; error messages say "(pro-rated for joining date)" |

---

## PART C — TRAVEL PLAN *(INDOFIL only — not available for D2F)*

| # | Check | Expected |
|---|---|---|
| 37 | Create Travel Plan for the next claim period | Plan screen opens; "Plans are always for the next claim period" banner |
| 38 | Tap a day → add **Travel** (from/to/mode) | No amount field for travel |
| 39 | Add **Stay** (hotel name tentative, check-in/out) | No room charge field |
| 40 | Tap a day, type in the form | Sheet stays above the keyboard; fields visible |
| 41 | Submit plan (before the 5th of the month) | Success; shows in supervisor's Travel Plans |

---

## PART D — SUPERVISOR (L1 / L2) *(INDOFIL only — D2F has no supervisor features)*

### D1. Approvals home
| # | Check | Expected |
|---|---|---|
| 42 | Login as supervisor (designation "Supervisor L1") | Only L1 card visible; no "Add Bill" features — approvals only |
| 43 | Claim Requests card shows pending count | Matches submitted claims |

### D2. Review a claim
| # | Check | Expected |
|---|---|---|
| 44 | Open a claim | Focused category card (colour/gradient) with period, bill count, total; Add New/Edit button |
| 45 | Open a bill's attachment | Image → preview; **PDF → opens in browser** with all pages |
| 46 | Approve (no special category) | UNID generated, claim finalized |
| 47 | Approve a claim with a special category / press **Forward to L2** | Goes to L2 (status Pending L2), **no UNID** |
| 48 | L2 approves a forwarded claim | UNID generated (final) |

### D3. Reject → rectify cycle
| # | Check | Expected |
|---|---|---|
| 49 | Reject a claim — pick **only one category** + reason | Only that category returns; claim disappears from supervisor queue |
| 50 | Employee edits the returned bill and resubmits | Claim reappears in supervisor queue |
| 51 | Reject with no category selected (Reject all) | All bills return |

### D4. Review History (MIS)
| # | Check | Expected |
|---|---|---|
| 52 | Open Review History on supervisor home | KPIs (Approved/Rejected/Resubmitted) + list with filters (All/Approved/Rejected) |

---

## PART E — QUICK EXPECTED-VALUES TABLE

| Category | D2F | INDOFIL |
|---|---|---|
| Fuel 2W | 1 bill/day | 1 bill/day |
| Phone | 1 bill/month | 1 bill/month |
| Public Transportation | any number | any number |
| Lodging & Boarding | no cap | ₹1,200/day · 50 nights/yr · FY cap (pro-rated for joiners) |
| DA categories | Admin monthly `limit_amount` ÷ 30 = daily rate; daily rate × selected days, capped by `max_days` | Existing unit policy |
| Vehicle Hiring | no cap | ₹1,200/day (cap = rate × days) |
| Fuel Hired Vehicle | no cap | actuals — no cap (needs a hire covering the dates) |
| Toll Tax Hired Vehicle | no cap | actuals — no cap (needs a hire) |
| Approval | **None** — auto-approved, UNID at submit | L1 → L2 (only if special/forwarded) |
| Claim period | Calendar month (1st–end) | 21st → 20th of next month |

---

## PART F — NON-FUNCTIONAL CHECKS (all users)

| # | Check | Expected |
|---|---|---|
| 53 | Navigate between screens quickly | No full-screen loaders — content shows instantly, silent refresh |
| 54 | Attachment photo upload | Fast; photo auto-optimized (small file size) |
| 55 | Stay logged in | Session lasts 30 days (no re-login for a month) |
| 56 | Internet off → open app | App opens, shows cached data; no crash |

---

### How to report a failure
For each failed check, note:
- **Step number** (e.g., #29)
- **What you did** (phone, category, dates, amount)
- **What happened** (exact error message or screenshot)
- **Expected** (from this doc)
