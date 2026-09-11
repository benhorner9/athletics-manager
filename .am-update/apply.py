from pathlib import Path


def replace_between(text, start, end, replacement, label):
    a = text.find(start)
    if a < 0:
        raise SystemExit(f'Patch anchor missing: {label} start')
    b = text.find(end, a)
    if b < 0:
        raise SystemExit(f'Patch anchor missing: {label} end')
    return text[:a] + replacement.rstrip() + '\n' + text[b:]

js_path = Path('scripts/live-event-broadcast-v4.js')
css_path = Path('styles/live-event-broadcast-v4.css')
html_path = Path('game.html')
gate_path = Path('.github/workflows/ui-regression.yml')

js = js_path.read_text(encoding='utf-8')

# Event-family helper used by the horizontal jump presentation.
needle = "const isHorizontal=d=>/LJ|TJ|LONG\\s*JUMP|TRIPLE\\s*JUMP/i.test(`${d} ${label(d)}`);"
if needle not in js:
    raise SystemExit('Patch anchor missing: horizontal helper')
if 'const isTripleJump=' not in js:
    js = js.replace(needle, needle + "\nconst isTripleJump=d=>/TJ|TRIPLE\\s*JUMP/i.test(`${d} ${label(d)}`);", 1)

# Make the High Jump scoreboard a concise live competition table while retaining official marks.
start = 'function fieldBoardRows(c)'
end = 'function fieldFamily(d)'
field_board = r'''function highJumpHistory(x){
 const entries=[...x.hm].sort((a,b)=>Number(a[0])-Number(b[0])).slice(-4);
 return entries.map(([H,m])=>`${fmt(activeEventDisc||'',H)} ${m.join('')}`).join(' · ')
}
function fieldBoardRows(c){
 const now=performance.now(),current=c.seq[c.i]||c.seq.at(-1);
 return fieldRank(c).map((x,i)=>({
  id:x.r.id,pos:i+1,r:x.r,
  value:isHeight(c.d)?(x.H?fmt(c.d,x.H):'—'):(x.best!=null?fmt(c.d,x.best):'—'),
  sub:isHeight(c.d)?(highJumpHistory(x)||nation(x.r.nation)):x.att.map((m,j)=>m==null?`A${j+1} X`:`A${j+1} ${fmt(c.d,m)}`).join(' · ')||nation(x.r.nation),
  leader:i===0&&((isHeight(c.d)&&x.H>0)||(!isHeight(c.d)&&x.best!=null)),
  ours:x.r.nation===myNation(),
  updated:String(c.lastAttemptId)===String(x.r.id)&&now-c.lastAttemptAt<1150,
  moved:String(c.lastPositionChangeId)===String(x.r.id)&&now-c.lastPositionChangeAt<1150,
  danger:isHeight(c.d)&&current&&String(current.r.id)===String(x.r.id)&&current.a===3
 }))
}
'''
js = replace_between(js, start, end, field_board, 'field board')

# Replace attempt context so High Jump third attempts and lead implications are explicit.
start = 'function attemptContext(c,q)'
end = 'function officialsSvg(points)'
attempt_context = r'''function highJumpAttemptState(c,q){
 if(!q||!isHeight(c.d))return null;
 const ranked=fieldRank(c),leader=ranked.find(x=>x.H>0)||ranked[0],st=c.state.get(String(q.r.id));
 const atHeight=(st?.hm.get(q.H)||[]).length;
 const attempt=q.a||0;
 const third=attempt===3;
 const clearForLead=leader&&String(leader.r.id)!==String(q.r.id)&&Number(q.H)>=Number(leader.H||0);
 return{attempt,third,atHeight,clearForLead,leader};
}
function attemptContext(c,q){
 if(!q)return'';
 const ranked=fieldRank(c),idx=Math.max(0,ranked.findIndex(x=>String(x.r.id)===String(q.r.id))),st=c.state.get(String(q.r.id)),family=fieldFamily(c.d),info=fieldRoundInfo(c,q);
 let detail='',headline=family==='height'?'CURRENT HEIGHT':info.final?'FINAL ROUND':'CURRENT ATHLETE',extraClass=info.final?' final-round':'';
 if(isHeight(c.d)){
  const hs=highJumpAttemptState(c,q);
  headline=hs?.third?'MUST CLEAR':'CURRENT HEIGHT';
  extraClass+=hs?.third?' must-clear':'';
  detail=q.a===0?`${fmt(c.d,q.H)} · PASS`:`${fmt(c.d,q.H)} · Attempt ${q.a}${hs?.third?' · Final attempt':''}${hs?.clearForLead?' · Clear = provisional lead':''}`;
 }else{
  const target=fieldLeadTarget(c,q);
  detail=`Round ${info.round}/${info.max}${st?.best!=null?` · Best ${fmt(c.d,st.best)}`:''}${target!=null?` · Needs ${fmt(c.d,target)} for lead`:''}`;
 }
 return`<div class="lv4-attempt-card${extraClass}"><small>${headline}</small><strong>${E(q.r.name)}</strong><span>${ordinal(idx+1)} · ${E(detail)}</span></div>`
}
'''
js = replace_between(js, start, end, attempt_context, 'attempt context')

