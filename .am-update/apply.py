from pathlib import Path

root=Path('.')
journey=root/'scripts/competition-journey-v2.js'
summit=root/'scripts/summit-event-unified.js'
html=root/'game.html'
static=root/'tools/static-regression.mjs'

j=journey.read_text()
old="const eventDiscs=e=>(e?.disc||[]).filter(d=>d&&d!=='ALL');\nconst ui=()=>{"
new="const eventDiscs=e=>(e?.disc||[]).filter(d=>d&&d!=='ALL');\nfunction summitRouteActive(){const live=safe(()=>typeof summitCurrentLiveMeeting==='function'?summitCurrentLiveMeeting():null,null);if(live)return true;return !!safe(()=>typeof summitLiveMeetingNumber!=='undefined'&&summitLiveMeetingNumber&&summitSeasonState()?.meetings?.[summitLiveMeetingNumber],null)}\nfunction completeEventIfReady(e){const ds=eventDiscs(e);if(!e||e.completed||!ds.length||!ds.every(d=>Array.isArray(e.results?.[d])))return !!e?.completed;try{finaliseEvent(e,false)}catch(err){console.error('[Athletics Manager] Competition completion reconciliation failed',err)}return !!e.completed}\nconst ui=()=>{"
if old not in j: raise SystemExit('Competition helper insertion point missing')
j=j.replace(old,new,1)
old="function drawV2(){const e=resolveEvent();if(!e){legacyDrawCompetition();return}ui().eventId=e.id;try{"
new="function drawV2(){if(summitRouteActive()){legacyDrawCompetition();return}const e=resolveEvent();if(!e){legacyDrawCompetition();return}ui().eventId=e.id;try{"
if old not in j: raise SystemExit('Competition drawV2 contract missing')
j=j.replace(old,new,1)
old="root.querySelector('[data-cj-home]')?.addEventListener('click',()=>view('home'));"
new="root.querySelector('[data-cj-home]')?.addEventListener('click',()=>{completeEventIfReady(e);ui().eventId=null;activeEventDisc=null;competitionMode='overview';saveSafe();view('home')});"
if old not in j: raise SystemExit('Competition Return Home binding missing')
j=j.replace(old,new,1)
journey.write_text(j)

s=summit.read_text()
old="function meeting(){const live=typeof summitCurrentLiveMeeting==='function'?summitCurrentLiveMeeting():null;if(live)return live;return typeof summitLiveMeetingNumber!=='undefined'&&summitLiveMeetingNumber?summitSeasonState().meetings?.[summitLiveMeetingNumber]||null:null}"
new="function reconcileMeeting(m){if(m&&!m.completed&&all().length&&all().every(d=>Array.isArray(m.results?.[d])))finishSummitMeeting(m);return m}\nfunction meeting(){const live=typeof summitCurrentLiveMeeting==='function'?summitCurrentLiveMeeting():null;if(live)return reconcileMeeting(live);return reconcileMeeting(typeof summitLiveMeetingNumber!=='undefined'&&summitLiveMeetingNumber?summitSeasonState().meetings?.[summitLiveMeetingNumber]||null:null)}"
if old not in s: raise SystemExit('Summit meeting resolver contract missing')
s=s.replace(old,new,1)
old="b.onclick=()=>{competitionMode='overview';activeEventDisc=null;view('home')}"
new="b.onclick=()=>{competitionMode='overview';activeEventDisc=null;if(typeof summitLiveMeetingNumber!=='undefined')summitLiveMeetingNumber=null;saveNow();view('home')}"
if old not in s: raise SystemExit('Summit Return Home binding missing')
s=s.replace(old,new,1)
summit.write_text(s)

h=html.read_text()
repls={
 'scripts/summit-event-unified.js?v=20260909-corecleanup1':'scripts/summit-event-unified.js?v=20260911-summitroute1',
 'scripts/competition-journey-v2.js?v=20260910-competition2':'scripts/competition-journey-v2.js?v=20260911-summitroute1'
}
for old,new in repls.items():
 if old not in h: raise SystemExit(f'Cache key missing: {old}')
 h=h.replace(old,new,1)
html.write_text(h)

r=static.read_text()
old="'scripts/competition-journey-v2.js':[\n  ['window.__athleticsCompetitionJourneyV2','Competition Journey public handle is missing']\n ],"
new="'scripts/competition-journey-v2.js':[\n  ['window.__athleticsCompetitionJourneyV2','Competition Journey public handle is missing'],\n  ['function summitRouteActive()','Competition Journey must delegate active Summit routes to the Summit authority'],\n  ['function completeEventIfReady(e)','Competition Journey must reconcile fully-resulted meetings before returning Home']\n ],\n 'scripts/summit-event-unified.js':[\n  ['function reconcileMeeting(m)','Summit meetings with every result must reconcile to completed state'],\n  [\"summitLiveMeetingNumber=null;saveNow();view('home')\",'Returning Home from Summit must clear the remembered Summit route']\n ],"
if old not in r: raise SystemExit('Static source contract block missing')
r=r.replace(old,new,1)
static.write_text(r)
