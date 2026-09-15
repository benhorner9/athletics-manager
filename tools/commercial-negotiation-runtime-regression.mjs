import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const bridge=fs.readFileSync('scripts/commercial-negotiation-bridge-v1.js','utf8');
const lifecycle=fs.readFileSync('scripts/commercial-contract-lifecycle-v1.js','utf8');

const dom=new JSDOM('<!doctype html><html><body><section id="finance"><button id="offer" data-commercial="community">REVIEW & SIGN</button><div id="amCommercialMediaFinance"></div></section></body></html>',{url:'https://example.test/dev/',runScripts:'outside-only'});
const {window}=dom;
window.requestAnimationFrame=fn=>{fn();return 1};
window.cancelAnimationFrame=()=>{};
window.HTMLDialogElement.prototype.showModal=function(){this.open=true};
window.HTMLDialogElement.prototype.close=function(){this.open=false};
window.s={game:{season:1,week:6},funding:0,commercial:{relationships:{community:55},mediaEvents:[]},commercialNegotiations:null,emails:[]};
window.managementState=()=>{window.s.management??={sponsors:{}};window.s.management.sponsors??={};return window.s.management};
window.save=()=>true;
window.sender=()=>({name:'Board'});
window.newMail=(_from,subject,body,type)=>{const id=`mail-${window.s.emails.length+1}`;window.s.emails.push({id,subject,body,type});return id};
window.recordFinance=(amount,label,category)=>{window.s.ledger??=[];window.s.ledger.push({amount,label,category})};
window.AMCommercialPartnership={state:()=>window.s.commercial,relationshipLabel:v=>v>=65?'Strong':v>=50?'Working':'Uneasy'};
const baseOffer={id:'community',name:'Stride Community Sport',structure:'guaranteed',risk:'LOW',upfront:520000,bonus:0,goal:'Guaranteed programme support with no results target.',eligible:true};
window.AMProgrammeEconomy={
 commercial:{offers:()=>[{...baseOffer}]},
 state:()=>{window.s.programme??={commercial:{reputation:50,history:[]}};return window.s.programme},
 renderFinance:()=>{}
};
let activations=0;
window.AMCommercialMediaPlanning={activateDeal:deal=>{activations++;return deal}};
const button=window.document.getElementById('offer');
button.onclick=()=>{
 const m=window.managementState();
 if(m.sponsors[window.s.game.season])return false;
 m.sponsors[window.s.game.season]={...baseOffer,modelVersion:2,season:window.s.game.season,signedWeek:window.s.game.week,podiums:0,wins:0,championshipMedals:0,internationalStarts:0,seen:{},commercialSeen:{},settled:false};
 window.s.funding+=baseOffer.upfront;
 window.recordFinance(baseOffer.upfront,`${baseOffer.name} commercial partnership`,'Sponsorship');
 window.AMProgrammeEconomy.state().commercial.history.push({season:1,week:6,partner:baseOffer.name,type:'signed',guaranteed:baseOffer.upfront,potential:baseOffer.bonus});
 return true;
};

window.eval(bridge);
assert.equal(window.AMCommercialNegotiationBridge.version,2,'V2 sponsor negotiation bridge did not boot');
assert.equal(window.AMCommercialNegotiationBridge.openMeeting('community'),true,'Sponsor meeting did not open');
let meeting=window.AMCommercialNegotiationBridge.meetingFor('community');
assert.equal(meeting.stage,'opening');
window.document.querySelector('[data-cnb-choice="priorities"]').click();
meeting=window.AMCommercialNegotiationBridge.meetingFor('community');
assert.equal(meeting.stage,'terms');
const startingGuarantee=meeting.terms.guaranteed;
window.document.querySelector('[data-cnb-choice="moreGuarantee"]').click();
meeting=window.AMCommercialNegotiationBridge.meetingFor('community');
assert.ok(meeting.terms.guaranteed>startingGuarantee,'Negotiating guaranteed funding did not change the money');
assert.equal(meeting.terms.media,3,'Higher guarantee should trade against an extra appearance');
window.document.querySelector('[data-cnb-choice="longerTerm"]').click();
meeting=window.AMCommercialNegotiationBridge.meetingFor('community');
assert.equal(meeting.stage,'final','Second negotiation move must reach final terms');
assert.equal(meeting.terms.seasons,2,'Two-season negotiation was not preserved');
const negotiatedGuarantee=meeting.terms.guaranteed;
window.document.querySelector('[data-cnb-choice="sign"]').click();
meeting=window.AMCommercialNegotiationBridge.meetingFor('community');
const yearOne=window.managementState().sponsors[1];
assert.equal(meeting.status,'signed','Meeting did not close as signed');
assert.equal(yearOne.upfront,negotiatedGuarantee,'Signed deal did not use negotiated guaranteed funding');
assert.equal(yearOne.requiredMedia,3,'Signed deal did not use negotiated media workload');
assert.equal(yearOne.contractSeasons,2,'Signed deal did not persist two-season term');
assert.equal(yearOne.athleteAccess,'selected','Signed deal did not persist athlete access');
assert.equal(window.s.funding,negotiatedGuarantee,'Funding reconciliation did not leave exactly the negotiated guarantee');
assert.equal(activations,1,'Signed contract should activate media planning once');

window.onWeekStart=()=>true;
window.eval(lifecycle);
window.s.game.season=2;
window.s.game.week=1;
const beforeRollover=window.s.funding;
const yearTwo=window.AMCommercialContractLifecycle.sync();
assert.ok(yearTwo,'Two-season sponsor did not roll into year two');
assert.equal(yearTwo.season,2);
assert.equal(yearTwo.contractYear,2);
assert.equal(yearTwo.settled,false);
assert.equal(yearTwo.podiums,0);
assert.equal(yearTwo.wins,0);
assert.equal(yearTwo.championshipMedals,0);
assert.equal(yearTwo.requiredMedia,3);
assert.equal(window.s.funding,beforeRollover+negotiatedGuarantee,'Year-two annual guarantee was not released exactly once');
assert.equal(activations,2,'Year two should create a fresh media activation plan');
const afterFirstSync=window.s.funding;
window.AMCommercialContractLifecycle.sync();
assert.equal(window.s.funding,afterFirstSync,'Repeated lifecycle sync must not duplicate annual sponsor funding');
assert.equal(window.managementState().sponsors[2],yearTwo,'Repeated lifecycle sync must reuse the same year-two deal');

console.log('Commercial negotiation runtime regression passed.');
