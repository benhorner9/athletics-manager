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

world = 'scripts/world-season-v2.js'

replace_once(
    world,
    "function disciplines(){return Object.keys(typeof DISCIPLINES!=='undefined'?DISCIPLINES:{})}",
    """function disciplines(){return Object.keys(typeof DISCIPLINES!=='undefined'?DISCIPLINES:{})}
function relayRankingApi(){return typeof window!=='undefined'&&window.AMRelayV1&&typeof window.AMRelayV1==='object'?window.AMRelayV1:null}
function rankingDisciplines(){const base=disciplines(),relays=relayRankingApi()?.disciplines||[];return [...base,...relays.filter(d=>!base.includes(d))]}
function isRelayRankingEvent(d){return !!safe(()=>relayRankingApi()?.isRelay?.(d),false)}
function relayTeamRows(d){return safe(()=>relayRankingApi()?.rankingRows?.(d),[])||[]}
function relayTeamLead(d){return safe(()=>relayRankingApi()?.seasonLead?.(d),null)}""",
    'ranking relay helpers'
)

replace_once(
    world,
    "function rankingEvent(){const ds=disciplines();try{if(typeof rankingDisc==='string'&&ds.includes(rankingDisc))return rankingDisc}catch(_){};return ds[0]||null}",
    "function rankingEvent(){const ds=rankingDisciplines();try{if(typeof rankingDisc==='string'&&ds.includes(rankingDisc))return rankingDisc}catch(_){};return ds[0]||null}",
    'ranking event catalogue'
)

replace_once(
    world,
    "function recordFor(kind,d){return kind==='world'?gs()?.records?.world?.[d]:gs()?.records?.national?.[nation()]?.[d]}",
    """function recordFor(kind,d){
 if(isRelayRankingEvent(d)){
  const st=safe(()=>relayRankingApi()?.state?.(),null);
  return kind==='world'?st?.records?.world?.[d]:st?.records?.national?.[nation()]?.[d]
 }
 return kind==='world'?gs()?.records?.world?.[d]:gs()?.records?.national?.[nation()]?.[d]
}""",
    'relay record authority'
)

