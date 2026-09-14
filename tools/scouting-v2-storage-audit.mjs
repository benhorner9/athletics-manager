import fs from 'node:fs';
import zlib from 'node:zlib';

const parts=['a','b','c','d'].map(part=>fs.readFileSync(`scripts/scouting-v2/bundle-${part}.b64`,'utf8'));
const packed=parts.join('').replace(/\s+/g,'');
const source=zlib.gunzipSync(Buffer.from(packed,'base64')).toString('utf8');

function excerpts(term,radius=700){
 const out=[];let at=0;
 while((at=source.indexOf(term,at))>=0){
  const start=Math.max(0,at-radius),end=Math.min(source.length,at+term.length+radius);
  out.push(source.slice(start,end).replace(/\s+/g,' '));
  at+=term.length;
 }
 return out;
}

function print(term){
 const rows=excerpts(term);
 console.log(`\n[scouting-storage-audit] ${term}: ${rows.length} occurrence${rows.length===1?'':'s'}`);
 rows.forEach((row,index)=>console.log(`--- ${term} ${index+1} ---\n${row}`));
}

console.log(`[scouting-storage-audit] runtime source ${source.length} characters`);
for(const term of ['hiddenTalent','weeklyForm','knowledge','processLongTermWeek','processScoutingWeek','discoveries'])print(term);

// Surface the object keys used when hidden athletes are created without relying on
// minifier variable names. This is diagnostic only; no game/runtime files are changed.
const hiddenLiteral=/hiddenTalent\s*[:=]/g;
console.log(`\n[scouting-storage-audit] hiddenTalent declarations: ${[...source.matchAll(hiddenLiteral)].length}`);
console.log('[scouting-storage-audit] PASS');
