import fs from 'node:fs';
const src=fs.readFileSync('scripts/programme-economy-v2.js','utf8');
const need=(ok,msg)=>{if(!ok)throw new Error('Staff tab render regression: '+msg)};
need(src.includes("function drawStaff2(){const root=document.getElementById('staff');if(!root)return;try{"),'Staff renderer must have a recovery boundary');
need(src.includes("if(UI.staff==='market'){safe(()=>refreshMarket(p),null);marketRows=safe(()=>market(UI.role),[])}"),'Performance Team render must not depend on market generation');
need(src.includes("return OLD.drawStaff.apply(this,arguments)"),'Staff renderer must fall back to the previous working Staff V2 screen');
need(!src.includes("function skpis(){const p=prog(),roles=Object.keys(STAFF_DEF)"),'Staff KPI render must use the defensive role source');
console.log('Staff tab render guard: PASS');
