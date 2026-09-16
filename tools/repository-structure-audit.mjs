import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const clean=value=>String(value||'').split('?')[0].split('#')[0].replace(/^\.\//,'');
const textExt=new Set(['.js','.css','.html','.mjs','.json','.txt']);
const runtimeExt=new Set(['.js','.css','.b64','.webp','.png','.jpg','.jpeg','.svg']);

function walk(dir,rel=''){
 const out=[];
 if(!fs.existsSync(dir))return out;
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const nextRel=rel?`${rel}/${entry.name}`:entry.name;
  const next=path.join(dir,entry.name);
  if(entry.isDirectory())out.push(...walk(next,nextRel));
  else out.push(nextRel);
 }
 return out;
}

function refsFromText(file){
 if(!exists(file)||!textExt.has(path.extname(file).toLowerCase()))return [];
 const source=read(file),refs=new Set();
 for(const match of source.matchAll(/(?:scripts|styles|assets)\/[A-Za-z0-9._/-]+/g)){
  const ref=clean(match[0]);
  if(exists(ref))refs.add(ref);
 }
 const base=path.posix.dirname(file);
 for(const match of source.matchAll(/(?:import\s*(?:\([^)]*?\)|[^'"\n]*?from\s*)|fetch\s*\(|src\s*=\s*|href\s*=\s*)\s*['"](\.\.?\/[A-Za-z0-9._/-]+)['"]/g)){
  const ref=path.posix.normalize(path.posix.join(base,match[1]));
  if(exists(ref))refs.add(ref);
 }
 if(path.extname(file).toLowerCase()==='.css'){
  for(const match of source.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)){
   const raw=match[1];
   if(/^(?:data:|https?:|\/\/)/i.test(raw))continue;
   const ref=path.posix.normalize(path.posix.join(base,clean(raw)));
   if(exists(ref))refs.add(ref);
  }
 }
 return [...refs];
}

const html=read('game.html');
const entryRefs=[];
for(const match of html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["']/gi)){
 const raw=match[1];
 if(/^(?:https?:|data:|\/\/)/i.test(raw))continue;
 const ref=clean(raw);
 if(ref&&exists(ref))entryRefs.push(ref);
}

const reachable=new Set(entryRefs);
const queue=[...entryRefs];
while(queue.length){
 const file=queue.shift();
 for(const ref of refsFromText(file))if(!reachable.has(ref)){reachable.add(ref);queue.push(ref)}
}

const runtimeFiles=[...walk(path.join(root,'scripts'),'scripts'),...walk(path.join(root,'styles'),'styles'),...walk(path.join(root,'assets'),'assets')]
 .filter(file=>runtimeExt.has(path.extname(file).toLowerCase()));
const supportOnly=file=>file.startsWith('scripts/dev/')||/\/[^/]*LICENSE\.txt$/i.test(file);
const unreachable=runtimeFiles.filter(file=>!reachable.has(file)&&!supportOnly(file)).sort();

const overlayPattern=/(?:cleanup|polish|pretest|refinement|tidy|ordering|consolidation|followup|reliability|stability|cutover|release-final)/i;
const directOverlays=entryRefs.filter(file=>overlayPattern.test(path.posix.basename(file))).sort();
const staleCache=[];
for(const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)){
 const value=match[1];
 if(/marathon|road[-_]?racing/i.test(value))staleCache.push(value);
}

const topLevelScripts=fs.readdirSync(path.join(root,'scripts'),{withFileTypes:true}).filter(x=>x.isFile()&&x.name.endsWith('.js')).length;
const topLevelStyles=fs.readdirSync(path.join(root,'styles'),{withFileTypes:true}).filter(x=>x.isFile()&&x.name.endsWith('.css')).length;

console.log('Repository structure audit');
console.log(`- ${entryRefs.length} direct runtime assets from game.html`);
console.log(`- ${reachable.size} runtime/support assets reachable through the dependency graph`);
console.log(`- ${topLevelScripts} top-level JavaScript files`);
console.log(`- ${topLevelStyles} top-level stylesheets`);
if(unreachable.length){
 console.log(`- ${unreachable.length} unreachable runtime asset candidate${unreachable.length===1?'':'s'}:`);
 for(const file of unreachable)console.log(`  • ${file}`);
}else console.log('- No unreachable runtime assets found.');
if(directOverlays.length){
 console.log(`- ${directOverlays.length} historical overlay/cutover asset${directOverlays.length===1?'':'s'} still loaded directly:`);
 for(const file of directOverlays)console.log(`  • ${file}`);
}else console.log('- No historical overlay/cutover filenames are loaded directly.');
if(staleCache.length){
 console.log('- Stale retired-feature cache labels found in game.html:');
 for(const value of staleCache)console.log(`  • ${value}`);
}else console.log('- No retired-feature cache labels found in game.html.');

// This pass is deliberately informational. Deletion decisions are made only after
// the candidates are reviewed and the full QA/browser suite proves the cleanup.
process.exit(0);
