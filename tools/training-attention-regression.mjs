import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const dom=new JSDOM(`<!doctype html><body>
<nav id="railNav"><button data-view="training">Training</button></nav>
<div id="mobileNavDrawer"><button data-mobile-view="training">Training</button></div>
<section id="training">
 <div class="tr4-shell">
  <section class="tr4-head"><div class="tr4-metrics"><div class="tr4-metric"><small>Needs attention</small><strong>2</strong></div></div></section>
  <nav class="tr4-tabs"><button data-tr4-tab="overview" class="on">OVERVIEW</button><button data-tr4-tab="athletes">ATHLETES</button></nav>
  <div class="tr4-grid" id="defaultTrainingContent">Default Training content</div>
 </div>
</section>
</body>`,{url:'http://localhost/game.html',runScripts:'outside-only',pretendToBeVisual:true});

const w=dom.window;
w.requestAnimationFrame=fn=>{fn(Date.now());return 1};
w.cancelAnimationFrame=()=>{};
w.CSS=w.CSS||{};
w.CSS.escape=w.CSS.escape||function(value){return String(value).replace(/[^a-zA-Z0-9_-]/g,ch=>`\\${ch}`)};
w.currentView='training';
w.discLabel=disc=>disc==='M100'?'Men’s 100m':disc==='W100'?'Women’s 100m':disc;

let rows=[
 {a:{id:'a1',name:'Alex Test',disc:'M100',fatigue:84,trainingV2:{programme:'velocity',intensity:'High'}},label:'Critical load'},
 {a:{id:'a2',name:'Beth Test',disc:'W100',fatigue:76,trainingV2:{programme:'starts',intensity:'Standard'}},label:'High fatigue'}
];
let syncCalls=0;
w.AMTrainingSystem2={attentionRows:()=>rows,syncAttention:()=>{syncCalls++}};

w.eval(fs.readFileSync('scripts/training-attention-v4-authority.js','utf8'));
await new Promise(resolve=>setTimeout(resolve,0));

const authority=w.__athleticsTrainingAttentionDecisions;
assert.ok(authority,'Training attention authority was not exposed');
assert.equal(authority.version,5);
assert.equal(authority.queue().length,2,'authoritative queue should contain the same two athletes as Training V4');
assert.ok(syncCalls>0,'Training V4 navigation badge sync was not invoked');

let tab=w.document.querySelector('[data-am-tr4-attention-tab]');
assert.ok(tab,'Needs Attention tab was not created');
assert.equal(tab.querySelector('.am-tr4-attention-count')?.textContent,'2','tab count does not match the authoritative queue');
assert.equal(w.document.querySelector('.tr4-metric strong')?.textContent,'2','header count does not match the authoritative queue');

tab.click();
let cards=[...w.document.querySelectorAll('.am-tr4-attention-card')];
assert.equal(cards.length,2,'two counted attention items must render as two visible cards');
assert.match(cards[0].textContent,/Alex Test/);
assert.match(cards[1].textContent,/Beth Test/);
assert.equal(w.document.querySelectorAll('.tr4-tabs .on').length,1,'attention view must own the active Training tab state');
assert.ok(tab.classList.contains('on'),'Needs Attention tab was not marked active');

rows=[];
authority.refresh();
tab=w.document.querySelector('[data-am-tr4-attention-tab]');
cards=[...w.document.querySelectorAll('.am-tr4-attention-card')];
assert.equal(authority.queue().length,0);
assert.equal(cards.length,0,'cleared queue left stale attention cards behind');
assert.equal(tab.querySelector('.am-tr4-attention-count'),null,'cleared queue left a stale count badge behind');
assert.equal(w.document.querySelector('.tr4-metric strong')?.textContent,'0','header count did not clear with the queue');
assert.match(w.document.querySelector('.am-tr4-attention-empty')?.textContent||'',/Nothing needs attention/);

rows=[{a:{id:'a3',name:'Chris Test',disc:'M100',fatigue:40,trainingV2:{programme:'velocity',intensity:'Standard'}},label:'Adapted block'}];
authority.refresh();
assert.equal(authority.queue().length,1);
assert.equal(w.document.querySelector('[data-am-tr4-attention-tab] .am-tr4-attention-count')?.textContent,'1');
assert.equal(w.document.querySelectorAll('.am-tr4-attention-card').length,1,'resynced count must render exactly one actionable card');
assert.match(w.document.querySelector('.am-tr4-attention-card')?.textContent||'',/Chris Test/);

console.log('✓ Training Needs Attention count, tab and visible queue stay in lockstep.');
dom.window.close();
