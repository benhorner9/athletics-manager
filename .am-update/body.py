from pathlib import Path

root=Path('.')

bio = r'''/* Athletics Manager — People Biography V1
   Persistent date/place-of-birth identity for athletes and staff. */
(()=>{'use strict';
if(window.AMPeopleBiography)return;
const VERSION='1.0';
const pad=n=>String(n).padStart(2,'0');
const hash=value=>{let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const PLACES={
 'GREAT BRITAIN':['London, England','Manchester, England','Birmingham, England','Glasgow, Scotland','Cardiff, Wales','Belfast, Northern Ireland'],
 USA:['Atlanta, Georgia','Los Angeles, California','Houston, Texas','New York City, New York','Miami, Florida','Chicago, Illinois'],
 JAMAICA:['Kingston, Jamaica','Spanish Town, Jamaica','Montego Bay, Jamaica','Mandeville, Jamaica'],
 GERMANY:['Berlin, Germany','Cologne, Germany','Hamburg, Germany','Munich, Germany','Leipzig, Germany'],
 CANADA:['Toronto, Ontario','Vancouver, British Columbia','Montreal, Quebec','Calgary, Alberta'],
 FRANCE:['Paris, France','Lyon, France','Marseille, France','Lille, France'],
 ITALY:['Rome, Italy','Milan, Italy','Turin, Italy','Naples, Italy'],
 AUSTRALIA:['Sydney, New South Wales','Melbourne, Victoria','Brisbane, Queensland','Perth, Western Australia'],
 JAPAN:['Tokyo, Japan','Osaka, Japan','Yokohama, Japan','Fukuoka, Japan'],
 NETHERLANDS:['Amsterdam, Netherlands','Rotterdam, Netherlands','Utrecht, Netherlands','Eindhoven, Netherlands'],
 POLAND:['Warsaw, Poland','Kraków, Poland','Poznań, Poland','Gdańsk, Poland'],
 SOUTH_AFRICA:['Johannesburg, South Africa','Cape Town, South Africa','Pretoria, South Africa','Durban, South Africa'],
 KENYA:['Nairobi, Kenya','Eldoret, Kenya','Kisii, Kenya','Nakuru, Kenya'],
 ETHIOPIA:['Addis Ababa, Ethiopia','Bekoji, Ethiopia','Adama, Ethiopia','Hawassa, Ethiopia'],
 NIGERIA:['Lagos, Nigeria','Abuja, Nigeria','Benin City, Nigeria','Port Harcourt, Nigeria'],
 BOTSWANA:['Gaborone, Botswana','Francistown, Botswana','Maun, Botswana'],
 UGANDA:['Kampala, Uganda','Jinja, Uganda','Mbale, Uganda'],
 MOROCCO:['Rabat, Morocco','Casablanca, Morocco','Marrakech, Morocco','Fez, Morocco'],
 ALGERIA:['Algiers, Algeria','Oran, Algeria','Constantine, Algeria'],
 EGYPT:['Cairo, Egypt','Alexandria, Egypt','Giza, Egypt'],
 GHANA:['Accra, Ghana','Kumasi, Ghana','Cape Coast, Ghana'],
 COTE_D_IVOIRE:["Abidjan, Côte d'Ivoire","Yamoussoukro, Côte d'Ivoire","Bouaké, Côte d'Ivoire"],
 SENEGAL:['Dakar, Senegal','Thiès, Senegal','Saint-Louis, Senegal'],
 NAMIBIA:['Windhoek, Namibia','Swakopmund, Namibia','Oshakati, Namibia'],
 ZAMBIA:['Lusaka, Zambia','Ndola, Zambia','Kitwe, Zambia'],
 SPAIN:['Madrid, Spain','Barcelona, Spain','Valencia, Spain','Seville, Spain'],
 PORTUGAL:['Lisbon, Portugal','Porto, Portugal','Braga, Portugal'],
 BELGIUM:['Brussels, Belgium','Antwerp, Belgium','Ghent, Belgium'],
 SWITZERLAND:['Zürich, Switzerland','Geneva, Switzerland','Lausanne, Switzerland'],
 SWEDEN:['Stockholm, Sweden','Gothenburg, Sweden','Malmö, Sweden'],
 NORWAY:['Oslo, Norway','Bergen, Norway','Trondheim, Norway'],
 FINLAND:['Helsinki, Finland','Tampere, Finland','Turku, Finland'],
 DENMARK:['Copenhagen, Denmark','Aarhus, Denmark','Odense, Denmark'],
 CZECH_REPUBLIC:['Prague, Czech Republic','Brno, Czech Republic','Ostrava, Czech Republic'],
 HUNGARY:['Budapest, Hungary','Debrecen, Hungary','Szeged, Hungary'],
 UKRAINE:['Kyiv, Ukraine','Lviv, Ukraine','Odesa, Ukraine','Dnipro, Ukraine'],
 GREECE:['Athens, Greece','Thessaloniki, Greece','Patras, Greece'],
 IRELAND:['Dublin, Ireland','Cork, Ireland','Galway, Ireland','Limerick, Ireland'],
 TURKEY:['Istanbul, Turkey','Ankara, Turkey','Izmir, Turkey','Bursa, Turkey'],
 SERBIA:['Belgrade, Serbia','Novi Sad, Serbia','Niš, Serbia'],
 CROATIA:['Zagreb, Croatia','Split, Croatia','Rijeka, Croatia'],
 SLOVENIA:['Ljubljana, Slovenia','Maribor, Slovenia','Kranj, Slovenia'],
 ROMANIA:['Bucharest, Romania','Cluj-Napoca, Romania','Iași, Romania'],
 LITHUANIA:['Vilnius, Lithuania','Kaunas, Lithuania','Klaipėda, Lithuania'],
 CHINA:['Beijing, China','Shanghai, China','Guangzhou, China','Nanjing, China'],
 INDIA:['New Delhi, India','Mumbai, India','Bengaluru, India','Chandigarh, India'],
 SOUTH_KOREA:['Seoul, South Korea','Busan, South Korea','Incheon, South Korea','Daegu, South Korea'],
 KAZAKHSTAN:['Almaty, Kazakhstan','Astana, Kazakhstan','Shymkent, Kazakhstan'],
 UZBEKISTAN:['Tashkent, Uzbekistan','Samarkand, Uzbekistan','Bukhara, Uzbekistan'],
 QATAR:['Doha, Qatar','Al Rayyan, Qatar'],
 BAHRAIN:['Manama, Bahrain','Riffa, Bahrain','Muharraq, Bahrain'],
 SAUDI_ARABIA:['Riyadh, Saudi Arabia','Jeddah, Saudi Arabia','Dammam, Saudi Arabia'],
 BRAZIL:['São Paulo, Brazil','Rio de Janeiro, Brazil','Belo Horizonte, Brazil','Recife, Brazil'],
 CUBA:['Havana, Cuba','Santiago de Cuba, Cuba','Camagüey, Cuba'],
 BAHAMAS:['Nassau, Bahamas','Freeport, Bahamas'],
 TRINIDAD_AND_TOBAGO:['Port of Spain, Trinidad and Tobago','San Fernando, Trinidad and Tobago','Arima, Trinidad and Tobago'],
 DOMINICAN_REPUBLIC:['Santo Domingo, Dominican Republic','Santiago de los Caballeros, Dominican Republic','La Vega, Dominican Republic'],
 PUERTO_RICO:['San Juan, Puerto Rico','Ponce, Puerto Rico','Mayagüez, Puerto Rico'],
 COLOMBIA:['Bogotá, Colombia','Medellín, Colombia','Cali, Colombia'],
 MEXICO:['Mexico City, Mexico','Guadalajara, Mexico','Monterrey, Mexico'],
 ARGENTINA:['Buenos Aires, Argentina','Córdoba, Argentina','Rosario, Argentina'],
 GRENADA:["St George's, Grenada",'Gouyave, Grenada'],
 BARBADOS:['Bridgetown, Barbados','Speightstown, Barbados'],
 NEW_ZEALAND:['Auckland, New Zealand','Wellington, New Zealand','Christchurch, New Zealand','Hamilton, New Zealand']
};
function nationLabel(code){try{return COUNTRIES?.[code]?.name||NATIONS?.[code]?.name||String(code||'Unknown')}catch(_){return String(code||'Unknown')}}
function placeFor(nation,seed){const list=PLACES[nation]||[nationLabel(nation)];return list[seed%list.length]}
function isoFromAge(age,season,seed){const a=Math.max(15,Math.min(80,Number(age)||25)),year=(Number(season)||2027)-a,month=1+((seed>>>5)%12),days=[31,28,31,30,31,30,31,31,30,31,30,31],day=1+((seed>>>11)%days[month-1]);return `${year}-${pad(month)}-${pad(day)}`}
function formatDate(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso||'')))return '—';const [y,m,d]=String(iso).split('-').map(Number),months=['January','February','March','April','May','June','July','August','September','October','November','December'];return `${d} ${months[m-1]||''} ${y}`.trim()}
function ensureAthlete(a,state=typeof s!=='undefined'?s:null){if(!a)return a;const season=Number(state?.game?.season)||2027,seed=hash(`athlete|${a.id}|${a.name}|${a.nation}|${a.disc}`);a.birthNation??=a.nation||'GREAT BRITAIN';a.dateOfBirth??=isoFromAge(a.age,season,seed);a.birthPlace??=placeFor(a.birthNation,seed>>>3);return a}
function ensureCoach(c,state=typeof s!=='undefined'?s:null,source=null){if(!c)return c;const seed=hash(`coach|${c.id||source?.id}|${c.name||source?.name}|${c.role||source?.role}`),originSeason=Number(c.originSeason)||Number(state?.game?.season)||2027,baseAge=Number(c.age)||Number(source?.age)||40;c.birthNation??=source?.birthNation||source?.nation||c.prior||source?.prior||(typeof managedNation==='function'?managedNation():'GREAT BRITAIN');c.dateOfBirth??=isoFromAge(baseAge,originSeason,seed);c.birthPlace??=placeFor(c.birthNation,seed>>>4);if(source){source.birthNation??=c.birthNation;source.dateOfBirth??=c.dateOfBirth;source.birthPlace??=c.birthPlace}return c}
function ensureState(state=typeof s!=='undefined'?s:null){if(!state)return state;(state.athletes||[]).forEach(a=>ensureAthlete(a,state));Object.values(state.coaches||{}).filter(Boolean).forEach(c=>ensureCoach(c,state));Object.values(state.management?.coachArchive||{}).filter(Boolean).forEach(c=>ensureCoach(c,state));return state}
const oldMakeAthletes=typeof makeAthletes==='function'?makeAthletes:null;if(oldMakeAthletes)makeAthletes=function(...args){return oldMakeAthletes.apply(this,args).map(a=>ensureAthlete(a,{game:{season:2027}}))};
const oldMakeInitialPool=typeof makeInitialPool==='function'?makeInitialPool:null;if(oldMakeInitialPool)makeInitialPool=function(...args){const rows=oldMakeInitialPool.apply(this,args),state=typeof s!=='undefined'&&s?s:{game:{season:2027}};return rows.map(a=>ensureAthlete(a,state))};
const oldFresh=typeof fresh==='function'?fresh:null;if(oldFresh)fresh=function(...args){return ensureState(oldFresh.apply(this,args))};
const oldLoad=typeof load==='function'?load:null;if(oldLoad)load=function(...args){const out=oldLoad.apply(this,args);ensureState();return out};
const oldSave=typeof save==='function'?save:null;if(oldSave)save=function(...args){ensureState();return oldSave.apply(this,args)};
const oldCoachDossier=typeof coachDossier==='function'?coachDossier:null;if(oldCoachDossier)coachDossier=function(c,...args){return ensureCoach(oldCoachDossier.call(this,c,...args),typeof s!=='undefined'?s:null,c)};
ensureState();
function diagnostics(){const state=typeof s!=='undefined'?s:null,athletes=state?.athletes||[],coaches=[...Object.values(state?.coaches||{}),...Object.values(state?.management?.coachArchive||{})].filter(Boolean),missingAthletes=athletes.filter(a=>!a.dateOfBirth||!a.birthPlace).length,missingCoaches=coaches.filter(c=>!c.dateOfBirth||!c.birthPlace).length;return{version:VERSION,athletes:athletes.length,coaches:coaches.length,missingAthletes,missingCoaches,sampleAthlete:athletes[0]?{dateOfBirth:athletes[0].dateOfBirth,birthPlace:athletes[0].birthPlace}:null}}
window.AMPeopleBiography={version:VERSION,places:PLACES,ensureAthlete,ensureCoach,ensureState,formatDate,refresh:()=>ensureState(),diagnostics};
try{UPDATES.unshift({date:'12 September 2026',title:'Athlete & Staff Biographies',items:['Athlete and coach profiles now include a persistent date of birth and place of birth.','Existing careers are migrated automatically; biography details remain fixed throughout the career.','New prospects and future staff receive nation-appropriate birthplace data when they enter the athletics world.','Biography data adds identity without changing existing age, development or retirement simulation rules.']})}catch(_){}
})();
'''
(root/'scripts/people-biography-v1.js').write_text(bio,encoding='utf-8')

