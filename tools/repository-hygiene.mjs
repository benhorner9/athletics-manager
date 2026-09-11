import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const notes=[];
const fail=message=>failures.push(message);
const note=message=>notes.push(message);
const exists=file=>fs.existsSync(path.join(root,file));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

if(!exists('game.html'))fail('game.html is missing.');

const html=exists('game.html')?read('game.html'):'';
const scriptsDir=path.join(root,'scripts');
const stylesDir=path.join(root,'styles');

const topLevelJs=fs.existsSync(scriptsDir)
 ? fs.readdirSync(scriptsDir,{withFileTypes:true}).filter(x=>x.isFile()&&x.name.endsWith('.js')).map(x=>x.name).sort()
 : [];
const topLevelCss=fs.existsSync(stylesDir)
 ? fs.readdirSync(stylesDir,{withFileTypes:true}).filter(x=>x.isFile()&&x.name.endsWith('.css')).map(x=>x.name).sort()
 : [];

const jsSource=new Map(topLevelJs.map(name=>[name,read(`scripts/${name}`)]));

function referencedByRuntime(assetPath,selfName=''){
 if(html.includes(assetPath))return true;
 for(const [name,source] of jsSource){
  if(name===selfName)continue;
  if(source.includes(assetPath))return true;
 }
 return false;
}

for(const name of topLevelJs){
 const asset=`scripts/${name}`;
 if(!referencedByRuntime(asset,name))fail(`Orphan top-level JavaScript runtime: ${asset}`);
}

for(const name of topLevelCss){
 const asset=`styles/${name}`;
 if(!referencedByRuntime(asset))fail(`Orphan top-level stylesheet: ${asset}`);
}

const forbiddenNames=[
 '.DS_Store','Thumbs.db'
];
const forbiddenPatterns=[
 /(?:^|\/)(?:backup|copy|temp|tmp)[-_].*\.(?:js|css|html)$/i,
 /\.(?:bak|old|orig|rej|tmp|temp)$/i,
 /(?:^|\/)\.scouting-recovery-validation\.css$/i
];

function walk(dir,rel=''){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(entry.name==='.git'||entry.name==='node_modules')continue;
  const nextRel=rel?`${rel}/${entry.name}`:entry.name;
  const next=path.join(dir,entry.name);
  if(forbiddenNames.includes(entry.name))fail(`Temporary repository artefact: ${nextRel}`);
  if(forbiddenPatterns.some(pattern=>pattern.test(nextRel)))fail(`Retired/temporary repository artefact: ${nextRel}`);
  if(entry.isDirectory())walk(next,nextRel);
 }
}
walk(root);

if(fs.existsSync(path.join(root,'.am-update')))fail('Staged .am-update payload was left in the repository.');

note(`${topLevelJs.length} top-level JavaScript modules checked for a production or dynamic loader reference.`);
note(`${topLevelCss.length} top-level stylesheets checked for a production or dynamic loader reference.`);
note('Temporary and backup-like repository artefacts checked.');

if(failures.length){
 console.error('\nRepository hygiene failed:\n');
 for(const message of failures)console.error(`- ${message}`);
 process.exit(1);
}

console.log('Repository hygiene passed.');
for(const message of notes)console.log(`- ${message}`);
