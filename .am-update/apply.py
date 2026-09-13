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

staff_world = r'''function staffWorld(){s.staffWorld??={version:1,freeAgents:[],movements:[],newsSeason:0,newsCount:0};const w=s.staffWorld;w.version=1;w.freeAgents=Array.isArray(w.freeAgents)?w.freeAgents:[];w.movements=Array.isArray(w.movements)?w.movements:[];if(Number(w.newsSeason)!==yr()){w.newsSeason=yr();w.newsCount=0}return w}
function staffRoles(){return Object.keys(typeof STAFF_DEF!=='undefined'?STAFF_DEF:ATTR)}
function coachAge(c){const base=Number(c?.ageAtCreation||c?.age||(34+hash(c?.id||c?.name||'coach')%24)),made=Number(c?.createdCareerYear||cy());return clamp(base+Math.max(0,cy()-made),24,85)}
function worldSalary(c,n=nation()){const rep=Number(c?.reputation||c?.economyProfile?.reputation||55),level=Number(c?.level||3);return Math.round((62000+rep*1450+level*8500)*costFactor(n)*inf()/5000)*5000}
function worldCoach(n,r,seed=0){const sd=hash(`${n}:${r}:${seed}:${Math.max(1,cy())}:staff-world`),scale=costFactor(n),level=clamp(Math.round(1+scale*1.5+(sd%3)),1,5),name=`${FN[sd%FN.length]} ${LN[(sd+11)%LN.length]}`,age=30+(sd%28),term=[52,104,156][sd%3],c=enrich(r,{id:`ws-${hash(`${n}-${r}-${seed}-${cy()}`)}`,name,role:r,level,nationality:n,ageAtCreation:age,createdCareerYear:cy(),worldStaff:true});const vals=Object.values(c.economyProfile.attributes||{}),rep=clamp(Math.round((vals.reduce((a,b)=>a+Number(b||0),0)/Math.max(1,vals.length))*4.35+(sd%9)),35,94);c.reputation=rep;c.expectedSalary=worldSalary({...c,reputation:rep},n);c.annualSalary=c.expectedSalary;c.preferredTerm=term;c.appointmentFee=Math.round(c.expectedSalary*.08/5000)*5000;c.employedNation=n;c.startCareerWeek=cw();c.endCareerWeek=cw()+term;return c}
function freeAgentAdd(c,from=null,reason=''){if(!c?.id)return;const w=staffWorld(),age=coachAge(c);if(age>=70)return;const x=enrich(c.role||'science',{...c,employedNation:null,lastEmployer:from||c.employedNation||c.lastEmployer||null,freeSinceCareerWeek:cw(),ageAtCreation:Number(c.ageAtCreation||age),createdCareerYear:Number(c.createdCareerYear||cy()),worldStaff:true});x.age=coachAge(x);x.expectedSalary=Number(x.expectedSalary||x.annualSalary||worldSalary(x));x.preferredTerm=Number(x.preferredTerm||104);x.freeReason=reason;w.freeAgents=w.freeAgents.filter(a=>String(a.id)!==String(x.id));w.freeAgents.unshift(x);w.freeAgents=w.freeAgents.filter(a=>coachAge(a)<70).slice(0,120)}
function freeAgentRemove(id){const w=staffWorld();w.freeAgents=w.freeAgents.filter(a=>String(a.id)!==String(id))}
function recordStaffWorldMove(c,from,to,r,reason=''){const w=staffWorld(),move={id:`swm-${Date.now()}-${w.movements.length}`,season:yr(),week:wk(),careerWeek:cw(),coachId:c?.id,name:c?.name||'Coach',role:r,from:from||null,to:to||null,reason};w.movements.push(move);w.movements=w.movements.slice(-240);const rep=Number(c?.reputation||c?.economyProfile?.reputation||0);if(to&&to!==nation()&&rep>=70&&Number(w.newsCount||0)<3){w.newsCount=Number(w.newsCount||0)+1;safe(()=>addNews('Staff',`${nlabel(to)} appoint ${c.name} as ${roleName(r)}`,`${c.name} has joined ${nlabel(to)}${from?` after leaving ${nlabel(from)}`:''}.`,`The ${nlabel(to)} programme has appointed ${c.name} as ${roleName(r)}. ${rep>=82?'The move is viewed as a significant high-performance appointment.':'The appointment adds new expertise to the programme.'}`,{nation:to,priority:rep>=82?'major':'normal'}),null)}return move}
function staffPriority(n,rank=99,grant=0){return Number(rank)<=18||Number(grant)>=4000000}
function ensureAIStaff(q,n){q.ai??={};q.ai.staff??={};q.ai.staffGeneration??={};for(const r of staffRoles()){if(q.ai.staff[r])continue;const gen=Number(q.ai.staffGeneration[r]||0);q.ai.staff[r]=worldCoach(n,r,gen);q.ai.staffGeneration[r]=gen+1}return q.ai.staff}
function existingAIStaff(){const rows=[];for(const [n,q] of Object.entries(s.programmeEconomies||{})){if(n===nation())continue;for(const [r,c] of Object.entries(q?.ai?.staff||{}))if(c)rows.push({...c,role:r,employedNation:n})}return rows}
function findAIEmployer(id){for(const [n,q] of Object.entries(s.programmeEconomies||{})){if(n===nation())continue;for(const [r,c] of Object.entries(q?.ai?.staff||{}))if(String(c?.id)===String(id))return{nation:n,role:r,coach:c,programme:q}}return null}
function aiHire(q,n,r,reason='appointment'){const w=staffWorld(),grant=Number(safe(()=>nationalIdentityBlueprint(n).annualGrant,2500000)),pool=w.freeAgents.filter(c=>c.role===r&&coachAge(c)<68).sort((a,b)=>Number(b.reputation||0)-Number(a.reputation||0)),afford=pool.find(c=>worldSalary(c,n)<=Math.max(110000,grant*.09)),c=afford?{...afford}:worldCoach(n,r,Number(q.ai.staffGeneration?.[r]||0));if(!afford){q.ai.staffGeneration??={};q.ai.staffGeneration[r]=Number(q.ai.staffGeneration[r]||0)+1}else freeAgentRemove(c.id);const from=c.lastEmployer||null,term=Number(c.preferredTerm||[52,104,156][hash(c.id+n)%3]);c.employedNation=n;c.annualSalary=worldSalary(c,n);c.expectedSalary=c.annualSalary;c.startCareerWeek=cw();c.endCareerWeek=cw()+term;c.age=coachAge(c);q.ai.staff[r]=c;recordStaffWorldMove(c,from,n,r,reason);return c}
function aiRelease(q,n,r,reason='contract expiry',retire=false){const c=q?.ai?.staff?.[r];if(!c)return null;delete q.ai.staff[r];if(!retire)freeAgentAdd(c,n,reason);recordStaffWorldMove(c,n,null,r,retire?'retired':reason);return c}
function takeAIEmployment(id,destination=nation()){const hit=findAIEmployer(id);if(!hit)return null;const{nation:from,role,coach,programme:q}=hit;delete q.ai.staff[role];recordStaffWorldMove(coach,from,destination,role,'poached');aiHire(q,from,role,'replacement appointment');return coach}
function priorityStaffNations(){const ranks={};safe(()=>nationRanks(),[]).forEach(([n],i)=>ranks[n]=i+1);return Object.keys(typeof NATIONS!=='undefined'?NATIONS:{}).filter(n=>n!==nation()&&staffPriority(n,ranks[n]||99,Number(safe(()=>nationalIdentityBlueprint(n).annualGrant,0))))}
function ensurePriorityStaff(){for(const n of priorityStaffNations()){const q=prog(n);ensureAIStaff(q,n)}}
function aiStaffSeason(q,n,rank,grant){if(!staffPriority(n,rank,grant))return;ensureAIStaff(q,n);const pressure=Number(q.ai.cash||0)<grant*.38;for(const r of staffRoles()){let c=q.ai.staff[r];if(!c){aiHire(q,n,r,'vacancy filled');continue}const age=coachAge(c),expired=Number(c.endCareerWeek||0)<=cw(),retire=age>=71||(age>=66&&(hash(`${c.id}-${yr()}-retire`)%100)<20);if(retire){aiRelease(q,n,r,'retirement',true);aiHire(q,n,r,'succession appointment');continue}if(expired){const keep=!pressure&&((Number(c.reputation||0)>=58)||((hash(`${c.id}-${yr()}-renew`)%100)<55));if(keep){c.startCareerWeek=cw();c.endCareerWeek=cw()+Number(c.preferredTerm||104);c.annualSalary=Math.round(Math.max(worldSalary(c,n),Number(c.annualSalary||0)*1.025)/5000)*5000;c.expectedSalary=c.annualSalary}else{aiRelease(q,n,r,'contract expiry');aiHire(q,n,r,'contract replacement')}}else if(pressure&&(hash(`${n}-${r}-${yr()}-cut`)%100)<7){aiRelease(q,n,r,'programme restructuring');aiHire(q,n,r,'lower-cost restructuring')}else if(!pressure&&Number(q.ai.cash||0)>grant*.85&&(hash(`${n}-${r}-${yr()}-upgrade`)%100)<10){const best=staffWorld().freeAgents.filter(x=>x.role===r&&coachAge(x)<68&&Number(x.reputation||0)>=Number(c.reputation||0)+7).sort((a,b)=>Number(b.reputation||0)-Number(a.reputation||0))[0];if(best&&worldSalary(best,n)<=grant*.095){aiRelease(q,n,r,'performance upgrade');aiHire(q,n,r,'performance appointment')}}}}
'''
text = rep(text,
"function enrich(r,c){if(!c)return c;const sd=hash(c.id||c.name||r);c.economyProfile??={};c.economyProfile.style??=['Analytical','Technical','Athlete-first','Demanding','Development-led','Championship-focused'][sd%6];c.economyProfile.reputation??=clamp(35+Number(c.level||1)*11+(sd%13),35,92);c.economyProfile.attributes??=cattrs(r,c);return c}",
"function enrich(r,c){if(!c)return c;const sd=hash(c.id||c.name||r);c.economyProfile??={};c.economyProfile.style??=['Analytical','Technical','Athlete-first','Demanding','Development-led','Championship-focused'][sd%6];c.economyProfile.reputation??=clamp(35+Number(c.level||1)*11+(sd%13),35,92);c.economyProfile.attributes??=cattrs(r,c);return c}\n"+staff_world,
'staff-world helpers')

