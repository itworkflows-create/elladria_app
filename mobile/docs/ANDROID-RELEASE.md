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

## Preview APK build - 2026-09-18

- Expo login verified for `it-elladria`.
- Linked `@it-elladria/elladria-mobile`, project ID `07369ef0-e90a-4656-8388-a5b9fbfd1557`.
- Configured the public Supabase URL and publishable key in the EAS preview environment. Production environment setup is still pending.
- Generated Android signing credentials on EAS.
- Added `.easignore` to exclude local environment files, generated previews, and logs from the mobile upload.
- Submitted preview APK build: https://expo.dev/accounts/it-elladria/projects/elladria-mobile/builds/e38816b3-f47f-445f-a454-22496220ac82
- TypeScript and all 30 tests passed before submission. Physical-device testing remains pending.
- Local build invocation needs the two public Supabase variables in the process environment because the release configuration validates them before EAS fetches cloud variables. Do not remove the release validation.
- This machine uses the portable Node runtime in `.tools/node-v22.23.2-win-x64`. Git is unavailable on PATH, so this build used `EAS_NO_VCS=1` with `EAS_PROJECT_ROOT` set to `mobile`.

The earlier September 17 checklist is historical: Expo linking, preview environment setup, and signing setup are now complete. Backend deployment and live acceptance checks listed above remain pending.

- Build result: FINISHED. Signed preview APK generated successfully on 2026-09-18.
- APK download: https://expo.dev/artifacts/eas/7VEYzVx9GTsuUL68B9oGnCt6_lwsYYqVkdglaDT69UU.apk
- Install this build on a physical Android phone for acceptance testing; it has not yet been device-tested.
## Device push notifications - 2026-09-19

Implemented client permission requests, an Android high-importance Elladria updates
channel, default notification sound/vibration, Expo push-token registration, RLS-protected
per-user token storage, sign-out cleanup, announcement broadcasts, and targeted application
status notifications. Foreground notifications show a banner and play sound.

Required cloud setup before testing:

1. Apply supabase/migrations/202609190001_push_notifications.sql.
2. Deploy supabase/functions/send-notification.
3. Configure Android FCM V1 credentials in the Elladria EAS project.
4. Build and install a new preview APK; the previous APK does not contain the native notification module.
5. Sign in as a candidate and allow notifications when Android prompts.
6. From the staff portal, publish an enabled announcement or change that candidate's application status.
7. Verify delivery with the app foregrounded, backgrounded, and closed.

Use npx eas-cli credentials --platform android to manage Android push credentials.
The FCM service-account JSON is private and must never be committed or placed in an
EXPO_PUBLIC_ variable. iOS delivery additionally requires Apple push credentials and a
new iOS build. Expo Go is not the release acceptance environment; use an EAS development
or preview build on a physical device.
## Notification-enabled preview APK - 2026-09-19

- Firebase Android app configured for `com.elladria.app` in project `elladria-1a0fd`.
- Added `mobile/google-services.json` and connected it through the Expo app configuration.
- Uploaded and assigned the Firebase service-account key to Elladria EAS for FCM V1. The private key remains outside the repository.
- EAS preview build `830e4fd7-429b-465e-9a59-3322795d6466` finished successfully.
- Build details: https://expo.dev/accounts/it-elladria/projects/elladria-mobile/builds/830e4fd7-429b-465e-9a59-3322795d6466
- APK: https://expo.dev/artifacts/eas/rzIKtanwQ_rwQUIRKL2RxHg3Eb21D5SRAAwzw6O5h-Y.apk
- Install this new APK because earlier preview builds do not include the native notification module.
- Device acceptance test: sign in, allow notifications, then test an enabled admin announcement and an application status change while the app is open, in the background, and closed.
