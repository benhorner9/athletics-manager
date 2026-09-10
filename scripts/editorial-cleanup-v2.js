/* ===== Athletics Manager Editorial Cleanup V2 ===== */
(function(){
'use strict';
if(window.__amEditorialCleanupV2)return;window.__amEditorialCleanupV2=1;

const UI_EXACT=new Map([
 ['Eligible and available for selection.','Available.'],
 ['Available for the full Summit Series commitment.','Available.'],
 ['Best current balance of performance and readiness.','Best option right now.'],
 ['Performance staff support this Summit commitment.','Staff recommend this selection.'],
 ['No strong automatic recommendation.','No clear recommendation.'],
 ['Another scheduled commitment overlaps this competition.','Schedule conflict.'],
 ['This meeting has an elite-entry requirement.','Elite entry standard not met.'],
 ['The athlete has not met the competition qualification requirement.','Qualification standard not met.'],
 ['The athlete does not currently satisfy this event’s selection rules.','Does not meet this event’s rules.'],
 ['The athlete does not currently satisfy this event\'s selection rules.','Does not meet this event\'s rules.'],
 ['Select a national programme to continue.','Choose a nation.'],
 ['Enter the current Alpha code to unlock career access on this device.','Enter the current Alpha code.'],
 ['Enter the current Closed Alpha code to unlock career access.','Alpha code required.'],
 ['Access granted on this device.','Access granted.'],
 ['Code not recognised. Check the current Alpha code and try again.','Code not recognised.'],
 ['Could not check the code. Reload the game and try again.','Could not check code. Try again.'],
 ['Next staff choice after the enforced withdrawal.','Staff recommendation.']
]);

const HUMAN_REPLACEMENTS=[
 [/elite athletes\s*extraordinary stor(?:y|ies)\.?/gi,''],
 [/competitive story/gi,'competitive form'],
 [/the story continues/gi,'career update'],
 [/current storyline/gi,'current situation'],
 [/storyline/gi,'situation'],
 [/the story is building week by week/gi,'the evidence is building'],
 [/the story is still being written by selection, preparation and results/gi,'there is nothing significant to report yet'],
 [/closes the first chapter of the rehabilitation story/gi,'ends the first phase of rehabilitation'],
 [/this is no longer only a development story/gi,'this now affects selection'],
 [/the call-up is becoming a story/gi,'the call-up is being justified'],
 [/the pathway decision is beginning to carry real weight/gi,'the latest result supports the decision'],
 [/it is the kind of result that can change how an athlete is discussed for the rest of the season/gi,'it will affect future selection'],
 [/statement win/gi,'notable win'],
 [/delivers a statement win/gi,'takes a notable win'],
 [/every appearance now helps decide whether that call-up becomes a lasting place/gi,'each performance affects future selection'],
 [/a genuine head-to-head/gi,'a head-to-head'],
 [/genuine olympic-level/gi,'Olympic-level'],
 [/extraordinary depth and equally extraordinary expectations/gi,'strong depth and high expectations'],
 [/remains the stronger headline option/gi,'is still the stronger athlete'],
 [/protecting freshness here is a genuine option/gi,'resting them here is worth considering'],
 [/the staff recommendation already factors that into this selection\.?/gi,''],
 [/this is a new selection battle without much previous selection history\.?/gi,'Little separates them so far.'],
 [/in a very close call/gi,'in a close call'],
 [/owns the stronger season mark/gi,'has the better season mark'],
 [/would give ([^.!?]+) the opportunity here/gi,'prefers $1 here'],
 [/gives the programme a sensible chance to protect ([^.!?]+) without a major drop in current level/gi,'lets $1 rest without giving up much'],
 [/the unaffected selections remain in place\. Open the Selection Centre to accept the recommended replacement, choose another athlete or leave the event empty\./gi,'The rest of your team is unchanged. Open Selection Centre to replace them or leave the event empty.'],
 [/rather than generic flavour text/gi,''],
 [/a sensible chance/gi,'a chance'],
 [/genuine option/gi,'option'],
 [/genuine selection battle/gi,'selection battle'],
 [/strategically sensible/gi,'sensible'],
 [/clear selection value/gi,'selection value'],
 [/meaningful selection/gi,'selection'],
 [/meaningful difference/gi,'difference']
];

function normalise(text){return String(text??'').replace(/\s+([,.!?])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
function cleanHuman(value,context='general'){
 let text=String(value??'');
 for(const [re,to] of HUMAN_REPLACEMENTS)text=text.replace(re,to);
 if(context==='medical')text=text.replace(/setback story/gi,'recovery update');
 if(context==='scouting')text=text.replace(/\bstory\b/gi,'assessment');
 return normalise(text);
}
function cleanUI(value){
 let text=String(value??'');
 const exact=UI_EXACT.get(text.trim());
 if(exact!==undefined)return exact;
 text=text
  .replace(/\bcurrently selected\b/gi,'selected')
  .replace(/\bcurrently available\b/gi,'available')
  .replace(/\bcurrently unavailable\b/gi,'unavailable')
  .replace(/\bin order to\b/gi,'to')
  .replace(/\bplease note that\b/gi,'')
  .replace(/\bit is important to note that\b/gi,'')
  .replace(/\bthis means that\b/gi,'')
  .replace(/\bthe player can\b/gi,'you can');
 return normalise(text);
}

function cleanSavedCopy(){
 let changed=false;
 for(const m of s?.emails||[]){
  const ctx=m.type==='medical'?'medical':m.type==='scouting'?'scouting':m.type==='athlete'?'athlete':'general';
  for(const key of ['subject','body'])if(typeof m[key]==='string'){
   const v=cleanHuman(m[key],ctx);if(v!==m[key]){m[key]=v;changed=true}
  }
 }
 for(const n of s?.news||[])for(const key of ['headline','deck','body'])if(typeof n[key]==='string'){
  const v=cleanHuman(n[key],'media');if(v!==n[key]){n[key]=v;changed=true}
 }
 if(changed&&typeof save==='function')try{save()}catch(_){}
}

if(typeof newMail==='function'&&!newMail.__editorialV2){
 const base=newMail;
 const fn=function(senderName,subject,body,type,...rest){const ctx=type==='medical'?'medical':type==='scouting'?'scouting':type==='athlete'?'athlete':'general';return base(senderName,cleanHuman(subject,ctx),cleanHuman(body,ctx),type,...rest)};
 fn.__editorialV2=true;newMail=fn;
}
if(typeof addNews==='function'&&!addNews.__editorialV2){
 const base=addNews;
 const fn=(category,headline,deck,body,meta)=>base(category,cleanHuman(headline,'media'),cleanHuman(deck,'media'),cleanHuman(body,'media'),meta);
 fn.__editorialV2=true;addNews=fn;
}
if(typeof renderMatchdayCommentary==='function'&&!renderMatchdayCommentary.__editorialV2){
 const base=renderMatchdayCommentary;
 const fn=(el,line)=>base(el,cleanHuman(line,'commentary'));fn.__editorialV2=true;renderMatchdayCommentary=fn;
}
if(typeof matchdayCommentaryParts==='function'&&!matchdayCommentaryParts.__editorialV2){
 const base=matchdayCommentaryParts;
 const fn=function(line){const p=base(cleanHuman(line,'commentary'));if(p&&typeof p.text==='string')p.text=cleanHuman(p.text,'commentary');return p};fn.__editorialV2=true;matchdayCommentaryParts=fn;
}

/* First-day copy: concise management language, no trailer narration. */
if(typeof drawFirstDay==='function'&&!drawFirstDay.__editorialV2){
 const base=drawFirstDay;
 const fn=function(){
  const out=base.apply(this,arguments),root=document.getElementById('firstDay'),step=s?.induction?.step;
  if(!root)return out;
  if(step==='arrival'){
   const h1=root.querySelector('.firstday-opening h1'),lead=root.querySelector('.firstday-opening .firstday-lead'),callout=root.querySelector('.firstday-opening .firstday-callout');
   if(h1)h1.textContent="You're in charge.";
   if(lead)lead.textContent=`You now run ${typeof nationName==='function'?nationName(managedNation()):'the nation'}'s senior athletics programme.`;
   if(callout){const b=callout.querySelector('b'),span=callout.querySelector('span');if(b)b.textContent='First priorities';if(span)span.textContent='Set training, assess the squad and make your first selections.'}
  }else if(step==='people'){
   const lead=root.querySelector('.firstday-lead');if(lead)lead.textContent='Meet an established athlete, a National Pool prospect and an international benchmark.';
  }else if(step==='decision'){
   const lead=root.querySelector('.firstday-lead');if(lead)lead.textContent='Choose the Week 1 training instruction and scouting focus. You can change both later.';
  }
  return out;
 };
 fn.__editorialV2=true;drawFirstDay=fn;
}
if(typeof openingArcReportHTML==='function'&&!openingArcReportHTML.__editorialV2){
 const base=openingArcReportHTML;
 const fn=function(){return String(base.apply(this,arguments))
  .replace(/<p class="muted" style="line-height:1\.65">The opening chapter follows the first decisions that matter\. You can leave it at any time and manage the programme normally\.<\/p>/,'')
  .replace(/Meet the programme and set the opening plan\./g,'Take charge.')
  .replace(/See how the squad responded before changing the load\./g,'Review training response.')
  .replace(/Week \d+ puts senior and National Pool sprinters on the same clock\./g,'Senior squad vs National Pool.')
  .replace(/Use the test as evidence, not an automatic promotion\./g,'Review the squad after testing.')};
 fn.__editorialV2=true;openingArcReportHTML=fn;
}

function cleanStatic(){
 const menuDesc=document.querySelector('.menu-desc');if(menuDesc)menuDesc.textContent='Lead a national athletics programme through ten Olympic cycles.';
 const nationLead=document.querySelector('#nationModal .nation-head p');if(nationLead)nationLead.textContent='Choose a national programme. Your first contract runs to the next Olympic Games.';
 const nationSelected=document.getElementById('nationSelected');if(nationSelected&&/select a national programme/i.test(nationSelected.textContent||''))nationSelected.textContent='Choose a nation.';
 const search=document.getElementById('peopleSearch');if(search)search.placeholder='Search people…';
 const alpha=document.querySelector('#alphaAccessForm > p');if(alpha)alpha.textContent='Enter the current Alpha code.';
}

function cleanRendered(root=document.body){
 if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){
  const p=n.parentElement;if(!p||p.closest('script,style,textarea,input'))return NodeFilter.FILTER_REJECT;
  if(p.closest('.reader-body,.v3line,.commentary,.news-body,.social-post'))return NodeFilter.FILTER_REJECT;
  return NodeFilter.FILTER_ACCEPT;
 }});
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){
  const raw=node.nodeValue;if(!raw||!raw.trim())continue;
  const p=node.parentElement,character=p?.closest('#amSelectionCentreV2,.selection-brief,.sci-insight-stack,.latest-update');
  let cleaned=cleanUI(raw);if(character)cleaned=cleanHuman(cleaned,character.closest('.latest-update')?'release':'staff');
  if(cleaned&&cleaned!==raw.trim())node.nodeValue=raw.replace(raw.trim(),cleaned);
 }
}

cleanStatic();cleanSavedCopy();cleanRendered();
let queued=false;
new MutationObserver(records=>{
 if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;cleanStatic();for(const r of records)for(const n of r.addedNodes||[])if(n.nodeType===1)cleanRendered(n);});
}).observe(document.body,{childList:true,subtree:true});

window.__athleticsEditorial={version:2,cleanHuman,cleanUI};
})();
/* ===== End Athletics Manager Editorial Cleanup V2 ===== */
