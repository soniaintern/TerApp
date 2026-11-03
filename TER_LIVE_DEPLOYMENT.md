# TER Backend — Live Server Deployment Instructions

> Target: `ternew.etsbeta.com` · Repo: `github.com/eternitymetadev/ter` · Branch: **`ter-indofil`**
> Date: 2026-08-07 · This covers the multi-company, INDOFIL slice, admin redesign, permission & performance changes.

---

## Step 1 — Deploy the code

The repo branch `ter-indofil` contains all changes. Pull it on the live server:

```bash
cd /path/to/live/ter
git fetch origin
git checkout ter-indofil
git pull origin ter-indofil
```

### New files (added in this deployment)
```
app/Support/CompanyScope.php                  ← single company-scoping rule
app/Http/Middleware/IndofilGuard.php          ← guards /indofil/*
app/Http/Middleware/SuperAdminOnly.php        ← blocks company users from global pages
routes/indofil.php                            ← /indofil/* routes (company slice)
app/Http/Controllers/Indofil/IndofilDashboardController.php
app/Http/Controllers/Indofil/IndofilTercourierController.php
resources/views/indofil/dashboard.blade.php
resources/views/indofil/tercourier-list.blade.php
resources/views/layouts/pro.blade.php         ← pro shell for users/roles/permissions pages
public/assets/css/admin-menu.css              ← sidebar/topbar design
```

### Modified files (key ones — full list is in git)
```
routes/web.php, app/Http/Kernel.php, app/Models/User.php
app/Http/Controllers/TercourierController.php      (company scoping, admin TER view, payment-hold fixes)
app/Http/Controllers/HomeController.php             (main dashboard company-scoped)
app/Http/Controllers/SenderController.php           (pagination + CSV export + pro table)
app/Http/Controllers/ImportExportController.php     (company-scoped report exports)
app/Http/Controllers/LimitManagementController.php  (pagination)
app/Http/Controllers/UserController.php             (user stats)
app/Exports/*.php                                   (all export classes accept PFU scope)
public/assets/js/app.js                             (PerfectScrollbar guards)
resources/views/**                                   (many pages restyled — dashboard, sender, passbook,
                                                      hierarchy, expense master, users/roles/permissions,
                                                      payment-hold pages, reports, payment sheet, sidebar)
```

> If git pull conflicts on live (live has hand-edited files — e.g. the old `EmployeeLoginController`), resolve by
> **taking the repo version** of: `app/Http/Controllers/API/EmployeeLoginController.php` (this is the SMS OTP fix —
> it sends the exact approved DLT template "…Thanks, Agriwings Team" and returns the real gateway error instead
> of a fake success). The live copy must be replaced with this file.

---

## Step 2 — Database changes (run in order on live)

### 2.1 Multi-company column (users can belong to several companies)

```sql
ALTER TABLE users ADD COLUMN company_ids JSON NULL AFTER company_id;
```

### 2.2 Company → unit mapping (`unit_masters`)

The company scoping works via `unit_masters.company_id`. **If the live `unit_masters` table has
`company_id` NULL** (like local before the fix), run:

```sql
UPDATE unit_masters SET company_id = 1 WHERE pfu = 'SD1'      AND company_id IS NULL;
UPDATE unit_masters SET company_id = 2 WHERE pfu = 'SD3'      AND company_id IS NULL;
UPDATE unit_masters SET company_id = 3 WHERE pfu = 'MA2'      AND company_id IS NULL;
UPDATE unit_masters SET company_id = 4 WHERE pfu = 'MA4'      AND company_id IS NULL;
UPDATE unit_masters SET company_id = 6 WHERE pfu = 'D2F'      AND company_id IS NULL;
UPDATE unit_masters SET company_id = 7 WHERE pfu = 'INDOFIL'  AND company_id IS NULL;
```

> Expected result after: `SD1→1, SD3→2, MA2→3, MA4→4, D2F→6, INDOFIL→7`

### 2.3 Permissions (payment-hold + reports were hidden — they were never assigned)

