# Wellbeing — a little space for you

A private, self-hosted wellbeing journal. The 2.0 work keeps Markdown as the portable record format and adds separate morning/evening check-ins, a searchable archive, traceable period insights and a vault-backed brain map.

## Run with Docker

    mkdir -p data/vault/Daily data/auth
    docker compose up -d --build

Open the app through your HTTPS Cloudflare hostname. On first startup, the server creates a one-time setup key and prints it to the container log:

    docker compose logs wellbeing

Find the line beginning [wellbeing-auth] One-time account setup key, then visit https://YOUR-HOSTNAME/setup. If you miss the log line before creating the account, the same one-time key is stored in data/auth/setup.key on the host. Create your username and a password of at least 12 characters. The setup key is invalidated after the first account is created. There is no public registration.

The first setup key is a temporary bootstrap secret. Do not share the logs or setup key. The permanent account and session store live in data/auth, separate from the Markdown wellbeing vault.

## Authentication and security

- Single-owner account; no public registration or user enumeration.
- Passwords are hashed with Node.js scrypt and a per-account random salt.
- Server-side sessions use random tokens; only token hashes are stored on disk.
- Session cookies are HttpOnly, SameSite=Strict and Secure by default, with a seven-day absolute expiry.
- Login and setup attempts are rate-limited by client IP.
- Mutating authentication requests require a same-origin request.
- Every app page, static asset and API endpoint is protected; only login/setup assets and the minimal Docker health endpoint are public.
- Auth data persists in ./data/auth across container rebuilds.
- Private pages and assets are sent with no-store cache headers. The previous service-worker cache is removed and the worker unregisters itself.
- Logout invalidates the server-side session.

The app is designed to work independently of Cloudflare identity headers. Cloudflare Tunnel is currently the transport; a future VPN/reverse-proxy deployment can continue using the app's own login. Keep the tunnel hostname restricted while it is in use and use HTTPS.

**Cookie setting:** SESSION_COOKIE_SECURE=true is the default and is appropriate when accessing through HTTPS (including the Cloudflare hostname). If you deliberately test over plain HTTP on a trusted LAN, set it to false temporarily in compose.yaml; restore true before using HTTPS or exposing the app again.

To deliberately reset the single-owner account, stop the container, remove data/auth/account.json and data/auth/sessions.json, then start it again. A new one-time setup key will be generated. Do not delete data/auth casually: that removes your login account and sessions.

## Data and compatibility

- The canonical wellbeing vault is mounted at ./data/vault on the host and /app/data/vault in the container.
- Existing daily Markdown entries remain readable. The first edit through the new check-in API upgrades that day's file to schema version 2 while retaining its legacy values and reflection.
- New records are Markdown files under data/vault/Daily/YYYY-MM-DD.md. Structured check-in data is stored in a clearly marked JSON metadata comment inside the Markdown file, with readable morning/evening sections below it.
- Do not commit data/ or secrets to Git.

## 2.0 features

- Independent morning and evening check-ins; either can be saved on its own.
- Personal tags, archive search and date browsing.
- Weekly/monthly numeric averages with links to the source dates.
- A brain map whose nodes represent actual daily records and whose edges represent shared weeks or user-authored tags.
- Daily Markdown export, period reports and full-vault ZIP backup.

The current brain map indexes the 400 most recent daily records. The visual list remains available alongside the map.

## API

The versioned endpoints are under /api/v2 and require an authenticated session:

- GET /api/v2/entry/:date
- POST /api/v2/entry
- GET /api/v2/entries
- GET /api/v2/search?q=...
- GET /api/v2/insights?period=week|month&date=YYYY-MM-DD
- GET /api/v2/brain-map
- GET /api/v2/export/day/:date
- GET /api/v2/export/:kind/:period (week, month or year)

The original /api/entry and export endpoints remain for compatibility with the first version and are also protected. /api/health is intentionally unauthenticated for the Docker health check and returns only a minimal healthy status.

## Tests

    npm install
    npm test

The check-in tests use a temporary vault. Authentication has a separate integration test for first-run setup, login, API protection and logout.

## Privacy and deployment

The app is a personal reflection tool, not a medical device or diagnostic service. Petrio and Alfie integration is not enabled yet. Any future connection must be explicit, opt-in and read-only initially, with narrowly scoped access to wellbeing records.

## Backups and restore

Use Download full vault backup (.zip) in the app or back up data/vault through your normal homelab process. Authentication state is separate: include data/auth in a private server backup if you want to preserve the account and sessions. Protect that backup as a credential-bearing file. To restore, stop the container, restore both directories to their mounted host locations, then start the container again.
