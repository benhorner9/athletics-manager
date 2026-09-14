import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

const profile=String(process.argv[2]||'critical').toLowerCase();
if(!['critical','soak'].includes(profile)){
 console.error(`Unknown QA profile: ${profile}. Use critical or soak.`);
 process.exit(2);
}

const started=Date.now();
const node=process.execPath;
const completed=[];

function duration(ms){const s=Math.round(ms/1000);return s<60?`${s}s`:`${Math.floor(s/60)}m ${s%60}s`}

async function run(label,args,{env={},timeout=360000}={}){
 console.log(`\n══ ${label} ══`);
 const at=Date.now();
 const child=spawn(node,args,{cwd:process.cwd(),env:{...process.env,...env},stdio:'inherit'});
 const timer=setTimeout(()=>{
  console.error(`\n${label} timed out after ${duration(timeout)}.`);
  child.kill('SIGKILL');
 },timeout);
 const code=await new Promise(resolve=>child.on('exit',(value,signal)=>resolve(value??(signal?124:1))));
 clearTimeout(timer);
 if(code!==0){
  console.error(`\nAUTOMATED QA FAILED at: ${label}`);
  process.exit(code||1);
 }
 completed.push({label,time:Date.now()-at});
}

function walkJs(dir,out=[]){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())walkJs(full,out);
  else if(entry.isFile()&&entry.name.endsWith('.js'))out.push(full);
 }
 return out;
}

async function syntaxCheck(){
 console.log('\n══ JavaScript syntax contract ══');
 const at=Date.now(),files=walkJs(path.resolve('scripts'));
 for(const file of files){
  const rel=path.relative(process.cwd(),file);
  const child=spawn(node,['--check',rel],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',d=>stderr+=d);
  const code=await new Promise(resolve=>child.on('exit',value=>resolve(value??1)));
  if(code!==0){console.error(stderr||`Syntax check failed: ${rel}`);process.exit(code||1)}
 }
 console.log(`✓ ${files.length} runtime JavaScript files parsed successfully.`);
 completed.push({label:'JavaScript syntax contract',time:Date.now()-at});
}

await run('Repository hygiene',['tools/repository-hygiene.mjs']);
await run('Static UI / asset regression',['tools/static-regression.mjs']);
await syntaxCheck();
await run('Persistence performance regression',['tools/persistence-performance-regression.mjs']);
await run('Scouting persistence regression',['tools/scouting-persistence-regression.mjs']);
await run('Scouting V2 storage audit',['tools/scouting-v2-storage-audit.mjs']);
await run('Contract expiry reentrancy regression',['tools/contract-expiry-reentrancy-regression.mjs']);
await run('Deterministic gameplay regressions',['tools/automated-gameplay-regression.mjs']);
await run('Stability regressions',['tools/dev-stability-regression.mjs'],{timeout:480000});

if(profile==='soak'){
 await run('Full runtime + multi-week career soak',['tools/runtime-smoke.mjs'],{
  env:{AM_AUDIT_SOAK:'1',AM_AUDIT_WEEKS:process.env.AM_AUDIT_WEEKS||'16'},
  timeout:1080000
 });
}else{
 await run('Full runtime smoke',['tools/runtime-smoke.mjs'],{timeout:360000});
}

console.log('\n════════════════════════════════════');
console.log(`ATHLETICS MANAGER AUTOMATED QA: PASSED (${profile.toUpperCase()})`);
console.log('════════════════════════════════════');
for(const item of completed)console.log(`✓ ${item.label} · ${duration(item.time)}`);
console.log(`✓ Total · ${duration(Date.now()-started)}`);
console.log(profile==='soak'?'✓ Deployment may proceed.':'✓ Critical gameplay/UI gate is clear.');