```sql
INSERT INTO role_has_permissions (permission_id, role_id)
SELECT p.id, r.id
FROM permissions p, roles r
WHERE p.name IN ('pay-later-data', 'full-and-final-data', 'payment_sheet')
  AND r.name IN ('admin', 'tr admin', 'Hr Admin')
ON DUPLICATE KEY UPDATE permission_id = permission_id;

INSERT IGNORE INTO `role_has_permissions` (`permission_id`, `role_id`)
SELECT p.id, 1 FROM `permissions` p WHERE p.name IN
('dg-advance-process','dg-advance-view','limit-master-view','limit-master-create',
 'designation-mapping-view','designation-mapping-manage','feature-toggle-view',
 'feature-toggle-manage','enforcement-view','enforcement-manage','review_reports');
```

### 2.4 (Optional / decide first) Assign companies to the 11 legacy accounts

These accounts have `company_id = NULL` — they now see **no data** until assigned:

| User | Role |
|---|---|
| veena@frontierag.com | tr admin |
| Harpreet | tr admin |
| Rameshwar | tr admin |
| Raman Kumar | tr admin |
| Gourav Dhiman | tr admin |
| Raj Gupta | Hr Admin |
| Amit Saini | Hr Admin |
| jaswinder kaur | reception |
| Nidhi Sharma | reception |
| Pallvi Sharma | reception |
| Simar | ter user |

Decide each one's company, then (single company):
```sql
UPDATE users SET company_id = 6 WHERE email = 'veena@frontierag.com';          -- D2F
```
Multi-company (single + array can coexist):
```sql
UPDATE users SET company_ids = '["1","2","3","4","7"]' WHERE email = 'veena@frontierag.com';  -- D2F + INDOFIL
```

> **Scoping rule now enforced:** super-admin roles (`admin` / `admin user` / `Super Admin` / `Super Role`)
> see ALL companies · any other user sees only their assigned company/companies · unassigned users see nothing.

### 2.5 New permissions — team hierarchy, DG advance, limits, designation mapping, feature toggles, enforcement

```sql
INSERT INTO `permissions` (`id`, `name`, `guard_name`, `created_at`, `updated_at`) VALUES
(35, 'team-hierarchy-show', 'web', '2022-07-15 02:45:55', '2022-07-15 02:45:55'),
(36, 'team-hierarchy-edit', 'web', '2022-07-15 02:45:55', '2022-07-15 02:45:55'),
(37, 'dg-advance-process', 'web', '2022-07-15 02:45:55', '2022-07-15 02:45:55'),
(38, 'dg-advance-view', 'web', '2026-08-11 09:26:50', '2026-08-11 09:26:50'),
(39, 'limit-master-view', 'web', '2026-08-11 09:26:50', '2026-08-11 09:26:50'),
(40, 'limit-master-create', 'web', '2026-08-11 09:26:50', '2026-08-11 09:26:50'),
(41, 'designation-mapping-view', 'web', '2026-08-11 09:26:50', '2026-08-11 09:26:50'),
(42, 'designation-mapping-manage', 'web', '2026-08-11 09:26:50', '2026-08-11 09:26:50'),
(43, 'feature-toggle-view', 'web', '2026-08-11 09:26:50', '2026-08-11 09:26:50'),
(44, 'feature-toggle-manage', 'web', '2026-08-11 09:26:50', '2026-08-11 09:26:50'),
(45, 'enforcement-view', 'web', '2026-08-11 09:26:50', '2026-08-11 09:26:50'),
(46, 'enforcement-manage', 'web', '2026-08-11 09:26:50', '2026-08-11 09:26:50');
```

> Assign to the admin roles so the menus/pages unlock (idempotent — safe to re-run):
```sql
INSERT IGNORE INTO role_has_permissions (permission_id, role_id)
SELECT p.id, r.id
FROM permissions p, roles r
WHERE p.name IN ('team-hierarchy-show', 'team-hierarchy-edit', 'dg-advance-process', 'dg-advance-view',
                 'limit-master-view', 'limit-master-create', 'designation-mapping-view',
                 'designation-mapping-manage', 'feature-toggle-view', 'feature-toggle-manage',
                 'enforcement-view', 'enforcement-manage')
  AND r.name IN ('admin', 'tr admin', 'Hr Admin', 'processor');
```

---

## Step 3 — Clear caches (important — views/routes/config changed)

```bash
cd /path/to/live/ter
php artisan route:clear
php artisan config:clear
php artisan view:clear
php artisan cache:clear
# (or just: php artisan optimize:clear)
```

If OPcache is enabled for PHP-FPM, also reload it (the blade/CSS are new files):
```bash
# e.g. Ubuntu: sudo systemctl reload php8.1-fpm   (adjust version)
```

