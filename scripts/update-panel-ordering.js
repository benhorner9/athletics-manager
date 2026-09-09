/* ===== Development Update Ordering ===== */
(function(){
'use strict';

const LATEST_RELEASES=[
  {date:'9 September 2026',title:'Shot Put Live Panel Repair',items:[
    'Restored throw-by-throw event visuals while keeping the right-hand scoreboard stable.',
    'Only the live scoreboard element is now protected from the older commentary-step renderer; the event animation area is left completely untouched.',
    'The universal scoreboard can continue updating positions, best marks and attempt series after every throw without the two scoreboard renderers fighting each other.'
  ]},
  {date:'9 September 2026',title:'Development Updates — Newest First',items:[
    'The main-menu Development Updates panel now uses one canonical newest-first release list instead of relying on JavaScript load order.',
    'Same-day patches can no longer jump above newer work just because their script loads later.',
    'The panel remains capped at the five most recent releases so it is easy to confirm which build changes are live.'
  ]},
  {date:'9 September 2026',title:'Live Scoreboard Stability',items:[
    'The Event Day scoreboard stays mounted instead of rebuilding after every update.',
    'Shot Put, High Jump and track events update only the rows and values that change while preserving scoreboard scroll position.',
    'Mobile and iPad builds use cache-busted scripts so live scoreboard fixes are picked up reliably.'
  ]},
  {date:'9 September 2026',title:'Event AI Realism',items:[
    'Ability now sets the odds rather than predetermining event results, allowing genuine favourites, bad days and upsets.',
    'Track events include event-day behaviours such as aggressive pacing, late kicks, poor starts, fading, getting boxed in and breakthrough performances.',
    'Rare fatigue- and fitness-sensitive in-race injuries can create a DNF, while throws and High Jump resolve attempt by attempt under pressure.'
  ]},
  {date:'9 September 2026',title:'Universal Live Event Scoreboard',items:[
    'The right-hand Event Day scoreboard is the single live standings panel across track and field events.',
    'Track positions update continuously with individual checkpoint splits; throws update after each attempt and High Jump after each clearance, miss or pass.'
  ]}
];

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

applyLatestReleases();
})();
/* ===== End Development Update Ordering ===== */
