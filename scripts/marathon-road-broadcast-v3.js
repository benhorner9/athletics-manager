/* Athletics Manager — Marathon Road Broadcast V3
   Simulation-led marathon highlight director. Extends the existing road/track matchday shell;
   it does not create a second event UI. */
(function(){
'use strict';
if(window.__amMarathonRoadBroadcastV3)return;window.__amMarathonRoadBroadcastV3=1;
if(!window.__amMarathonRoadV1||!window.__amMarathonRoadBroadcastV2||typeof drawCompetition!=='function')return;

const VERSION=3;
const DIST=42195;
const ROAD_DISCS=new Set(['MMarathon','WMarathon']);
const EVENT_TYPES=new Set(['START','ATTACK','LEAD_CHANGE','OVERTAKE','PACK_SPLIT','ATHLETE_DROPPED','CHASE_STARTED','GAP_CLOSED','INJURY','MAJOR_FADE','CHECKPOINT','FINAL_KM','FINISH']);
const HIGHLIGHT_WINDOWS=[
 {from:4500,to:14500,target:10000,label:'EARLY RACE'},
 {from:14500,to:25500,target:21097.5,label:'MID RACE'},
 {from:25500,to:35500,target:30000,label:'RACE BREAK'},
 {from:35500,to:41700,target:40000,label:'DECISIVE PHASE'}
];
const STORY_TYPES=new Set(['ATTACK','LEAD_CHANGE','OVERTAKE','PACK_SPLIT','ATHLETE_DROPPED','CHASE_STARTED','GAP_CLOSED','INJURY','MAJOR_FADE','FINAL_KM']);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const lerp=(a,b,t)=>Number(a||0)+(Number(b||0)-Number(a||0))*clamp(t,0,1);
const ease=t=>1-Math.pow(1-clamp(t,0,1),2.15);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isRoad=d=>ROAD_DISCS.has(String(d||''))||!!(typeof DISCIPLINES!=='undefined'&&DISCIPLINES?.[d]?.road);
const athlete=id=>(s?.athletes||[]).find(a=>String(a.id)===String(id));
const roadApi=()=>window.AMMarathonRoadBroadcastV2;
const nationColour=n=>{try{return typeof nationDotColour==='function'?nationDotColour(n):'#5b8da8'}catch(_){return'#5b8da8'}};
const nationText=n=>{try{return typeof nationName==='function'?nationName(n):String(n||'')}catch(_){return String(n||'')}};
const flagText=n=>{try{return typeof flag==='function'?flag(n):String(n||'').slice(0,3)}catch(_){return String(n||'').slice(0,3)}};
const hash=v=>{let x=2166136261;for(const c of String(v)){x^=c.charCodeAt(0);x=Math.imul(x,16777619)}return x>>>0};
const ordinal=n=>{n=Number(n)||0;const m=n%100;if(m>=11&&m<=13)return`${n}th`;return`${n}${n%10===1?'st':n%10===2?'nd':n%10===3?'rd':'th'}`};
const fmtGap=sec=>{const n=Math.max(0,Math.round(Number(sec)||0));return n<=1?'Lead Pack':`+${n<60?`0:${String(n).padStart(2,'0')}`:`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`}`};
const km=m=>m>=DIST?'42.195 KM':Math.abs(m-21097.5)<3?'HALFWAY':m>=1000?`${(m/1000).toFixed(m%1000?1:0)} KM`:`${Math.round(m)} M`;
const raceClock=(d,seconds)=>{try{return fmtPerf(d,Math.max(0,seconds))}catch(_){const n=Math.max(0,Math.round(seconds||0)),h=Math.floor(n/3600),m=Math.floor((n%3600)/60),s=n%60;return`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}};

let drawBase=drawCompetition;
let startBase=typeof startDiscipline==='function'?startDiscipline:null;
let activeSession=null;
let frameId=0;
let segmentTimer=0;

function resolveEvent(){
 try{if(activeSession?.event)return activeSession.event;if(typeof liveEventView!=='undefined'&&liveEventView?.event)return liveEventView.event;if(typeof currentEvent==='function')return currentEvent();}catch(_){}
 return null;
}
function course(e){return e?.roadCourse||{profile:'Road course',scenes:[]}}
function rowsFor(e,d){if(activeSession?.event===e&&activeSession.disc===d)return activeSession.results||[];try{if(liveEventView?.event===e&&liveEventView?.disc===d)return liveEventView.results||[]}catch(_){}return Array.isArray(e?.results?.[d])?e.results[d]:[]}
function checkpoints(e,d){return e?.engine?.[d]?.road?.checkpoints||[]}
function cpGap(cp,id,results){
 const direct=Number(cp?.gaps?.[id]);if(Number.isFinite(direct))return Math.max(0,direct);
 const r=results.find(x=>String(x.id)===String(id)),winner=results[0];return Math.max(0,Number(r?.perf||0)-Number(winner?.perf||0))*Math.pow(clamp(Number(cp?.metres||0)/DIST,.02,1),1.15);
}
function nearestPair(e,d,metres){
 const xs=checkpoints(e,d);if(!xs.length)return[null,null,0];
 let left=xs[0],right=xs.at(-1);for(let i=0;i<xs.length;i++){if(Number(xs[i].metres)<=metres)left=xs[i];if(Number(xs[i].metres)>=metres){right=xs[i];break}}
 const span=Math.max(1,Number(right.metres)-Number(left.metres)),t=clamp((metres-Number(left.metres))/span,0,1);return[left,right,t]
}
function snapshotAt(e,d,results,metres){
 metres=clamp(metres,0,DIST);const [left,right,t]=nearestPair(e,d,metres),ids=new Set(results.map(r=>String(r.id))),rankL=new Map((left?.order||[]).map((id,i)=>[String(id),i])),rankR=new Map((right?.order||[]).map((id,i)=>[String(id),i]));
 const entries=[...ids].map(id=>{const row=results.find(r=>String(r.id)===id),gap=lerp(cpGap(left,id,results),cpGap(right,id,results),t),rl=rankL.get(id)??results.indexOf(row),rr=rankR.get(id)??results.indexOf(row),rankScore=lerp(rl,rr,t);return{row,id,gap,rankScore}}).filter(x=>x.row&&!x.row.dnf&&!x.row.didNotFinish);
 entries.sort((a,b)=>a.gap-b.gap||a.rankScore-b.rankScore||Number(a.row.perf)-Number(b.row.perf));
 const gaps={};entries.forEach((x,i)=>{x.rank=i+1;gaps[x.id]=x.gap});
 let leadPack=0,prev=0;const threshold=metres<10000?3.2:metres<30000?4.2:5.2;for(const x of entries){if(!leadPack||x.gap-prev<=threshold){leadPack++;prev=x.gap}else break}
 return{metres,entries,gaps,leaderId:entries[0]?.id||null,leadPackSize:leadPack,threshold};
}
function rankOf(snapshot,id){const i=snapshot.entries.findIndex(x=>String(x.id)===String(id));return i<0?999:i+1}
function secondGap(snapshot){return Number(snapshot.entries[1]?.gap||0)}
function eventOwnPriority(event,e,d){const own=new Set(e?.entries?.[d]||[]);return event.athleteId&&own.has(event.athleteId)?2:0}
function addEvent(list,event,e,d){
 if(!EVENT_TYPES.has(event.type))return;event.metres=clamp(event.metres,0,DIST);event.priority=Number(event.priority||4)+eventOwnPriority(event,e,d);
 if(list.some(x=>x.type===event.type&&Math.abs(x.metres-event.metres)<450&&String(x.athleteId||'')===String(event.athleteId||'')))return;
 list.push(event);
}
function buildRaceEvents(e,d,results){
 const xs=checkpoints(e,d),events=[],own=new Set(e?.entries?.[d]||[]);if(!xs.length)return events;
 addEvent(events,{type:'START',metres:0,priority:10,reason:'gun'},e,d);
 for(let i=1;i<xs.length;i++){
  const a=snapshotAt(e,d,results,Number(xs[i-1].metres)),b=snapshotAt(e,d,results,Number(xs[i].metres)),from=a.metres,to=b.metres,mid=from+(to-from)*.62;
  if(to<DIST)addEvent(events,{type:'CHECKPOINT',metres:to,priority:[5000,10000,21097.5,30000,35000,40000].some(m=>Math.abs(m-to)<3)?6:3,reason:'timing'},e,d);
  if(a.leaderId&&b.leaderId&&a.leaderId!==b.leaderId)addEvent(events,{type:'LEAD_CHANGE',metres:mid,athleteId:b.leaderId,priority:9,reason:'leader changed'},e,d);
  if(a.leadPackSize-b.leadPackSize>=2)addEvent(events,{type:'PACK_SPLIT',metres:mid,priority:8,reason:`lead pack ${a.leadPackSize}→${b.leadPackSize}`},e,d);
  const a2=secondGap(a),b2=secondGap(b);
  if(b2>=6&&b2-a2>=4)addEvent(events,{type:'ATTACK',metres:mid,athleteId:b.leaderId,priority:9,reason:'front gap opened'},e,d);
  if(a2>=7&&a2-b2>=3)addEvent(events,{type:b2<=2?'GAP_CLOSED':'CHASE_STARTED',metres:mid,athleteId:b.entries[1]?.id||null,priority:b2<=2?9:8,reason:'leader gap reduced'},e,d);
  let biggest=null,bestPass=null;
  for(const x of a.entries.slice(0,18)){
   const rb=rankOf(b,x.id),drop=rb-x.rank,gapLoss=Number(b.gaps[x.id]||0)-Number(a.gaps[x.id]||0),placesGained=x.rank-rb;
   if(drop>=4||gapLoss>=15){const score=drop*3+gapLoss+(own.has(x.id)?20:0);if(!biggest||score>biggest.score)biggest={id:x.id,drop,gain:gapLoss,score}}
   if((placesGained>=2||(placesGained>=1&&rb<=3))&&rb<=18){const score=placesGained*4+(rb<=3?6:0)+(own.has(x.id)?8:0);if(!bestPass||score>bestPass.score)bestPass={id:x.id,fromRank:x.rank,toRank:rb,placesGained,score}}
  }
  if(bestPass)addEvent(events,{type:'OVERTAKE',metres:mid,athleteId:bestPass.id,priority:clamp(6+bestPass.placesGained,7,9),reason:'positions gained',fromRank:bestPass.fromRank,toRank:bestPass.toRank,placesGained:bestPass.placesGained},e,d);
  if(biggest)addEvent(events,{type:'MAJOR_FADE',metres:mid,athleteId:biggest.id,priority:own.has(biggest.id)?9:7,reason:'position/gap deterioration'},e,d);
  for(const id of own){const ra=rankOf(a,id),rb=rankOf(b,id);if(ra<=a.leadPackSize&&rb>b.leadPackSize+1)addEvent(events,{type:'ATHLETE_DROPPED',metres:mid,athleteId:id,priority:9,reason:'programme athlete lost lead pack'},e,d);else if(ra-rb>=4)addEvent(events,{type:'CHASE_STARTED',metres:mid,athleteId:id,priority:9,reason:'programme athlete advanced'},e,d)}
 }
 for(const r of results){if(r?.dnf||r?.didNotFinish||String(r?.status||'').toUpperCase()==='DNF')addEvent(events,{type:'INJURY',metres:Number(r.dropMetres||30000),athleteId:r.id,priority:9,reason:'did not finish'},e,d)}
 addEvent(events,{type:'FINAL_KM',metres:41195,priority:10,reason:'final kilometre'},e,d);
 addEvent(events,{type:'FINISH',metres:DIST,priority:10,reason:'finish'},e,d);
 return events.sort((a,b)=>a.metres-b.metres||b.priority-a.priority);
}
function isMajor(e){return e?.majorChampionship===true||/olympic|world championships?|global championship/i.test(`${e?.name||''} ${e?.level||''}`)}
function sceneAt(e,metres){
 const scenes=course(e).scenes||[],index=Math.min(Math.max(0,scenes.length-1),Math.floor(clamp(metres/DIST,0,.9999)*Math.max(1,scenes.length))),pair=scenes[index]||['Road Course','city'],section=pair[0]||'Road Course',raw=String(pair[1]||'city');
 if(metres>=41600)return{section:'Finish Approach',theme:'finish',scene:'finish'};
 if(raw==='park'||raw==='hills')return{section,theme:'park',scene:raw};if(raw==='water')return{section,theme:'riverside',scene:raw};if(raw==='bridge')return{section,theme:'bridge',scene:raw};
 if(/suburb|outer|residential/i.test(section))return{section,theme:'residential',scene:raw};return{section,theme:'city',scene:raw};
}
function coverageTarget(e,events,results){
 const major=isMajor(e),premium=Number(e?.star||0)>=5,finishGap=Math.max(0,Number(results[1]?.perf||0)-Number(results[0]?.perf||0)),dynamic=events.filter(x=>STORY_TYPES.has(x.type)).length;
 let target=major?88000:premium?79000:70000;target+=Math.min(8000,dynamic*900);if(finishGap<=10)target+=4000;return clamp(target,65000,100000)
}
function commentaryFor(h,e,d,results){
 const snap=h.snapshot,lead=snap.entries[0]?.row,second=snap.entries[1]?.row,leadPack=snap.leadPackSize,own=new Set(e?.entries?.[d]||[]),bestOwn=snap.entries.find(x=>own.has(x.id)),ownText=bestOwn?` ${bestOwn.row.name} is ${ordinal(bestOwn.rank)}${bestOwn.rank===1?'':` (${fmtGap(bestOwn.gap)})`}.`:'';
 if(h.type==='START')return `GAVIN POTTS • START\n${e.location}. ${course(e).profile}. The field is away over 42.195 kilometres. We will cut back to the moments that shape the race.`;
 if(h.type==='ATTACK')return `${km(h.metres)} • ${h.section.toUpperCase()}\nGavin Potts — ${lead?.name||'The leader'} has increased the pressure and a gap is beginning to open. ${leadPack} athlete${leadPack===1?'':'s'} remain in the lead group.${ownText}`;
 if(h.type==='LEAD_CHANGE')return `${km(h.metres)} • LEAD CHANGE\nGavin Potts — ${lead?.name||'A new athlete'} has moved to the front. ${second?`${second.name} is ${fmtGap(secondGap(snap))} back.`:''}${ownText}`;
 if(h.type==='OVERTAKE'){const a=athlete(h.athleteId),entry=snap.entries.find(x=>x.id===h.athleteId),places=Math.max(1,Number(h.placesGained)||1);return `${km(h.metres)} • MOVE THROUGH THE FIELD\nGavin Potts — ${a?.name||entry?.row?.name||'An athlete'} has moved past ${places} runner${places===1?'':'s'} and is now ${entry?ordinal(entry.rank):'moving up the order'}.${ownText}`}
 if(h.type==='PACK_SPLIT')return `${km(h.metres)} • PACK SPLIT\nGavin Potts — The front group has broken apart. ${leadPack} athlete${leadPack===1?'':'s'} remain together at the sharp end.${ownText}`;
 if(h.type==='ATHLETE_DROPPED'||h.type==='MAJOR_FADE'){const a=athlete(h.athleteId);return `${km(h.metres)} • RACE MOVEMENT\nGavin Potts — ${a?.name||'An athlete'} is beginning to lose contact. The gap is widening as fatigue starts to decide the race.${ownText}`}
 if(h.type==='CHASE_STARTED')return `${km(h.metres)} • CHASE\nGavin Potts — The chase is gathering momentum. ${second?`${second.name} is now ${fmtGap(secondGap(snap))} from the lead.`:''}${ownText}`;
 if(h.type==='GAP_CLOSED')return `${km(h.metres)} • GAP CLOSED\nGavin Potts — The break has been brought back. The leaders are together again and the race resets.${ownText}`;
 if(h.type==='INJURY'){const a=athlete(h.athleteId);return `${km(h.metres)} • RACE INCIDENT\nGavin Potts — ${a?.name||'An athlete'} is out of the race. The field continues without them.`}
 if(h.type==='FINAL_KM')return `FINAL KILOMETRE\nGavin Potts — One kilometre remains. ${lead?.name||'The leader'} has the road ahead${second?`, with ${second.name} ${fmtGap(secondGap(snap))}`:''}. There is no room left to wait.${ownText}`;
 if(h.type==='FINISH'){const winner=results[0],runner=results[1];return `FINISH • 42.195 KM\nGavin Potts — ${winner?`${winner.name} reaches the line first and wins in ${raceClock(d,winner.perf)}`:'The winner reaches the line'}${runner?`. ${runner.name} is ${fmtGap(Number(runner.perf)-Number(winner.perf))} behind.`:''}`}
 const projected=lead&&h.metres>0?Number(lead.perf)*(h.metres/DIST):0;
 if(Math.abs(h.metres-21097.5)<5)return `HALF MARATHON • ${h.section.toUpperCase()}\nGavin Potts — ${lead?.name||'The lead group'} reaches halfway in approximately ${raceClock(d,projected)}. ${leadPack} athlete${leadPack===1?'':'s'} remain in the lead pack.${ownText}`;
 return `${km(h.metres)} • ${h.section.toUpperCase()}\nGavin Potts — ${lead?.name||'The leader'} controls the front. ${leadPack>1?`${leadPack} athletes are still together in the lead pack.`:'The race has a clear leader.'}${second&&secondGap(snap)>2?` Second place is ${fmtGap(secondGap(snap))}.`:''}${ownText}`;
}
function storyScore(ev,window,e,d){
 const own=new Set(e?.entries?.[d]||[]),story=STORY_TYPES.has(ev.type)?24:0,ownBoost=ev.athleteId&&own.has(ev.athleteId)?12:0,lateBoost=window.from>=35500&&['ATTACK','LEAD_CHANGE','GAP_CLOSED','FINAL_KM'].includes(ev.type)?8:0,centrePenalty=Math.abs(Number(ev.metres)-window.target)/1000;
 return Number(ev.priority||0)*10+story+ownBoost+lateBoost-centrePenalty;
}
function pickWindowMoment(events,window,e,d){
 const inside=events.filter(ev=>ev.type!=='START'&&ev.type!=='FINISH'&&Number(ev.metres)>=window.from&&Number(ev.metres)<=window.to),dynamic=inside.filter(ev=>STORY_TYPES.has(ev.type)),pool=dynamic.length?dynamic:inside;
 if(pool.length)return{...pool.sort((a,b)=>storyScore(b,window,e,d)-storyScore(a,window,e,d)||Math.abs(a.metres-window.target)-Math.abs(b.metres-window.target))[0],window:window.label};
 return{type:'CHECKPOINT',metres:window.target,priority:5,reason:'race checkpoint',window:window.label,standard:true};
}
function director(e,d,results){
 const events=buildRaceEvents(e,d,results),major=isMajor(e),moments=[{type:'START',metres:0,priority:10,reason:'gun',window:'START'},...HIGHLIGHT_WINDOWS.map(w=>pickWindowMoment(events,w,e,d)),{type:'FINISH',metres:DIST,priority:10,reason:'finish',window:'FINISH'}],target=coverageTarget(e,events,results);
 const weights=moments.map((m,i)=>i===0?.9:i===moments.length-1?1.2:1+Math.max(0,Number(m.priority||5)-6)*.08),unit=target/weights.reduce((a,b)=>a+b,0);
 const highlights=moments.map((m,i)=>{
  const scene=sceneAt(e,m.metres),phase=m.type==='START'?'start':m.type==='FINISH'?'finish':m.type==='FINAL_KM'?'final':'race';
  let from=m.type==='START'?0:Math.max(0,m.metres-(m.metres>=35000?420:620)),to=m.type==='FINISH'?DIST:Math.min(DIST,m.metres+(m.metres>=35000?520:720));if(m.type==='START')to=1400;if(m.type==='FINISH')from=41700;if(m.type==='FINAL_KM'){from=40850;to=41650}
  const snapshot=snapshotAt(e,d,results,m.metres),own=(e.entries?.[d]||[]).includes(m.athleteId),camera=m.type==='START'?'wide':m.type==='FINISH'?'finish':m.type==='ATTACK'||m.type==='LEAD_CHANGE'?'breakaway':m.type==='OVERTAKE'||own?'athlete':m.type==='PACK_SPLIT'?'wide':'pack',durationMs=Math.round(clamp(unit*weights[i],8500,18000));
  const h={...m,...scene,phase,fromMetres:from,toMetres:to,snapshot,camera,durationMs};h.commentary=commentaryFor(h,e,d,results);return h
 });
 const total=highlights.reduce((n,h)=>n+h.durationMs,0);return{version:VERSION,events,highlights,targetMs:target,presentationMs:total,major};
}
function gapPixels(sec){sec=Math.max(0,Number(sec)||0);return Math.min(525,sec<=12?sec*8.2:98+Math.sqrt(sec-12)*15.5)}
function laneFor(id,rank,half){const seed=(hash(id)%1000)/1000,lane=(seed-.5)*Math.min(half*.82,44)+(((rank%3)-1)*3.5);return clamp(lane,-half*.62,half*.62)}
function positionFor(entry,metres){const x=clamp(690-gapPixels(entry.gap),130,735),bounds=roadApi().roadBoundsAt(x),lane=laneFor(entry.id,entry.rank,bounds.halfWidth),y=bounds.center+lane;return{x,y,lane,halfWidth:bounds.halfWidth}}
function roadPolygon(){const pts=[];for(let x=-30;x<=930;x+=40){const b=roadApi().roadBoundsAt(x);pts.push([x,b.top,b.bottom])}const top=pts.map(p=>`${p[0]},${p[1]}`).join(' L'),bot=[...pts].reverse().map(p=>`${p[0]},${p[2]}`).join(' L');return`M${top} L${bot} Z`}
function centrePath(){const pts=[];for(let x=-30;x<=930;x+=40){const b=roadApi().roadBoundsAt(x);pts.push(`${x},${b.center}`)}return`M${pts.join(' L')}`}
function edgePath(sign){const pts=[];for(let x=-30;x<=930;x+=40){const b=roadApi().roadBoundsAt(x);pts.push(`${x},${sign<0?b.top:b.bottom}`)}return`M${pts.join(' L')}`}
function tree(x,y,s=1){return`<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="5" width="6" height="23" rx="2" fill="#684b34"/><circle cy="-2" r="18" fill="#376d49"/><circle cx="-11" cy="4" r="11" fill="#468257"/><circle cx="11" cy="5" r="12" fill="#2f6342"/></g>`}
function building(x,y,w,h){return`<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#566875"/><g fill="#bdd1d8" opacity=".62">${Array.from({length:Math.max(2,Math.floor(w/20))},(_,i)=>`<rect x="${x+8+i*18}" y="${y+15}" width="7" height="9"/>`).join('')}</g></g>`}
function spectator(x,y,i){const c=['#d94b58','#3d779f','#dca13d','#378760','#765c9b'][i%5];return`<g transform="translate(${x} ${y})"><circle cy="-10" r="3.5" fill="#d8b296"/><rect x="-3.5" y="-7" width="7" height="10" rx="3" fill="${c}"/></g>`}
function scenery(theme,crowd){
 let bg='<rect width="900" height="360" fill="#b9d4df"/>',far='',near='';
 if(theme==='park'){bg+='<rect y="150" width="900" height="210" fill="#87aa80"/>';[35,80,125,180,235,675,730,790,850].forEach((x,i)=>{const b=roadApi().roadBoundsAt(x);far+=tree(x,i<5?b.top-34:b.bottom+14,i%2?.85:1.05)})}
 else if(theme==='riverside'){bg+='<rect y="205" width="900" height="155" fill="#77afc2"/><path d="M0 235 C150 220 300 250 460 226 S720 214 900 236" fill="none" stroke="#d8edf4" stroke-width="8" opacity=".38"/>';far+=building(20,90,92,92)+building(125,112,68,70)+building(710,93,74,87)+building(795,76,86,104)}
 else if(theme==='bridge'){bg+='<rect y="190" width="900" height="170" fill="#76a9bd"/><path d="M0 120 Q225 58 450 120 T900 120" fill="none" stroke="#5b6e78" stroke-width="8"/>';far+=[70,150,230,310,390,470,550,630,710,790,870].map(x=>`<line x1="${x}" y1="116" x2="${x}" y2="192" stroke="#586c75" stroke-width="3"/>`).join('')}
 else {bg+='<rect y="168" width="900" height="192" fill="#96a89d"/>';far+=building(8,75,92,105)+building(110,96,76,84)+building(200,62,98,118)+building(620,80,96,100)+building(730,95,72,85)+building(810,65,84,115);if(theme==='residential'){far='';[30,110,190,690,770,850].forEach((x,i)=>{const b=roadApi().roadBoundsAt(x);far+=`<g><rect x="${x}" y="${i<3?b.top-72:b.bottom+15}" width="58" height="46" rx="3" fill="#748580"/><path d="M${x-4} ${i<3?b.top-72:b.bottom+15} l33 -22 l33 22" fill="#5b665f"/></g>`})}}
 const count=crowd==='dense'?16:crowd==='medium'?9:4;for(let i=0;i<count;i++){const x=55+i*(790/Math.max(1,count-1)),b=roadApi().roadBoundsAt(x);near+=spectator(x,b.top-14,i)+spectator(x+8,b.bottom+17,i+1)}
 return`<g class="road-v3-scroll-far">${bg}${far}</g><g class="road-v3-scroll-near">${near}</g>`;
}
function weatherFor(e,d){
 const existing=e?.engine?.[d]?.road?.weather;if(existing)return existing;const penalty=Number(course(e).weatherSeconds)||0,seed=hash(`${e?.id}|${s?.game?.season||1}|weather`)%3,state=penalty>=7?(seed===0?'Rain':'Windy'):penalty>=4?(seed===0?'Overcast':'Windy'):'Clear',base=/tokyo/i.test(e?.location||'')?19:/london|rotterdam/i.test(e?.location||'')?14:/zurich/i.test(e?.location||'')?13:16,tempC=base+(hash(`${e?.id}|temp`)%5);const w={state,tempC,penaltySeconds:penalty};try{e.engine[d].road.weather=w}catch(_){}return w
}
function weatherMarkup(w){if(w.state==='Rain')return'<g class="road-v3-rain" opacity=".32">'+Array.from({length:26},(_,i)=>`<line x1="${(i*47)%900}" y1="${(i*29)%330}" x2="${(i*47)%900-8}" y2="${(i*29)%330+18}" stroke="#dcecf2" stroke-width="2"/>`).join('')+'</g>';if(w.state==='Overcast')return'<rect width="900" height="360" fill="#6b7e87" opacity=".1"/>';return''}
function timingGate(h){if(h.metres<4500||h.metres>DIST-300)return'';const x=735,b=roadApi().roadBoundsAt(x);return`<g class="road-v3-gate"><rect x="${x}" y="${b.top-23}" width="5" height="${b.bottom-b.top+46}" fill="#263842"/><rect x="${x+58}" y="${b.top-23}" width="5" height="${b.bottom-b.top+46}" fill="#263842"/><rect x="${x}" y="${b.top-23}" width="63" height="19" rx="2" fill="#f0f4f6"/><text x="${x+31}" y="${b.top-10}" text-anchor="middle" fill="#17242c" font-size="9" font-weight="900">${esc(km(h.metres))}</text></g>`}
function drinkStation(h){if(h.metres<10000||h.metres>38000||Math.abs((h.metres%5000))>900)return'';const x=505,b=roadApi().roadBoundsAt(x);return`<g class="road-v3-drinks" transform="translate(${x} ${b.top-28})"><rect width="70" height="13" rx="3" fill="#e9f1f4"/><text x="35" y="10" text-anchor="middle" font-size="7" fill="#19313b" font-weight="900">DRINKS</text><rect x="8" y="14" width="54" height="5" fill="#315d70"/></g>`}
function crowdLevel(h){if(h.phase==='finish'||h.metres>=40000)return'dense';if(h.theme==='city'||h.metres<5000)return'medium';return'light'}
function markerMarkup(entry,e,d){const p=positionFor(entry,entry.snapshotMetres||0),own=(e?.entries?.[d]||[]).includes(entry.id),colour=nationColour(entry.row.nation),tag=own?`<g class="road-v3-own-tag" transform="translate(0 -23)"><rect x="-34" y="-13" width="68" height="14" rx="5" fill="#07131d" fill-opacity=".88"/><text y="-3" text-anchor="middle" fill="#fff" font-size="7" font-weight="850">${esc(entry.row.name.split(' ').at(-1))}</text></g>`:'';return`<g class="road-v3-marker ${own?'own':''}" data-road-v3-runner="1" data-runner-id="${esc(entry.id)}" data-x="${p.x.toFixed(2)}" data-lane="${p.lane.toFixed(2)}" transform="translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})"><circle class="road-v3-marker-shadow" cy="5" r="10" fill="#08131b" opacity=".18"/><circle class="road-v3-dot" r="${own?10:8.5}" fill="${esc(colour)}" stroke="${own?'#ffffff':'#10212b'}" stroke-width="${own?3:1.8}"/><text class="road-v3-pos" y="2.8" text-anchor="middle" fill="#fff" font-size="6.5" font-weight="950">${entry.rank}</text>${tag}<title>${esc(entry.row.name)} • ${esc(nationText(entry.row.nation))}</title></g>`}
function selectDisplay(snapshot,e,d,h){
 const own=new Set(e?.entries?.[d]||[]),picked=[],seen=new Set();const take=x=>{if(x&&!seen.has(x.id)){picked.push(x);seen.add(x.id)}};
 if(h.phase==='start'){snapshot.entries.slice(0,16).forEach(take);snapshot.entries.filter(x=>own.has(x.id)).forEach(take);return picked.slice(0,18)}
 if(h.phase==='finish'){snapshot.entries.slice(0,4).forEach(take);snapshot.entries.filter(x=>own.has(x.id)&&x.rank<=6).forEach(take);return picked.slice(0,6)}
 snapshot.entries.slice(0,h.camera==='wide'?10:7).forEach(take);
 if(h.athleteId){const idx=snapshot.entries.findIndex(x=>x.id===h.athleteId);for(let i=Math.max(0,idx-2);i<=Math.min(snapshot.entries.length-1,idx+2);i++)take(snapshot.entries[i])}
 snapshot.entries.filter(x=>own.has(x.id)&&x.rank<=12).forEach(take);return picked.slice(0,10)
}
function progressHTML(m){const p=clamp(m/DIST,0,1)*100;return`<div class="road-v3-progress"><div class="road-v3-progress-track"><i data-road-v3-progress style="width:${p.toFixed(2)}%"></i><b data-road-v3-progress-dot style="left:${p.toFixed(2)}%"></b></div><div><span>START</span><strong data-road-v3-progress-text>${(m/1000).toFixed(1)} / 42.2 KM</strong><span>FINISH</span></div></div>`}
function stageHTML(e,d,results,h){
 const snap=h.snapshot||snapshotAt(e,d,results,h.metres),display=selectDisplay(snap,e,d,h),w=weatherFor(e,d),crowd=crowdLevel(h),leader=snap.entries[0]?.row,clock=leader?h.metres/DIST*Number(leader.perf||0):0,fieldExtra=Math.max(0,results.length-display.length),finish=h.phase==='finish';display.forEach(x=>x.snapshotMetres=h.metres);
 return`<div class="road-v3-stage" data-road-v3-stage="1" data-theme="${h.theme}" data-phase="${h.phase}" data-camera="${h.camera}"><header class="road-v3-head"><div><small>MARATHON HIGHLIGHTS • ${esc(h.camera.toUpperCase())} CAMERA</small><strong>${esc(h.section)}</strong><span>${esc(e.location||'')} • ${esc(course(e).profile)} • ${esc(w.state)} ${w.tempC}°C</span></div><div class="road-v3-clock"><b data-road-v3-distance>${km(h.metres)}</b><span data-road-v3-clock>${clock?raceClock(d,clock):'0:00:00'}</span></div></header>${progressHTML(h.metres)}<div class="road-v3-camera"><svg viewBox="0 0 900 360" role="img" aria-label="Marathon highlight at ${esc(h.section)}">${scenery(h.theme,crowd)}${weatherMarkup(w)}<path d="${roadPolygon()}" fill="#60686d"/><path class="road-v3-road-mark" d="${centrePath()}" fill="none" stroke="#f2eee0" stroke-width="3" stroke-dasharray="22 24" opacity=".82"/><path d="${edgePath(-1)}" fill="none" stroke="#edf1f2" stroke-width="4" opacity=".9"/><path d="${edgePath(1)}" fill="none" stroke="#edf1f2" stroke-width="4" opacity=".9"/>${timingGate(h)}${drinkStation(h)}${finish?finishGantry():''}<g class="road-v3-runners">${display.map(x=>markerMarkup(x,e,d)).join('')}</g><g class="road-v3-info" transform="translate(22 22)"><rect width="235" height="58" rx="9" fill="#06131d" fill-opacity=".86"/><text x="14" y="19" fill="#8da5b1" font-size="8" font-weight="850">${esc(h.type.replaceAll('_',' '))}</text><text x="14" y="41" fill="#f5f9fb" font-size="15" font-weight="950">${leader?esc(leader.name):'Field'}</text></g>${fieldExtra?`<g transform="translate(720 315)"><rect width="155" height="27" rx="7" fill="#07131d" fill-opacity=".82"/><text x="77" y="18" text-anchor="middle" fill="#dce8ed" font-size="8" font-weight="850">+ ${fieldExtra} IN FIELD</text></g>`:''}</svg><div class="road-v3-camera-tag"><span>${esc(h.type.replaceAll('_',' '))}</span><b>${h.phase==='finish'?'FINISH':'HIGHLIGHT'}</b></div></div></div>`
}
function finishGantry(){const x=780,b=roadApi().roadBoundsAt(x);return`<g class="road-v3-finish"><rect x="${x}" y="${b.top-32}" width="7" height="${b.bottom-b.top+64}" fill="#172630"/><rect x="${x+92}" y="${b.top-32}" width="7" height="${b.bottom-b.top+64}" fill="#172630"/><rect x="${x}" y="${b.top-32}" width="99" height="25" rx="3" fill="#f5f7f8"/><text x="${x+49}" y="${b.top-15}" text-anchor="middle" fill="#14212a" font-size="10" font-weight="950">FINISH</text><path d="M${x} ${b.top} L${x} ${b.bottom}" stroke="#fff" stroke-width="4"/></g>`}
function boardHTML(e,d,snapshot){
 const own=new Set(e?.entries?.[d]||[]),show=[],seen=new Set();for(const x of snapshot.entries.slice(0,9)){show.push(x);seen.add(x.id)}for(const x of snapshot.entries.filter(x=>own.has(x.id)))if(!seen.has(x.id)){show.push(x);seen.add(x.id)}
 return`<div class="road-v3-board-head"><span>LIVE ORDER</span><b>${km(snapshot.metres)}</b></div><div class="road-v3-board-rows">${show.slice(0,13).map(x=>`<div class="road-v3-board-row ${own.has(x.id)?'own':''}" data-board-id="${esc(x.id)}"><strong>${x.rank}</strong><span>${flagText(x.row.nation)} ${esc(x.row.name)}<small>${esc(nationText(x.row.nation))}</small></span><b>${x.rank===1?'LEADER':x.gap<=1.5?'LEAD PACK':fmtGap(x.gap)}</b></div>`).join('')}</div>`
}
function resultsHTML(e,d,results){
 const own=new Set(e?.entries?.[d]||[]),winner=results[0],show=[...results.slice(0,16)];for(const r of results.filter(x=>own.has(x.id)))if(!show.includes(r))show.push(r);
 return`<div class="road-v3-results"><header><div><small>OFFICIAL RESULT • MARATHON</small><h2>${esc(e.name)} — ${esc(typeof discLabel==='function'?discLabel(d):d)}</h2><span>${esc(e.location||'')} • 42.195 KM</span></div><button class="btn primary" type="button" data-road-v3-continue>CONTINUE</button></header><div class="road-v3-result-head"><span>POS</span><span>ATHLETE</span><span>NATION</span><span>TIME</span><span>GAP</span><span>MARK</span></div><div class="road-v3-result-rows">${show.map((r,i)=>{const pos=results.indexOf(r)+1,gap=Math.max(0,Number(r.perf)-Number(winner?.perf||r.perf)),mark=r.roadAward||'';return`<div class="road-v3-result-row ${own.has(r.id)?'own':''}"><strong>${pos}</strong><span>${esc(r.name)}</span><span>${flagText(r.nation)} ${esc(String(r.nation||'').slice(0,3))}</span><b>${raceClock(d,r.perf)}</b><span>${pos===1?'—':fmtGap(gap)}</span><em>${esc(mark||'')}</em></div>`}).join('')}</div></div>`
}
function annotateAwards(d,results,prePB){const wr=Number(typeof WORLD_RECORDS!=='undefined'?WORLD_RECORDS[d]:0)||0;for(const r of results){const old=Number(prePB.get(String(r.id)));if(wr&&Number(r.perf)<wr)r.roadAward='WR';else if(Number.isFinite(old)&&Number(r.perf)<old)r.roadAward='PB';else r.roadAward=''}}
function updateBoard(e,d,snapshot){const board=document.getElementById('roadLiveBoard');if(board)board.innerHTML=boardHTML(e,d,snapshot)}
function animateStage(root,e,d,results,h){
 if(frameId)cancelAnimationFrame(frameId);frameId=0;if(!root||h.phase==='summary')return;const nodes=new Map([...root.querySelectorAll('[data-road-v3-runner]')].map(n=>[String(n.dataset.runnerId),n])),start=performance.now(),duration=Math.max(1,h.durationMs),progress=root.querySelector('[data-road-v3-progress]'),dot=root.querySelector('[data-road-v3-progress-dot]'),pt=root.querySelector('[data-road-v3-progress-text]'),distance=root.querySelector('[data-road-v3-distance]'),clock=root.querySelector('[data-road-v3-clock]');let boardTick=-1;
 function frame(now){
  const t=clamp((now-start)/duration,0,1),q=ease(t),metres=lerp(h.fromMetres,h.toMetres,q),snap=snapshotAt(e,d,results,metres),by=new Map(snap.entries.map(x=>[x.id,x]));
  for(const [id,node] of nodes){const entry=by.get(id);if(!entry){node.style.opacity='0';continue}entry.snapshotMetres=metres;let pos=positionFor(entry,metres);if(h.phase==='finish'){const gap=Math.max(0,Number(entry.row.perf)-Number(results[0]?.perf||entry.row.perf)),delay=Math.min(.55,gap/75*.45),rt=clamp((t-delay)/Math.max(.15,1-delay),0,1),x=clamp(540+rt*325,130,865),b=roadApi().roadBoundsAt(x);pos={x,y:b.center+laneFor(id,entry.rank,b.halfWidth),lane:laneFor(id,entry.rank,b.halfWidth),halfWidth:b.halfWidth}}
   node.setAttribute('transform',`translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)})`);node.dataset.x=pos.x.toFixed(2);node.dataset.lane=pos.lane.toFixed(2);node.querySelector('.road-v3-pos')?.replaceChildren(String(entry.rank));
  }
  const pct=clamp(metres/DIST,0,1)*100;if(progress)progress.style.width=`${pct.toFixed(2)}%`;if(dot)dot.style.left=`${pct.toFixed(2)}%`;if(pt)pt.textContent=`${(metres/1000).toFixed(1)} / 42.2 KM`;if(distance)distance.textContent=km(metres);const leader=snap.entries[0]?.row;if(clock&&leader)clock.textContent=raceClock(d,Number(leader.perf)*(metres/DIST));
  const tick=Math.floor(now/350);if(tick!==boardTick){boardTick=tick;updateBoard(e,d,snap)}
  if(t<1&&activeSession?.event===e)frameId=requestAnimationFrame(frame);else frameId=0
 }
 frameId=requestAnimationFrame(frame)
}
function renderStage(e,d,results,h){const root=document.getElementById('roadLiveStage');if(!root)return false;root.innerHTML=stageHTML(e,d,results,h);updateBoard(e,d,h.snapshot||snapshotAt(e,d,results,h.metres));animateStage(root,e,d,results,h);return true}
function renderResults(e,d,results){const root=document.getElementById('roadLiveStage');if(!root)return false;root.innerHTML=resultsHTML(e,d,results);const board=document.getElementById('roadLiveBoard');if(board)board.innerHTML=boardHTML(e,d,snapshotAt(e,d,results,DIST));root.querySelector('[data-road-v3-continue]')?.addEventListener('click',()=>{competitionMode='overview';drawCompetition()});return true}
function bindButtons(e,d){for(const id of ['startDiscipline','startDisciplineTop']){const b=document.getElementById(id);if(b&&!b.disabled)b.onclick=()=>startRoadV3(e,d)}const top=document.querySelector('.matchday-scorebar-right');if(activeSession?.event===e&&activeSession.disc===d&&top&&!document.getElementById('roadV3Skip')){const b=document.createElement('button');b.id='roadV3Skip';b.type='button';b.className='btn ghost road-v3-skip';b.textContent='SKIP TO FINISH';b.onclick=()=>finishSession(true);top.appendChild(b)}}
function decorate(){const d=typeof activeEventDisc!=='undefined'?activeEventDisc:null;if(!isRoad(d))return false;const e=resolveEvent();if(!e)return false;bindButtons(e,d);document.querySelector('.road-matchday')?.classList.add('road-broadcast-v3');if(activeSession?.event===e&&activeSession.disc===d){const h=activeSession.highlights[activeSession.index];if(h)renderStage(e,d,activeSession.results,h);return true}if(Array.isArray(e.results?.[d])){renderResults(e,d,e.results[d]);return true}return false}
function clearPlayback(){if(segmentTimer){clearTimeout(segmentTimer);segmentTimer=0}if(frameId){cancelAnimationFrame(frameId);frameId=0}}
function finishSession(skipped=false){const session=activeSession;if(!session)return;clearPlayback();const{event:e,disc:d,results}=session;try{commitDisciplineResults(e,d,results)}catch(err){console.error('[Marathon V3] result commit failed',err);return}try{e.engine[d].road.v3Coverage={version:VERSION,presentationMs:session.presentationMs,highlights:session.highlights.map(h=>({type:h.type,metres:h.metres,durationMs:h.durationMs,camera:h.camera,theme:h.theme})),skipped:!!skipped,completed:true}}catch(_){}try{save()}catch(_){}try{disciplineRunning=false;liveEventView=null}catch(_){}activeSession=null;try{const ds=(e.disc||[]).filter(x=>x!=='ALL');if(ds.every(x=>Array.isArray(e.results?.[x]))&&typeof finaliseEvent==='function')finaliseEvent(e,false)}catch(err){console.warn('[Marathon V3] event finalise warning',err)}try{activeEventDisc=d;competitionMode='discipline';drawCompetition()}catch(err){console.error('[Marathon V3] result screen failed',err)}}
function startRoadV3(e,d){
 if(!e||!isRoad(d))return startBase?startBase(e,d):undefined;try{if(e.completed||disciplineRunning)return}catch(_){}if(Number(e.week)!==Number(s?.game?.week)){try{toast('This marathon is not live yet')}catch(_){}return}e.results??={};if(Array.isArray(e.results[d])){activeEventDisc=d;competitionMode='discipline';drawCompetition();return}
 const career=s,prePB=new Map((s?.athletes||[]).map(a=>[String(a.id),Number(a.pb)])),results=simulateDiscipline(e,d);annotateAwards(d,results,prePB);const plan=director(e,d,results),meta=e.engine?.[d];if(meta?.road){meta.road.raceEvents=plan.events.map(x=>({...x}));meta.road.highlightDirector={version:VERSION,targetMs:plan.targetMs,presentationMs:plan.presentationMs,major:plan.major,highlights:plan.highlights.map(h=>({type:h.type,metres:h.metres,durationMs:h.durationMs,camera:h.camera,theme:h.theme,athleteId:h.athleteId||null,window:h.window||null}))};meta.broadcastCues={};for(const h of plan.highlights)meta.broadcastCues[h.commentary]={family:'road',metres:h.metres,section:h.section,scene:h.scene,phase:h.phase,type:h.type}}
 disciplineRunning=true;activeEventDisc=d;competitionMode='discipline';const lines=plan.highlights.map(h=>h.commentary);liveEventView={event:e,disc:d,results,lines,index:0};e.commentary??={};e.commentary[d]=lines;activeSession={career,event:e,disc:d,results,events:plan.events,highlights:plan.highlights,index:0,presentationMs:plan.presentationMs};
 function show(){if(!activeSession||s!==career)return;if(activeSession.index>=activeSession.highlights.length){finishSession(false);return}liveEventView.index=activeSession.index;drawCompetition();const h=activeSession.highlights[activeSession.index];segmentTimer=setTimeout(()=>{if(!activeSession)return;activeSession.index++;show()},h.durationMs)}show()
}
const wrappedDraw=function(...args){const out=drawBase.apply(this,args);try{decorate()}catch(err){console.error('[Marathon V3] presentation decorate failed',err)}return out};
try{drawCompetition=wrappedDraw;window.drawCompetition=wrappedDraw}catch(_){}
try{if(typeof startDiscipline==='function'){const wrappedStart=function(e,d){return isRoad(d)?startRoadV3(e,d):startBase?startBase(e,d):undefined};startDiscipline=wrappedStart;window.startDiscipline=wrappedStart}}catch(_){}

window.AMMarathonHighlightDirector={version:VERSION,buildRaceEvents,direct:director,snapshotAt,highlightWindows:HIGHLIGHT_WINDOWS};
window.AMMarathonRoadBroadcastV3={version:VERSION,isRoad,buildRaceEvents,direct:director,snapshotAt,positionFor,presentationMs:hs=>(hs||[]).reduce((n,h)=>n+Number(h.durationMs||0),0),stageHTML,renderStage,renderResults,start:startRoadV3,skip:()=>finishSession(true),debug:()=>activeSession?{disc:activeSession.disc,index:activeSession.index,total:activeSession.highlights.length,presentationMs:activeSession.presentationMs}:null};
window.AMMarathonRoad=window.AMMarathonRoad||{};Object.assign(window.AMMarathonRoad,{broadcastVersion:VERSION,highlightDirectorVersion:VERSION,buildRaceEvents,directHighlights:director});
try{decorate()}catch(_){}
})();