---

## Step 4 — Verification checklist

| # | Check | Expected |
|---|---|---|
| 1 | Login as **super admin** (`admin@frontierag.com`) | Sidebar: Dashboard, TER List, TER List (Old), Pay Later TER, Full & Final TER, Payment Sheet, Reports, Admin (Users/Roles/Permissions), All Companies group. Dashboard shows **all** TERs. |
| 2 | Login as **INDOFIL user** (company 7) | Sidebar: only **TER List** (company). Main dashboard shows only INDOFIL stats. General TER menus hidden. `/reports` opens; downloads contain only INDOFIL data. |
| 3 | Login as **D2F user** (company 6) | Same as #2 but D2F data (1,007 TERs) · no "INDOFIL" wording anywhere. |
| 4 | Login as **veena** (before assignment) | Sees **zero data** (not all!) — this is the leak fix. |
| 5 | Users / Roles / Permissions pages | Pro shell (sidebar + topbar), styled tables, working create/edit forms. |
| 6 | Payment Sheet (`/payment_sheet`) | Opens instantly → click **Load live sheet** → iframe loads on demand. |
| 7 | Sender Table, Expense Master, Document List, Held Payments, F&F | Pro tables, fast (pagination), company-scoped. |
| 8 | SMS OTP login | With the deployed controller, send-otp uses the approved DLT template (ErrorCode 000). |
| 9 | Menu → logout (sidebar bottom) | Logs out. |

---

## Notes / known items

- **No migration file for `company_ids`** — the migration class hit a double-load quirk on the local
  XAMPP environment, so it was removed. **The `ALTER TABLE` in 2.1 is the canonical schema change** — apply
  it manually on live. It's idempotent (column exists check included in app code paths).
- **Reports are company-scoped**: exports pass the user's PFU list into every export class; super admin
  gets everything, company users only theirs.
- **Mobile app (TerApp) is a separate repo** (`eternitymetadev/TerApp-Native`) — this document covers the
  Laravel backend only. The app already consumes the new APIs; no app deployment needed for these changes.
- **Backup before SQL**: take a `mysqldump` of `ter_db` before running Step 2.

INSERT INTO `company_sms_settings`
(`company_id`, `is_default`, `api_key`, `sender_id`, `peid`, `dlttemplate_id`, `template_text`, `enabled`, `created_at`, `updated_at`)
VALUES
(7, 0,
 'aIkulPaj50i8R3iWzgsqQw',              -- api_key (FVPL account)
 'FVPL',                                -- sender_id
 '1201161682394705186',                 -- peid
 '1777178720966801822',                 -- dlttemplate_id (DLT template)
 'Your OTP for logging into TER App is {otp} . This OTP is valid for 10 minutes. Please do not share this OTP with anyone. Thanks Frontier',
 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
`api_key` = VALUES(`api_key`),
`sender_id` = VALUES(`sender_id`),
`peid` = VALUES(`peid`),
`dlttemplate_id` = VALUES(`dlttemplate_id`),
`template_text` = VALUES(`template_text`),
`enabled` = VALUES(`enabled`),
`updated_at` = NOW();


## Keep D2F limit enforcement to Flag only C. 


INSERT IGNORE INTO `expense_categories`
(`id`, `head_name`, `is_special`, `is_da`, `status`, `created_at`, `updated_at`)
VALUES
-- DA categories (day-marker, one bill per category per period)
(12, 'DA - Out of HQ (No night halt)', 0, 1, '1', NOW(), NOW()),
(13, 'DA - Local Market',               0, 1, '1', NOW(), NOW()),
-- Regular INDOFIL categories
(14, 'Vehicle Hiring',       0, 0, '1', NOW(), NOW()),
(15, 'Courier',              0, 0, '1', NOW(), NOW()),
(16, 'Internet & Stationery',0, 0, '1', NOW(), NOW()),
(17, 'Food - Campaign',      0, 0, '1', NOW(), NOW()),
(18, 'Room Rent - Campaign', 0, 0, '1', NOW(), NOW());


API KEY- 25nXbX1xc0yZP3nCwUTREg
Send id: FVPL 
PEID: 1201161682394705186
DLT Template ID: 1777178720966801822


Do enforment setting:
https://ternew.etsbeta.com/enforcement


Add permisson of team hirarachy to admin