from pathlib import Path

root=Path('.')

# Extend People Biography from birth identity into a persistent local club identity.
p=root/'scripts/people-biography-v1.js'
text=p.read_text(encoding='utf-8')
text=text.replace('Persistent date/place-of-birth identity for athletes and staff.','Persistent birth identity for athletes/staff plus local athletics-club identity for athletes.',1)
text=text.replace("const VERSION='1.0';","const VERSION='1.1';",1)
anchor="function nationLabel(code){try{return COUNTRIES?.[code]?.name||NATIONS?.[code]?.name||String(code||'Unknown')}catch(_){return String(code||'Unknown')}}"
insert="""const CLUB_IDENTITIES=[
 {key:'meridian',label:'Meridian'},{key:'vanguard',label:'Vanguard'},{key:'northstar',label:'Northstar'},{key:'forge',label:'Forge'},
 {key:'horizon',label:'Horizon'},{key:'apex',label:'Apex'},{key:'pulse',label:'Pulse'},{key:'crest',label:'Crest'}
];
const CLUB_FORMS={
 'GREAT BRITAIN':['AC','Harriers','Athletics Club'],USA:['Track Club','Athletics','Track & Field Club'],CANADA:['Track Club','Athletics Club'],
 JAMAICA:['Track Club','Athletics Club'],AUSTRALIA:['Athletics Club','Track Club'],NEW_ZEALAND:['Athletics Club','Track Club'],
 KENYA:['Athletics Club','Performance Club'],ETHIOPIA:['Athletics Club','Running Club'],UGANDA:['Athletics Club','Track Club'],
 SOUTH_AFRICA:['Athletics Club','Track Club'],NIGERIA:['Athletics Club','Track Club'],GHANA:['Athletics Club','Track Club'],
 FRANCE:['Athletics Club','Track Club'],GERMANY:['Athletics Club','Track Club'],ITALY:['Athletics Club','Track Club'],SPAIN:['Athletics Club','Track Club'],
 PORTUGAL:['Athletics Club','Track Club'],NETHERLANDS:['Athletics Club','Track Club'],BELGIUM:['Athletics Club','Track Club'],SWITZERLAND:['Athletics Club','Track Club'],
 SWEDEN:['Athletics Club','Track Club'],NORWAY:['Athletics Club','Track Club'],FINLAND:['Athletics Club','Track Club'],DENMARK:['Athletics Club','Track Club'],
 POLAND:['Athletics Club','Track Club'],CZECH_REPUBLIC:['Athletics Club','Track Club'],HUNGARY:['Athletics Club','Track Club'],UKRAINE:['Athletics Club','Track Club'],
 GREECE:['Athletics Club','Track Club'],IRELAND:['Athletics Club','Harriers'],TURKEY:['Athletics Club','Track Club'],SERBIA:['Athletics Club','Track Club'],
 CROATIA:['Athletics Club','Track Club'],SLOVENIA:['Athletics Club','Track Club'],ROMANIA:['Athletics Club','Track Club'],LITHUANIA:['Athletics Club','Track Club'],
 JAPAN:['Athletics Club','Track Club'],CHINA:['Athletics Club','Track Club'],INDIA:['Athletics Club','Track Club'],SOUTH_KOREA:['Athletics Club','Track Club'],
 BRAZIL:['Athletics Club','Track Club'],CUBA:['Athletics Club','Track Club'],MEXICO:['Athletics Club','Track Club'],ARGENTINA:['Athletics Club','Track Club']
};
function clubSlug(v){return String(v||'club').normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'club'}
function clubFor(nation,birthPlace,seed){const home=String(birthPlace||nationLabel(nation)),city=home.split(',')[0].trim()||nationLabel(nation),ident=CLUB_IDENTITIES[(seed>>>9)%CLUB_IDENTITIES.length],forms=CLUB_FORMS[nation]||['Athletics Club','Track Club'],form=forms[(seed>>>13)%forms.length],name=`${city} ${ident.label} ${form}`,id=`${clubSlug(nation)}:${clubSlug(city)}:${ident.key}:${clubSlug(form)}`;return{id,name,nation,home}}
"""+anchor
if anchor not in text: raise SystemExit('people biography nationLabel anchor missing')
text=text.replace(anchor,insert,1)
old="function ensureAthlete(a,state=typeof s!=='undefined'?s:null){if(!a)return a;const season=Number(state?.game?.season)||2027,seed=hash(`athlete|${a.id}|${a.name}|${a.nation}|${a.disc}`);a.birthNation??=a.nation||'GREAT BRITAIN';a.dateOfBirth??=isoFromAge(a.age,season,seed);a.birthPlace??=placeFor(a.birthNation,seed>>>3);return a}"
new="function ensureAthlete(a,state=typeof s!=='undefined'?s:null){if(!a)return a;const season=Number(state?.game?.season)||2027,seed=hash(`athlete|${a.id}|${a.name}|${a.nation}|${a.disc}`);a.birthNation??=a.nation||'GREAT BRITAIN';a.dateOfBirth??=isoFromAge(a.age,season,seed);a.birthPlace??=placeFor(a.birthNation,seed>>>3);const club=clubFor(a.nation||a.birthNation,a.birthPlace,seed);a.athleticsClubId??=club.id;a.athleticsClub??=club.name;a.athleticsClubNation??=club.nation;a.athleticsClubHome??=club.home;return a}"
if old not in text: raise SystemExit('ensureAthlete anchor missing')
text=text.replace(old,new,1)
old="function diagnostics(){const state=typeof s!=='undefined'?s:null,athletes=state?.athletes||[],coaches=[...Object.values(state?.coaches||{}),...Object.values(state?.management?.coachArchive||{})].filter(Boolean),missingAthletes=athletes.filter(a=>!a.dateOfBirth||!a.birthPlace).length,missingCoaches=coaches.filter(c=>!c.dateOfBirth||!c.birthPlace).length;return{version:VERSION,athletes:athletes.length,coaches:coaches.length,missingAthletes,missingCoaches,sampleAthlete:athletes[0]?{dateOfBirth:athletes[0].dateOfBirth,birthPlace:athletes[0].birthPlace}:null}}"
new="function diagnostics(){const state=typeof s!=='undefined'?s:null,athletes=state?.athletes||[],coaches=[...Object.values(state?.coaches||{}),...Object.values(state?.management?.coachArchive||{})].filter(Boolean),missingAthletes=athletes.filter(a=>!a.dateOfBirth||!a.birthPlace).length,missingClubs=athletes.filter(a=>!a.athleticsClubId||!a.athleticsClub||!a.athleticsClubHome).length,missingCoaches=coaches.filter(c=>!c.dateOfBirth||!c.birthPlace).length;return{version:VERSION,athletes:athletes.length,coaches:coaches.length,missingAthletes,missingClubs,missingCoaches,sampleAthlete:athletes[0]?{dateOfBirth:athletes[0].dateOfBirth,birthPlace:athletes[0].birthPlace,athleticsClubId:athletes[0].athleticsClubId,athleticsClub:athletes[0].athleticsClub,athleticsClubHome:athletes[0].athleticsClubHome}:null}}"
if old not in text: raise SystemExit('diagnostics anchor missing')
text=text.replace(old,new,1)
old="window.AMPeopleBiography={version:VERSION,places:PLACES,ensureAthlete,ensureCoach,ensureState,formatDate,refresh:()=>ensureState(),diagnostics};"
new="window.AMPeopleBiography={version:VERSION,places:PLACES,clubIdentities:CLUB_IDENTITIES,clubForms:CLUB_FORMS,clubFor,ensureAthlete,ensureCoach,ensureState,formatDate,refresh:()=>ensureState(),diagnostics};"
if old not in text: raise SystemExit('public API anchor missing')
text=text.replace(old,new,1)
old="try{UPDATES.unshift({date:'12 September 2026',title:'Athlete & Staff Biographies',items:['Athlete and coach profiles now include a persistent date of birth and place of birth.','Existing careers are migrated automatically; biography details remain fixed throughout the career.','New prospects and future staff receive nation-appropriate birthplace data when they enter the athletics world.','Biography data adds identity without changing existing age, development or retirement simulation rules.']})}catch(_){}"
new="try{UPDATES.unshift({date:'12 September 2026',title:'Athlete Clubs & Biographies',items:['Athlete profiles now include a persistent fictional Athletics Club alongside date and place of birth.','Clubs are tied to the athlete’s local birthplace and use stable IDs, home locations and nations for future domestic competition systems.','Existing careers are migrated automatically and future athletes receive their club when they enter the athletics world.','Club identity is visual only in this version and does not affect national selection, training or results.']})}catch(_){}"
if old not in text: raise SystemExit('update note anchor missing')
text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')

