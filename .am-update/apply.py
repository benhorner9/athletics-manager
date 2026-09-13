from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new, label):
    text = read(path)
    if old not in text:
        raise SystemExit(f'{label}: source contract missing in {path}')
    text = text.replace(old, new, 1)
    write(path, text)


def replace_all(path, old, new, label):
    text = read(path)
    if old not in text:
        raise SystemExit(f'{label}: source contract missing in {path}')
    text = text.replace(old, new)
    write(path, text)

# 1) Activate the role-aware inbox voice authority late enough that all core mail factories exist,
#    but before newer systems such as Programme Economy create future communications.
replace_once(
    'game.html',
    '<script src="scripts/language-system-v1.js?v=20260911-language1"></script>\n<script src="scripts/release-baseline.js?v=20260911-release10"></script>',
    '<script src="scripts/language-system-v1.js?v=20260913-languageqa1"></script>\n<script src="scripts/inbox-character-voices-v1.js?v=20260913-languageqa1"></script>\n<script src="scripts/release-baseline.js?v=20260911-release10"></script>',
    'character voice runtime insertion'
)

# Cache-bust every source file changed by this pass so iPad/Safari cannot retain old copy.
cache_updates = {
    'scripts/editorial-cleanup-v2.js?v=20260910-editorial2':'scripts/editorial-cleanup-v2.js?v=20260913-languageqa1',
    'scripts/selection-immersion-v1.js?v=20260910-selection-immersion1':'scripts/selection-immersion-v1.js?v=20260913-languageqa1',
    'scripts/training-system-v4.js?v=20260913-audit1':'scripts/training-system-v4.js?v=20260913-languageqa1',
    'scripts/scouting-v3.js?v=20260911-scouting3compat':'scripts/scouting-v3.js?v=20260913-languageqa1',
    'scripts/manager-career-v1.js?v=20260913-economyv4integration1':'scripts/manager-career-v1.js?v=20260913-languageqa1',
    'scripts/first-time-experience-v2.js?v=20260913-audit4':'scripts/first-time-experience-v2.js?v=20260913-languageqa1',
    'scripts/programme-economy-v2.js?v=20260913-contractimpact1':'scripts/programme-economy-v2.js?v=20260913-languageqa1',
}
html = read('game.html')
for old,new in cache_updates.items():
    if old not in html:
        raise SystemExit(f'cache contract missing: {old}')
    html = html.replace(old,new,1)
write('game.html', html)

# 2) Training: remove implementation language and generic AI-style development copy.
training_replacements = [
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
]
for old,new in training_replacements:
    replace_once('scripts/training-system-v4.js', old, new, f'training copy: {old[:35]}')

# 3) Scouting: player-facing text should describe uncertainty, not reveal implementation history.
replace_once(
    'scripts/scouting-v3.js',
    'Improving the scout network raises discovery quality and makes early assessments more reliable. Individual athlete reports tighten the new 1–20 attribute ranges and repeated high-quality reports can resolve them exactly; the legacy hidden Overall is never exposed.',
    'A stronger scouting network improves discovery quality and early assessment reliability. Repeat reports narrow attribute ranges; strong evidence can eventually turn estimates into exact ratings.',
    'scouting implementation jargon'
)

# 4) Manager Career: remove meta language about what the software chooses to log.
manager_replacements = [
    ('${events.length} meaningful moments','${events.length} career moments'),
    ('Meaningful career events will be stored here without logging routine clicks or screen visits.','Major career events will appear here as they happen.'),
    ('Only meaningful career thresholds are recorded; routine actions do not create achievement spam.','Major career milestones are recorded here.'),
]
for old,new in manager_replacements:
    replace_once('scripts/manager-career-v1.js', old, new, f'manager career copy: {old[:35]}')

