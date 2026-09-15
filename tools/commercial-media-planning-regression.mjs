import fs from 'node:fs';
import assert from 'node:assert/strict';

const media=fs.readFileSync('scripts/commercial-media-planning-v1.js','utf8');
const bridge=fs.readFileSync('scripts/commercial-negotiation-bridge-v1.js','utf8');
const loader=fs.readFileSync('scripts/annual-career-refresh-v1.js','utf8');
const calendar=fs.readFileSync('scripts/calendar-v2.js','utf8');
const commercial=fs.readFileSync('scripts/commercial-partnership-v1.js','utf8');
const lifecycle=fs.readFileSync('scripts/commercial-contract-lifecycle-v1.js','utf8');

for(const [id,count] of Object.entries({community:2,podium:3,championship:4,prestige:5})){
 assert.match(bridge,new RegExp(`${id}:${count}`),`${id} must expose a ${count}-appearance starting position`);
}
assert.match(bridge,/media:Math\.max\(p\.minMedia/,'negotiation must keep media commitments inside sponsor-specific bounds');
assert.match(bridge,/id:'lessMedia'/,'manager must be able to reduce media workload through negotiation');
assert.match(bridge,/deal\.requiredMedia=Number\(t\.media\)/,'signed deal must use the negotiated media requirement');
assert.match(bridge,/deal\.athleteAccess=t\.access/,'signed deal must carry negotiated athlete access into activations');
assert.match(media,/function createEvent\(w,type\)/,'player must be able to create a media event');
assert.match(media,/playerScheduled:true/,'media events must be marked as player scheduled');
assert.doesNotMatch(media,/chooseWeeks\(/,'new planning runtime must not auto-pick sponsor weeks');
assert.match(media,/function rescheduleEvent\(id,w,type\)/,'future media appearances must be reschedulable');
assert.match(media,/function cancelEvent\(id\)/,'future planned appearances must be cancellable before they become due');
assert.match(media,/data-cmp-plan/,'Finance and Calendar must expose a planning action');
assert.match(media,/amCommercialMediaCalendar/,'Calendar must receive a sponsor media planning panel');
assert.match(media,/activityWarnings/,'planner must warn about existing programme activity in the selected week');
assert.match(media,/data-commercial-media-open/,'scheduled appearances must hand off to the existing interactive media event engine');
assert.match(commercial,/function mediaChoice\(ev,choice\)/,'interactive media attendance engine must remain available');
assert.match(calendar,/AMCommercialPartnership\?\.eventsForWeek/,'Calendar must continue reading commercial media events');
assert.match(media,/if\(d&&missing>0\)d\.bonus=0/,'unfulfilled media commitments must block the sponsor performance payment at settlement');
assert.match(media,/commercial\.reputation=Math\.max/,'missing contracted appearances must affect future commercial reputation');
assert.match(lifecycle,/mediaCompleted:0,mediaMissed:0/,'a new contract year must reset annual media completion counters');
assert.match(lifecycle,/You have \$\{d\.requiredMedia\} media\/community commitments to schedule this season/,'multi-season rollover must clearly create a fresh annual media obligation');
assert.match(loader,/commercial-media-planning-v1\.js\?v=20260915-mediaplanning1/,'runtime loader must load media planning');
assert.match(loader,/commercial-negotiation-bridge-v1\.js\?v=20260915-commercialbridge4/,'updated sponsor negotiation must be cache-busted');
assert.match(loader,/commercial-contract-lifecycle-v1\.js\?v=20260915-contractlife1/,'contract lifecycle must be cache-busted');

console.log('Commercial media planning regression passed.');
