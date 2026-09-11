/* ===== Text & Language Systems Release Note ===== */
(function(){
'use strict';
if(window.__amEditorialReleaseNote)return;window.__amEditorialReleaseNote=1;
const update={
 timestamp:'2026-09-11T18:49:00+01:00',
 date:'11 September 2026',
 title:'Text, Language & Narrative Systems',
 items:[
  'Added one language authority across new emails, news, commentary and core UI wording.',
  'Role-aware editing now removes common filler without changing the gameplay facts underneath it.',
  'Added formal voice standards for coaches, scouts, medical staff, federation, finance, media and Gavin Potts.',
  'Added copy QA for generic subjects, broken variables, long emails, repeated wording and vague button labels.',
  'British English terminology and number-formatting rules are now centralised for future systems.'
 ]
};
if(typeof window.addDevelopmentUpdate==='function')window.addDevelopmentUpdate(update);
})();
/* ===== End Text & Language Systems Release Note ===== */

/* ===== Inbox Character Voice Loader ===== */
(function(){
'use strict';
if(window.__amInboxCharacterVoiceLoader)return;window.__amInboxCharacterVoiceLoader=1;
function loadInboxVoices(){
 if(window.__amInboxCharacterVoicesV1||document.querySelector('script[data-am-inbox-voices]'))return;
 const script=document.createElement('script');
 script.src='scripts/inbox-character-voices-v1.js?v=20260911-inboxvoice1';
 script.async=false;
 script.dataset.amInboxVoices='1';
 script.onload=()=>{try{if(typeof renderMenu==='function')renderMenu()}catch(_){}};
 document.body.appendChild(script);
}
if(document.readyState==='complete')loadInboxVoices();
else window.addEventListener('load',loadInboxVoices,{once:true});
})();
/* ===== End Inbox Character Voice Loader ===== */