# 5) Selection: coach language should sound like selection staff, not generated sports copy.
selection_replacements = [
    ('`${lead.name} remains the stronger headline option, but ${future.name} follows in Week ${future.week}. ${alt.name} is fresher and gives the programme a sensible chance to protect ${lead.name} without a major drop in current level.`',
     '`${lead.name} is still the stronger performer, but ${future.name} follows in Week ${future.week}. ${alt.name} is fresher, so staff recommend resting ${lead.name} here.`'),
    ("`${b.name} owns the stronger season mark, so ${head.name} would lean that way in a very close call.`",
     "`${b.name} has the better season mark, so ${head.name} prefers ${b.name} in a close call.`"),
    ("`${head.name} sees very little between them and would give ${b.name} the opportunity here.`",
     "`${head.name} sees very little between them and prefers ${b.name} here.`"),
    ('`${future.name} follows ${weeks===1?\'next week\':`in ${weeks} weeks`}. ${lead.name} has ${lead.fatigue} fatigue, so protecting freshness here is a genuine option.`',
     '`${future.name} follows ${weeks===1?\'next week\':`in ${weeks} weeks`}. ${lead.name} has ${lead.fatigue} fatigue, so resting ${lead.name} here is worth considering.`'),
    ('`The staff recommendation already factors that into this selection.`',
     '`Staff have already accounted for the short turnaround.`'),
    ("'This is a new selection battle without much previous selection history.'",
     "'Little separates them so far.'"),
    ('<p>Next staff choice after the enforced withdrawal.</p>',
     '<p>Staff recommendation after the withdrawal.</p>'),
]
for old,new in selection_replacements:
    replace_once('scripts/selection-immersion-v1.js', old, new, f'selection copy: {old[:35]}')

# 6) First-time experience: remove stale workflow instructions and game/meta phrasing.
replace_once(
    'scripts/first-time-experience-v2.js',
    '${scout.name}: “Open Scouting and use any one of the five assignment slots. Choose where you want me to look and confirm the brief.”',
    '${scout.name}: “Open Scouting, choose the search focus and confirm where you want the network looking.”',
    'stale scouting onboarding instruction'
)
replace_once(
    'scripts/first-time-experience-v2.js',
    'Start from the schedule. You will deliberately choose which event to watch — the game will not drop you into a random discipline.',
    'Open the meeting from the schedule, then choose which event you want to watch.',
    'meta competition onboarding copy'
)

# 7) Economy/news: factual sports journalism rather than PR language.
replace_once(
    'scripts/programme-economy-v2.js',
    "`The ${nlabel(to)} programme has appointed ${c.name} as ${roleName(r)}. ${rep>=82?'The move is viewed as a significant high-performance appointment.':'The appointment adds new expertise to the programme.'}`",
    "`The ${nlabel(to)} programme has appointed ${c.name} as ${roleName(r)}.${rep>=82?' The coach arrives with a strong international reputation.':''}`",
    'staff appointment news copy'
)

# 8) Character voices: classify funded athlete agreements as Finance rather than Staff Operations,
#    and clean the wording of active existing inbox messages without falsifying historical sender names.
replace_once(
    'scripts/inbox-character-voices-v1.js',
    " if(type==='selection'||sameSender(sender,p.selection)||/^selection required:|^replacement required:/i.test(subject))return'selection';\n if(/sponsorship|funding|budget|facility upgraded|investment/.test(hay))return'finance';",
    " if(type==='selection'||sameSender(sender,p.selection)||/^selection required:|^replacement required:/i.test(subject))return'selection';\n if(type==='contract'&&athleteForMail(m)&&/programme agreement|funded national programme|agreement worth|contract decision/.test(hay))return'finance';\n if(/sponsorship|funding|budget|facility upgraded|investment/.test(hay))return'finance';",
    'athlete contract voice classification'
)
replace_once(
    'scripts/inbox-character-voices-v1.js',
    "function tagExisting(){for(const m of safe(()=>s?.emails,[])||[])applyVoice(m,{rewrite:false,rename:false});for(const m of safe(()=>s?.inboxDecisionSystem?.archive,[])||[])applyVoice(m,{rewrite:false,rename:false})}",
    "function tagExisting(){for(const m of safe(()=>s?.emails,[])||[])applyVoice(m,{rewrite:true,rename:false});for(const m of safe(()=>s?.inboxDecisionSystem?.archive,[])||[])applyVoice(m,{rewrite:true,rename:false})}",
    'existing inbox role-aware cleanup'
)

