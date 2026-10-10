#!/usr/bin/env python3
"""Create web-sized WebP copies of the preserved source images.

The originals in assets/img/archive/ are never modified: they remain the
record of what the old sites published. This tool writes resized copies to
assets/img/web/ and records real pixel dimensions in
content/image-manifest.json, which the site build reads so that every <img>
gets correct width/height attributes and is never upscaled.

Usage (maintenance task, not part of `npm run check`):
    python3 scripts/tools/optimize_images.py

Requires Pillow (`pip install pillow`). Re-running is idempotent.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "content" / "source-assets.json"
MANIFEST = ROOT / "content" / "image-manifest.json"
OUTPUT = ROOT / "assets" / "img" / "web"

FULL_WIDTH = 1400   # widest article column on a 2x screen
THUMB_WIDTH = 520   # library cards
QUALITY = 80


def save_webp(image: Image.Image, target: Path, max_width: int) -> tuple[int, int]:
    copy = image.copy()
    if copy.width > max_width:
        height = round(copy.height * max_width / copy.width)
        copy = copy.resize((max_width, height), Image.LANCZOS)
    copy.save(target, "WEBP", quality=QUALITY, method=6)
    return copy.width, copy.height


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    assets = json.loads(ASSETS.read_text(encoding="utf-8"))
    manifest: dict[str, dict] = {}
    for asset in assets:
        local = asset.get("local")
        if not local or local in manifest:
            continue
        source = ROOT / local
        if source.suffix.lower() == ".svg":
            continue  # vector icons of the old site builder; not shown in articles
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened)
            image = image.convert("RGBA" if "A" in image.getbands() or image.mode == "P" else "RGB")
            stem = source.stem
            full = OUTPUT / f"{stem}.webp"
            thumb = OUTPUT / f"{stem}-thumb.webp"
            width, height = save_webp(image, full, FULL_WIDTH)
            thumb_width, thumb_height = save_webp(image, thumb, THUMB_WIDTH)
            manifest[local] = {
                "originalWidth": image.width,
                "originalHeight": image.height,
                "web": full.relative_to(ROOT).as_posix(),
                "width": width,
                "height": height,
                "thumb": thumb.relative_to(ROOT).as_posix(),
                "thumbWidth": thumb_width,
                "thumbHeight": thumb_height,
            }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total = sum(path.stat().st_size for path in OUTPUT.glob("*.webp"))
    print(f"{len(manifest)} images, {total / 1_000_000:.1f} MB in {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
