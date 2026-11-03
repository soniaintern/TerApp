# TER App — iOS Readiness Audit

Audit date: 31 Aug 2026 · Target: App Store / TestFlight readiness (Expo SDK 54, RN 0.81.5)

**Verdict: READY with 2 fixes applied + 4 checklist items for release.**

---

## 1. Safe areas (notch / Dynamic Island / home indicator) — PASS

| Area | Status |
|---|---|
| All screens use `ScreenBackHeader` (safe-area-aware) or `useSafeAreaInsets` | ✅ Passed |
| Screens verified: Track, ViewTrack, TravelPlan x3, ClaimReview, TravelPlanReview, ChangePassword, MyAccount, ClaimGuide, TER detail, Add/Edit Bill, TerScreen, HomeScreen, SupervisorScreen, DgAdvanceScreen, OTP, Password login | ✅ Passed |
| No hardcoded top paddings (44–64px) that collide with the status bar found | ✅ Passed |
| Bottom home indicator: content scrolls with `paddingBottom: 40` on all lists/forms | ✅ Passed |

## 2. Keyboard handling — PASS (2 fixes applied)

| Screen | Keyboard handling | Status |
|---|---|---|
| Login (OTP) / Password login / OTP verify | `KeyboardAvoidingView` + insets | ✅ |
| Add Bill / Edit Bill | KAV + scroll + `automaticallyAdjustKeyboardInsets` | ✅ |
| DG Advance (form + action modal) | KAV (form + modal sheet, scrollable) | ✅ |
| Travel Plan form (screen + day modal) | KAV (both) | ✅ |
| Supervisor reject/remark modals (Claim + Travel Plan) | KAV | ✅ |
| Track search | `automaticallyAdjustKeyboardInsets` | ✅ |
| **Change Password** | Was missing entirely — **FIXED**: KAV (padding iOS / height Android) + `automaticallyAdjustKeyboardInsets` | ✅ |

## 3. Touch targets (Apple: ≥44pt) — PASS

- Back button: 40pt + 12pt hitSlop on all sides → **64pt effective** ✅
- Primary buttons: 50–56pt height ✅
- Inputs: 50pt height ✅
- Category chips / day chips: ~36–40pt (borderline) — below-44pt only on chips; acceptable, optional polish item

## 4. Orientation / layout — PASS

- Portrait locked in `app.json` ✅
- `softwareKeyboardLayoutMode: "resize"` ✅
- All forms scrollable on small screens (iPhone SE / mini) after today's fixes ✅
- Dark mode: `userInterfaceStyle: automatic` + per-screen dark palette ✅ (contrast verification is manual — see checklist)

## 5. Build & metadata — PASS

| Item | Status |
|---|---|
| Bundle id `com.finfect.ter` | ✅ |
| Camera/photo permission strings (`NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`) | ✅ |
| Export compliance `ITSAppUsesNonExemptEncryption: false` | ✅ |
| App icon `assets/icon.png` — **1024×1024, no alpha** | ✅ |
| Splash configured (expo-splash-screen plugin) | ✅ |
| `eas.json` production profile + `autoIncrement` (versionCode/buildNumber) | ✅ |

## 6. Fixed today (code)

1. **ChangePasswordScreen** — keyboard covered password fields & button on iOS; wrapped in `KeyboardAvoidingView` + scroll insets.
2. **DgAdvanceScreen** — requested amount & settle bill amount allowed decimals/symbols; now digit-only (`number-pad` + strip), consistent with TER policy.

## 7. Release checklist (remaining — not code, needed before App Store)

- [ ] **Account deletion** (Apple requirement since 2022): add an account-deletion flow or documented URL/email for users to delete accounts & data.
- [ ] **Privacy policy URL** to submit in App Store Connect.
- [ ] **Dark-mode contrast spot check** on a physical iPhone (text on gradient heroes, chips, badges).
- [ ] **TestFlight pilot run** on iPhone SE (smallest) + iPhone 15/16 Pro — forms, keyboard, PDF open.
