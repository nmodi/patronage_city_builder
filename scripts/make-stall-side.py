"""Derive one-sided street-stall models from the kit's symmetric market stalls.

The kit stall (stall-red/green.glb) carries a symmetric gable awning — right
for the Market's back-to-back booth rows, wrong for the freestanding Market
Stall, where customers stand on one side (the street). This reshapes the
canopy into an asymmetric lean-to: the ridge slides toward the back (x=-0.26),
leaving a long shallow slope presenting to the +x front (the model's `front`)
and a short steep kick behind — the classic street-stall silhouette. The two
ridge poles translate with the ridge (staying on the table top); the table,
legs, rails, and eave tie-beams are untouched.

Pure vertex surgery on the GLB binary chunk: the canopy is one connected mesh
island, so vertices are selected by island (position-welded connectivity), the
x coordinates are piecewise-remapped, and flat normals are recomputed for the
moved faces. UVs are untouched — Kenney swatch-atlas UVs don't stretch.

Usage: python3 scripts/make-stall-side.py
Writes public/models/town/stall-side-red.glb and stall-side-green.glb.
"""
import json
import struct
from collections import defaultdict
from pathlib import Path

TOWN = Path(__file__).resolve().parent.parent / "public/models/town"
RIDGE_X = -0.26  # new ridge line; poles land on the table's back edge
CAP = 0.03  # half-width of the ridge cap strip in the source model


def remap_x(x: float) -> float:
    if x <= -CAP:  # rear slope: compress toward the back
        return -0.5 + (x + 0.5) * (RIDGE_X - CAP + 0.5) / (0.5 - CAP)
    if x >= CAP:  # front slope: stretch toward the street
        return 0.5 - (0.5 - x) * (0.5 - (RIDGE_X + CAP)) / (0.5 - CAP)
    return x + RIDGE_X  # ridge cap: translate whole


def load_glb(path: Path):
    data = path.read_bytes()
    jlen = struct.unpack("<I", data[12:16])[0]
    gltf = json.loads(data[20 : 20 + jlen])
    boff = 20 + jlen
    blen = struct.unpack("<I", data[boff : boff + 4])[0]
    return gltf, bytearray(data[boff + 8 : boff + 8 + blen])


def write_glb(path: Path, gltf, bin_: bytearray):
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    bin_ += b"\x00" * (-len(bin_) % 4)
    total = 12 + 8 + len(js) + 8 + len(bin_)
    out = struct.pack("<III", 0x46546C67, 2, total)
    out += struct.pack("<II", len(js), 0x4E4F534A) + js
    out += struct.pack("<II", len(bin_), 0x004E4942) + bytes(bin_)
    path.write_bytes(out)


def acc_range(gltf, idx):
    a = gltf["accessors"][idx]
    bv = gltf["bufferViews"][a["bufferView"]]
    return bv.get("byteOffset", 0) + a.get("byteOffset", 0), a


def make_side(src: str, dst: str):
    gltf, bin_ = load_glb(TOWN / src)
    prim = gltf["meshes"][0]["primitives"][0]
    p_off, p_acc = acc_range(gltf, prim["attributes"]["POSITION"])
    n_off, _ = acc_range(gltf, prim["attributes"]["NORMAL"])
    i_off, i_acc = acc_range(gltf, prim["indices"])
    n = p_acc["count"]
    pos = [list(struct.unpack_from("<fff", bin_, p_off + 12 * i)) for i in range(n)]
    ifmt, isize = {5123: ("<H", 2), 5125: ("<I", 4)}[i_acc["componentType"]]
    idx = [struct.unpack_from(ifmt, bin_, i_off + isize * i)[0] for i in range(i_acc["count"])]

    # mesh islands: weld by position, then union across triangles
    parent = list(range(n))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    by_pos = defaultdict(list)
    for i, p in enumerate(pos):
        by_pos[tuple(round(c, 4) for c in p)].append(i)
    for group in by_pos.values():
        for i in group[1:]:
            union(group[0], i)
    for t in range(0, len(idx), 3):
        union(idx[t], idx[t + 1])
        union(idx[t], idx[t + 2])
    comps = defaultdict(list)
    for i in range(n):
        comps[find(i)].append(i)

    moved: set[int] = set()
    for verts in comps.values():
        xs = [pos[i][0] for i in verts]
        ys = [pos[i][1] for i in verts]
        if len(verts) > 100 and min(ys) > 0.7:  # the canopy island
            for i in verts:
                pos[i][0] = remap_x(pos[i][0])
            moved.update(verts)
        elif max(ys) > 1.19 and max(xs) - min(xs) < 0.12:  # a ridge pole
            for i in verts:
                pos[i][0] += RIDGE_X
            moved.update(verts)
    assert len(moved) > 150, f"{src}: expected canopy + poles, moved {len(moved)}"

    # flat normals for the reshaped faces
    for t in range(0, len(idx), 3):
        tri = idx[t : t + 3]
        if not all(i in moved for i in tri):
            continue
        (ax, ay, az), (bx, by, bz), (cx, cy, cz) = (pos[i] for i in tri)
        ux, uy, uz = bx - ax, by - ay, bz - az
        vx, vy, vz = cx - ax, cy - ay, cz - az
        nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
        length = (nx * nx + ny * ny + nz * nz) ** 0.5 or 1.0
        for i in tri:
            struct.pack_into("<fff", bin_, n_off + 12 * i, nx / length, ny / length, nz / length)

    for i in range(n):
        struct.pack_into("<fff", bin_, p_off + 12 * i, *pos[i])
    p_acc["min"] = [min(p[c] for p in pos) for c in range(3)]
    p_acc["max"] = [max(p[c] for p in pos) for c in range(3)]
    gltf["nodes"][0]["name"] = dst.removesuffix(".glb")
    gltf["meshes"][0]["name"] = dst.removesuffix(".glb")
    write_glb(TOWN / dst, gltf, bin_)
    print("wrote", TOWN / dst)


make_side("stall-red.glb", "stall-side-red.glb")
make_side("stall-green.glb", "stall-side-green.glb")
