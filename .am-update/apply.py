from pathlib import Path
script=Path('.am-update/body.py').read_text(encoding='utf-8')
exec(compile(script,'.am-update/body.py','exec'))
