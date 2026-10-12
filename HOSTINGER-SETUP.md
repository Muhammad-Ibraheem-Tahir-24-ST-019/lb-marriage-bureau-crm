# Rishtahub on Hostinger — no Node.js and no build setting

React has already been compiled into ordinary JavaScript and CSS files. PHP serves
the pages and APIs; React runs in the visitor's browser. The ZIP includes the PHP
production dependencies, so Composer is not required on your hosting account.

## Before uploading

Use a Hostinger PHP hosting account with PHP **8.3 or newer**, MySQL/MariaDB,
HTTPS, and these PHP extensions: PDO MySQL, mbstring, openssl, fileinfo, XML,
ctype, curl, DOM, session, tokenizer, and filter. Set `upload_max_filesize` to
at least 5 MB and `post_max_size` to at least 8 MB in hPanel PHP settings.
Use the PHP website option,
not Website Builder, WordPress, or a Node.js website. A domain or subdomain root
is supported; deployment under a nested URL path is not configured.

You need hPanel File Manager and either SSH/Terminal or hPanel's PHP cron jobs
to run the one-time PHP setup commands. These are PHP commands, not frontend
build commands. Confirm resource limits with your actual hosting plan.

## 1. Upload the two folders

Extract `Rishtahub-Hostinger.zip` in the domain directory containing `public_html`:

```text
domains/your-domain.com/
├── rishtahub/              Private PHP application and vendor dependencies
│   ├── .env.example
│   ├── artisan
│   ├── app/
│   └── storage/
└── public_html/            The only web-accessible folder
    ├── index.php
    ├── .htaccess
    └── build/             Already built React JavaScript and CSS
```

Keep the folders as siblings. Never put `rishtahub`, its `.env`, or `vendor`
inside `public_html`. The supplied public `index.php` already uses this layout.
Preserve the `.htaccess` file (enable hidden files in File Manager).

If this domain already has a site, back it up and use a new subdomain for staging
first. Do not overwrite an unrelated site.

## 2. Create the database and configure the environment

Create a MySQL database and user in hPanel. Copy `rishtahub/.env.example` to
`rishtahub/.env`. Enter:

- `APP_URL=https://your-domain.com` (your actual domain, with HTTPS).
- `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` from hPanel.
- Keep `APP_ENV=production`, `APP_DEBUG=false`, and `DEMO_MODE=false`.
- Keep `SESSION_SECURE_COOKIE=true`; HTTPS must be enabled.
- Set your SMTP host, port, scheme, username, password, and sender address for
  password recovery. For port 465 use `MAIL_SCHEME=smtps`; for STARTTLS on 587
  use `MAIL_SCHEME=smtp`, following your mail provider's instructions.

Passwords with spaces or `#` need double quotes in `.env`. Never paste this
file into chats or put it in the public folder.

### Import the included clean database schema

`Rishtahub-Database.sql` is included beside this guide and in the release ZIP.
It creates all required Rishtahub tables but contains **no accounts, profiles,
demo records, uploaded files, or secrets**.

In hPanel, open **Databases → phpMyAdmin**, select the new empty database,
choose **Import**, select `Rishtahub-Database.sql`, then press **Import**.
Use only an empty database. If the import succeeds, do **not** run
`php artisan migrate --force` below because the import already records the
migrations as complete.

## 3. Run PHP setup once

In SSH/Terminal, enter the private `rishtahub` folder:

```sh
php -v
php artisan key:generate --force
php artisan config:cache
php artisan view:cache
```

If you intentionally did not import `Rishtahub-Database.sql`, run this once
between `key:generate` and `config:cache` instead:

```sh
php artisan migrate --force
```

Use the PHP 8.3+ CLI executable provided by your hosting account if `php -v`
shows an older version. No `npm`, Node.js, Vite server, or Composer command is
needed here. No database seed command is needed for production.

If your plan exposes only cron commands, run the equivalent commands one at a
time with the full path to `rishtahub/artisan`, checking each command's output.
Remove those one-time cron entries after setup. `key:generate` is **initial
installation only**; do not regenerate an existing production key.

