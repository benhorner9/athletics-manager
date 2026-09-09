/* ===== Development Update Ordering ===== */
(function(){
'use strict';

const LATEST_RELEASES=[
  {date:'9 September 2026',title:'Scoreboard Flicker Root Fix',items:[
    'Fixed the actual cause of the Event Day scoreboard flicker: the older 2D viewer and the universal live scoreboard were both rewriting the same right-hand panel after commentary updates.',
    'During a live discipline, only the universal scoreboard is now allowed to update that panel, so Shot Put throws, High Jump attempts and race splits no longer trigger competing full-panel renders.',
    'Official result screens and Event Day navigation still use the normal renderer once the discipline is complete.'
  ]},
  {date:'9 September 2026',title:'Development Updates — Newest First',items:[
    'The main-menu Development Updates panel now uses one canonical newest-first release list instead of relying on JavaScript load order.',
    'Same-day patches can no longer jump above newer work just because their script loads later.',
    'The panel remains capped at the five most recent releases so it is easy to confirm which build changes are live.'
  ]},
  {date:'9 September 2026',title:'Live Scoreboard Stability',items:[
    'The Event Day scoreboard now stays mounted instead of rebuilding after every update, removing the flicker seen during Shot Put.',
    'Shot Put, High Jump and track events update only the rows and values that change while preserving scoreboard scroll position.',
    'The scoreboard script was cache-busted so mobile and iPad builds pick up the stable update.'
  ]},
  {date:'9 September 2026',title:'Event AI Realism',items:[
    'Ability now sets the odds rather than predetermining event results, allowing genuine favourites, bad days and upsets.',
    'Track events include event-day behaviours such as aggressive pacing, late kicks, poor starts, fading, getting boxed in and breakthrough performances.',
    'Rare fatigue- and fitness-sensitive in-race injuries can create a DNF, while throws and High Jump now resolve attempt by attempt under pressure.'
  ]},
  {date:'9 September 2026',title:'Universal Live Event Scoreboard',items:[
    'The right-hand Event Day scoreboard is the single live standings panel across track and field events.',
    'Track positions update continuously with individual checkpoint splits; throws update after each attempt and High Jump after each clearance, miss or pass.'
  ]}
];

function installScoreboardWriterGuard(){
  if(window.__athleticsScoreboardWriterGuard)return;
  const proto=Element.prototype,descriptor=Object.getOwnPropertyDescriptor(proto,'innerHTML');
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
      if(legacyLiveWrite)return;
      return descriptor.set.call(this,value);
    }
  });
  window.__athleticsScoreboardWriterGuard=true;
}

function applyLatestReleases(){
  if(!Array.isArray(UPDATES))return;
  UPDATES.splice(0,UPDATES.length,...LATEST_RELEASES.map(x=>({...x,items:[...x.items]})));
  const nativeUnshift=Array.prototype.unshift;
  UPDATES.unshift=function(...items){
    const fresh=items.filter(Boolean);
    if(fresh.length){
      nativeUnshift.apply(this,fresh);
      if(this.length>5)this.splice(5);
    }
    return this.length;
  };
  if(typeof renderMenu==='function')renderMenu();
}

installScoreboardWriterGuard();
applyLatestReleases();
})();
/* ===== End Development Update Ordering ===== */
