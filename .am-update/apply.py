from pathlib import Path

path = Path('game.html')
text = path.read_text(encoding='utf-8')
needle = '<script src="scripts/squad-athlete-v2.js?v=20260911-squadcallup1"></script>'
loader = '<script src="scripts/squad-callup-flow-v2.js?v=20260911-callup2"></script>'
if loader not in text:
    if needle not in text:
        raise SystemExit('squad-athlete-v2 loader not found')
    text = text.replace(needle, needle + '\n' + loader, 1)
path.write_text(text, encoding='utf-8')
