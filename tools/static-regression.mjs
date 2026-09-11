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

const routes=['home','inbox','squad','pool','calendar','training','scouting','league','rankings','olympics','staff','finance','news','competition'];
for(const route of routes){
 if(!new RegExp(`<section\\s+id=["']${route}["']`).test(html))fail(`Missing route section: ${route}`);
}

const requiredScripts=[
 'scripts/game.js',
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
 'scripts/manager-career-v1.js',
 'scripts/first-time-experience-v2.js',
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
before('scripts/game.js','scripts/ui-platform-v1.js');
before('scripts/inbox-decision-core-v1.js','scripts/home-v2.js');
before('scripts/inbox-decision-core-v1.js','scripts/inbox-v3.js');
before('scripts/ui-platform-v1.js','scripts/home-v2.js');
before('scripts/live-event-engine-v3.js','scripts/live-event-broadcast-v4.js');
before('scripts/shotput-athlete-v1.js','scripts/live-event-broadcast-v4.js');
before('scripts/live-event-broadcast-v4.js','scripts/competition-journey-v2.js');
before('scripts/competition-journey-v2.js','scripts/competition-journey-route-guard-v1.js');
before('scripts/scouting-v3.js','scripts/world-season-v2.js');
before('scripts/staff-finance-v2.js','scripts/world-season-v2.js');
before('scripts/world-season-v2.js','scripts/manager-career-v1.js');
before('scripts/manager-career-v1.js','scripts/first-time-experience-v2.js');
before('scripts/first-time-experience-v2.js','scripts/integration-regression-v1.js');
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
 'styles/competition-journey-v2.css','styles/live-event-broadcast-v4.css','styles/training-v3.css','styles/scouting-v3.css','styles/staff-finance-v2.css','styles/world-season-v2.css',
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
  ['window.__athleticsCompetitionJourneyV2','Competition Journey public handle is missing']
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
 'scripts/first-time-experience-v2.js':[
  ['window.AMFirstTimeExperienceV2','First-Time Experience V2 public service is missing'],
  ["const OPENING_EVENT_ID='opening-meet-v2'",'Opening-month competition authority is missing'],
  ['function ensureOpeningSchedule()','Opening-month schedule migration is missing'],
  ['function firstSelectionComplete(e)','Explicit first-selection decision gate is missing'],
  ['function showLiveIntro(e,d,start)','First live-event contextual help is missing'],
  ['function compactFirstDay()','Reduced-text first-day flow is missing'],
  ['function trainingRecommendation()','Action-led training introduction is missing'],
  ['function weekMessages()','Staff-led opening-month messages are missing'],
  ['function captureAdvance(ev)','Guided Advance Week protection is missing'],
  ['setGuidance','Guidance assist level control is missing']
 ],
 'scripts/inbox-decision-core-v1.js':[
  ['getProgressionBlockers:blockers','Inbox decision core must remain the progression-blocker authority'],
  ['openAction','Inbox decision core action router is missing']
 ],
 'scripts/ui-cutover-v1.js':[
  ['am-ui-cutover','Production cutover body marker is missing'],
  ['errorBoundary','Production cutover recovery boundary is missing'],
  ["generation:GENERATION",'Production cutover generation contract is missing']
 ]
};
for(const [file,contracts] of Object.entries(sourceContracts)){
 const full=path.join(root,file);
 if(!fs.existsSync(full)){fail(`Source contract file missing: ${file}`);continue}
 const text=read(file);
 for(const [token,message] of contracts)if(!text.includes(token))fail(`${message} (${file})`);
}

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
