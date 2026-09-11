from pathlib import Path
R=Path('.')

def rd(p): return (R/p).read_text(encoding='utf-8')
def wr(p,s): (R/p).write_text(s,encoding='utf-8')
def rep(p,a,b,n=1):
    s=rd(p)
    if s.count(a)<n: raise SystemExit(f'{p}: missing patch anchor: {a[:100]!r}')
    wr(p,s.replace(a,b,n))

# Scouting V2: register its production route immediately so the cutover watchdog
# cannot replace the screen while the compressed runtime is still loading on iPad.
p='scripts/scouting-v2-bootstrap.js'
s=rd(p)
s=s.replace("const V='20260910-scouting2';", "const V='20260911-scouting2-recovery1';\nconst scoutingRoot=()=>document.getElementById('scouting');\nfunction claimRoute(state='loading'){\n const root=scoutingRoot();if(!root)return null;\n root.classList.add('scouting-v2-active');root.dataset.amUiScreen='scouting-v2';root.dataset.scoutingV2State=state;\n try{window.AthleticsUI?.registerScreen?.('scouting',{status:'active',replacement:'scouting-v2'})}catch(_){}\n return root;\n}\nclaimRoute();", 1)
old="""  await runJS(js);\n  if(typeof window.AMScoutingV2?.refreshScoutingIntegration==='function')window.AMScoutingV2.refreshScoutingIntegration();\n  const root=document.getElementById('scouting');if(root){root.classList.add('scouting-v2-active');root.dataset.amUiScreen='scouting-v2'}\n  try{window.AthleticsUI?.registerScreen?.('scouting',{status:'active',replacement:'scouting-v2'})}catch(_){ }\n  if(typeof render==='function')render();\n  console.info('[Athletics Manager] Scouting V2 loaded');\n }catch(err){console.error('[Athletics Manager] Scouting V2 failed to load',err)}\n}"""
new="""  await runJS(js);\n  if(typeof window.AMScoutingV2?.refreshScoutingIntegration==='function')window.AMScoutingV2.refreshScoutingIntegration();\n  claimRoute('ready');\n  /* Redraw Scouting directly when it is the active route. Generic render() is not\n     guaranteed to repaint an already-open route after an async runtime handoff. */\n  try{\n   if(typeof currentView!=='undefined'&&currentView==='scouting'&&typeof drawScouting==='function')drawScouting();\n   else if(typeof render==='function')render();\n  }catch(redrawErr){console.error('[Athletics Manager] Scouting V2 redraw recovered',redrawErr)}\n  claimRoute('ready');\n  console.info('[Athletics Manager] Scouting V2 loaded');\n }catch(err){\n  console.error('[Athletics Manager] Scouting V2 failed to load',err);\n  const root=claimRoute('fallback');\n  /* Never hand the player to the global cutover error just because the async V2\n     payload was slow or unavailable. The existing scouting renderer remains a safe\n     career-state fallback while Retry/reload can recover V2. */\n  try{if(typeof currentView!=='undefined'&&currentView==='scouting'&&typeof drawScouting==='function')drawScouting();else if(typeof render==='function')render()}catch(fallbackErr){\n   console.error('[Athletics Manager] Scouting fallback failed',fallbackErr);\n   if(root)root.innerHTML='<div class=\"am-empty\"><div><strong>Scouting is still loading</strong><span>Your scouting data is safe. Refresh this screen to retry the interface.</span></div></div>';\n  }\n  claimRoute('fallback');\n }\n}"""
if old not in s: raise SystemExit('scouting bootstrap success block anchor missing')
s=s.replace(old,new,1)
wr(p,s)

# Give the asynchronous compressed scouting runtime breathing room on tablet even
# if a future refactor removes the immediate route claim above.
p='scripts/ui-cutover-v1.js';s=rd(p)
old="scouting:{selector:'.scouting-v2-active,[data-am-ui-screen=\"scouting-v2\"]',delay:1800},"
new="scouting:{selector:'.scouting-v2-active,[data-am-ui-screen=\"scouting-v2\"]',delay:6500},"
if old not in s: raise SystemExit('scouting cutover route anchor missing')
s=s.replace(old,new,1)
wr(p,s)

# Cache-bust only the two patched runtime files.
p='game.html';s=rd(p)
for a,b in [
 ('scripts/scouting-v2-bootstrap.js?v=20260911-scouting2restore','scripts/scouting-v2-bootstrap.js?v=20260911-scouting2recovery1'),
 ('scripts/ui-cutover-v1.js?v=20260911-cutover2','scripts/ui-cutover-v1.js?v=20260911-cutover3')
]:
    if a not in s: raise SystemExit(f'game.html cache-bust anchor missing: {a}')
    s=s.replace(a,b,1)
wr(p,s)
print('Scouting iPad recovery patch applied.')
