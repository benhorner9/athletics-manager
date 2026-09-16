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
function loadContractDecisionRouting(){
 if(typeof document==='undefined'||window.__amContractDecisionRoutingV1||document.querySelector('script[data-am-contract-decision-routing]'))return;
 const script=document.createElement('script');
 script.src='scripts/contract-decision-routing-v1.js?v=20260916-contractrouting3';
 script.dataset.amContractDecisionRouting='1';
 script.onerror=()=>console.warn('Contract decision routing guard failed to load');
 document.body.appendChild(script);
}
function loadSeasonEventIntegrity(){
 if(typeof document==='undefined')return;
 if(window.__amSeasonEventIntegrityV1Build6){reassertSeasonIntegrity();return}
 if(document.querySelector('script[data-am-season-event-integrity]'))return;
 const script=document.createElement('script');
 script.src='scripts/season-event-integrity-v1.js?v=20260916-eventintegrity6';
 script.dataset.amSeasonEventIntegrity='1';
 script.onerror=()=>console.warn('Season event integrity guard failed to load');
 script.onload=()=>reassertSeasonIntegrity();
 document.body.appendChild(script);
}
function loadLateRuntime(){
 loadContractDecisionRouting();
 loadSeasonEventIntegrity();
}

document.addEventListener('keydown',onKeyDown);
window.AMKeyboardShortcutsV1={version:'1.5',advanceKey:'Space'};
if(document.readyState==='complete')setTimeout(loadLateRuntime,0);
else window.addEventListener('load',()=>setTimeout(loadLateRuntime,0),{once:true});
})();