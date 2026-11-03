# Indofil TER Policy — Gap Analysis & Plan of Action

**Source:** `TER Policy - Indofil.pdf` (3 pages, scanned — extracted via OCR)
**Status:** Analysis only — no code changes made.
**Applies to:** TER App (React Native) + Backend (`/Applications/XAMPP/xamppfiles/htdocs/projects/ter`) for Indofil Industries.

---

## 1. What the policy says (summary)

### Designations & limits
Three designations with **different limit sets**:

| Rule | DGE | DGO | CO |
|---|---|---|---|
| Fuel + Public Transport **combined** — monthly | ₹7,200 | ₹6,600 | ₹7,800 |
| Fuel + Public Transport combined — **annual** | ₹86,400 | ₹79,200 | ₹93,600 |
| Daily allowance (DA) | ₹175/day ex-HQ (no night halt), max **26 days/month** (= ₹4,550/mo) | ₹300/day on deputation | ₹300/day on deputation |
| Food | ₹300/day | ₹300/day | ₹300/day |
| Lodging | ₹1,200/night (food+lodging combined), max **50 nights/year** | ₹300/day, max **₹3,000/month** | ₹300/day, max **₹3,000/month** |
| Vehicle hiring | ₹1,200/day + fuel & tolls on actuals (peak season) | — | — |
| Mobile | ₹500/month | | |
| Courier, Internet & Stationery | ₹175/month | | |
| Public Transport (non-combined part) | ₹1,250/month | | |

> ⚠️ The monthly table in the PDF is a low-quality scan; figures above marked "| |" (empty) were not OCR-clean. **Confirm exact per-designation table values with Indofil before seeding limits.** The monthly/annual combined figures and the DGE/DGO/CO conditions are clearly legible and reliable.

### Hard rules
1. **Financial year = 1 Apr – 31 Mar.** Limits are **pro-rata from Date of Joining**.
2. Reimbursement is **on actuals only** — limits are caps, not entitlements.
3. Mobile / Courier / Internet / Stationery: **original bills required**.
4. **No reimbursement**: mobile handset, data-card dongle, fine, penalty, challan, EMI, maintenance, insurance.
5. **No carry-forward** of unutilized limits at year end.
6. **Claim cycle: 21st of month → 20th of next.** All claims of a cycle approved by **L1 and L2 managers by the 23rd** of the month.
7. **Claims not submitted within 30 days are not paid.**
8. Any **deviation needs prior written approval from NDGM**.
9. **Excess travel claims** (beyond the limits) require **NDGM/CLH approval at the time of submission**.
10. Fuel & Public Transport is a **combined limit** — employee must not exceed the combined cap.
11. **Fuel / bus / train**: original bills required. **Local conveyance (auto, local taxi): self-declaration accepted**.
12. DA is **not given** during lodging stays outside HQ (DGE).
13. DGO: **room rent can be paid through DG advance by RDGM**; food & personal lodging charged in travel expenses.
14. Vehicle hiring (DGE): proposed RDGM → ZDGM, **approval from NDGM**, actual bills required.

### Approval chain (per designation)
- DGE/DGO: L1 → L2; PT approved by RDGM; deviations/excess by NDGM (vehicle hiring via ZDGM).
- CO: PT approved by RSM; lodging evaluation by L1 → proposal to L2.

---

## 2. Current implementation vs. policy — gap table

