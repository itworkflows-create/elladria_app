# Verification record

Verified on 2026-09-14 in this Windows workspace.

- TypeScript: `npm run typecheck` passed.
- Domain tests: six tests passed, covering search/filter combinations, saved-job toggles, registration validation, future weekday dates across year boundaries, duplicate booking prevention/cancellation, and malformed storage recovery.
- Expo Doctor: 21/21 checks passed.
- Metro export: generated Android and iOS Hermes bundles and a web preview successfully. These are bundles, not signed installation packages.
- Headless Chrome browser preview: passed search, saving, form errors, demo registration, application, reminder, booking, duplicate time prevention, staff completion, restart persistence and language-switch flows, with no uncaught runtime errors.
- Viewports: 320, 390, 430 and 768 pixels checked for page overflow. Phone screenshots inspected for home, language selection, job details, booking and Sinhala home.
- Native Alert confirmations, Android hardware back, native sharing, keyboard/safe-area behavior and physical-device rendering have not been device-tested.
- Dependency audit reports 10 moderate findings through Expo's build-tool dependency chain (`xcode` → `uuid`). The suggested automatic fix downgrades Expo to SDK 46, so it was not applied. See `audit-report.json`; recheck upstream before a production release.

The source screenshots in this folder are browser renders of the shared native UI, not captures from an iPhone or Android device.
