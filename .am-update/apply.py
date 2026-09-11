from pathlib import Path

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Patch anchor missing: {label}")
    return text.replace(old, new, 1)

js_path = Path("scripts/live-event-broadcast-v4.js")
js = js_path.read_text(encoding="utf-8")

old = """function fieldInit(e,d,r,done){const q=attemptSeq(d,r);return{kind:'field',e,d,r,rr:q.rr,seq:q.out,i:0,phase:'prep',t:0,intro:presentationTier(e)==='standard'?1.15:1.75,paused:false,speed:'broadcast',last:null,comments:[],commentQueue:[],lastSpeechAt:0,state:new Map(q.rr.map(x=>[String(x.id),{r:x,best:null,att:[],H:0,hm:new Map(),miss:0}])),done,tier:presentationTier(e),boardStamp:0,boardOrder:''}}"""
new = """function ordinal(n){const v=Math.abs(Number(n)||0),m=v%100;return`${v}${m>=11&&m<=13?'th':v%10===1?'st':v%10===2?'nd':v%10===3?'rd':'th'}`}
function fieldRoundInfo(c,q=c.seq[c.i]||c.seq.at(-1)){if(isHeight(c.d))return{height:q?.H||0,attempt:q?.a||0,round:0,max:0,final:q?.a===3};const max=Math.max(1,...c.seq.map(x=>Number(x.a)||0)),round=Math.max(1,Number(q?.a)||1);return{round,max,final:round===max}}
function validFieldLeader(c){return fieldRank(c).find(x=>isHeight(c.d)?x.H>0:x.best!=null)||null}
function fieldLeadTarget(c,q){if(!q||isHeight(c.d))return null;const leader=validFieldLeader(c);return leader&&String(leader.r.id)!==String(q.r.id)&&leader.best!=null?leader.best+.01:null}
function fieldAttemptNoun(c){const f=fieldFamily(c.d);return f==='horizontal'?'jump':f==='height'?'attempt':'throw'}
function fieldPreAttemptSpeech(c,q){if(!q)return'';if(isHeight(c.d)){if(q.a===3)return`${q.r.name} has one attempt left at ${fmt(c.d,q.H)}.`;return''}const info=fieldRoundInfo(c,q),target=fieldLeadTarget(c,q),st=c.state.get(String(q.r.id)),noun=fieldAttemptNoun(c);if(info.final&&target!=null)return`${q.r.name} has one ${noun} remaining and needs ${fmt(c.d,target)} to take the lead.`;if(info.final)return`${q.r.name} is into the final ${noun}${st?.best!=null?` with ${fmt(c.d,st.best)} as the mark to improve`:''}.`;if(q.r.nation===myNation()&&target!=null)return`${q.r.name} needs ${fmt(c.d,target)} to take the lead.`;return''}
function fieldInit(e,d,r,done){const q=attemptSeq(d,r),maxRound=isHeight(d)?0:Math.max(1,...q.out.map(x=>Number(x.a)||0));return{kind:'field',e,d,r,rr:q.rr,seq:q.out,i:0,phase:'prep',t:0,intro:presentationTier(e)==='standard'?1.15:1.75,paused:false,speed:'broadcast',last:null,comments:[],commentQueue:[],lastSpeechAt:0,state:new Map(q.rr.map(x=>[String(x.id),{r:x,best:null,att:[],H:0,hm:new Map(),miss:0}])),done,tier:presentationTier(e),boardStamp:0,boardOrder:'',maxRound,announcedIndex:-1,lastAttemptId:null,lastAttemptAt:0,lastPositionChangeId:null,lastPositionChangeAt:0,lastTookLead:false}}"""
js = replace_once(js, old, new, "fieldInit")

