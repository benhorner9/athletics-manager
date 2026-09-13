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

p=Path('scripts/programme-economy-v2.js')
text=p.read_text(encoding='utf-8')

# Governance state is additive and safe for existing saves.
text=rep(text,
"function base(n){return{version:V,nation:n,boardTrust:65,health:'healthy',restrictionUntil:0,lastWeekly:0,lastIncident:0,athleteContracts:{},athleteContractHistory:[],staffContracts:{},facilities:{},staffMarket:{season:0,candidates:[]},bonusPaid:{},migration:{done:false}}}",
"function base(n){return{version:V,nation:n,boardTrust:65,health:'healthy',restrictionUntil:0,lastWeekly:0,lastIncident:0,athleteContracts:{},athleteContractHistory:[],staffContracts:{},facilities:{},staffMarket:{season:0,candidates:[]},bonusPaid:{},governance:{lastHealth:'healthy',lastNotice:0,lastControl:0},migration:{done:false}}}",
'base governance')
text=rep(text,
"p.bonusPaid??={};p.migration??={done:false};s.programmeEconomies[n]=p}",
"p.bonusPaid??={};p.governance??={lastHealth:p.health||'healthy',lastNotice:0,lastControl:0};p.migration??={done:false};s.programmeEconomies[n]=p}",
'governance migration')
text=rep(text,
"function seedAI(p,n){p.ai??={cash:Number(safe(()=>nationalIdentityBlueprint(n).startFunding,2e6))||2e6};Object.keys(FAC).forEach(k=>{if(!p.facilities[k])p.facilities[k]=fseed(k,Number(safe(()=>nationalIdentityBlueprint(n).facilities?.[k],1))||1)})}",
"function seedAI(p,n){p.ai??={cash:Number(safe(()=>nationalIdentityBlueprint(n).startFunding,2e6))||2e6};p.ai.athleteContracts??={};p.ai.boardTrust=Number(p.ai.boardTrust??62);Object.keys(FAC).forEach(k=>{if(!p.facilities[k])p.facilities[k]=fseed(k,Number(safe(()=>nationalIdentityBlueprint(n).facilities?.[k],1))||1)})}",
'AI athlete contract state')

