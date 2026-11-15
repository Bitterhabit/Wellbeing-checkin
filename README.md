# Wellbeing — a little space for you

A private, self-hosted wellbeing journal. The 2.0 work keeps Markdown as the portable record format and adds separate morning/evening check-ins, a searchable archive, traceable period insights and a vault-backed brain map.

## Run with Docker

```bash
mkdir -p data/vault/Daily
docker compose up -d --build
```

Open `http://YOUR-SERVER-IP:3000`.

The container serves the lowercase `public/` directory. The original upload used `Public/` (capital P); the 2.0 branch restores the lowercase directory expected by both Express and the Dockerfile.

## Data and compatibility

- The canonical vault is mounted at `./data/vault` on the host and `/app/data/vault` in the container.
- Existing daily Markdown entries remain readable. The first edit through the new check-in API upgrades that day's file to schema version 2 while retaining its legacy values and reflection.
- New records are Markdown files under `data/vault/Daily/YYYY-MM-DD.md`. Structured check-in data is stored in a clearly marked JSON metadata comment inside the Markdown file, with readable morning/evening sections below it.
- No private vault data should be committed to Git.

## 2.0 features in progress

- Independent morning and evening check-ins; either can be saved on its own.
- Personal tags, archive search and date browsing.
- Weekly/monthly numeric averages with links to the source dates.
- A brain map whose nodes represent actual daily records and whose edges represent shared weeks or user-authored tags.
- Daily Markdown export, period reports and full-vault ZIP backup.

The current brain map indexes the 400 most recent daily records. The visual list remains available alongside the map.

## API

The versioned endpoints are under `/api/v2`:

- `GET /api/v2/entry/:date`
- `POST /api/v2/entry`
- `GET /api/v2/entries`
- `GET /api/v2/search?q=...`
- `GET /api/v2/insights?period=week|month&date=YYYY-MM-DD`
- `GET /api/v2/brain-map`

The original `/api/entry` and export endpoints remain for compatibility with the first version.

## Tests

```bash
npm install
npm test
```

The tests use Node's built-in test runner and a temporary vault.

## Privacy and deployment

This app currently has no built-in login. Keep it on a trusted LAN or behind an authenticated access layer and secure transport. Do not expose it directly to the public internet. Petrio and Alfie integration is not enabled; any future integration must be explicit, opt-in and scoped.

The app is a personal reflection tool, not a medical device or diagnostic service.

## Backups and restore

Use **Download full vault backup (.zip)** in the app or back up `data/vault` through your normal homelab process. To restore, stop the container, restore the vault contents to the mounted host directory, then start the container again.
