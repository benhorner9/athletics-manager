/* ===== Shot Put Athlete Marker V2 ===== */
(function(){
'use strict';
if(window.__amShotPutAthleteV2)return;window.__amShotPutAthleteV2=1;

let raf=0,overlay=null,host=null;
const SVG_NS='http://www.w3.org/2000/svg';
const isShot=c=>{
 if(!c||c.kind!=='field')return false;
 const name=DISCIPLINES?.[c.d]?.label||String(c.d||'');
 return /shot\s*put/i.test(name)||/^(M|W)SP$/i.test(String(c.d||''));
};
const colour=n=>{try{return nationDotColour(n)}catch(_){return'#7ea7bf'}};

function remove(){
 if(overlay){overlay.remove();overlay=null}
 host=null;
}
function make(hostEl){
 const el=document.createElement('div');
 el.className='am-shotput-athlete-dot';
 el.setAttribute('aria-hidden','true');
 el.innerHTML='<i></i>';
 Object.assign(el.style,{position:'absolute',borderRadius:'50%',border:'3px solid #fff',boxShadow:'0 3px 10px #0009',pointerEvents:'none',zIndex:'8',transform:'translate(-50%,-50%)',transition:'background .1s linear'});
 const arm=el.querySelector('i');
 Object.assign(arm.style,{position:'absolute',left:'55%',top:'44%',width:'90%',height:'3px',borderRadius:'4px',background:'#fff',transformOrigin:'0 50%'});
 hostEl.appendChild(el);
 return el;
}
function svgNode(name,attrs={}){
 const el=document.createElementNS(SVG_NS,name);
 Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,String(value)));
 return el;
}
function ensureDistanceMarkers(svg){
 if(svg.querySelector('.am-shotput-distance-markers'))return;
 /* Remove the old labels that sat below the sector. */
 svg.querySelectorAll('text.v3sub').forEach(el=>{
  if(/^(5|10|15|20|25)m$/.test(String(el.textContent||'').trim()))el.remove();
 });
 const g=svgNode('g',{class:'am-shotput-distance-markers','aria-hidden':'true'});
 [5,10,15,20,25].forEach(m=>{
  const ratio=m/25;
  const x=148+545*ratio;
  const half=180*ratio;
  const line=svgNode('line',{
   x1:x,y1:272-half+8,x2:x,y2:272+half-8,
   stroke:'#e7f1ea','stroke-opacity':'.24','stroke-width':'2','stroke-dasharray':'5 7'
  });
  const text=svgNode('text',{
   x:x,y:272-half+22,'text-anchor':'middle',fill:'#f2f7f3','fill-opacity':'.82',
   'font-size':'12','font-weight':'900','letter-spacing':'.04em'
  });
  text.textContent=`${m}m`;
  g.append(line,text);
 });
 svg.appendChild(g);
}
function sync(){
 const c=window.AMLiveEventV3?.active;
 if(!isShot(c)){remove();return false}
 const root=document.getElementById('liveEventVisual'),svg=root?.querySelector('svg.v3svg');
 if(!root||!svg)return true;
 ensureDistanceMarkers(svg);
 const nextHost=root.parentElement;if(!nextHost)return true;
 if(host!==nextHost||!overlay?.isConnected){remove();host=nextHost;if(getComputedStyle(host).position==='static')host.style.position='relative';overlay=make(host)}
 const q=c.seq?.[c.i]||c.seq?.[c.seq.length-1];if(!q)return true;
 const p=c.phase==='act'?Math.min(1,Math.max(0,Number(c.t||0)/.95)):c.phase==='res'?1:0;
 /* Circle centre in the V3 Shot Put scene is 148,272 with a radius of 52. */
 let x=148,y=272,angle=-18;
 if(c.phase==='act'){
  const turn=Math.min(1,p/.62);
  x=148+28*turn;
  y=272-14*Math.sin(Math.PI*turn);
  angle=-35+145*turn;
 }else if(c.phase==='res'){
  x=176;y=272;angle=110;
 }
 const sr=svg.getBoundingClientRect(),hr=host.getBoundingClientRect();
 const scale=Math.max(.72,Math.min(1.2,sr.width/760));
 const size=24*scale;
 Object.assign(overlay.style,{left:`${sr.left-hr.left+(x/760)*sr.width}px`,top:`${sr.top-hr.top+(y/455)*sr.height}px`,width:`${size}px`,height:`${size}px`,background:colour(q.r?.nation)});
 overlay.querySelector('i').style.transform=`rotate(${angle}deg)`;
 return true;
}
function loop(){raf=0;if(sync()&&isShot(window.AMLiveEventV3?.active))raf=requestAnimationFrame(loop)}
function kick(){if(!raf)raf=requestAnimationFrame(loop)}

if(typeof startDiscipline==='function'){
 const base=startDiscipline;
 startDiscipline=function(){const out=base.apply(this,arguments);kick();return out};
}
if(typeof startSummitDiscipline==='function'){
 const base=startSummitDiscipline;
 startSummitDiscipline=function(){const out=base.apply(this,arguments);kick();return out};
}

/* Reconnect after Event Day redraws because V3 rebuilds the SVG during each attempt. */
const competition=document.getElementById('competition');
if(competition)new MutationObserver(()=>{if(isShot(window.AMLiveEventV3?.active))kick();else if(!window.AMLiveEventV3?.active)remove()}).observe(competition,{childList:true,subtree:true});

try{
 const update={timestamp:'2026-09-10T14:58:00+01:00',date:'10 September 2026',title:'Shot Put 2D Fix',items:[
  'The active thrower now stays inside the Shot Put circle through the movement and release.',
  '5m, 10m, 15m, 20m and 25m reference markers now sit directly on the throwing sector.'
 ]};
 if(Array.isArray(UPDATES)&&!UPDATES.some(x=>x?.timestamp===update.timestamp)){UPDATES.unshift(update);if(UPDATES.length>5)UPDATES.splice(5);if(typeof renderMenu==='function')renderMenu()}
}catch(_){ }

window.__athleticsShotPutAthlete={version:2,sync};
})();
/* ===== End Shot Put Athlete Marker V2 ===== */

/* Load final Event Day runtime layers after the core renderers. */
(function(){
 function load(src,marker){
  if(document.querySelector(`script[${marker}]`))return;
  const script=document.createElement('script');
  script.src=src;
  script.async=false;
  script.setAttribute(marker,'1');
  document.head.appendChild(script);
 }
 if(!window.__amEventExitAuthorityV1)load('scripts/event-exit-authority-v1.js?v=20260910-exit1','data-am-event-exit-authority');
 if(!window.__amHighJumpBroadcastV1)load('scripts/high-jump-broadcast-v1.js?v=20260910-hjhighlights1','data-am-hj-broadcast');
 if(!window.__amTrainingV2Bootstrap)load('scripts/training-v2-bootstrap.js?v=20260910-training2i','data-am-training-v2');
})();
