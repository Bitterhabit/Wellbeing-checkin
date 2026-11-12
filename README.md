# Wellbeing Check-in

A small, phone-friendly self-hosted daily wellbeing check-in. The complete application source and Docker configuration are included in `wellbeing-app.zip`.

## Quick start

```bash
unzip wellbeing-app.zip
cd wellbeing-app
docker compose up -d --build
```

Then open `http://YOUR-SERVER-IP:3000`.

The app stores daily entries as Markdown in `data/vault/Daily`. Keep that folder backed up. Personal journal entries are excluded from Git by the app's `.gitignore`.

**Privacy:** keep this app on a trusted LAN or behind authentication. It has no built-in login and should not be exposed publicly as-is.

See `wellbeing-app/README.md` for deployment and export details.
