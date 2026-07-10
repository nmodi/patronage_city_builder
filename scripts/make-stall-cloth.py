"""Derive colormap variants that recolor market-stall awnings to real fabric
colors instead of the terracotta the retint left them (retint-colormap.py maps
red fabric and red roofs to the *same* terracotta hue, so awnings read as
rooftops). Only the two awning swatch columns are touched — the shared wood-post
swatch (x~304) and every roof/wall swatch are left alone — and these variants
are applied ONLY to the stall parts (see TEXTURE_TINTS in assetLibrary.ts), so
no other building is affected.

stall-red.glb samples the RED awning column (x~48); stall-green.glb samples the
GREEN awning column (x~112). One variant therefore yields two fabric colors (one
per stall model); two variants give four fabrics across the market's booths.

Reads the already-retinted colormap. Writes each variant's active + -desat twin.

Usage: python3 scripts/make-stall-cloth.py public/models/town/Textures/colormap.png
"""
import colorsys
import sys
from PIL import Image, ImageEnhance

src = sys.argv[1]

# awning swatch boxes in the atlas (x range, y range), from sampling stall UVs
RED_COL = (32, 72)
GREEN_COL = (96, 136)
Y_BAND = (376, 512)
V_REF = 0.90  # ~brightness of the source awning texels; keeps fold shading

# (stem, red-awning fabric, green-awning fabric)
VARIANTS = [
    ("colormap-cloth1", (47, 95, 143), (217, 154, 43)),   # blue / gold
    ("colormap-cloth2", (168, 50, 70), (79, 122, 68)),    # crimson / green
]


def paint(im, box, target):
    px = im.load()
    x0, x1 = box
    y0, y1 = Y_BAND
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b, a = px[x, y]
            _, _, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            f = v / V_REF  # carry the awning's light/dark shading onto the fabric
            px[x, y] = (
                min(255, round(target[0] * f)),
                min(255, round(target[1] * f)),
                min(255, round(target[2] * f)),
                a,
            )


for stem, red_fabric, green_fabric in VARIANTS:
    im = Image.open(src).convert("RGBA")
    paint(im, RED_COL, red_fabric)
    paint(im, GREEN_COL, green_fabric)
    dst = src.replace("colormap.png", f"{stem}.png")
    im.save(dst)
    print("wrote", dst)
    # Inactive twin: same desaturation the retint applies for -desat.
    desat = ImageEnhance.Color(im).enhance(0.25)
    desat = ImageEnhance.Brightness(desat).enhance(0.85)
    desat_path = dst.replace(".png", "-desat.png")
    desat.save(desat_path)
    print("wrote", desat_path)
