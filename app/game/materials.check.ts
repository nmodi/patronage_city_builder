// Self-check for material supply allocation.
// Run: node --experimental-strip-types app/game/materials.check.ts
import assert from "node:assert";

import {
  blockedReason,
  computeSupply,
  MATERIAL_BY_ARTIST_TYPE,
  type WorkingWorkshop,
} from "./materials.ts";
import type { Material } from "./types.ts";

const sup = (material: Material, capacity: number) => ({ material, capacity });
const w = (
  key: string,
  builtTick: number,
  material: Material = "pigment"
): WorkingWorkshop => ({ key, material, builtTick });

// Capacity aggregates across suppliers of the same material.
{
  const out = computeSupply([sup("pigment", 2), sup("pigment", 1)], []);
  assert.equal(out.pigment!.capacity, 3);
  assert.equal(out.pigment!.inUse, 0);
}

// Demand over capacity: oldest workshops (builtTick) keep their slots.
{
  const out = computeSupply([sup("pigment", 2)], [w("9,9", 30), w("1,1", 10), w("5,5", 20)]);
  assert.equal(out.pigment!.inUse, 2);
  assert.ok(out.pigment!.allowed.has("1,1"));
  assert.ok(out.pigment!.allowed.has("5,5"));
  assert.ok(!out.pigment!.allowed.has("9,9"));
}

// builtTick tie → key order decides.
{
  const out = computeSupply([sup("pigment", 1)], [w("9,9", 5), w("1,1", 5)]);
  assert.ok(out.pigment!.allowed.has("1,1"));
  assert.ok(!out.pigment!.allowed.has("9,9"));
}

// No suppliers: every material still gets an entry, nothing allowed.
{
  const out = computeSupply([], [w("1,1", 0)]);
  assert.equal(out.pigment!.capacity, 0);
  assert.equal(out.pigment!.inUse, 0);
  assert.equal(out.pigment!.allowed.size, 0);
  assert.equal(out.marble!.capacity, 0);
  assert.equal(out.bronze!.capacity, 0);
}

// The result is keyed by material (the three of them); architect has no default material.
{
  const out = computeSupply([], []);
  assert.deepEqual(Object.keys(out).sort(), ["bronze", "marble", "pigment"]);
  assert.equal(MATERIAL_BY_ARTIST_TYPE.architect, undefined);
}

// Different materials don't cross-allocate — a pigment supplier grants no marble slot.
{
  const out = computeSupply([sup("pigment", 1)], [w("1,1", 0, "marble")]);
  assert.equal(out.pigment!.inUse, 0);
  assert.equal(out.marble!.inUse, 0);
}

// Marble and bronze share the sculptor artist type but never pool: a marble
// supplier serves only the marble workshop; the bronze one stays blocked.
{
  const out = computeSupply([sup("marble", 1)], [w("1,1", 0, "marble"), w("2,2", 0, "bronze")]);
  assert.equal(out.marble!.inUse, 1);
  assert.ok(out.marble!.allowed.has("1,1"));
  assert.equal(out.bronze!.inUse, 0);
  assert.ok(!out.bronze!.allowed.has("2,2"));
}

// Blocked-reason strings match the design doc's tooltip examples.
assert.equal(
  blockedReason("pigment", { capacity: 0, inUse: 0, allowed: new Set() }),
  "No pigment supplier"
);
assert.equal(
  blockedReason("pigment", { capacity: 3, inUse: 3, allowed: new Set() }),
  "Pigment Trader at capacity"
);
assert.equal(
  blockedReason("marble", { capacity: 2, inUse: 2, allowed: new Set() }),
  "Marble Supplier at capacity"
);
assert.equal(
  blockedReason("bronze", { capacity: 0, inUse: 0, allowed: new Set() }),
  "No bronze supplier"
);
assert.equal(
  blockedReason("bronze", { capacity: 2, inUse: 2, allowed: new Set() }),
  "Bronze Foundry at capacity"
);
assert.equal(blockedReason(undefined, undefined), null);

console.log("materials.check: all assertions passed");