# Display the club in the canonical athlete profile beneath birthplace.
p=root/'scripts/squad-athlete-v2.js'
text=p.read_text(encoding='utf-8')
old="<span class=\"apv2-bio\">Date of birth ${esc(window.AMPeopleBiography?.formatDate?.(a.dateOfBirth)||a.dateOfBirth||'—')} · Place of birth ${esc(a.birthPlace||'—')}</span>"
new="<span class=\"apv2-bio\">Date of birth ${esc(window.AMPeopleBiography?.formatDate?.(a.dateOfBirth)||a.dateOfBirth||'—')} · Place of birth ${esc(a.birthPlace||'—')}<br>Athletics Club ${esc(a.athleticsClub||'—')}</span>"
if old not in text: raise SystemExit('athlete profile biography display anchor missing')
text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')

# Cache-bump the two changed runtime assets.
p=root/'game.html'
text=p.read_text(encoding='utf-8')
text=text.replace('scripts/people-biography-v1.js?v=20260912-biography1','scripts/people-biography-v1.js?v=20260912-biography2',1)
text=text.replace('scripts/squad-athlete-v2.js?v=20260911-squadcallup1','scripts/squad-athlete-v2.js?v=20260912-club1',1)
p.write_text(text,encoding='utf-8')

# Extend static source contracts using the current contract table.
p=root/'tools/static-regression.mjs'
text=p.read_text(encoding='utf-8')
anchor="  ['birthPlace','Place-of-birth persistence is missing'],"
if anchor not in text: raise SystemExit('static biography birthPlace contract anchor missing')
insert=anchor+"\n  ['athleticsClubId','Athletics Club stable ID persistence is missing'],\n  ['athleticsClubHome','Athletics Club home-location persistence is missing'],\n  ['function clubFor','Athletics Club deterministic assignment is missing'],"
text=text.replace(anchor,insert,1)
anchor="  ['Place of birth','Athlete profile must display place of birth'],"
if anchor not in text: raise SystemExit('static athlete profile birthplace contract anchor missing')
text=text.replace(anchor,anchor+"\n  ['Athletics Club','Athlete profile must display Athletics Club'],",1)
p.write_text(text,encoding='utf-8')

# Extend browserless runtime migration checks.
p=root/'tools/runtime-smoke.mjs'
text=p.read_text(encoding='utf-8')
old="if(!bio||bio.version!=='1.0')fail('People Biography diagnostics are invalid.');"
new="if(!bio||bio.version!=='1.1')fail('People Biography diagnostics are invalid.');"
if old not in text: raise SystemExit('runtime biography version anchor missing')
text=text.replace(old,new,1)
anchor="if(bio.sampleAthlete&&!bio.sampleAthlete.birthPlace)fail('People Biography athlete place of birth is missing.');"
if anchor not in text: raise SystemExit('runtime birthplace anchor missing')
insert=anchor+"\n   if(bio.missingClubs!==0)fail(`People Biography left ${bio.missingClubs} athlete club identities incomplete.`);\n   if(bio.sampleAthlete&&(!bio.sampleAthlete.athleticsClubId||!bio.sampleAthlete.athleticsClub||!bio.sampleAthlete.athleticsClubHome))fail('People Biography athlete athletics club identity is incomplete.');"
text=text.replace(anchor,insert,1)
p.write_text(text,encoding='utf-8')
