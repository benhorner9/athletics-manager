import subprocess

base='b4a5daa3e904bd981eeee273942f993c579e2d2e'
src=subprocess.check_output(['git','show',f'{base}:.am-update/apply.py'],text=True)
needle="ranking_code = r'''"
if needle not in src:
    raise SystemExit('relay ranking staging source missing')
src=src.replace(needle,"ranking_code = '''",1)
exec(compile(src,'/tmp/relay_rankings_apply.py','exec'))
