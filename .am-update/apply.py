from pathlib import Path
import subprocess

# Fix the new world-training loop before running the validated integration migration.
p=Path('scripts/training-system-v4.js')
text=p.read_text()
old="stimulus(a,false,a.nation===mn?.72:.84)}\nfunction progressLabel"
new="stimulus(a,false,a.nation===mn ? .72 : .84)}\n}\nfunction progressLabel"
if text.count(old)!=1:
    raise SystemExit(f'world training loop fix: expected 1 match, found {text.count(old)}')
p.write_text(text.replace(old,new,1))

# Execute the robust migration runner from the prior staged commit.
base=subprocess.check_output(['git','show','8f61f37140c4365487521e740144ee8ba771179a:.am-update/apply.py'],text=True)
exec(compile(base,'/tmp/training_system_2_base_apply.py','exec'))
