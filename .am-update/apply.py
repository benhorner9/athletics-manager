from pathlib import Path
import re

relay_path=Path('scripts/relay-v1.js')
broadcast_path=Path('scripts/live-event-broadcast-v4.js')
reg_path=Path('tools/static-regression.mjs')
html_path=Path('game.html')
relay=relay_path.read_text(encoding='utf-8')
broadcast=broadcast_path.read_text(encoding='utf-8')
reg=reg_path.read_text(encoding='utf-8')
html=html_path.read_text(encoding='utf-8')

# Relay gameplay stays authoritative; only the bespoke live-event presentation is retired.
relay=relay.replace('   - Nation/team records and a dedicated live relay presentation.','   - Nation/team records with native Broadcast V4 sprint presentation and exchange handovers.')
old_team="""function teamObject(nation,d,lineup=null){
 const ids=(lineup||[]).map(a=>a.id);return {id:`relay:${s.game.season}:${d}:${nation}`,name:`${safe(()=>nationName(nation),nation)} 4×100m`,nation,relay:true,relayDisc:d,relayRoster:ids,relayLineup:lineup||[],overall:lineup?.length?avg(lineup.map(a=>num(a.overall,75))):80,fitness:lineup?.length?avg(lineup.map(a=>num(a.fitness,90))):92,form:lineup?.length?avg(lineup.map(a=>num(a.form,85))):86,fatigue:lineup?.length?avg(lineup.map(a=>num(a.fatigue,20))):18};
}
"""
new_team="""function teamObject(nation,d,lineup=null,visualLineup=null){
 const ids=(lineup||[]).map(a=>a.id),visual=(visualLineup||lineup||[]).filter(Boolean).slice(0,4);
 return {id:`relay:${s.game.season}:${d}:${nation}`,name:`${safe(()=>nationName(nation),nation)} 4×100m`,nation,relay:true,relayDisc:d,relayRoster:ids,relayLineup:lineup||[],relayVisualLineup:visual,overall:lineup?.length?avg(lineup.map(a=>num(a.overall,75))):80,fitness:lineup?.length?avg(lineup.map(a=>num(a.fitness,90))):92,form:lineup?.length?avg(lineup.map(a=>num(a.form,85))):86,fatigue:lineup?.length?avg(lineup.map(a=>num(a.fatigue,20))):18};
}
"""
if old_team not in relay: raise SystemExit('relay teamObject contract missing')
relay=relay.replace(old_team,new_team,1)
old_rivals="rivals.forEach(x=>teams.push(teamObject(x.n,d,null)));return teams.slice(0,8);"
if old_rivals not in relay: raise SystemExit('relay rival field contract missing')
relay=relay.replace(old_rivals,"rivals.forEach(x=>teams.push(teamObject(x.n,d,null,nationCandidates(x.n,d).slice(0,4))));return teams.slice(0,8);",1)
start=relay.find('let relayRun=null;');end=relay.find('function patchSelection(){',start)
if start<0 or end<0: raise SystemExit('bespoke relay Event Day block not found')
relay=relay[:start]+relay[end:]
relay,n=re.subn(r"const baseDrawCompetition=typeof drawCompetition==='function'\?drawCompetition:null;if\(baseDrawCompetition\)drawCompetition=function\(\)\{const d=.*?requestAnimationFrame\(patchCompetitionRelay\);return out\};", "const baseDrawCompetition=typeof drawCompetition==='function'?drawCompetition:null;if(baseDrawCompetition)drawCompetition=function(){const out=baseDrawCompetition.apply(this,arguments);requestAnimationFrame(patchCompetitionRelay);return out};", relay, count=1)
if n!=1: raise SystemExit('relay drawCompetition wrapper contract missing')

