from pathlib import Path


def replace_once(path, old, new):
    p=Path(path)
    text=p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Needle not found in {path}: {old[:120]}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

replace_once(
    'scripts/nation-world-v1.js',
    "const oldPicker=showNationPicker;showNationPicker=function(){oldPicker();tools()};",
    "const oldPicker=showNationPicker;showNationPicker=function(){oldPicker();tools()};const newCareerButton=document.getElementById('newBtn');if(newCareerButton)newCareerButton.onclick=()=>showNationPicker();"
)

replace_once(
    'game.html',
    'scripts/nation-world-v1.js?v=20260912-nations64-1',
    'scripts/nation-world-v1.js?v=20260912-nations64-2'
)

replace_once(
    'tools/static-regression.mjs',
    "  ['data-nation-region','64-nation picker region filter is missing'],\n  ['window.AMNationWorld','64-nation world public service is missing']",
    "  ['data-nation-region','64-nation picker region filter is missing'],\n  [\"newCareerButton.onclick=()=>showNationPicker()\",'64-nation picker must rebind Start New Career to the expanded picker'],\n  ['window.AMNationWorld','64-nation world public service is missing']"
)

replace_once(
    'tools/runtime-smoke.mjs',
    " console.log('[smoke] runtime globals and snapshot checked');\n\n const smokeRoutes=",
    " if(w.AMNationWorld){\n  try{\n   if(w.AMNationWorld.count!==64)fail(`64-nation runtime expected 64 playable nations, found ${w.AMNationWorld.count}.`);\n   const newBtn=w.document.getElementById('newBtn');\n   newBtn?.click();\n   await new Promise(resolve=>setTimeout(resolve,10));\n   const modal=w.document.getElementById('nationModal');\n   const search=modal?.querySelector('[data-nation-search]');\n   const region=modal?.querySelector('[data-nation-region]');\n   const count=modal?.querySelector('[data-nation-count]');\n   if(!search||!region||!count)fail('New Career click did not render the 64-nation search/region controls.');\n   if(modal?.classList.contains('hidden'))fail('New Career click did not open the nation picker.');\n   if(typeof w.closeNationPicker==='function')w.closeNationPicker();\n  }catch(err){fail(`64-nation picker runtime check threw: ${err?.stack||err}`)}\n }\n console.log('[smoke] runtime globals and snapshot checked');\n\n const smokeRoutes="
)
