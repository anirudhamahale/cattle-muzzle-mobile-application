# Pashu Muzzle ID

A React Native (Expo SDK 58) app for registering cattle and buffalo by their **muzzle print**, which is as unique to an animal as a fingerprint is to a person.

- **Two account types**
  - **Cattle owner** (a Gaushala or an independent farmer): registers animals and sees only their own herd.
  - **Veterinary doctor**: sees every animal, registers animals on behalf of owners, verifies identities, and adds health records.
- **Muzzle capture** in three ways: the camera with an alignment guide (the photo is auto-cropped to the guide), a short video (the best frames are extracted automatically), or the gallery (photos and videos).
- **Tabs**: Home dashboard · All cattle · Register · Profile.
- **Offline-first**: data lives in SQLite on the device, and photos are stored under the app's documents directory.

Age bands and use categories follow the DAHD *21st Livestock Census Operational Guidelines* (2024). The form only offers uses that match the animal's sex, and it shows each animal's census age band.

## Requirements

- Node 20+ (tested with Node 22)
- For local native builds: Xcode (iOS) and/or Android Studio with JDK 17
- Or an [EAS](https://expo.dev/eas) account to build in the cloud

This app uses native modules (camera, SQLite, video, secure store), so it runs in a **development build**, not Expo Go.

## Getting started

```bash
npm install
cp .env.example .env.local     # optional: set the muzzle model URL

# Local development build (generates ios/ / android/, installs on simulator/device)
npx expo run:ios
npx expo run:android

# …or build the dev client in the cloud
npx eas-cli@latest build --profile development --platform android   # APK
npx eas-cli@latest build --profile development --platform ios

# Then start the JS dev server and open the installed dev client
npx expo start --dev-client
```

The camera does not work in the iOS Simulator. Test muzzle capture on a real device. The Simulator's photo library still works with the **Gallery** option.

### Scripts

| Command | Purpose |
| --- | --- |
| `npx expo start --dev-client` | Start Metro for the development build |
| `npx tsc --noEmit` | Type-check |
| `npx expo lint` | Lint |
| `npx expo-doctor` | Check dependency and config health |

## Muzzle detection

The capture pipeline lives in `src/lib/muzzle/`:

1. **Capture**: the camera screen (`src/app/(app)/capture.tsx`) shows an alignment guide. Photos are cropped to the guide area, with a little padding, and downscaled to at most 1280 px.
2. **Video**: the app samples 6 frames across the clip with `expo-video`, runs detection on each frame, and keeps the best 3.
3. **Detection**: each image goes to a `MuzzleEngine`, which returns `found`, `confidence`, an optional bounding box, and quality issues. A shot needs a confidence of at least 60% to count. One shot is required and three are recommended.
4. **Identification**: when you save, the app requests an embedding for each shot and averages them. It then compares the average to every enrolled animal using cosine similarity. A match at or above the threshold triggers a **possible duplicate** warning.

### Demo mode vs. a real model

No muzzle model is bundled with the app. If `EXPO_PUBLIC_MUZZLE_API_URL` is not set, the app runs a **demo detector**:

- It does real resolution checks.
- The confidence scores are simulated.
- It produces no embeddings, so duplicate detection is off.

The app shows a "Demo detector" banner in this mode. Connect a trained model to get real detection and identification.

### Muzzle model API

Your server must implement these two endpoints. Each accepts a `multipart/form-data` upload with a JPEG in the field `image`.

```
POST {EXPO_PUBLIC_MUZZLE_API_URL}/v1/muzzle/detect
→ { "found": true, "confidence": 0.93, "box": { "x": 0.1, "y": 0.2, "width": 0.6, "height": 0.5 }, "issues": ["Slight blur"] }
   (box is normalised 0–1; box and issues are optional)

POST {EXPO_PUBLIC_MUZZLE_API_URL}/v1/muzzle/embed
→ { "embedding": [0.012, -0.443, ...] }
```

A typical backend has two stages:

1. A detector (for example YOLO) trained on cattle muzzle crops.
2. A metric-learning embedding network (for example a ResNet or ViT trained with ArcFace or triplet loss) on muzzle prints.

Tune `EXPO_PUBLIC_MUZZLE_MATCH_THRESHOLD` against your model's validation set.

To run the model on the device instead, implement the `MuzzleEngine` interface in `src/lib/muzzle/types.ts` (for example with `react-native-fast-tflite`) and select it in `src/lib/muzzle/index.ts`.

## Project structure

```
src/
  app/                       Expo Router routes
    _layout.tsx              fonts, SQLite, auth; guards (auth) vs (app)
    (auth)/                  role choice, login, register
    (app)/(tabs)/            Home, All cattle, Register, Profile
    (app)/cattle/[id].tsx    cattle profile (photos, video, health records)
    (app)/capture.tsx        full-screen muzzle camera
    (app)/health-record.tsx  doctor-only health record form
  components/                UI kit (ui/) and feature components
  constants/                 design tokens, census reference data
  db/                        SQLite schema/migrations and queries
  lib/                       auth, media persistence, muzzle pipeline
```

## UI

The design follows [UI UX Pro Max](https://www.uupm.cc):

- **Palette**: the *Agriculture/Farm Tech* palette (earth green `#15803D` and harvest gold `#A16207`).
- **Style**: *Organic Biophilic* (rounded 16–24 px) combined with *Accessible & Ethical* (high contrast, 16 px body text, touch targets of 44 px or more).
- **Typography**: Plus Jakarta Sans.
- **Icons**: Lucide SVG icons.
- **Theme**: the app is locked to light mode because it is used outdoors, where a light theme stays readable in sunlight.

## Going to production

This build is a working foundation. A few things are deliberately local and need a backend before rollout:

- **Authentication** is device-local: SHA-256 password hashes are stored in SQLite, and the session lives in SecureStore. Replace it with server auth (OTP is a good fit for this audience).
- **Data** stays on one device. To share it between owners and doctors, add a sync API.
- **Doctor accounts** are self-registered. Verify veterinary council registration numbers before you grant doctor access.