old = """function recordAttempt(c,q){const st=c.state.get(String(q.r.id));if(!st)return;if(isHeight(c.d)){const marks=st.hm.get(q.H)||[];marks.push(q.o);st.hm.set(q.H,marks);if(q.o==='X')st.miss++;if(q.o==='O')st.H=Math.max(st.H,q.H)}else{st.att[q.a-1]=q.f?null:q.m;if(Number.isFinite(q.m))st.best=st.best==null?q.m:Math.max(st.best,q.m)}}"""
new = """function recordAttempt(c,q){const st=c.state.get(String(q.r.id));if(!st)return;const before=fieldRank(c),beforePos=before.findIndex(x=>String(x.r.id)===String(q.r.id))+1,beforeLeader=(before.find(x=>isHeight(c.d)?x.H>0:x.best!=null)||{}).r?.id??null;if(isHeight(c.d)){const marks=st.hm.get(q.H)||[];marks.push(q.o);st.hm.set(q.H,marks);if(q.o==='X')st.miss++;if(q.o==='O')st.H=Math.max(st.H,q.H)}else{st.att[q.a-1]=q.f?null:q.m;if(Number.isFinite(q.m))st.best=st.best==null?q.m:Math.max(st.best,q.m)}const after=fieldRank(c),afterPos=after.findIndex(x=>String(x.r.id)===String(q.r.id))+1,afterLeader=(after.find(x=>isHeight(c.d)?x.H>0:x.best!=null)||{}).r?.id??null;c.lastAttemptId=q.r.id;c.lastAttemptAt=performance.now();c.lastTookLead=afterLeader!=null&&String(afterLeader)===String(q.r.id)&&String(beforeLeader)!==String(afterLeader);if(beforePos&&afterPos&&beforePos!==afterPos){c.lastPositionChangeId=q.r.id;c.lastPositionChangeAt=performance.now()}}"""
js = replace_once(js, old, new, "recordAttempt")

old = """function fieldBoardRows(c){return fieldRank(c).map((x,i)=>({id:x.r.id,pos:i+1,r:x.r,value:isHeight(c.d)?(x.H?fmt(c.d,x.H):'—'):(x.best!=null?fmt(c.d,x.best):'—'),sub:isHeight(c.d)?[...x.hm].map(([H,m])=>`${fmt(c.d,H)} ${m.join('')}`).join(' · ')||nation(x.r.nation):x.att.map((m,j)=>m==null?`A${j+1} X`:`A${j+1} ${fmt(c.d,m)}`).join(' · ')||nation(x.r.nation),leader:i===0&&((isHeight(c.d)&&x.H>0)||(!isHeight(c.d)&&x.best!=null)),ours:x.r.nation===myNation()}))}"""
new = """function fieldBoardRows(c){const now=performance.now();return fieldRank(c).map((x,i)=>({id:x.r.id,pos:i+1,r:x.r,value:isHeight(c.d)?(x.H?fmt(c.d,x.H):'—'):(x.best!=null?fmt(c.d,x.best):'—'),sub:isHeight(c.d)?[...x.hm].map(([H,m])=>`${fmt(c.d,H)} ${m.join('')}`).join(' · ')||nation(x.r.nation):x.att.map((m,j)=>m==null?`A${j+1} X`:`A${j+1} ${fmt(c.d,m)}`).join(' · ')||nation(x.r.nation),leader:i===0&&((isHeight(c.d)&&x.H>0)||(!isHeight(c.d)&&x.best!=null)),ours:x.r.nation===myNation(),updated:String(c.lastAttemptId)===String(x.r.id)&&now-c.lastAttemptAt<1150,moved:String(c.lastPositionChangeId)===String(x.r.id)&&now-c.lastPositionChangeAt<1150}))}"""
js = replace_once(js, old, new, "fieldBoardRows")

old = """function attemptContext(c,q){if(!q)return'';const ranked=fieldRank(c),idx=Math.max(0,ranked.findIndex(x=>String(x.r.id)===String(q.r.id))),st=c.state.get(String(q.r.id)),leader=ranked[0],family=fieldFamily(c.d);let detail='';if(isHeight(c.d))detail=`${fmt(c.d,q.H)} · Attempt ${q.a||'PASS'}${q.a===3?' · FINAL ATTEMPT':''}`;else{const target=leader&&String(leader.r.id)!==String(q.r.id)&&leader.best!=null?leader.best+.01:null;detail=`${st?.best!=null?`Best ${fmt(c.d,st.best)} · `:''}Attempt ${q.a}${target!=null?` · ${fmt(c.d,target)} for lead`:''}`};return`<div class="lv4-attempt-card"><small>${family==='height'?'CURRENT HEIGHT':'CURRENT ATHLETE'}</small><strong>${E(q.r.name)}</strong><span>${idx+1}${idx===0?'st':idx===1?'nd':idx===2?'rd':'th'} · ${E(detail)}</span></div>`}"""
new = """function attemptContext(c,q){if(!q)return'';const ranked=fieldRank(c),idx=Math.max(0,ranked.findIndex(x=>String(x.r.id)===String(q.r.id))),st=c.state.get(String(q.r.id)),family=fieldFamily(c.d),info=fieldRoundInfo(c,q);let detail='',headline=family==='height'?'CURRENT HEIGHT':info.final?'FINAL ROUND':'CURRENT ATHLETE';if(isHeight(c.d))detail=`${fmt(c.d,q.H)} · Attempt ${q.a||'PASS'}${q.a===3?' · FINAL ATTEMPT':''}`;else{const target=fieldLeadTarget(c,q);detail=`Round ${info.round}/${info.max}${st?.best!=null?` · Best ${fmt(c.d,st.best)}`:''}${target!=null?` · Needs ${fmt(c.d,target)} for lead`:''}`};return`<div class="lv4-attempt-card ${info.final?'final-round':''}"><small>${headline}</small><strong>${E(q.r.name)}</strong><span>${ordinal(idx+1)} · ${E(detail)}</span></div>`}"""
js = replace_once(js, old, new, "attemptContext")

