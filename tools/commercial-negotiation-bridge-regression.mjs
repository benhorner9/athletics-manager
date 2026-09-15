import fs from 'node:fs';
import assert from 'node:assert/strict';

const bridge=fs.readFileSync('scripts/commercial-negotiation-bridge-v1.js','utf8');
const html=fs.readFileSync('game.html','utf8');
const economy=fs.readFileSync('scripts/programme-economy-v2.js','utf8');

assert.match(bridge,/AMProgrammeEconomy\.commercial\.offers\(\)/,'negotiation must use the live Programme Economy sponsor offers');
for(const id of ['community','podium','championship','prestige'])assert.match(bridge,new RegExp(`${id}:\\{name:`),`negotiation bridge must support ${id}`);
assert.match(bridge,/stage:'opening'/,'meeting must begin before any contract is signed');
assert.match(bridge,/m\.stage='discussion'/,'meeting must include a discussion stage');
assert.match(bridge,/m\.stage='final'/,'meeting must reach final terms before signing');
assert.match(bridge,/No contract or funding changes until you accept the final offer/,'meeting must explicitly protect against premature signing');
assert.match(bridge,/addEventListener\('click',intercept,true\)/,'finance sponsor click must be intercepted in capture phase');
assert.match(bridge,/stopImmediatePropagation\(\)/,'legacy instant-sign click handler must be blocked');
assert.match(bridge,/amCommercialCommit='1'/,'only the bridge commit path may release the original finance action');
assert.match(bridge,/button\.click\(\)/,'final acceptance must hand off to the existing finance signing authority');
assert.match(bridge,/managementState\(\)\.sponsors\?\.\[season\(\)\]/,'bridge must verify the sponsor was actually recorded');
assert.match(bridge,/window\.signSponsor=id=>render\(id\)/,'legacy sponsor entry points must also open the meeting');
assert.match(economy,/data-commercial/,'Programme Economy sponsor buttons must remain available to the bridge');
assert.match(economy,/signCommercial\(offer\.id\)/,'regression documents the legacy direct-sign path that the bridge must intercept');
assert.match(html,/scripts\/commercial-partnership-v1\.js/,'commercial partnership runtime must load');
assert.match(html,/scripts\/commercial-negotiation-bridge-v1\.js/,'commercial negotiation bridge must load');
assert.ok(html.indexOf('scripts/commercial-negotiation-bridge-v1.js')>html.indexOf('scripts/programme-economy-v2.js'),'negotiation bridge must load after Programme Economy');
assert.ok(html.indexOf('scripts/commercial-negotiation-bridge-v1.js')>html.indexOf('scripts/commercial-partnership-v1.js'),'negotiation bridge must load after Commercial Partnership');

console.log('Commercial negotiation bridge regression passed.');
