/* Athletics Manager — Club Athletics V1
   Persistent domestic club world underneath the national-programme game.
   Clubs select and enter athletes independently. National duty, medical unavailability,
   camps and Summit commitments take priority over club competition. */
(function(){
'use strict';
if(window.__amClubAthleticsV1)return;window.__amClubAthleticsV1=1;

const VERSION='1.0';
const POINTS=[10,8,6,5,4,3,2,1];
const MEETINGS=[
 {key:'league-1',week:6,name:'Club League · Round 1',short:'League 1',kind:'league',multiplier:1},
 {key:'league-2',week:10,name:'Club League · Round 2',short:'League 2',kind:'league',multiplier:1},
 {key:'league-3',week:15,name:'Club League · Round 3',short:'League 3',kind:'league',multiplier:1},
 {key:'club-cup',week:24,name:'National Club Cup',short:'Club Cup',kind:'cup',multiplier:1},
 {key:'league-final',week:30,name:'Club League Final',short:'League Final',kind:'league',multiplier:1.25},
 {key:'championships',week:45,name:'National Club Championships',short:'Club Champs',kind:'championship',multiplier:1.5}
];
const MAX_FIELD=12;
const MAX_PER_CLUB_EVENT=2;
const esc=value=>{try{return profileEscape(String(value??''))}catch(_){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}};
const safe=(fn,fallback)=>{try{const value=fn();return value==null?fallback:value}catch(_){return fallback}};
const hash=value=>{let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const gameWeek=()=>Number(s?.game?.week||1);
const gameSeason=()=>Number(s?.game?.season||2027);
const nations=()=>Object.keys(typeof NATIONS!=='undefined'?NATIONS:{}).sort((a,b)=>nationLabel(a).localeCompare(nationLabel(b)));
const nationLabel=n=>safe(()=>nationName(n),safe(()=>COUNTRIES?.[n]?.name,String(n||'Unknown')));
const disciplineLabel=d=>safe(()=>discLabel(d),String(d||'—'));
const formatPerf=(d,v)=>safe(()=>fmtPerf(d,v),Number.isFinite(Number(v))?String(v):'—');
const saveNow=()=>safe(()=>save(),null);
const currentNation=()=>safe(()=>managedNation(),s?.managedNation||'GREAT BRITAIN');
const athleteById=id=>(s?.athletes||[]).find(a=>String(a.id)===String(id));
const clubColour=id=>`hsl(${hash(id)%360} 58% 55%)`;

function worldState(state=typeof s!=='undefined'?s:null){
 if(!state)return null;
 state.clubAthletics??={version:1,clubs:{},seasons:{},records:{},champions:[],transfers:[],migrationVersion:0};
 const root=state.clubAthletics;root.version=1;root.clubs??={};root.seasons??={};root.records??={};root.champions??=[];root.transfers??=[];return root;
}
function ensureAthleteClub(a,state=typeof s!=='undefined'?s:null){
 if(!a)return null;
 safe(()=>window.AMPeopleBiography?.ensureAthlete?.(a,state),null);
 if(!a.athleticsClubId||!a.athleticsClub){
  const seed=hash(`${a.id}|${a.name}|${a.nation}|club`),fallback=window.AMPeopleBiography?.clubFor?.(a.nation,a.birthPlace,seed);
  if(fallback){a.athleticsClubId=fallback.id;a.athleticsClub=fallback.name;a.athleticsClubNation=fallback.nation;a.athleticsClubHome=fallback.home}
 }
 return a.athleticsClubId||null;
}
function ensureClubRecord(a,root=worldState(),state=typeof s!=='undefined'?s:null){
 const id=ensureAthleteClub(a,state);if(!id||!root)return null;
 const existing=root.clubs[id]??={id,name:a.athleticsClub||'Athletics Club',nation:a.athleticsClubNation||a.nation,home:a.athleticsClubHome||a.birthPlace||nationLabel(a.nation),founded:1885+(hash(id)%126),prestige:50+(hash(`${id}|prestige`)%26),honours:{league:0,cup:0,championship:0},createdSeason:gameSeason()};
 existing.name=a.athleticsClub||existing.name;existing.nation=a.athleticsClubNation||a.nation||existing.nation;existing.home=a.athleticsClubHome||a.birthPlace||existing.home;existing.honours??={league:0,cup:0,championship:0};existing.prestige=Math.max(25,Math.min(99,Number(existing.prestige)||55));return existing;
}
function syncClubs(state=typeof s!=='undefined'?s:null){const root=worldState(state);if(!root)return null;safe(()=>window.AMPeopleBiography?.ensureState?.(state),null);for(const a of state.athletes||[])ensureClubRecord(a,root,state);return root}
function clubsForNation(nation){const root=syncClubs();return Object.values(root?.clubs||{}).filter(c=>c.nation===nation).sort((a,b)=>b.prestige-a.prestige||a.name.localeCompare(b.name))}
function members(clubId,activeOnly=true){return (s?.athletes||[]).filter(a=>String(a.athleticsClubId)===String(clubId)&&(!activeOnly||!a.retired)).sort((a,b)=>String(a.disc).localeCompare(String(b.disc))||Number(b.overall)-Number(a.overall))}
function seasonRoot(season=gameSeason()){const root=worldState();root.seasons[season]??={};return root.seasons[season]}
function nationSeason(nation=currentNation(),season=gameSeason()){
 const seasons=seasonRoot(season);seasons[nation]??={nation,season,meetings:{},standings:{},settled:false,championClubId:null,championshipClubId:null};
 const ns=seasons[nation];ns.meetings??={};ns.standings??={};
 for(const def of MEETINGS)ns.meetings[def.key]??={key:def.key,week:def.week,name:def.name,kind:def.kind,completed:false,clubPoints:{},winners:{}};
 return ns;
}
function standingRow(ns,clubId){ns.standings[clubId]??={clubId,points:0,wins:0,podiums:0,starts:0,meetings:0};return ns.standings[clubId]}
function standings(nation=currentNation(),season=gameSeason()){
 const ns=nationSeason(nation,season),rows=Object.values(ns.standings).map(row=>({...row,club:worldState()?.clubs?.[row.clubId]}));
 return rows.filter(x=>x.club).sort((a,b)=>b.points-a.points||b.wins-a.wins||b.podiums-a.podiums||a.club.name.localeCompare(b.club.name));
}
function meetingDef(key){return MEETINGS.find(m=>m.key===key)||null}
function meetingLocation(nation,def){const cs=clubsForNation(nation);if(!cs.length)return nationLabel(nation);return cs[hash(`${nation}|${gameSeason()}|${def.key}`)%cs.length].home}
function performanceRating(a){return safe(()=>performanceScore(a),Number(a.overall||60)*.6+Number(a.form||75)*.25+Number(a.fitness||85)*.15)}
function summitDuty(a,week){return safe(()=>{const ss=s.summitSeries?.[s.game.season],meeting=Object.values(ss?.meetings||{}).find(m=>Number(m.week)===Number(week));return !!(meeting&&ss?.seriesEntries?.includes(a.id))},false)}
function nationalDuty(a,week){
 if(!a)return false;
 if(summitDuty(a,week))return true;
 return (s.events||[]).some(e=>Number(e.week)===Number(week)&&!e.completed&&['competition','championship','olympics','testing'].includes(e.kind)&&Array.isArray(e.entries?.[a.disc])&&e.entries[a.disc].includes(a.id));
}
function availableForClub(a,week){
 if(!a||a.retired||Number(a.injury)>0||a.camp)return false;
 if(nationalDuty(a,week))return false;
 if(a.nation===currentNation()&&safe(()=>activityBusy(a,week),false))return false;
 return true;
}
function fieldFor(nation,disc,week){
 const candidates=(s.athletes||[]).filter(a=>a.nation===nation&&a.disc===disc&&availableForClub(a,week)&&a.athleticsClubId).sort((a,b)=>performanceRating(b)-performanceRating(a)||String(a.id).localeCompare(String(b.id)));
 const counts={},field=[];
 for(const a of candidates){const id=a.athleticsClubId;if((counts[id]||0)>=MAX_PER_CLUB_EVENT)continue;field.push(a);counts[id]=(counts[id]||0)+1;if(field.length>=MAX_FIELD)break}
 return field;
}
function resultSort(d,a,b){return safe(()=>DISCIPLINES[d]?.type==='time',false)?a.perf-b.perf:b.perf-a.perf}
function clubRecordBetter(d,value,old){if(!old)return true;return safe(()=>better(d,value,old.perf),Number(value)>Number(old.perf))}
function updateClubRecord(a,d,row,meeting){
 const root=worldState(),clubId=a.athleticsClubId;if(!clubId)return;
 root.records[clubId]??={};const old=root.records[clubId][d];if(clubRecordBetter(d,row.perf,old))root.records[clubId][d]={athleteId:a.id,name:a.name,disc:d,perf:row.perf,season:gameSeason(),week:meeting.week,meeting:meeting.name};
}
function clubCareer(a){a.clubCareer??={starts:0,wins:0,podiums:0,points:0,history:[]};a.clubCareer.history??=[];return a.clubCareer}
function registerClubAppearance(a,d,row,place,points,meeting,historical){
 const cc=clubCareer(a);cc.starts++;cc.points+=points;if(place===1)cc.wins++;if(place<=3)cc.podiums++;
 cc.history.push({athleteId:a.id,season:gameSeason(),week:meeting.week,meeting:meeting.name,clubId:a.athleticsClubId,club:a.athleticsClub,disc:d,perf:row.perf,place,points});cc.history=cc.history.slice(-24);
 if(historical)return [];
 a.fatigue=Math.max(0,Math.min(100,Number(a.fatigue||0)+(meeting.kind==='championship'?6:4)));
 let achievements=[];
 if(a.nation===currentNation())achievements=safe(()=>registerPerformance(a,d,row.perf,'club',meeting.name),[])||[];
 if(a.nation===currentNation())safe(()=>recordTraitResult(a,d,row.perf,`${gameSeason()}:club:${meeting.key}:${d}:${a.id}`),null);
 return achievements;
}
function compactWinner(row){return row?{id:row.id,name:row.name,clubId:row.clubId,perf:row.perf,place:row.place}:null}
function simulateNationMeeting(nation,def,{historical=false,detailed=nation===currentNation()}={}){
 const ns=nationSeason(nation),meeting=ns.meetings[def.key];if(meeting.completed)return meeting;
 meeting.location=meetingLocation(nation,def);meeting.clubPoints={};meeting.winners={};if(detailed)meeting.results={};
 const discs=Object.keys(typeof DISCIPLINES!=='undefined'?DISCIPLINES:{}),notable=[];
 for(const d of discs){
  const field=fieldFor(nation,d,def.week),rows=field.map(a=>({id:a.id,name:a.name,nation:a.nation,clubId:a.athleticsClubId,club:a.athleticsClub,perf:safe(()=>rawPerformance(a,d),a.pb)})).sort((a,b)=>resultSort(d,a,b));
  rows.forEach((row,index)=>{
   const place=index+1,base=POINTS[index]||0,pts=Math.round(base*def.multiplier),a=athleteById(row.id);row.place=place;row.points=pts;meeting.clubPoints[row.clubId]=(meeting.clubPoints[row.clubId]||0)+pts;
   const sr=standingRow(ns,row.clubId);sr.points+=pts;sr.starts++;if(place===1)sr.wins++;if(place<=3)sr.podiums++;
   if(a){const achievements=registerClubAppearance(a,d,row,place,pts,{...def,key:def.key},historical);updateClubRecord(a,d,row,{...def,key:def.key});if(achievements?.length)notable.push({a,row,achievements,d})}
  });
  if(rows[0])meeting.winners[d]=compactWinner(rows[0]);
  if(detailed)meeting.results[d]=rows;
  if(!historical&&nation===currentNation()&&rows.length>=2)safe(()=>recordRivalries(`${gameSeason()}:club:${def.key}:${d}`,d,rows,def.name),null);
 }
 for(const id of Object.keys(meeting.clubPoints)){const sr=standingRow(ns,id);sr.meetings++}
 meeting.completed=true;meeting.completedSeason=gameSeason();meeting.notable=notable.slice(0,8).map(x=>({id:x.a.id,name:x.a.name,disc:x.d,perf:x.row.perf,achievements:x.achievements}));
 if(def.kind==='championship')settleNationClubSeason(nation,ns,meeting,historical);
 if(!historical&&nation===currentNation())sendManagedClubReport(def,meeting,ns,notable);
 return meeting;
}
function settleNationClubSeason(nation,ns,meeting,historical=false){
 if(ns.settled)return;ns.settled=true;
 const seasonRows=standings(nation,ns.season),seasonChampion=seasonRows[0]?.club||null,championshipId=Object.entries(meeting.clubPoints||{}).sort((a,b)=>b[1]-a[1])[0]?.[0]||null,root=worldState();
 ns.championClubId=seasonChampion?.id||null;ns.championshipClubId=championshipId;
 if(seasonChampion){seasonChampion.honours.league=(seasonChampion.honours.league||0)+1;seasonChampion.prestige=Math.min(99,seasonChampion.prestige+3)}
 if(championshipId&&root.clubs[championshipId]){root.clubs[championshipId].honours.championship=(root.clubs[championshipId].honours.championship||0)+1;root.clubs[championshipId].prestige=Math.min(99,root.clubs[championshipId].prestige+2)}
 seasonRows.slice(1,3).forEach(x=>x.club.prestige=Math.min(99,x.club.prestige+1));
 root.champions.push({season:ns.season,nation,leagueClubId:seasonChampion?.id||null,championshipClubId:championshipId});root.champions=root.champions.slice(-320);
 if(!historical&&nation===currentNation()&&seasonChampion)safe(()=>addNews('Club Athletics',`${seasonChampion.name} win the ${nationLabel(nation)} club season`,`${seasonChampion.home} · ${Math.round(seasonRows[0].points)} points`,`${seasonChampion.name} have finished top of the domestic club standings after six meetings. ${championshipId&&root.clubs[championshipId]?`${root.clubs[championshipId].name} won the National Club Championships.`:''}`,{nation,event:'Club Athletics'}),null);
}
function sendManagedClubReport(def,meeting,ns,notable){
 const own=(s.athletes||[]).filter(a=>a.nation===currentNation()&&a.clubCareer?.history?.some(h=>h.season===gameSeason()&&h.week===def.week));if(!own.length)return;
 const leading=own.map(a=>a.clubCareer.history.filter(h=>h.season===gameSeason()&&h.week===def.week).at(-1)).filter(Boolean).sort((a,b)=>a.place-b.place||b.points-a.points).slice(0,4),leader=standings(currentNation())[0],special=notable.filter(x=>x.achievements?.length).slice(0,3);
 const lines=leading.map(r=>`${athleteById(r.athleteId)?.name||'Athlete'} ${r.place===1?'won':`finished #${r.place}`} ${disciplineLabel(r.disc)} for ${r.club}`).join(' · '),extra=special.length?` ${special.map(x=>`${x.name}: ${x.achievements.join('/')}`).join(' · ')}.`:'';
 safe(()=>newMail(sender('performance'),`Club results: ${def.short}`,`${lines||'The domestic club meeting is complete.'}.${extra} ${leader?`${leader.club.name} lead the club standings on ${Math.round(leader.points)} points.`:''} Club results are available in Club Athletics.`,'review'),null);
}
function simulateClubWeek({historical=false,allNations=true}={}){
 const def=MEETINGS.find(x=>x.week===gameWeek());if(!def)return false;syncClubs();const list=allNations?nations():[currentNation()];for(const nation of list)simulateNationMeeting(nation,def,{historical,detailed:nation===currentNation()});saveNow();return true;
}
function migrateCurrentSeason(){
 const root=syncClubs();if(!root||root.migrationVersion>=1)return;
 const now=gameWeek();for(const def of MEETINGS.filter(x=>x.week<now)){for(const nation of nations())simulateNationMeeting(nation,def,{historical:true,detailed:nation===currentNation()})}
 root.migrationVersion=1;root.migratedSeason=gameSeason();root.migratedWeek=now;saveNow();
}
function pruneSeasons(){const root=worldState(),current=gameSeason();for(const key of Object.keys(root.seasons||{})){const season=Number(key);if(Number.isFinite(season)&&season<current-2)delete root.seasons[key]}}
function ensureWorld(){syncClubs();pruneSeasons();nationSeason(currentNation());migrateCurrentSeason();return worldState()}

/* ---------- Club UI ---------- */
function uiState(){s.uiClubAthletics??={tab:'overview',nation:currentNation(),clubId:null,meetingKey:null,search:''};const u=s.uiClubAthletics;if(!nations().includes(u.nation))u.nation=currentNation();if(!['overview','competitions','standings','clubs'].includes(u.tab))u.tab='overview';return u}
function statePill(text,tone=''){return `<span class="clv1-state ${tone}">${esc(text)}</span>`}
function clubButton(club,label=club?.name){return club?`<button class="clv1-link" data-club-open="${esc(club.id)}">${esc(label)}</button>`:'—'}
function athleteButton(a,label=a?.name){return a?`<button class="clv1-link" data-club-athlete="${esc(a.id)}">${esc(label)}</button>`:'—'}
function rankOfClub(nation,id){const ix=standings(nation).findIndex(x=>x.clubId===id);return ix<0?null:ix+1}
function nextMeeting(){return MEETINGS.find(m=>m.week>=gameWeek()&&!nationSeason(currentNation()).meetings[m.key]?.completed)||null}
function clubSeasonStats(a){const hist=(a?.clubCareer?.history||[]).filter(h=>Number(h.season)===gameSeason());return{starts:hist.length,wins:hist.filter(h=>h.place===1).length,podiums:hist.filter(h=>h.place<=3).length,points:hist.reduce((n,h)=>n+Number(h.points||0),0)}}
function competitionStatus(m){if(m.completed)return['Complete','good'];if(m.week===gameWeek())return['This week','live'];if(m.week<gameWeek())return['Awaiting backfill','warn'];return[`Week ${m.week}`,'']}
function hero(nation){const cs=clubsForNation(nation),ns=nationSeason(nation),rows=standings(nation),next=MEETINGS.find(d=>!ns.meetings[d.key].completed&&d.week>=gameWeek()),completed=MEETINGS.filter(d=>ns.meetings[d.key].completed).length;return `<header class="clv1-hero"><div><small>DOMESTIC ATHLETICS · ${esc(nationLabel(nation).toUpperCase())}</small><h1>Club Athletics</h1><p>Clubs select their own athletes. National duty, medical absence, training camps and Summit commitments take priority. Club marks are official selection evidence; club points never become national ranking points.</p></div><div class="clv1-hero-grid"><div><span>Clubs</span><strong>${cs.length}</strong></div><div><span>Rounds complete</span><strong>${completed} / ${MEETINGS.length}</strong></div><div><span>Next meeting</span><strong>${next?`W${next.week}`:'Complete'}</strong></div><div><span>Leader</span><strong>${rows[0]?esc(rows[0].club.name):'—'}</strong></div></div></header>`}
function tabs(u){return `<nav class="clv1-tabs" aria-label="Club Athletics sections">${[['overview','Overview'],['competitions','Competitions'],['standings','Standings'],['clubs','Clubs']].map(([k,l])=>`<button class="${u.tab===k?'on':''}" data-club-tab="${k}">${l}</button>`).join('')}</nav>`}
function nationSelector(u){return `<div class="clv1-toolbar"><label>Nation<select data-club-nation>${nations().map(n=>`<option value="${esc(n)}" ${u.nation===n?'selected':''}>${esc(nationLabel(n))}</option>`).join('')}</select></label>${u.tab==='clubs'?`<label>Find club<input data-club-search type="search" value="${esc(u.search)}" placeholder="Search club or location"></label>`:''}<span>${u.nation===currentNation()?'YOUR DOMESTIC CIRCUIT':'WORLD CLUB DIRECTORY'}</span></div>`}
function overviewHTML(nation){
 const rows=standings(nation),ns=nationSeason(nation),next=MEETINGS.find(d=>!ns.meetings[d.key].completed&&d.week>=gameWeek()),managedAthletes=(s.athletes||[]).filter(a=>a.nation===currentNation()&&!a.retired).sort((a,b)=>clubSeasonStats(b).points-clubSeasonStats(a).points).slice(0,8),recent=MEETINGS.filter(d=>ns.meetings[d.key].completed).at(-1),recentMeeting=recent?ns.meetings[recent.key]:null;
 return `<div class="clv1-grid"><div class="clv1-stack"><section class="clv1-card"><div class="clv1-card-head"><strong>Domestic Season</strong><span>${next?`${next.name} · Week ${next.week}`:'Season complete'}</span></div><div class="clv1-round-strip">${MEETINGS.map(d=>{const m=ns.meetings[d.key],[label,tone]=competitionStatus({...m,week:d.week});return `<button data-club-meeting="${d.key}" class="${d.week===gameWeek()?'current':''}"><b>W${d.week}</b><span>${esc(d.short)}</span>${statePill(label,tone)}</button>`}).join('')}</div></section><section class="clv1-card"><div class="clv1-card-head"><strong>Club Standings</strong><span>${rows.length?'Current table':'Awaiting first meeting'}</span></div>${standingsTable(nation,rows.slice(0,8),true)}</section></div><aside class="clv1-stack">${nation===currentNation()?`<section class="clv1-card"><div class="clv1-card-head"><strong>National Programme Athletes</strong><span>Club evidence this season</span></div><div class="clv1-list">${managedAthletes.length?managedAthletes.map(a=>{const x=clubSeasonStats(a);return `<div><span><strong>${athleteButton(a)}</strong><small>${clubButton(worldState().clubs[a.athleticsClubId],a.athleticsClub)} · ${esc(disciplineLabel(a.disc))}</small></span><em>${x.starts} starts · ${x.points} pts</em></div>`}).join(''):'<div class="clv1-empty">No active athletes.</div>'}</div></section>`:''}<section class="clv1-card"><div class="clv1-card-head"><strong>Latest Meeting</strong><span>${recent?`Week ${recent.week}`:'No results yet'}</span></div>${recentMeeting?winnerSummary(recentMeeting):'<div class="clv1-empty">Club results will appear after the first domestic meeting.</div>'}</section></aside></div>`}
function winnerSummary(meeting){const entries=Object.entries(meeting.winners||{}).filter(([,r])=>r);if(!entries.length)return'<div class="clv1-empty">No recorded winners.</div>';return `<div class="clv1-list">${entries.slice(0,8).map(([d,r])=>`<div><b>${esc(disciplineLabel(d))}</b><span><strong>${athleteButton(athleteById(r.id),r.name)}</strong><small>${clubButton(worldState().clubs[r.clubId])}</small></span><em>${esc(formatPerf(d,r.perf))}</em></div>`).join('')}</div>`}
function competitionsHTML(nation,u){const ns=nationSeason(nation),selected=u.meetingKey&&ns.meetings[u.meetingKey]?meetingDef(u.meetingKey):null;if(selected)return meetingDetailHTML(nation,selected,ns.meetings[selected.key]);return `<section class="clv1-card"><div class="clv1-card-head"><strong>Domestic Competition Calendar</strong><span>Automatic club entry</span></div><div class="clv1-meetings">${MEETINGS.map(def=>{const m=ns.meetings[def.key],[label,tone]=competitionStatus({...m,week:def.week});return `<article><time>W${def.week}</time><div><strong>${esc(def.name)}</strong><small>${esc(m.location||meetingLocation(nation,def))} · ${def.kind==='championship'?'National title meeting':'Club points meeting'}</small></div>${statePill(label,tone)}<button class="btn ghost" data-club-meeting="${def.key}">${m.completed?'VIEW RESULTS':'DETAILS'}</button></article>`}).join('')}</div></section>`}
function meetingDetailHTML(nation,def,m){const detailed=m.results&&Object.keys(m.results).length;return `<div class="clv1-stack"><button class="btn ghost clv1-back" data-club-meeting-back>← COMPETITIONS</button><section class="clv1-meeting-hero"><div><small>${esc(nationLabel(nation).toUpperCase())} · WEEK ${def.week}</small><h2>${esc(def.name)}</h2><p>${esc(m.location||meetingLocation(nation,def))}. Clubs choose their own eligible athletes. National programme commitments take priority.</p></div>${statePill(m.completed?'Complete':def.week===gameWeek()?'This week':`Week ${def.week}`,m.completed?'good':def.week===gameWeek()?'live':'')}</section>${m.completed?(detailed?Object.keys(m.results).map(d=>`<section class="clv1-card"><div class="clv1-card-head"><strong>${esc(disciplineLabel(d))}</strong><span>Official club result</span></div>${resultsTable(d,m.results[d])}</section>`).join(''):`<section class="clv1-card"><div class="clv1-card-head"><strong>Meeting Winners</strong><span>Compact world result</span></div>${winnerSummary(m)}</section>`):'<section class="clv1-card"><div class="clv1-empty"><strong>Results not yet available</strong>This meeting simulates automatically when its week begins.</div></section>'}</div>`}
function resultsTable(d,rows){return `<div class="clv1-table-wrap"><table class="clv1-table"><thead><tr><th>#</th><th>Athlete</th><th>Club</th><th>Mark</th><th class="num">Club points</th></tr></thead><tbody>${(rows||[]).map(r=>`<tr><td>${r.place}</td><td>${athleteButton(athleteById(r.id),r.name)}</td><td>${clubButton(worldState().clubs[r.clubId],r.club)}</td><td><strong>${esc(formatPerf(d,r.perf))}</strong></td><td class="num">${r.points||0}</td></tr>`).join('')}</tbody></table></div>`}
function standingsTable(nation,rows=standings(nation),compact=false){if(!rows.length)return'<div class="clv1-empty"><strong>No table yet</strong>The standings begin after Club League Round 1.</div>';return `<div class="clv1-table-wrap"><table class="clv1-table ${compact?'compact':''}"><thead><tr><th>#</th><th>Club</th><th>Home</th><th class="num">Points</th><th class="num">Wins</th><th class="num">Podiums</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${clubButton(r.club)}${i===0?'<small class="clv1-leader">LEADER</small>':''}</td><td>${esc(r.club.home)}</td><td class="num"><strong>${Math.round(r.points)}</strong></td><td class="num">${r.wins}</td><td class="num">${r.podiums}</td></tr>`).join('')}</tbody></table></div>`}
function standingsHTML(nation){const ns=nationSeason(nation),rows=standings(nation);return `<section class="clv1-card"><div class="clv1-card-head"><strong>${esc(nationLabel(nation))} Club Standings</strong><span>${MEETINGS.filter(d=>ns.meetings[d.key].completed).length} / ${MEETINGS.length} meetings</span></div>${standingsTable(nation,rows)}</section>`}
function clubsHTML(nation,u){const query=String(u.search||'').trim().toLowerCase(),rows=clubsForNation(nation).filter(c=>!query||`${c.name} ${c.home}`.toLowerCase().includes(query));return `<div class="clv1-club-grid">${rows.length?rows.map(c=>{const roster=members(c.id),rank=rankOfClub(nation,c.id);return `<button class="clv1-club-card" data-club-open="${esc(c.id)}" style="--club:${clubColour(c.id)}"><span class="clv1-club-mark">${esc(c.name.split(/\s+/).map(x=>x[0]).slice(0,3).join(''))}</span><div><small>${esc(c.home)} · Founded ${c.founded}</small><strong>${esc(c.name)}</strong><span>${roster.length} active athlete${roster.length===1?'':'s'} · Prestige ${c.prestige}${rank?` · #${rank} this season`:''}</span></div></button>`}).join(''):'<div class="clv1-empty"><strong>No clubs found</strong>Change the search or nation filter.</div>'}</div>`}
function clubProfileHTML(club){const roster=members(club.id),rows=standings(club.nation),rank=rankOfClub(club.nation,club.id),record=worldState().records[club.id]||{},recent=roster.flatMap(a=>(a.clubCareer?.history||[]).filter(h=>h.clubId===club.id).map(h=>({...h,athleteId:a.id,name:a.name}))).sort((a,b)=>b.season-a.season||b.week-a.week).slice(0,12),honours=club.honours||{};return `<div class="clv1-stack"><button class="btn ghost clv1-back" data-club-profile-back>← CLUB DIRECTORY</button><section class="clv1-club-hero" style="--club:${clubColour(club.id)}"><div class="clv1-club-crest">${esc(club.name.split(/\s+/).map(x=>x[0]).slice(0,3).join(''))}</div><div><small>${esc(nationLabel(club.nation).toUpperCase())} · ${esc(club.home)}</small><h1>${esc(club.name)}</h1><p>Founded ${club.founded} · Prestige ${club.prestige} · ${roster.length} active athlete${roster.length===1?'':'s'}${rank?` · #${rank} in the current domestic table`:''}</p></div><div class="clv1-honours"><span><b>${honours.league||0}</b> League titles</span><span><b>${honours.championship||0}</b> Club championships</span></div></section><div class="clv1-grid"><section class="clv1-card"><div class="clv1-card-head"><strong>Current Roster</strong><span>${roster.length} athletes</span></div><div class="clv1-table-wrap"><table class="clv1-table"><thead><tr><th>Athlete</th><th>Event</th><th>Age</th><th>PB</th><th>Status</th></tr></thead><tbody>${roster.map(a=>`<tr><td>${athleteButton(a)}</td><td>${esc(disciplineLabel(a.disc))}</td><td>${Number(a.age)||'—'}</td><td>${esc(formatPerf(a.disc,a.pb))}</td><td>${a.nation===currentNation()?esc(a.inSquad===false?'National Pool':'National Squad'):'International'}</td></tr>`).join('')||'<tr><td colspan="5">No active athletes.</td></tr>'}</tbody></table></div></section><aside class="clv1-card"><div class="clv1-card-head"><strong>Club Records</strong><span>Official marks</span></div><div class="clv1-list">${Object.keys(typeof DISCIPLINES!=='undefined'?DISCIPLINES:{}).map(d=>{const r=record[d];return `<div><b>${esc(disciplineLabel(d))}</b><span><strong>${r?esc(formatPerf(d,r.perf)):'—'}</strong><small>${r?athleteButton(athleteById(r.athleteId),r.name):'No record yet'}</small></span></div>`}).join('')}</div></aside></div><section class="clv1-card"><div class="clv1-card-head"><strong>Recent Club Performances</strong><span>Latest 12</span></div><div class="clv1-list">${recent.length?recent.map(r=>`<div><b>${r.season} W${r.week}</b><span><strong>${athleteButton(athleteById(r.athleteId),r.name)}</strong><small>${esc(r.meeting)} · ${esc(disciplineLabel(r.disc))}</small></span><em>#${r.place} · ${esc(formatPerf(r.disc,r.perf))}</em></div>`).join(''):'<div class="clv1-empty">No stored club performances yet.</div>'}</div></section></div>`}
function drawClubAthletics(){
 ensureWorld();ensureUI();const root=document.getElementById('clubs');if(!root)return;const u=uiState(),club=u.clubId?worldState()?.clubs?.[u.clubId]:null;
 if(club){root.innerHTML=`<div class="clv1" data-am-ui-screen="club-athletics-v1">${clubProfileHTML(club)}</div>`;bindClubUI(root);return}
 root.innerHTML=`<div class="clv1" data-am-ui-screen="club-athletics-v1">${hero(u.nation)}${tabs(u)}${nationSelector(u)}${u.tab==='competitions'?competitionsHTML(u.nation,u):u.tab==='standings'?standingsHTML(u.nation):u.tab==='clubs'?clubsHTML(u.nation,u):overviewHTML(u.nation)}</div>`;bindClubUI(root);
}
function bindClubUI(root){
 const u=uiState();root.querySelectorAll('[data-club-tab]').forEach(b=>b.onclick=()=>{u.tab=b.dataset.clubTab;u.meetingKey=null;drawClubAthletics()});
 root.querySelector('[data-club-nation]')?.addEventListener('change',e=>{u.nation=e.target.value;u.clubId=null;u.meetingKey=null;drawClubAthletics()});
 const search=root.querySelector('[data-club-search]');if(search)search.oninput=e=>{const pos=e.target.selectionStart;u.search=e.target.value;drawClubAthletics();requestAnimationFrame(()=>{const q=document.querySelector('[data-club-search]');if(q){q.focus();try{q.setSelectionRange(pos,pos)}catch(_){}}})};
 root.querySelectorAll('[data-club-open]').forEach(b=>b.onclick=e=>{e.stopPropagation();u.clubId=b.dataset.clubOpen;u.nation=worldState()?.clubs?.[u.clubId]?.nation||u.nation;drawClubAthletics()});
 root.querySelectorAll('[data-club-athlete]').forEach(b=>b.onclick=e=>{e.stopPropagation();safe(()=>openAthleteProfile(b.dataset.clubAthlete),null)});
 root.querySelectorAll('[data-club-meeting]').forEach(b=>b.onclick=()=>{u.tab='competitions';u.meetingKey=b.dataset.clubMeeting;drawClubAthletics()});
 root.querySelector('[data-club-meeting-back]')?.addEventListener('click',()=>{u.meetingKey=null;drawClubAthletics()});
 root.querySelector('[data-club-profile-back]')?.addEventListener('click',()=>{u.clubId=null;u.tab='clubs';drawClubAthletics()});
}

/* ---------- Navigation and integration ---------- */
function ensureUI(){
 const content=document.querySelector('.content');if(content&&!document.getElementById('clubs')){const section=document.createElement('section');section.id='clubs';section.className='view';content.appendChild(section)}
 const rail=document.getElementById('railNav');if(rail&&!rail.querySelector('[data-view="clubs"]')){const b=document.createElement('button');b.dataset.view='clubs';b.textContent='Club Athletics';b.onclick=()=>view('clubs');const before=rail.querySelector('[data-view="rankings"]');rail.insertBefore(b,before||null)}
 const mobile=document.querySelector('#mobileNavDrawer .mobile-nav-grid');if(mobile&&!mobile.querySelector('[data-mobile-view="clubs"]')){const b=document.createElement('button');b.dataset.mobileView='clubs';b.textContent='Club Athletics';b.onclick=()=>{view('clubs');const drawer=document.getElementById('mobileNavDrawer');if(drawer)drawer.hidden=true};const before=mobile.querySelector('[data-mobile-view="rankings"]');mobile.insertBefore(b,before||null)}
}
function routeToClubs(){
 if(safe(()=>appointmentPending(),false)){safe(()=>toast('Sign your appointment contract first'),null);return legacyView('inbox')}
 currentView='clubs';document.body.classList.remove('event-focus');document.querySelectorAll('.view').forEach(x=>x.classList.toggle('on',x.id==='clubs'));document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view==='clubs'));
 document.getElementById('mobileMoreBtn')?.classList.add('on');const finder=document.getElementById('peopleFinder');if(finder)finder.classList.add('hidden');const drawer=document.getElementById('mobileNavDrawer');if(drawer)drawer.hidden=true;
 const kicker=document.getElementById('pageKicker'),title=document.getElementById('pageTitle');if(kicker)kicker.textContent='DOMESTIC ATHLETICS';if(title)title.textContent='Club Athletics';drawClubAthletics();safe(()=>resetScreenPosition(),null);
}
const legacyRenderView=typeof renderView==='function'?renderView:null;if(legacyRenderView)renderView=function(v){if(v==='clubs')return drawClubAthletics();return legacyRenderView(v)};
const legacyView=typeof view==='function'?view:null;if(legacyView)view=function(v){if(v==='clubs')return routeToClubs();return legacyView(v)};

function enhanceCalendar(){
 const root=document.getElementById('calendar');if(!root)return;
 for(const def of MEETINGS){const row=root.querySelector(`[data-calv2-week-row="${def.week}"]`),body=row?.querySelector('.calv2-week-body');if(body&&!body.querySelector(`[data-club-calendar="${def.key}"]`)){const item=document.createElement('div');item.className='calv2-item clv1-calendar-item';item.dataset.clubCalendar=def.key;item.innerHTML=`<i class="calv2-dot club"></i><strong>${esc(def.short)}</strong><small>Club Athletics</small>`;body.appendChild(item)}}
 const selected=root.querySelector('[data-calv2-week-row].selected');if(selected){const week=Number(selected.dataset.calv2WeekRow),def=MEETINGS.find(x=>x.week===week),list=root.querySelector('.calv2-detail-list');if(def&&list&&!list.querySelector('[data-club-calendar-open]')){const section=document.createElement('section');section.className='calv2-detail-item clv1-calendar-detail';section.innerHTML=`<div class="calv2-detail-top"><small>Club Athletics</small>${statePill(nationSeason(currentNation()).meetings[def.key].completed?'Complete':week===gameWeek()?'This week':`Week ${week}`,nationSeason(currentNation()).meetings[def.key].completed?'good':week===gameWeek()?'live':'')}</div><h3>${esc(def.name)}</h3><p>Domestic clubs choose eligible athletes automatically. National duty, injury, camps and Summit commitments take priority.</p><div class="calv2-detail-actions"><button class="btn ghost" data-club-calendar-open="${def.key}">OPEN CLUB ATHLETICS</button></div>`;list.appendChild(section);section.querySelector('[data-club-calendar-open]').onclick=()=>{const u=uiState();u.tab='competitions';u.meetingKey=def.key;u.nation=currentNation();view('clubs')}}}
}
const legacyDrawCalendar=typeof drawCalendar==='function'?drawCalendar:null;if(legacyDrawCalendar)drawCalendar=function(){const out=legacyDrawCalendar.apply(this,arguments);enhanceCalendar();return out};

function enhanceAthleteProfile(){
 const dialog=document.getElementById('athleteProfile');if(!dialog?.open)return;const id=safe(()=>profileId,null),a=athleteById(id);if(!a?.athleticsClubId)return;
 const identity=dialog.querySelector('.apv2-identity');if(identity&&!identity.querySelector('[data-club-profile-action]')){const b=document.createElement('button');b.type='button';b.className='clv1-profile-club';b.dataset.clubProfileAction=a.athleticsClubId;b.textContent=`OPEN CLUB · ${a.athleticsClub}`;b.onclick=()=>{try{dialog.close()}catch(_){};const u=uiState();u.clubId=a.athleticsClubId;u.nation=a.athleticsClubNation||a.nation;view('clubs')};identity.appendChild(b)}
 const body=dialog.querySelector('.apv2-body');if(body&&!body.querySelector('.clv1-athlete-panel')){const x=clubSeasonStats(a),recent=(a.clubCareer?.history||[]).at(-1),panel=document.createElement('section');panel.className='apv2-card clv1-athlete-panel';panel.innerHTML=`<div class="apv2-card-head"><strong>Club Athletics</strong><span>${esc(a.athleticsClub||'Club')}</span></div><div class="apv2-card-body"><div class="clv1-athlete-club-stats"><span><small>Starts</small><strong>${x.starts}</strong></span><span><small>Wins</small><strong>${x.wins}</strong></span><span><small>Podiums</small><strong>${x.podiums}</strong></span><span><small>Club points</small><strong>${x.points}</strong></span></div>${recent?`<p class="apv2-action-note">Latest: ${esc(recent.meeting)} · #${recent.place} · ${esc(formatPerf(recent.disc,recent.perf))} for ${esc(recent.club)}.</p>`:'<p class="apv2-action-note">No club performance has been recorded this season yet.</p>'}</div>`;body.appendChild(panel)}
}
const profileDialog=document.getElementById('athleteProfile');if(profileDialog){const observer=new MutationObserver(()=>queueMicrotask(enhanceAthleteProfile));observer.observe(profileDialog,{childList:true,subtree:true});profileDialog.addEventListener('toggle',enhanceAthleteProfile);document.addEventListener('click',e=>{if(e.target.closest('#athleteProfile'))setTimeout(enhanceAthleteProfile,0)},true)}

document.addEventListener('click',e=>{const club=e.target.closest('[data-club-open-global]');if(club){const u=uiState();u.clubId=club.dataset.clubOpenGlobal;view('clubs')}},true);

/* ---------- Lifecycle ---------- */
const legacyFresh=typeof fresh==='function'?fresh:null;if(legacyFresh)fresh=function(){const state=legacyFresh.apply(this,arguments);try{syncClubs(state)}catch(_){}return state};
const legacyLoad=typeof load==='function'?load:null;if(legacyLoad)load=function(){const out=legacyLoad.apply(this,arguments);ensureWorld();return out};
const legacyOnWeekStart=typeof onWeekStart==='function'?onWeekStart:null;if(legacyOnWeekStart)onWeekStart=function(){const out=legacyOnWeekStart.apply(this,arguments);ensureWorld();simulateClubWeek();if(typeof currentView!=='undefined'&&currentView==='clubs')drawClubAthletics();return out};

ensureUI();ensureWorld();
if(MEETINGS.some(x=>x.week===gameWeek()))simulateClubWeek();

window.AMClubAthletics={
 version:VERSION,meetings:MEETINGS,points:POINTS,ensure:ensureWorld,clubsForNation,members,standings,nationSeason,simulateClubWeek,draw:drawClubAthletics,
 openClub:id=>{const u=uiState();u.clubId=id;u.nation=worldState()?.clubs?.[id]?.nation||u.nation;view('clubs')},
 snapshot:()=>{const root=ensureWorld(),nation=currentNation(),ns=nationSeason(nation),rows=standings(nation);return{version:VERSION,clubCount:Object.keys(root.clubs||{}).length,nation,domesticClubs:clubsForNation(nation).length,completed:MEETINGS.filter(d=>ns.meetings[d.key]?.completed).length,leader:rows[0]?.club?.name||null,next:MEETINGS.find(d=>!ns.meetings[d.key]?.completed&&d.week>=gameWeek())?.key||null}}
};
try{UPDATES.unshift({date:'12 September 2026',title:'Club Athletics',items:['Athletes now compete for persistent fictional athletics clubs alongside their national-programme careers.','Six domestic club meetings run automatically through the season, with club standings, team points, club records and national club championships.','Club duty is subordinate to national selection, medical absence, training camps and Summit Series commitments. Club performances remain official evidence and can update athlete PBs and records without awarding national ranking points.','A new Club Athletics area provides domestic standings, competition results, club directories, club profiles, rosters, honours and records. Athlete profiles now link directly to their club and retain club-career history.']})}catch(_){}
})();
