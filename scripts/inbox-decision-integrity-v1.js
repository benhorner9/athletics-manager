/* Athletics Manager — Inbox/Decision integrity guards */
(function(){
'use strict';
if(window.__amInboxDecisionIntegrityV1)return;window.__amInboxDecisionIntegrityV1=1;
const $=id=>document.getElementById(id);
const core=window.__athleticsInboxDecisionCore;
if(!core)return;
function mailPos(id){if(!id)return-1;return (s.emails||[]).findIndex(m=>String(m.id)===String(id))}
function dedupe(rows){const map=new Map();for(const row of rows||[]){if(!row?.actionId)continue;const old=map.get(row.actionId);if(!old||Number(row.blocks)>Number(old.blocks)||(Number(row.blocks)===Number(old.blocks)&&mailPos(row.emailId)>mailPos(old.emailId))||(old.emailId==null&&row.emailId!=null))map.set(row.actionId,row)}return [...map.values()].sort((a,b)=>Number(b.blocks)-Number(a.blocks)||Number(a.deadline||999)-Number(b.deadline||999))}
const rawActions=core.getUnresolvedActions.bind(core),rawBlockers=core.getProgressionBlockers.bind(core);
core.getUnresolvedActions=()=>dedupe(rawActions());
core.getProgressionBlockers=()=>dedupe(rawBlockers());
function markSuperseded(){
 const actions=core.getUnresolvedActions(),meta=s?.inboxDecisionSystem?.emailMeta;if(!meta)return;
 for(const action of actions){if(!action.emailId)continue;for(const m of s.emails||[]){if(m.id===action.emailId||m.type!=='selection')continue;const same=action.source==='summit'?!!m.summitRegistration:(m.eventId&&String(m.eventId)===String(action.entityId));if(!same)continue;meta[m.id]??={emailId:m.id};meta[m.id].resolution='completed';meta[m.id].resolutionState='completed';meta[m.id].superseded=true;meta[m.id].blocks=false;meta[m.id].blocksProgress=false}}
}
function syncVisibleCounts(){
 markSuperseded();const actions=core.getUnresolvedActions(),blocks=core.getProgressionBlockers(),advance=$('advanceTop');
 if(blocks.length&&advance){advance.disabled=false;advance.textContent=`${blocks.length} ACTION${blocks.length===1?'':'S'} REQUIRED`;advance.title='Resolve required decisions before advancing'}
 const rail=$('mailBadge');if(rail){rail.textContent=actions.length?String(actions.length):'';rail.classList.toggle('hidden',!actions.length)}
 document.querySelectorAll('#bottomNav .am-action-badge').forEach(x=>{x.textContent=actions.length?String(actions.length):'';x.hidden=!actions.length});
}
const priorAdvance=typeof advanceWeek==='function'?advanceWeek:null;if(priorAdvance)advanceWeek=function(){const g=core.getProgressionBlockers();if(g.length){core.showGate(g);syncVisibleCounts();return false}return priorAdvance.apply(this,arguments)};if($('advanceTop'))$('advanceTop').onclick=()=>advanceWeek();
const priorRender=typeof render==='function'?render:null;if(priorRender)render=function(){const r=priorRender.apply(this,arguments);requestAnimationFrame(syncVisibleCounts);return r};
const priorInbox=typeof drawInbox==='function'?drawInbox:null;if(priorInbox)drawInbox=function(){markSuperseded();const r=priorInbox.apply(this,arguments);requestAnimationFrame(syncVisibleCounts);return r};
// V3 exposes a full "mark all remaining No Entry" action. This guard also makes the single-slot shortcut reliable.
document.addEventListener('click',e=>{const b=e.target?.closest?.('#selectionDecisionV3 .sdv3-noentry:not(.all)');if(!b)return;const api=window.__athleticsExplicitSelectionV3,c=api?.current?.(),disc=document.querySelector('#selectionDecisionV3 [data-disc].on')?.dataset.disc;if(!c||!disc)return;e.preventDefault();e.stopImmediatePropagation();const owner=c.type==='summit'?(typeof summitSeasonState==='function'?summitSeasonState():null):c.event,st=owner?.selectionDecisionV3,slots=st?.slots?.[disc];if(!Array.isArray(slots)||st.locked)return;const i=slots.findIndex(x=>!x?.mode);if(i<0)return;slots[i]={mode:'no_entry',id:null};st.updatedAt=Date.now();try{save()}catch(_){};if(c.type==='summit')window.openSummitSelectionCentre?.();else window.openCompetitionSelectionCentre?.(c.event)},true);
// Keep a single responsibility object in save data so future delegation never needs a second decision architecture.
s.managementResponsibilities??={competitionSelection:'player',training:'staff',scoutingAssignments:'staff',trainingCamps:'player',contracts:'player'};
window.__athleticsDecisionIntegrity={version:1,dedupe,refresh:syncVisibleCounts,responsibilities:()=>s.managementResponsibilities,debug:()=>({actions:core.getUnresolvedActions(),blockers:core.getProgressionBlockers(),superseded:Object.entries(s.inboxDecisionSystem?.emailMeta||{}).filter(([,v])=>v.superseded).map(([id])=>id)})};
markSuperseded();syncVisibleCounts();try{save()}catch(_){}
})();
