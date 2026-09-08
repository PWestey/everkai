import pathlib,re,html,json,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1];source=ROOT.parent.parent/'outputs/online-audit/public-reference/wiki'
manifest=json.loads((source/'wiki_manifest.json').read_text());out={}
for e in manifest['entries']:
 if e['category']!='family':continue
 b=(source/e['url']/'index.html').read_bytes();match=re.search(r'<span class="awakening-skill-line">(.*?)</span>',b.decode(),re.S)
 if not match:continue
 text=html.unescape(re.sub('<[^>]*>','',match[1]));m=re.fullmatch(r"When an? (Inspiring|Diligent|Brave|Informed|Unfettered) Pupil graduates, the Pupil's earnings \+(\d+)%\. \(\+(\d+)%\)",text)
 if m:out[e['internal_id'].lower()]={'type':m[1].lower(),'percent':int(m[2]),'increment':int(m[3]),'source':'https://zik-ascend.github.io/isl-tools/wiki/'+e['url'],'sha256':hashlib.sha256(b).hexdigest()}
(ROOT/'lib/graduation-bonds.json').write_text(json.dumps(out,indent=2)+'\n');print('Matched',len(out),'explicit graduation bonuses')
