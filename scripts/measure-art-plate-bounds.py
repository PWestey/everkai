#!/usr/bin/env python3
"""Where the character stands inside a render that is PAINTED ON A PLATE, not cut out on a flat surround.

  measure-art-plate-bounds.py --assets public/assets --out bounds.json [--paths a.webp b.webp ...]

WHY THIS EXISTS. scripts/measure-art-bounds.swift finds a render's art by looking for a flat viewer
surround and measuring what sits inside it. Every character render in this game is the other kind: an
opaque 1280x1920 painting of a character standing in a scene. Measured across all 381 (218 humanised,
163 crossover): not one carries an alpha channel, and only 18 produce a surround. So the framing data
that lib/art-framing.mjs is built to consume -- `rosterArtPlacement` for the roster tile,
`artTransform` for the character screen -- has never been given anything to work with, and both fall
back to a FIXED placement: 365 of 381 tiles show exactly x 0.167-0.833, y 0.000-0.604 of the render
whatever the character does inside it. That is the owner's complaint, in one line: "some only show head
and shoulders with half the picture being above their head".

THE METHOD is the one the crossover pipeline already uses, applied to the whole roster:
  * identify the plate the render stands on, by the four-corner signature over the candidate plates
    (scripts/crossover/village-build.py corners()/pick_backdrop());
  * difference the render against a 2:3 cover-crop of that plate and take the content box
    (scripts/crossover/village-compose.py shipped_box()).
Both halves come from the same source as the renders themselves, so this is a measurement, not a guess.

VALIDATED, not assumed. lib/humanized-static-data.json records which background file the humanisation
pipeline composited each character onto -- for 197 of the 218 humanised renders. The identifier
recovers the recorded plate for all 197. A render whose plate cannot be identified with a clear margin,
or whose figure is too dark against its plate to separate, is REPORTED and left out: a wrong box would
mis-frame a character that is fine today.
"""
import argparse, glob, hashlib, json, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/crossover'))
MARGIN = 2.0        # the winning plate must be this many times closer than the runner-up
MAX_DISTANCE = 20.0  # and must itself be a real match; see village-build.py for the measured clusters
MIN_AREA = 0.02      # a content box smaller than this is a failed separation, not a tiny character

# The same plate set village-build.py searches, which is where the 38 in the repo and the humanisation
# pipeline's own clean backgrounds both live.
PLATES = [
    'public/assets/facility-scenes/*.webp', 'public/assets/village/*.webp', 'public/assets/drakenberg/*.webp',
    '/Users/westmanfamily/Documents/Codex/2026-09-07/files-pasted-by-the-user-paste/outputs/outfit-roster/backgrounds/*.png',
    '/Users/westmanfamily/Documents/Codex/2026-09-07/files-pasted-by-the-user-paste/outputs/roster-humanization/backgrounds/*',
    '/Users/westmanfamily/Documents/Codex/2026-09-07/isekai-fellows-humanization/outputs/fellows-humanization/backgrounds/*',
]

def cover(path, w, h):
    src = Image.open(path).convert('RGB')
    s = max(w / src.width, h / src.height)
    src = src.resize((int(src.width * s + 0.5), int(src.height * s + 0.5)), Image.LANCZOS)
    l, u = (src.width - w) // 2, (src.height - h) // 2
    return src.crop((l, u, l + w, u + h))

def corners(im, w, h):
    cw, chh = int(w * 0.18), int(h * 0.14)
    parts = [im.crop((0, 0, cw, chh)), im.crop((w - cw, 0, w, chh)),
             im.crop((0, h - chh, cw, h)), im.crop((w - cw, h - chh, w, h))]
    return np.concatenate([np.asarray(p.resize((24, 18)), dtype=np.float32).ravel() for p in parts])

def plates():
    seen, out = set(), []
    for pattern in PLATES:
        for c in sorted(glob.glob(pattern if pattern.startswith('/') else str(ROOT / pattern))):
            if c.rsplit('.', 1)[-1].lower() not in ('png', 'jpg', 'jpeg', 'webp'):
                continue
            digest = hashlib.sha256(Path(c).read_bytes()).hexdigest()
            if digest in seen:
                continue
            seen.add(digest)
            out.append(c)
    return out

