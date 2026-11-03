# Live Deployment Checklist — DG Advance + Enforcement + Feature Toggles (2026-08-11)

> **Server:** UAT/live `ternew.etsbeta.com` · **Branch:** `ter-indofil`
> This is the **complete** checklist for everything built recently: DG Advance module, per-company enforcement modes (A/B/C), per-unit feature toggles, and the login/permission hardening.
> **Order matters — run the SQL before/with the code deploy. If a table is missing, login breaks (500).**

---

## 0. Pre-flight: confirm the base state

```sql
SELECT id, pfu, company_id FROM unit_masters ORDER BY id;            -- expect all mapped (SD1→1, SD3→2, MA2→3, MA4→4, D2F→6, INDOFIL→7)
SHOW TABLES LIKE 'unit_features';
SHOW TABLES LIKE 'company_enforcement_settings';
SHOW TABLES LIKE 'dg_advance%';
SELECT name, guard_name FROM permissions WHERE name = 'dg-advance-process';
```

---

## 1. Code deploy

```bash
cd /path/to/live/ter
git pull origin ter-indofil
php artisan config:clear && php artisan cache:clear && php artisan view:clear && php artisan route:clear
```

> The login crash (`PermissionDoesNotExist`) is already hardened in code (try/catch fallbacks), but the permission row below should still be created so permission-based gating works.

---

## 2. Database SQL (run ALL of this — missing any table = 500 on login/pages)

### 2.1 `unit_masters` company mapping (required for enforcement + filters)

```sql
UPDATE unit_masters SET company_id = 1 WHERE pfu = 'SD1'     AND (company_id IS NULL OR company_id = 0);
UPDATE unit_masters SET company_id = 2 WHERE pfu = 'SD3'     AND (company_id IS NULL OR company_id = 0);
UPDATE unit_masters SET company_id = 3 WHERE pfu = 'MA2'     AND (company_id IS NULL OR company_id = 0);
UPDATE unit_masters SET company_id = 4 WHERE pfu = 'MA4'     AND (company_id IS NULL OR company_id = 0);
UPDATE unit_masters SET company_id = 6 WHERE pfu = 'D2F'     AND (company_id IS NULL OR company_id = 0);
UPDATE unit_masters SET company_id = 7 WHERE pfu = 'INDOFIL' AND (company_id IS NULL OR company_id = 0);
```

### 2.2 DG Advance tables

```sql
ALTER TABLE sender_details
  ADD COLUMN dg_advance_limit DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER supervisor_id;

CREATE TABLE IF NOT EXISTS dg_advance_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  advance_code VARCHAR(32) NOT NULL UNIQUE,
  employee_id BIGINT UNSIGNED NOT NULL,
  supervisor_id BIGINT UNSIGNED NULL,
  processor_id BIGINT UNSIGNED NULL,
  activity_type VARCHAR(191) NOT NULL,
  area_village VARCHAR(191) NOT NULL,
  participants_count INT UNSIGNED NOT NULL DEFAULT 0,
  requested_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  over_limit_flag TINYINT NOT NULL DEFAULT 0,
  employee_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'pending_supervisor',
  supervisor_remark TEXT NULL,
  supervisor_action_at TIMESTAMP NULL,
  utr_no VARCHAR(191) NULL,
  paid_at TIMESTAMP NULL,
  settlement_deadline TIMESTAMP NULL,
  reminder_sent_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_dg_emp_status (employee_id, status),
  KEY idx_dg_sup_status (supervisor_id, status),
  KEY idx_dg_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS dg_advance_settlements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dg_advance_request_id BIGINT UNSIGNED NOT NULL,
  bill_no VARCHAR(191) NULL,
  vendor_name VARCHAR(191) NULL,
  bill_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  bill_date DATE NULL,
  attachment VARCHAR(500) NULL,
  uploaded_by VARCHAR(40) NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_dg_settle_req (dg_advance_request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS dg_advance_reminders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dg_advance_request_id BIGINT UNSIGNED NOT NULL,
  channel VARCHAR(40) NOT NULL DEFAULT 'app',
  recipient_role VARCHAR(40) NOT NULL DEFAULT 'employee',
  message TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_dg_remind_req (dg_advance_request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.3 Enforcement + feature toggle tables

```sql
CREATE TABLE IF NOT EXISTS company_enforcement_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id INT UNSIGNED NOT NULL UNIQUE,
  mode VARCHAR(1) NOT NULL DEFAULT 'A',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO company_enforcement_settings (company_id, mode)
