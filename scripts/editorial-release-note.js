/* ===== Editorial Cleanup Release Note ===== */
(function(){
'use strict';
if(window.__amEditorialReleaseNote)return;window.__amEditorialReleaseNote=1;
const update={
 timestamp:'2026-09-10T13:05:00+01:00',
 date:'10 September 2026',
 title:'Game-Wide Writing Cleanup',
 items:[
  'Cut unnecessary instructions and repeated UI text across the game.',
  'Removed trailer-style and AI-sounding wording from onboarding, selection and system messages.',
  'Coach, athlete, medical, media and commentary voices stay natural and role-specific.',
  'Future emails and news now pass through one final editorial layer so older wording is less likely to creep back in.'
 ]
};
if(typeof window.addDevelopmentUpdate==='function')window.addDevelopmentUpdate(update);
})();
/* ===== End Editorial Cleanup Release Note ===== */
