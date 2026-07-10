"""Derive a colormap variant whose terracotta quoin/trim swatch is recolored to
the deep olive-green marble accent (verde di Prato — the Duomo's green banding).
Only the warm-terracotta band is remapped; cream/sandstone plaster is left
alone, so a wall-block textured with this variant keeps stone plaster but
olive-green corner quoins.

The religious wall material multiplies this texture by the "stone" diffuse
(#ddd8ca) — so the swatch is baked at target ÷ stone, landing on the intended
final color after that multiply. Target final ≈ #58634c.

Reads the already-retinted colormap (not the raw Kenney one). Writes both the
active and inactive (-desat) variants.

Usage: python3 scripts/make-mint-quoins.py \
    public/models/town/Textures/colormap.png \
    public/models/town/Textures/colormap-mint.png
"""
import colorsys
import sys
from PIL import Image, ImageEnhance

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
px = im.load()

# Pre-multiply olive so target #58634c survives the wall's ×stone(#ddd8ca):
# 0x58/0xdd, 0x63/0xd8, 0x4c/0xca → ~ (101, 117, 96).
TARGET = (101, 117, 96)
V_REF = 0.80  # ~brightness of the source terracotta, so shade variation carries
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        hue = h * 360
        # Terracotta quoins/trim: warm orange-red, well saturated. Cream plaster
        # (hue ~42, s ~0.17) sits outside this band, so it is untouched.
        if 5 <= hue <= 32 and s > 0.30:
            f = v / V_REF  # keep the light/dark quoin variation
            px[x, y] = (
                min(255, round(TARGET[0] * f)),
                min(255, round(TARGET[1] * f)),
                min(255, round(TARGET[2] * f)),
                a,
            )
            continue
        r2, g2, b2 = colorsys.hsv_to_rgb(h, s, v)
        px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)

im.save(dst)
print("wrote", dst)

# Inactive twin: same desaturation the retint script applies for -desat.
desat = ImageEnhance.Color(im).enhance(0.25)
desat = ImageEnhance.Brightness(desat).enhance(0.85)
desat_path = dst.replace(".png", "-desat.png")
desat.save(desat_path)
print("wrote", desat_path)