def measure(render, candidates, cache):
    im = Image.open(render).convert('RGB')
    w, h = im.size
    ref = corners(im, w, h)
    scored = []
    for c in candidates:
        key = (c, w, h)
        if key not in cache:
            try:
                cache[key] = corners(cover(c, w, h), w, h)
            except Exception:
                continue
        scored.append((float(np.abs(cache[key] - ref).mean()), c))
    scored.sort()
    if not scored:
        return {'why': 'no candidate plates'}
    best, runner = scored[0], (scored[1] if len(scored) > 1 else (float('inf'), None))
    if best[0] > MAX_DISTANCE or runner[0] < best[0] * MARGIN:
        return {'why': f'plate not identified: {Path(best[1]).name} {best[0]:.2f} vs {runner[0]:.2f}'}
    d = np.abs(np.asarray(im, np.float32) - np.asarray(cover(best[1], w, h), np.float32)).mean(2)
    def box_at(threshold):
        m = d > threshold
        cols, rows = np.where(m.sum(0) > 20)[0], np.where(m.sum(1) > 20)[0]
        if not len(cols) or not len(rows):
            return None
        return [cols.min() / w, rows.min() / h, (cols.max() + 1) / w, (rows.max() + 1) / h]
    box, loose = box_at(60), box_at(35)
    if box is None:
        return {'why': 'figure does not separate from its plate', 'plate': Path(best[1]).name}
    # CONFIDENCE. A dark figure on a dark plate separates only partly -- Magneto's mask catches his
    # helmet and loses his legs -- and the box that comes back is a LOWER BOUND, not a measurement.
    # Zooming a character screen on a lower bound would crop the very character it was meant to lift.
    # A box measured at two thresholds that disagree by more than a quarter of its area is exactly that
    # case, so it is reported instead of stored.
    area = lambda b: max(1e-6, (b[2] - b[0]) * (b[3] - b[1]))
    if loose is not None and area(loose) / area(box) > 1.25:
        return {'why': f'separation is threshold-sensitive: area grows {area(loose) / area(box):.2f}x at a lower cut',
                'plate': Path(best[1]).name}
    # A box that covers the frame is not a measurement of where the figure is -- it is the difference
    # finding that the whole painting differs from the plate, which is what a humanised render does:
    # the figure is repainted and so is everything it touches (the table, the chair, the cushion in
    # hero_15). 65 of the 206 humanised renders come back like this. `bounds` means "the art sits HERE
    # inside its frame", so the honest answer for these is no bounds at all, which is exactly what
    # lib/art-framing.mjs reads as "this render fills its frame" -- the behaviour they have today.
    if box[3] - box[1] >= 0.95 and box[2] - box[0] >= 0.9:
        return {'why': 'content covers the frame; nothing to frame against', 'plate': Path(best[1]).name}
    if (box[2] - box[0]) * (box[3] - box[1]) < MIN_AREA:
        return {'why': f'separated box is {((box[2]-box[0])*(box[3]-box[1])):.3f} of the frame, too small to trust',
                'plate': Path(best[1]).name}
    return {'bounds': [round(v, 4) for v in box], 'plate': Path(best[1]).name,
            'distance': round(best[0], 2), 'margin': round(runner[0] / max(best[0], 1e-6), 2)}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--assets', default=str(ROOT / 'public/assets'))
    ap.add_argument('--out', required=True)
    ap.add_argument('--paths', nargs='*')
    a = ap.parse_args()
    paths = a.paths or []
    if not paths:
        data = json.loads((ROOT / 'lib/humanized-static-data.json').read_text())
        add = json.loads((ROOT / 'lib/everkai-additions-data.json').read_text())
        paths = [r['art'] for r in data] + [r['art'] for r in add['fellows'] + add['family']]
    candidates, cache, out = plates(), {}, {}
    for i, p in enumerate(sorted(set(paths))):
        f = Path(a.assets) / p
        out[p] = {'why': 'file missing'} if not f.exists() else measure(f, candidates, cache)
        sys.stderr.write(f'\r{i + 1}/{len(set(paths))}')
    sys.stderr.write('\n')
    ok = sum(1 for v in out.values() if v.get('bounds'))
    Path(a.out).write_text(json.dumps({'measured': len(out), 'withBounds': ok, 'assets': out}, indent=1) + '\n')
    print(json.dumps({'measured': len(out), 'withBounds': ok, 'unmeasured': len(out) - ok}))

if __name__ == '__main__':
    main()