# Expired player staff join the real market instead of disappearing.
text = rep(text,
"if(l<=0){c.state='expired';if(coach)safe(()=>recordCoachMove(coach,`Left ${nlabel()} at contract expiry.`),null);s.coaches[r]=null;",
"if(l<=0){c.state='expired';if(coach){safe(()=>recordCoachMove(coach,`Left ${nlabel()} at contract expiry.`),null);if(coachAge(coach)>=70)recordStaffWorldMove(coach,nation(),null,r,'retired');else freeAgentAdd({...coach,role:r,expectedSalary:Number(c.annualSalary||coachSalary(r,coach)),annualSalary:Number(c.annualSalary||0)},nation(),'contract expiry')}s.coaches[r]=null;",
'player staff expiry market')

# Candidate generation becomes unattached; employment comes from actual AI programme jobs.
new_candidate = r'''function candidate(r,i){const nations=Object.keys(typeof NATIONS!=='undefined'?NATIONS:{}),sd=hash(`${r}:${yr()}:${i}:pe2`),level=clamp(2+sd%4,2,5),name=`${FN[sd%FN.length]} ${LN[(sd+7)%LN.length]}`,nationality=nations.length?nations[(sd+13)%nations.length]:nation(),age=29+(sd%30),c=enrich(r,{id:`pe2-${r}-${yr()}-${i}-${sd%9999}`,name,role:r,level,nationality,ageAtCreation:age,createdCareerYear:cy(),worldStaff:true}),vals=Object.values(c.economyProfile.attributes),rep=clamp(Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*4.4+sd%10),35,94),salary=Math.round((68000+rep*1500+level*9000)*costFactor()*inf()/5000)*5000;return{...c,reputation:rep,expectedSalary:salary,preferredTerm:[52,104,156][sd%3],appointmentFee:Math.round(salary*.08/5000)*5000,employedNation:null,age}}
function refreshMarket(p=prog(),force=false){if(!force&&Number(p.staffMarket.season)===yr()&&p.staffMarket.candidates?.length)return;ensurePriorityStaff();const w=staffWorld(),employed=existingAIStaff(),out=[];for(const r of staffRoles()){const free=w.freeAgents.filter(c=>c.role===r&&coachAge(c)<70).sort((a,b)=>Number(b.reputation||0)-Number(a.reputation||0)).slice(0,4),jobs=employed.filter(c=>c.role===r).sort((a,b)=>Number(b.reputation||0)-Number(a.reputation||0)).slice(0,4),fresh=Array.from({length:3},(_,i)=>candidate(r,i)),seen=new Set();for(const c of [...free,...jobs,...fresh]){if(!c?.id||seen.has(String(c.id)))continue;seen.add(String(c.id));out.push({...c,age:coachAge(c),expectedSalary:Number(c.expectedSalary||c.annualSalary||worldSalary(c)),preferredTerm:Number(c.preferredTerm||104)})}}p.staffMarket={season:yr(),candidates:out}}
'''
text = rx(text, r'function candidate\(r,i\)\{.*?\}\nfunction refreshMarket\(p=prog\(\),force=false\)\{.*?\}\nfunction market\(r=null\)', new_candidate+'function market(r=null)', 'real staff market')

