/* Athletics Manager — Inbox Character Voices V1
   Gives communications an explicit speaker role without changing gameplay facts.
   Existing messages keep their original wording; newly created messages receive role-aware
   sender identity, concise subjects and light editorial treatment. */
(function(){
'use strict';
if(window.__amInboxCharacterVoicesV1)return;window.__amInboxCharacterVoicesV1=1;
if(typeof pushMail!=='function')return;

const VERSION='1.0';
const VOICES=Object.freeze({
 athlete:{label:'Athlete',tone:'personal, direct'},
 medical:{label:'Medical & Physio',tone:'calm, precise, actionable'},
 scout:{label:'National Scout',tone:'observational, evidence-led, uncertain when appropriate'},
 specialistCoach:{label:'Specialist Coach',tone:'event-specific, practical, performance-focused'},
 sportsScience:{label:'Sports Science',tone:'measured, data-led, concise'},
 performance:{label:'Performance Team',tone:'direct, practical, concise'},
 selection:{label:'Selection Committee',tone:'clear, authoritative, procedural'},
 federation:{label:'Federation',tone:'formal, concise, authoritative'},
 olympic:{label:'Olympic Programme',tone:'formal, competition-focused'},
 finance:{label:'Finance',tone:'numbers first, no motivational filler'},
 operations:{label:'Performance Operations',tone:'administrative, factual'}
});

const safe=(fn,fallback=null)=>{try{const v=fn();return v==null?fallback:v}catch(_){return fallback}};
const text=v=>String(v??'');
const normalise=v=>text(v).replace(/\s+([,.!?;:])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
function profile(){return safe(()=>nationProfile(),{})||{}}
function lowerMail(m){return `${m?.sender||''} ${m?.subject||''} ${m?.body||''} ${m?.type||''}`.toLowerCase()}
function sameSender(a,b){return !!a&&!!b&&text(a).toLowerCase()===text(b).toLowerCase()}

function athleteForMail(m){
 const hay=`${m?.subject||''} ${m?.body||''}`.toLowerCase();let found=null,best=0;
 for(const a of safe(()=>s?.athletes,[])||[]){const name=text(a?.name).trim();if(name.length>best&&hay.includes(name.toLowerCase())){found=a;best=name.length}}
 return found
}
function coachRoleForAthlete(a){const d=text(a?.disc);if(/^.[0-9]*100|100/i.test(d)||/M100|W100/i.test(d))return'sprint';if(/HJ|HIGH/i.test(d))return'jumps';if(/SP|SHOT/i.test(d))return'throws';return null}
function coachFor(role,a=null){
 const coaches=safe(()=>s?.coaches,null);if(!coaches)return null;
 let key=null;if(role==='medical')key='physio';else if(role==='scout')key='scout';else if(role==='sportsScience')key='science';else if(role==='specialistCoach')key=coachRoleForAthlete(a);
 return key&&coaches[key]?{...coaches[key],staffRole:key}:null
}
function coachLabel(c,role){
 if(!c)return VOICES[role]?.label||'Programme';
 const defs=safe(()=>STAFF_DEF,null);return defs?.[c.staffRole]?.name||VOICES[role]?.label||'Programme'
}

function inferRole(m){
 const p=profile(),type=text(m?.type).toLowerCase(),subject=text(m?.subject),hay=lowerMail(m),sender=text(m?.sender);
 if(type==='athlete')return'athlete';
 if(type==='medical'||sameSender(sender,p.medical)||/medical report|medical clearance|fitness review|rehabilitation|injury/.test(hay))return'medical';
 if(type==='scouting'||type==='scout'||sameSender(sender,p.pathway)||/scout|prospect/.test(hay))return'scout';
 if(type==='selection'||sameSender(sender,p.selection)||/^selection required:|^replacement required:/i.test(subject))return'selection';
 if(/sponsorship|funding|budget|facility upgraded|investment/.test(hay))return'finance';
 if(/staff appointment|contract renewed|contract decision|contract expired/.test(hay)&&sameSender(sender,p.performance))return'operations';
 if(/indoor testing|squad testing|training report|training response|performance test/.test(hay))return'sportsScience';
 if(/camp/.test(hay)&&athleteForMail(m))return'specialistCoach';
 if(sameSender(sender,p.olympic)||/olympic qualification|olympic games review/.test(hay))return'olympic';
 if(sameSender(sender,p.board)||/board review|end of season review|year \d+ begins|career complete/.test(hay)||type==='contract')return'federation';
 if(sameSender(sender,p.performance))return athleteForMail(m)?'specialistCoach':'performance';
 return'federation'
}

function categoryFor(role,m){
 if(role==='medical')return'medical';if(role==='scout')return'scouting';if(role==='selection')return'selection';if(role==='finance')return'finance';if(role==='operations')return'staff';if(role==='athlete')return'athlete';if(role==='olympic'||role==='federation')return'federation';
 const q=lowerMail(m);if(/testing/.test(q))return'testing';if(/summit|league|competition|event/.test(q))return'competition';return'training'
}
function ensureMeta(m,role){
 try{const root=s.inboxDecisionSystem??={};root.emailMeta??={};const z=root.emailMeta[m.id]??={};if(!z.category)z.category=categoryFor(role,m);z.voiceRole=role;z.voiceLabel=m.voiceLabel}catch(_){}
}

function subjectRewrite(value){
 let v=normalise(value),m;
 if((m=v.match(/^Scouting report:\s*(\d+)\s+new prospect(?:s)?$/i)))return`Scout Report — ${m[1]} New Prospect${Number(m[1])===1?'':'s'}`;
 if((m=v.match(/^Medical report:\s*(.+?)\s*[—-]\s*(.+)$/i)))return`${m[1]} — ${m[2]}`;
 if((m=v.match(/^Selection required:\s*(.+)$/i)))return`Team Selection Required — ${m[1]}`;
 if((m=v.match(/^Replacement required:\s*(.+)$/i)))return`Replacement Required — ${m[1]}`;
 if((m=v.match(/^Late fitness review:\s*(.+)$/i)))return`Fitness Review — ${m[1]}`;
 if((m=v.match(/^Staff appointment:\s*(.+)$/i)))return`Staff Appointment — ${m[1]}`;
 if((m=v.match(/^Contract renewed:\s*(.+)$/i)))return`Contract Renewed — ${m[1]}`;
 if((m=v.match(/^Contract decision:\s*(.+)$/i)))return`Contract Decision — ${m[1]}`;
 if((m=v.match(/^Contract expired:\s*(.+)$/i)))return`Contract Expired — ${m[1]}`;
 if((m=v.match(/^Sponsorship signed:\s*(.+)$/i)))return`Sponsorship — ${m[1]}`;
 if((m=v.match(/^Sponsorship review:\s*(.+)$/i)))return`Sponsorship Review — ${m[1]}`;
 if((m=v.match(/^Squad agreement decision:\s*(.+)$/i)))return`Squad Agreement — ${m[1]}`;
 if((m=v.match(/^Squad agreement confirmed:\s*(.+)$/i)))return`Squad Agreement Confirmed — ${m[1]}`;
 if((m=v.match(/^Squad agreement ended:\s*(.+)$/i)))return`Squad Agreement Ended — ${m[1]}`;
 if((m=v.match(/^Summit Series\s+(\d+)\s+complete$/i)))return`Summit Series ${m[1]} — Results`;
 if((m=v.match(/^(.+?)\s+enters the Summit Series$/i)))return`Summit Series Entry — ${m[1]}`;
 if((m=v.match(/^(.+?)\s+(?:leaves|departs) for camp$/i)))return`Training Camp — ${m[1]}`;
 if((m=v.match(/^(.+?)\s+returns from camp$/i)))return`Camp Complete — ${m[1]}`;
 if(/^Scheduled camp cancelled$/i.test(v))return'Camp Cancelled';
 if(/^Olympic qualification confirmed$/i.test(v))return'Olympic Qualification — Final Field';
 if(/^Olympic qualification closes in two weeks$/i.test(v))return'Olympic Qualification — Two Weeks to Deadline';
 if(/^Indoor testing & pool call-up review$/i.test(v))return'Indoor Testing — Selection Review';
 if(/^Week 1 training report$/i.test(v))return'Week 1 Training Report';
 if(/^End of season review$/i.test(v))return'Season Review';
 if(/^Olympic Games review$/i.test(v))return'Olympic Games — Programme Review';
 return v
}

function roleContext(role){if(role==='medical')return'medical';if(role==='scout')return'scouting';if(role==='finance')return'finance';if(role==='olympic'||role==='federation')return'federation';return'general'}
function bodyRewrite(value,role,person=false){
 let v=text(value);const lang=window.AMLanguage;
 if(lang?.cleanProse)v=lang.cleanProse(v,roleContext(role));else v=normalise(v);
 if(role==='scout'){
  v=v.replace(/Staff ability range/gi,'Current ability range').replace(/development grade/gi,'development estimate').replace(/Added to your national pool\.?/gi,person?'I have added the athlete to the National Pool for review.':'Added to the National Pool for review.');
 }
 if(role==='operations'){
  v=v.replace(/,?\s*ability\s+\d+\/5\.?/gi,'.').replace(/The 52-week contract is paid upfront:\s*/gi,'Contract cost: ');
 }
 if(role==='specialistCoach'||role==='performance'){
  v=v.replace(/The coaching team believes the block produced a meaningful development gain\.?/gi,'The block produced a clear development gain.').replace(/meaningful development gain/gi,'development gain');
 }
 if(role==='medical'){
  v=v.replace(/This is encouraging news, although competition readiness will need rebuilding\.?/gi,'Competition readiness will still need rebuilding.');
 }
 return normalise(v)
}

function applyVoice(m,{rewrite=false,rename=false}={}){
 if(!m||typeof m!=='object')return m;const role=inferRole(m),a=athleteForMail(m),coach=coachFor(role,a),label=coachLabel(coach,role);
 m.voiceRole=role;m.voiceLabel=label;m.voiceVersion=VERSION;
 if(rename&&coach?.name&&role!=='athlete')m.sender=`${coach.name} • ${label}`;
 if(rewrite){m.subject=subjectRewrite(m.subject);m.body=bodyRewrite(m.body,role,!!coach?.name)}
 ensureMeta(m,role);return m
}

const basePushMail=pushMail;
pushMail=function(st,senderName,subject,body,type='info',eventId=null,html=null,id=null){
 const mid=basePushMail(st,senderName,subject,body,type,eventId,html,id),m=st?.emails?.find(x=>String(x.id)===String(mid));
 if(m)applyVoice(m,{rewrite:true,rename:true});return mid
};
pushMail.__amCharacterVoicesV1=true;

function tagExisting(){for(const m of safe(()=>s?.emails,[])||[])applyVoice(m,{rewrite:false,rename:false});for(const m of safe(()=>s?.inboxDecisionSystem?.archive,[])||[])applyVoice(m,{rewrite:false,rename:false})}
function roleLabel(m){return m?.voiceLabel||VOICES[m?.voiceRole]?.label||''}
function mailById(id){return (safe(()=>s?.emails,[])||[]).find(m=>String(m.id)===String(id))||(safe(()=>s?.inboxDecisionSystem?.archive,[])||[]).find(m=>String(m.id)===String(id))}
function decorateInbox(){
 const root=document.getElementById('inbox');if(!root)return;
 const intro=root.querySelector('.am-inbox-v3-title p');if(intro)intro.textContent='Staff, federation and athlete communication. Decisions stay separate from reports.';
 root.querySelectorAll('[data-v3-mail]').forEach(row=>{const m=mailById(row.dataset.v3Mail),label=roleLabel(m),slot=row.querySelector('.am-inbox-v3-sender');if(!m||!label||!slot)return;let small=slot.querySelector('.am-voice-role');if(!small){small=document.createElement('small');small.className='am-voice-role';slot.appendChild(small)}small.textContent=label;row.dataset.voiceRole=m.voiceRole||''});
 root.querySelectorAll('.mailitem[data-open]').forEach(row=>{const m=mailById(row.dataset.open),label=roleLabel(m),from=row.querySelector('.from');if(!m||!label||!from)return;if(!from.dataset.voiceDecorated){from.dataset.voiceDecorated='1';from.textContent=`${m.sender} · ${label} · W${m.week}`}});
 const current=mailById(typeof openMail!=='undefined'?openMail:null);if(current){const reader=root.querySelector('#reader');if(reader)reader.dataset.voiceRole=current.voiceRole||'';const roleSmall=root.querySelector('.amv2-sender small');if(roleSmall&&roleLabel(current))roleSmall.textContent=roleLabel(current)}
}

if(typeof drawReader==='function'&&!drawReader.__amCharacterVoicesV1){const base=drawReader;const fn=function(){const out=base.apply(this,arguments);decorateInbox();return out};fn.__amCharacterVoicesV1=true;drawReader=fn}
if(typeof drawInbox==='function'&&!drawInbox.__amCharacterVoicesV1){const base=drawInbox;const fn=function(){tagExisting();const out=base.apply(this,arguments);decorateInbox();requestAnimationFrame(decorateInbox);return out};fn.__amCharacterVoicesV1=true;drawInbox=fn}
if(typeof load==='function'&&!load.__amCharacterVoicesV1){const base=load;const fn=function(){const out=base.apply(this,arguments);tagExisting();return out};fn.__amCharacterVoicesV1=true;load=fn}

tagExisting();

function audit(){const mails=safe(()=>s?.emails,[])||[],counts={},issues=[];for(const m of mails){const role=m.voiceRole||inferRole(m);counts[role]=(counts[role]||0)+1;if(!roleLabel(m))issues.push({category:'WRONG_SPEAKER',id:m.id,detail:'Message has no visible role identity'});if(['medical','scout','sportsScience','specialistCoach'].includes(role)&&!text(m.sender).includes('•'))issues.push({category:'WRONG_SPEAKER',id:m.id,detail:`${role} message uses an organisational sender`})}return{version:VERSION,counts,issueCount:issues.length,issues}}
window.AMInboxVoice=Object.freeze({version:VERSION,voices:VOICES,inferRole,applyVoice,audit});

if(typeof window.addDevelopmentUpdate==='function')window.addDevelopmentUpdate({
 timestamp:'2026-09-11T19:10:00+01:00',
 date:'11 September 2026',
 title:'Inbox & Character Voice Pass',
 items:[
  'Inbox messages now identify who is actually speaking: coaches, sports science, scouts and medical staff use the current people in your programme where appropriate.',
  'Selection, federation, finance and operations communication now keep separate roles and tone instead of reading like one generic sender.',
  'New message subjects are shorter and more specific, with clearer selection, scouting, medical, camp, contract and Summit Series wording.',
  'Existing career emails keep their original wording while gaining speaker-role context, protecting historical decisions from being rewritten.'
 ]
});
})();
