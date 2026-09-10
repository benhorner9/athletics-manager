/* ===== Event AI Result Display Guard V2 ===== */
(function(){
'use strict';
if(window.__amEventAIResultDisplayV2)return;window.__amEventAIResultDisplayV2=1;
function patchOfficial(e,d){
 const results=Array.isArray(e?.results?.[d])?e.results[d]:[],special=new Map(results.filter(r=>r.dnf||r.noMark||r.noHeight).map(r=>[String(r.name||''),r]));if(!special.size)return;
 document.querySelectorAll('#liveScoreboard .fm-board-row').forEach(el=>{const name=el.querySelector('.fm-board-name strong')?.textContent||'',r=special.get(name);if(!r)return;const pos=el.querySelector('.fm-pos'),value=el.querySelector('.fm-board-value');if(pos)pos.textContent='—';if(value)value.textContent=r.dnf?'DNF':r.noHeight?'NH':'NM'});
}
const baseDraw=drawDisciplineScreen;drawDisciplineScreen=function(e,live,discs){baseDraw(e,live,discs);patchOfficial(e,activeEventDisc)};
})();
/* ===== End Event AI Result Display Guard V2 ===== */