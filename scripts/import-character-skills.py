"""Inventory pinned character skill nodes by internal identity, never display name."""
import concurrent.futures,pathlib,json,re,html,hashlib,urllib.request
root=pathlib.Path(__file__).resolve().parents[1];base=root.parent.parent/'outputs/online-audit/public-reference/wiki';sha='b49c78d0c06d535f6e1c62bdc9d5d666cd96e954'
entries=[e for e in json.loads((base/'wiki_manifest.json').read_text())['entries'] if e['category'] in ['fellows','family']]
def plain(s):return html.unescape(re.sub('<[^>]+>','',s)).strip()
def read(e):
 p=base/e['url']/'index.html';url=f'https://raw.githubusercontent.com/Zik-Ascend/isl-tools/{sha}/wiki/{e["url"]}index.html'
 if not p.exists():
  b=urllib.request.urlopen(url,timeout=25).read();p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
 b=p.read_bytes();s=b.decode();nodes=[]
 for body in re.findall(r'<button class="skill-node\b[^>]*>(.*?)</button>',s,re.S):
  name=re.search('<strong>(.*?)</strong>',body,re.S);ident=re.search('<small>(.*?)</small>',body,re.S)
  nodes.append({'id':plain(ident[1]) if ident else None,'name':plain(name[1]) if name else None,'lines':[plain(x) for x in re.findall('<span>(.*?)</span>',body,re.S)]})
 return {'id':e['internal_id'].lower(),'name':e['title'],'category':e['category'],'source':url,'sha256':hashlib.sha256(b).hexdigest(),'sections':[plain(x) for x in re.findall(r'<h[23][^>]*>(.*?)</h[23]>',s,re.S)],'skills':nodes,'dataFields':sorted(set(re.findall(r'(data-[a-z-]+)=',s)))}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(read,entries))
assert len(set((x['category'],x['id']) for x in rows))==len(rows)
(root/'lib/character-skill-inventory.json').write_text(json.dumps({'snapshot':sha,'profiles':rows,'limits':'Inventory of pinned source sections, not complete original-game skill coverage. Missing costs and activation joins are unknown.'},indent=2)+'\n')
print(len(rows),'profiles;',sum(len(x['skills']) for x in rows),'skill nodes')

guide=[]
for p in rows:
 unique=[];seen=set()
 for n in p['skills']:
  key=(n['id'],tuple(n['lines']))
  if key in seen:continue
  seen.add(key);unique.append(n)
 guide.append({'id':p['id'],'name':p['name'],'category':p['category'],'skills':unique})
(root/'lib/character-skill-guide.json').write_text(json.dumps({'profiles':guide},separators=(',',':'))+'\n')
