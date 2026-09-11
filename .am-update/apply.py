from pathlib import Path
import re

squad_path = Path('scripts/squad-athlete-v2.js')
text = squad_path.read_text(encoding='utf-8')
old = " dialog.querySelector('#profileSquadAction')?.addEventListener('click',()=>{if(!own||a.retired)return;const wasSquad=a.inSquad!==false;try{wasSquad?dropFromSquad(a.id):callUpToSquad(a.id)}catch(err){console.error('[Athletics Manager] squad action recovered',err);return}safe(()=>renderView(currentView),null);renderProfile()});"
new = " dialog.querySelector('#profileSquadAction')?.addEventListener('click',()=>{if(!own||a.retired)return;const wasSquad=a.inSquad!==false;try{if(wasSquad){dropFromSquad(a.id);safe(()=>renderView(currentView),null);renderProfile();return}callUpToSquad(a.id);return}catch(err){console.error('[Athletics Manager] squad action recovered',err);return}});"
if old not in text:
    raise SystemExit('Expected athlete-profile squad action handler was not found; refusing unsafe patch.')
text = text.replace(old, new, 1)
if text.count("callUpToSquad(a.id);return") != 1:
    raise SystemExit('Call-up handoff patch did not apply exactly once.')
squad_path.write_text(text, encoding='utf-8')

game_path = Path('game.html')
game = game_path.read_text(encoding='utf-8')
pattern = r'scripts/squad-athlete-v2\.js\?v=[^\"\']+'
replacement = 'scripts/squad-athlete-v2.js?v=20260911-squadcallup1'
game, count = re.subn(pattern, replacement, game, count=1)
if count != 1:
    raise SystemExit('Could not refresh squad-athlete-v2 cache key exactly once.')
game_path.write_text(game, encoding='utf-8')

print('Patched athlete-profile call-up handoff and refreshed cache key.')
