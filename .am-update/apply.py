from pathlib import Path
R=Path('.')
def rd(p): return (R/p).read_text(encoding='utf-8')
def wr(p,s): (R/p).write_text(s,encoding='utf-8')
def rep(p,a,b):
 s=rd(p)
 if a not in s: raise SystemExit(f'{p}: missing patch anchor')
 wr(p,s.replace(a,b,1))

# Keep the public FTUX contract at 2.0.0; this patch is behavioural, not a state-schema change.
rep('scripts/first-time-experience-v2.js',"const VERSION='2.0.1';","const VERSION='2.0.0';")

# Make the retained Training V2 bootstrap testable and resilient where Blob object URLs are unavailable.
p='scripts/training-v2-bootstrap.js';s=rd(p)
a="""async function run(code,label){
 await new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'})),script=document.createElement('script');
  script.src=url;script.async=false;script.dataset.trainingV2=label;
  script.onload=()=>{URL.revokeObjectURL(url);resolve()};script.onerror=err=>{URL.revokeObjectURL(url);reject(err)};
  document.head.appendChild(script);
 });
}"""
b="""async function run(code,label){
 await new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.async=false;script.dataset.trainingV2=label;
  if(typeof URL?.createObjectURL==='function'){
   const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));script.src=url;
   script.onload=()=>{try{URL.revokeObjectURL(url)}catch(_){}resolve()};script.onerror=err=>{try{URL.revokeObjectURL(url)}catch(_){}reject(err)};
   document.head.appendChild(script);return;
  }
  try{script.textContent=code;document.head.appendChild(script);resolve()}catch(err){reject(err)}
 });
}"""
if a not in s: raise SystemExit('training-v2-bootstrap run() anchor missing')
wr(p,s.replace(a,b,1))

# Same resilient inline fallback for Scouting V2's retained runtime.
p='scripts/scouting-v2-bootstrap.js';s=rd(p)
a="""function runJS(code){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
  const script=document.createElement('script');
  script.src=url;script.async=false;script.dataset.scoutingV2='runtime';
  script.onload=()=>{URL.revokeObjectURL(url);resolve()};
  script.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Scouting V2 runtime failed'))};
  document.head.appendChild(script);
 });
}"""
b="""function runJS(code){
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.async=false;script.dataset.scoutingV2='runtime';
  if(typeof URL?.createObjectURL==='function'){
   const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));script.src=url;
   script.onload=()=>{try{URL.revokeObjectURL(url)}catch(_){}resolve()};
   script.onerror=()=>{try{URL.revokeObjectURL(url)}catch(_){}reject(new Error('Scouting V2 runtime failed'))};
   document.head.appendChild(script);return;
  }
  try{script.textContent=code;document.head.appendChild(script);resolve()}catch(err){reject(err)}
 });
}"""
if a not in s: raise SystemExit('scouting-v2-bootstrap runJS() anchor missing')
wr(p,s.replace(a,b,1))
print('Runtime compatibility fixes applied.')
