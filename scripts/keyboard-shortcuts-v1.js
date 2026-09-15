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

function loadMarathonRoad(){
 if(typeof document==='undefined')return;
 if(!document.querySelector('link[data-am-marathon-road-style]')){
  const style=document.createElement('link');style.rel='stylesheet';style.href='styles/marathon-road-v1.css?v=20260915-marathon2';style.dataset.amMarathonRoadStyle='1';document.head.appendChild(style);
 }
 if(window.__amMarathonRoadV1||document.querySelector('script[data-am-marathon-road]'))return;
 const script=document.createElement('script');script.src='scripts/marathon-road-v1.js?v=20260915-marathon2';script.dataset.amMarathonRoad='1';script.onerror=()=>console.warn('Marathon & Road Racing failed to load');document.body.appendChild(script);
}

document.addEventListener('keydown',onKeyDown);
window.AMKeyboardShortcutsV1={version:'1.0',advanceKey:'Space'};
/* Install late so the road renderer wraps the final live-event UI rather than
   being overwritten by presentation modules that load later in game.html. */
if(document.readyState==='complete')setTimeout(loadMarathonRoad,0);
else window.addEventListener('load',()=>setTimeout(loadMarathonRoad,0),{once:true});
})();
