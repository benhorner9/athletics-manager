from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)

# Competition Journey owns the completed-meeting summary and canonical return-home route.
path = 'scripts/competition-journey-v2.js'
text = read(path)
text = replace_once(
    text,
    "function saveSafe(){try{save()}catch(_){}}\nfunction actions(){return safe(()=>core()?.getUnresolvedActions?.()||[],[])}",
    """function saveSafe(){try{save()}catch(_){}}\nfunction eventCompleted(e){const m=e?._v3Summit||e?.__summit;if(m)return !!m.completed;return !!e?.completed||completeEventIfReady(e)}\nfunction showCompletedMeeting(e){if(!e||!eventCompleted(e))return false;activeEventDisc=null;competitionMode='overview';if(e?._v3Summit||e?.__summit||summitRouteActive()){saveSafe();drawCompetition();return true}const st=ui();st.eventId=e.id;st.tab='results';st.page=0;saveSafe();if(typeof currentView!=='undefined'&&currentView==='competition')drawCompetition();else view('competition');return true}\nfunction returnHomeFromEvent(e){if(e&&!eventCompleted(e))completeEventIfReady(e);const st=ui();st.eventId=null;st.tab='programme';st.page=0;activeEventDisc=null;competitionMode='overview';try{if(typeof summitLiveMeetingNumber!=='undefined'&&(e?._v3Summit||e?.__summit))summitLiveMeetingNumber=null}catch(_){};try{window.__athleticsCompetitionJourneyRouteGuard?.setHistoricalEvent?.(null)}catch(_){};saveSafe();view('home');return true}\nfunction actions(){return safe(()=>core()?.getUnresolvedActions?.()||[],[])}""",
    'competition journey completion helpers'
)
text = replace_once(
    text,
    "<div class=\"cj-next-actions\"><button class=\"btn secondary\" data-cj-calendar>COMPETITION CALENDAR</button>${next?`<button class=\"btn ghost\" data-cj-next=\"${esc(next.id)}\">NEXT COMPETITION · W${next.week}</button>`:''}<button class=\"btn primary\" data-cj-home>RETURN HOME</button></div>",
    "<div class=\"cj-next-actions\"><button class=\"btn primary\" data-cj-home>RETURN HOME</button><button class=\"btn secondary\" data-cj-calendar>COMPETITION CALENDAR</button>${next?`<button class=\"btn ghost\" data-cj-next=\"${esc(next.id)}\">NEXT COMPETITION · W${next.week}</button>`:''}</div>",
    'results action order'
)
text = replace_once(
    text,
    "<div class=\"cj-command-actions\">${selectionCTA(e)}<button class=\"btn ghost\" data-cj-calendar>CALENDAR</button></div>",
    "<div class=\"cj-command-actions\">${e.completed?'<button class=\"btn primary\" data-cj-home>RETURN HOME</button>':`${selectionCTA(e)}<button class=\"btn ghost\" data-cj-calendar>CALENDAR</button>`}</div>",
    'completed command action'
)
text = replace_once(
    text,
    "root.querySelectorAll('[data-cj-calendar]').forEach(b=>b.onclick=()=>view('calendar'));root.querySelector('[data-cj-home]')?.addEventListener('click',()=>{completeEventIfReady(e);ui().eventId=null;activeEventDisc=null;competitionMode='overview';saveSafe();view('home')});",
    "root.querySelectorAll('[data-cj-calendar]').forEach(b=>b.onclick=()=>view('calendar'));root.querySelectorAll('[data-cj-home]').forEach(b=>b.onclick=()=>returnHomeFromEvent(e));",
    'canonical home binding'
)
text = replace_once(
    text,
    "const back=$('v3back');if(back){back.textContent=shell.classList.contains('lv4event')?'‹':'‹ PROGRAMME';back.setAttribute('aria-label','Back to competition programme')}const day=$('v3day');if(day&&!e._v3Summit){day.textContent=e.completed?'RESULTS OVERVIEW':'COMPETITION OVERVIEW';day.onclick=()=>{if(disciplineRunning)return safe(()=>toast('Finish the live event first'),null);openEvent(e.id,e.completed?'results':'programme')}}",
    "const complete=eventCompleted(e),back=$('v3back');if(back){back.textContent=complete?'‹ RESULTS':shell.classList.contains('lv4event')?'‹':'‹ PROGRAMME';back.setAttribute('aria-label',complete?'Back to completed competition results':'Back to competition programme');if(complete)back.onclick=()=>showCompletedMeeting(e)}const day=$('v3day');if(day){day.textContent=complete?'RETURN HOME':'COMPETITION OVERVIEW';day.classList.toggle('primary',complete);day.classList.toggle('ghost',!complete);day.onclick=()=>{if(disciplineRunning)return safe(()=>toast('Finish the live event first'),null);if(complete)return returnHomeFromEvent(e);if(e?._v3Summit||e?.__summit){competitionMode='overview';drawCompetition();return}openEvent(e.id,'programme')}}",
    'live completed navigation decoration'
)
text = replace_once(
    text,
    "window.openCompetitionOverview=openEvent;\nwindow.__athleticsCompetitionJourneyV2={version:2,render:drawV2,openEvent,legacy:legacyDrawCompetition,debug:",
    "window.openCompetitionOverview=openEvent;\nwindow.returnFromCompletedEvent=e=>showCompletedMeeting(e||resolveEvent());\nwindow.returnHomeFromCompletedEvent=e=>returnHomeFromEvent(e||resolveEvent());\nwindow.__athleticsCompetitionJourneyV2={version:2,render:drawV2,openEvent,showCompletedMeeting,returnHomeFromEvent,legacy:legacyDrawCompetition,debug:",
    'competition journey public completion authority'
)
write(path, text)

