# Wellbeing 2.0 — Product and implementation plan

## Product principle
A calm, private, self-hosted space for looking after yourself. It should feel like a friendly daily ritual, not a productivity scoreboard. The app remains useful without Petrio or Alfie, and personal records remain portable Markdown files owned by the user.

## Product areas

### 1. Morning check-in
- A quick, phone-first flow for sleep quality, mood, energy and optional notes.
- A small intention for the day; optional focus or priority.
- Save partial progress and allow editing the same day's entry.
- Keep the flow short, gentle and skippable. No guilt language, streak pressure or punitive empty states.

### 2. Evening check-in
- Reflect on how the day felt, what went well, what was difficult and what the user wants to remember.
- Habit completion is optional and user-defined.
- Link the evening reflection to the same day's morning check-in rather than creating duplicate daily records.
- Allow a day to have morning only, evening only, both, or neither.

### 3. Weekly and monthly insights
- Weekly review summarises check-in completion, mood/energy/sleep trends where data exists, habit patterns and recurring themes from user-authored reflections.
- Monthly view shows longer-term trends and a gentle reflection prompt.
- Clearly distinguish measured values from inferred themes. Never diagnose, make medical claims, or present correlations as causes.
- Missing entries are gaps, not failures. Avoid ranking, streak pressure and gamification by default.
- Insights must be explainable from source entries and link back to those entries.

### 4. Long-term personal archive
- Markdown remains the canonical, human-readable record format.
- Store daily entries under the existing vault convention (data/vault/Daily/) and add predictable metadata/frontmatter for date, check-in sections, habits and links.
- Provide search by date, text and tags; browse by month; edit and export records.
- Export selected periods and the full archive. Backups must include attachments and metadata.
- Never commit private vault content to Git. Keep runtime data separate from application source and document restore procedures.

### 5. Petrio integration, without dependency
- Expose a narrow, versioned API for authorised read-only summaries and explicitly requested actions.
- Petrio may surface a check-in reminder, today's status and a weekly summary.
- The wellbeing app remains independently deployable and usable if Petrio is offline.
- Use explicit opt-in, scoped credentials, revocation and audit logging. Do not expose raw journal text to Petrio by default; summaries and selected records only with permission.
- Alfie may help summarise or navigate records only through approved tools and user-authorised access. No arbitrary shell, direct vault writes, or silent external sharing.

## Navigation
- Today (morning/evening)
- Insights (weekly/monthly)
- Brain map (document explorer)
- Journal (search and browse records)
- Settings (habits, privacy, export/backup, integrations)

## Brain map — core experience
The Brain map is a real document explorer, not a static illustration.
- Render a friendly pixel-art brain silhouette as the map's visual frame.
- Each document is a clickable node positioned in a meaningful cluster. Daily check-ins, reflections, weekly reviews, monthly reviews and attachments use distinct but coherent node styles.
- Connect nodes using real relationships: same day, same week/month, explicit links, shared user tags and references. Do not invent semantic links.
- Node size or glow may reflect document type or connection count, but never wellbeing scores or inferred mental state.
- Selecting a node opens a side panel with title, date, type, tags, a short preview and an open-document action.
- Filters: date range, document type, tag and search. Include a list view and keyboard-accessible alternative.
- Provide zoom/pan, fit-to-view, a minimap or orientation cue, and a useful empty state.
- The graph must remain legible on mobile: switch to a compact clustered/list presentation rather than shrinking labels to illegibility.
- Respect permissions: hidden or unshared records must not appear in the map or its search index.
- The brain artwork is decorative framing; document nodes and edges are generated from the vault index so the map always reflects actual records.

## Design direction
- Warm, calm, playful pixel art with rounded pixel forms; soft lavender/purple as the primary accent and muted supporting colours.
- Avoid harsh white, dense dashboards, clinical styling and excessive gamification.
- Strong typography and contrast; accessible focus states, reduced-motion support and touch-sized controls.
- The brain should feel friendly and curious, not medical or childish.

## Technical and privacy requirements
- Preserve the existing Docker Compose deployment model and local Markdown vault.
- Keep the app independently runnable; integrations are optional adapters.
- Add schema/version migration for existing entries without destructive rewrites.
- Validate all API input; enforce authentication and authorisation on every non-public route.
- Do not expose the app publicly without authentication and secure transport. The current MVP README explicitly warns that it has no built-in login.
- Add automated tests for daily entry creation/editing, date boundaries, exports, backup/restore, permissions, graph indexing and API scopes.
- Add health checks and document deployment, upgrade, backup and restore procedures.

## Delivery phases
1. Inspect and preserve the current MVP; establish tests and a baseline deployment.
2. Implement the morning/evening daily record model and responsive flows.
3. Add archive search, period exports and backup/restore.
4. Add weekly/monthly insights with source traceability.
5. Build the vault-backed brain map and accessible list alternative.
6. Add optional, scoped Petrio API integration and document security.
7. Validate Docker deployment, mobile usability, migrations and restore from backup.

## Definition of done
- A user can complete morning and evening check-ins independently or together.
- Records persist as portable Markdown and can be searched, edited, exported and restored.
- Weekly/monthly summaries are traceable to source records and handle missing data safely.
- The brain map displays actual vault documents and real relationships, supports selection/filtering/search and has a mobile alternative.
- Petrio integration is opt-in and scoped; the standalone app works without it.
- Docker deployment, authentication, backup and restore are tested and documented.