replace_once(
    world,
    "function rankSummary(d){const rows=rankedAthletes(d),lead=safe(()=>seasonLead(d),null),wr=recordFor('world',d),nr=recordFor('national',d),own=rows.findIndex(a=>a.nation===nation());return `<div class=\"wsv2-summary\"><div class=\"wsv2-metric\"><small>World Lead</small><strong>${lead?esc(perf(d,lead.value)):'—'}</strong><span>${lead?esc(`${safe(()=>flag(lead.nation),'')} ${lead.name}`):'No season lead'}</span></div><div class=\"wsv2-metric\"><small>World Record</small><strong>${wr?esc(perf(d,wr.value)):'—'}</strong><span>${esc(wr?.holder||'—')}</span></div><div class=\"wsv2-metric\"><small>${esc(nationLabel())} Record</small><strong>${nr?esc(perf(d,nr.value)):'—'}</strong><span>${esc(nr?.holder||'—')}</span></div><div class=\"wsv2-metric\"><small>Ranked Athletes</small><strong>${rows.length}</strong><span>${(gs()?.performances||[]).filter(p=>p.disc===d).length} logged performances</span></div><div class=\"wsv2-metric\"><small>Best National Rank</small><strong>${own>=0?`#${own+1}`:'—'}</strong><span>${own>=0?esc(rows[own].name):'No ranked athlete'}</span></div></div>`}",
    """function rankSummary(d){
 if(isRelayRankingEvent(d)){
  const rows=relayTeamRows(d),lead=relayTeamLead(d),wr=recordFor('world',d),nr=recordFor('national',d),own=rows.findIndex(r=>r.nation===nation()),starts=rows.reduce((sum,r)=>sum+Number(r.starts||0),0);
  return `<div class=\"wsv2-summary\"><div class=\"wsv2-metric\"><small>World Lead</small><strong>${lead?esc(perf(d,lead.value)):'—'}</strong><span>${lead?esc(`${safe(()=>flag(lead.nation),'')} ${lead.name}`):'No relay mark this season'}</span></div><div class=\"wsv2-metric\"><small>World Record</small><strong>${wr?esc(perf(d,wr.value)):'—'}</strong><span>${esc(wr?.holder||'—')}</span></div><div class=\"wsv2-metric\"><small>${esc(nationLabel())} Record</small><strong>${nr?esc(perf(d,nr.value)):'—'}</strong><span>${esc(nr?.holder||'No relay record yet')}</span></div><div class=\"wsv2-metric\"><small>Ranked Teams</small><strong>${rows.length}</strong><span>${starts} team start${starts===1?'':'s'} logged</span></div><div class=\"wsv2-metric\"><small>Best National Rank</small><strong>${own>=0?`#${own+1}`:'—'}</strong><span>${own>=0?esc(nationLabel(rows[own].nation)):'No ranked relay team'}</span></div></div>`
 }
 const rows=rankedAthletes(d),lead=safe(()=>seasonLead(d),null),wr=recordFor('world',d),nr=recordFor('national',d),own=rows.findIndex(a=>a.nation===nation());return `<div class=\"wsv2-summary\"><div class=\"wsv2-metric\"><small>World Lead</small><strong>${lead?esc(perf(d,lead.value)):'—'}</strong><span>${lead?esc(`${safe(()=>flag(lead.nation),'')} ${lead.name}`):'No season lead'}</span></div><div class=\"wsv2-metric\"><small>World Record</small><strong>${wr?esc(perf(d,wr.value)):'—'}</strong><span>${esc(wr?.holder||'—')}</span></div><div class=\"wsv2-metric\"><small>${esc(nationLabel())} Record</small><strong>${nr?esc(perf(d,nr.value)):'—'}</strong><span>${esc(nr?.holder||'—')}</span></div><div class=\"wsv2-metric\"><small>Ranked Athletes</small><strong>${rows.length}</strong><span>${(gs()?.performances||[]).filter(p=>p.disc===d).length} logged performances</span></div><div class=\"wsv2-metric\"><small>Best National Rank</small><strong>${own>=0?`#${own+1}`:'—'}</strong><span>${own>=0?esc(rows[own].name):'No ranked athlete'}</span></div></div>`
}""",
    'relay ranking summary'
)

replace_once(
    world,
    "function rankTabs(){return `<nav class=\"wsv2-tabs\" aria-label=\"Ranking sections\">${[['athletes','Athlete Ranking'],['nations','Nation Standings'],['records','Record Book']].map(([k,l])=>`<button class=\"${ui.rankTab===k?'on':''}\" data-wsv2-rank-tab=\"${k}\">${l}</button>`).join('')}</nav>`}",
    "function rankTabs(){const first=isRelayRankingEvent(rankingEvent())?'Team Ranking':'Athlete Ranking';return `<nav class=\"wsv2-tabs\" aria-label=\"Ranking sections\">${[['athletes',first],['nations','Nation Standings'],['records','Record Book']].map(([k,l])=>`<button class=\"${ui.rankTab===k?'on':''}\" data-wsv2-rank-tab=\"${k}\">${l}</button>`).join('')}</nav>`}",
    'relay ranking tab label'
)

