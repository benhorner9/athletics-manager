/* Athletics Manager — People Biography V1
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
