from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new, label):
    text = read(path)
    if old not in text:
        raise SystemExit(f'{label}: source contract missing in {path}')
    write(path, text.replace(old, new, 1))


relay = 'scripts/relay-v1.js'

replace_once(
    relay,
    '''const RELAYS={\n M4X100:{label:"Men's 4×100m Relay",gender:'M',standard:39.20,world:36.84},\n W4X100:{label:"Women's 4×100m Relay",gender:'W',standard:43.80,world:40.82}\n};''',
    '''const RELAYS={\n M4X100:{label:"Men's 4×100m Relay",gender:'M',standard:39.20,world:36.84,worldHolder:'Jamaica',worldNation:'JAMAICA',worldSeason:2012},\n W4X100:{label:"Women's 4×100m Relay",gender:'W',standard:43.80,world:40.82,worldHolder:'United States',worldNation:'USA',worldSeason:2012}\n};''',
    'relay world record metadata'
)

replace_once(
    relay,
    '''function relayState(){\n const st=s.relayV1??={version:1,athletes:{},records:{world:{},national:{}},history:[]};\n st.version=1;st.athletes??={};st.records??={world:{},national:{}};st.records.world??={};st.records.national??={};st.history??=[];\n for(const [d,q] of Object.entries(RELAYS))st.records.world[d]??={value:q.world,holder:'World benchmark',nation:'WORLD',season:'Pre-career'};\n return st;\n}''',
    '''function syncCanonicalRelayRecords(st){\n if(!s?.records||!st?.records)return;\n s.records.world??={};s.records.national??={};\n for(const d of Object.keys(RELAYS)){\n  if(st.records.world[d])s.records.world[d]=st.records.world[d];\n }\n for(const [nation,records] of Object.entries(st.records.national||{})){\n  s.records.national[nation]??={};\n  for(const d of Object.keys(RELAYS))if(records?.[d])s.records.national[nation][d]=records[d];\n }\n}\nfunction relayState(){\n const st=s.relayV1??={version:1,athletes:{},records:{world:{},national:{}},history:[]};\n st.version=1;st.athletes??={};st.records??={world:{},national:{}};st.records.world??={};st.records.national??={};st.history??=[];\n for(const [d,q] of Object.entries(RELAYS)){\n  const wr=st.records.world[d];\n  if(!wr||(wr.season==='Pre-career'&&Math.abs(num(wr.value)-q.world)<.001))st.records.world[d]={value:q.world,holder:q.worldHolder,nation:q.worldNation,season:q.worldSeason};\n }\n syncCanonicalRelayRecords(st);\n return st;\n}''',
    'relay record authority sync'
)

replace_once(
    relay,
    '''function recordRelayMark(e,d,row){\n if(row.dq||row.dns||!Number.isFinite(row.perf))return [];\n const st=relayState(),ach=[];let wr=st.records.world[d];if(!wr||row.perf<wr.value-.0001){st.records.world[d]={value:row.perf,holder:row.name,nation:row.nation,season:s.game.season,week:s.game.week,event:e.name};ach.push('WR')}\n st.records.national[row.nation]??={};const nr=st.records.national[row.nation][d];if(!nr){st.records.national[row.nation][d]={value:row.perf,holder:row.name,nation:row.nation,season:s.game.season,week:s.game.week,event:e.name}}else if(row.perf<nr.value-.0001){st.records.national[row.nation][d]={value:row.perf,holder:row.name,nation:row.nation,season:s.game.season,week:s.game.week,event:e.name};if(!ach.includes('WR'))ach.push('NR')}\n return ach;\n}''',
    '''function recordRelayMark(e,d,row){\n if(row.dq||row.dns||!Number.isFinite(row.perf))return [];\n const st=relayState(),ach=[];let wr=st.records.world[d];if(!wr||row.perf<wr.value-.0001){st.records.world[d]={value:row.perf,holder:row.name,nation:row.nation,season:s.game.season,week:s.game.week,event:e.name};ach.push('WR')}\n st.records.national[row.nation]??={};const nr=st.records.national[row.nation][d];if(!nr){st.records.national[row.nation][d]={value:row.perf,holder:row.name,nation:row.nation,season:s.game.season,week:s.game.week,event:e.name}}else if(row.perf<nr.value-.0001){st.records.national[row.nation][d]={value:row.perf,holder:row.name,nation:row.nation,season:s.game.season,week:s.game.week,event:e.name};if(!ach.includes('WR'))ach.push('NR')}\n syncCanonicalRelayRecords(st);\n return ach;\n}''',
    'relay record updates'
)