# Sign staff: poach real AI jobs, return replaced player coach to market, remove signed free agent.
old_sign = "function signStaff(r,c,o,renew,fee){const p=prog(),prev=s.coaches?.[r];if(!renew&&fee>Number(s.funding)){toastNow('Not enough available funding for the appointment cost');return}if(!renew&&fee)post(-fee,`${c.name} appointment and compensation`,'Staff',{role:r});if(prev&&!renew&&prev.id!==c.id)safe(()=>recordCoachMove(prev,`Left ${nlabel()} after replacement.`),null);const n=cw(),coach=enrich(r,{...c,joined:n,until:n+o.term,pay:o.salary,fee:0});"
new_sign = "function signStaff(r,c,o,renew,fee){const p=prog(),prev=s.coaches?.[r],prevContract=scon(r,p);if(!renew&&fee>Number(s.funding)){toastNow('Not enough available funding for the appointment cost');return}if(!renew&&fee)post(-fee,`${c.name} appointment and compensation`,'Staff',{role:r});if(!renew&&c.employedNation)takeAIEmployment(c.id,nation());freeAgentRemove(c.id);if(prev&&!renew&&prev.id!==c.id){safe(()=>recordCoachMove(prev,`Left ${nlabel()} after replacement.`),null);freeAgentAdd({...prev,role:r,expectedSalary:Number(prevContract?.annualSalary||coachSalary(r,prev)),annualSalary:Number(prevContract?.annualSalary||0)},nation(),'replaced')}const n=cw(),coach=enrich(r,{...c,employedNation:nation(),nationality:c.nationality||nation(),ageAtCreation:Number(c.ageAtCreation||coachAge(c)),createdCareerYear:Number(c.createdCareerYear||cy()),joined:n,until:n+o.term,pay:o.salary,fee:0});"
text = rep(text, old_sign, new_sign, 'real-world staff signing')
text = rep(text,
"p.staffContracts[r]={id:`staff-${coach.id}-${n}`,role:r,coachId:coach.id,startCareerWeek:n,endCareerWeek:n+o.term,annualSalary:o.salary,state:'active',warned:false};safe(()=>recordCoachMove(coach,`${renew?'Renewed as':'Appointed'} ${roleName(r)} for ${nlabel()}.`),null);",
"p.staffContracts[r]={id:`staff-${coach.id}-${n}`,role:r,coachId:coach.id,startCareerWeek:n,endCareerWeek:n+o.term,annualSalary:o.salary,state:'active',warned:false};coach.employedNation=nation();coach.annualSalary=o.salary;coach.expectedSalary=o.salary;coach.endCareerWeek=n+o.term;if(!renew)recordStaffWorldMove(coach,c.lastEmployer||c.employedNation||null,nation(),r,'player appointment');p.staffMarket.candidates=(p.staffMarket.candidates||[]).filter(x=>String(x.id)!==String(coach.id));safe(()=>recordCoachMove(coach,`${renew?'Renewed as':'Appointed'} ${roleName(r)} for ${nlabel()}.`),null);",
'record player appointment')

