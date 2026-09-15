import fs from 'node:fs';
import assert from 'node:assert/strict';

const bridge=fs.readFileSync('scripts/commercial-negotiation-bridge-v1.js','utf8');
const html=fs.readFileSync('game.html','utf8');
const economy=fs.readFileSync('scripts/programme-economy-v2.js','utf8');
const loader=fs.readFileSync('scripts/annual-career-refresh-v1.js','utf8');

assert.match(bridge,/AMProgrammeEconomy\.commercial\.offers\(\)/,'negotiation must use the live Programme Economy sponsor offers');
for(const id of ['community','podium','championship','prestige'])assert.match(bridge,new RegExp(`${id}:\\{name:`),`negotiation bridge must support ${id}`);
assert.match(bridge,/stage:'opening'/,'meeting must begin before any contract is signed');
assert.match(bridge,/m\.stage='discussion'/,'meeting must include a discussion stage');
assert.match(bridge,/m\.stage='final'/,'meeting must reach final terms before signing');
assert.match(bridge,/No contract or funding changes until you accept the final offer/,'meeting must explicitly protect against premature signing');
assert.match(bridge,/addEventListener\('click',intercept,true\)/,'finance sponsor click must be intercepted in capture phase');
assert.match(bridge,/stopImmediatePropagation\(\)/,'legacy instant-sign click handler must be blocked');
assert.match(bridge,/const handler=button\.onclick/,'final acceptance must capture the existing finance signing authority directly');
assert.match(bridge,/handler\.call\(button\)/,'final acceptance must invoke the finance signing authority without dispatching another click');
assert.doesNotMatch(bridge,/button\.click\(\)/,'final acceptance must never re-dispatch the intercepted sponsor click');
assert.match(bridge,/managementState\(\)\.sponsors\?\.\[season\(\)\]/,'bridge must verify the sponsor was actually recorded');
assert.match(bridge,/m\.status='signed'/,'successful acceptance must permanently close the negotiation as signed');
assert.match(bridge,/MEDIA COMMITMENT/,'negotiation must surface the contracted media requirement');
assert.match(bridge,/deal\.requiredMedia=Number\(offer\.mediaCommitment\)/,'accepted sponsor must persist its media obligation');
assert.match(bridge,/window\.signSponsor=id=>render\(id\)/,'legacy sponsor entry points must also open the meeting');
assert.match(economy,/data-commercial/,'Programme Economy sponsor buttons must remain available to the bridge');
assert.match(economy,/signCommercial\(offer\.id\)/,'regression documents the legacy direct-sign authority used by the bridge');
assert.match(html,/scripts\/programme-economy-v2\.js/,'Programme Economy runtime must load');
assert.match(html,/scripts\/commercial-partnership-v1\.js/,'Commercial Partnership runtime must load');
assert.match(html,/scripts\/annual-career-refresh-v1\.js/,'post-commercial runtime loader must load');
assert.ok(html.indexOf('scripts/annual-career-refresh-v1.js')>html.indexOf('scripts/commercial-partnership-v1.js'),'bridge loader must execute after Commercial Partnership');
assert.match(loader,/commercial-negotiation-bridge-v1\.js\?v=20260915-commercialbridge3/,'runtime must load the current sponsor negotiation bridge');
assert.match(loader,/loadCommercialNegotiationBridge\(\);/,'runtime must invoke the sponsor negotiation bridge loader');

console.log('Commercial negotiation bridge regression passed.');
