from pathlib import Path


def require(text, needle, label):
    if needle not in text:
        raise SystemExit(f'Patch anchor missing: {label}')


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

js = js_path.read_text(encoding='utf-8')

# Performance-moment helpers. They only consume official result metadata / existing record stores.
anchor = "function records(r){return(r?.achievements||[]).map(x=>String(x).toUpperCase()).filter(x=>['SB','PB','NR','CR','WR'].includes(x))}"
require(js, anchor, 'records helper')
helpers = r'''
function achievementPriority(code){return({WR:100,CR:90,NR:85,PB:70,SB:55})[String(code||'').toUpperCase()]||0}
function bestAchievement(r){return records(r).sort((a,b)=>achievementPriority(b)-achievementPriority(a))[0]||''}
function achievementText(code){return({WR:'WORLD RECORD',CR:'CHAMPIONSHIP RECORD',NR:'NATIONAL RECORD',PB:'PERSONAL BEST',SB:'SEASON BEST'})[code]||code}
function recordNumber(entry){
 if(entry==null)return null;
 if(Number.isFinite(Number(entry)))return Number(entry);
 for(const k of ['perf','mark','value','record','best'])if(Number.isFinite(Number(entry?.[k])))return Number(entry[k]);
 return null
}
function recordReference(d,e,kind='WR'){
 const st=typeof s!=='undefined'?s:null,n=myNation(),k=String(kind).toUpperCase();
 const sources=[];
 if(k==='WR'){
  sources.push(st?.worldRecords?.[d],st?.records?.world?.[d],st?.records?.WR?.[d],st?.recordBook?.world?.[d]);
  if(typeof WORLD_RECORDS!=='undefined')sources.push(WORLD_RECORDS?.[d])
 }else if(k==='NR')sources.push(st?.nationalRecords?.[n]?.[d],st?.records?.national?.[n]?.[d],st?.records?.NR?.[n]?.[d]);
 else if(k==='CR')sources.push(e?.records?.[d],e?.championshipRecords?.[d],st?.championshipRecords?.[e?.id]?.[d],st?.records?.championship?.[e?.id]?.[d]);
 for(const src of sources){const value=recordNumber(src);if(value!=null)return{code:k,value,raw:src}}
 return null
}
function championTitle(e){const t=`${e?.kind||''} ${e?.level||''} ${e?.name||''}`.toLowerCase();if(/olympic/.test(t))return'OLYMPIC CHAMPION';if(/world championship/.test(t))return'WORLD CHAMPION';if(/world cup/.test(t))return'WORLD CUP WINNER';if(/national championship/.test(t))return'NATIONAL CHAMPION';if(/summit/.test(t))return'SUMMIT SERIES WINNER';return'EVENT WINNER'}
function officialRows(e,d,fallback=[]){return Array.isArray(e?.results?.[d])?rowsFor(e.results[d]):rowsFor(fallback)}
function performanceMoment(rows){let best=null;for(const r of rows){const code=bestAchievement(r.raw);if(!code)continue;const p=achievementPriority(code);if(!best||p>best.priority)best={code,priority:p,row:r}}return best}
function officialMomentSpeech(e,d,rows){const m=performanceMoment(rows);if(m)return`${m.row.name} — ${achievementText(m.code).toLowerCase()} with ${fmt(d,m.row.perf)}.`;const winner=rows.find(x=>!x.status);if(!winner)return'';return`${winner.name} is confirmed as ${championTitle(e).toLowerCase()} in the ${label(d)}.`}
function nextDiscipline(e,ds,current){const idx=Math.max(0,ds.indexOf(current));return ds.slice(idx+1).concat(ds.slice(0,idx)).find(x=>!Array.isArray(e.results?.[x]))||null}
'''
if 'function achievementPriority(code)' not in js:
    js = js.replace(anchor, anchor + helpers, 1)

