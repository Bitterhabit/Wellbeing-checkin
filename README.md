# Wellbeing — Daily Check-in

A deliberately small, phone-friendly self-hosted wellbeing journal. It saves each day as a Markdown file and exports daily, weekly, monthly and yearly reports.

## Run with Docker

```bash
mkdir -p data/vault/Daily
docker compose up -d --build
```

Open `http://YOUR-SERVER-IP:3000`.

## Data and backups

Markdown notes are stored in `./data/vault/Daily/` on the host, mounted into the container. Rebuilding or replacing the container does not remove the notes.

Use **Download full vault backup** in the app for a ZIP backup. You can also back up `./data/vault` using your normal homelab backup process.

## Exports

- Day: downloads the selected day's Markdown note.
- Week: downloads an ISO-week summary and included daily entries.
- Month: downloads a calendar-month summary and included daily entries.
- Year: downloads a calendar-year summary and included daily entries.

Reports are generated from the Markdown notes at export time. No separate database is used.

## Notes

- No account or external service is required. Keep the app on a trusted LAN or behind your existing authenticated access layer; do not expose it publicly without adding authentication.
- This is a simple personal journal, not a medical device or diagnostic tool.
- If you later move the vault, copy `data/vault` and mount it at `/app/data/vault` in the new deployment.
