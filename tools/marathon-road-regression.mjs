import fs from 'node:fs';
import assert from 'node:assert/strict';

const road=fs.readFileSync('scripts/marathon-road-v1.js','utf8');
const router=fs.readFileSync('scripts/marathon-road-router-v1.js','utf8');
const loader=fs.readFileSync('scripts/keyboard-shortcuts-v1.js','utf8');
const css=fs.readFileSync('styles/marathon-road-v1.css','utf8');

assert.match(road,/MMarathon:\{label:"Men's Marathon"/,'men’s marathon discipline must exist');
assert.match(road,/WMarathon:\{label:"Women's Marathon"/,'women’s marathon discipline must exist');
assert.match(road,/distance:42195/,'marathon must use the official 42,195m distance');
assert.match(road,/MMarathon:7170/,'men’s road record benchmark must be registered');
assert.match(road,/WMarathon:7796/,'women’s road record benchmark must be registered');

for(const [id,week] of [['road-spring',10],['road-capital',21],['road-lakeside',32],['road-autumn',43]]){
 assert.match(road,new RegExp(`id:'${id}',week:${week}`),`${id} must be scheduled in Week ${week}`);
}
const eventDefs=[...road.matchAll(/\{id:'road-[^']+',week:\d+,[^\n]+roadRace:true,openEntry:true/g)];
assert.equal(eventDefs.length,4,'exactly four open road marathons must be defined per season');
assert.match(road,/selectionEntryLimit=function\(e,d\)\{return e\?\.openEntry&&isRoad\(d\)\?9999/,'road events must remove the normal two/three-athlete entry cap');
assert.match(road,/NATIONAL POOL/,'open marathon entry UI must include National Pool athletes');
assert.match(road,/SELECT ALL AVAILABLE/,'open marathon entry UI must support selecting every available marathon athlete');
assert.match(road,/There is no programme entry cap/,'open-entry rule must be explained in the UI');

assert.match(road,/function engineRoad\(/,'marathon must have a dedicated road simulation engine');
assert.match(road,/CHECKPOINTS=\[0,5000,10000,15000,20000,21097\.5,25000,30000,35000,40000,42195\]/,'road engine must use meaningful split checkpoints through the full distance');
assert.match(road,/wallRisk/,'late-race wall risk must be part of marathon simulation');
assert.match(road,/conservative:/,'conservative pacing option must exist');
assert.match(road,/even:/,'even pacing option must exist');
assert.match(road,/aggressive:/,'aggressive pacing option must exist');
assert.match(road,/marathonRecoveryApplied/,'marathon recovery load must be idempotent');
assert.match(road,/marathonSeasonStarts/,'repeated marathon starts must be tracked across the season');

assert.match(road,/function roadVisualHTML\(/,'marathon must have a dedicated road-course live visual');
assert.match(road,/COURSE CAMERA/,'road visual must identify the current course section');
assert.match(road,/Riverside|Canal Roads/,'road visual data must include non-stadium course sections');
assert.match(road,/Bridge District|River Crossing/,'road visual data must include bridge sections');
assert.match(road,/Park Roads|Royal Parks/,'road visual data must include park sections');
assert.doesNotMatch(road,/<ellipse/,'marathon road visual must not reuse the endless oval-track presentation');
assert.match(road,/\+ \$\{fieldExtra\} IN THE FIELD/,'large fields must be represented without rendering every runner at once');
assert.match(road,/GAVIN POTTS • START/,'marathon must retain Gavin Potts as lead commentator');
assert.match(road,/Thirty-five kilometres and the damage is showing/,'commentary must recognise the marathon wall');
assert.match(road,/FINISH • 42\.195 KM/,'commentary must carry the race through the real finish distance');

assert.match(loader,/window\.addEventListener\('load',\(\)=>setTimeout\(loadMarathonRoad,0\)/,'road runtime must install after the remaining UI scripts');
assert.match(loader,/marathon-road-v1\.css\?v=20260915-marathon3/,'road stylesheet must be cache-busted and loaded');
assert.match(loader,/marathon-road-v1\.js\?v=20260915-marathon3/,'road runtime must be cache-busted and loaded');
assert.match(loader,/marathon-road-router-v1\.js\?v=20260915-marathon3/,'road router must be cache-busted and loaded');
assert.match(loader,/script\.onload=\(\)=>loadMarathonRoadRouter\(\)/,'road router must install immediately after road runtime');
assert.match(router,/const roadAwareDisciplineDraw=drawDisciplineScreen/,'router must capture road-aware discipline renderer');
assert.match(router,/drawCompetition=function\(\)/,'router must intercept competition routing');
assert.match(router,/return roadAwareDisciplineDraw\(e,live,discs\)/,'marathon competition routing must use the road renderer');
assert.match(router,/return previousCompetition\(\)/,'non-road competitions must keep the standard competition renderer');
assert.match(css,/\.road-live-layout/,'road broadcast layout styling must exist');
assert.match(css,/\.road-selection-dialog/,'open road selection styling must exist');

console.log('Marathon & Road Racing regression passed.');
