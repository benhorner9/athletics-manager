import fs from 'node:fs';

const broadcastPath='scripts/live-event-broadcast-v4.js';
const regressionPath='tools/live-event-shell-v5-regression.mjs';
let src=fs.readFileSync(broadcastPath,'utf8');
let tests=fs.readFileSync(regressionPath,'utf8');

function replaceOne(name,replacement,re){
 if(!re.test(src))throw new Error(`Track geometry migration could not find ${name}`);
 src=src.replace(re,()=>replacement);
}

replaceOne('track constants',`const TRACK={L:200,R:560,Y:224,I:64,W:11};
const TRACK_LAP_M=400;
const TRACK_STRAIGHT_M=84.39;
const TRACK_BEND_M=(TRACK_LAP_M-TRACK_STRAIGHT_M*2)/2;
const TRACK_LANE_WIDTH_M=1.22;
const TRACK_HALF_STAGGER_M=Math.PI*TRACK_LANE_WIDTH_M;
const TRACK_FULL_STAGGER_M=Math.PI*2*TRACK_LANE_WIDTH_M;`,/const TRACK=\{L:200,R:560,Y:224,I:64,W:11\};/);

replaceOne('stadium path',`function straightTrack(d){return dist(d)<=110&&!isRelay(d)}
function raceStartOffset(d){const n=dist(d);if(straightTrack(d))return 0;return((TRACK_LAP_M-(n%TRACK_LAP_M))%TRACK_LAP_M)}
function laneStaggerMeters(d,lane){const n=dist(d),l=Math.max(1,Math.min(8,Number(lane)||1))-1;if(straightTrack(d)||l<=0)return 0;if(n===200||n===800)return TRACK_HALF_STAGGER_M*l;if(n===400)return TRACK_FULL_STAGGER_M*l;return 0}
function stadium(r,m){
 let q=((Number(m)||0)%TRACK_LAP_M+TRACK_LAP_M)%TRACK_LAP_M;
 if(q<TRACK_BEND_M){const z=q/TRACK_BEND_M,a=Math.PI/2-Math.PI*z;return{x:TRACK.R+Math.cos(a)*r,y:TRACK.Y+Math.sin(a)*r}}
 q-=TRACK_BEND_M;
 if(q<TRACK_STRAIGHT_M){const z=q/TRACK_STRAIGHT_M;return{x:TRACK.R-(TRACK.R-TRACK.L)*z,y:TRACK.Y-r}}
 q-=TRACK_STRAIGHT_M;
 if(q<TRACK_BEND_M){const z=q/TRACK_BEND_M,a=-Math.PI/2-Math.PI*z;return{x:TRACK.L+Math.cos(a)*r,y:TRACK.Y+Math.sin(a)*r}}
 q-=TRACK_BEND_M;
 const z=Math.max(0,Math.min(1,q/TRACK_STRAIGHT_M));return{x:TRACK.L+(TRACK.R-TRACK.L)*z,y:TRACK.Y+r}
}` ,/function stadium\(r,m\)\{[^\n]*\}/);

replaceOne('race position mapper',`function trackPos(d,x,i){
 const n=dist(d),m=Math.max(0,Number(x.m)||0),p=Math.max(0,Math.min(1,m/Math.max(1,n))),l=x.r.lane,base=raceStartOffset(d);
 if(straightTrack(d))return{x:TRACK.L+(TRACK.R-TRACK.L)*p,y:TRACK.Y+rad(l)+(x.cosmetic||0)};
 if(n===200)return stadium(rad(l),base+m+laneStaggerMeters(d,l)*(1-p));
 if(n===400)return stadium(rad(l),base+m+laneStaggerMeters(d,l)*(1-p));
 if(n===800){const z=Math.min(1,m/TRACK_BEND_M),pack=distancePackRadius(x);return stadium(pack+(rad(l)-pack)*(1-z),base+m+laneStaggerMeters(d,l)*(1-z))}
 return stadium(distancePackRadius(x),base+m)
}` ,/function trackPos\(d,x,i\)\{[^\n]*\}/);

