/* Athletics Manager — AAA Text, Language & Narrative Systems V1
   Central authority for player-facing language, editorial QA and localisation-safe helpers.
   Gameplay systems own facts. This layer only controls how known facts are communicated. */
(function(){
'use strict';
if(window.__amLanguageSystemV1)return;window.__amLanguageSystemV1=1;

const STRINGS=Object.freeze({
 'ui.advance_week':'Advance Week',
 'ui.start_event':'Start Event',
 'ui.submit_team':'Submit Team',
 'ui.add_watchlist':'Add to Watchlist',
 'ui.book_camp':'Book Camp',
 'ui.decline_entry':'Decline Entry',
 'ui.replace_athlete':'Replace Athlete',
 'ui.try_again':'Try Again',
 'ui.mark_all_read':'Mark All Read',
 'inbox.empty.title':'No Messages Here',
 'inbox.empty.body':'Try another filter or clear your search.',
 'error.selection.title':'Team Could Not Be Submitted',
 'error.selection.body':'Your selection is still saved.',
 'empty.watchlist.title':'No Athletes on Your Watchlist',
 'empty.watchlist.body':'Add athletes from scout reports or the National Pool.'
});

const VOICES=Object.freeze({
 headCoach:Object.freeze({tone:'direct, practical, performance-focused',formality:'medium',focus:'selection, readiness, performance',avoid:['corporate filler','false certainty','rating jargon']}),
 specialistCoach:Object.freeze({tone:'specific, technical without jargon overload',formality:'medium',focus:'event-specific performance detail',avoid:['generic praise','stat dumps']}),
 scout:Object.freeze({tone:'observational, evidence-led, comfortable with uncertainty',formality:'medium',focus:'what was seen, confidence, recommendation',avoid:['guaranteed potential','prospect clichés']}),
 medical:Object.freeze({tone:'calm, precise, restrained',formality:'high',focus:'diagnosis, expected absence, restrictions, next step',avoid:['sensationalism','apologies','false certainty']}),
 federation:Object.freeze({tone:'formal, concise, authoritative',formality:'high',focus:'requirements, reviews, targets, decisions',avoid:['press-release enthusiasm','padding']}),
 finance:Object.freeze({tone:'factual, numerical, concise',formality:'medium',focus:'cost, budget effect, commitment',avoid:['motivational filler','vague value claims']}),
 commentator:Object.freeze({name:'Gavin Potts',tone:'knowledgeable, observant, restrained until the moment earns more',formality:'broadcast',focus:'result-changing moments, records, context',avoid:['pixel narration','constant hype','thesaurus variation']}),
 news:Object.freeze({tone:'sports journalism, factual first',formality:'medium',focus:'result, significance, context',avoid:['press-release copy','unsupported drama']}),
 social:Object.freeze({tone:'short, plausible public reaction',formality:'low',focus:'actual world events',avoid:['forced memes','manufactured controversy']})
});

const TERMS=Object.freeze({
 athlete:'Athlete',squad:'Squad',nationalPool:'National Pool',callUp:'Call-Up',demote:'Demote',selection:'Selection',entry:'Entry',competition:'Competition',event:'Event',meeting:'Meeting',trainingCamp:'Training Camp',readiness:'Readiness',fatigue:'Fatigue',form:'Form',potential:'Potential',ovr:'OVR',seasonBest:'Season Best',personalBest:'Personal Best',nationalRecord:'National Record',championshipRecord:'Championship Record',worldRecord:'World Record'
});

const FILLER_RULES=[
 [/\bit is worth noting that\b\s*/gi,''],
 [/\bit is important to remember that\b\s*/gi,''],
 [/\bit is important to note that\b\s*/gi,''],
 [/\bit should be noted that\b\s*/gi,''],
 [/\bwe wanted to let you know that\b\s*/gi,''],
 [/\bwe wanted to let you know\b\s*/gi,''],
 [/\bwe are pleased to announce that\b\s*/gi,''],
 [/\bwe are pleased to announce\b\s*/gi,''],
 [/\bwe are delighted to inform you that\b\s*/gi,''],
 [/\bwe are delighted to inform you\b\s*/gi,''],
 [/\bwith that being said,?\s*/gi,''],
 [/\bgoing forward,?\s*/gi,''],
 [/\bin conclusion,?\s*/gi,''],
 [/\bplease note that\b\s*/gi,''],
 [/\bin order to\b/gi,'to'],
 [/\bmay potentially\b/gi,'may'],
 [/\bcould potentially\b/gi,'could'],
 [/\bcurrently available\b/gi,'available'],
 [/\bcurrently unavailable\b/gi,'unavailable'],
 [/\bcurrently selected\b/gi,'selected'],
 [/\bhas demonstrated an impressive performance\b/gi,'performed well'],
 [/\bhas demonstrated strong levels of performance\b/gi,'has performed well'],
 [/\bshowcased (?:his|her|their) abilities exceptionally well\b/gi,'performed well'],
 [/\bshowcased (?:his|her|their) ability\b/gi,'performed well'],
 [/\bexciting young prospect with a bright future\b/gi,'young prospect'],
 [/\bexcellent opportunity\b/gi,'opportunity']
];

const ROLE_RULES=Object.freeze({
 medical:[
  [/^unfortunately[,\s-]*/i,''],
  [/\bwe are sorry to inform you that\b\s*/gi,''],
  [/\bwe regret to inform you that\b\s*/gi,'']
 ],
 scouting:[
  [/\bpromising prospect with a bright future\b/gi,'prospect'],
  [/\bcould become an important athlete for the national programme in the future\b/gi,'could develop into a squad option']
 ],
 finance:[
  [/\bexciting opportunity\b/gi,'option'],
  [/\bexcellent value\b/gi,'value']
 ],
 commentary:[
  [/\bis running very strongly now\b/gi,'is closing strongly'],
  [/\bdemonstrating (?:his|her|their) impressive speed\b/gi,'closing quickly'],
  [/\bas (?:he|she|they) begins? to make progress towards the other competitors\b/gi,'']
 ],
 media:[
  [/\bin an extraordinary display of athletic prowess,?\s*/gi,''],
  [/\ban extraordinary display of athletic prowess\b/gi,'the performance']
 ]
});

const EXACT_UI=new Map([
 ['Proceed','Continue'],
 ['Confirm Action','Confirm'],
 ['Continue Process','Continue'],
 ['Submit Choice','Submit'],
 ['Click Here','Open'],
 ['Something went wrong.','The action could not be completed.'],
 ['No data.','Nothing to show yet.'],
 ['No data','Nothing to show yet'],
 ['Error processing selection.','Team could not be submitted.'],
 ['Mark all read','Mark All Read']
]);

const GENERIC_SUBJECTS=new Set(['important update','new information','action needed','update','information','notification']);
const BROKEN_TOKEN_RE=/(\bundefined\b|\bnull\b|\bNaN\b|\[object Object\]|\{\{[^}]+\}\}|\$\{[^}]+\})/i;
const FILLER_TEST_RE=/(it is worth noting that|it is important to remember that|we are pleased to announce|we wanted to let you know|with that being said|going forward|in conclusion|showcased (his|her|their) ability|demonstrated strong performance)/i;

