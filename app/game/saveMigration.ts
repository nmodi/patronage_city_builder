export const SAVE_VERSION = 7;

/** Preserve compatible saves while explicitly discarding structurally obsolete versions. */
export function migrateSave(persisted: unknown, version: number): unknown {
  // Pre-v5 footprints and commission data are incompatible with the current map.
  if (version < 5) return {};
  let save = persisted as { mapSeed?: unknown; artists?: { xp?: number }[] };
  // v5 predates seeded water. Keeping it permanently dry avoids placing a new
  // river through an existing city.
  if (version === 5) save = { ...save, mapSeed: null };
  // v7 rescaled XP ×100 (one completed work: 1 → 100 xp).
  if (version < 7) {
    save = {
      ...save,
      artists: (save.artists ?? []).map((a) => ({ ...a, xp: (a.xp ?? 0) * 100 })),
    };
  }
  return save;
}
