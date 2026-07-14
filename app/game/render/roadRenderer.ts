import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

import { CELL_SIZE } from "~/game/constants";
import { gridToWorld, type Tile, type TileMap } from "~/game/grid";
import { ROAD_DIAG_NE, ROAD_DIAG_NW } from "~/game/roadStretch";
import { getDirtRibbonMaterial, getRoadMaterial } from "./paths";
import { prepareThinInstanceHost } from "./thinInstanceHost";

type RoadBatch = { mesh: Mesh; tiles: Map<string, Tile>; dirty: boolean };

/** Thin-instance renderer for paved roads, bridge decks, and bridge parapets. */
export function createRoadRenderer(scene: Scene) {
  function createRoadBatch(name: string): RoadBatch {
    const mesh = MeshBuilder.CreateGround(name, { width: CELL_SIZE, height: CELL_SIZE }, scene);
    mesh.material = getRoadMaterial(scene);
    prepareThinInstanceHost(mesh);
    mesh.setEnabled(false);
    return { mesh, tiles: new Map(), dirty: false };
  }

  const pavedRoads = createRoadBatch("paved-road-batch");
  const dirtRibbons = createRoadBatch("dirt-ribbon-batch");
  dirtRibbons.mesh.material = getDirtRibbonMaterial(scene);
  const bridges = createRoadBatch("bridge-deck-batch");
  const bridgeDeckY = 0.025;
  const parapetHeight = 0.09;
  const parapetMaterial = new StandardMaterial("bridge-parapet-mat", scene);
  parapetMaterial.diffuseColor = Color3.FromHexString("#cbbfa3");
  parapetMaterial.specularColor = Color3.Black();
  const parapets = MeshBuilder.CreateBox(
    "bridge-parapet-batch",
    { width: CELL_SIZE, height: parapetHeight, depth: 0.05 },
    scene
  );
  parapets.material = parapetMaterial;
  prepareThinInstanceHost(parapets);
  parapets.setEnabled(false);

  // Cardinal dirt (rotation null) has no thin-instance batch — it renders through
  // the raster overlay. Diagonal dirt can't (the raster is grid-axis-aligned), so
  // it gets its own ribbon batch, mirroring the paved diagonal path.
  const batchFor = (t: Tile): RoadBatch | null =>
    t.buildingId === "dirt_path"
      ? t.rotation != null
        ? dirtRibbons
        : null
      : t.buildingId === "bridge"
        ? bridges
        : pavedRoads;

  function update(key: string, previous?: Tile, next?: Tile) {
    if (previous?.type === "road") {
      const batch = batchFor(previous);
      if (batch?.tiles.delete(key)) batch.dirty = true;
    }
    if (next?.type === "road") {
      const batch = batchFor(next);
      if (batch) {
        batch.tiles.set(key, next);
        batch.dirty = true;
      }
    }
  }

  const opposite = (r: number | undefined) =>
    r === ROAD_DIAG_NE ? ROAD_DIAG_NW : r === ROAD_DIAG_NW ? ROAD_DIAG_NE : undefined;

  // A diagonal-owned cell renders only its rotated √2×1 quad, so where a cardinal
  // street crosses it the shared square's corners stay bare. Emit an unrotated
  // cell-square plate under such a cell — but only at a real crossing: a cardinal
  // 4-neighbor (rotation null) or the opposite-diagonal 8-neighbor (NE×NW bowtie).
  // Same-rotation lane-mates and staircase steps match neither, so no false plate.
  function needsPlate(batch: RoadBatch, tile: Tile) {
    const { x, y } = tile.position;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = batch.tiles.get(`${x + dx},${y + dy}`);
      if (n && n.rotation == null) return true;
    }
    const opp = opposite(tile.rotation);
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      if (batch.tiles.get(`${x + dx},${y + dy}`)?.rotation === opp) return true;
    }
    return false;
  }

  function flushRoadBatch(batch: RoadBatch, diagY: number, withPlates: boolean) {
    if (!batch.dirty) return;
    if (batch.tiles.size === 0) {
      batch.mesh.thinInstanceSetBuffer("matrix", null);
      batch.mesh.setEnabled(false);
      batch.dirty = false;
      return;
    }
    // Plate count varies, so accumulate into a list rather than a pre-sized array.
    const matrices: number[] = [];
    const scratch: number[] = new Array(16);
    const matrix = Matrix.Identity();
    // Diagonal ribbon pieces: consecutive staircase centers are √2·CELL_SIZE
    // apart, so a √2-long quad abuts exactly; diagY (above the cardinal 0.01)
    // keeps junction/cross-row overlaps from coplanar shimmer.
    const diagScale = new Vector3(Math.SQRT2, 1, 1);
    const diagQuat = new Quaternion();
    const diagPos = new Vector3();
    for (const tile of batch.tiles.values()) {
      const { x, z } = gridToWorld(tile.position.x, tile.position.y);
      if (tile.rotation === ROAD_DIAG_NE || tile.rotation === ROAD_DIAG_NW) {
        // NE = grid dir (1,1) → world (+x,+z): θ = −π/4 under the codebase yaw
        // convention (+X → (cos θ, 0, −sin θ)); NW mirrors to +π/4.
        const theta = tile.rotation === ROAD_DIAG_NE ? -Math.PI / 4 : Math.PI / 4;
        Quaternion.RotationYawPitchRollToRef(theta, 0, 0, diagQuat);
        diagPos.set(x, diagY, z);
        Matrix.ComposeToRef(diagScale, diagQuat, diagPos, matrix);
        matrix.copyToArray(scratch, 0);
        matrices.push(...scratch);
        if (withPlates && needsPlate(batch, tile)) {
          Matrix.TranslationToRef(x, 0.01, z, matrix);
          matrix.copyToArray(scratch, 0);
          matrices.push(...scratch);
        }
      } else {
        Matrix.TranslationToRef(x, 0.01, z, matrix);
        matrix.copyToArray(scratch, 0);
        matrices.push(...scratch);
      }
    }
    batch.mesh.thinInstanceSetBuffer("matrix", new Float32Array(matrices), 16, true);
    batch.mesh.setEnabled(true);
    batch.dirty = false;
  }

  function flushBridges(tiles: TileMap) {
    if (!bridges.dirty) return;
    if (bridges.tiles.size === 0) {
      bridges.mesh.thinInstanceSetBuffer("matrix", null);
      bridges.mesh.setEnabled(false);
      parapets.thinInstanceSetBuffer("matrix", null);
      parapets.setEnabled(false);
      bridges.dirty = false;
      return;
    }

    const deckMatrices = new Float32Array(bridges.tiles.size * 16);
    const railMatrices: number[] = [];
    const matrix = Matrix.Identity();
    const rail: number[] = new Array(16);
    const diagScale = new Vector3(Math.SQRT2, 1, 1);
    const diagQuat = new Quaternion();
    const diagPos = new Vector3();
    let offset = 0;
    // Bridge sides stay open where a road or civic footprint continues the path.
    const openAt = (x: number, y: number) => {
      const type = tiles[`${x},${y}`]?.type;
      return type === "road" || type === "city";
    };

    for (const tile of bridges.tiles.values()) {
      const { x: gx, y: gy } = tile.position;
      const { x, z } = gridToWorld(gx, gy);
      const railY = bridgeDeckY + parapetHeight / 2;
      const inset = CELL_SIZE / 2 - 0.035;

      if (tile.rotation === ROAD_DIAG_NE || tile.rotation === ROAD_DIAG_NW) {
        const theta = tile.rotation === ROAD_DIAG_NE ? -Math.PI / 4 : Math.PI / 4;
        Quaternion.RotationYawPitchRollToRef(theta, 0, 0, diagQuat);
        // +0.0015 above the cardinal deck: the √2 quad overhangs its cell
        // (~0.104 wu) and would coplanar-overlap a cardinal deck it joins.
        diagPos.set(x, bridgeDeckY + 0.0015, z);
        Matrix.ComposeToRef(diagScale, diagQuat, diagPos, matrix);
        matrix.copyToArray(deckMatrices, offset);
        offset += 16;
        // Rails run along the ribbon's long (local ±z) sides; world side normal
        // for s = ±1 is s·(sinθ, 0, cosθ). The √2 x-scale abuts same-lane rails
        // like the deck. Suppress a multi-lane bridge's interior rail: lanes
        // offset +x (roadStretch), so skip side s where a same-rotation bridge
        // cell sits at gx + sign(s·sinθ).
        // ponytail: no end-cap rails at 45° — diagonal ends read fine bare, and
        // openAt's cardinal offsets don't map onto a 45° dead end.
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);
        for (const s of [-1, 1]) {
          const neighbor = tiles[`${gx + Math.sign(s * sin)},${gy}`];
          if (neighbor?.buildingId === "bridge" && neighbor.rotation === tile.rotation) continue;
          diagPos.set(x + s * sin * inset, railY, z + s * cos * inset);
          Matrix.ComposeToRef(diagScale, diagQuat, diagPos, matrix);
          matrix.copyToArray(rail, 0);
          railMatrices.push(...rail);
        }
        continue;
      }

      Matrix.TranslationToRef(x, bridgeDeckY, z, matrix);
      matrix.copyToArray(deckMatrices, offset);
      offset += 16;

      if (!openAt(gx, gy - 1)) {
        Matrix.TranslationToRef(x, railY, z - inset, matrix);
        matrix.copyToArray(rail, 0);
        railMatrices.push(...rail);
      }
      if (!openAt(gx, gy + 1)) {
        Matrix.TranslationToRef(x, railY, z + inset, matrix);
        matrix.copyToArray(rail, 0);
        railMatrices.push(...rail);
      }
      for (const side of [-1, 1]) {
        if (openAt(gx + side, gy)) continue;
        Matrix.RotationYToRef(Math.PI / 2, matrix);
        matrix.setTranslationFromFloats(x + side * inset, railY, z);
        matrix.copyToArray(rail, 0);
        railMatrices.push(...rail);
      }
    }

    bridges.mesh.thinInstanceSetBuffer("matrix", deckMatrices, 16, true);
    bridges.mesh.setEnabled(true);
    if (railMatrices.length > 0) {
      parapets.thinInstanceSetBuffer("matrix", new Float32Array(railMatrices), 16, true);
      parapets.setEnabled(true);
    } else {
      parapets.thinInstanceSetBuffer("matrix", null);
      parapets.setEnabled(false);
    }
    bridges.dirty = false;
  }

  /** Flush after any map edit because adjacent civic/road cells affect bridge rails. */
  function flush(tiles: TileMap) {
    flushRoadBatch(pavedRoads, 0.0115, true);
    flushRoadBatch(dirtRibbons, 0.009, false);
    if (bridges.tiles.size > 0) bridges.dirty = true;
    flushBridges(tiles);
  }

  function dispose() {
    pavedRoads.mesh.dispose();
    dirtRibbons.mesh.dispose();
    bridges.mesh.dispose();
    parapets.dispose();
    parapetMaterial.dispose();
  }

  return { update, flush, dispose };
}
