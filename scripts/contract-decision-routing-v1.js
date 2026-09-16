/* Athletics Manager — Contract Decision Routing V1
   Hard isolation for athlete programme contract decisions. These messages must
   never fall through to the legacy staff or appointment-contract render paths. */
(function(){
'use strict';
if(window.__amContractDecisionRoutingV1)return;window.__amContractDecisionRoutingV1=1;
if(typeof document==='undefined')return;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const CONTRACT_SUBJECT=/^(?:URGENT\s*[—–-]\s*)?Contract decision:\s*/i;
function currentMail(){return (s?.emails||[]).find(m=>String(m?.id||'')===String(typeof openMail!=='undefined'?openMail:''))||null}
function isAthleteContractDecision(m){
 if(!m)return false;
 if(String(m.type||'').toLowerCase()!=='contract')return false;
 const subject=String(m.subject||'');
 const body=String(m.body||'');
 const kind=String(m?.programmeAction?.kind||'').toLowerCase();
 return m.contractExpiryDecision===true||kind==='athlete-contract-expiry'||CONTRACT_SUBJECT.test(subject)||/Finance\s*[→>-]+\s*Contracts/i.test(body)
}
function athleteFor(m){
 const taggedId=m?.programmeAction?.athleteId;
 if(taggedId!=null){const tagged=(s?.athletes||[]).find(a=>String(a?.id)===String(taggedId));if(tagged)return tagged}
 const name=String(m?.subject||'').replace(CONTRACT_SUBJECT,'').trim();
 if(name){const exact=(s?.athletes||[]).find(a=>String(a?.name||'').trim()===name);if(exact)return exact}
 const p=window.AMProgrammeEconomy?.state?.();
 const active=Object.values(p?.athleteContracts||{}).filter(c=>c&&c.state==='active');
 if(active.length===1)return (s?.athletes||[]).find(a=>String(a.id)===String(active[0].athleteId))||null;
 return null
}
function financeActive(){return !!document.getElementById('finance')?.classList.contains('on')}
function withLegacyAppointmentRouteBypass(fn){
 const original=window.appointmentPending;
 const canRestore=typeof original==='function';
 if(canRestore)window.appointmentPending=()=>false;
 try{return fn()}finally{if(canRestore)window.appointmentPending=original}
}
function routeFinanceContractsOnce(){
 return withLegacyAppointmentRouteBypass(()=>{
  if(typeof view==='function')view('finance');
  window.AMProgrammeEconomy?.openFinanceView?.('contracts');
  return financeActive()
 })
}
function activateFinanceContracts(){
 let routed=false;
 try{routed=routeFinanceContractsOnce()}catch(err){console.error('[Athletics Manager] Contract handoff failed',err)}
 if(!routed){
  requestAnimationFrame(()=>{
   try{routeFinanceContractsOnce()}catch(err){console.error('[Athletics Manager] Contract handoff retry failed',err)}
  })
 }
 return financeActive()
}
function renderContract(m){
 const reader=document.getElementById('reader');if(!reader)return false;
 const athlete=athleteFor(m),name=athlete?.name||String(m.subject||'').replace(CONTRACT_SUBJECT,'').trim()||'Athlete';
 if(m.unread)m.unread=false;
 try{save()}catch(_){}
 try{syncMailBadge()}catch(_){}
 reader.innerHTML=`<div class="reader-head"><button class="amv2-mobile-back" type="button" data-reader-back>← INBOX</button><div class="amv2-sender"><span class="amv2-avatar big">PD</span><span><b>${esc(String(m.sender||'Performance Team').split('•')[0].trim())}</b><small>Performance Team</small></span></div><span class="amv2-category">CONTRACT</span><small>${esc(m.sender||'Performance Team')} • Year ${Number(m.year)||1} Week ${Number(m.week)||1}</small><h2>${esc(m.subject||`Contract decision: ${name}`)}</h2><div class="amv2-reader-tags"><span class="important">DECISION REQUIRED</span></div></div><div class="reader-body amv2-reader-body"><p>${esc(m.body||`${name}'s national programme agreement is approaching its end date.`)}</p><div class="sdv3-mail"><div><small>PROGRAMME AGREEMENT</small><strong>${esc(name)}</strong><span>Review the current agreement and renewal options in Finance → Contracts.</span></div></div></div><div class="reader-actions amv2-sticky-actions"><button class="btn primary" type="button" data-open-athlete-contracts>OPEN CONTRACTS</button></div>`;
 reader.querySelector('[data-reader-back]')?.addEventListener('click',()=>document.body.classList.remove('amv2-reading'));
 reader.querySelector('[data-open-athlete-contracts]')?.addEventListener('click',activateFinanceContracts);
 requestAnimationFrame(()=>{try{window.__athleticsInboxProduction?.syncAttentionBadge?.()}catch(_){}});
 return true
}
function install(){
 const api=window.__athleticsInboxSingleRender;
 if(!api?.render)return false;
 const currentGlobal=(()=>{try{return typeof drawReader==='function'?drawReader:null}catch(_){return null}})();
 if(api.render?.__amContractDecisionRoutingApiV1&&currentGlobal?.__amContractDecisionRoutingV1){
  window.AMContractDecisionRouting??={version:1,isAthleteContractDecision,athleteFor,render:renderContract,openContracts:activateFinanceContracts};return true
 }
 /* Keep two independent bases. The API base must always be the original Single-Pass
    Reader. The global base may include presentation wrappers such as character voices.
    Never make the API wrapper fall through to the global reader: Production Inbox's
    canonical reader calls api.render(), which would otherwise recurse indefinitely. */
 const baseApi=api.render.bind(api);
 const baseGlobal=(currentGlobal||api.render).bind(window);
 const apiWrapped=function(){const m=currentMail();if(isAthleteContractDecision(m))return renderContract(m);return baseApi()};
 const globalWrapped=function(){const m=currentMail();if(isAthleteContractDecision(m))return renderContract(m);return baseGlobal()};
 Object.defineProperty(apiWrapped,'__amContractDecisionRoutingApiV1',{value:true});
 Object.defineProperty(globalWrapped,'__amContractDecisionRoutingV1',{value:true});
 api.render=apiWrapped;
 try{drawReader=globalWrapped}catch(_){}
 window.drawReader=globalWrapped;
 window.AMContractDecisionRouting={version:1,isAthleteContractDecision,athleteFor,render:renderContract,openContracts:activateFinanceContracts,debug:()=>({apiGuard:!!api.render?.__amContractDecisionRoutingApiV1,globalGuard:!!window.drawReader?.__amContractDecisionRoutingV1})};
 return true
}
if(!install())window.addEventListener('load',install,{once:true});
})();
