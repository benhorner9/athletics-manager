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

document.addEventListener('keydown',onKeyDown);
window.AMKeyboardShortcutsV1={version:'1.0',advanceKey:'Space'};
})();
