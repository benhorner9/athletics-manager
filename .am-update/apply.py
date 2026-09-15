from pathlib import Path
import re
root=Path('.')

html=(root/'game.html').read_text(encoding='utf-8')
css_line='<link rel="stylesheet" href="styles/commercial-partnership-v1.css?v=20260915-commercial1">'
if 'styles/commercial-partnership-v1.css' not in html:
    anchor='<link rel="stylesheet" href="styles/athlete-conversation-v1.css?v=20260915-conversation1">'
    if anchor not in html: raise SystemExit('Athlete conversation stylesheet anchor not found')
    html=html.replace(anchor, anchor+'\n'+css_line, 1)
script_line='<script src="scripts/commercial-partnership-v1.js?v=20260915-commercial1"></script>'
if 'scripts/commercial-partnership-v1.js' not in html:
    anchor='<script src="scripts/programme-economy-v2.js?v=20260913-languageqa1"></script>'
    if anchor not in html: raise SystemExit('Programme economy script anchor not found')
    html=html.replace(anchor, anchor+'\n'+script_line, 1)
(root/'game.html').write_text(html, encoding='utf-8')

qa=(root/'tools/automated-qa.mjs').read_text(encoding='utf-8')
qa_line="await run('Commercial partnership regression',['tools/commercial-partnership-regression.mjs']);"
if qa_line not in qa:
    anchor="await run('Athlete conversation regression',['tools/athlete-conversation-regression.mjs']);"
    if anchor not in qa: raise SystemExit('Athlete conversation QA anchor not found')
    qa=qa.replace(anchor, anchor+'\n'+qa_line, 1)
(root/'tools/automated-qa.mjs').write_text(qa, encoding='utf-8')

cal_path=root/'scripts/calendar-v2.js'
cal=cal_path.read_text(encoding='utf-8')
if 'function mediaEvents(w)' not in cal:
    pattern=r"(function weekPlans\(w\)\{[^\n]+\}\n)"
    cal,n=re.subn(pattern,r"\1function mediaEvents(w){return safe(()=>window.AMCommercialPartnership?.eventsForWeek?.(w)||[],[])}\n",cal,count=1)
    if n!=1: raise SystemExit('Calendar weekPlans anchor not found')
old="function weekHasProgramme(w){return weekPlans(w).length||weekEvents(w).some(e=>['testing','scout','review'].includes(e.kind))}"
new="function weekHasProgramme(w){return weekPlans(w).length||mediaEvents(w).length||weekEvents(w).some(e=>['testing','scout','review'].includes(e.kind))}"
if old in cal: cal=cal.replace(old,new,1)
old="function weekRow(w,acts){const ev=weekEvents(w),ps=weekPlans(w),round=leagueRound(w),st=state(),due=dueActions(w,acts),items=[];"
new="function weekRow(w,acts){const ev=weekEvents(w),ps=weekPlans(w),media=mediaEvents(w),round=leagueRound(w),st=state(),due=dueActions(w,acts),items=[];"
if old in cal: cal=cal.replace(old,new,1)
anchor="if(round)items.push(itemHTML('league','Summit Series round','Series'));if(due.length"
if anchor in cal: cal=cal.replace(anchor,"if(round)items.push(itemHTML('league','Summit Series round','Series'));media.slice(0,2).forEach(x=>items.push(itemHTML('media',x.title,x.sponsorName||'Commercial')));if(due.length",1)
old="function selectedWeekHTML(w,acts){const ev=weekEvents(w),ps=weekPlans(w),due=dueActions(w,acts),round=leagueRound(w);"
new="function selectedWeekHTML(w,acts){const ev=weekEvents(w),ps=weekPlans(w),media=mediaEvents(w),due=dueActions(w,acts),round=leagueRound(w);"
if old in cal: cal=cal.replace(old,new,1)
needle="${round?'<section class=\"calv2-detail-item\"><div class=\"calv2-detail-top\"><small>Summit Series</small><span class=\"calv2-state\">Series round</span></div><h3>Summit Series Meeting</h3><p>Series commitments and entries are managed from the Summit Series screen.</p><div class=\"calv2-detail-actions\"><button class=\"btn ghost\" data-calv2-league>OPEN SUMMIT SERIES</button></div></section>':''}${ps.map(p=>planDetail(p)).join('')}"
replacement="${round?'<section class=\"calv2-detail-item\"><div class=\"calv2-detail-top\"><small>Summit Series</small><span class=\"calv2-state\">Series round</span></div><h3>Summit Series Meeting</h3><p>Series commitments and entries are managed from the Summit Series screen.</p><div class=\"calv2-detail-actions\"><button class=\"btn ghost\" data-calv2-league>OPEN SUMMIT SERIES</button></div></section>':''}${media.map(x=>safe(()=>window.AMCommercialPartnership?.calendarDetailHTML?.(x),'')).join('')}${ps.map(p=>planDetail(p)).join('')}"
if needle in cal: cal=cal.replace(needle,replacement,1)
cal=cal.replace("!due.length&&!ev.length&&!round&&!ps.length","!due.length&&!ev.length&&!round&&!media.length&&!ps.length")
required=['function mediaEvents(w)',"itemHTML('media'",'calendarDetailHTML','mediaEvents(w).length']
missing=[x for x in required if x not in cal]
if missing: raise SystemExit('Calendar commercial integration incomplete: '+', '.join(missing))
cal_path.write_text(cal,encoding='utf-8')
