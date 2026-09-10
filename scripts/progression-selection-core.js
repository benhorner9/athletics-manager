/* ===== Progression + Urgent Selection Core ===== */
(function(){
'use strict';
if(window.__amProgressionSelectionCore)return;window.__amProgressionSelectionCore=1;
const $=id=>document.getElementById(id),esc=v=>typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'');

/* Presentation errors must never stop competition progression. */
if(typeof renderMatchdayCommentary==='function'){
 const base=renderMatchdayCommentary;
 renderMatchdayCommentary=function(el,line){try{return base(el,line)}catch(err){console.warn('Commentary render recovered',err);try{if(el){const p=String(line||'').split('\n');el.innerHTML=`<div class="template-commentary-line latest"><small>${esc(p.shift()||'LIVE')}</small><p>${esc(p.join(' ')||String(line||''))}</p></div>`}}catch(_){}return null}}
}
const baseScoreSync=window.__athleticsLiveScoreboardSync;
window.__athleticsLiveScoreboardSync=function(){try{return baseScoreSync?.()}catch(err){console.warn('Scoreboard update recovered',err);return false}};

/* Watch the actual authoritative playback state, not commentary timing. */
let lastSig='',lastMove=performance.now();
function playbackSig(){
 if(!disciplineRunning||!liveEventView)return '';
 if(liveEventView.trackCoreV5){const t=liveEventView.trackCoreV5;return `t5:${t.stageIndex||0}:${Math.round((Number(t.local)||0)*1000)}:${liveEventView.lines?.length||0}`}
 if(liveEventView.fd){const f=liveEventView.fd,c=f.c||f.last;return `f:${c?.athleteId||''}:${c?.attempt||0}:${c?.height||0}:${c?.outcome||''}:${liveEventView.lines?.length||0}:${f.done?1:0}`}
 return `x:${liveEventView.lines?.length||0}`
}
function emergencyFinish(){
 const v=liveEventView,e=v?.event,d=v?.disc,rows=v?.results;if(!disciplineRunning||!e||!d||!Array.isArray(rows))return;
 try{commitDisciplineResults(e,d,rows);save()}catch(err){console.warn('Playback recovery commit failed',err);return}
 try{v.trackCoreV5?.raf&&cancelAnimationFrame(v.trackCoreV5.raf);v.trackCoreV5?.timer&&clearTimeout(v.trackCoreV5.timer)}catch(_){}
 disciplineRunning=false;liveEventView=null;activeEventDisc=d;competitionMode='discipline';
 try{const discs=(e.disc||[]).filter(x=>x!=='ALL');if(discs.length&&discs.every(x=>Array.isArray(e.results?.[x])))finaliseEvent(e,false);else drawCompetition()}catch(err){console.warn('Playback recovery redraw failed',err)}
 try{toast(`${discLabel(d)} playback recovered — result saved`)}catch(_){}
}
setInterval(()=>{const sig=playbackSig(),now=performance.now();if(!sig){lastSig='';lastMove=now;return}if(sig!==lastSig){lastSig=sig;lastMove=now;return}if(now-lastMove>6500){lastMove=now;emergencyFinish()}},500);

/* Selection emails are blocking decisions until explicitly answered. */
const css=document.createElement('style');css.textContent=`.mailitem.am-selection-urgent{border-left:3px solid #ff6b72!important;background:linear-gradient(90deg,rgba(150,35,45,.20),rgba(8,24,36,.96))!important}.mailitem.am-selection-urgent .subject:before{content:'URGENT · ';color:#ff8b91;font-weight:950}.am-urgent-selection{margin:0;padding:12px 16px;background:#431a20;border-bottom:1px solid #87323c;color:#ffd9dc}.am-urgent-selection small{display:block;color:#ff949b;font-size:9px;font-weight:950;letter-spacing:.11em}.am-urgent-selection strong{display:block;margin-top:3px;font-size:14px}.am-hotfix-confirmed{padding:14px 16px;background:#0b2c25;border-bottom:1px solid #286454}.am-hotfix-confirmed small{display:block;color:#8fe1b9;font-size:9px;font-weight:950;letter-spacing:.1em}.am-hotfix-confirmed strong{display:block;margin-top:3px}.am-hotfix-confirmed-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:9px}.am-hotfix-confirmed-grid div{background:#071d1a;border:1px solid #25584c;border-radius:7px;padding:8px}.am-hotfix-confirmed-grid span{display:block;color:#7ea89d;font-size:8px;text-transform:uppercase}.am-hotfix-confirmed-grid b{font-size:11px;line-height:1.35}@media(max-width:700px){.am-hotfix-confirmed-grid{grid-template-columns:1fr}}`;document.head.appendChild(css);
function summitLocked(){try{return !!summitSeasonState()?.registrationLocked}catch(_){return false}}
function pendingSelectionMail(){return [...(s?.emails||[])].reverse().find(m=>{if(m?.type!=='selection'||m.selectionSubmitted)return false;if(m.summitRegistration){try{return !summitLocked()&&(!summitRegistrationOpen||summitRegistrationOpen())}catch(_){return !summitLocked()}}const e=m.eventId?(s.events||[]).find(x=>x.id===m.eventId):null;return !!e&&!e.completed&&!e.decision&&e.id!=='olympics'&&['competition','championship'].includes(e.kind)&&Number(e.week)>=Number(s.game.week)})||null}
function snapshot(e){return (e?.disc||[]).filter(d=>d!=='ALL').map(d=>({disc:d,names:(e.entries?.[d]||[]).map(id=>(s.athletes||[]).find(a=>a.id===id)?.name).filter(Boolean)}))}
function lockManual(m,e){e.decision=true;m.selectionSubmitted=true;m.selectionSubmittedLabel='Selection confirmed';m.selectionSubmittedSource='player';m.selectionSubmittedSnapshot=snapshot(e);m.unread=false;save();syncMailBadge?.();try{toast('Selection confirmed and locked')}catch(_){}drawReader()}
function confirmedHTML(m){const q=m.selectionSubmittedSnapshot||[];return `<div class="am-hotfix-confirmed"><small>SELECTION CONFIRMED</small><strong>${esc(m.selectionSubmittedLabel||'Team submitted')}</strong><div class="am-hotfix-confirmed-grid">${q.map(x=>`<div><span>${esc(typeof discLabel==='function'?discLabel(x.disc):x.disc)}</span><b>${esc((x.names||[]).join(', ')||'No athlete selected')}</b></div>`).join('')}</div></div>`}
function enhanceInbox(){const root=$('inbox');if(!root)return;for(const m of s.emails||[]){const item=root.querySelector(`[data-open="${CSS.escape(String(m.id))}"]`);if(item)item.classList.toggle('am-selection-urgent',!!(m.type==='selection'&&!m.selectionSubmitted&&(m.summitRegistration?!summitLocked():!s.events.find(e=>e.id===m.eventId)?.decision)))}}
function enhanceReader(){const r=$('reader'),m=(s?.emails||[]).find(x=>x.id===openMail)||(s?.emails||[]).at(-1);if(!r||!m||m.type!=='selection')return;r.querySelectorAll('.am-urgent-selection,.am-hotfix-confirmed').forEach(x=>x.remove());const head=r.querySelector('.reader-head');if(m.selectionSubmitted){head?.insertAdjacentHTML('afterend',confirmedHTML(m));return}head?.insertAdjacentHTML('afterend','<div class="am-urgent-selection"><small>URGENT · RESPONSE REQUIRED</small><strong>Selection must be confirmed before the season can advance.</strong></div>');const e=m.eventId?(s.events||[]).find(x=>x.id===m.eventId):null,btn=$('confirmSelection');if(btn&&e&&!e.completed&&!e.decision){btn.disabled=false;btn.textContent='CONFIRM & LOCK SELECTION';btn.onclick=()=>lockManual(m,e)}}
if(typeof drawInbox==='function'){const base=drawInbox;drawInbox=function(){const out=base();queueMicrotask(()=>{enhanceInbox();enhanceReader()});return out}}
if(typeof drawReader==='function'){const base=drawReader;drawReader=function(){const out=base();queueMicrotask(enhanceReader);return out}}
if(typeof advanceWeek==='function'){const base=advanceWeek;advanceWeek=function(){const m=pendingSelectionMail();if(m){m.unread=true;openMail=m.id;save();try{toast('Selection response required before advancing')}catch(_){}view('inbox');return}return base()}}
queueMicrotask(()=>{enhanceInbox();enhanceReader()});
})();
/* ===== End Progression + Urgent Selection Core ===== */