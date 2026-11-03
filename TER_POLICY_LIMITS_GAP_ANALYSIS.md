# Policy limits & approval hierarchy — where TER stands today

Prepared 17 Sep 2026 · Scope: the six clarifications requested (petrol, hotel, hiring vehicle,
mobile, courier, exception approval matrix)

Sources checked:
- App code — `/Users/frc151/Downloads/TerApp/src` (limits, enforcement, approvals, attachments)
- Backend copy — `/Users/frc151/Downloads/ter-terfinfect_live` (limit schema, bill/claim APIs)
- Policy plan — [INDOFIL_TER_POLICY_IMPLEMENTATION_PLAN.md](INDOFIL_TER_POLICY_IMPLEMENTATION_PLAN.md)

---

## Bottom line

| # | Requirement | Status |
|---|---|---|
| 1 | Petrol — monthly eligibility / **per-KM rate cap** | 🟡 Partial — monthly cap yes, per-KM no |
| 2 | Hotel — **daily lodging cap** | 🟡 Partial — cap + night counter exist, daily-rate maths and one conflict open |
| 3 | Hiring vehicle — rental allowance + **daily KM limits** | 🔴 Missing (category only) |
| 4 | Mobile — monthly limit per designation | 🟢 In place |
| 5 | Courier — per parcel **or** monthly budget | 🟡 Partial — monthly only, no per-parcel cap |
| 6 | Exception matrix — over-limit / missing docs → Manager's Manager | 🔴 Missing |

**Score: 1 in place, 3 partial, 2 missing.**

---

## 1. Petrol — monthly eligibility / per-KM rate cap

**How we're doing today**

- Fuel categories (Fuel 2W / Fuel 4W) carry a **flat monthly cap** seeded per designation
  (`limit_masters.limit_type = 'designation'`); the app uses it in enforcement mode A (block at add),
  B (block at submit) or C (flag only).