html=root/'game.html'; text=html.read_text(encoding='utf-8')
old='<script src="scripts/nation-world-v1.js?v=20260912-nations64-2"></script>\n<script src="scripts/sprint-expansion.js?v=20260908-update10"></script>'
if old not in text:
    old='<script src="scripts/nation-world-v1.js?v=20260912-nations64-1"></script>\n<script src="scripts/sprint-expansion.js?v=20260908-update10"></script>'
new='<script src="scripts/nation-world-v1.js?v=20260912-nations64-2"></script>\n<script src="scripts/people-biography-v1.js?v=20260912-biography1"></script>\n<script src="scripts/sprint-expansion.js?v=20260908-update10"></script>'
if old not in text: raise SystemExit('nation-world loader anchor not found in game.html')
html.write_text(text.replace(old,new,1),encoding='utf-8')

ath=root/'scripts/squad-athlete-v2.js'; text=ath.read_text(encoding='utf-8')
old="const dialog=$('athleteProfile'),a=(s.athletes||[]).find(x=>String(x.id)===String(profileId));if(!dialog||!a){closeAthleteProfile();return}"
new="const dialog=$('athleteProfile'),a=(s.athletes||[]).find(x=>String(x.id)===String(profileId));if(!dialog||!a){closeAthleteProfile();return}window.AMPeopleBiography?.ensureAthlete?.(a,s);"
if old not in text: raise SystemExit('athlete renderProfile anchor not found')
text=text.replace(old,new,1)
old="${esc(safe(()=>flag(a.nation),'')+' '+safe(()=>nationName(a.nation),a.nation))} · Age ${Number(a.age)||'—'} · ${esc(a.tier||'Athlete')}</p><div class=\"apv2-tags\">"
new="${esc(safe(()=>flag(a.nation),'')+' '+safe(()=>nationName(a.nation),a.nation))} · Age ${Number(a.age)||'—'} · ${esc(a.tier||'Athlete')}<br><span class=\"apv2-bio\">Date of birth ${esc(window.AMPeopleBiography?.formatDate?.(a.dateOfBirth)||a.dateOfBirth||'—')} · Place of birth ${esc(a.birthPlace||'—')}</span></p><div class=\"apv2-tags\">"
if old not in text: raise SystemExit('athlete identity line anchor not found')
ath.write_text(text.replace(old,new,1),encoding='utf-8')

