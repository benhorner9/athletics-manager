import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const retiredPaths=[
 'scripts/marathon-playback-integrity-v2.js',
 'scripts/marathon-road-broadcast-v2.js',
 'scripts/marathon-road-broadcast-v3.js',
 'scripts/marathon-road-motion-v4.js',
 'scripts/marathon-road-router-v1.js',
 'scripts/marathon-road-v1.js',
 'styles/marathon-road-broadcast-v2.css',
 'styles/marathon-road-broadcast-v3.css',
 'styles/marathon-road-motion-v4.css',
 'styles/marathon-road-v1.css'
];
for(const file of retiredPaths)assert.equal(fs.existsSync(file),false,`retired road-racing file still exists: ${file}`);

const runtimeFiles=[];
for(const dir of ['scripts','styles']){
 const walk=current=>{
  for(const entry of fs.readdirSync(current,{withFileTypes:true})){
   const full=path.join(current,entry.name);
   if(entry.isDirectory())walk(full);
   else if(entry.isFile()&&/\.(?:js|css)$/.test(entry.name))runtimeFiles.push(full);
  }
 };
 walk(dir);
}
const staleRuntime=/scripts\/marathon-|styles\/marathon-|AMMarathon|loadMarathon/i;
const stale=[];
for(const file of runtimeFiles){
 const source=fs.readFileSync(file,'utf8');
 if(staleRuntime.test(source))stale.push(file);
}
assert.deepEqual(stale,[],`retired road-racing runtime references remain: ${stale.join(', ')}`);

const game=fs.readFileSync('game.html','utf8');
assert.doesNotMatch(game,/scripts\/marathon-|styles\/marathon-/i,'game.html still loads a retired road-racing asset');

const marathonTests=fs.readdirSync('tools').filter(name=>/^marathon-.*regression\.mjs$/i.test(name));
assert.deepEqual(marathonTests,[],'retired marathon-specific regression files still exist');

console.log('Retired feature regression passed.');
console.log('✓ Marathon/road-racing runtime, styles, loaders and dedicated regressions are absent.');