# Record-reference markers for throws and horizontal jumps. Render only when authoritative data exists.
marker_anchor = 'function fieldBestMarkers(c,family)'
require(js, marker_anchor, 'field marker helper')
insert_at = js.find('function throwSvg(c,q,p,family)', js.find(marker_anchor))
if insert_at < 0:
    raise SystemExit('Patch anchor missing: throw svg')
if 'function fieldRecordMarker(c,family)' not in js:
    marker_helpers = r'''function fieldRecordMarker(c,family){
 const ref=recordReference(c.d,c.e,'WR');if(!ref||isHeight(c.d)||family==='horizontal')return'';
 const max=scaleFor(family),ratio=Math.max(.03,Math.min(1,ref.value/max)),px=148+545*ratio,half=180*ratio;
 return`<g class="lv45-record-line"><line x1="${px}" y1="${272-half+10}" x2="${px}" y2="${272+half-10}"/><text x="${px}" y="${272-half-3}" text-anchor="middle">WR ${E(fmt(c.d,ref.value))}</text></g>`
}
function horizontalRecordMarker(c,pitX,pitW,max){
 const ref=recordReference(c.d,c.e,'WR');if(!ref)return'';const px=pitX+pitW*Math.max(.02,Math.min(1,ref.value/max));
 return`<g class="lv45-record-line"><line x1="${px}" y1="181" x2="${px}" y2="319"/><text x="${px}" y="171" text-anchor="middle">WR ${E(fmt(c.d,ref.value))}</text></g>`
}
'''
    js = js[:insert_at] + marker_helpers + js[insert_at:]

old = '${grids}${fieldBestMarkers(c,family)}${leaderRatio!=null?'
require(js, old, 'throw markers composition')
js = js.replace(old, '${grids}${fieldBestMarkers(c,family)}${fieldRecordMarker(c,family)}${leaderRatio!=null?', 1)

old = '${ticks}${horizontalBestMarkers(c,boardX,pitX,pitW,max)}<g class="lv4-athlete'
require(js, old, 'horizontal markers composition')
js = js.replace(old, '${ticks}${horizontalBestMarkers(c,boardX,pitX,pitW,max)}${horizontalRecordMarker(c,pitX,pitW,max)}<g class="lv4-athlete', 1)

# Championship introductions remain short but carry event stakes.
start = 'function introHTML(c)'
end = 'function broadcastBug(c)'
intro = r'''function introHTML(c){
 if(c.intro<=0)return'';
 const champ=c.tier==='championship',major=c.tier==='major',stake=champ?championTitle(c.e):major?'MAJOR FINAL':'LIVE ATHLETICS';
 if(c.kind==='track'){
  const set=c.intro<.38;
  return`<div class="lv4-intro ${set?'set':''} ${champ?'lv45-champ-intro':''}"><div>${!set&&champ?'<span class="lv45-champ-kicker">CHAMPIONSHIP BROADCAST</span>':''}<small>${E(c.e.level||c.e.kind||'LIVE ATHLETICS')} · ${E(c.e.name||'MEETING')}</small><h2>${set?'SET':E(label(c.d))}</h2>${set?'<div class="lv4-set-line"></div>':`${champ?`<p class="lv45-stakes">${E(stake)}</p>`:''}<div class="lv4-start-list">${c.rr.map(x=>`<span class="${x.nation===myNation()?'ours':''}"><b>${x.lane}</b><i style="background:${colour(x.nation)}"></i><strong>${E(shortName(x.name))}</strong><em>${E(x.nation)}</em></span>`).join('')}</div>`}</div></div>`
 }
 const q=c.seq[c.i]||c.seq[0];
 return`<div class="lv4-intro ${champ?'lv45-champ-intro':''}"><div>${champ?'<span class="lv45-champ-kicker">CHAMPIONSHIP BROADCAST</span>':''}<small>${E(c.e.level||c.e.kind||'LIVE ATHLETICS')} · ${E(c.e.name||'MEETING')}</small><h2>${E(label(c.d))}</h2>${champ?`<p class="lv45-stakes">${E(stake)}</p>`:''}<p>${q?`${E(q.r.name)} opens the live sequence.`:`${c.seq.length} attempts scheduled.`}</p></div></div>`
}
'''
js = replace_between(js, start, end, intro, 'intro HTML')

