/* Athletics Manager — Training notification authority V1
   Keeps the sidebar/mobile Training badge aligned with the current Training Centre.
   The older asynchronous Training bundle can still attempt to write its legacy count;
   this layer reasserts the current AMTrainingSystem2 attention queue as the only badge source. */
(function(){
'use strict';
if(window.__amTrainingNotificationAuthorityV1)return;
window.__amTrainingNotificationAuthorityV1=1;

let scheduled=false;
let syncing=false;

function currentCount(){
 try{
  const rows=window.AMTrainingSystem2?.attentionRows?.();
  return Array.isArray(rows)?rows.length:0;
 }catch(_){return 0}
}

function buttonFor(root){
 return root?.querySelector?.('[data-view="training"],[data-mobile-view="training"]')||null;
}

function syncRoot(root,count){
 const button=buttonFor(root);if(!button)return;
 const badges=[...button.querySelectorAll('.tr2-nav-badge')];
 let badge=badges.shift();
 if(!badge){
  badge=document.createElement('span');
  badge.className='tr2-nav-badge';
  button.appendChild(badge);
 }
 badges.forEach(extra=>extra.remove());
 const text=count?String(count):'';
 if(badge.textContent!==text)badge.textContent=text;
 const hidden=!count;
 if(badge.hidden!==hidden)badge.hidden=hidden;
 badge.setAttribute('aria-label',count?`${count} unresolved training decision${count===1?'':'s'}`:'No unresolved training decisions');
}

function sync(){
 if(syncing)return;
 const api=window.AMTrainingSystem2;
 if(!api?.attentionRows)return;
 syncing=true;
 try{
  const count=currentCount();
  syncRoot(document.getElementById('railNav'),count);
  syncRoot(document.getElementById('mobileNavDrawer'),count);
 }finally{syncing=false}
}

function schedule(){
 if(scheduled)return;
 scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;sync()});
}

for(const root of [document.getElementById('railNav'),document.getElementById('mobileNavDrawer')]){
 if(!root)continue;
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});
}

document.addEventListener('click',()=>setTimeout(schedule,0),true);
document.addEventListener('change',()=>setTimeout(schedule,0),true);
window.addEventListener('load',schedule,{once:true});
[0,100,250,500,900,1500,2500,4000,7000].forEach(ms=>setTimeout(schedule,ms));

window.__athleticsTrainingNotificationAuthority={version:1,sync,count:currentCount};
})();
