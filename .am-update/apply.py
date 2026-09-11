from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Patch anchor missing: {label}')
    return text.replace(old, new, 1)

js_path = Path('scripts/live-event-broadcast-v4.js')
css_path = Path('styles/live-event-broadcast-v4.css')
html_path = Path('game.html')
static_path = Path('tools/static-regression.mjs')
smoke_path = Path('tools/runtime-smoke.mjs')

js = js_path.read_text(encoding='utf-8')

anchor = "function nextDiscipline(e,ds,current){const idx=Math.max(0,ds.indexOf(current));return ds.slice(idx+1).concat(ds.slice(0,idx)).find(x=>!Array.isArray(e.results?.[x]))||null}\n\nfunction pending(e,d)"
insert = r'''function nextDiscipline(e,ds,current){const idx=Math.max(0,ds.indexOf(current));return ds.slice(idx+1).concat(ds.slice(0,idx)).find(x=>!Array.isArray(e.results?.[x]))||null}

/* ---------- V4.6 presentation performance + QA ---------- */
function clockNow(){try{return performance.now()}catch(_){return Date.now()}}
function presentationHz(){
 const width=Number(window.innerWidth||1280),coarse=!!window.matchMedia?.('(pointer:coarse)')?.matches,reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 if(reduced)return 30;
 if(width<=520)return 30;
 if(coarse)return width>=1000?45:40;
 if(width<=1180)return 45;
 return 60
}
function qaSnapshot(c){
 const issues=[];
 if(!c)return{ok:true,issues,family:null,phase:null,targetFps:presentationHz()};
 if(c.kind==='track'){
  const state=c.state?.a||[],n=dist(c.d),ids=state.map(x=>String(x.r?.id));
  if(new Set(ids).size!==ids.length)issues.push('duplicate-track-athlete');
  if(state.some(x=>!Number.isFinite(Number(x.m))||Number(x.m)<-.01||Number(x.m)>n+.01))issues.push('track-position-out-of-range');
  const lanes=c.rr.map(x=>Number(x.lane)).filter(Number.isFinite);
  if(n<=800&&new Set(lanes).size!==lanes.length)issues.push('duplicate-lane');
  const visualLeader=state.find(x=>!x.status),boardLeader=trackBoardRows(c,c.state).find(x=>x.leader);
  if(visualLeader&&boardLeader&&String(visualLeader.r.id)!==String(boardLeader.id))issues.push('leader-board-mismatch');
  if(c.camera&&(!c.camera.every(Number.isFinite)||c.camera[2]<=0||c.camera[3]<=0||c.camera[0]<0||c.camera[1]<0||c.camera[0]+c.camera[2]>770||c.camera[1]+c.camera[3]>465))issues.push('camera-out-of-bounds');
 }else{
  if(c.i<0||c.i>c.seq.length)issues.push('field-attempt-index-out-of-range');
  if(c.state?.size!==c.rr.length)issues.push('field-state-athlete-count-mismatch');
  const ids=c.rr.map(x=>String(x.id));
  if(new Set(ids).size!==ids.length)issues.push('duplicate-field-athlete');
  const q=c.seq[c.i];
  if(q&&!q.r)issues.push('field-attempt-missing-athlete');
 }
 return{ok:issues.length===0,issues,family:c.kind,disc:c.d,phase:eventPhase(c),targetFps:presentationHz(),paintCount:c.paintCount||0,lastPaintMs:Number((c.lastPaintMs||0).toFixed?.(2)??0)}
}
function refreshQa(c,force=false){const now=clockNow();if(!force&&c.qaStamp&&now-c.qaStamp<500)return;c.qaStamp=now;c.qa=qaSnapshot(c)}
function paintDue(c,force=false){
 const now=clockNow(),phase=eventPhase(c),hz=presentationHz(),interval=1000/hz;
 if(force||!c.lastPaintAt||c.paintPhase!==phase||now-c.lastPaintAt>=interval){c.lastPaintAt=now;c.paintPhase=phase;c.targetFps=hz;c.paintCount=(c.paintCount||0)+1;return true}
 return false
}

function pending(e,d)'''
js = replace_once(js, anchor, insert, 'V4.6 QA helpers')

old_render = "function render(c,forceBoard=false){if(!c||live!==c)return;const v=$('liveEventVisual');if(v)v.innerHTML=liveVisual(c);updateBoard(c,forceBoard);wire(c);requestAnimationFrame(()=>{try{window.__athleticsShotPutAthlete?.sync?.()}catch(_){}})}"
new_render = r'''function render(c,force=false){
 if(!c||live!==c)return;
 updateBoard(c,force);
 refreshQa(c,force);
 if(!paintDue(c,force))return;
 const began=clockNow(),v=$('liveEventVisual');
 if(v){v.innerHTML=liveVisual(c);v.dataset.lv4Hz=String(c.targetFps||presentationHz())}
 wire(c);
 c.lastPaintMs=Math.max(0,clockNow()-began);
 requestAnimationFrame(()=>{try{window.__athleticsShotPutAthlete?.sync?.()}catch(_){}})
}'''
js = replace_once(js, old_render, new_render, 'throttled render loop')

old_api = "const api={version:'4.5.0',get active(){return live},get previous(){return previous},diagnostics(){const root=$('liveEventVisual');return{loaded:true,renderer:'Broadcast V4.5 Championship',disc:typeof activeEventDisc!=='undefined'?activeEventDisc:null,active:!!live,mode:live?.speed||null,phase:live?eventPhase(live):null,legacyOvalPresent:!!root?.querySelector('ellipse')}}};"
new_api = "const api={version:'4.6.0',get active(){return live},get previous(){return previous},qa(){return qaSnapshot(live)},diagnostics(){const root=$('liveEventVisual'),qa=qaSnapshot(live);return{loaded:true,renderer:'Broadcast V4.6 Optimised',disc:typeof activeEventDisc!=='undefined'?activeEventDisc:null,active:!!live,mode:live?.speed||null,phase:live?eventPhase(live):null,targetFps:presentationHz(),paintCount:live?.paintCount||0,lastPaintMs:live?.lastPaintMs||0,qa,legacyOvalPresent:!!root?.querySelector('ellipse')}}};"
js = replace_once(js, old_api, new_api, 'V4.6 public API')
js_path.write_text(js, encoding='utf-8')

