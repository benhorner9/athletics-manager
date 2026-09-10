/* ===== Shot Put Athlete Marker V1 ===== */
(function(){
'use strict';
if(window.__amShotPutAthleteV1)return;window.__amShotPutAthleteV1=1;

let raf=0,overlay=null,host=null;
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
function sync(){
 const c=window.AMLiveEventV3?.active;
 if(!isShot(c)){remove();return false}
 const root=document.getElementById('liveEventVisual'),svg=root?.querySelector('svg.v3svg');
 if(!root||!svg)return true;
 const nextHost=root.parentElement;if(!nextHost)return true;
 if(host!==nextHost||!overlay?.isConnected){remove();host=nextHost;if(getComputedStyle(host).position==='static')host.style.position='relative';overlay=make(host)}
 const q=c.seq?.[c.i]||c.seq?.[c.seq.length-1];if(!q)return true;
 const p=c.phase==='act'?Math.min(1,Math.max(0,Number(c.t||0)/.95)):c.phase==='res'?1:0;
 let x=132,y=274,angle=-18;
 if(c.phase==='act'){
  const wind=Math.min(1,p/.42);
  x=132+30*wind;
  y=274-11*Math.sin(Math.PI*wind);
  angle=-35+115*wind;
 }else if(c.phase==='res'){
  x=162;y=274;angle=80;
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

/* Reconnect if another screen redraw starts a live Shot Put before this patch sees the start call. */
const competition=document.getElementById('competition');
if(competition)new MutationObserver(()=>{if(isShot(window.AMLiveEventV3?.active))kick();else if(!window.AMLiveEventV3?.active)remove()}).observe(competition,{childList:true,subtree:true});

try{
 const update={timestamp:'2026-09-10T14:12:00+01:00',date:'10 September 2026',title:'Shot Put Athlete Animation',items:['Shot Put Live 2D now shows the active athlete moving through the throwing circle so the shot visibly releases from the competitor rather than appearing to launch on its own.']};
 if(Array.isArray(UPDATES)&&!UPDATES.some(x=>x?.timestamp===update.timestamp)){UPDATES.unshift(update);if(UPDATES.length>5)UPDATES.splice(5);if(typeof renderMenu==='function')renderMenu()}
}catch(_){ }

window.__athleticsShotPutAthlete={version:1,sync};
})();
/* ===== End Shot Put Athlete Marker V1 ===== */
