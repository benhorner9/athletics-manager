/* Athletics Manager — My Profile sidebar interaction */
(function(){
'use strict';
if(window.__amManagerProfileSidebarV1)return;window.__amManagerProfileSidebarV1=1;
const dialog=document.getElementById('managementProfile');if(!dialog)return;
const desktop=document.getElementById('myProfileShortcut'),mobile=document.getElementById('mobileMyProfile');
function route(){try{return typeof currentView==='string'?currentView:'home'}catch(_){return'home'}}
function managerProfileOpen(open=dialog.open){return !!open&&dialog.classList.contains('am-manager-profile-dialog')}
function sync(open=dialog.open){const r=route(),managerOpen=managerProfileOpen(open);document.querySelectorAll('.rail-nav [data-view]').forEach(b=>{const on=!managerOpen&&b.dataset.view===r;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});for(const b of [desktop,mobile])if(b){b.classList.toggle('on',managerOpen);if(managerOpen)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}}
const nativeShow=window.HTMLDialogElement?.prototype?.show;if(typeof nativeShow==='function')dialog.showModal=function(){if(!this.open)nativeShow.call(this);sync(this.open)};
function closeForNav(target){if(!dialog.open)return;if(target?.closest?.('#myProfileShortcut,#mobileMyProfile,[data-manager-tab],[data-manager-athlete],[data-manager-season],[data-manager-scope],[data-manager-timeline],[data-manager-save-name],[data-manager-close],[data-civ2-manager-tab],[data-civ2-athlete]'))return;if(target?.closest?.('.rail-nav [data-view],.bottom-nav [data-view],[data-mobile-view],#menuBtn,#mobileMainMenu')){dialog.close();sync(false)}}
dialog.addEventListener('close',()=>sync(false));document.addEventListener('click',e=>closeForNav(e.target),true);

window.__athleticsManagerProfileSidebarV1={version:1.2,dialog,sync,close:()=>{if(dialog.open)dialog.close();sync(false)}};
})();
