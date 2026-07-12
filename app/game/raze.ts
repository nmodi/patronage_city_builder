import { BUILDING_METADATA_BY_ID, rotatedFootprint, type BuildingId } from "./buildings.ts";
import { reopenCommission } from "./commissions.ts";
import type { GridPos, TileMap } from "./grid.ts";
import type { Artist, Commission } from "./types.ts";

export interface RazeSnapshot {
  florins: number;
  artists: Artist[];
  commissions: Commission[];
  map: { tiles: TileMap };
  time: { tickCount: number };
}

export interface RazeTransition {
  florins: number;
  artists: Artist[];
  commissions: Commission[];
  tiles: TileMap;
}

export interface RazeImpact {
  artistCount: number;
  commission: Commission | undefined;
  needsConfirmation: boolean;
}

/** Consequences shown by the raze confirmation and enforced by its controller. */
export function getRazeImpact(
  artists: Artist[],
  commissions: Commission[],
  originKey: string | null
): RazeImpact {
  if (!originKey) {
    return { artistCount: 0, commission: undefined, needsConfirmation: false };
  }
  let artistCount = 0;
  for (const artist of artists) {
    if (artist.homeTileKey === originKey) artistCount += 1;
  }
  const commission = commissions.find((item) => item.workshopKey === originKey);
  return {
    artistCount,
    commission,
    needsConfirmation: artistCount > 0 || commission != null,
  };
}

/** Half the build cost, rounded down once per razed structure. */
export function getRazeSalvage(buildingId: BuildingId): number {
  return Math.floor((BUILDING_METADATA_BY_ID[buildingId]?.baseCost ?? 0) / 2);
}

/** Apply every demolition consequence without depending on the Zustand adapter. */
export function razeBuilding(
  state: RazeSnapshot,
  position: GridPos
): RazeTransition | null {
  const tile = state.map.tiles[`${position.x},${position.y}`];
  if (!tile) return null;

  const metadata = BUILDING_METADATA_BY_ID[tile.buildingId];
  const { width, depth } = metadata
    ? rotatedFootprint(metadata, tile.rotation)
    : { width: 1, depth: 1 };
  const { x: originX, y: originY } = tile.origin;
  const originKey = `${originX},${originY}`;
  const tiles = { ...state.map.tiles };

  for (let dx = 0; dx < width; dx += 1) {
    for (let dy = 0; dy < depth; dy += 1) {
      const key = `${originX + dx},${originY + dy}`;
      const cell = tiles[key];
      // Overlapping decorations and structures retain cells owned by another origin.
      if (cell?.origin.x === originX && cell.origin.y === originY) delete tiles[key];
    }
  }

  const evicting = state.artists.some((artist) => artist.homeTileKey === originKey);
  const reopening = state.commissions.some((item) => item.workshopKey === originKey);

  return {
    florins: state.florins + getRazeSalvage(tile.buildingId),
    artists: evicting
      ? state.artists.filter((artist) => artist.homeTileKey !== originKey)
      : state.artists,
    commissions: reopening
      ? state.commissions.map((item) =>
          item.workshopKey === originKey
            ? reopenCommission(item, state.time.tickCount)
            : item
        )
      : state.commissions,
    tiles,
  };
}
