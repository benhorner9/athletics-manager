/* Athletics Manager — Squad Call-Up Flow V2
   iPad-safe National Pool -> National Squad Agreement flow.
   Keeps the agreement chooser inside the already-open athlete profile dialog so Safari
   never has to close one modal and open another in the same interaction frame. */
(function(){
'use strict';
if(window.__amSquadCallupFlowV2)return;window.__amSquadCallupFlowV2=1;

const $=id=>document.getElementById(id);
const esc=value=>{try{return profileEscape(String(value??''))}catch(_){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}};
const getAthlete=id=>(s?.athletes||[]).find(a=>String(a.id)===String(id));
const terms=()=>Array.isArray(typeof SQUAD_AGREEMENT_TERMS!=='undefined'?SQUAD_AGREEMENT_TERMS:null)&&SQUAD_AGREEMENT_TERMS.length?SQUAD_AGREEMENT_TERMS:[10,20,30,40,52];
const squadCap=()=>{try{return Number(SQUAD_LIMIT)||9}catch(_){return 9}};
const squadCount=()=>{try{return managedTeam().length}catch(_){return 0}};
const endLabel=weeks=>{try{return agreementEndLabel(careerNow()+weeks)}catch(_){return `${weeks} weeks from now`}};

function restoreProfile(id){
 try{profileId=id}catch(_){}
 try{selectedAthlete=id}catch(_){}
 try{drawAthleteProfile();return}catch(_){}
 try{openAthleteProfile(id)}catch(_){}
}

function agreementChooserHTML(a){
 const cap=squadCap(),count=squadCount();
 const labels={10:'Short assessment',20:'Half-season block',30:'Development block',40:'Core season',52:'Full year'};
 return `<div class="apv2-shell" data-am-component="squad-agreement-chooser">
  <header class="apv2-top"><div><small>ATHLETICS MANAGER · NATIONAL SQUAD AGREEMENT</small><span>${esc(a.name)} · ${count} / ${cap} squad places currently used</span></div><button type="button" class="btn ghost" data-callup-back>← BACK TO ATHLETE</button></header>
  <main class="apv2-body">
   <section class="apv2-card"><div class="apv2-card-head"><strong>Call Up ${esc(a.name)}</strong><span>Choose agreement length</span></div><div class="apv2-card-body">
    <p>Calling ${esc(a.name)} into the senior squad uses one of your ${cap} squad places for the full agreement. There is no salary or funding cost.</p>
    <p>Two weeks before expiry, the performance team will ask whether you want to extend. If you take no action, the athlete automatically returns to the National Pool.</p>
   </div></section>
   <section class="apv2-card" style="margin-top:10px"><div class="apv2-card-head"><strong>Agreement Options</strong><span>10–52 weeks</span></div><div class="apv2-card-body"><div class="staff-grid">
    ${terms().map(w=>`<div class="staff-card"><h3>${w} weeks</h3><p>${esc(labels[w]||'Squad agreement')}<br>Ends ${esc(endLabel(w))}</p><button type="button" class="btn secondary" data-callup-term="${w}">SELECT ${w} WEEKS</button></div>`).join('')}
   </div></div></section>
  </main>
 </div>`;
}

function showSameDialogChooser(id){
 const a=getAthlete(id);if(!a||a.retired)return false;
 try{if(a.nation!==managedNation()||a.inSquad!==false)return false}catch(_){return false}
 if(squadCount()>=squadCap()){try{toast('National squad is full')}catch(_){};return true}
 const dialog=$('athleteProfile');
 if(!dialog||!dialog.open)return false;
 dialog.innerHTML=agreementChooserHTML(a);
 dialog.querySelector('[data-callup-back]')?.addEventListener('click',()=>restoreProfile(id));
 dialog.querySelectorAll('[data-callup-term]').forEach(button=>button.addEventListener('click',()=>{
  const weeks=Number(button.dataset.callupTerm);
  button.disabled=true;
  let ok=false;
  try{ok=finaliseSquadAgreementCallUp(id,weeks)}catch(err){console.error('[Athletics Manager] squad agreement call-up failed',err)}
  if(!ok){button.disabled=false;return}
  try{if(typeof renderView==='function')renderView(currentView)}catch(_){}
  restoreProfile(id);
 }));
 return true;
}

function fallbackChooser(id){
 const a=getAthlete(id);if(!a||a.retired)return;
 if(squadCount()>=squadCap()){try{toast('National squad is full')}catch(_){};return}
 const launch=()=>{
  try{
   if(typeof managementDialog==='function'){
    managementDialog(`Call up ${a.name}`,`<section class="profile-panel"><div class="profile-kicker">NATIONAL SQUAD AGREEMENT</div><h2>Choose the commitment</h2><p>Calling ${esc(a.name)} into the senior squad uses one of your ${squadCap()} squad places for the full agreement. There is no salary or funding cost.</p></section><div class="staff-grid">${terms().map(w=>`<div class="staff-card"><h3>${w} weeks</h3><p>Ends ${esc(endLabel(w))}</p><button class="btn secondary" data-agreement-callup-safe="${esc(a.id)}" data-agreement-weeks="${w}">SELECT ${w} WEEKS</button></div>`).join('')}</div>`);
    document.querySelectorAll('[data-agreement-callup-safe]').forEach(b=>b.addEventListener('click',()=>{if(finaliseSquadAgreementCallUp(b.dataset.agreementCallupSafe,Number(b.dataset.agreementWeeks))){try{$('managementProfile')?.close()}catch(_){};try{if(typeof renderView==='function')renderView(currentView)}catch(_){}}}));
   }
  }catch(err){console.error('[Athletics Manager] fallback squad agreement chooser failed',err);try{toast('Could not open squad agreement options')}catch(_){}}
 };
 requestAnimationFrame(launch);
}

function openChooser(id){if(showSameDialogChooser(id))return;fallbackChooser(id)}

try{openSquadAgreementChooser=openChooser}catch(_){}
try{callUpToSquad=openChooser}catch(_){}

window.__athleticsSquadCallupFlowV2={version:2,open:openChooser};
})();