ai_athletes = r'''function programmeWorld(){s.programmeWorld??={version:1,movements:[],newsSeason:0,newsCount:0};const w=s.programmeWorld;if(Number(w.newsSeason)!==yr()){w.newsSeason=yr();w.newsCount=0}w.movements=Array.isArray(w.movements)?w.movements:[];return w}
function aiAthleteScore(a){const base=Number(safe(()=>performanceScore(a),a?.overall||50)),age=Number(a?.age||25),youth=age<=20?7:age<=23?4:age>=33?-5:0,form=(Number(a?.form||50)-50)*.04,points=Math.min(6,Number(a?.points||0)*.15);return base+youth+form+points}
function aiAthleteTarget(n,grant){return clamp(Math.round(5+costFactor(n)*3),5,10)}
function aiAthleteContract(a,n){const st=astatus(a),age=Number(a.age||24),term=age<=22?104:age>=31?52:(hash(`${a.id}-${yr()}-term`)%2?52:104);return{id:`ai-ath-${n}-${a.id}-${cw()}`,athleteId:a.id,status:st,startCareerWeek:cw(),endCareerWeek:cw()+term,annualFunding:statusPay(st,n),bonusRate:.06,state:'active'}}
function aiAthleteAnnual(q){return Object.values(q?.ai?.athleteContracts||{}).filter(c=>c?.state==='active').reduce((sum,c)=>sum+Number(c.annualFunding||0),0)}
function recordAIProgrammeMove(a,n,type,detail=''){const w=programmeWorld(),move={id:`pwm-${Date.now()}-${w.movements.length}`,season:yr(),week:wk(),careerWeek:cw(),nation:n,athleteId:a?.id,name:a?.name||'Athlete',type,detail};w.movements.push(move);w.movements=w.movements.slice(-240);const score=aiAthleteScore(a);if(Number(w.newsCount||0)<3&&((type==='released'&&score>=82)||(type==='funded'&&Number(a?.age||30)<=20&&score>=72))){w.newsCount=Number(w.newsCount||0)+1;if(type==='released')safe(()=>addNews('Federation',`${nlabel(n)} release ${a.name} from funded programme`,`${a.athleticsClub||'Club athletics'} resumes control of the athlete's normal programme.`,`${nlabel(n)} have chosen not to continue ${a.name}'s national high-performance funding. The athlete remains active through ${a.athleticsClub||'their athletics club'} and can be recalled in future.`,{nation:n,athleteId:a.id}),null);else safe(()=>addNews('Federation',`${nlabel(n)} add ${a.name} to national programme`,`The emerging ${safe(()=>discLabel(a.disc),a.disc)} athlete has received funded national support.`,`${a.name} has been added to the ${nlabel(n)} high-performance programme after recent development and competition evidence.`,{nation:n,athleteId:a.id}),null)}return move}
function worldAthleteContract(aOrId,n=null){const a=typeof aOrId==='object'?aOrId:(s.athletes||[]).find(x=>String(x.id)===String(aOrId)),nationKey=n||a?.nation;if(!a||!nationKey||nationKey===nation())return a?acon(a):null;const q=s.programmeEconomies?.[nationKey],c=q?.ai?.athleteContracts?.[a.id];return c&&c.state==='active'&&Number(c.endCareerWeek||0)>cw()?c:null}
function aiAthleteSeason(q,n,rank,grant){q.ai??={};q.ai.athleteContracts??={};const contracts=q.ai.athleteContracts,pool=(s.athletes||[]).filter(a=>a.nation===n&&!a.retired),byId=new Map(pool.map(a=>[String(a.id),a])),target=aiAthleteTarget(n,grant),pressure=Number(q.ai.cash||0)<grant*.42,ranked=[...pool].sort((a,b)=>aiAthleteScore(b)-aiAthleteScore(a)||Number(a.age||30)-Number(b.age||30)),preferred=new Set(ranked.slice(0,target+2).map(a=>String(a.id)));for(const[id,c]of Object.entries(contracts)){const a=byId.get(String(id));if(!a){delete contracts[id];continue}if(c.state!=='active'){delete contracts[id];continue}if(Number(c.endCareerWeek||0)<=cw()){if(preferred.has(String(id))&&(!pressure||aiAthleteScore(a)>=72)){const next=aiAthleteContract(a,n);next.id=`ai-ath-${n}-${a.id}-${cw()}-renew`;contracts[id]=next}else{delete contracts[id];recordAIProgrammeMove(a,n,'released','contract not renewed')}}}
 const cap=grant*(pressure?.34:.47);let current=Object.entries(contracts).filter(([,c])=>c?.state==='active'),annual=aiAthleteAnnual(q);if(pressure){const worst=[...current].map(([id,c])=>({id,c,a:byId.get(String(id))})).filter(x=>x.a).sort((x,y)=>(aiAthleteScore(x.a)/(Number(x.c.annualFunding)||1))-(aiAthleteScore(y.a)/(Number(y.c.annualFunding)||1)));while((annual>cap||current.length>target)&&worst.length&&current.length>Math.max(4,target-2)){const x=worst.shift();delete contracts[x.id];annual-=Number(x.c.annualFunding||0);current=current.filter(([id])=>String(id)!==String(x.id));recordAIProgrammeMove(x.a,n,'released','financial restructuring')}}
 const contracted=new Set(Object.keys(contracts).filter(id=>contracts[id]?.state==='active'));for(const a of ranked){if(contracted.size>=target)break;if(contracted.has(String(a.id)))continue;const c=aiAthleteContract(a,n),mustFill=contracted.size<Math.min(4,target);if(!mustFill&&annual+Number(c.annualFunding||0)>cap)continue;contracts[a.id]=c;contracted.add(String(a.id));annual+=Number(c.annualFunding||0);recordAIProgrammeMove(a,n,'funded','national programme place offered')}
 q.ai.athleteAnnual=annual;q.ai.athleteCount=contracted.size;return contracts}
function aiAnnualCosts(q,n,grant){const staff=Object.values(q?.ai?.staff||{}).reduce((sum,c)=>sum+Number(c?.annualSalary||c?.expectedSalary||0),0),athlete=aiAthleteAnnual(q),facilities=Object.keys(FAC).reduce((sum,k)=>sum+fup(k,q)*52,0),operations=grant*(.27+(hash(`${n}-${yr()}-ops`)%9)/100);return{staff,athlete,facilities,operations,total:staff+athlete+facilities+operations}}
'''
text = rep(text,
"function migrate(p){if(p.migration.done)return;",
ai_athletes+"\nfunction migrate(p){if(p.migration.done)return;",
'AI athlete programme helpers')