replace_once(
    world,
    "function athleteRanking(d){const all=rankedAthletes(d),shown=all.slice(0,ui.rankLimit);return `<section class=\"wsv2-card\"><div class=\"wsv2-card-head\"><strong>${esc(discLabelSafe(d))} World Ranking</strong><span>Official season points · ${all.length} athletes</span></div><div class=\"wsv2-table-wrap\"><table class=\"wsv2-table\"><thead><tr><th>#</th><th>Athlete</th><th>Nation</th><th>PB</th><th class=\"num\">Points</th></tr></thead><tbody>${shown.length?shown.map((a,i)=>`<tr class=\"${a.nation===nation()?'managed':''} ${i<3?'podium':''}\"><td>${i+1}</td><td>${personButton(a)}</td><td>${esc(safe(()=>flag(a.nation),'')+' '+nationLabel(a.nation))}</td><td><strong>${esc(perf(d,a.pb))}</strong></td><td class=\"num\"><strong>${Number(a.points)||0}</strong></td></tr>`).join(''):`<tr><td colspan=\"5\"><div class=\"wsv2-empty\"><strong>No ranked athletes</strong>Ranking points will appear as the season progresses.</div></td></tr>`}</tbody></table></div>${all.length>shown.length?`<div class=\"wsv2-card-body\" style=\"text-align:center\"><button class=\"btn ghost\" data-wsv2-rank-more>SHOW ${Math.min(60,all.length-shown.length)} MORE · ${all.length} TOTAL</button></div>`:''}</section>`}",
    """function athleteRanking(d){
 if(isRelayRankingEvent(d)){
  const all=relayTeamRows(d),shown=all.slice(0,ui.rankLimit);
  return `<section class=\"wsv2-card\"><div class=\"wsv2-card-head\"><strong>${esc(discLabelSafe(d))} World Ranking</strong><span>Official season points · ${all.length} teams</span></div><div class=\"wsv2-table-wrap\"><table class=\"wsv2-table\"><thead><tr><th>#</th><th>Nation</th><th>Season Best</th><th class=\"num\">Starts</th><th class=\"num\">Wins</th><th class=\"num\">Points</th></tr></thead><tbody>${shown.length?shown.map((r,i)=>`<tr class=\"${r.nation===nation()?'managed':''} ${i<3?'podium':''}\"><td>${i+1}</td><td><strong>${esc(safe(()=>flag(r.nation),'')+' '+nationLabel(r.nation))}</strong></td><td><strong>${r.best==null?'—':esc(perf(d,r.best))}</strong></td><td class=\"num\">${Number(r.starts)||0}</td><td class=\"num\">${Number(r.wins)||0}</td><td class=\"num\"><strong>${Number(r.points)||0}</strong></td></tr>`).join(''):`<tr><td colspan=\"6\"><div class=\"wsv2-empty\"><strong>No ranked relay teams</strong>Team rankings will appear after the first ranked 4×100m meeting.</div></td></tr>`}</tbody></table></div>${all.length>shown.length?`<div class=\"wsv2-card-body\" style=\"text-align:center\"><button class=\"btn ghost\" data-wsv2-rank-more>SHOW ${Math.min(60,all.length-shown.length)} MORE · ${all.length} TOTAL</button></div>`:''}</section>`
 }
 const all=rankedAthletes(d),shown=all.slice(0,ui.rankLimit);return `<section class=\"wsv2-card\"><div class=\"wsv2-card-head\"><strong>${esc(discLabelSafe(d))} World Ranking</strong><span>Official season points · ${all.length} athletes</span></div><div class=\"wsv2-table-wrap\"><table class=\"wsv2-table\"><thead><tr><th>#</th><th>Athlete</th><th>Nation</th><th>PB</th><th class=\"num\">Points</th></tr></thead><tbody>${shown.length?shown.map((a,i)=>`<tr class=\"${a.nation===nation()?'managed':''} ${i<3?'podium':''}\"><td>${i+1}</td><td>${personButton(a)}</td><td>${esc(safe(()=>flag(a.nation),'')+' '+nationLabel(a.nation))}</td><td><strong>${esc(perf(d,a.pb))}</strong></td><td class=\"num\"><strong>${Number(a.points)||0}</strong></td></tr>`).join(''):`<tr><td colspan=\"5\"><div class=\"wsv2-empty\"><strong>No ranked athletes</strong>Ranking points will appear as the season progresses.</div></td></tr>`}</tbody></table></div>${all.length>shown.length?`<div class=\"wsv2-card-body\" style=\"text-align:center\"><button class=\"btn ghost\" data-wsv2-rank-more>SHOW ${Math.min(60,all.length-shown.length)} MORE · ${all.length} TOTAL</button></div>`:''}</section>`
}""",
    'relay team ranking table'
)

