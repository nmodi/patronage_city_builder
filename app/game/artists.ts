import type { Artist, ArtistType } from "./types";

// No runtime imports here: artists.check.ts runs this file under plain Node
// (type-only imports are stripped), mirroring workers.ts.

export const ARTIST_ARRIVAL_CHANCE = 0.1; // per month, when a slot is open
export const ARTIST_ARRIVAL_COOLDOWN_MONTHS = 2;

export interface AtelierSlot {
  key: string; // origin key "x,y"
  capacity: number;
  isActive: boolean;
  builtTick: number;
}

// ponytail: fixed pool, duplicate names tolerated — a uniqueness guard if it ever matters.
const NAMES = [
  "Lorenzo di Marco",
  "Caterina Bellini",
  "Sandro Vittori",
  "Benedetta Rossi",
  "Piero della Valle",
  "Isabella Fontana",
  "Donato Grimaldi",
  "Agnola Ferri",
  "Cosimo Baldini",
  "Lucrezia Sforza",
  "Bartolomeo Neri",
  "Filippa Conti",
  "Andrea del Pozzo",
  "Ginevra Marini",
  "Taddeo Ricci",
  "Simona Gozzoli",
];

const SPAWNABLE_TYPES: ArtistType[] = ["painter", "sculptor"];

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]!;
}

/**
 * Passive artist arrival (design doc, Phase 5). Each month, if the city has any
 * inspiration and at least one active atelier with a free slot, there's a
 * chance one apprentice arrives, bound to the first open atelier by key sort
 * (same deterministic tiebreak as allocateWorkers). Returns null when nothing
 * arrives. rng is injectable for the self-test.
 */
export function maybeArriveArtist(
  ateliers: AtelierSlot[],
  artists: Artist[],
  inspiration: number,
  currentTick: number,
  rng: () => number = Math.random
): Artist | null {
  if (inspiration <= 0) return null;

  const counts = new Map<string, number>();
  for (const a of artists) {
    counts.set(a.homeTileKey, (counts.get(a.homeTileKey) ?? 0) + 1);
  }

  const open = ateliers
    .filter((at) => {
      const isCooledDown = currentTick - at.builtTick >= ARTIST_ARRIVAL_COOLDOWN_MONTHS;
      return isCooledDown && at.isActive && (counts.get(at.key) ?? 0) < at.capacity;
    })
    .sort((a, b) => a.key.localeCompare(b.key));

  if (open.length === 0) return null;
  if (rng() >= ARTIST_ARRIVAL_CHANCE) return null;

  return {
    id: crypto.randomUUID(),
    name: pick(NAMES, rng),
    type: pick(SPAWNABLE_TYPES, rng),
    rank: "apprentice",
    homeTileKey: open[0]!.key,
  };
}
