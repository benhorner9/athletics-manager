/* ===== Development Update Ordering ===== */
(function(){
'use strict';
const LATEST_RELEASES=[
  {date:'9 September 2026',title:'Event Day Core Cleanup',items:[
    'Removed the old oval race renderer completely. Every live track race now uses one stadium-shaped track with two straights and curved ends, including the final moments of 800m, 1500m and longer races.',
    'Consolidated track presentation into one race core and one live track scoreboard, removing superseded race renderers, duplicate leaderboard scripts and legacy scoreboard overlays from the active build.',
    'Shot Put and High Jump retain their dedicated attempt-by-attempt field scoreboard while legacy scoreboard writes are blocked from replacing the live standings panel.',
    'Completed Summit Series meetings now always provide a clear Return Home action and cannot leave the player trapped on Event Day.',
    'Ran an Event Day integrity pass across normal meetings and Summit Series so live scenes, scoreboards, exit flow, lane limits and completion states have a single authoritative owner.'
  ]},
  {date:'9 September 2026',title:'Field Events & Summit Event Day',items:[
    'Shot Put now plays at a clearer pace with a short landing pause, varied attempt commentary and a measured-distance display tied directly to the recorded throw.',
    'High Jump now shows a visible 2D-dot approach, take-off, clearance or miss and landing, with slower pacing so each featured attempt is easy to follow.',
    'Shot Put and High Jump live standings use completed attempts as their source of truth and update mounted rows instead of rebuilding the scoreboard.',
    'Summit Series meetings use the same modern Event Day presentation, discipline cards, live viewer, commentary, Watch / Skip controls and no-entry skip options as normal competitions.',
    'The Event Day progression safeguards remain active so a presentation problem cannot trap a career inside a running event.'
  ]},
  {date:'9 September 2026',title:'Premium Athlete & Coach Profiles',items:[
    'Athlete and coach dossiers now use a full-screen premium presentation with a larger portrait, compact metadata and a stronger rating panel.',
    'Athlete profiles keep live squad agreements, training load, injuries, development grades, qualification, rivalries, career preferences and performance intelligence.',
    'Athlete navigation includes Training, Development and Injuries alongside Overview, Results & Form and Records & Milestones.',
    'Coach dossiers use the same visual language with role, contract, style, podium, record and athlete-support information.',
    'The layout is optimised for iPad and desktop while phones collapse to a clean single-column profile.'
  ]},
  {date:'9 September 2026',title:'Full Event Day Audit',items:[
    'Audited all 18 current disciplines across lane races, pack races, Shot Put and High Jump so animation, commentary, live standings and final results follow the same event state.',
    'High Jump live standings use proper countback: best height, misses at that height and then total failures.',
    'Track DNFs are removed from the active running order when an athlete pulls up while retaining their last split.',
    'Shot Put ties compare the next-best valid marks instead of falling back to pre-simulated finishing order.',
    'Summit Series uses the same event simulation and AI realism as normal Event Day.'
  ]},
  {date:'9 September 2026',title:'Event AI Realism',items:[
    'Ability sets the odds rather than predetermining results, allowing genuine favourites, bad days and upsets.',
    'Track events include aggressive pacing, late kicks, poor starts, fading, getting boxed in and breakthrough performances.',
    'Rare fatigue- and fitness-sensitive in-race injuries can create a DNF, while throws and High Jump resolve attempt by attempt under pressure.'
  ]}
];
function applyLatestReleases(){if(!Array.isArray(UPDATES))return;UPDATES.splice(0,UPDATES.length,...LATEST_RELEASES.map(x=>({...x,items:[...x.items]})));const nativeUnshift=Array.prototype.unshift;UPDATES.unshift=function(...items){const fresh=items.filter(Boolean);if(fresh.length){nativeUnshift.apply(this,fresh);if(this.length>5)this.splice(5)}return this.length};if(typeof renderMenu==='function')renderMenu()}
applyLatestReleases();
})();
/* ===== End Development Update Ordering ===== */