# Replace the jumps renderers. Long Jump and Triple Jump now have separate geometry and choreography.
start = 'function horizontalSvg(c,q,p)'
end = 'function fieldSvg(c)'
jumps = r'''function horizontalJumpScale(d){return isTripleJump(d)?19:9}
function horizontalJumpTicks(d){return isTripleJump(d)?[12,14,16,18]:[5,6,7,8,9]}
function horizontalBestMarkers(c,boardX,pitX,pitW,max){
 const best=fieldRank(c).filter(x=>x.best!=null).slice(0,3);
 return best.map((x,i)=>{const ratio=Math.max(.02,Math.min(1,x.best/max)),px=pitX+pitW*ratio;return`<g class="lv44-jump-best ${i===0?'leader':''}"><line x1="${px}" y1="188" x2="${px}" y2="312" stroke="${colour(x.r.nation)}"/><circle cx="${px}" cy="320" r="${i===0?4:3}" fill="${colour(x.r.nation)}"/><text x="${px}" y="337" text-anchor="middle">${E(shortName(x.r.name))} ${E(fmt(c.d,x.best))}</text></g>`}).join('')
}
function horizontalJumpPhase(c,p){
 if(c.phase==='prep')return'APPROACH';
 if(c.phase==='res')return c.seq[c.i]?.f?'FOUL':'LANDING';
 if(!isTripleJump(c.d))return p<.56?'APPROACH':'FLIGHT';
 if(p<.50)return'APPROACH';
 if(p<.67)return'HOP';
 if(p<.82)return'STEP';
 return'JUMP'
}
function horizontalSvg(c,q,p){
 const triple=isTripleJump(c.d),max=horizontalJumpScale(c.d),x0=58,boardX=triple?286:438,pitX=triple?520:490,pitW=214,land=q?.m,ratio=Number.isFinite(land)?Math.max(.02,Math.min(1,land/max)):.04,xLand=pitX+pitW*ratio;
 let x=x0,y=250;
 if(c.phase==='act'){
  const runEnd=triple?.50:.56;
  if(p<runEnd){const z=p/runEnd;x=x0+(boardX-x0)*z;y=250}
  else if(!triple){const z=(p-runEnd)/(1-runEnd);x=boardX+(xLand-boardX)*z;y=250-48*Math.sin(Math.PI*z)}
  else{
   const z=(p-runEnd)/(1-runEnd);
   if(z<.34){const u=z/.34;x=boardX+(pitX-boardX)*.43*u;y=250-22*Math.sin(Math.PI*u)}
   else if(z<.66){const u=(z-.34)/.32;x=boardX+(pitX-boardX)*(.43+.36*u);y=250-17*Math.sin(Math.PI*u)}
   else{const u=(z-.66)/.34,xStart=boardX+(pitX-boardX)*.79;x=xStart+(xLand-xStart)*u;y=250-43*Math.sin(Math.PI*u)}
  }
 }else if(c.phase==='res'){x=q?.f?boardX+8:xLand;y=250}
 const ticks=horizontalJumpTicks(c.d).map(m=>{const tx=pitX+pitW*Math.max(0,Math.min(1,m/max));return`<g class="lv44-jump-tick"><line x1="${tx}" y1="190" x2="${tx}" y2="310"/><text x="${tx}" y="205" text-anchor="middle">${m}m</text></g>`}).join('');
 const phase=horizontalJumpPhase(c,p),foul=q?.f&&c.phase==='res';
 return`<svg class="v3svg lv4-svg lv44-horizontal ${triple?'triple':'long'}" viewBox="0 0 760 455"><rect width="760" height="455" fill="#173e31"/><rect x="35" y="220" width="${pitX-35}" height="60" rx="4" class="lv44-runway"/><line x1="${boardX}" y1="211" x2="${boardX}" y2="289" class="lv44-takeoff-board ${foul?'foul':''}"/><rect x="${pitX}" y="180" width="${pitW+18}" height="140" rx="10" class="lv44-sand"/>${ticks}${horizontalBestMarkers(c,boardX,pitX,pitW,max)}<g class="lv4-athlete ${q?.r.nation===myNation()?'ours':''}"><circle class="lv4-athlete-ring" cx="${x}" cy="${y}" r="12"/><circle class="lv4-athlete-dot" cx="${x}" cy="${y}" r="8" fill="${colour(q?.r.nation)}"/></g><g class="lv44-jump-phase"><rect x="64" y="64" width="92" height="31" rx="6"/><text x="110" y="84" text-anchor="middle">${phase}</text></g>${c.phase==='res'&&!q?.f?`<line x1="${boardX}" y1="${y}" x2="${xLand}" y2="${y}" class="lv4-measure"/><path d="M${xLand-8} 244 Q${xLand} 257 ${xLand+9} 244" class="lv44-sand-mark"/><g class="lv4-distance-pop" transform="translate(${Math.min(690,xLand)} 161)"><rect x="-38" y="-14" width="76" height="24" rx="5"/><text text-anchor="middle" y="3">${E(fmt(c.d,q?.m))}</text></g>`:''}${foul?'<g class="lv44-foul-pop"><rect x="530" y="132" width="118" height="38" rx="8"/><text x="589" y="156" text-anchor="middle">FOUL</text></g>':''}${officialsSvg([[boardX+14,336],[706,342]])}</svg>`
}
function highJumpSvg(c,q,p){
 const H=q?.H||c.e.engine?.[c.d]?.openingHeight||2,y=Math.max(108,Math.min(285,305-(H-1.5)*155)),resP=c.phase==='res'?Math.min(1,c.t/.62):0,pass=q?.o==='-',miss=q?.o==='X'&&c.phase==='res',third=q?.a===3;
 let x=110,ay=354;
 if(pass){x=116;ay=354}
 else if(c.phase==='act'){
  if(p<.66){const z=p/.66;x=110+425*z;ay=354-104*z+34*Math.sin(Math.PI*z)}
  else{const z=(p-.66)/.34;x=535+128*z;ay=y+36-76*Math.sin(Math.PI*z)+48*z}
 }else if(c.phase==='res'){x=654;ay=316}
 const leftY=miss?y+3*resP:y,rightY=miss?y+34*resP:y,barOpacity=miss?1-.24*resP:1;
 const ranked=fieldRank(c),idx=Math.max(0,ranked.findIndex(v=>String(v.r.id)===String(q?.r.id))),result=q?.o==='O'?(third?'CLEAR · ALIVE':'CLEAR'):pass?'PASS':third?'OUT':'MISS';
 const marks=(c.state.get(String(q?.r.id))?.hm.get(H)||[]).join('')||'—';
 return`<svg class="v3svg lv4-svg lv44-highjump" viewBox="0 0 760 455"><rect width="760" height="455" fill="#173f31"/><path d="M68 373 C250 397 407 344 529 244" class="lv44-hj-approach"/><rect x="558" y="269" width="164" height="96" rx="12" class="lv44-hj-mat"/><rect x="568" y="278" width="144" height="77" rx="9" class="lv44-hj-mat-inner"/><line x1="538" y1="88" x2="538" y2="368" class="lv44-upright"/><line x1="714" y1="88" x2="714" y2="368" class="lv44-upright"/><line x1="538" y1="${leftY}" x2="714" y2="${rightY}" class="lv44-high-bar ${miss?'falling':''}" opacity="${barOpacity}"/><g class="lv4-athlete ${q?.r.nation===myNation()?'ours':''}"><circle class="lv4-athlete-ring" cx="${x}" cy="${ay}" r="12"/><circle class="lv4-athlete-dot" cx="${x}" cy="${ay}" r="8" fill="${colour(q?.r.nation)}"/></g><g class="lv4-height-board"><rect x="575" y="50" width="102" height="38" rx="7"/><text x="626" y="69" text-anchor="middle">${E(fmt(c.d,H))}</text><text x="626" y="80" text-anchor="middle" class="lv44-height-sub">ATTEMPT ${q?.a||'PASS'}</text></g><g class="lv44-hj-status ${third?'danger':''}"><rect x="71" y="62" width="155" height="46" rx="7"/><text x="84" y="79">${third?'MUST CLEAR':'CURRENT ATTEMPT'}</text><text x="84" y="97">${E(shortName(q?.r.name))} · ${ordinal(idx+1)} · ${E(marks)}</text></g>${c.phase==='res'?`<g class="lv4-result-pop ${q?.o==='O'?'clear':'miss'} ${third&&q?.o==='X'?'out':''}"><rect x="290" y="38" width="178" height="42" rx="8"/><text x="379" y="64" text-anchor="middle">${result}</text></g>`:''}${officialsSvg([[522,390],[730,389]])}</svg>`
}
'''
js = replace_between(js, start, end, jumps, 'jump renderers')

