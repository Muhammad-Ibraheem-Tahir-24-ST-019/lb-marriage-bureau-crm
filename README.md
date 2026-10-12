# Rishtahub

A private marriage-bureau CRM built with **Laravel 12 / PHP**, **React 19 /
TypeScript / Inertia**, Tailwind, Radix/shadcn-style components, and Recharts.
MySQL/MariaDB in production; SQLite for the local demonstration.

## Open the local app

If the development preview is already running, open http://127.0.0.1:8080/login.

The local demo account is `owner@demo.rishtahub.test`, password
`DemoBureau2026!`. These are fictional local demo credentials, not production
credentials. The login page includes a button to fill them when demo mode is on.

`Start-Rishtahub.ps1` starts the local PHP preview using the portable runtime
in `.tools/php`. Source code lives in `app/`.

```powershell
cd app
..\.tools\php\php.exe -S 127.0.0.1:8080 -t public
```

The development environment and built assets are already prepared. To compile
future frontend edits on this computer:

```powershell
cd app
npm.cmd ci
npm.cmd run build
```

No Node.js runtime is required to **serve** the finished application. PHP serves
the compiled JavaScript and CSS from `public/build`.

## Implemented workflows

- Public marketing site, bureau registration and configurable public bureau page.
- Login, logout, password recovery, bureau isolation, owner/manager/staff/read-only roles.
- Dashboard counts, activity chart, recent profiles, focus list, and audit timeline.
- Profile CRUD, adult/consent validation, search/filtering, table/grid views,
  local saved filters, duplicate warnings, archive/restore, notes, and private uploads.
- Labelled biodata import, plus an opt-in external AI adapter with mandatory review.
- Explainable weighted matching, comparison, shortlist/reject, and proposal creation.
- Proposal packages, per-candidate responses, field allowlists, optional passwords,
  expiring/revocable opaque links, and a mobile family viewer.
- Family self-edit submissions that require staff acceptance.
- Follow-ups, meetings, assignees, board/list/agenda views, completion, and optional
  cron-driven email reminders.
- Staff invitation links, role changes, immediate access disabling, CSV export,
  reports, branding/settings, message templates, and owner-controlled network opt-in.
- Anonymous network listings and owner-reviewed introduction requests.
- Platform bureau suspension/reactivation and contact-inquiry inbox, with no
  casual access to private biodata.
- Light/dark/system themes, responsive navigation, accessible Radix dialogs,
  client validation feedback, and server-side permission enforcement.

## Hostinger upload

See **[HOSTINGER-SETUP.md](HOSTINGER-SETUP.md)**. `dist/Rishtahub-Hostinger.zip`
contains sibling `rishtahub` and `public_html` folders with PHP production
dependencies and prebuilt React files. It excludes demo databases, credentials,
development tools, tests, and Node modules.

To regenerate the ZIP after changes and tests:

```powershell
python tools/build_release.py
```

## Tests

```powershell
cd app
..\.tools\php\php.exe artisan test --compact
npx.cmd playwright test
```

The PHP suite uses an isolated in-memory SQLite database by default. A separate
MySQL/MariaDB test database can be selected with `DB_CONNECTION`, `DB_HOST`,
`DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` environment variables.
**Never point the test suite at a production database.** Browser tests use the
local demo and create clearly named test profiles/proposals. Screenshots are in
`app/screenshots/`.

## Deployment limits to finish with the operator

SMTP, live Hostinger installation, automated backup/restore configuration, AI
provider configuration, commercial pricing, and final legal/operator content
require the actual operator's details. Direct WhatsApp/SMS sending, payment
charging, OCR, Urdu/RTL localization, custom field builders, advanced financial
invoices, and cloud file adapters are not implemented. This release uses local
private file storage and manually copied WhatsApp messages. Identity verification
is a bureau process; the app does not certify the truth of profile information.

The directory index uses complete bureau summary data in the browser. It is
suitable for a pilot and needs scale benchmarking/server pagination before a very
large multi-bureau deployment. No claim of zero defects or completed live-host
verification is made. See `VERIFICATION.md` for the actual checks performed.