# Player board governance turns health states into explicit management pressure.
governance = r'''function applyGovernance(p,x=snap(p)){p.governance??={lastHealth:p.health||'healthy',lastNotice:0,lastControl:0};const g=p.governance,prev=g.lastHealth||'healthy',now=x.health,canNotice=cw()-Number(g.lastNotice||0)>=3;if(prev!==now&&canNotice){g.lastNotice=cw();if(now==='watch')mail('board','Budget position moved to watch',`The programme now has roughly ${Math.max(0,Math.round(x.runway))} weeks of operating runway. Existing commitments are secure, but the board expects new contracts and capital spending to be considered against the season-end forecast.`,'review');else if(now==='restricted')mail('board','Board requests spending restraint',`The current budget provides around ${Math.max(0,Math.round(x.runway))} weeks of operating runway. Protect athlete, staff and facility commitments before adding major new expenditure.`,'review');else if(now==='critical')mail('board','Financial controls activated',`The programme has entered a critical financial position. Major new staff appointments, athlete additions and facility upgrades are restricted while existing commitments are protected.`,'review');else if(now==='healthy'&&['watch','restricted','critical'].includes(prev))mail('board','Programme finances returned to a healthy position',`Available funding and current commitments now provide ${Math.max(0,Math.round(x.runway))} weeks of operating runway. Normal investment authority has been restored.`,'review')}
 if(Number(p.boardTrust||65)<30&&cw()-Number(g.lastControl||0)>=16){g.lastControl=cw();p.restrictionUntil=Math.max(Number(p.restrictionUntil||0),cw()+8);mail('board','Federation imposes temporary spending controls',`Board financial confidence has fallen to ${Math.round(p.boardTrust)}/100. Major discretionary spending is restricted for eight weeks while the programme demonstrates a stable operating position.`,'review')}g.lastHealth=now}
'''
text = rep(text,
"function runEconomy(){const p=prog();",
governance+"\nfunction runEconomy(){const p=prog();",
'board governance helper')

