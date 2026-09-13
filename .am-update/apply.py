from pathlib import Path
import re


def rep(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing anchor: {label}')
    return text.replace(old, new, 1)


def rx(text, pattern, replacement, label):
    out, n = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f'Expected one match for {label}, got {n}')
    return out

# Programme Economy remains the authority for all Home finance state and navigation.
p = Path('scripts/programme-economy-v2.js')
text = p.read_text(encoding='utf-8')

home_api = r'''function homeSummary(){
 const p=prog(),x=snap(p),deal=safe(()=>managementState().sponsors?.[yr()],null),facilityIssues=Object.entries(p.facilities||{}).filter(([,f])=>f?.incident||Number(f?.condition||100)<70),athleteDue=Object.values(p.athleteContracts||{}).filter(c=>c?.state==='active'&&weeks(c)<=12).length,staffDue=Object.values(p.staffContracts||{}).filter(c=>c?.state==='active'&&weeks(c)<=12).length,expiring=athleteDue+staffDue,commercialOpen=!deal&&wk()<48&&safe(()=>commercialOffers().some(o=>o.eligible),false),restrictionWeeks=Math.max(0,Number(p.restrictionUntil||0)-cw()),priorities=[];
 if(x.health!=='healthy')priorities.push({tab:'forecast',severity:x.health==='critical'?'critical':x.health==='restricted'?'high':'medium',title:x.health==='critical'?'Financial controls active':x.health==='restricted'?'Protect programme commitments':'Budget position needs watching',meta:`${Math.max(0,Math.round(x.runway))} weeks runway · projected ${cash(x.projected)} season end`});
 if(facilityIssues.length)priorities.push({tab:'facilities',severity:facilityIssues.some(([,f])=>f.incident)?'high':'medium',title:`${facilityIssues.length} facilit${facilityIssues.length===1?'y':'ies'} need attention`,meta:facilityIssues.some(([,f])=>f.incident)?'Operational decision outstanding':'Condition is reducing effective performance'});
 if(expiring)priorities.push({tab:'contracts',severity:'medium',title:`${expiring} programme contract${expiring===1?'':'s'} approaching expiry`,meta:'Athlete and staff agreements inside 12 weeks'});
 if(commercialOpen)priorities.push({tab:'income',severity:'opportunity',title:'Commercial partnership available',meta:'Eligible sponsorship offers are open for review'});
 return{health:x.health,available:Number(s.funding||0),weekly:Number(x.weekly.total||0),projected:Number(x.projected||0),runway:Number(x.runway||0),boardTrust:Number(p.boardTrust||0),restricted:restricted(p),restrictionWeeks,expiring,athleteDue,staffDue,facilityIssues:facilityIssues.length,commercialOpen,commercialPartner:deal?.name||null,priorities};
}
function openFinanceView(tab='overview'){const valid=['overview','income','expenditure','contracts','facilities','forecast','history'];UI.finance=valid.includes(tab)?tab:'overview';try{view('finance')}catch(_){}requestAnimationFrame(()=>{try{drawFinance2()}catch(_){}});return UI.finance}
'''
text = rep(text,
"function marketCard(c){const w=weak(c);return`<article class=\"pe-market-card\">",
home_api + "\nfunction marketCard(c){const w=weak(c);return`<article class=\"pe-market-card\">",
'home economy API')

text = rep(text,
"openStaffContract:openStaff,staffWorld:()=>staffWorld(),worldAthleteContract,programmeWorld:()=>programmeWorld(),renderFinance:drawFinance2,renderStaff:drawStaff2,debug:",
"openStaffContract:openStaff,staffWorld:()=>staffWorld(),worldAthleteContract,programmeWorld:()=>programmeWorld(),homeSummary,openFinanceView,renderFinance:drawFinance2,renderStaff:drawStaff2,debug:",
'export Home finance API')

text = rep(text,
"if(currentView==='finance')drawFinance2();if(currentView==='staff')drawStaff2()",
"if(currentView==='finance')drawFinance2();if(currentView==='staff')drawStaff2();if(currentView==='home')requestAnimationFrame(()=>safe(()=>drawHome(),null))",
'refresh Home after lazy economy boot')
p.write_text(text, encoding='utf-8')

