/* Athletics Manager — Calendar Training Cleanup V2 */
(function(){
'use strict';
if(window.__amCalendarTrainingCleanupV2)return;
window.__amCalendarTrainingCleanupV2=1;

function toastSafe(message){
  try{ if(typeof toast==='function') toast(message); }catch(_){ }
}

function hardHide(el){
  if(!el)return;
  el.hidden=true;
  el.setAttribute('aria-hidden','true');
  el.style.setProperty('display','none','important');
}

function cleanCalendar(){
  const root=document.getElementById('calendar');
  if(!root)return;

  const kind=document.getElementById('planKind');
  const campLabel=document.getElementById('campTypeLabel');
  const book=document.getElementById('bookPlan');

  /* Keep the legacy selects in the DOM only because the existing Calendar
     preview callback dereferences them. They are no longer player-facing. */
  if(kind){
    kind.value='testing';
    try{kind.dispatchEvent(new Event('change',{bubbles:false}));}catch(_){ }
    hardHide(kind.closest('label'));
  }
  hardHide(campLabel);

  if(book)book.textContent='BOOK TESTING DAY';

  /* Training Camps are managed solely from Training now. Remove every
     Calendar-side navigation/legend/control that suggests otherwise. */
  root.querySelectorAll('.calendar-legend .calendar-green').forEach(el=>{
    if(/training\s*camp/i.test(el.textContent||''))el.remove();
  });
  root.querySelectorAll('button,a').forEach(el=>{
    if(/open\s+training\s+camps/i.test((el.textContent||'').trim()))el.remove();
  });

  const layout=root.querySelector('.planner-layout');
  const calendarPanel=layout?.querySelector('section.panel');
  const planner=layout?.querySelector('aside.panel .planner-form');
  const calendarNote=calendarPanel?.querySelector('.planner-note');

  if(calendarNote){
    calendarNote.textContent='Select any date to plan its week. Competitions keep their existing schedule; squad testing can be booked for a selected week.';
  }

  /* Remove the temporary Training Camps hand-off copy. The Calendar is now
     deliberately focused on dates, commitments and squad testing. */
  planner?.querySelectorAll('.am-calendar-training-owner').forEach(el=>el.remove());

  root.querySelectorAll('.panel-h strong').forEach(el=>{
    if((el.textContent||'').trim()==='Booked activities & testing reports'){
      el.textContent='Testing reports & commitments';
    }
  });

  root.querySelectorAll('.panel-body').forEach(body=>{
    if((body.textContent||'').trim()==='No activities booked. Select a date to start planning.'){
      body.innerHTML='<p>No squad testing days booked.</p>';
    }
  });

  /* Legacy camp commitments can remain visible as schedule information, but
     they cannot be changed or cancelled from Calendar anymore. */
  try{
    const plans=typeof planList==='function'?planList():[];
    root.querySelectorAll('[data-cancel-plan]').forEach(button=>{
      const plan=plans.find(p=>String(p.id)===String(button.dataset.cancelPlan));
      if(plan?.kind==='camp')button.remove();
    });
  }catch(_){ }
}

/* Hard-disable the old Calendar camp booking path as well as removing its UI. */
if(typeof bookPlan==='function'){
  const legacyBookPlan=bookPlan;
  bookPlan=function(kind,type,ids,week){
    if(kind==='camp'){
      toastSafe('Training camps are managed from Training → Training Camps');
      return;
    }
    return legacyBookPlan.apply(this,arguments);
  };
}

if(typeof drawCalendar==='function'){
  const legacyDrawCalendar=drawCalendar;
  drawCalendar=function(){
    const result=legacyDrawCalendar.apply(this,arguments);
    cleanCalendar();
    return result;
  };
}

/* Covers a Calendar that was already open while the late Training layer loaded. */
try{
  if(typeof currentView!=='undefined'&&currentView==='calendar')cleanCalendar();
}catch(_){ }

window.__athleticsCalendarTrainingCleanup={version:2,clean:cleanCalendar};
})();