staff=root/'scripts/staff-finance-v2.js'; text=staff.read_text(encoding='utf-8')
old="const dossier=safe(()=>coachDossier(c),{...c,history:[],results:{},style:'Professional',age:40,originSeason:season()}),r=profileResults(dossier)"
new="const dossier=safe(()=>coachDossier(c),{...c,history:[],results:{},style:'Professional',age:40,originSeason:season()});window.AMPeopleBiography?.ensureCoach?.(dossier,gs(),c);const r=profileResults(dossier)"
if old not in text: raise SystemExit('coach dossier anchor not found')
text=text.replace(old,new,1)
old="<p>Age ${age} · ${esc(dossier.style||'Professional')} approach<br>${current?`${esc(nationLabel())} · ${left} weeks remaining`:candidate?'Available for recruitment':'Former programme staff'}</p>"
new="<p>Age ${age} · ${esc(dossier.style||'Professional')} approach<br><span class=\"sfv2-profile-bio\">Date of birth ${esc(window.AMPeopleBiography?.formatDate?.(dossier.dateOfBirth)||dossier.dateOfBirth||'—')} · Place of birth ${esc(dossier.birthPlace||'—')}</span><br>${current?`${esc(nationLabel())} · ${left} weeks remaining`:candidate?'Available for recruitment':'Former programme staff'}</p>"
if old not in text: raise SystemExit('coach profile identity line anchor not found')
staff.write_text(text.replace(old,new,1),encoding='utf-8')