- An **annual** combined Fuel + Public Transport cap exists in policy (₹86,400 / ₹79,200 / ₹93,600)
  and the app now tracks `fy_used_amount` / `fy_used_days` — but the cap is still checked
  **per category**, so Fuel + PT are not pooled (plan gap #2, still open).

**Difference**

- **No per-KM rate anywhere.** The only km capture in the whole app is an **optional** "Km" field on
  the *Travel Plan* form (`TravelPlanFormScreen.tsx:457`, stored as `km` on travel items) — that's the
  travel-request module, not expense claims. A claim (bill item) has **no kilometre field**, so
  nothing can compute or validate a ₹/km rate.
- "Monthly eligibility" per km is therefore unenforceable: we can cap the rupees, not the rate.

**To close:** add `km` + implied-rate capture on fuel claims, a per-designation ₹/km rate in the limit
master, and validation `km × rate ≤ monthly cap`. *(est. 3–4 dev-days incl. schema + UI + enforcement)*

---

## 2. Hotel — daily lodging cap

**How we're doing today**

- Lodging & Boarding carries an **annual cap with a day counter** — the live screen shows
  `of ₹60,000.00 limit · FY ₹9,650.00/50`, i.e. 50 nights × ₹1,200 with FY-to-date usage.
- The **one-bill-per-day** rule for lodging is enforced (added 14 Sep).

**Difference**

- The cap is enforced as **flat amount + night count**, not as ₹/night × nights claimed. There is no
  explicit daily-rate validation (plan gap #6).
- **Open conflict (raised 14 Sep, unresolved):** because one bill per day is enforced for lodging,
  a **food bill cannot be submitted on a day already claimed for the hotel**. The policy says the
  ₹1,200/night is *food + lodging combined*, so this needs a decision: either allow multiple
  attachments on one lodging entry, or allow the day's bills to share a combined daily cap.
- **DA-vs-lodging mutual exclusion** (policy rule 12: no DA during lodging stays outside HQ, DGE) is
  **not enforced**.
- The DGO/CO variant (₹300/day, max ₹3,000/month) is not separately seeded in the copy I can see —
  it would need its own limit master row per designation.

**To close:** daily-rate validation + the food/lodging decision above + DA exclusion rule.
*(est. 2–3 dev-days, decision-dependent)*

---

## 3. Hiring vehicle — rental allowance + daily KM limits

**How we're doing today**

- "Vehicle Hiring" exists **only as a category** (category 17, `TerDetailScreen.tsx:38`). Nothing else.

**Difference — everything else is missing**

- No pre-defined **daily rental allowance** enforcement (policy: ₹1,200/day).
- **No daily KM limit** — no km field on claims, so no km cap can be applied.
- Policy requires this to follow **RDGM → ZDGM → NDGM** approval with **actual bills** (rule 14);
  that approval chain is **not modeled** (plan gap #13).

**To close:** category flag for vehicle hiring + daily rental cap + daily km cap + dedicated approval
routing + actual-bill requirement. *(est. 5–7 dev-days — largest item)*

---

## 4. Mobile — monthly limit per designation

**How we're doing today** — 🟢 this one is effectively done

- Monthly cap seeded **per designation** (`limit_masters.limit_type = 'designation'`), policy ₹500/month.
- Enforced at add (mode A) / submit (mode B) / flagged (mode C).
- **Original bill required** — non-DA categories hard-require an invoice photo at submit
  (`AddBillScreen.tsx:485`).

**Difference (minor)**

- The "no reimbursement" negative list (handset, data-card dongle, EMI, maintenance, insurance,
  fines) is **not enforced** — nothing stops an employee adding such an item under mobile.
- It works only where a limit-master row exists for that designation; a missing seed = no cap.

**To close:** optional — a blocked-keyword/item list per category. *(est. 1 dev-day)*

---

## 5. Courier — per parcel/consignment or monthly budget

**How we're doing today**

- Monthly cap only (policy: Courier, Internet & Stationery ₹175/month), enforced like any monthly limit.

**Difference**

- **No per-parcel / per-consignment cap.** There is no per-bill cap concept anywhere in the schema —
  the only per-bill check in the app is "claimed ≤ invoice amount" (`AddBillScreen.tsx:414`), which is
  a sanity check, not a policy ceiling.
- Also note the policy groups **Courier + Internet + Stationery** into one head; a per-parcel rule for
  courier alone would need a sub-category or bill-type distinction.

**To close:** new `per_bill_cap` on the limit master (reusable for other heads too) + seed value.
*(est. 1–2 dev-days)*

---

## 6. Exception approval matrix — Manager's Manager pre-approval

**How we're doing today**

- Three enforcement modes: **A** blocks over-limit bills at add, **B** blocks at submit, **C** flags
  and allows.
- **L1 → L2** approval exists (`pending_l1` → `pending_l2`), and L2 is the Manager's Manager.

**Difference — this is the biggest behavioural gap**

- The L2 step is **part of the normal post-submission route**, not a **prior** exception approval.
  There is no way to raise an over-limit claim *for approval before processing*.
- **No exception/deviations entity, no exception reference, no approver-role routing.** Policy rule 15
  names RDGM (DGE/DGO PT), RSM (CO PT), ZDGM/NDGM (vehicle hiring, deviations) — none of these roles
  exist in the app's approval logic.
- **Missing mandatory documents = hard block**, never an approvable exception. Note the direction of
  travel: on 14 Sep we **removed** the attachment requirement for DA categories client-side
  (`AddBillScreen.tsx:79-123`), which is the opposite of "missing docs require prior approval". Worth
  confirming the backend still accepts those DA saves.

**To close:** an "exception request" path (raise → L2 approve → process), per-category attachment mode
(`required` vs `self_declaration_ok`), and role-aware approver routing. *(est. 6–8 dev-days)*

---

## Cross-cutting differences

| Item | Policy | Today |
|---|---|---|
| Combined Fuel + PT pool | One cap across both | Checked per category (plan gap #2) |
| Daily-rate + night counters | ₹/night, ₹/day enforceable | Flat amounts; FY counters exist but no rate maths (gap #6) |
| Annual FY + pro-rata from DOJ | Pro-rata for mid-year joiners | Not implemented (gap #5) |
| Attachment rules | Fuel/bus/train = original bill; local conveyance = self-declaration OK | Photo required for every non-DA category; DA now exempt (gap #7) |
| Role-aware approvers | RDGM / RSM / ZDGM / NDGM | L1 → L2 only, designation-driven |
| Missing documents | Exception with L2 approval | Hard block |

## Decisions needed from the policy owner before building

1. **Food on a lodging night** — inside the ₹1,200/night cap (one entry, multiple attachments) or
   claimable separately? *(blocks item 2)*
2. **Per-KM petrol rate** — value per designation, and does it replace or sit under the monthly cap?
3. **Over-limit claims** — do they become an L2 pre-approval exception, or stay hard-blocked?
   *(this changes existing product behaviour)*
4. **Per-parcel courier cap** — amount, and does it apply to courier only or the whole head?
5. **Hiring-vehicle approval chain** — confirm RDGM → ZDGM → NDGM and the daily km limit.

## Suggested build order (once decisions land)

1. Daily-rate validation + night/day counters (items 2, 3 partly)
2. Exception approval path + per-category attachment modes (item 6)
3. Per-KM rate for petrol (item 1) + per-parcel cap for courier (item 5)
4. Vehicle hiring: rental + km caps + approval chain (item 3)
5. Combined Fuel + PT pool, DA-vs-lodging exclusion, FY pro-rata from DOJ