# Photo finish gets championship-level treatment without increasing the delay.
old = "function photoHTML(c){return c.photo!=null?'<div class=\"lv4-photo\"><small>FINISH UNDER REVIEW</small><strong>PHOTO</strong><span>Official order in a moment</span></div>':''}"
require(js, old, 'photo HTML')
new = "function photoHTML(c){if(c.photo==null)return'';const champ=c.tier==='championship';return`<div class=\"lv4-photo ${champ?'lv45-champ-photo':''}\"><small>${champ?'CHAMPIONSHIP FINISH UNDER REVIEW':'FINISH UNDER REVIEW'}</small><strong>PHOTO</strong><span>${champ?'Medal order pending':'Official order in a moment'}</span></div>`}"
js = js.replace(old, new, 1)

# Performance moment graphic during the official result state.
start = 'function finalVisual(e,d,r)'
end = '/* ---------- Commentary ---------- */'
final_visual = r'''function finalMomentHTML(e,d,a){
 const moment=performanceMoment(a),winner=a.find(x=>!x.status)||a[0];if(!winner)return'';
 if(moment)return`<div class="lv45-performance-moment ${moment.code.toLowerCase()}"><small>${E(achievementText(moment.code))}</small><strong>${E(moment.row.name)}</strong><span>${E(fmt(d,moment.row.perf))}</span></div>`;
 if(presentationTier(e)==='championship')return`<div class="lv45-performance-moment champion"><small>${E(championTitle(e))}</small><strong>${E(winner.name)}</strong><span>${E(fmt(d,winner.perf))}</span></div>`;
 return''
}
function medalLabel(e,i){if(presentationTier(e)!=='championship'||i>2)return'';return['GOLD','SILVER','BRONZE'][i]||''}
function finalVisual(e,d,r){
 const a=rowsFor(r),winner=a.find(x=>!x.status)||a[0],champ=presentationTier(e)==='championship';
 return`<div class="v3stage lv4-stage lv4-final-stage ${champ?'lv45-champ-final':''}"><div class="v3top lv4-top"><div><small>${champ?'CHAMPIONSHIP RESULT':'OFFICIAL RESULT'}</small><strong>${E(label(d))}</strong></div><b>FINAL</b></div><div class="v3final lv4-final">${a.map((x,i)=>`<div class="${x.nation===myNation()?'ours':''} ${i<3&&champ?'medal medal-'+(i+1):''}"><b>${x.status?'—':i+1}</b><i style="background:${colour(x.nation)}"></i><strong>${E(x.name)}<small>${E(x.nation)}${medalLabel(e,i)?` · ${medalLabel(e,i)}`:''}</small></strong><span>${E(x.status||fmt(d,x.perf))}${records(x.raw).map(z=>` <em class="lv45-result-tag ${z.toLowerCase()}">${E(z)}</em>`).join('')}</span></div>`).join('')}</div>${finalMomentHTML(e,d,a)}<div class="lv4-final-banner ${champ?'lv45-winner-banner':''}"><small>${E(champ?championTitle(e):'OFFICIAL')}</small><strong>${E(winner?.name||'Result confirmed')}</strong><span>${E(winner?.status||fmt(d,winner?.perf))}</span></div></div>`
}

'''
js = replace_between(js, start, end, final_visual, 'final visual')

