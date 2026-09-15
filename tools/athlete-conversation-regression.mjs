import fs from 'node:fs';
import assert from 'node:assert/strict';
const js=fs.readFileSync('scripts/athlete-conversation-v1.js','utf8');
const html=fs.readFileSync('game.html','utf8');
const immersion=fs.readFileSync('scripts/selection-immersion-v1.js','utf8');
// Conversation depth is a shipping contract: email -> modal -> reply -> athlete response -> follow-up -> persistent outcome.
assert.match(html,/styles\/athlete-conversation-v1\.css/,'conversation stylesheet must be loaded');
assert.match(html,/scripts\/athlete-conversation-v1\.js/,'conversation runtime must be loaded');
assert.match(js,/selectionConversation=function\(a,context=\{\}\)/,'conversation system must own future athlete selection conversations');
assert.match(js,/data-athlete-conversation-open/,'emails must open the conversation overlay');
assert.match(js,/stage:'opening'/,'conversation must begin with a persisted opening stage');
assert.match(js,/stage='followup'/,'conversation must include a second manager response');
assert.match(js,/st\.trust=clamp/,'conversation outcomes must persist relationship trust');
assert.match(js,/ss\.morale=clamp/,'conversation outcomes must persist selection morale');
assert.match(js,/leagueCommitted\(a,c\.eventWeek\)/,'conversation context must understand Summit commitments');
assert.match(js,/changeAthleteTrait\(a,'overlooked',false/,'credible conversations must be able to resolve Feeling Overlooked');
assert.match(immersion,/selectionConversation\(a,\{type:'selection',eventId:e\.id,eventName:e\.name,eventWeek:e\.week,disc:d,source:'selection-immersion'\}\)/,'Selection Immersion reactions must route into the conversation system');
console.log('Athlete conversation regression passed.');
