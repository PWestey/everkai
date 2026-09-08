"""Inventory fields and all skill nodes without executing public page scripts."""
import pathlib,json,re,html,hashlib
root=pathlib.Path(__file__).resolve().parents[1];base=root.parent.parent/'outputs/online-audit/public-reference/wiki'
def plain(s):return html.unescape(re.sub('<[^>]+>','',s)).strip()
rows=[]
for e in json.loads((base/'wiki_manifest.json').read_text())['entries']:
 if e['category']!='familiars':continue
 b=(base/e['url']/'index.html').read_bytes();s=b.decode();sim=json.loads(html.unescape(re.search('data-pet-sim="([^"]+)"',s)[1]))
 nodes=[{'slot':plain(m[0]),'name':plain(m[1]),'text':plain(m[2])} for m in re.findall(r'<span class="skill-node-icon">(.*?)</span>.*?<strong>(.*?)</strong>\s*<span>(.*?)</span>',s,re.S)]
 for n in nodes:n['groups']=[tag for tag,pattern in {'shield':'shield','damageOverTime':'bleed|poison|per turn','timedBuff':'for [0-9]+ (turn|round)|lasting','heal':'restor|heal','damage':'damage|DMG','randomTarget':'random','rowTarget':'front|back','passive':r'^P'}.items() if re.search(pattern,n['slot'] if tag=='passive' else n['text'],re.I)]
 rows.append({'id':e['internal_id'],'name':e['title'],'source':f'https://github.com/Zik-Ascend/isl-tools/blob/b49c78d0c06d535f6e1c62bdc9d5d666cd96e954/wiki/{e["url"]}index.html','sha256':hashlib.sha256(b).hexdigest(),'simulatorFields':sorted(sim),'displayAttributes':{plain(k):plain(v) for k,v in re.findall(r'<div class="object-stat"><span>(.*?)</span><strong>(.*?)</strong>',s,re.S)},'htmlDataFields':sorted(set(re.findall(r'(data-[a-z-]+)=',s))),'skills':nodes})
(root/'lib/familiar-skill-inventory.json').write_text(json.dumps({'snapshot':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','profiles':rows},indent=2)+'\n')
print(len(rows),'profiles;',sum(len(r['skills']) for r in rows),'skill nodes')
