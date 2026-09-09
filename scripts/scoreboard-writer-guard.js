/* ===== Event Day Scoreboard Writer Guard ===== */
(function(){
'use strict';

if(window.__athleticsScoreboardWriterGuard)return;

const proto=Element.prototype;
const descriptor=Object.getOwnPropertyDescriptor(proto,'innerHTML');
if(!descriptor?.get||!descriptor?.set)return;

Object.defineProperty(proto,'innerHTML',{
  configurable:descriptor.configurable,
  enumerable:descriptor.enumerable,
  get:descriptor.get,
  set:function(value){
    const legacyLiveWrite=this?.id==='liveScoreboard'
      && typeof disciplineRunning!=='undefined'
      && disciplineRunning
      && typeof value==='string'
      && value.includes('fm-scoreboard-inner');

    /* event-2d.js still refreshes its original scoreboard on every commentary
       cue. The universal scoreboard owns this panel while a discipline is live,
       so ignoring only that legacy write prevents the two renderers from
       replacing each other and flashing the whole panel. Parent Event Day
       renders and official-result renders remain untouched. */
    if(legacyLiveWrite)return;
    return descriptor.set.call(this,value);
  }
});

window.__athleticsScoreboardWriterGuard=true;

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Scoreboard Flicker Root Fix')){
  UPDATES.unshift({date:'9 September 2026',title:'Scoreboard Flicker Root Fix',items:[
    'Removed the renderer conflict that was still making the right-hand Event Day scoreboard flash after each Shot Put throw.',
    'During a live discipline, the universal scoreboard is now the only system allowed to write to the right-hand scoreboard; the older commentary-step renderer can no longer replace it underneath.',
    'The fix applies across Shot Put, High Jump, track races and Summit Series live events while leaving official result screens unchanged.'
  ]});
}
if(typeof renderMenu==='function')renderMenu();
})();
/* ===== End Event Day Scoreboard Writer Guard ===== */