replace_once(
    world,
    "function nationStandingsView(d){const rows=nationRanking(d);return `<div class=\"wsv2-grid\"><section class=\"wsv2-card\"><div class=\"wsv2-card-head\"><strong>${esc(discLabelSafe(d))} Nation Standings</strong><span>Combined athlete ranking points</span></div><div>${rows.map((r,i)=>`<div class=\"rv2-nation ${r.nation===nation()?'me':''}\"><strong>#${i+1}</strong><div><strong>${esc(safe(()=>flag(r.nation),'')+' '+nationLabel(r.nation))}</strong><small>${r.nation===nation()?'Managed programme':discLabelSafe(d)}</small></div><strong>${r.points}</strong></div>`).join('')}</div></section><aside class=\"wsv2-card\"><div class=\"wsv2-card-head\"><strong>How This Table Works</strong><span>Season view</span></div><div class=\"wsv2-card-body\"><div class=\"wsv2-info\"><b>Event-specific:</b> this table totals ranking points earned by athletes in ${esc(discLabelSafe(d))}. It is separate from the overall programme ranking and from Summit Series points.</div></div></aside></div>`}",
    """function nationStandingsView(d){
 if(isRelayRankingEvent(d)){
  const rows=relayTeamRows(d);
  return `<div class=\"wsv2-grid\"><section class=\"wsv2-card\"><div class=\"wsv2-card-head\"><strong>${esc(discLabelSafe(d))} Nation Standings</strong><span>Relay team ranking points</span></div><div>${rows.length?rows.map((r,i)=>`<div class=\"rv2-nation ${r.nation===nation()?'me':''}\"><strong>#${i+1}</strong><div><strong>${esc(safe(()=>flag(r.nation),'')+' '+nationLabel(r.nation))}</strong><small>${r.best==null?'No valid mark':`SB ${esc(perf(d,r.best))} · ${Number(r.starts)||0} start${Number(r.starts)===1?'':'s'}`}</small></div><strong>${Number(r.points)||0}</strong></div>`).join(''):`<div class=\"wsv2-empty\"><strong>No relay standings yet</strong>The first ranked 4×100m meeting will establish the table.</div>`}</div></section><aside class=\"wsv2-card\"><div class=\"wsv2-card-head\"><strong>How This Table Works</strong><span>Season view</span></div><div class=\"wsv2-card-body\"><div class=\"wsv2-info\"><b>Team event:</b> relay ranking points belong to the nation rather than to four separate athletes. Ties are separated by season-best time, then wins.</div></div></aside></div>`
 }
 const rows=nationRanking(d);return `<div class=\"wsv2-grid\"><section class=\"wsv2-card\"><div class=\"wsv2-card-head\"><strong>${esc(discLabelSafe(d))} Nation Standings</strong><span>Combined athlete ranking points</span></div><div>${rows.map((r,i)=>`<div class=\"rv2-nation ${r.nation===nation()?'me':''}\"><strong>#${i+1}</strong><div><strong>${esc(safe(()=>flag(r.nation),'')+' '+nationLabel(r.nation))}</strong><small>${r.nation===nation()?'Managed programme':discLabelSafe(d)}</small></div><strong>${r.points}</strong></div>`).join('')}</div></section><aside class=\"wsv2-card\"><div class=\"wsv2-card-head\"><strong>How This Table Works</strong><span>Season view</span></div><div class=\"wsv2-card-body\"><div class=\"wsv2-info\"><b>Event-specific:</b> this table totals ranking points earned by athletes in ${esc(discLabelSafe(d))}. It is separate from the overall programme ranking and from Summit Series points.</div></div></aside></div>`
}""",
    'relay nation standings'
)

