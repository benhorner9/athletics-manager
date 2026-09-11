from pathlib import Path
import base64,gzip,re
parts=[Path(f'scripts/scouting-v2/bundle-{x}.b64').read_text().strip() for x in 'abcd']
code=gzip.decompress(base64.b64decode(''.join(parts))).decode('utf-8')
terms=re.compile(r'assign|assignment|brief|scout|focus|region|discipline|start|confirm|save|slot',re.I)
chunks=[]
for m in terms.finditer(code):
    a=max(0,m.start()-320); b=min(len(code),m.end()+520)
    chunk=code[a:b].replace('\r','')
    if chunk not in chunks: chunks.append(chunk)
# de-duplicate heavily overlapping chunks
out=[]
last=''
for c in chunks:
    if c in last: continue
    out.append(c); last=c
    if len(out)>=180: break
Path('scouting-v2-runtime-snippets.txt').write_text('\n\n===== MATCH =====\n\n'.join(out),encoding='utf-8')
print('wrote',len(out),'snippets from',len(code),'chars')
