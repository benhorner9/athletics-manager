import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

let failures=0;
async function test(name,fn){
  try{await fn();console.log('PASS',name)}
  catch(err){failures++;console.error('FAIL',name,err?.stack||err)}
}
function baseState(){
  return {
    game:{week:5,careerWeek:5,cycleYear:1,season:2027},
    managedNation:'GREAT BRITAIN',funding:1000000,
    athletes:[],events:[],emails:[],news:[]
  };
}
function fixture(state=baseState()){
  const dom=new JSDOM('<button id="advanceTop">ADVANCE WEEK</button><nav id="railNav"><button data-view="inbox"></button></nav><nav id="bottomNav"><button data-view="inbox"></button></nav><div id="home"></div><div id="inbox"></div><div id="training"></div>',{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  const frames=[];
  w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length};
  w.cancelAnimationFrame=()=>{};
  w.matchMedia=()=>({matches:false});
  w.CSS={escape:String};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.eval(`
    var s=${JSON.stringify(state)},currentView='other',openMail=null,advanced=0,routes=[],selectionOpened=null;
    var drawHome=()=>{},drawInbox=()=>{},render=()=>{},save=()=>true,pruneOldEmails=()=>0,syncMailBadge=()=>{};
    var appointmentPending=()=>false,currentBlocking=()=>null,careerState=()=>({finished:false,pendingReview:false});
    var summitSeasonState=()=>null,SUMMIT_WEEKS=[];
    var advanceWeek=()=>{advanced++;return true};
    var view=name=>{routes.push(name);currentView=name};
    var openCompetitionSelectionCentre=id=>{selectionOpened=id};
    var managedTeam=()=>s.athletes.filter(a=>!a.retired&&a.inSquad!==false),nationalPool=()=>[],nextEvent=()=>s.events.find(e=>!e.completed)||null;
    var money=n=>'£'+Math.round(Number(n)||0).toLocaleString('en-GB'),managedNation=()=>s.managedNation,nationName=n=>n,mailCategory=m=>m.type||'information';
  `);
  const load=name=>w.eval(fs.readFileSync(`scripts/${name}.js`,'utf8'));
  const flushFrames=()=>{while(frames.length){const batch=frames.splice(0);for(const fn of batch)fn()}};
  return{dom,w,load,frames,flushFrames};
}

await test('Home training agenda opens the actual Needs Attention queue',()=>{
  const f=fixture();
  try{
    let opened=0;
    f.w.__athleticsInboxDecisionCore={getUnresolvedActions:()=>[],getProgressionBlockers:()=>[]};
    f.w.__athleticsTrainingAttentionDecisions={queue:()=>[{a:{id:'ath-1',name:'Test Athlete'},issue:{label:'Training review'}}],open:()=>{opened++}};
    f.load('home-v2');
    f.w.__athleticsHomeV2.render();
    const row=f.w.document.querySelector('[data-agenda-kind="training"]');
    assert.ok(row,'training attention is counted but has no actionable Home agenda row');
    row.click();
    assert.equal(f.w.currentView,'training','Home attention row does not route to Training');
    assert.equal(opened,0,'attention queue should open after Training has rendered');
    f.flushFrames();
    assert.equal(opened,1,'Home lands on Training but leaves the player to find the hidden attention list');
  }finally{f.dom.window.close()}
});

await test('A current competition cannot become an invisible selection blocker',()=>{
  const state=baseState();
  state.events=[{id:'meet-1',name:'Spring Grand Prix',kind:'competition',week:5,disc:['M100'],decision:false,completed:false,entries:{M100:[]}}];
  const f=fixture(state);
  try{
    f.load('inbox-decision-core-v1');
    const core=f.w.__athleticsInboxDecisionCore;
    const blockers=core.getProgressionBlockers();
    assert.equal(blockers.length,1,'current unresolved selection is not a progression blocker when its email is missing');
    assert.equal(blockers[0].entityId,'meet-1');
    core.openAction(blockers[0]);
    assert.equal(f.w.selectionOpened,'meet-1','missing-email blocker cannot route directly to its selection decision');

    f.w.__athleticsTrainingAttentionDecisions={queue:()=>[]};
    f.load('home-v2');
    f.w.__athleticsHomeV2.render();
    assert.equal(f.w.document.querySelectorAll('[data-home-v2-action]').length,1,'Home action count has no matching visible action');
    assert.match(f.w.document.querySelector('.home-v2-actions')?.textContent||'',/PROGRESSION BLOCKED/i,'Home does not explain why Advance Week is blocked');
    f.w.selectionOpened=null;
    f.w.document.querySelector('[data-home-v2-action]').click();
    assert.equal(f.w.selectionOpened,'meet-1','Home blocker does not lead to the decision that resolves it');

    assert.equal(f.w.advanceWeek(),false,'Advance Week bypasses a visible progression blocker');
    assert.equal(f.w.advanced,0,'blocked Advance Week changed career time');
    assert.ok(f.w.document.getElementById('amProgressionGate')?.open,'blocked Advance Week does not show the player what must be resolved');

    state.events[0].decision=true;
    f.w.s.events[0].decision=true;
    assert.equal(core.getProgressionBlockers().length,0,'resolved selection remains a stale blocker');
    assert.equal(f.w.advanceWeek(),true,'career does not resume after the blocker is resolved');
    assert.equal(f.w.advanced,1);
  }finally{f.dom.window.close()}
});

await test('Selection blockers survive a save/reload boundary without relying on email state',()=>{
  const state=baseState();
  state.events=[{id:'meet-reload',name:'National Championships',kind:'championship',week:5,disc:['W100'],decision:false,completed:false,entries:{W100:[]}}];
  const first=fixture(state);
  let saved;
  try{
    first.load('inbox-decision-core-v1');
    assert.equal(first.w.__athleticsInboxDecisionCore.getProgressionBlockers().length,1);
    saved=JSON.parse(JSON.stringify(first.w.s));
  }finally{first.dom.window.close()}
  const second=fixture(saved);
  try{
    second.load('inbox-decision-core-v1');
    const blockers=second.w.__athleticsInboxDecisionCore.getProgressionBlockers();
    assert.equal(blockers.length,1,'reload silently clears an unresolved competition decision');
    assert.equal(blockers[0].entityId,'meet-reload');
    second.w.__athleticsInboxDecisionCore.openAction(blockers[0]);
    assert.equal(second.w.selectionOpened,'meet-reload','reloaded blocker no longer routes to its resolution');
  }finally{second.dom.window.close()}
});

if(failures){
  console.error(`\nCore career flow regression failed: ${failures} check${failures===1?'':'s'}`);
  process.exit(1);
}
console.log('\nCore career flow regression passed');
