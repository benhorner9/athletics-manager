/* Lossless storage envelope. Career schema and the existing storage key stay unchanged.
   fflate 0.8.2 (MIT) is vendored locally; saves do not require a network service. */
(function(){
'use strict';
const PREFIX='AMGZ1:';
let lastJSON=null,lastStored=null;
function encode(json){
 if(json===lastJSON)return lastStored;
 let stored=json;
 if(json.length>=256000){
  const bytes=fflate.gzipSync(fflate.strToU8(json),{level:1,mtime:0}),parts=[];
  for(let i=0;i<bytes.length;i+=8192)parts.push(String.fromCharCode(...bytes.subarray(i,i+8192)));
  const packed=PREFIX+parts.join('');if(packed.length<json.length)stored=packed;
 }
 lastJSON=json;lastStored=stored;return stored;
}
function decode(raw){
 if(!raw.startsWith(PREFIX))return raw;
 const bytes=Uint8Array.from(raw.slice(PREFIX.length),c=>c.charCodeAt(0));
 return fflate.strFromU8(fflate.gunzipSync(bytes));
}
window.AMCareerSaveCodec=Object.freeze({encode,decode,version:1});
})();