new_run = r'''function runEconomy(){const p=prog();if(Number(p.lastWeekly)===cw())return;p.lastWeekly=cw();facilityWeek(p);const w=weekly(p);if(w.athlete)post(-w.athlete,'Athlete programme payroll','Athlete Contracts',{recurring:true});if(w.staff)post(-w.staff,'Performance staff payroll','Staff',{recurring:true});if(w.facilities)post(-w.facilities,'National facility upkeep','Facilities',{recurring:true});if(w.operations)post(-w.operations,'Performance operations','Operations',{recurring:true});athleteExpiries(p);staffExpiries(p);let x=snap(p);if(x.health==='critical'){p.boardTrust=clamp(Number(p.boardTrust||65)-.4,0,100);p.restrictionUntil=Math.max(Number(p.restrictionUntil||0),cw()+4);if(Number(s.funding)<0&&Number(p.emergencySeason||0)!==yr()){const grant=Math.ceil((Math.abs(Number(s.funding))+w.total*6)/10000)*10000;p.emergencySeason=yr();post(grant,'Emergency federation stabilisation','Federation',{emergency:true});mail('board','Emergency programme funding approved',`The programme has entered a critical financial position. ${cash(grant)} has been released to protect existing commitments. Major new spending is restricted while the budget recovers.`,'review');x=snap(p)}}else if(x.health==='healthy')p.boardTrust=clamp(Number(p.boardTrust||65)+.08,0,100);applyGovernance(p,x)}
'''
text = rx(text,r'function runEconomy\(\)\{.*?\}\nfunction dialog\(\)',new_run+'function dialog()','weekly governance')

# Replace AI annual world economy with explicit programme costs and athlete/staff decisions.
new_world = r'''function worldSeason(p){if(typeof NATIONS==='undefined')return;const ranks={};safe(()=>nationRanks(),[]).forEach(([n],i)=>ranks[n]=i+1);staffWorld();programmeWorld();for(const n of Object.keys(NATIONS)){const q=prog(n);if(n===nation())continue;const grant=Number(safe(()=>nationalIdentityBlueprint(n).annualGrant,2200000)),rank=ranks[n]||8,bonus=Math.max(0,6-rank)*120000;q.ai.cash=Number(q.ai.cash||grant)+grant+bonus;q.ai.lastRank=rank;aiStaffSeason(q,n,rank,grant);aiAthleteSeason(q,n,rank,grant);const costs=aiAnnualCosts(q,n,grant);q.ai.operatingCost=costs.total;q.ai.cash=Math.max(0,Number(q.ai.cash||0)-costs.total);const reserve=costs.total/52*13;q.ai.health=q.ai.cash>=reserve*2?'healthy':q.ai.cash>=reserve?'watch':q.ai.cash>0?'restricted':'critical';q.ai.boardTrust=clamp(Number(q.ai.boardTrust||62)+(q.ai.health==='healthy'?1.5:q.ai.health==='critical'?-4:q.ai.health==='restricted'?-1.5:0),20,95);if(q.ai.cash>grant*.9){const up=Object.keys(FAC).filter(k=>q.facilities[k].level<5);if(up.length&&(hash(`${n}-${yr()}-invest`)%100)<35){const k=up[hash(`${n}-${yr()}-facility`)%up.length];q.facilities[k].level++;q.facilities[k].condition=100;q.ai.cash=Math.max(0,q.ai.cash-grant*.18)}}}refreshMarket(prog(),true)}
'''
text = rx(text,r'function worldSeason\(p\)\{.*?\}\nfunction processWeek2\(\)',new_world+'function processWeek2()','AI world economy')

# Season review rewards/penalises financial stewardship beyond a single binary state.
text = rep(text,
"function endSeason2(){const p=prog(),before=yr(),x=snap(p);p.boardTrust=clamp(p.boardTrust+(x.health==='healthy'?2:x.health==='critical'?-6:0),0,100);",
"function endSeason2(){const p=prog(),before=yr(),x=snap(p),reserve=x.weekly.total*13,seasonDelta=x.health==='healthy'?2:x.health==='watch'?0:x.health==='restricted'?-3:-6,efficiency=x.projected>reserve?1:0;p.boardTrust=clamp(p.boardTrust+seasonDelta+efficiency,0,100);",
'financial stewardship season review')

# Public authority for profile/world UI.
text = rep(text,
"openStaffContract:openStaff,staffWorld:()=>staffWorld(),renderFinance:drawFinance2,renderStaff:drawStaff2,debug:",
"openStaffContract:openStaff,staffWorld:()=>staffWorld(),worldAthleteContract,programmeWorld:()=>programmeWorld(),renderFinance:drawFinance2,renderStaff:drawStaff2,debug:",
'export world athlete contracts')
p.write_text(text,encoding='utf-8')

