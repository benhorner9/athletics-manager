from pathlib import Path

path = Path('scripts/squad-athlete-v2.js')
text = path.read_text(encoding='utf-8')
old = ' <td>${esc(disc(a))}</td><td class="num"><span class="sav2-score">${esc(ability(a))}</span></td><td class="num"><span class="sav2-dev">${devHTML(a)}</span></td><td><span class="sav2-score">${esc(perf(a,a.pb))}</span></td>'
new = ' <td>${esc(disc(a))}</td><td><span class="sav2-score">${esc(ability(a))}</span></td><td class="num"><span class="sav2-dev">${devHTML(a)}</span></td><td><span class="sav2-score">${esc(perf(a,a.pb))}</span></td>'
count = text.count(old)
if count != 1:
    raise SystemExit(f'Expected exactly one Squad/Pool ability cell pattern, found {count}.')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Aligned Squad/Pool Ability values with the Ability header.')