reg=root/'tools/static-regression.mjs'; text=reg.read_text(encoding='utf-8')
old=" 'scripts/nation-world-v1.js',\n 'scripts/inbox-decision-core-v1.js',"
new=" 'scripts/nation-world-v1.js',\n 'scripts/people-biography-v1.js',\n 'scripts/inbox-decision-core-v1.js',"
if old not in text: raise SystemExit('requiredScripts nation-world anchor not found')
text=text.replace(old,new,1)
old="before('scripts/game.js','scripts/nation-world-v1.js');\nbefore('scripts/nation-world-v1.js','scripts/ui-platform-v1.js');"
new="before('scripts/game.js','scripts/nation-world-v1.js');\nbefore('scripts/nation-world-v1.js','scripts/people-biography-v1.js');\nbefore('scripts/people-biography-v1.js','scripts/squad-athlete-v2.js');\nbefore('scripts/people-biography-v1.js','scripts/staff-finance-v2.js');\nbefore('scripts/nation-world-v1.js','scripts/ui-platform-v1.js');"
if old not in text: raise SystemExit('script order anchor not found')
text=text.replace(old,new,1)
old="const sourceContracts={\n 'scripts/nation-world-v1.js':["
new="const sourceContracts={\n 'scripts/people-biography-v1.js':[\n  ['window.AMPeopleBiography','People Biography public authority is missing'],\n  ['function ensureAthlete','Athlete biography migration is missing'],\n  ['function ensureCoach','Coach biography migration is missing'],\n  ['dateOfBirth','Date-of-birth persistence is missing'],\n  ['birthPlace','Place-of-birth persistence is missing'],\n  ['function formatDate','British-English biography date formatter is missing']\n ],\n 'scripts/nation-world-v1.js':["
if old not in text: raise SystemExit('source contract anchor not found')
text=text.replace(old,new,1)
old=" 'scripts/home-v2.js':["
new=" 'scripts/squad-athlete-v2.js':[\n  ['Date of birth','Athlete profile must display date of birth'],\n  ['Place of birth','Athlete profile must display place of birth'],\n  ['AMPeopleBiography','Athlete profile must use persistent biography data']\n ],\n 'scripts/staff-finance-v2.js':[\n  ['Date of birth','Coach profile must display date of birth'],\n  ['Place of birth','Coach profile must display place of birth'],\n  ['AMPeopleBiography','Coach profile must use persistent biography data']\n ],\n 'scripts/home-v2.js':["
if old not in text: raise SystemExit('profile contract insertion anchor not found')
reg.write_text(text.replace(old,new,1),encoding='utf-8')

