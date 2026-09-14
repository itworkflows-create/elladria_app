# Elladria mobile demo

React Native + Expo + TypeScript app for iOS and Android, based on the supplied Stitch layouts. The original reference folder is preserved.

## Run on a phone

From this folder in PowerShell:

```powershell
.\run-mobile.ps1
```

Or with Node.js 22.13+ installed:

```sh
cd mobile
npm ci
npm start
```

Open the project in a compatible Expo Go installation, using the QR code printed by Expo. Keep the phone and computer on the same network. The app uses Expo SDK 57. If your installed Expo Go does not support that SDK, use a compatible development build; see [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/).

A checksum-verified portable Node.js runtime was downloaded into `.tools/` because Node was not available on PATH. This directory is ignored by Git. `run-mobile.ps1` automatically uses that runtime. Dependencies are installed in `mobile/node_modules/`.

## Implemented demo flows

- Language selection: English, Sinhala, Tamil; preference persists.
- Home: quick actions, featured vacancy, bottom navigation.
- Jobs: search by title/company/city/category, category filters, details, saved jobs.
- Registration: name, Sri Lankan mobile number, email, and password validation. Password stays only in transient form state and is never persisted or sent.
- Applications: local application records, visible in Profile. Registration returns to the selected job so the user can apply.
- Reminders: persistent in-app list, with no scheduled or push notifications.
- Appointments: three sample offices, future weekday dates, time selection, purpose and notes, duplicate time prevention, cancellation.
- Staff preview: mobile dashboard, local candidate directory, appointment completion.
- Reset: clear this device's demo data from Profile.

All data is local demo data in AsyncStorage. No backend, real authentication, employer submission, or real office reservation is connected. Staff preview is intentionally accessible to demonstrate the layout; it is not an authorization system. Use fictional profile information. Factory-job details and office addresses come from the supplied layouts; other job listings are illustrative. Sinhala/Tamil interface copy is a draft, with English fallback for untranslated text and job content.

## Checks

```sh
cd mobile
npm run typecheck
npm test
npx expo-doctor
npm run export:all
```

The export command creates JavaScript bundles and assets for iOS, Android, and a browser preview in `mobile/dist`. These are not installable APK/IPA files. Native runtime and device testing are still required.

## Native builds

`mobile/eas.json` contains preview and production build profiles. Before creating signed builds, configure the actual Expo project, confirm the application identifiers (currently `com.elladria.demo`), and provide the relevant signing credentials. iOS local compilation requires macOS/Xcode; cloud builds can be configured with EAS. No signing, store upload, or publishing has been performed.

## Source map

- `mobile/App.tsx`: app state, navigation and screens.
- `mobile/src/forms.tsx`: registration and booking forms.
- `mobile/src/ui.tsx`: reusable native controls and design tokens.
- `mobile/src/domain.ts`: demo fixtures, filtering, validation and booking rules.
- `mobile/src/i18n.ts`: draft interface translations.
- `mobile/tests/domain.test.mjs`: behavioural tests.
- `stitch_remix_of_elladria_recruitment_portal/`: supplied reference HTML, screenshots and design guide.

Next production stage: API integration, authenticated candidate/staff roles, server-side booking availability, verified vacancy data, complete reviewed translations, push notifications, and physical-device acceptance testing.