| # | Policy rule | Current implementation | Gap / action needed |
|---|---|---|---|
| 1 | Per-designation limits (DGE/DGO/CO) | `LimitMaster` supports `designation_id` + `limit_type=designation`; PFU→designation mapping task **in progress** | Finish designation tagging (admin), then **seed Indofil limit rows per designation** with policy values |
| 2 | **Combined** Fuel + PT limit | Limits are per-category only (`LimitMaster.expense_id`); `enforceCategoryAdd/Submit` check each category independently | Add **limit-group/combined pool** support (one cap across 2+ categories) or merge into one category; must affect add-block, submit-block, and `expense_limit_data` |
| 3 | Claim cycle **21st → 20th**; L1/L2 approve by 23rd | App builds TERs on **calendar months** (1st → last day): `TerScreen.getDateRange`, `TerDetailScreen.getDateRange`, `AddBill/EditBill` month bracket | **Decision point** (see §4): switch period model to 21st–20th cycles, update TER month picker, bill date locks, backend `terfrom_date/terto_date` |
| 4 | **30-day submission rule** | App allows current month + previous 3 months (`claimWindowStart` in Add/Edit/TerDetail) | Tighten window to **period end + 30 days** (aligned to 21st–20th cycle); update app guards + backend validation |
| 5 | **Annual** limits (FY Apr–Mar) + **pro-rata from DOJ** + **no carry-forward** | Only monthly enforcement exists (`enforceCategorySubmit` uses `whereBetween(to_date, month)`); `is_cf` flag exists but semantics unverified | Add annual (FY) accumulation + cap checks; pro-rata for joiners mid-year; ensure `is_cf=0` for Indofil |
| 6 | **Daily-rate limits** (DA ₹175×26d, lodging ₹1,200/night ×50 nights/yr, food ₹300/day, vehicle hire ₹1,200/day) | `LimitMaster.max_days` exists but no rate/day or night-count enforcement; limits are flat monthly amounts | Implement daily-rate validation (bill date span × rate ≤ cap) + annual counters (50 lodging nights) |
| 7 | Attachment rules per category (fuel/bus/train = original bill; local conveyance = self-declaration OK) | **Every bill hard-requires a photo** (`AddBillScreen` blocks submit without image) | Per-category attachment mode: `required` vs `self_declaration_ok`; add self-declaration flow for local conveyance |
| 8 | Non-reimbursable list (fine/penalty/challan/EMI/maintenance/insurance/handset/dongle) | Not modeled | Category-level guidance/exclusion list (block or flag); admin note in policy |
| 9 | **Two-level approval (L1 → L2)** by the 23rd | Single-level supervisor flow (`pending_supervisor` → `returned`); `SupervisorController` exists, `submission_status` derived from bill status 5 / reviews | Extend review chain to L1+L2; deadline awareness (23rd) — optional due-date field |
| 10 | **Excess-claim approval** at submission (NDGM/CLH) | No concept of "excess/approved-excess" on submit | Add excess flag + approval-reference field at submission; block or mark submission when over limit without reference |
| 11 | PT approval by **RDGM/RSM** (role-specific) | Supervisor approval not role-differentiated for PT | Map approver roles per designation/category |
| 12 | DGO **DG-advance** room rent (RDGM) | DG Advance module exists (separate lifecycle) | Link DG Advance settlement to lodging-on-deputation claims (policy explicitly ties them) |
| 13 | Vehicle hiring approval (RDGM→ZDGM→NDGM) | Not modeled | New category/flag with approval-reference requirement + actual-bill mode |
| 14 | "Limits are caps, not allowances"; actuals only | `claimed_amount ≤ bill_amount` enforced in app | OK — keep; ensure backend also validates claimed ≤ bill on edit |
| 15 | Claim window messaging ("current + 3 months") | Hard-coded text in Add/Edit screens | Replace with policy-accurate copy once window rules are decided |

---

## 3. Recommended workstreams (ordered)

### W1 — Designation foundation (prerequisite, already in progress)
- Finish PFU→designation admin drawer + filtered dropdowns (current task).
- Add DGE / DGO / CO as the three designation values; assign to Indofil employees.
- Confirm the mapping source (SpineDumpUpdate vs sender table) used by `categoryLimitFor()` is correct for Indofil.

### W2 — Limits configuration (data + one schema tweak)
- **Confirm exact table values** with Indofil (OCR noise) — get a clean copy or sign-off.
- Seed `LimitMaster` rows: designation-level per category (fuel+PT as one group; mobile; courier/stationery; DA; food; lodging; vehicle hire) with `max_days` where applicable.
- Add **combined-limit grouping** (fuel + public transport share one cap):
  - Schema: `limit_groups` table or `group_id` on `LimitMaster`.
  - Enforcement: `enforceCategoryAdd` / `enforceCategorySubmit` sum across group members.
  - API: `expense_limit_data` exposes the combined pool + per-category split.