# Broadcast V4 must never strand the player on the final discipline result.
path = 'scripts/live-event-broadcast-v4.js'
text = read(path)
text = replace_once(
    text,
    "function draw(e,can,ds){try{",
    "function meetingCompleted(e){const m=e?._v3Summit||e?.__summit;return m?!!m.completed:!!e?.completed}\nfunction routeCompletedMeeting(e,mode='summary'){if(mode==='home'&&typeof returnHomeFromCompletedEvent==='function')return returnHomeFromCompletedEvent(e);if(mode!=='home'&&typeof returnFromCompletedEvent==='function')return returnFromCompletedEvent(e);activeEventDisc=null;competitionMode='overview';try{if(mode==='home'&&typeof summitLiveMeetingNumber!=='undefined'&&(e?._v3Summit||e?.__summit))summitLiveMeetingNumber=null}catch(_){};saveNow();if(mode==='home')view('home');else drawCompetition();return true}\nfunction draw(e,can,ds){try{",
    'broadcast completion router'
)
text = replace_once(
    text,
    "<button id=\"v3day\" class=\"btn ghost\">${e.completed?'COMPLETE EVENT':'EVENT DAY'}</button>",
    "<button id=\"v3day\" class=\"btn ${meetingCompleted(e)?'primary':'ghost'}\">${meetingCompleted(e)?'RETURN HOME':'EVENT DAY'}</button>",
    'broadcast completed footer button'
)
text = replace_once(
    text,
    "$('v3back').onclick=()=>{if(disciplineRunning)return toast('Finish or skip the live event first');competitionMode='overview';drawCompetition()};",
    "$('v3back').onclick=()=>{if(disciplineRunning)return toast('Finish or skip the live event first');if(meetingCompleted(e))return routeCompletedMeeting(e,'summary');competitionMode='overview';drawCompetition()};",
    'broadcast back route'
)
text = replace_once(
    text,
    "else{start.textContent=e.completed?'COMPLETE COMPETITION':'EVENT DAY';start.onclick=()=>{if(e.completed){activeEventDisc=null;competitionMode='overview';if(e._v3Summit){try{summitLiveMeetingNumber=null}catch(_){};view('league')}else if(typeof returnFromCompletedEvent==='function')returnFromCompletedEvent();else view('home')}else{competitionMode='overview';drawCompetition()}}}",
    "else{start.textContent=meetingCompleted(e)?'RETURN HOME':'EVENT DAY';start.onclick=()=>{if(meetingCompleted(e))return routeCompletedMeeting(e,'home');competitionMode='overview';drawCompetition()}}",
    'broadcast final primary action'
)
text = replace_once(
    text,
    "$('v3day').onclick=()=>{if(disciplineRunning)return toast('Finish or skip the live event first');if(e.completed){activeEventDisc=null;competitionMode='overview';if(e._v3Summit){try{summitLiveMeetingNumber=null}catch(_){};view('league')}else if(typeof returnFromCompletedEvent==='function')returnFromCompletedEvent();else view('home')}else{competitionMode='overview';drawCompetition()}};",
    "$('v3day').onclick=()=>{if(disciplineRunning)return toast('Finish or skip the live event first');if(meetingCompleted(e))return routeCompletedMeeting(e,'home');competitionMode='overview';drawCompetition()};",
    'broadcast day/home action'
)
text = replace_once(
    text,
    "disciplineRunning=false;live=null;liveEventView=null;activeEventDisc=c.d;competitionMode='discipline';saveNow();drawCompetition()",
    "disciplineRunning=false;live=null;liveEventView=null;saveNow();if(meetingCompleted(c.e))return routeCompletedMeeting(c.e,'summary');activeEventDisc=c.d;competitionMode='discipline';drawCompetition()",
    'automatic final-event summary route'
)
text = replace_once(
    text,
    "function skipToResult(e,d,c){try{if(c&&live===c){finish(c)}else if(!Array.isArray(e.results?.[d])){const r=pending(e,d);commit(e,d,r)}activeEventDisc=d;competitionMode='discipline';saveNow();drawCompetition();try{toast(`${label(d)} result confirmed`)}catch(_){}}catch(err){",
    "function skipToResult(e,d,c){try{if(c&&live===c)return finish(c);if(!Array.isArray(e.results?.[d])){const r=pending(e,d);commit(e,d,r)}if(meetingCompleted(e))return routeCompletedMeeting(e,'summary');activeEventDisc=d;competitionMode='discipline';saveNow();drawCompetition();try{toast(`${label(d)} result confirmed`)}catch(_){}}catch(err){",
    'instant-result final-event route'
)
write(path, text)

