from pathlib import Path
p=Path('styles/ui-unification-v1.css')
s=p.read_text(encoding='utf-8')
marker='/* Sidebar single-logo QA rerun */'
if marker not in s:
    s += '\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
