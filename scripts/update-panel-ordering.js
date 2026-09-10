/* ===== Development Update Ordering ===== */
(function(){
'use strict';
if(!Array.isArray(window.UPDATES)&&typeof UPDATES==='undefined')return;

const MAX_VISIBLE_UPDATES=5;
const SEEN_KEY='athletics_manager_seen_update_v2';

/*
 * New release notes should always include an ISO timestamp with timezone.
 * Ordering is derived from this value, never from file/load order.
 */
const RELEASES=[
  {
    timestamp:'2026-09-10T09:39:40+01:00',
    date:'10 September 2026',
    title:'Compact Event & Selection Flow',
    items:[
      'Large Event Days now group disciplines into compact, collapsible event families instead of presenting every discipline as a full-size card.',
      'Summit Series selection now uses expandable event rows, a compact roster toolbar and optional coach-detail panels so large fields are much easier to work through.',
      'Summit selection emails now stay brief and send you to the dedicated selection screen instead of placing the full selection interface inside the inbox.',
      'Completed event groups collapse cleanly while the next unfinished group is prioritised, reducing scrolling as athletics programmes continue to expand.'
    ]
  },
  {
    timestamp:'2026-09-10T07:00:45+01:00',
    date:'10 September 2026',
    title:'Event Day Core Cleanup',
    items:[
      'Removed the old oval race renderer completely. Every live track race now uses one stadium-shaped track with two straights and curved ends, including the final moments of 800m, 1500m and longer races.',
      'Consolidated track presentation into one race core and one live track scoreboard, removing superseded race renderers, duplicate leaderboard scripts and legacy scoreboard overlays from the active build.',
      'Shot Put and High Jump retain their dedicated attempt-by-attempt field scoreboard while legacy scoreboard writes are blocked from replacing the live standings panel.',
      'Completed Summit Series meetings now always provide a clear Return Home action and cannot leave the player trapped on Event Day.',
      'Ran an Event Day integrity pass across normal meetings and Summit Series so live scenes, scoreboards, exit flow, lane limits and completion states have a single authoritative owner.'
    ]
  },
  {
    timestamp:'2026-09-09T22:01:47+01:00',
    date:'9 September 2026',
    title:'Field Events & Summit Event Day',
    items:[
      'Shot Put now plays at a clearer pace with a short landing pause, varied attempt commentary and a measured-distance display tied directly to the recorded throw.',
      'High Jump now shows a visible 2D-dot approach, take-off, clearance or miss and landing, with slower pacing so each featured attempt is easy to follow.',
      'Shot Put and High Jump live standings use completed attempts as their source of truth and update mounted rows instead of rebuilding the scoreboard.',
      'Summit Series meetings use the same modern Event Day presentation, discipline cards, live viewer, commentary, Watch / Skip controls and no-entry skip options as normal competitions.',
      'The Event Day progression safeguards remain active so a presentation problem cannot trap a career inside a running event.'
    ]
  },
  {
    timestamp:'2026-09-09T20:00:00+01:00',
    date:'9 September 2026',
    title:'Premium Athlete & Coach Profiles',
    items:[
      'Athlete and coach dossiers now use a full-screen premium presentation with a larger portrait, compact metadata and a stronger rating panel.',
      'Athlete profiles keep live squad agreements, training load, injuries, development grades, qualification, rivalries, career preferences and performance intelligence.',
      'Athlete navigation includes Training, Development and Injuries alongside Overview, Results & Form and Records & Milestones.',
      'Coach dossiers use the same visual language with role, contract, style, podium, record and athlete-support information.',
      'The layout is optimised for iPad and desktop while phones collapse to a clean single-column profile.'
    ]
  },
  {
    timestamp:'2026-09-09T19:00:00+01:00',
    date:'9 September 2026',
    title:'Full Event Day Audit',
    items:[
      'Audited all current disciplines across lane races, pack races, Shot Put and High Jump so animation, commentary, live standings and final results follow the same event state.',
      'High Jump live standings use proper countback: best height, misses at that height and then total failures.',
      'Track DNFs are removed from the active running order when an athlete pulls up while retaining their last split.',
      'Shot Put ties compare the next-best valid marks instead of falling back to pre-simulated finishing order.',
      'Summit Series uses the same event simulation and AI realism as normal Event Day.'
    ]
  }
];

function parseLegacyDate(value){
  if(!value)return 0;
  const n=Date.parse(value);
  return Number.isFinite(n)?n:0;
}
function stampValue(item){
  const exact=Date.parse(item?.timestamp||'');
  if(Number.isFinite(exact))return exact;
  return parseLegacyDate(item?.date);
}
function displayStamp(item){
  const exact=Date.parse(item?.timestamp||'');
  if(!Number.isFinite(exact))return item?.date||'';
  return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/London'}).format(new Date(exact)).replace(',',' ·');
}
function mergeAndSort(extra=[]){
  const merged=[...RELEASES,...extra];
  const seen=new Set(),deduped=[];
  for(const item of merged){
    if(!item)continue;
    const key=item.timestamp||`${item.date||''}|${item.title||''}`;
    if(seen.has(key))continue;
    seen.add(key);deduped.push({...item,items:Array.isArray(item.items)?[...item.items]:[]});
  }
  deduped.forEach((x,i)=>x.__updateOrder=i);
  deduped.sort((a,b)=>stampValue(b)-stampValue(a)||a.__updateOrder-b.__updateOrder);
  deduped.forEach(x=>delete x.__updateOrder);
  UPDATES.splice(0,UPDATES.length,...deduped.slice(0,MAX_VISIBLE_UPDATES));
}

const legacy=UPDATES.slice();
mergeAndSort(legacy);

/* Any later patch can add a timestamped release and it will still land in the right place. */
const nativeUnshift=Array.prototype.unshift;
const nativePush=Array.prototype.push;
UPDATES.unshift=function(...items){nativeUnshift.apply(this,items);mergeAndSort(this.slice());return this.length};
UPDATES.push=function(...items){nativePush.apply(this,items);mergeAndSort(this.slice());return this.length};
window.addDevelopmentUpdate=function(update){if(!update||!update.timestamp)throw new Error('Development updates require a timestamp');nativeUnshift.call(UPDATES,update);mergeAndSort(UPDATES.slice());if(typeof renderMenu==='function')renderMenu();return update};

function decoratePanel(){
  const panel=document.getElementById('latestUpdatePanel');
  if(!panel)return;
  const entries=[...panel.querySelectorAll('.update-entry')];
  let seenStamp=0;try{seenStamp=Number(localStorage.getItem(SEEN_KEY)||0)}catch(_){ }
  const latestStamp=stampValue(UPDATES[0]);
  entries.forEach((entry,i)=>{
    const u=UPDATES[i];if(!u)return;
    const dateEl=entry.querySelector('.latest-update-head span');
    if(dateEl)dateEl.textContent=displayStamp(u);
    if(i===0&&latestStamp>seenStamp){
      entry.classList.add('is-new-update');
      const label=entry.querySelector('.latest-update-head strong');
      if(label)label.textContent='NEW UPDATE';
    }
  });
  const title=panel.querySelector('.update-panel-title span');
  if(title&&UPDATES[0])title.textContent=`Latest ${displayStamp(UPDATES[0])}`;
  if(latestStamp>seenStamp){try{localStorage.setItem(SEEN_KEY,String(latestStamp))}catch(_){ }}
}

const style=document.createElement('style');
style.textContent='.update-entry.is-new-update{box-shadow:inset 3px 0 var(--accent,#64d393)}.update-entry.is-new-update .latest-update-head strong{color:var(--accent,#64d393)}';
document.head.appendChild(style);

if(typeof renderMenu==='function'){
  const baseRenderMenu=renderMenu;
  renderMenu=function(){mergeAndSort(UPDATES.slice());const out=baseRenderMenu();decoratePanel();return out};
  renderMenu();
}else decoratePanel();
})();
/* ===== End Development Update Ordering ===== */
