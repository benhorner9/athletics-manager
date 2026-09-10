/* Athletics Manager — AAA Inbox, Decision & Progression System V2 */
(function(){
'use strict';
if(window.__amInboxDecisionSystemV2)return;window.__amInboxDecisionSystemV2=1;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const cssEsc=v=>window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&');
const week=()=>Number(s?.game?.week||1);
const careerWeek=()=>Number(s?.game?.careerWeek||(((Number(s?.game?.cycleYear)||1)-1)*52+week()));
let inboxFilter=null;
let currentSelectionHint=null;
let guard=false;
let lastKnownBlockers=null;

function state(){
 if(!s)return null;
 const root=s.inboxDecisionSystem??={};
 root.version=2;root.emailMeta??={};root.actions??={};root.archive??=[];root.log??=[];root.staffDecisions??={};root.preferences??={};
 return root;
}
function log(kind,data={}){const st=state();if(!st)return;st.log.push({kind,at:Date.now(),careerWeek:careerWeek(),...data});if(st.log.length>250)st.log.splice(0,st.log.length-250)}
function safeSave(){try{if(typeof save==='function')save()}catch(err){console.error(err)}}
function labelDisc(d){try{return typeof discLabel==='function'?discLabel(d):d}catch(_){return d}}
function getBaseActions(){try{return window.__athleticsInboxDecisionCore?.getUnresolvedActions?.()||[]}catch(_){return []}}
function getMail(id){return (s?.emails||[]).find(m=>String(m.id)===String(id))||null}
function mailMeta(m){
 const st=state(),meta=st.emailMeta[m.id]??={emailId:m.id};
 meta.read=m.unread?'unread':'read';
 if(!meta.interactionType){
  if(m.id==='appointment-contract'||m.type==='selection')meta.interactionType='decision_required';
  else if(m.type==='scout'||m.type==='scouting')meta.interactionType='optional_action';
  else if(m.type==='training')meta.interactionType='recommendation';
  else meta.interactionType='information';
 }
 meta.priority??=(m.type==='selection'?'important':'normal');
 if(!meta.resolution)meta.resolution=meta.interactionType==='decision_required'?'awaiting_response':'no_response_required';
 return meta;
}
function staffMail(c){return [...(s?.emails||[])].reverse().find(m=>m.subject===`Contract decision: ${c.name}`)||null}
function staffActions(){
 const out=[];try{if(typeof ensureCoaches==='function')ensureCoaches()}catch(_){}
 const now=typeof coachWeek==='function'?Number(coachWeek()):careerWeek();
 for(const [role,c] of Object.entries(s?.coaches||{})){
  if(!c)continue;const left=Number(c.until)-now;if(left>4||left<=0)continue;
  const id=`staff:contract:${role}:${c.id}:${c.until}`;if(state().staffDecisions[id]?.resolution==='declined')continue;
  const m=staffMail(c),blocks=left<=1;
  const a={actionId:id,emailId:m?.id||null,title:`Contract Decision – ${c.name}`,reason:`${c.name}'s ${typeof STAFF_DEF!=='undefined'&&STAFF_DEF[role]?STAFF_DEF[role].name:'staff'} contract has ${left} week${left===1?'':'s'} remaining.`,source:'staff',entityId:role,deadlineCareerWeek:Number(c.until),deadline:week()+left,priority:blocks?'critical':left<=2?'important':'normal',blocks,destination:'staff',responses:['renew','release_at_expiry']};
  out.push(a);if(m){const z=mailMeta(m);z.interactionType='decision_required';z.actionId=id;z.priority=a.priority;z.deadline=a.deadline;z.blocks=blocks;z.resolution='awaiting_response'}
  const existed=state().actions[id];state().actions[id]={...(existed||{}),...a,resolution:'awaiting_response'};if(!existed)log('staff_action_created',{actionId:id,role});
 }
 return out;
}
function systemActions(){
 const out=[];try{const c=careerState();if(c?.pendingReview)out.push({actionId:`career-review:${c.cycleNumber||1}:${c.careerYear||1}`,emailId:null,title:'Olympic Cycle Review',reason:'The federation review must be completed before the next season can begin.',source:'career_review',entityId:'cycle-review',deadline:week(),priority:'critical',blocks:true,destination:'career_review',responses:['accept_job']})}catch(_){}return out
}
function allActions(){
 const rows=[...getBaseActions(),...staffActions(),...systemActions()],seen=new Set();
 return rows.filter(a=>a&&a.actionId&&!seen.has(a.actionId)&&seen.add(a.actionId)).sort((a,b)=>Number(b.blocks)-Number(a.blocks)||(a.deadlineCareerWeek??a.deadline??9999)-(b.deadlineCareerWeek??b.deadline??9999));
}
function blockers(){return allActions().filter(a=>a.blocks)}
function dueText(a){
 if(a.source==='staff'&&Number.isFinite(a.deadlineCareerWeek)){const n=a.deadlineCareerWeek-careerWeek();return n<=1?'DUE THIS WEEK':n===2?'DUE NEXT WEEK':`DUE IN ${n} WEEKS`}
 const n=Number(a.deadline)-week();return n<=0?'DUE THIS WEEK':n===1?'DUE NEXT WEEK':Number.isFinite(n)?`DUE IN ${n} WEEKS`:'ACTION REQUIRED';
}
function actionPriority(a){return a.blocks?'critical':a.priority||'normal'}

function selectionContextFromDialog(){
 const dlg=$('amSelectionCentreV2');if(!dlg)return null;
 const title=(dlg.querySelector('h2')?.textContent||'').trim();
 if(/summit series/i.test(title)){
  try{const ss=summitSeasonState(),st=ss.selectionCentreV2??={};st.explicitNoEntry??={};return{type:'summit',title:'Summit Series',state:st,ss,discs:Object.keys(DISCIPLINES||{})}}catch(_){return null}
 }
 const e=(s?.events||[]).find(x=>x&&x.name===title)||((currentSelectionHint&&currentSelectionHint.type==='normal')?(s?.events||[]).find(x=>x.id===currentSelectionHint.id):null);
 if(!e)return null;e.selectionCentreV2??={};e.selectionCentreV2.explicitNoEntry??={};return{type:'normal',title:e.name,id:e.id,event:e,state:e.selectionCentreV2,discs:(e.disc||[]).filter(d=>d&&d!=='ALL')};
}
function activeDisc(ctx){const d=$('amSelectionCentreV2')?.querySelector('.scv2-event.on[data-scv2-disc]')?.dataset.scv2Disc;return d&&ctx?.discs.includes(d)?d:ctx?.discs[0]}
function picked(ctx,d){
 if(ctx.type==='summit')return (ctx.state.draft||[]).filter(id=>(s.athletes||[]).find(a=>a.id===id)?.disc===d);
 return ctx.state.draft?.[d]||[];
}
function explicitNoEntry(ctx,d){return !!ctx.state.explicitNoEntry?.[d]}
function decided(ctx,d){return picked(ctx,d).length>0||explicitNoEntry(ctx,d)}
function undecided(ctx){return ctx.discs.filter(d=>!decided(ctx,d))}
function setNoEntry(ctx,d,on=true){
 ctx.state.explicitNoEntry??={};ctx.state.sourceByDisc??={};
 if(on){
  if(ctx.type==='summit')ctx.state.draft=(ctx.state.draft||[]).filter(id=>(s.athletes||[]).find(a=>a.id===id)?.disc!==d);else{ctx.state.draft??={};ctx.state.draft[d]=[]}
  ctx.state.explicitNoEntry[d]=true;ctx.state.sourceByDisc[d]='no_entry';
 }else delete ctx.state.explicitNoEntry[d];
 ctx.state.updatedAt=Date.now();safeSave();log('selection_no_entry',{event:ctx.id||'summit',disc:d,value:on});
}
function clearNoEntryWhenPicked(ctx,d){if(picked(ctx,d).length&&explicitNoEntry(ctx,d)){delete ctx.state.explicitNoEntry[d];safeSave()}}
function reopenSelection(ctx,d){
 const dlg=$('amSelectionCentreV2');try{if(dlg?.open)dlg.close()}catch(_){}
 requestAnimationFrame(()=>{if(ctx.type==='summit'&&window.openSummitSelectionCentre)window.openSummitSelectionCentre();else if(ctx.event&&window.openCompetitionSelectionCentre)window.openCompetitionSelectionCentre(ctx.event);requestAnimationFrame(()=>{$('amSelectionCentreV2')?.querySelector(`[data-scv2-disc="${cssEsc(d)}"]`)?.click()})});
}
function decorateSelectionCentre(){
 const dlg=$('amSelectionCentreV2');if(!dlg||!dlg.open)return;const ctx=selectionContextFromDialog();if(!ctx)return;const d=activeDisc(ctx);if(!d)return;
 const isConfirm=!!dlg.querySelector('#scv2Submit');
 if(!isConfirm){
  const list=dlg.querySelector('.scv2-candidate-list');if(list&&!dlg.querySelector('.am-no-entry-choice')){
   const row=document.createElement('div');row.className='am-no-entry-choice';row.innerHTML=`<div><small>ENTRY DECISION</small><strong>${explicitNoEntry(ctx,d)?'NO ENTRY CONFIRMED':'Leave this event empty deliberately'}</strong><span>An empty slot is not complete until you explicitly choose No Entry.</span></div><button class="btn ${explicitNoEntry(ctx,d)?'good':'ghost'}" type="button" data-am-no-entry>${explicitNoEntry(ctx,d)?'NO ENTRY ✓':'NO ENTRY'}</button>`;
   list.parentNode.insertBefore(row,list);row.querySelector('[data-am-no-entry]').onclick=()=>{setNoEntry(ctx,d,!explicitNoEntry(ctx,d));reopenSelection(ctx,d)};
  }
  for(const b of dlg.querySelectorAll('.scv2-event[data-scv2-disc]')){const x=b.dataset.scv2Disc;if(explicitNoEntry(ctx,x)&&!picked(ctx,x).length){b.classList.add('am-no-entry');const strong=b.querySelector('strong'),status=b.querySelector('span');if(strong)strong.textContent='NO ENTRY';if(status)status.textContent='DECIDED'}}
  for(const b of dlg.querySelectorAll('[data-scv2-summary-disc]')){const x=b.dataset.scv2SummaryDisc;if(explicitNoEntry(ctx,x)&&!picked(ctx,x).length){const strong=b.querySelector('strong');if(strong)strong.textContent='NO ENTRY'}}
  const n=ctx.discs.filter(x=>decided(ctx,x)).length;
  const tb=dlg.querySelector('.scv2-toolbar strong');if(tb)tb.textContent=`${n}/${ctx.discs.length} decided`;
  const sh=dlg.querySelector('.scv2-summary-head strong');if(sh)sh.textContent=`${n}/${ctx.discs.length} events decided`;
  const ft=dlg.querySelector('.scv2-foot strong');if(ft)ft.textContent=`${n}/${ctx.discs.length} Decided`;
  for(const x of dlg.querySelectorAll('.scv2-summary-alerts button')){for(const dd of ctx.discs)if(explicitNoEntry(ctx,dd)&&String(x.textContent).includes(labelDisc(dd))&&/no athlete selected/i.test(x.textContent))x.remove()}
  const toolbar=dlg.querySelector('.scv2-toolbar-actions');if(toolbar&&!dlg.querySelector('[data-am-decline-event]')){const btn=document.createElement('button');btn.type='button';btn.className='btn ghost';btn.dataset.amDeclineEvent='1';btn.textContent=ctx.type==='summit'?'DO NOT ENTER SERIES':'DO NOT ENTER COMPETITION';btn.onclick=()=>confirmDecline(ctx);toolbar.prepend(btn)}
 }else{
  const count=ctx.discs.filter(x=>decided(ctx,x)).length;const stats=dlg.querySelector('.scv2-confirm-stats > div:first-child strong');if(stats)stats.textContent=`${count}/${ctx.discs.length}`;
  const no=ctx.discs.filter(x=>explicitNoEntry(ctx,x)&&!picked(ctx,x).length);if(no.length&&!dlg.querySelector('.am-confirm-no-entry')){const box=document.createElement('div');box.className='am-confirm-no-entry';box.innerHTML=`<small>EXPLICIT NO ENTRY</small><strong>${no.map(labelDisc).join(' · ')}</strong>`;dlg.querySelector('.scv2-confirm-notes')?.appendChild(box)}
 }
}

function confirmBox(){let d=$('amDecisionConfirmV2');if(d)return d;d=document.createElement('dialog');d.id='amDecisionConfirmV2';d.className='am-confirm-dialog';document.body.appendChild(d);return d}
function ask(title,copy,confirmLabel,onConfirm){const d=confirmBox();d.innerHTML=`<div class="am-confirm-card"><small>CONFIRM DECISION</small><h2>${esc(title)}</h2><p>${esc(copy)}</p><div><button class="btn ghost" data-cancel>CANCEL</button><button class="btn primary" data-confirm>${esc(confirmLabel)}</button></div></div>`;d.querySelector('[data-cancel]').onclick=()=>d.close();d.querySelector('[data-confirm]').onclick=()=>{d.querySelector('[data-confirm]').disabled=true;d.close();onConfirm()};if(!d.open)d.showModal()}
function markSelectionMail(ctx,label){
 const m=ctx.type==='summit'?[...(s.emails||[])].reverse().find(x=>x.summitRegistration):[...(s.emails||[])].reverse().find(x=>x.type==='selection'&&x.eventId===ctx.id&&!x.summitRegistration);if(!m)return;
 m.selectionSubmitted=true;m.selectionDeclined=true;m.selectionSubmittedSeason=s.game.season;m.selectionSubmittedWeek=week();m.selectionSubmittedLabel=label;m.selectionSubmittedSnapshot=[];m.selectionSubmittedSource='player';m.unread=false;
 const z=mailMeta(m);z.resolution='completed';z.blocks=false;z.decision='declined';z.completedWeek=week();openMail=m.id;
}
function declineSelection(ctx){
 if(ctx.type==='summit'){
  ctx.state.draft=[];ctx.state.explicitNoEntry=Object.fromEntries(ctx.discs.map(d=>[d,true]));ctx.state.status='submitted';ctx.state.submitted=[];ctx.state.submittedAt=Date.now();ctx.state.locked=true;ctx.ss.seriesEntries=[];ctx.ss.registrationLocked=true;ctx.ss.selectionDeclined=true;
  try{for(const m of summitMeetings())m.entries=[]}catch(_){}
  markSelectionMail(ctx,'Summit Series entry declined');
 }else{
  ctx.state.draft??={};ctx.event.entries??={};ctx.state.explicitNoEntry??={};for(const d of ctx.discs){ctx.state.draft[d]=[];ctx.event.entries[d]=[];ctx.state.explicitNoEntry[d]=true;ctx.state.sourceByDisc??={};ctx.state.sourceByDisc[d]='no_entry'}
  ctx.state.status='submitted';ctx.state.submitted={};ctx.state.submittedAt=Date.now();ctx.state.locked=true;ctx.event.decision=true;ctx.event.selectionDeclined=true;ctx.event.selectionDeclinedWeek=week();markSelectionMail(ctx,'Competition entry declined');
 }
 safeSave();log('selection_declined',{event:ctx.id||'summit'});try{$('amSelectionCentreV2')?.close()}catch(_){};toast(ctx.type==='summit'?'Summit Series entry declined':'Competition entry declined');if(typeof render==='function')render();if(typeof view==='function')view('inbox');afterResolutionFlow()
}
function confirmDecline(ctx){ask(ctx.type==='summit'?'Do not enter the Summit Series?':`Do not enter ${ctx.title}?`,'No athletes will be entered. This is an explicit management decision and will resolve the selection requirement.','CONFIRM NO ENTRY',()=>declineSelection(ctx))}

function staffActionByRole(role){return staffActions().find(a=>a.entityId===role)||null}
function declineStaff(role){const a=staffActionByRole(role);if(!a)return;state().staffDecisions[a.actionId]={resolution:'declined',decision:'release_at_expiry',week:week(),careerWeek:careerWeek()};state().actions[a.actionId]={...(state().actions[a.actionId]||a),resolution:'completed',blocks:false,decision:'release_at_expiry'};const m=getMail(a.emailId);if(m){const z=mailMeta(m);z.resolution='completed';z.blocks=false;z.decision='release_at_expiry';m.unread=false}safeSave();log('staff_contract_declined',{actionId:a.actionId,role});toast('Contract will expire at the end of its term');refreshAll();afterResolutionFlow()}
function renewStaff(role){const before=staffActionByRole(role);if(!before)return;try{renewCoach(role)}catch(err){console.error(err);toast('Unable to renew contract');return}requestAnimationFrame(()=>{if(!staffActionByRole(role)){state().actions[before.actionId]={...(state().actions[before.actionId]||before),resolution:'completed',blocks:false,decision:'renewed'};const m=getMail(before.emailId);if(m){const z=mailMeta(m);z.resolution='completed';z.blocks=false;z.decision='renewed'}safeSave();log('staff_contract_renewed',{actionId:before.actionId,role});refreshAll();afterResolutionFlow()}})}

function openAction(a){
 if(a.source==='career_review'){try{openCycleReview()}catch(_){ }return}
 if(a.source==='staff'){if(typeof view==='function')view('staff');return}
 if(a.emailId){openMail=a.emailId;if(typeof view==='function')view('inbox');return}
 if(a.destination==='competition'&&window.openCompetitionSelectionCentre){window.openCompetitionSelectionCentre(a.entityId);return}
 if(a.destination==='summit'&&window.openSummitSelectionCentre){window.openSummitSelectionCentre();return}
 if(typeof view==='function')view('inbox')
}
function gate(){let d=$('amProgressionGateV2');if(d)return d;d=document.createElement('dialog');d.id='amProgressionGateV2';d.className='am-gate-v2';document.body.appendChild(d);return d}
function showGate(rows=blockers()){
 if(!rows.length)return;lastKnownBlockers=rows.length;const d=gate();d.innerHTML=`<div class="am-gate-card"><small>BEFORE YOU CONTINUE</small><h2>${rows.length} Decision${rows.length===1?'':'s'} Require Your Attention</h2><p>These are unresolved game decisions, not unread messages. Complete each one before the week can advance.</p><div class="am-gate-list">${rows.map((a,i)=>`<article><div><span>${esc(actionPriority(a).toUpperCase())} · ${esc(dueText(a))}</span><strong>${esc(a.title)}</strong><p>${esc(a.reason)}</p></div><button class="btn ${i?'secondary':'primary'}" data-open-action="${esc(a.actionId)}">${i?'REVIEW':'REVIEW FIRST DECISION'}</button></article>`).join('')}</div><div class="am-gate-foot"><span>${rows.length} remaining</span><button class="btn ghost" data-close>CLOSE</button></div></div>`;d.querySelector('[data-close]').onclick=()=>d.close();d.querySelectorAll('[data-open-action]').forEach(b=>b.onclick=()=>{const a=allActions().find(x=>x.actionId===b.dataset.openAction);if(a){d.close();openAction(a)}});if(!d.open)d.showModal();log('progression_blocked_v2',{actions:rows.map(x=>x.actionId)})
}
function syncAdvance(){const b=$('advanceTop');if(!b)return;const g=blockers();if(g.length){b.disabled=false;b.textContent=`${g.length} ACTION${g.length===1?'':'S'} REQUIRED`;b.dataset.amDecisionV2='1';b.title='Resolve required decisions before advancing';return}if(b.dataset.amDecisionV2){delete b.dataset.amDecisionV2;b.title='';try{const c=careerState(),event=currentBlocking(),pending=appointmentPending();b.disabled=!!c.finished||!!event&&!pending;b.textContent=c.finished?'CAREER COMPLETE':c.pendingReview?'CYCLE REVIEW':pending?'SIGN CONTRACT':event?(event.kind==='summit'?'ENTER SUMMIT EVENT':'ENTER EVENT'):'ADVANCE WEEK'}catch(_){b.textContent='ADVANCE WEEK';b.disabled=false}}}
function syncNav(){const n=allActions().length;for(const b of [document.querySelector('#railNav [data-view="inbox"]'),document.querySelector('#bottomNav [data-view="inbox"]')].filter(Boolean)){let x=b.querySelector('.am-action-badge-v2');if(!x){x=document.createElement('span');x.className='am-action-badge-v2';b.appendChild(x)}x.textContent=n?String(n):'';x.hidden=!n;x.setAttribute('aria-label',`${n} actions required`)}const old=document.querySelectorAll('.am-action-badge');old.forEach(x=>x.hidden=true)}

function messageState(m,a){const z=mailMeta(m);if(a)return a.blocks?'ACTION REQUIRED':`DECISION · ${dueText(a)}`;if(z.resolution==='completed')return'DECISION COMPLETE';if(m.unread)return'UNREAD';if(z.interactionType==='recommendation')return'RECOMMENDATION';if(z.interactionType==='optional_action')return'OPTIONAL';return'INFORMATION'}
function messagePriority(m,a){if(a)return actionPriority(a);return mailMeta(m).priority||'normal'}
function activeMailsForFilter(){const actions=allActions(),map=new Map(actions.filter(a=>a.emailId).map(a=>[String(a.emailId),a]));let mails=[...(s.emails||[])].reverse();if(inboxFilter==='action')mails=mails.filter(m=>map.has(String(m.id)));else if(inboxFilter==='unread')mails=mails.filter(m=>m.unread);else if(inboxFilter==='important')mails=mails.filter(m=>['important','critical'].includes(messagePriority(m,map.get(String(m.id)))));return{mails,map}}
function applyInboxFilter(){const root=$('inbox');if(!root||currentView!=='inbox')return;const {mails,map}=activeMailsForFilter();const allNodes=[...root.querySelectorAll('.mailitem[data-open]')];for(const node of allNodes){const m=getMail(node.dataset.open),show=!!m&&mails.includes(m);node.hidden=!show;if(!m)continue;node.querySelector('.am-msg-state')?.remove();const a=map.get(String(m.id)),tag=document.createElement('span');tag.className=`am-msg-state ${messagePriority(m,a)}`;tag.textContent=messageState(m,a);node.appendChild(tag);if(!node.querySelector('.am-mail-avatar')){const av=document.createElement('span');av.className='am-mail-avatar';av.textContent=String(m.sender||'AM').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();node.prepend(av)}}
 const list=root.querySelector('.mail-list');if(list){let empty=list.querySelector('.am-filter-empty');if(!mails.length){if(!empty){empty=document.createElement('div');empty.className='am-filter-empty';list.appendChild(empty)}empty.textContent=inboxFilter==='action'?'No actions require a response.':'No messages match this filter.'}else empty?.remove()}
}
function archivedView(){
 const root=$('inbox');if(!root)return;const archive=[...(state().archive||[])].reverse();const layout=root.querySelector('.inbox-layout');if(!layout)return;layout.innerHTML=`<div class="mail-list am-archive-list">${archive.length?archive.map(m=>`<div class="mailitem"><span class="am-mail-avatar">${esc(String(m.sender||'AM').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase())}</span><div class="from">${esc(m.sender)} • W${esc(m.week)}</div><div class="subject">${esc(m.subject)}</div><span class="am-msg-state">ARCHIVED</span></div>`).join(''):'<div class="am-filter-empty">No archived messages yet.</div>'}</div><section class="panel reader"><div class="panel-body muted">Archive stores resolved and informational history removed from the active inbox.</div></section>`
}
function enhanceInbox(){
 if(currentView!=='inbox'||guard)return;guard=true;try{
  const root=$('inbox');if(!root)return;const actions=allActions(),g=actions.filter(a=>a.blocks);if(!inboxFilter)inboxFilter=actions.length?'action':'all';const unread=(s.emails||[]).filter(m=>m.unread).length,important=(s.emails||[]).filter(m=>['important','critical'].includes(mailMeta(m).priority)).length;
  let top=root.querySelector('.am-inbox-v2');if(!top){top=document.createElement('div');top.className='am-inbox-v2';const layout=root.querySelector('.inbox-layout');layout?root.insertBefore(top,layout):root.prepend(top)}
  top.innerHTML=`${g.length?`<div class="am-progress-block"><strong>PROGRESSION BLOCKED</strong><span>Complete ${g.length} critical decision${g.length===1?'':'s'} before advancing the week.</span><button class="btn secondary" data-am-review-blockers>REVIEW</button></div>`:''}<div class="am-inbox-metrics"><button data-am-filter="action" class="${inboxFilter==='action'?'on':''}"><small>ACTION REQUIRED</small><strong>${actions.length}</strong></button><button data-am-filter="unread" class="${inboxFilter==='unread'?'on':''}"><small>UNREAD</small><strong>${unread}</strong></button><button data-am-filter="important" class="${inboxFilter==='important'?'on':''}"><small>IMPORTANT</small><strong>${important}</strong></button><button data-am-filter="all" class="${inboxFilter==='all'?'on':''}"><small>INBOX</small><strong>${(s.emails||[]).length}</strong></button><button data-am-filter="archive" class="${inboxFilter==='archive'?'on':''}"><small>ARCHIVE</small><strong>${state().archive.length}</strong></button><button data-am-mark-read><small>MARK ALL</small><strong>READ</strong></button></div>`;
  top.querySelector('[data-am-review-blockers]')?.addEventListener('click',()=>showGate(g));top.querySelectorAll('[data-am-filter]').forEach(b=>b.onclick=()=>{inboxFilter=b.dataset.amFilter;drawInbox()});top.querySelector('[data-am-mark-read]')?.addEventListener('click',()=>{for(const m of s.emails||[])m.unread=false;safeSave();if(typeof syncMailBadge==='function')syncMailBadge();drawInbox()});
  root.querySelector('.am-inbox-summary')?.remove();
  if(inboxFilter==='archive'){archivedView();return}
  applyInboxFilter();enhanceReader();
 }finally{guard=false}
}
function enhanceReader(){
 const reader=$('reader');if(!reader)return;const m=getMail(openMail);if(!m)return;const a=allActions().find(x=>String(x.emailId)===String(m.id));const head=reader.querySelector('.reader-head');if(head&&!head.querySelector('.am-reader-state')){const z=document.createElement('div');z.className=`am-reader-state ${messagePriority(m,a)}`;z.textContent=messageState(m,a);head.prepend(z)}
 const actions=reader.querySelector('.reader-actions');if(actions)actions.classList.add('am-sticky-actions');
 if(m.type==='selection'&&actions&&!m.selectionSubmitted&&!actions.querySelector('[data-am-decline-selection]')){const ctx=m.summitRegistration?(()=>{try{const ss=summitSeasonState(),st=ss.selectionCentreV2??={};st.explicitNoEntry??={};return{type:'summit',title:'Summit Series',state:st,ss,discs:Object.keys(DISCIPLINES||{})}}catch(_){return null}})():(()=>{const e=(s.events||[]).find(x=>x.id===m.eventId);if(!e)return null;e.selectionCentreV2??={};e.selectionCentreV2.explicitNoEntry??={};return{type:'normal',title:e.name,id:e.id,event:e,state:e.selectionCentreV2,discs:(e.disc||[]).filter(d=>d&&d!=='ALL')}})();if(ctx){const b=document.createElement('button');b.type='button';b.className='btn ghost';b.dataset.amDeclineSelection='1';b.textContent=ctx.type==='summit'?'DO NOT ENTER SERIES':'DO NOT ENTER COMPETITION';b.onclick=()=>confirmDecline(ctx);actions.prepend(b)}}
 if(m.type==='selection'&&m.selectionSubmitted){let ctx=null;if(m.summitRegistration){try{const ss=summitSeasonState(),st=ss.selectionCentreV2??={};ctx={type:'summit',state:st,discs:Object.keys(DISCIPLINES||{})}}catch(_){}}else{const e=(s.events||[]).find(x=>x.id===m.eventId);if(e)ctx={type:'normal',event:e,state:e.selectionCentreV2||{},discs:(e.disc||[]).filter(d=>d&&d!=='ALL')}}if(ctx){const no=ctx.discs.filter(d=>ctx.state?.explicitNoEntry?.[d]);const banner=reader.querySelector('.scv2-mail-submitted');if(banner){const small=banner.querySelector('small'),strong=banner.querySelector('strong'),span=banner.querySelector('span');if(small)small.textContent='DECISION COMPLETE';if(strong)strong.textContent=m.selectionDeclined?'Competition entry declined':`${ctx.discs.length}/${ctx.discs.length} events decided`;if(span)span.textContent=m.selectionDeclined?'No athletes will be entered.':`${ctx.discs.length-no.length} event${ctx.discs.length-no.length===1?'':'s'} with entries · ${no.length} explicit No Entry`}}}
 if(m.type==='selection'&&m.selectionSubmitted&&!reader.querySelector('.am-decision-history')){let no=[];if(m.summitRegistration){try{const st=summitSeasonState()?.selectionCentreV2;no=Object.keys(st?.explicitNoEntry||{}).filter(d=>st.explicitNoEntry[d])}catch(_){}}else{const e=(s.events||[]).find(x=>x.id===m.eventId);no=Object.keys(e?.selectionCentreV2?.explicitNoEntry||{}).filter(d=>e.selectionCentreV2.explicitNoEntry[d])}if(no.length){const h=document.createElement('div');h.className='am-decision-history';h.innerHTML=`<small>YOUR DECISION</small><strong>No Entry</strong><span>${esc(no.map(labelDisc).join(' · '))}</span>`;reader.querySelector('.reader-body')?.appendChild(h)}}
 const staff=staffActions().find(x=>String(x.emailId)===String(m.id));if(staff&&actions&&!actions.querySelector('[data-am-staff-contract]')){actions.innerHTML=`<button class="btn ghost" data-am-staff-contract="decline">LET CONTRACT EXPIRE</button><button class="btn primary" data-am-staff-contract="renew">RENEW CONTRACT</button><button class="btn secondary" data-am-staff-contract="view">OPEN STAFF</button>`;actions.querySelector('[data-am-staff-contract="renew"]').onclick=()=>renewStaff(staff.entityId);actions.querySelector('[data-am-staff-contract="decline"]').onclick=()=>ask(`Release ${staff.title.replace('Contract Decision – ','')} at expiry?`,'The contract will end at the stated deadline and interim cover will take over.','LET CONTRACT EXPIRE',()=>declineStaff(staff.entityId));actions.querySelector('[data-am-staff-contract="view"]').onclick=()=>view('staff')}
}

function injectHomeAgenda(){
 if(currentView!=='home')return;const root=$('home');if(!root)return;root.querySelector('.am-home-agenda')?.remove();const rows=allActions();if(!rows.length)return;const box=document.createElement('section');box.className='panel am-home-agenda';box.innerHTML=`<div class="panel-h"><strong>Manager Agenda</strong><span>${rows.length} action${rows.length===1?'':'s'} require a response</span></div><div class="panel-body">${rows.slice(0,4).map((a,i)=>`<button data-home-action="${esc(a.actionId)}"><span>${esc(actionPriority(a).toUpperCase())} · ${esc(dueText(a))}</span><strong>${esc(a.title)}</strong><small>${esc(a.reason)}</small></button>`).join('')}</div>`;box.querySelectorAll('[data-home-action]').forEach(b=>b.onclick=()=>{const a=allActions().find(x=>x.actionId===b.dataset.homeAction);if(a)openAction(a)});root.prepend(box)
}
function injectCalendarDeadlines(){
 if(currentView!=='calendar')return;const root=$('calendar');if(!root)return;root.querySelector('.am-calendar-deadlines')?.remove();const rows=allActions();if(!rows.length)return;const box=document.createElement('section');box.className='panel am-calendar-deadlines';box.innerHTML=`<div class="panel-h"><strong>Decision Deadlines</strong><span>Manager actions</span></div><div class="panel-body">${rows.map(a=>`<button data-cal-action="${esc(a.actionId)}"><strong>${esc(a.title)}</strong><span>${esc(dueText(a))}</span></button>`).join('')}</div>`;box.querySelectorAll('[data-cal-action]').forEach(b=>b.onclick=()=>{const a=allActions().find(x=>x.actionId===b.dataset.calAction);if(a)openAction(a)});root.prepend(box)
}
function installStyles(){if($('amInboxV2Style'))return;const e=document.createElement('style');e.id='amInboxV2Style';e.textContent=`
.am-action-badge-v2{display:inline-flex;min-width:18px;height:18px;padding:0 5px;align-items:center;justify-content:center;border-radius:7px;background:#ef4057;color:#fff;font:900 9px/1 inherit;margin-left:auto}.am-action-badge-v2[hidden]{display:none!important}.am-inbox-v2{display:grid;gap:8px;margin-bottom:12px}.am-progress-block{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px 12px;border:1px solid rgba(239,64,87,.4);background:rgba(92,19,31,.18);border-radius:10px}.am-progress-block strong{font-size:9px;letter-spacing:.08em;color:#ff9aa8}.am-progress-block span{font-size:9px;color:#b9cbd5}.am-inbox-metrics{display:flex;gap:7px;overflow-x:auto}.am-inbox-metrics button{min-width:96px;text-align:left;border:1px solid rgba(116,165,196,.16);background:rgba(7,24,37,.7);color:#9eb7c6;border-radius:9px;padding:8px 10px}.am-inbox-metrics button.on{border-color:rgba(89,183,230,.55);background:rgba(20,62,86,.45)}.am-inbox-metrics small{display:block;font-size:7px;letter-spacing:.06em}.am-inbox-metrics strong{display:block;margin-top:2px;font-size:16px;color:#edf7fb}.mailitem{position:relative}.am-mail-avatar{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(93,151,185,.16);border:1px solid rgba(116,165,196,.22);font-size:8px;font-weight:900;float:left;margin-right:8px}.am-msg-state,.am-reader-state{display:inline-flex;width:max-content;padding:3px 6px;border-radius:999px;border:1px solid rgba(116,165,196,.22);font-size:7px;font-weight:900;letter-spacing:.06em;margin-top:6px}.am-msg-state.critical,.am-reader-state.critical{color:#ff9aa8;border-color:rgba(239,64,87,.42);background:rgba(239,64,87,.1)}.am-msg-state.important,.am-reader-state.important{color:#e4c77f;border-color:rgba(210,167,81,.35)}.am-filter-empty{padding:22px 12px;text-align:center;color:#7896a8;font-size:9px}.am-decision-history{margin-top:10px;padding:9px 10px;border:1px solid rgba(88,194,142,.22);border-radius:9px;background:rgba(31,86,61,.12)}.am-decision-history small,.am-decision-history strong,.am-decision-history span{display:block}.am-decision-history small{font-size:7px;letter-spacing:.08em;color:#7fbf9b}.am-decision-history strong{font-size:10px;margin:2px 0}.am-decision-history span{font-size:8px;color:#9eb8aa}.am-sticky-actions{position:sticky;bottom:0;z-index:5;background:linear-gradient(180deg,rgba(8,24,36,.72),#081824 28%);backdrop-filter:blur(9px);padding-top:10px}.am-no-entry-choice{display:flex;gap:12px;justify-content:space-between;align-items:center;padding:10px 12px;margin:0 0 10px;border:1px solid rgba(116,165,196,.2);border-radius:10px;background:rgba(7,24,37,.75)}.am-no-entry-choice small,.am-no-entry-choice span{display:block}.am-no-entry-choice small{font-size:7px;letter-spacing:.08em;color:#7f9cad}.am-no-entry-choice strong{display:block;margin:2px 0;font-size:11px}.am-no-entry-choice span{font-size:8px;color:#8fa9b8}.scv2-event.am-no-entry{border-color:rgba(88,194,142,.4)!important}.am-confirm-no-entry{margin-top:7px;padding:8px;border:1px solid rgba(88,194,142,.25);border-radius:8px}.am-confirm-no-entry small,.am-confirm-no-entry strong{display:block}.am-confirm-no-entry small{font-size:7px;color:#7fbf9b}.am-gate-v2,.am-confirm-dialog{border:0;background:transparent;color:#edf7fb;width:min(680px,calc(100vw - 22px));padding:0}.am-gate-v2::backdrop,.am-confirm-dialog::backdrop{background:rgba(0,7,13,.82)}.am-gate-card,.am-confirm-card{border:1px solid rgba(239,64,87,.36);border-radius:14px;background:#081a28;padding:16px;box-shadow:0 24px 70px rgba(0,0,0,.45)}.am-gate-card>small,.am-confirm-card>small{font-size:8px;font-weight:900;letter-spacing:.12em;color:#ff98a6}.am-gate-card h2,.am-confirm-card h2{margin:5px 0 8px}.am-gate-card>p,.am-confirm-card>p{color:#9eb5c3;font-size:10px;line-height:1.55}.am-gate-list{display:grid;gap:8px;margin-top:12px}.am-gate-list article{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:11px;border:1px solid rgba(116,165,196,.18);border-radius:10px}.am-gate-list article span,.am-gate-list article strong,.am-gate-list article p{display:block}.am-gate-list article span{font-size:7px;color:#e8b070;font-weight:900}.am-gate-list article strong{margin-top:3px;font-size:11px}.am-gate-list article p{margin:3px 0 0;color:#8fa7b5;font-size:8px}.am-gate-foot{display:flex;justify-content:space-between;align-items:center;margin-top:12px}.am-gate-foot span{font-size:8px;color:#8fa7b5}.am-confirm-card>div{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.am-home-agenda .panel-body,.am-calendar-deadlines .panel-body{display:grid;gap:7px}.am-home-agenda [data-home-action],.am-calendar-deadlines [data-cal-action]{border:1px solid rgba(116,165,196,.16);background:rgba(7,24,37,.58);color:inherit;text-align:left;border-radius:9px;padding:9px 10px}.am-home-agenda span,.am-home-agenda strong,.am-home-agenda small,.am-calendar-deadlines strong,.am-calendar-deadlines span{display:block}.am-home-agenda span,.am-calendar-deadlines span{font-size:7px;color:#dca968;font-weight:900}.am-home-agenda strong,.am-calendar-deadlines strong{font-size:10px;margin:2px 0}.am-home-agenda small{font-size:8px;color:#829eae}@media(max-width:650px){.am-progress-block{grid-template-columns:1fr}.am-gate-list article{grid-template-columns:1fr}.am-no-entry-choice{align-items:flex-start;flex-direction:column}.am-no-entry-choice .btn{width:100%}}
`;document.head.appendChild(e)}

function refreshAll(){installStyles();syncNav();syncAdvance();if(currentView==='inbox')requestAnimationFrame(enhanceInbox);if(currentView==='home')requestAnimationFrame(injectHomeAgenda);if(currentView==='calendar')requestAnimationFrame(injectCalendarDeadlines);requestAnimationFrame(decorateSelectionCentre)}
function afterResolutionFlow(){setTimeout(()=>{refreshAll();const g=blockers();if(g.length){showGate(g);return}if(lastKnownBlockers>0){try{toast('All required decisions complete')}catch(_){}}lastKnownBlockers=0},120)}

for(const name of ['openCompetitionSelectionCentre','openCompactEventSelection']){const fn=window[name];if(typeof fn==='function')window[name]=function(e){const ev=typeof e==='string'?(s.events||[]).find(x=>x.id===e):e;currentSelectionHint=ev?{type:'normal',id:ev.id}:null;const r=fn.apply(this,arguments);requestAnimationFrame(decorateSelectionCentre);return r}}
if(typeof window.openSummitSelectionCentre==='function'){const fn=window.openSummitSelectionCentre;window.openSummitSelectionCentre=function(){currentSelectionHint={type:'summit'};const r=fn.apply(this,arguments);requestAnimationFrame(decorateSelectionCentre);return r}}

const oldDrawInbox=typeof drawInbox==='function'?drawInbox:null;if(oldDrawInbox)drawInbox=function(){const r=oldDrawInbox.apply(this,arguments);requestAnimationFrame(enhanceInbox);return r};
const oldDrawReader=typeof drawReader==='function'?drawReader:null;if(oldDrawReader)drawReader=function(){const r=oldDrawReader.apply(this,arguments);requestAnimationFrame(enhanceReader);return r};
const oldDrawHome=typeof drawHome==='function'?drawHome:null;if(oldDrawHome)drawHome=function(){const r=oldDrawHome.apply(this,arguments);requestAnimationFrame(injectHomeAgenda);return r};
const oldDrawCalendar=typeof drawCalendar==='function'?drawCalendar:null;if(oldDrawCalendar)drawCalendar=function(){const r=oldDrawCalendar.apply(this,arguments);requestAnimationFrame(injectCalendarDeadlines);return r};
const oldRender=typeof render==='function'?render:null;if(oldRender)render=function(){const r=oldRender.apply(this,arguments);requestAnimationFrame(refreshAll);return r};
const oldAdvance=typeof advanceWeek==='function'?advanceWeek:null;if(oldAdvance)advanceWeek=function(){const g=blockers();if(g.length){showGate(g);syncAdvance();return false}return oldAdvance.apply(this,arguments)};
if($('advanceTop'))$('advanceTop').onclick=()=>advanceWeek();

document.addEventListener('click',e=>{
 const target=e.target;
 if(target?.closest?.('#scv2Confirm,#scv2Submit')){
  const ctx=selectionContextFromDialog();if(ctx){const missing=undecided(ctx);if(missing.length){e.preventDefault();e.stopImmediatePropagation();toast(`${missing.length} event decision${missing.length===1?'':'s'} incomplete — select an athlete or choose No Entry`);const first=missing[0];if(target.closest('#scv2Submit')){$('scv2Return')?.click();setTimeout(()=>$('amSelectionCentreV2')?.querySelector(`[data-scv2-disc="${cssEsc(first)}"]`)?.click(),0)}else $('amSelectionCentreV2')?.querySelector(`[data-scv2-disc="${cssEsc(first)}"]`)?.click();return}}
 }
 const pick=target?.closest?.('[data-scv2-pick]');if(pick){const ctx=selectionContextFromDialog(),d=activeDisc(ctx);setTimeout(()=>{if(ctx&&d){clearNoEntryWhenPicked(ctx,d);decorateSelectionCentre()}},0)}
 if(target?.closest?.('#scv2Coach,#scv2Auto')){const ctx=selectionContextFromDialog();setTimeout(()=>{if(ctx){for(const d of ctx.discs)clearNoEntryWhenPicked(ctx,d);decorateSelectionCentre()}},0)}
 if(target?.closest?.('#scv2Reset')){const ctx=selectionContextFromDialog();setTimeout(()=>{if(ctx){ctx.state.explicitNoEntry={};safeSave();decorateSelectionCentre()}},0)}
 if(target?.closest?.('#scv2Submit,#signContract,[data-career-job],[data-am-staff-contract]')){setTimeout(refreshAll,50);setTimeout(afterResolutionFlow,80)}
 if(target?.closest?.('#amSelectionCentreV2'))setTimeout(decorateSelectionCentre,0)
},true);

installStyles();for(const m of s?.emails||[])mailMeta(m);refreshAll();safeSave();
function audit(){const issues=[],rows=allActions(),ids=new Set();for(const a of rows){if(ids.has(a.actionId))issues.push(`Duplicate action ID: ${a.actionId}`);ids.add(a.actionId);if(!a.reason)issues.push(`Action has no reason: ${a.actionId}`);if(!a.destination)issues.push(`Action has no destination: ${a.actionId}`);if(a.blocks&&!a.source)issues.push(`Blocker has no owning system: ${a.actionId}`)}for(const m of s.emails||[]){const z=mailMeta(m);if(z.resolution==='awaiting_response'&&z.actionId&&!rows.some(a=>a.actionId===z.actionId))issues.push(`Stale actionable email: ${m.id}`)}return issues}
window.__athleticsInboxDecisionSystem={version:2,getUnresolvedActions:allActions,getProgressionBlockers:blockers,openAction,showGate,refresh:refreshAll,audit,debug:()=>({actions:allActions(),blockers:blockers(),audit:audit(),mailMeta:state().emailMeta,archive:state().archive,staffDecisions:state().staffDecisions,log:state().log.slice(-50)})};
try{if(typeof window.addDevelopmentUpdate==='function')window.addDevelopmentUpdate({timestamp:'2026-09-10T21:20:00+01:00',date:'10 September 2026',title:'Inbox, Decisions & Progression V2',items:['Inbox now separates Action Required, Unread, Important, Inbox and Archive, with required decisions treated as a management queue rather than read notifications.','Competition selection now requires an explicit decision for every event: select an athlete or choose No Entry. Whole competitions and Summit Series entry can be explicitly declined.','A central progression gate blocks week advancement only for unresolved decisions at their hard deadline and takes the manager directly to the owning workflow.','Staff contract deadlines now become real decisions, including explicit renewal or release at expiry, while Home and Calendar surface current manager actions.','Resolved actions persist in career state, stale action controls are removed, duplicate submissions remain locked, and old resolved/informational mail is preserved in Archive.']})}catch(_){}
})();
