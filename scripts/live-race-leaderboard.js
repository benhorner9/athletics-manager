/* ===== Live Race Leaderboard Sync ===== */
(function(){
'use strict';

const STYLE_ID='liveRaceLeaderboardStyles';
let lastKey='';

function esc(v){return typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'')}
function managed(){return typeof managedNation==='function'?managedNation():''}

function installStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');style.id=STYLE_ID;
  style.textContent=`
    .track-v4-board:has(.track-live-order) .track-v4-leaders{display:none!important}
    .track-live-order{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;align-content:center;min-width:0}
    .track-live-row{display:grid;grid-template-columns:22px minmax(0,1fr);gap:7px;align-items:center;min-width:0;padding:5px 7px;border-radius:7px;background:rgba(255,255,255,.04);transition:background .15s ease,transform .15s ease}
    .track-live-row.managed{outline:1px solid rgba(255,255,255,.28)}
    .track-live-row.changed{background:rgba(255,255,255,.10);transform:translateY(-1px)}
    .track-live-pos{font-size:12px;font-weight:950;color:#f0f6f8;text-align:center;font-variant-numeric:tabular-nums}
    .track-live-athlete{min-width:0}.track-live-athlete strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:#e9f2f6}.track-live-athlete small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px;color:#829ba7;margin-top:1px}
    @media(max-width:900px){.track-live-order{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:650px){.track-v4-board{grid-template-columns:96px minmax(0,1fr)!important}.track-live-order{display:flex;overflow-x:auto;gap:5px;padding-bottom:2px;scrollbar-width:none}.track-live-order::-webkit-scrollbar{display:none}.track-live-row{flex:0 0 126px}.track-live-athlete strong{font-size:9px}.track-live-athlete small{font-size:7px}}
  `;
  document.head.appendChild(style);
}

function rowHTML(row,index,previous){
  const pos=index+1,was=previous?.get(row.id),changed=Number.isFinite(was)&&was!==pos;
  return `<div class="track-live-row ${row.nation===managed()?'managed':''} ${changed?'changed':''}" data-live-athlete="${esc(row.id)}"><span class="track-live-pos">${pos}</span><div class="track-live-athlete"><strong>${esc(row.name)}</strong><small>${esc(typeof nationName==='function'?nationName(row.nation):row.nation||'')}</small></div></div>`;
}

function sync(){
  const track=liveEventView?.trackOverhaulV4,state=track?.state;
  if(!disciplineRunning||!track||!state?.order?.length){lastKey='';return}
  const root=document.querySelector('[data-track-race-v4]');if(!root)return;
  const board=root.querySelector('.track-v4-board');if(!board)return;
  let live=board.querySelector('.track-live-order');
  if(!live){live=document.createElement('div');live.className='track-live-order';live.setAttribute('aria-label','Live race positions');board.appendChild(live)}
  const order=state.order,key=order.map(r=>r.id).join('|');
  if(key===lastKey)return;
  const previous=new Map();live.querySelectorAll('[data-live-athlete]').forEach((el,i)=>previous.set(el.getAttribute('data-live-athlete'),i+1));
  live.innerHTML=order.map((r,i)=>rowHTML(r,i,previous)).join('');
  lastKey=key;
  const headline=root.querySelector('[data-track-order]');if(headline)headline.textContent=order.slice(0,3).map((r,i)=>`${i+1} ${String(r.name||'').trim().split(/\s+/).at(-1)?.toUpperCase()||''}`).join(' • ');
  window.setTimeout(()=>live?.querySelectorAll('.changed').forEach(el=>el.classList.remove('changed')),180);
}

installStyles();
window.setInterval(sync,80);
})();
/* ===== End Live Race Leaderboard Sync ===== */