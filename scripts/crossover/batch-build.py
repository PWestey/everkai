#!/usr/bin/env python3
"""Run build-character.py (no install) over the owner's selected roster and summarise the results.

  batch-build.py --roster selected-roster.json --corpus .../Asset-Corpus --work WORKDIR --python VENV_PY \
      [--game MSF|SWGOH] [--start 0] [--limit N]

Writes WORKDIR/batch-summary.json: one row per character with the chosen clip, seconds, failures or the
error text. Review WORKDIR/<id>/<id>.webp and the MP4 before installing any row with
`build-character.py ... --install REPO --name ... --title ... --occupation ... --race ... --rarity ... --type ... --description ...`.
"""
import argparse, json, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--roster', required=True)
    ap.add_argument('--corpus', required=True)
    ap.add_argument('--work', required=True)
    ap.add_argument('--python', default='python3')
    ap.add_argument('--game', choices=['MSF', 'SWGOH'])
    ap.add_argument('--start', type=int, default=0)
    ap.add_argument('--limit', type=int)
    a = ap.parse_args()
    roster = json.loads(Path(a.roster).read_text())
    rows = [(g, r) for g in ('MSF', 'SWGOH') if not a.game or g == a.game for r in roster[g]]
    rows = rows[a.start:a.start + a.limit if a.limit else None]
    out_path = Path(a.work) / 'batch-summary.json'
    summary = json.loads(out_path.read_text()) if out_path.exists() else {}
    for game, r in rows:
        key = f"{game}:{r['assetId']}"
        t = time.time()
        p = subprocess.run([sys.executable, str(HERE / 'build-character.py'), '--game', game, '--asset-id', r['assetId'], '--corpus', a.corpus,
                            '--work', a.work, '--python', a.python], capture_output=True, text=True)
        line = next((l for l in reversed(p.stdout.strip().splitlines()) if l.startswith('{')), None)
        row = {'game': game, 'assetId': r['assetId'], 'character': r['character'], 'rank': r['rank'], 'ok': p.returncode == 0, 'seconds': round(time.time() - t, 1)}
        if line:
            row.update(json.loads(line))
        if p.returncode:
            row['error'] = (p.stderr.strip().splitlines() or ['?'])[-1][:300]
        summary[key] = row
        out_path.write_text(json.dumps(summary, indent=1) + '\n')
        print(json.dumps(row), flush=True)
    ok = sum(1 for v in summary.values() if v['ok'])
    print(f'{ok}/{len(summary)} built')

if __name__ == '__main__':
    main()
