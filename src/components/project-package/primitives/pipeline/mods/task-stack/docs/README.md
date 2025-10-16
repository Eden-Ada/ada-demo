# Task Stack Concept

Task Stacks let a Task Block represent a compound objective made up of multiple, smaller actionable Task Items (chips). Some blocks are atomic (single task), but compound blocks visually expand into a stack of items that users work through one by one. When all items are complete, the parent block auto-completes.

## Mental Model

- **Task Block**: The parent container that names the objective (e.g., “Design the UX + Flow”). Blocks can be atomic or compound.
- **Task Stack**: A visual stack of Task Items that overlays the Task Block when the block is “opened.”
- **Task Item (Chip)**: A single actionable unit that can be completed/checked. Each chip represents a clear, automatable step.
- **Completion**: When all Task Items in the stack are marked complete, the Task Block completes (progress arc finishes, checkmark draws, block text dims).

## UX Behavior

- **Closed State**: The Task Block shows its progress ring and descriptor.
- **Open State**: The Task Stack appears above the Task Block, centered. The stack visually conveys multiple items; users can check them off individually.
- **Completion Flow**:
  - As progress reaches 100%, the block’s arc fades (to 0 or to configured alpha) and a checkmark draws in the center.
  - The block descriptor and pill text fade according to the same completion pattern.

## Current Harness

File: `task-stack/test/task-stack-harness.tsx`

- Renders a `TaskBlock` (descriptor + progress arc) and optionally overlays a `TaskStack` of items when “Open stack” is enabled.
- Controls:
  - Items count slider (simulates stack depth)
  - Open/close toggle
  - Descriptor input
  - Progress slider (drives completion)
  - Arc Style picker (Style 1 — Solid, Style 2 — Thin + Glow)

## Visual/Animation System

- **Progress Arc**: Drawn by `ProgMeter`. Style 1 (solid), Style 2 (thin + glow + outer gap).
- **Completion**: Managed by CSS animations and utility helpers.
  - Arc fade/draw animations: `task-block/prog-meter/styles/prog-animations.css`
  - Text fade (descriptor/pill): `task-block/styles/tb-animations.css`
  - Completion helpers: `task-block/utils/task-completion.ts`

## Data and State Handoffs

- **Progress**: A number 0–100 propagated into `TaskBlock` -> `ProgMeter`.
- **Completion**: Derived from progress via `isComplete(percent)`.
- **Text Alpha**: `--tb-text-alpha` CSS var is set by `TaskBlock` when complete, letting CSS fade text consistently.

## Next Steps (Roadmap)

- Wire real item state:
  - Track each Task Item’s completion; derive Block completion from all-checked.
  - Expose per-item assignees, due dates, and automation/manual flags.
- Stack interactions:
  - Animate open/close of stack; staggered item entrance.
  - Drag-reorder items; show dependency/order if needed.
- Persistence & API:
  - Save item completion and block state to backend; restore into harness.
- Visual polish:
  - Add subtle depth (parallax/blur) to the stack overlay.
  - Hover affordances for item actions.
