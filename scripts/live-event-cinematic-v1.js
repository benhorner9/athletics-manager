/* Athletics Manager — Live Event Cinematic V1
   Dev-only presentation experiment. Leaves race simulation/results untouched and upgrades
   track athlete markers into animated 2D runners plus a light broadcast polish layer. */
(function(){
'use strict';
if(window.__amLiveEventCinematicV1)return;
window.__amLiveEventCinematicV1=1;

const NS='http://www.w3.org/2000/svg';
const history=new Map();
let queued=false;
let observer=null;

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function hash(value){let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function angleDelta(a,b){let d=(b-a+540)%360-180;return d}
function parseTranslate(value){const m=String(value||'').match(/translate\(\s*(-?\d+(?:\.\d+)?)\s*(?:[, ]\s*)?(-?\d+(?:\.\d+)?)?\s*\)/);return m?{x:Number(m[1])||0,y:Number(m[2])||0}:null}
function svgEl(name,attrs={}){const el=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));return el}
function skinTone(id){const tones=['#d7a27c','#b97956','#8d563c','#e2b08b','#6d412e','#c88967','#f0c2a0'];return tones[hash(id)%tones.length]}
function darker(hex,amount=.28){const m=String(hex||'').match(/^#([0-9a-f]{6})$/i);if(!m)return'#12222d';const n=parseInt(m[1],16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;const f=1-amount;return`rgb(${Math.round(r*f)} ${Math.round(g*f)} ${Math.round(b*f)})`}

function injectStyles(){
 if(document.getElementById('am-live-cinematic-v1-style'))return;
 const style=document.createElement('style');
 style.id='am-live-cinematic-v1-style';
 style.textContent=`
#competition .lv4event.am-cinematic-live .lv4-grid{grid-template-columns:minmax(0,1fr) minmax(270px,320px)!important;gap:10px!important}
#competition .lv4event.am-cinematic-live .lv4-grid #liveEventVisual{background:#07151d!important}
#competition .lv4event.am-cinematic-live .lv4-grid #liveScoreboard{background:linear-gradient(180deg,#071722,#041019)!important}
#competition .lv4event.am-cinematic-live .lv4-top{background:linear-gradient(90deg,#071722 0%,#06131d 66%,#081b28 100%)!important}
#competition .lv4event.am-cinematic-live .lv4-board>header{background:linear-gradient(180deg,#0b2230,#071722)!important}
#competition .lv4event.am-cinematic-live .lv4-board-row{min-height:50px!important}
#competition .lv4event.am-cinematic-live .lv4-board-row.leader{background:linear-gradient(90deg,rgba(233,196,107,.10),rgba(233,196,107,.025))!important}
#competition .lv4event.am-cinematic-live .lv4-comments{background:linear-gradient(180deg,#071722,#05131c)!important}
#competition .am-cinematic-canvas{position:relative;overflow:hidden;background:#0a261e!important}
#competition .am-cinematic-canvas:after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 52% 0%,rgba(213,235,245,.10),transparent 30%),linear-gradient(180deg,rgba(255,255,255,.018),transparent 34%,rgba(0,0,0,.08));mix-blend-mode:screen}
#competition .am-cinematic-canvas>.lv4-broadcast-bug,#competition .am-cinematic-canvas>.lv4-phase,#competition .am-cinematic-canvas>.lv4-attempt-card,#competition .am-cinematic-canvas>.lv4-split,#competition .am-cinematic-canvas>.lv4-gun,#competition .am-cinematic-canvas>.lv4-finish-strip,#competition .am-cinematic-canvas>.lv4-intro,#competition .am-cinematic-canvas>.lv4-photo{z-index:5}
#competition .am-cinematic-track{shape-rendering:geometricPrecision;filter:saturate(1.08) contrast(1.035)}
#competition .am-cinematic-track .lv4-athlete-ring,#competition .am-cinematic-track .lv4-athlete-dot{opacity:0!important}
#competition .am-cinematic-track .lv4-player-pin{opacity:0!important}
#competition .am-cinematic-track .lv4-athlete{filter:drop-shadow(0 2px 1.7px rgba(0,0,0,.34))}
#competition .am-cinematic-track .lv4-athlete.inactive .am-runner-v2{opacity:.52}
#competition .am-cinematic-track .am-runner-shadow{fill:#020609;opacity:.24}
#competition .am-cinematic-track .am-runner-body{stroke:rgba(255,255,255,.26);stroke-width:.55;paint-order:stroke fill}
#competition .am-cinematic-track .am-runner-shorts{stroke:#071017;stroke-width:.6}
#competition .am-cinematic-track .am-runner-limb{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-width:2.25}
#competition .am-cinematic-track .am-runner-arm{stroke-width:1.85}
#competition .am-cinematic-track .am-runner-shoe{stroke:#e9f0f2;stroke-width:1.25;stroke-linecap:round}
#competition .am-cinematic-track .am-runner-head{stroke:#071017;stroke-width:.55}
#competition .am-cinematic-track .am-runner-halo{fill:none;stroke-width:1.4;opacity:.0}
#competition .am-cinematic-track .lv4-athlete.leader .am-runner-halo{stroke:#f0cf78;opacity:.68}
#competition .am-cinematic-track .lv4-athlete.ours .am-runner-halo{stroke:#f2fbff;opacity:.9;stroke-width:1.8}
#competition .am-cinematic-track .lv4-athlete.ours.leader .am-runner-halo{stroke:#fff3b5;opacity:1}
#competition .am-cinematic-track .lv4-athlete-label{filter:drop-shadow(0 2px 2px rgba(0,0,0,.5))}
#competition .am-cinematic-track .lv4-athlete-label rect{fill:#041019f0;stroke:#c8dce6;stroke-opacity:.30}
#competition .am-cinematic-track .lv4-athlete-label text{font-size:6.1px;letter-spacing:.025em}
#competition .am-cinematic-track .lv4-lane-number{font-size:8px;font-weight:1000;opacity:.9}
#competition .am-cinematic-track .lv4-stadium-detail rect{fill:#081923;stroke:#8fb0c1;stroke-opacity:.32}
#competition .am-cinematic-track .lv4-stadium-detail text{fill:#e7f1f5;font-size:8px;letter-spacing:.11em}
#competition .am-cinematic-track .lv4-stadium-detail text+text{fill:#8aa6b4}
#competition .am-cinematic-track .lv4-block rect{fill:#e8edf0;opacity:.86}
@media (max-width:900px){#competition .lv4event.am-cinematic-live .lv4-grid{grid-template-columns:minmax(0,1fr)!important}#competition .am-cinematic-track .lv4-athlete-label text{font-size:5.7px}}
@media (prefers-reduced-motion:reduce){#competition .am-cinematic-track .lv4-athlete{filter:drop-shadow(0 1px 1px rgba(0,0,0,.25))}}
`;
 document.head.appendChild(style);
}

function createRunner(node,id,colour){
 const root=svgEl('g',{class:'am-runner-v2','aria-hidden':'true'});
 root.style.setProperty('--runner-colour',colour);
 root.appendChild(svgEl('ellipse',{class:'am-runner-shadow',cx:'-1',cy:'5.6',rx:'9.7',ry:'2.1'}));
 root.appendChild(svgEl('circle',{class:'am-runner-halo',cx:'0',cy:'0',r:'12.2'}));

 const rearLeg=svgEl('path',{class:'am-runner-limb am-runner-leg am-runner-leg-rear',stroke:skinTone(id)});
 const frontLeg=svgEl('path',{class:'am-runner-limb am-runner-leg am-runner-leg-front',stroke:skinTone(id)});
 const rearArm=svgEl('path',{class:'am-runner-limb am-runner-arm am-runner-arm-rear',stroke:skinTone(id)});
 const frontArm=svgEl('path',{class:'am-runner-limb am-runner-arm am-runner-arm-front',stroke:skinTone(id)});
 root.appendChild(rearLeg);root.appendChild(rearArm);
 root.appendChild(svgEl('path',{class:'am-runner-body',d:'M-4.8 -3.7 Q-1.2 -5.0 2.7 -3.7 L4.5 .9 Q2.0 3.1 -2.7 2.7 L-5.4 -.1 Z',fill:colour}));
 root.appendChild(svgEl('path',{class:'am-runner-shorts',d:'M-2.7 2.0 L4.0 .8 L3.4 4.0 L-.2 4.7 L-3.3 3.5 Z',fill:darker(colour,.46)}));
 root.appendChild(frontLeg);root.appendChild(frontArm);
 root.appendChild(svgEl('circle',{class:'am-runner-head',cx:'5.9',cy:'-2.8',r:'2.55',fill:skinTone(id)}));
 const shoeA=svgEl('line',{class:'am-runner-shoe am-shoe-front'}),shoeB=svgEl('line',{class:'am-runner-shoe am-shoe-rear'});root.appendChild(shoeA);root.appendChild(shoeB);
 return root;
}

function setPath(path,pts){path.setAttribute('d',`M${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} Q${pts[1].x.toFixed(2)} ${pts[1].y.toFixed(2)} ${pts[2].x.toFixed(2)} ${pts[2].y.toFixed(2)}`)}
function poseRunner(root,phase,heading,bob,pace){
 root.setAttribute('transform',`rotate(${heading.toFixed(2)}) translate(0 ${bob.toFixed(2)}) scale(${pace>0?1:.96})`);
 const s=Math.sin(phase),c=Math.cos(phase),s2=Math.sin(phase+Math.PI),c2=Math.cos(phase+Math.PI);
 const hip={x:-.6,y:2.8},shoulder={x:.6,y:-1.7};
 const leg=(sv,cv)=>({k:{x:hip.x+4.1*sv,y:hip.y+3.2+1.2*Math.max(0,-cv)},f:{x:hip.x+8.2*sv-1.5*cv,y:hip.y+5.1+1.7*Math.abs(cv)}});
 const la=leg(s,c),lb=leg(s2,c2);
 setPath(root.querySelector('.am-runner-leg-front'),[hip,la.k,la.f]);
 setPath(root.querySelector('.am-runner-leg-rear'),[hip,lb.k,lb.f]);
 const arm=(sv,cv)=>({e:{x:shoulder.x-3.6*sv,y:shoulder.y+2.6+1.2*Math.max(0,cv)},h:{x:shoulder.x-6.4*sv+1.0*cv,y:shoulder.y+1.3+2.0*Math.abs(sv)}});
 const aa=arm(-s,c),ab=arm(s,c2);
 setPath(root.querySelector('.am-runner-arm-front'),[shoulder,aa.e,aa.h]);
 setPath(root.querySelector('.am-runner-arm-rear'),[shoulder,ab.e,ab.h]);
 const shoes=[['.am-shoe-front',la.f,s],['.am-shoe-rear',lb.f,s2]];
 for(const [sel,f,sv] of shoes){const el=root.querySelector(sel);el.setAttribute('x1',(f.x-1.2).toFixed(2));el.setAttribute('y1',f.y.toFixed(2));el.setAttribute('x2',(f.x+1.8+sv*.6).toFixed(2));el.setAttribute('y2',(f.y+.2).toFixed(2))}
}

function enhanceRunner(node,index,now,reduced){
 const pos=parseTranslate(node.getAttribute('transform'));if(!pos)return;
 const id=node.getAttribute('data-run')||`runner-${index}`;
 const key=String(id);
 const dot=node.querySelector('.lv4-athlete-dot');
 const colour=dot?.getAttribute('fill')||'#5ca8d8';
 let previous=history.get(key);
 if(previous){const jump=Math.hypot(pos.x-previous.x,pos.y-previous.y);if(now-previous.t>1200||jump>180)previous=null}
 let heading=previous?.heading??0,pace=0,lastMove=previous?.lastMove??now;
 if(previous){
  const dt=Math.max(1,now-previous.t),dx=pos.x-previous.x,dy=pos.y-previous.y,d=Math.hypot(dx,dy);
  pace=d/(dt/1000);
  if(d>.025){const target=Math.atan2(dy,dx)*180/Math.PI;heading+=angleDelta(heading,target)*.72;lastMove=now}
  else if(now-lastMove>260)pace=0;
 }
 const seed=hash(key),baseCadence=3.35+(seed%13)/100,moveCadence=clamp(baseCadence+pace*.022,3.0,4.75);
 const active=!node.classList.contains('inactive')&&(previous?now-lastMove<320:true);
 const cadence=(reduced||!active)?0:moveCadence;
 const phase=cadence?now/1000*cadence*Math.PI*2+(seed%628)/100:((seed%7)-3)*.08;
 const bob=cadence?-.45*Math.abs(Math.sin(phase*2)):0;
 const runner=createRunner(node,id,colour);
 poseRunner(runner,phase,heading,bob,cadence);
 const label=node.querySelector('.lv4-athlete-label');
 if(label)node.insertBefore(runner,label);else node.appendChild(runner);
 history.set(key,{x:pos.x,y:pos.y,t:now,heading,lastMove});
}

function enhance(){
 queued=false;
 const competition=document.getElementById('competition');if(!competition)return;
 const reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const svgs=competition.querySelectorAll('svg.lv4-svg');
 let hasTrack=false;
 svgs.forEach(svg=>{
  if(!svg.querySelector('.lv4-lane-number'))return;
  hasTrack=true;
  svg.classList.add('am-cinematic-track');
  svg.closest('.lv4-canvas')?.classList.add('am-cinematic-canvas');
  const now=performance.now();
  svg.querySelectorAll('.lv4-athlete[data-run]').forEach((node,index)=>{
   if(node.querySelector('.am-runner-v2'))return;
   enhanceRunner(node,index,now,reduced);
  });
 });
 const event=competition.querySelector('.lv4event');
 if(event)event.classList.toggle('am-cinematic-live',hasTrack);
 if(!hasTrack){competition.querySelectorAll('.am-cinematic-canvas').forEach(x=>x.classList.remove('am-cinematic-canvas'))}
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(enhance)}
function start(){
 injectStyles();
 const competition=document.getElementById('competition');
 if(!competition)return;
 observer=new MutationObserver(records=>{
  const onlyOurRunnerAdds=records.length>0&&records.every(r=>Array.from(r.addedNodes||[]).every(n=>n.nodeType!==1||n.classList?.contains('am-runner-v2')));
  if(!onlyOurRunnerAdds)schedule();
 });
 observer.observe(competition,{childList:true,subtree:true});
 schedule();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.AMLiveEventCinematicV1={version:'1.0',refresh:schedule,disable(){observer?.disconnect();observer=null;document.getElementById('am-live-cinematic-v1-style')?.remove();document.querySelectorAll('.am-runner-v2').forEach(x=>x.remove());document.querySelectorAll('.am-cinematic-live,.am-cinematic-canvas,.am-cinematic-track').forEach(x=>x.classList.remove('am-cinematic-live','am-cinematic-canvas','am-cinematic-track'))}};
})();