replace_once(
    relay,
    '''e.results[d]=rows;relayState().history.push({season:s.game.season,week:s.game.week,event:e.name,eventId:e.id,disc:d,results:rows.map(r=>({nation:r.nation,perf:r.perf,dq:r.dq,dns:!!r.dns,withdrawalReason:r.withdrawalReason||'',rank:r.rank,roster:r.relayRoster||[]}))});relayState().history=relayState().history.slice(-80);saveSafe();''',
    '''e.results[d]=rows;relayState().history.push({season:s.game.season,week:s.game.week,event:e.name,eventId:e.id,disc:d,results:rows.map(r=>({nation:r.nation,perf:r.perf,points:num(r.points),dq:r.dq,dns:!!r.dns,withdrawalReason:r.withdrawalReason||'',rank:r.rank,roster:r.relayRoster||[]}))});relayState().history=relayState().history.slice(-80);saveSafe();''',
    'relay history ranking points'
)

ranking_code = r'''\nfunction allRankingDiscKeys(){return [...Object.keys(DISCIPLINES),...Object.keys(RELAYS).filter(d=>!Object.keys(DISCIPLINES).includes(d))]}\nfunction relayRankingRows(d){\n const byNation=new Map();\n for(const e of s?.events||[]){\n  const rows=e?.results?.[d];if(!Array.isArray(rows))continue;\n  for(const r of rows){\n   if(!r?.nation)continue;\n   const row=byNation.get(r.nation)||{nation:r.nation,points:0,starts:0,best:null,wins:0,podiums:0};\n   row.points+=num(r.points);\n   if(!r.dns)row.starts++;\n   if(!r.dq&&!r.dns&&Number.isFinite(Number(r.perf))){\n    const mark=Number(r.perf);row.best=row.best==null?mark:Math.min(row.best,mark);\n    if(num(r.rank)===1)row.wins++;if(num(r.rank)>=1&&num(r.rank)<=3)row.podiums++;\n   }\n   byNation.set(r.nation,row);\n  }\n }\n return [...byNation.values()].filter(r=>r.starts>0||r.points>0).sort((a,b)=>b.points-a.points||(a.best??Infinity)-(b.best??Infinity)||b.wins-a.wins||safe(()=>nationName(a.nation),a.nation).localeCompare(safe(()=>nationName(b.nation),b.nation)));\n}\nfunction relaySeasonLead(d){\n let best=null;for(const e of s?.events||[])for(const r of e?.results?.[d]||[]){if(r?.dq||r?.dns||!Number.isFinite(Number(r?.perf)))continue;if(!best||Number(r.perf)<best.value)best={value:Number(r.perf),nation:r.nation,name:safe(()=>nationName(r.nation),r.nation),event:e.name,week:e.week}}return best;\n}\nfunction relayRecordRowHTML(d,active=false){\n const st=relayState(),rw=st.records.world[d],nn=st.records.national?.[safe(()=>managedNation(),'GREAT BRITAIN')]?.[d];\n return `<tr data-relay-record="${d}" ${active?'style="background:#ffffff05"':''}><td><strong>${esc(safe(()=>discLabel(d),RELAYS[d].label))}</strong></td><td class="score">${rw?fmtPerf(d,rw.value):'—'}</td><td>${rw?.holder||'—'}${rw?.nation?` • ${safe(()=>flag(rw.nation),'')}`:''}</td><td class="score">${nn?fmtPerf(d,nn.value):'—'}</td><td>${nn?.holder||'—'}</td></tr>`;\n}\nfunction relayRecordBookHTML(activeDisc){\n const normal=Object.keys(DISCIPLINES).map(d=>{const rw=s.records?.world?.[d],nn=s.records?.national?.[safe(()=>managedNation(),'GREAT BRITAIN')]?.[d];return `<tr ${d===activeDisc?'style="background:#ffffff05"':''}><td><strong>${discLabel(d)}</strong></td><td class="score">${rw?fmtPerf(d,rw.value):'—'}</td><td>${rw?.holder||'—'}${rw?.nation&&rw.nation!=='WORLD'?` • ${flag(rw.nation)}`:''}</td><td class="score">${nn?fmtPerf(d,nn.value):'—'}</td><td>${nn?.holder||'—'}</td></tr>`}).join('');\n return normal+Object.keys(RELAYS).map(d=>relayRecordRowHTML(d,d===activeDisc)).join('');\n}\nfunction rankingOptionsHTML(activeDisc){return allRankingDiscKeys().map(d=>`<option value="${d}" ${d===activeDisc?'selected':''}>${esc(safe(()=>discLabel(d),RELAYS[d]?.label||d))}</option>`).join('')}\nfunction patchRankingsRelayNavigation(){\n const root=document.getElementById('rankings'),select=document.getElementById('rankingEventSelect');if(!root||!select)return;\n for(const d of Object.keys(RELAYS))if(!select.querySelector(`option[value="${d}"]`)){const opt=document.createElement('option');opt.value=d;opt.textContent=safe(()=>discLabel(d),RELAYS[d].label);select.appendChild(opt)}\n select.value=rankingDisc;select.onchange=()=>{rankingDisc=select.value;drawRankings()};\n const recordPanel=[...root.querySelectorAll('.panel')].find(p=>p.querySelector('.panel-h strong')?.textContent?.trim()==='Record Book'),tbody=recordPanel?.querySelector('tbody');\n if(tbody)for(const d of Object.keys(RELAYS))if(!tbody.querySelector(`[data-relay-record="${d}"]`))tbody.insertAdjacentHTML('beforeend',relayRecordRowHTML(d,false));\n}\nfunction drawRelayRankings(d){\n const ranked=relayRankingRows(d),lead=relaySeasonLead(d),st=relayState(),wr=st.records.world[d],nr=st.records.national?.[safe(()=>managedNation(),'GREAT BRITAIN')]?.[d],starts=ranked.reduce((n,r)=>n+r.starts,0);\n const shown=ranked.slice(0,8);if(ranked.length&&!shown.some(r=>r.nation===safe(()=>managedNation(),''))){const mine=ranked.find(r=>r.nation===safe(()=>managedNation(),''));if(mine)shown.push(mine)}\n const root=document.getElementById('rankings');if(!root)return;\n root.innerHTML=`<div class="section-head"><div><h2>World Rankings & Records</h2><p>${s.game.season} global season. Relay nations are ranked by points earned in ranked 4×100m meetings.</p></div><span class="status">${esc(safe(()=>discLabel(d),RELAYS[d].label))}</span></div>\n <section class="panel"><div class="panel-h"><strong>Choose Event</strong><span>Individual and relay world rankings</span></div><div class="ranking-selector"><label for="rankingEventSelect">Event<select id="rankingEventSelect" aria-label="World rankings event">${rankingOptionsHTML(d)}</select></label><p>Select an event to update the world ranking, season lead, records and nation standings below.</p></div></section>\n <div class="grid4" style="margin-top:10px">\n  <div class="metric"><small>World Lead</small><strong>${lead?fmtPerf(d,lead.value):'—'}</strong><span class="muted" style="font-size:8px">${lead?`${safe(()=>flag(lead.nation),'')} ${esc(lead.name)}`:'No relay mark this season'}</span></div>\n  <div class="metric"><small>World Record</small><strong>${wr?fmtPerf(d,wr.value):'—'}</strong><span class="muted" style="font-size:8px">${esc(wr?.holder||'—')}${wr?.nation?` • ${safe(()=>flag(wr.nation),'')}`:''}</span></div>\n  <div class="metric"><small>${esc(safe(()=>nationName(managedNation()),managedNation()))} Record</small><strong>${nr?fmtPerf(d,nr.value):'—'}</strong><span class="muted" style="font-size:8px">${esc(nr?.holder||'No relay record yet')}</span></div>\n  <div class="metric"><small>Ranked Teams</small><strong>${ranked.length}</strong><span class="muted" style="font-size:8px">${starts} team start${starts===1?'':'s'} logged</span></div>\n </div>\n <div class="rank-grid" style="margin-top:10px"><div class="stack">\n  <section class="panel"><div class="panel-h"><strong>${esc(safe(()=>discLabel(d),RELAYS[d].label))} World Ranking</strong><span>Season points</span></div><div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Nation</th><th>Season Best</th><th class="num">Starts</th><th class="num">Points</th></tr></thead><tbody>${ranked.length?ranked.slice(0,40).map((r,i)=>`<tr><td class="score">${i+1}</td><td><strong>${safe(()=>flag(r.nation),'')} ${esc(safe(()=>nationName(r.nation),r.nation))}</strong></td><td>${r.best==null?'—':fmtPerf(d,r.best)}</td><td class="num">${r.starts}</td><td class="num score">${r.points}</td></tr>`).join(''):`<tr><td colspan="5" class="muted">No relay teams have recorded a ranked start this season.</td></tr>`}</tbody></table></div></section>\n  <section class="panel"><div class="panel-h"><strong>Record Book</strong><span>Individual and relay events</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Event</th><th>World Record</th><th>Holder</th><th>${esc(safe(()=>nationName(managedNation()),managedNation()))} Record</th><th>Holder</th></tr></thead><tbody>${relayRecordBookHTML(d)}</tbody></table></div></section>\n </div><aside class="panel"><div class="panel-h"><strong>${esc(safe(()=>discLabel(d),RELAYS[d].label))} Nation Standings</strong><span>Relay points</span></div>${shown.length?shown.map(r=>`<div class="nation-row ${r.nation===safe(()=>managedNation(),'')?'gb':''}"><strong>${ranked.findIndex(x=>x.nation===r.nation)+1}</strong><div><strong>${safe(()=>flag(r.nation),'')} ${esc(safe(()=>nationName(r.nation),r.nation))}</strong><div class="muted" style="font-size:8px">${r.best==null?'No valid mark':`SB ${fmtPerf(d,r.best)} · ${r.starts} start${r.starts===1?'':'s'}`}</div></div><strong>${r.points}</strong></div>`).join(''):'<div class="muted" style="padding:14px">Relay standings will populate after the first ranked 4×100m meeting.</div>'}</aside></div>`;\n const select=document.getElementById('rankingEventSelect');if(select)select.onchange=()=>{rankingDisc=select.value;drawRankings()};\n}\nconst baseDrawRankings=typeof drawRankings==='function'?drawRankings:null;\nif(baseDrawRankings)drawRankings=function(){\n if(isRelay(rankingDisc))return drawRelayRankings(rankingDisc);\n const out=baseDrawRankings.apply(this,arguments);patchRankingsRelayNavigation();return out;\n};\n'''

