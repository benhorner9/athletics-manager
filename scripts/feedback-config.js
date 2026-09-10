/* Paste the deployed Google Apps Script /exec URL here before external testing. */
window.ATHLETICS_FEEDBACK_ENDPOINT = '';

/* ===== Selection Flow V2 ===== */
(function(){
'use strict';
if(window.__amSelectionFlowV2)return;window.__amSelectionFlowV2=1;
const $=id=>document.getElementById(id);
const esc=v=>typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eventDiscs=e=>(e?.disc||[]).filter(d=>d&&d!=='ALL');
function merit(a){try{return typeof selectionMerit==='function'?selectionMerit(a):(a?.overall||0)*.6+(a?.form||0)*.25+(a?.fitness||0)*.2-(a?.fatigue||0)*.15}catch(_){return 0}}
function recommendation(e,d){
 const candidates=typeof eligibleFor==='function'?(eligibleFor(e,d)||[]):[];
 const label=typeof discLabel==='function'?discLabel(d):d;
 if(!candidates.length)return{priority:100,text:`${label} — no eligible squad athlete is available.`};
 let picks=[];
 try{if(typeof selectionRecommendationPlan==='function')picks=(selectionRecommendationPlan(e,d,candidates)?.athletes||[]).filter(Boolean)}catch(_){}
 const ranked=[...candidates].sort((a,b)=>merit(b)-merit(a));if(!picks.length)picks=ranked.slice(0,1);
 const lead=picks[0],second=ranked.find(a=>a.id!==lead?.id),names=picks.map(a=>a.name).join(' & ');
 let priority=30,note='best current balance of performance and readiness.';
 if((lead?.fatigue||0)>=60){priority=95;note='the preferred choice, but fatigue is high and worth watching.'}
 else if((lead?.fitness||100)<80){priority=90;note='the preferred choice, although fitness is a concern.'}
 else if(second&&Math.abs(merit(lead)-merit(second))<=3){priority=85;note=`just edges ${second.name} on the current assessment.`}
 else if(picks.length>1){priority=55;note='the recommended group based on current merit and readiness.'}
 else if(candidates.length===1){priority=45;note='the only current eligible option.'}
 return{priority,text:`${label} — ${names} ${picks.length===1?'is':'are'} ${note}`};
}
function coachPointers(e){
 const all=eventDiscs(e).map(d=>recommendation(e,d)).sort((a,b)=>b.priority-a.priority);
 return all.slice(0,Math.min(5,all.length));
}
function snapshotRows(m,e){
 const saved=Array.isArray(m?.selectionSubmittedSnapshot)&&m.selectionSubmittedSnapshot.length?m.selectionSubmittedSnapshot:null;
 if(saved)return saved.map(x=>({disc:x.disc,names:Array.isArray(x.names)?x.names:[]})).filter(x=>x.names.length);
 return eventDiscs(e).map(d=>({disc:d,names:(e.entries?.[d]||[]).map(id=>(s.athletes||[]).find(a=>a.id===id)?.name).filter(Boolean)})).filter(x=>x.names.length);
}
function selectionMadeHTML(m,e){
 const rows=snapshotRows(m,e),entries=rows.reduce((n,x)=>n+x.names.length,0),preview=rows.slice(0,4),more=rows.length>4;
 const rowHTML=x=>`<div class="am-v2-made-row"><strong>${esc(typeof discLabel==='function'?discLabel(x.disc):x.disc)}</strong><span>${esc(x.names.join(', '))}</span></div>`;
 return `<section class="am-v2-made"><div class="am-v2-made-head"><div><small>SELECTION MADE</small><strong>${entries} athlete entr${entries===1?'y':'ies'} confirmed</strong></div><span>✓</span></div><div class="am-v2-made-preview">${preview.length?preview.map(rowHTML).join(''):'<div class="am-v2-made-row"><span>No athlete entries were submitted.</span></div>'}</div>${more?`<details><summary>VIEW FULL TEAM · ${rows.length} EVENTS</summary><div class="am-v2-made-full">${rows.map(rowHTML).join('')}</div></details>`:''}</section>`;
}
function hubHTML(m,e,submitted){
 const pointers=coachPointers(e),ds=eventDiscs(e),hidden=Math.max(0,ds.length-pointers.length);
 return `<div class="am-v2-selection-mail">${submitted?selectionMadeHTML(m,e):''}<div class="am-v2-meta"><span><strong>Week ${e.week}</strong>${e.location?` · ${esc(e.location)}`:''}</span><span>${ds.length} event${ds.length===1?'':'s'}</span></div><section class="am-v2-coach"><div class="am-v2-coach-head"><div><small>COACH'S VIEW</small><strong>Key selection calls</strong></div><span>${pointers.length} pointer${pointers.length===1?'':'s'}</span></div><div class="am-v2-pointers">${pointers.map(p=>`<p>${esc(p.text)}</p>`).join('')}</div>${hidden?`<div class="am-v2-coach-foot">Only the ${pointers.length} most useful calls are shown here. The full event list is in Make Selection.</div>`:''}</section></div>`;
}
function returnToMail(m){
 const dlg=$('amEventSelectionDialog');if(dlg?.open)dlg.close();
 if(!m)return;
 openMail=m.id;
 if(typeof view==='function')view('inbox');
 openMail=m.id;
 if(typeof drawInbox==='function')drawInbox();else if(typeof drawReader==='function')drawReader();
}
function submitManual(e,m){const ok=typeof confirmEventSelection==='function'?confirmEventSelection(e):false;if(ok)returnToMail(m);return ok}
function submitRecommended(e,m){const ok=typeof applyRecommendedEventSelection==='function'?applyRecommendedEventSelection(e):false;if(ok!==false)returnToMail(m);return ok}
function wireDialog(dlg){
 const ctx=dlg?.__amV2SelectionContext;if(!ctx)return;
 const m=(s.emails||[]).find(x=>x.id===ctx.mailId),e=(s.events||[]).find(x=>x.id===ctx.eventId);if(!m||!e)return;
 const submit=()=>submitManual(e,m),coach=()=>submitRecommended(e,m);
 const top=$('amEsSubmit'),bottom=$('amEsSubmitBottom'),coachBtn=$('amEsCoach');if(top)top.onclick=submit;if(bottom)bottom.onclick=submit;if(coachBtn){coachBtn.textContent='SELECT ALL RECOMMENDED';coachBtn.onclick=coach}
}
function patchDialog(m,e){
 const dlg=$('amEventSelectionDialog');if(!dlg)return;dlg.__amV2SelectionContext={mailId:m.id,eventId:e.id};
 if(!dlg.__amV2Observer){dlg.__amV2Observer=new MutationObserver(()=>wireDialog(dlg));dlg.__amV2Observer.observe(dlg,{childList:true,subtree:true})}
 wireDialog(dlg);
}
function openManual(m,e){
 if(typeof window.openCompactEventSelection!=='function'){toast('Selection screen is unavailable');return}
 window.openCompactEventSelection(e);patchDialog(m,e);
}
function renderHub(){
 const reader=$('reader'),m=(s?.emails||[]).find(x=>x.id===openMail)||(s?.emails||[]).at?.(-1),e=m?.eventId?(s.events||[]).find(x=>x.id===m.eventId):null;
 if(!reader||!m||!e||m.summitRegistration||m.type!=='selection'||e.id==='olympics'||!['competition','championship'].includes(e.kind))return;
 const submitted=!!m.selectionSubmitted||!!e.decision;if(!submitted&&e.completed)return;
 reader.querySelector('.am-selection-confirmed')?.remove();reader.querySelector('.selection-submitted-banner')?.remove();
 const body=reader.querySelector('.reader-body'),actions=reader.querySelector('.reader-actions');if(!body||!actions)return;
 body.innerHTML=hubHTML(m,e,submitted);
 actions.className='reader-actions am-v2-selection-actions';
 if(submitted){actions.innerHTML='';return}
 actions.innerHTML='<button id="amV2Recommended" class="btn secondary">SELECT ALL RECOMMENDED</button><button id="amV2MakeSelection" class="btn primary">MAKE SELECTION</button>';
 $('amV2Recommended').onclick=()=>submitRecommended(e,m);$('amV2MakeSelection').onclick=()=>openManual(m,e);
}
const style=document.createElement('style');style.id='amSelectionFlowV2Styles';style.textContent=`
.am-v2-selection-mail{display:grid;gap:10px}.am-v2-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#8098a8;font-size:9px}.am-v2-meta strong{color:#dce8ee}.am-v2-coach{border:1px solid #203b4f;border-radius:9px;background:#091a27;overflow:hidden}.am-v2-coach-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid #183447}.am-v2-coach-head small{display:block;color:#7293a7;font-size:7px;font-weight:950;letter-spacing:.1em}.am-v2-coach-head strong{display:block;margin-top:2px;font-size:11px}.am-v2-coach-head>span{font-size:8px;color:#819baa}.am-v2-pointers{display:grid}.am-v2-pointers p{margin:0!important;padding:9px 12px;border-bottom:1px solid #ffffff0b;color:#aabdc8!important;font-size:9px!important;line-height:1.45!important}.am-v2-pointers p:last-child{border-bottom:0}.am-v2-coach-foot{padding:8px 12px;background:#071722;color:#718b9d;font-size:8px}.reader-actions.am-v2-selection-actions{display:grid!important;grid-template-columns:1fr 1fr;gap:8px}.reader-actions.am-v2-selection-actions .btn{width:100%;min-height:41px}.am-v2-made{border:1px solid #315b4b;border-radius:9px;background:#0a1c19;overflow:hidden}.am-v2-made-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #ffffff12}.am-v2-made-head small{display:block;font-size:7px;font-weight:950;letter-spacing:.11em;color:#77aa94}.am-v2-made-head strong{display:block;margin-top:2px;font-size:11px}.am-v2-made-head>span{font-size:17px}.am-v2-made-preview,.am-v2-made-full{display:grid}.am-v2-made-row{display:grid;grid-template-columns:minmax(110px,.65fr) minmax(0,1.35fr);gap:10px;padding:7px 12px;border-bottom:1px solid #ffffff0b;font-size:8px}.am-v2-made-row:last-child{border-bottom:0}.am-v2-made-row strong{color:#d9e8e1}.am-v2-made-row span{color:#91aa9e}.am-v2-made details{border-top:1px solid #ffffff10}.am-v2-made summary{cursor:pointer;padding:8px 12px;color:#7fa995;font-size:7px;font-weight:900;letter-spacing:.06em}.am-v2-made-full{border-top:1px solid #ffffff0b}
@media(max-width:650px){.am-v2-meta{align-items:flex-start;flex-direction:column;gap:3px}.reader-actions.am-v2-selection-actions{grid-template-columns:1fr}.am-v2-made-row{grid-template-columns:1fr;gap:2px}}
`;
document.head.appendChild(style);
const baseDrawReaderV2=drawReader;drawReader=function(){const out=baseDrawReaderV2();setTimeout(renderHub,0);return out};
setTimeout(renderHub,0);
})();
/* ===== End Selection Flow V2 ===== */

if(typeof window.addDevelopmentUpdate==='function')window.addDevelopmentUpdate({
 timestamp:'2026-09-10T10:13:08+01:00',
 date:'10 September 2026',
 title:'Selection Flow Overhaul',
 items:[
  'Selection emails now stay focused on a small number of useful coach pointers instead of presenting a wall of athlete data.',
  'Choose Select All Recommended for the coach-picked team or Make Selection to open the compact event-by-event picker.',
  'Confirming a manual or recommended team returns directly to the original email instead of sending you back to Home.',
  'Submitted emails now show a compact Selection Made panel at the top, with the full team available only when you choose to expand it.'
 ]
});
