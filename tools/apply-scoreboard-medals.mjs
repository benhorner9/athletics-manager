import fs from 'node:fs';

const path='styles/live-event-shell-v5.css';
let css=fs.readFileSync(path,'utf8');
const anchor=`#competition .lv5event .lv4-board-row.leader>b{background:linear-gradient(135deg,#d7b950,#aa8a27);color:#07131a!important}\n`;
if(!css.includes(anchor))throw new Error('Live scoreboard gold badge anchor not found');
const addition=`#competition .lv5event .lv4-board-row:nth-child(2)>b{background:linear-gradient(135deg,#dce5eb,#9aaab5);color:#07131a!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}\n#competition .lv5event .lv4-board-row:nth-child(3)>b{background:linear-gradient(135deg,#c98b5d,#8f5738);color:#07131a!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}\n`;
if(!css.includes(addition))css=css.replace(anchor,anchor+addition);
const rowAnchor=`#competition .lv5event .lv4-board-row.leader{background:rgba(218,188,92,.045)!important;box-shadow:inset 3px 0 #d1b348!important}\n`;
if(!css.includes(rowAnchor))throw new Error('Live scoreboard leader row anchor not found');
const rowAddition=`#competition .lv5event .lv4-board-row:nth-child(2){background:rgba(190,203,212,.035)!important;box-shadow:inset 3px 0 #aebbc4!important}\n#competition .lv5event .lv4-board-row:nth-child(3){background:rgba(181,113,72,.038)!important;box-shadow:inset 3px 0 #a96542!important}\n`;
if(!css.includes(rowAddition))css=css.replace(rowAnchor,rowAnchor+rowAddition);
const oursAnchor=`#competition .lv5event .lv4-board-row.ours.leader{background:linear-gradient(90deg,rgba(117,198,235,.07),rgba(218,188,92,.04))!important;box-shadow:inset 3px 0 #dbeef6!important}\n`;
if(!css.includes(oursAnchor))throw new Error('Live scoreboard player leader anchor not found');
const oursAddition=`#competition .lv5event .lv4-board-row.ours:nth-child(2){background:linear-gradient(90deg,rgba(117,198,235,.06),rgba(190,203,212,.035))!important;box-shadow:inset 3px 0 #c8d6df!important}\n#competition .lv5event .lv4-board-row.ours:nth-child(3){background:linear-gradient(90deg,rgba(117,198,235,.06),rgba(181,113,72,.038))!important;box-shadow:inset 3px 0 #bd7954!important}\n`;
if(!css.includes(oursAddition))css=css.replace(oursAnchor,oursAnchor+oursAddition);
fs.writeFileSync(path,css);
console.log('Scoreboard medal styling applied.');