# 9) Historical update-panel copy is allowed to be historical, but it still appears in the product.
#    Keep the runtime editorial layer responsible for those old release-note phrases rather than editing game core.
replace_once(
    'scripts/editorial-cleanup-v2.js',
    " [/competitive story/gi,'competitive form'],",
    " [/competitive story/gi,'competitive form'],\n [/recovery stories/gi,'recovery updates'],\n [/rehabilitation storyline/gi,'rehabilitation timeline'],\n [/recovery story/gi,'recovery history'],",
    'release-note editorial cleanup rules'
)

# 10) Regression: make the voice layer and source-quality rules part of the build contract.
replace_once(
    'tools/static-regression.mjs',
    " 'scripts/inbox-v3.js',\n 'scripts/squad-athlete-v2.js',",
    " 'scripts/inbox-v3.js',\n 'scripts/inbox-character-voices-v1.js',\n 'scripts/squad-athlete-v2.js',",
    'character voice required runtime'
)
replace_once(
    'tools/static-regression.mjs',
    "before('scripts/manager-career-v1.js','scripts/first-time-experience-v2.js');\nbefore('scripts/first-time-experience-v2.js','scripts/release-baseline.js');",
    "before('scripts/manager-career-v1.js','scripts/first-time-experience-v2.js');\nbefore('scripts/first-time-experience-v2.js','scripts/language-system-v1.js');\nbefore('scripts/language-system-v1.js','scripts/inbox-character-voices-v1.js');\nbefore('scripts/inbox-character-voices-v1.js','scripts/release-baseline.js');\nbefore('scripts/inbox-character-voices-v1.js','scripts/programme-economy-v2.js');\nbefore('scripts/first-time-experience-v2.js','scripts/release-baseline.js');",
    'language runtime ordering'
)
anchor = "if(economyCss.includes('.pe-contract-summary>div{'))fail('Contract impact layout must not inherit the generic direct-child flex rule.');\n"
quality = r'''

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
reg = read('tools/static-regression.mjs')
if anchor not in reg:
    raise SystemExit('language regression insertion anchor missing')
reg = reg.replace(anchor, anchor + quality, 1)
write('tools/static-regression.mjs', reg)

# 11) Keep the editorial standard in-repo so future feature work has an explicit writing contract.
doc = '''# Athletics Manager — Text & Language Standard\n\nPlayer-facing copy must sound like the person or system delivering it, not like generated product copy. Facts belong to gameplay systems; wording should make those facts clearer without inventing certainty, emotion or drama.\n\n## Voice ownership\n\n- **Medical & Physio:** diagnosis, expected absence, restrictions, next step. Calm and precise. No apologies, hype or recovery-story language.\n- **Scout:** what was observed, confidence, uncertainty and recommendation. Never promise potential or use prospect clichés.\n- **Specialist Coach / Performance Team:** athlete- and event-specific, practical and concise. Explain the decision, not the simulation formula.\n- **Selection Committee / Federation:** requirement first, deadline or consequence second. Formal without padding.\n- **Finance:** numbers first. State cost, cash effect, weekly commitment and forecast. No motivational claims.\n- **World News:** result or appointment first, significance second, context third. Sports journalism, not a press release.\n- **Gavin Potts:** call what changes the race. Restraint is the default; excitement is earned by the moment.\n- **UI/system copy:** short, literal and action-led. Never explain hidden code, legacy systems or internal mechanics.\n\n## Avoid\n\nAvoid filler such as “it is worth noting”, “we are pleased to announce”, “going forward”, “meaningful development stimulus”, “significant high-performance appointment”, “stronger headline option”, “genuine option”, “storyline”, and implementation phrases such as “hidden Overall”, “free attribute points” or references to obsolete workflows.\n\nWhen a new feature adds emails, advice, news, commentary or onboarding, add its player-facing source copy to the existing role-aware language system and update `tools/static-regression.mjs` when a recurring failure mode is discovered.\n'''
Path('docs/TEXT-LANGUAGE-STANDARD.md').write_text(doc, encoding='utf-8')

print('Text & Language QA patch applied successfully.')
