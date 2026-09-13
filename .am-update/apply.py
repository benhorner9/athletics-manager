from pathlib import Path


def rep(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing anchor: {label}')
    return text.replace(old, new, 1)

p=Path('scripts/programme-economy-v2.js')
text=p.read_text(encoding='utf-8')
text=rep(text,"const V=2,UI={finance:'overview',staff:'team',role:'sprint'};","const V=3,UI={finance:'overview',staff:'team',role:'sprint'};",'economy state migration version')
text=rep(text,"fac3=['sprint','field','recovery'].every(k=>feff(k)>=3)","fac3=['sprint','field','recovery'].every(k=>fact(k,p)>=3)",'commercial facility eligibility uses actual level')
text=rep(text,"function activeBoardControl(p=prog()){const c=p?.governance?.control;if(!c)return null;if(cw()>=Number(c.endCareerWeek||0)){p.governance.control=null;return null}return c}","function activeBoardControl(p=prog()){const c=p?.governance?.control;if(c&&cw()>=Number(c.endCareerWeek||0)){p.governance.control=null}else if(c)return c;const legacyEnd=Number(p?.restrictionUntil||0);return cw()<legacyEnd?{kind:'temporary',reason:'Temporary board spending controls',endCareerWeek:legacyEnd}:null}",'board control compatibility')
p.write_text(text,encoding='utf-8')

p=Path('tools/programme-board-commercial-soak.mjs')
t=p.read_text(encoding='utf-8')
t=rep(t,"const src=fs.readFileSync('scripts/programme-economy-v2.js','utf8');","const src=fs.readFileSync('scripts/programme-economy-v2.js','utf8');\nassert(src.includes(\"const V=3,UI=\"),'Programme Economy state version must migrate existing V2 saves');",'migration regression')
p.write_text(t,encoding='utf-8')
