/* Athletics Manager — Scouting Centre V3
   Staged replacement for scouting presentation and manager workflow.
   Discovery cadence, athlete generation and staff assessment remain owned by existing gameplay systems. */
(function(){
'use strict';
if(window.__amScoutingCentreV3)return;window.__amScoutingCentreV3=1;

const $=id=>document.getElementById(id);
const esc=v=>{try{return profileEscape(String(v??''))}catch(_){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}};
const safe=(fn,fallback)=>{try{const v=fn();return v==null?fallback:v}catch(_){return fallback}};
const ui={tab:'overview',search:'',disc:'all',status:'all',limit:60};
let fallbackDraw=null;
let installedAgainst=null;
let installing=false;

function gs(){return typeof s!=='undefined'?s:null}
function scout(){const st=gs();if(!st)return null;let x=safe(()=>scoutingState(),null);if(!x)x=st.scouting??={lastCareerWeek:Number(st.game?.careerWeek||st.game?.week||1),focus:'All',reports:[]};x.reports??=[];x.focus??='All';x.watchlistIds??=[];x.reportReviewed??={};return x}
function week(){return Number(gs()?.game?.week||1)}
function careerWeek(){return Number(gs()?.game?.careerWeek||week())}
function season(){return Number(gs()?.game?.season||0)}
function nation(){return safe(()=>managedNation(),gs()?.managedNation||'GBR')}
function nationLabel(){return safe(()=>nationName(nation()),'National Programme')}
function team(){return safe(()=>managedTeam(),[])}
function pool(){return safe(()=>nationalPool(),(gs()?.athletes||[]).filter(a=>a.nation===nation()&&!a.retired&&a.inSquad===false))}
function athlete(id){return (gs()?.athletes||[]).find(a=>String(a.id)===String(id))||null}
function discLabelSafe(d){return safe(()=>discLabel(d),String(d||'—'))}
function pb(a){return safe(()=>fmtPerf(a.disc,a.pb),a?.pb==null?'—':String(a.pb))}
function ability(a){return safe(()=>assessmentText(a,'overall'),'Assessment pending')}
function development(a){return safe(()=>developmentGradeText(a),safe(()=>developmentGrade(a),'—'))}
function confidence(a,key='potential'){
 const raw=safe(()=>assessmentConfidenceLabel(a,key),null),label=Array.isArray(raw)?raw[0]:raw;
 return String(label||'Developing confidence');
}
function confidenceTone(label){const s=String(label||'').toLowerCase();return /high|strong|excellent|clear/.test(s)?'high':/medium|moderate|fair/.test(s)?'medium':''}
function portrait(a){return safe(()=>athletePortraitHTML(a),`<span>${esc(String(a?.name||'A').split(/\s+/).map(x=>x[0]||'').slice(0,2).join(''))}</span>`)}
function scoutName(){return String(gs()?.coaches?.scout?.name||gs()?.coaches?.scouting?.name||'Head Scout')}
function scoutLevel(){return Number(gs()?.staff?.scout||1)}
function reports(){return (scout()?.reports||[]).map((r,i)=>({report:r,a:athlete(r.athleteId),index:i})).filter(x=>x.a)}
function latestReports(){const seen=new Set(),out=[];for(const x of reports().slice().reverse()){const id=String(x.a.id);if(seen.has(id))continue;seen.add(id);out.push(x)}return out}
function currentReportAge(r){if(Number(r.season)!==season())return 99;return Math.max(0,week()-Number(r.week||1))}
function isNew(r){return currentReportAge(r)<=4}
function reportDate(r){return `${Number(r.season)||season()} · Week ${Number(r.week)||1}`}
function status(a){if(a.retired)return['Retired','retired'];if(a.inSquad!==false)return['National Squad','squad'];return['National Pool','pool']}
function reportReason(r){return String(r?.reason||'Scouting assignment')}
function assignmentRemaining(){const x=scout();return Math.max(0,8-(careerWeek()-Number(x?.lastCareerWeek||careerWeek())))}
function assignmentProgress(){return Math.max(0,Math.min(100,Math.round((8-assignmentRemaining())/8*100)))}
function seasonReports(){return reports().filter(x=>Number(x.report.season)===season()).length}
function allWatchIds(){
 const x=scout();if(!x)return[];const ids=[];
 if(Array.isArray(x.watchlistIds))ids.push(...x.watchlistIds);
 if(Array.isArray(x.watchlist))for(const v of x.watchlist){if(typeof v==='string'||typeof v==='number')ids.push(v);else if(v?.athleteId!=null)ids.push(v.athleteId);else if(v?.id!=null)ids.push(v.id)}
 return [...new Set(ids.map(String))];
}
function isWatched(id){return allWatchIds().includes(String(id))}
function toggleWatch(id){
 const x=scout();if(!x)return;const sid=String(id);x.watchlistIds=Array.isArray(x.watchlistIds)?x.watchlistIds:[];
 const i=x.watchlistIds.findIndex(v=>String(v)===sid);if(i>=0)x.watchlistIds.splice(i,1);else x.watchlistIds.push(id);
 /* Mirror primitive legacy watchlists when present, without replacing richer V2 watchlist structures. */
 if(Array.isArray(x.watchlist)&&x.watchlist.every(v=>typeof v==='string'||typeof v==='number')){const j=x.watchlist.findIndex(v=>String(v)===sid);if(i>=0&&j>=0)x.watchlist.splice(j,1);else if(i<0&&j<0)x.watchlist.push(id)}
 safe(()=>save(),null);render();safe(()=>toast(i>=0?'Removed from watchlist':'Added to watchlist'),null)
}
function markReviewed(id){const x=scout();if(!x)return;x.reportReviewed[String(id)]={season:season(),week:week(),at:Date.now()};safe(()=>save(),null)}
function reviewed(id){return !!scout()?.reportReviewed?.[String(id)]}
function poolReported(){const ids=new Set(reports().map(x=>String(x.a.id)));return pool().filter(a=>ids.has(String(a.id))||a.source==='Scouted')}
function retired(){return (gs()?.athletes||[]).filter(a=>a.nation===nation()&&a.retired)}
function eventOptions(base){return [...new Set(base.map(x=>x.a?.disc).filter(Boolean))].sort((a,b)=>discLabelSafe(a).localeCompare(discLabelSafe(b)))}
function filtered(base){
 const q=ui.search.trim().toLowerCase();let rows=base.filter(x=>x.a);
 if(q)rows=rows.filter(x=>`${x.a.name} ${discLabelSafe(x.a.disc)} ${reportReason(x.report)}`.toLowerCase().includes(q));
 if(ui.disc!=='all')rows=rows.filter(x=>String(x.a.disc)===ui.disc);
 if(ui.status!=='all')rows=rows.filter(x=>status(x.a)[1]===ui.status);
 rows.sort((x,y)=>Number(y.report?.season||0)-Number(x.report?.season||0)||Number(y.report?.week||0)-Number(x.report?.week||0)||String(x.a.name).localeCompare(String(y.a.name)));
 return rows;
}
function reportForAthlete(a){return latestReports().find(x=>String(x.a.id)===String(a.id))||{a,report:{season:a.discoveredSeason||season(),week:a.discoveredWeek||1,reason:a.source||'National pool'}}}
function watchRows(){return allWatchIds().map(athlete).filter(Boolean).map(reportForAthlete)}
function advice(){
 const recent=latestReports(),watch=watchRows(),unreviewed=recent.filter(x=>!reviewed(x.a.id)).length,rem=assignmentRemaining();
 if(unreviewed)return `${unreviewed} recent report${unreviewed===1?' is':'s are'} still waiting for your review. Focus first on athletes whose assessment range and development grade could change a squad decision.`;
 if(watch.length)return `${watch.length} athlete${watch.length===1?' is':'s are'} on the watchlist. Use future domestic results and testing to see whether the evidence strengthens before making a squad call.`;
 if(rem<=2)return `The current assignment is close to reporting. Keep the search focus where it is unless the programme has a clear event gap you want the network to target.`;
 return `The network is active. Scouting reports are evidence, not certainty: ability ranges and development grades should narrow as staff knowledge improves.`;
}
function routeToPool(){try{view('pool')}catch(_){try{squadTab='pool';view('squad')}catch(__){}}}
function openProfile(id){const a=athlete(id);if(!a)return;markReviewed(id);try{openAthleteProfile(a.id)}catch(_){routeToPool()}}
function openStaff(){try{view('staff')}catch(_){}}
function setFocus(value){const x=scout();if(!x)return;x.focus=value;safe(()=>save(),null);safe(()=>window.AMScoutingV2?.refreshScoutingIntegration?.(),null);render();safe(()=>toast('Scouting focus updated · report timing unchanged'),null)}
function resetFilters(){ui.search='';ui.disc='all';ui.status='all';ui.limit=60;render()}
function initials(name){return String(name||'Scout').split(/\s+/).map(x=>x[0]||'').slice(0,2).join('').toUpperCase()}

function tabs(){const counts={reports:latestReports().length,watchlist:watchRows().length};return `<nav class="scv3-tabs" aria-label="Scouting sections">${[['overview','Overview'],['reports','Reports'],['watchlist','Watchlist'],['assignment','Assignment'],['archive','Archive']].map(([k,l])=>`<button class="${ui.tab===k?'on':''}" data-scv3-tab="${k}">${l}${counts[k]!=null?`<span class="scv3-tab-count">${counts[k]}</span>`:''}</button>`).join('')}</nav>`}
function summary(){const x=scout(),rem=assignmentRemaining(),poolCount=poolReported().filter(a=>!a.retired&&a.inSquad===false).length,watch=watchRows().length,unreviewed=latestReports().filter(r=>!reviewed(r.a.id)).length;return `<div class="scv3-summary"><div class="scv3-metric"><small>Scout Network</small><strong>Level ${scoutLevel()}</strong><span>${esc(scoutName())}</span></div><div class="scv3-metric"><small>Next Report</small><strong>${rem?`${rem}w`:'Due'}</strong><span>Eight-week assignment cycle</span></div><div class="scv3-metric"><small>Reports This Season</small><strong>${seasonReports()}</strong><span>${unreviewed?`${unreviewed} to review`:'Current'}</span></div><div class="scv3-metric"><small>Scouted Pool</small><strong>${poolCount}</strong><span>Available pathway athletes</span></div><div class="scv3-metric"><small>Watchlist</small><strong>${watch}</strong><span>Manager tracked</span></div></div>`}
function assignmentCard(compact=false){const x=scout(),rem=assignmentRemaining(),progress=assignmentProgress(),focus=x?.focus||'All',options=Object.keys(typeof DISCIPLINES!=='undefined'?DISCIPLINES:{});return `<section class="scv3-card"><div class="scv3-card-head"><strong>Active Scouting Assignment</strong><span>${rem?`${rem} week${rem===1?'':'s'} to report`:'Report due'}</span></div><div class="scv3-card-body scv3-assignment"><div class="scv3-assignment-top"><div><small class="scv3-eyebrow">NETWORK SEARCH</small><h2>${focus==='All'?'All Disciplines':esc(discLabelSafe(focus))}</h2><p>Your scout network reports on its normal eight-week cycle. Changing the focus changes who is targeted; it does not reset the timer.</p></div><div class="scv3-countdown"><strong>${rem||'NOW'}</strong><small>${rem?'weeks left':'report due'}</small></div></div><div class="scv3-progress" style="--progress:${progress}%"><i></i></div><label class="scv3-field"><span>Search Focus</span><select data-scv3-focus><option value="All" ${focus==='All'?'selected':''}>All disciplines</option>${options.map(d=>`<option value="${esc(d)}" ${focus===d?'selected':''}>${esc(discLabelSafe(d))}</option>`).join('')}</select></label><div class="scv3-assignment-note">Improving the scout network raises discovery quality and makes early ability ranges and development grades more reliable. Scouting never exposes an athlete's exact hidden ability.</div>${compact?`<div class="scv3-actions"><button class="btn secondary" data-scv3-tab-open="assignment">MANAGE ASSIGNMENT</button><button class="btn ghost" data-scv3-staff>OPEN STAFF</button></div>`:''}</div></section>`}
function adviceCard(){return `<section class="scv3-card"><div class="scv3-card-head"><strong>Performance Team</strong><span>Scouting advice</span></div><div class="scv3-card-body"><div class="scv3-advice"><div class="scv3-advice-avatar">${esc(initials(scoutName()))}</div><div><strong>${esc(scoutName())}</strong><small>Head Scout · Level ${scoutLevel()}</small><p>${esc(advice())}</p></div></div></div></section>`}
function statusHTML(a){const [l,c]=status(a);return `<span class="scv3-state ${c}">${esc(l)}</span>`}
function confidenceHTML(a){const c=confidence(a),tone=confidenceTone(c);return `<span class="scv3-confidence ${tone}"><i></i>${esc(c)}</span>`}
function row(x){const a=x.a,r=x.report,newTag=isNew(r)&&!reviewed(a.id),watched=isWatched(a.id);return `<div class="scv3-row" data-scv3-athlete-row="${esc(a.id)}"><div class="scv3-person"><div class="scv3-face">${portrait(a)}</div><div><strong title="${esc(a.name)}">${esc(a.name)}${newTag?'<span class="scv3-new">NEW</span>':''}</strong><small>Age ${Number(a.age)||'—'} · ${esc(reportDate(r))}</small><span class="scv3-mobile-meta">${esc(discLabelSafe(a.disc))} · Ability ${esc(ability(a))} · Dev ${esc(development(a))} · ${esc(status(a)[0])}</span></div></div><div class="scv3-cell"><strong>${esc(discLabelSafe(a.disc))}</strong><small>${esc(reportReason(r))}</small></div><div class="scv3-cell"><strong>${Number(a.age)||'—'}</strong><small>Age</small></div><div class="scv3-cell scv3-estimate"><strong>${esc(ability(a))}</strong><small>Staff range</small></div><div class="scv3-cell"><strong class="scv3-grade">${esc(development(a))}</strong>${confidenceHTML(a)}</div><div class="scv3-cell"><strong>${esc(pb(a))}</strong><small>Recorded PB</small></div><div>${statusHTML(a)}</div><div style="display:flex;gap:5px;justify-content:flex-end"><button class="scv3-watch ${watched?'on':''}" data-scv3-watch="${esc(a.id)}" aria-label="${watched?'Remove':'Add'} ${esc(a.name)} ${watched?'from':'to'} watchlist" title="${watched?'Remove from watchlist':'Add to watchlist'}">★</button><button class="scv3-profile" data-scv3-profile="${esc(a.id)}">PROFILE</button></div></div>`}
function reportList(base,{title='Scouting Reports',subtitle='Latest assessment first',empty='No scouting reports match these filters.'}={}){const rows=filtered(base),shown=rows.slice(0,ui.limit),events=eventOptions(base);return `<section class="scv3-card"><div class="scv3-card-head"><strong>${esc(title)}</strong><span>${esc(subtitle)} · ${rows.length}</span></div><div class="scv3-toolbar"><input type="search" data-scv3-search value="${esc(ui.search)}" placeholder="Search athletes or reports" aria-label="Search scouting reports"><select data-scv3-disc aria-label="Filter by event"><option value="all">All events</option>${events.map(d=>`<option value="${esc(d)}" ${ui.disc===d?'selected':''}>${esc(discLabelSafe(d))}</option>`).join('')}</select><select data-scv3-status aria-label="Filter by pathway status"><option value="all">All statuses</option><option value="pool" ${ui.status==='pool'?'selected':''}>National Pool</option><option value="squad" ${ui.status==='squad'?'selected':''}>National Squad</option><option value="retired" ${ui.status==='retired'?'selected':''}>Retired</option></select><button class="btn ghost" data-scv3-reset ${!ui.search&&ui.disc==='all'&&ui.status==='all'?'disabled title="No active filters"':''}>RESET</button></div><div class="scv3-reports-scroll"><div class="scv3-list">${shown.length?`<div class="scv3-row scv3-row-head"><span>Athlete</span><span>Event</span><span>Age</span><span>Ability Range</span><span>Development</span><span>PB</span><span>Status</span><span>Actions</span></div>${shown.map(row).join('')}`:`<div class="scv3-empty"><strong>Nothing to show</strong>${esc(empty)}</div>`}</div>${rows.length>shown.length?`<div class="scv3-pager"><button class="btn ghost" data-scv3-more>SHOW ${Math.min(60,rows.length-shown.length)} MORE · ${rows.length} TOTAL</button></div>`:''}</div></section>`}
function overview(){const recent=latestReports().slice(0,6),watch=watchRows().slice(0,4);return `<div class="scv3-grid"><div style="display:grid;gap:12px">${assignmentCard(true)}<section class="scv3-card"><div class="scv3-card-head"><strong>Latest Discovery Reports</strong><span>${latestReports().length} current athlete reports</span></div><div>${recent.length?recent.map(x=>`<div class="scv3-report-feature"><div><small class="scv3-eyebrow">${esc(reportDate(x.report))} · ${esc(reportReason(x.report))}</small><h3>${esc(x.a.name)}${isNew(x.report)&&!reviewed(x.a.id)?'<span class="scv3-new">NEW</span>':''}</h3><p>${esc(discLabelSafe(x.a.disc))} · Staff ability ${esc(ability(x.a))} · Development ${esc(development(x.a))} · ${esc(confidence(x.a))}</p></div><div><button class="scv3-watch ${isWatched(x.a.id)?'on':''}" data-scv3-watch="${esc(x.a.id)}" aria-label="Toggle watchlist">★</button><button class="scv3-profile" data-scv3-profile="${esc(x.a.id)}">REVIEW</button></div></div>`).join(''):`<div class="scv3-empty"><strong>No reports yet</strong>Your first assignment is in progress. New prospects will appear here when the network reports.</div>`}</div><div class="scv3-pager"><button class="btn ghost" data-scv3-tab-open="reports">OPEN ALL REPORTS</button></div></section></div><aside style="display:grid;gap:12px">${adviceCard()}<section class="scv3-card"><div class="scv3-card-head"><strong>Watchlist</strong><span>${watchRows().length} tracked</span></div><div>${watch.length?watch.map(x=>`<div class="scv3-report-feature"><div><h3>${esc(x.a.name)}</h3><p>${esc(discLabelSafe(x.a.disc))} · ${esc(ability(x.a))} · Dev ${esc(development(x.a))}</p></div><div><button class="scv3-profile" data-scv3-profile="${esc(x.a.id)}">PROFILE</button></div></div>`).join(''):`<div class="scv3-empty"><strong>No athletes tracked</strong>Add prospects to the watchlist from any report.</div>`}</div>${watch.length?'<div class="scv3-pager"><button class="btn ghost" data-scv3-tab-open="watchlist">OPEN WATCHLIST</button></div>':''}</section><div class="scv3-route-note"><b>Pathway flow:</b> scout a prospect → review the canonical Athlete Profile → compare them in National Pool → make the call-up decision from the athlete profile. No duplicate athlete screen is created here.</div><div class="scv3-actions"><button class="btn secondary" data-scv3-pool>OPEN NATIONAL POOL · ${pool().length}</button></div></aside></div>`}
function reportsTab(){return reportList(latestReports(),{title:'Scouting Reports',subtitle:'One current report per athlete',empty:'No scouting reports match these filters.'})}
function watchlistTab(){const rows=watchRows();return `<div style="display:grid;gap:12px"><div class="scv3-section-title"><div><small class="scv3-eyebrow">MANAGER TRACKING</small><h2>Watchlist</h2></div><span>Use reports, testing and results before making a squad call.</span></div>${reportList(rows,{title:'Tracked Athletes',subtitle:'Your watchlist',empty:'No watchlisted athletes match these filters.'})}<div class="scv3-actions"><button class="btn secondary" data-scv3-pool>COMPARE IN NATIONAL POOL</button></div></div>`}
function assignmentTab(){return `<div class="scv3-grid"><div>${assignmentCard(false)}</div><aside style="display:grid;gap:12px">${adviceCard()}<section class="scv3-card"><div class="scv3-card-head"><strong>How the Network Works</strong><span>Gameplay ownership</span></div><div class="scv3-card-body" style="display:grid;gap:9px;color:#9db6c4;font-size:10px;line-height:1.55"><div><strong style="color:#e4f0f5">Discovery cadence</strong><br>The existing scouting system generates its normal report every eight career weeks. National scouting events can create additional reports.</div><div><strong style="color:#e4f0f5">Assessment uncertainty</strong><br>Ability is shown as a staff range and development as a grade. Better scouting improves reliability; this screen does not expose hidden exact ratings.</div><div><strong style="color:#e4f0f5">Selection responsibility</strong><br>Discovery never promotes an athlete automatically. New prospects enter the National Pool and the final call-up remains your decision.</div></div></section><div class="scv3-actions"><button class="btn ghost" data-scv3-staff>REVIEW SCOUTING STAFF</button></div></aside></div>`}
function archiveTab(){const rows=retired();return `<section class="scv3-card"><div class="scv3-card-head"><strong>National Athlete Archive</strong><span>${rows.length} retired career${rows.length===1?'':'s'}</span></div><div class="scv3-card-body"><div class="scv3-archive">${rows.length?rows.map(a=>`<div class="scv3-archive-item"><div><strong>${esc(a.name)}</strong><small>${esc(discLabelSafe(a.disc))} · ${esc(a.retirement?.reason||'Retired')} · ${a.retirement?.season||season()}</small></div><button class="scv3-profile" data-scv3-profile="${esc(a.id)}">CAREER</button></div>`).join(''):`<div class="scv3-empty"><strong>No retired national athletes</strong>Completed athlete careers will remain accessible here.</div>`}</div></div></section>`}
function body(){if(ui.tab==='reports')return reportsTab();if(ui.tab==='watchlist')return watchlistTab();if(ui.tab==='assignment')return assignmentTab();if(ui.tab==='archive')return archiveTab();return overview()}
function render(){
 const root=$('scouting');if(!root||!gs())return;
 safe(()=>window.AMScoutingV2?.refreshScoutingIntegration?.(),null);
 const x=scout();if(!x)return;
 const rem=assignmentRemaining(),unreviewed=latestReports().filter(r=>!reviewed(r.a.id)).length;
 root.innerHTML=`<div class="scv3" data-am-ui-screen="scouting-v3"><header class="scv3-head"><div class="scv3-title"><small>${esc(nationLabel()).toUpperCase()} · TALENT IDENTIFICATION</small><h1>Scouting</h1><p>Find the next national athlete without removing uncertainty from the decision.</p></div><div class="scv3-head-stats"><span><small>Week</small><b>${week()}</b></span><span><small>Next Report</small><b>${rem?`${rem} weeks`:'Due now'}</b></span><span><small>To Review</small><b>${unreviewed}</b></span></div></header>${tabs()}${summary()}${body()}</div>`;
 bind(root);
 try{window.AthleticsUI?.registerScreen?.('scouting',{status:'candidate',replacement:'scouting-v3'})}catch(_){}
}
function bind(root){
 root.querySelectorAll('[data-scv3-tab]').forEach(b=>b.onclick=()=>{ui.tab=b.dataset.scv3Tab;ui.limit=60;render()});
 root.querySelectorAll('[data-scv3-tab-open]').forEach(b=>b.onclick=()=>{ui.tab=b.dataset.scv3TabOpen;ui.limit=60;render()});
 root.querySelectorAll('[data-scv3-focus]').forEach(sel=>sel.onchange=e=>setFocus(e.target.value));
 root.querySelectorAll('[data-scv3-watch]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleWatch(b.dataset.scv3Watch)});
 root.querySelectorAll('[data-scv3-profile]').forEach(b=>b.onclick=e=>{e.stopPropagation();openProfile(b.dataset.scv3Profile)});
 root.querySelectorAll('[data-scv3-pool]').forEach(b=>b.onclick=routeToPool);
 root.querySelectorAll('[data-scv3-staff]').forEach(b=>b.onclick=openStaff);
 const search=root.querySelector('[data-scv3-search]');if(search)search.oninput=e=>{const pos=e.target.selectionStart;ui.search=e.target.value;ui.limit=60;render();requestAnimationFrame(()=>{const q=$('scouting')?.querySelector('[data-scv3-search]');if(q){q.focus();try{q.setSelectionRange(pos,pos)}catch(_){}}})};
 root.querySelector('[data-scv3-disc]')?.addEventListener('change',e=>{ui.disc=e.target.value;ui.limit=60;render()});
 root.querySelector('[data-scv3-status]')?.addEventListener('change',e=>{ui.status=e.target.value;ui.limit=60;render()});
 root.querySelectorAll('[data-scv3-reset]').forEach(b=>b.onclick=resetFilters);
 root.querySelector('[data-scv3-more]')?.addEventListener('click',()=>{ui.limit+=60;render()});
}
function drawScoutingV3(){try{return render()}catch(err){console.error('[Athletics Manager] Scouting V3 recovered to previous renderer',err);try{window.AthleticsUI?.registerScreen?.('scouting',{status:'fallback',replacement:'scouting-v3'})}catch(_){};if(typeof fallbackDraw==='function'&&fallbackDraw!==drawScoutingV3)return fallbackDraw.apply(this,arguments)}}
function install(){
 if(installing)return false;installing=true;
 try{
  if(typeof drawScouting!=='function')return false;
  if(drawScouting===drawScoutingV3)return true;
  installedAgainst=drawScouting;fallbackDraw=drawScouting;drawScouting=drawScoutingV3;
  if(typeof currentView!=='undefined'&&currentView==='scouting')requestAnimationFrame(drawScoutingV3);
  return true;
 }finally{installing=false}
}
function debug(){return{installed:typeof drawScouting==='function'&&drawScouting===drawScoutingV3,installedAgainst:installedAgainst?.name||'anonymous',tab:ui.tab,reports:latestReports().length,watchlist:watchRows().length,remaining:assignmentRemaining(),focus:scout()?.focus||'All',v2Available:!!window.AMScoutingV2}}

window.__athleticsScoutingV3={version:3,install,render,state:ui,debug,legacy:()=>fallbackDraw,compatibilityOnly:true};
/* Playtest feedback: Scouting V2 multi-assignment UI is the presentation authority again. */
try{window.AthleticsUI?.registerScreen?.('scouting',{status:'active',replacement:'scouting-v2'})}catch(_){ }
})();
