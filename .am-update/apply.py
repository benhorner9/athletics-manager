from pathlib import Path
p=Path('scripts/relay-v1.js')
text=p.read_text(encoding='utf-8')
old="""  e.disc??=[];e.entries??={};e.results??={};\n  for(const d of Object.keys(RELAYS))if(!e.disc.includes(d))e.disc.push(d);"""
new="""  e.disc??=[];e.entries??={};e.results??={};let added=false;\n  for(const d of Object.keys(RELAYS))if(!e.disc.includes(d)){e.disc.push(d);added=true}\n  if(added&&futureOnly){e.decision=false;if(e.selectionDecisionV3?.locked)e.selectionDecisionV3.locked=false;if(e.selectionCentreV2?.locked)e.selectionCentreV2.locked=false}"""
if old not in text: raise SystemExit('Relay event migration source contract missing')
text=text.replace(old,new,1)
old2=""" st.records.national[row.nation]??={};const nr=st.records.national[row.nation][d];if(!nr||row.perf<nr.value-.0001){st.records.national[row.nation][d]={value:row.perf,holder:row.name,nation:row.nation,season:s.game.season,week:s.game.week,event:e.name};if(!ach.includes('WR'))ach.push('NR')}"""
new2=""" st.records.national[row.nation]??={};const nr=st.records.national[row.nation][d];if(!nr){st.records.national[row.nation][d]={value:row.perf,holder:row.name,nation:row.nation,season:s.game.season,week:s.game.week,event:e.name}}else if(row.perf<nr.value-.0001){st.records.national[row.nation][d]={value:row.perf,holder:row.name,nation:row.nation,season:s.game.season,week:s.game.week,event:e.name};if(!ach.includes('WR'))ach.push('NR')}"""
if old2 not in text: raise SystemExit('Relay record source contract missing')
text=text.replace(old2,new2,1)
p.write_text(text,encoding='utf-8')
print('Relay V1 existing-save selection invalidation and first-record handling corrected.')