# Athlete profile can now show real AI national-programme status without changing event eligibility.
p=Path('scripts/squad-athlete-v2.js')
profile=p.read_text(encoding='utf-8')
profile=rep(profile,
"function programmeContract(a){return safe(()=>window.AMProgrammeEconomy?.activeAthleteContract?.(a),null)}",
"function programmeContract(a){const own=a?.nation===safe(()=>managedNation(),s?.managedNation);return own?safe(()=>window.AMProgrammeEconomy?.activeAthleteContract?.(a),null):safe(()=>window.AMProgrammeEconomy?.worldAthleteContract?.(a),null)}",
'world athlete contract lookup')
old_nonown="function programmeTab(a,own,squad){if(!own)return`<section class=\"apv2-card\"><div class=\"apv2-card-head\"><strong>Programme Status</strong><span>International athlete</span></div><div class=\"apv2-card-body\"><p class=\"apv2-action-note\">National programme contracts are managed by ${esc(safe(()=>nationName(a.nation),a.nation))}.</p></div></section>`;const c=programmeContract(a),hist=programmeContractHistory(a),club=esc(a.athleticsClub||'Athletics club'),left=programmeWeeks(c);"
new_nonown="function programmeTab(a,own,squad){if(!own){const c=programmeContract(a),left=programmeWeeks(c),club=esc(a.athleticsClub||'Athletics club'),nn=esc(safe(()=>nationName(a.nation),a.nation));return`<section class=\"apv2-card\"><div class=\"apv2-card-head\"><strong>Programme Status</strong><span>${c?nn+' high-performance programme':'Club-led athlete'}</span></div><div class=\"apv2-card-body\">${c?`<div class=\"apv2-contract-hero\"><div><small>STATUS</small><strong>${esc(c.status)}</strong><span>Funded national programme athlete</span></div><div><small>PROGRAMME</small><strong>${nn}</strong><span>National high-performance support</span></div><div><small>TERM REMAINING</small><strong>${left}W</strong><span>Current funded agreement</span></div><div><small>CLUB</small><strong>${club}</strong><span>Affiliation retained</span></div></div>`:`<div class=\"apv2-contract-club\"><small>CURRENT STATUS</small><strong>${club}</strong><span>No active national programme agreement is recorded. Club athletics controls the normal programme.</span></div>`}</div></section>`}const c=programmeContract(a),hist=programmeContractHistory(a),club=esc(a.athleticsClub||'Athletics club'),left=programmeWeeks(c);"
profile=rep(profile,old_nonown,new_nonown,'international programme profile')
p.write_text(profile,encoding='utf-8')

# Cache bust economy + athlete profile.
p=Path('scripts/ui-cutover-v1.js')
cut=p.read_text(encoding='utf-8')
cut=cut.replace("const BUILD='2026.09.13-staffworld1';","const BUILD='2026.09.13-aiathletes1';")
cut=cut.replace('styles/programme-economy-v1.css?v=20260913-staffworld1','styles/programme-economy-v1.css?v=20260913-aiathletes1')
cut=cut.replace('scripts/programme-economy-v2.js?v=20260913-staffworld1','scripts/programme-economy-v2.js?v=20260913-aiathletes1')
p.write_text(cut,encoding='utf-8')

p=Path('game.html')
game=p.read_text(encoding='utf-8')
game=game.replace('scripts/squad-athlete-v2.js?v=20260913-contracts1','scripts/squad-athlete-v2.js?v=20260913-aiathletes1')
game=game.replace('scripts/ui-cutover-v1.js?v=20260913-staffworld1','scripts/ui-cutover-v1.js?v=20260913-aiathletes1')
p.write_text(game,encoding='utf-8')
print('AI athlete programmes and board governance applied.')
