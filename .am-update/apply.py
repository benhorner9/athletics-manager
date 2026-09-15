from pathlib import Path
import re

# 1) Make Inbox Decision Core own a true four-week deletion policy.
p=Path('scripts/inbox-decision-core-v1.js')
text=p.read_text(encoding='utf-8')
if 'const EMAIL_RETENTION_WEEKS=4;' not in text:
    text=text.replace('function S(){', 'const EMAIL_RETENTION_WEEKS=4;\nfunction S(){', 1)

m_pattern=r"function M\(m\)\{.*?\nfunction normalDone"
m_repl="""function M(m){
 const x=S(),z=x.emailMeta[m.id]??={emailId:m.id};
 z.read=m.unread?'unread':'read';
 z.type??=m.type==='selection'||m.id==='appointment-contract'?'decision_required':'information';
 z.priority??=m.type==='selection'?'important':'normal';
 z.resolution??=z.type==='decision_required'?'awaiting_response':'no_response_required';
 if(!Number.isFinite(Number(z.createdCareerWeek))){
  const current=((Number(s?.game?.cycleYear)||1)-1)*52+W();
  const stamped=((Number(m?.year)||Number(s?.game?.cycleYear)||1)-1)*52+(Number(m?.week)||W());
  let age=current-stamped;if(age<0)age+=208;
  z.createdCareerWeek=Math.max(1,CW()-Math.max(0,age));
 }
 return z
}
function normalDone"""
text,n=re.subn(m_pattern,m_repl,text,count=1,flags=re.S)
if n!=1:
    raise SystemExit('Could not patch Inbox Decision Core mail metadata function')

prune_pattern=r"function safePrune\(\)\{.*?\nconst oldPrune="
prune_repl="""function safePrune(){
 if(!s?.emails)return 0;
 const st=S(),active=new Set(actions().map(a=>String(a.emailId||'')).filter(Boolean)),keep=[];let removed=0;
 for(const m of s.emails){
  const z=M(m),created=Number(z.createdCareerWeek),age=Number.isFinite(created)?Math.max(0,CW()-created):0;
  const pinned=m?.pinned===true||m?.keep===true||m?.preserve===true;
  const protectedMail=active.has(String(m?.id||''))||z.resolution==='awaiting_response'||pinned;
  if(age<=EMAIL_RETENTION_WEEKS||protectedMail){keep.push(m);continue}
  if(st.emailMeta&&m?.id!=null)delete st.emailMeta[m.id];
  removed++;
 }
 if(!removed)return 0;
 s.emails=keep;
 try{if(typeof openMail!=='undefined'&&openMail&&!keep.some(m=>String(m.id)===String(openMail)))openMail=keep[keep.length-1]?.id||null}catch(_){}
 try{if(typeof syncMailBadge==='function')syncMailBadge()}catch(_){}
 return removed
}
const oldPrune="""
text,n=re.subn(prune_pattern,prune_repl,text,count=1,flags=re.S)
if n!=1:
    raise SystemExit('Could not patch Inbox Decision Core pruning function')

old_export="window.__athleticsInboxDecisionCore={version:1,getUnresolvedActions:actions,getProgressionBlockers:blockers,openAction,showGate,debug:()=>({actions:actions(),blockers:blockers(),meta:S().emailMeta,archive:S().archive.length,log:S().log.slice(-30)})};"
new_export="window.__athleticsInboxDecisionCore={version:1,retentionWeeks:EMAIL_RETENTION_WEEKS,getUnresolvedActions:actions,getProgressionBlockers:blockers,pruneOldEmails:safePrune,openAction,showGate,debug:()=>({actions:actions(),blockers:blockers(),meta:S().emailMeta,archive:S().archive.length,log:S().log.slice(-30)})};"
if old_export not in text:
    raise SystemExit('Could not expose Inbox retention diagnostics')
text=text.replace(old_export,new_export,1)
p.write_text(text,encoding='utf-8')

# 2) Strengthen the existing Inbox regression contract.
p=Path('tools/inbox-week-advance-soak.mjs')
text=p.read_text(encoding='utf-8')
if "const decisionCore=fs.readFileSync('scripts/inbox-decision-core-v1.js','utf8');" not in text:
    text=text.replace("const inbox=fs.readFileSync('scripts/inbox-v3.js','utf8');", "const inbox=fs.readFileSync('scripts/inbox-v3.js','utf8');\nconst decisionCore=fs.readFileSync('scripts/inbox-decision-core-v1.js','utf8');",1)
    marker="need(inbox.includes('render:renderInbox,openMessage,legacy:legacyDrawInbox'),'Inbox V3 must expose its canonical message opener');"
    extra="""\nneed(decisionCore.includes('const EMAIL_RETENTION_WEEKS=4;'),'Inbox retention must remain four in-game weeks');
need(decisionCore.includes('createdCareerWeek'),'Inbox retention must use absolute career-week age across Olympic-cycle rollovers');
need(decisionCore.includes(\"z.resolution==='awaiting_response'\"),'unresolved decision emails must be protected from age deletion');
need(decisionCore.includes('age<=EMAIL_RETENTION_WEEKS||protectedMail'),'routine mail must expire after the four-week window');
need(!decisionCore.includes('st.archive.push({...m,archivedAt:CW()})'),'expired routine mail must be deleted rather than copied into the full-message archive');"""
    if marker not in text:
        raise SystemExit('Could not patch Inbox week-advance regression')
    text=text.replace(marker,marker+extra,1)
p.write_text(text,encoding='utf-8')

# 3) Assert the policy continuously during the long-career soak.
p=Path('tools/dev-career-soak.mjs')
text=p.read_text(encoding='utf-8')
needle="const ids=read('s.emails.map(m=>m.id)');assert.equal(new Set(ids).size,ids.length,'duplicate mail IDs');"
if 'stale resolved/read email survived the four-week retention window' not in text:
    replacement=needle+"\n  const staleMail=read(`(()=>{const now=Number(s.game.careerWeek||s.game.week||1),meta=s.inboxDecisionSystem?.emailMeta||{},active=new Set(Object.values(s.inboxDecisionSystem?.actions||{}).filter(a=>a?.resolution==='awaiting_response').map(a=>String(a.emailId||'')));return (s.emails||[]).filter(m=>{const z=meta[m.id]||{},created=Number(z.createdCareerWeek);if(!Number.isFinite(created))return false;const pinned=m?.pinned===true||m?.keep===true||m?.preserve===true;return now-created>4&&!active.has(String(m.id||''))&&z.resolution!=='awaiting_response'&&!pinned}).map(m=>m.id)})()`);assert.equal(staleMail.length,0,'stale resolved/read email survived the four-week retention window');"
    if needle not in text:
        raise SystemExit('Could not add long-soak Inbox retention assertion')
    text=text.replace(needle,replacement,1)
p.write_text(text,encoding='utf-8')

# 4) The 208-week soak legitimately exceeds the old two-season watchdog. Give the
# child enough room to complete without relaxing any gameplay/save assertions.
p=Path('tools/runtime-smoke.mjs')
text=p.read_text(encoding='utf-8')
if "process.env.AM_AUDIT_SOAK==='1'?900000:240000" in text:
    text=text.replace("process.env.AM_AUDIT_SOAK==='1'?900000:240000", "process.env.AM_AUDIT_SOAK==='1'?1500000:240000",1)
elif "process.env.AM_AUDIT_SOAK==='1'?1500000:240000" not in text:
    raise SystemExit('Could not locate runtime soak watchdog')
p.write_text(text,encoding='utf-8')

print('Applied four-week Inbox deletion + Olympic-cycle QA watchdog update')