# Add official record/champion commentary after commit, before releasing live state.
old = "function finish(c){if(live!==c)return;c.done();disciplineRunning=false;live=null;liveEventView=null;activeEventDisc=c.d;competitionMode='discipline';drawCompetition()}"
require(js, old, 'finish')
new = r'''function finish(c){
 if(live!==c)return;
 c.done();
 const rows=officialRows(c.e,c.d,c.r),speech=officialMomentSpeech(c.e,c.d,rows);
 if(speech){c.e.commentary??={};c.e.commentary[c.d]??=[];if(!c.e.commentary[c.d].includes(speech))c.e.commentary[c.d].push(speech)}
 disciplineRunning=false;live=null;liveEventView=null;activeEventDisc=c.d;competitionMode='discipline';saveNow();drawCompetition()
}'''
js = js.replace(old, new, 1)

# Result screen primary action becomes meaningful: next discipline, or complete the competition.
old = "const start=$('v3start');if(start&&!r)start.onclick=()=>e._v3Summit?startSummitDiscipline(e._v3Summit,d):startDiscipline(e,d);"
require(js, old, 'result primary action')
new = r'''const start=$('v3start');
 if(start){
  if(!r)start.onclick=()=>e._v3Summit?startSummitDiscipline(e._v3Summit,d):startDiscipline(e,d);
  else{
   const next=nextDiscipline(e,ds,d);start.disabled=false;
   if(next){start.textContent='NEXT EVENT';start.onclick=()=>{activeEventDisc=next;competitionMode='discipline';drawCompetition()}}
   else{start.textContent=e.completed?'COMPLETE COMPETITION':'EVENT DAY';start.onclick=()=>{if(e.completed){activeEventDisc=null;competitionMode='overview';if(e._v3Summit){try{summitLiveMeetingNumber=null}catch(_){};view('league')}else if(typeof returnFromCompletedEvent==='function')returnFromCompletedEvent();else view('home')}else{competitionMode='overview';drawCompetition()}}}
  }
 }'''
js = js.replace(old, new, 1)

# Upgrade diagnostics/version.
require(js, "version:'4.4.0'", 'version')
js = js.replace("version:'4.4.0'", "version:'4.5.0'", 1)
js = js.replace("renderer:'Broadcast V4.4 Jumps'", "renderer:'Broadcast V4.5 Championship'", 1)

js_path.write_text(js, encoding='utf-8')

