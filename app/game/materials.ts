import type { Artist, ArtistType, Commission, Material } from "./types.ts";
import type { TileMap } from "./grid.ts";
import { BUILDING_METADATA_BY_ID } from "./buildings.ts";

// Legacy-default material per artist type: what a commission needs when it
// doesn't name a material (pre-bronze saves). Sculptors default to marble;
// bronze only ever comes from an explicit Commission.material.
export const MATERIAL_BY_ARTIST_TYPE: Partial<Record<ArtistType, Material>> = {
  painter: "pigment",
  sculptor: "marble",
};

export const MATERIALS: readonly Material[] = ["pigment", "marble", "bronze"];

// Which artist type each material serves — tooltip noun only ("Bronze: 1/2 sculptors").
export const MATERIAL_USERS: Record<Material, string> = {
  pigment: "painters",
  marble: "sculptors",
  bronze: "sculptors",
};

/** A commission's required material: explicit field, or the artist-type default. */
export function commissionMaterial(c: Commission): Material | undefined {
  return c.material ?? MATERIAL_BY_ARTIST_TYPE[c.artistType];
}

/** workshopKey → required material, for assigned commissions only. */
export function assignedMaterials(commissions: Commission[]): Map<string, Material> {
  const byKey = new Map<string, Material>();
  for (const c of commissions) {
    const material = c.workshopKey ? commissionMaterial(c) : undefined;
    if (c.workshopKey && material) byKey.set(c.workshopKey, material);
  }
  return byKey;
}

export interface MaterialSupply {
  capacity: number; // total slots from staffed suppliers
  inUse: number; // working workshops granted a slot
  allowed: Set<string>; // workshop origin keys permitted to work this tick
}

export interface WorkingWorkshop {
  key: string; // origin key "x,y"
  material: Material; // material the workshop's current commission consumes
  builtTick: number;
}

/**
 * Allocate supplier capacity to working workshops (design doc, Phase 7).
 * Materials aren't consumed — a working workshop holds a slot until its
 * artwork completes. When demand exceeds capacity the oldest workshops keep
 * their slots: sort by (builtTick, key), the same tiebreak family as
 * allocateWorkers. Keyed by material, so marble and bronze (both sculptor
 * materials) don't cross-allocate. Every material gets an entry, even with no
 * supplier built (capacity 0).
 */
export function computeSupply(
  suppliers: { material: Material; capacity: number }[],
  working: WorkingWorkshop[]
): Partial<Record<Material, MaterialSupply>> {
  const result: Partial<Record<Material, MaterialSupply>> = {};
  for (const material of MATERIALS) {
    const capacity = suppliers
      .filter((s) => s.material === material)
      .reduce((sum, s) => sum + s.capacity, 0);
    const allowed = new Set(
      working
        .filter((w) => w.material === material)
        .sort((a, b) => a.builtTick - b.builtTick || a.key.localeCompare(b.key))
        .slice(0, capacity)
        .map((w) => w.key)
    );
    result[material] = { capacity, inUse: allowed.size, allowed };
  }
  return result;
}

/** Store/UI adapter: capacity from staffed supplier tiles, demand from working founders. */
export function getSupply(
  tiles: TileMap,
  artists: Artist[],
  commissions: Commission[]
): Partial<Record<Material, MaterialSupply>> {
  const suppliers: { material: Material; capacity: number }[] = [];
  for (const tile of Object.values(tiles)) {
    if (!tile.isOrigin || !tile.isActive) continue;
    const supplies = BUILDING_METADATA_BY_ID[tile.buildingId]?.supplies;
    if (supplies) suppliers.push(supplies);
  }
  const byKey = assignedMaterials(commissions);
  const working: WorkingWorkshop[] = [];
  for (const a of artists) {
    if (a.workProgress == null) continue;
    // A working founder's material comes from its assigned commission; fall
    // back to the type default for pre-bronze saves / orphaned progress.
    const material = byKey.get(a.homeTileKey) ?? MATERIAL_BY_ARTIST_TYPE[a.type];
    if (material == null) continue; // ungated type (architect)
    const home = tiles[a.homeTileKey];
    if (!home) continue; // workshop demolished; pruned by the next tick
    working.push({ key: a.homeTileKey, material, builtTick: home.builtTick ?? 0 });
  }
  return computeSupply(suppliers, working);
}

/** Tooltip/panel reason for a material-blocked workshop; null for ungated types. */
export function blockedReason(
  material: Material | undefined,
  supply: MaterialSupply | undefined
): string | null {
  if (material == null || supply == null) return null;
  if (supply.capacity === 0) return `No ${material} supplier`;
  const name =
    Object.values(BUILDING_METADATA_BY_ID).find((m) => m.supplies?.material === material)?.name ??
    "Supplier";
  return `${name} at capacity`;
}
