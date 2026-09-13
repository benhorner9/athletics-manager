from pathlib import Path
import re


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected text not found in {path}: {old[:120]!r}')
    if text.count(old) != 1:
        raise SystemExit(f'Expected exactly one match in {path}, found {text.count(old)}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


game = Path('scripts/game.js')
text = game.read_text(encoding='utf-8')
pattern = re.compile(r"function advanceWeek\(\)\{.*?\nfunction processWeek\(\)\{", re.S)
match = pattern.search(text)
if not match:
    raise SystemExit('advanceWeek function not found')
new_advance = """function advanceWeek(){const career=careerState();if(career.finished){toast('40-year career complete');openCareerLegacy();return}if(career.pendingReview){openCycleReview();return}if(appointmentPending()){openMail=s.emails.find(m=>m.type==='contract')?.id||openMail;toast('Sign your appointment contract first');view('inbox');return}let block=currentBlocking();if(block){toast('Event day is ready');view('competition');return}\nconst inboxWasOpen=currentView==='inbox',mailIdsBefore=new Set((s.emails||[]).map(m=>String(m.id)));\n// Clear the previous week's alerts before processing so newly generated stories stay unread.\ns.news.forEach(n=>{n.unread=false});\nprocessWeek();s.game.week++;s.game.careerWeek++;if(s.game.week>52){s.game.week=52;updateCamps();endSeason();return}pruneOldEmails();onWeekStart();const unreadAfter=(s.emails||[]).filter(x=>x.unread),freshUnread=unreadAfter.filter(x=>!mailIdsBefore.has(String(x.id))),newestFresh=freshUnread.at(-1)||null,newestCurrent=unreadAfter.filter(x=>Number(x.week)===Number(s.game.week)).at(-1)||null,inboxTarget=inboxWasOpen?newestFresh:newestCurrent;if(inboxTarget)openMail=inboxTarget.id;save();render();let blockNow=currentBlocking();if(blockNow){activeEventDisc=blockNow.disc.find(d=>d!=='ALL')||null;view('competition');return}if(inboxTarget){view('inbox');requestAnimationFrame(()=>{try{window.__athleticsInboxV3?.openMessage?.(inboxTarget.id)}catch(_){}});return}view('home')}\nfunction processWeek(){"""
text = text[:match.start()] + new_advance + text[match.end():]
game.write_text(text, encoding='utf-8')

replace_once(
    'scripts/inbox-v3.js',
    "window.__athleticsInboxV3={version:3,render:renderInbox,legacy:legacyDrawInbox,debug:",
    "window.__athleticsInboxV3={version:3,render:renderInbox,openMessage,legacy:legacyDrawInbox,debug:"
)

replace_once(
    'tools/runtime-smoke.mjs',
    " await import('./programme-management-integration-soak.mjs');\n",
    " await import('./programme-management-integration-soak.mjs');\n await import('./inbox-week-advance-soak.mjs');\n"
)

replace_once(
    'game.html',
    'scripts/game.js?v=20260913-economybalance1',
    'scripts/game.js?v=20260913-inboxadvance1'
)
replace_once(
    'game.html',
    'scripts/inbox-v3.js?v=20260910-inbox3',
    'scripts/inbox-v3.js?v=20260913-inboxadvance1'
)

Path('tools/inbox-week-advance-soak.mjs').write_text("""import fs from 'node:fs';

const game=fs.readFileSync('scripts/game.js','utf8');
const inbox=fs.readFileSync('scripts/inbox-v3.js','utf8');
const need=(ok,msg)=>{if(!ok)throw new Error('Inbox week-advance regression: '+msg)};
const start=game.indexOf('function advanceWeek(){');
const end=game.indexOf('function processWeek(){',start);
need(start>=0&&end>start,'advanceWeek source not found');
const fn=game.slice(start,end);
need(fn.includes("const inboxWasOpen=currentView==='inbox',mailIdsBefore=new Set"),'week advance must snapshot the Inbox route and existing mail IDs');
need(fn.includes('freshUnread=unreadAfter.filter(x=>!mailIdsBefore.has(String(x.id)))'),'newly generated mail must be identified independently of its stored week stamp');
need(fn.includes('inboxTarget=inboxWasOpen?newestFresh:newestCurrent'),'Inbox must prioritise newly generated mail when Advance Week starts from Inbox');
need(fn.includes('if(inboxTarget)openMail=inboxTarget.id;'),'new Inbox target must become selected mail');
need(fn.indexOf('if(inboxTarget)openMail=inboxTarget.id;')<fn.indexOf('save();render();'),'new mail must be selected before the Inbox render pass');
need(fn.includes('__athleticsInboxV3?.openMessage?.(inboxTarget.id)'),'week advance must explicitly open the selected Inbox V3 message');
need(inbox.includes('render:renderInbox,openMessage,legacy:legacyDrawInbox'),'Inbox V3 must expose its canonical message opener');
console.log('Inbox week-advance handoff regression passed');
""",encoding='utf-8')
