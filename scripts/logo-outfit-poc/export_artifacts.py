#!/usr/bin/env python3
"""
Authoritative export of POC review artifacts → /opt/cursor/artifacts/logo-outfit-poc/final/

Clears that directory first so stale wider masks cannot linger beside new outputs.
Writes SHA256SUMS + manifest.json tied to git HEAD.

Primary deliverables (not diagnostic overlays):
  - selection-map-annotated.png
  - comparison-before-3after.png
  - swatch-legend-fabric-to-palette.png
  - original + 3 sample palette full PNGs
  - tight ball / emblem / neutral clothing crops
"""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[2]
POC = Path(__file__).resolve().parent
EXPORT = Path("/opt/cursor/artifacts/logo-outfit-poc/final")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def git_head() -> str:
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=REPO, text=True
    ).strip()


def crop_zoom(im: Image.Image, box: tuple[int, int, int, int], size: int = 420) -> Image.Image:
    return im.crop(box).resize((size, size), Image.Resampling.NEAREST)


def main() -> None:
    if EXPORT.exists():
        shutil.rmtree(EXPORT)
    EXPORT.mkdir(parents=True)

    holdouts = json.loads((POC / "holdouts.json").read_text())
    palettes = json.loads((POC / "fixtures/palettes.json").read_text())
    report = json.loads((POC / "out/report.json").read_text())

    base = Image.open(REPO / "public/poke-mnky/avatars/red-blue.png").convert("RGBA")
    fixture_ids = [f["id"] for f in palettes["fixtures"]]
    outs = {
        fid: Image.open(POC / f"out/{fid}.png").convert("RGBA") for fid in fixture_ids
    }

    # --- Ball crop (intentional chroma remappart; white protected) ---
    bx = holdouts["ball"]
    cx, cy, rad = int(bx["cx"]), int(bx["cy"]), int(bx["rad"]) + int(bx.get("dilate_px", 0))
    pad = rad + 20
    ball_box = (cx - pad, cy - pad, cx + pad, cy + pad)

    def annotate_ball(c: Image.Image) -> Image.Image:
        d = ImageDraw.Draw(c)
        scale = 420 / (2 * pad)
        ox, oy = pad, pad
        r = rad * scale
        d.ellipse(
            ((ox) * scale - r, (oy) * scale - r, (ox) * scale + r, (oy) * scale + r),
            outline=(255, 255, 0),
            width=2,
        )
        return c

    annotate_ball(crop_zoom(base, ball_box)).save(EXPORT / "ball-crop-BEFORE.png")
    for fid, im in outs.items():
        annotate_ball(crop_zoom(im, ball_box)).save(EXPORT / f"ball-crop-AFTER-{fid}.png")

    # --- Emblem crops (must stay white) ---
    for sample in holdouts["bag_emblem_samples"]:
        x, y = int(sample["x"]), int(sample["y"])
        box = (x - 60, y - 60, x + 60, y + 60)
        label = sample["label"]
        crop_zoom(base, box, 240).save(EXPORT / f"emblem-BEFORE-{label}.png")
        for fid, im in outs.items():
            crop_zoom(im, box, 240).save(EXPORT / f"emblem-AFTER-{fid}-{label}.png")

    # --- Neutral clothing crop (black pants / white trim area) ---
    pants_box = (650, 1050, 950, 1350)
    crop_zoom(base, pants_box).save(EXPORT / "neutral-clothing-BEFORE.png")
    for fid, im in outs.items():
        crop_zoom(im, pants_box).save(EXPORT / f"neutral-clothing-AFTER-{fid}.png")

    # Cap white front panel (should stay white) + adjacent red fabric (may swap)
    cap_box = (620, 160, 980, 400)
    crop_zoom(base, cap_box).save(EXPORT / "cap-panel-BEFORE.png")
    for fid, im in outs.items():
        crop_zoom(im, cap_box).save(EXPORT / f"cap-panel-AFTER-{fid}.png")

    # --- Clean 1x4 before + 3 after (PRIMARY visual deliverable) ---
    thumb_h = 360
    panels = [("ORIGINAL", base)] + [
        (fid, outs[fid]) for fid in fixture_ids
    ]
    strip = Image.new("RGBA", (thumb_h * 4 + 40, thumb_h + 56), (36, 36, 40, 255))
    d = ImageDraw.Draw(strip)
    d.text(
        (10, 8),
        "POKE MNKY outfit palette-swap POC — EXAMPLE palettes (partial artwork). "
        "Ball chroma MAY remappart (t25u). B/W/neutrals/identity preserved.",
        fill=(235, 235, 240),
    )
    for i, (label, im) in enumerate(panels):
        t = im.convert("RGBA").resize((thumb_h, thumb_h), Image.Resampling.LANCZOS)
        strip.paste(t, (10 + i * (thumb_h + 8), 40), t)
    strip.save(EXPORT / "comparison-before-3after.png")

    # --- Swatch legend: original RED/BLUE FABRIC → each sample target palette ---
    # Sample mean fabric colors from masks on base (not logos).
    arr = np.array(base)
    pm = np.array(Image.open(POC / "masks/primary-mask.png").convert("L")) > 127
    sm = np.array(Image.open(POC / "masks/secondary-mask.png").convert("L")) > 127
    # Exclude ball region from "outfit fabric" swatch means for clarity; ball noted separately
    yy, xx = np.mgrid[0:1600, 0:1600]
    ball = (xx - cx) ** 2 + (yy - cy) ** 2 <= rad**2
    fabric_p = pm & ~ball
    fabric_s = sm & ~ball
    ball_p = pm & ball

    def mean_rgb(mask: np.ndarray) -> tuple[int, int, int]:
        if mask.sum() == 0:
            return (128, 128, 128)
        return (
            int(arr[mask, 0].mean()),
            int(arr[mask, 1].mean()),
            int(arr[mask, 2].mean()),
        )

    src_red = mean_rgb(fabric_p)
    src_blue = mean_rgb(fabric_s)
    src_ball = mean_rgb(ball_p)

    # Resolved fixture colors from report
    resolved = {
        f["id"]: (
            tuple(f["resolved"]["primary"]),
            tuple(f["resolved"]["secondary"]),
        )
        for f in report["fixtures"]
    }

    legend = Image.new("RGBA", (1100, 520), (28, 28, 32, 255))
    ld = ImageDraw.Draw(legend)
    ld.text((24, 16), "FABRIC swatch legend (source clothing → target kit) — NOT source logos", fill=(240, 240, 244))
    ld.text((24, 40), "EXAMPLE sample palettes only. Partial POC selection.", fill=(170, 170, 176))

    def swatch(x: int, y: int, color: tuple[int, int, int], label: str) -> None:
        ld.rectangle((x, y, x + 52, y + 52), fill=color + (255,), outline=(80, 80, 86))
        ld.text((x + 60, y + 16), label, fill=(220, 220, 226))

    swatch(24, 80, src_red, f"original RED fabric mean RGB{src_red}")
    swatch(24, 150, src_blue, f"original BLUE fabric mean RGB{src_blue}")
    swatch(24, 220, src_ball, f"original BALL chroma (eligible) mean RGB{src_ball}")

    row = 300
    for fid in fixture_ids:
        prim, sec = resolved[fid]
        ld.text((24, row), fid, fill=(200, 200, 210))
        swatch(280, row - 8, prim, f"→ primary {prim}")
        swatch(620, row - 8, sec, f"→ secondary {sec}")
        row += 70

    ld.text(
        (24, 480),
        "Red fabric + ball chroma → primary; blue fabric → secondary. B/W/neutrals/emblems unchanged.",
        fill=(160, 160, 168),
    )
    legend.save(EXPORT / "swatch-legend-fabric-to-palette.png")

    # --- Copy core files ---
    files = [
        (REPO / "public/poke-mnky/avatars/red-blue.png", "base-red-blue.png"),
        (POC / "masks/primary-mask.png", "primary-mask.png"),
        (POC / "masks/secondary-mask.png", "secondary-mask.png"),
        (POC / "masks/union-mask.png", "union-mask.png"),
        (POC / "masks/selection-map.png", "selection-map.png"),
        (POC / "masks/selection-map-legend.png", "selection-map-legend.png"),
        (POC / "masks/selection-map-annotated.png", "selection-map-annotated.png"),
        (POC / "masks/mask-overlay.png", "mask-overlay-DIAGNOSTIC-only.png"),
        (POC / "masks/exclusion-overlay.png", "exclusion-overlay-DIAGNOSTIC-only.png"),
        (POC / "holdouts.json", "holdouts.json"),
        (POC / "out/contact-sheet.png", "contact-sheet.png"),
        (POC / "out/report.json", "report.json"),
        (POC / "fixtures/palettes.json", "palettes.json"),
        (POC / "MASK-NOTES.md", "MASK-NOTES.md"),
        (POC / "README.md", "README.md"),
    ]
    for fid in fixture_ids:
        files.append((POC / f"out/{fid}.png", f"{fid}.png"))
        files.append((POC / f"out/{fid}-mobile-light.png", f"{fid}-mobile-light.png"))
        files.append((POC / f"out/{fid}-mobile-dark.png", f"{fid}-mobile-dark.png"))
        files.append((POC / f"fixtures/logos/{fid.replace('contrast-green-purple','example-contrast').replace('mono-grayscale','example-mono').replace('bw-gold-override','example-bw-accent')}.png", f"logo-{fid}.png"))

    # Fix logo paths properly
    logo_map = {
        "contrast-green-purple": "example-contrast.png",
        "mono-grayscale": "example-mono.png",
        "bw-gold-override": "example-bw-accent.png",
    }
    files = [f for f in files if not f[1].startswith("logo-")]
    for fid, logo_name in logo_map.items():
        files.append((POC / "fixtures/logos" / logo_name, f"logo-{logo_name}"))

    copied: list[Path] = []
    for src, dst_name in files:
        if not src.is_file():
            print(f"WARN missing {src}")
            continue
        dst = EXPORT / dst_name
        shutil.copy2(src, dst)
        copied.append(dst)

    # Include generated comparison assets already written to EXPORT
    for p in EXPORT.glob("*.png"):
        copied.append(p)

    unique = sorted({p.resolve() for p in copied if p.is_file()})
    lines = []
    entries = []
    for p in unique:
        digest = sha256(p)
        rel = p.name
        lines.append(f"{digest}  {rel}")
        entries.append({"file": rel, "sha256": digest, "bytes": p.stat().st_size})

    (EXPORT / "SHA256SUMS").write_text("\n".join(lines) + "\n")
    head = git_head()
    union = np.array(Image.open(POC / "masks/union-mask.png").convert("L"))
    union_px = int((union > 127).sum())
    ball_in_primary = int((pm & ball).sum())

    primary_files = [
        "comparison-before-3after.png",
        "selection-map-annotated.png",
        "swatch-legend-fabric-to-palette.png",
        "base-red-blue.png",
        *[f"{fid}.png" for fid in fixture_ids],
        "ball-crop-BEFORE.png",
        *[f"ball-crop-AFTER-{fid}.png" for fid in fixture_ids],
        "SHA256SUMS",
        "manifest.json",
        "report.json",
        "holdouts.json",
        "MASK-NOTES.md",
    ]

    manifest = {
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "gitHead": head,
        "unionMaskPixels": union_px,
        "ballChromaticInPrimaryMask": ball_in_primary,
        "jevExercised": False,
        "policy": holdouts.get("policy"),
        "authoritativeDir": str(EXPORT),
        "note": (
            "t24u+t25u: source-color fabric palette-swap; B/W/neutrals/identity protected; "
            "Poké Ball chromatic top MAY remappart of primary (intentional). "
            "Trust ONLY final/ + SHA256SUMS. Diagnostic overlays are labeled *-DIAGNOSTIC-only."
        ),
        "primaryDeliverables": primary_files,
        "files": entries,
    }
    (EXPORT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    # Re-hash manifest into SHA256SUMS
    lines.append(f"{sha256(EXPORT / 'manifest.json')}  manifest.json")
    # rewrite with unique
    all_files = sorted(EXPORT.iterdir())
    lines = []
    entries = []
    for p in all_files:
        if not p.is_file() or p.name == "SHA256SUMS":
            continue
        digest = sha256(p)
        lines.append(f"{digest}  {p.name}")
        entries.append({"file": p.name, "sha256": digest, "bytes": p.stat().st_size})
    (EXPORT / "SHA256SUMS").write_text("\n".join(lines) + "\n")
    manifest["files"] = entries
    (EXPORT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    print(f"exported {len(entries)} files to {EXPORT}")
    print(f"gitHead={head} unionMaskPixels={union_px} ballChromaticInPrimary={ball_in_primary}")
    print("PRIMARY:")
    for name in primary_files:
        print(f"  {EXPORT / name}")


if __name__ == "__main__":
    main()
