/* ===== Interface Cleanup ===== */
(function(){
'use strict';
const esc=v=>typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'');
function cleanHome(){
 const root=document.getElementById('home');if(!root?.classList.contains('on'))return;root.classList.add('clean-home');
 root.querySelectorAll('.template-hero-athlete,.flow-hero-eventmark,.template-hero-slogan,.template-hero-actions,.dashboard-event-actions,.template-hero-visual').forEach(x=>x.remove());
 root.querySelectorAll('.template-hero-copy>p').forEach(x=>x.remove());
 const world=root.querySelector('[data-home-deck="world"]');if(world?.querySelector('[data-home-tab="leads"].on'))world.querySelector('.deck-content')?.classList.add('world-leads-active');
}
if(typeof homeDeckContent==='function'){
 const base=homeDeckContent;homeDeckContent=function(group,tab){const html=base(group,tab);return group==='world'&&tab==='leads'?`<div class="clean-world-leads-window">${html}</div>`:html};
}
if(typeof athleticsFormat==='function'){
 const base=athleticsFormat;athleticsFormat=function(e,d,fieldSize=null){const out=base(e,d,fieldSize),distance=Number(DISCIPLINES?.[d]?.distance)||0;let n=Number(fieldSize);if(!Number.isFinite(n)){try{n=buildEventField(e,d).length}catch(_){n=0}}if(DISCIPLINES?.[d]?.type==='time'&&distance>0&&distance<=800&&n>8)return {...out,family:'sprint',label:'HEATS → FINAL',detail:'Fields above eight athletes are split into heats. Eight athletes advance to the final.',stages:['Heats','Final']};return out};
}
try{if(ATHLETE_TRAITS?.lowConfidence)ATHLETE_TRAITS.lowConfidence.rule='Gain after three consecutive competitive performances below the personal-best benchmark. Clear with two performances close to that benchmark, or 26 weeks away from competition.'}catch(_){}
if(typeof traitIcons==='function')traitIcons=function(a){if(a?.retired)return '';const t=typeof activeTraits==='function'?activeTraits(a):[],up=t.some(k=>ATHLETE_TRAITS?.[k]?.positive),down=t.some(k=>ATHLETE_TRAITS?.[k]&&!ATHLETE_TRAITS[k].positive);return `${up?' <span class="trait-arrow trait-up" title="Positive trait">↑</span>':''}${down?' <span class="trait-arrow trait-down" title="Negative trait">↓</span>':''}`};
if(typeof traitsProfileHTML==='function'){const base=traitsProfileHTML;traitsProfileHTML=a=>base(a).replaceAll('👍','<span class="trait-arrow trait-up">↑</span>').replaceAll('👎','<span class="trait-arrow trait-down">↓</span>')}
if(typeof newMail==='function'){const base=newMail;newMail=function(senderName,subject,...rest){return base(senderName,String(subject||'').replace(/^👍\s*/,'↑ ').replace(/^👎\s*/,'↓ '),...rest)}}
if(typeof recordTraitResult==='function'){const base=recordTraitResult;recordTraitResult=function(a,d,perf,key){const out=base(a,d,perf,key),ts=typeof traitState==='function'?traitState(a):null;if(ts?.poor>=3&&!ts.active?.lowConfidence&&typeof changeAthleteTrait==='function')changeAthleteTrait(a,'lowConfidence',true,'Three consecutive competitive performances have been below the personal-best benchmark.');return out}}
function cleanSavedTraits(){for(const m of s?.emails||[])if(typeof m.subject==='string')m.subject=m.subject.replace(/^👍\s*/,'↑ ').replace(/^👎\s*/,'↓ ')}
function cleanCall(line){return String(line||'').replace(/Gavin Potts\s*[—-]\s*/g,'').replace(/We will pick up the important moves as the race develops\.?/gi,'').replace(/We stay with the important moments rather than every jump\.?/gi,'').replace(/The race is beginning to separate\.?/gi,'Gaps are opening.').replace(/This is the decisive part now\.?/gi,'Into the final metres.').replace(/Positions are still changing through the pack\.?/gi,'The order is changing.').replace(/The final move is on\.?/gi,'Final move.').replace(/Countback could matter\.?/gi,'').replace(/A completely different rhythm from the track here\.[^\n]*/gi,'').replace(/\s+([,.])/g,'$1').replace(/\.\s*\./g,'.').replace(/[ \t]{2,}/g,' ').replace(/\n\s+/g,'\n').trim()}
if(typeof matchdayCommentaryParts==='function'){const base=matchdayCommentaryParts;matchdayCommentaryParts=function(line){const p=base(cleanCall(line));if(p&&typeof p.text==='string')p.text=cleanCall(p.text);return p}}
if(typeof matchdayCommentaryHTML==='function'){const base=matchdayCommentaryHTML;matchdayCommentaryHTML=line=>base(cleanCall(line))}
if(typeof renderMatchdayCommentary==='function'){const base=renderMatchdayCommentary;renderMatchdayCommentary=(el,line)=>base(el,cleanCall(line))}
function cleanInbox(){const root=document.getElementById('inbox');if(root?.classList.contains('on'))root.classList.add('clean-inbox')}
function audit(){cleanSavedTraits();cleanHome();cleanInbox()}
if(typeof drawHome==='function'){const base=drawHome;drawHome=function(){base();queueMicrotask(cleanHome)}}
if(typeof drawInbox==='function'){const base=drawInbox;drawInbox=function(){base();queueMicrotask(cleanInbox)}}
if(typeof view==='function'){const base=view;view=function(v){base(v);queueMicrotask(audit)}}
queueMicrotask(audit);
if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Event Day & Interface Cleanup'))UPDATES.unshift({date:'9 September 2026',title:'Event Day & Interface Cleanup',items:['Removed decorative Home slogans, the stray event-level box and redundant event/menu buttons. Event Day still opens automatically when a required meeting is reached.','World Leads now stays inside its Home panel with two events visible at a time and the rest available by scrolling inside the panel.','Track events use heats whenever more than eight athletes need lanes.','High Jump and Shot Put now show each attempt live and update the scoreboard as the competition progresses.','Inbox messages use a dark email layout with clearer headers and larger copy; positive and negative traits use green up and red down arrows.']});
if(typeof renderMenu==='function')renderMenu();
})();
/* ===== End Interface Cleanup ===== */