# Home consumes the authority; it does not calculate finance independently.
p = Path('scripts/home-v2.js')
home = p.read_text(encoding='utf-8')
home = rep(home,
"function trainingQueue(){return safe(()=>window.__athleticsTrainingAttentionDecisions?.queue?.()||[],[])}",
"function trainingQueue(){return safe(()=>window.__athleticsTrainingAttentionDecisions?.queue?.()||[],[])}\nfunction financeSummary(){return safe(()=>window.AMProgrammeEconomy?.homeSummary?.(),null)}\nfunction openFinance(tab='overview'){const pe=window.AMProgrammeEconomy;if(typeof pe?.openFinanceView==='function'){pe.openFinanceView(tab);return}try{view('finance')}catch(_){}}",
'Home finance helpers')

home = rx(home,
r"function buildAgenda\(a,e,tq,scout\)\{.*?return rows\.slice\(0,7\);\n\}",
r'''function buildAgenda(a,e,tq,scout,finance){
 const rows=[];
 for(const x of a.slice(0,4))rows.push({kind:'action',id:x.actionId,time:actionDue(x),title:x.title,meta:x.blocks?'Required before progression':x.reason||'Decision pending'});
 for(const x of finance?.priorities?.slice(0,2)||[])rows.push({kind:'finance',id:x.tab,time:x.severity==='opportunity'?'OPPORTUNITY':String(x.severity||'').toUpperCase(),title:x.title,meta:x.meta});
 if(e)rows.push({kind:'event',time:`W${e.week}`,title:e.name||'Competition',meta:eventLabel(e)});
 if(tq.length)rows.push({kind:'training',time:'NOW',title:`Training needs attention`,meta:`${tq.length} athlete${tq.length===1?'':'s'} require review`});
 if(scout)rows.push({kind:'mail',id:scout.id,time:`W${scout.week||week()}`,title:scout.subject||'Scouting report',meta:'New scouting information'});
 return rows.slice(0,7);
}''',
'finance-aware manager agenda')

home = rep(home,
"const a=actions(),b=blockers(),squad=team(),np=pool(),e=next(),tq=trainingQueue(),scout=recentScoutMail();",
"const a=actions(),b=blockers(),squad=team(),np=pool(),e=next(),tq=trainingQueue(),scout=recentScoutMail(),fin=financeSummary();",
'Home finance state')
home = rep(home,
"const agenda=buildAgenda(a,e,tq,scout);",
"const agenda=buildAgenda(a,e,tq,scout,fin);",
'Home agenda finance input')
home = rep(home,
"<span><small>Actions</small><b>${a.length}</b></span><span><small>Unread</small><b>${unread}</b></span><span><small>Squad</small><b>${squad.length}</b></span><span><small>Funding</small><b>${esc(moneyText(s.funding))}</b></span>",
"<span><small>Actions</small><b>${a.length}</b></span><span><small>Unread</small><b>${unread}</b></span><span><small>Runway</small><b>${fin?Math.max(0,Math.round(fin.runway))+'W':'—'}</b></span><span><small>Funding</small><b>${esc(moneyText(s.funding))}</b></span>",
'Home header runway')

finance_card = r'''<section class="home-v2-card home-v2-finance ${esc(fin?.health||'healthy')}"><div class="home-v2-card-head"><strong>Programme Finance</strong><span>${fin?esc((fin.health||'healthy').toUpperCase()):'LOADING'}</span></div><div class="home-v2-card-body"><div class="home-v2-finance-grid"><div><small>AVAILABLE</small><strong>${fin?esc(moneyText(fin.available)):'—'}</strong></div><div><small>WEEKLY COST</small><strong>${fin?esc(moneyText(fin.weekly)):'—'}</strong></div><div><small>SEASON END</small><strong class="${fin&&fin.projected<0?'bad':''}">${fin?esc(moneyText(fin.projected)):'—'}</strong></div><div><small>BOARD</small><strong>${fin?Math.round(fin.boardTrust)+'/100':'—'}</strong></div></div><div class="home-v2-finance-note">${fin?.restricted?`Spending controls active${fin.restrictionWeeks?` · ${fin.restrictionWeeks} weeks remaining`:''}.`:fin?.priorities?.[0]?esc(fin.priorities[0].title):'No immediate financial action.'}</div></div><button class="home-v2-footer-link" data-home-v2-finance>OPEN FINANCE</button></section>
     '''
home = rep(home,
"<section class=\"home-v2-card home-v2-world\"><div><div class=\"home-v2-card-head\"><strong>Athletics World</strong>",
finance_card + "<section class=\"home-v2-card home-v2-world\"><div><div class=\"home-v2-card-head\"><strong>Athletics World</strong>",
'Home finance command card')

