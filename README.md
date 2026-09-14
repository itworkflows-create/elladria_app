# Elladria app and admin

React Native + Expo + TypeScript mobile demo for iOS and Android, with a separate desktop admin interface built into the same web export. The original Stitch layouts are preserved.

## Open the connected admin and app

From the project folder in PowerShell:

```powershell
.\run-admin.ps1
```

- Admin dashboard: http://localhost:8093/?admin=1
- Phone-sized app preview: http://localhost:8093/mobile-preview.html
- Candidate app: http://localhost:8093/

Keep this terminal running. After source changes, use `./run-admin.ps1 -Build` to rebuild before starting. If the server is already running, stop its terminal with Ctrl+C first. Node.js 22.13+ is required; the script automatically uses the checksum-verified portable runtime in `.tools/` when available.

## Admin features

- Overview with real catalog counts: published jobs, drafts, openings, and destinations.
- Create and edit vacancies: employer, country/city, category, salary, openings, working hours, contract, accommodation, benefits, description, requirements, and icon.
- Draft, publish, unpublish, archive, duplicate as draft, and permanently delete non-published jobs.
- Select one featured published vacancy for the app home screen.
- Search and filter jobs by status and category.
- Edit home-screen headline and introduction.
- Publish or hide an in-app announcement.
- Update support email and phone shown in the candidate Profile screen.
- Form validation, confirmations, unsaved-change prompts, and stale-write conflict detection.

The admin panel writes to a shared local catalog. Published jobs and saved app content are fetched by the mobile app every five seconds while connected. Draft and archived jobs are excluded from the public API. Categories and countries are derived from the published jobs. If a viewed job is removed, its detail page shows that it is unavailable. The app retains its last received public catalog for offline use and labels the connection state.

## Storage and local access

Catalog data is stored in `admin-server/data/catalog.json`, with a previous-version `.bak` file. Saves use a temporary file and atomic rename. Data survives server restarts. Data files are ignored by Git; back up this directory to preserve admin edits. A malformed existing catalog stops server startup instead of silently overwriting it.

This is a **local demo admin**, not an internet-ready authentication system. Administrative APIs require a loopback connection, a localhost/127.0.0.1 host, a local session cookie, and an origin/CSRF check. There is no staff password login or multi-user role management. Remote administration is disabled. Published catalog data can be read over the LAN for phone testing. Do not expose this server on the public internet.

Candidate profiles, applications, reminders, and appointments remain device-local demo data. They are not uploaded to the admin server. The old mobile staff/activity screen is an appointment demo, separate from this management panel. Registration does not create an actual account; passwords are not persisted or sent. Use fictional profile information. No real recruitment offer, office booking, or push notification is created.

## Run on iPhone or Android with Expo

Start the admin server in one terminal, then run this in another:

```powershell
.\run-mobile.ps1
```

The launch script supplies `EXPO_PUBLIC_API_URL` using the computer's active network address on port 8093. Connect the phone and computer to the same network, then scan Expo's QR code with a compatible Expo Go installation. The app uses SDK 57. If automatic network detection selects the wrong adapter, set the address explicitly before starting:

```powershell
$env:EXPO_PUBLIC_API_URL = 'http://YOUR_COMPUTER_LAN_IP:8093'
.\run-mobile.ps1
```

After changing this URL, restart Expo and reload the app. With no configured API on a native device, the app uses its offline catalog. Network/firewall access and actual iOS/Android behavior still require device testing.

With a system Node installation, the equivalent setup is:

```sh
cd mobile
npm ci
npm start
```

For the native app, set `EXPO_PUBLIC_API_URL` before this command. [Expo development instructions](https://docs.expo.dev/get-started/start-developing/).

## Validation

```sh
cd mobile
npm run typecheck
npm test
npm run export:all
```

Nine tests cover candidate validation/search/date rules and the admin API lifecycle, public-feed filtering, featured selection, stale-write rejection, persistence, and access controls. Tests use isolated temporary catalogs rather than changing the working admin data. The export produces Android/iOS Hermes bundles plus the web preview in `mobile/dist`; these are not signed APK/IPA installations.

The earlier mobile demo had browser workflow checks. This admin implementation has API integration tests and compilation checks; admin browser interaction and physical-device acceptance tests are not claimed. An optional read-only `search_admin_jobs` WebMCP tool is registered when supported; its browser contract has not been verified in this environment.

The existing dependency audit reports 10 moderate findings in Expo's build-tool dependency chain (`xcode` → `uuid`). The suggested automatic fix downgrades Expo, so it was not applied. See `mobile/audit-report.json` and recheck upstream before production use.

## Source structure

- `mobile/App.tsx`: candidate navigation and screens; web admin entry route.
- `mobile/src/AdminPanel.web.tsx`, `admin.css`: admin dashboard and editor.
- `mobile/src/AdminPanel.tsx`: native placeholder; admin is a desktop web interface.
- `mobile/src/catalog.ts`: shared catalog types and validation.
- `mobile/src/api.ts`, `useCatalog.ts`: public catalog loading, refresh, and offline cache.
- `mobile/src/domain.ts`: demo fixtures, filtering, registration and appointment rules.
- `mobile/src/forms.tsx`, `ui.tsx`, `i18n.ts`: mobile UI and draft translations.
- `admin-server/server.mjs`: persistent catalog API and web-preview server.
- `mobile/public/mobile-preview.html`: durable phone-sized preview wrapper.
- `mobile/tests/`: candidate and admin integration tests.

Admin-written text is displayed as entered; separate translated content fields are not implemented. Sinhala/Tamil interface translations remain drafts with English fallback.

## Before production

Choose and implement hosted backend/database infrastructure, staff authentication and roles, candidate authentication, centralized applications/appointments, reviewed translations, monitoring/backups, HTTPS, and physical-device tests. `mobile/eas.json` has preview/production profiles; confirm app identifiers (currently `com.elladria.demo`) and supply signing credentials before building installable apps. No hosting, signing, or store publication has been performed.
