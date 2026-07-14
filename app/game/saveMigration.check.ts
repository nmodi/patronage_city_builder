import assert from "node:assert";

import { migrateSave, SAVE_VERSION } from "./saveMigration.ts";

const legacy = { florins: 123, map: { tiles: { "1,1": {} } } };
assert.deepEqual(migrateSave(legacy, 4), {});
assert.deepEqual(migrateSave(legacy, 5), { ...legacy, mapSeed: null, artists: [] });

// v6 → v7 rescales artist XP ×100; ranks are untouched.
const v6 = {
  ...legacy,
  mapSeed: "abc",
  artists: [{ rank: "journeyman", xp: 5.5 }, { rank: "apprentice" }],
};
assert.deepEqual(migrateSave(v6, 6), {
  ...v6,
  artists: [
    { rank: "journeyman", xp: 550 },
    { rank: "apprentice", xp: 0 },
  ],
});

const current = { ...legacy, mapSeed: "abc" };
assert.equal(migrateSave(current, SAVE_VERSION), current);
assert.equal(migrateSave(current, SAVE_VERSION + 1), current);

console.log("saveMigration.check: all assertions passed");