# High Jump commentary: third-attempt clears survive; third misses eliminate.
old = "if(isHeight(c.d))queueSpeech(c,q.o==='O'?`${q.r.name} clears ${fmt(c.d,q.H)}.`:q.o==='X'?`${q.r.name} misses at ${fmt(c.d,q.H)}.`:`${q.r.name} passes at ${fmt(c.d,q.H)}.`,q.o==='O'?75:45,q.o==='O');"
new = "if(isHeight(c.d)){const hjText=q.o==='O'?(q.a===3?`${q.r.name} gets it on the third attempt at ${fmt(c.d,q.H)} and stays alive.`:`${q.r.name} clears ${fmt(c.d,q.H)}.`):q.o==='X'?(q.a===3?`${q.r.name} misses at ${fmt(c.d,q.H)} and is out of the competition.`:`${q.r.name} misses at ${fmt(c.d,q.H)}.`):`${q.r.name} passes at ${fmt(c.d,q.H)}.`;queueSpeech(c,hjText,q.o==='O'?q.a===3?88:75:q.a===3?78:45,q.o==='O'||q.a===3)}"
if old not in js:
    raise SystemExit('Patch anchor missing: high jump commentary')
js = js.replace(old, new, 1)

# Scoreboard row carries a real third-attempt warning without changing results.
old = "el.classList.toggle('position-change',!!x.moved);"
new = "el.classList.toggle('position-change',!!x.moved);el.classList.toggle('hj-danger',!!x.danger);"
if old not in js:
    raise SystemExit('Patch anchor missing: scoreboard row class')
