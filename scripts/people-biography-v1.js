/* Athletics Manager — People Biography V1
   Persistent birth identity for athletes/staff plus local athletics-club identity for athletes. */
(()=>{'use strict';
if(window.AMPeopleBiography)return;
const VERSION='1.1';
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
const CLUB_IDENTITIES=[
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
function clubSlug(v){return String(v||'club').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'club'}
function clubFor(nation,birthPlace,seed){const home=String(birthPlace||nationLabel(nation)),city=home.split(',')[0].trim()||nationLabel(nation),ident=CLUB_IDENTITIES[(seed>>>9)%CLUB_IDENTITIES.length],forms=CLUB_FORMS[nation]||['Athletics Club','Track Club'],form=forms[(seed>>>13)%forms.length],name=`${city} ${ident.label} ${form}`,id=`${clubSlug(nation)}:${clubSlug(city)}:${ident.key}:${clubSlug(form)}`;return{id,name,nation,home}}
function nationLabel(code){try{return COUNTRIES?.[code]?.name||NATIONS?.[code]?.name||String(code||'Unknown')}catch(_){return String(code||'Unknown')}}
function placeFor(nation,seed){const list=PLACES[nation]||[nationLabel(nation)];return list[seed%list.length]}
function isoFromAge(age,season,seed){const a=Math.max(15,Math.min(80,Number(age)||25)),year=(Number(season)||2027)-a,month=1+((seed>>>5)%12),days=[31,28,31,30,31,30,31,31,30,31,30,31],day=1+((seed>>>11)%days[month-1]);return `${year}-${pad(month)}-${pad(day)}`}
function formatDate(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso||'')))return '—';const [y,m,d]=String(iso).split('-').map(Number),months=['January','February','March','April','May','June','July','August','September','October','November','December'];return `${d} ${months[m-1]||''} ${y}`.trim()}
function ensureAthlete(a,state=typeof s!=='undefined'?s:null){if(!a)return a;const season=Number(state?.game?.season)||2027,seed=hash(`athlete|${a.id}|${a.name}|${a.nation}|${a.disc}`);a.birthNation??=a.nation||'GREAT BRITAIN';a.dateOfBirth??=isoFromAge(a.age,season,seed);a.birthPlace??=placeFor(a.birthNation,seed>>>3);const club=clubFor(a.nation||a.birthNation,a.birthPlace,seed);a.athleticsClubId??=club.id;a.athleticsClub??=club.name;a.athleticsClubNation??=club.nation;a.athleticsClubHome??=club.home;return a}
function ensureCoach(c,state=typeof s!=='undefined'?s:null,source=null){if(!c)return c;const seed=hash(`coach|${c.id||source?.id}|${c.name||source?.name}|${c.role||source?.role}`),originSeason=Number(c.originSeason)||Number(state?.game?.season)||2027,baseAge=Number(c.age)||Number(source?.age)||40;c.birthNation??=source?.birthNation||source?.nation||c.prior||source?.prior||(typeof managedNation==='function'?managedNation():'GREAT BRITAIN');c.dateOfBirth??=isoFromAge(baseAge,originSeason,seed);c.birthPlace??=placeFor(c.birthNation,seed>>>4);if(source){source.birthNation??=c.birthNation;source.dateOfBirth??=c.dateOfBirth;source.birthPlace??=c.birthPlace}return c}
function ensureState(state=typeof s!=='undefined'?s:null){if(!state)return state;(state.athletes||[]).forEach(a=>ensureAthlete(a,state));Object.values(state.coaches||{}).filter(Boolean).forEach(c=>ensureCoach(c,state));Object.values(state.management?.coachArchive||{}).filter(Boolean).forEach(c=>ensureCoach(c,state));return state}
const oldMakeAthletes=typeof makeAthletes==='function'?makeAthletes:null;if(oldMakeAthletes)makeAthletes=function(...args){return oldMakeAthletes.apply(this,args).map(a=>ensureAthlete(a,{game:{season:2027}}))};
const oldMakeInitialPool=typeof makeInitialPool==='function'?makeInitialPool:null;if(oldMakeInitialPool)makeInitialPool=function(...args){const rows=oldMakeInitialPool.apply(this,args),state=typeof s!=='undefined'&&s?s:{game:{season:2027}};return rows.map(a=>ensureAthlete(a,state))};
const oldFresh=typeof fresh==='function'?fresh:null;if(oldFresh)fresh=function(...args){return ensureState(oldFresh.apply(this,args))};
const oldLoad=typeof load==='function'?load:null;if(oldLoad)load=function(...args){const out=oldLoad.apply(this,args);ensureState();return out};
const oldSave=typeof save==='function'?save:null;if(oldSave)save=function(...args){ensureState();return oldSave.apply(this,args)};
const oldCoachDossier=typeof coachDossier==='function'?coachDossier:null;if(oldCoachDossier)coachDossier=function(c,...args){return ensureCoach(oldCoachDossier.call(this,c,...args),typeof s!=='undefined'?s:null,c)};
ensureState();
function diagnostics(){const state=typeof s!=='undefined'?s:null,athletes=state?.athletes||[],coaches=[...Object.values(state?.coaches||{}),...Object.values(state?.management?.coachArchive||{})].filter(Boolean),missingAthletes=athletes.filter(a=>!a.dateOfBirth||!a.birthPlace).length,missingClubs=athletes.filter(a=>!a.athleticsClubId||!a.athleticsClub||!a.athleticsClubHome).length,missingCoaches=coaches.filter(c=>!c.dateOfBirth||!c.birthPlace).length;return{version:VERSION,athletes:athletes.length,coaches:coaches.length,missingAthletes,missingClubs,missingCoaches,sampleAthlete:athletes[0]?{dateOfBirth:athletes[0].dateOfBirth,birthPlace:athletes[0].birthPlace,athleticsClubId:athletes[0].athleticsClubId,athleticsClub:athletes[0].athleticsClub,athleticsClubHome:athletes[0].athleticsClubHome}:null}}
window.AMPeopleBiography={version:VERSION,places:PLACES,clubIdentities:CLUB_IDENTITIES,clubForms:CLUB_FORMS,clubFor,ensureAthlete,ensureCoach,ensureState,formatDate,refresh:()=>ensureState(),diagnostics};
try{UPDATES.unshift({date:'12 September 2026',title:'Athlete Clubs & Biographies',items:['Athlete profiles now include a persistent fictional Athletics Club alongside date and place of birth.','Clubs are tied to the athlete’s local birthplace and use stable IDs, home locations and nations for future domestic competition systems.','Existing careers are migrated automatically and future athletes receive their club when they enter the athletics world.','Club identity is visual only in this version and does not affect national selection, training or results.']})}catch(_){}
})();
