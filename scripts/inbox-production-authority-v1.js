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
function senderName(m){return String(m?.sender||'').split('•')[0].trim()}
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
function normalizeMeta(){
 const x=state(),acts=activeActions(),byEmail=new Map(acts.filter(a=>a?.emailId).map(a=>[String(a.emailId),a]));let changed=false;
 for(const m of [...(s.emails||[]),...(x.archive||[])]){
  if(!m?.id)continue;const z=x.emailMeta[m.id]??={emailId:m.id};const cat=category(m),a=byEmail.get(String(m.id));
  if(!z.category){z.category=cat;changed=true}
  if(!z.threadKey){const key=threadKey(m,cat);if(key){z.threadKey=key;changed=true}}
  if(!z.priority){z.priority=a?.priority||inferPriority(m);changed=true}
  if(a){
   if(z.actionId!==a.actionId){z.actionId=a.actionId;changed=true}
   if(z.interactionType!==(a.blocks?'progress_blocker':'decision_required')){z.interactionType=a.blocks?'progress_blocker':'decision_required';changed=true}
   if(z.resolutionState!=='awaiting_response'){z.resolutionState='awaiting_response';changed=true}
   z.responseRequired=true;z.blocksProgress=!!a.blocks;z.deadlineWeek=Number(a.deadline);z.sourceSystem=a.source;z.entityId=a.entityId;z.destination=a.destination;
  }else{
   if(!z.interactionType){z.interactionType=m.type==='selection'?'decision_required':'information';changed=true}
   if(!z.resolutionState){z.resolutionState=z.resolution==='completed'||m.selectionSubmitted?'completed':m.type==='selection'?'awaiting_response':'no_response_required';changed=true}
  }
  z.read=m.unread?'unread':'read';
 }
 if(changed)saveSafe();return changed
}
function syncUnreadBadge(){
 const badge=$('mailBadge'),unread=(s?.emails||[]).filter(m=>m?.unread===true).length;
 if(badge){badge.textContent=unread?String(unread):'';badge.classList.toggle('hidden',!unread);badge.title=unread?`${unread} unread message${unread===1?'':'s'}`:'No unread messages'}
 return unread
}
function archiveMail(id){
 const actions=activeActions();
 if(actions.some(a=>String(a.emailId||'')===String(id))){try{toast('Complete this decision before archiving')}catch(_){}return false}
 const i=(s.emails||[]).findIndex(m=>String(m.id)===String(id));if(i<0)return false;
 const [m]=s.emails.splice(i,1),x=state();if(!x.archive.some(a=>String(a.id)===String(id)))x.archive.push({...m,archivedAt:Number(s?.game?.careerWeek||s?.game?.week||1)});
 const z=x.emailMeta?.[m.id];if(z){z.archived=true;z.archivedAt=Number(s?.game?.careerWeek||s?.game?.week||1)}
 openMail=(s.emails||[]).at?.(-1)?.id||null;saveSafe();syncUnreadBadge();if(typeof currentView!=='undefined'&&currentView==='inbox')canonicalDrawInbox();return true
}
function renderFailure(err){
 console.error('[Athletics Manager] Canonical Inbox failed',err);const root=$('inbox');if(!root)return;
 root.innerHTML='<div class="am-cutover-error" role="alert"><div><small>COMMUNICATIONS RECOVERY</small><h2>Inbox unavailable</h2><p>The production inbox could not be displayed. Your career data has not been changed.</p><div class="am-cutover-error-actions"><button type="button" class="btn secondary" data-inbox-retry>RETRY</button><button type="button" class="btn ghost" data-inbox-home>RETURN HOME</button></div></div></div>';
 root.querySelector('[data-inbox-retry]')?.addEventListener('click',canonicalDrawInbox);root.querySelector('[data-inbox-home]')?.addEventListener('click',()=>view('home'))
}
function canonicalDrawReader(){const reader=window.__athleticsInboxSingleRender;if(!reader?.render)throw new Error('Single-Pass Reader is unavailable');return reader.render()}
function canonicalDrawInbox(){
 normalizeMeta();const inbox=window.__athleticsInboxV3;if(!inbox?.render){renderFailure(new Error('Inbox V3 is unavailable'));return false}
 try{const out=inbox.render();syncUnreadBadge();return out}catch(err){renderFailure(err);return false}
}

// Canonical global entry points used by the rest of the game.
try{drawReader=canonicalDrawReader}catch(_){}
try{drawInbox=canonicalDrawInbox}catch(_){}
try{syncMailBadge=syncUnreadBadge}catch(_){}

const api={version:1,render:canonicalDrawInbox,renderReader:canonicalDrawReader,archiveMail,normalizeMeta,syncUnreadBadge,debug:()=>({list:'inbox-v3',reader:'inbox-single-render-v1',decisions:window.__athleticsDecisionFinalizer?'decision-system-finalize-v1':'inbox-decision-core-v1',unread:(s?.emails||[]).filter(m=>m?.unread===true).length,actions:activeActions().length,archive:state().archive.length})};
window.__athleticsInboxProduction=api;
if(window.__athleticsInboxV3)window.__athleticsInboxV3.archiveMail=archiveMail;
// Narrow compatibility bridge for the existing Single-Pass Reader archive button.
// This is not a renderer and can be removed when that reader references the production API directly.
window.__athleticsInboxAAA={version:'compat-only',archiveMail};

normalizeMeta();syncUnreadBadge();
if(typeof currentView!=='undefined'&&currentView==='inbox')requestAnimationFrame(canonicalDrawInbox);
})();
