/* Athletics Manager — Career Identity long-career performance guard V1
   Keeps Career Identity V2 behaviour intact while preventing annual retirement
   batches from re-running the full history synchronisation once per retiree. */
(function(){
'use strict';
if(window.__amCareerIdentityPerformanceV1)return;
window.__amCareerIdentityPerformanceV1=1;

const VERSION=1;
let installed=false;
let seasonBatchDepth=0;
let deferredIdentitySync=false;

function ci(){return window.AMCareerIdentityV2}
function unwrapCareerIdentity(fn){return typeof fn==='function'&&fn.__careerIdentityV2&&typeof fn.__careerIdentityOriginal==='function'?fn.__careerIdentityOriginal:fn}
function assignGlobal(name,fn){window[name]=fn;try{globalThis[name]=fn}catch(_){}try{eval(`${name}=fn`)}catch(_){}}
function requestSync(){
 if(seasonBatchDepth>0){deferredIdentitySync=true;return}
 try{ci()?.sync?.()}catch(err){console.warn('Career Identity annual sync recovery',err)}
}
function beginSeasonBatch(){seasonBatchDepth++;return()=>{seasonBatchDepth=Math.max(0,seasonBatchDepth-1);if(seasonBatchDepth===0&&deferredIdentitySync){deferredIdentitySync=false;requestSync()}}}

function install(){
 if(installed)return true;
 const api=ci();
 if(!api||typeof window.endSeason!=='function'||typeof window.retireAthlete!=='function'||typeof window.recordCareerSeason!=='function')return false;

 const currentEndSeason=window.endSeason;
 if(currentEndSeason.__amCareerIdentityPerformanceV1){installed=true;return true}

 /* annualRetirements can be invoked directly by QA/dev helpers as well as by
    endSeason. Collapse its per-athlete Career Identity hook into one sync. */
 if(typeof window.annualRetirements==='function'&&!window.annualRetirements.__amCareerIdentityPerformanceV1){
  const baseAnnual=window.annualRetirements;
  const annualWrapped=function(...args){
   const finish=beginSeasonBatch();
   const currentRetire=window.retireAthlete;
   const baseRetire=unwrapCareerIdentity(currentRetire);
   try{
    if(baseRetire!==currentRetire)assignGlobal('retireAthlete',baseRetire);
    return baseAnnual.apply(this,args);
   }finally{
    if(baseRetire!==currentRetire)assignGlobal('retireAthlete',currentRetire);
    deferredIdentitySync=true;
    finish();
   }
  };
  annualWrapped.__amCareerIdentityPerformanceV1=true;
  annualWrapped.__careerIdentityPerformanceOriginal=baseAnnual;
  assignGlobal('annualRetirements',annualWrapped);
 }

 const endWrapped=function(...args){
  const finish=beginSeasonBatch();
  const currentRetire=window.retireAthlete;
  const currentRecord=window.recordCareerSeason;
  const baseRetire=unwrapCareerIdentity(currentRetire);
  const baseRecord=unwrapCareerIdentity(currentRecord);
  try{
   /* endSeason may retire dozens of athletes. The V2 retire hook calls syncAll,
      so using it inside the loop turns long careers into quadratic work. The
      underlying retirement logic remains authoritative; one V2 sync runs after
      the whole annual transaction and records every retirement together. */
   if(baseRetire!==currentRetire)assignGlobal('retireAthlete',baseRetire);
   if(baseRecord!==currentRecord)assignGlobal('recordCareerSeason',baseRecord);
   return currentEndSeason.apply(this,args);
  }finally{
   if(baseRetire!==currentRetire)assignGlobal('retireAthlete',currentRetire);
   if(baseRecord!==currentRecord)assignGlobal('recordCareerSeason',currentRecord);
   deferredIdentitySync=true;
   finish();
  }
 };
 endWrapped.__amCareerIdentityPerformanceV1=true;
 endWrapped.__careerIdentityPerformanceOriginal=currentEndSeason;
 assignGlobal('endSeason',endWrapped);
 installed=true;
 return true;
}

function boot(){
 if(install())return;
 let tries=0;
 const timer=setInterval(()=>{tries++;if(install()||tries>=200)clearInterval(timer)},25);
}

window.AMCareerIdentityPerformanceV1={version:VERSION,install,metrics:()=>({installed,seasonBatchDepth,deferredIdentitySync})};
boot();
})();
