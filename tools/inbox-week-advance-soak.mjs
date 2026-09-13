import fs from 'node:fs';

const game=fs.readFileSync('scripts/game.js','utf8');
const inbox=fs.readFileSync('scripts/inbox-v3.js','utf8');
const need=(ok,msg)=>{if(!ok)throw new Error('Inbox week-advance regression: '+msg)};
const start=game.indexOf('function advanceWeek(){');
const end=game.indexOf('function processWeek(){',start);
need(start>=0&&end>start,'advanceWeek source not found');
const fn=game.slice(start,end);
need(fn.includes("const inboxWasOpen=currentView==='inbox',mailIdsBefore=new Set"),'week advance must snapshot the Inbox route and existing mail IDs');
need(fn.includes('freshUnread=unreadAfter.filter(x=>!mailIdsBefore.has(String(x.id)))'),'newly generated mail must be identified independently of its stored week stamp');
need(fn.includes('inboxTarget=inboxWasOpen?newestFresh:newestCurrent'),'Inbox must prioritise newly generated mail when Advance Week starts from Inbox');
need(fn.includes('if(inboxTarget)openMail=inboxTarget.id;'),'new Inbox target must become selected mail');
need(fn.indexOf('if(inboxTarget)openMail=inboxTarget.id;')<fn.indexOf('save();render();'),'new mail must be selected before the Inbox render pass');
need(fn.includes('__athleticsInboxV3?.openMessage?.(inboxTarget.id)'),'week advance must explicitly open the selected Inbox V3 message');
need(inbox.includes('render:renderInbox,openMessage,legacy:legacyDrawInbox'),'Inbox V3 must expose its canonical message opener');
console.log('Inbox week-advance handoff regression passed');