replace_once(
    relay,
    '''const baseDrawCompetition=typeof drawCompetition==='function'?drawCompetition:null;if(baseDrawCompetition)drawCompetition=function(){const out=baseDrawCompetition.apply(this,arguments);requestAnimationFrame(patchCompetitionRelay);return out};\n\nmigrate();queuePatch();''',
    '''const baseDrawCompetition=typeof drawCompetition==='function'?drawCompetition:null;if(baseDrawCompetition)drawCompetition=function(){const out=baseDrawCompetition.apply(this,arguments);requestAnimationFrame(patchCompetitionRelay);return out};\n''' + ranking_code + '''\nmigrate();queuePatch();''',
    'relay ranking presentation'
)

replace_once(
    relay,
    '''window.AMRelayV1={version:1,isRelay,eligible:relayEligible,bestLineup,estimateLineup,relaySkill,state:relayState,events:[...RELAY_EVENT_IDS],disciplines:Object.keys(RELAYS),migrate};''',
    '''window.AMRelayV1={version:1,isRelay,eligible:relayEligible,bestLineup,estimateLineup,relaySkill,state:relayState,rankingRows:relayRankingRows,seasonLead:relaySeasonLead,events:[...RELAY_EVENT_IDS],disciplines:Object.keys(RELAYS),migrate};''',
    'relay public ranking API'
)

