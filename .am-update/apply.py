from pathlib import Path
p=Path('scripts/relay-v1.js')
text=p.read_text(encoding='utf-8')
needle="function patchSelection(){\n"
if needle not in text:
    raise SystemExit('Relay selection insertion point missing')
block=r'''let relayRun=null;
function relayEventForRoute(){
 if(relayRun?.event)return relayRun.event;
 const id=safe(()=>s.uiCompetitionV2?.eventId,null);
 return (s.events||[]).find(e=>String(e.id)===String(id))||safe(()=>currentEvent(),null);
}
function relayLineupPanel(e,d){
 const line=selectedLineup(e,d);
 if(!line.length)return `<div class="relay-lineup-empty"><strong>NO PROGRAMME TEAM</strong><span>You can still watch the international relay field.</span></div>`;
 return `<div class="relay-lineup-grid">${LEG_NAMES.map((label,i)=>{const a=line[i];return `<div class="relay-leg"><small>${esc(label)}</small>${a?`<strong>${esc(a.name)}</strong><span>${esc(safe(()=>discLabel(a.disc),a.disc))} · Relay ${relaySkill(a)}</span>`:'<strong>NO RUNNER</strong><span>Selection incomplete</span>'}</div>`}).join('')}</div>`;
}
function relayResultsTable(d,rows){
 return `<div class="relay-result-list">${rows.map((r,i)=>`<div class="relay-result-row ${r.nation===safe(()=>managedNation(),'')?'managed':''} ${r.dq?'dq':''}"><b>${r.dq?'—':i+1}</b><i style="background:${safe(()=>nationDotColour(r.nation),'#7cc7ee')}"></i><div><strong>${safe(()=>flag(r.nation),'')} ${esc(safe(()=>nationName(r.nation),r.nation))}</strong><small>${r.exchangeIssue?esc(r.exchangeIssue):r.dq?'Exchange infringement':'Clean finish'}</small></div><span>${r.dq?'DQ':r.perf.toFixed(2)+'s'}</span>${(r.achievements||[]).length?`<em>${r.achievements.map(esc).join(' · ')}</em>`:'<em></em>'}</div>`).join('')}</div>`;
}
function relayCommentaryHTML(lines,index){
 const shown=(lines||[]).slice(0,Math.max(0,index)+1);
 if(!shown.length)return '<div class="relay-commentary-empty">Gavin Potts is ready. Start the relay when you are ready.</div>';
 return shown.map(line=>{const parts=String(line).split(/\n+/),head=parts.shift()||'LIVE',body=parts.join(' ').replace(/^Gavin Potts\s*[—-]\s*/i,'');return `<div class="relay-commentary-line"><small>${esc(head)}</small><p>${esc(body)}</p></div>`}).join('');
}
function renderRelayDiscipline(e,d){
 const root=document.getElementById('competition');if(!root||!e||!isRelay(d))return false;
 const active=relayRun&&relayRun.event===e&&relayRun.disc===d?relayRun:null,done=Array.isArray(e.results?.[d]),rows=active?.results||e.results?.[d]||relayField(e,d).map(t=>({...t,perf:45,dq:false})),live=num(e.week)===num(s.game.week)&&!e.completed,line=selectedLineup(e,d),hasTeam=line.length===4;
 const lines=active?.lines||safe(()=>e.commentary?.[d],[])||[],index=active?.index??(done?lines.length-1:-1);
 document.body.classList.add('event-focus');
 safe(()=>{document.getElementById('pageKicker').textContent='4×100M RELAY';document.getElementById('pageTitle').textContent=`${e.name} · ${safe(()=>discLabel(d),RELAYS[d].label)}`},null);
 root.innerHTML=`<div class="relay-event-shell" data-am-ui-screen="competition-v2"><header class="relay-event-head"><div><small>${esc(e.level||'COMPETITION')} · WEEK ${e.week}</small><h2>${esc(RELAYS[d].label)}</h2><p>${esc(e.location||'')} · Four legs · Three exchanges · One team result</p></div><div class="relay-event-actions"><button class="btn ghost" data-relay-programme ${disciplineRunning?'disabled':''}>← PROGRAMME</button>${done?'<span class="relay-state complete">COMPLETE</span>':active?'<span class="relay-state live">LIVE</span>':`<button class="btn primary" data-relay-start ${!live?'disabled':''}>${live?'START RELAY':'EVENT DAY W'+e.week}</button>`}</div></header><section class="relay-lineup"><div class="relay-section-title"><div><small>YOUR RELAY TEAM</small><strong>${hasTeam?safe(()=>nationName(managedNation()),managedNation()):'No programme entry'}</strong></div><span>${hasTeam?'Individual 100m/200m entries remain active':'Four eligible sprinters required to enter'}</span></div>${relayLineupPanel(e,d)}</section><section class="relay-stage">${relayVisual(e,d,rows,done)}</section><div class="relay-lower"><section class="relay-commentary"><div class="relay-section-title"><div><small>LIVE COMMENTARY</small><strong>Gavin Potts</strong></div><span>${done?'Race complete':active?'Relay in progress':'Pre-race'}</span></div><div class="relay-commentary-scroll">${relayCommentaryHTML(lines,index)}</div></section><aside class="relay-board"><div class="relay-section-title"><div><small>${done?'OFFICIAL RESULT':'FIELD'}</small><strong>${rows.length} nations</strong></div></div>${done?relayResultsTable(d,rows):`<div class="relay-field-list">${rows.map((r,i)=>`<div><b>${i+1}</b><i style="background:${safe(()=>nationDotColour(r.nation),'#7cc7ee')}"></i><span>${safe(()=>flag(r.nation),'')} ${esc(safe(()=>nationName(r.nation),r.nation))}</span></div>`).join('')}</div>`}</aside></div>${done?'<footer class="relay-event-foot"><button class="btn primary" data-relay-continue>RETURN TO PROGRAMME →</button></footer>':''}</div>`;
 const back=root.querySelector('[data-relay-programme]');if(back)back.onclick=()=>{if(disciplineRunning)return safe(()=>toast('Finish the relay first'),null);activeEventDisc=null;competitionMode='overview';drawCompetition()};
 const start=root.querySelector('[data-relay-start]');if(start)start.onclick=()=>startRelayEvent(e,d);
 const cont=root.querySelector('[data-relay-continue]');if(cont)cont.onclick=()=>{const ds=(e.disc||[]).filter(x=>x&&x!=='ALL');if(ds.length&&ds.every(x=>Array.isArray(e.results?.[x]))&&!e.completed){safe(()=>finaliseEvent(e,false),null);return}activeEventDisc=null;competitionMode='overview';drawCompetition()};
 requestAnimationFrame(()=>{const c=root.querySelector('.relay-commentary-scroll');if(c)c.scrollTop=c.scrollHeight});
 return true;
}
function startRelayEvent(e,d){
 if(!e||!isRelay(d)||e.completed||disciplineRunning||Array.isArray(e.results?.[d]))return;
 if(num(e.week)!==num(s.game.week)){safe(()=>toast('This relay is not live yet'),null);return}
 const results=simulateDiscipline(e,d),lines=commentaryLines(d,results,e);e.commentary??={};e.commentary[d]=lines;
 relayRun={event:e,disc:d,results,lines,index:-1};disciplineRunning=true;activeEventDisc=d;competitionMode='discipline';liveEventView={event:e,disc:d,results,lines,index:-1,relayV1:true};saveSafe();renderRelayDiscipline(e,d);
 let i=0;const step=()=>{
  if(!relayRun||relayRun.event!==e||relayRun.disc!==d)return;
  if(i<lines.length){relayRun.index=i;liveEventView.index=i;i++;renderRelayDiscipline(e,d);const delay=i===lines.length?1150:920;const timer=setTimeout(step,delay);try{timers.push(timer)}catch(_){};return}
  commitDisciplineResults(e,d,results);disciplineRunning=false;relayRun=null;liveEventView=null;saveSafe();renderRelayDiscipline(e,d)
 };
 const timer=setTimeout(step,450);try{timers.push(timer)}catch(_){}
}

'''
text=text.replace(needle,block+needle,1)
old="const baseDrawCompetition=typeof drawCompetition==='function'?drawCompetition:null;if(baseDrawCompetition)drawCompetition=function(){const out=baseDrawCompetition.apply(this,arguments);requestAnimationFrame(patchCompetitionRelay);return out};"
new="const baseDrawCompetition=typeof drawCompetition==='function'?drawCompetition:null;if(baseDrawCompetition)drawCompetition=function(){const d=typeof activeEventDisc!=='undefined'?activeEventDisc:null,e=relayEventForRoute();if(competitionMode==='discipline'&&isRelay(d)&&e)return renderRelayDiscipline(e,d);const out=baseDrawCompetition.apply(this,arguments);requestAnimationFrame(patchCompetitionRelay);return out};"
if old not in text:
    raise SystemExit('Relay drawCompetition wrapper contract missing')
text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')
print('Dedicated Relay V1 Event Day renderer staged.')