replaceOne('track environment and runout',`function laneStart(d,lane){const fake={r:{lane,id:\`start-\${d}-\${lane}\`},m:0,cosmetic:0};return trackPos(d,fake,lane-1)}
function laneFrame(d,lane,m=0){
 const n=dist(d),a={r:{lane,id:\`frame-\${d}-\${lane}\`},m:Math.max(0,m),cosmetic:0},b={...a,m:Math.min(n,Math.max(0,m)+1)};
 const p=trackPos(d,a,lane-1),q=trackPos(d,b,lane-1),dx=q.x-p.x,dy=q.y-p.y,mag=Math.hypot(dx,dy)||1,tx=dx/mag,ty=dy/mag;
 return{p,tx,ty,nx:-ty,ny:tx,angle:Math.atan2(ty,tx)*180/Math.PI}
}
function laneStartTick(d,lane){const f=laneFrame(d,lane,0),h=TRACK.W*.46;return\`<line x1="\${(f.p.x-f.nx*h).toFixed(1)}" y1="\${(f.p.y-f.ny*h).toFixed(1)}" x2="\${(f.p.x+f.nx*h).toFixed(1)}" y2="\${(f.p.y+f.ny*h).toFixed(1)}" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>\`}
function massStartLine(d){
 const offset=raceStartOffset(d),inner=stadium(TRACK.I+2,offset),outer=stadium(TRACK.I+8*TRACK.W-2,offset),shared=Math.abs(offset)<.001;
 if(shared)return\`<text x="\${(outer.x+10).toFixed(1)}" y="\${(outer.y-8).toFixed(1)}" fill="#f4c95d" font-size="9" font-weight="900">START / FINISH</text>\`;
 return\`<line x1="\${inner.x.toFixed(1)}" y1="\${inner.y.toFixed(1)}" x2="\${outer.x.toFixed(1)}" y2="\${outer.y.toFixed(1)}" stroke="#fff" stroke-width="3" stroke-linecap="round"/><text x="\${(outer.x+8).toFixed(1)}" y="\${(outer.y-7).toFixed(1)}" fill="#f7eee6" font-size="9" font-weight="900">START</text>\`
}
function startMarkings(c){const n=dist(c.d);if(straightTrack(c.d))return\`<line x1="\${TRACK.L}" y1="\${TRACK.Y+TRACK.I}" x2="\${TRACK.L}" y2="\${TRACK.Y+TRACK.I+8*TRACK.W}" stroke="#fff" stroke-width="4"/>\`;if(n===200||n===400||n===800)return Array.from({length:8},(_,i)=>laneStartTick(c.d,i+1)).join('');if(n>800)return massStartLine(c.d);return''}
function trackEnvironment(c,state){const outer=TRACK.I+8*TRACK.W,straight=TRACK.R-TRACK.L,n=dist(c.d);let out=\`<rect width="760" height="455" fill="#0d2a22"/><rect x="22" y="18" width="716" height="419" rx="26" fill="#173d30"/><rect x="\${TRACK.L-outer}" y="\${TRACK.Y-outer}" width="\${straight+2*outer}" height="\${2*outer}" rx="\${outer}" fill="#8b4c52"/><rect x="\${TRACK.L-TRACK.I}" y="\${TRACK.Y-TRACK.I}" width="\${straight+2*TRACK.I}" height="\${2*TRACK.I}" rx="\${TRACK.I}" fill="#2c684c"/>\`;
 for(let i=0;i<=8;i++){const r=TRACK.I+i*TRACK.W;out+=\`<rect x="\${TRACK.L-r}" y="\${TRACK.Y-r}" width="\${straight+2*r}" height="\${2*r}" rx="\${r}" fill="none" stroke="#f7eee6" stroke-opacity="\${(i===0||i===8)?0.7:0.32}" stroke-width="1.5"/>\`}
 /* Every oval discipline now approaches the same finish line along the home straight. Event-specific starts are painted separately. */
 out+=\`<line x1="\${TRACK.R}" y1="\${TRACK.Y+TRACK.I}" x2="\${TRACK.R}" y2="\${TRACK.Y+outer}" stroke="#fff" stroke-width="4"/>\${startMarkings(c)}\`;
 if(isRelay(c.d)){for(const z of [100,200,300])for(let l=1;l<=8;l++){const a=trackPos(c.d,{r:{lane:l,id:\`relay-zone-\${l}\`},m:z-10,cosmetic:0},l-1),b=trackPos(c.d,{r:{lane:l,id:\`relay-zone-\${l}\`},m:z+10,cosmetic:0},l-1);out+=\`<path d="M\${a.x.toFixed(1)} \${a.y.toFixed(1)} L\${b.x.toFixed(1)} \${b.y.toFixed(1)}" stroke="#f4c95d" stroke-opacity=".34" stroke-width="5" stroke-linecap="round"/>\`}}
 if(straightTrack(c.d)){for(let l=1;l<=8;l++){const y=TRACK.Y+rad(l);out+=\`<text x="\${TRACK.L-12}" y="\${y+3}" text-anchor="end" class="lv4-lane-number">\${l}</text>\`}}
 if(n<=400){for(let l=1;l<=8;l++){const f=laneFrame(c.d,l,0);out+=\`<g class="lv4-block" transform="translate(\${f.p.x.toFixed(1)} \${f.p.y.toFixed(1)}) rotate(\${f.angle.toFixed(1)})"><rect x="-7" y="-4" width="6" height="3" rx="1"/><rect x="1" y="-4" width="6" height="3" rx="1"/></g>\`}}
 if(hurdleLike(c.d)){const count=10;for(let h=1;h<=count;h++)for(let l=1;l<=8;l++){const m=n*(.12+h*.072),f=laneFrame(c.d,l,m),w=4.5;out+=\`<line class="lv4-hurdle" x1="\${(f.p.x-f.nx*w).toFixed(1)}" y1="\${(f.p.y-f.ny*w).toFixed(1)}" x2="\${(f.p.x+f.nx*w).toFixed(1)}" y2="\${(f.p.y+f.ny*w).toFixed(1)}"/>\`}}
 out+=\`<g class="lv4-official"><circle cx="\${TRACK.R+30}" cy="\${TRACK.Y+outer-8}" r="5"/><rect x="\${TRACK.R+27}" y="\${TRACK.Y+outer-3}" width="6" height="10" rx="2"/></g>\`;
 out+=\`<g class="lv4-stadium-detail"><rect x="305" y="193" width="150" height="60" rx="6"/><text x="380" y="219" text-anchor="middle">ATHLETICS MANAGER</text><text x="380" y="238" text-anchor="middle">\${E(c.e.name||'LIVE MEETING')}</text></g>\`;
 return out}
function postFinishPos(d,x,i,extra){const n=dist(d);if(straightTrack(d)){const a=trackPos(d,{...x,m:Math.max(0,n-.9)},i),b=trackPos(d,{...x,m:Math.max(0,n-.03)},i),dx=b.x-a.x,dy=b.y-a.y,mag=Math.hypot(dx,dy)||1;return{x:b.x+dx/mag*extra,y:b.y+dy/mag*extra}}return trackPos(d,{...x,m:n+Math.max(1,extra*.3)},i)}` ,/function laneStart\(d,lane\)\{[^\n]*\}[\s\S]*?function postFinishPos\(d,x,i,extra\)\{[^\n]*\}/);

