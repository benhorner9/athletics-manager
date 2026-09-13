from pathlib import Path

ROOT=Path('.')

def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text): (ROOT/path).write_text(text,encoding='utf-8')
def once(text,old,new,label):
    if old not in text: raise SystemExit(f'Missing patch target: {label}')
    if text.count(old)!=1: raise SystemExit(f'Ambiguous patch target: {label} ({text.count(old)})')
    return text.replace(old,new,1)

p='scripts/programme-economy-v2.js'
t=read(p)
old="function skpis(){const p=prog(),roles=Object.keys(STAFF_DEF),covered=roles.filter(r=>s.coaches?.[r]).length,due=Object.values(p.staffContracts).filter(c=>c.state==='active'&&weeks(c)<=12).length;return`<div class=\"pe-kpis staff\"><div><small>FILLED ROLES</small><strong>${covered} / ${roles.length}</strong><span>Performance departments</span></div><div><small>WEEKLY PAYROLL</small><strong>${cash(staffPay(p))}</strong><span>Current salaries</span></div><div><small>CONTRACTS DUE</small><strong>${due}</strong><span>Inside 12 weeks</span></div><div><small>AVAILABLE MARKET</small><strong>${market().filter(c=>!c.employedNation).length}</strong><span>Unattached specialists</span></div><div><small>BOARD CONFIDENCE</small><strong>${Math.round(p.boardTrust)}/100</strong><span>Financial management</span></div></div>`}"
new="function skpis(){const p=prog(),roles=staffRoles(),covered=roles.filter(r=>s.coaches?.[r]).length,due=Object.values(p.staffContracts).filter(c=>c.state==='active'&&weeks(c)<=12).length,cached=Array.isArray(p.staffMarket?.candidates)?p.staffMarket.candidates:[],marketReady=cached.length>0,available=cached.filter(c=>!c.employedNation).length;return`<div class=\"pe-kpis staff\"><div><small>FILLED ROLES</small><strong>${covered} / ${roles.length}</strong><span>Performance departments</span></div><div><small>WEEKLY PAYROLL</small><strong>${cash(staffPay(p))}</strong><span>Current salaries</span></div><div><small>CONTRACTS DUE</small><strong>${due}</strong><span>Inside 12 weeks</span></div><div><small>AVAILABLE MARKET</small><strong>${marketReady?available:'—'}</strong><span>${marketReady?'Unattached specialists':'Open Staff Market to load'}</span></div><div><small>BOARD CONFIDENCE</small><strong>${Math.round(p.boardTrust)}/100</strong><span>Financial management</span></div></div>`}"
t=once(t,old,new,'staff KPI market isolation')
old_start="function drawStaff2(){const root=document.getElementById('staff');if(!root)return;const p=prog();refreshMarket(p);const roles=Object.keys(STAFF_DEF);root.innerHTML=`"
new_start="function drawStaff2(){const root=document.getElementById('staff');if(!root)return;try{const p=prog(),roles=staffRoles();safe(()=>ensureCoaches(),null);let marketRows=[];if(UI.staff==='market'){safe(()=>refreshMarket(p),null);marketRows=safe(()=>market(UI.role),[])}root.innerHTML=`"
t=once(t,old_start,new_start,'staff render guard start')
t=once(t,"${market(UI.role).map(marketCard).join('')}","${marketRows.map(marketCard).join('')}",'staff market rows')
old_end="safe(()=>window.AthleticsUI?.registerScreen?.('staff',{status:'candidate',replacement:'programme-economy-v2'}),null)}\n\nfunction programmeEmailFor"
new_end="safe(()=>window.AthleticsUI?.registerScreen?.('staff',{status:'candidate',replacement:'programme-economy-v2'}),null)}catch(err){console.error('[Programme Economy] Staff screen recovery',err);try{return OLD.drawStaff.apply(this,arguments)}catch(fallbackErr){console.error('[Programme Economy] Staff V2 fallback failed',fallbackErr);root.innerHTML='<div class=\"am-cutover-error\" role=\"alert\"><div><small>STAFF RECOVERY</small><h2>Staff screen unavailable</h2><p>Your career data has not been changed. Return Home and reopen Staff.</p><div class=\"am-cutover-error-actions\"><button type=\"button\" class=\"btn secondary\" onclick=\"view(&#39;staff&#39;)\">RETRY</button><button type=\"button\" class=\"btn ghost\" onclick=\"view(&#39;home&#39;)\">RETURN HOME</button></div></div></div>'}}}\n\nfunction programmeEmailFor"
t=once(t,old_end,new_end,'staff render guard end')
write(p,t)

p='tools/programme-management-integration-soak.mjs'
t=read(p)
anchor="need(economy.includes('staffContractHistory'),'staff contract history missing');\n"
insert=anchor+"need(economy.includes(\"if(UI.staff==='market'){safe(()=>refreshMarket(p),null)\")&&economy.includes('marketRows.map(marketCard)'),'Staff team render must not depend on market generation');\nneed(economy.includes(\"return OLD.drawStaff.apply(this,arguments)\"),'Staff screen must recover through the existing Staff V2 renderer');\n"
t=once(t,anchor,insert,'staff regression assertions')
write(p,t)

p='scripts/ui-cutover-v1.js'
t=read(p).replace("2026.09.13-economyv4integration1","2026.09.13-staffrecovery1").replace("20260913-economyv4integration1","20260913-staffrecovery1")
write(p,t)

p='game.html'
t=read(p).replace('scripts/ui-cutover-v1.js?v=20260913-economyv4integration1','scripts/ui-cutover-v1.js?v=20260913-staffrecovery1')
write(p,t)

print('Staff tab V4 render recovery applied')