replace_once(
    world,
    "function recordBook(){const ds=disciplines();return `<section class=\"wsv2-card\"><div class=\"wsv2-card-head\"><strong>Record Book</strong><span>World and ${esc(nationLabel())} records</span></div><div class=\"wsv2-table-wrap\"><table class=\"wsv2-table\"><thead><tr><th>Event</th><th>World Record</th><th>Holder</th><th>${esc(nationLabel())} Record</th><th>Holder</th></tr></thead><tbody>${ds.map(d=>{const wr=recordFor('world',d),nr=recordFor('national',d);return `<tr class=\"${d===rankingEvent()?'managed':''}\"><td><strong>${esc(discLabelSafe(d))}</strong></td><td><strong>${wr?esc(perf(d,wr.value)):'—'}</strong></td><td>${esc(wr?.holder||'—')}</td><td><strong>${nr?esc(perf(d,nr.value)):'—'}</strong></td><td>${esc(nr?.holder||'—')}</td></tr>`}).join('')}</tbody></table></div></section>`}",
    "function recordBook(){const ds=rankingDisciplines();return `<section class=\"wsv2-card\"><div class=\"wsv2-card-head\"><strong>Record Book</strong><span>World and ${esc(nationLabel())} records</span></div><div class=\"wsv2-table-wrap\"><table class=\"wsv2-table\"><thead><tr><th>Event</th><th>World Record</th><th>Holder</th><th>${esc(nationLabel())} Record</th><th>Holder</th></tr></thead><tbody>${ds.map(d=>{const wr=recordFor('world',d),nr=recordFor('national',d);return `<tr class=\"${d===rankingEvent()?'managed':''}\"><td><strong>${esc(discLabelSafe(d))}</strong></td><td><strong>${wr?esc(perf(d,wr.value)):'—'}</strong></td><td>${esc(wr?.holder||'—')}</td><td><strong>${nr?esc(perf(d,nr.value)):'—'}</strong></td><td>${esc(nr?.holder||'—')}</td></tr>`}).join('')}</tbody></table></div></section>`}",
    'relay record book catalogue'
)

replace_once(
    world,
    "${disciplines().map(x=>`<option value=\"${esc(x)}\" ${x===d?'selected':''}>${esc(discLabelSafe(x))}</option>`).join('')}",
    "${rankingDisciplines().map(x=>`<option value=\"${esc(x)}\" ${x===d?'selected':''}>${esc(discLabelSafe(x))}</option>`).join('')}",
    'relay ranking event selector'
)

replace_once(
    'game.html',
    '<script src="scripts/world-season-v2.js?v=20260910-worldseason2"></script>',
    '<script src="scripts/world-season-v2.js?v=20260913-relayrank1"></script>',
    'world season cache bust'
)

reg = 'tools/static-regression.mjs'
replace_once(
    reg,
    "if(!html.includes('scripts/relay-v1.js?v=20260913-relay6'))fail('Relay rankings/records cache-bust is missing from game.html.');",
    """if(!html.includes('scripts/relay-v1.js?v=20260913-relay6'))fail('Relay rankings/records cache-bust is missing from game.html.');
const worldSeasonRankings=read('scripts/world-season-v2.js');
for(const token of ['function rankingDisciplines()','function isRelayRankingEvent(d)','function relayTeamRows(d)','Ranked Teams','No ranked relay teams','const ds=rankingDisciplines()'])if(!worldSeasonRankings.includes(token))fail(`Active Rankings V2 relay contract missing: ${token}`);
if(!html.includes('scripts/world-season-v2.js?v=20260913-relayrank1'))fail('Active Rankings V2 relay cache-bust is missing from game.html.');""",
    'active relay rankings regression contract'
)

print('Active Rankings V2 relay integration applied successfully.')