# Broadcast V4 treats the relay as its normal 400m sprint geometry, with runner identity changing every 100m.
old="const isTrack=d=>type(d)==='time'&&dist(d)>0;\nconst isHeight=d=>type(d)==='height';"
if old not in broadcast: raise SystemExit('broadcast isTrack insertion point missing')
broadcast=broadcast.replace(old,"const isTrack=d=>type(d)==='time'&&dist(d)>0;\nconst isRelay=d=>!!DISCIPLINES?.[d]?.relay;\nconst isHeight=d=>type(d)==='height';",1)
old="/* ---------- Track model ---------- */\nfunction checkpoints(n)"
helpers="""/* ---------- Track model ---------- */
function relayLineupFor(r){
 const raw=r?.raw||r||{},direct=Array.isArray(raw.relayLineup)?raw.relayLineup:[],visual=Array.isArray(raw.relayVisualLineup)?raw.relayVisualLineup:[],ids=Array.isArray(raw.relayRoster)?raw.relayRoster.map(athlete).filter(Boolean):[];
 return direct.length?direct:visual.length?visual:ids
}
function relayLegIndex(m){const x=Math.max(0,Math.min(399.999,Number(m)||0));return Math.max(0,Math.min(3,Math.floor(x/100)))}
function relayRunnerAt(r,m){const line=relayLineupFor(r);return line[relayLegIndex(m)]||null}
function relayRunnerName(r,m){return relayRunnerAt(r,m)?.name||r?.name||'Relay team'}
function relayExchangeAt(m){const x=Number(m)||0;return [100,200,300].find(z=>Math.abs(x-z)<=10)||null}
function relayLegLabel(m){const i=relayLegIndex(m);return i===3?'ANCHOR':`LEG ${i+1}`}
function checkpoints(n)"""
if old not in broadcast: raise SystemExit('broadcast track helper insertion point missing')
broadcast=broadcast.replace(old,helpers,1)
old="if(c.runout!=null||c.settle!=null)return'PROVISIONAL';if(n===100)"
if old not in broadcast: raise SystemExit('broadcast sprintPhase contract missing')
broadcast=broadcast.replace(old,"if(c.runout!=null||c.settle!=null)return'PROVISIONAL';if(isRelay(c.d)){const m=state?.lead?.m||0,z=relayExchangeAt(m);if(z)return`EXCHANGE ${z/100}`;const leg=relayLegIndex(m)+1;return leg===4?'ANCHOR LEG':`LEG ${leg}`}if(n===100)",1)
old_finish=""" out+=`<line x1="${TRACK.R}" y1="${TRACK.Y+TRACK.I}" x2="${TRACK.R}" y2="${TRACK.Y+outer}" stroke="#fff" stroke-width="4"/><line x1="${TRACK.L}" y1="${TRACK.Y+TRACK.I}" x2="${TRACK.L}" y2="${TRACK.Y+outer}" stroke="#fff" stroke-opacity="${n===100?1:.24}" stroke-width="${n===100?4:2}"/>`;
 for(let l=1;l<=8;l++){const y=TRACK.Y+rad(l);out+=`<text x="${TRACK.L-12}" y="${y+3}" text-anchor="end" class="lv4-lane-number">${l}</text>`}
"""
new_finish=""" out+=`<line x1="${TRACK.R}" y1="${TRACK.Y+TRACK.I}" x2="${TRACK.R}" y2="${TRACK.Y+outer}" stroke="#fff" stroke-width="4"/><line x1="${TRACK.L}" y1="${TRACK.Y+TRACK.I}" x2="${TRACK.L}" y2="${TRACK.Y+outer}" stroke="#fff" stroke-opacity="${n===100?1:.24}" stroke-width="${n===100?4:2}"/>`;
 if(isRelay(c.d)){for(const z of [100,200,300])for(let l=1;l<=8;l++){const a=trackPos(c.d,{r:{lane:l},m:z-10,cosmetic:0},l-1),b=trackPos(c.d,{r:{lane:l},m:z+10,cosmetic:0},l-1);out+=`<path d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}" stroke="#f4c95d" stroke-opacity=".34" stroke-width="5" stroke-linecap="round"/>`}}
 for(let l=1;l<=8;l++){const y=TRACK.Y+rad(l);out+=`<text x="${TRACK.L-12}" y="${y+3}" text-anchor="end" class="lv4-lane-number">${l}</text>`}
"""
if old_finish not in broadcast: raise SystemExit('broadcast exchange-zone insertion point missing')
broadcast=broadcast.replace(old_finish,new_finish,1)
marker_pattern=r"function marker\(c,x,i,state\)\{.*?\}\nfunction distanceOverlay"
marker_new="""function marker(c,x,i,state){
 let p=trackPos(c.d,x,i);if(c.runout!=null&&x.finish&&!x.status)p=postFinishPos(c.d,x,i,8+Math.min(1,c.runout/.8)*30);
 const ours=x.r.nation===myNation(),leader=x.pos===1&&!x.status,n=dist(c.d),relay=isRelay(c.d),runner=relay?relayRunnerAt(x.r,x.m):null,displayName=runner?.name||x.r.name,showLabel=c.intro>0||ours||leader||x.pos<=3||state?.p<.08;
 const lane=n<=800?`L${x.r.lane}${relay?' · '+relayLegLabel(x.m):''}`:nation(x.r.nation);
 let partner='';
 if(relay){const z=relayExchangeAt(x.m);if(z){const before=x.m<z,ghostM=before?z+6:z-6,g=trackPos(c.d,{...x,m:ghostM},i),dx=(g.x-p.x).toFixed(1),dy=(g.y-p.y).toFixed(1);partner=`<g class="lv4-relay-partner" transform="translate(${dx} ${dy})" opacity=".42"><circle r="7" fill="${colour(x.r.nation)}" stroke="#fff" stroke-opacity=".55" stroke-width="1.5"/></g>`}}
 return`<g class="lv4-athlete ${ours?'ours':''} ${leader?'leader':''} ${x.status?'inactive':''} ${relay?'relay-runner':''}" data-run="${E(x.r.id)}" transform="translate(${p.x} ${p.y})">${partner}<circle class="lv4-athlete-ring" r="${ours?13:leader?11:10}"/><circle class="lv4-athlete-dot" r="${ours?9:8}" fill="${colour(x.r.nation)}"/>${relay?'<rect x="7" y="-2" width="12" height="4" rx="2" fill="#f4c95d" stroke="#fff" stroke-opacity=".65" stroke-width=".7"/>':''}${ours?'<path class="lv4-player-pin" d="M0 -18 L4 -12 L-4 -12 Z"/>':''}${showLabel?`<g class="lv4-athlete-label" transform="translate(0 -18)"><rect x="-34" y="-13" width="68" height="15" rx="4"/><text text-anchor="middle" y="-3">${E(shortName(displayName))}</text><text text-anchor="middle" y="6">${E(lane)}</text></g>`:''}</g>`
}
function distanceOverlay"""
broadcast,n=re.subn(marker_pattern,marker_new,broadcast,count=1,flags=re.S)
if n!=1: raise SystemExit('broadcast marker function contract missing')
board_pattern=r"function trackBoardRows\(c,state\)\{.*?\}\nfunction photoFinish"
board_new="""function trackBoardRows(c,state){const leader=state.a.find(x=>!x.status),n=dist(c.d),leadSpeed=leader?.r?.perf?n/leader.r.perf:0,relay=isRelay(c.d);return state.a.map(x=>{let value;if(x.status)value=x.status;else if(x.finish)value=fmt(c.d,x.r.perf);else if(leader&&x!==leader){const gap=Math.max(0,leader.m-x.m),gapS=leadSpeed?gap/leadSpeed:0;value=gapS<.005?'+0.00':`+${gapS.toFixed(2)}`}else value='LEAD';const active=relay?relayRunnerAt(x.r,x.m):null,boardR=active?{...x.r,name:active.name}:x.r,sub=relay?`${nation(x.r.nation)} · ${relayLegLabel(x.m)}${x.r.lane?` · Lane ${x.r.lane}`:''}`:`${nation(x.r.nation)}${x.r.lane?` · Lane ${x.r.lane}`:''}`;return{id:x.r.id,pos:x.status?'—':x.pos,r:boardR,value,sub,leader:x.pos===1&&!x.status,ours:x.r.nation===myNation()}})}
function photoFinish"""
broadcast,n=re.subn(board_pattern,board_new,broadcast,count=1,flags=re.S)
if n!=1: raise SystemExit('broadcast trackBoardRows contract missing')
old_moment="function trackMomentText(c,m,top){const n=dist(c.d),a=top[0]?.r.name||'The leader',b=top[1]?.r.name||'the chasing pack',pick=(key,lines)=>speechVariant(c,`${n}-${key}`,lines);if(n===100)"
new_moment="function trackMomentText(c,m,top){const n=dist(c.d),a=top[0]?.r.name||'The leader',b=top[1]?.r.name||'the chasing pack',pick=(key,lines)=>speechVariant(c,`${n}-${key}`,lines);if(isRelay(c.d)){const lead=top[0]?.r,team=lead?nation(lead.nation):a,next=lead?relayRunnerAt(lead,Math.min(399.9,m+.1)):null;if(m<=100)return`${team} reach the first exchange in front${next?' — '+next.name+' takes the baton.':'.'}`;if(m<=200)return`${team} lead into exchange two${next?' — '+next.name+' is away with the baton.':'.'}`;if(m<=300)return`${team} have the advantage at the final changeover${next?' — '+next.name+' takes the anchor leg.':'.'}`;return`${team} reach the line first.`}if(n===100)"
if old_moment not in broadcast: raise SystemExit('broadcast trackMomentText contract missing')
broadcast=broadcast.replace(old_moment,new_moment,1)
old_lead="function leadChangeReady(c){const n=dist(c.d),m=c.state?.lead?.m||0;return n===100?m>15:n===200?m>95:n===400?m>235:m>n*.12}"
if old_lead not in broadcast: raise SystemExit('broadcast leadChangeReady contract missing')
broadcast=broadcast.replace(old_lead,"function leadChangeReady(c){const n=dist(c.d),m=c.state?.lead?.m||0;if(isRelay(c.d))return m>15;return n===100?m>15:n===200?m>95:n===400?m>235:m>n*.12}",1)

