# Portal Example

A client file portal where clients upload files and every upload is kept as a version. They can download any version, restore an old one, and see who did what.

| Folder | What it is |
| --- | --- |
| `api/` | **Laravel 13** API. Sanctum cookie auth, version-controlled file storage, audit trail, admin endpoints. |
| `web/` | **Next.js 16 + React 19** portal, styled with **Bootstrap 5.3 compiled from SCSS** (react-bootstrap for modals, dropdowns and toasts). |

## How versioning works

- A **document** is the logical file ("Master Services Agreement"). Each upload of it is an immutable **version** numbered 1, 2, 3…
- Every version stores the original file name, size, MIME type, a **SHA-256 checksum**, who uploaded it, and an optional "what changed" note.
- **Re-uploading the same bytes is refused** (409) so the history never fills with duplicates.
- **Restoring** an old version never rewrites history. It appends a new version that points at the old file (no copy on disk) and records `restored_from_version`.
- Version rows can't be updated (the model throws if you try), and files are never deleted. Archiving a document is a soft delete: it becomes read-only, stays downloadable, and can be unarchived.
- Version numbers are assigned inside a transaction with a row lock, so two simultaneous uploads can't get the same number.
- When a client drops a file whose name matches an existing document, the portal asks whether to **save it as the next version** or start a new document.
- Older versions download as `name (v3).ext` so they can't be mistaken for the current one.
- Every upload, restore, download, rename and archive is written to `activities`.

## Roles

- **Client users** belong to one client and only ever see that client's documents. Every endpoint enforces this through `DocumentPolicy`.
- **Admins** see every client, upload on a client's behalf, and manage clients and their users under **Admin → Clients**.

## Requirements

- PHP 8.3+ with Composer 2 (on macOS, [Laravel Herd](https://herd.laravel.com) or `brew install php composer`)
- Node.js 20.9+

## Run it locally

```sh
# 1. API → http://localhost:8000
cd api
composer setup          # install, .env, key, SQLite database, migrations + demo data
php artisan serve

# 2. Portal → http://localhost:3000 (second terminal)
cd web
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. Every demo account's password is `password`:

| Account | Role |
| --- | --- |
| `jane@acme.test` | Client user at Acme Corporation |
| `hank@globex.test` | Client user at Globex Industries |
| `admin@example.com` | Administrator |

To reset the demo data, run `php artisan migrate:fresh --seed`.

## Tests

```sh
cd api && php artisan test
```

There are 18 feature tests. They cover version numbering, duplicate refusal, restore, per-version downloads, immutability, cross-client isolation, blocked file types and size limits, archiving, search, login, and admin permissions.

## Configuration

**api/.env**

| Key | Default | Notes |
| --- | --- | --- |
| `FRONTEND_URL` | `http://localhost:3000` | The CORS origin allowed with credentials |
| `SANCTUM_STATEFUL_DOMAINS` | `localhost:3000,127.0.0.1:3000` | Hosts that get cookie sessions |
| `SESSION_DOMAIN` | `localhost` | Must cover both the API and portal hosts in production (e.g. `.example.com`) |
| `PORTAL_DISK` | `local` | Private disk (`storage/app/private`). Set it to `s3` in production (`composer require league/flysystem-aws-s3-v3`) |
| `PORTAL_MAX_UPLOAD_MB` | `100` | Raise PHP's `upload_max_filesize` / `post_max_size` and your web server's body limit to match |

Blocked extensions (`.php`, `.exe`, …) are listed in `api/config/portal.php`.

**web/.env.local**

| Key | Default |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |
| `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS` | `true`. Set it to `false` in production |

## Production notes

- Serve the API and portal from sibling subdomains (e.g. `api.example.com` and `portal.example.com`). Set `SESSION_DOMAIN=.example.com`, put the portal host in `SANCTUM_STATEFUL_DOMAINS` and `FRONTEND_URL`, and use HTTPS (`SESSION_SECURE_COOKIE=true`).
- Use MySQL or Postgres instead of SQLite so the row lock on version numbering is a real lock.
- Downloads stream through Laravel. For very large files on S3, swap `download()` in `DocumentVersionController` for a short-lived `temporaryUrl()` redirect.

## API reference

All routes are under `/api` and need a session, except login.

```
POST   /auth/login                                   email, password, remember
POST   /auth/logout
GET    /auth/user
GET    /dashboard                                    stats + recent activity
GET    /activity
GET    /documents                                    ?search= &client_id= &archived=1 &filename= &sort=updated|name|created &page=
POST   /documents                                    file, name?, description?, note?, client_id (admins)
GET    /documents/{id}                               includes full version history
PATCH  /documents/{id}                               name, description
DELETE /documents/{id}                               archive
POST   /documents/{id}/unarchive
GET    /documents/{id}/activity
POST   /documents/{id}/versions                      file, note?          → 409 if identical to current
GET    /documents/{id}/versions/{n}/download
POST   /documents/{id}/versions/{n}/restore          note?                → 409 if already current
GET    /admin/clients                     (admin)
POST   /admin/clients                     (admin)    name, contact_email?
GET    /admin/clients/{id}                (admin)
PATCH  /admin/clients/{id}                (admin)
POST   /admin/clients/{id}/users          (admin)    name, email, password
DELETE /admin/clients/{id}/users/{userId} (admin)
```
