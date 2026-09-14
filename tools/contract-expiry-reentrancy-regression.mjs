import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<div id="finance"></div>',{url:'http://localhost/game.html',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.requestAnimationFrame=fn=>{fn(Date.now());return 1};
w.queueMicrotask=fn=>fn();
w.currentView='finance';
w.s={game:{week:10,careerWeek:10,season:2029},managedNation:'GREAT BRITAIN',athletes:[{id:'a1',name:'Alex Test',nation:'GREAT BRITAIN',inSquad:true,retired:false}],emails:[]};
w.careerNow=()=>w.s.game.careerWeek;
w.managedNation=()=>w.s.managedNation;
w.sender=()=> 'Performance Director';
w.save=()=>true;
w.render=()=>{};
w.rememberAthlete=()=>{};
w.toast=()=>{};
const programme={athleteContracts:{a1:{id:'contract-a1',athleteId:'a1',state:'active',status:'Elite',endCareerWeek:12}}};
w.AMProgrammeEconomy={state:()=>programme,decisionActions:()=>[],renderFinance:()=>{}};
let mailSeq=0;
w.newMail=(from,subject,body,type)=>{
 const id='mail-'+(++mailSeq);
 w.s.emails.push({id,sender:from,subject,body,type,unread:true});
 // Production newMail refreshes the inbox badge synchronously. The badge asks the
 // decision core for unresolved actions, which re-enters contract decision discovery.
 w.AMProgrammeEconomy.decisionActions();
 return id;
};

w.eval(fs.readFileSync('scripts/athlete-contract-expiry-gate-v1.js','utf8'));
await new Promise(resolve=>setTimeout(resolve,0));

const actions=w.AMProgrammeEconomy.decisionActions();
assert.equal(actions.length,1,'one expiring athlete contract should create one blocking action');
assert.equal(w.s.emails.length,1,'re-entrant inbox refresh created duplicate contract emails');
assert.equal(w.s.emails[0].type,'contract');
assert.match(w.s.emails[0].subject,/URGENT/i);
assert.equal(w.s.emails[0].programmeAction?.actionId,'economy:athlete-expiry:contract-a1');

for(let i=0;i<25;i++)w.AMProgrammeEconomy.decisionActions();
assert.equal(w.s.emails.length,1,'repeated action discovery created additional contract emails');

console.log('✓ Contract expiry action discovery remains one action / one email under synchronous inbox re-entry.');
dom.window.close();
