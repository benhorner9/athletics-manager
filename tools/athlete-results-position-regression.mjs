import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('scripts/squad-athlete-v2.js','utf8');
assert.ok(source.includes('function ordinal(n)'),'ordinal finishing-position formatter missing');
assert.ok(source.includes('function resultEventArchive()'),'saved event result archive lookup missing');
assert.ok(source.includes('function resultPlace(a,p)'),'athlete finishing-position resolver missing');
assert.ok(source.includes('<th>Meeting</th><th>Finish</th><th>Performance</th>'),'Results & Form does not expose Finish column');
assert.ok(source.includes('p.place?esc(ordinal(p.place))'),'Results & Form does not render the resolved finishing position');
assert.ok(source.includes("eventName.includes(' — ')"),'round or stage marks are not protected from being treated as event finishes');
console.log('Athlete Results & Form finishing-position regression: PASS');
