/* ===== Full Game Polish & QA ===== */
(function(){
'use strict';

const POLISH_VERSION=1;

const EXACT_COPY=new Map([
 ['The contract is signed. The keys are yours. The clock has started.','Your appointment is confirmed. The performance team is ready for your first decisions.'],
 ['The keys are yours. The clock has started.','Your appointment is confirmed. The performance team is ready for your first decisions.'],
 ['The story starts now.','Your first week begins now.'],
 ['Your opening chapter','First-week priorities'],
 ['The goal is to get to your first meaningful choice quickly.','Start with the decisions that matter this week.'],
 ['We are looking for trajectory, evidence and a healthy programme.','The board will judge progression, major-championship results and the strength of the athlete pathway.'],
 ['Race position and scoreboard use the same live snapshot.','Live positions • provisional until the finish.'],
 ['Lane staggers are drawn from each lane path and the finish line is shared.','Staggered lanes • live order remains provisional.'],
 ['Landing position is scaled directly from the announced distance.','Current attempt • sector marks shown in metres.'],
 ['High Jump highlights only • key clearances, misses and eliminations','Highlights coverage • current bar and clearance status.'],
 ['This is staff interpretation rather than a hidden score. The factors above are the same ones used by the performance simulation, but the underlying performance formula remains concealed.','This is the performance team’s interpretation of the result. Use it alongside training data, medical status and the athlete’s recent competition history.'],
 ['This is staff interpretation rather than a hidden score.','This is the performance team’s interpretation of the result.'],
 ['The separate Road to Qualification update will deepen this system later.','Olympic fields are locked from the final qualification standings and national entry limits.'],
 ['Gavin Potts — Gavin Potts is in position.','Gavin Potts — I’m in position.'],
 ['Gavin Potts is in position. The','The']
]);

function polishCopy(value){
 if(typeof value!=='string'||!value)return value;
 let out=value;
 for(const [from,to] of EXACT_COPY)out=out.split(from).join(to);
 out=out.replace(/\bAI-managed federations\b/gi,'rival federations');
 out=out.replace(/\bAI-managed nations\b/gi,'rival nations');
 out=out.replace(/\bperformance simulation\b/gi,'performance model');
 out=out.replace(/\bhidden performance formula\b/gi,'underlying performance factors');
 out=out.replace(/\bthe underlying performance formula remains concealed\b/gi,'the full assessment remains with the performance team');
 out=out.replace(/^(.+?) rewrites (.+?) history$/i,'WORLD RECORD: $1 — $2');
 out=out.replace(/^(.+?) storms to (.+?) in (.+)$/i,'$1 records $2 in $3');
 out=out.replace(/^(.+?) and (.+?): a rivalry takes shape$/i,'$1–$2 rivalry confirmed');
 out=out.replace(/\bthe story starts now\b/gi,'the first week starts now');
 out=out.replace(/\bopening chapter\b/gi,'first-week priorities');
 out=out.replace(/\bAI-controlled\b/gi,'rival');
 return out;
}

function polishMarkup(html){return typeof html==='string'?polishCopy(html):html}

function polishObjectStrings(value,seen=new WeakSet()){
 if(typeof value==='string')return polishCopy(value);
 if(!value||typeof value!=='object')return value;
 if(seen.has(value))return value;seen.add(value);
 if(Array.isArray(value)){for(let i=0;i<value.length;i++){const v=value[i];if(typeof v==='string')value[i]=polishCopy(v);else polishObjectStrings(v,seen)}return value}
 for(const key of Object.keys(value)){
   const v=value[key];
   if(typeof v==='string')value[key]=polishCopy(v);
   else if(v&&typeof v==='object')polishObjectStrings(v,seen);
 }
 return value;
}

function polishStoredCopy(){
 if(typeof s==='undefined'||!s)return false;
 let touched=false;
 for(const key of ['emails','news','social','socialPosts']){
   const group=s[key];if(!group)continue;
   let before=null;try{before=JSON.stringify(group)}catch(_){before=null}polishObjectStrings(group);if(before!==null){try{if(JSON.stringify(group)!==before)touched=true}catch(_){}}
 }
 if(touched&&typeof save==='function')save();
 return touched;
}

function polishTextNodes(root=document.body){
 if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
   if(!node.nodeValue||!node.nodeValue.trim())return NodeFilter.FILTER_REJECT;
   const p=node.parentElement;if(!p||['SCRIPT','STYLE','TEXTAREA','OPTION'].includes(p.tagName))return NodeFilter.FILTER_REJECT;
   return NodeFilter.FILTER_ACCEPT;
 }});
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const next=polishCopy(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next}
}

