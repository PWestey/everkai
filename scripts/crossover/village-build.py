#!/usr/bin/env python3
"""Re-render shipped crossover characters into their own painted Isekai backdrop, in place.

  village-build.py --ids ID [ID ...] --corpus .../Asset-Corpus --work DIR --tools DIR --repo . \
      [--python VENV_PY] [--dry-run]

WHY. build-character.py builds a character from scratch and composes it on compose.py's procedural
gradient at 1024x1536. The 163 crossovers actually SHIP standing in one of the game's own 38 painted
backdrops at 1280x1920 (commit f45113d), and the step that put them there ran outside the repo and was
never committed. This is that step for a character that already shipped: it reproduces the character's
existing backdrop, framing, size and clip bitrate, and changes only the pixels that the model changed.

HOW EACH INPUT IS RECOVERED RATHER THAN GUESSED:
  * backdrop -- the shipped still's top strip (above every shipped character's head) is compared with a
    plain 2:3 cover-crop of all 38 candidates in public/assets/{facility-scenes,village,drakenberg};
    the winner must beat the runner-up by MARGIN or the character is skipped for a human to look at.
    Measured on The Mandalorian: trading.webp at 2.52 against 36.84 for the next best.
  * framing -- village-compose.py --match measures the character's box in the shipped still and places
    the new render into it, so lib/art-bounds-data.json and tests/art-framing.test.mjs do not move.
  * clip bitrate -- taken from the row's own shipped bytes and duration, so a rebuilt clip keeps the
    quality its neighbours have instead of whatever the encoder default is today.
The render is done at the still's own 1280x1920 (not at 1024 and upscaled), and the composited frames
are resized once to the clip's 1024x1536.
"""
import argparse, glob, hashlib, json, os, shutil, subprocess, sys, time
from pathlib import Path
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
# The donor tables live in build-character.py; importing them keeps ONE source for both scripts. A
# character whose idle is a humanoid donor -- Maul plays Darth Revan's through his own avatar -- needs
# that other bundle on the command line, or the clip its own row records cannot be found, which is
# exactly what stopped the first batch at Maul.
import importlib.util as _ilu
_spec = _ilu.spec_from_file_location('build_character', HERE / 'build-character.py')
_bc = _ilu.module_from_spec(_spec)
try:
    _spec.loader.exec_module(_bc)
except SystemExit:
    pass
DONORS, HUMANOID_DONORS = _bc.DONORS, _bc.HUMANOID_DONORS
MARGIN = 2.0   # the winning backdrop must be this many times closer than the runner-up
MAX_DISTANCE = 8.0  # ...and must itself be a real match: every one of the 30 identified sits at 3.79-7.83
# The painted plates the village build stood the characters in. 38 of them ship in the repo; the rest are
# the CLEAN character-art backgrounds the humanization pipeline selected from (lib/humanized-static-data
# .json records the path of each one it used, e.g. Bg_Wife_175.png), which live in the owner's work tree
# and are build inputs, not site assets. Pass more with --backdrops.
DEFAULT_BACKDROPS = [
    'public/assets/facility-scenes/*.webp', 'public/assets/village/*.webp', 'public/assets/drakenberg/*.webp',
    '/Users/westmanfamily/Documents/Codex/2026-09-07/files-pasted-by-the-user-paste/outputs/outfit-roster/backgrounds/*.png',
    '/Users/westmanfamily/Documents/Codex/2026-09-07/files-pasted-by-the-user-paste/outputs/roster-humanization/backgrounds/*',
    '/Users/westmanfamily/Documents/Codex/2026-09-07/isekai-fellows-humanization/outputs/fellows-humanization/backgrounds/*',
]

def sh(cmd, **kw):
    r = subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)
    if r.returncode:
        raise SystemExit(f'{cmd[0]} failed: {r.stderr.strip()[-2000:]}')
    return r.stdout

def last_json(out):
    for line in reversed(out.strip().splitlines()):
        if line.startswith('{'):
            return json.loads(line)
    raise SystemExit(f'no JSON in: {out[-500:]}')

def cover(path, w, h):
    src = Image.open(path).convert('RGB')
    s = max(w / src.width, h / src.height)
    src = src.resize((int(src.width * s + 0.5), int(src.height * s + 0.5)), Image.LANCZOS)
    l, u = (src.width - w) // 2, (src.height - h) // 2
    return src.crop((l, u, l + w, u + h))

