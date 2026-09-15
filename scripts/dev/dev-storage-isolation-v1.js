/* Athletics Manager — Dev Storage Isolation V1
   Keeps /dev career persistence separate from the live game's browser storage. */
(function(){
'use strict';
if(window.__athleticsDevStorageIsolation)return;

const isDev=/^dev\./i.test(location.hostname)||/(^|\/)dev(\/|$)/i.test(location.pathname);
if(!isDev)return;

const LIVE_SAVE_KEY='rto_full_game_v1';
const DEV_SAVE_KEY='rto_full_game_dev_v1';
const LIVE_CORRUPT_KEY='rto_full_game_v1_corrupt_backup';
const DEV_CORRUPT_KEY='rto_full_game_dev_v1_corrupt_backup';
const proto=window.Storage&&window.Storage.prototype;
if(!proto)return;

const nativeGet=proto.getItem;
const nativeSet=proto.setItem;
const nativeRemove=proto.removeItem;

function mapCareerKey(key){
 const value=String(key);
 if(value===LIVE_SAVE_KEY)return DEV_SAVE_KEY;
 if(value===LIVE_CORRUPT_KEY)return DEV_CORRUPT_KEY;
 if(value.startsWith(LIVE_CORRUPT_KEY+'_'))return DEV_CORRUPT_KEY+value.slice(LIVE_CORRUPT_KEY.length);
 return value;
}
function isLocalStorage(target){
 try{return target===window.localStorage}catch(_){return false}
}

proto.getItem=function(key){
 return nativeGet.call(this,isLocalStorage(this)?mapCareerKey(key):key);
};
proto.setItem=function(key,value){
 return nativeSet.call(this,isLocalStorage(this)?mapCareerKey(key):key,value);
};
proto.removeItem=function(key){
 return nativeRemove.call(this,isLocalStorage(this)?mapCareerKey(key):key);
};

window.__athleticsDevStorageIsolation={
 version:1,
 liveSaveKey:LIVE_SAVE_KEY,
 devSaveKey:DEV_SAVE_KEY,
 mapCareerKey
};
})();