js = js.replace(old, new, 1)

# High Jump phase text should make third attempts unmistakable.
old = "if(isHeight(c.d))return q?.H?`${fmt(c.d,q.H)} · A${q.a||'-'}`:'HIGH JUMP';"
new = "if(isHeight(c.d))return q?.H?(q.a===3?`${fmt(c.d,q.H)} · MUST CLEAR`:`${fmt(c.d,q.H)} · A${q.a||'-'}`):'HIGH JUMP';"
if old not in js:
    raise SystemExit('Patch anchor missing: height phase')
js = js.replace(old, new, 1)

js = js.replace("version:'4.3.0'", "version:'4.4.0'", 1)
js = js.replace("renderer:'Broadcast V4.1 Track'", "renderer:'Broadcast V4.4 Jumps'", 1)
js_path.write_text(js, encoding='utf-8')

css = css_path.read_text(encoding='utf-8')
marker = '/* ===== Live Event Broadcast V4.4 — Jumps ===== */'
if marker not in css:
    css += r'''

/* ===== Live Event Broadcast V4.4 — Jumps ===== */
.lv44-runway{fill:#8a4d54;stroke:#d8dad5;stroke-opacity:.14}.lv44-takeoff-board{stroke:#f8f6ef;stroke-width:6}.lv44-takeoff-board.foul{stroke:#ff7084;filter:drop-shadow(0 0 5px rgba(255,112,132,.55))}.lv44-sand{fill:#d6bf85;stroke:#edd9a6;stroke-opacity:.3}.lv44-jump-tick line{stroke:#75643f;stroke-opacity:.38;stroke-width:1}.lv44-jump-tick text{fill:#66583b;font-size:7px;font-weight:950}.lv44-jump-best line{stroke-width:2;stroke-opacity:.55;stroke-dasharray:4 4}.lv44-jump-best.leader line{stroke-width:3;stroke-opacity:.95}.lv44-jump-best text{fill:#f0e6ce;font-size:6px;font-weight:950;paint-order:stroke;stroke:#715f3a;stroke-width:2}.lv44-sand-mark{fill:none;stroke:#765f36;stroke-width:3;stroke-linecap:round;opacity:.8}.lv44-jump-phase rect{fill:#06131ee8;stroke:#91b0bf;stroke-opacity:.25}.lv44-jump-phase text{fill:#dce9ed;font-size:7px;font-weight:1000;letter-spacing:.12em}.lv44-foul-pop rect{fill:#2b1017e8;stroke:#ff7588;stroke-opacity:.72}.lv44-foul-pop text{fill:#ff9baa;font-size:12px;font-weight:1000;letter-spacing:.08em}.lv4-attempt-card.must-clear{border-color:rgba(255,133,151,.52);box-shadow:0 10px 28px rgba(0,0,0,.24),inset 0 2px 0 rgba(255,133,151,.22)}.lv4-attempt-card.must-clear small{color:#ff9aaa}.lv4-attempt-card.final-round:not(.must-clear){border-color:rgba(233,196,107,.34);box-shadow:0 10px 28px rgba(0,0,0,.22),inset 0 2px 0 rgba(233,196,107,.13)}
.lv44-hj-approach{fill:none;stroke:#91515a;stroke-width:68;stroke-linecap:round}.lv44-hj-mat{fill:#2e6eaa;stroke:#90b9dc;stroke-opacity:.55}.lv44-hj-mat-inner{fill:#4b86c1;stroke:#a4c9e7;stroke-opacity:.45}.lv44-upright{stroke:#f5f5ef;stroke-width:4}.lv44-high-bar{stroke:#f3dc79;stroke-width:4;stroke-linecap:round;filter:drop-shadow(0 1px 2px rgba(0,0,0,.38))}.lv44-high-bar.falling{stroke:#f0cf6e}.lv44-height-sub{font-size:6px!important;fill:#7897a7!important;letter-spacing:.08em}.lv44-hj-status rect{fill:#06131ee8;stroke:#96b3c2;stroke-opacity:.26}.lv44-hj-status text{fill:#7899aa;font-size:6px;font-weight:950;letter-spacing:.08em}.lv44-hj-status text+text{fill:#e7f0f3;font-size:8px;letter-spacing:.02em}.lv44-hj-status.danger rect{stroke:#ff8597;stroke-opacity:.6}.lv44-hj-status.danger text:first-of-type{fill:#ff99a8}.lv4-result-pop.out rect{fill:#291018e8;stroke:#ff7387;stroke-opacity:.76}.lv4-result-pop.out text{fill:#ff9aaa}.lv4-board-row.hj-danger:not(.leader){background:rgba(255,117,136,.045);box-shadow:inset 2px 0 rgba(255,117,136,.75)}
@media(max-width:700px){.lv44-jump-best text{display:none}.lv44-hj-status{transform:translate(-18px 4px) scale(.88)}.lv44-jump-phase{transform:translate(-20px 2px) scale(.9)}.lv4-attempt-card.must-clear{min-width:84%}}
@media(prefers-reduced-motion:reduce){.lv44-high-bar,.lv44-takeoff-board{transition:none!important}}
/* ===== End Live Event Broadcast V4.4 — Jumps ===== */
'''
css_path.write_text(css, encoding='utf-8')

