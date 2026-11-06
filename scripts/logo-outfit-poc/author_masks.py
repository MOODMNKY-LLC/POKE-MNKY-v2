#!/usr/bin/env python3
"""
Author conservative primary/secondary clothing masks for red-blue.png.

These are NOT production semantic layers. They combine:
  - hue/chroma seeds for red (primary) and blue (secondary) clothing fills
  - explicit exclusion of face/skin, eyes, pokéball, deep linework-only edges
  - light morphological cleanup

Honest partial coverage: black pants, white logos/trim, bag-strap leather tones,
and deep jacket shadows near black fur remain mostly UNMASKED. See MASK-NOTES.md.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "public/poke-mnky/avatars/red-blue.png"
OUT = Path(__file__).resolve().parent / "masks"


def luminance(r: np.ndarray, g: np.ndarray, b: np.ndarray) -> np.ndarray:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    im = Image.open(BASE).convert("RGBA")
    assert im.size == (1600, 1600), im.size
    a = np.array(im).astype(np.float32)
    r, g, b, alpha = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]
    opaque = alpha > 200
    y = luminance(r, g, b)

    # --- Hue seeds (clothing fills). Conservative chroma floors. ---
    primary_seed = (
        opaque
        & (r > 120)
        & (r > g + 35)
        & (r > b + 35)
        & (g < 140)
        & (b < 140)
        & (y > 35)  # keep mid shadows; drop near-black line cores
        & (y < 245)  # leave near-white logos/trim out of primary
    )
    secondary_seed = (
        opaque
        & (b > 90)
        & (b > r + 25)
        & (b > g + 5)
        & (r < 130)
        & (g < 160)
        & (y > 30)
        & (y < 245)
    )

    # --- Explicit exclusion regions (1600 coords), authored by visual inspection ---
    # Face / muzzle (preserve skin) — generous to protect cheeks/chin edge
    face = Image.new("L", (1600, 1600), 0)
    fd = ImageDraw.Draw(face)
    fd.ellipse((600, 290, 1000, 740), fill=255)
    face_m = np.array(face) > 0

    # Inner ears (peach) — larger holdouts; cap brim red near ears stays via seed outside these ellipses
    ears = Image.new("L", (1600, 1600), 0)
    edraw = ImageDraw.Draw(ears)
    edraw.ellipse((500, 250, 720, 520), fill=255)  # left ear
    edraw.ellipse((880, 250, 1100, 520), fill=255)  # right ear
    ears_m = np.array(ears) > 0

    # Eyes (red irises would otherwise hit primary seed)
    eyes = Image.new("L", (1600, 1600), 0)
    ed = ImageDraw.Draw(eyes)
    ed.ellipse((655, 400, 760, 505), fill=255)
    ed.ellipse((840, 400, 945, 505), fill=255)
    eyes_m = np.array(eyes) > 0

    # Pokéball prop — preserve classic red/white (NOT team kit).
    # Circle fitted by visual inspection of hand crop; prioritizes full ball
    # holdout over a thin strip of wrist-cuff red near the ball (~partial cuff).
    ball = Image.new("L", (1600, 1600), 0)
    bd = ImageDraw.Draw(ball)
    cx, cy, rad = 388, 898, 150
    bd.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), fill=255)
    ball_m = np.array(ball) > 0

    # Hands / fingers overlapping ball (skin) — slightly below ball center
    hands = Image.new("L", (1600, 1600), 0)
    hd = ImageDraw.Draw(hands)
    hd.ellipse((330, 980, 530, 1185), fill=255)
    hands_m = np.array(hands) > 0

    # Soft hair/forehead band near cap brim — reduce fur false positives
    hair = Image.new("L", (1600, 1600), 0)
    hd2 = ImageDraw.Draw(hair)
    hd2.ellipse((640, 240, 960, 380), fill=255)
    hd2.ellipse((560, 180, 1040, 340), fill=255)  # upper hair mass
    hair_m = np.array(hair) > 0

    # Neck / chest fur between open jacket panels (common bleed site)
    neck = Image.new("L", (1600, 1600), 0)
    ImageDraw.Draw(neck).ellipse((700, 620, 920, 860), fill=255)
    neck_m = np.array(neck) > 0

    exclude = face_m | ears_m | eyes_m | ball_m | hands_m | hair_m | neck_m

    primary = primary_seed & ~exclude & ~secondary_seed
    secondary = secondary_seed & ~exclude & ~primary

    # Close pinholes then net-erode 1px so MaxFilter does not bleed into fur/skin edges.
    def morph(mask: np.ndarray) -> np.ndarray:
        img = Image.fromarray((mask.astype(np.uint8) * 255), mode="L")
        img = img.filter(ImageFilter.MaxFilter(3))
        img = img.filter(ImageFilter.MinFilter(3))
        img = img.filter(ImageFilter.MinFilter(3))  # extra erode — pull off identity edges
        out = np.array(img) > 127
        return out & opaque & ~exclude

    primary = morph(primary)
    secondary = morph(secondary) & ~primary

    # Drop residual skin-like pixels (tan / peach) that survived seeds+morph
    skinish = (
        opaque
        & (r > 165)
        & (g > 110)
        & (b > 85)
        & (b < 210)
        & (r - b < 100)
        & (g > b - 10)  # peach: G not far below B the way pure red clothing is
    )
    primary &= ~skinish
    secondary &= ~skinish

    # Drop near-black low-chroma pixels (fur / line cores / ambient dark).
    # Keep dark clothing only when still clearly red- or blue-chromatic.
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    fur_or_line = opaque & (y < 55) & (chroma < 32)
    strong_cloth_dark = opaque & (y < 55) & (
        ((r > g + 25) & (r > b + 25) & (chroma >= 32))
        | ((b > r + 20) & (b > g) & (chroma >= 32))
    )
    drop_dark = fur_or_line & ~strong_cloth_dark
    primary &= ~drop_dark
    secondary &= ~drop_dark

    # Final peel where mask touches excluded identity (face/ears/ball/hands/hair/neck)
    excl_img = Image.fromarray((exclude.astype(np.uint8) * 255), mode="L")
    excl_dilated = np.array(excl_img.filter(ImageFilter.MaxFilter(5))) > 127
    primary &= ~excl_dilated
    secondary &= ~excl_dilated

    def save_mask(mask: np.ndarray, name: str) -> None:
        Image.fromarray((mask.astype(np.uint8) * 255), mode="L").save(OUT / name)

    save_mask(primary, "primary-mask.png")
    save_mask(secondary, "secondary-mask.png")
    save_mask(primary | secondary, "union-mask.png")

    # Overlay visualization (magenta=primary, cyan=secondary) on base
    vis = a.copy().astype(np.uint8)
    vis[primary, 0] = (0.35 * vis[primary, 0] + 0.65 * 255).astype(np.uint8)
    vis[primary, 1] = (0.35 * vis[primary, 1] + 0.65 * 0).astype(np.uint8)
    vis[primary, 2] = (0.35 * vis[primary, 2] + 0.65 * 200).astype(np.uint8)
    vis[secondary, 0] = (0.35 * vis[secondary, 0] + 0.65 * 0).astype(np.uint8)
    vis[secondary, 1] = (0.35 * vis[secondary, 1] + 0.65 * 220).astype(np.uint8)
    vis[secondary, 2] = (0.35 * vis[secondary, 2] + 0.65 * 255).astype(np.uint8)
    Image.fromarray(vis, "RGBA").save(OUT / "mask-overlay.png")

    # Exclusion overlay for docs
    ex = a.copy().astype(np.uint8)
    ex[exclude, 1] = (0.4 * ex[exclude, 1] + 0.6 * 255).astype(np.uint8)
    Image.fromarray(ex, "RGBA").save(OUT / "exclusion-overlay.png")

    op = int(opaque.sum())
    print(f"base={BASE}")
    print(f"primary_px={int(primary.sum())} ({100*primary.sum()/op:.2f}% opaque)")
    print(f"secondary_px={int(secondary.sum())} ({100*secondary.sum()/op:.2f}% opaque)")
    print(f"union_px={int((primary|secondary).sum())} ({100*(primary|secondary).sum()/op:.2f}% opaque)")
    print(f"wrote masks to {OUT}")


if __name__ == "__main__":
    main()
