/* ===== Main Menu Alpha Access Gate ===== */
(function(){
'use strict';
if(window.__amAlphaMenuGate)return;window.__amAlphaMenuGate=1;

const ACCESS_KEY='athletics_manager_alpha_menu_access_v2';
const ACCESS_GENERATION='14';
const ACCESS_HASH='df8fbe96ecd1df599d6e2cd2cb32df44583937898bd9d8d06fb65c78986ea3ab';

const menu=document.querySelector('.menu-side');
const form=document.getElementById('alphaAccessForm');
const input=document.getElementById('alphaAccessCode');
const status=document.getElementById('alphaAccessStatus');
const submit=document.getElementById('alphaAccessSubmit');
if(!menu||!form||!input||!status||!submit)return;

function storedAccessIsCurrent(){
 try{return localStorage.getItem(ACCESS_KEY)===ACCESS_GENERATION}catch(_){return false}
}
function rememberAccess(){
 try{localStorage.setItem(ACCESS_KEY,ACCESS_GENERATION)}catch(_){ }
}
function bytesToHex(buffer){return Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('')}
async function hashCode(value){
 const text=String(value||'').trim().toUpperCase();
 if(window.crypto?.subtle&&window.TextEncoder){
  const data=new TextEncoder().encode(text);
  return bytesToHex(await crypto.subtle.digest('SHA-256',data));
 }
 /* Old-browser fallback. This is only a casual frontend deterrent, never server-side security. */
 let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
 return String(h>>>0);
}
function unlock(remember=true){
 if(remember)rememberAccess();
 menu.classList.remove('alpha-locked');
 menu.classList.add('alpha-unlocked');
 form.classList.add('is-unlocked');
 input.disabled=true;
 submit.disabled=true;
 status.textContent='Access granted on this device.';
 status.className='alpha-access-status good';
}
function lock(){
 menu.classList.add('alpha-locked');
 menu.classList.remove('alpha-unlocked');
 form.classList.remove('is-unlocked');
 input.disabled=false;
 submit.disabled=false;
 status.textContent='Enter the current Closed Alpha code to unlock career access.';
 status.className='alpha-access-status';
}

if(storedAccessIsCurrent())unlock(false);else lock();

form.addEventListener('submit',async(e)=>{
 e.preventDefault();
 const value=input.value;
 if(!value.trim()){
  status.textContent='Enter an Alpha access code.';
  status.className='alpha-access-status bad';
  input.focus();
  return;
 }
 submit.disabled=true;
 status.textContent='Checking access…';
 status.className='alpha-access-status';
 try{
  const digest=await hashCode(value);
  /* Web Crypto path uses SHA-256. The fallback deliberately cannot grant access if crypto is unavailable. */
  if(digest===ACCESS_HASH){
   input.value='';
   unlock(true);
   return;
  }
  status.textContent='Code not recognised. Check the current Alpha code and try again.';
  status.className='alpha-access-status bad';
  input.select();
 }catch(err){
  console.error('Alpha access check failed',err);
  status.textContent='Could not check the code. Reload the game and try again.';
  status.className='alpha-access-status bad';
 }finally{
  if(!menu.classList.contains('alpha-unlocked'))submit.disabled=false;
 }
});

/* If another menu renderer changes the startup DOM state, keep access authority here. */
const observer=new MutationObserver(()=>{
 if(storedAccessIsCurrent()){
  if(menu.classList.contains('alpha-locked'))unlock(false);
 }else if(!menu.classList.contains('alpha-locked'))lock();
});
observer.observe(document.getElementById('startup')||document.body,{attributes:true,subtree:true,attributeFilter:['class','disabled']});
})();
/* ===== End Main Menu Alpha Access Gate ===== */
