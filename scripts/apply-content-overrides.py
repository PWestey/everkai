#!/usr/bin/env python3
"""Apply Everkai's content decisions to the generated data files.

The lib/*.json and lib/*.mjs data files are written by scripts/import-*.py from the read-only
APK extraction, so hand edits are lost whenever one of those importers runs again. This script
re-applies Everkai's own decisions on top, and is idempotent: run it after any import.

It reads lib/content-overrides.json:
  strings      {file: [[exact old, new], ...]}  raw-text replacements in that file
  removedItems [{id, name, files}]              whole records deleted by id

Every 'old' is matched against the RAW file text, because these files do not share one escaping
style (expo-data.json stores \\u2019, museum-data.json stores literal UTF-8). A pair whose 'old'
is absent AND whose 'new' is absent is a hard error, not a silent skip: that is how a rewrite
would quietly stop applying after an importer changed its output.

Records are removed by byte-span deletion, never by re-serialising, so formatting and untouched
rows stay byte-identical. Every edit is verified: the result must still parse, the id must be
gone, and the new text must be a pure character-subsequence of the old.

  python3 scripts/apply-content-overrides.py [--check]

--check reports what is unapplied and exits non-zero without writing, for CI.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECK = '--check' in sys.argv


def mask(t):
    """Mark every character inside a JSON string, so brace matching can skip them."""
    m = bytearray(len(t)); ins = False; i = 0
    while i < len(t):
        c = t[i]
        if not ins:
            if c == '"': ins = True; m[i] = 1
        else:
            m[i] = 1
            if c == '\\':
                i += 1
                if i < len(t): m[i] = 1
            elif c == '"': ins = False
        i += 1
    return m


def obj_span(t, m, idx):
    """The {...} span enclosing idx."""
    d = 0; i = idx; start = None
    while i >= 0:
        if not m[i]:
            if t[i] == '}': d += 1
            elif t[i] == '{':
                if d == 0: start = i; break
                d -= 1
        i -= 1
    assert start is not None, 'no enclosing object'
    d = 0; j = start
    while j < len(t):
        if not m[j]:
            if t[j] == '{': d += 1
            elif t[j] == '}':
                d -= 1
                if d == 0: return start, j + 1
        j += 1
    raise AssertionError('unbalanced braces')


def cut(t, s, e):
    """Delete [s,e) plus the separator that would otherwise dangle."""
    j = e
    while j < len(t) and t[j].isspace(): j += 1
    if j < len(t) and t[j] == ',':
        j += 1
        while j < len(t) and t[j].isspace(): j += 1
        return t[:s] + t[j:]
    k = s
    while k > 0 and t[k - 1].isspace(): k -= 1
    if k > 0 and t[k - 1] == ',': k -= 1
    return t[:k] + t[e:]


def is_subsequence(new, old):
    it = iter(old)
    return all(c in it for c in new)


def remove_record(text, item_id):
    """Delete one record, addressed either as a key ("id": {...}) or by an "id" field."""
    key = f'"{item_id}":'
    i = text.find(key)
    if i >= 0:
        brace = text.index('{', i + len(key))
        _, e = obj_span(text, mask(text), brace)
        return cut(text, i, e)
    for anchor in (f'"id": "{item_id}"', f'"id":"{item_id}"'):
        i = text.find(anchor)
        if i >= 0:
            s, e = obj_span(text, mask(text), i)
            return cut(text, s, e)
    return None


def main():
    data = json.loads((ROOT / 'lib/content-overrides.json').read_text())
    errors, unapplied, changed = [], [], 0

    for rel, pairs in sorted(data.get('strings', {}).items()):
        p = ROOT / 'lib' / rel
        if not p.exists():
            errors.append(f'{rel}: file missing'); continue
        text = old = p.read_text(encoding='utf-8')
        hits = 0
        for a, b in pairs:
            n = text.count(a)
            if n:
                text = text.replace(a, b); hits += n
            elif b not in text:
                errors.append(f'{rel}: matched neither old nor new -> {a[:70]!r}')
        if text != old:
            if rel.endswith('.json'):
                json.loads(text)  # must still parse
            if CHECK:
                unapplied.append(f'{rel}: {hits} replacement(s) pending')
            else:
                p.write_text(text, encoding='utf-8')
                print(f'  {rel}: {hits} replacement(s)')
            changed += hits

    for item in data.get('removedItems', []):
        for rel in item['files']:
            p = ROOT / 'lib' / rel
            if not p.exists():
                errors.append(f'{rel}: file missing'); continue
            text = p.read_text(encoding='utf-8')
            if item['id'] not in text:
                continue  # already removed
            new = remove_record(text, item['id'])
            if new is None:
                errors.append(f'{rel}: could not locate {item["id"]}'); continue
            if rel.endswith('.json'):
                json.loads(new)
            if not is_subsequence(new, text):
                errors.append(f'{rel}: removal was not a pure deletion'); continue
            if item['id'] in new:
                errors.append(f'{rel}: {item["id"]} still present after removal'); continue
            if CHECK:
                unapplied.append(f'{rel}: {item["id"]} still present')
            else:
                p.write_text(new, encoding='utf-8')
                print(f'  {rel}: removed {item["id"]}')
            changed += 1

    for e in errors:
        print(f'  ERROR {e}')
    if errors:
        print(f'\n{len(errors)} error(s). Nothing further applied.')
        return 2
    if CHECK:
        if unapplied:
            print('\nUNAPPLIED:')
            for u in unapplied: print(f'  {u}')
            print(f'\n{len(unapplied)} item(s) pending. Run without --check.')
            return 1
        print('All content overrides are applied.')
        return 0
    print(f'\nApplied {changed} change(s).' if changed else 'Nothing to do; already applied.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
