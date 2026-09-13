from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def rep(path, old, new, label=None):
    text = read(path)
    if old not in text:
        raise SystemExit(f"{label or old[:45]}: source contract missing in {path}")
    write(path, text.replace(old, new, 1))

rep('game.html',
    '<script src="scripts/language-system-v1.js?v=20260911-language1"></script>\n<script src="scripts/release-baseline.js?v=20260911-release10"></script>',
    '<script src="scripts/language-system-v1.js?v=20260913-languageqa1"></script>\n<script src="scripts/inbox-character-voices-v1.js?v=20260913-languageqa1"></script>\n<script src="scripts/release-baseline.js?v=20260911-release10"></script>',
    'character voice runtime insertion')

html = read('game.html')
for old,new in {
    'scripts/editorial-cleanup-v2.js?v=20260910-editorial2':'scripts/editorial-cleanup-v2.js?v=20260913-languageqa1',
    'scripts/selection-immersion-v1.js?v=20260910-selection-immersion1':'scripts/selection-immersion-v1.js?v=20260913-languageqa1',
    'scripts/training-system-v4.js?v=20260913-audit1':'scripts/training-system-v4.js?v=20260913-languageqa1',
    'scripts/scouting-v3.js?v=20260911-scouting3compat':'scripts/scouting-v3.js?v=20260913-languageqa1',
    'scripts/manager-career-v1.js?v=20260913-economyv4integration1':'scripts/manager-career-v1.js?v=20260913-languageqa1',
    'scripts/first-time-experience-v2.js?v=20260913-audit4':'scripts/first-time-experience-v2.js?v=20260913-languageqa1',
    'scripts/programme-economy-v2.js?v=20260913-contractimpact1':'scripts/programme-economy-v2.js?v=20260913-languageqa1',
}.items():
    if old not in html:
        raise SystemExit(f'cache contract missing: {old}')
    html = html.replace(old,new,1)
write('game.html', html)

for old,new in [
    ('Develop individual athlete qualities, manage training load and prepare the squad for competition. Ratings improve through accumulated work — not a hidden Overall score.',
     'Develop individual athlete qualities, manage training load and prepare the squad for competition. Stronger qualities take longer to improve.'),
    ('Two weeks of concentrated event-specific work. Adds a meaningful development stimulus to the athlete’s current focus.',
     'Two weeks of concentrated event-specific work built around the athlete’s current development focus.'),
    ('Four weeks of high-level work. Stronger attribute stimulus, but returns with significant fatigue.',
     'Four weeks of intensive technical work. Greater development potential, but expect a tired athlete on return.'),
    ('Testing helps you understand whether training is translating into performance. It does not grant free attribute points.',
     'Testing shows whether training is carrying into performance. The session itself does not improve the athlete.'),
    ('No attribute has crossed a full rating point yet. Progress is accumulating inside current blocks.',
     'No rating has moved yet. Development is still building within the current blocks.'),
]: rep('scripts/training-system-v4.js',old,new,'training language')

rep('scripts/scouting-v3.js',
    'Improving the scout network raises discovery quality and makes early assessments more reliable. Individual athlete reports tighten the new 1–20 attribute ranges and repeated high-quality reports can resolve them exactly; the legacy hidden Overall is never exposed.',
    'A stronger scouting network improves discovery quality and early assessment reliability. Repeat reports narrow attribute ranges; strong evidence can eventually turn estimates into exact ratings.',
    'scouting implementation language')

for old,new in [
    ('${events.length} meaningful moments','${events.length} career moments'),
    ('Meaningful career events will be stored here without logging routine clicks or screen visits.','Major career events will appear here as they happen.'),
    ('Only meaningful career thresholds are recorded; routine actions do not create achievement spam.','Major career milestones are recorded here.'),
]: rep('scripts/manager-career-v1.js',old,new,'manager career language')

