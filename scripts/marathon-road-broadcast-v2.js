/* Athletics Manager — Marathon Road Broadcast V2
   Presentation-only layer for road marathons. Keeps V1 simulation/selection intact,
   but replaces static course snapshots with a timed, animated road broadcast. */
(function(){
'use strict';
if(window.__amMarathonRoadBroadcastV2)return;window.__amMarathonRoadBroadcastV2=1;
if(!window.__amMarathonRoadV1||typeof drawCompetition!=='function')return;

const VERSION=2;
const ROAD_DISCS=new Set(['MMarathon','WMarathon']);
const clampN=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isRoad=d=>ROAD_DISCS.has(String(d||''))||!!(typeof DISCIPLINES!=='undefined'&&DISCIPLINES?.[d]?.road);
const managedNation=()=>{try{return typeof myNation==='function'?myNation():typeof window.managedNation==='function'?window.managedNation():s?.managedNation||'GREAT BRITAIN'}catch(_){return s?.managedNation||'GREAT BRITAIN'}};
const nationLabel=n=>{try{return typeof nationName==='function'?nationName(n):String(n||'')}catch(_){return String(n||'')}};
const nationColour=n=>{try{return typeof nationDotColour==='function'?nationDotColour(n):'#5b8da8'}catch(_){return'#5b8da8'}};

let activeFrame=0;
let drawBase=drawCompetition;
let startBase=typeof startDiscipline==='function'?startDiscipline:null;

function resolveEvent(){
 try{
  if(typeof liveEventView!=='undefined'&&liveEventView?.event)return liveEventView.event;
  if(typeof currentEvent==='function'){const e=currentEvent();if(e)return e}
  return (s?.events||[]).find(e=>e?.week===s?.game?.week&&e?.roadRace)||null;
 }catch(_){return null}
}
function currentLine(e,d){
 try{return liveEventView?.event===e&&liveEventView?.disc===d?liveEventView.lines?.[liveEventView.index]||'':Array.isArray(e?.results?.[d])?'FINISH • 42.195 KM':''}catch(_){return''}
}
function cueFor(e,d,line=currentLine(e,d)){
 const meta=e?.engine?.[d],cue=line?meta?.broadcastCues?.[line]:null;
 if(cue)return cue;
 const cps=meta?.road?.checkpoints||[];
 if(Array.isArray(e?.results?.[d]))return cps.at(-1)||{metres:42195,section:'Finish',scene:'finish',phase:'finish'};
 return cps[0]||{metres:0,section:'Start',scene:'city',phase:'start'};
}
function checkpointFor(e,d,metres){
 const xs=e?.engine?.[d]?.road?.checkpoints||[];
 if(!xs.length)return null;
 return xs.reduce((best,x)=>Math.abs(Number(x.metres)-metres)<Math.abs(Number(best.metres)-metres)?x:best,xs[0]);
}
function rowsFor(e,d){
 try{
  if(liveEventView?.event===e&&liveEventView?.disc===d)return liveEventView.results||[];
  if(Array.isArray(e?.results?.[d]))return e.results[d];
 }catch(_){}
 return [];
}
function orderedRows(e,d,rows,metres){
 const cp=checkpointFor(e,d,metres),ids=cp?.order||rows.map(r=>r.id),map=new Map(rows.map(r=>[String(r.id),r])),out=[];
 for(const id of ids){const r=map.get(String(id));if(r&&!out.includes(r))out.push(r)}
 for(const r of rows)if(!out.includes(r))out.push(r);
 return out;
}
function roadCenterY(x){
 const n=clampN(x,0,900);
 return 316-(n*.185)+18*Math.sin((n+55)/185);
}
function roadHalfWidth(x){return 72-(clampN(x,0,900)/900)*14}
function roadBoundsAt(x){const c=roadCenterY(x),h=roadHalfWidth(x);return{center:c,top:c-h,bottom:c+h,halfWidth:h}}
function roadPathPolygon(){
 const xs=[];for(let x=-20;x<=920;x+=40)xs.push(x);
 const top=xs.map(x=>`${x.toFixed(1)},${(roadCenterY(x)-roadHalfWidth(x)).toFixed(1)}`);
 const bottom=[...xs].reverse().map(x=>`${x.toFixed(1)},${(roadCenterY(x)+roadHalfWidth(x)).toFixed(1)}`);
 return `M${top[0]} L${top.slice(1).join(' L')} L${bottom.join(' L')} Z`;
}
function roadCentrePath(){const xs=[];for(let x=-20;x<=920;x+=40)xs.push(`${x.toFixed(1)},${roadCenterY(x).toFixed(1)}`);return `M${xs[0]} L${xs.slice(1).join(' L')}`}
function roadEdgePath(sign){const xs=[];for(let x=-20;x<=920;x+=40)xs.push(`${x.toFixed(1)},${(roadCenterY(x)+sign*roadHalfWidth(x)).toFixed(1)}`);return `M${xs[0]} L${xs.slice(1).join(' L')}`}

function courseScenes(e){return e?.roadCourse?.scenes||[]}
function themeFor(cue){
 if(cue?.phase==='finish'||cue?.scene==='finish')return'finish';
 if(cue?.phase==='start'||Number(cue?.metres)<=0)return'start';
 if(cue?.scene==='park')return'woodland';
 if(cue?.scene==='hills')return'woodland';
 if(cue?.scene==='water')return'waterside';
 if(cue?.scene==='bridge')return'bridge';
 return'town';
}
function segmentFor(e,d,line=currentLine(e,d)){
 const cue=cueFor(e,d,line),m=clampN(cue?.metres,0,42195),theme=themeFor(cue),programme=/^YOUR PROGRAMME/i.test(String(line||''));
 if(programme)return{fromMetres:42195,toMetres:42195,metres:42195,section:'Finish',theme:'finish',phase:'summary'};
 if(cue?.phase==='start'||m<=0)return{fromMetres:0,toMetres:2000,metres:0,section:cue?.section||courseScenes(e)?.[0]?.[0]||'Start District',theme:'start',phase:'start'};
 if(cue?.phase==='finish'||m>=42195)return{fromMetres:40500,toMetres:42195,metres:42195,section:cue?.section||'Finish Approach',theme:'finish',phase:'finish'};
 const span=m>=35000?900:1250;
 return{fromMetres:Math.max(0,m-span*.55),toMetres:Math.min(42195,m+span*.45),metres:m,section:cue?.section||'Road Course',theme,phase:'race'};
}
function durationFor(line,e,d){
 const seg=segmentFor(e,d,line);
 if(seg.phase==='start')return 15000;
 if(seg.phase==='finish')return 14000;
 if(seg.phase==='summary')return 7000;
 return 9000;
}
function presentationMs(lines,e,d){return (lines||[]).reduce((sum,line)=>sum+durationFor(line,e,d),0)}

function tree(x,y,s=1){return `<g class="road-v2-tree" transform="translate(${x} ${y}) scale(${s})"><rect x="-4" y="4" width="8" height="28" rx="2" fill="#604933"/><circle cy="-4" r="22" fill="#356a48"/><circle cx="-13" cy="3" r="14" fill="#427b53"/><circle cx="13" cy="5" r="15" fill="#2f6242"/></g>`}
function building(x,y,w,h,variant=0){const fills=['#536573','#697986','#435762','#74818a'];const win=Array.from({length:Math.max(2,Math.floor(w/22))},(_,i)=>`<rect x="${x+9+i*18}" y="${y+18}" width="7" height="10" rx="1" fill="#bdd4dc" opacity=".66"/>`).join('');return `<g class="road-v2-building"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fills[variant%fills.length]}"/>${win}<rect x="${x+8}" y="${y+h-18}" width="${Math.max(18,w-16)}" height="12" fill="#283943" opacity=".8"/></g>`}
function lamp(x,y,s=1){return `<g class="road-v2-lamp" transform="translate(${x} ${y}) scale(${s})"><rect x="-2" y="-42" width="4" height="42" fill="#33454f"/><path d="M0 -42 q14 0 14 10" fill="none" stroke="#33454f" stroke-width="3"/><circle cx="14" cy="-30" r="5" fill="#e5e8c9"/></g>`}
function spectator(x,y,i=0){const shirts=['#cf4854','#376f9b','#e3a13a','#2f845e','#78579d'];return `<g class="road-v2-spectator road-v2-spectator-${i%3}" transform="translate(${x} ${y})"><circle cy="-13" r="4" fill="#d2ad91"/><rect x="-4" y="-9" width="8" height="12" rx="3" fill="${shirts[i%shirts.length]}"/><path d="M-3 3 l-3 10 M3 3 l3 10" stroke="#24323a" stroke-width="2"/><path d="M-4 -6 l-7 -5 M4 -6 l7 -4" stroke="#d2ad91" stroke-width="2"/></g>`}
function crowdAlongRoad(dense=false){
 const xs=dense?[70,105,145,190,240,300,365,440,520,605,690,770,835]:[120,205,320,480,650,800];let out='';
 xs.forEach((x,i)=>{const b=roadBoundsAt(x),top=b.top-16,bottom=b.bottom+19;out+=spectator(x,top,i)+spectator(x+10,bottom,i+1)});return out;
}
function barrierLines(){return `<path d="${roadEdgePath(-1)}" fill="none" stroke="#e9edf0" stroke-width="4" opacity=".9"/><path d="${roadEdgePath(1)}" fill="none" stroke="#e9edf0" stroke-width="4" opacity=".9"/>`}
function sceneDecor(theme){
 let far='<rect width="900" height="360" fill="#b9d4df"/>';
 let mid='',near='';
 if(theme==='woodland'){
  far+='<rect y="150" width="900" height="210" fill="#789f78"/><path d="M0 190 Q120 80 260 180 T530 170 T900 145 V360 H0Z" fill="#668e6d" opacity=".8"/>';
  [35,80,125,175,230,690,745,800,855].forEach((x,i)=>{const b=roadBoundsAt(x);mid+=tree(x,i<5?Math.max(85,b.top-35):Math.min(325,b.bottom+15),i%2?.85:1.05)});
  near+=`<g opacity=".55">${[20,95,165,730,815,875].map((x,i)=>`<circle cx="${x}" cy="${i<3?330:70}" r="${24+i%2*9}" fill="#284f38"/>`).join('')}</g>`;
 }else if(theme==='waterside'){
  far+='<rect y="200" width="900" height="160" fill="#79afc1"/><path d="M0 236 C150 220 270 250 420 228 S690 215 900 238" fill="none" stroke="#d9eef4" stroke-width="8" opacity=".4"/>';
  mid+=building(15,83,90,100,1)+building(120,105,75,78,2)+building(690,75,95,112,0)+building(800,98,78,85,3);
  near+='<path d="M0 205 H900" stroke="#47616e" stroke-width="5" opacity=".75"/><path d="M0 214 H900" stroke="#d5e2e6" stroke-width="2" opacity=".7"/>';
  [80,180,710,820].forEach((x,i)=>{const b=roadBoundsAt(x);near+=tree(x,i<2?b.top-42:b.bottom+12,.78)});
 }else if(theme==='bridge'){
  far+='<rect y="185" width="900" height="175" fill="#6ea5bb"/><g opacity=".85">'+building(45,98,90,88,0)+building(150,115,75,72,1)+building(715,100,75,85,2)+building(800,82,82,103,3)+'</g>';
  mid+='<path d="M0 116 Q225 54 450 116 T900 116" fill="none" stroke="#5b6d78" stroke-width="8"/><path d="M0 124 Q225 62 450 124 T900 124" fill="none" stroke="#d8e1e5" stroke-width="2" opacity=".65"/>';
  near+='<g stroke="#526873" stroke-width="3" opacity=".9">'+[70,150,230,310,390,470,550,630,710,790,870].map(x=>`<line x1="${x}" y1="112" x2="${x}" y2="190"/>`).join('')+'</g>';
 }else{
  far+='<rect y="170" width="900" height="190" fill="#94a79c"/>';
  mid+=building(8,72,92,112,0)+building(108,94,75,90,1)+building(192,61,105,123,2)+building(615,77,100,107,3)+building(725,93,72,91,0)+building(808,62,85,122,1);
  [75,170,655,770,850].forEach((x,i)=>{const b=roadBoundsAt(x);near+=lamp(x,i<2?b.top-6:b.bottom+30,.8)});
  [48,320,590,850].forEach((x,i)=>{const b=roadBoundsAt(x);near+=tree(x,i%2?b.bottom+12:b.top-40,.7)});
 }
 const dense=theme==='start'||theme==='finish';
 if(theme==='start'||theme==='finish')near+=crowdAlongRoad(true);else if(theme==='town')near+=crowdAlongRoad(false);
 if(theme==='start'){
  const x=150,b=roadBoundsAt(x);near+=`<g class="road-v2-gantry"><rect x="${x-6}" y="${b.top-28}" width="8" height="${b.bottom-b.top+56}" fill="#182731"/><rect x="${x+108}" y="${b.top-28}" width="8" height="${b.bottom-b.top+56}" fill="#182731"/><rect x="${x-6}" y="${b.top-28}" width="122" height="25" rx="3" fill="#f0f4f6"/><text x="${x+55}" y="${b.top-11}" text-anchor="middle" fill="#14212a" font-size="11" font-weight="900">START</text></g>`;
 }
 if(theme==='finish'){
  const x=760,b=roadBoundsAt(x);near+=`<g class="road-v2-gantry"><rect x="${x-6}" y="${b.top-31}" width="8" height="${b.bottom-b.top+62}" fill="#182731"/><rect x="${x+112}" y="${b.top-31}" width="8" height="${b.bottom-b.top+62}" fill="#182731"/><rect x="${x-6}" y="${b.top-31}" width="126" height="27" rx="3" fill="#f3f6f7"/><text x="${x+57}" y="${b.top-12}" text-anchor="middle" fill="#14212a" font-size="11" font-weight="900">FINISH</text></g>`;
 }
 return `<g class="road-v2-far">${far}${mid}</g><g class="road-v2-near">${near}</g>`;
}
function placementFor(rank,gap,managed=false){
 const leaderX=675,trail=Math.min(470,Math.max(0,Number(gap)||0)*4.6+rank*11),x=clampN(leaderX-trail,165,765),laneSlot=((rank*3)%7)-3,lane=clampN(laneSlot*9+(managed?2:0),-30,30);
 return{x,lane,travel:92+((rank*17)%38)};
}
function runnerMarkup(r,rank,gap,own){
 const p=placementFor(rank,gap,own),b=roadBoundsAt(p.x),y=b.center+p.lane,colour=nationColour(r.nation),pos=rank+1;
 return `<g class="road-v2-runner ${own?'managed':''}" data-road-v2-runner="1" data-x="${p.x.toFixed(2)}" data-lane="${p.lane.toFixed(2)}" data-travel="${p.travel}" transform="translate(${p.x.toFixed(2)} ${y.toFixed(2)})" style="--runner:${esc(colour)};--stride:${(0.58+(rank%4)*.04).toFixed(2)}s"><g class="road-v2-runner-shadow"><ellipse cy="8" rx="10" ry="3" fill="#081219" opacity=".28"/></g><g class="road-v2-body"><circle cy="-25" r="5" fill="#d4ad90"/><path d="M0 -19 L0 -5" stroke="var(--runner)" stroke-width="7" stroke-linecap="round"/><g class="road-v2-arm road-v2-arm-a"><path d="M0 -16 L-8 -7" stroke="#d4ad90" stroke-width="3" stroke-linecap="round"/></g><g class="road-v2-arm road-v2-arm-b"><path d="M0 -16 L8 -8" stroke="#d4ad90" stroke-width="3" stroke-linecap="round"/></g><g class="road-v2-leg road-v2-leg-a"><path d="M0 -5 L-7 8" stroke="#172832" stroke-width="4" stroke-linecap="round"/></g><g class="road-v2-leg road-v2-leg-b"><path d="M0 -5 L7 8" stroke="#172832" stroke-width="4" stroke-linecap="round"/></g><rect x="-8" y="-17" width="16" height="9" rx="2" fill="var(--runner)"/><text y="-10" text-anchor="middle" fill="#fff" font-size="6" font-weight="950">${pos}</text>${own?'<circle cy="-12" r="18" fill="none" stroke="#fff" stroke-width="2" opacity=".92"/>':''}<title>${esc(r.name)} • ${esc(nationLabel(r.nation))}</title></g></g>`;
}
function courseStrip(progress){return `<div class="road-v2-route"><i data-road-v2-progress style="width:${(clampN(progress,0,1)*100).toFixed(2)}%"></i>${[0,10,20,30,40,42.195].map(k=>`<span style="left:${(k/42.195*100).toFixed(2)}%"><b></b><em>${k===42.195?'42.2':k}</em></span>`).join('')}</div>`}
function stageHTML(e,d,rows){
 const line=currentLine(e,d),seg=segmentFor(e,d,line),progress=seg.metres/42195,cp=checkpointFor(e,d,seg.metres),ordered=orderedRows(e,d,rows,seg.metres),ownIds=new Set(e?.entries?.[d]||[]),display=[...ordered.slice(0,10)];
 for(const r of ordered.filter(x=>ownIds.has(x.id)))if(!display.includes(r))display.push(r);
 const runners=display.slice(0,14).map((r,i)=>runnerMarkup(r,i,Number(cp?.gaps?.[r.id]||0),ownIds.has(r.id))).join('');
 const leader=ordered[0],remaining=Math.max(0,42195-seg.metres),fieldExtra=Math.max(0,rows.length-display.length);
 return `<div class="road-v2-stage" data-road-v2-stage="1" data-theme="${seg.theme}" data-phase="${seg.phase}"><div class="road-v2-head"><div><small>LIVE COURSE CAMERA</small><strong>${esc(seg.section)}</strong><span>${esc(e?.location||'')} • ${esc(e?.roadCourse?.profile||'Road course')}</span></div><div class="road-v2-distance"><b data-road-v2-distance>${seg.phase==='start'?'0.0 KM':seg.metres>=42195?'42.195 KM':`${(seg.metres/1000).toFixed(1)} KM`}</b><span>${remaining>0?`${(remaining/1000).toFixed(1)} km remaining`:'FINISH'}</span></div></div>${courseStrip(progress)}<div class="road-v2-camera"><svg class="road-v2-svg" viewBox="0 0 900 360" role="img" aria-label="Animated marathon road broadcast through ${esc(seg.section)}"><defs><linearGradient id="roadV2Sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#cde4ec"/><stop offset="1" stop-color="#a8c7d2"/></linearGradient></defs>${sceneDecor(seg.theme)}<path d="${roadPathPolygon()}" fill="#60686d"/><path class="road-v2-road-mark" d="${roadCentrePath()}" fill="none" stroke="#f1eee1" stroke-width="3" stroke-dasharray="22 24" opacity=".82"/>${barrierLines()}<g class="road-v2-runners">${runners}</g><g class="road-v2-leader-card" transform="translate(24 24)"><rect width="245" height="61" rx="10" fill="#07131d" fill-opacity=".84"/><text x="15" y="20" fill="#97afbc" font-size="9" font-weight="850">${seg.phase==='start'?'START SEQUENCE':seg.phase==='finish'?'FINAL APPROACH':'ROAD CAMERA'}</text><text x="15" y="43" fill="#f4f8fa" font-size="17" font-weight="950">${leader?esc(leader.name):'Field assembling'}</text></g>${fieldExtra?`<g transform="translate(706 311)"><rect width="166" height="30" rx="8" fill="#07131d" fill-opacity=".82"/><text x="83" y="20" text-anchor="middle" fill="#dbe8ee" font-size="9" font-weight="850">+ ${fieldExtra} IN THE FIELD</text></g>`:''}</svg><div class="road-v2-camera-tag"><span>${seg.theme==='woodland'?'WOODLAND SECTION':seg.theme==='waterside'?'RIVERSIDE SECTION':seg.theme==='bridge'?'BRIDGE SECTION':seg.theme==='finish'?'FINISH ZONE':seg.theme==='start'?'START ZONE':'TOWN SECTION'}</span><b>${seg.phase==='summary'?'OFFICIAL RESULT':'LIVE'}</b></div></div></div>`;
}
function animateStage(root,e,d){
 if(activeFrame)cancelAnimationFrame(activeFrame);activeFrame=0;
 if(!root||typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 if(typeof disciplineRunning!=='undefined'&&!disciplineRunning)return;
 const line=currentLine(e,d),seg=segmentFor(e,d,line);if(seg.phase==='summary')return;
 const duration=durationFor(line,e,d),nodes=[...root.querySelectorAll('[data-road-v2-runner]')].map((node,i)=>({node,x:Number(node.dataset.x)||200,lane:Number(node.dataset.lane)||0,travel:Number(node.dataset.travel)||100,index:i})),distance=root.querySelector('[data-road-v2-distance]'),bar=root.querySelector('[data-road-v2-progress]'),start=performance.now();
 function frame(now){
  const t=clampN((now-start)/Math.max(1,duration),0,1),ease=1-Math.pow(1-t,2.2),metres=seg.fromMetres+(seg.toMetres-seg.fromMetres)*ease;
  nodes.forEach(item=>{const drift=Math.sin((t*6.283)+(item.index*.8))*3,x=clampN(item.x+item.travel*ease+drift,145,835),bounds=roadBoundsAt(x),lane=clampN(item.lane,-bounds.halfWidth*.55,bounds.halfWidth*.55),y=bounds.center+lane;item.node.setAttribute('transform',`translate(${x.toFixed(2)} ${y.toFixed(2)})`)});
  if(distance)distance.textContent=metres>=42195?'42.195 KM':`${(metres/1000).toFixed(metres<10000?1:1)} KM`;
  if(bar)bar.style.width=`${(clampN(metres/42195,0,1)*100).toFixed(2)}%`;
  if(t<1)activeFrame=requestAnimationFrame(frame);else activeFrame=0;
 }
 activeFrame=requestAnimationFrame(frame);
}
function renderStage(e,d){
 const root=document.getElementById('roadLiveStage');if(!root)return false;const rows=rowsFor(e,d);root.innerHTML=stageHTML(e,d,rows);animateStage(root,e,d);return true;
}
function bindStartButtons(e,d){
 for(const id of ['startDiscipline','startDisciplineTop']){const b=document.getElementById(id);if(!b||b.disabled)continue;b.onclick=()=>startRoadV2(e,d)}
}
function decorate(){
 const d=typeof activeEventDisc!=='undefined'?activeEventDisc:null;if(!isRoad(d))return false;const e=resolveEvent();if(!e)return false;
 const stage=document.getElementById('roadLiveStage');if(!stage)return false;
 renderStage(e,d);bindStartButtons(e,d);document.querySelector('.road-matchday')?.classList.add('road-broadcast-v2');return true;
}
function pushTimer(fn,ms){const id=setTimeout(fn,ms);try{if(Array.isArray(timers))timers.push(id)}catch(_){}return id}
function finishRoad(e,d,r){
 try{commitDisciplineResults(e,d,r)}catch(err){console.error('[Marathon V2] result commit failed',err);return}
 try{save()}catch(_){}
 try{disciplineRunning=false;liveEventView=null}catch(_){}
 try{
  const ds=(e.disc||[]).filter(x=>x!=='ALL');activeEventDisc=d;competitionMode='discipline';
  if(ds.every(x=>Array.isArray(e.results?.[x])))finaliseEvent(e,false);else{drawCompetition();if(typeof toast==='function')toast((typeof discLabel==='function'?discLabel(d):'Marathon')+' complete — official marathon result confirmed')}
 }catch(err){console.error('[Marathon V2] finish routing failed',err)}
}
function startRoadV2(e,d){
 if(!e||!isRoad(d))return startBase?startBase(e,d):undefined;
 try{if(e.completed||disciplineRunning)return}catch(_){}
 if(Number(e.week)!==Number(s?.game?.week)){try{toast('This marathon is not live yet')}catch(_){}return}
 e.results??={};if(Array.isArray(e.results[d])){activeEventDisc=d;competitionMode='discipline';drawCompetition();return}
 const career=s,r=simulateDiscipline(e,d),lines=commentaryLines(d,r,e);disciplineRunning=true;activeEventDisc=d;competitionMode='discipline';liveEventView={event:e,disc:d,results:r,lines,index:0};e.commentary??={};e.commentary[d]=lines;
 let index=0;
 function show(){
  if(s!==career)return;
  if(index>=lines.length){finishRoad(e,d,r);return}
  liveEventView.index=index;drawCompetition();const line=lines[index],ms=durationFor(line,e,d);index++;pushTimer(show,ms);
 }
 show();
}

const wrappedDraw=function(...args){const out=drawBase.apply(this,args);try{decorate()}catch(err){console.error('[Marathon V2] presentation decorate failed',err)}return out};
try{drawCompetition=wrappedDraw;window.drawCompetition=wrappedDraw}catch(_){}
try{if(typeof startDiscipline==='function'){const wrappedStart=function(e,d){return isRoad(d)?startRoadV2(e,d):startBase?startBase(e,d):undefined};startDiscipline=wrappedStart;window.startDiscipline=wrappedStart}}catch(_){}

window.AMMarathonRoadBroadcastV2={version:VERSION,isRoad,roadCenterY,roadHalfWidth,roadBoundsAt,placementFor,segmentFor,durationFor,presentationMs,stageHTML,renderStage,decorate,start:startRoadV2};
/* Public road API used by integrity tests and future road-race systems. */
window.AMMarathonRoad=window.AMMarathonRoad||{version:1};
Object.assign(window.AMMarathonRoad,{broadcastVersion:VERSION,isRoad,segmentFor,presentationMs});
try{decorate()}catch(_){}
})();
