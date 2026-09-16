/* Athletics Manager — Marathon Road Motion V4
   Athlete-first road motion. V3 owns simulated rank/gap placement on each marker;
   V4 moves a separate wrapper through a fixed road section so the two systems never
   write the same transform. */
(function(){
'use strict';
if(window.__amMarathonRoadMotionV4)return;window.__amMarathonRoadMotionV4=1;
if(typeof document==='undefined')return;

const VERSION=4;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const lerp=(a,b,t)=>Number(a||0)+(Number(b||0)-Number(a||0))*clamp(t,0,1);
const ease=t=>1-Math.pow(1-clamp(t,0,1),2.05);
let frameId=0;
let generation=0;
let baseDraw=null;
let activeStage=null;
let mutationFrame=0;

function v3(){return window.AMMarathonRoadBroadcastV3}
function road(){return window.AMMarathonRoadBroadcastV2}
function live(){try{return typeof liveEventView!=='undefined'?liveEventView:null}catch(_){return null}}
function activeDisc(){try{return typeof activeEventDisc!=='undefined'?activeEventDisc:null}catch(_){return null}}
function isRoad(d){try{return !!v3()?.isRoad?.(d)}catch(_){return false}}
function gapPixels(sec){sec=Math.max(0,Number(sec)||0);return Math.min(540,sec<=12?sec*9.4:113+Math.sqrt(sec-12)*16.4)}
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
 const lane=clamp(Number(entry?.lane)||0,-(bounds?.halfWidth||70)*.60,(bounds?.halfWidth||70)*.60);
 return{x,y:(bounds?.center||180)+lane,lane,halfWidth:bounds?.halfWidth||70,frontX}
}
function context(){
 const api=v3(),lv=live(),d=lv?.disc||activeDisc();
 if(!api||!isRoad(d)||!lv?.event||!Array.isArray(lv?.results))return null;
 const plan=api.direct(lv.event,d,lv.results),index=clamp(Number(lv.index)||0,0,Math.max(0,plan.highlights.length-1)),h=plan.highlights[index];
 if(!h)return null;return{api,event:lv.event,disc:d,results:lv.results,plan,index,h}
}
function stop(){generation++;if(frameId){cancelAnimationFrame(frameId);frameId=0}activeStage=null}
function ensureWrappers(stage){
 const rows=[];
 for(const node of [...stage.querySelectorAll('[data-road-v3-runner]')]){
  let wrapper=node.parentElement?.matches?.('[data-road-v4-travel]')?node.parentElement:null;
  if(!wrapper){
   wrapper=document.createElementNS('http://www.w3.org/2000/svg','g');
   wrapper.classList.add('road-v4-travel');wrapper.dataset.roadV4Travel='1';
   node.parentNode?.insertBefore(wrapper,node);wrapper.appendChild(node);
  }
  node.dataset.motionV4='1';rows.push({node,wrapper});
 }
 return rows
}
function travelOffsets(h){
 if(h?.phase==='finish')return[0,0];
 if(h?.phase==='start')return[-565,35];
 if(h?.phase==='final')return[-545,35];
 if(h?.camera==='wide')return[-575,20];
 return[-560,30]
}
function setTravel(row,offsetX){
 const baseX=Number(row.node.dataset.x);if(!Number.isFinite(baseX))return;
 const baseLane=Number(row.node.dataset.lane)||0,baseBounds=road()?.roadBoundsAt?.(baseX);if(!baseBounds)return;
 const visualX=baseX+offsetX,visualBounds=road()?.roadBoundsAt?.(visualX);if(!visualBounds)return;
 const visualLane=clamp(baseLane,-visualBounds.halfWidth*.60,visualBounds.halfWidth*.60);
 const baseY=baseBounds.center+baseLane,visualY=visualBounds.center+visualLane,dy=visualY-baseY;
 row.wrapper.setAttribute('transform',`translate(${offsetX.toFixed(2)} ${dy.toFixed(2)})`);
 row.node.dataset.renderX=visualX.toFixed(2);row.node.dataset.renderLane=visualLane.toFixed(2);
}
function animate(){
 stop();const ctx=context(),stage=document.querySelector('.road-v3-stage'),root=document.getElementById('roadLiveStage');
 if(!ctx||!stage||!root)return false;
 activeStage=stage;stage.dataset.motionV4Bound='1';
 document.querySelector('.road-matchday')?.classList.add('road-motion-v4');stage.dataset.motionModel='athlete-first-v4';
 const rows=ensureWrappers(stage);if(!rows.length){activeStage=null;return false}
 const [fromOffset,toOffset]=travelOffsets(ctx.h),token=++generation,start=performance.now(),duration=Math.max(1,Number(ctx.h.durationMs)||9000);
 // Set the entry position synchronously before the browser paints the newly rendered stage.
 for(const row of rows)setTravel(row,fromOffset);
 function frame(now){
  if(token!==generation)return;
  if(activeStage!==stage||document.querySelector('.road-v3-stage')!==stage){frameId=0;activeStage=null;return}
  const current=context();if(!current||current.event!==ctx.event||current.disc!==ctx.disc||current.index!==ctx.index){frameId=0;activeStage=null;return}
  const t=clamp((now-start)/duration,0,1),offsetX=lerp(fromOffset,toOffset,ease(t));
  for(const row of rows)setTravel(row,offsetX);
  if(t<1)frameId=requestAnimationFrame(frame);else{frameId=0;activeStage=null}
 }
 frameId=requestAnimationFrame(frame);return true
}
function decorateNow(){return animate()}
function schedule(){requestAnimationFrame(()=>decorateNow())}
function installDraw(){
 if(typeof drawCompetition!=='function')return false;
 if(drawCompetition.__amMarathonRoadMotionV4)return true;
 baseDraw=drawCompetition;
 const wrapped=function(...args){const out=baseDraw.apply(this,args);decorateNow();return out};
 Object.defineProperty(wrapped,'__amMarathonRoadMotionV4',{value:true});
 try{drawCompetition=wrapped;window.drawCompetition=wrapped}catch(_){window.drawCompetition=wrapped}
 return true
}
function installStageObserver(){
 if(window.__amMarathonRoadMotionV4Observer)return;window.__amMarathonRoadMotionV4Observer=1;
 const observer=new MutationObserver(mutations=>{
  let addedStage=false;
  for(const mutation of mutations){
   for(const node of mutation.addedNodes||[]){
    if(node?.nodeType!==1)continue;
    if(node.matches?.('.road-v3-stage')||node.querySelector?.('.road-v3-stage')){addedStage=true;break}
   }
   if(addedStage)break
  }
  if(!addedStage)return;
  if(mutationFrame)cancelAnimationFrame(mutationFrame);
  mutationFrame=requestAnimationFrame(()=>{mutationFrame=0;const stage=document.querySelector('.road-v3-stage');if(stage&&stage!==activeStage)animate()})
 });
 observer.observe(document.documentElement,{childList:true,subtree:true});
}
function install(){
 if(!v3()||!road()){setTimeout(install,80);return}
 installDraw();installStageObserver();decorateNow();
}
window.addEventListener('pageshow',schedule);
window.addEventListener('orientationchange',()=>setTimeout(schedule,120));
window.AMMarathonRoadMotionV4={version:VERSION,gapPixels,screenPosition,animate,stop,travelOffsets,debug:()=>{const stage=document.querySelector('.road-v3-stage');return{installed:!!window.__amMarathonRoadMotionV4,active:!!frameId&&!!activeStage&&activeStage===stage,model:'athlete-first',ownership:'wrapper-transform',roadScroll:false}}};
install();
})();