for old,new in [
    ('`${lead.name} remains the stronger headline option, but ${future.name} follows in Week ${future.week}. ${alt.name} is fresher and gives the programme a sensible chance to protect ${lead.name} without a major drop in current level.`',
     '`${lead.name} is still the stronger performer, but ${future.name} follows in Week ${future.week}. ${alt.name} is fresher, so staff recommend resting ${lead.name} here.`'),
    ('`${b.name} owns the stronger season mark, so ${head.name} would lean that way in a very close call.`',
     '`${b.name} has the better season mark, so ${head.name} prefers ${b.name} in a close call.`'),
    ('`${head.name} sees very little between them and would give ${b.name} the opportunity here.`',
     '`${head.name} sees very little between them and prefers ${b.name} here.`'),
    ('`${future.name} follows ${weeks===1?\'next week\':`in ${weeks} weeks`}. ${lead.name} has ${lead.fatigue} fatigue, so protecting freshness here is a genuine option.`',
     '`${future.name} follows ${weeks===1?\'next week\':`in ${weeks} weeks`}. ${lead.name} has ${lead.fatigue} fatigue, so resting ${lead.name} here is worth considering.`'),
    ('The staff recommendation already factors that into this selection.','Staff have already accounted for the short turnaround.'),
    ("'This is a new selection battle without much previous selection history.'","'Little separates them so far.'"),
    ('<p>Next staff choice after the enforced withdrawal.</p>','<p>Staff recommendation after the withdrawal.</p>'),
]: rep('scripts/selection-immersion-v1.js',old,new,'selection language')

# Current first-time flow had the same obsolete scouting instruction in the phase card and both email variants.
rep('scripts/first-time-experience-v2.js',
    '${scout.name}: “Open Scouting and use any one of the five assignment slots. Choose where you want me to look and confirm the brief.”',
    '${scout.name}: “Open Scouting, choose the search focus and confirm where you want the network looking.”',
    'onboarding scouting phase instruction')
rep('scripts/first-time-experience-v2.js',
    'The senior squad is only part of the national programme. Open Scouting, use one of the five assignment slots and choose where you want the network to look.',
    'The senior squad is only part of the national programme. Open Scouting, choose a search focus and tell the network where to look.',
    'onboarding scouting email text')
rep('scripts/first-time-experience-v2.js',
    '<p>Open Scouting, use any one of the five assignment slots and choose where you want the network to look. Confirming that brief completes this step.</p>',
    '<p>Open Scouting, choose the search focus and tell the network where to look. Confirming the search completes this step.</p>',
    'onboarding scouting email html')
rep('scripts/first-time-experience-v2.js',
    'Start from the schedule. You will deliberately choose which event to watch — the game will not drop you into a random discipline.',
    'Open the meeting from the schedule, then choose which event you want to watch.',
    'onboarding competition instruction')

rep('scripts/programme-economy-v2.js',
    "`The ${nlabel(to)} programme has appointed ${c.name} as ${roleName(r)}. ${rep>=82?'The move is viewed as a significant high-performance appointment.':'The appointment adds new expertise to the programme.'}`",
    "`The ${nlabel(to)} programme has appointed ${c.name} as ${roleName(r)}.${rep>=82?' The coach arrives with a strong international reputation.':''}`",
    'staff appointment news')

rep('scripts/inbox-character-voices-v1.js',
    " if(type==='selection'||sameSender(sender,p.selection)||/^selection required:|^replacement required:/i.test(subject))return'selection';\n if(/sponsorship|funding|budget|facility upgraded|investment/.test(hay))return'finance';",
    " if(type==='selection'||sameSender(sender,p.selection)||/^selection required:|^replacement required:/i.test(subject))return'selection';\n if(type==='contract'&&athleteForMail(m)&&/programme agreement|funded national programme|agreement worth|contract decision/.test(hay))return'finance';\n if(/sponsorship|funding|budget|facility upgraded|investment/.test(hay))return'finance';",
    'athlete contract voice classification')
rep('scripts/inbox-character-voices-v1.js',
    "function tagExisting(){for(const m of safe(()=>s?.emails,[])||[])applyVoice(m,{rewrite:false,rename:false});for(const m of safe(()=>s?.inboxDecisionSystem?.archive,[])||[])applyVoice(m,{rewrite:false,rename:false})}",
    "function tagExisting(){for(const m of safe(()=>s?.emails,[])||[])applyVoice(m,{rewrite:true,rename:false});for(const m of safe(()=>s?.inboxDecisionSystem?.archive,[])||[])applyVoice(m,{rewrite:true,rename:false})}",
    'existing inbox cleanup')

rep('scripts/editorial-cleanup-v2.js',
    " [/competitive story/gi,'competitive form'],",
    " [/competitive story/gi,'competitive form'],\n [/recovery stories/gi,'recovery updates'],\n [/rehabilitation storyline/gi,'rehabilitation timeline'],\n [/recovery story/gi,'recovery history'],",
    'historical release-note cleanup')