function str(v){return String(v??'')}
function normaliseWhitespace(v){return str(v).replace(/\s+([,.!?;:])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
function sentenceCaseStart(v){const x=str(v);return x?x[0].toUpperCase()+x.slice(1):x}
function contextFor(sender='',type=''){
 const hay=`${sender} ${type}`.toLowerCase();
 if(/medical|physio|doctor|rehab|injur/.test(hay))return'medical';
 if(/scout|scouting/.test(hay))return'scouting';
 if(/finance|financial|budget/.test(hay))return'finance';
 if(/federation|board|governance/.test(hay))return'federation';
 if(/news|media|press|world/.test(hay))return'media';
 if(/social/.test(hay))return'social';
 if(/comment|gavin|broadcast/.test(hay))return'commentary';
 if(/coach|performance|training/.test(hay))return'coach';
 return'general'
}
function dedupeSentences(text){
 const parts=str(text).split(/(?<=[.!?])\s+/),seen=new Set(),out=[];
 for(const p of parts){const key=p.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();if(key&&seen.has(key))continue;if(key)seen.add(key);out.push(p)}
 return out.join(' ')
}
function cleanProse(value,context='general'){
 const original=normaliseWhitespace(str(value));let text=original;if(!text)return text;
 for(const [re,to] of FILLER_RULES)text=text.replace(re,to);
 for(const [re,to] of ROLE_RULES[context]||[])text=text.replace(re,to);
 text=text
  .replace(/\bvery unique\b/gi,'unique')
  .replace(/\bcompletely unanimous\b/gi,'unanimous')
  .replace(/\bthe fact that\b/gi,'that')
  .replace(/\bdue to the fact that\b/gi,'because');
 text=dedupeSentences(normaliseWhitespace(text));
 if(context==='medical'||context==='finance'||context==='federation')text=text.replace(/!{2,}/g,'!').replace(/!\s*$/,'');
 text=normaliseWhitespace(text);
 if(text===original)return original;
 return /^[a-z]/.test(text)?sentenceCaseStart(text):text
}
function cleanSubject(value){return normaliseWhitespace(str(value).replace(/^\s*(?:important\s+)?update\s*[:\-–—]\s*/i,'').replace(/^\s*new information\s*[:\-–—]\s*/i,''))||str(value).trim()}
function t(id,vars={}){let out=STRINGS[id]??id;for(const [k,v] of Object.entries(vars))out=out.replace(new RegExp(`\\{${k}\\}`,'g'),str(v));return out}
function plural(n,one,many=`${one}s`){return Number(n)===1?one:many}
function weekRange(min,max){const a=Number(min),b=Number(max);if(!Number.isFinite(a)&&!Number.isFinite(b))return'';if(Number.isFinite(a)&&Number.isFinite(b)&&a!==b)return`${a}–${b} ${plural(b,'week')}`;const n=Number.isFinite(a)?a:b;return`${n} ${plural(n,'week')}`}
function moneyGBP(v){const n=Number(v);return Number.isFinite(n)?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n):'—'}
function percent(v){const n=Number(v);return Number.isFinite(n)?`${Math.round(n)}%`:'—'}
function metres(v,dp=2){const n=Number(v);return Number.isFinite(n)?`${n.toFixed(dp)}m`:'—'}
function wind(v){const n=Number(v);return Number.isFinite(n)?`${n>=0?'+':''}${n.toFixed(1)} m/s`:'—'}
function ordinal(n){const x=Math.abs(Number(n));if(!Number.isFinite(x))return'';const mod100=x%100;if(mod100>=11&&mod100<=13)return`${x}th`;return`${x}${({1:'st',2:'nd',3:'rd'})[x%10]||'th'}`}

function composeMedicalInjury(data={}){
 const athlete=normaliseWhitespace(data.athlete||data.name),diagnosis=normaliseWhitespace(data.diagnosis||data.injury),range=weekRange(data.weeksMin??data.minWeeks,data.weeksMax??data.maxWeeks),parts=[];
 if(athlete&&diagnosis)parts.push(`Medical staff have diagnosed ${athlete} with ${diagnosis}.`);
 else if(diagnosis)parts.push(`Diagnosis: ${diagnosis}.`);
 if(range)parts.push(`Expected absence: ${range}.`);
 if(data.restriction)parts.push(cleanProse(data.restriction,'medical'));
 if(data.nextStep)parts.push(cleanProse(data.nextStep,'medical'));
 return normaliseWhitespace(parts.join(' '))
}
function composeFinanceCost(data={}){
 const item=normaliseWhitespace(data.item||data.name),cost=moneyGBP(data.cost),remaining=moneyGBP(data.remainingBudget),parts=[];
 if(item&&Number.isFinite(Number(data.cost)))parts.push(`${item} will cost ${cost}.`);
 if(Number.isFinite(Number(data.remainingBudget)))parts.push(`That leaves ${remaining} in the budget.`);
 return parts.join(' ')
}
function composeRecordMoment(data={}){
 const athlete=normaliseWhitespace(data.athlete||data.name),code=str(data.record||data.code).toUpperCase(),performance=normaliseWhitespace(data.performance||data.mark),map={WR:'world record',NR:'national record',CR:'championship record',PB:'personal best',SB:'season best'};
 if(!athlete||!map[code])return'';
 return performance?`${athlete} — ${map[code]} with ${performance}.`:`${athlete} sets a ${map[code]}.`
}

function cleanMail(m){
 if(!m||typeof m!=='object')return false;let changed=false;const ctx=contextFor(m.sender,m.type);
 if(typeof m.subject==='string'){const v=cleanSubject(m.subject);if(v!==m.subject){m.subject=v;changed=true}}
 if(typeof m.body==='string'){const v=cleanProse(m.body,ctx);if(v!==m.body){m.body=v;changed=true}}
 return changed
}
function cleanNews(n){
 if(!n||typeof n!=='object')return false;let changed=false;
 for(const key of ['headline','deck','body'])if(typeof n[key]==='string'){const v=key==='headline'?cleanSubject(cleanProse(n[key],'media')):cleanProse(n[key],'media');if(v!==n[key]){n[key]=v;changed=true}}
 return changed
}
function saveSafe(){try{if(typeof save==='function')save()}catch(_){}}
function cleanExistingState(){
 let changed=false;
 try{for(const m of s?.emails||[])changed=cleanMail(m)||changed;for(const n of s?.news||[])changed=cleanNews(n)||changed}catch(_){}
 if(changed)saveSafe();return changed
}

function patchFactories(){
 if(typeof newMail==='function'&&!newMail.__amLanguageV1){
  const base=newMail;
  const fn=function(sender,subject,body,type,...rest){const ctx=contextFor(sender,type);return base(sender,cleanSubject(subject),cleanProse(body,ctx),type,...rest)};
  fn.__amLanguageV1=true;newMail=fn
 }
 if(typeof addNews==='function'&&!addNews.__amLanguageV1){
  const base=addNews;
  const fn=function(category,headline,deck,body,meta){return base(category,cleanSubject(cleanProse(headline,'media')),cleanProse(deck,'media'),cleanProse(body,'media'),meta)};
  fn.__amLanguageV1=true;addNews=fn
 }
 if(typeof renderMatchdayCommentary==='function'&&!renderMatchdayCommentary.__amLanguageV1){
  const base=renderMatchdayCommentary;
  const fn=function(el,line,...rest){return base(el,cleanProse(line,'commentary'),...rest)};
  fn.__amLanguageV1=true;renderMatchdayCommentary=fn
 }
 if(typeof matchdayCommentaryParts==='function'&&!matchdayCommentaryParts.__amLanguageV1){
  const base=matchdayCommentaryParts;
  const fn=function(line,...rest){const out=base(cleanProse(line,'commentary'),...rest);if(out&&typeof out.text==='string')out.text=cleanProse(out.text,'commentary');return out};
  fn.__amLanguageV1=true;matchdayCommentaryParts=fn
 }
}

function cleanTextNode(node){
 if(!node||node.nodeType!==3)return;
 const parent=node.parentElement;if(!parent||parent.closest('script,style,textarea,code,pre'))return;
 if(parent.closest('.reader-body,.amv2-reader-body,.v3line,.commentary,.news-body,.social-post'))return;
 const raw=node.nodeValue,trim=raw?.trim();if(!trim)return;
 const exact=EXACT_UI.get(trim);let cleaned=exact??cleanProse(trim,'general');
 if(cleaned&&cleaned!==trim)node.nodeValue=raw.replace(trim,cleaned)
}
function cleanRendered(root=document.body){
 if(!root)return;
 if(root.nodeType===3){cleanTextNode(root);return}
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(cleanTextNode)
}
function cleanStaticControls(){
 document.querySelectorAll('button').forEach(btn=>{const raw=(btn.textContent||'').trim(),replacement=EXACT_UI.get(raw);if(replacement&&replacement!==raw&&btn.children.length===0)btn.textContent=replacement});
 const advance=document.getElementById('advanceTop');if(advance&&/advance week/i.test(advance.textContent||''))advance.textContent=t('ui.advance_week').toUpperCase();
}

function issue(list,category,system,detail,meta={}){list.push({category,system,detail,...meta})}
function auditMail(list,m,index){
 const subject=str(m?.subject).trim(),body=str(m?.body).replace(/<[^>]+>/g,' ').trim(),id=m?.id??index;
 if(GENERIC_SUBJECTS.has(subject.toLowerCase()))issue(list,'UNCLEAR_ACTION','Inbox',`Generic subject: “${subject}”`,{id});
 if(BROKEN_TOKEN_RE.test(`${subject} ${body}`))issue(list,'BROKEN_VARIABLE','Inbox','Broken dynamic value is visible',{id});
 if(FILLER_TEST_RE.test(body))issue(list,'TONE','Inbox','AI-style filler phrase detected',{id});
 const words=body.split(/\s+/).filter(Boolean).length;if(words>140)issue(list,'COGNITIVE_LOAD','Inbox',`Long email (${words} words)`,{id});
 if(/\b1\s+(athletes|weeks|medals|events|attempts)\b/i.test(body))issue(list,'GRAMMAR','Inbox','Singular/plural mismatch',{id})
}
function auditNews(list,n,index){
 const text=`${n?.headline||''} ${n?.deck||''} ${n?.body||''}`;
 if(BROKEN_TOKEN_RE.test(text))issue(list,'BROKEN_VARIABLE','World News','Broken dynamic value is visible',{id:n?.id??index});
 if(FILLER_TEST_RE.test(text))issue(list,'TONE','World News','Press-release or AI-style filler detected',{id:n?.id??index})
}
function auditDom(list){
 document.querySelectorAll('button').forEach((b,i)=>{const x=(b.textContent||'').trim();if(/^(proceed|confirm action|continue process|submit choice|click here)$/i.test(x))issue(list,'UNCLEAR_ACTION','UI',`Vague button label: “${x}”`,{id:b.id||`button-${i}`})});
 const text=(document.body?.innerText||'').slice(0,250000);if(BROKEN_TOKEN_RE.test(text))issue(list,'BROKEN_VARIABLE','UI','A broken dynamic value is visible on the current screen')
}
function repetitionIssues(list,items,system){
 const seen=new Map();for(const x of items){const key=normaliseWhitespace(str(x)).toLowerCase();if(key.length<20)continue;seen.set(key,(seen.get(key)||0)+1)}
 for(const [key,count] of seen)if(count>=3)issue(list,'REPETITION',system,`Same line appears ${count} times`,{sample:key.slice(0,120)})
}
function audit(){
 const issues=[];let emails=[],news=[];
 try{emails=s?.emails||[];news=s?.news||[]}catch(_){}
 emails.forEach((m,i)=>auditMail(issues,m,i));news.forEach((n,i)=>auditNews(issues,n,i));
 repetitionIssues(issues,emails.map(x=>x?.subject),'Inbox subjects');
 repetitionIssues(issues,emails.map(x=>x?.body),'Inbox body');
 repetitionIssues(issues,news.map(x=>x?.headline),'World News headlines');
 auditDom(issues);
 const counts=issues.reduce((a,x)=>(a[x.category]=(a[x.category]||0)+1,a),{});
 const report={version:'1.0',generatedAt:new Date().toISOString(),issueCount:issues.length,counts,issues};
 window.__athleticsLanguageAudit=report;return report
}
function auditSummary(){const r=audit();return{issueCount:r.issueCount,counts:r.counts,top:r.issues.slice(0,20)}}

const api=Object.freeze({
 version:'1.0',baseLanguage:'en-GB',authority:'Text, Language & Narrative Systems',
 strings:STRINGS,voices:VOICES,terms:TERMS,
 t,cleanProse,cleanSubject,contextFor,plural,format:Object.freeze({weekRange,moneyGBP,percent,metres,wind,ordinal}),
 compose:Object.freeze({medicalInjury:composeMedicalInjury,financeCost:composeFinanceCost,recordMoment:composeRecordMoment}),
 audit,auditSummary
});
window.AMLanguage=api;window.__athleticsLanguage=api;

patchFactories();cleanStaticControls();cleanRendered();
let queued=false;
new MutationObserver(records=>{
 if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patchFactories();cleanStaticControls();for(const r of records)for(const n of r.addedNodes||[]){if(n.nodeType===1||n.nodeType===3)cleanRendered(n)}})
}).observe(document.body,{childList:true,subtree:true});

/* Lightweight development telemetry only. It never changes game state. */
setTimeout(()=>{try{const r=audit();if(r.issueCount)console.info(`[Athletics Manager Language] ${r.issueCount} copy issue${r.issueCount===1?'':'s'} flagged for editorial review.`,r.counts)}catch(_){}},1200);
})();