html = html_path.read_text(encoding='utf-8')
html = html.replace('styles/live-event-broadcast-v4.css?v=20260911-broadcast4', 'styles/live-event-broadcast-v4.css?v=20260911-broadcast44')
html = html.replace('scripts/live-event-broadcast-v4.js?v=20260911-broadcast4', 'scripts/live-event-broadcast-v4.js?v=20260911-broadcast44')
html_path.write_text(html, encoding='utf-8')

gate = gate_path.read_text(encoding='utf-8')
gate = gate.replace('# Live Event Broadcast V4.2 distance phase is validated by this gate.', '# Live Event Broadcast V4.4 jumps phase is validated by this gate.')
gate = gate.replace('Validate Live Event Broadcast V4.3', 'Validate Live Event Broadcast V4.4')
# Extend the existing contract block, preserving previous track/distance/field guards.
anchor = "          grep -q 'function fieldPreAttemptSpeech(c,q)' scripts/live-event-broadcast-v4.js\n"
checks = "          grep -q 'function horizontalJumpScale(d)' scripts/live-event-broadcast-v4.js\n          grep -q 'function horizontalJumpPhase(c,p)' scripts/live-event-broadcast-v4.js\n          grep -q 'function highJumpAttemptState(c,q)' scripts/live-event-broadcast-v4.js\n          grep -q 'function highJumpSvg(c,q,p)' scripts/live-event-broadcast-v4.js\n          grep -q \"version:'4.4.0'\" scripts/live-event-broadcast-v4.js\n"
if checks.strip() not in gate:
    if anchor not in gate:
        raise SystemExit('Patch anchor missing: UI regression field contract')
    gate = gate.replace(anchor, anchor + checks, 1)
gate_path.write_text(gate, encoding='utf-8')

print('Applied Live Event Broadcast V4.4 jumps phase')