css = css_path.read_text(encoding='utf-8')
if 'Live Event Broadcast V4.6 — optimisation + tablet QA' not in css:
    css += r'''

/* ===== Live Event Broadcast V4.6 — optimisation + tablet QA ===== */
#competition .lv4event{overscroll-behavior:contain}
.lv4-grid,.lv4-grid>section,.lv4-stage,.lv4-board,.lv4-comments,.lv4-canvas{min-width:0}
.lv4-canvas{overflow:hidden;contain:layout paint}
.lv4-svg{will-change:contents}
.lv4-board-list{overscroll-behavior:contain}
@media (pointer:coarse) and (min-width:761px){
 #competition .lv4event{height:calc(100dvh - 72px)}
 .lv4-head{min-height:62px!important;padding:7px 10px!important}
 .lv4-grid{grid-template-columns:minmax(0,1fr) minmax(248px,288px)!important;gap:8px!important;padding:8px!important}
 .lv4-grid>section{grid-template-rows:minmax(0,1fr) 140px!important;gap:7px!important}
 .lv4-controls{min-height:44px!important;padding:5px 7px!important}
 .lv4-controls>button,.lv4-controls>div button{min-height:36px!important;min-width:44px}
 .lv4-board-row{min-height:46px}
 .lv4-comments>header{min-height:32px!important}
 .lv4-comment-history{max-height:60px}
 .lv4-foot .btn{min-height:38px}
 .lv4-attempt-card{max-width:78%}
}
@media (pointer:coarse) and (orientation:landscape) and (min-width:900px){
 .lv4-grid>section{grid-template-rows:minmax(0,1fr) 132px!important}
 .lv4-svg{min-height:250px}
 .lv4-current-comment p{font-size:8px!important;line-height:1.28!important}
}
@media(max-width:760px){
 #competition .lv4event{max-width:100%;overflow-x:hidden}
 .lv4-grid,.lv4-grid>section,#liveEventVisual,#liveScoreboard,#commentary{max-width:100%;min-width:0}
 .lv4-board-head,.lv4-board-row{width:100%;box-sizing:border-box}
}
@media(prefers-reduced-motion:reduce){.lv4-svg{will-change:auto}}
/* ===== End Live Event Broadcast V4.6 ===== */
'''
css_path.write_text(css, encoding='utf-8')

html = html_path.read_text(encoding='utf-8')
html = html.replace('styles/live-event-broadcast-v4.css?v=20260911-broadcast4', 'styles/live-event-broadcast-v4.css?v=20260911-broadcast46')
html = html.replace('scripts/live-event-broadcast-v4.js?v=20260911-broadcast4', 'scripts/live-event-broadcast-v4.js?v=20260911-broadcast46')
html_path.write_text(html, encoding='utf-8')

static = static_path.read_text(encoding='utf-8')
needle = "  [\"document.addEventListener('visibilitychange'\",'Broadcast background-tab pause safeguard is missing']"
replacement = "  [\"document.addEventListener('visibilitychange'\",'Broadcast background-tab pause safeguard is missing'],\n  ['function presentationHz()','Broadcast adaptive presentation budget is missing'],\n  ['function qaSnapshot(c)','Broadcast visual/simulation QA snapshot is missing'],\n  ['function paintDue(c,force=false)','Broadcast render throttling is missing'],\n  [\"version:'4.6.0'\",'Broadcast V4.6 version contract is missing']"
static = replace_once(static, needle, replacement, 'static regression V4.6 contracts')
static_path.write_text(static, encoding='utf-8')

smoke = smoke_path.read_text(encoding='utf-8')
old_globals = "  '__athleticsCalendarV2','__athleticsCompetitionJourneyV2','__athleticsScoutingV3','__athleticsStaffFinanceV2','__athleticsWorldSeasonV2','__athleticsRegression'"
new_globals = "  '__athleticsCalendarV2','__athleticsCompetitionJourneyV2','__athleticsScoutingV3','__athleticsStaffFinanceV2','__athleticsWorldSeasonV2','__athleticsRegression','AMLiveBroadcastV4'"
smoke = replace_once(smoke, old_globals, new_globals, 'runtime broadcast global')
smoke_anchor = " console.log('[smoke] runtime globals and snapshot checked');"
smoke_insert = r''' if(w.AMLiveBroadcastV4){
  try{
   const diag=w.AMLiveBroadcastV4.diagnostics();
   if(!diag||diag.loaded!==true||diag.renderer!=='Broadcast V4.6 Optimised')fail('Broadcast V4.6 diagnostics are not authoritative.');
   const qa=w.AMLiveBroadcastV4.qa();
   if(!qa||qa.ok!==true||!Array.isArray(qa.issues))fail('Broadcast V4.6 QA snapshot is invalid while idle.');
  }catch(err){fail(`Broadcast V4.6 diagnostics threw: ${err?.stack||err}`)}
 }
 console.log('[smoke] runtime globals and snapshot checked');'''
smoke = replace_once(smoke, smoke_anchor, smoke_insert, 'runtime V4.6 diagnostics')
smoke_path.write_text(smoke, encoding='utf-8')

print('Applied Live Event Broadcast V4.6 optimisation and QA pass')
