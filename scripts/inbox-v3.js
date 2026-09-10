/* Athletics Manager — Inbox V3
   Unified communications screen built on the existing authoritative decision core.
   The previous inbox renderer is retained as an immediate fallback until parity QA is complete. */
(function(){
'use strict';
if(window.__amInboxV3)return;window.__amInboxV3=1;
if(typeof drawInbox!=='function')return;

const legacyDrawInbox=drawInbox;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const core=()=>window.__athleticsInboxDecisionCore;
const week=()=>Number(s?.game?.week||1);
const sys=()=>{const x=s.inboxDecisionSystem??={};x.emailMeta??={};x.actions??={};x.archive??=[];x.ui??={};x.ui.filter??='inbox';x.ui.category??='all';x.ui.search??='';x.ui.inboxV3Limit??=80;return x};
function safe(fn,fallback){try{const v=fn();return v==null?fallback:v}catch(_){return fallback}}
function saveSafe(){try{save()}catch(_){}}
function actions(){return safe(()=>core()?.getUnresolvedActions?.()||[],[])}
function blockers(){return safe(()=>core()?.getProgressionBlockers?.()||[],[])}
function meta(m){return sys().emailMeta?.[m?.id]||{}}
function category(m){const z=meta(m);if(z.category)return String(z.category).toLowerCase();return safe(()=>String(mailCategory(m)||'').toLowerCase(),String(m?.type||'information').toLowerCase())}
function priority(m,a){const z=meta(m);if(a?.blocks)return'critical';if(a?.priority)return a.priority;if(z.priority)return z.priority;const text=`${m?.subject||''} ${m?.body||''}`;return /urgent|deadline|injury|contract|olympic|championship/i.test(text)?'important':'normal'}
function resolution(m,a){if(a)return'awaiting_response';const z=meta(m),r=z.resolutionState||z.resolution;if(r)return r;if(m?.selectionSubmitted)return'completed';return'no_response_required'}
function interaction(m,a){if(a)return a.blocks?'progress_blocker':'decision_required';const z=meta(m);if(z.interactionType)return z.interactionType;if(resolution(m,a)==='completed')return'decision_required';return'information'}
function initials(name){return String(name||'AM').replace(/\s*•.*$/,'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'AM'}
function senderName(m){return String(m?.sender||'Programme').split('•')[0].trim()||'Programme'}
function messageIndex(m){return ((Number(m?.year)||1)-1)*52+(Number(m?.week)||1)}
function due(a,m){const d=Number(a?.deadline??meta(m).deadlineWeek);if(!Number.isFinite(d))return'';const n=d-week();return n<=0?'DUE NOW':n===1?'DUE NEXT WEEK':`DUE W${d}`}
function label(m,a){const r=resolution(m,a),i=interaction(m,a);if(a?.blocks)return'ACTION REQUIRED';if(a)return'DECISION REQUIRED';if(r==='completed')return'DECISION COMPLETE';if(i==='recommendation')return'RECOMMENDATION';if(i==='optional_action')return'OPTIONAL ACTION';return'INFORMATION'}
function labelClass(m,a){if(a?.blocks)return'critical';if(resolution(m,a)==='completed')return'complete';return priority(m,a)==='important'?'important':''}
function isImportant(m,a){return ['critical','important'].includes(priority(m,a))}
function allActive(){return [...(s?.emails||[])]}
function allArchive(){return [...(sys().archive||[])]}
function actionForMail(m,list=actions()){return list.find(a=>String(a.emailId||'')===String(m?.id||''))||null}
function textHaystack(m){return `${m?.sender||''} ${m?.subject||''} ${m?.body||''}`.toLowerCase()}
function filtered(){
 const x=sys(),filter=x.ui.filter||'inbox',acts=actions(),active=filter==='archive'?allArchive():allActive();
 let rows=active.map(m=>({kind:'mail',mail:m,action:actionForMail(m,acts)}));
 if(filter==='actions')rows=rows.filter(r=>!!r.action||resolution(r.mail,r.action)==='awaiting_response');
 else if(filter==='important')rows=rows.filter(r=>isImportant(r.mail,r.action));
 else if(filter==='unread')rows=rows.filter(r=>r.mail.unread===true);
 if(filter==='actions'){
  const known=new Set(rows.map(r=>String(r.action?.actionId||'')));
  for(const a of acts)if(!known.has(String(a.actionId||''))&&!a.emailId)rows.push({kind:'action',action:a,mail:null});
 }
 const cat=String(x.ui.category||'all');if(cat!=='all')rows=rows.filter(r=>r.mail&&category(r.mail)===cat);
 const q=String(x.ui.search||'').trim().toLowerCase();if(q)rows=rows.filter(r=>r.mail?textHaystack(r.mail).includes(q):`${r.action?.title||''} ${r.action?.reason||''}`.toLowerCase().includes(q));
 rows.sort((a,b)=>{
  const aa=!!a.action,ab=!!b.action;if(aa!==ab)return Number(ab)-Number(aa);
  const pa=a.mail?priority(a.mail,a.action):a.action?.blocks?'critical':'important',pb=b.mail?priority(b.mail,b.action):b.action?.blocks?'critical':'important';
  const pn=p=>p==='critical'?3:p==='important'?2:1;if(pn(pa)!==pn(pb))return pn(pb)-pn(pa);
  if(a.mail&&b.mail&&Number(a.mail.unread)!==Number(b.mail.unread))return Number(b.mail.unread)-Number(a.mail.unread);
  return messageIndex(b.mail)-messageIndex(a.mail);
 });
 return rows;
}
function preview(m){const t=String(m?.body||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();return t||'Open this communication for details.'}
function mailRow(row){const m=row.mail,a=row.action,l=label(m,a),lc=labelClass(m,a);return `<button class="am-inbox-v3-row ${m.unread?'unread':''} ${String(openMail)===String(m.id)?'on':''} ${a?'action':''}" data-v3-mail="${esc(m.id)}" aria-label="${esc(`${m.unread?'Unread. ':''}${senderName(m)}. ${m.subject}`)}"><span class="am-inbox-v3-avatar">${esc(initials(m.sender))}</span><span class="am-inbox-v3-copy"><span class="am-inbox-v3-sender"><b>${esc(senderName(m))}</b></span><strong title="${esc(m.subject)}">${esc(m.subject)}</strong><span class="am-inbox-v3-preview">${esc(preview(m).slice(0,118))}${preview(m).length>118?'…':''}</span><span class="am-inbox-v3-tags"><em class="am-inbox-v3-tag ${lc}">${esc(l)}</em>${due(a,m)?`<em class="am-inbox-v3-tag ${a?.blocks?'critical':''}">${esc(due(a,m))}</em>`:''}</span></span><i class="am-inbox-v3-week">W${Number(m.week)||1}</i></button>`}
function systemActionRow(row){const a=row.action;return `<button class="am-inbox-v3-row action" data-v3-action="${esc(a.actionId)}"><span class="am-inbox-v3-avatar">!</span><span class="am-inbox-v3-copy"><span class="am-inbox-v3-sender"><b>${esc(String(a.source||'Management').toUpperCase())}</b></span><strong>${esc(a.title||'Management decision')}</strong><span class="am-inbox-v3-preview">${esc(a.reason||'A decision is required.')}</span><span class="am-inbox-v3-tags"><em class="am-inbox-v3-tag ${a.blocks?'critical':'important'}">${a.blocks?'ACTION REQUIRED':'DECISION REQUIRED'}</em>${due(a,null)?`<em class="am-inbox-v3-tag">${esc(due(a,null))}</em>`:''}</span></span><i class="am-inbox-v3-week">W${Number(a.deadline)||week()}</i></button>`}
function tabs(filter,count){return [['actions','Action Required'],['inbox','Inbox'],['important','Important'],['unread','Unread'],['all','All Mail'],['archive','Archive']].map(([id,name])=>`<button type="button" class="${filter===id?'on':''}" data-v3-filter="${id}">${name}${id==='actions'&&count?` <b>${count}</b>`:''}</button>`).join('')}
function categories(){return ['selection','competition','scouting','training','medical','contract','contracts','staff','finance','federation','athlete','testing']}
function archivedReader(m){const z=meta(m);return `<div class="reader-head"><button class="amv2-mobile-back" type="button" data-v3-reader-back>← INBOX</button><div class="amv2-sender"><span class="amv2-avatar big">${esc(initials(m.sender))}</span><span><b>${esc(senderName(m))}</b><small>${esc(category(m).replace(/\b\w/g,x=>x.toUpperCase()))}</small></span></div><small>Archived · Year ${Number(m.year)||1} · Week ${Number(m.week)||1}</small><h2>${esc(m.subject)}</h2><div class="amv2-reader-tags"><span>${esc(z.resolutionState==='completed'?'DECISION COMPLETE':'ARCHIVED')}</span></div></div><div class="reader-body amv2-reader-body">${m.html||`<p>${esc(m.body||'')}</p>`}</div><div class="reader-actions"></div>`}
function emptyReader(){return `<div class="am-inbox-v3-empty"><div><b>Select a communication</b><span>Choose a message or management action from the list.</span></div></div>`}
function updateCounters(root){const a=actions(),b=blockers(),unread=allActive().filter(m=>m.unread).length,important=allActive().filter(m=>isImportant(m,actionForMail(m,a))).length;root.querySelector('[data-v3-count="actions"] b')?.replaceChildren(String(a.length));root.querySelector('[data-v3-count="unread"] b')?.replaceChildren(String(unread));root.querySelector('[data-v3-count="important"] b')?.replaceChildren(String(important));const badge=$('mailBadge');if(badge){badge.textContent=unread;badge.classList.toggle('hidden',!unread)}const block=root.querySelector('.am-inbox-v3-blocker');if(block)block.hidden=!b.length}
function openAction(a){if(!a)return;const c=core();if(c?.openAction){try{c.openAction(a);return}catch(_){}}if(a.destination)try{view(a.destination)}catch(_){}
}
function openMessage(id){
 const root=$('inbox'),x=sys(),list=root?.querySelector('.am-inbox-v3-list');if(list)x.ui.scroll=list.scrollTop;
 const m=allActive().find(x=>String(x.id)===String(id));if(!m)return;
 openMail=m.id;if(m.unread)m.unread=false;saveSafe();safe(()=>syncMailBadge(),null);
 root?.querySelectorAll('[data-v3-mail]').forEach(b=>{b.classList.toggle('on',String(b.dataset.v3Mail)===String(id));if(String(b.dataset.v3Mail)===String(id))b.classList.remove('unread')});
 try{drawReader()}catch(err){console.error('[Athletics Manager] Inbox V3 reader recovered',err);const reader=$('reader');if(reader)reader.innerHTML=`<div class="am-inbox-v3-empty"><div><b>Message could not be displayed</b><span>Your career state is safe. Return to the list and try again.</span></div></div>`}
 if(matchMedia('(max-width:700px)').matches)root?.classList.add('am-inbox-v3-reading');updateCounters(root);
}
function openArchived(id){const root=$('inbox'),m=allArchive().find(x=>String(x.id)===String(id));if(!m)return;openMail=m.id;const reader=$('reader');if(reader)reader.innerHTML=archivedReader(m);root?.querySelectorAll('[data-v3-mail]').forEach(b=>b.classList.toggle('on',String(b.dataset.v3Mail)===String(id)));if(matchMedia('(max-width:700px)').matches)root?.classList.add('am-inbox-v3-reading')}
function setFilter(id){const x=sys();x.ui.filter=id;x.ui.inboxV3Limit=80;x.ui.scroll=0;saveSafe();renderInbox()}
function renderInbox(){
 const root=$('inbox');if(!root)return;
 const x=sys(),a=actions(),b=blockers(),unread=allActive().filter(m=>m.unread).length,important=allActive().filter(m=>isImportant(m,actionForMail(m,a))).length,filter=x.ui.filter||'inbox',rows=filtered(),limit=Math.max(40,Number(x.ui.inboxV3Limit)||80),shown=rows.slice(0,limit);
 const activeSelected=allActive().find(m=>String(m.id)===String(openMail));const archiveSelected=allArchive().find(m=>String(m.id)===String(openMail));
 root.classList.remove('am-inbox-v3-reading');root.innerHTML=`<div class="am-inbox-v3" data-am-ui-screen="inbox-v3"><header class="am-inbox-v3-head"><div class="am-inbox-v3-title"><small>COMMUNICATIONS · NATIONAL PROGRAMME</small><h1>Inbox</h1><p>Staff communication, programme information and management decisions.</p></div><div class="am-inbox-v3-counts"><span class="am-inbox-v3-count ${a.length?'action':''}" data-v3-count="actions"><b>${a.length}</b><small>Action Required</small><span>Decisions</span></span><span class="am-inbox-v3-count" data-v3-count="important"><b>${important}</b><small>Important</small><span>Priority</span></span><span class="am-inbox-v3-count" data-v3-count="unread"><b>${unread}</b><small>Unread</small><span>Messages</span></span></div></header>${b.length?`<section class="am-inbox-v3-blocker"><div><small>PROGRESSION BLOCKED</small><strong>${esc(b[0].title||'Management decision required')}${b.length>1?` · +${b.length-1} more`:''}</strong><span>${b.length} decision${b.length===1?'':'s'} must be resolved before Advance Week.</span></div><button type="button" class="btn primary" data-v3-review>REVIEW ACTIONS</button></section>`:'<div></div>'}<section class="am-inbox-v3-workspace"><aside class="am-inbox-v3-sidebar"><nav class="am-inbox-v3-tabs" aria-label="Inbox filters">${tabs(filter,a.length)}</nav><div class="am-inbox-v3-tools"><input id="inboxV3Search" type="search" value="${esc(x.ui.search||'')}" placeholder="Search communications" aria-label="Search communications"><select id="inboxV3Category" aria-label="Filter by category"><option value="all">All categories</option>${categories().map(c=>`<option value="${c}" ${String(x.ui.category)===c?'selected':''}>${esc(c.replace(/\b\w/g,q=>q.toUpperCase()))}</option>`).join('')}</select><button type="button" class="btn ghost" data-v3-readall>MARK ALL READ</button></div><div class="am-inbox-v3-list" id="inboxV3List">${shown.length?shown.map(r=>r.kind==='mail'?mailRow(r):systemActionRow(r)).join(''):`<div class="am-inbox-v3-empty"><div><b>${x.ui.search?'No matching communications':'Nothing here'}</b><span>${filter==='actions'?'There are no unresolved manager decisions.':filter==='archive'?'Archived communications will appear here.':'Try another filter or clear your search.'}</span></div></div>`}${rows.length>shown.length?`<button type="button" class="am-inbox-v3-more" data-v3-more>SHOW ${Math.min(80,rows.length-shown.length)} MORE</button>`:''}</div></aside><main class="am-inbox-v3-reader" aria-label="Open communication"><div id="reader">${filter==='archive'&&archiveSelected?archivedReader(archiveSelected):emptyReader()}</div></main></section></div>`;
 bind(root,filter,activeSelected,archiveSelected);
 const list=$('inboxV3List');if(list)requestAnimationFrame(()=>{list.scrollTop=Number(x.ui.scroll)||0});
 if(filter!=='archive'){
  const selected=activeSelected||shown.find(r=>r.mail)?.mail;if(selected){openMail=selected.id;try{drawReader()}catch(_){}root.querySelector(`[data-v3-mail="${CSS.escape(String(selected.id))}"]`)?.classList.add('on')}
 }
 window.AthleticsUI?.registerScreen?.('inbox',{status:'candidate',replacement:'inbox-v3'});
}
function bind(root,filter){
 root.querySelectorAll('[data-v3-filter]').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.v3Filter)));
 root.querySelector('[data-v3-review]')?.addEventListener('click',()=>setFilter('actions'));
 root.querySelector('[data-v3-readall]')?.addEventListener('click',()=>{for(const m of allActive())m.unread=false;saveSafe();safe(()=>syncMailBadge(),null);renderInbox()});
 root.querySelector('#inboxV3Search')?.addEventListener('input',e=>{sys().ui.search=e.target.value;sys().ui.inboxV3Limit=80;saveSafe();renderInbox();requestAnimationFrame(()=>$('inboxV3Search')?.focus())});
 root.querySelector('#inboxV3Category')?.addEventListener('change',e=>{sys().ui.category=e.target.value;sys().ui.inboxV3Limit=80;saveSafe();renderInbox()});
 root.querySelectorAll('[data-v3-mail]').forEach(b=>b.addEventListener('click',()=>filter==='archive'?openArchived(b.dataset.v3Mail):openMessage(b.dataset.v3Mail)));
 root.querySelectorAll('[data-v3-action]').forEach(b=>b.addEventListener('click',()=>openAction(actions().find(a=>String(a.actionId)===String(b.dataset.v3Action)))));
 root.querySelector('[data-v3-more]')?.addEventListener('click',()=>{const list=$('inboxV3List'),top=list?.scrollTop||0;sys().ui.inboxV3Limit=(Number(sys().ui.inboxV3Limit)||80)+80;saveSafe();renderInbox();requestAnimationFrame(()=>{const n=$('inboxV3List');if(n)n.scrollTop=top})});
 root.addEventListener('click',e=>{if(e.target.closest('[data-reader-back],[data-v3-reader-back]'))root.classList.remove('am-inbox-v3-reading')},true);
 const list=$('inboxV3List');if(list)list.addEventListener('scroll',()=>{sys().ui.scroll=list.scrollTop},{passive:true});
}
function drawCandidate(){
 try{renderInbox()}
 catch(err){console.error('[Athletics Manager] Inbox V3 recovered to previous Inbox',err);legacyDrawInbox();window.AthleticsUI?.registerScreen?.('inbox',{status:'fallback',replacement:'inbox-v3'})}
}
drawInbox=drawCandidate;
window.__athleticsInboxV3={version:3,render:renderInbox,legacy:legacyDrawInbox,debug:()=>({filter:sys().ui.filter,actions:actions(),blockers:blockers(),rows:filtered().length,archive:allArchive().length})};
if(typeof currentView!=='undefined'&&currentView==='inbox')requestAnimationFrame(drawCandidate);
})();
