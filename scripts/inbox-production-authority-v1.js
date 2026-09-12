/* Athletics Manager — Production Inbox Authority V1
   Canonical runtime authority for the production communications UI.
   Inbox V3 owns the list, Single-Pass Reader owns message rendering, and the
   Decision Core/Finalizer own gameplay decisions. Legacy inbox renderers are
   not used as production fallbacks. */
(function(){
'use strict';
if(window.__amInboxProductionAuthorityV1)return;window.__amInboxProductionAuthorityV1=1;

const $=id=>document.getElementById(id);
const core=()=>window.__athleticsInboxDecisionCore;
const state=()=>{const x=s.inboxDecisionSystem??={};x.emailMeta??={};x.archive??=[];x.actions??={};x.ui??={};return x};
function saveSafe(){try{save()}catch(_){}}
function activeActions(){try{return core()?.getUnresolvedActions?.()||[]}catch(_){return[]}}
function category(m){try{return String(mailCategory(m)||'info').toLowerCase()}catch(_){return String(m?.type||'info').toLowerCase()}}
function threadKey(m,cat){
 if(m?.eventId&&['selection','competition','medical'].includes(cat))return `event:${m.eventId}`;
 if(cat==='medical'){
  const subject=String(m?.subject||'').toLowerCase();
  const athlete=(s.athletes||[]).find(a=>subject.includes(String(a?.name||'').toLowerCase()));
  if(athlete)return `medical:${athlete.id}`;
 }
 if(cat==='contract'||cat==='contracts')return `contract:${String(m?.subject||'').replace(/^(contract (decision|renewed|expired):?)/i,'').trim().toLowerCase()}`;
 return null;
}
function inferPriority(m){const text=`${m?.subject||''} ${m?.body||''}`;return /urgent|deadline|injury|contract|olympic|championship/i.test(text)?'important':'normal'}
function setValue(target,key,value){if(target[key]===value)return false;target[key]=value;return true}
function normalizeMeta(){
 const x=state(),acts=activeActions(),byEmail=new Map(acts.filter(a=>a?.emailId).map(a=>[String(a.emailId),a]));let changed=false;
 for(const m of [...(s.emails||[]),...(x.archive||[])]){
  if(!m?.id)continue;const z=x.emailMeta[m.id]??={emailId:m.id};const cat=category(m),a=byEmail.get(String(m.id));
  if(!z.category){z.category=cat;changed=true}
  if(!z.threadKey){const key=threadKey(m,cat);if(key){z.threadKey=key;changed=true}}
  if(!z.priority){z.priority=a?.priority||inferPriority(m);changed=true}
  if(a){
   changed=setValue(z,'actionId',a.actionId)||changed;
   changed=setValue(z,'interactionType',a.blocks?'progress_blocker':'decision_required')||changed;
   changed=setValue(z,'resolutionState','awaiting_response')||changed;
   changed=setValue(z,'responseRequired',true)||changed;
   changed=setValue(z,'blocksProgress',!!a.blocks)||changed;
   changed=setValue(z,'deadlineWeek',Number(a.deadline))||changed;
   changed=setValue(z,'sourceSystem',a.source)||changed;
   changed=setValue(z,'entityId',a.entityId)||changed;
   changed=setValue(z,'destination',a.destination)||changed;
  }else{
   const completed=z.resolution==='completed'||m.selectionSubmitted===true;
   const noResponse=z.resolution==='no_response_required';
   if(completed){
    changed=setValue(z,'resolutionState','completed')||changed;
    changed=setValue(z,'responseRequired',false)||changed;
    changed=setValue(z,'blocksProgress',false)||changed;
   }else if(noResponse){
    changed=setValue(z,'resolutionState','no_response_required')||changed;
    changed=setValue(z,'responseRequired',false)||changed;
    changed=setValue(z,'blocksProgress',false)||changed;
   }else{
    if(!z.interactionType){z.interactionType=m.type==='selection'?'decision_required':'information';changed=true}
    if(!z.resolutionState){z.resolutionState=m.type==='selection'?'awaiting_response':'no_response_required';changed=true}
   }
  }
  changed=setValue(z,'read',m.unread?'unread':'read')||changed;
 }
 if(changed)saveSafe();return changed
}
function importantCount(acts=activeActions()){
 const byEmail=new Map(acts.filter(a=>a?.emailId).map(a=>[String(a.emailId),a]));
 return (s?.emails||[]).filter(m=>{
  const a=byEmail.get(String(m.id)),z=state().emailMeta?.[m.id],p=a?.blocks?'critical':a?.priority||z?.priority||inferPriority(m);
  return p==='critical'||p==='important'
 }).length
}
function attentionSnapshot(){
 const acts=activeActions(),unread=(s?.emails||[]).filter(m=>m?.unread===true),keys=new Set();
 unread.forEach(m=>keys.add(`mail:${m.id}`));
 acts.forEach(a=>keys.add(a?.emailId?`mail:${a.emailId}`:`action:${a?.actionId||a?.entityId||Math.random()}`));
 return{count:keys.size,unread:unread.length,actions:acts.length,important:importantCount(acts)}
}
function removeLegacyIndicators(){
 document.querySelectorAll('#railNav [data-view="inbox"] .am-action-badge,#bottomNav [data-view="inbox"] .am-action-badge').forEach(x=>x.remove());
 const root=$('inbox');root?.querySelectorAll(':scope > .am-inbox-summary').forEach(x=>x.remove())
}
function bottomBadge(){
 const button=document.querySelector('#bottomNav [data-view="inbox"]');if(!button)return null;
 let badge=button.querySelector('.am-inbox-attention-badge');if(!badge){badge=document.createElement('span');badge.className='badge am-inbox-attention-badge hidden';button.appendChild(badge)}return badge
}
function setBadge(badge,snap){if(!badge)return;const text=snap.count?String(snap.count):'';if(badge.textContent!==text)badge.textContent=text;badge.classList.toggle('hidden',!snap.count);badge.hidden=!snap.count;badge.title=snap.count?`${snap.count} inbox item${snap.count===1?'':'s'} need attention · ${snap.unread} unread · ${snap.actions} action${snap.actions===1?'':'s'}`:'No inbox items need attention'}
function syncVisibleCounters(snap=attentionSnapshot()){
 const root=$('inbox');if(!root)return;
 root.querySelector('[data-v3-count="actions"] b')?.replaceChildren(String(snap.actions));
 root.querySelector('[data-v3-count="unread"] b')?.replaceChildren(String(snap.unread));
 root.querySelector('[data-v3-count="important"] b')?.replaceChildren(String(snap.important));
 const actionTab=root.querySelector('[data-v3-filter="actions"] b');if(actionTab)actionTab.textContent=String(snap.actions)
}
function syncAttentionBadge(){
 removeLegacyIndicators();const snap=attentionSnapshot();setBadge($('mailBadge'),snap);setBadge(bottomBadge(),snap);syncVisibleCounters(snap);return snap.count
}
const syncUnreadBadge=syncAttentionBadge;
function archiveMail(id){
 const actions=activeActions();
 if(actions.some(a=>String(a.emailId||'')===String(id))){try{toast('Complete this decision before archiving')}catch(_){}return false}
 const i=(s.emails||[]).findIndex(m=>String(m.id)===String(id));if(i<0)return false;
 const [m]=s.emails.splice(i,1),x=state();if(!x.archive.some(a=>String(a.id)===String(id)))x.archive.push({...m,archivedAt:Number(s?.game?.careerWeek||s?.game?.week||1)});
 const z=x.emailMeta?.[m.id];if(z){z.archived=true;z.archivedAt=Number(s?.game?.careerWeek||s?.game?.week||1)}
 openMail=(s.emails||[]).at?.(-1)?.id||null;saveSafe();syncAttentionBadge();if(typeof currentView!=='undefined'&&currentView==='inbox')canonicalDrawInbox();return true
}
function renderFailure(err){
 console.error('[Athletics Manager] Canonical Inbox failed',err);const root=$('inbox');if(!root)return;
 root.innerHTML='<div class="am-cutover-error" role="alert"><div><small>COMMUNICATIONS RECOVERY</small><h2>Inbox unavailable</h2><p>The production inbox could not be displayed. Your career data has not been changed.</p><div class="am-cutover-error-actions"><button type="button" class="btn secondary" data-inbox-retry>RETRY</button><button type="button" class="btn ghost" data-inbox-home>RETURN HOME</button></div></div></div>';
 root.querySelector('[data-inbox-retry]')?.addEventListener('click',canonicalDrawInbox);root.querySelector('[data-inbox-home]')?.addEventListener('click',()=>view('home'))
}
function canonicalDrawReader(){const reader=window.__athleticsInboxSingleRender;if(!reader?.render)throw new Error('Single-Pass Reader is unavailable');const out=reader.render();requestAnimationFrame(syncAttentionBadge);return out}
function canonicalDrawInbox(){
 normalizeMeta();const inbox=window.__athleticsInboxV3;if(!inbox?.render){renderFailure(new Error('Inbox V3 is unavailable'));return false}
 try{const out=inbox.render();requestAnimationFrame(syncAttentionBadge);return out}catch(err){renderFailure(err);return false}
}

// Canonical global entry points used by the rest of the game.
try{drawReader=canonicalDrawReader}catch(_){}
try{drawInbox=canonicalDrawInbox}catch(_){}
try{syncMailBadge=syncAttentionBadge}catch(_){}

const api={version:1,render:canonicalDrawInbox,renderReader:canonicalDrawReader,archiveMail,normalizeMeta,syncAttentionBadge,syncUnreadBadge,attentionSnapshot,debug:()=>({list:'inbox-v3',reader:'inbox-single-render-v1',decisions:window.__athleticsDecisionFinalizer?'decision-system-finalize-v1':'inbox-decision-core-v1',...attentionSnapshot(),archive:state().archive.length})};
window.__athleticsInboxProduction=api;
if(window.__athleticsInboxV3)window.__athleticsInboxV3.archiveMail=archiveMail;
// Narrow compatibility bridge for the existing Single-Pass Reader archive button.
// This is not a renderer and can be removed when that reader references the production API directly.
window.__athleticsInboxAAA={version:'compat-only',archiveMail};

let cleanupQueued=false;const cleanup=()=>{if(cleanupQueued)return;cleanupQueued=true;requestAnimationFrame(()=>{cleanupQueued=false;syncAttentionBadge()})};
const observer=new MutationObserver(cleanup);for(const node of [$('railNav'),$('bottomNav'),$('inbox')].filter(Boolean))observer.observe(node,{childList:true,subtree:true});
normalizeMeta();syncAttentionBadge();
if(typeof currentView!=='undefined'&&currentView==='inbox')requestAnimationFrame(canonicalDrawInbox);
})();
