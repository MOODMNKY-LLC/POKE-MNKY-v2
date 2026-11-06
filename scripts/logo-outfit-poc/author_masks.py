#!/usr/bin/env python3
"""
Author source-color-aware primary/secondary fabric masks for red-blue.png.

POC interpretation (t24u + t25u):
  - Swap only plain chromatic RED / BLUE fabric (cap/vest panels, coordinated
    outfit fills) AND optionally the Poké Ball's chromatic top (system palette
    switch already recolors the ball — intentional, not a regression).
  - Protect black/white/neutral clothing + highlights/shadows, fur/face/eyes/
    hands/skin, line art, emblem/logo whites, and the ball's white/black/seam/
    highlight pixels.
  - Do NOT recolor a protected graphic just because its RGB matches fabric.

These are NOT production semantic layers. See MASK-NOTES.md for honesty notes.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "public/poke-mnky/avatars/red-blue.png"
OUT = Path(__file__).resolve().parent / "masks"
HOLDOUTS = Path(__file__).resolve().parent / "holdouts.json"


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
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)

    # --- Monochrome / neutral protection (hard — never eligible) ---
    near_white = opaque & (y >= 210) & (chroma < 55)
    near_black_neutral = opaque & (y <= 48) & (chroma < 38)
    low_chroma = opaque & (chroma < 28) & (y > 48) & (y < 210)
    monochrome_protect = near_white | near_black_neutral | low_chroma

    # --- Hue seeds: plain red / blue fabric (+ chromatic ball top via same red seed) ---
    # Raise chroma floors so muted bounce/rim light and near-neutral panels stay out.
    primary_seed = (
        opaque
        & ~monochrome_protect
        & (r > 115)
        & (r > g + 40)
        & (r > b + 40)
        & (g < 145)
        & (b < 145)
        & (chroma >= 45)
        & (y > 38)
        & (y < 235)
    )
    secondary_seed = (
        opaque
        & ~monochrome_protect
        & (b > 95)
        & (b > r + 28)
        & (b > g + 8)
        & (r < 125)
        & (g < 155)
        & (chroma >= 40)
        & (y > 32)
        & (y < 235)
    )

    # --- Identity / prop region holdouts (NOT the ball chromatic top — t25u) ---
    face = Image.new("L", (1600, 1600), 0)
    ImageDraw.Draw(face).ellipse((600, 290, 1000, 740), fill=255)
    face_m = np.array(face) > 0

    ears = Image.new("L", (1600, 1600), 0)
    edraw = ImageDraw.Draw(ears)
    edraw.ellipse((500, 250, 720, 520), fill=255)
    edraw.ellipse((880, 250, 1100, 520), fill=255)
    ears_m = np.array(ears) > 0

    eyes = Image.new("L", (1600, 1600), 0)
    ed = ImageDraw.Draw(eyes)
    ed.ellipse((655, 400, 760, 505), fill=255)
    ed.ellipse((840, 400, 945, 505), fill=255)
    eyes_m = np.array(eyes) > 0

    holdouts = json.loads(HOLDOUTS.read_text())
    # Hands only — ball geometry is used for docs/tests, not to block chroma swap
    hx = holdouts["hand_near_ball"]
    hands = Image.new("L", (1600, 1600), 0)
    ImageDraw.Draw(hands).ellipse(
        (
            int(hx["cx"]) - int(hx["rad"]),
            int(hx["cy"]) - int(hx["rad"]),
            int(hx["cx"]) + int(hx["rad"]),
            int(hx["cy"]) + int(hx["rad"]),
        ),
        fill=255,
    )
    hands_m = np.array(hands) > 0

    hair = Image.new("L", (1600, 1600), 0)
    hd2 = ImageDraw.Draw(hair)
    hd2.ellipse((640, 240, 960, 380), fill=255)
    hd2.ellipse((560, 180, 1040, 340), fill=255)
    hair_m = np.array(hair) > 0

    neck = Image.new("L", (1600, 1600), 0)
    ImageDraw.Draw(neck).ellipse((700, 620, 920, 860), fill=255)
    neck_m = np.array(neck) > 0

    # Emblem discs (white logos on chest / bag / cap) — protect disk + small halo
    # so fabric morph cannot eat into branded graphics even if chroma leaks at edges.
    emblem_m = np.zeros((1600, 1600), dtype=bool)
    for em in holdouts.get("emblem_discs", []):
        emi = Image.new("L", (1600, 1600), 0)
        ImageDraw.Draw(emi).ellipse(
            (
                int(em["cx"]) - int(em["rad"]),
                int(em["cy"]) - int(em["rad"]),
                int(em["cx"]) + int(em["rad"]),
                int(em["cy"]) + int(em["rad"]),
            ),
            fill=255,
        )
        dil = int(em.get("dilate_px", 2))
        arr = (
            np.array(emi.filter(ImageFilter.MaxFilter(dil * 2 + 1))) > 127
            if dil > 0
            else np.array(emi) > 0
        )
        emblem_m |= arr

    identity_exclude = face_m | ears_m | eyes_m | hands_m | hair_m | neck_m | emblem_m

    primary = primary_seed & ~identity_exclude & ~secondary_seed
    secondary = secondary_seed & ~identity_exclude & ~primary

    # Close pinholes then net-erode so MaxFilter does not bleed into fur/skin/emblems.
    def morph(mask: np.ndarray) -> np.ndarray:
        img = Image.fromarray((mask.astype(np.uint8) * 255), mode="L")
        img = img.filter(ImageFilter.MaxFilter(3))
        img = img.filter(ImageFilter.MinFilter(3))
        img = img.filter(ImageFilter.MinFilter(3))
        out = np.array(img) > 127
        return out & opaque & ~identity_exclude & ~monochrome_protect

    primary = morph(primary)
    secondary = morph(secondary) & ~primary

    # Drop residual skin-like pixels (tan / peach)
    skinish = (
        opaque
        & (r > 165)
        & (g > 110)
        & (b > 85)
        & (b < 210)
        & (r - b < 100)
        & (g > b - 10)
    )
    primary &= ~skinish
    secondary &= ~skinish

    # Re-assert monochrome protection after morph
    primary &= ~monochrome_protect
    secondary &= ~monochrome_protect

    # Peel mask off dilated identity holdouts
    excl_img = Image.fromarray((identity_exclude.astype(np.uint8) * 255), mode="L")
    excl_dilated = np.array(excl_img.filter(ImageFilter.MaxFilter(5))) > 127
    primary &= ~excl_dilated
    secondary &= ~excl_dilated

    # Final chroma gate — morph must not reintroduce low-chroma / neutral pixels
    primary &= chroma >= 40
    secondary &= chroma >= 35

    def save_mask(mask: np.ndarray, name: str) -> None:
        Image.fromarray((mask.astype(np.uint8) * 255), mode="L").save(OUT / name)

    save_mask(primary, "primary-mask.png")
    save_mask(secondary, "secondary-mask.png")
    save_mask(primary | secondary, "union-mask.png")

    # Overlay visualization (magenta=primary, cyan=secondary) on base — diagnostic
    vis = a.copy().astype(np.uint8)
    vis[primary, 0] = (0.35 * vis[primary, 0] + 0.65 * 255).astype(np.uint8)
    vis[primary, 1] = (0.35 * vis[primary, 1] + 0.65 * 0).astype(np.uint8)
    vis[primary, 2] = (0.35 * vis[primary, 2] + 0.65 * 200).astype(np.uint8)
    vis[secondary, 0] = (0.35 * vis[secondary, 0] + 0.65 * 0).astype(np.uint8)
    vis[secondary, 1] = (0.35 * vis[secondary, 1] + 0.65 * 220).astype(np.uint8)
    vis[secondary, 2] = (0.35 * vis[secondary, 2] + 0.65 * 255).astype(np.uint8)
    Image.fromarray(vis, "RGBA").save(OUT / "mask-overlay.png")

    # Exclusion overlay (identity + monochrome protect) for docs
    ex = a.copy().astype(np.uint8)
    protect_viz = identity_exclude | monochrome_protect
    ex[protect_viz, 1] = (0.4 * ex[protect_viz, 1] + 0.6 * 255).astype(np.uint8)
    Image.fromarray(ex, "RGBA").save(OUT / "exclusion-overlay.png")

    # --- Annotated selection map (deliverable): eligible fabric vs protected ---
    # Legend: red-tint = primary fabric eligible; blue-tint = secondary eligible;
    #         amber = protected identity; gray wash = monochrome/neutral protect;
    #         unmodified = not selected (props/uncertain left alone).
    sel = a.copy().astype(np.uint8)
    # Dim everything slightly so annotations read
    sel = (sel.astype(np.float32) * 0.55).astype(np.uint8)
    sel[:, :, 3] = a[:, :, 3].astype(np.uint8)

    def paint(mask: np.ndarray, rgb: tuple[int, int, int], strength: float = 0.72) -> None:
        for c, v in enumerate(rgb):
            sel[mask, c] = (
                (1 - strength) * sel[mask, c].astype(np.float32) + strength * v
            ).astype(np.uint8)

    paint(monochrome_protect & ~identity_exclude, (160, 160, 168), 0.55)
    paint(identity_exclude, (220, 160, 40), 0.65)
    paint(primary, (255, 40, 80), 0.75)
    paint(secondary, (40, 140, 255), 0.75)
    Image.fromarray(sel, "RGBA").save(OUT / "selection-map.png")

    # Tiny legend strip composited into a companion label image
    legend = Image.new("RGBA", (1600, 120), (28, 28, 32, 255))
    ld = ImageDraw.Draw(legend)
    swatches = [
        ((255, 40, 80), "eligible RED fabric (+ ball chroma)"),
        ((40, 140, 255), "eligible BLUE fabric"),
        ((220, 160, 40), "protected identity (face/eyes/hands/emblems)"),
        ((160, 160, 168), "protected B/W / neutral / line"),
    ]
    x = 24
    for color, label in swatches:
        ld.rectangle((x, 30, x + 36, 66), fill=color + (255,))
        ld.text((x + 44, 36), label, fill=(230, 230, 234))
        x += 380
    ld.text(
        (24, 84),
        "PARTIAL selection — not production mattes. Sample POC only.",
        fill=(180, 180, 186),
    )
    legend.save(OUT / "selection-map-legend.png")

    # Stacked map + legend for review
    stacked = Image.new("RGBA", (1600, 1720), (20, 20, 24, 255))
    stacked.paste(Image.fromarray(sel, "RGBA"), (0, 0))
    stacked.paste(legend, (0, 1600))
    stacked.save(OUT / "selection-map-annotated.png")

    op = int(opaque.sum())
    bx = holdouts["ball"]
    yy, xx = np.mgrid[0:1600, 0:1600]
    ball = (xx - int(bx["cx"])) ** 2 + (yy - int(bx["cy"])) ** 2 <= (
        int(bx["rad"]) + int(bx.get("dilate_px", 0))
    ) ** 2
    ball_primary = int((primary & ball).sum())
    ball_white_protected = int((near_white & ball).sum())

    print(f"base={BASE}")
    print(f"primary_px={int(primary.sum())} ({100 * primary.sum() / op:.2f}% opaque)")
    print(f"secondary_px={int(secondary.sum())} ({100 * secondary.sum() / op:.2f}% opaque)")
    print(
        f"union_px={int((primary | secondary).sum())} "
        f"({100 * (primary | secondary).sum() / op:.2f}% opaque)"
    )
    print(f"monochrome_protect_px={int(monochrome_protect.sum())}")
    print(f"ball_primary_chroma_px={ball_primary} (intentional t25u)")
    print(f"ball_near_white_protected_px={ball_white_protected}")
    print(f"wrote masks + selection map to {OUT}")


if __name__ == "__main__":
    main()
