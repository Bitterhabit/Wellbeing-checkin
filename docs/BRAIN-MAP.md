# Brain map — interaction and visual specification

## The idea
A little pixel-art brain that acts as a living map of the user's own documents. It is an exploratory way to navigate a personal archive, not an AI-generated picture of the user's mind.

## Visual language
- Use a softly rounded, chunky pixel silhouette with two distinct hemispheres and a small brain-stem detail.
- Main palette: lavender, plum and muted violet, with restrained warm accents for different document types.
- Pixel edges should feel intentional and friendly; avoid a harsh 8-bit arcade aesthetic.
- Use a subtle idle shimmer only when motion is allowed. Respect prefers-reduced-motion.
- The silhouette is a background/container; actual document nodes are interactive UI elements layered over it.

## Document nodes
- Daily morning/evening record: small paired nodes or one daily node with two sections.
- Weekly review: medium node.
- Monthly review: larger anchor node.
- Attachments: small linked leaf nodes.
- Tags and explicit cross-references create visible edges. Date grouping can create faint cluster connections.
- Node colours encode document type only, never mood, energy or wellbeing values.

## Interaction
- Tap/click a node to open a detail panel with title, date, document type, tags, short excerpt and open action.
- Hover/focus reveals a tooltip; keyboard users can traverse nodes and activate them.
- Pan, zoom, fit-to-view and reset controls.
- Search highlights matching nodes and dims unrelated ones; filters for date range, type and tags.
- Provide a parallel chronological list view and a mobile-friendly cluster/list mode.
- Empty state shows the brain silhouette with a friendly prompt to create the first check-in.
- Large archives should be indexed and rendered progressively; avoid placing every document into one giant DOM tree.

## Data contract (initial proposal)
Each indexed document should expose:
- id: stable opaque identifier
- path: internal vault path, never exposed as a public URL
- title
- date
- type: daily, weekly-review, monthly-review, attachment, or note
- tags: user-authored tags
- sections: optional morning/evening markers
- links: explicit document references
- preview: short sanitised excerpt
- updatedAt

Edges should be derived only from explicit links, shared user-authored tags and date grouping. The API must apply the same access-control rules as document retrieval.

## Acceptance checks
- Every visible node corresponds to a real, accessible document.
- Selecting a node opens the correct source record.
- Deleting or renaming a document updates the index and graph.
- Search and filters never reveal inaccessible records.
- The map remains usable on a phone and with keyboard navigation.
- If the graph fails, the archive list remains fully usable.
