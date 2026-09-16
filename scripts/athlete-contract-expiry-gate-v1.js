/* Athletics Manager — Athlete Contract Expiry Gate V1
   Prevents funded athletes silently leaving the national squad at contract expiry.
   Two weeks from expiry becomes a mandatory manager decision: renew or allow expiry. */
(function(){
'use strict';
if(window.__amAthleteContractExpiryGateV1)return;window.__amAthleteContractExpiryGateV1=1;

const VERSION=1;
const DECISION_WEEKS=2;
const $=id=>document.getElementById(id);
const safe=(fn,fallback)=>{try{const v=fn();return v==null?fallback:v}catch(_){return fallback}};
const cw=()=>Number(safe(()=>careerNow(),s?.game?.careerWeek||s?.game?.week||1));
const week=()=>Number(s?.game?.week||1);
const nation=()=>safe(()=>managedNation(),s?.managedNation||'');
let api=null;
let baseDecisionActions=null;
let financeObserver=null;
let decorateQueued=false;
const mailCreation=new Set();

function state(){return safe(()=>api?.state?.(),null)}
function athlete(id){return safe(()=>s?.athletes?.find(a=>String(a.id)===String(id)),null)}
function left(c){return Math.max(0,Number(c?.endCareerWeek||0)-cw())}
function activeContractFor(id){const p=state(),c=p?.athleteContracts?.[id];return c?.state==='active'?c:null}
function actionId(c){return `economy:athlete-expiry:${c?.id||c?.athleteId||'contract'}`}
function pendingRows(){
 const p=state();if(!p)return[];
 return Object.values(p.athleteContracts||{}).map(c=>({c,a:athlete(c.athleteId)})).filter(({c,a})=>c?.state==='active'&&a&&!a.retired&&String(a.nation)===String(nation())&&left(c)>0&&left(c)<=DECISION_WEEKS&&c.expiryDecision!=='allow');
}
function existingMail(id){return (s?.emails||[]).find(m=>String(m?.programmeAction?.actionId||'')===String(id))||null}
function saveNow(){safe(()=>save(),null)}
function urgentMail(a,c){
 const id=actionId(c),found=existingMail(id);if(found){c.expiryActionMailId=found.id;return found}
 /* newMail() refreshes the Inbox badge synchronously. That refresh asks the decision
    system for actions again, so guard this action until its first mail has been tagged. */
 if(mailCreation.has(id))return null;
 mailCreation.add(id);c.urgentWarned=true;
 try{
  const remaining=left(c),before=new Set((s?.emails||[]).map(m=>String(m.id)));
  safe(()=>newMail(sender('performance'),`URGENT — Contract decision: ${a.name}`,`${a.name}'s ${c.status||'national programme'} agreement has ${remaining} week${remaining===1?'':'s'} remaining and will expire automatically if it is not renewed. You must now either review and renew the terms or explicitly allow the agreement to expire. The career cannot advance until you make that decision.`,'contract'),null);
  const m=(s?.emails||[]).find(x=>!before.has(String(x.id)))||null;
  if(m){
   m.programmeAction={actionId:id,tab:'contracts',priority:'critical',deadlineCareerWeek:cw(),athleteId:a.id,contractId:c.id,kind:'athlete-contract-expiry'};
   m.contractExpiryDecision=true;
   c.expiryActionMailId=m.id;
  }
  saveNow();return m;
 }finally{mailCreation.delete(id)}
}
function contractActions(){
 return pendingRows().map(({a,c})=>{
  const m=urgentMail(a,c),remaining=left(c);
  return{actionId:actionId(c),emailId:m?.id||c.expiryActionMailId||null,title:`Contract decision — ${a.name}`,reason:`${remaining} week${remaining===1?'':'s'} remain. Renew the programme agreement or explicitly allow it to expire.`,source:'programme-economy',entityId:a.id,deadline:week(),priority:'critical',blocks:true,destination:'finance',tab:'contracts'};
 });
}
function decisionActions(){
 const base=safe(()=>baseDecisionActions?.(),[])||[],extra=contractActions();
 for(const a of extra)if(!base.some(x=>String(x.actionId)===String(a.actionId)))base.push(a);
 return base;
}
function markMailDecision(c,text){
 const m=existingMail(actionId(c))||((s?.emails||[]).find(x=>String(x.id)===String(c.expiryActionMailId))||null);if(!m)return;
 if(!m.contractExpiryResolution)m.body=`${m.body||''}\n\nDecision recorded: ${text}`;
 m.contractExpiryResolution=text;
}
function refreshDecisionUI(){
 saveNow();
 safe(()=>window.__athleticsInboxDecisionCore?.getUnresolvedActions?.(),null);
 if(typeof currentView!=='undefined'&&currentView==='finance')safe(()=>api?.renderFinance?.(),null);
 setTimeout(()=>{safe(()=>render(),null);decorateFinance()},0);
}
async function allowExpiry(id){
 const a=athlete(id),c=activeContractFor(id);if(!a||!c||left(c)<=0)return false;
 const remaining=left(c);
 const spec={title:`Allow ${a.name}'s contract to expire?`,body:`The funded national programme agreement will end automatically in ${remaining} week${remaining===1?'':'s'}. ${a.name} will then leave the national squad and return to club-led competition.`,meta:'You can still renew before the expiry date. This decision removes the progression block so the career can continue.',confirmLabel:'ALLOW EXPIRY'};
 const ok=window.AMUX?.confirm?await window.AMUX.confirm(spec):safe(()=>window.confirm(`${spec.title}\n\n${spec.body}`),false);if(!ok)return false;
 c.expiryDecision='allow';c.expiryDecisionCareerWeek=cw();markMailDecision(c,'Allow agreement to expire');
 safe(()=>rememberAthlete(a,'Programme contract',`Manager confirmed the current agreement may expire at the end of career week ${Number(c.endCareerWeek)||'—'}.`),null);
 safe(()=>toast(`${a.name}'s contract will be allowed to expire`),null);refreshDecisionUI();return true;
}
function cleanupRow(row){
 if(!row)return;row.classList.remove('am-contract-expiry-urgent');row.querySelector('.am-contract-expiry-note')?.remove();
 const actions=row.querySelector('.am-contract-expiry-actions');if(!actions)return;
 const renew=actions.querySelector('[data-ar]');actions.querySelector('[data-am-contract-expire]')?.remove();if(renew)actions.replaceWith(renew);else actions.remove();
}
function decorateFinance(){
 if(typeof currentView!=='undefined'&&currentView!=='finance')return;
 const root=$('finance');if(!root)return;
 root.querySelectorAll('.pe-contracts [data-ar]').forEach(renew=>{
  const id=renew.dataset.ar,row=renew.closest('.pe-contracts>div'),c=activeContractFor(id),a=athlete(id);if(!row)return;
  if(!c||!a){cleanupRow(row);return}
  const remaining=left(c),urgent=remaining>0&&remaining<=DECISION_WEEKS;
  if(!urgent){cleanupRow(row);return}
  row.classList.toggle('am-contract-expiry-urgent',c.expiryDecision!=='allow');
  const info=row.firstElementChild,small=info?.querySelector('small');let note=row.querySelector('.am-contract-expiry-note');
  if(small&&!note){note=document.createElement('span');note.className='am-contract-expiry-note';small.insertAdjacentElement('afterend',note)}
  const noteLabel=c.expiryDecision==='allow'?'EXPIRY CONFIRMED':'DECISION REQUIRED';if(note&&note.textContent!==noteLabel)note.textContent=noteLabel;
  let actions=row.querySelector('.am-contract-expiry-actions');
  if(!actions){actions=document.createElement('div');actions.className='am-contract-expiry-actions';renew.replaceWith(actions);actions.appendChild(renew)}
  let expiry=actions.querySelector('[data-am-contract-expire]');
  if(!expiry){expiry=document.createElement('button');expiry.type='button';expiry.className='btn ghost';expiry.dataset.amContractExpire=id;actions.appendChild(expiry)}
  const confirmed=c.expiryDecision==='allow';if(expiry.disabled!==confirmed)expiry.disabled=confirmed;
  const label=confirmed?'EXPIRY CONFIRMED':'ALLOW EXPIRY';if(expiry.textContent!==label)expiry.textContent=label;
 });
}
function styles(){
 if($('amAthleteContractExpiryGateStyle'))return;const style=document.createElement('style');style.id='amAthleteContractExpiryGateStyle';style.textContent=`
 .pe-contracts>div.am-contract-expiry-urgent{background:linear-gradient(90deg,rgba(239,64,87,.08),transparent 46%);box-shadow:inset 3px 0 #ef4057}.am-contract-expiry-note{display:inline-flex;margin-top:5px;padding:2px 6px;border:1px solid rgba(239,64,87,.35);border-radius:999px;color:#ff91a0;font-size:7px;font-weight:950;letter-spacing:.07em}.am-contract-expiry-actions{display:flex;align-items:center;justify-content:flex-end;gap:5px;flex-wrap:wrap}.am-contract-expiry-actions .btn{min-height:32px;padding:0 8px;font-size:7px}.am-contract-expiry-actions [data-am-contract-expire]:not(:disabled){border-color:rgba(239,64,87,.36);color:#ff9aa7}.am-contract-expiry-actions [data-am-contract-expire]:disabled{opacity:.7;color:#86aa9a}
 @media(max-width:760px){.am-contract-expiry-actions{display:grid;grid-template-columns:1fr}.am-contract-expiry-actions .btn{width:100%}}
 `;document.head.appendChild(style)
}
/* Finance is observed for re-renders. Keep decoration frame-bounded and idempotent so
   our own DOM writes cannot schedule an unbounded MutationObserver microtask loop. */
function queueDecorate(){if(decorateQueued)return;decorateQueued=true;requestAnimationFrame(()=>{decorateQueued=false;decorateFinance()})}
function observeFinance(){const root=$('finance');if(!root||financeObserver)return;financeObserver=new MutationObserver(queueDecorate);financeObserver.observe(root,{childList:true,subtree:true})}
document.addEventListener('click',event=>{const b=event.target.closest?.('[data-am-contract-expire]');if(!b||b.disabled)return;event.preventDefault();event.stopPropagation();allowExpiry(b.dataset.amContractExpire)},true);

function install(){
 api=window.AMProgrammeEconomy;if(!api?.decisionActions||!api?.state){setTimeout(install,50);return}
 if(api.__athleteContractExpiryGateV1)return;api.__athleteContractExpiryGateV1=1;
 baseDecisionActions=api.decisionActions.bind(api);api.decisionActions=decisionActions;
 styles();observeFinance();contractActions();queueDecorate();
 setTimeout(()=>{safe(()=>window.__athleticsInboxDecisionCore?.getUnresolvedActions?.(),null);safe(()=>render(),null);queueDecorate()},0);
}
install();
window.AMAthleteContractExpiryGate={version:VERSION,decisionWeeks:DECISION_WEEKS,pending:pendingRows,allowExpiry,decorate:decorateFinance};
})();
