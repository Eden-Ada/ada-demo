# Ada Pane Package

This package will contain the Ada pane implementation and related assets.

- Styling is centralized in `src/styles/glass-pane.css` (true frosted-glass with 15px blur, 32px radius, and layered inner shadows).
- Component scaffolding is intentionally not created yet per project rules; add files here as the pane design is approved.

Suggested structure (to be confirmed):
- `ada-pane.module.css` – pane-specific layout/spacing overrides (imports/reuses `.glass-pane`).
- `ada-pane.tsx` – presentational component for the pane.
- `container/` – stateful logic, if required later.
