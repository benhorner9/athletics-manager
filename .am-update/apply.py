from pathlib import Path

root=Path('.')
ftx=root/'scripts/first-time-experience-v2.js'
html=root/'game.html'
static=root/'tools/static-regression.mjs'

text=ftx.read_text()
old="const OPENING_WEEK=5;\nconst SCOUT_GROUPS={"
new="const OPENING_WEEK=5;\nconst FIRST_SEASON_SPRING_WEEK=13; // Keep Week 14 clear for Summit Series 1.\nconst SCOUT_GROUPS={"
if old not in text: raise SystemExit('FTUE constants insertion point missing')
text=text.replace(old,new,1)
old="const spring=events.find(e=>e.id==='spring');if(spring&&!spring.completed&&n(spring.week)<=12)spring.week=14;"
new="const spring=events.find(e=>e.id==='spring');if(spring&&!spring.completed&&n(spring.week)<=12)spring.week=FIRST_SEASON_SPRING_WEEK;"
if old not in text: raise SystemExit('FTUE Spring scheduling rule missing')
text=text.replace(old,new,1)
ftx.write_text(text)

h=html.read_text()
old="scripts/first-time-experience-v2.js?v=20260911-ftx26-training-progression"
new="scripts/first-time-experience-v2.js?v=20260911-ftx27-summit-schedule"
if old not in h: raise SystemExit('FTUE cache key missing')
html.write_text(h.replace(old,new,1))

r=static.read_text()
old="  [\"const OPENING_EVENT_ID='opening-meet-v2'\",'Opening-month competition authority is missing'],\n  ['function ensureOpeningSchedule()','Opening-month schedule migration is missing'],"
new="  [\"const OPENING_EVENT_ID='opening-meet-v2'\",'Opening-month competition authority is missing'],\n  ['const FIRST_SEASON_SPRING_WEEK=13','First-season Spring Grand Prix must not collide with Summit Series 1 in Week 14'],\n  ['function ensureOpeningSchedule()','Opening-month schedule migration is missing'],"
if old not in r: raise SystemExit('FTUE static contract insertion point missing')
static.write_text(r.replace(old,new,1))