### W3 — Period & eligibility model (biggest behavioural change — decision first)
- Decide: **switch to 21st–20th cycles** vs keep calendar months with a 21st–20th "claimability" filter (see §4).
- Update: `TerScreen.getDateRange`, `TerDetailScreen.getDateRange`, Add/Edit month locks, `fetchBills`/`getExpenseLimitData` calls, backend `terfrom_date/terto_date` generation, `submitForApproval/resubmit` ranges.
- Enforce **30-day submission window** (period end + 30 days) in app date pickers + backend hard guard.
- Update copy: "current month + previous 3 months" → new rule wording.

### W4 — Limit enforcement depth
- **Annual (FY Apr–Mar)** accumulation: sum claimed per category over the FY, enforce annual cap (combined fuel+PT caps 86,400/79,200/93,600).
- **Pro-rata from DOJ**: annual cap × months-since-DOJ/12 for mid-year joiners.
- **No carry-forward**: verify `is_cf` is unused/disabled for Indofil.
- **Daily-rate validation**: DA (₹175/day, ≤26 days/mo), lodging (₹1,200/night DGE, ≤50 nights/yr; ₹300/day ≤₹3,000/mo DGO/CO), food ₹300/day, vehicle hire ₹1,200/day — check bill date-span against rate and running counters.
- Mutual exclusion: **no DA when lodging outside HQ** (DGE).

### W5 — Attachment & self-declaration
- Add per-category attachment mode (`required` / `self_declaration_ok`) surfaced from backend (category flags).
- Local-conveyance category: replace mandatory photo with optional photo + **self-declaration checkbox** (policy allows auto/taxi self-declaration).
- Keep photo required for fuel, bus/train, lodging, stationery etc.

### W6 — Approval workflow
- Extend supervisor review to **L1 → L2** chain (per designation mapping).
- **Excess-claim flag** at submission: if a category exceeds its limit, require an approval reference (NDGM/CLH) or block — per note 9/12.
- Role-aware approvers: RDGM (DGE/DGO PT), RSM (CO PT), ZDGM/NDGM (vehicle hiring, deviations).
- Optional: "approve by 23rd" due-date surfaced to supervisors (admin view).

### W7 — DG Advance linkage (DGO lodging)
- When a DGO deputation lodging claim is submitted, allow "paid via DG advance" reference (RDGM) and link to DG Advance settlement (bills_pending → settled flow).

### W8 — Non-reimbursable guardrails & copy
- Category exclusion list (fine/penalty/challan/EMI/maintenance/insurance/handset/dongle): block or warn in app; visible policy note.
- Update all user-facing copy to match policy wording (limits = caps; actuals only).

---

## 4. Open decisions (need your call)

1. **Period model** — switch TERs to **21st–20th cycles** (accurate to policy, but changes month picker, TER naming, backend period generation, and existing data), **or** keep calendar months but enforce 21st–20th eligibility on bill dates (lighter, slight naming mismatch)? *Recommend: full switch for correctness — this is the policy's core operating rhythm.*
2. **Combined limit** — new `limit_groups` schema (clean, reusable) **vs** collapsing Fuel+PT into a single category (faster, but loses per-category reporting).
3. **30-day window strictness** — hard-block older claims in the app, or allow with supervisor approval (policy: "will not be paid" — suggests hard rule; deviation path exists via NDGM)?
4. **Excess approval** — block submission until NDGM reference entered, or allow submission with an "excess pending approval" status?
5. **Confirm numbers** — please get a clean scan/typed copy of the monthly table so we seed exact values.

---

## 5. Suggested sequence

1. **W1** (designation tagging) — unblocks everything.
2. **Decide §4.1–4.4** → **W2** (limits + combined pool) & **W3** (period model) in parallel.
3. **W4** (annual/pro-rata/daily-rate) — depends on W2 schema.
4. **W5** (attachments) — independent, small.
5. **W6** (approvals) — depends on W1.
6. **W7, W8** — finishing touches.

Estimated effort: W2/W3/W4 are the heavy lifts (schema + enforcement + period logic across app & backend); W5–W8 are moderate to light.
