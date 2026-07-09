# Rendering performance backlog

This note records issues identified in the July 2026 performance review that
remain after the progressive-loading and paved-road batching pass.

## Building batching and shadows

Placed building prefabs still clone each kit part so an individual building can
switch between active and inactive material sets. Every part also becomes a
shadow caster. This means visual building detail continues to increase normal
and shadow-map draw calls linearly.

Follow-up: compile prefab variants into active/inactive thin-instance batches
(or static chunk meshes), then keep only near-camera buildings in the shadow
generator. Preserve per-building inactive feedback with a separate batch or a
shader attribute rather than a material per clone.

## Distance culling and LOD

The environment now streams into the scene, but all emitted instances remain
available to the renderer. Add camera-cell culling and low-detail/impostor
variants before increasing the wilderness density or map extent.

## Smoke batching

Each chimney owns a `ParticleSystem` (up to 30 particles). This is acceptable
for the current city and is intentionally deferred, but it should be replaced
with a capped shared particle system or near-camera pooled emitters before
industrial building counts grow substantially.

## Further renderer and simulation profiling

`queueSync` avoids rebuilding unchanged entries, but it still compares the
tile-record snapshots to discover changed cells. At the current 80×80 cap this
is acceptable. If the grid grows, add explicit changed-cell information to the
store actions and profile the tick loop, active mesh count, shadow draw calls,
and GPU frame time on target hardware.

## Dirt-path overlay refinements

The rounded dirt paths now use lazy 20×20-cell chunks (a 4×4 grid of 512²
mipmapped dynamic textures). Only chunks around a dirt/occupancy topology
change redraw; a one-cell source border keeps inside fillets continuous across
chunk boundaries. `queueSync` also tracks dirt and occupied cells incrementally
instead of scanning and sorting the full tile map for every layout update.

This preserves the rounded corners, grass-edge treatment, and texture scale
while reducing a typical placement update from one 2048² upload to one 512²
upload (or up to four chunks at a chunk boundary).

Further refinement, only if profiling shows a remaining placement hitch:

- Measure canvas time, texture-upload time, and active chunk draw calls on
  target hardware before changing the approach again.
- Consider a single custom shader that reads a small dirt/occupancy topology
  mask and generates the same rounded silhouette on the GPU. It would reduce
  update bandwidth further, but adds shader complexity and visual-regression
  risk.
- Add camera culling for enabled dirt chunks if map extent grows beyond the
  current 80×80 grid.

Do not replace the overlay with plain tiled quads without an explicit visual
decision. Canvas dirty rectangles alone are not useful here: Babylon uploads
the complete dynamic texture and regenerates its mipmaps on each update.