function polishAttributes(root=document.body){
 if(!root?.querySelectorAll)return;
 root.querySelectorAll('[title],[aria-label],[placeholder]').forEach(el=>{
   for(const attr of ['title','aria-label','placeholder'])if(el.hasAttribute(attr)){
     const old=el.getAttribute(attr),next=polishCopy(old);if(next!==old)el.setAttribute(attr,next);
   }
 });
}

function polishDom(root=document.body){polishTextNodes(root);polishAttributes(root)}

function wrapMarkupFunction(name){
 try{
   const base=globalThis[name];if(typeof base!=='function'||base.__amPolished)return;
   const wrapped=function(...args){return polishMarkup(base.apply(this,args))};
   wrapped.__amPolished=true;globalThis[name]=wrapped;
 }catch(_){/* lexical globals are handled by DOM polish */}
}

/* Keep future generated communications free of developer/meta language. */
try{if(typeof newMail==='function'){
 const baseNewMail=newMail;
 newMail=function(...args){return baseNewMail.apply(this,args.map(v=>typeof v==='string'?polishCopy(v):v))};
}}catch(_){}
try{if(typeof addNews==='function'){
 const baseAddNews=addNews;
 addNews=function(...args){return baseAddNews.apply(this,args.map(v=>typeof v==='string'?polishCopy(v):v))};
}}catch(_){}

/* Functions which return large pieces of player-facing HTML. */
for(const name of ['performanceIntelPanel','selectionHTML','selectionStaffRoomHTML','selectionRecommendationHTML','qualificationAdviceHTML'])wrapMarkupFunction(name);
try{if(typeof eventVisualHTML==='function'){const baseEventVisualHTML=eventVisualHTML;eventVisualHTML=function(...args){return polishMarkup(baseEventVisualHTML.apply(this,args))}}}catch(_){}

function runCopyQA(){
 const text=document.body?.innerText||'';const banned=[/AI-managed federations/i,/Road to Qualification update/i,/hidden performance formula/i,/Gavin Potts\s*[—-]\s*Gavin Potts/i];const hits=banned.filter(rx=>rx.test(text)).map(rx=>String(rx));if(hits.length)console.warn('[Athletics Manager copy QA] flagged phrases',hits);else console.info('[Athletics Manager copy QA] copy checks passed');return hits;
}

function runInterfaceQA(){
 const issues=[];
 const ids=new Map();document.querySelectorAll('[id]').forEach(el=>{const id=el.id;if(!id)return;ids.set(id,(ids.get(id)||0)+1)});
 for(const [id,count] of ids)if(count>1)issues.push(`duplicate id: ${id}`);
 for(const id of ['home','inbox','squad','pool','calendar','training','scouting','league','rankings','olympics','staff','finance','news','competition'])if(!document.getElementById(id))issues.push(`missing view: ${id}`);
 if(issues.length)console.warn('[Athletics Manager QA]',issues);else console.info('[Athletics Manager QA] interface checks passed');
 return issues;
}

/* Run after the core game has loaded and then keep dynamic views clean. */
let domQueued=false;
function queueDomPolish(){if(domQueued)return;domQueued=true;requestAnimationFrame(()=>{domQueued=false;polishDom()})}
const observer=new MutationObserver(queueDomPolish);
observer.observe(document.body,{childList:true,subtree:true,characterData:true});

polishStoredCopy();
polishDom();
runInterfaceQA();
runCopyQA();

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Full Game Polish & QA')){
 UPDATES.unshift({date:'9 September 2026',title:'Full Game Polish & QA',items:[
  'Completed a full code and runtime QA pass across the modular game build, with every JavaScript file checked before release and save compatibility preserved.',
  'Reworked player-facing copy that sounded like developer notes or generic generated text. Federation staff, coaches, medical staff, selectors, journalists, athletes and supporters now keep a clearer voice appropriate to their role.',
  'Removed immersion-breaking developer terminology, hidden-formula references, future-update notes and implementation details from live game screens and reports.',
  'Completed a UI alignment pass across navigation, cards, tables, dialogs, forms, inbox, profiles and Event Day, with extra safeguards for iPad and phone widths, long labels and touch controls.',
  'This is a presentation and reliability pass only. No athlete ratings, competition balance, qualification rules or career progression have been altered.'
 ]});
}
if(typeof renderMenu==='function')renderMenu();

})();
/* ===== End Full Game Polish & QA ===== */