def corners(im, w, h):
    """A signature built from the four corners, which no shipped character reaches.

    The top strip alone is not enough: Grandmaster Yoda is rendered large and his ears sit inside it,
    which drags his best match from ~3 to 26 and makes the plate unidentifiable. The corners hold for
    every character measured."""
    cw, chh = int(w * 0.18), int(h * 0.14)
    parts = [im.crop((0, 0, cw, chh)), im.crop((w - cw, 0, w, chh)),
             im.crop((0, h - chh, cw, h)), im.crop((w - cw, h - chh, w, h))]
    return np.concatenate([np.asarray(p.resize((24, 18)), dtype=np.float32).ravel() for p in parts])

def pick_backdrop(still, candidates, cache={}):
    """The painted backdrop a shipped still stands in. Measured, with the runner-up kept as the control."""
    ship = Image.open(still).convert('RGB')
    w, h = ship.size
    ref = corners(ship, w, h)
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
    return scored[0], scored[1]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', nargs='+', required=True)
    ap.add_argument('--corpus', required=True)
    ap.add_argument('--work', required=True)
    ap.add_argument('--tools', required=True)
    ap.add_argument('--repo', default='.')
    ap.add_argument('--python', default=sys.executable)
    ap.add_argument('--body-box', action='store_true', help="measure the framing box from a saber-LESS "
                    "render. Use it for a character that is GAINING a blade: its shipped still has none, "
                    "so matching the blade-inclusive box would shrink the body to fit a box that never "
                    "held a blade. A character whose still already shows its blade matches like for like.")
    ap.add_argument('--backdrops', nargs='+', help='glob(s) of candidate plates; defaults to DEFAULT_BACKDROPS')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    repo, work, tools = Path(a.repo).resolve(), Path(a.work).resolve(), Path(a.tools).resolve()
    data_path = repo / 'lib' / 'everkai-additions-data.json'
    data = json.loads(data_path.read_text())
    rows = {r['id']: r for r in data['fellows'] + data['family']}
    seen, candidates = set(), []
    for pattern in (a.backdrops or DEFAULT_BACKDROPS):
        for c in sorted(glob.glob(pattern if pattern.startswith('/') else str(repo / pattern))):
            if c.rsplit('.', 1)[-1].lower() not in ('png', 'jpg', 'jpeg', 'webp'):
                continue
            digest = hashlib.sha256(Path(c).read_bytes()).hexdigest()
            if digest in seen:  # the same plate ships in more than one work directory
                continue
            seen.add(digest)
            candidates.append(c)
    report = []
    for cid in a.ids:
      try:  # one character's failure records itself and the batch carries on
        t0 = time.time()
        row = rows.get(cid)
        if row is None:
            report.append({'id': cid, 'ok': False, 'why': 'not in everkai-additions-data.json'}); continue
        src = row['source']
        still_path = repo / 'public/assets' / row['art']
        (best, runner) = pick_backdrop(still_path, candidates)
        if best[0] > MAX_DISTANCE or runner[0] < best[0] * MARGIN:
            report.append({'id': cid, 'ok': False, 'why': f'backdrop not identified: {Path(best[1]).name} {best[0]:.2f} vs {Path(runner[1]).name} {runner[0]:.2f}'})
            continue
        if a.dry_run:
            report.append({'id': cid, 'ok': True, 'backdrop': Path(best[1]).name, 'distance': round(best[0], 2),
                           'runnerUp': round(runner[0], 2), 'dryRun': True})
            print(json.dumps(report[-1]), flush=True); continue
        w = work / cid
        w.mkdir(parents=True, exist_ok=True)
        raw = Path(a.corpus) / src['game'] / 'Raw-Bundles'
        export = [a.python, HERE / 'unity_to_glb.py', '--bundle', raw / src['bundle'], '--out', w / 'model.glb']
        if src['game'] == 'MSF':
            export += ['--anim-bundle', raw / 'base_pack_1_storytelling_anims.assetbundle']
        else:
            for cls, bundle_file, clip_name in DONORS:
                if (raw / bundle_file).exists():
                    export += ['--donor', f'{cls}={raw / bundle_file}:{clip_name}']
            donor_file, donor_clip = HUMANOID_DONORS.get(src['assetId'], HUMANOID_DONORS['*'])
            if (raw / donor_file).exists() and donor_file != src['bundle']:
                export += ['--humanoid-donor', f'*={raw / donor_file}:{donor_clip}']
        sh(export)
        chose = json.loads((w / 'model.json').read_text())['clip']['name']
        if chose != src['clip']:
            raise SystemExit(f'idle changed: row records {src["clip"]}, this build chose {chose}')
        sh(['node', tools / 'render.mjs', '--glb', w / 'model.glb', '--out', w / 'frames',
            '--style', 'swgoh' if src['game'] == 'SWGOH' else 'msf', '--width', 1280, '--height', 1920], cwd=tools)
        # A character whose blade was missing before now grows one, and a blade is OUTSIDE the body box
        # the shipped still measures. Framing on the blade-inclusive box would shrink the body to fit a
        # box that never held a blade, so the body box comes from one extra saber-less frame.
        compose = [a.python, HERE / 'village-compose.py', '--frames', w / 'frames', '--backdrop', best[1],
                   '--still', w / f'{cid}.webp', '--out-frames', w / 'comp', '--match', still_path]
        if a.body_box and src['game'] == 'SWGOH':
            sh(['node', tools / 'render.mjs', '--glb', w / 'model.glb', '--out', w / 'body', '--style', 'swgoh',
                '--width', 1280, '--height', 1920, '--no-sabers', '--still-time', 0], cwd=tools)
            body = sorted(glob.glob(str(w / 'body' / 'f*.png')))
            alpha = np.asarray(Image.open(body[0]).convert('RGBA'))[..., 3]
            ys, xs = np.where(alpha > 8)
            compose += ['--source-box', f'{xs.min()},{ys.min()},{xs.max()},{ys.max()}']
        comp = last_json(sh(compose))
        # The row's own shipped quality, not the encoder default: bits / second of the clip it replaces.
        bitrate = int(row['clip']['bytes'] * 8 / row['clip']['encodedDuration'])
        enc = last_json(sh([tools / 'encode-h264', w / 'comp', w / f'{cid}-idle.mp4', 12, bitrate]))
        # The clip has to MOVE: a frozen re-render is the failure this whole pass could hide.
        frames = sorted(glob.glob(str(w / 'comp' / 'f*.png')))
        f0 = np.asarray(Image.open(frames[0]).convert('L'), np.float32)
        fm = np.asarray(Image.open(frames[len(frames) // 2]).convert('L'), np.float32)
        motion = float(np.abs(f0 - fm).mean())
        if motion < 0.05:
            report.append({'id': cid, 'ok': False, 'why': f'clip does not move (mean |f0-fmid| = {motion:.4f})'}); continue
        dest = repo / 'public/assets/crossover'
        shutil.copyfile(w / f'{cid}.webp', dest / Path(row['art']).name)
        shutil.copyfile(w / f'{cid}-idle.mp4', dest / Path(row['clip']['src']).name)
        sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
        row['artBytes'] = os.path.getsize(dest / Path(row['art']).name)
        row['artSha256'] = sha(dest / Path(row['art']).name)
        row['clip']['bytes'] = enc['bytes']
        row['clip']['sha256'] = sha(dest / Path(row['clip']['src']).name)
        row['clip']['frames'] = enc['frames']
        # An integral duration must serialise as 5, not 5.0: build-additions.mjs --check compares the
        # file BYTE FOR BYTE against what Node emits, and Node writes integral numbers without a point.
        seconds = round(enc['frames'] / 12, 4)
        row['clip']['encodedDuration'] = int(seconds) if seconds == int(seconds) else seconds
        report.append({'id': cid, 'ok': True, 'backdrop': Path(best[1]).name, 'distance': round(best[0], 2),
                       'runnerUp': round(runner[0], 2), 'scale': comp['scale'], 'motion': round(motion, 3),
                       'artBytes': row['artBytes'], 'clipBytes': enc['bytes'], 'seconds': round(time.time() - t0, 1)})
        data_path.write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n')
        print(json.dumps(report[-1]), flush=True)
      except SystemExit as e:
        report.append({'id': cid, 'ok': False, 'why': str(e)[:300]})
        print(json.dumps(report[-1]), flush=True)
    print(json.dumps({'built': sum(1 for r in report if r.get('ok')), 'skipped': [r for r in report if not r.get('ok')]}, indent=1))

if __name__ == '__main__':
    main()
