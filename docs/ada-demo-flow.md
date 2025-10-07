# Eden OS — Ada Demo Flow Script

This script walks through the Ada side of Eden to demonstrate the three instance modes: Project, Research, and Autonomous. It’s designed to be a concise operator script for a live demo while also documenting the feature toggle events and UI touchpoints.

## Goals
- Illustrate Ada’s orb with conditional inner content switching.
- Showcase the Instance Picker carousel and the three instances.
- Keep the visuals clean, modern, and consistent with the current UI (glassmorphism, centered icons, clipped animations).

## Key UI Components (paths)
- Orb (outer shell): `src/components/home/ada-orb/ada-orb.tsx`
- Orb content switcher: `src/components/home/ada-orb/ada-orb-switcher.tsx`
- Instance Picker (carousel):
  - TSX: `src/components/home/ada-orb/ada-orb-conditionals/instance-picker.tsx`
  - CSS: `src/components/home/ada-orb/ada-orb-conditionals/instance-picker.css`
- Prompt typing: `src/components/home/ada-prompt-package/ada-prompt.tsx`

## Event API (cheat sheet)
- `ada-orb-content` → `{ mode: 'rive' | 'instance-picker' }`
  - Switches the inner content of the orb.
- `ada-orb-layout` → `{ glassVisible?: boolean, glassSize?: number, glassInteractive?: boolean }`
  - Controls the Rive-state glass canvas (visibility/size/interactivity).
- `ada-instance-highlight` → `{ type: 'project' | 'research' | 'autonomous' }`
  - Emitted by the Instance Picker on carousel index change.
- `ada-instance-select` → `{ type: 'project' | 'research' | 'autonomous' }` (future wiring)
  - To be used when committing a selection.
- Prompt lifecycle:
  - `ada-prompt-start` (global) starts typing (triggered by load-in transitions).
  - `ada-prompt-done` (global) fired on typing completion.

## Visual constants (current)
- Instance bubble size: `200px` (class `.ip-glass-200`)
- Instance bubble blur: `backdrop-filter: blur(28px) saturate(1)`
- Instance icons:
  - Centering: grid-centered within the 200px circle
  - Size: Project ~125px (30% larger), Research/Autonomous 96px
  - Stroke: `0.3` (thin, white via `currentColor`)
- Chevron icons: 72px, stroke 1.1, outer extremes, pulse on click (300ms)
- Carousel slide animation: 320ms (transform-only) and hard-clipped to the circular viewport

---

## Demo Flow (operator script)

### Stage 0 — Boot and Instance Picker Reveal (A-state)
1) Load the page/app in a fresh state (new prompt A-state).
2) Observe the default Rive orb under glass; prompt types in.
3) On completion of the "create a new instance" prompt, the orb switches to the Instance Picker automatically.
   - Internally: `ada-orb-content` → `{ mode: 'instance-picker' }` and `ada-orb-layout` → `{ glassVisible: false }` (Rive glass hidden).

Talking points:
- “This is Ada’s orb. We can conditionally render content inside the orb without changing layout.”
- “We’re going to create/select a new Instance: Project, Research, or Autonomous.”

### Stage 1 — Project Instance (default highlight)
1) On Picker open, Project is highlighted by default. You see:
   - 200px glass circle with true blur.
   - Centered ‘Project’ icon (layout dashboard), enlarged (≈125px), thin stroke.
   - Label “Project Instance” beneath the circle.
2) Mention the interaction affordances:
   - Chevron pulse on click (300ms), keyboard can be added later.
   - Animations are clipped to the orb circle; nothing bleeds outside.

Talking points:
- “We’ll start with a Project instance. Ideal for scoped deliverables with milestones.”

### Stage 2 — Research Instance
1) Click the right chevron.
   - Slide-in from right, slide-out to left; 320ms.
   - `ada-instance-highlight` → `{ type: 'research' }` fires.
2) Research icon (notebook) appears centered (96px), thin stroke.

Talking points:
- “This is a Research instance—exploration mode, rapid context gathering, and hypothesis iteration.”

### Stage 3 — Autonomous Instance
1) Click the right chevron again.
   - Slide-in/out with clipping as above.
   - `ada-instance-highlight` → `{ type: 'autonomous' }` fires.
2) Autonomous icon (brain-circuit) appears centered (96px), thin stroke.

Talking points:
- “This is the Autonomous mode for sustained, self-directed operation with oversight controls.”

### Stage 4 — Optional selection handoff
1) For the demo, highlight selection intent (no hard commit yet):
   - Optionally dispatch `ada-instance-select` → `{ type }` to log/advance.
2) If returning to Project for next segment:
   - Chevron left twice; or click until Project is centered.

Talking points:
- “Selection is a soft event now; we can wire it to downstream flows (e.g., project scaffolding, research briefs, or autonomous routines).”

---

## Operator shortcuts (optional)
- Re-show Rive glass when leaving Picker:
```js
window.dispatchEvent(new CustomEvent('ada-orb-content', { detail: { mode: 'rive' } }))
window.dispatchEvent(new CustomEvent('ada-orb-layout', { detail: { glassVisible: true, glassSize: 225, glassInteractive: false } }))
```
- Re-open Instance Picker:
```js
window.dispatchEvent(new CustomEvent('ada-orb-content', { detail: { mode: 'instance-picker' } }))
window.dispatchEvent(new CustomEvent('ada-orb-layout', { detail: { glassVisible: false } }))
```

## QA checklist
- Instance bubble is 200×200, perfectly circular, centered.
- Icons are centered, correct sizes (Project: ~125px; others: 96px), thin strokes.
- Chevron clicks always animate (no flashes), pulse feedback runs every time.
- Slides are clipped to the circle (no bleed), blur persists during motion.
- Labels read “{Instance}\nInstance” beneath the circle.

## Future hooks (not in demo scope)
- Keyboard navigation: ←/→ for carousel, Enter to select (emit `ada-instance-select`).
- Persist last-picked instance and auto-rehydrate on revisit.
- Integrate selection with downstream flows (e.g., project scaffolding wizard).