anchor = """function officialsSvg(points){return points.map(([x,y])=>`<g class="lv4-official"><circle cx="${x}" cy="${y}" r="5"/><rect x="${x-3}" y="${y+5}" width="6" height="10" rx="2"/></g>`).join('')}"""
insert = anchor + """
function fieldBestMarkers(c,family){if(isHeight(c.d)||family==='horizontal')return'';const max=scaleFor(family),best=fieldRank(c).filter(x=>x.best!=null).slice(0,3);return best.map((x,i)=>{const r=Math.max(.03,Math.min(1,x.best/max)),px=148+545*r,w=i===0?3:2,op=i===0?.95:.48;return`<g class="lv43-best-marker" opacity="${op}"><line x1="${px}" y1="258" x2="${px}" y2="286" stroke="${colour(x.r.nation)}" stroke-width="${w}"/><circle cx="${px}" cy="272" r="${i===0?4:3}" fill="${colour(x.r.nation)}"/><text x="${px}" y="300" text-anchor="middle">${E(shortName(x.r.name))} ${E(fmt(c.d,x.best))}</text></g>`}).join('')}"""
js = replace_once(js, anchor, insert, "fieldBestMarkers insert")

old = """const sector=`<path d="M148 272 L720 82 L720 398 Z" class="lv4-sector"/>${grids}${leaderRatio!=null?`<line x1="${148+545*leaderRatio}" y1="${272-180*leaderRatio+10}" x2="${148+545*leaderRatio}" y2="${272+180*leaderRatio-10}" class="lv4-leader-mark"/><text x="${148+545*leaderRatio}" y="${272-180*leaderRatio-1}" text-anchor="middle" class="lv4-leader-text">LEAD ${E(fmt(c.d,leader))}</text>`:''}`;"""
new = """const sector=`<path d="M148 272 L720 82 L720 398 Z" class="lv4-sector"/>${grids}${fieldBestMarkers(c,family)}${leaderRatio!=null?`<line x1="${148+545*leaderRatio}" y1="${272-180*leaderRatio+10}" x2="${148+545*leaderRatio}" y2="${272+180*leaderRatio-10}" class="lv4-leader-mark"/><text x="${148+545*leaderRatio}" y="${272-180*leaderRatio-1}" text-anchor="middle" class="lv4-leader-text">LEAD ${E(fmt(c.d,leader))}</text>`:''}`;"""
js = replace_once(js, old, new, "sector best markers")

old = """${q&&!q.f?`<circle cx="${ballX}" cy="${ballY}" r="${c.phase==='act'?6:5}" class="lv4-implement"/><ellipse cx="${ballX+3}" cy="${ballY+7}" rx="7" ry="3" class="lv4-shadow"/>`:''}"""
new = """${q&&!q.f?(()=>{const lift=c.phase==='act'?Math.sin(Math.PI*p):0,radius=5+lift*3.2,shadow=7+lift*4,shadowY=7+lift*5;return`<circle cx="${ballX}" cy="${ballY}" r="${radius}" class="lv4-implement"/><ellipse cx="${ballX+3}" cy="${ballY+shadowY}" rx="${shadow}" ry="${Math.max(2.2,3.4-lift)}" class="lv4-shadow" opacity="${.18+.18*(1-lift)}"/>`})():''}"""
js = replace_once(js, old, new, "implement flight")

