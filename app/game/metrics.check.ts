import assert from "node:assert";

import { BUILDING_METADATA_BY_ID, type BuildingId } from "./buildings.ts";
import { BASE_POPULATION_CAP } from "./constants.ts";
import type { Tile, TileMap } from "./grid.ts";
import { computeCityMetrics } from "./metrics.ts";

function put(
  tiles: TileMap,
  buildingId: BuildingId,
  x: number,
  y: number,
  isActive = true,
  isOrigin = true
) {
  const metadata = BUILDING_METADATA_BY_ID[buildingId];
  const tile: Tile = {
    type: metadata.type,
    buildingId,
    position: { x, y },
    origin: isOrigin ? { x, y } : { x: x - 1, y },
    isOrigin,
    isActive,
    workers: 0,
    builtTick: 0,
  };
  tiles[`${x},${y}`] = tile;
}

{
  const tiles: TileMap = {};
  put(tiles, "cottage", 0, 0);
  put(tiles, "cottage", 1, 0, true, false);
  assert.deepEqual(computeCityMetrics(tiles), {
    housing: 4,
    amenities: BASE_POPULATION_CAP,
  });
}

{
  const tiles: TileMap = {};
  put(tiles, "town_center_plaza", 0, 0);
  put(tiles, "cottage", 1, 0);
  put(tiles, "bakery", 0, 1, true);
  assert.deepEqual(computeCityMetrics(tiles), {
    housing: 5,
    amenities: BASE_POPULATION_CAP + 25,
  });
}

{
  const tiles: TileMap = {};
  put(tiles, "bakery", 0, 0, false);
  assert.equal(computeCityMetrics(tiles).amenities, BASE_POPULATION_CAP);
}

console.log("metrics.check: all assertions passed");