The web/PHP user must be able to write `rishtahub/storage` and
`rishtahub/bootstrap/cache`. Normally 755 directories and 644 files work under
Hostinger's per-account user; adjust owner/group permissions if required.
Do not make directories world-writable with 777.

## 4. Create accounts

Visit `https://your-domain.com/register` to create the first bureau and owner.
Production installs start empty and contain no demo accounts or profiles.

For the platform administration account, run:

```sh
php artisan rishtahub:admin admin@your-domain.com
```

The command asks for the password without echoing it. Platform administrators
can suspend or reactivate bureaus and read demo inquiries. They cannot browse
private profile records. Staff are invited by a bureau owner from **Staff &
roles**; copy the one-time invitation link and send it to that colleague.

## 5. Optional email reminders and AI

After testing SMTP delivery, enable `REMINDER_EMAILS_ENABLED=true`, run
`php artisan config:cache`, and add one recurring cron job:

```sh
php /absolute/path/to/rishtahub/artisan schedule:run
```

Run it every minute if the plan allows it. The application processes due email
reminders every five minutes and prevents overlapping scheduler executions.
Emails contain a workspace link without private biodata. Failed deliveries are
logged and retried; once sent, an activity is not reminded again unless its due
time or assignee changes. Cron delivery and the SMTP provider need testing on
the real hosting account.

Labelled biodata extraction works immediately without any external AI service.
For AI extraction, configure `BIODATA_AI_ENDPOINT` and `BIODATA_AI_KEY` with your
own HTTPS adapter. It accepts JSON `text`, `allowed_fields`, and `instructions`
and must return `{"fields":{"name":"...","city":"..."}}`. It must not store
the submitted text unnecessarily. The staff member must explicitly select
external AI extraction; otherwise the text is parsed locally. All imported
values stay in the editable form until staff save them.

WhatsApp currently uses copyable summaries and message templates. Direct
WhatsApp API sending, OCR, payment-gateway charging, and cloud object storage
are not connected in this release. No paid provider credentials are included.

## 6. Verify before inviting real families

1. Create two test bureaus and confirm they see separate directories.
2. Create a profile, upload a private photo, create a proposal, and open its
   link in a private browser window. Confirm unchecked fields are absent.
3. Record interest, return to the bureau tab, and confirm the response.
4. Revoke the link and confirm that the private window loses access.
5. Test invitation acceptance and password recovery through real email.
6. Verify desktop, mobile, and dark mode, and confirm HTTPS is active.
7. Publish your actual operator identity, contact information, legal terms,
   privacy notice, retention policy, and commercial terms before public launch.

The built-in legal pages are labelled deployment drafts. Replace their content
in `resources/js/public.tsx` and rebuild locally before a public release.

## Backups and updates

Back up the **database**, **storage/app/private**, and **.env** together. Keep
encrypted off-host copies, restrict access, and test a restore in a separate
environment. The application does not configure Hostinger's backup service.

For an update: back up first, replace application/vendor/public build files,
preserve `.env` and private storage, then run `php artisan migrate --force`,
`php artisan config:cache`, and `php artisan view:cache`. Keep the prior release
and backup for rollback. New frontend changes are compiled on the development
computer and uploaded; there is still no hosting build step.

## Troubleshooting

- Blank page / 500: check private `storage/logs/laravel.log`, PHP version,
  extensions, permissions, APP_KEY, and database settings. Keep public debug off.
- Missing assets: ensure all `public_html/build` files were uploaded together
  and the supplied public `index.php` is in place.
- 404 on `/app`: ensure `.htaccess` exists and Apache/LiteSpeed rewriting works.
- 419 after configuration changes: clear site cookies and reload the sign-in
  page. Verify HTTPS, `APP_URL`, and secure cookie settings.
- PHP memory/time limits: monitor the actual hosting account. The directory
  index currently loads bureau profile summaries into the browser; benchmark
  larger directories and add server-side pagination before very large rollouts.

Local verification is not a substitute for a staging check on your exact
Hostinger account. No live hosting credentials were supplied during the build.
