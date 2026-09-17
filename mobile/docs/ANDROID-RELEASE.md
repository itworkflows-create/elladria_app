# Android release work - 2026-09-17

## Implemented in this pass

- Android package approved and set to com.elladria.app.
- Added Forgot password, email recovery via PKCE, and a new-password screen with expired-link handling.
- Added account deletion with password confirmation and a server function that removes only the verified candidate's documents and account, with staff-account protection. The function is not yet deployed.
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

- In Supabase Authentication > URL Configuration, allow elladria://reset-password and the final web origin with /?recovery=1. Verify real email delivery and password change on the same device that requested the link. Expo Go cannot validate the custom scheme; use the signed preview build.
- Deploy supabase/functions/delete-account, then verify it using an explicitly created disposable candidate account. No real candidate account was deleted during development.
- Confirm real office addresses, available appointment times, and booking operations.
- Confirm hosted migrations 003 and 004 are applied (local permission tests do not prove hosted state).
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
- 30 app/domain/session/recovery/deletion/release-configuration tests passed.
- Deletion handler and server adapter type-check against Supabase SDK 2.116.0 with a minimal Deno type shim; the hosted Deno runtime is not yet tested.
- Isolated PGlite database permission checks passed; database migrations were not changed in this pass.
- Android and iOS Hermes bundles and the web export succeeded. These are not signed installation packages.
- Headless Chrome at 390px passed onboarding, profile navigation, empty login validation, recovery request, expired callback, password mismatch/update, deletion cancellation/confirmation, layout overflow and uncaught-error checks. All backend writes were mocked. Hosted authenticated flows and physical Android behavior remain unverified.

Reference: https://docs.expo.dev/build-reference/app-versions/ and https://docs.expo.dev/eas/environment-variables/

## Supabase account-management setup

From the repository root, after signing into the owner's Supabase account:

    npx supabase login
    npx supabase functions deploy delete-account --project-ref qaoihforpilrmrjdzbjr

The function uses server-provided SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY. Never copy the service-role key into the mobile environment. supabase/config.toml disables the legacy gateway JWT check for this function; the handler verifies every bearer token using Auth.getUser and rechecks the password before any deletion. Do not remove this explicit authentication.

Auth deletion relies on existing cascading foreign keys to remove the profile, applications and appointments. Storage is cleaned first, in pages. If cleanup fails, the account is retained and the user sees a retry message explaining that some documents may already have been removed. Staff accounts cannot self-delete through this endpoint.

Password recovery uses a same-device PKCE verifier. In Supabase Authentication > URL Configuration, add elladria://reset-password and the exact production web URL with /?recovery=1; add the equivalent localhost URL only for local browser testing. Confirm the recovery email template uses the configured redirect.