# V4.5 styling is additive and stays within the current Athletics Manager broadcast language.
css = css_path.read_text(encoding='utf-8')
if '/* V4.5 — Championship & performance moments */' not in css:
    css += r'''

/* V4.5 — Championship & performance moments */
#competition .lv4event.lv4-championship{background:radial-gradient(circle at 50% 0,rgba(191,157,73,.09),transparent 34%),radial-gradient(circle at 38% 15%,rgba(25,65,84,.22),transparent 36%),linear-gradient(180deg,#06131d,#030b11)}
.lv45-champ-intro>div{border-color:rgba(233,196,107,.34);box-shadow:0 24px 58px rgba(0,0,0,.34),inset 0 1px 0 rgba(233,196,107,.08)}
.lv45-champ-kicker{display:inline-flex!important;margin-bottom:5px;padding:3px 6px;border:1px solid rgba(233,196,107,.24);border-radius:999px;color:#e6c973!important;background:rgba(233,196,107,.06);font-size:5.5px!important;font-weight:1000;letter-spacing:.15em}
.lv45-stakes{margin:4px 0 0!important;color:#d8bd72!important;font-size:7px!important;font-weight:950;letter-spacing:.12em;text-transform:uppercase}
.lv4-start-list>span.ours{border-color:rgba(126,215,255,.28);background:rgba(126,215,255,.055);box-shadow:inset 2px 0 #7ed7ff}
.lv45-champ-photo{background:radial-gradient(circle at 50% 48%,rgba(233,196,107,.1),transparent 30%),rgba(2,10,16,.63)}
.lv45-champ-photo strong{color:#f5dfa0;text-shadow:0 0 24px rgba(233,196,107,.18)}
.lv45-record-line line{stroke:#e9c46b;stroke-width:2.2;stroke-dasharray:5 5;opacity:.82}.lv45-record-line text{fill:#f1d98d;font-size:7px;font-weight:1000;paint-order:stroke;stroke:#123629;stroke-width:3}
.lv45-performance-moment{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:7;min-width:min(360px,72%);padding:13px 18px;border:1px solid rgba(132,179,205,.28);border-radius:10px;background:rgba(3,13,20,.94);box-shadow:0 20px 50px rgba(0,0,0,.34);text-align:center;pointer-events:none}.lv45-performance-moment small,.lv45-performance-moment strong,.lv45-performance-moment span{display:block}.lv45-performance-moment small{color:#7fa4b7;font-size:6px;font-weight:1000;letter-spacing:.16em}.lv45-performance-moment strong{margin-top:4px;color:#f2f8fa;font-size:15px;letter-spacing:-.02em}.lv45-performance-moment span{margin-top:3px;color:#b7ccd5;font-size:10px;font-weight:900}.lv45-performance-moment.wr{border-color:rgba(233,196,107,.5);background:linear-gradient(180deg,rgba(52,42,17,.95),rgba(12,19,23,.96))}.lv45-performance-moment.wr small,.lv45-performance-moment.wr span{color:#f0d47e}.lv45-performance-moment.cr,.lv45-performance-moment.nr{border-color:rgba(126,215,255,.36)}.lv45-performance-moment.pb{border-color:rgba(114,214,173,.34)}.lv45-performance-moment.champion{border-color:rgba(233,196,107,.4);background:linear-gradient(180deg,rgba(40,34,18,.92),rgba(4,15,22,.95))}.lv45-performance-moment.champion small{color:#e4c66f}
.lv45-champ-final .lv4-final>div.medal{position:relative}.lv45-champ-final .lv4-final>div.medal-1{background:linear-gradient(90deg,rgba(233,196,107,.09),transparent);box-shadow:inset 2px 0 #e9c46b}.lv45-champ-final .lv4-final>div.medal-2{box-shadow:inset 2px 0 #aab9c0}.lv45-champ-final .lv4-final>div.medal-3{box-shadow:inset 2px 0 #b88c68}.lv45-result-tag{display:inline-flex!important;margin-left:3px!important;padding:2px 4px!important;border:1px solid rgba(126,215,255,.22)!important;border-radius:4px!important;background:rgba(126,215,255,.06)!important;color:#9edcf5!important;font-size:5.5px!important;font-style:normal!important;font-weight:1000!important}.lv45-result-tag.wr{border-color:rgba(233,196,107,.36)!important;background:rgba(233,196,107,.08)!important;color:#efd27b!important}.lv45-result-tag.nr,.lv45-result-tag.cr{color:#c0e7f8!important}.lv45-result-tag.pb{border-color:rgba(114,214,173,.28)!important;color:#a8e0c4!important}.lv45-winner-banner{border-top-color:rgba(233,196,107,.2)!important}.lv45-winner-banner small{color:#dabb67!important}
.lv4-board-row.danger{background:rgba(255,133,151,.055);box-shadow:inset 2px 0 rgba(255,133,151,.62)}
@media(max-width:760px){.lv45-performance-moment{min-width:min(300px,82%);padding:10px 12px}.lv45-performance-moment strong{font-size:13px}.lv45-champ-kicker{font-size:5px!important}}
@media(prefers-reduced-motion:reduce){.lv45-performance-moment,.lv45-champ-photo{animation:none!important}}
'''
css_path.write_text(css, encoding='utf-8')

html = html_path.read_text(encoding='utf-8')
html = html.replace('styles/live-event-broadcast-v4.css?v=20260911-broadcast4', 'styles/live-event-broadcast-v4.css?v=20260911-broadcast45')
html = html.replace('scripts/live-event-broadcast-v4.js?v=20260911-broadcast4', 'scripts/live-event-broadcast-v4.js?v=20260911-broadcast45')
html_path.write_text(html, encoding='utf-8')

print('Applied Live Event Broadcast V4.5 championship phase')
