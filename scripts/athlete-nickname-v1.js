/* Athletics Manager — Athlete Nickname V1
   Manager-only athlete labels. Official athlete names remain authoritative for
   results, records, commentary, news and career history. */
(function(){
'use strict';
if(window.__amAthleteNicknameV1)return;window.__amAthleteNicknameV1=1;

const VERSION=1;
const MAX_LENGTH=24;
const $=id=>document.getElementById(id);
const safe=(fn,fallback)=>{try{const v=fn();return v==null?fallback:v}catch(_){return fallback}};
let decorateQueued=false;

function athleteById(id){return safe(()=>s?.athletes?.find(a=>String(a.id)===String(id)),null)}
function currentNation(){return safe(()=>managedNation(),s?.managedNation||'')}
function officialName(a){return String(a?.name||'Athlete')}
function nickname(a){return String(a?.nickname||'').trim()}
function canEdit(a){return !!a&&String(a.nation)===String(currentNation())}
function normalise(value){
 return String(value??'')
  .replace(/[\u0000-\u001f\u007f]/g,' ')
  .replace(/\s+/g,' ')
  .trim()
  .slice(0,MAX_LENGTH)
  .trim();
}
function displayName(a){return nickname(a)||officialName(a)}

function persist(a,value){
 if(!a||!canEdit(a))return false;
 const next=normalise(value);
 if(next)a.nickname=next;else delete a.nickname;
 safe(()=>save(),null);
 safe(()=>toast(next?`Nickname saved · ${next}`:'Nickname cleared'),null);
 decorateAll();
 return true;
}

function installStyles(){
 if($('amAthleteNicknameStyles'))return;
 const style=document.createElement('style');style.id='amAthleteNicknameStyles';style.textContent=`
 .am-nickname-chip{display:inline-flex;align-items:center;max-width:92px;margin-left:6px;padding:2px 6px;border:1px solid rgba(114,201,238,.18);border-radius:999px;background:rgba(114,201,238,.07);color:#8fcce5;font-size:8px;font-weight:800;line-height:1.25;vertical-align:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .am-nickname-profile{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0 8px}.am-nickname-profile-label{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:5px 8px;border:1px solid rgba(114,201,238,.16);border-radius:8px;background:rgba(114,201,238,.05);color:#9eb8c4;font-size:9px}.am-nickname-profile-label small{color:#6e95a8;font-size:8px;font-weight:900;letter-spacing:.1em}.am-nickname-profile-label strong{color:#dceef5;font-size:11px}.am-nickname-edit{min-height:28px!important;padding:0 9px!important;font-size:8px!important}
 .am-nickname-dialog{width:min(500px,calc(100vw - 28px));max-width:none;border:1px solid rgba(114,201,238,.22);border-radius:14px;padding:0;background:#071722;color:#eaf5f8;box-shadow:0 30px 90px rgba(0,0,0,.55)}.am-nickname-dialog::backdrop{background:rgba(0,8,14,.72);backdrop-filter:blur(3px)}.am-nickname-shell{padding:22px}.am-nickname-kicker{color:#72c9ee;font-size:9px;font-weight:900;letter-spacing:.14em}.am-nickname-shell h2{margin:7px 0 5px;font-size:23px;line-height:1.1}.am-nickname-official{margin:0 0 17px;color:#829daa;font-size:10px}.am-nickname-official strong{color:#cbdde4}.am-nickname-shell label{display:grid;gap:7px;color:#8eaab6;font-size:9px;font-weight:900;letter-spacing:.09em}.am-nickname-shell input{width:100%;box-sizing:border-box;min-height:44px;padding:0 12px;border:1px solid rgba(129,177,199,.24);border-radius:9px;background:#05131d;color:#edf7fa;font:600 14px/1.2 inherit;outline:none}.am-nickname-shell input:focus{border-color:rgba(114,201,238,.65);box-shadow:0 0 0 3px rgba(114,201,238,.08)}.am-nickname-help{margin:10px 0 0;color:#829daa;font-size:10px;line-height:1.5}.am-nickname-count{display:block;margin-top:5px;color:#638396;font-size:9px;text-align:right}.am-nickname-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:19px;flex-wrap:wrap}.am-nickname-actions [data-am-nickname-clear]{margin-right:auto}
 @media(max-width:620px){.am-nickname-shell{padding:18px}.am-nickname-actions{display:grid;grid-template-columns:1fr 1fr}.am-nickname-actions [data-am-nickname-clear]{margin-right:0}.am-nickname-actions .btn{width:100%}}
 `;document.head.appendChild(style);
}

function ensureDialog(){
 let d=$('amNicknameDialog');if(d)return d;
 d=document.createElement('dialog');d.id='amNicknameDialog';d.className='am-nickname-dialog';d.setAttribute('aria-labelledby','amNicknameTitle');
 d.innerHTML=`<div class="am-nickname-shell"><div class="am-nickname-kicker">ATHLETE MANAGEMENT</div><h2 id="amNicknameTitle">Athlete nickname</h2><p class="am-nickname-official">Official name: <strong data-am-nickname-official></strong></p><label>NICKNAME<input data-am-nickname-input type="text" maxlength="${MAX_LENGTH}" autocomplete="off" spellcheck="false" placeholder="e.g. Flash"></label><span class="am-nickname-count" data-am-nickname-count>0 / ${MAX_LENGTH}</span><p class="am-nickname-help">This is your management label only. The athlete’s real name remains unchanged in official results, records, news, commentary and career history.</p><div class="am-nickname-actions"><button type="button" class="btn ghost" data-am-nickname-clear>CLEAR</button><button type="button" class="btn ghost" data-am-nickname-cancel>CANCEL</button><button type="button" class="btn primary" data-am-nickname-save>SAVE NICKNAME</button></div></div>`;
 document.body.appendChild(d);
 const input=d.querySelector('[data-am-nickname-input]'),count=d.querySelector('[data-am-nickname-count]');
 const updateCount=()=>{count.textContent=`${input.value.length} / ${MAX_LENGTH}`};
 input.addEventListener('input',updateCount);
 input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();commitDialog()}});
 d.querySelector('[data-am-nickname-cancel]').addEventListener('click',()=>d.close());
 d.querySelector('[data-am-nickname-save]').addEventListener('click',commitDialog);
 d.querySelector('[data-am-nickname-clear]').addEventListener('click',()=>{const a=athleteById(d.dataset.athleteId);if(persist(a,''))d.close()});
 d.addEventListener('cancel',event=>{event.preventDefault();d.close()});
 return d;
}
function openEditor(id){
 const a=athleteById(id);if(!a||!canEdit(a)){safe(()=>toast('Nicknames can only be edited for athletes in your national programme'),null);return false}
 const d=ensureDialog(),input=d.querySelector('[data-am-nickname-input]');
 d.dataset.athleteId=String(a.id);
 d.querySelector('[data-am-nickname-official]').textContent=officialName(a);
 input.value=nickname(a);
 d.querySelector('[data-am-nickname-count]').textContent=`${input.value.length} / ${MAX_LENGTH}`;
 d.querySelector('[data-am-nickname-clear]').hidden=!nickname(a);
 try{d.showModal()}catch(_){return false}
 requestAnimationFrame(()=>{input.focus();input.select()});return true;
}
function commitDialog(){
 const d=$('amNicknameDialog');if(!d)return false;
 const a=athleteById(d.dataset.athleteId),input=d.querySelector('[data-am-nickname-input]');
 if(!persist(a,input?.value||''))return false;
 d.close();return true;
}

