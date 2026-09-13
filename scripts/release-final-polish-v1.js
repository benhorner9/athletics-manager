/* Athletics Manager — final pre-release behaviour polish · 2026-09-13
   Keeps routine National Pool trait changes out of the manager inbox and makes
   long-running training blocks understandable at the point of decision. */
(function(){
'use strict';
if(window.__amReleaseFinalPolishV1)return;
window.__amReleaseFinalPolishV1=1;

function patchTraitMailAuthority(){
  try{
    if(typeof changeAthleteTrait!=='function'||typeof traitState!=='function'||typeof ATHLETE_TRAITS==='undefined')return false;
    if(changeAthleteTrait.__amSquadMailOnly)return true;

    const patched=function(a,key,enabled,reason){
      if(!a||a.retired||!ATHLETE_TRAITS[key])return;
      const ts=traitState(a),definition=ATHLETE_TRAITS[key];
      if(!!ts.active[key]===enabled)return;

      if(enabled)ts.active[key]={season:s.game.season,week:s.game.week};
      else delete ts.active[key];

      const favourable=enabled===definition.positive;
      const title=`${enabled?'Gained':'Cleared'}: ${definition.name}`;
      const entry={season:s.game.season,week:s.game.week,title,reason};
      ts.history.push(entry);
      ts.history=ts.history.slice(-12);
      rememberAthlete(a,'Trait change',`${title}. ${reason}`);

      /* National Pool athletes continue to develop traits in the background, but
         routine trait movement is not a manager decision. Only active squad athletes
         generate performance-team trait mail. */
      const activeSquad=a.nation===managedNation()&&a.inSquad!==false;
      if(!activeSquad)return;

      const id=newMail(
        sender('performance'),
        `${favourable?'👍':'👎'} ${a.name}: ${title}`,
        `${reason} Current morale: ${athleteMorale(a)}/100. ${definition.rule}`,
        favourable?'traitGood':'traitConcern'
      );
      const mail=s.emails.find(m=>m.id===id);
      if(mail)mail.html=`<p>${athleteLink(a)}</p><h3>${profileEscape(title)}</h3><p>${profileEscape(reason)}</p><p>Morale: <strong>${athleteMorale(a)}/100</strong>. Morale has a small effect on training and competition readiness.</p><p>${profileEscape(definition.rule)}</p>`;
    };

    patched.__amSquadMailOnly=true;
    changeAthleteTrait=patched;
    try{window.changeAthleteTrait=patched}catch(_){ }
    return true;
  }catch(err){
    console.warn('[Athletics Manager] trait mail authority patch failed',err);
    return false;
  }
}

let clarityQueued=false;
function clarifyTrainingBlock(){
  clarityQueued=false;
  const root=document.getElementById('training');
  if(!root)return;

  root.querySelectorAll('.tr4-alert small').forEach(label=>{
    if(!/^adapted block$/i.test(String(label.textContent||'').trim()))return;
    label.textContent='Training block losing effect';
    label.title='This athlete has used the same development focus for at least nine weeks. Change Development Focus to restore a stronger training stimulus.';
    const holder=label.parentElement;
    if(holder&&!holder.querySelector('.am-training-block-explain')){
      const note=document.createElement('small');
      note.className='am-training-block-explain';
      note.textContent='Same focus for 9+ weeks — change Development Focus to refresh the stimulus.';
      holder.appendChild(note);
    }
  });
}
function scheduleClarity(){
  if(clarityQueued)return;
  clarityQueued=true;
  requestAnimationFrame(clarifyTrainingBlock);
}

patchTraitMailAuthority();
const training=document.getElementById('training');
if(training)new MutationObserver(scheduleClarity).observe(training,{childList:true,subtree:true});
scheduleClarity();
/* Give late compatibility layers one more chance to settle without allowing them to
   restore the old trait-mail rule. */
[250,750,1600,3200].forEach(ms=>setTimeout(()=>{patchTraitMailAuthority();scheduleClarity()},ms));
})();
