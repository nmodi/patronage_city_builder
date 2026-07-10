# Rendering performance backlog

Issues from the July 2026 performance review. Updated after the batching pass
(building/scatter thin instances, on-demand shadows, shared smoke) — most items
below are now DONE; what remains is the grid-growth checklist at the end.

## Building batching and shadows — DONE

Placed buildings render as thin-instance batches: one host mesh per
(source kit mesh × active/inactive state), so draw calls and shadow casters
stay constant as the city grows (`createBuildingBatcher` in
`assetLibrary.ts`). Layout still goes through `instantiateBuilding` — a
transient clone is built per placement, its meshes' world matrices harvested
into batches, and the clone disposed — so variants, rotation, footprint fit,
and neighbor extensions were untouched. Toggling active moves a building's
matrices between the on/off batches (shared desaturated materials), preserving
per-building inactive feedback. The placement ghost keeps the clone path.

Shadows render on demand: the 2048 map uses `REFRESHRATE_RENDER_ONCE` and is
re-rendered (after `forceCompilationAsync`, so not-yet-compiled depth shaders
aren't silently skipped) only when casters change. Casters are the batch hosts
— a constant ~dozens of meshes. Near-camera caster culling was therefore not
needed; revisit only if the single static 2048 map ever looks too soft at
160×160.

Gotcha for future batch work: thin-instance hosts must call
`makeGeometryUnique()` — Babylon caches VAOs on the geometry, so hosts sharing
a geometry clobber each other's instance-buffer bindings
(GL "vertex buffer not big enough", meshes silently vanish).

## Distance culling and LOD — resolved via batching

Environment scatter is now thin-instance batches per kit mesh (~600–900 clone
meshes → ~34 hosts), built in one pass after the 750ms post-paint defer (the
32-per-frame streaming was removed along with the per-clone cost it existed
for). Per-item culling and impostors are moot at this draw-call count; fog
(end 95) bounds the visible range. Revisit LOD only if profiling at a larger
map shows vertex-bound frames.

## Smoke batching — DONE

One shared `ParticleSystem` per scene (`smoke.ts`): each spawned particle
picks a random registered active chimney, so inactive buildings still show no
smoke. Emit rate scales 4/chimney up to a global cap of 80 (capacity 240);
with very many chimneys plumes statistically thin out instead of the scene
accumulating particle systems.

## Simulation / sync scans — DONE

- `queueSync`'s tile diff is O(occupied tiles), not O(grid area) — the tile map
  is sparse and the tick preserves object identity for unchanged tiles. No
  explicit changed-cell plumbing in store actions is needed for grid growth.
- `queueSync` now returns the building ids among changed tiles;
  `BabylonCanvas.queueMap` preloads only those instead of rescanning the whole
  map on every store update.
- `computePlazaConnectivity` is memoized by tiles-object identity (WeakMap),
  deduping the tick's second call via `getHousing` and the per-render
  tooltip/TopBar calls.

## Dirt-path overlay

Chunk size is fixed at 20 cells / 512² (constant redraw cost and detail);
the chunk count derives from `GRID_SIZE`, and chunks stay lazily allocated.
Chunk grounds are ordinary meshes, so Babylon frustum-culls off-screen ones —
no extra camera culling needed.

Chunk redraws are frame-budgeted (July 2026): `update` only queues dirty
chunks; `processSync` drains one per frame through the same rAF loop that
streams buildings. Fixed the page-load stall where the initial sync
rasterized + uploaded every dirt chunk synchronously before first paint.

Only if profiling shows a remaining placement hitch: consider a custom shader
reading a dirt/occupancy topology mask (less upload bandwidth, more shader
complexity and visual-regression risk). Do not replace the overlay with plain
tiled quads without an explicit visual decision. Canvas dirty rectangles alone
are not useful: Babylon uploads the complete dynamic texture and regenerates
its mipmaps on each update.

## Grid-growth checklist (when GRID_SIZE 80 → ~160 lands)

- `GRID_SIZE` in `app/game/constants.ts` is the only sim-side change (tick and
  connectivity are O(occupied tiles); dirt chunks and terrain flat radius
  derive from it). GRID_SIZE must stay a multiple of 20 (dirt chunk size).
- `terrain.ts` `TERRAIN_SIZE = 320` still covers a 160 grid (city 80 world
  units + scatter ring ≈ 208); enlarge it and re-tune fog (70/95) and camera
  `upperRadiusLimit` (60) together for the bigger map.
- Wilderness density: scatter counts in `scatterEnvironment` are fixed numbers
  tuned for the current ring; scale them with the ring area. Cost is
  per-instance matrix math only — draw calls stay at ~34 hosts.
- Profile on target hardware after the bump: GPU frame time, active mesh
  count, and placement hitches (dirt chunk redraws are the remaining
  per-placement canvas cost).
