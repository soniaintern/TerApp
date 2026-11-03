# TER Mobile App

React Native (Expo) mobile application for **Travel Expense Reimbursement** — used by employees of Frontiers & D2F (Agriwings) to submit expense claims, attach bill photos, generate reimbursement requests (UNID), and track payment status.

A 1:1 functional rebuild of the legacy Flutter TER app, consuming the same Laravel backend APIs.

---

## Features

- 🔐 **OTP login** — SMS one-time password, JWT session, auto-login on relaunch
- 📄 **Expense claims** — add/edit/delete bills with photo attachments (stored on S3)
- 📊 **Category limits** — per-category claimable amounts with bill counts
- ✅ **Claim TER** — generate a UNID and submit for approval (visible for current + previous 3 months only)
- 🚚 **Track reimbursements** — full status lifecycle (submitted → received → handover → Finfect → paid), UNID search, UTR numbers
- 🌙 **Dark mode** — persisted light/dark theme toggle
- 🎨 **Finfect brand theme** — teal `#186E93` / `#13C7A8` design system, branded splash screen

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 (TypeScript) |
| Navigation | React Navigation v7 (native-stack + bottom tabs) |
| State | Zustand |
| HTTP | Axios (JWT interceptor, multipart uploads) |
| Local storage | AsyncStorage |
| Images | expo-image-picker |
| Icons | MaterialCommunityIcons (@expo/vector-icons) |
| Gradients | expo-linear-gradient |
| Illustrations | Custom SVG (react-native-svg) |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Expo Go app on your device (**SDK 54** — must match)
- Access to the TER backend (`https://ternew.etsbeta.com/`)

### Install & run

```bash
npm install
npx expo start --clear
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

> `--clear` resets the Metro cache — always use it after installing/updating packages.

### Type check

```bash
npx tsc --noEmit
```

### PWA policy data

The PWA export includes both policy-limit workbooks under `dist/data/`, and the deployment script publishes them with the built site. They are available at `/data/INDOFIL_LimitMaster_Import_Sample.xlsx` and `/data/INDOFIL_Limits_Confirmed_Import.xlsx`. The current app still gets claim limits from its backend API; these workbooks are packaged as static deployment data and are not parsed by the app.

---

## Environment

The API base URL and S3 attachment root are defined in [`src/utils/constants.ts`](src/utils/constants.ts):

```ts
export const BASE_URL = 'https://ternew.etsbeta.com/';
export const S3_BASE   = 'https://terfinfect.s3.us-east-2.amazonaws.com/';
```

---

## Project Structure

```
src/
├── api/          # Axios client + typed endpoint modules (auth, profile, ter, bill)
├── components/   # GradientCard, StatusChip, PrimaryButton, FormField, ProgressBar, Illustrations
├── screens/
│   ├── auth/     # Login, OTP
│   ├── home/     # MyAccount
│   ├── ter/      # TerScreen, TerDetail, AddBill, EditBill
│   └── track/    # TrackScreen, ViewTrack
├── store/        # Zustand auth store (token, user, session restore)
├── theme/        # Design tokens + dark/light ThemeContext
├── types/        # API & navigation TypeScript types
└── utils/        # storage, date helpers, constants, API response normalizer
```

---

## API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `api/send-otp` | POST | — | Send OTP to phone |
| `api/verify-otp` | POST | — | Verify OTP → JWT token |
| `api/profile` | GET | JWT | Employee profile |
| `api/expense-limit-data` | POST | JWT | Category limits / TER list |
| `api/unid-generate` | POST | JWT | Submit TER (generate UNID) |
| `api/fetch-bills` | GET | JWT | Bills by date range + category |
| `api/create-billItem` | POST | JWT | Add bill (multipart) |
| `api/update-billItem` | POST | JWT | Update bill (multipart) |
| `api/delete-billItem` | POST | JWT | Delete bill |

### API notes

- `expense-limit-data` returns `data` as a **single object** (when called with dates) or an **array** (without dates) — handled by `normalizeDataArray()` in [`src/utils/api.ts`](src/utils/api.ts)
- Bill attachments are S3 keys — full URL = `S3_BASE + attachment`
- `getAllData` (no dates) is limited to the **last 11 months** server-side

---

## TER Status Lifecycle

| Code | Status |
|---|---|
| 14 | UNID generated |
| 1 | Received |
| 2 | Handover |
| 3 | Sent to Finfect |
| 4 | Pay later / F&F |
| 5 | Paid |
| 0 | Payment failed |
| 7 | Partially paid |
| 8 / 13 | Rejected / payment rejected |
| 10 | Rejected by HR |
| 6 | Cancelled |

---

## Documentation

Full implementation details — architecture, screen flows, design system, Flutter parity notes and known constraints — are in [`TER_APP_DOCUMENTATION.md`](TER_APP_DOCUMENTATION.md).

---

## License

Private / internal use.
