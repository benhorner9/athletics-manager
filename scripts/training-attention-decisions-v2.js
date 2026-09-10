/* Athletics Manager — Training attention as a decision queue */
(function(){
'use strict';
if(window.__amTrainingAttentionDecisionsV2)return;
window.__amTrainingAttentionDecisionsV2=1;

let applying=false,scheduled=false;
const byId=id=>document.getElementById(id);
const gameState=()=>{try{return typeof s!=='undefined'?s:null}catch(_){return null}};
const currentWeek=()=>Number(gameState()?.game?.careerWeek||gameState()?.game?.week||1);
const squad=()=>{try{return typeof managedTeam==='function'?managedTeam():[]}catch(_){return (gameState()?.athletes||[]).filter(a=>!a.retired&&a.nation===gameState()?.managedNation&&a.inSquad!==false)}};
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const eventLabel=d=>{try{return typeof discLabel==='function'?discLabel(d):d}catch(_){return d||'Athlete'}};

function decisionState(){
 const st=gameState();if(!st)return {};
 st.trainingSystem??={};
 st.trainingSystem.attentionDecisions??={};
 return st.trainingSystem.attentionDecisions;
}
function training(a){return a?.trainingV2||{}}
function isRecovery(t){return String(t?.programme||'').toLowerCase()==='recovery'||/recovery/i.test(String(t?.programmeLabel||''))}
function isLow(t){return String(t?.intensity||'').toLowerCase()==='low'}
function loadStatus(t){return String(t?.load?.status||'Normal')}
function nextMajor(a){
 const st=gameState();if(!st||!a)return null;
 return (st.events||[]).filter(e=>!e.completed&&Number(e.week)>=Number(st.game?.week||1)&&['championship','olympics'].includes(e.kind)&&((e.disc||[]).includes(a.disc)||(e.disc||[]).includes('ALL'))).sort((x,y)=>x.week-y.week)[0]||null;
}
function rawIssue(a){
 if(!a||a.retired)return null;
 const t=training(a),load=loadStatus(t),recovery=isRecovery(t),low=isLow(t),mitigated=recovery||low;
 /* Injury recovery is a medical status, not an unresolved training decision. */
 if(Number(a.injury||0)>0)return null;
 if(load==='Critical'&&!mitigated)return {key:'critical-load',priority:100,tone:'bad',label:'CRITICAL LOAD',why:'Training load is currently critical. Reduce intensity or move the athlete into Recovery before adding more work.',decision:'Accept the risk this week or change the training plan.',ack:'ACCEPT RISK THIS WEEK'};
 if(Number(a.fatigue||0)>=82&&!mitigated)return {key:'very-high-fatigue',priority:96,tone:'bad',label:'VERY HIGH FATIGUE',why:`Fatigue is ${Math.round(a.fatigue)}/100. The athlete is still on a plan that can add meaningful load.`,decision:'Move to Recovery / Low intensity, or explicitly accept the risk for this week.',ack:'ACCEPT RISK THIS WEEK'};
 if(Number(a.fatigue||0)>=72&&!mitigated)return {key:'high-fatigue',priority:90,tone:'bad',label:'HIGH FATIGUE',why:`Fatigue is ${Math.round(a.fatigue)}/100 and the current plan has not yet been adjusted to reduce load.`,decision:'Reduce the training demand or consciously keep the current plan for this week.',ack:'KEEP PLAN THIS WEEK'};
 if(load==='High'&&!mitigated)return {key:'high-load',priority:82,tone:'warn',label:'HIGH TRAINING LOAD',why:'Recent workload is high and the current programme has not been reduced.',decision:'Lower intensity / use Recovery, or keep the current plan for this week.',ack:'KEEP PLAN THIS WEEK'};
 if(t?.flags?.risk&&!mitigated)return {key:'injury-risk',priority:78,tone:'warn',label:'INJURY RISK',why:'The training engine is flagging elevated injury risk and no load-reducing response is currently in place.',decision:'Reduce the training demand or explicitly accept the risk this week.',ack:'ACCEPT RISK THIS WEEK'};
 if(t?.flags?.plateau&&Number(t?.blockWeeks||0)>=4&&!recovery)return {key:'plateau',priority:64,tone:'warn',label:'DEVELOPMENT PLATEAU',why:'Recent development has stalled late enough in the current block to justify reviewing the programme.',decision:'Change the programme/focus, or deliberately continue the current block.',ack:'KEEP CURRENT BLOCK'};
 if(Number(t?.adaptation||0)>=0.62&&Number(t?.blockWeeks||0)>=6&&!recovery)return {key:'adaptation',priority:58,tone:'warn',label:'ADAPTATION HIGH',why:'The athlete has adapted to the current block and its development effect is beginning to fall.',decision:'Start a different block, or deliberately continue this one.',ack:'KEEP CURRENT BLOCK'};
 const major=nextMajor(a),gap=major?Number(major.week)-Number(gameState()?.game?.week||1):99;
 if(major&&gap>=0&&gap<=4&&String(t?.programme||'')!=='prep'&&!recovery&&Number(a.fatigue||0)<65)return {key:'major-prep',priority:54,tone:'notice',label:'CHAMPIONSHIP APPROACH',why:`${major.name||'A major championship'} is ${gap===0?'this week':`in ${gap} week${gap===1?'':'s'}`} and this athlete is not in Competition Preparation.`,decision:'Move into Competition Preparation, or keep the current plan intentionally.',ack:'KEEP CURRENT PLAN'};
 return null;
}
function acknowledged(a,issue){
 const rec=decisionState()[a.id];
 return !!(rec&&Number(rec.week)===currentWeek()&&rec.key===issue.key);
}
function issueFor(a){const issue=rawIssue(a);return issue&&!acknowledged(a,issue)?issue:null}
function queue(){return squad().map(a=>({a,issue:issueFor(a)})).filter(x=>x.issue).sort((x,y)=>y.issue.priority-x.issue.priority||Number(y.a.fatigue||0)-Number(x.a.fatigue||0)||String(x.a.name).localeCompare(String(y.a.name)))}

function ensureStyles(){
 if(byId('amTrainingAttentionDecisionStyles'))return;
 const style=document.createElement('style');style.id='amTrainingAttentionDecisionStyles';style.textContent=`
 .tr2-nav-badge[hidden]{display:none!important}.tr2-decision-shell{display:grid;gap:14px}.tr2-decision-intro{border:1px solid rgba(122,166,199,.18);background:rgba(7,25,38,.56);border-radius:10px;padding:12px 14px;font-size:12px;line-height:1.55;color:#a9c0cf}.tr2-decision-intro strong{color:#eef7fb}.tr2-decision-list{display:grid;gap:9px}.tr2-decision-card{border:1px solid rgba(122,166,199,.2);border-radius:10px;background:rgba(7,25,38,.66);padding:13px 14px;display:grid;gap:10px}.tr2-decision-card.bad{border-left:3px solid #d44d61}.tr2-decision-card.warn{border-left:3px solid #d3aa58}.tr2-decision-card.notice{border-left:3px solid #6aa7c8}.tr2-decision-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.tr2-decision-head strong,.tr2-decision-head small{display:block}.tr2-decision-head small{margin-top:3px;color:#7896a8;font-size:10px}.tr2-decision-tag{font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:5px 8px;background:rgba(201,70,90,.16);color:#f2a7b2;white-space:nowrap}.tr2-decision-card.warn .tr2-decision-tag{background:rgba(211,170,88,.13);color:#e2c684}.tr2-decision-card.notice .tr2-decision-tag{background:rgba(106,167,200,.13);color:#9dcde7}.tr2-decision-copy{font-size:12px;line-height:1.55;color:#b7cad5}.tr2-decision-copy p{margin:0 0 5px}.tr2-decision-copy b{color:#eef7fb}.tr2-decision-actions{display:flex;gap:8px;flex-wrap:wrap}.tr2-decision-empty{padding:24px 16px;text-align:center;border:1px dashed rgba(122,166,199,.2);border-radius:10px;color:#7896a8}.tr2-decision-empty strong{display:block;color:#dcebf2;margin-bottom:5px}.tr2-tabs [data-am-attention-tab="1"]{white-space:nowrap}@media(max-width:720px){.tr2-decision-head{flex-direction:column}.tr2-decision-actions{flex-direction:column}.tr2-decision-actions .btn{width:100%}}
 `;document.head.appendChild(style);
}
function attentionTab(){
 const tabs=byId('training')?.querySelector('.tr2-tabs');if(!tabs)return null;
 let button=[...tabs.querySelectorAll('button')].find(b=>/needs\s+attention/i.test(b.textContent||'')||/attention/i.test(String(b.dataset?.tr2Tab||'')));
 if(!button){button=document.createElement('button');button.type='button';button.dataset.amAttentionTab='1';button.textContent='NEEDS ATTENTION';const first=tabs.firstElementChild;if(first?.nextSibling)tabs.insertBefore(button,first.nextSibling);else tabs.appendChild(button);button.addEventListener('click',()=>setTimeout(renderQueue,0));}
 if(!button.dataset.amDecisionQueueBound){button.dataset.amDecisionQueueBound='1';button.addEventListener('click',()=>setTimeout(renderQueue,0));}
 return button;
}
function updateBadge(n){
 for(const root of [byId('railNav'),byId('mobileNavDrawer')]){
  if(!root)continue;const b=root.querySelector('[data-view="training"],[data-mobile-view="training"]');if(!b)continue;
  let badge=b.querySelector('.tr2-nav-badge');if(!badge){badge=document.createElement('span');badge.className='tr2-nav-badge';b.appendChild(badge)}
  badge.textContent=n?String(n):'';badge.hidden=!n;badge.setAttribute('aria-label',n?`${n} unresolved training decision${n===1?'':'s'}`:'No unresolved training decisions');
 }
}
function updateHeader(n){
 const root=byId('training'),head=root?.querySelector('.tr2-head .status');
 if(head){const next=n?`${n} NEED ATTENTION`:'SQUAD ON TRACK';if(head.textContent!==next)head.textContent=next;head.classList.toggle('warn',!!n);head.classList.toggle('good',!n)}
 const metric=[...(root?.querySelectorAll('.tr2-summary .tr2-metric')||[])].find(m=>/needs\s+attention/i.test(m.querySelector('small')?.textContent||''));
 if(metric){const strong=metric.querySelector('strong'),span=metric.querySelector('span');if(strong)strong.textContent=String(n);if(span)span.textContent=n?'Unresolved management decisions':'No unresolved decisions';metric.classList.toggle('bad',!!n)}
 const tab=attentionTab();if(tab&&tab.dataset.amAttentionTab==='1')tab.textContent=n?`NEEDS ATTENTION · ${n}`:'NEEDS ATTENTION';
}
function trimOverview(items){
 const root=byId('training'),panel=root?.querySelector('.tr2-attention');if(!panel)return;
 const wanted=new Set(items.map(x=>String(x.a.name)));
 panel.querySelectorAll('[data-tr2-athlete-card]').forEach(card=>{if(!wanted.has(String(card.dataset.tr2AthleteCard)))card.remove()});
 const body=panel.querySelector('.panel-body');if(body&&!body.querySelector('[data-tr2-athlete-card]'))body.innerHTML='<div class="tr2-decision-empty"><strong>No unresolved training decisions</strong>Athletes already on an appropriate recovery or load-management plan remain visible under Athletes, but no longer count as needing attention.</div>';
 const head=panel.querySelector('.panel-h');if(head){const strong=head.querySelector('strong'),span=head.querySelector('span');if(strong)strong.textContent='Outstanding decisions';if(span)span.textContent=items.length?'Highest priority first':'Nothing to resolve'}
}
function openManager(name){
 const root=byId('training'),tabs=root?.querySelector('.tr2-tabs'),athletes=[...(tabs?.querySelectorAll('button')||[])].find(b=>String(b.dataset?.tr2Tab||'')==='athletes'||/^athletes$/i.test((b.textContent||'').trim()));
 if(!athletes)return;athletes.click();setTimeout(()=>{const cards=[...root.querySelectorAll('[data-tr2-edit]')],button=cards.find(b=>String(b.dataset.tr2Edit)===String(name));button?.click()},0);
}
function acknowledge(id,key){
 const a=squad().find(x=>String(x.id)===String(id));if(!a)return;decisionState()[a.id]={key,week:currentWeek(),at:Date.now()};
 try{if(typeof save==='function')save()}catch(_){ }
 apply();renderQueue();
}
function renderQueue(){
 const root=byId('training'),shell=root?.querySelector('.tr2-shell'),tabs=shell?.querySelector('.tr2-tabs');if(!shell||!tabs)return;
 const tab=attentionTab();if(!tab)return;
 tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===tab));
 [...shell.children].forEach(node=>{if(node!==shell.firstElementChild&&node!==tabs)node.remove()});
 const items=queue(),content=document.createElement('div');content.className='tr2-decision-shell';
 content.innerHTML=`<div class="tr2-decision-intro"><strong>This is a decision queue, not a recovery countdown.</strong> A warning disappears as soon as you reduce the relevant training risk. If you intentionally keep the current plan, acknowledge that decision for this week and it will only return next week if the problem still needs another decision.</div><section class="panel"><div class="panel-h"><strong>Needs Attention</strong><span>${items.length} unresolved</span></div><div class="panel-body tr2-decision-list">${items.length?items.map(({a,issue})=>`<article class="tr2-decision-card ${issue.tone}"><div class="tr2-decision-head"><div><strong>${esc(a.name)}</strong><small>${esc(eventLabel(a.disc))} · Fatigue ${Math.round(Number(a.fatigue||0))} · ${esc(loadStatus(training(a)))} load</small></div><span class="tr2-decision-tag">${esc(issue.label)}</span></div><div class="tr2-decision-copy"><p><b>Why this is here:</b> ${esc(issue.why)}</p><p><b>Your decision:</b> ${esc(issue.decision)}</p></div><div class="tr2-decision-actions"><button type="button" class="btn primary" data-am-manage-training="${esc(a.id)}">MANAGE TRAINING</button><button type="button" class="btn ghost" data-am-ack-training="${esc(a.id)}" data-am-ack-key="${esc(issue.key)}">${esc(issue.ack)}</button></div></article>`).join(''):`<div class="tr2-decision-empty"><strong>Nothing needs a decision</strong>Any athlete still recovering or carrying fatigue is being handled by the plan you have already chosen. Their status remains visible under Athletes without keeping the Training badge active.</div>`}</div></section>`;
 shell.appendChild(content);
 content.querySelectorAll('[data-am-manage-training]').forEach(button=>button.addEventListener('click',()=>{const a=squad().find(x=>String(x.id)===String(button.dataset.amManageTraining));if(a)openManager(a.name)}));
 content.querySelectorAll('[data-am-ack-training]').forEach(button=>button.addEventListener('click',()=>acknowledge(button.dataset.amAckTraining,button.dataset.amAckKey)));
 updateBadge(items.length);updateHeader(items.length);
}
function apply(){
 if(applying)return;applying=true;
 try{ensureStyles();const items=queue();updateBadge(items.length);updateHeader(items.length);trimOverview(items);const tab=attentionTab();if(tab?.classList.contains('on')&&(/needs\s+attention/i.test(tab.textContent||'')||tab.dataset.amAttentionTab==='1'))renderQueue()}finally{applying=false}
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply()})}

if(typeof drawTraining==='function'){
 const previousDrawTraining=drawTraining;
 drawTraining=function(){const result=previousDrawTraining.apply(this,arguments);schedule();return result};
}
const root=byId('training');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
document.addEventListener('change',event=>{if(event.target?.closest?.('#training'))setTimeout(schedule,0)},true);
document.addEventListener('click',event=>{if(event.target?.closest?.('#training'))setTimeout(schedule,0)},true);
try{if(typeof currentView!=='undefined'&&currentView==='training')schedule();else{const n=queue().length;updateBadge(n)}}catch(_){ }
window.__athleticsTrainingAttentionDecisions={version:2,queue,issueFor,refresh:apply};
})();
