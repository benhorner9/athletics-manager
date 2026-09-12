/* Athletics Manager — Attribute Scouting V1
   Individual scouting workflow for narrowing player-facing 1–20 attribute ranges.
   Exact underlying attributes remain owned by AMAthleteAttributes. */
(function(){
'use strict';
if(window.AMAttributeScouting)return;

const VERSION='1.0';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
const safe=(fn,fallback)=>{try{const v=fn();return v==null?fallback:v}catch(_){return fallback}};
function gs(){return typeof s!=='undefined'?s:null}
function now(){const st=gs();return Number(st?.game?.careerWeek||st?.game?.week||1)}
function season(){return Number(gs()?.game?.season||0)}
function week(){return Number(gs()?.game?.week||1)}
function scoutLevel(){return clamp(gs()?.staff?.scout||1,1,5)}
function athlete(id){return (gs()?.athletes||[]).find(a=>String(a.id)===String(id))||null}
function root(){const st=gs();if(!st)return null;st.scouting??={};st.scouting.attributeIntel??={};st.scouting.reports??=[];st.scouting.watchlistIds??=[];return st.scouting.attributeIntel}
function record(a,create=true){const store=root();if(!store||!a)return null;const id=String(a.id);if(!store[id]&&create)store[id]={reports:0,bestScoutLevel:0,pending:null,lastReport:null};return store[id]||null}
function isManagedSquad(a){return !!a&&safe(()=>a.nation===managedNation(),false)&&a.inSquad!==false&&!a.retired}
function exactFromScouting(a){if(isManagedSquad(a))return true;const r=record(a,false);if(!r)return false;return Number(r.reports)>=4||(Number(r.reports)>=3&&Number(r.bestScoutLevel)>=4)}
function durationFor(level=scoutLevel()){return level>=5?2:level===4?3:level===3?4:level===2?5:6}
function confidenceBonus(a){const r=record(a,false);if(!r)return 0;const reports=Number(r.reports)||0,best=Number(r.bestScoutLevel)||0;return Math.min(42,reports*(7+best*1.5))}
function knowledge(a){const r=record(a,false);return{reports:Number(r?.reports)||0,bestScoutLevel:Number(r?.bestScoutLevel)||0,pending:r?.pending||null,lastReport:r?.lastReport||null,confidenceBonus:confidenceBonus(a),exact:exactFromScouting(a)}}
function pendingWeeks(a){const p=record(a,false)?.pending;if(!p)return 0;return Math.max(0,Number(p.dueCareerWeek||now())-now())}
function status(a){
 if(!a)return{state:'unavailable',label:'Unavailable',disabled:true};
 if(isManagedSquad(a))return{state:'squad',label:'Exact — squad knowledge',disabled:true,exact:true};
 if(exactFromScouting(a))return{state:'complete',label:'Fully scouted',disabled:true,exact:true};
 const r=record(a,false);if(r?.pending){const left=pendingWeeks(a);return{state:'pending',label:`Scouting · ${left||'due'}${left?'w':''}`,disabled:true,weeks:left,reports:Number(r.reports)||0}};
 const reports=Number(r?.reports)||0;return{state:'ready',label:reports?'Scout again':'Scout athlete',disabled:false,reports,duration:durationFor()};
}
function addWatch(a){const st=gs();if(!st||!a)return;st.scouting??={};st.scouting.watchlistIds=Array.isArray(st.scouting.watchlistIds)?st.scouting.watchlistIds:[];if(!st.scouting.watchlistIds.some(id=>String(id)===String(a.id)))st.scouting.watchlistIds.push(a.id)}
function request(id){
 const a=typeof id==='object'?id:athlete(id);if(!a)return false;
 const st=status(a);if(st.disabled){safe(()=>toast(st.label),null);return false}
 const r=record(a,true),level=scoutLevel(),duration=durationFor(level);r.pending={startedCareerWeek:now(),dueCareerWeek:now()+duration,scoutLevel:level};addWatch(a);safe(()=>save(),null);safe(()=>toast(`${a.name} scouting started · report in ${duration} week${duration===1?'':'s'}`),null);return true;
}
function reportCopy(a,r){const model=safe(()=>window.AMAthleteAttributes?.assess?.(a),null),top=model?.attributes?.slice().sort((x,y)=>Number(y.mid||0)-Number(x.mid||0)).slice(0,3)||[];const attrs=top.map(x=>`${x.label} ${x.display}`).join(' · ');return `${a.name}, ${safe(()=>discLabel(a.disc),a.disc)}. Attribute assessment updated${attrs?`: ${attrs}`:'.'} ${model?.exact?'The performance team now considers these attribute ratings resolved.':'Further scouting can narrow the remaining ranges.'}`}
function complete(a,r){
 const level=Number(r.pending?.scoutLevel)||scoutLevel();r.reports=(Number(r.reports)||0)+1;r.bestScoutLevel=Math.max(Number(r.bestScoutLevel)||0,level);r.lastReport={careerWeek:now(),season:season(),week:week(),scoutLevel:level};r.pending=null;
 const st=gs();st.scouting.reports.push({athleteId:a.id,season:season(),week:week(),reason:'Individual attribute assessment'});
 safe(()=>newMail(sender('pathway'),`Scouting report: ${a.name}`,reportCopy(a,r),'scouting'),null);
}
function processDue(){const store=root(),st=gs();if(!store||!st)return 0;let completed=0;for(const [id,r] of Object.entries(store)){if(!r?.pending||Number(r.pending.dueCareerWeek)>now())continue;const a=athlete(id);if(!a){r.pending=null;continue}complete(a,r);completed++}if(completed)safe(()=>save(),null);return completed}

if(typeof onWeekStart==='function'){
 const legacyOnWeekStart=onWeekStart;
 onWeekStart=function(...args){const out=legacyOnWeekStart.apply(this,args);processDue();return out};
}

window.AMAttributeScouting=Object.freeze({version:VERSION,request,status,knowledge,confidenceBonus,exactFromScouting,processDue,durationFor,diagnostics:()=>({version:VERSION,scoutLevel:scoutLevel(),active:Object.values(root()||{}).filter(r=>r?.pending).length,tracked:Object.keys(root()||{}).length})});
})();
