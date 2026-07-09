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

## Dirt-path overlay cost

The original neighbor-aware dirt paths use a 2048² mipmapped dynamic texture
and redraw/upload the full canvas whenever the map layout changes. This is
retained intentionally for its rounded corners and grass-edge treatment.

If it becomes a measurable placement hitch, preserve the art treatment while
adding dirty-rectangle updates or chunked overlays; do not replace it with
plain tiled quads without an explicit visual decision.
