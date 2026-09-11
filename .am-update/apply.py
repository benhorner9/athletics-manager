from pathlib import Path

css_path = Path('styles/squad-athlete-v2.css')
html_path = Path('game.html')
css = css_path.read_text(encoding='utf-8')
html = html_path.read_text(encoding='utf-8')

marker = '/* Squad + National Pool alignment authority — 2026-09-11 */'
block = r'''

/* Squad + National Pool alignment authority — 2026-09-11 */
@media(min-width:701px){
 .sav2-table{table-layout:fixed}
 .sav2-table th,.sav2-table td{box-sizing:border-box}
 .sav2-table th:nth-child(1),.sav2-table td:nth-child(1){width:18%}
 .sav2-table th:nth-child(2),.sav2-table td:nth-child(2){width:13%}
 .sav2-table th:nth-child(3),.sav2-table td:nth-child(3){width:9%;text-align:center}
 .sav2-table th:nth-child(4),.sav2-table td:nth-child(4){width:7%;text-align:center}
 .sav2-table th:nth-child(5),.sav2-table td:nth-child(5){width:10%}
 .sav2-table th:nth-child(6),.sav2-table td:nth-child(6),
 .sav2-table th:nth-child(7),.sav2-table td:nth-child(7),
 .sav2-table th:nth-child(8),.sav2-table td:nth-child(8){width:11%}
 .sav2-table th:nth-child(9),.sav2-table td:nth-child(9){width:10%;text-align:center}
 .sav2-table th:nth-child(3) button,.sav2-table th:nth-child(4) button,
 .sav2-table th:nth-child(6) button,.sav2-table th:nth-child(7) button,
 .sav2-table th:nth-child(8) button,.sav2-table th:nth-child(9) button{width:100%;text-align:center}
 .sav2-table td:nth-child(2),.sav2-table td:nth-child(5){white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .sav2-table td:nth-child(4) .sav2-dev{display:inline-flex;align-items:center;justify-content:center;min-width:100%}
 .sav2-table td:nth-child(9) .sav2-state{justify-content:center;min-width:74px;box-sizing:border-box}
 .sav2-summary>div{min-height:58px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center}
 .sav2-toolbar>*{min-width:0;box-sizing:border-box}
 .sav2-toolbar input,.sav2-toolbar select,.sav2-toolbar button{height:38px;min-height:38px;box-sizing:border-box}
}
'''

if marker not in css:
    css = css.rstrip() + block + '\n'
else:
    raise SystemExit('Alignment authority already present; refusing duplicate patch.')

old_cache = 'styles/squad-athlete-v2.css?v=20260911-squadlayout1'
new_cache = 'styles/squad-athlete-v2.css?v=20260911-squadalign2'
if old_cache not in html:
    raise SystemExit('Expected Squad stylesheet cache key not found in game.html')
html = html.replace(old_cache, new_cache, 1)

css_path.write_text(css, encoding='utf-8')
html_path.write_text(html, encoding='utf-8')
