# Task Deliverable Types (Eden)

This document defines the Eden-aligned deliverable taxonomy for Task Item chip outputs ("line items"). Each deliverable renders as a visual preview inside the inner presentation orb of the `task-deliverable` component.

The taxonomy is intentionally minimal and creative-first. It covers the common outputs of organized, automated, and propagated projects within Eden.

## Core Categories (Final)

1) Media
- Key: `media`
- Subtypes/keys:
  - `media.image` (png, jpg, jpeg, webp)
  - `media.video` (mp4, webm)
  - `media.audio` (mp3, wav, m4a)
- Orb preview strategy:
  - Image: use the file directly as `background-image` (cover, centered), zoom ≈ `1.00`.
  - Video: poster frame (first frame or provided poster), zoom ≈ `1.00`.
  - Audio: album/cover art or waveform thumbnail, zoom ≈ `0.90`.

2) Design
- Key: `design`
- Subtypes/keys:
  - `design.logo` (exported logo)
  - `design.ux` (exported artboard/frame)
  - `design.deck` (slide 1 cover; pptx/key/pdf export)
- Orb preview strategy:
  - Logo: transparent/brand-bg export, zoom ≈ `0.85–0.88` (more breathing room).
  - UX Artboard: exported frame/image, zoom ≈ `0.92–0.96`.
  - Deck: first-slide thumbnail, zoom ≈ `0.90`.

3) Code
- Key: `code`
- Subtypes/keys:
  - `code.web` (website/page screenshot)
  - `code.app` (application UI screenshot)
  - `code.generic` (code icon or snippet screenshot)
- Orb preview strategy:
  - Web/App: use page/screen captures, zoom ≈ `0.92`.
  - Generic: use crisp code icon until richer previews exist, zoom ≈ `0.90`.

4) Docs
- Key: `docs`
- Subtypes/keys:
  - `docs.spreadsheet` (csv/tsv/xlsx snapshot)
  - `docs.text` (md/docx/txt rendered page)
  - `docs.pdf` (report/first page)
- Orb preview strategy:
  - Sheet snapshot / table / chart thumb, zoom ≈ `0.92`.
  - Rendered text page (screenshot), zoom ≈ `0.92`.
  - PDF first-page rasterized image, zoom ≈ `0.92`.

5) Data
- Key: `data`
- Subtypes/keys:
  - `data.dataset` (csv/tsv/xlsx/parquet)
  - `data.metrics` (analytics/metrics snapshot; json/csv/html)
  - `data.json` (structured json, embeddings)
- Orb preview strategy:
  - Dataset: chart/table thumbnail or dataset icon + type badge.
  - Metrics: chart/analytics thumbnail.
  - JSON/Embeddings: syntax-highlighted/json thumb or matrix/scatter thumb.
  - Typical zoom ≈ `0.90–0.92` depending on graphic density.

6) Brainstorm
- Key: `brainstorm`
- Subtypes/keys:
  - `brainstorm.session` (co-op session artifact: transcript/summary, clusters, votes)
  - `brainstorm.idea-set` (shortlist of ideas/themes/tags)
  - `brainstorm.prompt-seeds` (LLM seed list, topics, intent vectors)
  - `brainstorm.moodboard` (collage board or sheet export)
  - `brainstorm.vote-map` (affinity/vote map snapshot)
- Orb preview strategy:
  - Prefer a visual synthesis: word cloud, sticky-note collage, mood ring, topic graph, or session cover.
  - Fallback to a brainstorm icon with small session stats (participants, ideas, votes).
  - Typical zoom ≈ `0.90–0.96` depending on visual density.

## General Orb Preview Rules
- Always respect the inner-orb 15px margin.
- Use `background-image: cover; background-position: center;` for thumbnails/posters.
- For non-visual types, use crisp icons with small type badges (no title overlays by default).
- Zoom values listed above are starting points; we will expose per-type CSS variables for rapid tuning.

## Attributes (Cross-Cutting)
- `source`: optional external pointer (e.g., Figma/Notion/Drive/URL). This is an attribute, not a category.
- `packaging`: optional `archive` flag if the deliverable is distributed as zip/tar; does not change the category.
- `format`: the original file extension (used for badges if needed).

## Rationale
- Keeps the creative-first lens (Media, Design) central to Eden.
- Captures automation outputs without conflating display (Code vs. Docs vs. Data).
- Avoids category sprawl; edge cases fit as subtypes or attributes.

## Implementation Notes
- The `task-deliverable` component provides the glassmorphic orb with an inner presentation circle.
- Each subtype’s preview will be supplied as an image (or inline SVG) until richer renderers are needed.
- The harness will cycle test previews per subtype for quick visual validation.

## Next Steps
1. Add a small set of test thumbnails under `public/assets/deliverables/` covering: `media.image`, `media.video` (poster), `media.audio` (cover), `design.logo`, `design.ux`, `design.deck`, `code.web`, `docs.spreadsheet`, `docs.pdf`, `data.dataset`/`data.metrics`, and `brainstorm.session`/`brainstorm.moodboard`.
2. Update the harness to switch between subtypes and apply suggested zooms.
3. Add per-type CSS variables (e.g., `--orb-zoom`) to fine-tune framing without code changes.
