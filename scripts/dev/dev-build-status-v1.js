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

const state={boot:null,server:null,pipeline:null,history:[],status:'loading'};
let menuWrapped=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=v=>String(v||'').slice(0,8).toUpperCase();
const fmt=iso=>{try{return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/London'}).format(new Date(iso)).replace(',',' ·')}catch(_){return iso||''}};
const noCache=url=>`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`;

function pipelineMode(){
 const p=state.pipeline,s=state.server;
 if(!p?.sha)return null;
 if(s?.sha&&p.sha===s.sha)return 'live';
 if(p.state==='failed')return 'failed';
 if(p.state==='deploying')return 'deploying';
 if(p.state==='passed')return 'passed';
 if(p.state==='running')return 'running';
 return null
}
function compute(){
 const pipe=pipelineMode();
 if(pipe&&pipe!=='live')return pipe;
 if(!state.server)return state.status==='error'?'error':'loading';
 if(!state.boot?.sha)return 'error';
 return state.boot.sha===state.server.sha?'live':'update';
}
function stageIndex(){
 const p=state.pipeline||{};
 if(compute()==='live')return 4;
 if(p.state==='deploying'||p.stage==='deploy')return 3;
 if(p.state==='passed')return 2;
 if(p.stage==='browser')return 2;
 if(p.stage==='deterministic'||p.stage==='qa')return 1;
 return 0
}
function ensureStyle(){
 if(document.getElementById('amDevBuildStatusStyle'))return;
 const s=document.createElement('style');s.id='amDevBuildStatusStyle';s.textContent=`
 #amDevBuildChip{position:fixed;right:12px;bottom:12px;z-index:9997;display:flex;align-items:center;gap:7px;min-height:30px;padding:6px 9px;border:1px solid #24485d;border-radius:999px;background:rgba(5,18,28,.95);box-shadow:0 8px 28px #0007;color:#dceaf0;font:800 8px/1.1 system-ui,-apple-system,sans-serif;letter-spacing:.05em;text-transform:uppercase;backdrop-filter:blur(8px)}
 #amDevBuildChip .dot{width:7px;height:7px;border-radius:50%;background:#6b8090;box-shadow:0 0 0 3px #6b80901c}#amDevBuildChip.live .dot{background:#69d39a;box-shadow:0 0 0 3px #69d39a22}#amDevBuildChip.update .dot,#amDevBuildChip.deploying .dot,#amDevBuildChip.passed .dot{background:#f0b85a;box-shadow:0 0 0 3px #f0b85a22}#amDevBuildChip.running .dot{background:#74c7e8;box-shadow:0 0 0 3px #74c7e822;animation:amDevPulse 1.2s ease-in-out infinite}#amDevBuildChip.failed .dot,#amDevBuildChip.error .dot{background:#d96d6d;box-shadow:0 0 0 3px #d96d6d22}@keyframes amDevPulse{50%{transform:scale(1.45);opacity:.55}}
 #amDevBuildChip button{border:0;background:transparent;color:inherit;font:inherit;padding:0;cursor:pointer}#amDevBuildChip .reload{display:none;margin-left:2px;padding:4px 7px;border:1px solid #7a5a24;border-radius:999px;background:#2a1d0b;color:#f4cc83}#amDevBuildChip.update .reload{display:inline-block}
 #latestUpdatePanel.am-dev-update-panel{display:block!important;margin-top:12px!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}
 #latestUpdatePanel.am-dev-update-panel>.update-panel-title,#latestUpdatePanel.am-dev-update-panel>.update-entry{display:none!important}
 .am-dev-build-panel{margin:0;padding:13px 14px;border:1px solid #24485d;border-radius:10px;background:linear-gradient(180deg,#0a1d2a,#071722);box-shadow:0 12px 30px rgba(0,0,0,.18)}.am-dev-build-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.am-dev-build-panel small{display:block;color:#7895a7;font-size:7px;font-weight:950;letter-spacing:.11em;text-transform:uppercase}.am-dev-build-panel h3{margin:4px 0 2px;color:#eef6f9;font-size:13px}.am-dev-build-panel p{margin:0;color:#8fa7b4;font-size:9px;line-height:1.45}.am-dev-build-state{white-space:nowrap;padding:5px 8px;border-radius:999px;border:1px solid #28533e;background:#0c2a1e;color:#76d7a0;font-size:7px;font-weight:950;letter-spacing:.08em}.am-dev-build-state.loading,.am-dev-build-state.running{border-color:#345064;background:#0d2230;color:#8fcde8}.am-dev-build-state.update,.am-dev-build-state.deploying,.am-dev-build-state.passed{border-color:#6c5126;background:#291c0b;color:#f2c16d}.am-dev-build-state.failed,.am-dev-build-state.error{border-color:#633333;background:#281112;color:#e79a9a}.am-dev-build-history{display:grid;gap:6px;margin-top:11px}.am-dev-build-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;padding-top:7px;border-top:1px solid #ffffff0d;font-size:8px}.am-dev-build-row code{color:#74c7e8;font:800 8px ui-monospace,SFMono-Regular,Menlo,monospace}.am-dev-build-row span{color:#b6c6cf;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.am-dev-build-row time{color:#6f8998;font-size:7px}
 .am-dev-pipeline{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:11px}.am-dev-pipeline-step{position:relative;padding:7px 6px;border:1px solid #1d3949;border-radius:7px;background:#07131c;color:#607b8b;font-size:7px;font-weight:900;text-align:center}.am-dev-pipeline-step.done{border-color:#28533e;background:#0b231a;color:#79d6a1}.am-dev-pipeline-step.active{border-color:#35627b;background:#0d2635;color:#9edbf4}.am-dev-pipeline-step.failed{border-color:#633333;background:#281112;color:#e79a9a}
 .am-dev-pipeline-note{margin-top:8px!important;color:#b6c6cf!important}.am-dev-pipeline-note strong{color:#eef6f9}
 body.event-focus #amDevBuildChip{bottom:82px}
 @media(max-width:700px){body.event-focus #amDevBuildChip{bottom:138px}#amDevBuildChip{right:8px;bottom:72px}.am-dev-build-panel-head{display:grid}.am-dev-build-row{grid-template-columns:auto minmax(0,1fr)}.am-dev-build-row time{grid-column:2}.am-dev-pipeline{grid-template-columns:repeat(2,1fr)}}
 `;document.head.appendChild(s)
}
function ensureChip(){
 let el=document.getElementById('amDevBuildChip');if(el)return el;
 el=document.createElement('div');el.id='amDevBuildChip';el.innerHTML='<span class="dot"></span><button type="button" data-am-dev-open>DEV · CHECKING</button><button type="button" class="reload" data-am-dev-reload>RELOAD</button>';
 document.body.appendChild(el);
 el.querySelector('[data-am-dev-reload]')?.addEventListener('click',()=>location.reload());
 el.querySelector('[data-am-dev-open]')?.addEventListener('click',()=>document.getElementById('latestUpdatePanel')?.scrollIntoView({behavior:'smooth',block:'start'}));
 return el
}
function modeLabel(mode){
 const p=state.pipeline||{},sha=short(p.sha||state.server?.sha||state.boot?.sha);
 if(mode==='running')return `DEV · TESTING · ${sha}`;
 if(mode==='passed')return `DEV · QA PASSED · ${sha}`;
 if(mode==='deploying')return `DEV · DEPLOYING · ${sha}`;
 if(mode==='failed')return `DEV · FAILED · ${sha}`;
 if(mode==='live')return `DEV · LIVE · ${short(state.server?.sha||state.boot?.sha)}`;
 if(mode==='update')return `DEV · NEW BUILD · ${short(state.server?.sha)}`;
 if(mode==='error')return 'DEV · STATUS UNKNOWN';
 return 'DEV · CHECKING'
}
function renderChip(){const mode=compute(),el=ensureChip();el.className=mode;const b=el.querySelector('[data-am-dev-open]');if(b)b.textContent=modeLabel(mode)}
function panelStateLabel(mode){return mode==='live'?'LIVE':mode==='running'?'TESTING':mode==='passed'?'QA PASSED':mode==='deploying'?'DEPLOYING':mode==='failed'?'FAILED':mode==='update'?'RELOAD REQUIRED':mode==='error'?'STATUS UNKNOWN':'CHECKING'}
function progressHtml(mode){
 const labels=['TESTS + SOAK','BROWSER / iPAD QA','DEPLOY','LIVE'],idx=stageIndex(),failed=mode==='failed';
 return `<div class="am-dev-pipeline">${labels.map((label,i)=>{const n=i+1,cls=failed&&n===Math.max(1,idx)?'failed':n<idx||mode==='live'?'done':n===idx?'active':'';return `<div class="am-dev-pipeline-step ${cls}">${n}. ${label}</div>`}).join('')}</div>`
}
function renderPanel(){
 const panel=document.getElementById('latestUpdatePanel');if(!panel)return;
 panel.classList.add('am-dev-update-panel');panel.dataset.amDevPanelOwner='dev-build-status-v1';
 const mode=compute(),server=state.server||{},pipe=state.pipeline||{},candidate=pipe.sha&&pipe.sha!==server.sha,rows=(state.history||[]).slice(0,5).map(x=>`<div class="am-dev-build-row"><code>${esc(short(x.sha))}</code><span>${esc(x.title||'Development build')}</span><time>${esc(fmt(x.deployedAt))}</time></div>`).join('');
 const title=mode==='running'?'A new dev build is being tested':mode==='passed'?'QA has passed':mode==='deploying'?'Dev deployment in progress':mode==='failed'?'Latest candidate failed QA':mode==='update'?'A newer dev build is live':'Dev build status';
 const detail=candidate?`${pipe.label||'Build pipeline'} · ${short(pipe.sha)}${pipe.updatedAt?` · ${fmt(pipe.updatedAt)}`:''}`:`${server.title||'Checking the deployment server…'}${server.sha?` · ${short(server.sha)}`:''}${server.deployedAt?` · ${fmt(server.deployedAt)}`:''}`;
 panel.innerHTML=`<section id="amDevBuildPanel" class="am-dev-build-panel"><div class="am-dev-build-panel-head"><div><small>Development Client</small><h3>${esc(title)}</h3><p>${esc(detail)}</p></div><div class="am-dev-build-state ${mode}">${panelStateLabel(mode)}</div></div>${progressHtml(mode)}${mode==='failed'?'<p class="am-dev-pipeline-note"><strong>Not deployed.</strong> The current dev client remains on the last build that passed every gate.</p>':''}${mode==='passed'?'<p class="am-dev-pipeline-note"><strong>All QA gates passed.</strong> Deployment is next.</p>':''}${mode==='update'?'<div style="margin-top:10px"><button type="button" class="btn" data-am-dev-panel-reload>RELOAD DEV CLIENT</button></div>':''}${rows?`<div class="am-dev-build-history">${rows}</div>`:''}</section>`;
 panel.querySelector('[data-am-dev-panel-reload]')?.addEventListener('click',()=>location.reload())
}
function claimMenuPanel(){if(menuWrapped||typeof renderMenu!=='function')return;const baseRenderMenu=renderMenu;renderMenu=function(...args){const out=baseRenderMenu.apply(this,args);renderPanel();return out};menuWrapped=true}
async function getJson(url){const r=await fetch(noCache(url),{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()}
function loadBootMarker(){return new Promise(resolve=>{if(window.__ATHLETICS_DEV_RUNTIME_BUILD){state.boot={...window.__ATHLETICS_DEV_RUNTIME_BUILD};resolve();return}const s=document.createElement('script');s.src=noCache('scripts/dev/dev-runtime-build.js');s.async=true;s.onload=()=>{state.boot=window.__ATHLETICS_DEV_RUNTIME_BUILD?{...window.__ATHLETICS_DEV_RUNTIME_BUILD}:null;resolve()};s.onerror=()=>resolve();document.head.appendChild(s)})}
async function refresh(){
 try{
  const [server,history,pipeline]=await Promise.all([getJson('dev-build.json'),getJson('dev-build-history.json').catch(()=>[]),getJson('dev-pipeline-status.json').catch(()=>null)]);
  state.server=server;state.history=Array.isArray(history)?history:[];state.pipeline=pipeline;state.status='ready';
 }catch(err){state.status='error';console.warn('[Athletics Manager] Dev build status unavailable',err)}
 renderChip();renderPanel()
}
async function start(){
 ensureStyle();claimMenuPanel();renderPanel();renderChip();window.__athleticsDevBuildStatus={version:2,state,refresh,render:()=>{renderChip();renderPanel()}};
 await loadBootMarker();await refresh();setInterval(refresh,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});window.addEventListener('pageshow',()=>refresh())
}
start();
})();