replace_once(
    'game.html',
    'scripts/relay-v1.js?v=20260913-relay5',
    'scripts/relay-v1.js?v=20260913-relay6',
    'relay cache bust'
)

reg = 'tools/static-regression.mjs'
replace_once(
    reg,
    '''if(!relayPresentation.includes('function relayAvailability(e,d)'))fail('Relay V1 must explain a locked-team withdrawal instead of silently dropping the nation.');\nconst selectionAuthority=read('scripts/selection-decision-v3.js');''',
    '''if(!relayPresentation.includes('function relayAvailability(e,d)'))fail('Relay V1 must explain a locked-team withdrawal instead of silently dropping the nation.');\nfor(const token of ["function syncCanonicalRelayRecords(st)","function relayRankingRows(d)","function relaySeasonLead(d)","function drawRelayRankings(d)","function patchRankingsRelayNavigation()","worldHolder:'Jamaica'","worldHolder:'United States'"])if(!relayPresentation.includes(token))fail(`Relay rankings/records contract missing: ${token}`);\nif(!html.includes('scripts/relay-v1.js?v=20260913-relay6'))fail('Relay rankings/records cache-bust is missing from game.html.');\nconst selectionAuthority=read('scripts/selection-decision-v3.js');''',
    'relay ranking regression contract'
)

print('Relay rankings and world records patch applied successfully.')
