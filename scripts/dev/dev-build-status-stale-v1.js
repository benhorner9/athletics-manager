/* Athletics Manager — Dev pipeline stale-status guard V1
   Prevents a cancelled/abandoned CI run from leaving the development client
   displaying TESTING indefinitely. Dev-only; does not affect live clients. */
(function(){
'use strict';
if(window.__amDevBuildStatusStaleV1)return;
const isDev=/^dev\./i.test(location.hostname)||/(^|\/)dev(\/|$)/i.test(location.pathname);
if(!isDev)return;
window.__amDevBuildStatusStaleV1=1;

const MAX_RUNNING_AGE=45*60*1000;
let timer=0;
function age(value){const t=Date.parse(value||'');return Number.isFinite(t)?Date.now()-t:0}
function check(){
 const api=window.__athleticsDevBuildStatus,state=api?.state,p=state?.pipeline;
 if(!api||!p)return;
 if(!['running','deploying','passed'].includes(String(p.state||'')))return;
 if(age(p.updatedAt)<MAX_RUNNING_AGE)return;
 /* Keep the candidate SHA and run metadata for diagnosis, but make the state
    terminal so the player is never told an old CI run is still testing. */
 p.state='failed';
 p.stage=p.stage||'qa';
 p.label='Pipeline status expired; this candidate did not reach a terminal deployment state';
 p.stale=true;
 p.staleDetectedAt=new Date().toISOString();
 try{api.render?.()}catch(_){}
}
function boot(){
 check();
 timer=setInterval(check,5000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
