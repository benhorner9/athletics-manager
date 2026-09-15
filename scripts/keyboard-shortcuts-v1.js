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

function loadMarathonRoadRouter(){
 if(typeof document==='undefined'||window.__amMarathonRoadRouterV1||document.querySelector('script[data-am-marathon-road-router]'))return;
 const script=document.createElement('script');script.src='scripts/marathon-road-router-v1.js?v=20260915-marathon3';script.dataset.amMarathonRoadRouter='1';script.onerror=()=>console.warn('Marathon road router failed to load');document.body.appendChild(script);
}
function loadMarathonRoad(){
 if(typeof document==='undefined')return;
 if(!document.querySelector('link[data-am-marathon-road-style]')){
  const style=document.createElement('link');style.rel='stylesheet';style.href='styles/marathon-road-v1.css?v=20260915-marathon3';style.dataset.amMarathonRoadStyle='1';document.head.appendChild(style);
 }
 if(window.__amMarathonRoadV1){loadMarathonRoadRouter();return}
 if(document.querySelector('script[data-am-marathon-road]'))return;
 const script=document.createElement('script');script.src='scripts/marathon-road-v1.js?v=20260915-marathon3';script.dataset.amMarathonRoad='1';script.onerror=()=>console.warn('Marathon & Road Racing failed to load');script.onload=()=>loadMarathonRoadRouter();document.body.appendChild(script);
}
function loadContractDecisionRouting(){
 if(typeof document==='undefined'||window.__amContractDecisionRoutingV1||document.querySelector('script[data-am-contract-decision-routing]'))return;
 const script=document.createElement('script');script.src='scripts/contract-decision-routing-v1.js?v=20260915-contractrouting1';script.dataset.amContractDecisionRouting='1';script.onerror=()=>console.warn('Contract decision routing guard failed to load');document.body.appendChild(script);
}
function loadSeasonEventIntegrity(){
 if(typeof document==='undefined'||window.__amSeasonEventIntegrityV1||document.querySelector('script[data-am-season-event-integrity]'))return;
 const script=document.createElement('script');script.src='scripts/season-event-integrity-v1.js?v=20260915-eventintegrity1';script.dataset.amSeasonEventIntegrity='1';script.onerror=()=>console.warn('Season event integrity guard failed to load');document.body.appendChild(script);
}
function loadLateRuntime(){loadMarathonRoad();loadContractDecisionRouting();loadSeasonEventIntegrity()}

document.addEventListener('keydown',onKeyDown);
window.AMKeyboardShortcutsV1={version:'1.0',advanceKey:'Space'};
/* Install late so optional event systems and safety guards sit above the completed
   presentation stack without changing normal track/field event ownership. */
if(document.readyState==='complete')setTimeout(loadLateRuntime,0);
else window.addEventListener('load',()=>setTimeout(loadLateRuntime,0),{once:true});
})();