rep('tools/static-regression.mjs',
    " 'scripts/inbox-v3.js',\n 'scripts/squad-athlete-v2.js',",
    " 'scripts/inbox-v3.js',\n 'scripts/inbox-character-voices-v1.js',\n 'scripts/squad-athlete-v2.js',",
    'voice runtime required script')
rep('tools/static-regression.mjs',
    "before('scripts/manager-career-v1.js','scripts/first-time-experience-v2.js');\nbefore('scripts/first-time-experience-v2.js','scripts/release-baseline.js');",
    "before('scripts/manager-career-v1.js','scripts/first-time-experience-v2.js');\nbefore('scripts/first-time-experience-v2.js','scripts/language-system-v1.js');\nbefore('scripts/language-system-v1.js','scripts/inbox-character-voices-v1.js');\nbefore('scripts/inbox-character-voices-v1.js','scripts/release-baseline.js');\nbefore('scripts/inbox-character-voices-v1.js','scripts/programme-economy-v2.js');\nbefore('scripts/first-time-experience-v2.js','scripts/release-baseline.js');",
    'language runtime order')

anchor="if(economyCss.includes('.pe-contract-summary>div{'))fail('Contract impact layout must not inherit the generic direct-child flex rule.');\n"
reg=read('tools/static-regression.mjs')
if anchor not in reg: raise SystemExit('language regression insertion anchor missing')
quality=r'''

const languageQualityContracts={
 'scripts/training-system-v4.js':['meaningful development stimulus','hidden Overall score','free attribute points','Stronger attribute stimulus'],
 'scripts/scouting-v3.js':['legacy hidden Overall'],
 'scripts/manager-career-v1.js':['meaningful moments','Meaningful career events','meaningful career thresholds','achievement spam'],
 'scripts/selection-immersion-v1.js':['stronger headline option','sensible chance','genuine option','owns the stronger season mark','would give ${b.name} the opportunity here','new selection battle without much previous selection history'],
 'scripts/programme-economy-v2.js':['significant high-performance appointment','appointment adds new expertise'],
 'scripts/first-time-experience-v2.js':['five assignment slots','game will not drop you into a random discipline']
};
for(const [file,banned] of Object.entries(languageQualityContracts)){
 const text=read(file);for(const phrase of banned)if(text.includes(phrase))fail(`Text & Language QA: ${file} still contains banned player-facing copy: ${phrase}`);
}
const voiceAuthority=read('scripts/inbox-character-voices-v1.js');
for(const token of ["medical:{label:'Medical & Physio'","scout:{label:'National Scout'","finance:{label:'Finance'","selection:{label:'Selection Committee'","function inferRole(m)","rewrite:true,rename:false"])
 if(!voiceAuthority.includes(token))fail(`Inbox character voice authority is incomplete: ${token}`);
'''
reg=reg.replace(anchor,anchor+quality,1)
write('tools/static-regression.mjs',reg)

Path('docs/TEXT-LANGUAGE-STANDARD.md').write_text('''# Athletics Manager — Text & Language Standard

Player-facing copy must sound like the person or system delivering it, not like generated product copy. Facts belong to gameplay systems; wording should make those facts clearer without inventing certainty, emotion or drama.

## Voice ownership

- **Medical & Physio:** diagnosis, expected absence, restrictions, next step. Calm and precise. No apologies, hype or recovery-story language.
- **Scout:** what was observed, confidence, uncertainty and recommendation. Never promise potential or use prospect clichés.
- **Specialist Coach / Performance Team:** athlete- and event-specific, practical and concise. Explain the decision, not the simulation formula.
- **Selection Committee / Federation:** requirement first, deadline or consequence second. Formal without padding.
- **Finance:** numbers first. State cost, cash effect, weekly commitment and forecast. No motivational claims.
- **World News:** result or appointment first, significance second, context third. Sports journalism, not a press release.
- **Gavin Potts:** call what changes the race. Restraint is the default; excitement is earned by the moment.
- **UI/system copy:** short, literal and action-led. Never explain hidden code, legacy systems or internal mechanics.

## Avoid

Avoid filler such as “it is worth noting”, “we are pleased to announce”, “going forward”, “meaningful development stimulus”, “significant high-performance appointment”, “stronger headline option”, “genuine option”, “storyline”, and implementation phrases such as “hidden Overall”, “free attribute points” or references to obsolete workflows.

When a new feature adds emails, advice, news, commentary or onboarding, use the existing role-aware language system and add a regression rule whenever a recurring failure mode is discovered.
''',encoding='utf-8')

print('Text & Language QA patch applied successfully.')