VALUES (1,'A'),(2,'A'),(3,'A'),(4,'A'),(5,'A'),(6,'A'),(7,'A');

CREATE TABLE IF NOT EXISTS unit_features (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  unit_id VARCHAR(100) NOT NULL UNIQUE,
  travel_plan_enabled TINYINT(1) NOT NULL DEFAULT 1,
  dg_advance_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO unit_features (unit_id, travel_plan_enabled, dg_advance_enabled)
VALUES ('SD1',1,1),('SD3',1,1),('MA2',1,1),('MA4',1,1),('D2F',1,1),('INDOFIL',1,1);
```

### 2.3b Designation mapping seed (needed so the sample import + dropdowns work)

The sample Excel uses **Sales Ignition Officer (id 1)** and **Zonal Head (id 22)** for INDOFIL — map them so the sample imports cleanly and the designation dropdown shows them:

```sql
INSERT IGNORE INTO pfu_designations (pfu, designation_id, created_at, updated_at)
VALUES ('INDOFIL', 1, NOW(), NOW()),   -- Sales Ignition Officer
       ('INDOFIL', 22, NOW(), NOW());  -- Zonal Head
```

### 2.4 Permissions (prevents Spatie `PermissionDoesNotExist` — a missing row crashes login/admin pages)

**Step 1 — create ALL new permissions** (each is `guard_name = 'web'`; running this is idempotent):

```sql
INSERT IGNORE INTO permissions (name, guard_name, created_at, updated_at) VALUES
  ('dg-advance-process', 'web', NOW(), NOW()),   -- DG advance processor/admin actions
  ('dg-advance-view',    'web', NOW(), NOW()),   -- DG advance list/detail access
  ('limit-master-view',  'web', NOW(), NOW()),   -- expense master list
  ('limit-master-create','web', NOW(), NOW()),   -- create/update limits (form + import)
  ('designation-mapping-view', 'web', NOW(), NOW()),  -- designation mapping page
  ('designation-mapping-manage','web', NOW(), NOW()), -- add designation + map to unit
  ('feature-toggle-view', 'web', NOW(), NOW()),  -- unit feature access page
  ('feature-toggle-manage','web', NOW(), NOW()), -- enable/disable Travel Plan / DG Advance
  ('enforcement-view',   'web', NOW(), NOW()),   -- enforcement page
  ('enforcement-manage', 'web', NOW(), NOW());   -- set A/B/C modes
```

**Step 2 — grant to roles** (admin gets everything; `tr admin`, `Hr Admin`, `processor` get the working set):

```sql
-- admin / Super Role / Super Admin / admin user → ALL new permissions
INSERT IGNORE INTO role_has_permissions (permission_id, role_id)
SELECT p.id, r.id FROM permissions p, roles r
WHERE p.guard_name = 'web'
  AND p.name IN ('dg-advance-process','dg-advance-view','limit-master-view','limit-master-create',
                 'designation-mapping-view','designation-mapping-manage',
                 'feature-toggle-view','feature-toggle-manage','enforcement-view','enforcement-manage')
  AND r.name IN ('admin','Super Role','Super Admin','admin user');

-- tr admin / Hr Admin / processor → operational set
INSERT IGNORE INTO role_has_permissions (permission_id, role_id)
SELECT p.id, r.id FROM permissions p, roles r
WHERE p.guard_name = 'web'
  AND p.name IN ('dg-advance-process','dg-advance-view','limit-master-view','limit-master-create',
                 'designation-mapping-view','feature-toggle-view')
  AND r.name IN ('tr admin','Hr Admin','processor');
```

> ⚠️ The `dg-advance-process` row is the **critical one** — every login (`verify-otp`) and every admin page (sidebar) checks it. If it's missing, login returns 500 (`PermissionDoesNotExist`). The code is now hardened with try/catch, but the permission should still be created.

### 2.5 Multi-company column (users table — still pending on UAT)

```sql
ALTER TABLE users ADD COLUMN company_ids JSON NULL AFTER company_id;
```

### 2.6b Block app access per employee (admin toggle)

```sql
ALTER TABLE sender_details ADD COLUMN app_access TINYINT NOT NULL DEFAULT 1 AFTER status;
```

Or via the migration `2026_08_12_000002_add_app_access_to_sender_details_table.php` (`php artisan migrate --force`). When `app_access = 0`: OTP send/verify and password login are rejected (403), and any existing logged-in session is killed by the JWT middleware.

### 2.6 App password login (mobile + password + DOB) — **MUST run before deploying the password code**

```sql
ALTER TABLE sender_details ADD COLUMN password VARCHAR(255) NULL AFTER telephone_no;
```

Or deploy via the migration (ships in the branch): `php artisan migrate --force` — the migration `2026_08_12_000001_add_password_to_sender_details_table.php` guards with `Schema::hasColumn`, so it's safe either way.

> ⚠️ **Deploy order matters:** the change-password endpoint 500s with `Unknown column 'password'` until this column exists. Add the column first (or run `migrate --force`), then deploy the code.

---

## 3. New admin pages (verify after deploy)

| URL | Purpose |
|---|---|
| `/dg-advance` | DG advance request list + status filters + over-limit badges |
| `/dg-advance/limits/list` | Employee monthly limits (unit/company filter + pagination) |
| `/enforcement` | A/B/C enforcement mode per company |
| `/unit-features` | Enable/disable Travel Plan & DG Advance cards per unit |
| `/limit-master-list` | Expense master — now has the "Limit Enforcement" drawer button |

Sidebar (Reports & Admin): **DG Advance · Feature Access · Enforcement**

---

## 4. Post-deploy verification checklist

1. `curl -X POST https://host/api/send-otp -d '{"phone":"7973338279"}'` → OTP sent
2. Login via app with that OTP → **no 500**; profile/verify-otp returns:
   - `enforcement_mode` (A/B/C)
   - `features: { travel_plan_enabled, dg_advance_enabled }`
   - `can_process_dg_advance`
3. `/unit-features` → disable Travel Plan for D2F → D2F employee app reload → Travel Plan card **hidden**; `travel-plan/*` API → 403
4. `/enforcement` → set D2F = A → employee cannot add a bill above category limit (422 "Category limit exceeded")
5. `/dg-advance` loads (no 500), limits page paginates, filter shows all units for super admin
6. Old flows intact: TER claim submit, supervisor approve/reject, dashboard charts, reports

---

## 5. Status flow (DG advance — single source of truth)

```
pending_supervisor → approved → pending_processor → paid → bills_pending → settled
        │                │
        ├→ returned_for_revision → (employee edits) → pending_supervisor
        └→ rejected
```

- **Monthly cap:** `sum(requests in current calendar month, excl. cancelled/returned) + new > employee_limit` → 422 in mode A; flagged (`over_limit_flag=1`) in modes B/C
- Only one **active** request per employee
- Settlement upload only after `paid`; `mark-settled` needs ≥1 bill
- Feature gates: `dg_advance_*` and `travel-plan/*` return 403 when the unit's toggle is off

---

*Run §0 pre-flight first. If anything is missing, apply the matching §2 block before testing.*
