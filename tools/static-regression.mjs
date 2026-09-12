import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const htmlPath=path.join(root,'game.html');
const failures=[];
const notes=[];
const fail=msg=>failures.push(msg);
const note=msg=>notes.push(msg);
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

if(!fs.existsSync(htmlPath)){
 console.error('game.html is missing');
 process.exit(1);
}

const html=fs.readFileSync(htmlPath,'utf8');
const localRefs=[];
for(const match of html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["']/gi)){
 const raw=match[1];
 if(/^(?:https?:|data:|\/\/)/i.test(raw))continue;
 const clean=raw.split('?')[0].split('#')[0];
 if(clean)localRefs.push(clean);
}

for(const ref of localRefs){
 if(!fs.existsSync(path.join(root,ref)))fail(`Missing referenced asset: ${ref}`);
}

const duplicates=[...new Set(localRefs.filter((ref,i,arr)=>arr.indexOf(ref)!==i))];
for(const ref of duplicates)fail(`Asset loaded more than once: ${ref}`);

const ids=[...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(x=>x[1]);
for(const id of new Set(ids)){
 const count=ids.filter(x=>x===id).length;
 if(count>1)fail(`Duplicate static DOM id: ${id} ×${count}`);
}

const routes=['home','inbox','squad','pool','clubs','calendar','training','scouting','league','rankings','olympics','staff','finance','news','competition'];
for(const route of routes){
 if(!new RegExp(`<section\\s+id=["']${route}["']`).test(html))fail(`Missing route section: ${route}`);
}

const requiredScripts=[
 'scripts/game.js',
 'scripts/nation-world-v1.js',
 'scripts/people-biography-v1.js',
 'scripts/inbox-decision-core-v1.js',
 'scripts/ui-platform-v1.js',
 'scripts/home-v2.js',
 'scripts/inbox-v3.js',
 'scripts/squad-athlete-v2.js',
 'scripts/calendar-v2.js',
 'scripts/live-event-engine-v3.js',
 'scripts/shotput-athlete-v1.js',
 'scripts/live-event-broadcast-v4.js',
 'scripts/competition-journey-v2.js',
 'scripts/training-v3.js',
 'scripts/scouting-v3.js',
 'scripts/staff-finance-v2.js',
 'scripts/world-season-v2.js',
 'scripts/club-world-v1.js',
 'scripts/manager-career-v1.js',
 'scripts/first-time-experience-v2.js',
 'scripts/keyboard-shortcuts-v1.js',
 'scripts/release-baseline.js',
 'scripts/integration-regression-v1.js',
 'scripts/ui-cutover-v1.js'
];
const scriptOrder=[...html.matchAll(/<script\b[^>]+src=["']([^"']+)["']/gi)].map(x=>x[1].split('?')[0]);
for(const script of requiredScripts)if(!scriptOrder.includes(script))fail(`Required runtime is not loaded: ${script}`);

function before(a,b){
 const ia=scriptOrder.indexOf(a),ib=scriptOrder.indexOf(b);
 if(ia<0||ib<0)return;
 if(ia>=ib)fail(`Script order invalid: ${a} must load before ${b}`);
}
before('scripts/game.js','scripts/nation-world-v1.js');
before('scripts/nation-world-v1.js','scripts/people-biography-v1.js');
before('scripts/people-biography-v1.js','scripts/squad-athlete-v2.js');
before('scripts/people-biography-v1.js','scripts/staff-finance-v2.js');
before('scripts/nation-world-v1.js','scripts/ui-platform-v1.js');
before('scripts/inbox-decision-core-v1.js','scripts/home-v2.js');
before('scripts/inbox-decision-core-v1.js','scripts/inbox-v3.js');
before('scripts/ui-platform-v1.js','scripts/home-v2.js');
before('scripts/live-event-engine-v3.js','scripts/live-event-broadcast-v4.js');
before('scripts/shotput-athlete-v1.js','scripts/live-event-broadcast-v4.js');
before('scripts/live-event-broadcast-v4.js','scripts/competition-journey-v2.js');
before('scripts/competition-journey-v2.js','scripts/competition-journey-route-guard-v1.js');
before('scripts/scouting-v3.js','scripts/world-season-v2.js');
before('scripts/staff-finance-v2.js','scripts/world-season-v2.js');
before('scripts/world-season-v2.js','scripts/club-world-v1.js');
before('scripts/club-world-v1.js','scripts/manager-career-v1.js');
before('scripts/manager-career-v1.js','scripts/first-time-experience-v2.js');
before('scripts/first-time-experience-v2.js','scripts/release-baseline.js');
before('scripts/release-baseline.js','scripts/integration-regression-v1.js');
for(const script of requiredScripts.filter(x=>!['scripts/integration-regression-v1.js','scripts/ui-cutover-v1.js'].includes(x)))before(script,'scripts/integration-regression-v1.js');
before('scripts/integration-regression-v1.js','scripts/ui-cutover-v1.js');

if(scriptOrder.includes('scripts/inbox-decision-system-v2.js'))fail('Deleted inbox-decision-system-v2.js has been reintroduced.');
if(scriptOrder.includes('scripts/onboarding-copy-cleanup-v1.js'))fail('Removed onboarding-copy-cleanup-v1.js has been reintroduced into game.html.');
/* game.js/game.css remain because they still own gameplay and shell primitives. They are not an approved presentation fallback. */
if(!localRefs.includes('styles/game.css'))fail('Core game.css primitives are missing; extract them before removing this file.');
if(!scriptOrder.includes('scripts/game.js'))fail('Core game.js gameplay runtime is missing; extract gameplay before removing this file.');

const retiredPresentation=[
 'styles/premium-profiles.css','styles/athlete-profile-flow-fix.css','styles/flow-stability-batch.css','styles/event-overview-actions-v1.css',
 'scripts/premium-profiles.js','scripts/athlete-profile-flow-fix.js','scripts/squad-screen-tidy.js'
];
for(const file of retiredPresentation)if(localRefs.includes(file)||scriptOrder.includes(file))fail(`Retired presentation layer was reintroduced into game.html: ${file}`);

const productionAssets=[
 'styles/ui-platform-v1.css','styles/home-v2.css','styles/inbox-v3.css','styles/squad-athlete-v2.css','styles/calendar-v2.css',
 'styles/competition-journey-v2.css','styles/live-event-broadcast-v4.css','styles/training-v3.css','styles/scouting-v3.css','styles/staff-finance-v2.css','styles/world-season-v2.css','styles/club-world-v1.css',
 'styles/event-flow-stability.css','styles/manager-profile-v1.css','styles/manager-profile-sidebar-v1.css','styles/first-time-experience-v2.css'
];
for(const file of productionAssets){
 const full=path.join(root,file);
 if(!fs.existsSync(full))fail(`Missing production UI asset: ${file}`);
 else if(fs.statSync(full).size<100)fail(`Production UI asset looks empty: ${file}`);
}

const integration=path.join(root,'scripts/integration-regression-v1.js');
if(fs.existsSync(integration)){
 const text=fs.readFileSync(integration,'utf8');
 for(const token of ['__athleticsRegression','popstate','getProgressionBlockers','competitionRouteValid'])if(!text.includes(token))fail(`Integration runtime missing safeguard: ${token}`);
}

/* Source contracts for bugs already discovered during the rebuild. */
const sourceContracts={
 'scripts/people-biography-v1.js':[
  ['window.AMPeopleBiography','People Biography public authority is missing'],
  ['function ensureAthlete','Athlete biography migration is missing'],
  ['function ensureCoach','Coach biography migration is missing'],
  ['dateOfBirth','Date-of-birth persistence is missing'],
  ['birthPlace','Place-of-birth persistence is missing'],
  ['athleticsClubId','Athletics Club stable ID persistence is missing'],
  ['athleticsClubHome','Athletics Club home-location persistence is missing'],
  ['function clubFor','Athletics Club deterministic assignment is missing'],
  ['function formatDate','British-English biography date formatter is missing']
 ],
 'scripts/nation-world-v1.js':[
  ['EXPECTED_NATIONS=64','64-nation world count contract is missing'],
  ['function addWorld(list)','64-nation athlete seeding is missing'],
  ['function ensure(st)','64-nation existing-save migration is missing'],
  ['data-nation-search','64-nation picker search control is missing'],
  ['data-nation-region','64-nation picker region filter is missing'],
  ["newCareerButton.onclick=()=>showNationPicker()",'64-nation picker must rebind Start New Career to the expanded picker'],
  ['window.AMNationWorld','64-nation world public service is missing']
 ],
 'scripts/club-world-v1.js':[
  ['window.AMClubWorld','Club Athletics public authority is missing'],
  ['const MEETS=','Club Athletics season calendar is missing'],
  ['function simulateMeeting','Club Athletics meeting simulation is missing'],
  ['function standings','Club Athletics championship table is missing'],
  ['function processCurrentWeek','Club Athletics weekly simulation hook is missing'],
  ['function openClub','Club profile routing is missing'],
  ['data-am-ui-screen="club-world-v1"','Club Athletics production screen marker is missing']
 ],
 'scripts/squad-athlete-v2.js':[
  ['Date of birth','Athlete profile must display date of birth'],
  ['Place of birth','Athlete profile must display place of birth'],
  ['Athletics Club','Athlete profile must display Athletics Club'],
  ['data-apv2-club','Managed athlete club identity must link to Club Athletics'],
  ['AMPeopleBiography','Athlete profile must use persistent biography data']
 ],
 'scripts/staff-finance-v2.js':[
  ['Date of birth','Coach profile must display date of birth'],
  ['Place of birth','Coach profile must display place of birth'],
  ['AMPeopleBiography','Coach profile must use persistent biography data']
 ],
 'scripts/home-v2.js':[
  ['const c=core();if(c?.openAction)','Home decision routing must verify openAction before returning'],
  ['window.AthleticsUI?.format?.money','Home money formatting must use the window-scoped UI platform']
 ],
 'scripts/inbox-v3.js':[
  ['const c=core();if(c?.openAction)','Inbox decision routing must verify openAction before returning']
 ],
 'scripts/scouting-v3.js':[
  ['function reportForAthlete(a)','Scouting report fallback helper is missing'],
  ['window.__athleticsScoutingV3','Scouting V3 public handle is missing']
 ],
 'scripts/selection-immersion-v1.js':[
  ['function decorateAthletes(ctx,d,dlg)','Selection athlete-story decorator is missing'],
  ['__selectionImmersion','Selection immersion wrapper ownership marker is missing']
 ],
 'scripts/competition-journey-v2.js':[
  ['window.__athleticsCompetitionJourneyV2','Competition Journey public handle is missing'],
  ['function summitRouteActive()','Competition Journey must delegate active Summit routes to the Summit authority'],
  ['function completeEventIfReady(e)','Competition Journey must reconcile fully-resulted meetings before returning Home']
 ],
 'scripts/summit-event-unified.js':[
  ['function reconcileMeeting(m)','Summit meetings with every result must reconcile to completed state'],
  ["root.dataset.amUiScreen='competition-v2'",'Summit overview/results must identify themselves as the production Competition screen'],
  ["summitLiveMeetingNumber=null;saveNow();view('home')",'Returning Home from Summit must clear the remembered Summit route']
 ],
 'scripts/live-event-broadcast-v4.js':[
  ['window.AMLiveBroadcastV4','Broadcast V4 public handle is missing'],
  ['window.AMLiveEventV3=api','Broadcast V4 must remain compatible with existing live integrations'],
  ["speed:'broadcast'",'Broadcast auto-pacing mode is missing'],
  ['function photoFinish(c)','Broadcast photo-finish handling is missing'],
  ['commentQueue','Broadcast commentary priority queue is missing'],
  ['function sprintPhase(c,state)','Sprint phase choreography is missing'],
  ['function cameraTarget(c,state)','Sprint camera director is missing'],
  ['function postFinishPos(d,x,i,extra)','Post-finish runout is missing'],
  ['function trackMomentText(c,m,top)','Sprint-specific commentary is missing'],
  ['function fieldRoundInfo(c,q=c.seq[c.i]||c.seq.at(-1))','Field-event round tracking is missing'],
  ['function fieldPreAttemptSpeech(c,q)','Field-event pre-attempt context is missing'],
  ['function fieldBestMarkers(c,family)','Field-event best-mark references are missing'],
  ['lastTookLead','Field-event lead-change presentation is missing'],
  ['function distanceGroups(c,state)','Broadcast distance pack/gap model is missing'],
  ['function distanceCameraTarget(c,state)','Broadcast distance camera director is missing'],
  ['function distanceMoment(c)','Broadcast lap/bell/breakaway timeline is missing'],
  ['function distanceLeadComment(c,state)','Broadcast distance commentary is missing'],
  ["document.addEventListener('visibilitychange'",'Broadcast background-tab pause safeguard is missing'],
  ['function presentationHz()','Broadcast adaptive presentation budget is missing'],
  ['function qaSnapshot(c)','Broadcast visual/simulation QA snapshot is missing'],
  ['function paintDue(c,force=false)','Broadcast render throttling is missing'],
  ["version:'4.6.0'",'Broadcast V4.6 version contract is missing']
 ],
 'scripts/manager-career-v1.js':[
  ['window.__athleticsManagerCareerV1','Manager Career V1 public service is missing'],
  ['function syncMilestones(mc)','Manager career milestone engine is missing'],
  ['function buildSeasonSnapshot(summary)','Manager historical season snapshot system is missing'],
  ['function philosophy()','Manager philosophy derivation is missing'],
  ['function federationConfidence()','Federation confidence reasoning is missing'],
  ['window.openManagerProfile=openManagerProfileV1','My Profile must own the canonical manager profile opener']
 ],
 'scripts/keyboard-shortcuts-v1.js':[
  ["event.code!=='Space'",'Space shortcut key contract is missing'],
  ["document.getElementById('advanceTop')",'Space shortcut must target the canonical Advance Week button'],
  ["document.querySelector('dialog[open]')",'Space shortcut must not fire through open dialogs'],
  ['isInteractiveTarget(event.target)','Space shortcut must not fire while typing or using interactive controls'],
  ['button.click()','Space shortcut must use the canonical Advance Week click path']
 ],
 'scripts/first-time-experience-v2.js':[
  ['window.AMFirstTimeExperienceV2','First-Time Experience V2 public service is missing'],
  ["const OPENING_EVENT_ID='opening-meet-v2'",'Opening-month competition authority is missing'],
  ['const FIRST_SEASON_SPRING_WEEK=13','First-season Spring Grand Prix must not collide with Summit Series 1 in Week 14'],
  ['function ensureOpeningSchedule()','Opening-month schedule migration is missing'],
  ['function firstSelectionComplete(e)','Explicit first-selection decision gate is missing'],
  ['function showLiveIntro(e,d,start)','First live-event contextual help is missing'],
  ['function compactFirstDay()','Reduced-text first-day flow is missing'],
  ['function trainingRecommendation()','Action-led training introduction is missing'],
  ['function weekMessages()','Staff-led opening-month messages are missing'],
  ['function scoutingV2Signature()','FTUE must observe authoritative Scouting V2 assignment state'],
  ['function scoutingV2HasAssignment()','FTUE must read the production Scouting V2 active-assignment authority'],
  ['function syncScoutingV2Assignment','FTUE must reconcile a saved or newly-created Scouting V2 assignment'],
  ['function maybeCompleteScoutingV2Assignment','FTUE must complete Week 3 from a real Scouting V2 assignment'],
  ['window.AMScoutingV2?.refreshScoutingIntegration?.()','FTUE Scouting routing must target the production Scouting V2 integration'],
  ['function captureAdvance(ev)','Guided Advance Week protection is missing'],
  ['setGuidance','Guidance assist level control is missing']
 ],
 'scripts/release-baseline.js':[
  ["const PRODUCT_VERSION='1.0'",'Athletics Manager shipping release must remain anchored to 1.0 until deliberately upgraded'],
  ["const SYSTEM_VERSION='1.0'",'Canonical production systems must share the 1.0 baseline'],
  ['oneAuthorityPerSystem:true','Release baseline must enforce one production authority per system'],
  ["baselineBranch:'release/1.0'",'Release baseline must name the 1.0 failsafe branch'],
  ['window.AMRelease=release','Canonical release manifest global is missing']
 ],
 'scripts/inbox-decision-core-v1.js':[
  ['getProgressionBlockers:blockers','Inbox decision core must remain the progression-blocker authority'],
  ['openAction','Inbox decision core action router is missing']
 ],
 'scripts/selection-decision-v3.js':[
  ["querySelectorAll('[data-review]')",'Every visible Review & Submit control must receive the selection review handler']
 ],
 'scripts/ui-cutover-v1.js':[
  ['am-ui-cutover','Production cutover body marker is missing'],
  ['errorBoundary','Production cutover recovery boundary is missing'],
  ['root.matches?.(def.selector)','Production cutover must recognise route-root production markers'],
  ["generation:GENERATION",'Production cutover generation contract is missing']
 ]
};
for(const [file,contracts] of Object.entries(sourceContracts)){
 const full=path.join(root,file);
 if(!fs.existsSync(full)){fail(`Source contract file missing: ${file}`);continue}
 const text=read(file);
 for(const [token,message] of contracts)if(!text.includes(token))fail(`${message} (${file})`);
}

const selectionDecisionSource=read('scripts/selection-decision-v3.js');
const reviewActionTokens=(selectionDecisionSource.match(/data-review/g)||[]).length;
if(reviewActionTokens!==2)fail(`Selection V3 must contain one rendered Review & Submit action plus one binding selector; found ${reviewActionTokens} data-review tokens`);

note(`${routes.length} route containers present`);
note(`${localRefs.length} local assets referenced by game.html`);
note(`${requiredScripts.length} critical runtimes checked for load order`);
note(`${Object.keys(sourceContracts).length} critical source modules checked for production contracts`);
note('Retired presentation layers are absent from the active asset graph; core gameplay/shell primitives remain until later extraction');

if(failures.length){
 console.error('\nATHLETICS MANAGER STATIC REGRESSION: FAILED\n');
 failures.forEach(x=>console.error(`✗ ${x}`));
 console.error(`\n${failures.length} failure${failures.length===1?'':'s'}\n`);
 process.exit(1);
}
console.log('\nATHLETICS MANAGER STATIC REGRESSION: PASSED\n');
notes.forEach(x=>console.log(`✓ ${x}`));
