from pathlib import Path

css_path=Path('styles/ui-unification-v1.css')
html_path=Path('game.html')
test_path=Path('tools/ui-unification-soak.mjs')
css=css_path.read_text(encoding='utf-8')
html=html_path.read_text(encoding='utf-8')
test=test_path.read_text(encoding='utf-8')

marker='/* UI unification correction pass — Inbox containment, athlete table alignment, tab typography */'
block=r'''

/* UI unification correction pass — Inbox containment, athlete table alignment, tab typography */
:root{--am-ui-font:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}

/* Keep selected Inbox rows physically inside the list column. */
.am-inbox-v3-sidebar{position:relative;z-index:2;overflow:hidden;isolation:isolate}
.am-inbox-v3-list{min-width:0;overflow-x:hidden}
.am-inbox-v3-row{box-sizing:border-box;max-width:100%;overflow:hidden;contain:paint}
.am-inbox-v3-row.on{outline:0}
.am-inbox-v3-row:focus-visible{outline:2px solid color-mix(in srgb,var(--am-ui-accent) 58%,#dbe7f4);outline-offset:-2px}
.am-inbox-v3-reader{position:relative;z-index:1;min-width:0}

/* Squad / National Pool: reserve real columns for Key Attributes and Development. */
.sav2-table{min-width:1160px;table-layout:fixed}
.sav2-table th:nth-child(1),.sav2-table td:nth-child(1){width:190px}
.sav2-table th:nth-child(2),.sav2-table td:nth-child(2){width:120px}
.sav2-table th:nth-child(3),.sav2-table td:nth-child(3){width:190px;min-width:190px}
.sav2-table th:nth-child(4),.sav2-table td:nth-child(4){width:92px;min-width:92px;text-align:center!important}
.sav2-table th:nth-child(5),.sav2-table td:nth-child(5){width:96px}
.sav2-table th:nth-child(6),.sav2-table td:nth-child(6),.sav2-table th:nth-child(7),.sav2-table td:nth-child(7),.sav2-table th:nth-child(8),.sav2-table td:nth-child(8){width:118px}
.sav2-table th:nth-child(9),.sav2-table td:nth-child(9){width:124px}
.sav2-keyattrs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;min-width:0;max-width:100%}
.sav2-keyattrs span{min-width:0;width:100%;justify-content:space-between;padding:4px 6px;overflow:hidden;white-space:nowrap}
.sav2-keyattrs b{flex:0 0 auto}
.sav2-dev{display:inline-flex;align-items:center;justify-content:center;max-width:100%;white-space:nowrap}
.sav2-table th:nth-child(3),.sav2-table th:nth-child(4){white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* One typeface and one compact tab rhythm across management departments. */
.sav2-tabs button,.pe-tabs button,.home-v2-world-tabs button,.am-inbox-v3-tabs button,#training.training-v3 .tr2-tabs button,.scv3-tabs button,.apv2-tabs button,.cj-command nav button,.cj-filters button,#league button,#league select{
 font-family:var(--am-ui-font)!important;font-style:normal!important
}
.sav2-tabs,.pe-tabs,.home-v2-world-tabs,.am-inbox-v3-tabs,#training.training-v3 .tr2-tabs,.scv3-tabs{gap:3px!important;padding:4px!important;border-radius:10px!important}
.sav2-tabs button,.pe-tabs button,.home-v2-world-tabs button,.am-inbox-v3-tabs button,#training.training-v3 .tr2-tabs button,.scv3-tabs button{min-height:34px!important;padding:0 11px!important;border-radius:8px!important;font-size:9px!important;line-height:1!important;letter-spacing:.06em!important}

/* Summit Series detail navigation uses the same typography as the rest of the game. */
.summit-shell button,.summit-shell select,.summit-shell input{font-family:var(--am-ui-font)!important}
.summit-shell nav button,.summit-shell .tabs button,.summit-shell [role="tab"]{min-height:34px!important;padding:0 11px!important;border-radius:8px!important;font-family:var(--am-ui-font)!important;font-size:9px!important;font-weight:900!important;letter-spacing:.06em!important}

/* Finance has the most sections, so keep its tab rail compact instead of oversized. */
.pe-tabs{padding:3px!important;border-radius:10px!important;gap:3px!important}
.pe-tabs button{min-height:32px!important;padding:0 9px!important;border-radius:7px!important;font-size:9px!important;letter-spacing:.045em!important}

@media(max-width:900px){
 .sav2-table{min-width:1080px}
 .sav2-table th:nth-child(3),.sav2-table td:nth-child(3){width:160px;min-width:160px}
 .sav2-keyattrs{grid-template-columns:repeat(2,minmax(0,1fr))}.sav2-keyattrs span:nth-child(3){display:none}
}
@media(max-width:760px){
 .sav2-tabs button,.pe-tabs button,.home-v2-world-tabs button,.am-inbox-v3-tabs button,#training.training-v3 .tr2-tabs button,.scv3-tabs button,.summit-shell nav button,.summit-shell .tabs button,.summit-shell [role="tab"]{min-height:38px!important}
 .pe-tabs button{min-height:36px!important}
}
'''
if marker not in css:
    css += block

old='styles/ui-unification-v1.css?v=20260913-profilebaseline1'
new='styles/ui-unification-v1.css?v=20260913-profilebaseline2'
if old not in html and new not in html:
    raise SystemExit('UI unification cache-bust target not found')
html=html.replace(old,new)

test=test.replace("styles/ui-unification-v1.css?v=20260913-profilebaseline1","styles/ui-unification-v1.css?v=20260913-profilebaseline2")
anchor="need(css.includes('@media(max-width:760px)'),'mobile unification pass missing');"
extra="""need(css.includes('.am-inbox-v3-row{box-sizing:border-box;max-width:100%;overflow:hidden;contain:paint}'),'Inbox selected-row containment missing');\nneed(css.includes('.sav2-table{min-width:1160px;table-layout:fixed}'),'Squad/Pool alignment contract missing');\nneed(css.includes('--am-ui-font:Inter'),'shared tab font authority missing');\nneed(css.includes('.summit-shell button,.summit-shell select,.summit-shell input'),'Summit typography correction missing');\nneed(css.includes('.pe-tabs button{min-height:32px!important'),'Finance compact tab correction missing');"""
if extra not in test:
    if anchor not in test:
        raise SystemExit('UI unification test anchor not found')
    test=test.replace(anchor,anchor+'\n'+extra)

css_path.write_text(css,encoding='utf-8')
html_path.write_text(html,encoding='utf-8')
test_path.write_text(test,encoding='utf-8')