# Staff cards expose real age/nationality/employment context.
text = rep(text,
"<span>${c.employedNation?esc(nlabel(c.employedNation)):'Available'} · ${esc(c.economyProfile.style)}</span>",
"<span>${c.employedNation?esc(nlabel(c.employedNation)):'Available'} · ${esc(c.nationality? nlabel(c.nationality):'International')} · Age ${coachAge(c)} · ${esc(c.economyProfile.style)}</span>",
'market employment metadata')

# AI world sim now runs named staff departments.
new_world = r'''function worldSeason(p){if(typeof NATIONS==='undefined')return;const ranks={};safe(()=>nationRanks(),[]).forEach(([n],i)=>ranks[n]=i+1);staffWorld();for(const n of Object.keys(NATIONS)){const q=prog(n);if(n===nation())continue;const grant=Number(safe(()=>nationalIdentityBlueprint(n).annualGrant,2200000)),rank=ranks[n]||8,bonus=Math.max(0,6-rank)*120000,oper=grant*(.72+(hash(`${n}-${yr()}-cost`)%15)/100);q.ai.cash=Math.max(0,Number(q.ai.cash||grant)+grant+bonus-oper);q.ai.lastRank=rank;if(q.ai.cash>grant*.9){const up=Object.keys(FAC).filter(k=>q.facilities[k].level<5);if(up.length&&(hash(`${n}-${yr()}-invest`)%100)<35){const k=up[hash(`${n}-${yr()}-facility`)%up.length];q.facilities[k].level++;q.facilities[k].condition=100;q.ai.cash-=grant*.18}}aiStaffSeason(q,n,rank,grant)}refreshMarket(prog(),true)}
'''
text = rx(text, r'function worldSeason\(p\)\{.*?\}\nfunction processWeek2\(\)', new_world+'function processWeek2()', 'AI staff world simulation')

