#!/usr/bin/env python3
"""Build one crossover Fellow from the MSF/SWGOH asset corpus: GLB -> idle frames -> still + MP4.

  build-character.py --game MSF --asset-id SpiderMan --corpus .../Asset-Corpus --work WORKDIR \
      [--id xover_msf_spiderman] [--clip NAME] [--root NAME] [--yaw DEG] [--bitrate 2400000] \
      [--install REPO --name "Spider-Man" --title ... --occupation ... --race ... \
       --rarity SSR --type Unfettered --description "..."]

Requirements (checked, never installed silently except the npm render tools in WORKDIR/tools):
  * --python: a Python with UnityPy 1.25.3, numpy, Pillow (default: python3)
  * node >= 22, /Applications/Google Chrome.app, swiftc (Xcode command line tools)
  * WORKDIR/tools gets `npm install three@0.180.0 puppeteer-core@24` on first use.

Steps, each recorded in WORKDIR/<id>/manifest.json with timings:
  1. resolve the model bundle from Characters/<asset-id>/asset-references.json
  2. unity_to_glb.py: idle clip (SWGOH with a humanoid Avatar: own humanoid idle -> humanoid donor idle;
     otherwise own -> shared MSF storytelling idle -> SWGOH weapon-class donor), then the prefab root
     that clip binds to best (ties: most textured, active skinned vertices). Humanoid (muscle) clips go
     through the character's own Avatar (humanoid.py); nested sidekicks with their own generic Animator
     (Grogu, BD-1) keep their own idle. Donor clips are marked reviewRequired: a humanoid donor keeps the
     character's proportions but borrows the motion; a generic donor (bone names) can break proportions.
  3. render.mjs: three.js in headless Chrome, 1024x1536, 12 fps, whole loops only
  4. compose.py: procedural 2:3 backdrop, still WebP q85 and composited frames
  5. encode-h264.swift: AVFoundation H.264 (no ffmpeg with H.264 on this Mac)
  6. checks: animation actually moves, loop seam below the median step, MP4 decodes at >= 35 dB PSNR
  7. --install: copy media to public/assets/crossover/ and upsert the row in
     lib/everkai-additions-data.json (text fields from the flags; template picked by pick-template.mjs)
"""
import argparse, hashlib, json, math, os, re, shutil, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
# Donor idles for SWGOH characters whose own idle is a Humanoid muscle clip: (weapon class from the
# idle's hmn_<class>_ prefix, bundle, generic-rig clip). '*' is the fallback.
DONORS = [('sbr', 'char_vaderduelsend_pre.bundle', 'hmn_sbr_vaderduelsend_homescreen_idle'),
          ('pst', 'char_han_pre.bundle', 'hmn_pst_hansolo_homescreen_idle'),
          ('*', 'char_han_pre.bundle', 'hmn_pst_hansolo_homescreen_idle')]
# SWGOH characters whose bundle has a humanoid Avatar but no humanoid idle of its own play another
# character's humanoid (muscle) idle through their own avatar: Unity's own retargeting, so proportions
# hold, but the motion is borrowed and the row stays reviewRequired. Picked by role, looked at in renders.
HUMANOID_DONORS = {'MAUL': ('char_revan_dark_pre.bundle', 'hmn_sbr_revan_dark_homeidle'),
                   'AAYLASECURA': ('char_luminara_pre.bundle', 'hmn_sbr_idle_luminara'),
                   'GRANDMOFFTARKIN': ('char_thrawnadmiral_pre.bundle', 'hmn_thrawn_idle'),
                   'ADMIRALACKBAR': ('char_thrawnadmiral_pre.bundle', 'hmn_thrawn_idle'),
                   'CADBANE': ('char_bobafett_old_pre.bundle', 'hmn_pst_bobafett_old_detailscreen_idle'),
                   '*': ('char_poe_tros_pre.bundle', 'hmn_pst_poe_tros_homeidle')}

