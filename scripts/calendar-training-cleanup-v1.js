/* Athletics Manager — Calendar Training Cleanup V1 */
(function(){
'use strict';
if(window.__amCalendarTrainingCleanupV1)return;
window.__amCalendarTrainingCleanupV1=1;

function toastSafe(message){
  try{ if(typeof toast==='function') toast(message); }catch(_){ }
}

function cleanCalendar(){
  const root=document.getElementById('calendar');
  if(!root)return;

  const kind=document.getElementById('planKind');
  const campLabel=document.getElementById('campTypeLabel');
  const book=document.getElementById('bookPlan');

  /* Keep the legacy controls in the DOM because the existing Calendar preview
     callbacks reference them, but make Squad Testing the only Calendar action. */
  if(kind){
    kind.value='testing';
    const label=kind.closest('label');
    if(label)label.hidden=true;
  }
  if(campLabel)campLabel.hidden=true;

  /* Re-run the Calendar's own preview using Testing so its copy/cost state is correct. */
  if(kind){
    try{kind.dispatchEvent(new Event('change',{bubbles:false}));}catch(_){ }
  }

  if(book)book.textContent='BOOK TESTING DAY';

  const layout=root.querySelector('.planner-layout');
  const calendarPanel=layout?.querySelector('section.panel');
  const planner=layout?.querySelector('aside.panel .planner-form');
  const calendarNote=calendarPanel?.querySelector('.planner-note');

  if(calendarNote){
    calendarNote.textContent='Select any date to plan its week. Competitions keep their existing schedule; squad testing can be booked for a selected week.';
  }

  if(planner && !planner.querySelector('.am-calendar-training-owner')){
    const note=document.createElement('div');
    note.className='planner-note am-calendar-training-owner';
    note.textContent='Training camps are managed in Training → Training Camps. Calendar planning is reserved for squad testing.';
    const firstLabel=planner.querySelector('label');
    if(firstLabel)planner.insertBefore(note,firstLabel);
    else planner.prepend(note);
  }

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
}

/* Hard-disable the old Calendar camp booking path as well as hiding it. */
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

window.__athleticsCalendarTrainingCleanup={version:1,clean:cleanCalendar};
})();
