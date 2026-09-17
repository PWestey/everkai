#!/usr/bin/env python3
"""Composite transparent character frames onto an Everkai-style 2:3 backdrop.

compose.py --frames DIR --palette msf|swgoh --out-frames DIR --still OUT.webp [--still-frame 0] [--backdrop image]

The backdrop is procedural (a lit vertical gradient, a soft halo behind the upper body and a floor
shadow under the measured feet), so every character in a batch gets the same treatment without
per-character art direction. --backdrop IMAGE uses a cover-cropped, blurred image instead.
"""
import argparse, glob, json, os
import numpy as np
from PIL import Image, ImageFilter

PALETTES = {
    # top, bottom, halo, floor tint
    'msf': ((226, 232, 244), (120, 134, 170), (255, 246, 226), (40, 44, 66)),
    'swgoh': ((214, 218, 226), (104, 108, 124), (255, 236, 226), (30, 30, 40)),
}

def backdrop(w, h, palette, feet_y, center_x, image=None):
    top, bottom, halo, floor = PALETTES[palette]
    if image:
        src = Image.open(image).convert('RGB')
        scale = max(w / src.width, h / src.height)
        src = src.resize((int(src.width * scale + 0.5), int(src.height * scale + 0.5)), Image.LANCZOS)
        left, upper = (src.width - w) // 2, (src.height - h) // 2
        bg = np.asarray(src.crop((left, upper, left + w, upper + h)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)
    else:
        y = np.linspace(0, 1, h)[:, None, None]
        bg = np.array(top, np.float32) * (1 - y) + np.array(bottom, np.float32) * y
        bg = np.repeat(bg, w, axis=1)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    # halo behind the chest
    d = np.sqrt(((xx - center_x) / (w * 0.55)) ** 2 + ((yy - h * 0.38) / (h * 0.42)) ** 2)
    g = np.clip(1 - d, 0, 1)[..., None] ** 2
    bg = bg * (1 - 0.45 * g) + np.array(halo, np.float32) * 0.45 * g
    # vignette
    v = np.sqrt(((xx - w / 2) / (w * 0.75)) ** 2 + ((yy - h * 0.45) / (h * 0.8)) ** 2)
    bg *= (1 - 0.35 * np.clip(v - 0.35, 0, 1))[..., None]
    # floor shadow
    s = np.sqrt(((xx - center_x) / (w * 0.26)) ** 2 + ((yy - feet_y) / (h * 0.022)) ** 2)
    sh = np.clip(1 - s, 0, 1)[..., None] ** 1.5
    bg = bg * (1 - 0.55 * sh) + np.array(floor, np.float32) * 0.55 * sh
    return Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8), 'RGB')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--frames', required=True)
    ap.add_argument('--palette', default='msf')
    ap.add_argument('--out-frames', required=True)
    ap.add_argument('--still', required=True)
    ap.add_argument('--still-frames')
    ap.add_argument('--backdrop')
    a = ap.parse_args()
    files = sorted(glob.glob(os.path.join(a.frames, 'f*.png')))
    os.makedirs(a.out_frames, exist_ok=True)
    first = Image.open(files[0])
    w, h = first.size
    # Feet and centre from alpha over every frame, so the backdrop does not move.
    alpha = np.zeros((h, w), np.float32)
    for f in files:
        alpha = np.maximum(alpha, np.asarray(Image.open(f).convert('RGBA'))[..., 3].astype(np.float32))
    rows = np.where(alpha.max(axis=1) > 128)[0]
    cols = np.where(alpha.max(axis=0) > 128)[0]
    feet_y = float(rows.max()) if len(rows) else h * 0.9
    lower = alpha[int(feet_y - h * 0.06):int(feet_y) + 1]
    fc = np.where(lower.max(axis=0) > 128)[0]
    center_x = float(fc.mean()) if len(fc) else w / 2
    bg = backdrop(w, h, a.palette, feet_y - h * 0.004, center_x, a.backdrop)
    shadow_offset = (int(w * 0.012), int(h * 0.006))
    for i, f in enumerate(files):
        fg = Image.open(f).convert('RGBA')
        canvas = bg.convert('RGBA')
        # soft contact shadow of the silhouette for separation from the backdrop
        a_ch = fg.split()[3].filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * 0.35))
        shadow = Image.new('RGBA', (w, h), (10, 10, 20, 0))
        shadow.putalpha(a_ch)
        canvas.alpha_composite(shadow, shadow_offset)
        canvas.alpha_composite(fg)
        canvas.convert('RGB').save(os.path.join(a.out_frames, f'f{i:04d}.png'))
    src = a.still_frames and sorted(glob.glob(os.path.join(a.still_frames, 'f*.png')))
    if src:
        fg = Image.open(src[0]).convert('RGBA')
        canvas = bg.convert('RGBA')
        sh = Image.new('RGBA', (w, h), (10, 10, 20, 0)); sh.putalpha(fg.split()[3].filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * 0.35)))
        canvas.alpha_composite(sh, shadow_offset); canvas.alpha_composite(fg)
        still = canvas.convert('RGB')
    else:
        still = Image.open(os.path.join(a.out_frames, 'f0000.png')).convert('RGB')
    still.save(a.still, 'WEBP', quality=85, method=6)
    meta = {'width': w, 'height': h, 'frames': len(files), 'feetY': feet_y, 'centerX': center_x,
            'silhouette': {'top': int(rows.min()), 'bottom': int(rows.max()), 'left': int(cols.min()), 'right': int(cols.max())},
            'stillBytes': os.path.getsize(a.still)}
    json.dump(meta, open(os.path.join(a.out_frames, 'compose.json'), 'w'), indent=1)
    print(json.dumps(meta))

if __name__ == '__main__':
    main()