def sh(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode:
        sys.stderr.write(r.stdout + r.stderr)
        raise SystemExit(f'failed: {" ".join(map(str, cmd))}')
    return r.stdout

def sha256(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def last_json(text):
    for line in reversed(text.strip().splitlines()):
        line = line.strip()
        if line.startswith('{'):
            return json.loads(line)
    return {}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--game', required=True, choices=['MSF', 'SWGOH'])
    ap.add_argument('--asset-id', required=True)
    ap.add_argument('--corpus', required=True)
    ap.add_argument('--work', required=True)
    ap.add_argument('--id')
    ap.add_argument('--python', default='python3')
    ap.add_argument('--clip')
    ap.add_argument('--root')
    ap.add_argument('--yaw', default='0')
    ap.add_argument('--bitrate', default='2400000')
    ap.add_argument('--install')
    ap.add_argument('--accept-donor', action='store_true', help='install even though the idle is a retargeted donor clip (look at it first)')
    for k in ('name', 'title', 'occupation', 'race', 'rarity', 'type', 'description'):
        ap.add_argument('--' + k)
    a = ap.parse_args()
    game = a.game
    cid = a.id or 'xover_' + game.lower() + '_' + re.sub(r'[^a-z0-9]+', '', a.asset_id.lower())
    corpus = Path(a.corpus)
    work = Path(a.work).resolve() / cid
    work.mkdir(parents=True, exist_ok=True)
    tools = Path(a.work).resolve() / 'tools'
    timings = {}
    t0 = time.time()

    # 1. bundle
    refs = json.loads((corpus / game / 'Characters' / a.asset_id / 'asset-references.json').read_text())
    bundle_name = refs.get('model_bundle_mapping') if game == 'MSF' else refs.get('model_bundle')
    if not bundle_name:
        raise SystemExit(f'{a.asset_id}: asset-references.json names no model bundle: {refs}')
    bundle = corpus / game / 'Raw-Bundles' / bundle_name
    if not bundle.exists():
        raise SystemExit(f'missing bundle {bundle}')

    # tools
    tools.mkdir(parents=True, exist_ok=True)
    if not (tools / 'node_modules' / 'three').exists() or not (tools / 'node_modules' / 'puppeteer-core').exists():
        if not (tools / 'package.json').exists():
            (tools / 'package.json').write_text('{"name":"crossover-render-tools","private":true,"type":"module"}\n')
        sh(['npm', 'install', '--no-audit', '--no-fund', 'three@0.180.0', 'puppeteer-core@24'], cwd=tools)
    for f in ('render.mjs', 'page.html'):
        shutil.copyfile(HERE / f, tools / f)
    for swift in ('encode-h264', 'mp4-frame'):
        binary = tools / swift
        if not binary.exists() or binary.stat().st_mtime < (HERE / f'{swift}.swift').stat().st_mtime:
            sh(['swiftc', '-O', '-suppress-warnings', str(HERE / f'{swift}.swift'), '-o', str(binary)])
    timings['setup'] = round(time.time() - t0, 1)

    # 2. GLB
    t = time.time()
    cmd = [a.python, str(HERE / 'unity_to_glb.py'), '--bundle', str(bundle), '--out', str(work / 'model.glb')]
    if a.clip: cmd += ['--clip', a.clip]
    if a.root: cmd += ['--root', a.root]
    raw_bundles = corpus / game / 'Raw-Bundles'
    if game == 'MSF':
        # 17 of the 95 selected MSF characters have no idle of their own; the shared storytelling
        # bundle holds a name-matched or archetype (MaleMed/FemMed/MaleBig) shell idle on the same rig.
        cmd += ['--anim-bundle', str(raw_bundles / 'base_pack_1_storytelling_anims.assetbundle')]
    else:
        # 45 of the 68 selected SWGOH characters have a humanoid Avatar; their muscle idles are converted
        # through it. The bone-name donor below is only the fallback for a character with neither.
        for cls, bundle_file, clip_name in DONORS:
            if (raw_bundles / bundle_file).exists():
                cmd += ['--donor', f'{cls}={raw_bundles / bundle_file}:{clip_name}']
        bundle_file, clip_name = HUMANOID_DONORS.get(a.asset_id, HUMANOID_DONORS['*'])
        if (raw_bundles / bundle_file).exists() and bundle_file != bundle_name:
            cmd += ['--humanoid-donor', f'*={raw_bundles / bundle_file}:{clip_name}']
    (work / 'model.json').unlink(missing_ok=True)
    r = subprocess.run(cmd, capture_output=True, text=True)
    export = json.loads((work / 'model.json').read_text()) if (work / 'model.json').exists() else {}
    timings['export'] = round(time.time() - t, 1)
    if r.returncode:
        sys.stderr.write(r.stdout[-2000:] + r.stderr[-2000:])
        raise SystemExit(f'{cid}: export failed: {(r.stderr.strip().splitlines() or ["?"])[-1][:400]}')
    if export['clip']['unresolvedCount']:
        print(f'warning: {export["clip"]["unresolvedCount"]} animation paths did not resolve', file=sys.stderr)

    # 3. frames
    t = time.time()
    style = 'msf' if game == 'MSF' else 'swgoh'
    for d in ('frames', 'comp'):
        shutil.rmtree(work / d, ignore_errors=True)
    render = last_json(sh(['node', str(tools / 'render.mjs'), '--glb', str(work / 'model.glb'), '--out', str(work / 'frames'), '--style', style, '--yaw', a.yaw]))
    timings['render'] = round(time.time() - t, 1)

    # 4. still + composited frames
    t = time.time()
    still = work / f'{cid}.webp'
    compose = last_json(sh([a.python, str(HERE / 'compose.py'), '--frames', str(work / 'frames'), '--palette', style, '--out-frames', str(work / 'comp'), '--still', str(still)]))
    timings['compose'] = round(time.time() - t, 1)

    # 5. MP4
    t = time.time()
    mp4 = work / f'{cid}-idle.mp4'
    enc = last_json(sh([str(tools / 'encode-h264'), str(work / 'comp'), str(mp4), '12', a.bitrate]))
    timings['encode'] = round(time.time() - t, 1)

    # 6. checks
    t = time.time()
    checks = last_json(sh([a.python, '-c', CHECK, str(work), str(tools / 'mp4-frame'), str(mp4)]))
    timings['checks'] = round(time.time() - t, 1)
    failures = [k for k, ok in (('animated', checks['maxPixelsChangedPct'] >= 0.5), ('seamless', checks['seam'] <= checks['maxStep'] * 1.5),
                               ('decodes', checks['psnr'] >= 35), ('frames', enc['frames'] == render['frames'])) if not ok]
    manifest = {'id': cid, 'game': game, 'assetId': a.asset_id, 'bundle': bundle_name, 'bundleSha256': sha256(bundle),
                'root': export['root'], 'clip': export['clip']['name'], 'clipSource': export['clip']['source'], 'clipKind': export['clip']['kind'], 'donor': export.get('donor'), 'clipDuration': export['clip']['duration'],
                'mesh': export['stats'], 'glbBytes': export['glbBytes'], 'render': {k: render.get(k) for k in ('frames', 'renderMs')},
                'still': {'file': still.name, 'bytes': still.stat().st_size, 'sha256': sha256(still)},
                'clipFile': {'file': mp4.name, 'bytes': enc['bytes'], 'sha256': sha256(mp4), 'width': enc['width'], 'height': enc['height'],
                             'fps': enc['fps'], 'frames': enc['frames'], 'encodedDuration': round(enc['frames'] / enc['fps'], 6)},
                'checks': checks, 'failures': failures, 'reviewRequired': export['clip']['source'] in ('donor', 'humanoid-donor'), 'humanoid': export.get('humanoid'), 'nestedClips': export.get('nestedClips'), 'timings': timings, 'seconds': round(time.time() - t0, 1),
                'warnings': export.get('warnings', [])}
    (work / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')
    print(json.dumps({k: manifest[k] for k in ('id', 'clip', 'clipSource', 'reviewRequired', 'failures', 'seconds', 'timings')}))
    candidates = export.get('humanoidIdleCandidates') or []
    if failures == ['seamless'] and manifest['clip'] in candidates and candidates.index(manifest['clip']) + 1 < len(candidates):
        # A detail-screen idle can open with a fast move that never returns (Grand Inquisitor's saber spin);
        # the character's next humanoid idle usually loops. Passing --clip makes this a single retry.
        nxt = candidates[candidates.index(manifest['clip']) + 1]
        print(f'{cid}: {manifest["clip"]} is not seamless; retrying with {nxt}', file=sys.stderr)
        sys.stdout.flush()
        sys.exit(subprocess.run([sys.executable, *sys.argv, '--clip', nxt]).returncode)
    if failures:
        raise SystemExit(f'{cid}: checks failed {failures}; inspect {work}/frames and comp before installing')

    # 7. install
    if a.install and manifest['reviewRequired'] and not a.accept_donor:
        raise SystemExit(f'{cid}: idle is a donor clip ({manifest["clip"]}); review {work}/comp, then rerun with --accept-donor')
    if a.install:
        repo = Path(a.install).resolve()
        dest = repo / 'public' / 'assets' / 'crossover'
        dest.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(still, dest / still.name)
        shutil.copyfile(mp4, dest / mp4.name)
        data_path = repo / 'lib' / 'everkai-additions-data.json'
        data = json.loads(data_path.read_text())
        row = next((r for r in data['fellows'] if r['id'] == cid), None)
        if row is None:
            missing = [k for k in ('name', 'title', 'occupation', 'race', 'rarity', 'type', 'description') if not getattr(a, k)]
            if missing:
                raise SystemExit(f'{cid} is new: pass --{" --".join(missing)} (write original copy, never game bios)')
            row = {'id': cid}
            data['fellows'].append(row)
        for k in ('name', 'title', 'occupation', 'race', 'rarity', 'type', 'description'):
            if getattr(a, k):
                row[k] = getattr(a, k)
        row['template'] = sh(['node', str(HERE / 'pick-template.mjs'), row['rarity'], row['type']], cwd=repo).strip()
        row['art'] = 'crossover/' + still.name
        row['clip'] = {'src': 'crossover/' + mp4.name, **{k: manifest['clipFile'][k] for k in ('bytes', 'sha256', 'width', 'height', 'fps', 'frames', 'encodedDuration')}}
        row['artSha256'] = manifest['still']['sha256']
        row['artBytes'] = manifest['still']['bytes']
        row['source'] = {'game': game, 'assetId': a.asset_id, 'bundle': bundle_name, 'bundleSha256': manifest['bundleSha256'],
                         'prefab': manifest['root'], 'clip': manifest['clip'], 'pipeline': 'scripts/crossover/build-character.py'}
        data_path.write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n')
        print(f'installed {cid} (template {row["template"]})')

CHECK = r'''
import sys, glob, json, math, subprocess, os
import numpy as np
from PIL import Image
work, extractor, mp4 = sys.argv[1:4]
files = sorted(glob.glob(work + '/frames/f*.png'))
fr = [np.asarray(Image.open(f).convert('RGBA')).astype(np.float32) for f in files]
steps = [float(np.abs(fr[i] - fr[i - 1]).mean()) for i in range(1, len(fr))] or [0.0]
changed = max(float((np.abs(x - fr[0]).max(axis=2) > 24).mean() * 100) for x in fr)
seam = float(np.abs(fr[0] - fr[-1]).mean())
subprocess.run([extractor, mp4, '0', '12', work + '/decoded0.png'], check=True, capture_output=True)
a = np.asarray(Image.open(work + '/decoded0.png').convert('RGB')).astype(np.float64)
b = np.asarray(Image.open(work + '/comp/f0000.png').convert('RGB')).astype(np.float64)
psnr = 10 * math.log10(255 ** 2 / max(((a - b) ** 2).mean(), 1e-9))
print(json.dumps({'frames': len(fr), 'maxPixelsChangedPct': round(changed, 2), 'medianStep': round(float(np.median(steps)), 3), 'maxStep': round(max(steps), 3), 'seam': round(seam, 3), 'psnr': round(psnr, 2)}))
'''

if __name__ == '__main__':
    main()
