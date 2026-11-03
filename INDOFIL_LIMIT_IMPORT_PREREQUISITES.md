# INDOFIL Limit Master Import — Prerequisites & Checklist

**Import file:** `INDOFIL_LimitMaster_Import_Sample.xlsx` (sheet `Import` = data, `Notes & Confirmations` = assumptions)
**Import mechanism:** existing admin bulk import — `LimitManagementController::importLimitMaster` → `LimitMasterImport` (columns: `unit | designation | expense_category | period | specific_emp | limit_amount | max_days | is_cf | from_date | to_date`).
**Re-upload is idempotent:** matching unit + designation + category rows are updated in place, not duplicated.

---

## Prerequisites (must exist before import, else rows are skipped with errors)

| # | Prerequisite | Where to check / do | Error if missing |
|---|---|---|---|
| 1 | Unit with PFU **`INDOFIL`** | `unit_masters` table (sample export already assumes this) | `unit 'INDOFIL' not found` |
| 2 | Designations **DGE / DGO / CO** (name **or** code) | `designation_masters` (status = 1). If the system uses different names for Indofil (e.g. existing SIO/ZH), replace the `designation` column values with the actual names/codes | `designation 'DGE' not found` |
| 3 | Those designations **mapped to unit INDOFIL** | `pfu_designations` (the Designation Mapping screen you're building — map DGE/DGO/CO to PFU INDOFIL) | `designation 'DGE' is not mapped to unit INDOFIL` |
| 4 | Expense categories with **exact head_names** | `expense_categories` (status = 1). Existing: Fuel 2W, Fuel 4W, 2W/4W Maintenance, Lodging & Boarding, Food, Phone, Public Transportation, Toll Tax 4W, Electricity, Miscellaneous | `expense category 'Daily Allowance' not found` |
| 5 | **Create missing categories** before import: `Daily Allowance`, `Courier, Internet & Stationery`, `Vehicle Hiring` | Add rows in `expense_categories` (the app's category chips pull from this table) | same as #4 |
| 6 | Indofil company enforcement mode = **A or B** | `company_enforcement_settings` (mode A = strict, blocks add + submit; B = blocks submit; C = flag only). Mode A/B makes `limit_amount` required — which the file already provides | `limit_amount is required for unit INDOFIL (enforcement mode ...)` |

## Policy-based rules applied in the sample

- **`is_cf` = No everywhere** — policy note 7: no carry-forward of unutilized limits.
- **`period` = monthly** — matches how `enforceCategoryAdd/Submit` sum claims per month.
- **`max_days`** multiplies: `final_amount = limit_amount × max_days`.
  - Daily Allowance (DGE): 175 × 26 = ₹4,550/month ✓ (policy: ₹175/day, max 26 days)
  - Lodging (DGO/CO): 300 × 10 = ₹3,000/month ✓ (policy: ₹300/day, max ₹3,000/month)
- **Maintenance / Electricity / Toll / Miscellaneous left unconfigured** — policy note 6 excludes maintenance, insurance, fines, challans, EMI; tolls are covered under vehicle-hiring actuals. Consider deactivating the Maintenance categories for Indofil employees.
- **Fuel + Public Transport combined cap** — policy treats them as ONE limit (DGE 7,200/mo · 86,400/yr; DGO 6,600/mo · 79,200/yr; CO 7,800/mo · 93,600/yr). The current schema enforces per-category only, so the combined cap sits on the `Fuel 2W` row as a placeholder. **Accurate enforcement needs the limit-group workstream (W2)** from `INDOFIL_TER_POLICY_IMPLEMENTATION_PLAN.md` before this cap is truly enforced. Until then, do not also configure Fuel 4W / PT with large amounts or the sum will exceed policy.

## Before you import — confirm these values with Indofil

Amber-highlighted cells in the workbook (low-quality scan of the policy table):
1. Fuel split per category (only the combined cap is legible).
2. Public Transportation ₹1,250/month.
3. Phone ₹500/month (per-designation split unclear).
4. Courier, Internet & Stationery ₹175/month.
5. Food ₹300/day — day-cap not stated (sample uses 26 days, same as DA).
6. Lodging (DGE) ₹1,200/night — monthly treatment + 50 nights/year cap need the daily-rate workstream (W4) to enforce properly.
7. Vehicle Hiring ₹1,200/day — approval flow (RDGM→ZDGM→NDGM) pending (W6).

## Import steps (admin)

1. Admin → **Limit Master** (menu) → **Import**.
2. Upload `INDOFIL_LimitMaster_Import_Sample.xlsx`.
3. Review the response summary: `imported` count (new rows), `duplicates` (updated rows), `errors` (skipped rows with reasons).
4. Fix any error rows (usually prerequisites #1–#5) and re-upload — safe to repeat.
