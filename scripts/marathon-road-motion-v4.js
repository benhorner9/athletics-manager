/* Athletics Manager — Marathon Road Motion V4
   Athlete-first road motion. The scenery is a fixed broadcast section; the athletes
   travel through it while simulated gaps determine their relative spacing. */
(function(){
'use strict';
if(window.__amMarathonRoadMotionV4)return;window.__amMarathonRoadMotionV4=1;
if(typeof document==='undefined')return;

const VERSION=4;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const lerp=(a,b,t)=>Number(a||0)+(Number(b||0)-Number(a||0))*clamp(t,0,1);
const ease=t=>1-Math.pow(1-clamp(t,0,1),2.05);
const hash=v=>{let x=2166136261;for(const c of String(v)){x^=c.charCodeAt(0);x=Math.imul(x,16777619)}return x>>>0};
let frameId=0;
let generation=0;
let baseDraw=null;

function v3(){return window.AMMarathonRoadBroadcastV3}
function road(){return window.AMMarathonRoadBroadcastV2}
function live(){try{return typeof liveEventView!=='undefined'?liveEventView:null}catch(_){return null}}
function activeDisc(){try{return typeof activeEventDisc!=='undefined'?activeEventDisc:null}catch(_){return null}}
function isRoad(d){try{return !!v3()?.isRoad?.(d)}catch(_){return false}}
function gapPixels(sec){sec=Math.max(0,Number(sec)||0);return Math.min(540,sec<=12?sec*9.4:113+Math.sqrt(sec-12)*16.4)}
function laneFor(id,rank,half,t=0){
 const seed=(hash(id)%1000)/1000;
 const base=(seed-.5)*Math.min(half*.78,42)+(((Number(rank)||1)%3)-1)*3.2;
 const breathe=Math.sin(t*Math.PI*2.2+seed*Math.PI*2)*2.4;
 return clamp(base+breathe,-half*.60,half*.60)
}
function frontRange(h){
 if(h?.phase==='start')return[105,748];
 if(h?.phase==='final')return[135,790];
 if(h?.camera==='athlete')return[135,760];
 if(h?.camera==='wide')return[115,735];
 return[125,765]
}
function screenPosition(entry,progress,h={}){
 const [fromX,toX]=frontRange(h),frontX=lerp(fromX,toX,ease(progress));
 const x=clamp(frontX-gapPixels(entry?.gap),72,842),bounds=road()?.roadBoundsAt?.(x);
 if(!bounds)return{x,y:180,lane:0,halfWidth:70,frontX};
 const lane=laneFor(entry?.id,entry?.rank,bounds.halfWidth,progress),y=bounds.center+lane;
 return{x,y,lane,halfWidth:bounds.halfWidth,frontX}
}
function context(){
 const api=v3(),lv=live(),d=lv?.disc||activeDisc();
 if(!api||!isRoad(d)||!lv?.event||!Array.isArray(lv?.results))return null;
 const plan=api.direct(lv.event,d,lv.results),index=clamp(Number(lv.index)||0,0,Math.max(0,plan.highlights.length-1)),h=plan.highlights[index];
 if(!h)return null;return{api,event:lv.event,disc:d,results:lv.results,plan,index,h}
}
function stop(){generation++;if(frameId){cancelAnimationFrame(frameId);frameId=0}}
function finishPosition(entry,t,results){
 const winner=Number(results?.[0]?.perf||entry?.row?.perf||0),gap=Math.max(0,Number(entry?.row?.perf||winner)-winner);
 const delay=clamp(gap/85,0,.58),rt=clamp((t-delay)/Math.max(.18,1-delay),0,1),x=lerp(505,858,ease(rt)),bounds=road()?.roadBoundsAt?.(x);
 if(!bounds)return{x,y:180,lane:0,halfWidth:70,frontX:x};
 const lane=laneFor(entry?.id,entry?.rank,bounds.halfWidth,rt),y=bounds.center+lane;return{x,y,lane,halfWidth:bounds.halfWidth,frontX:x}
}
function animate(){
 stop();const ctx=context(),stage=document.querySelector('.road-v3-stage'),root=document.getElementById('roadLiveStage');
 if(!ctx||!stage||!root)return false;
 document.querySelector('.road-matchday')?.classList.add('road-motion-v4');stage.dataset.motionModel='athlete-first-v4';
 const nodes=new Map([...stage.querySelectorAll('[data-road-v3-runner]')].map(n=>[String(n.dataset.runnerId),n]));
 if(!nodes.size)return false;
 const token=++generation,start=performance.now(),duration=Math.max(1,Number(ctx.h.durationMs)||9000);
 function frame(now){
  if(token!==generation)return;
  const current=context();if(!current||current.event!==ctx.event||current.disc!==ctx.disc||current.index!==ctx.index){frameId=0;return}
  const t=clamp((now-start)/duration,0,1),q=ease(t),metres=lerp(ctx.h.fromMetres,ctx.h.toMetres,q),snap=ctx.api.snapshotAt(ctx.event,ctx.disc,ctx.results,metres),by=new Map(snap.entries.map(x=>[String(x.id),x]));
  for(const [id,node] of nodes){
   const entry=by.get(id);if(!entry){node.style.opacity='0';continue}
   node.style.opacity='1';const pos=ctx.h.phase==='finish'?finishPosition(entry,t,ctx.results):screenPosition(entry,t,ctx.h);
   node.setAttribute('transform',`translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)})`);
   node.dataset.x=pos.x.toFixed(2);node.dataset.lane=pos.lane.toFixed(2);node.dataset.motionV4='1';node.dataset.gapSeconds=Number(entry.gap||0).toFixed(2);
  }
  if(t<1)frameId=requestAnimationFrame(frame);else frameId=0
 }
 frameId=requestAnimationFrame(frame);return true
}
function schedule(){requestAnimationFrame(()=>requestAnimationFrame(animate))}
function installDraw(){
 if(typeof drawCompetition!=='function')return false;
 if(drawCompetition.__amMarathonRoadMotionV4)return true;
 baseDraw=drawCompetition;
 const wrapped=function(...args){const out=baseDraw.apply(this,args);schedule();return out};
 Object.defineProperty(wrapped,'__amMarathonRoadMotionV4',{value:true});
 try{drawCompetition=wrapped;window.drawCompetition=wrapped}catch(_){window.drawCompetition=wrapped}
 return true
}
function install(){
 if(!v3()||!road()){setTimeout(install,80);return}
 installDraw();schedule();
}
window.addEventListener('pageshow',schedule);
window.addEventListener('orientationchange',()=>setTimeout(schedule,120));
window.AMMarathonRoadMotionV4={version:VERSION,gapPixels,screenPosition,animate,stop,debug:()=>({installed:!!window.__amMarathonRoadMotionV4,active:!!frameId,model:'athlete-first',roadScroll:false})};
install();
})();
