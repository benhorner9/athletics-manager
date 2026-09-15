import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const js=fs.readFileSync('scripts/commercial-contract-lifecycle-v1.js','utf8');
const dom=new JSDOM('<!doctype html><html><head></head><body><section id="finance"><div class="pe-card"><div class="pe-card-body"><div id="amCommercialMediaFinance"></div></div></div></section></body></html>',{url:'https://example.test/dev/',runScripts:'outside-only'});
const {window}=dom;

window.requestAnimationFrame=fn=>{fn();return 1};
window.cancelAnimationFrame=()=>{};
window.s={
 game:{season:1,week:12},
 funding:3200000,
 management:{sponsors:{1:{
  id:'podium',name:'Apex Performance',season:1,goal:'Earn three international podiums after signing.',
  upfront:900000,annualGuaranteed:900000,bonus:805000,annualBonus:805000,
  requiredMedia:3,athleteAccess:'selected',contractSeasons:2,contractStartSeason:1,
  contractEndSeason:2,contractYear:1,relationship:55
 }}},
 commercial:{relationships:{podium:55}}
};
window.managementState=()=>window.s.management;
window.onWeekStart=()=>true;
window.save=()=>true;
window.recordFinance=()=>true;
window.sender=()=>({});
window.newMail=()=>true;
window.AMProgrammeEconomy={state:()=>({commercial:{history:[]}})};
window.AMCommercialMediaPlanning={activateDeal:d=>d};
window.AMCommercialPartnership={state:()=>window.s.commercial,relationshipLabel:v=>v>=65?'Strong':v>=50?'Working':'Uneasy'};
window.AMCommercialNegotiationBridge={accessLabel:v=>v==='selected'?'Selected athlete access':'Manager / programme staff'};

window.eval(js);
const api=window.AMCommercialContractLifecycle;
assert.ok(api,'Commercial contract lifecycle did not boot');
api.decorate();
const first=window.document.getElementById('amCommercialContractTerms');
assert.ok(first,'Negotiated contract panel was not rendered');

for(let i=0;i<25;i++)api.decorate();
const afterRepeated=window.document.getElementById('amCommercialContractTerms');
assert.strictEqual(afterRepeated,first,'Repeated Finance decoration replaced an unchanged contract panel');

window.s.commercial.relationships.podium=70;
api.decorate();
const changed=window.document.getElementById('amCommercialContractTerms');
assert.notStrictEqual(changed,first,'A real contract/sponsor state change did not refresh the panel');
assert.match(changed.textContent,/Strong relationship/,'Updated sponsor relationship was not rendered');

for(let i=0;i<25;i++)api.decorate();
assert.strictEqual(window.document.getElementById('amCommercialContractTerms'),changed,'Finance panel became unstable again after a legitimate refresh');

dom.window.close();
console.log('Commercial finance render regression passed.');