smoke=root/'tools/runtime-smoke.mjs'; text=smoke.read_text(encoding='utf-8')
old="'AMFirstTimeExperienceV2','AMRelease','__athleticsRegression','AMLiveBroadcastV4'"
new="'AMFirstTimeExperienceV2','AMRelease','__athleticsRegression','AMLiveBroadcastV4','AMPeopleBiography'"
if old not in text: raise SystemExit('requiredGlobals anchor not found')
text=text.replace(old,new,1)
anchor=" console.log('[smoke] runtime globals and snapshot checked');"
insert=""" if(w.AMPeopleBiography){
  try{
   w.ensureCoaches?.();
   w.AMPeopleBiography.refresh();
   const bio=w.AMPeopleBiography.diagnostics();
   if(!bio||bio.version!=='1.0')fail('People Biography diagnostics are invalid.');
   if(bio.missingAthletes!==0)fail(`People Biography left ${bio.missingAthletes} athlete biographies incomplete.`);
   if(bio.sampleAthlete&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(bio.sampleAthlete.dateOfBirth||''))fail('People Biography athlete date is not stored as ISO YYYY-MM-DD.');
   if(bio.sampleAthlete&&!bio.sampleAthlete.birthPlace)fail('People Biography athlete place of birth is missing.');
   if(bio.sampleAthlete&&w.AMPeopleBiography.formatDate(bio.sampleAthlete.dateOfBirth)==='—')fail('People Biography date formatter failed.');
  }catch(err){fail(`People Biography diagnostics threw: ${err?.stack||err}`)}
 }
 console.log('[smoke] runtime globals and snapshot checked');"""
if anchor not in text: raise SystemExit('runtime smoke insertion anchor not found')
smoke.write_text(text.replace(anchor,insert,1),encoding='utf-8')