old = """function eventPhase(c){if(c.kind==='track'){const n=dist(c.d);if(n<=400)return sprintPhase(c,c.state);if(c.photo!=null)return'PHOTO';if(c.runout!=null||c.settle!=null)return'PROVISIONAL';if(c.intro>0)return c.intro<.38?'SET':'START LIST';const laps=Math.max(1,Math.ceil(n/400)),lap=Math.min(laps,Math.floor((c.state?.lead?.m||0)/400)+1);if(n>400&&lap===laps)return'FINAL LAP';return'LIVE'}if(c.intro>0)return'START ORDER';if(c.phase==='prep')return'NEXT ATTEMPT';if(c.phase==='act')return'LIVE';return'PROVISIONAL'}"""
new = """function eventPhase(c){if(c.kind==='track'){const n=dist(c.d);if(n<=400)return sprintPhase(c,c.state);if(c.photo!=null)return'PHOTO';if(c.runout!=null||c.settle!=null)return'PROVISIONAL';if(c.intro>0)return c.intro<.38?'SET':'START LIST';const laps=Math.max(1,Math.ceil(n/400)),lap=Math.min(laps,Math.floor((c.state?.lead?.m||0)/400)+1);if(n>400&&lap===laps)return'FINAL LAP';return'LIVE'}if(c.intro>0)return'START ORDER';const q=c.seq[c.i]||c.seq.at(-1),info=fieldRoundInfo(c,q);if(isHeight(c.d))return q?.H?`${fmt(c.d,q.H)} · A${q.a||'-'}`:'HIGH JUMP';if(info.final)return c.phase==='res'?'FINAL ROUND · PROV':'FINAL ROUND';if(c.phase==='res')return`ROUND ${info.round}/${info.max} · PROV`;return`ROUND ${info.round}/${info.max}`}"""
js = replace_once(js, old, new, "eventPhase field progress")

old = """el.classList.toggle('ours',!!x.ours);el.classList.toggle('leader',!!x.leader);el.querySelector('b').textContent=x.pos;"""
new = """el.classList.toggle('ours',!!x.ours);el.classList.toggle('leader',!!x.leader);el.classList.toggle('attempt-update',!!x.updated);el.classList.toggle('position-change',!!x.moved);el.querySelector('b').textContent=x.pos;"""
js = replace_once(js, old, new, "scoreboard attempt classes")

old = """function tickField(c,t){if(live!==c)return;if(c.last==null)c.last=t;let dt=Math.min(.07,(t-c.last)/1000);c.last=t;if(!c.paused){const mul=c.speed==='broadcast'?1:Number(c.speed)||1;dt*=mul;if(c.intro>0){c.intro=Math.max(0,c.intro-dt);if(c.intro===0){const q=c.seq[c.i];queueSpeech(c,q?`${q.r.name} is first into the live sequence.`:`${label(c.d)} is ready.`,55,true);flushSpeech(c,true)}}else{const q=c.seq[c.i];if(!q)return finish(c);c.t+=dt;const lim=c.phase==='prep' ? .38 : c.phase==='act' ? attemptLimit(c) : .62;if(c.t>=lim){c.t=0;if(c.phase==='prep')c.phase=q.o==='-'?'res':'act';else if(c.phase==='act')c.phase='res';else{recordAttempt(c,q);if(isHeight(c.d))queueSpeech(c,q.o==='O'?`${q.r.name} clears ${fmt(c.d,q.H)}.`:q.o==='X'?`${q.r.name} misses at ${fmt(c.d,q.H)}.`:`${q.r.name} passes at ${fmt(c.d,q.H)}.`,q.o==='O'?75:45,q.o==='O');else queueSpeech(c,q.f?`No mark for ${q.r.name}.`:`${q.r.name} records ${fmt(c.d,q.m)} on attempt ${q.a}.`,q.f?45:72,!q.f);flushSpeech(c,true);c.i++;c.phase='prep';if(c.i>=c.seq.length){render(c,true);return setTimeout(()=>finish(c),560/(mul||1))}}}flushSpeech(c);render(c)}}frame=requestAnimationFrame(x=>tickField(c,x))}"""
new = """function tickField(c,t){if(live!==c)return;if(c.last==null)c.last=t;let dt=Math.min(.07,(t-c.last)/1000);c.last=t;if(!c.paused){const mul=c.speed==='broadcast'?1:Number(c.speed)||1;dt*=mul;if(c.intro>0){c.intro=Math.max(0,c.intro-dt);if(c.intro===0){const q=c.seq[c.i];queueSpeech(c,q?`${q.r.name} is first into the live sequence.`:`${label(c.d)} is ready.`,55,true);flushSpeech(c,true)}}else{const q=c.seq[c.i];if(!q)return finish(c);if(c.phase==='prep'&&c.announcedIndex!==c.i){c.announcedIndex=c.i;const pre=fieldPreAttemptSpeech(c,q);if(pre){queueSpeech(c,pre,fieldRoundInfo(c,q).final?86:62,true);flushSpeech(c,true)}}c.t+=dt;const info=fieldRoundInfo(c,q),lim=c.phase==='prep'?(info.final?.48:.30):c.phase==='act'?attemptLimit(c):(info.final?.82:.55);if(c.t>=lim){c.t=0;if(c.phase==='prep')c.phase=q.o==='-'?'res':'act';else if(c.phase==='act')c.phase='res';else{recordAttempt(c,q);if(isHeight(c.d))queueSpeech(c,q.o==='O'?`${q.r.name} clears ${fmt(c.d,q.H)}.`:q.o==='X'?`${q.r.name} misses at ${fmt(c.d,q.H)}.`:`${q.r.name} passes at ${fmt(c.d,q.H)}.`,q.o==='O'?75:45,q.o==='O');else{const noun=fieldAttemptNoun(c),mark=q.f?'':fmt(c.d,q.m),text=q.f?`No mark for ${q.r.name}.`:c.lastTookLead?`${q.r.name} takes the lead with ${mark}.`:info.final?`${q.r.name} finishes with ${mark} on the final ${noun}.`:`${q.r.name} records ${mark} on attempt ${q.a}.`;queueSpeech(c,text,q.f?45:c.lastTookLead?92:info.final?80:72,!q.f)}flushSpeech(c,true);c.i++;c.phase='prep';if(c.i>=c.seq.length){render(c,true);return setTimeout(()=>finish(c),720/(mul||1))}}}flushSpeech(c);render(c)}}frame=requestAnimationFrame(x=>tickField(c,x))}"""
js = replace_once(js, old, new, "tickField")

