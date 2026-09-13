import fs from 'node:fs';
import assert from 'node:assert/strict';

const src=fs.readFileSync('scripts/programme-economy-v2.js','utf8');
assert(/const V=(?:3|4),UI=/.test(src),'Programme Economy state must retain the commercial/board migration contract');
for(const token of [
 'function commercialProgress(deal)',
 "id:'community'",
 "id:'podium'",
 "id:'championship'",
 "id:'prestige'",
 'settleSponsor=settleCommercial',
 'function createBoardIntervention',
 'function respondBoard(choice',
 'function ensureBoardMandate',
 'function settleBoardMandate',
 "data-board-choice=\"recovery\"",
 "data-board-choice=\"protect\"",
 "data-board-choice=\"support\"",
 "data-mandate-choice=\"accelerator\"",
 "'board','Board'",
 "tab:'board'"
]) assert(src.includes(token),`Missing commercial/board contract: ${token}`);
assert(src.includes("Guaranteed funding will not be clawed back"),'Commercial guarantees must not be clawed back');
assert(src.includes("boardControl(p,8,'performance'"),'Missed performance mandate must create temporary board controls');
assert(src.includes("boardControl(p,12,'imposed'"),'Ignored board intervention must impose controls');
assert(src.includes("commercialReputation"),'Commercial reputation must persist across seasons');
console.log('Programme commercial + board pressure contract: PASS');
