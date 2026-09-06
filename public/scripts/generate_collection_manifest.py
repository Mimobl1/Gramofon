#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COLLECTION_DIR = ROOT / "Vinyl Collection"
MANIFEST_PATH = ROOT / "vinyl-collection.json"

AUDIO_EXTS = {".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
PALETTE = [
    "#2a2f3a",
    "#2f2a3a",
    "#2a3a35",
    "#3a2f2a",
    "#2a333a",
    "#3a2a33",
    "#33362a",
    "#2a2a2f",
]


def pick_color(seed: str) -> str:
    h = 0
    for ch in seed:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return PALETTE[h % len(PALETTE)]


def normalize_album_name(name: str) -> str:
    s = re.sub(r"\[[^\]]*\]", " ", name)
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"\s{2,}", " ", s).strip()
    return s


def split_artist_album(folder_name: str, tracks: list = None):
    raw = normalize_album_name(folder_name)
    if " - " in raw:
        a, b = raw.split(" - ", 1)
        return a.strip().upper(), b.strip().upper()
    if tracks:
        for t in tracks:
            clean_t = Path(t).stem
            if " - " in clean_t:
                art = clean_t.split(" - ", 1)[0].strip()
                if art:
                    return art.upper(), raw.upper()
    return "UNKNOWN ARTIST", (raw.upper() or "UNKNOWN ALBUM")


def main():
    albums = []
    if not COLLECTION_DIR.exists():
        print("Collection folder missing.")
        return

    folders = []
    for p in COLLECTION_DIR.iterdir():
        if p.is_dir():
            folders.append(p)
    folders.sort(key=lambda p: p.stat().st_mtime, reverse=True)

    for folder in folders:
        files = [p for p in folder.iterdir() if p.is_file()]
        tracks = sorted(
            [p.name for p in files if p.suffix.lower() in AUDIO_EXTS],
            key=lambda v: v.lower()
        )
        if not tracks:
            continue

        covers = sorted(
            [p.name for p in files if p.suffix.lower() in IMAGE_EXTS],
            key=lambda v: v.lower()
        )
        cover = covers[0] if covers else ""
        author, album = split_artist_album(folder.name, tracks)

        rel_folder = f"Vinyl Collection/{folder.name}"
        albums.append({
            "name": album,
            "author": author,
            "color": pick_color(f"{author}-{album}"),
            "duration": "",
            "folder": rel_folder,
            "cover": f"{rel_folder}/{cover}" if cover else "",
            "tracks": tracks
        })

    MANIFEST_PATH.write_text(json.dumps(albums, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(albums)} albums in {MANIFEST_PATH.name}")


if __name__ == "__main__":
    main()

