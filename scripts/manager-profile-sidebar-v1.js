/* Athletics Manager — My Profile sidebar interaction */
(function(){
'use strict';
if(window.__amManagerProfileSidebarV1)return;window.__amManagerProfileSidebarV1=1;

const dialog=document.getElementById('managementProfile');
if(!dialog)return;

const nativeShow=window.HTMLDialogElement?.prototype?.show;
if(typeof nativeShow==='function'){
 dialog.showModal=function(){
  if(!this.open)nativeShow.call(this);
 };
}

function closeProfileForNavigation(target){
 if(!dialog.open)return;
 if(target?.closest?.('#myProfileShortcut,#mobileMyProfile,[data-manager-tab],[data-manager-athlete],[data-manager-season],[data-manager-scope],[data-manager-timeline],[data-manager-save-name],[data-manager-close]'))return;
 if(target?.closest?.('.rail-nav [data-view],.bottom-nav [data-view],[data-mobile-view],#menuBtn,#mobileMainMenu'))dialog.close();
}

document.addEventListener('click',event=>closeProfileForNavigation(event.target),true);

window.__athleticsManagerProfileSidebarV1={version:1,dialog,close:()=>dialog.open&&dialog.close()};
})();
