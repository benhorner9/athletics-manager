from pathlib import Path
p=Path('scripts/game.js')
s=p.read_text(encoding='utf-8')
old="if(!a.squadAgreement||!Number.isFinite(Number(a.squadAgreement.endCareerWeek))||Number(a.squadAgreement.endCareerWeek)<=now){a.squadAgreement={startCareerWeek:now,endCareerWeek:now+52,termWeeks:52,reminderForEnd:null,history:[{careerWeek:now,type:'migration',weeks:52}]};a.squadJoinedCareerWeek??=now}"
new="if(!a.squadAgreement||!Number.isFinite(Number(a.squadAgreement.endCareerWeek))){a.squadAgreement={startCareerWeek:now,endCareerWeek:now+52,termWeeks:52,reminderForEnd:null,status:'active',history:[{careerWeek:now,type:'migration',weeks:52}]};a.squadJoinedCareerWeek??=now}"
if old not in s:
    raise SystemExit('squad agreement migration target not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
