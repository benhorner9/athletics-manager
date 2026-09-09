/* ===== Squad Screen Tidy ===== */
(function(){
'use strict';

const SQUAD_TIDY_VERSION=1;

function squadOverviewHTML(squad){
  const disciplines=Object.keys(DISCIPLINES),covered=new Set(squad.map(a=>a.disc));
  const men=squad.filter(a=>String(a.disc||'').startsWith('M')).length;
  const women=squad.filter(a=>String(a.disc||'').startsWith('W')).length;
  const uncovered=Math.max(0,disciplines.length-covered.size);
  return `<div class="squad-overview-compact" aria-label="Squad overview">
    <div><small>Squad places</small><strong>${squad.length} / ${SQUAD_LIMIT}</strong></div>
    <div><small>Squad split</small><strong>${men} men · ${women} women</strong></div>
    <div><small>Events covered</small><strong>${covered.size} / ${disciplines.length}</strong></div>
    <div class="${uncovered?'needs-cover':'complete-cover'}"><small>Without squad athlete</small><strong>${uncovered}</strong></div>
  </div>`;
}

function installSquadTidyStyles(){
  if(document.getElementById('squad-screen-tidy-styles'))return;
  const style=document.createElement('style');style.id='squad-screen-tidy-styles';
  style.textContent=`
    .squad-overview-compact{display:flex;align-items:stretch;gap:0;margin:10px 0 14px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(5,18,29,.5);overflow:hidden}
    .squad-overview-compact>div{min-width:0;flex:1;padding:9px 12px;border-right:1px solid rgba(255,255,255,.07)}
    .squad-overview-compact>div:last-child{border-right:0}
    .squad-overview-compact small{display:block;margin-bottom:3px;color:var(--muted,#8fa5b2);font-size:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .squad-overview-compact strong{display:block;color:var(--text,#eef5f8);font-size:13px;font-weight:900;line-height:1.2}
    .squad-overview-compact .needs-cover strong{color:#f2c879}
    .squad-overview-compact .complete-cover strong{color:#8fe0b1}
    @media(max-width:620px){.squad-overview-compact{display:grid;grid-template-columns:1fr 1fr}.squad-overview-compact>div{border-right:1px solid rgba(255,255,255,.07);border-bottom:1px solid rgba(255,255,255,.07)}.squad-overview-compact>div:nth-child(2n){border-right:0}.squad-overview-compact>div:nth-last-child(-n+2){border-bottom:0}}
  `;
  document.head.appendChild(style);
}

installSquadTidyStyles();

const _squadTidyBaseDrawSquad=drawSquad;
drawSquad=function(){
  _squadTidyBaseDrawSquad();
  const root=$(currentView==='pool'?'pool':'squad');if(!root)return;
  const oldBalance=root.querySelector('.squad-balance');if(!oldBalance)return;
  if(currentView==='squad')oldBalance.outerHTML=squadOverviewHTML(managedTeam());
  else oldBalance.remove();
};

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Squad Screen Tidy')){
  UPDATES.unshift({date:'9 September 2026',title:'Squad Screen Tidy',items:[
    'Removed the discipline-by-discipline athlete-count cards from Squad and National Pool so the management screens continue to scale cleanly as more athletics events are added.',
    'The Squad screen now uses one compact overview showing squad capacity, men/women split, event coverage and the number of disciplines without a current squad athlete.',
    'Event-by-event detail remains available through the sortable Event column, so no squad-management information has been lost.'
  ]});
}

if(currentView==='squad'||currentView==='pool')drawSquad();
if(typeof renderMenu==='function')renderMenu();
})();
/* ===== End Squad Screen Tidy ===== */
