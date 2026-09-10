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
 'scripts/competition-journey-v2.js',
 'scripts/training-v3.js',
 'scripts/scouting-v3.js',
 'scripts/staff-finance-v2.js',
 'scripts/world-season-v2.js',
 'scripts/integration-regression-v1.js'
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
before('scripts/competition-journey-v2.js','scripts/competition-journey-route-guard-v1.js');
before('scripts/scouting-v3.js','scripts/world-season-v2.js');
before('scripts/staff-finance-v2.js','scripts/world-season-v2.js');
for(const script of requiredScripts.filter(x=>x!=='scripts/integration-regression-v1.js'))before(script,'scripts/integration-regression-v1.js');

if(scriptOrder.includes('scripts/inbox-decision-system-v2.js'))fail('Deleted inbox-decision-system-v2.js has been reintroduced.');
if(scriptOrder.includes('scripts/onboarding-copy-cleanup-v1.js'))fail('Removed onboarding-copy-cleanup-v1.js has been reintroduced into game.html.');
if(!localRefs.includes('styles/game.css'))fail('Legacy game.css was removed before migration parity was proven.');
if(!scriptOrder.includes('scripts/game.js'))fail('Legacy game.js was removed before migration parity was proven.');

const staged=[
 'styles/ui-platform-v1.css','styles/home-v2.css','styles/inbox-v3.css','styles/squad-athlete-v2.css','styles/calendar-v2.css',
 'styles/competition-journey-v2.css','styles/training-v3.css','styles/scouting-v3.css','styles/staff-finance-v2.css','styles/world-season-v2.css'
];
for(const file of staged){
 const full=path.join(root,file);
 if(!fs.existsSync(full))fail(`Missing staged UI asset: ${file}`);
 else if(fs.statSync(full).size<100)fail(`Staged UI asset looks empty: ${file}`);
}

const integration=path.join(root,'scripts/integration-regression-v1.js');
if(fs.existsSync(integration)){
 const text=fs.readFileSync(integration,'utf8');
 for(const token of ['__athleticsRegression','popstate','getProgressionBlockers','competitionRouteValid'])if(!text.includes(token))fail(`Integration runtime missing safeguard: ${token}`);
}

/* Source contracts for bugs already discovered during the staged migration. These checks
   prevent a future wrapper/edit from silently restoring the broken behaviour. */
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
  ['window.__athleticsScoutingV3','Scouting V3 public migration handle is missing']
 ],
 'scripts/selection-immersion-v1.js':[
  ['function decorateAthletes(ctx,d,dlg)','Selection athlete-story decorator is missing'],
  ['__selectionImmersion','Selection immersion wrapper ownership marker is missing']
 ],
 'scripts/competition-journey-v2.js':[
  ['window.__athleticsCompetitionJourneyV2','Competition Journey migration handle is missing']
 ],
 'scripts/inbox-decision-core-v1.js':[
  ['getProgressionBlockers:blockers','Inbox decision core must remain the progression-blocker authority'],
  ['openAction','Inbox decision core action router is missing']
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
note(`${Object.keys(sourceContracts).length} critical source modules checked for migration contracts`);
note('Legacy shell remains present; this gate intentionally blocks premature removal during staged migration');

if(failures.length){
 console.error('\nATHLETICS MANAGER STATIC REGRESSION: FAILED\n');
 failures.forEach(x=>console.error(`✗ ${x}`));
 console.error(`\n${failures.length} failure${failures.length===1?'':'s'}\n`);
 process.exit(1);
}
console.log('\nATHLETICS MANAGER STATIC REGRESSION: PASSED\n');
notes.forEach(x=>console.log(`✓ ${x}`));