# Lock the presentation architecture in regression checks.
needle="if(!html.includes('styles/relay-v1.css'))fail('Relay V1 stylesheet is not loaded.');\n"
if needle not in reg: raise SystemExit('static regression relay insertion point missing')
reg=reg.replace(needle,needle+"const relayPresentation=read('scripts/relay-v1.js');\nif(relayPresentation.includes('function renderRelayDiscipline'))fail('Relay V1 must use the canonical Broadcast V4 sprint presentation, not a bespoke Event Day renderer.');\n",1)
old_contract="['function trackMomentText(c,m,top)','Sprint-specific commentary is missing'],"
if old_contract not in reg: raise SystemExit('static regression broadcast contract missing')
reg=reg.replace(old_contract,old_contract+"\n  ['function relayRunnerAt(r,m)','Relay baton-holder transition model is missing'],\n  ['function relayExchangeAt(m)','Relay exchange-zone choreography is missing'],",1)

# Cache-bust the exact current dev assets.
for old,new in [
 ('scripts/live-event-broadcast-v4.js?v=20260913-audit4','scripts/live-event-broadcast-v4.js?v=20260913-broadcast-relay1'),
 ('scripts/relay-v1.js?v=20260913-relay3','scripts/relay-v1.js?v=20260913-relay4')
]:
 if old not in html: raise SystemExit(f'asset cache contract missing: {old}')
 html=html.replace(old,new,1)

relay_path.write_text(relay,encoding='utf-8')
broadcast_path.write_text(broadcast,encoding='utf-8')
reg_path.write_text(reg,encoding='utf-8')
html_path.write_text(html,encoding='utf-8')
print('Relay V1 now uses Broadcast V4 sprint visuals with runner handovers at 100m, 200m and 300m.')