function escapeText(value){const el=document.createElement('span');el.textContent=String(value??'');return el.innerHTML}
function escapeAttr(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function decorateRows(root){
 if(!root)return;
 root.querySelectorAll('[data-sav2-athlete]').forEach(row=>{
  const a=athleteById(row.dataset.sav2Athlete),nameNode=row.querySelector('.sav2-person>span:last-child>strong');if(!a||!nameNode)return;
  let chip=nameNode.parentElement?.querySelector('.am-nickname-chip');const nick=nickname(a);
  if(!nick){chip?.remove();return}
  if(!chip){chip=document.createElement('span');chip.className='am-nickname-chip';nameNode.insertAdjacentElement('afterend',chip)}
  if(chip.textContent!==`“${nick}”`)chip.textContent=`“${nick}”`;
  chip.title=`Manager nickname for ${officialName(a)}`;
 });
}
function currentProfileAthlete(){
 const id=safe(()=>typeof profileId!=='undefined'?profileId:null,null);if(id!=null){const a=athleteById(id);if(a)return a}
 const title=$('athleteProfile')?.querySelector('#profileName')?.getAttribute('title');return title?safe(()=>s?.athletes?.find(a=>officialName(a)===title),null):null;
}
function decorateProfile(){
 const dialog=$('athleteProfile');if(!dialog?.querySelector('.apv2-identity'))return;
 const a=currentProfileAthlete();if(!a)return;
 const identity=dialog.querySelector('.apv2-identity'),heading=identity.querySelector('#profileName');if(!heading)return;
 let row=identity.querySelector('.am-nickname-profile');
 if(!row){row=document.createElement('div');row.className='am-nickname-profile';heading.insertAdjacentElement('afterend',row)}
 const nick=nickname(a),editable=canEdit(a);
 const html=`<span class="am-nickname-profile-label"><small>NICKNAME</small><strong>${nick?`“${escapeText(nick)}”`:'Not set'}</strong></span>${editable?`<button type="button" class="btn ghost am-nickname-edit" data-am-nickname-edit="${escapeAttr(a.id)}">${nick?'EDIT NICKNAME':'ADD NICKNAME'}</button>`:''}`;
 if(row.innerHTML!==html)row.innerHTML=html;
}
function decorateAll(){installStyles();decorateRows($('squad'));decorateRows($('pool'));decorateProfile()}
function queueDecorate(){if(decorateQueued)return;decorateQueued=true;queueMicrotask(()=>{decorateQueued=false;decorateAll()})}

function observe(){
 const targets=[$('squad'),$('pool'),$('athleteProfile')].filter(Boolean);if(!targets.length)return;
 const observer=new MutationObserver(queueDecorate);targets.forEach(node=>observer.observe(node,{childList:true,subtree:true}));
}
document.addEventListener('click',event=>{const button=event.target.closest?.('[data-am-nickname-edit]');if(!button)return;event.preventDefault();openEditor(button.dataset.amNicknameEdit)},true);
window.addEventListener('pageshow',queueDecorate);
installStyles();observe();queueDecorate();

window.AMAthleteNickname={version:VERSION,maxLength:MAX_LENGTH,get:nickname,displayName,officialName,set:(id,value)=>persist(athleteById(id),value),open:openEditor,decorate:decorateAll};
})();
