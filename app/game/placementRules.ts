import {
  BUILDING_METADATA_BY_ID,
  rotatedFootprint,
  type BuildingId,
} from "./buildings.ts";
import { GRID_SIZE } from "./constants.ts";
import type { GridPos, TileMap } from "./grid.ts";
import type { BuildingMetadata } from "./types.ts";
import { getWaterCells } from "./water.ts";

export interface PlacementSnapshot {
  florins: number;
  mapSeed: string | null;
  map: { tiles: TileMap };
}

export interface PlacementPlan {
  metadata: BuildingMetadata;
  footprint: { width: number; depth: number };
  positions: GridPos[];
  freeCells: ReadonlySet<string>;
  totalCost: number;
}

/** Authoritative validation for a batch of building origins. */
export function planPlacement(
  state: PlacementSnapshot,
  positions: GridPos[],
  buildingId: BuildingId,
  rotation?: number
): PlacementPlan | null {
  const metadata = BUILDING_METADATA_BY_ID[buildingId];
  if (!metadata || positions.length === 0) return null;

  const footprint = rotatedFootprint(metadata, rotation);
  const freeCells = new Set<string>();
  const water = getWaterCells(state.mapSeed);
  const canOverlap = metadata.type === "decoration";

  for (const position of positions) {
    if (
      position.x < 0 ||
      position.y < 0 ||
      position.x + footprint.width > GRID_SIZE ||
      position.y + footprint.depth > GRID_SIZE
    ) {
      return null;
    }

    for (let dx = 0; dx < footprint.width; dx += 1) {
      for (let dy = 0; dy < footprint.depth; dy += 1) {
        const key = `${position.x + dx},${position.y + dy}`;
        if (freeCells.has(key)) return null;

        if (state.map.tiles[key]) {
          if (!canOverlap || (dx === 0 && dy === 0)) return null;
          continue;
        }
        if (buildingId !== "bridge" && water.has(key)) return null;
        freeCells.add(key);
      }
    }
  }

  const totalCost = metadata.baseCost * positions.length;
  if (state.florins < totalCost) return null;
  return { metadata, footprint, positions, freeCells, totalCost };
}

/**
 * Plan a drag-placed road or linear decoration. Existing compatible cells join
 * the run for free; only newly claimed cells are validated and charged.
 */
export function planLinearPlacement(
  state: PlacementSnapshot,
  positions: GridPos[],
  buildingId: BuildingId
): PlacementPlan | null {
  const metadata = BUILDING_METADATA_BY_ID[buildingId];
  if (!metadata || (metadata.type !== "road" && !metadata.linear) || positions.length === 0) {
    return null;
  }

  const newCells: GridPos[] = [];
  for (const position of positions) {
    if (position.x < 0 || position.x >= GRID_SIZE || position.y < 0 || position.y >= GRID_SIZE) {
      return null;
    }
    const tile = state.map.tiles[`${position.x},${position.y}`];
    if (!tile) {
      newCells.push(position);
      continue;
    }
    const joinable =
      metadata.type === "road" ? tile.type === "road" : tile.buildingId === buildingId;
    if (!joinable) return null;
  }

  if (newCells.length > 0) return planPlacement(state, newCells, buildingId);
  return {
    metadata,
    footprint: metadata.footprint,
    positions: [],
    freeCells: new Set(),
    totalCost: 0,
  };
}
