#!/usr/bin/env python3
"""Create synthetic EXAMPLE team logos for the offline outfit POC (not Matt's assets)."""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent / "fixtures" / "logos"


def save(name: str, im: Image.Image) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    im.save(path)
    print("wrote", path)


def contrast_logo() -> None:
    """High-chroma green / purple mark — EXAMPLE DATA."""
    im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((16, 16, 240, 240), fill=(34, 197, 94, 255))  # green primary
    d.polygon([(128, 40), (210, 200), (46, 200)], fill=(124, 58, 237, 255))  # purple
    d.ellipse((96, 96, 160, 160), fill=(250, 250, 250, 255))
    save("example-contrast.png", im)


def mono_logo() -> None:
    """Near-monochrome gray mark — EXAMPLE DATA."""
    im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle((24, 24, 232, 232), fill=(48, 48, 48, 255))
    d.rectangle((64, 64, 192, 192), fill=(180, 180, 180, 255))
    d.ellipse((96, 96, 160, 160), fill=(24, 24, 24, 255))
    save("example-mono.png", im)


def bw_accent_logo() -> None:
    """Black / white with gold accent — EXAMPLE DATA; keeps B/W roles meaningful."""
    im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((12, 12, 244, 244), fill=(12, 12, 12, 255))
    d.ellipse((48, 48, 208, 208), fill=(245, 245, 245, 255))
    d.rectangle((110, 40, 146, 216), fill=(212, 175, 55, 255))  # gold accent bar
    d.ellipse((108, 108, 148, 148), fill=(12, 12, 12, 255))
    save("example-bw-accent.png", im)


if __name__ == "__main__":
    contrast_logo()
    mono_logo()
    bw_accent_logo()
