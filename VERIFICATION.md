# Verification record

The application was built and tested locally on Windows using portable PHP
8.3.35. The production build is compiled React assets served through PHP; there
is no Vite development server, Node application server, or SSR process in the
deployment layout.

## Completed checks

- TypeScript strict compilation and Vite production build pass.
- Laravel test suite: **24 tests / 103 assertions pass on SQLite**.
- The same suite: **24 tests / 103 assertions pass on MariaDB 10.4.32** in a
  separate local data directory and database. This is MySQL-compatible database
  verification, not a claim that every MySQL or Hostinger configuration was tested.
- Browser workflow tests pass: sign-in, all primary navigation pages, profile
  creation, matching, proposal creation, secure family page, per-candidate
  interest response, light/dark theme, and mobile navigation.
- Public website, registration page, and production asset URLs pass browser checks.
- Fresh release-folder check passes with production PHP dependencies only:
  migrations, registration, sign-in, empty bureau, profile creation, comma-separated
  tags, Content Security Policy, and precompiled React files. No demo records are
  installed. This check starts only a PHP server; Node is used solely to automate
  the test browser on the development computer.
- `npm audit` reported no known vulnerabilities at the time of the check.
- `composer audit --no-dev` reported no known security advisories at the time of
  the check. Audit results are a point-in-time check, not a permanent guarantee.
- Desktop and mobile layouts were rendered and visually reviewed. Additional
  screen captures and automated accessibility findings are in `app/screenshots`.
- Automated light- and dark-theme accessibility scans (WCAG 2 A/AA and 2.1 AA rule
  tags) report zero violations on nine checked CRM screens after contrast
  corrections. Those screens also fit a 390px mobile viewport without page-level
  horizontal overflow. Automated scans do not establish complete WCAG compliance.

## Security behaviors covered

Guest access denial; cross-bureau read/edit/matching/proposal/link/file denial;
read-only write and export restrictions; 18+ and consent validation; registration
role-injection rejection; password reset and single-use tokens; private-field
omission from family responses; password-gated sharing; link expiry and revocation;
suspended bureau access; per-candidate response ownership; archive-related link
revocation; private document access; disabled staff access; opt-in network masking;
reviewed family edits; platform-admin separation; explainable matching; staff
invitation reuse; draft-only import; CSV formula injection neutralization; reminder
deduplication; optional age bounds and reversed-range rejection.

## Not verified or not connected

- The actual Hostinger account, domain, TLS configuration, cron permissions,
  production database credentials, and external SMTP delivery.
- An external AI provider, WhatsApp/SMS provider, payment gateway, or object store.
- An off-host backup service and a full production-scale restore drill.
- High-volume concurrency/load, a formal penetration test, and a complete manual
  accessibility review with assistive technologies.
- Operator-specific legal and commercial policies. The included legal pages are
  explicitly marked as deployment drafts.

These remaining checks are documented in `HOSTINGER-SETUP.md`. Passing the local
suite does not justify a claim that software can never have bugs.