const trackSpeedLine=/function trackSpeed\(c,now\)\{[^\n]*\}/;
if(!trackSpeedLine.test(src))throw new Error('Track geometry migration could not find trackSpeed');
src=src.replace(trackSpeedLine,m=>`${m}\nfunction geometrySnapshot(d,lane=1){\n const n=dist(d),l=Math.max(1,Math.min(8,Number(lane)||1)),seed={r:{lane:l,id:\`geometry-\${d}-\${l}\`},cosmetic:0};\n const at=m=>trackPos(d,{...seed,m},l-1),start=at(0),preFinish=at(Math.max(0,n-10)),finish=at(n),afterFinish=straightTrack(d)?null:at(n+10);\n return{distance:n,lane:l,straight:straightTrack(d),startOffset:raceStartOffset(d),stagger:laneStaggerMeters(d,l),start,preFinish,finish,afterFinish,finishLineX:TRACK.R}\n}`);

const apiRe=/const api=\{version:'4\.6\.0',[^\n]*\};/;
if(!apiRe.test(src))throw new Error('Track geometry migration could not find Broadcast V4 API');
src=src.replace(apiRe,m=>m.replace("const api={version:'4.6.0',","const api={version:'4.6.0',trackGeometryVersion:'2026.09',geometry:geometrySnapshot,"));

