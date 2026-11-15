# Wellbeing 2.0 — product plan

## Product principle
A calm, private, self-hosted space for looking after yourself. It should feel like a friendly daily ritual, not a productivity scoreboard. The app remains useful without Petrio or Alfie, and personal records remain portable Markdown files owned by the user.

## Product areas
1. **Morning check-in:** sleep quality, mood, energy, intention and optional notes. Short, editable and skippable.
2. **Evening check-in:** what went well, what felt difficult, optional mood/energy and notes. Independent of the morning entry.
3. **Weekly/monthly insights:** numeric trends and reflection themes only where supported by recorded data. Missing entries are gaps, not failures. Never diagnose or imply causation. Every summary must link to source entries.
4. **Long-term archive:** Markdown records, search by date/text/tags, browse, edit, export periods and full-vault ZIP backup/restore.
5. **Optional Petrio integration:** narrow versioned API, opt-in scoped credentials, summary-first access and revocation. The standalone app must work without Petrio. No raw journal sharing by default and no arbitrary shell or silent external writes.

## Navigation
- Today (morning/evening)
- Insights (weekly/monthly)
- Brain map (document explorer)
- Journal (search and browse)
- About & privacy (deployment, backup and integration status)

## Brain map
The brain map is a core document explorer, not a static illustration. A soft rounded pixel-brain silhouette frames interactive nodes generated from the vault index. Nodes represent real accessible records. Connections come only from same-week grouping, explicit links or shared user-authored tags. Node colour represents document type, never mood or wellbeing scores. Selecting a node shows date, type, tags, preview and an open-record action. Search and filters must work with a chronological list alternative and keyboard navigation. On small screens the list remains fully usable. The map must respect reduced motion and never expose filesystem paths.

## Design
Warm, calm, playful rounded pixel art; lavender, plum and violet with restrained warm accents. Avoid harsh white, clinical styling, dense dashboards and excessive gamification. Use readable typography, visible focus states, touch-sized controls and responsive layouts.

## Technical and privacy requirements
- Preserve Docker Compose and the local Markdown vault.
- Keep existing records readable and upgrade them non-destructively.
- Validate all API input and dates.
- Keep vault contents out of Git.
- No public exposure until authentication and secure transport are in place.
- Add automated tests for check-in writes, partial updates, date validation, archive indexing, insights and brain-map relationships.
- Keep integration optional, versioned and scoped.

## Delivery sequence
1. Inspect and preserve the original MVP.
2. Add the v2 Markdown record format and separate morning/evening flows.
3. Add archive search, exports and backup/restore.
4. Add traceable weekly/monthly insights.
5. Build the vault-backed brain map and accessible list alternative.
6. Add optional scoped Petrio API integration.
7. Validate Docker deployment, migration, restore and mobile usability.
