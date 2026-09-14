/* Athletics Manager — UX Consistency Authority V1
   Cross-screen interaction contract for navigation, ownership, confirmations,
   naming and compact management UI consistency. */
(function(){
'use strict';
if(window.__amUXConsistencyV1)return;window.__amUXConsistencyV1=1;

const VERSION=1;
const BUILD='2026.09.14-ux1';
const $=id=>document.getElementById(id);
const safe=(fn,fallback)=>{try{const v=fn();return v==null?fallback:v}catch(_){return fallback}};
const route=()=>safe(()=>typeof currentView==='string'?currentView:'home','home');
const ROUTE_CONTEXT={
 home:'NATIONAL PROGRAMME',inbox:'COMMUNICATIONS',squad:'ATHLETE MANAGEMENT',pool:'ATHLETE MANAGEMENT',clubs:'DOMESTIC ATHLETICS',
 calendar:'SEASON PLANNING',training:'HIGH PERFORMANCE',scouting:'TALENT ID',league:'SUMMIT SERIES',rankings:'WORLD ATHLETICS',
 olympics:'QUALIFICATION',staff:'PERFORMANCE TEAM',finance:'PROGRAMME OPERATIONS',news:'ATHLETICS WORLD',competition:'COMPETITION'
};
const CTA_MAP=new Map([
 ['MARKET','OPEN STAFF MARKET'],['OPEN MARKET','OPEN STAFF MARKET'],['STAFF MARKET','OPEN STAFF MARKET'],
 ['DOSSIER','PROFILE'],['DETAILS','VIEW DETAILS'],['RESULTS','VIEW RESULTS'],['RETURN TO GAME','RETURN HOME']
]);
const TAB_SELECTORS=['.pe-tabs','.wsv2-tabs','.apv2-tabs','.scv3-tabs','.tr2-tabs','.home-v2-world-tabs','.calv2-filters','.cj-filters','.sav2-tabs'];
let mutationQueued=false;
let replayButton=null;
let nativeBypass=0;
let confirmResolve=null;
let confirmReturnFocus=null;
const nativeConfirm=typeof window.confirm==='function'?window.confirm.bind(window):()=>true;

function normaliseRouteContract(){
 const ui=window.AthleticsUI;
 if(ui?.routes?.olympics){ui.routes.olympics.title='Qualification';ui.routes.olympics.area='Major Championships'}
 const r=route();
 const kicker=$('pageKicker');if(kicker)kicker.textContent=ROUTE_CONTEXT[r]||'NATIONAL PROGRAMME';
 const title=$('pageTitle');if(title)title.setAttribute('aria-hidden','true');
 const qual=$('olympics')?.querySelector('.wsv2-title h1');if(qual&&qual.textContent.trim()!=='Qualification')qual.textContent='Qualification';
 updateBackButton();
}

function ensureBackButton(){
 const top=document.querySelector('.topbar > div:first-child');if(!top)return null;
 let b=$('amUxBack');if(b)return b;
 b=document.createElement('button');b.id='amUxBack';b.type='button';b.className='am-ux-back';b.textContent='← BACK';b.setAttribute('aria-label','Go back');
 b.addEventListener('click',()=>back());top.prepend(b);return b;
}
function updateBackButton(){const b=ensureBackButton();if(b)b.hidden=route()==='home'}
function back(fallback='home'){
 const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);
 if(dialog&&dialog.id!=='firstDay'){try{dialog.close();return true}catch(_){}}
 return safe(()=>window.AthleticsUI?.back?.(fallback),safe(()=>{view(fallback);return true},false));
}
function navigate(target,options){return safe(()=>view(target,options),false)}

function ensureConfirmDialog(){
 let d=$('amUxConfirm');if(d)return d;
 d=document.createElement('dialog');d.id='amUxConfirm';d.className='am-ux-confirm';d.setAttribute('aria-labelledby','amUxConfirmTitle');
 d.innerHTML='<div class="am-ux-confirm-shell"><div class="am-ux-confirm-kicker">MANAGEMENT DECISION</div><h2 id="amUxConfirmTitle">Confirm decision</h2><p id="amUxConfirmBody"></p><div id="amUxConfirmMeta" class="am-ux-confirm-meta" hidden></div><div class="am-ux-confirm-actions"><button type="button" class="btn ghost" data-am-ux-cancel>CANCEL</button><button type="button" class="btn primary" data-am-ux-confirm>CONFIRM</button></div></div>';
 document.body.appendChild(d);
 const settle=value=>{if(!confirmResolve)return;const resolve=confirmResolve;confirmResolve=null;try{if(d.open)d.close()}catch(_){};if(confirmReturnFocus?.isConnected)requestAnimationFrame(()=>confirmReturnFocus.focus({preventScroll:true}));confirmReturnFocus=null;resolve(value)};
 d.querySelector('[data-am-ux-cancel]').addEventListener('click',()=>settle(false));
 d.querySelector('[data-am-ux-confirm]').addEventListener('click',()=>settle(true));
 d.addEventListener('cancel',e=>{e.preventDefault();settle(false)});
 return d;
}
function confirmDecision({title='Confirm decision',body='This action will be applied immediately.',meta='',confirmLabel='CONFIRM'}={}){
 const d=ensureConfirmDialog();
 if(confirmResolve)return Promise.resolve(false);
 confirmReturnFocus=document.activeElement;
 d.querySelector('#amUxConfirmTitle').textContent=title;
 d.querySelector('#amUxConfirmBody').textContent=body;
 const metaNode=d.querySelector('#amUxConfirmMeta');metaNode.textContent=meta||'';metaNode.hidden=!meta;
 d.querySelector('[data-am-ux-confirm]').textContent=confirmLabel;
 return new Promise(resolve=>{confirmResolve=resolve;try{d.showModal()}catch(_){confirmResolve=null;resolve(nativeConfirm(`${title}\n\n${body}`));return}requestAnimationFrame(()=>d.querySelector('[data-am-ux-confirm]')?.focus())});
}

function facilityName(button){return button.closest('.pe-facility')?.querySelector('header small')?.textContent?.trim()||'this facility'}
function confirmationSpec(button){
 if(button.matches('[data-fu]'))return{title:'Approve facility upgrade?',body:`Upgrade ${facilityName(button)}. Construction starts immediately and the displayed capital cost is charged now.`,meta:'Current operations continue during construction, with the programme impact shown on the Finance screen.',confirmLabel:'APPROVE UPGRADE'};
 if(button.matches('[data-fs]'))return{title:'Authorise facility service?',body:`Authorise full servicing for ${facilityName(button)} at the displayed cost.`,meta:'The cost is charged immediately and facility condition is restored.',confirmLabel:'AUTHORISE SERVICE'};
 if(button.matches('[data-commercial]'))return{title:'Sign commercial partnership?',body:'Confirm this commercial agreement. Guaranteed funding is paid now; performance-linked funding still depends on the stated season target.',meta:'Only one commercial agreement can be signed each season.',confirmLabel:'SIGN AGREEMENT'};
 if(button.matches('[data-board-choice]'))return{title:'Confirm board response?',body:'This response is final and its spending-control period begins immediately.',meta:'Existing athlete and staff agreements remain protected.',confirmLabel:'CONFIRM RESPONSE'};
 if(button.matches('[data-mandate-choice="accelerator"]'))return{title:'Accept performance-linked advance?',body:'Accept the federation advance and commit the programme to the displayed season performance target.',meta:'Missing the target does not trigger repayment, but it can reduce board confidence and restrict expansion.',confirmLabel:'ACCEPT ADVANCE'};
 if(button.matches('[data-apv2-contract-release]'))return{title:'Release athlete to club?',body:'End the athlete’s funded national programme agreement and return them to club-led competition.',meta:'Any early-termination settlement shown by the programme contract will be charged immediately.',confirmLabel:'RELEASE ATHLETE'};
 if(button.matches('.pe-modal [data-submit]')&&button.closest('.pe-modal')?.querySelector('.pe-impact.critical'))return{title:'Commit despite negative forecast?',body:'This agreement moves the current season forecast below zero.',meta:'Review the programme impact before confirming. The contract becomes active immediately if the offer is accepted.',confirmLabel:'CONTINUE ANYWAY'};
 return null;
}
function replayConfirmed(button){
 replayButton=button;nativeBypass++;try{button.click()}finally{queueMicrotask(()=>{replayButton=null;nativeBypass=0})}
}
window.confirm=function(message){if(nativeBypass>0){nativeBypass--;return true}return nativeConfirm(message)};

document.addEventListener('click',event=>{
 const button=event.target.closest?.('button');if(!button||button===replayButton||button.disabled)return;
 const spec=confirmationSpec(button);if(!spec)return;
 event.preventDefault();event.stopImmediatePropagation();
 confirmDecision(spec).then(ok=>{if(ok)replayConfirmed(button)});
},true);

document.addEventListener('click',event=>{
 const b=event.target.closest?.('[data-am-ux-open-training]');if(b){event.preventDefault();navigate('training')}
},true);

function calendarOwnership(){
 const root=$('calendar');if(!root)return;
 const cards=[...root.querySelectorAll('.calv2-card')];
 for(const card of cards){
  const heading=String(card.querySelector('.calv2-card-head strong')?.textContent||'').trim();
  if(heading!=='Plan Activity')continue;
  const w=Number(safe(()=>s?.uiCalendarV2?.selectedWeek,0))||null;
  card.classList.add('am-ux-owner-handoff');
  card.innerHTML=`<div class="calv2-card-head"><strong>Training & Testing</strong><span>Managed in Training${w?` · Week ${w}`:''}</span></div><div class="am-ux-owner-copy"><strong>One place to manage performance activity</strong><p>Calendar shows the season commitment. Training owns camp and squad-testing booking, changes and review.</p><button type="button" class="btn secondary" data-am-ux-open-training>OPEN TRAINING</button></div>`;
 }
}
function staffAuthority(){
 const api=window.AMProgrammeEconomy;if(!api?.renderStaff)return;
 if(typeof window.drawStaff==='function'&&window.drawStaff!==api.renderStaff)window.drawStaff=api.renderStaff;
 const root=$('staff');
 if(route()==='staff'&&root?.querySelector('.sfv2')&&!root.querySelector('.pe-shell'))requestAnimationFrame(()=>safe(()=>api.renderStaff(),null));
}

function normaliseTabs(root=document){
 for(const selector of TAB_SELECTORS){
  root.querySelectorAll?.(selector).forEach(tablist=>{
   tablist.setAttribute('role','tablist');
   [...tablist.children].filter(x=>x.tagName==='BUTTON').forEach(button=>{
    const selected=button.classList.contains('on');button.setAttribute('role','tab');button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
   });
  });
 }
}
function normaliseCTAs(root=document){
 root.querySelectorAll?.('button').forEach(button=>{
  if(button.children.length||button.dataset.amUxLabel==='1')return;
  const raw=String(button.textContent||'').trim(),key=raw.toUpperCase(),next=CTA_MAP.get(key);if(!next)return;
  button.textContent=next;button.dataset.amUxLabel='1';
 });
 const finance=$('finance')?.querySelector('[data-staff]');if(finance&&String(finance.textContent).trim()==='STAFF MARKET')finance.textContent='OPEN STAFF MARKET';
 const staff=$('staff');staff?.querySelectorAll('[data-mr]').forEach(b=>{if(/^MARKET$|^OPEN MARKET$/i.test(String(b.textContent).trim()))b.textContent='OPEN STAFF MARKET'});
 const rounds=$('league');rounds?.querySelectorAll('[data-wsv2-summit-round]').forEach(b=>{const t=String(b.textContent).trim().toUpperCase();if(t==='EVENT DAY')b.textContent='OPEN EVENT DAY';else if(t==='RESULTS')b.textContent='VIEW RESULTS';else if(t==='DETAILS')b.textContent='VIEW DETAILS'});
}
function normaliseAll(){
 mutationQueued=false;normaliseRouteContract();calendarOwnership();staffAuthority();normaliseTabs(document);normaliseCTAs(document);
}
function scheduleNormalise(){if(mutationQueued)return;mutationQueued=true;queueMicrotask(normaliseAll)}

function installRenderGuards(){
 if(typeof window.drawCalendar==='function'&&!window.drawCalendar.__amUxWrapped){const base=window.drawCalendar;const wrapped=function(){const out=base.apply(this,arguments);calendarOwnership();normaliseTabs($('calendar')||document);normaliseCTAs($('calendar')||document);return out};wrapped.__amUxWrapped=1;window.drawCalendar=wrapped}
}
function installStyles(){
 if($('amUxConsistencyStyles'))return;const style=document.createElement('style');style.id='amUxConsistencyStyles';style.textContent=`
 .am-ui-cutover #pageTitle{display:none!important}.am-ui-cutover .topbar>div:first-child{display:flex;align-items:center;gap:9px;min-width:0}.am-ui-cutover #pageKicker{margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.am-ux-back{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 10px;border:1px solid rgba(132,184,210,.2);border-radius:8px;background:rgba(8,28,41,.72);color:#b7d0dc;font:800 9px/1 inherit;letter-spacing:.08em;cursor:pointer}.am-ux-back:hover{border-color:rgba(114,201,238,.48);color:#eef8fb}.am-ux-back[hidden]{display:none!important}
 .am-ux-owner-copy{display:grid;gap:8px;padding:14px}.am-ux-owner-copy>strong{color:#e8f3f7;font-size:13px}.am-ux-owner-copy p{margin:0;max-width:680px;color:#91aebb;font-size:11px;line-height:1.55}.am-ux-owner-copy .btn{justify-self:start}
 .am-ux-confirm{width:min(520px,calc(100vw - 28px));max-width:none;border:1px solid rgba(114,201,238,.22);border-radius:14px;padding:0;background:#071722;color:#eaf5f8;box-shadow:0 30px 90px rgba(0,0,0,.55)}.am-ux-confirm::backdrop{background:rgba(0,8,14,.72);backdrop-filter:blur(3px)}.am-ux-confirm-shell{padding:22px}.am-ux-confirm-kicker{color:#72c9ee;font-size:9px;font-weight:900;letter-spacing:.14em}.am-ux-confirm h2{margin:7px 0 8px;font-size:23px;line-height:1.1}.am-ux-confirm p{margin:0;color:#a3bbc6;font-size:12px;line-height:1.55}.am-ux-confirm-meta{margin-top:12px;padding:11px 12px;border:1px solid rgba(124,171,193,.14);border-radius:9px;background:rgba(255,255,255,.025);color:#829daa;font-size:10px;line-height:1.5}.am-ux-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}
 @media (pointer:coarse){.am-ux-back{min-height:40px}.wsv2-table button,.sav2-table button,.scv3-row button,.pe-contracts button,.cj-disc-row button{min-height:40px;min-width:40px}}
 @media(max-width:620px){.am-ui-cutover #pageKicker{max-width:116px}.am-ux-back{padding:0 8px}.am-ux-confirm-shell{padding:18px}.am-ux-confirm-actions{display:grid;grid-template-columns:1fr 1fr}.am-ux-confirm-actions .btn{width:100%}}
 `;document.head.appendChild(style)
}

function boot(){
 installStyles();installRenderGuards();ensureBackButton();staffAuthority();normaliseAll();
 const content=document.querySelector('.content');if(content)new MutationObserver(scheduleNormalise).observe(content,{childList:true,subtree:true});
 const dialogs=[...document.querySelectorAll('dialog')];for(const d of dialogs)new MutationObserver(scheduleNormalise).observe(d,{childList:true,subtree:true});
 new MutationObserver(scheduleNormalise).observe(document.documentElement,{attributes:true,attributeFilter:['data-am-route']});
 window.addEventListener('pageshow',scheduleNormalise);window.addEventListener('orientationchange',()=>setTimeout(scheduleNormalise,80));
 document.documentElement.dataset.amUxConsistency=String(VERSION);
}

window.AMUX={version:VERSION,build:BUILD,back,navigate,confirm:confirmDecision,refresh:normaliseAll,contract:{back:'Back restores previous context; Return Home ends a workflow.',ownership:'One screen owns each management action.',confirmation:'Destructive and financial decisions use Athletics Manager confirmation UI.',cta:'Open = enter area; View = read-only; Review = decision; Profile = person.'}};
boot();
})();
