"""Import published character facts, never execute remote scripts. Run from project root."""
import concurrent.futures, hashlib, json, pathlib, re, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
AUDIT = ROOT.parent.parent / 'outputs/online-audit'
SHA = 'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954'
BASE = f'https://raw.githubusercontent.com/Zik-Ascend/isl-tools/{SHA}/wiki/'
manifest = json.loads((AUDIT/'public-reference/wiki/wiki_manifest.json').read_text())
entries = [e for e in manifest['entries'] if e['category'] in ('fellows', 'family')]
by_url = {e['url']: e for e in entries}

def read_family(e):
    path = AUDIT/'public-reference/wiki'/e['url']/'index.html'
    if not path.exists():
        for attempt in range(3):
            try:
                data = urllib.request.urlopen(BASE+e['url']+'index.html', timeout=25).read()
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
                break
            except Exception:
                if attempt == 2: raise
    data = path.read_bytes()
    html = data.decode()
    # Only explicit links in the Blessed Fellows section qualify; absence is unknown.
    section = re.search(r'<h2>Blessed Fellows</h2>(.*?)(?:</section>|<h2>)', html, re.S)
    pairs = None
    if section:
        urls = re.findall(r'class="pill-link family-blessing-pill" href="../../([^"]+)"', section[1])
        pairs = [by_url[u]['internal_id'].lower() for u in urls if u in by_url]
        if len(pairs) != len(urls): raise ValueError('Unmapped blessing link: '+e['url'])
    return e['internal_id'].lower(), pairs, hashlib.sha256(data).hexdigest()

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    family = {i: (p, h) for i,p,h in pool.map(read_family, [e for e in entries if e['category']=='family'])}
records = {}
for e in entries:
    id = e['internal_id'].lower()
    records[id] = {'name':e['title'], 'rarity':e.get('rarity'), 'type':e.get('country_label'),
                   'source':'https://zik-ascend.github.io/isl-tools/wiki/'+e['url']}
    if id in family:
        records[id].update(blessedFellows=family[id][0], pageSha256=family[id][1])
output = {'snapshot':SHA,'generatedAt':manifest['generated_at'],'versionMatch':'Not verified against APK 1.7702','records':records}
(ROOT/'lib/public-roster.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'records':len(records),'familyWithPairs':sum(bool(p) for p,h in family.values()),'pairs':sum(len(p or []) for p,h in family.values())}))