# Expose staff-world state for QA/debugging.
text = rep(text,
"openStaffContract:openStaff,renderFinance:drawFinance2,renderStaff:drawStaff2,debug:",
"openStaffContract:openStaff,staffWorld:()=>staffWorld(),renderFinance:drawFinance2,renderStaff:drawStaff2,debug:",
'export staff world')

p.write_text(text,encoding='utf-8')

# Cache bust dynamic Programme Economy runtime.
p=Path('scripts/ui-cutover-v1.js')
cut=p.read_text(encoding='utf-8')
cut=cut.replace("const BUILD='2026.09.13-facilities2';","const BUILD='2026.09.13-staffworld1';")
cut=cut.replace('styles/programme-economy-v1.css?v=20260913-facilities2','styles/programme-economy-v1.css?v=20260913-staffworld1')
cut=cut.replace('scripts/programme-economy-v2.js?v=20260913-facilities2','scripts/programme-economy-v2.js?v=20260913-staffworld1')
p.write_text(cut,encoding='utf-8')

p=Path('game.html')
game=p.read_text(encoding='utf-8').replace('scripts/ui-cutover-v1.js?v=20260913-facilities2','scripts/ui-cutover-v1.js?v=20260913-staffworld1')
p.write_text(game,encoding='utf-8')
print('Living staff world applied.')
