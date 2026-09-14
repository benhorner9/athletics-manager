/* Athletics Manager — Training Attention V4 Authority
   Keeps every Training "Needs Attention" count tied to one visible, actionable queue. */
(function(){
'use strict';
if(window.__amTrainingAttentionV4Authority)return;
const training=window.AMTrainingSystem2;
if(!training||typeof training.attentionRows!=='function')return;
window.__amTrainingAttentionV4Authority=1;

let attentionOpen=false,scheduled=false,applying=false;
const root=()=>document.getElementById('training');
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const labelFor=a=>{try{return typeof discLabel==='function'?discLabel(a?.disc):a?.disc||'Athlete'}catch(_){return a?.disc||'Athlete'}};

function rows(){
 try{return (training.attentionRows()||[]).filter(row=>row?.a)}catch(err){console.warn('[Training Attention V4] attentionRows unavailable',err);return[]}
}
function detail(row){
 const label=String(row?.label||'Training review');
 const fatigue=Math.round(Number(row?.a?.fatigue||0));
 if(/critical/i.test(label))return'Training load is critical. Reduce the load or move the athlete into Recovery before adding more work.';
 if(/fatigue/i.test(label))return`Fatigue is ${fatigue}/100. Reduce the training demand or move the athlete into Recovery.`;
 if(/adapt/i.test(label))return'This training block has run long enough for adaptation to reduce its development effect. Review the athlete’s focus.';
 return'The current training plan needs a manager decision before it should be left unchanged.';
}
function queue(){return rows().map(row=>({a:row.a,issue:{key:String(row.label||'training-review').toLowerCase().replace(/\s+/g,'-'),label:row.label||'Training review',why:detail(row)}}))}
function issueFor(a){return queue().find(row=>String(row.a?.id)===String(a?.id))?.issue||null}

function ensureStyles(){
 if(document.getElementById('amTrainingAttentionV4Styles'))return;
 const style=document.createElement('style');style.id='amTrainingAttentionV4Styles';style.textContent=`
 .tr4-tabs [data-am-tr4-attention-tab]{display:inline-flex;align-items:center;gap:7px}.am-tr4-attention-count{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:6px;background:#ef4057;color:#fff;font-size:10px;font-weight:900;line-height:1}.tr4-metric[data-am-tr4-attention-metric]{cursor:pointer;outline:none}.tr4-metric[data-am-tr4-attention-metric]:focus-visible{box-shadow:0 0 0 2px rgba(105,183,225,.55)}.am-tr4-attention-list{display:grid;gap:9px}.am-tr4-attention-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px;border:1px solid rgba(122,166,199,.16);border-left:3px solid #d7a957;border-radius:9px;background:rgba(3,17,27,.58)}.am-tr4-attention-card.bad{border-left-color:#d45668}.am-tr4-attention-card strong,.am-tr4-attention-card small{display:block}.am-tr4-attention-card small{margin-top:3px;color:#86a3b3}.am-tr4-attention-card p{margin:7px 0 0;color:#a9c0cf;font-size:10px;line-height:1.5}.am-tr4-attention-empty{padding:22px;text-align:center;border:1px dashed rgba(122,166,199,.18);border-radius:9px;color:#7897a8}.am-tr4-attention-empty strong{display:block;color:#dcebf2;margin-bottom:5px}@media(max-width:650px){.am-tr4-attention-card{grid-template-columns:1fr}.am-tr4-attention-card .btn{width:100%}}
 `;document.head.appendChild(style);
}
function attentionTab(items){
 const tabs=root()?.querySelector('.tr4-tabs');if(!tabs)return null;
 let tab=tabs.querySelector('[data-am-tr4-attention-tab]');
 if(!tab){tab=document.createElement('button');tab.type='button';tab.dataset.amTr4AttentionTab='1';const overview=tabs.querySelector('[data-tr4-tab="overview"]');if(overview)overview.after(tab);else tabs.prepend(tab)}
 const count=items.length,wanted=String(count);
 if(tab.dataset.amAttentionCount!==wanted){tab.replaceChildren();const text=document.createElement('span');text.textContent='NEEDS ATTENTION';tab.appendChild(text);if(count){const badge=document.createElement('span');badge.className='am-tr4-attention-count';badge.textContent=wanted;badge.setAttribute('aria-hidden','true');tab.appendChild(badge)}tab.dataset.amAttentionCount=wanted}
 tab.setAttribute('aria-label',count?`Needs Attention, ${count} athlete${count===1?'':'s'} require a training decision`:'Needs Attention, no athletes require a training decision');
 if(!tab.dataset.amBound){tab.dataset.amBound='1';tab.addEventListener('click',()=>{attentionOpen=true;renderAttention()})}
 return tab;
}
function attentionMetric(items){
 const metrics=[...(root()?.querySelectorAll('.tr4-metric')||[])];
 const metric=metrics.find(node=>/needs\s+attention/i.test(node.querySelector('small')?.textContent||''));if(!metric)return;
 const strong=metric.querySelector('strong');if(strong&&strong.textContent!==String(items.length))strong.textContent=String(items.length);
 metric.dataset.amTr4AttentionMetric='1';metric.setAttribute('role','button');metric.setAttribute('tabindex','0');metric.setAttribute('aria-label',items.length?`Open ${items.length} training item${items.length===1?'':'s'} needing attention`:'Open Training attention view');
 if(metric.dataset.amBound)return;metric.dataset.amBound='1';
 const open=()=>{attentionOpen=true;renderAttention()};metric.addEventListener('click',open);metric.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}});
}
function signature(items){return items.map(row=>`${row.a.id}:${row.label}:${Math.round(Number(row.a.fatigue||0))}:${row.a.trainingV2?.programme||''}:${row.a.trainingV2?.intensity||''}`).join('|')}
function renderAttention(preloaded){
 const shell=root()?.querySelector('.tr4-shell'),tabs=shell?.querySelector('.tr4-tabs');if(!shell||!tabs)return;
 const items=preloaded||rows(),tab=attentionTab(items),sig=signature(items);
 tabs.querySelectorAll('button').forEach(button=>button.classList.toggle('on',button===tab));
 const existing=shell.querySelector('.am-tr4-attention-view');
 if(existing&&existing.dataset.signature===sig)return;
 let node=tabs.nextElementSibling;while(node){const next=node.nextElementSibling;node.remove();node=next}
 const section=document.createElement('section');section.className='tr4-panel am-tr4-attention-view';section.dataset.signature=sig;
 section.innerHTML=`<div class="tr4-panel-head"><strong>Needs Attention</strong><span>${items.length} unresolved training decision${items.length===1?'':'s'}</span></div><div class="tr4-panel-body am-tr4-attention-list">${items.length?items.map(row=>`<article class="am-tr4-attention-card ${/critical|fatigue/i.test(String(row.label))?'bad':''}" data-am-tr4-attention-athlete="${esc(row.a.id)}"><div><strong>${esc(row.a.name)}</strong><small>${esc(labelFor(row.a))} · ${esc(row.label||'Training review')} · Fatigue ${Math.round(Number(row.a.fatigue||0))}</small><p>${esc(detail(row))}</p></div><button type="button" class="btn primary" data-am-tr4-manage="${esc(row.a.id)}">MANAGE TRAINING</button></article>`).join(''):`<div class="am-tr4-attention-empty"><strong>Nothing needs attention</strong>No athlete currently requires a training decision. The count, navigation badge and this list are all clear.</div>`}</div>`;
 shell.appendChild(section);
 section.querySelectorAll('[data-am-tr4-manage]').forEach(button=>button.addEventListener('click',()=>{
  const id=String(button.dataset.amTr4Manage||'');attentionOpen=false;
  const athletes=tabs.querySelector('[data-tr4-tab="athletes"]');athletes?.click();
  setTimeout(()=>{try{root()?.querySelector(`[data-tr4-focus="${CSS.escape(id)}"]`)?.scrollIntoView({block:'center'})}catch(_){ }},0);
 }));
}
function sync(){
 if(applying)return;applying=true;
 try{ensureStyles();const items=rows();try{training.syncAttention?.()}catch(_){ }attentionTab(items);attentionMetric(items);if(attentionOpen)renderAttention(items)}finally{applying=false}
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;sync()})}

const trainingRoot=root();if(trainingRoot)new MutationObserver(schedule).observe(trainingRoot,{childList:true,subtree:true});
document.addEventListener('click',event=>{if(event.target?.closest?.('#training [data-tr4-tab]')){attentionOpen=false;setTimeout(schedule,0)}},true);

window.__athleticsTrainingAttentionDecisions={version:5,queue,issueFor,refresh:sync,open:()=>{attentionOpen=true;renderAttention()},debug:()=>({open:attentionOpen,count:rows().length,items:rows().map(row=>({id:row.a.id,name:row.a.name,label:row.label}))})};
schedule();
})();
