# Animated Sortable (Drag-to-Position + Drag-to-Remove) — Design

**Date:** 2026-07-01
**Status:** Approved (Approach B — hand-built, dependency-free)

## Summary

Upgrade the two-panel settings from click-only add + native-drag reorder into a
custom, pointer-based **animated sortable**. Users can drag an app from Available
into a specific position in My shortcuts, reorder within My shortcuts, and drag a
shortcut onto the Available panel (which becomes a "Remove" drop zone) to delete
it. Neighboring tiles smoothly slide aside to open a gap where the dragged item
will land (FLIP animation). Click-to-add and the hover-× remove are retained.

Approach B is deliberate: if the hand-built animation does not feel smooth/modern
in Safari, that is the signal to switch to Approach A (vendor a proven sortable
library). The pure helpers and wiring from B carry over to A.

## Goals

- Drag any tile via pointer (mouse; touch as a bonus via Pointer Events).
- Dragging an **Available** app over My shortcuts opens an animated gap; drop inserts it at that index.
- Dragging a **My shortcut** reorders it with the same animated gap; drop moves it there.
- While dragging a **My shortcut**, the **Available panel becomes a "Remove" drop zone**; dropping there deletes the shortcut.
- The dragged tile lifts and follows the cursor (floating clone); the source becomes an invisible placeholder.
- Dropping outside a valid target **cancels** (snap back, no change).
- Keep **click-to-add** (appends) and the hover-**×** remove.

## Non-Goals (YAGNI)

- No third-party library in Approach B (that is Approach A, the fallback).
- No reordering of the Available panel (it is a fixed, catalog-derived list).
- No multi-select drag.
- No change to the popup or the saved-data shape.

## Interaction Model

| Action | Result |
| --- | --- |
| Click Available tile | `addApp` (append) — unchanged |
| Click × on a My tile | `removeApp` — unchanged |
| Drag Available tile → drop in My grid gap | `addAppAt(index)` |
| Drag Available tile → drop elsewhere | cancel (snap back) |
| Drag My tile → drop in My grid gap | `moveAppTo(index)` |
| Drag My tile → drop on Available ("Remove") | `removeApp` |
| Drag My tile → drop elsewhere | cancel (snap back) |

A drag begins only after the pointer moves past a small threshold (≈5px) from
pointerdown, so plain clicks still register as clicks.

## Architecture / Components

The popup is untouched. Pure logic is extracted so the DOM controller stays glue.

- **`src/lib/appList.js`** (extended): `addAppAt(list, input, index) -> list` —
  `makeApp(input)` inserted at `index` clamped to `[0, list.length]`; returns a
  new array; never mutates input. (Reuses existing `moveAppTo`, `removeApp`, `addApp`.)
- **`src/lib/grid.js`** (new): `insertionIndex(centers, x, y) -> number` — given
  an ordered array of tile center points `[{x, y}, …]` (visual order) and a
  pointer `(x, y)`, returns the index at which a dragged item should insert.
  Rule: pick the tile whose center is nearest the pointer; insert *before* it if
  the pointer is left-of / above its center, else *after*. Empty `centers` → 0.
  Pure and unit-tested.
- **`src/sortable.js`** (new): the pointer-drag DOM controller. Given the two
  grid elements, the Available panel element, a `getApps()` accessor, and
  callbacks (`onReorder(id, index)`, `onAddAt(entry, index)`, `onRemove(id)`), it:
  - starts a drag on pointerdown+move past threshold on a tile;
  - creates a `position: fixed` floating clone that tracks the pointer (via
    `setPointerCapture`);
  - maintains a placeholder at the live insertion index in the My grid;
  - animates shifted tiles with FLIP (measure rects before/after, apply inverse
    transform, transition to zero);
  - toggles the Available panel's `dragging`/"Remove" state when the drag source
    is a My shortcut;
  - on pointerup, resolves the target (My grid index / Remove zone / cancel),
    invokes the matching callback, and cleans up.
- **`src/options.js`** (extended): renders tiles as today, keeps click-add and
  ×-remove, and instantiates the sortable controller, mapping its callbacks onto
  the existing `persist(...)` funnel with `addAppAt` / `moveAppTo` / `removeApp`.
- **`src/options.css`** (extended): floating-clone, placeholder (gap), tile
  transition (`transform`), and Available-panel "Remove" drop-zone styles.

## Data Flow

1. Render both grids (unchanged). Attach the sortable controller once.
2. **Pointerdown** on a tile records origin + which list/id/entry it is.
3. **Pointermove** past threshold → begin drag: spawn floating clone, hide source
   into a placeholder, and (if source is a My shortcut) put Available into
   "Remove" state.
4. **Pointermove** (dragging): move the clone; compute `insertionIndex` from the
   My grid tile centers; if it changed, reposition the placeholder and FLIP-animate.
5. **Pointerup**: if over the My grid → `onReorder`/`onAddAt` at the placeholder
   index; else if over the Available "Remove" zone and dragging a My shortcut →
   `onRemove`; else cancel. Each callback runs `persist(...)`, which saves and
   re-renders. Clean up clone/placeholder/Remove state.

## Error Handling

- Drop with no valid target → cancel; grids re-render to their prior state.
- Pointer/drag cancellation (pointercancel, blur) → treated as cancel.
- Adding an app already present (drag an Available app whose URL is added) →
  cannot happen: added apps are absent from Available. Custom-form validation
  unchanged.
- Existing behaviors (icon fallback letter tile, storage-failure in-memory seed,
  empty-state messages) are unchanged.

## Testing

**Automated (pure functions):**
- `addAppAt` — inserts at index (start / middle / end), clamps out-of-range,
  generates an id, does not mutate input.
- `insertionIndex` — before-first, after-last, between two tiles (left/right of a
  center), row-wrapping case with mock centers, empty list → 0.

**Manual (the decisive gate — Safari):** the drag *feel*. Verify: click-add and
×-remove still work; dragging from Available inserts at the gap; reordering
animates smoothly (neighbors slide aside); the Available panel shows "Remove" and
deletes on drop; dropping outside cancels. **If the animation is not smooth or the
interaction feels wrong, switch to Approach A** (vendor a sortable library) — the
pure helpers and callback wiring are reused unchanged.

## Open Questions / Future Work

- Approach A fallback (vendor SortableJS) if B's animation quality is insufficient.
- Touch polish (long-press to start drag, scroll-vs-drag disambiguation) if the
  extension is ever used on a touch device — out of scope for desktop Safari now.
