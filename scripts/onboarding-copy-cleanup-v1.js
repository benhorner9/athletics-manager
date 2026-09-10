/* ===== Onboarding Copy Cleanup V1 ===== */
(function(){
'use strict';
if(window.__amOnboardingCopyCleanupV1)return;window.__amOnboardingCopyCleanupV1=1;

function removeSloganText(){
 const firstDay=document.getElementById('firstDay');
 if(firstDay){
  firstDay.querySelectorAll('.firstday-footer').forEach(el=>el.remove());
  firstDay.querySelectorAll('.firstday-art figcaption strong').forEach(el=>el.remove());
 }
 document.querySelectorAll('.template-hero-slogan').forEach(el=>el.remove());
}

if(typeof drawFirstDay==='function'&&!drawFirstDay.__onboardingCopyCleanupV1){
 const base=drawFirstDay;
 const wrapped=function(){
  const out=base.apply(this,arguments);
  queueMicrotask(removeSloganText);
  return out;
 };
 wrapped.__onboardingCopyCleanupV1=true;
 wrapped.__base=base;
 drawFirstDay=wrapped;
}

if(typeof drawHome==='function'&&!drawHome.__onboardingCopyCleanupV1){
 const base=drawHome;
 const wrapped=function(){
  const out=base.apply(this,arguments);
  queueMicrotask(removeSloganText);
  return out;
 };
 wrapped.__onboardingCopyCleanupV1=true;
 wrapped.__base=base;
 drawHome=wrapped;
}

removeSloganText();
new MutationObserver(()=>queueMicrotask(removeSloganText)).observe(document.body,{childList:true,subtree:true});
})();
/* ===== End Onboarding Copy Cleanup V1 ===== */
