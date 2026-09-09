/* ===== Development Update Ordering ===== */
(function(){
'use strict';

const LATEST_RELEASES=[
  {date:'9 September 2026',title:'Premium Athlete & Coach Profiles',items:[
    'Athlete and coach dossiers now use a full-screen premium presentation inspired by the new profile concept, with a cinematic hero, larger portrait, compact metadata and a stronger rating panel.',
    'Athlete profiles keep the existing live systems underneath the redesign: squad agreements, training load, injuries, development grades, qualification, rivalries, career preferences and performance intelligence remain functional.',
    'Athlete navigation now includes quick access to Training, Development and Injuries alongside Overview, Results & Form and Records & Milestones.',
    'Coach dossiers now use the same visual language with role, contract, style, podium, record and athlete-support metrics plus Overview, Coaching & Contract and Career Record tabs.',
    'The layout is optimised for iPad/desktop with a fixed dossier shell and independently scrolling content, while phones collapse to a clean single-column profile.'
  ]},
  {date:'9 September 2026',title:'Full Event Day Audit',items:[
    'Audited all 18 current disciplines across lane races, pack races, Shot Put and High Jump so the event animation, commentary, live scoreboard and final result all follow the same event state.',
    'High Jump live standings now use proper countback: best height, misses at that height and then total failures. An eliminated athlete is no longer incorrectly dropped below someone with a lower clearance.',
    'Track DNFs are removed from the live running order as soon as the athlete pulls up while retaining their last recorded split.',
    'Shot Put live ties now compare the next-best valid marks instead of falling back to the pre-simulated finishing order.',
    'Summit Series now uses the same event simulation and AI realism as normal Event Day, including live continuous track races, throw-by-throw field events and High Jump attempts.'
  ]},
  {date:'9 September 2026',title:'Shot Put Live Panel Repair',items:[
    'Restored throw-by-throw event visuals while keeping the right-hand scoreboard stable.',
    'Only the live scoreboard element is protected from the older commentary-step renderer; the event animation area remains independent.',
    'Scoreboard updates are now triggered immediately after the legacy renderer tries to refresh the panel, eliminating the lag between a throw and the standings update.'
  ]},
  {date:'9 September 2026',title:'Event AI Realism',items:[
    'Ability sets the odds rather than predetermining event results, allowing genuine favourites, bad days and upsets.',
    'Track events include aggressive pacing, late kicks, poor starts, fading, getting boxed in and breakthrough performances.',
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
    if(fresh.length){nativeUnshift.apply(this,fresh);if(this.length>5)this.splice(5)}
    return this.length;
  };
  if(typeof renderMenu==='function')renderMenu();
}

applyLatestReleases();
})();
/* ===== End Development Update Ordering ===== */
