/* Athletics Manager — Keyboard Shortcuts V1 */
(function(){
'use strict';
if(window.__amKeyboardShortcutsV1)return;
window.__amKeyboardShortcutsV1=1;

function isInteractiveTarget(target){
 if(!(target instanceof Element))return false;
 return !!target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="button"], [role="textbox"], [role="combobox"]');
}

function hasBlockingOverlay(){
 if(document.querySelector('dialog[open]'))return true;
 const nation=document.getElementById('nationModal');
 if(nation && !nation.classList.contains('hidden'))return true;
 const startup=document.getElementById('startup');
 if(startup && !startup.classList.contains('hidden') && getComputedStyle(startup).display!=='none')return true;
 return false;
}

function advanceButton(){
 const button=document.getElementById('advanceTop');
 if(!button || button.disabled || button.getAttribute('aria-disabled')==='true')return null;
 if(button.offsetParent===null)return null;
 return button;
}

function onKeyDown(event){
 if(event.code!=='Space' && event.key!==' ')return;
 if(event.repeat || event.defaultPrevented)return;
 if(event.ctrlKey || event.metaKey || event.altKey)return;
 if(isInteractiveTarget(event.target))return;
 if(hasBlockingOverlay())return;
 const button=advanceButton();
 if(!button)return;
 event.preventDefault();
 button.click();
}

function reassertSeasonIntegrity(){try{window.AMSeasonEventIntegrity?.reinstall?.()}catch(err){console.warn('Season event integrity reinstall failed',err)}}
function loadMarathonRoadBroadcastV2(){
 if(typeof document==='undefined')return;
 if(!document.querySelector('link[data-am-marathon-road-broadcast-v2-style]')){
  const style=document.createElement('link');style.rel='stylesheet';style.href='styles/marathon-road-broadcast-v2.css?v=20260916-marathon4';style.dataset.amMarathonRoadBroadcastV2Style='1';document.head.appendChild(style);
 }
 if(window.__amMarathonRoadBroadcastV2){reassertSeasonIntegrity();return}
 if(document.querySelector('script[data-am-marathon-road-broadcast-v2]'))return;
 const script=document.createElement('script');script.src='scripts/marathon-road-broadcast-v2.js?v=20260916-marathon4';script.dataset.amMarathonRoadBroadcastV2='1';script.onerror=()=>console.warn('Marathon road broadcast V2 failed to load');script.onload=()=>reassertSeasonIntegrity();document.body.appendChild(script);
}
function loadMarathonRoadRouter(){
 if(typeof document==='undefined')return;
 if(window.__amMarathonRoadRouterV1){loadMarathonRoadBroadcastV2();return}
 if(document.querySelector('script[data-am-marathon-road-router]'))return;
 const script=document.createElement('script');script.src='scripts/marathon-road-router-v1.js?v=20260916-marathon4';script.dataset.amMarathonRoadRouter='1';script.onerror=()=>console.warn('Marathon road router failed to load');script.onload=()=>loadMarathonRoadBroadcastV2();document.body.appendChild(script);
}
function loadMarathonRoad(){
 if(typeof document==='undefined')return;
 if(!document.querySelector('link[data-am-marathon-road-style]')){
  const style=document.createElement('link');style.rel='stylesheet';style.href='styles/marathon-road-v1.css?v=20260916-marathon4';style.dataset.amMarathonRoadStyle='1';document.head.appendChild(style);
 }
 if(window.__amMarathonRoadV1){loadMarathonRoadRouter();return}
 if(document.querySelector('script[data-am-marathon-road]'))return;
 const script=document.createElement('script');script.src='scripts/marathon-road-v1.js?v=20260916-marathon4';script.dataset.amMarathonRoad='1';script.onerror=()=>console.warn('Marathon & Road Racing failed to load');script.onload=()=>loadMarathonRoadRouter();document.body.appendChild(script);
}
function loadContractDecisionRouting(){
 if(typeof document==='undefined'||window.__amContractDecisionRoutingV1||document.querySelector('script[data-am-contract-decision-routing]'))return;
 const script=document.createElement('script');script.src='scripts/contract-decision-routing-v1.js?v=20260915-contractrouting1';script.dataset.amContractDecisionRouting='1';script.onerror=()=>console.warn('Contract decision routing guard failed to load');document.body.appendChild(script);
}
function loadSeasonEventIntegrity(){
 if(typeof document==='undefined')return;
 if(window.__amSeasonEventIntegrityV1Build4){reassertSeasonIntegrity();return}
 if(document.querySelector('script[data-am-season-event-integrity]'))return;
 const script=document.createElement('script');script.src='scripts/season-event-integrity-v1.js?v=20260916-eventintegrity4';script.dataset.amSeasonEventIntegrity='1';script.onerror=()=>console.warn('Season event integrity guard failed to load');script.onload=()=>reassertSeasonIntegrity();document.body.appendChild(script);
}
function loadLateRuntime(){loadMarathonRoad();loadContractDecisionRouting();loadSeasonEventIntegrity()}

document.addEventListener('keydown',onKeyDown);
window.AMKeyboardShortcutsV1={version:'1.0',advanceKey:'Space'};
/* Install late so optional event systems and safety guards sit above the completed
   presentation stack without changing normal track/field event ownership. */
if(document.readyState==='complete')setTimeout(loadLateRuntime,0);
else window.addEventListener('load',()=>setTimeout(loadLateRuntime,0),{once:true});
})();