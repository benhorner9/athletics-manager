/* ===== Athletics Manager Live Event Engine V1 ===== */
(function(){
'use strict';
if(window.__amLiveEventEngineV1)return;window.__amLiveEventEngineV1=1;

const $=id=>document.getElementById(id);
const esc=v=>typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const ath=id=>(s?.athletes||[]).find(a=>String(a.id)===String(id))||null;
const managed=()=>typeof managedNation==='function'?managedNation():'';
const label=d=>typeof discLabel==='function'?discLabel(d):String(d||'Event');
const dtype=d=>DISCIPLINES?.[d]?.type||'';
const distance=d=>Number(DISCIPLINES?.[d]?.distance)||0;
const fmt=(d,v)=>typeof fmtPerf==='function'?fmtPerf(d,v):(Number.isFinite(+v)?String(+v):'—');
const nationColour=n=>{try{return nationDotColour(n)||'#7ea7bf'}catch(_){return'#7ea7bf'}};
const hash=v=>{try{return hashString(String(v))>>>0}catch(_){let h=2166136261;for(const c of String(v)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}};
const stable=(key,min=0,max=1)=>min+(hash(key)%10000)/10000*(max-min);
const deep=v=>{try{return structuredClone(v)}catch(_){try{return JSON.parse(JSON.stringify(v))}catch(__){return v}}};
const nowStamp=()=>new Date().toISOString();

const SPEEDS=[1,2,4];
const TRACK={left:190,right:570,cy:225,inner:76,lane:11};
const PREF_LANES=[4,5,3,6,2,7,1,8];
const THROW_CODES=/^(SP|DT|HT|JT)$/i;
const HORIZONTAL_CODES=/^(LJ|TJ)$/i;
const VERTICAL_CODES=/^(HJ|PV)$/i;

function family(d){
 const code=String(d||''),t=dtype(d),m=distance(d);
 if(t==='time')return m<=800?'lane':'distance';
 if(VERTICAL_CODES.test(code)||t==='height')return'vertical';
 if(HORIZONTAL_CODES.test(code))return'horizontal';
 if(THROW_CODES.test(code))return'throw';
 if(t==='distance')return'throw';
 return'generic';
}
function configFor(d){
 const f=family(d),m=distance(d),code=String(d||'').toUpperCase();
 return {
  family:f,
  lanes:f==='lane'?8:0,
  maxAthletes:8,
  distance:m,
  laps:m>0?Math.max(1,Math.ceil(m/400)):0,
  attempts:['throw','horizontal'].includes(f)?6:0,
  unit:['throw','horizontal','vertical'].includes(f)?'m':'s',
  viewer:f==='lane'||f==='distance'?'track':f,
  reorderAfterRound:['throw','horizontal'].includes(f)?3:null,
  code
 };
}
window.AMLiveEventConfig={configFor};

function statusOf(r){
 const raw=String(r?.status||r?.resultStatus||'').toUpperCase();
 if(raw.includes('DNS')||r?.dns)return'DNS';
 if(raw.includes('DNF')||r?.dnf)return'DNF';
 if(raw.includes('DQ')||r?.dq||r?.disqualified)return'DQ';
 return'';
}
function resultValue(r){const n=Number(r?.mark??r?.perf);return Number.isFinite(n)?n:null}
function isBetter(d,a,b){if(a==null)return false;if(b==null)return true;return dtype(d)==='time'?a<b:a>b}
function recordTags(d,row,value){
 const tags=[];if(value==null)return tags;
 const a=ath(row?.id||row?.athleteId);let pb=null,sb=null;
 if(a&&String(a.disc)===String(d)&&Number.isFinite(+a.pb))pb=+a.pb;
 try{if(a&&typeof selectionStats==='function'){const x=selectionStats(a);if(Number.isFinite(+x?.best))sb=+x.best}}catch(_){}
 if(pb!=null&&isBetter(d,value,pb))tags.push('PB');
 if(sb!=null&&isBetter(d,value,sb))tags.push('SB');
 if(row?.worldRecord||row?.wr||row?.recordType==='WR')tags.push('WR');
 if(row?.nationalRecord||row?.nr||row?.recordType==='NR')tags.push('NR');
 if(row?.championshipRecord||row?.cr||row?.recordType==='CR')tags.push('CR');
 return [...new Set(tags)];
}
function resultRow(r,i){
 const a=ath(r?.id||r?.athleteId);
 return {
  id:r?.id||r?.athleteId||`row-${i}`,
  name:r?.name||a?.name||`Athlete ${i+1}`,
  nation:r?.nation||a?.nation||'',
  perf:resultValue(r),
  lane:Number(r?.lane)||null,
  place:Number(r?.place)||i+1,
  status:statusOf(r),
  source:r
 };
}
function eventDiscs(e){return (e?.disc||[]).filter(d=>d&&d!=='ALL')}
function allDone(e){const ds=eventDiscs(e);return ds.length>0&&ds.every(d=>Array.isArray(e.results?.[d]))}
function safeSave(){try{save()}catch(err){console.warn('Live event save recovered',err)}}

function pendingFor(e,d){
 e.livePending??={};
 const p=e.livePending[d];
 if(p?.version===1&&Array.isArray(p.results)){
  if(p.engine){e.engine??={};e.engine[d]=deep(p.engine)}
  return deep(p.results);
 }
 const rows=simulateDiscipline(e,d);
 e.livePending[d]={version:1,createdAt:nowStamp(),results:deep(rows),engine:deep(e.engine?.[d]||{})};
 safeSave();return rows;
}
function clearPending(e,d){if(e?.livePending?.[d]){delete e.livePending[d];if(!Object.keys(e.livePending).length)delete e.livePending}}
function commitOnce(e,d,rows){
 e.results??={};
 if(Array.isArray(e.results[d]))return false;
 commitDisciplineResults(e,d,rows);clearPending(e,d);safeSave();return true;
}

function checkpoints(m){
 if(m<=100)return[0,20,40,60,80,100];
 if(m<=200)return[0,50,100,150,200];
 if(m<=400)return[0,100,200,300,400];
 if(m<=800)return[0,200,400,600,800];
 if(m<=1500)return[0,300,700,1100,1500];
 if(m<=3000)return[0,600,1200,1800,2400,3000];
 if(m<=5000)return[0,1000,2000,3000,4000,5000];
 if(m<=10000)return[0,2000,4000,6000,8000,10000];
 return[0,m*.2,m*.4,m*.6,m*.8,m];
}
function segmentProfile(row,d,stageKey){
 const m=distance(d),cps=checkpoints(m),total=Math.max(.01,Number(row.perf)||1),f=family(d),raw=[];
 for(let i=1;i<cps.length;i++){
  const seg=cps[i]-cps[i-1],r=stable(`${stageKey}|${row.id}|seg|${i}`,-1,1);let factor=1;
  if(f==='lane'&&i===1)factor+=m<=200?.16:.09;
  if(f==='lane'&&i===cps.length-1)factor+=stable(`${stageKey}|${row.id}|finish`,-.045,.055);
  if(f==='distance'){factor+=r*.055;if(i===cps.length-1)factor+=stable(`${stageKey}|${row.id}|kick`,-.09,.06)}
  factor+=r*(f==='lane'?.025:.015);raw.push(seg*Math.max(.72,factor));
 }
 const sum=raw.reduce((a,b)=>a+b,0),times=[0];let acc=0;
 raw.forEach(x=>{acc+=total*x/sum;times.push(acc)});
 return{cps,times,total};
}
function stageRows(e,d,results){
 const raw=Array.isArray(e.engine?.[d]?.stages)?e.engine[d].stages:[];
 if(!raw.length)return[{name:'Final',rows:(results||[]).map(resultRow),final:true}];
 return raw.map((st,si)=>{
  let rows=(st.rows||[]).map(resultRow).filter(r=>r.perf!=null||r.status);
  if(family(d)==='lane')rows=rows.slice(0,8);
  const final=/final/i.test(st.name||'')||si===raw.length-1;
  return{name:st.name||`Round ${si+1}`,rows,final};
 }).filter(x=>x.rows.length);
}
function assignLanes(e,d,stage){
 if(family(d)!=='lane')return;
 const used=new Set(),stored=e.engine?.[d]?.race?.startLanes||{};
 stage.rows.forEach((r,i)=>{let lane=Number(r.lane)||Number(stored[r.id]);if(!lane||lane>8||used.has(lane))lane=PREF_LANES.find(x=>!used.has(x))||i+1;used.add(lane);r.lane=lane});
}
function buildTrackRuntime(e,d,results){
 const stages=stageRows(e,d,results);stages.forEach((st,si)=>{assignLanes(e,d,st);st.key=`${e.id}|${d}|${st.name}|${si}`;st.profiles=new Map(st.rows.map(r=>[String(r.id),segmentProfile(r,d,st.key)]));st.slowest=Math.max(.01,...st.rows.map(r=>r.perf||0));st.presentation=distance(d)<=100?10:distance(d)<=200?13:distance(d)<=400?17:distance(d)<=800?23:distance(d)<=1500?29:distance(d)<=5000?38:47;if(stages.length>1&&!st.final)st.presentation*=.72});
 return{stages,stageIndex:0,stageElapsed:0,state:null,lastLeader:null,lastLeaderAt:-99,checkpointIndex:0,finishAnnounced:new Set(),injuryAnnounced:new Set(),stageGap:0};
}
function metresAt(profile,clock){
 if(!profile)return 0;const {cps,times}=profile;if(clock<=0)return 0;if(clock>=profile.total)return cps.at(-1);
 for(let i=1;i<times.length;i++)if(clock<=times[i]){const p=(clock-times[i-1])/(times[i]-times[i-1]||1);return cps[i-1]+(cps[i]-cps[i-1])*clamp(p)}
 return cps.at(-1);
}
function trackState(v){
 const rt=v.track,st=rt.stages[rt.stageIndex],m=distance(v.disc),progress=clamp(rt.stageElapsed/st.presentation),clock=progress*st.slowest,plan=v.event.engine?.[v.disc]?.aiRealism?.plans||{};
 const items=st.rows.map(r=>{
  const stat=r.status,p=st.profiles.get(String(r.id));let metres=stat==='DNS'?0:metresAt(p,clock),finished=metres>=m&&!stat,pulled=false;
  const ip=Number(plan?.[r.id]?.injuryProgress);if((stat==='DNF'||plan?.[r.id]?.dnf)&&Number.isFinite(ip)){const stop=m*clamp(ip,.12,.96);if(metres>=stop){metres=stop;pulled=true;finished=false}}
  else if(stat==='DNF'){const stop=m*stable(`${st.key}|${r.id}|dnf`,.52,.86);if(metres>=stop){metres=stop;pulled=true;finished=false}}
  return{row:r,metres,finished,pulled,progress:m?metres/m:0};
 });
 const live=[...items].sort((a,b)=>{
  const as=a.row.status,bs=b.row.status;if(!!as!==!!bs)return as?1:-1;
  if(a.finished&&b.finished)return (a.row.perf??Infinity)-(b.row.perf??Infinity);
  if(a.finished!==b.finished)return a.finished?-1:1;
  if(Math.abs(b.metres-a.metres)>.08)return b.metres-a.metres;
  return (a.row.perf??Infinity)-(b.row.perf??Infinity);
 });
 live.forEach((x,i)=>x.position=i+1);
 if(progress>=1){const official=[...items].sort((a,b)=>{const as=a.row.status,bs=b.row.status;if(!!as!==!!bs)return as?1:-1;return (a.row.place||999)-(b.row.place||999)||(a.row.perf??Infinity)-(b.row.perf??Infinity)});official.forEach((x,i)=>x.position=i+1);return{progress,clock,items:official,stage:st,done:true}}
 return{progress,clock,items:live,stage:st,done:false};
}

function coursePoint(d,lane,metres,index){
 const m=distance(d),ln=Math.max(1,Math.min(8,Number(lane)||1));
 if(m===100){const y=TRACK.cy+TRACK.inner+ln*TRACK.lane-5;return{x:135+510*clamp(metres/100),y,angle:0}}
 const r=TRACK.inner+(ln-.5)*TRACK.lane,straight=TRACK.right-TRACK.left,per=2*straight+2*Math.PI*r;
 const start=(400-(m%400))%400,visualStagger=family(d)==='lane'?(ln-1)*(m===400?7.35:m===200?3.68:m===800?3.68:1.8):0;
 const merge=m===800?1-clamp(metres/140):1,effLane=m>800?1+(index%5)*.055:1+(ln-1)*merge,r2=TRACK.inner+(effLane-.5)*TRACK.lane;
 let q=((start+metres+visualStagger*merge)%400+400)%400/400*(2*straight+2*Math.PI*r2),x,y,angle;
 if(q<straight){x=TRACK.right-q;y=TRACK.cy+r2;angle=Math.PI}
 else if((q-=straight)<Math.PI*r2){const a=Math.PI/2+q/r2;x=TRACK.left+Math.cos(a)*r2;y=TRACK.cy+Math.sin(a)*r2;angle=a+Math.PI/2}
 else if((q-=Math.PI*r2)<straight){x=TRACK.left+q;y=TRACK.cy-r2;angle=0}
 else{q-=straight;const a=3*Math.PI/2+q/r2;x=TRACK.right+Math.cos(a)*r2;y=TRACK.cy+Math.sin(a)*r2;angle=a+Math.PI/2}
 return{x,y,angle};
}
function trackBackground(d){
 const outer=TRACK.inner+8*TRACK.lane,inner=TRACK.inner,lines=Array.from({length:9},(_,i)=>{const r=inner+i*TRACK.lane;return `<rect x="${TRACK.left-r}" y="${TRACK.cy-r}" width="${TRACK.right-TRACK.left+2*r}" height="${2*r}" rx="${r}" fill="none" stroke="#f3eadf" stroke-opacity="${i===0||i===8?.58:.26}" stroke-width="1.2"/>`}).join('');
 const start100=distance(d)===100?'<line x1="135" y1="300" x2="135" y2="394" stroke="#fff" stroke-width="3"/>':'';
 return `<rect width="760" height="455" fill="#173f31"/><rect x="${TRACK.left-outer}" y="${TRACK.cy-outer}" width="${TRACK.right-TRACK.left+2*outer}" height="${2*outer}" rx="${outer}" fill="#874b50"/><rect x="${TRACK.left-inner}" y="${TRACK.cy-inner}" width="${TRACK.right-TRACK.left+2*inner}" height="${2*inner}" rx="${inner}" fill="#245e43"/>${lines}<line x1="${TRACK.right}" y1="${TRACK.cy+inner}" x2="${TRACK.right}" y2="${TRACK.cy+outer}" stroke="#fff" stroke-width="4"/>${start100}`;
}
function runnerSVG(v,item,i){
 const r=item.row,p=coursePoint(v.disc,r.lane,item.metres,i),ours=r.nation===managed(),col=nationColour(r.nation),short=String(r.name).split(/\s+/).at(-1).slice(0,10).toUpperCase(),show=ours||item.position<=2;
 return `<g class="am-live-runner" data-runner="${esc(r.id)}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(p.angle*180/Math.PI).toFixed(1)})" opacity="${item.pulled||r.status==='DNS'?.45:1}"><ellipse cx="0" cy="0" rx="${ours?9:8}" ry="6" fill="${col}" stroke="${ours?'#fff':'#07131d'}" stroke-width="${ours?3:2}"/><circle cx="7" cy="0" r="3" fill="#d9b99c"/><rect x="-3" y="-4" width="5" height="8" rx="1" fill="#f4f5f1"/><text class="am-live-bib" x="-.5" y="2" text-anchor="middle">${esc(r.lane||item.position)}</text>${show?`<text class="am-live-runner-label" x="0" y="-12" text-anchor="middle" fill="#fff" transform="rotate(${(-p.angle*180/Math.PI).toFixed(1)})">${esc(short)}</text>`:''}</g>`;
}
function trackVisual(v){
 const st=v.track.state||trackState(v),m=distance(v.disc),leader=Math.max(0,...st.items.filter(x=>!x.row.status).map(x=>Math.min(m,x.metres))),laps=m>800?Math.max(1,Math.ceil((m-leader)/400)):0;
 const runners=st.items.map((x,i)=>runnerSVG(v,x,i)).join('');
 return `${topHTML(v,st.stage.name,st.done?'FINAL':'LIVE')}<div class="am-live-canvas"><svg viewBox="0 0 760 455" role="img" aria-label="${esc(label(v.disc))} live race">${trackBackground(v.disc)}${runners}<text x="380" y="213" text-anchor="middle" class="am-live-lap">${m>800?`${laps} ${laps===1?'LAP':'LAPS'} TO GO`:label(v.disc)}</text><text x="380" y="234" text-anchor="middle" class="am-live-sub">${st.done?'Race complete':`${Math.round(leader)}m / ${m}m`}</text></svg>${v.phase==='intro'?introHTML(v,st.stage):''}${v.phase==='complete'?resultOverlay(v):''}</div>${controlsHTML(v)}`;
}

function buildAttemptSequence(d,rows){
 const cfg=configFor(d),base=rows.map((r,i)=>({row:r,source:r.source||r,index:i})),seq=[];
 if(cfg.family==='vertical'){
  const heights=[...new Set(base.flatMap(x=>(x.source.hjAttempts||x.source.heightAttempts||[]).map(h=>Number(h.height)).filter(Number.isFinite)))].sort((a,b)=>a-b);
  heights.forEach(h=>base.forEach(x=>{const rec=(x.source.hjAttempts||x.source.heightAttempts||[]).find(y=>Number(y.height)===h);if(!rec)return;const marks=Array.isArray(rec.marks)?rec.marks:[];if(marks[0]==='-')seq.push({row:x.row,height:h,outcome:'-',attempt:0});else for(let i=0;i<marks.length;i++){const o=marks[i];if(!['O','X'].includes(o))continue;seq.push({row:x.row,height:h,outcome:o,attempt:i+1});if(o==='O')break}}));
  return seq;
 }
 const attemptArray=x=>x.source.throwAttempts||x.source.jumpAttempts||x.source.attempts||[];
 const max=Math.max(0,...base.map(x=>attemptArray(x).length),cfg.attempts);
 const first=Math.min(cfg.reorderAfterRound||max,max);
 for(let n=1;n<=first;n++)base.forEach(x=>{const a=attemptArray(x)[n-1];if(a!==undefined)seq.push({row:x.row,attempt:n,mark:Number.isFinite(+a)?+a:null})});
 if(max>first){const ranked=[...base].sort((a,b)=>{const aa=attemptArray(a).slice(0,first).filter(Number.isFinite),bb=attemptArray(b).slice(0,first).filter(Number.isFinite),av=aa.length?Math.max(...aa):-Infinity,bv=bb.length?Math.max(...bb):-Infinity;return av-bv}).slice(-8);for(let n=first+1;n<=max;n++)ranked.forEach(x=>{const a=attemptArray(x)[n-1];if(a!==undefined)seq.push({row:x.row,attempt:n,mark:Number.isFinite(+a)?+a:null})})}
 return seq;
}
function buildFieldRuntime(d,rows){return{seq:buildAttemptSequence(d,rows),index:0,elapsed:0,revealed:false,current:null,completed:[],best:new Map(),vertical:new Map(),beforeRank:null,afterRank:null}}
function fieldOrder(v){
 const f=v.field,cfg=configFor(v.disc),rows=v.rows;
 if(cfg.family==='vertical'){
  return [...rows].sort((a,b)=>{const A=f.vertical.get(String(a.id))||{best:0,miss:99,total:99},B=f.vertical.get(String(b.id))||{best:0,miss:99,total:99};return B.best-A.best||A.miss-B.miss||A.total-B.total||(a.place||99)-(b.place||99)})
 }
 return [...rows].sort((a,b)=>{const av=f.best.get(String(a.id)),bv=f.best.get(String(b.id));if(av==null&&bv!=null)return 1;if(av!=null&&bv==null)return-1;if(av!=null&&bv!=null&&Math.abs(bv-av)>.0001)return bv-av;return(a.place||99)-(b.place||99)})
}
function processAttempt(v,a){
 if(v.field.revealed)return;v.field.revealed=true;const f=v.field,cfg=configFor(v.disc),before=fieldOrder(v).map(x=>String(x.id));
 if(cfg.family==='vertical'){
  const key=String(a.row.id),x=f.vertical.get(key)||{best:0,miss:0,total:0,byHeight:{},out:false};x.byHeight[a.height]??=[];x.byHeight[a.height].push(a.outcome);if(a.outcome==='O'){x.best=Math.max(x.best,a.height);x.miss=x.byHeight[a.height].filter(z=>z==='X').length}else if(a.outcome==='X'){x.total++;if(x.byHeight[a.height].filter(z=>z==='X').length>=3)x.out=true}f.vertical.set(key,x)
 }else if(a.mark!=null){const key=String(a.row.id),old=f.best.get(key);if(old==null||a.mark>old)f.best.set(key,a.mark)}
 f.completed.push({...a});const after=fieldOrder(v).map(x=>String(x.id)),oldPos=before.indexOf(String(a.row.id))+1,newPos=after.indexOf(String(a.row.id))+1;f.beforeRank=oldPos;f.afterRank=newPos;emitFieldCommentary(v,a,oldPos,newPos);renderScoreboard(v);
}
function throwScale(d,mark){const code=String(d).toUpperCase(),max=code==='SP'?25:code==='JT'?100:code==='DT'?75:code==='HT'?85:12;return clamp((Number(mark)||0)/max,.05,1)}
function throwVisual(v,a,p){
 const code=String(v.disc).toUpperCase(),mark=a?.mark,valid=mark!=null,q=throwScale(v.disc,mark),origin=code==='JT'?{x:190,y:300}:{x:145,y:250},land={x:origin.x+q*520,y:250-q*90},flight=clamp((p-.24)/.5),u=1-flight,cx=(origin.x+land.x)/2,cy=Math.min(origin.y,land.y)-120,x=u*u*origin.x+2*u*flight*cx+flight*flight*land.x,y=u*u*origin.y+2*u*flight*cy+flight*flight*land.y,shown=p>.74;
 const prep=a?athleteMarker(a.row,origin.x-12+Math.min(p,.22)/.22*18,origin.y+6):'';
 const sector=code==='JT'?`<rect x="65" y="272" width="160" height="55" rx="5" fill="#98564f"/><path d="M220 300 L730 95 L730 395 Z" fill="#286a4a" stroke="#d9e5dc" stroke-opacity=".45"/>`:`<path d="M145 250 L725 80 L725 390 Z" fill="#286a4a" stroke="#d9e5dc" stroke-opacity=".45"/><circle cx="145" cy="250" r="45" fill="#a5aaa7" stroke="#fff" stroke-width="3"/>`;
 const guides=[.25,.5,.75,1].map(t=>`<line x1="${origin.x+t*520}" y1="105" x2="${origin.x+t*520}" y2="385" stroke="#fff" stroke-opacity=".1" stroke-dasharray="5 8"/>`).join('');
 const object=a&&valid&&p>.24&&!shown?`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${code==='JT'?3:6}" fill="#f2eee7"/>`:'';
 const result=a&&shown?(valid?`<circle cx="${land.x}" cy="${land.y}" r="6" fill="#fff"/><text x="${Math.min(690,land.x+10)}" y="${Math.max(62,land.y-10)}" class="am-live-mark">${esc(fmt(v.disc,mark))}</text>`:`<text x="380" y="235" text-anchor="middle" class="am-live-mark am-live-foul">FOUL</text>`):'';
 return `${topHTML(v,a?`Attempt ${a.attempt}`:'Ready',v.phase==='complete'?'FINAL':'LIVE')}<div class="am-live-canvas"><svg viewBox="0 0 760 455"> <rect width="760" height="455" fill="#184b36"/>${sector}${guides}${prep}${object}${result}</svg>${v.phase==='intro'?introHTML(v):''}${v.phase==='complete'?resultOverlay(v):''}</div>${controlsHTML(v)}`;
}
function athleteMarker(row,x,y){const col=nationColour(row?.nation),ours=row?.nation===managed();return `<g transform="translate(${x} ${y})"><circle r="${ours?11:9}" fill="${col}" stroke="${ours?'#fff':'#07131d'}" stroke-width="${ours?3:2}"/><circle cx="0" cy="-13" r="4" fill="#d9b99c"/><text y="22" text-anchor="middle" class="am-live-runner-label" fill="#fff">${esc(String(row?.name||'Athlete').split(/\s+/).at(-1).slice(0,10).toUpperCase())}</text></g>`}
function horizontalVisual(v,a,p){
 const mark=a?.mark,valid=mark!=null,run=clamp(p/.45),jump=clamp((p-.45)/.28),shown=p>.75,x0=80,take=480,land=540+clamp((Number(mark)||0)/9,0,1)*125,x=p<.45?x0+(take-x0)*run:take+(land-take)*jump,y=p<.45?310:310-70*Math.sin(Math.PI*jump),ath=a?athleteMarker(a.row,x,y):'';
 return `${topHTML(v,a?`Attempt ${a.attempt}`:'Ready',v.phase==='complete'?'FINAL':'LIVE')}<div class="am-live-canvas"><svg viewBox="0 0 760 455"><rect width="760" height="455" fill="#184b36"/><rect x="55" y="285" width="440" height="50" rx="4" fill="#98564f"/><rect x="500" y="250" width="220" height="115" rx="5" fill="#d9c393"/><line x1="493" y1="273" x2="493" y2="347" stroke="#fff" stroke-width="5"/>${ath}${a&&shown?(valid?`<circle cx="${land}" cy="320" r="5" fill="#fff"/><text x="${land}" y="235" text-anchor="middle" class="am-live-mark">${esc(fmt(v.disc,mark))}</text>`:`<text x="610" y="230" text-anchor="middle" class="am-live-mark am-live-foul">FOUL</text>`):''}</svg>${v.phase==='intro'?introHTML(v):''}${v.phase==='complete'?resultOverlay(v):''}</div>${controlsHTML(v)}`;
}
function verticalVisual(v,a,p){
 const h=Number(a?.height)||1.8,yBar=315-clamp((h-1.5)/1.3,0,1)*185,outcome=a?.outcome,pass=outcome==='-',run=pass?0:clamp(p/.5),flight=pass?0:clamp((p-.5)/.3),shown=p>.78,x=95+(470-95)*run+(pass?0:(650-470)*flight),y=pass?325:(p<.5?325:300-110*Math.sin(Math.PI*flight)),barY2=shown&&outcome==='X'?yBar+22:yBar;
 const att=a?athleteMarker(a.row,x,y):'';
 return `${topHTML(v,a?`${fmt(v.disc,h)} · ${a.outcome==='-'?'Pass':`Attempt ${a.attempt}`}`:'Ready',v.phase==='complete'?'FINAL':'LIVE')}<div class="am-live-canvas"><svg viewBox="0 0 760 455"><rect width="760" height="455" fill="#184b36"/><path d="M70 345 C240 360 365 325 475 260" fill="none" stroke="#98564f" stroke-width="68"/><rect x="565" y="272" width="150" height="70" rx="9" fill="#3c78bb"/><line x1="535" y1="90" x2="535" y2="360" stroke="#fff" stroke-width="4"/><line x1="710" y1="90" x2="710" y2="360" stroke="#fff" stroke-width="4"/><line x1="535" y1="${yBar}" x2="710" y2="${barY2}" stroke="${shown&&outcome==='X'?'#ff8d98':'#f1d77b'}" stroke-width="4"/>${att}${a&&shown?`<text x="625" y="75" text-anchor="middle" class="am-live-mark ${outcome==='X'?'am-live-foul':'am-live-clear'}">${outcome==='O'?'CLEAR':outcome==='X'?'MISS':'PASS'}</text>`:''}</svg>${v.phase==='intro'?introHTML(v):''}${v.phase==='complete'?resultOverlay(v):''}</div>${controlsHTML(v)}`;
}
function genericVisual(v){return `${topHTML(v,'Live event',v.phase==='complete'?'FINAL':'LIVE')}<div class="am-live-canvas"><svg viewBox="0 0 760 455"><rect width="760" height="455" fill="#153e31"/><text x="380" y="210" text-anchor="middle" class="am-live-lap">${esc(label(v.disc))}</text><text x="380" y="237" text-anchor="middle" class="am-live-sub">Live competition in progress</text></svg>${v.phase==='intro'?introHTML(v):''}${v.phase==='complete'?resultOverlay(v):''}</div>${controlsHTML(v)}`}

function topHTML(v,phase,state){return `<div class="am-live-top"><div class="am-live-title"><small>${esc(v.event.name||'Competition')} · ${esc(v.event.location||'Venue')}</small><strong>${esc(label(v.disc))} · ${esc(phase||'Live')}</strong></div><div class="am-live-state"><span class="am-live-chip ${state==='LIVE'?'live':state==='FINAL'?'final':''}">${esc(state)}</span><span class="am-live-chip">${esc(configFor(v.disc).family.toUpperCase())}</span></div></div>`}
function introHTML(v,stage){
 const rows=(stage?.rows||v.rows||[]).slice(0,8),items=rows.map(r=>`<span>${configFor(v.disc).family==='lane'&&r.lane?`L${r.lane} · `:''}${esc(r.name)}</span>`).join('');
 return `<div class="am-live-intro"><div class="am-live-intro-card"><small>LIVE EVENT</small><h3>${esc(label(v.disc))}</h3><p>${esc(v.event.name||'Competition')}${v.event.location?` · ${esc(v.event.location)}`:''}${stage?.name?` · ${esc(stage.name)}`:''}</p><div class="am-live-intro-list">${items}</div></div></div>`;
}
function controlsHTML(v){
 const done=v.phase==='complete',paused=v.paused,completeLabel=allDone(v.event)?'COMPLETE EVENT':'CONTINUE EVENT DAY';
 return `<div class="am-live-controls"><div class="am-live-control-left"><button class="am-live-btn ${paused?'primary':''}" data-am-live="pause" ${done?'disabled':''}>${paused?'PLAY':'PAUSE'}</button><div class="am-live-speed">${SPEEDS.map(x=>`<button data-am-live-speed="${x}" class="${v.speed===x?'on':''}">${x}×</button>`).join('')}</div></div><div class="am-live-control-right"><span class="am-live-clock">${esc(clockText(v))}</span>${done?`<button class="am-live-btn complete" data-am-live="complete">${completeLabel}</button>`:''}</div></div>`;
}
function clockText(v){if(v.track?.state)return`${v.track.state.clock.toFixed(1)}s`;if(v.field?.current)return configFor(v.disc).family==='vertical'?fmt(v.disc,v.field.current.height):`A${v.field.current.attempt||0}`;return v.phase==='intro'?'READY':v.phase==='complete'?'FINAL':'LIVE'}
function resultOverlay(v){
 const rows=finalRows(v),winner=rows.find(r=>!r.status)||rows[0],value=winner?.perf;
 return `<div class="am-live-result-card"><div><small>EVENT COMPLETE</small><strong>${esc(winner?.name||label(v.disc))}</strong><p>${winner&&value!=null?`${esc(fmt(v.disc,value))} · `:''}Official result confirmed. Use the button below to continue.</p></div></div>`;
}
function finalRows(v){return [...(v.rows||[])].sort((a,b)=>{const as=a.status,bs=b.status;if(!!as!==!!bs)return as?1:-1;return(a.place||999)-(b.place||999)||(dtype(v.disc)==='time'?(a.perf??Infinity)-(b.perf??Infinity):(b.perf??-Infinity)-(a.perf??-Infinity))})}

function renderViewer(v){
 const arena=$('liveEventVisual');if(!arena)return;delete arena.dataset.liveViewDisabled;arena.classList.add('am-live-owned');let html='';
 if(v.track)html=trackVisual(v);else if(configFor(v.disc).family==='throw')html=throwVisual(v,v.field?.current,fieldProgress(v));else if(configFor(v.disc).family==='horizontal')html=horizontalVisual(v,v.field?.current,fieldProgress(v));else if(configFor(v.disc).family==='vertical')html=verticalVisual(v,v.field?.current,fieldProgress(v));else html=genericVisual(v);
 arena.innerHTML=`<div class="am-live-stage" data-am-live-engine="1">${html}</div>`;bindArena(arena);
}
function fieldProgress(v){if(!v.field?.current)return 0;return clamp(v.field.elapsed/v.field.attemptDuration)}
function bindArena(arena){if(arena.__amLiveBound)return;arena.__amLiveBound=1;arena.addEventListener('click',ev=>{const v=window.__amLiveRuntime;if(!v)return;const speed=ev.target.closest?.('[data-am-live-speed]');if(speed){v.speed=Number(speed.dataset.amLiveSpeed)||1;renderViewer(v);return}const b=ev.target.closest?.('[data-am-live]');if(!b)return;if(b.dataset.amLive==='pause'){v.paused=!v.paused;v.lastFrame=performance.now();renderViewer(v)}else if(b.dataset.amLive==='complete')completeAction(v)})}

function renderScoreboard(v){
 const board=$('liveScoreboard');if(!board)return;let rows=[],subtitle='';
 if(v.track?.state){rows=v.track.state.items.map(x=>({row:x.row,pos:x.position,main:x.row.status||((x.finished||v.track.state.done)&&x.row.perf!=null?fmt(v.disc,x.row.perf):`${Math.round(x.metres)}m`),extra:x.row.lane?`Lane ${x.row.lane}`:'',finished:x.finished,status:x.row.status,tags:(x.finished||v.track.state.done)?recordTags(v.disc,x.row,x.row.perf):[]}));subtitle=v.track.state.stage.name}
 else if(v.field){const order=fieldOrder(v);rows=order.map((r,i)=>{const cfg=configFor(v.disc),key=String(r.id);if(cfg.family==='vertical'){const x=v.field.vertical.get(key)||{best:0,byHeight:{},out:false};const hist=Object.entries(x.byHeight||{}).sort((a,b)=>+a[0]-+b[0]).map(([h,m])=>`${fmt(v.disc,+h)} ${m.join('')}`).join(' · ');return{row:r,pos:i+1,main:x.best?fmt(v.disc,x.best):'—',extra:hist||'No attempt',status:x.out?'OUT':'',tags:[]}}const best=v.field.best.get(key),ats=v.field.completed.filter(a=>String(a.row.id)===key).map(a=>a.mark==null?'X':fmt(v.disc,a.mark));return{row:r,pos:i+1,main:best!=null?fmt(v.disc,best):'—',extra:ats.join(' · ')||'No attempt',status:'',tags:best!=null?recordTags(v.disc,r,best):[]}});subtitle=v.field.current?`Attempt ${v.field.current.attempt||''}`:'Ready'}
 else rows=finalRows(v).map((r,i)=>({row:r,pos:i+1,main:r.status||fmt(v.disc,r.perf),extra:'Official',status:r.status,tags:recordTags(v.disc,r,r.perf)}));
 board.innerHTML=`<div class="am-live-board"><div class="am-live-board-head"><div><small>LIVE STANDINGS</small><strong>${esc(label(v.disc))}</strong></div><span>${esc(subtitle)}</span></div><div class="am-live-board-list">${rows.map(x=>`<div class="am-live-board-row ${x.row.nation===managed()?'ours':''} ${x.finished?'finished':''} ${(x.status||'').toLowerCase()}"><b class="am-live-pos">${x.pos}</b><i class="am-live-nation" style="background:${nationColour(x.row.nation)}"></i><div class="am-live-who"><strong>${esc(x.row.name)}</strong><small>${esc(x.row.nation||'')}</small></div><div class="am-live-main">${esc(x.main||'—')}</div><div class="am-live-extra">${esc(x.extra||'')}${x.tags?.length?`<div class="am-live-records">${x.tags.map(t=>`<span class="am-live-record">${esc(t)}</span>`).join('')}</div>`:''}</div></div>`).join('')}</div></div>`;
}
function renderCommentary(v){
 const c=$('commentary');if(!c)return;const lines=v.commentary||[];c.innerHTML=`<div class="am-live-commentary"><div class="am-live-commentary-head"><strong>Gavin Potts · Live Commentary</strong><span>${lines.length?`${lines.length} updates`:'Waiting for the event'}</span></div><div class="am-live-commentary-feed">${lines.length?lines.map(x=>`<div class="am-live-line ${x.priority>=2?'important':''} ${x.record?'record':''}"><time>${esc(x.time)}</time><p>${esc(x.text)}</p></div>`).join(''):'<div class="am-live-empty">Commentary will appear as the competition unfolds.</div>'}</div></div>`;const feed=c.querySelector('.am-live-commentary-feed');if(feed)feed.scrollTop=feed.scrollHeight;
}
function addLine(v,text,priority=1,record=false){if(!text)return;const sec=v.track?.state?.clock??((performance.now()-v.startedAt)/1000);const time=Number.isFinite(sec)?`${sec.toFixed(1)}s`:'LIVE';const last=v.commentary.at(-1);if(last?.text===text)return;v.commentary.push({time,text,priority,record});if(v.commentary.length>80)v.commentary.splice(0,v.commentary.length-80);renderCommentary(v)}
function choose(key,arr){return arr[hash(key)%arr.length]}
function emitTrack(v){
 const st=v.track.state,rt=v.track,m=distance(v.disc),active=st.items.filter(x=>!x.row.status),leader=active[0];if(!leader)return;
 if(rt.lastLeader==null){rt.lastLeader=String(leader.row.id);addLine(v,`${label(v.disc)} is under way. ${leader.row.name} has made the strongest early impression.`,1)}
 else if(String(leader.row.id)!==rt.lastLeader&&st.clock-rt.lastLeaderAt>Math.max(.45,st.stage.slowest*.04)){const prev=rt.lastLeader,lines=[`${leader.row.name} moves into the lead.`,`Now ${leader.row.name} comes through to the front.`,`${leader.row.name} has taken over at the head of the race.`];addLine(v,choose(`${st.stage.key}|lead|${leader.row.id}|${Math.round(st.clock*10)}`,lines),2);rt.lastLeader=String(leader.row.id);rt.lastLeaderAt=st.clock}
 const cps=checkpoints(m);while(rt.checkpointIndex<cps.length&&leader.metres>=cps[rt.checkpointIndex]){const cp=cps[rt.checkpointIndex++];if(cp<=0||cp>=m)continue;const top=st.items.filter(x=>!x.row.status).slice(0,3);if(m<=400||cp>=m*.6||rt.checkpointIndex%2===0)addLine(v,`${Math.round(cp)}m: ${leader.row.name} leads${top[1]?`, with ${top[1].row.name} next`:''}.`,1)}
 st.items.forEach(x=>{if(x.pulled&&!rt.injuryAnnounced.has(String(x.row.id))){rt.injuryAnnounced.add(String(x.row.id));addLine(v,`${x.row.name} has slowed sharply and is no longer progressing.`,2)}});
 if(st.progress>.82&&!rt.finalSection){rt.finalSection=true;addLine(v,m<=400?'Into the final drive now.':'The decisive part of the race is beginning.',1)}
 if(st.done&&!rt.stageFinish){rt.stageFinish=true;const official=st.items.filter(x=>!x.row.status),winner=official[0];if(winner){const second=official[1],photo=second&&winner.row.perf!=null&&second.row.perf!=null&&Math.abs(second.row.perf-winner.row.perf)<.05;addLine(v,photo?`${winner.row.name} and ${second.row.name} hit the line almost together. That will need confirmation.`:`${winner.row.name} wins ${st.stage.name} in ${fmt(v.disc,winner.row.perf)}.`,3);if(photo)v.photoFinish=true}}
}
function emitFieldCommentary(v,a,oldPos,newPos){
 const cfg=configFor(v.disc),n=a.row.name,tags=cfg.family==='vertical'?[]:recordTags(v.disc,a.row,a.mark),record=tags.some(t=>['WR','NR','CR'].includes(t));let text='';
 if(cfg.family==='vertical')text=a.outcome==='-'?`${n} passes at ${fmt(v.disc,a.height)}.`:a.outcome==='O'?`${n} clears ${fmt(v.disc,a.height)}${newPos===1?' and moves to the top of the standings':''}.`:`${n} misses at ${fmt(v.disc,a.height)}.`;
 else if(a.mark==null)text=`${n} records a foul on attempt ${a.attempt}.`;
 else if(newPos<oldPos)text=`${n} improves to ${fmt(v.disc,a.mark)} and moves from ${oldPos}${ord(oldPos)} to ${newPos}${ord(newPos)}.`;
 else text=`${n} records ${fmt(v.disc,a.mark)} on attempt ${a.attempt}.`;
 if(tags.length)text+=` ${tags.join(' / ')}.`;addLine(v,text,newPos===1||record?3:1,record);
}
function ord(n){return n%100>=11&&n%100<=13?'th':n%10===1?'st':n%10===2?'nd':n%10===3?'rd':'th'}

function tickTrack(v,dt){
 const rt=v.track,st=rt.stages[rt.stageIndex];if(v.phase==='intro'){v.introElapsed+=dt;if(v.introElapsed>=1.5){v.phase='live';addLine(v,`${st.name} is ready. The gun goes and the race begins.`,1)}return}
 if(v.phase!=='live')return;rt.stageElapsed+=dt;rt.state=trackState(v);emitTrack(v);if(rt.state.done){const delay=v.photoFinish?1.15:.65;rt.stageGap+=dt;if(rt.stageGap>=delay){if(rt.stageIndex<rt.stages.length-1){rt.stageIndex++;rt.stageElapsed=0;rt.stageGap=0;rt.state=trackState(v);rt.lastLeader=null;rt.lastLeaderAt=-99;rt.checkpointIndex=0;rt.finalSection=false;rt.stageFinish=false;v.photoFinish=false;addLine(v,`${rt.state.stage.name} is next.`,1);v.phase='intro';v.introElapsed=0}else finishPlayback(v)}}
}
function tickField(v,dt){
 const f=v.field;if(v.phase==='intro'){v.introElapsed+=dt;if(v.introElapsed>=1.25){v.phase='live';addLine(v,`${label(v.disc)} is under way.`,1)}return}
 if(v.phase!=='live')return;if(!f.current){if(f.index>=f.seq.length){finishPlayback(v);return}f.current=f.seq[f.index++];f.elapsed=0;f.revealed=false;f.attemptDuration=configFor(v.disc).family==='vertical'?2.65:2.45;addLine(v,`${f.current.row.name} is up next${configFor(v.disc).family==='vertical'?` at ${fmt(v.disc,f.current.height)}`:` for attempt ${f.current.attempt}`}.`,0)}
 f.elapsed+=dt;const p=fieldProgress(v);if(p>=.76&&!f.revealed)processAttempt(v,f.current);if(p>=1){f.current=null;f.elapsed=0;f.revealed=false}
}
function tickGeneric(v,dt){if(v.phase==='intro'){v.introElapsed+=dt;if(v.introElapsed>=1.2){v.phase='live';addLine(v,`${label(v.disc)} is under way.`,1)}return}if(v.phase==='live'){v.genericElapsed+=dt;if(v.genericElapsed>3)finishPlayback(v)}}
function finishPlayback(v){
 if(v.phase==='complete')return;commitOnce(v.event,v.disc,v.pendingResults);v.phase='complete';v.paused=false;disciplineRunning=false;const rows=finalRows(v),winner=rows.find(r=>!r.status)||rows[0];if(winner)addLine(v,`${winner.name} is confirmed as the winner of ${label(v.disc)} in ${winner.perf!=null?fmt(v.disc,winner.perf):'the official result'}.`,3);renderAll(v);safeSave();
}
function completeAction(v){
 if(v.phase!=='complete')return;const e=v.event,d=v.disc;window.__amLiveRuntime=null;liveEventView=null;disciplineRunning=false;activeEventDisc=d;
 if(allDone(e)){try{if(!e.completed)finaliseEvent(e,false)}catch(err){console.warn('Event finalisation recovered',err)}try{view('home')}catch(_){competitionMode='overview';drawCompetition()}}
 else{competitionMode='overview';try{drawCompetition()}catch(_){try{view('home')}catch(__){}}}
}

function renderAll(v){if(!v)return;renderViewer(v);renderScoreboard(v);renderCommentary(v)}
function frame(now){const v=window.__amLiveRuntime;if(!v||v.phase==='complete')return;const raw=Math.min(.08,Math.max(0,(now-v.lastFrame)/1000));v.lastFrame=now;if(!v.paused){const dt=raw*v.speed;if(v.track)tickTrack(v,dt);else if(v.field)tickField(v,dt);else tickGeneric(v,dt)}if(v.phase!=='complete'){if(now-v.lastRender>32){v.lastRender=now;renderViewer(v);if(v.track)renderScoreboard(v)}v.raf=requestAnimationFrame(frame)}}
function runtime(e,d,results){
 const rows=(results||[]).map(resultRow),cfg=configFor(d),v={event:e,disc:d,pendingResults:results,rows,phase:'intro',paused:false,speed:1,introElapsed:0,genericElapsed:0,commentary:[],startedAt:performance.now(),lastFrame:performance.now(),lastRender:0,raf:null,photoFinish:false};
 if(['lane','distance'].includes(cfg.family)){v.track=buildTrackRuntime(e,d,results);v.track.state=trackState(v)}else if(['throw','horizontal','vertical'].includes(cfg.family))v.field=buildFieldRuntime(d,rows);
 return v;
}
function start(e,d){
 if(!e||e.completed||disciplineRunning)return;if(e.week!==s.game.week){toast('This event is not live yet');return}e.results??={};activeEventDisc=d;competitionMode='discipline';
 if(Array.isArray(e.results[d])){window.__amLiveRuntime=null;liveEventView=null;disciplineRunning=false;drawCompetition();renderStatic(e,d);return}
 const results=pendingFor(e,d),v=runtime(e,d,results);window.__amLiveRuntime=v;liveEventView={event:e,disc:d,engineV1:v};disciplineRunning=true;e.commentary??={};e.commentary[d]=[];drawCompetition();renderAll(v);v.raf=requestAnimationFrame(frame);
}
function renderStatic(e,d){
 if(!Array.isArray(e?.results?.[d]))return;const rows=e.results[d].map(resultRow),v={event:e,disc:d,rows,phase:'complete',paused:false,speed:1,commentary:[],track:null,field:null};const cfg=configFor(d);if(['lane','distance'].includes(cfg.family)){v.track=buildTrackRuntime(e,d,e.results[d]);const st=v.track.stages.at(-1);v.track.stageIndex=v.track.stages.length-1;v.track.stageElapsed=st.presentation;v.track.state=trackState(v)}else if(['throw','horizontal','vertical'].includes(cfg.family)){v.field=buildFieldRuntime(d,rows);v.field.completed=v.field.seq.map(x=>({...x}));if(cfg.family==='vertical'){v.field.completed.forEach(a=>{v.field.revealed=false;processAttempt(v,a)});v.field.current=null}else v.field.completed.forEach(a=>{if(a.mark!=null){const k=String(a.row.id),old=v.field.best.get(k);if(old==null||a.mark>old)v.field.best.set(k,a.mark)}})}renderAll(v)
}

function visualHTML(e,d){
 const v=window.__amLiveRuntime;if(v&&v.event===e&&v.disc===d){if(v.track)return`<div class="am-live-stage" data-am-live-engine="1">${trackVisual(v)}</div>`;const cfg=configFor(d);if(cfg.family==='throw')return`<div class="am-live-stage" data-am-live-engine="1">${throwVisual(v,v.field?.current,fieldProgress(v))}</div>`;if(cfg.family==='horizontal')return`<div class="am-live-stage" data-am-live-engine="1">${horizontalVisual(v,v.field?.current,fieldProgress(v))}</div>`;if(cfg.family==='vertical')return`<div class="am-live-stage" data-am-live-engine="1">${verticalVisual(v,v.field?.current,fieldProgress(v))}</div>`;return`<div class="am-live-stage" data-am-live-engine="1">${genericVisual(v)}</div>`}
 if(Array.isArray(e?.results?.[d]))return`<div class="am-live-stage" data-am-live-engine="1">${topHTML({event:e,disc:d},'Official','FINAL')}<div class="am-live-canvas"><svg viewBox="0 0 760 455"><rect width="760" height="455" fill="#153e31"/><text x="380" y="210" text-anchor="middle" class="am-live-lap">${esc(label(d))}</text><text x="380" y="238" text-anchor="middle" class="am-live-sub">Official result available</text></svg></div></div>`;
 return`<div class="am-live-stage" data-am-live-engine="1">${topHTML({event:e,disc:d},'Ready','READY')}<div class="am-live-canvas"><svg viewBox="0 0 760 455"><rect width="760" height="455" fill="#153e31"/><text x="380" y="210" text-anchor="middle" class="am-live-lap">${esc(label(d))}</text><text x="380" y="238" text-anchor="middle" class="am-live-sub">Start the event to begin live coverage</text></svg></div></div>`
}

function install(){
 try{window.__amLiveViewResetObserver?.disconnect()}catch(_){}window.__amLiveViewResetObserver=null;
 const arena=$('liveEventVisual');if(arena){delete arena.dataset.liveViewDisabled;arena.replaceChildren()}
 window.eventVisualHTML=visualHTML;window.syncEventVisual=function(){const v=window.__amLiveRuntime;if(v)renderViewer(v)};
 window.startDiscipline=start;
 if(typeof drawCompetition==='function'){const base=drawCompetition;drawCompetition=function(){const out=base();queueMicrotask(()=>{const v=window.__amLiveRuntime;if(v&&currentView==='competition')renderAll(v);else if(currentView==='competition'&&competitionMode==='discipline'&&activeEventDisc){const e=(s.events||[]).find(x=>x.id===activeEventId)||((s.events||[]).find(x=>x.week===s.game.week&&!x.completed));if(e&&Array.isArray(e.results?.[activeEventDisc]))renderStatic(e,activeEventDisc)}});return out}}
 window.AMLiveEvent={version:1,start,configFor,get state(){return window.__amLiveRuntime||null}};
 if(typeof window.addDevelopmentUpdate==='function')window.addDevelopmentUpdate({timestamp:'2026-09-10T10:30:00+01:00',date:'10 September 2026',title:'Live 2D Event Engine',items:['Rebuilt Event Day around one Live Event state shared by the animation, scoreboard and Gavin Potts commentary.','Track races now use one eight-lane stadium track with live positions, race checkpoints, overtakes, lap counts, DNFs and speed/pause controls.','Throws, horizontal jumps and vertical jumps now replay attempt-by-attempt from the simulated result, with standings updating only when each performance is revealed.','Final results are committed once at the end of playback, remain hidden until they happen, and every finished discipline provides a clear route back into Event Day or Home.']});
}
install();
})();
/* ===== End Athletics Manager Live Event Engine V1 ===== */
