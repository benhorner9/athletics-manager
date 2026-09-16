import fs from 'node:fs';
import assert from 'node:assert/strict';

const road=fs.readFileSync('scripts/marathon-road-v1.js','utf8');
const broadcast=fs.readFileSync('scripts/marathon-road-broadcast-v2.js','utf8');
const router=fs.readFileSync('scripts/marathon-road-router-v1.js','utf8');
const loader=fs.readFileSync('scripts/keyboard-shortcuts-v1.js','utf8');
const summit=fs.readFileSync('scripts/summit-event-unified.js','utf8');
const css=fs.readFileSync('styles/marathon-road-v1.css','utf8');
const broadcastCss=fs.readFileSync('styles/marathon-road-broadcast-v2.css','utf8');

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

assert.match(summit,/Object\.keys\(DISCIPLINES\)\.filter\(d=>DISCIPLINES\[d\]\?\.road!==true&&DISCIPLINES\[d\]\?\.family!=='road'\)/,'Summit Series must exclude marathon and any future road disciplines');
assert.doesNotMatch(summit,/all=\(\)=>Object\.keys\(DISCIPLINES\),/,'Summit Series must never blindly include every global discipline');

assert.match(road,/function engineRoad\(/,'marathon must have a dedicated road simulation engine');
assert.match(road,/CHECKPOINTS=\[0,5000,10000,15000,20000,21097\.5,25000,30000,35000,40000,42195\]/,'road engine must use meaningful split checkpoints through the full distance');
assert.match(road,/wallRisk/,'late-race wall risk must be part of marathon simulation');
assert.match(road,/conservative:/,'conservative pacing option must exist');
assert.match(road,/even:/,'even pacing option must exist');
assert.match(road,/aggressive:/,'aggressive pacing option must exist');
assert.match(road,/marathonRecoveryApplied/,'marathon recovery load must be idempotent');
assert.match(road,/marathonSeasonStarts/,'repeated marathon starts must be tracked across the season');

assert.match(road,/function roadVisualHTML\(/,'marathon must retain a road-course fallback visual');
assert.match(road,/Riverside|Canal Roads/,'road visual data must include non-stadium course sections');
assert.match(road,/Bridge District|River Crossing/,'road visual data must include bridge sections');
assert.match(road,/Park Roads|Royal Parks/,'road visual data must include park sections');
assert.match(road,/GAVIN POTTS • START/,'marathon must retain Gavin Potts as lead commentator');
assert.match(road,/Thirty-five kilometres and the damage is showing/,'commentary must recognise the marathon wall');
assert.match(road,/FINISH • 42\.195 KM/,'commentary must carry the race through the real finish distance');

assert.match(broadcast,/window\.__amMarathonRoadBroadcastV2/,'animated road broadcast V2 guard must exist');
assert.match(broadcast,/function roadCenterY\(x\)/,'road broadcast must define a single road centre geometry');
assert.match(broadcast,/function roadHalfWidth\(x\)/,'road broadcast must define road width geometry');
assert.match(broadcast,/function roadBoundsAt\(x\)/,'runner placement must share the road geometry');
assert.match(broadcast,/lane=clampN\(laneSlot\*9\+\(managed\?2:0\),-30,30\)/,'runner lateral placement must be bounded');
assert.match(broadcast,/lane=clampN\(item\.lane,-bounds\.halfWidth\*\.55,bounds\.halfWidth\*\.55\)/,'animated runners must remain clamped inside the road');
assert.match(broadcast,/toMetres:2000/,'start sequence must animate through the opening 2,000m');
assert.match(broadcast,/return 15000/,'start sequence must retain meaningful motion time');
assert.match(broadcast,/return 9000/,'mid-race sections must retain meaningful motion time');
assert.match(broadcast,/return 14000/,'finish approach must retain meaningful motion time');
assert.match(broadcast,/requestAnimationFrame\(frame\)/,'runner progression must use frame-based motion');
assert.match(broadcast,/class="road-v2-body"/,'road athletes must use animated runner bodies instead of ranked dots');
assert.match(broadcast,/woodland/,'broadcast must support woodland course sections');
assert.match(broadcast,/waterside/,'broadcast must support riverside or waterside course sections');
assert.match(broadcast,/TOWN SECTION/,'broadcast must support town sections');
assert.match(broadcast,/BRIDGE SECTION/,'broadcast must support bridge sections');
assert.match(broadcast,/FINISH ZONE/,'broadcast must support a dedicated finish environment');
assert.match(broadcast,/window\.AMMarathonRoad=/,'road system must expose a stable public API for integrity checks');

assert.match(loader,/function loadLateRuntime\(\)\{loadMarathonRoad\(\);loadContractDecisionRouting\(\);loadSeasonEventIntegrity\(\)\}/,'late runtime loader must include Marathon and both recovery guards');
assert.match(loader,/window\.addEventListener\('load',\(\)=>setTimeout\(loadLateRuntime,0\),\{once:true\}\)/,'road runtime must install after the remaining UI scripts');
assert.match(loader,/marathon-road-v1\.css\?v=20260916-marathon4/,'road stylesheet must be cache-busted and loaded');
assert.match(loader,/marathon-road-v1\.js\?v=20260916-marathon4/,'road runtime must be cache-busted and loaded');
assert.match(loader,/marathon-road-router-v1\.js\?v=20260916-marathon4/,'road router must be cache-busted and loaded');
assert.match(loader,/marathon-road-broadcast-v2\.css\?v=20260916-marathon4/,'animated road broadcast stylesheet must load');
assert.match(loader,/marathon-road-broadcast-v2\.js\?v=20260916-marathon4/,'animated road broadcast runtime must load');
assert.match(loader,/script\.onload=\(\)=>loadMarathonRoadRouter\(\)/,'road router must install immediately after road runtime');
assert.match(loader,/script\.onload=\(\)=>loadMarathonRoadBroadcastV2\(\)/,'Broadcast V2 must install immediately after the road router');
assert.match(router,/const roadAwareDisciplineDraw=drawDisciplineScreen/,'router must capture road-aware discipline renderer');
assert.match(router,/drawCompetition=function\(\)/,'router must intercept competition routing');
assert.match(router,/return roadAwareDisciplineDraw\(e,live,discs\)/,'marathon competition routing must use the road renderer');
assert.match(router,/return previousCompetition\(\)/,'non-road competitions must keep the standard competition renderer');
assert.match(css,/\.road-live-layout/,'road broadcast layout styling must exist');
assert.match(css,/\.road-selection-dialog/,'open road selection styling must exist');
assert.match(broadcastCss,/\.road-v2-stage/,'animated road stage styling must exist');
assert.match(broadcastCss,/@keyframes roadV2LegA/,'runner leg-cycle animation must exist');
assert.match(broadcastCss,/@keyframes roadV2ArmA/,'runner arm-cycle animation must exist');
assert.match(broadcastCss,/@keyframes roadV2Markings/,'road markings must provide motion cues');
assert.match(broadcastCss,/roadV2FarPan/,'background scenery must use subtle parallax');
assert.match(broadcastCss,/roadV2NearPan/,'foreground scenery must use subtle parallax');
assert.match(broadcastCss,/@media \(prefers-reduced-motion:reduce\)/,'road broadcast must respect reduced-motion preferences');

console.log('Marathon & Road Racing regression passed.');