// Self-check for passive artist arrival.
// Run: node --experimental-strip-types app/game/artists.check.ts
import assert from "node:assert";

import {
  maybeArriveArtist,
  ARTIST_ARRIVAL_CHANCE,
  ARTIST_ARRIVAL_COOLDOWN_MONTHS,
  type AtelierSlot,
} from "./artists.ts";
import type { Artist } from "./types.ts";

const readyTick = ARTIST_ARRIVAL_COOLDOWN_MONTHS;
const atelier = (key: string, capacity = 2, isActive = true, builtTick = 0): AtelierSlot => ({
  key,
  capacity,
  isActive,
  builtTick,
});
// rng that returns a fixed sequence, then 0s. First draw gates arrival.
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++] ?? 0;
};
const win = () => 0; // always below ARTIST_ARRIVAL_CHANCE → arrival + picks index 0
const lose = () => ARTIST_ARRIVAL_CHANCE; // >= chance → no arrival

// Winning roll binds an apprentice to the (only) atelier.
{
  const out = maybeArriveArtist([atelier("5,5")], [], 3, readyTick, win);
  assert.ok(out);
  assert.equal(out.homeTileKey, "5,5");
  assert.equal(out.rank, "apprentice");
  assert.ok(out.type === "painter" || out.type === "sculptor");
}

// Gated off: no inspiration, inactive atelier, losing roll → null.
assert.equal(maybeArriveArtist([atelier("5,5")], [], 0, readyTick, win), null);
assert.equal(maybeArriveArtist([atelier("5,5", 2, false)], [], 3, readyTick, win), null);
assert.equal(maybeArriveArtist([atelier("5,5")], [], 3, readyTick, lose), null);

// Newly built ateliers wait a short cooldown before artists can arrive.
assert.equal(
  maybeArriveArtist([atelier("5,5", 2, true, readyTick)], [], 3, readyTick, win),
  null
);
assert.ok(maybeArriveArtist([atelier("5,5", 2, true, 0)], [], 3, readyTick, win));

// Full atelier → null even on a winning roll.
{
  const full: Artist[] = [
    { id: "a", name: "x", type: "painter", rank: "apprentice", homeTileKey: "5,5" },
    { id: "b", name: "y", type: "sculptor", rank: "apprentice", homeTileKey: "5,5" },
  ];
  assert.equal(maybeArriveArtist([atelier("5,5", 2)], full, 3, readyTick, win), null);
}

// Two open ateliers → first by key sort wins, regardless of input order.
{
  const out = maybeArriveArtist([atelier("9,1"), atelier("2,8")], [], 3, readyTick, win);
  assert.equal(out?.homeTileKey, "2,8");
}

// A full atelier is skipped so a second open one still receives the artist.
{
  const one: Artist[] = [{ id: "a", name: "x", type: "painter", rank: "apprentice", homeTileKey: "2,8" }];
  const out = maybeArriveArtist([atelier("2,8", 1), atelier("9,1")], one, 3, readyTick, seq(0, 0, 0));
  assert.equal(out?.homeTileKey, "9,1");
}

console.log("artists.check: all assertions passed");