const testAnchor=" if(failures.length)throw new Error(failures.join('\\n'));\n\n for(const d of disciplines){";
if(!tests.includes(testAnchor))throw new Error('Track geometry migration could not find regression insertion point');
const geometryTests=` if(failures.length)throw new Error(failures.join('\\n'));\n\n const geometryOffsets={M100:0,W100:0,M200:200,W200:200,M400:0,W400:0,M800:0,W800:0,M1500:100,W1500:100,M5000:200,W5000:200,M10000:0,W10000:0,M4X100:0,W4X100:0};\n for(const [d,offset] of Object.entries(geometryOffsets)){\n  const g=w.AMLiveBroadcastV4.geometry?.(d,1);\n  if(!g){fail(\`\${d}: track geometry diagnostics are unavailable.\`);continue}\n  if(Math.abs(g.startOffset-offset)>.01)fail(\`\${d}: visual start offset is \${g.startOffset}m, expected \${offset}m.\`);\n  if(Math.abs(g.finish.x-g.finishLineX)>.75)fail(\`\${d}: athlete path does not finish on the common finish line (x=\${g.finish.x.toFixed(2)}, line=\${g.finishLineX}).\`);\n  if(!g.straight&&g.preFinish.x>=g.finish.x)fail(\`\${d}: final approach is not travelling left-to-right along the home straight.\`);\n  if(!g.straight&&g.afterFinish?.x<=g.finish.x)fail(\`\${d}: post-finish path does not continue into the first bend.\`);\n }\n const g400=w.AMLiveBroadcastV4.geometry('M400',8),g200=w.AMLiveBroadcastV4.geometry('M200',8),g1500=w.AMLiveBroadcastV4.geometry('M1500',1),g5000=w.AMLiveBroadcastV4.geometry('M5000',1);\n if(g400.stagger<53||g400.stagger>54.5)fail(\`M400: lane-eight stagger is not a full-lap stagger (\${g400.stagger.toFixed(2)}m).\`);\n if(g200.stagger<26||g200.stagger>27.5)fail(\`M200: lane-eight stagger is not a half-lap stagger (\${g200.stagger.toFixed(2)}m).\`);\n if(Math.hypot(g1500.start.x-g1500.finish.x,g1500.start.y-g1500.finish.y)<40)fail('M1500: start line is still effectively on the finish line.');\n if(Math.hypot(g5000.start.x-g5000.finish.x,g5000.start.y-g5000.finish.y)<80)fail('M5000: start line is still effectively on the finish line.');\n if(failures.length)throw new Error(failures.join('\\n'));\n\n for(const d of disciplines){`;
tests=tests.replace(testAnchor,geometryTests);

fs.writeFileSync(broadcastPath,src);
fs.writeFileSync(regressionPath,tests);
console.log('Applied standards-based track start/finish geometry migration.');