home = rep(home,
"root.querySelector('[data-home-v2-inbox]')?.addEventListener('click',()=>view('inbox'));",
"root.querySelector('[data-home-v2-inbox]')?.addEventListener('click',()=>view('inbox'));\n root.querySelector('[data-home-v2-finance]')?.addEventListener('click',()=>openFinance('overview'));",
'Home Finance button')
home = rep(home,
"else if(x.kind==='training')view('training');else if(x.kind==='mail')",
"else if(x.kind==='training')view('training');else if(x.kind==='finance')openFinance(x.id||'overview');else if(x.kind==='mail')",
'Finance agenda navigation')
home = rep(home,
"debug:()=>({actions:actions(),blockers:blockers(),nextEvent:next(),trainingAttention:trainingQueue().length})",
"debug:()=>({actions:actions(),blockers:blockers(),nextEvent:next(),trainingAttention:trainingQueue().length,finance:financeSummary()})",
'Home debug finance')
p.write_text(home, encoding='utf-8')

# Compact finance card; preserve the no-scroll desktop/iPad Home layout.
p = Path('styles/home-v2.css')
css = p.read_text(encoding='utf-8')
css = rep(css,
".home-v2-side{grid-area:side;display:grid;grid-template-rows:auto minmax(0,1fr);gap:10px;min-height:0}",
".home-v2-side{grid-area:side;display:grid;grid-template-rows:auto auto minmax(0,1fr);gap:10px;min-height:0}",
'Home side rows')
insert = r'''
.home-v2-finance .home-v2-card-head span{font-weight:950;letter-spacing:.06em}.home-v2-finance.watch .home-v2-card-head span{color:#f0c57f}.home-v2-finance.restricted .home-v2-card-head span,.home-v2-finance.critical .home-v2-card-head span{color:#ff9ba7}.home-v2-finance.healthy .home-v2-card-head span{color:#8ad9ad}
.home-v2-finance-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}.home-v2-finance-grid>div{min-width:0;padding:7px;border:1px solid var(--am-line-soft);border-radius:7px;background:rgba(7,22,32,.48)}.home-v2-finance-grid small,.home-v2-finance-grid strong{display:block}.home-v2-finance-grid small{font-size:5px;color:var(--am-faint);font-weight:900;letter-spacing:.07em}.home-v2-finance-grid strong{margin-top:2px;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.home-v2-finance-grid strong.bad{color:#ff9ba7}.home-v2-finance-note{margin-top:7px;color:var(--am-muted);font-size:7px;line-height:1.35}
'''
css = rep(css,
".home-v2-agenda{display:grid;gap:0;max-height:100%;overflow:auto;scrollbar-width:thin}",
insert + "\n.home-v2-agenda{display:grid;gap:0;max-height:100%;overflow:auto;scrollbar-width:thin}",
'Home finance styles')
css = rep(css,
".home-v2-side{grid-template-columns:1fr 1fr;grid-template-rows:none}",
".home-v2-side{grid-template-columns:1fr 1fr;grid-template-rows:auto auto}.home-v2-world{grid-column:1/-1}",
'Home tablet side layout')
css = rep(css,
".home-v2-primary,.home-v2-lower,.home-v2-side{grid-template-columns:1fr;min-height:0}",
".home-v2-primary,.home-v2-lower,.home-v2-side{grid-template-columns:1fr;min-height:0}.home-v2-world{grid-column:auto}",
'Home mobile world reset')
p.write_text(css, encoding='utf-8')

# Cache-bust Home and the lazy Programme Economy loader for iPad Safari.
p = Path('scripts/ui-cutover-v1.js')
cut = p.read_text(encoding='utf-8')
cut = rep(cut,"const BUILD='2026.09.13-aiathletes1';","const BUILD='2026.09.13-economyhome1';",'cutover build')
cut = rep(cut,"styles/programme-economy-v1.css?v=20260913-aiathletes1","styles/programme-economy-v1.css?v=20260913-economyhome1",'economy css cache')
cut = rep(cut,"scripts/programme-economy-v2.js?v=20260913-aiathletes1","scripts/programme-economy-v2.js?v=20260913-economyhome1",'economy js cache')
p.write_text(cut, encoding='utf-8')

p = Path('game.html')
html = p.read_text(encoding='utf-8')
html = rep(html,"styles/home-v2.css?v=20260910-home2","styles/home-v2.css?v=20260913-economyhome1",'Home css cache')
html = rep(html,"scripts/home-v2.js?v=20260910-home2","scripts/home-v2.js?v=20260913-economyhome1",'Home js cache')
html = rep(html,"scripts/ui-cutover-v1.js?v=20260913-aiathletes1","scripts/ui-cutover-v1.js?v=20260913-economyhome1",'cutover cache')
p.write_text(html, encoding='utf-8')