js = replace_once(js, "const api={version:'4.1.0'", "const api={version:'4.3.0'", "api version")
js_path.write_text(js, encoding="utf-8")

css_path = Path("styles/live-event-broadcast-v4.css")
css = css_path.read_text(encoding="utf-8")
marker = "/* Live Event Broadcast V4.3 — field-event drama */"
if marker not in css:
    css += """

/* Live Event Broadcast V4.3 — field-event drama */
.lv43-best-marker text{fill:#c8d8df;font-size:6px;font-weight:900;paint-order:stroke;stroke:#123328;stroke-width:2.5}
.lv4-attempt-card.final-round{border-color:rgba(233,196,107,.42);background:linear-gradient(180deg,rgba(30,27,18,.94),rgba(7,20,29,.94));box-shadow:0 12px 30px rgba(0,0,0,.24),inset 0 1px 0 rgba(233,196,107,.12)}
.lv4-attempt-card.final-round small{color:#d9bd72}
.lv4-board-row.attempt-update{animation:lv43AttemptFlash .9s ease-out}
.lv4-board-row.position-change{box-shadow:inset 3px 0 rgba(233,196,107,.8)}
.lv4-board-row.ours.position-change{box-shadow:inset 3px 0 #9dddf8}
@keyframes lv43AttemptFlash{0%{background:rgba(126,215,255,.16)}45%{background:rgba(126,215,255,.08)}100%{background:transparent}}
@media(prefers-reduced-motion:reduce){.lv4-board-row.attempt-update{animation:none;background:rgba(126,215,255,.07)}}
"""
css_path.write_text(css, encoding="utf-8")

reg_path = Path("tools/static-regression.mjs")
reg = reg_path.read_text(encoding="utf-8")
anchor = """  ['function trackMomentText(c,m,top)','Sprint-specific commentary is missing'],
"""
addition = anchor + """  ['function fieldRoundInfo(c,q=c.seq[c.i]||c.seq.at(-1))','Field-event round tracking is missing'],
  ['function fieldPreAttemptSpeech(c,q)','Field-event pre-attempt context is missing'],
  ['function fieldBestMarkers(c,family)','Field-event best-mark references are missing'],
  ['lastTookLead','Field-event lead-change presentation is missing'],
"""
if "Field-event round tracking is missing" not in reg:
    if anchor not in reg:
        raise SystemExit("Static regression insertion anchor missing")
    reg = reg.replace(anchor, addition, 1)
reg_path.write_text(reg, encoding="utf-8")
