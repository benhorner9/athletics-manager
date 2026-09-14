from pathlib import Path

css_path = Path('styles/dev-layout-followup-20260913.css')
css = css_path.read_text(encoding='utf-8')
needle = '''  #squad .sav2-keyattrs span,
  #pool .sav2-keyattrs span{
    min-width:0!important;
    padding:2px 3px!important;
    font-size:7px!important;
    line-height:1.15!important;
  }
}'''
replacement = '''  #squad .sav2-keyattrs span,
  #pool .sav2-keyattrs span{
    min-width:0!important;
    padding:2px 3px!important;
    font-size:7px!important;
    line-height:1.15!important;
  }

  /* National Pool uses ranged staff assessments, which are wider than the Squad's
     exact ratings. Keep all three ratings visible without restoring horizontal scroll. */
  #pool .sav2-table th:nth-child(1){width:20%}
  #pool .sav2-table th:nth-child(2){width:8%}
  #pool .sav2-table th:nth-child(3){width:18%}
  #pool .sav2-table th:nth-child(4){width:7%}
  #pool .sav2-table th:nth-child(5){width:9%}
  #pool .sav2-table th:nth-child(6){width:9%}
  #pool .sav2-table th:nth-child(7){width:8%}
  #pool .sav2-table th:nth-child(8){width:9%}
  #pool .sav2-table th:nth-child(9){width:12%}

  #pool .sav2-table td{height:64px!important}

  #pool .sav2-keyattrs{
    display:grid!important;
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    align-content:center!important;
    gap:2px!important;
    overflow:visible!important;
  }

  #pool .sav2-keyattrs span{
    box-sizing:border-box!important;
    display:flex!important;
    justify-content:space-between!important;
    width:100%!important;
    max-width:100%!important;
    gap:2px!important;
    padding:2px 3px!important;
    white-space:nowrap!important;
    overflow:visible!important;
    font-size:6px!important;
  }

  #pool .sav2-keyattrs b{
    flex:0 0 auto!important;
    font-size:8px!important;
    line-height:1!important;
  }
}'''
if needle not in css:
    raise SystemExit('Expected iPad key-attribute block not found')
css_path.write_text(css.replace(needle, replacement, 1), encoding='utf-8')

html_path = Path('game.html')
html = html_path.read_text(encoding='utf-8')
old = 'styles/dev-layout-followup-20260913.css?v=20260913-layout2'
new = 'styles/dev-layout-followup-20260913.css?v=20260914-poolratings1'
if old not in html:
    raise SystemExit('Expected dev layout cache token not found')
html_path.write_text(html.replace(old, new, 1), encoding='utf-8')
