# TER App — App Store Compliance (Privacy Policy & Account Deletion)

Built 31 Aug 2026 · satisfies Apple's App Store Review requirements (privacy policy + in-app account deletion).

---

## 1. Privacy Policy page (live)

| Environment | URL |
|---|---|
| Local | `http://127.0.0.1:8099/privacy-policy` (any Laravel host works) |
| UAT | `https://ternew.etsbeta.com/privacy-policy` |
| Production | `https://ter.finfect.biz/privacy-policy` |

**Backend files**
- Route: `routes/web.php` → `Route::view('/privacy-policy', 'privacy-policy')` (public, no login)
- View: `resources/views/privacy-policy.blade.php` (standalone page)

**Before release, replace the placeholders in the view:**
- `[support email / HR contact]` (appears twice) — use the real HR/support email
- Company legal name if needed

**App Store Connect:** paste the production URL into **App Privacy → Privacy Policy URL**.

## 2. Account deletion

### In-app (primary — Apple requires in-app initiation)
- **My Account → Delete Account** (red row under Settings)
- Confirm dialog explains it's irreversible → calls `POST api/account/delete-request` (JWT-authenticated) → success → auto-logout

### Backend behaviour (`AccountController@requestDeletion`)
1. Records `account_deletion_requested_at`
2. **Soft delete** (business decision): `status` → `Inactive`, `app_access` → `0`, sets `account_deleted_at`
3. **No personal data is erased** — all records stay intact; HR can reactivate the account (revert status/app_access, clear `account_deleted_at`)
4. **Login is blocked afterwards** (`account_deleted_at` checks added in `sendOTP`, `loginPassword`, `verifyOTP`; `app_access=0` also blocks all app logins)
5. Invalidates the current JWT → session ends instantly

> Public/app wording follows Apple: "account and personal data are deleted, permanent, cannot log back in". Backend remains a soft delete (status → Inactive, app_access → 0) with **zero data loss** — HR can reactivate internally.

### Public info page (for reviewers / support links)
| Environment | URL |
|---|---|
| Local | `http://127.0.0.1:8099/account-deletion` |
| UAT | `https://ternew.etsbeta.com/account-deletion` |
| Production | `https://<production-domain>/account-deletion` |

View: `resources/views/account-deletion.blade.php` — steps, what happens, reversibility, contact.

## 3. App Store Connect fields to fill

| Field | Value |
|---|---|
| Privacy Policy URL | `https://<production-domain>/privacy-policy` |
| Support URL | `https://<production-domain>/account-deletion` (or company support page) |
| App Privacy — Account Deletion | Select **"In-app"** flow (plus the support email as backup) |
| Export Compliance | Already set: `ITSAppUsesNonExemptEncryption: false` |

## 4. Deploy steps (UAT / production)

```bash
php artisan migrate --force && php artisan optimize:clear
```

New/changed backend files:
- `database/migrations/2026_08_31_000001_add_account_deletion_columns_to_sender_details_table.php`
- `app/Http/Controllers/API/AccountController.php` (new)
- `app/Models/Sender.php` (fillable += deletion timestamps)
- `app/Http/Controllers/API/EmployeeLoginController.php` (login blocked for deleted accounts)
- `routes/api.php` (+`api/account/delete-request`), `routes/web.php` (+2 public pages)
- `resources/views/privacy-policy.blade.php`, `resources/views/account-deletion.blade.php` (new)

App side (next build): `src/screens/home/MyAccountScreen.tsx` — Delete Account row + confirm + logout.

## 5. Test checklist after deploy

- [ ] `GET /privacy-policy` → 200, content renders
- [ ] `GET /account-deletion` → 200
- [ ] App: My Account → Delete Account → confirm → logged out
- [ ] Re-login with the deleted number (OTP + password) → **blocked**: "This account has been deleted."
- [ ] Admin still sees historical bills with "Deleted User" (no personal data)
