import fs from 'node:fs';
import assert from 'node:assert/strict';

const media=fs.readFileSync('scripts/commercial-media-planning-v1.js','utf8');
const bridge=fs.readFileSync('scripts/commercial-negotiation-bridge-v1.js','utf8');
const loader=fs.readFileSync('scripts/annual-career-refresh-v1.js','utf8');
const calendar=fs.readFileSync('scripts/calendar-v2.js','utf8');
const commercial=fs.readFileSync('scripts/commercial-partnership-v1.js','utf8');

for(const [id,count] of Object.entries({community:2,podium:3,championship:4,prestige:5})){
 assert.match(media,new RegExp(`${id}:\\{count:${count}`),`${id} must define ${count} contracted media appearances`);
}
assert.match(bridge,/mediaCommitment:Number\(MEDIA\[o\.id\]\?\.count\|\|2\)/,'negotiation must expose the sponsor media requirement');
assert.match(bridge,/You would control when those are placed into the calendar/,'negotiation must explicitly give calendar control to the manager');
assert.match(bridge,/MEDIA COMMITMENT/,'meeting UI must show the contracted media commitment');
assert.match(bridge,/deal\.requiredMedia=Number\(offer\.mediaCommitment\)/,'signed deal must persist its media requirement');
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
assert.match(loader,/commercial-media-planning-v1\.js\?v=20260915-mediaplanning1/,'runtime loader must load media planning');
assert.match(loader,/commercial-negotiation-bridge-v1\.js\?v=20260915-commercialbridge3/,'updated sponsor negotiation must be cache-busted');

console.log('Commercial media planning regression passed.');
