#!/usr/bin/env python3
"""Composite transparent character frames into one of the game's own painted Isekai backdrops.

  village-compose.py --frames DIR --backdrop public/assets/facility-scenes/trading.webp \
      --still OUT.webp --out-frames DIR [--match SHIPPED.webp] [--size 1280x1920] [--clip-size 1024x1536]

WHY THIS FILE EXISTS. The 163 crossover characters shipped (commit f45113d) as stills standing in one
of the game's 38 painted backdrops, but the step that made them was run outside the repo and was never
committed -- so when a character has to be re-rendered, `compose.py` (the procedural gradient, which is
what build-character.py calls) puts it on a different backdrop at a different size and the roster goes
visibly inconsistent. This is that missing step, written from what the shipped files measure:

  * still 1280x1920 WebP q85, idle clip 1024x1536 -- the sizes recorded in everkai-additions-data.json
    and in f45113d's own message;
  * the backdrop cover-cropped to 2:3, NOT blurred (measured on the shipped Mandalorian: the mean
    absolute difference between his still's centre-top strip and a plain cover-crop of
    facility-scenes/trading.webp is 0.44 of 255, i.e. WebP noise -- a blur would be far larger);
  * `--match` reproduces a shipped still's framing exactly rather than guessing the camera: the
    character's box in the shipped file is measured against that same cover-crop, and the new frames
    are scaled and placed into it. Re-rendering a character therefore moves no pixel of its framing,
    which is what lib/art-bounds-data.json and tests/art-framing.test.mjs are measured against.

Known and accepted: the shipped plates are about 3% darker at the corners than a plain cover-crop
(measured: -6.7 of 183 at the top left, -0.3 of 164 at the centre top). That grade is not reproduced
here; it is below the level a phone shows and no character sits in the corners.
"""
import argparse, glob, json, os
import numpy as np
from PIL import Image, ImageFilter

def cover(image, w, h):
    src = Image.open(image).convert('RGB')
    scale = max(w / src.width, h / src.height)
    src = src.resize((int(src.width * scale + 0.5), int(src.height * scale + 0.5)), Image.LANCZOS)
    left, upper = (src.width - w) // 2, (src.height - h) // 2
    return src.crop((left, upper, left + w, upper + h))

def alpha_box(files, threshold=8):
    """The union of every frame's alpha box, so the placement does not move during the loop."""
    alpha = None
    for f in files:
        a = np.asarray(Image.open(f).convert('RGBA'))[..., 3]
        alpha = a if alpha is None else np.maximum(alpha, a)
    ys, xs = np.where(alpha > threshold)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())

def shipped_box(still, backdrop, threshold=60):
    """Where the character stands in an already-shipped still, measured against its own backdrop."""
    ship = Image.open(still).convert('RGB')
    w, h = ship.size
    d = np.abs(np.asarray(ship, np.float32) - np.asarray(cover(backdrop, w, h), np.float32)).mean(2)
    m = d > threshold
    cols, rows = np.where(m.sum(0) > 20)[0], np.where(m.sum(1) > 20)[0]
    return (int(cols.min()), int(rows.min()), int(cols.max()), int(rows.max())), (w, h)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--frames', required=True)
    ap.add_argument('--backdrop', required=True)
    ap.add_argument('--still', required=True)
    ap.add_argument('--out-frames', required=True)
    ap.add_argument('--match', help='a shipped still whose framing and size this build must reproduce')
    ap.add_argument('--size', default='1280x1920')
    ap.add_argument('--clip-size', default='1024x1536')
    a = ap.parse_args()
    files = sorted(glob.glob(os.path.join(a.frames, 'f*.png')))
    if not files:
        raise SystemExit(f'no frames in {a.frames}')
    w, h = (int(x) for x in a.size.split('x'))
    cw, ch = (int(x) for x in a.clip_size.split('x'))
    src_box = alpha_box(files)
    if a.match:
        target, (mw, mh) = shipped_box(a.match, a.backdrop)
        if (mw, mh) != (w, h):
            w, h = mw, mh
    else:
        # Same framing rule as compose.py: fill 74% of the height, centred, feet near the floor line.
        sh_ = (h * 0.74) / (src_box[3] - src_box[1])
        cx = w / 2
        tw = (src_box[2] - src_box[0]) * sh_
        target = (int(cx - tw / 2), int(h * 0.12), int(cx + tw / 2), int(h * 0.86))
    scale = min((target[2] - target[0]) / (src_box[2] - src_box[0]), (target[3] - target[1]) / (src_box[3] - src_box[1]))
    bg = cover(a.backdrop, w, h).convert('RGBA')
    os.makedirs(a.out_frames, exist_ok=True)
    shadow_offset = (int(w * 0.012), int(h * 0.006))
    for i, f in enumerate(files):
        fg = Image.open(f).convert('RGBA')
        fg = fg.resize((max(1, int(fg.width * scale + 0.5)), max(1, int(fg.height * scale + 0.5))), Image.LANCZOS)
        # Place by the box, not by the canvas: the source frame's padding differs from the target's.
        ox = target[0] - int(src_box[0] * scale + 0.5)
        oy = target[1] - int(src_box[1] * scale + 0.5)
        canvas = bg.copy()
        shadow = Image.new('RGBA', fg.size, (10, 10, 20, 0))
        shadow.putalpha(fg.split()[3].filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * 0.35)))
        canvas.alpha_composite(shadow, (ox + shadow_offset[0], oy + shadow_offset[1]))
        canvas.alpha_composite(fg, (ox, oy))
        out = canvas.convert('RGB')
        if i == 0:
            out.save(a.still, 'WEBP', quality=85, method=6)
        out.resize((cw, ch), Image.LANCZOS).save(os.path.join(a.out_frames, f'f{i:04d}.png'))
    meta = {'width': w, 'height': h, 'clipWidth': cw, 'clipHeight': ch, 'frames': len(files),
            'backdrop': os.path.basename(a.backdrop), 'matched': bool(a.match), 'scale': round(scale, 5),
            'sourceBox': src_box, 'targetBox': list(target), 'stillBytes': os.path.getsize(a.still)}
    json.dump(meta, open(os.path.join(a.out_frames, 'compose.json'), 'w'), indent=1)
    print(json.dumps(meta))

if __name__ == '__main__':
    main()