# Summit completed overview already has the right control; standardise its label.
path = 'scripts/summit-event-unified.js'
text = read(path)
text = replace_once(text, "b.textContent='RETURN HOME →';", "b.textContent='RETURN HOME';", 'summit home label')
write(path, text)

# Cache bust the three active event layers.
path = 'game.html'
text = read(path)
for old, new, label in [
    ('scripts/summit-event-unified.js?v=20260911-summitroute2', 'scripts/summit-event-unified.js?v=20260914-exit1', 'summit cache bust'),
    ('scripts/live-event-broadcast-v4.js?v=20260913-relay-wide2', 'scripts/live-event-broadcast-v4.js?v=20260914-exit1', 'broadcast cache bust'),
    ('scripts/competition-journey-v2.js?v=20260913-audit6', 'scripts/competition-journey-v2.js?v=20260914-exit1', 'journey cache bust'),
]:
    text = replace_once(text, old, new, label)
write(path, text)

# Lock the navigation contract into regression checks so it cannot drift back into multiple escape routes.
path = 'tools/static-regression.mjs'
text = read(path)
anchor = "if(!html.includes('scripts/world-season-v2.js?v=20260913-relayrank1'))fail('Active Rankings V2 relay cache-bust is missing from game.html.');\n"
insert = anchor + """const competitionExitJourney=read('scripts/competition-journey-v2.js');
for(const token of ['function eventCompleted(e)','function showCompletedMeeting(e)','function returnHomeFromEvent(e)',"window.returnFromCompletedEvent=e=>showCompletedMeeting",'RETURN HOME'])if(!competitionExitJourney.includes(token))fail(`Competition completion navigation contract missing: ${token}`);
const competitionExitBroadcast=read('scripts/live-event-broadcast-v4.js');
for(const token of ['function meetingCompleted(e)',"function routeCompletedMeeting(e,mode='summary')","if(meetingCompleted(c.e))return routeCompletedMeeting(c.e,'summary')","if(c&&live===c)return finish(c)"])if(!competitionExitBroadcast.includes(token))fail(`Broadcast completion navigation contract missing: ${token}`);
const summitExitAuthority=read('scripts/summit-event-unified.js');
if(!summitExitAuthority.includes("b.textContent='RETURN HOME';"))fail('Summit completion must use the canonical RETURN HOME label.');
for(const token of ['scripts/summit-event-unified.js?v=20260914-exit1','scripts/live-event-broadcast-v4.js?v=20260914-exit1','scripts/competition-journey-v2.js?v=20260914-exit1'])if(!html.includes(token))fail(`Competition completion cache-bust missing: ${token}`);
"""
text = replace_once(text, anchor, insert, 'competition completion regression contract')
write(path, text)

print('Unified completed-event navigation staged successfully.')
