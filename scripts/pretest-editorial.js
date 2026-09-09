/* ===== Public Test Editorial + Email Polish ===== */
(function(){
'use strict';
const PRETEST_EDITORIAL_VERSION=1;
const esc=v=>typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'');
function professionalText(value,context='general'){
 let text=String(value??'');
 const replacements=[
  [/elite athletes\s*extraordinary stor(?:y|ies)\.?/gi,''],[/competitive story/gi,'competitive form'],[/the story continues/gi,'career update'],[/current storyline/gi,'career update'],[/storyline/gi,'context'],[/the story is building week by week/gi,'the evidence is building week by week'],[/the story is still being written by selection, preparation and results/gi,'there is no major career development to report yet'],[/closes the first chapter of the rehabilitation story/gi,'marks the end of the first phase of rehabilitation'],[/this is no longer only a development story/gi,'this now carries clear selection value'],[/the call-up is becoming a story/gi,'the call-up is being justified'],[/the pathway decision is beginning to carry real weight/gi,'the latest result supports the pathway decision'],[/it is the kind of result that can change how an athlete is discussed for the rest of the season/gi,'it is a result that will influence future selection'],[/statement win/gi,'notable win'],[/delivers a statement win/gi,'takes a notable win'],[/every appearance now helps decide whether that call-up becomes a lasting place/gi,'each performance will influence future selection'],[/nobody wants to spend too much this early/gi,'the field settles into the opening pace'],[/this is the serious part of the race/gi,'the pace is increasing'],[/the decisive move is made/gi,'the final move is made'],[/championship distance racing rarely follows the form book in a straight line/gi,'championship distance races can be tactical'],[/the clock matters, but so does how the field chooses to get there/gi,'pace and position will both matter'],[/a genuine head-to-head/gi,'a rivalry'],[/genuine olympic-level/gi,'Olympic-level'],[/extraordinary depth and equally extraordinary expectations/gi,'exceptional depth and high expectations']
 ];
 for(const [re,to] of replacements)text=text.replace(re,to);
 text=text.replace(/\s+([,.!?])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n[ \t]+/g,'\n').trim();
 if(context==='medical')text=text.replace(/setback story/gi,'recovery update');
 if(context==='scouting')text=text.replace(/story/gi,'assessment');
 return text;
}
if(typeof editorialCleanSavedText==='function'){const base=editorialCleanSavedText;editorialCleanSavedText=v=>professionalText(base(v),'general')}
if(typeof newMail==='function'){const base=newMail;newMail=function(senderName,subject,body,type,...rest){const ctx=type==='medical'?'medical':type==='scouting'?'scouting':type==='athlete'?'athlete':'general';return base(senderName,professionalText(subject,ctx),professionalText(body,ctx),type,...rest)}}
if(typeof addNews==='function'){const base=addNews;addNews=(category,headline,deck,body,meta)=>base(category,professionalText(headline,'media'),professionalText(deck,'media'),professionalText(body,'media'),meta)}
if(typeof matchdayCommentaryParts==='function'){const base=matchdayCommentaryParts;matchdayCommentaryParts=function(line){const p=base(professionalText(line,'commentary'));if(p&&typeof p.text==='string')p.text=professionalText(p.text,'commentary');return p}}
if(typeof renderMatchdayCommentary==='function'){const base=renderMatchdayCommentary;renderMatchdayCommentary=(el,line)=>base(el,professionalText(line,'commentary'))}
function migrateCopy(){let changed=false;for(const m of s?.emails||[])for(const k of ['subject','body','html'])if(typeof m[k]==='string'){const v=professionalText(m[k],m.type||'general');if(v!==m[k]){m[k]=v;changed=true}}for(const n of s?.news||[])for(const k of ['headline','deck','body'])if(typeof n[k]==='string'){const v=professionalText(n[k],'media');if(v!==n[k]){n[k]=v;changed=true}}if(changed&&typeof save==='function')save()}
function tidyWorldLeads(){const home=document.getElementById('home');if(!home?.classList.contains('on'))return;home.querySelectorAll('[data-home-deck="world"] .dashboard-leads>div>span').forEach(el=>el.classList.add('pretest-world-lead-athlete'))}
function senderInitials(name){return String(name||'AM').replace(/[^A-Za-z0-9 ]/g,' ').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'AM'}
function enhanceEmail(){const root=document.getElementById('inbox');if(!root?.classList.contains('on'))return;const reader=document.getElementById('reader'),m=s?.emails?.find(x=>x.id===openMail)||s?.emails?.at?.(-1);if(!reader||!m)return;reader.classList.add('pretest-email');const head=reader.querySelector('.reader-head');if(!head||head.dataset.pretestMail==='1')return;const recipient=`${nationName(managedNation())} Performance Director`;head.dataset.pretestMail='1';head.innerHTML=`${typeof mailTypeHTML==='function'?mailTypeHTML(m):''}<div class="pretest-email-person"><div class="pretest-email-avatar">${esc(senderInitials(m.sender))}</div><div><small>FROM</small><strong>${esc(m.sender)}</strong><span>to ${esc(recipient)}</span></div><time>Year ${esc(m.year)}<br>Week ${esc(m.week)}</time></div><div class="pretest-email-subject-label">SUBJECT</div><h2>${esc(m.subject)}</h2><div class="pretest-email-meta"><div><small>FROM</small><span>${esc(m.sender)}</span></div><div><small>TO</small><span>${esc(recipient)}</span></div><div><small>DATE</small><span>Year ${esc(m.year)}, Week ${esc(m.week)}</span></div></div>`}
if(typeof drawHome==='function'){const base=drawHome;drawHome=function(){base();queueMicrotask(tidyWorldLeads)}}
if(typeof drawReader==='function'){const base=drawReader;drawReader=function(){base();queueMicrotask(enhanceEmail)}}
migrateCopy();queueMicrotask(()=>{tidyWorldLeads();enhanceEmail()});
window.__athleticsPretestEditorial={version:PRETEST_EDITORIAL_VERSION};
})();
