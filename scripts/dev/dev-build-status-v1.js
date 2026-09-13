/* Athletics Manager — Dev Build Status V1
   Dev-only deployment status and authoritative development update panel. */
(function(){
'use strict';
if(window.__athleticsDevBuildStatus)return;
const isDev=/^dev\./i.test(location.hostname)||/(^|\/)dev(\/|$)/i.test(location.pathname);
if(!isDev)return;

function forceDevAlphaAccess(){
 try{localStorage.setItem('athletics_manager_alpha_menu_access_v2','16')}catch(_){}
 const menu=document.querySelector('.menu-side'),form=document.getElementById('alphaAccessForm');
 if(menu){menu.classList.remove('alpha-locked');menu.classList.add('alpha-unlocked');menu.dataset.devAutoAccess='true'}
 if(form){form.hidden=true;form.setAttribute('aria-hidden','true')}
}
forceDevAlphaAccess();

const state={boot:null,server:null,history:[],status:'loading'};
let menuWrapped=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=v=>String(v||'').slice(0,8).toUpperCase();
const fmt=iso=>{try{return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/London'}).format(new Date(iso)).replace(',',' ·')}catch(_){return iso||''}};
const noCache=url=>`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`;

function ensureStyle(){
 if(document.getElementById('amDevBuildStatusStyle'))return;
 const s=document.createElement('style');s.id='amDevBuildStatusStyle';s.textContent=`
 #amDevBuildChip{position:fixed;right:12px;bottom:12px;z-index:9997;display:flex;align-items:center;gap:7px;min-height:30px;padding:6px 9px;border:1px solid #24485d;border-radius:999px;background:rgba(5,18,28,.95);box-shadow:0 8px 28px #0007;color:#dceaf0;font:800 8px/1.1 system-ui,-apple-system,sans-serif;letter-spacing:.05em;text-transform:uppercase;backdrop-filter:blur(8px)}
 #amDevBuildChip .dot{width:7px;height:7px;border-radius:50%;background:#6b8090;box-shadow:0 0 0 3px #6b80901c}#amDevBuildChip.live .dot{background:#69d39a;box-shadow:0 0 0 3px #69d39a22}#amDevBuildChip.update .dot{background:#f0b85a;box-shadow:0 0 0 3px #f0b85a22}#amDevBuildChip.error .dot{background:#d96d6d;box-shadow:0 0 0 3px #d96d6d22}
 #amDevBuildChip button{border:0;background:transparent;color:inherit;font:inherit;padding:0;cursor:pointer}#amDevBuildChip .reload{display:none;margin-left:2px;padding:4px 7px;border:1px solid #7a5a24;border-radius:999px;background:#2a1d0b;color:#f4cc83}#amDevBuildChip.update .reload{display:inline-block}
 #latestUpdatePanel.am-dev-update-panel{display:block!important;margin-top:12px!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}
 #latestUpdatePanel.am-dev-update-panel>.update-panel-title,#latestUpdatePanel.am-dev-update-panel>.update-entry{display:none!important}
 .am-dev-build-panel{margin:0;padding:13px 14px;border:1px solid #24485d;border-radius:10px;background:linear-gradient(180deg,#0a1d2a,#071722);box-shadow:0 12px 30px rgba(0,0,0,.18)}.am-dev-build-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.am-dev-build-panel small{display:block;color:#7895a7;font-size:7px;font-weight:950;letter-spacing:.11em;text-transform:uppercase}.am-dev-build-panel h3{margin:4px 0 2px;color:#eef6f9;font-size:13px}.am-dev-build-panel p{margin:0;color:#8fa7b4;font-size:9px;line-height:1.45}.am-dev-build-state{white-space:nowrap;padding:5px 8px;border-radius:999px;border:1px solid #28533e;background:#0c2a1e;color:#76d7a0;font-size:7px;font-weight:950;letter-spacing:.08em}.am-dev-build-state.loading{border-color:#345064;background:#0d2230;color:#8fb4c7}.am-dev-build-state.update{border-color:#6c5126;background:#291c0b;color:#f2c16d}.am-dev-build-state.error{border-color:#633333;background:#281112;color:#e79a9a}.am-dev-build-history{display:grid;gap:6px;margin-top:11px}.am-dev-build-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;padding-top:7px;border-top:1px solid #ffffff0d;font-size:8px}.am-dev-build-row code{color:#74c7e8;font:800 8px ui-monospace,SFMono-Regular,Menlo,monospace}.am-dev-build-row span{color:#b6c6cf;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.am-dev-build-row time{color:#6f8998;font-size:7px}
 body.event-focus #amDevBuildChip{bottom:82px}
 @media(max-width:700px){body.event-focus #amDevBuildChip{bottom:138px}#amDevBuildChip{right:8px;bottom:72px}.am-dev-build-panel-head{display:grid}.am-dev-build-row{grid-template-columns:auto minmax(0,1fr)}.am-dev-build-row time{grid-column:2}}
 `;document.head.appendChild(s)
}
function compute(){
 if(!state.server)return state.status==='error'?'error':'loading';
 if(!state.boot?.sha)return 'error';
 return state.boot.sha===state.server.sha?'live':'update';
}
function ensureChip(){
 let el=document.getElementById('amDevBuildChip');if(el)return el;
 el=document.createElement('div');el.id='amDevBuildChip';el.innerHTML='<span class="dot"></span><button type="button" data-am-dev-open>DEV · CHECKING</button><button type="button" class="reload" data-am-dev-reload>RELOAD</button>';
 document.body.appendChild(el);
 el.querySelector('[data-am-dev-reload]')?.addEventListener('click',()=>location.reload());
 el.querySelector('[data-am-dev-open]')?.addEventListener('click',()=>document.getElementById('latestUpdatePanel')?.scrollIntoView({behavior:'smooth',block:'start'}));
 return el
}
function renderChip(){
 const mode=compute(),el=ensureChip(),sha=short(state.server?.sha||state.boot?.sha);
 el.className=mode;
 const label=mode==='live'?`DEV · LIVE · ${sha}`:mode==='update'?`DEV · NEW BUILD · ${sha}`:mode==='error'?'DEV · STATUS UNKNOWN':'DEV · CHECKING';
 const b=el.querySelector('[data-am-dev-open]');if(b)b.textContent=label
}
function panelStateLabel(mode){return mode==='live'?'LATEST BUILD':mode==='update'?'RELOAD REQUIRED':mode==='error'?'STATUS UNKNOWN':'CHECKING'}
function renderPanel(){
 const panel=document.getElementById('latestUpdatePanel');if(!panel)return;
 panel.classList.add('am-dev-update-panel');
 panel.dataset.amDevPanelOwner='dev-build-status-v1';
 const mode=compute(),server=state.server||{},rows=(state.history||[]).slice(0,5).map(x=>`<div class="am-dev-build-row"><code>${esc(short(x.sha))}</code><span>${esc(x.title||'Development build')}</span><time>${esc(fmt(x.deployedAt))}</time></div>`).join('');
 panel.innerHTML=`<section id="amDevBuildPanel" class="am-dev-build-panel"><div class="am-dev-build-panel-head"><div><small>Development Client</small><h3>${mode==='update'?'A newer dev build is live':'Dev build status'}</h3><p>${esc(server.title||'Checking the deployment server…')}${server.sha?` · ${esc(short(server.sha))}`:''}${server.deployedAt?` · ${esc(fmt(server.deployedAt))}`:''}</p></div><div class="am-dev-build-state ${mode}">${panelStateLabel(mode)}</div></div>${mode==='update'?'<div style="margin-top:10px"><button type="button" class="btn" data-am-dev-panel-reload>RELOAD DEV CLIENT</button></div>':''}${rows?`<div class="am-dev-build-history">${rows}</div>`:''}</section>`;
 panel.querySelector('[data-am-dev-panel-reload]')?.addEventListener('click',()=>location.reload())
}
function claimMenuPanel(){
 if(menuWrapped||typeof renderMenu!=='function')return;
 const baseRenderMenu=renderMenu;
 renderMenu=function(...args){const out=baseRenderMenu.apply(this,args);renderPanel();return out};
 menuWrapped=true
}
async function getJson(url){
 const r=await fetch(noCache(url),{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()
}
function loadBootMarker(){
 return new Promise(resolve=>{
  if(window.__ATHLETICS_DEV_RUNTIME_BUILD){state.boot={...window.__ATHLETICS_DEV_RUNTIME_BUILD};resolve();return}
  const s=document.createElement('script');s.src=noCache('scripts/dev/dev-runtime-build.js');s.async=true;
  s.onload=()=>{state.boot=window.__ATHLETICS_DEV_RUNTIME_BUILD?{...window.__ATHLETICS_DEV_RUNTIME_BUILD}:null;resolve()};
  s.onerror=()=>resolve();document.head.appendChild(s)
 })
}
async function refresh(){
 try{
  const [server,history]=await Promise.all([getJson('dev-build.json'),getJson('dev-build-history.json').catch(()=>[])]);
  state.server=server;state.history=Array.isArray(history)?history:[];state.status='ready';
 }catch(err){state.status='error';console.warn('[Athletics Manager] Dev build status unavailable',err)}
 renderChip();renderPanel()
}
async function start(){
 ensureStyle();claimMenuPanel();renderPanel();renderChip();
 window.__athleticsDevBuildStatus={version:1,state,refresh,render:()=>{renderChip();renderPanel()}};
 await loadBootMarker();await refresh();
 setInterval(refresh,60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 window.addEventListener('pageshow',()=>refresh())
}
start();
})();
