/* ===== Event AI Realism Display Guard ===== */
(function(){
'use strict';

const STYLE_ID='eventAIRealismDisplayStyles';
function install(){if(document.getElementById(STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent='.event-ai-dnf-hidden{opacity:0!important}.event-ai-pulled-up{opacity:.58!important}';document.head.appendChild(s)}
function plan(id){const e=liveEventView?.event,d=liveEventView?.disc;return e?.engine?.[d]?.aiRealism?.plans?.[id]||null}
function freezeDNF(){
 const track=liveEventView?.trackOverhaulV4,root=document.querySelector('[data-track-race-v4]');if(!disciplineRunning||!track?.state||!root)return;
 const local=Number(track.local)||0;
 for(const item of track.state.items||[]){const p=plan(item.row.id);if(!p?.dnf||local<p.injuryProgress)continue;const id=String(item.row.id),g=[...root.querySelectorAll('[data-track-runner]')].find(el=>el.getAttribute('data-track-runner')===id);if(!g)continue;
  let clone=root.querySelector(`[data-event-ai-stopped="${id.replace(/"/g,'')}"]`);if(!clone){clone=g.cloneNode(true);clone.removeAttribute('data-track-runner');clone.setAttribute('data-event-ai-stopped',id);clone.classList.add('event-ai-pulled-up');const t=clone.querySelector('[data-track-label]');if(t)t.textContent='DNF';g.parentElement?.appendChild(clone)}
  g.classList.add('event-ai-dnf-hidden');
 }
}
function patchOfficial(e,d){
 const results=Array.isArray(e?.results?.[d])?e.results[d]:[],special=new Map(results.filter(r=>r.dnf||r.noMark||r.noHeight).map(r=>[String(r.name||''),r]));if(!special.size)return;
 document.querySelectorAll('#liveScoreboard .fm-board-row').forEach(el=>{const name=el.querySelector('.fm-board-name strong')?.textContent||'',r=special.get(name);if(!r)return;const pos=el.querySelector('.fm-pos'),value=el.querySelector('.fm-board-value');if(pos)pos.textContent='—';if(value)value.textContent=r.dnf?'DNF':r.noHeight?'NH':'NM'});
}

install();window.setInterval(freezeDNF,45);
const baseDraw=drawDisciplineScreen;
drawDisciplineScreen=function(e,live,discs){baseDraw(e,live,discs);patchOfficial(e,activeEventDisc)};
})();
/* ===== End Event AI Realism Display Guard ===== */
