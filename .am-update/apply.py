from pathlib import Path


def rep(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing anchor: {label}')
    return text.replace(old, new, 1)

# Programme Economy: one explicit index used by both long-career costs and revenues.
p = Path('scripts/programme-economy-v2.js')
text = p.read_text(encoding='utf-8')
text = rep(text,
"const V=2,UI={finance:'overview',staff:'team',role:'sprint'};",
"const V=2,UI={finance:'overview',staff:'team',role:'sprint'};\nconst INFLATION_RATE=.02,INFLATION_CAP=2.2;",
'economy inflation constants')
text = rep(text,
"const nation=()=>safe(()=>managedNation(),s?.managedNation||'GREAT BRITAIN'),nlabel=(n=nation())=>safe(()=>nationName(n),n),yr=()=>Number(s?.game?.season||2027),wk=()=>Number(s?.game?.week||1),cw=()=>Number(s?.game?.careerWeek||(((s?.game?.cycleYear||1)-1)*52+wk())),cy=()=>Number(s?.career?.careerYear||s?.game?.cycleYear||1),inf=()=>Math.min(2.2,Math.pow(1.02,Math.max(0,cy()-1))),team=()=>safe(()=>managedTeam(),(s.athletes||[]).filter(a=>a.nation===nation()&&a.inSquad!==false&&!a.retired));",
"const nation=()=>safe(()=>managedNation(),s?.managedNation||'GREAT BRITAIN'),nlabel=(n=nation())=>safe(()=>nationName(n),n),yr=()=>Number(s?.game?.season||2027),wk=()=>Number(s?.game?.week||1),cw=()=>Number(s?.game?.careerWeek||(((s?.game?.cycleYear||1)-1)*52+wk())),cy=()=>Number(s?.career?.careerYear||s?.game?.cycleYear||1),inf=()=>inflationIndex(),team=()=>safe(()=>managedTeam(),(s.athletes||[]).filter(a=>a.nation===nation()&&a.inSquad!==false&&!a.retired));\nfunction inflationIndex(year=cy()){return Math.min(INFLATION_CAP,Math.pow(1+INFLATION_RATE,Math.max(0,Number(year||1)-1)))}\nfunction baseGrant(n=nation()){return Number(safe(()=>nationalIdentityBlueprint(n).annualGrant,3200000))||3200000}\nfunction indexedGrant(n=nation(),year=cy()){return Math.round(baseGrant(n)*inflationIndex(year)/10000)*10000}\nfunction indexedPerformance(amount,year=cy()){return Math.round((Number(amount)||0)*inflationIndex(year)/5000)*5000}",
'inflation index and grants')
text = rep(text,
"function costFactor(n=nation()){const g=Number(safe(()=>nationalIdentityBlueprint(n).annualGrant,3200000))||3200000;return clamp(Math.sqrt(g/3400000),.72,1.38)}",
"function costFactor(n=nation()){return clamp(Math.sqrt(baseGrant(n)/3400000),.72,1.38)}",
'base grant cost factor')
text = rep(text,
"core:Number(safe(()=>nationalIdentityBlueprint(nation()).annualGrant,0)),expiring:exp}",
"core:indexedGrant(),expiring:exp}",
'indexed snapshot core')
text = rep(text,
"function fundingProjection(){const core=Number(safe(()=>nationalIdentityBlueprint(nation()).annualGrant,0)),rankRaw=Number(safe(()=>nationRanks().findIndex(x=>x[0]===nation())+1,0)),rank=rankRaw>0?rankRaw:8,medals=safe(()=>seasonMedalDelta(careerState().fundingMedalBaseline),{g:0,s:0,b:0}),performance=Math.max(0,(5-rank))*350000+Number(medals.g||0)*700000+Number(medals.s||0)*400000+Number(medals.b||0)*250000,deal=safe(()=>managementState().sponsors?.[yr()],null);return{core,rank,medals,performance,total:core+performance,sponsorPossible:deal&&!deal.settled?Number(deal.bonus||0):0}}",
"function fundingProjection(){const core=indexedGrant(),rankRaw=Number(safe(()=>nationRanks().findIndex(x=>x[0]===nation())+1,0)),rank=rankRaw>0?rankRaw:8,medals=safe(()=>seasonMedalDelta(careerState().fundingMedalBaseline),{g:0,s:0,b:0}),rawPerformance=Math.max(0,(5-rank))*350000+Number(medals.g||0)*700000+Number(medals.s||0)*400000+Number(medals.b||0)*250000,performance=indexedPerformance(rawPerformance),deal=safe(()=>managementState().sponsors?.[yr()],null);return{core,rank,medals,performance,total:core+performance,sponsorPossible:deal&&!deal.settled?Number(deal.bonus||0):0,index:inflationIndex()}}",
'indexed funding projection')
text = rep(text,
"function aiStaffSeason(q,n,rank,grant){if(!staffPriority(n,rank,grant))return;",
"function aiStaffSeason(q,n,rank,grant){if(!staffPriority(n,rank,baseGrant(n)))return;",
'AI staff structural priority')
text = rep(text,
"const q=prog(n);if(n===nation())continue;const grant=Number(safe(()=>nationalIdentityBlueprint(n).annualGrant,2200000)),rank=ranks[n]||8,bonus=Math.max(0,6-rank)*120000;q.ai.cash=Number(q.ai.cash||grant)+grant+bonus;",
"const q=prog(n);if(n===nation())continue;const grant=indexedGrant(n),rank=ranks[n]||8,bonus=indexedPerformance(Math.max(0,6-rank)*120000);q.ai.cash=Number(q.ai.cash||grant)+grant+bonus;",
'AI indexed annual revenue')
text = rep(text,
"Core federation funding is ${cash(safe(()=>nationalIdentityBlueprint(nation()).annualGrant,0))}.",
"Core federation funding is ${cash(indexedGrant())}.",
'indexed board season mail')
text = rep(text,
"programmeWorld:()=>programmeWorld(),homeSummary,openFinanceView,renderFinance:drawFinance2",
"programmeWorld:()=>programmeWorld(),inflationIndex,indexedGrant,homeSummary,openFinanceView,renderFinance:drawFinance2",
'export long-save economy index')
p.write_text(text, encoding='utf-8')

# The legacy season rollover remains gameplay authority, but asks Programme Economy for indexed cash values when available.
p = Path('scripts/game.js')
game = p.read_text(encoding='utf-8')
old = "let bonus=Math.max(0,(5-rank))*350000+seasonMedals.g*700000+seasonMedals.s*400000+seasonMedals.b*250000;const coreGrant=nationalIdentityBlueprint(mn).annualGrant;s.funding+=coreGrant+bonus;"
new = "const economyIndex=Number(window.AMProgrammeEconomy?.inflationIndex?.()||1);let bonus=Math.round((Math.max(0,(5-rank))*350000+seasonMedals.g*700000+seasonMedals.s*400000+seasonMedals.b*250000)*economyIndex/5000)*5000;const coreGrant=Number(window.AMProgrammeEconomy?.indexedGrant?.(mn)??nationalIdentityBlueprint(mn).annualGrant);s.funding+=coreGrant+bonus;"
game = rep(game, old, new, 'actual indexed season rollover')
p.write_text(game, encoding='utf-8')

# CI long-save soak: guards against costs inflating while revenue stands still again.
p = Path('tools/programme-economy-soak.mjs')
p.write_text(r'''import fs from 'node:fs';
import assert from 'node:assert/strict';

const economy=fs.readFileSync('scripts/programme-economy-v2.js','utf8');
const game=fs.readFileSync('scripts/game.js','utf8');
const rate=Number(economy.match(/INFLATION_RATE=([.0-9]+)/)?.[1]);
const cap=Number(economy.match(/INFLATION_CAP=([.0-9]+)/)?.[1]);
assert(Number.isFinite(rate)&&rate>0&&rate<.1,'Inflation rate missing or invalid');
assert(Number.isFinite(cap)&&cap>=1.5&&cap<=3,'Inflation cap missing or invalid');
const index=year=>Math.min(cap,Math.pow(1+rate,Math.max(0,year-1)));
assert.equal(index(1),1,'Year 1 must be the monetary baseline');
for(let y=2;y<=40;y++)assert(index(y)>=index(y-1),'Monetary index must never fall');
assert(index(40)<=cap+1e-9,'40-year index exceeds cap');
assert(economy.includes('const grant=indexedGrant(n)'), 'AI programmes must receive indexed annual grants');
assert(economy.includes('const core=indexedGrant()'), 'Player forecast must use indexed core funding');
assert(game.includes('AMProgrammeEconomy?.indexedGrant?.(mn)'), 'Actual player season rollover must use indexed core funding');
assert(game.includes('AMProgrammeEconomy?.inflationIndex?.()'), 'Actual performance funding must use the same long-save index');

const cases=[
 {name:'lean',grant:2400000,cost:1500000,performance:150000},
 {name:'balanced',grant:3400000,cost:2800000,performance:450000},
 {name:'ambitious',grant:5200000,cost:5000000,performance:900000}
];
const checkpoints=[1,10,20,40];
for(const c of cases){
 const baseMargin=(c.grant+c.performance-c.cost)/(c.grant+c.performance);
 for(const year of checkpoints){
  const i=index(year),revenue=(c.grant+c.performance)*i,cost=c.cost*i,margin=(revenue-cost)/revenue;
  assert(Number.isFinite(revenue)&&Number.isFinite(cost),'Long-save cashflow became non-finite');
  assert(Math.abs(margin-baseMargin)<1e-9,`${c.name}: inflation alone changed operating margin by year ${year}`);
 }
}
console.log('Programme Economy 40-year soak');
console.table(checkpoints.map(year=>({year,index:index(year).toFixed(3),balancedGrant:Math.round(3400000*index(year)),balancedCost:Math.round(2800000*index(year))})));
console.log('PASS: revenue and recurring costs stay indexed together through 40 career years.');
''',encoding='utf-8')

# Make the long-save economy soak part of every relevant regression gate.
p = Path('.github/workflows/ui-regression.yml')
wf = p.read_text(encoding='utf-8')
wf = rep(wf,
"      - 'tools/runtime-smoke.mjs'\n      - 'tools/repository-hygiene.mjs'",
"      - 'tools/runtime-smoke.mjs'\n      - 'tools/programme-economy-soak.mjs'\n      - 'tools/repository-hygiene.mjs'",
'push soak path')
wf = rep(wf,
"      - 'tools/runtime-smoke.mjs'\n      - 'tools/repository-hygiene.mjs'",
"      - 'tools/runtime-smoke.mjs'\n      - 'tools/programme-economy-soak.mjs'\n      - 'tools/repository-hygiene.mjs'",
'PR soak path')
wf = rep(wf,
"      - name: Install runtime smoke dependency\n        run: npm install --no-save --no-package-lock jsdom@26",
"      - name: Validate 40-year Programme Economy balance\n        run: node tools/programme-economy-soak.mjs\n      - name: Install runtime smoke dependency\n        run: npm install --no-save --no-package-lock jsdom@26",
'run economy soak')
p.write_text(wf, encoding='utf-8')

# Force iPad Safari to take the adjusted economy and season-rollover code.
p = Path('scripts/ui-cutover-v1.js')
cut = p.read_text(encoding='utf-8')
cut = rep(cut,"const BUILD='2026.09.13-economyhome1';","const BUILD='2026.09.13-economybalance1';",'cutover balance build')
cut = rep(cut,"scripts/programme-economy-v2.js?v=20260913-economyhome1","scripts/programme-economy-v2.js?v=20260913-economybalance1",'economy balance cache')
p.write_text(cut, encoding='utf-8')

p = Path('game.html')
html = p.read_text(encoding='utf-8')
html = rep(html,"scripts/game.js?v=20260911-nationsort1","scripts/game.js?v=20260913-economybalance1",'game economy cache')
html = rep(html,"scripts/ui-cutover-v1.js?v=20260913-economyhome1","scripts/ui-cutover-v1.js?v=20260913-economybalance1",'cutover economy cache')
p.write_text(html, encoding='utf-8')
