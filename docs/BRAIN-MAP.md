# Brain map — interaction and visual specification

## Purpose
A friendly pixel-art brain that acts as a living map of the user's own documents. It is an archive explorer, not an AI-generated picture of the user's mind.

## Visual language
- Softly rounded chunky pixel silhouette with two hemispheres and a small brain-stem detail.
- Lavender, plum and muted violet, with restrained warm accents by document type.
- The silhouette is a frame; actual document nodes and edges are generated from the vault index.
- Respect reduced-motion preferences and use subtle idle movement only when allowed.

## Nodes and relationships
- Daily check-ins are daily nodes; morning/evening are sections of the same daily record.
- Weekly and monthly reviews can become distinct node types when those records are implemented.
- Attachments can become linked leaf nodes when attachment support is added.
- Edges are derived only from same-week grouping, explicit document references or shared user-authored tags.
- Node colour encodes document type only, never mood, energy or inferred mental state.

## Interaction
- Select a node to show title, date, type, tags, preview and an open-record action.
- Search highlights matching nodes; filters will include date range, type and tag.
- Provide zoom/pan/fit controls as archive size warrants, plus a chronological list alternative.
- Keyboard users must be able to traverse and activate every node.
- Mobile must prioritise the list/cluster view rather than shrink labels until illegible.
- Empty state invites the first check-in without implying a missed task.

## Data contract
Each node exposes an opaque id, date, title, type, tags, section markers, preview and updatedAt. Internal filesystem paths are never exposed in public responses. Edges expose source id, target id, relationship type and any shared user-authored tags.

## Acceptance checks
- Every node corresponds to a real accessible document.
- Selecting a node opens the correct source record.
- Search and filters do not reveal inaccessible records.
- The graph is generated from the vault, not hard-coded sample nodes.
- If graph rendering fails, the archive list remains usable.
