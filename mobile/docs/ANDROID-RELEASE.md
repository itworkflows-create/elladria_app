# Android release work - 2026-09-17

## Implemented in this pass

- Network/server errors no longer masquerade as expired customer sessions.
- Token refresh preserves the current profile; changing accounts clears private data.
- Customer refresh requests do not overlap or overwrite an in-flight mutation.
- Late mutation results are discarded after account changes/sign-out.
- Native customer polling pauses in the background and refreshes on foreground.
- Account screens expose restoration and connection errors; empty login submissions are rejected.
- Cloud-backed vacancies no longer carry local-demo labels. Shared job text includes the actual country.
- EAS preview explicitly builds an APK; production explicitly builds an Android App Bundle with remote versioning.
- Both EAS profiles require Supabase configuration and reject missing, placeholder or privileged keys.

## Still required before calling the first three tasks complete

- Implement and verify password recovery and account deletion against hosted Supabase.
- Confirm real office addresses, available appointment times, and booking operations.
- Confirm hosted migrations 003 and 004 are applied (local permission tests do not prove hosted state).
- Android package name approved and set to com.elladria.app. iOS identifier remains unchanged for the later Apple release.
- Owner needs to create an Expo account, then link this app to their Expo/EAS project. No projectId is currently configured.
- Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in both EAS preview and production environments. .env.local is ignored by Git and is not a substitute for cloud build variables.
- Set up Android signing in the owner's EAS account; produce and install a preview APK.
- Test real signup/email confirmation, restart/session restoration, application submission, booking/cancellation, document upload/removal, offline recovery, Android back button and keyboard on a physical device.
- Generate the signed production AAB after these checks pass. No signed APK/AAB has been generated or uploaded.

## Build commands after account/project setup

Run from mobile with a supported Node version:

    npx eas-cli login
    npx eas-cli init
    npx eas-cli build --platform android --profile preview
    npx eas-cli build --platform android --profile production

The preview APK is for device acceptance testing. The AAB is for Google Play.
Do not place service-role keys, database passwords, signing passwords or other server secrets in EXPO_PUBLIC variables.

## Verification

- TypeScript check passed after implementation.
- 20 app/domain/session tests passed; 2 additional release-configuration tests passed.
- Isolated PGlite database permission checks passed; database migrations were not changed in this pass.
- Android and iOS Hermes bundles and the web export succeeded. These are not signed installation packages.
- Browser checks use mocked catalog responses; they do not validate hosted authenticated flows or physical Android behavior.

Reference: https://docs.expo.dev/build-reference/app-versions/ and https://docs.expo.dev/eas/environment-variables/
