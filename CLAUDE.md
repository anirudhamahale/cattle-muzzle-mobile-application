# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## App

Expo SDK 58 / React Native 0.88 / React 19.3 app ("Pashu Muzzle ID"), TypeScript, Expo Router (routes in `src/app/`). See also `AGENTS.md` (Expo's guidance: always `npx expo install`, check versioned docs at `docs.expo.dev/versions/v58.0.0/` rather than memory). Runs in a **development build** (`expo-dev-client`), not Expo Go.

Commands: `npx expo run:ios|android` (local dev build), `npx expo start --dev-client`, `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`. No test suite yet. The user's `~/.npm` cache has permission problems — if `npm install` fails with EACCES, set `npm_config_cache` to a scratch directory rather than touching `~/.npm`.

Architecture:
- `src/app/_layout.tsx` — fonts → `SQLiteProvider` (migrations in `src/db/schema.ts`, `PRAGMA user_version`) → `AuthProvider` → Stack (`index`, `onboarding`, `auth`, `(app)`).
- Logged-in state deliberately mirrors the user's other app (`~/Documents/Mobile/grievance_app_react/utils/authContext.tsx`): `src/lib/auth.tsx` exposes `isReady` / `isLoggedIn` / `user` / `logIn` / `logOut` (which `router.replace` to `/home` and `/auth/login`); flags live in `expo-sqlite/kv-store` (AsyncStorage-compatible) with the user id in SecureStore; `src/app/index.tsx` is the gate (home → else onboarding on first launch → else login); `(app)/_layout.tsx` guards with `if (!isReady) return null; if (!isLoggedIn) <Redirect href="/auth/login" />`. Keep this pattern rather than `Stack.Protected`.
- Roles: `owner` — shown to users as **"User"** (`owner_type` gaushala | farmer; sees only own cattle) — and `doctor` (sees all, can add cows for any user or "Myself", verifies, adds health records). Scoping lives in `scope()` / `canView()` in `src/db/cattle.ts`. Auth is device-local (SHA-256 + salt in SQLite) — a placeholder for server auth.
- Tabs (`(app)/home/`, URL `/home/*`) use `expo-router/js-tabs` (root `Tabs` export is deprecated in SDK 58): Home, All cattle, Scan, Add cow, Profile. Scan (`home/scan.tsx`) identifies by muzzle embedding (needs the model server) or ear tag; users see details only for their own animals.
- Muzzle pipeline `src/lib/muzzle/`: `MuzzleEngine` interface; `remote-engine.ts` (REST, enabled by `EXPO_PUBLIC_MUZZLE_API_URL`) or `demo-engine.ts` (simulated — no model exists in this repo). `pipeline.ts` crops camera shots to the on-screen guide and samples video frames via `expo-video` `generateThumbnailsAsync` (`expo-video-thumbnails` is deprecated). Camera → form hand-off goes through `src/lib/capture-store.ts`.
- Media is copied from cache into `documents/cattle/<id>/` on save (`src/lib/media.ts`).
- UI tokens in `src/constants/theme.ts` follow UI UX Pro Max (uupm.cc) "Agriculture/Farm Tech" palette; light mode only. Census age bands/uses in `src/constants/cattle.ts`.

The muzzle-recognition requirement comes from the project owner; neither reference PDF mentions it.

## Reference documents

- `21stLCOperationalGuidelines.pdf` (60 pages, has a text layer) — DAHD's operational guidelines for India's 21st Livestock Census (2024). Extract with `python3 -I -c "import pypdf; ..."` (pypdf is installed; poppler/pdftotext is not).
- `21stLivestockCensus2024 schedule details.pdf` (242 pages, ~438 MB, **scanned images with no text layer**) — the census schedules/forms. Text extraction returns nothing; OCR is needed, and avoid loading the whole file at once.

## Domain context (from the operational guidelines)

- **Schedules**: Schedule I = village/urban-ward level (identification particulars, stray cattle, stray dogs); Schedule II = household/enterprise demographics and socio-economic details; Schedule III = per-unit headcount of 16 livestock species + poultry, by breed, sex, age and use.
- **Respondent unit types**: Household (HH), Household Enterprise (HHE), Non-Household Enterprise (NHHE), Institution.
- **Cattle categories** differ by type — exotic/crossbred vs indigenous have different age bands (e.g. indigenous male: up to 2 yrs / over 2 yrs; crossbred male: up to 1½ / over 1½), and use options depend on sex (males: breeding/agriculture/both/bullock cart/others; females: in-milk/dry/not calved once/others). The guidelines call for in-app validation so sex-inappropriate uses are not offered.
- **Hierarchy & workflow**: Enumerator → Supervisor → District Nodal Officer (DNO) → State Nodal Officer (SNO) → Central Admin. Rejections flow back down to the enumerator (the only role that can edit data); rejected fields are marked red and only red fields are editable; corrected fields are green. SNO can bounce a whole village/ward back when household or animal-by-sex counts deviate >25% from the 20th census. Supervisors/DNOs record "physically visited" remarks.
- **Location model**: State → District → Tehsil → Village/Urban ward, using Local Government Directory (LGD) codes for interoperability.
- **Official app context**: the official census app is an Android app by DAHD's National Digital Livestock Mission (NDLM), runs on enumerators' own devices, supports offline capture, ships breed reference photos (from ICAR-NBAGR), and feeds a role-based real-time dashboard that tracks tagged vs untagged animal counts.
